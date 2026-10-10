"""Paso 07: optimizacion del modelo y predicciones finales.

Mejora sobre los baselines del paso 06 usando solo el dataset oficial:

  1. Poda de redundancia: de cada par de variables con |correlacion| > 0.97
     se conserva una (los 18 indices comparten mucha informacion).
  2. Validacion anidada: en cada particion externa (5 folds x 5 repeticiones,
     estratificadas por municipio) se ajustan los hiperparametros con Optuna
     usando solo el fold de entrenamiento (CV interna de 3), y se evalua en
     el fold externo que el modelo nunca vio. Asi el RMSE reportado no esta
     contaminado por la busqueda de hiperparametros.
  3. Ensamble: promedio simple de LightGBM, Random Forest y Elastic Net
     ajustados; suele ser mas estable que cualquier miembro con n chico.
  4. Modelo final: se re-optimiza sobre las 138 parcelas completas y se
     predicen las 59 ocultas, con un intervalo empirico por parcela
     (cuantil 90 del error absoluto de la validacion externa).

Salidas:
  salidas/metricas_optimizadas.csv
  salidas/hiperparametros_finales.json
  salidas/predicciones_59_parcelas.csv
"""
import json
import warnings

import lightgbm as lgb
import numpy as np
import optuna
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, RepeatedStratifiedKFold
from sklearn.preprocessing import StandardScaler

import config

warnings.filterwarnings("ignore")
optuna.logging.set_verbosity(optuna.logging.WARNING)

SEMILLA = 42
N_SPLITS, N_REPETICIONES = 5, 3
TRIALS_LGBM, TRIALS_RF, TRIALS_ENET = 20, 8, 15


# ----------------------------------------------------------------------
# Datos
# ----------------------------------------------------------------------
def preparar_datos():
    df = pd.read_csv(config.RUTA_SALIDAS / "features_modelado.csv")

    # Municipio y estado a one-hot (pocas categorias, sin orden natural)
    df = pd.get_dummies(df, columns=["Estado", "Municipio"], prefix=["est", "mun"])

    entrena = df[df["CONJUNTO"] == "ENTRENAMIENTO"].reset_index(drop=True)
    predice = df[df["CONJUNTO"] == "PREDICCION"].reset_index(drop=True)

    y = entrena["RENDIMIENTO_T_HA"].values
    quitar = ["ID_POLIGONO", "CONJUNTO", "RENDIMIENTO_T_HA"]
    X = entrena.drop(columns=quitar)
    X_pred = predice.drop(columns=quitar)

    # Estrato de validacion: municipio original (antes del one-hot)
    maestro = pd.read_csv(config.RUTA_SALIDAS / "parcelas_maestro.csv")
    mun = maestro.set_index("ID_POLIGONO").loc[entrena["ID_POLIGONO"], "Municipio"]
    conteo = mun.value_counts()
    estrato = mun.where(mun.map(conteo) >= 5, "OTRO").values

    return X, y, estrato, X_pred, predice["ID_POLIGONO"].values, entrena["ID_POLIGONO"].values


def podar_redundantes(X: pd.DataFrame, umbral: float = 0.97) -> list[str]:
    """Devuelve la lista de columnas a conservar tras podar pares |r| > umbral."""
    num = X.select_dtypes(include=[float, int])
    corr = num.corr().abs()
    superior = corr.where(np.triu(np.ones(corr.shape, dtype=bool), k=1))
    tirar = [c for c in superior.columns if (superior[c] > umbral).any()]
    conservar = [c for c in X.columns if c not in tirar]
    return conservar


# ----------------------------------------------------------------------
# Modelos con busqueda Optuna (cada uno se ajusta SOLO con datos del fold
# de entrenamiento que recibe; nada del fold externo se filtra)
# ----------------------------------------------------------------------
def _cv_interna_rmse(construir, X, y, n_splits=3):
    cv = KFold(n_splits=n_splits, shuffle=True, random_state=SEMILLA)
    errores = []
    for tr, va in cv.split(X):
        m = construir()
        m.fit(X[tr], y[tr])
        errores.append(np.sqrt(mean_squared_error(y[va], m.predict(X[va]))))
    return float(np.mean(errores))


def tunear_lgbm(X, y, n_trials):
    def objetivo(t):
        params = dict(
            n_estimators=t.suggest_int("n_estimators", 100, 600),
            learning_rate=t.suggest_float("learning_rate", 0.01, 0.15, log=True),
            num_leaves=t.suggest_int("num_leaves", 4, 31),
            min_child_samples=t.suggest_int("min_child_samples", 5, 30),
            reg_lambda=t.suggest_float("reg_lambda", 0.0, 10.0),
            colsample_bytree=t.suggest_float("colsample_bytree", 0.4, 1.0),
            subsample=t.suggest_float("subsample", 0.6, 1.0),
            subsample_freq=1, random_state=SEMILLA, verbosity=-1, n_jobs=2,
        )
        return _cv_interna_rmse(lambda: lgb.LGBMRegressor(**params), X, y)
    estudio = optuna.create_study(direction="minimize",
                                  sampler=optuna.samplers.TPESampler(seed=SEMILLA))
    estudio.optimize(objetivo, n_trials=n_trials, show_progress_bar=False)
    mejores = estudio.best_params | dict(subsample_freq=1, random_state=SEMILLA,
                                         verbosity=-1, n_jobs=2)
    return lgb.LGBMRegressor(**mejores), mejores


def tunear_rf(X, y, n_trials):
    def objetivo(t):
        params = dict(
            n_estimators=150,
            max_depth=t.suggest_int("max_depth", 4, 20),
            min_samples_leaf=t.suggest_int("min_samples_leaf", 1, 8),
            max_features=t.suggest_float("max_features", 0.2, 1.0),
            random_state=SEMILLA, n_jobs=2,
        )
        return _cv_interna_rmse(lambda: RandomForestRegressor(**params), X, y)
    estudio = optuna.create_study(direction="minimize",
                                  sampler=optuna.samplers.TPESampler(seed=SEMILLA))
    estudio.optimize(objetivo, n_trials=n_trials, show_progress_bar=False)
    mejores = estudio.best_params | dict(n_estimators=600, random_state=SEMILLA, n_jobs=2)
    return RandomForestRegressor(**mejores), mejores


def tunear_enet(X, y, n_trials):
    def objetivo(t):
        params = dict(alpha=t.suggest_float("alpha", 1e-3, 1.0, log=True),
                      l1_ratio=t.suggest_float("l1_ratio", 0.05, 0.95),
                      max_iter=20000, random_state=SEMILLA)
        return _cv_interna_rmse(lambda: ElasticNet(**params), X, y)
    estudio = optuna.create_study(direction="minimize",
                                  sampler=optuna.samplers.TPESampler(seed=SEMILLA))
    estudio.optimize(objetivo, n_trials=n_trials, show_progress_bar=False)
    mejores = estudio.best_params | dict(max_iter=20000, random_state=SEMILLA)
    return ElasticNet(**mejores), mejores


# ----------------------------------------------------------------------
# Evaluacion anidada
# ----------------------------------------------------------------------
def evaluacion_anidada(X, y, estrato):
    cols = podar_redundantes(X)
    print(f"Poda de redundancia: {X.shape[1]} -> {len(cols)} variables")
    Xn = X[cols].astype(float).values

    cv = RepeatedStratifiedKFold(n_splits=N_SPLITS, n_repeats=N_REPETICIONES,
                                 random_state=SEMILLA)
    resultados = {m: {"pred": np.zeros((N_REPETICIONES, len(y))) * np.nan}
                  for m in ["lgbm", "rf", "enet", "ensamble"]}
    errores_abs = []

    for i, (tr, te) in enumerate(cv.split(Xn, estrato)):
        rep = i // N_SPLITS
        imp = SimpleImputer(strategy="median").fit(Xn[tr])
        Xtr, Xte = imp.transform(Xn[tr]), imp.transform(Xn[te])
        esc = StandardScaler().fit(Xtr)

        preds = {}
        mod, _ = tunear_lgbm(Xtr, y[tr], TRIALS_LGBM)
        preds["lgbm"] = mod.fit(Xtr, y[tr]).predict(Xte)
        mod, _ = tunear_rf(Xtr, y[tr], TRIALS_RF)
        preds["rf"] = mod.fit(Xtr, y[tr]).predict(Xte)
        mod, _ = tunear_enet(esc.transform(Xtr), y[tr], TRIALS_ENET)
        preds["enet"] = mod.fit(esc.transform(Xtr), y[tr]).predict(esc.transform(Xte))
        preds["ensamble"] = (preds["lgbm"] + preds["rf"] + preds["enet"]) / 3

        for m in resultados:
            resultados[m]["pred"][rep, te] = preds[m]
        errores_abs.extend(np.abs(y[te] - preds["ensamble"]))

    filas = []
    for m, r in resultados.items():
        rmse = [np.sqrt(mean_squared_error(y, r["pred"][rep])) for rep in range(N_REPETICIONES)]
        mae = [mean_absolute_error(y, r["pred"][rep]) for rep in range(N_REPETICIONES)]
        r2 = [r2_score(y, r["pred"][rep]) for rep in range(N_REPETICIONES)]
        filas.append({"modelo": m, "rmse": np.mean(rmse), "rmse_std": np.std(rmse),
                      "mae": np.mean(mae), "r2": np.mean(r2), "r2_std": np.std(r2)})
        print(f"{m:10s} RMSE {np.mean(rmse):.3f} +/- {np.std(rmse):.3f} | "
              f"MAE {np.mean(mae):.3f} | R2 {np.mean(r2):.3f}")

    q90 = float(np.quantile(errores_abs, 0.90))
    print(f"Cuantil 90 del error absoluto del ensamble (para intervalos): {q90:.3f} t/ha")
    return pd.DataFrame(filas), cols, q90


# ----------------------------------------------------------------------
# Modelo final y predicciones
# ----------------------------------------------------------------------
def modelo_final(X, y, X_pred, cols, q90, ids_pred):
    Xn = X[cols].astype(float).values
    Xp = X_pred[cols].astype(float).values
    imp = SimpleImputer(strategy="median").fit(Xn)
    Xn, Xp = imp.transform(Xn), imp.transform(Xp)
    esc = StandardScaler().fit(Xn)

    lgbm, p_lgbm = tunear_lgbm(Xn, y, TRIALS_LGBM * 2)
    rf, p_rf = tunear_rf(Xn, y, TRIALS_RF * 2)
    enet, p_enet = tunear_enet(esc.transform(Xn), y, TRIALS_ENET * 2)

    pred = (lgbm.fit(Xn, y).predict(Xp)
            + rf.fit(Xn, y).predict(Xp)
            + enet.fit(esc.transform(Xn), y).predict(esc.transform(Xp))) / 3

    salida = pd.DataFrame({
        "ID_POLIGONO": ids_pred,
        "RENDIMIENTO_T_HA_PRED": np.round(pred, 3),
        "intervalo_inf": np.round(pred - q90, 3),
        "intervalo_sup": np.round(pred + q90, 3),
    })
    salida.to_csv(config.RUTA_SALIDAS / "predicciones_59_parcelas.csv", index=False)
    with open(config.RUTA_SALIDAS / "hiperparametros_finales.json", "w") as f:
        json.dump({"lgbm": p_lgbm, "rf": p_rf, "enet": p_enet,
                   "variables": cols, "q90_error_abs": q90}, f, indent=2, default=str)

    # Sanity check contra el rango de entrenamiento
    assert salida.RENDIMIENTO_T_HA_PRED.between(1.5, 6.5).all(), "prediccion fuera de rango"
    print(f"\npredicciones_59_parcelas.csv: media {pred.mean():.2f} t/ha, "
          f"rango {pred.min():.2f} a {pred.max():.2f}")
    return salida


if __name__ == "__main__":
    X, y, estrato, X_pred, ids_pred, _ = preparar_datos()
    metricas, cols, q90 = evaluacion_anidada(X, y, estrato)
    metricas.round(4).to_csv(config.RUTA_SALIDAS / "metricas_optimizadas.csv", index=False)
    modelo_final(X, y, X_pred, cols, q90, ids_pred)
