#!/usr/bin/env python3
"""¿Vale la pena meter el modelo ganador del superciclo en el pipeline de la API?

Prueba pareada: el ganador del superciclo (LightGBM sobre `lon + pixel_clima + N + edafología`
más las 9 variables base del reto; 13 variables) se evalúa DENTRO del esquema de validación del
pipeline de la API (api/cebadata_api/pipeline/pasos/paso07_optimizacion.py), con los mismos
folds, las mismas 138 parcelas y las mismas métricas que la mezcla actual.

Validaciones (idénticas a las del paso 07; se importan del pipeline sin modificarlo):
  - Estratificada por municipio: RepeatedStratifiedKFold(5 x 3, random_state=42).
  - LOMO: un municipio completo fuera en cada ronda (9 rondas).

Candidatos (todos reciben exactamente los mismos folds):
  ensamble, ubicacion, mezcla       los tres del pipeline (reproducen sus cifras publicadas)
  ganador                           LightGBM del superciclo, hiperparámetros del superciclo (fijos)
  ganador_sin_ext                   lo mismo sin nitrógeno SoilGrids ni edafología INEGI
  ganador_opt, ganador_sin_ext_opt  versiones con Optuna anidado (como el resto del pipeline);
                                    descuentan el sesgo de haber elegido el ganador entre ~1000
  mezcla_<g>                        (ensamble + g) / 2: el ganador sustituye al modelo de longitud

Criterio de decisión, FIJADO ANTES DE CORRER (misma regla de ruido que usa el pipeline, 0.010):
  Un candidato "vale la pena" frente a la mezcla actual solo si cumple las tres:
    1. baja el RMSE de la validación estratificada al menos 0.010 t/ha,
    2. no empeora el RMSE de LOMO, y
    3. el intervalo bootstrap del 95 % de la diferencia estratificada (por parcelas) queda por
       debajo de 0.
  Los datos externos "valen la pena" solo si ganador supera a ganador_sin_ext con la misma regla.

Uso (desde la raíz del repo):
  env -i HOME="$HOME" PATH="$PWD/modelos/.venv-prueba/bin:/usr/bin:/bin" \
    PYTHONPATH=api/cebadata_api:modelos/src python modelos/scripts/prueba_ganador_en_pipeline.py
  ... --analizar    solo recalcula tablas desde modelos/comparativas/prueba_ganador_en_pipeline/
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import Parallel, delayed

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "api" / "cebadata_api"))
sys.path.insert(0, str(ROOT / "modelos" / "src"))

SALIDA = ROOT / "modelos" / "comparativas" / "prueba_ganador_en_pipeline"
UMBRAL = 0.010
N_BOOT = 4000
SEMILLA_BOOT = 20261013

# Dataset del superciclo (catálogo): ganador y su versión sin externos (mismo ubic_tag y capa C)
ID_GANADOR = "parcelas_solo2025_ubic_lon-pix_n-edaf_v1"
ID_SIN_EXT = "parcelas_solo2025_ubic_lon-pix_reto_v1"
HPARAMS_GANADOR = {"num_leaves": 31, "learning_rate": 0.03, "min_child_samples": 10}
SEMILLA_SUPERCICLO = 20261006

VARIANTES = {  # nombre -> (dataset, optimizado con Optuna anidado)
    "ganador": (ID_GANADOR, False),
    "ganador_sin_ext": (ID_SIN_EXT, False),
    "ganador_opt": (ID_GANADOR, True),
    "ganador_sin_ext_opt": (ID_SIN_EXT, True),
}
PIPELINE = ["ensamble", "ubicacion", "mezcla"]
MODELOS = PIPELINE + list(VARIANTES) + [f"mezcla_{g}" for g in VARIANTES]


# ----------------------------------------------------------------------
# Carga y alineación
# ----------------------------------------------------------------------
def cargar_ganadores(d):
    from ceba_modelos.catalogo import load_catalogo
    from ceba_modelos.config import load_config
    from ceba_modelos.ingesta import load_from_catalog_row

    cfg = load_config(ROOT / "modelos" / "config" / "superciclo.yaml")
    cat = load_catalogo(cfg["paths"]["catalogo"]).set_index("dataset_id", drop=False)
    out = {}
    for ds in {v[0] for v in VARIANTES.values()}:
        b = load_from_catalog_row(cat.loc[ds], cfg)
        pos = pd.Series(range(len(b.meta_train)), index=b.meta_train["ID_POLIGONO"])
        orden = pos.loc[d.ids].to_numpy()
        assert np.allclose(b.y_train.to_numpy()[orden], d.y), f"{ds}: y no coincide con el pipeline"
        mun_b = b.meta_train["municipio"].to_numpy()[orden]
        assert (mun_b == d.municipios).all(), f"{ds}: municipios no coinciden"
        pos_p = pd.Series(range(len(b.meta_pred)), index=b.meta_pred["ID_POLIGONO"])
        orden_p = pos_p.loc[d.ids_pred].to_numpy()
        out[ds] = {
            "X": b.X_train.iloc[orden].reset_index(drop=True),
            "X_pred": b.X_pred.iloc[orden_p].reset_index(drop=True),
            "nums": b.numeric_cols, "cats": b.categorical_cols, "cols": b.feature_cols,
        }
    return out


# ----------------------------------------------------------------------
# Ajuste de un fold (todos los candidatos con el mismo train/test)
# ----------------------------------------------------------------------
def _predecir_ganador(g, tr_idx, y_tr, X_te, optimizar):
    from ceba_modelos.estimadores import build_estimator
    from ceba_modelos.preprocess import make_preprocessor
    from pipeline.modelado import TRIALS, tunear_lgbm

    X_tr = g["X"].iloc[tr_idx] if tr_idx is not None else g["X"]
    if not optimizar:
        est = build_estimator("lightgbm", g["nums"], g["cats"], seed=SEMILLA_SUPERCICLO,
                              params=HPARAMS_GANADOR)
        est.fit(X_tr, y_tr)
        return np.asarray(est.predict(X_te), dtype=float)
    pre = make_preprocessor(g["nums"], g["cats"], scale_numeric=False)
    A = pre.fit_transform(X_tr)
    modelo, _ = tunear_lgbm(A, y_tr, TRIALS["lgbm"])
    modelo.fit(A, y_tr)
    return np.asarray(modelo.predict(pre.transform(X_te)), dtype=float)


def ajustar_fold(d, cols, ganadores, tr, te):
    from pipeline.modelado import ModeloAgroCebada

    modelo = ModeloAgroCebada(cols).fit(d.X.iloc[tr], d.y[tr])
    p = modelo.predecir(d.X.iloc[te])
    sal = {m: np.asarray(p[m], dtype=float) for m in PIPELINE}
    for nombre, (ds, opt) in VARIANTES.items():
        g = ganadores[ds]
        pg = _predecir_ganador(g, tr, d.y[tr], g["X"].iloc[te], opt)
        sal[nombre] = pg
        sal[f"mezcla_{nombre}"] = (p["ensamble"] + pg) / 2
    sal["media_resto"] = np.full(len(te), d.y[tr].mean())
    return sal


def correr_cv(d, cols, ganadores, n_jobs):
    from sklearn.model_selection import LeaveOneGroupOut, RepeatedStratifiedKFold

    from pipeline.modelado import SEMILLA

    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=SEMILLA)
    tareas = [("estratificada", i // 5, tr, te) for i, (tr, te) in enumerate(cv.split(d.X, d.estrato))]
    tareas += [("lomo", 0, tr, te) for tr, te in LeaveOneGroupOut().split(d.X, d.y, groups=d.municipios)]
    print(f"{len(tareas)} folds ({len(tareas) - 9} estratificados + 9 LOMO), n_jobs={n_jobs}", flush=True)
    t0 = time.time()
    res = Parallel(n_jobs=n_jobs, verbose=5)(
        delayed(ajustar_fold)(d, cols, ganadores, tr, te) for _, _, tr, te in tareas)
    print(f"CV lista en {time.time() - t0:.0f} s", flush=True)

    filas = []
    for (esquema, rep, _, te), sal in zip(tareas, res):
        for m, pred in sal.items():
            filas.append(pd.DataFrame({
                "esquema": esquema, "rep": rep, "id": d.ids[te], "municipio": d.municipios[te],
                "y": d.y[te], "modelo": m, "pred": pred}))
    return pd.concat(filas, ignore_index=True)


def predicciones_59(d, cols, ganadores):
    """Efecto sobre las 59 ocultas: ganador ajustado a las 138 vs. lo que hoy sirve la API."""
    ref = pd.read_csv(ROOT / "api" / "cebadata_api" / "pipeline" / "salidas" / "predicciones_59_parcelas.csv")
    ref = ref.set_index("ID_POLIGONO").loc[d.ids_pred]
    out = pd.DataFrame({"id": d.ids_pred, "pred_ensamble": ref["pred_ensamble"].to_numpy(),
                        "pred_ubicacion": ref["pred_ubicacion"].to_numpy(),
                        "pred_mezcla_actual": ref["pred_mezcla"].to_numpy()})
    for nombre, (ds, opt) in VARIANTES.items():
        if opt:
            continue
        g = ganadores[ds]
        pg = _predecir_ganador(g, None, d.y, g["X_pred"], False)
        out[f"pred_{nombre}"] = pg
        out[f"pred_mezcla_{nombre}"] = (out["pred_ensamble"] + pg) / 2
    return out


# ----------------------------------------------------------------------
# Análisis
# ----------------------------------------------------------------------
def _pivot(df, esquema):
    s = df[df.esquema == esquema]
    ids = np.sort(s["id"].unique())
    base = s[s.modelo == "ensamble"].drop_duplicates(["rep", "id"]).set_index(["rep", "id"])
    y = base["y"].groupby(level="id").first().loc[ids].to_numpy()
    mun = base["municipio"].groupby(level="id").first().loc[ids].to_numpy()
    reps = sorted(s["rep"].unique())
    pred = {}
    for m, g in s.groupby("modelo"):
        mat = np.full((len(reps), len(ids)), np.nan)
        for r in reps:
            gr = g[g.rep == r].set_index("id")["pred"]
            mat[r, :] = gr.reindex(ids).to_numpy()
        pred[m] = mat
    return ids, y, mun, pred


def metricas(df):
    from pipeline.modelado import resumen_metricas

    filas = []
    for esquema in ("estratificada", "lomo"):
        ids, y, mun, pred = _pivot(df, esquema)
        for m, mat in pred.items():
            if np.isnan(mat).any() and esquema == "estratificada":
                continue
            por_rep = [resumen_metricas(y, mat[r]) for r in range(mat.shape[0])]
            filas.append({"esquema": esquema, "modelo": m,
                          "rmse": np.mean([x["rmse"] for x in por_rep]),
                          "rmse_std_rep": np.std([x["rmse"] for x in por_rep]),
                          "mae": np.mean([x["mae"] for x in por_rep]),
                          "r2": np.mean([x["r2"] for x in por_rep]),
                          "sesgo": np.mean([x["sesgo"] for x in por_rep])})
    return pd.DataFrame(filas)


def verificar_reproduccion(met):
    """Las tres cifras del pipeline deben salir igual que las publicadas en pipeline/salidas."""
    sal = ROOT / "api" / "cebadata_api" / "pipeline" / "salidas"
    est = pd.read_csv(sal / "metricas_optimizadas.csv").set_index("modelo")
    lomo = pd.read_csv(sal / "metricas_lomo.csv").set_index("modelo")
    filas = []
    for m in PIPELINE:
        for esq, ref in (("estratificada", est), ("lomo", lomo)):
            aqui = met[(met.esquema == esq) & (met.modelo == m)].iloc[0]
            filas.append({"modelo": m, "esquema": esq, "rmse_aqui": aqui["rmse"],
                          "rmse_pipeline": ref.loc[m, "rmse"],
                          "diferencia": aqui["rmse"] - ref.loc[m, "rmse"]})
    return pd.DataFrame(filas)


def _delta_rmse(se_a, se_b, idx):
    """ΔRMSE = RMSE(a) - RMSE(b), promediado sobre repeticiones, en las parcelas idx."""
    return float(np.mean(np.sqrt(se_a[:, idx].mean(1)) - np.sqrt(se_b[:, idx].mean(1))))


def _boot(se_a, se_b, grupos, por_grupo, rng):
    n = se_a.shape[1]
    if por_grupo:
        etiquetas = np.unique(grupos)
        miembros = {g: np.where(grupos == g)[0] for g in etiquetas}
    out = np.empty(N_BOOT)
    for k in range(N_BOOT):
        if por_grupo:
            elegidos = rng.choice(etiquetas, size=len(etiquetas), replace=True)
            idx = np.concatenate([miembros[g] for g in elegidos])
        else:
            idx = rng.integers(0, n, n)
        out[k] = _delta_rmse(se_a, se_b, idx)
    return np.quantile(out, [0.025, 0.975])


def comparar(df, a, b, rng):
    """a contra b (b = referencia). Diferencias negativas = a es mejor."""
    fila = {"candidato": a, "referencia": b}
    for esquema in ("estratificada", "lomo"):
        ids, y, mun, pred = _pivot(df, esquema)
        se_a, se_b = (pred[a] - y) ** 2, (pred[b] - y) ** 2
        todo = np.arange(len(y))
        fila[f"d_rmse_{esquema}"] = _delta_rmse(se_a, se_b, todo)
        lo, hi = _boot(se_a, se_b, mun, False, rng)
        fila[f"ic95_parcelas_{esquema}"] = f"[{lo:+.3f}, {hi:+.3f}]"
        fila[f"_hi_parcelas_{esquema}"] = hi
        lo, hi = _boot(se_a, se_b, mun, True, rng)
        fila[f"ic95_municipios_{esquema}"] = f"[{lo:+.3f}, {hi:+.3f}]"
    c1 = fila["d_rmse_estratificada"] <= -UMBRAL
    c2 = fila["d_rmse_lomo"] <= 0
    c3 = fila["_hi_parcelas_estratificada"] < 0
    fila["c1_baja_0.010_estrat"], fila["c2_lomo_no_peor"], fila["c3_ic_excluye_0"] = bool(c1), bool(c2), bool(c3)
    fila["vale_la_pena"] = bool(c1 and c2 and c3)
    return {k: v for k, v in fila.items() if not k.startswith("_")}


def por_municipio_lomo(df, refs):
    ids, y, mun, pred = _pivot(df, "lomo")
    filas = []
    for g in sorted(set(mun)):
        i = mun == g
        fila = {"municipio_fuera": g, "n": int(i.sum())}
        for m in refs:
            fila[m] = float(np.sqrt(np.mean((pred[m][0, i] - y[i]) ** 2)))
        filas.append(fila)
    return pd.DataFrame(filas)


def analizar(df, p59):
    SALIDA.mkdir(parents=True, exist_ok=True)
    met = metricas(df)
    met.round(4).to_csv(SALIDA / "metricas.csv", index=False)
    rep = verificar_reproduccion(met)
    rep.round(4).to_csv(SALIDA / "verificacion_reproduccion.csv", index=False)

    rng = np.random.default_rng(SEMILLA_BOOT)
    nuevos = [m for m in MODELOS if m not in ("mezcla",)]
    filas = [comparar(df, m, "mezcla", rng) for m in nuevos]
    # ¿aportan los externos? mismo modelo con y sin N + edafología
    filas += [comparar(df, "ganador", "ganador_sin_ext", rng),
              comparar(df, "ganador_opt", "ganador_sin_ext_opt", rng),
              comparar(df, "mezcla_ganador", "mezcla_ganador_sin_ext", rng),
              comparar(df, "mezcla_ganador_opt", "mezcla_ganador_sin_ext_opt", rng)]
    comp = pd.DataFrame(filas)
    for c in [c for c in comp.columns if c.startswith("d_rmse")]:
        comp[c] = comp[c].round(4)
    comp.to_csv(SALIDA / "comparacion_pareada.csv", index=False)

    mun = por_municipio_lomo(df, ["ensamble", "ubicacion", "mezcla", "ganador", "ganador_opt",
                                  "ganador_sin_ext", "mezcla_ganador", "media_resto"])
    mun.round(4).to_csv(SALIDA / "lomo_por_municipio.csv", index=False)

    p59 = p59.copy()
    p59.round(4).to_csv(SALIDA / "predicciones_59_comparacion.csv", index=False)

    pd.set_option("display.width", 220, "display.max_columns", 30)
    print("\n== Reproducción de las cifras publicadas del pipeline ==")
    print(rep.round(4).to_string(index=False))
    print("\n== Métricas (estratificada: media de 3 repeticiones; LOMO: una pasada) ==")
    print(met.round(3).sort_values(["esquema", "rmse"]).to_string(index=False))
    print("\n== Comparación pareada (negativo = el candidato es mejor que la referencia) ==")
    cols = ["candidato", "referencia", "d_rmse_estratificada", "ic95_parcelas_estratificada",
            "d_rmse_lomo", "ic95_municipios_lomo", "c1_baja_0.010_estrat", "c2_lomo_no_peor",
            "c3_ic_excluye_0", "vale_la_pena"]
    print(comp[cols].to_string(index=False))
    print("\n== LOMO por municipio (RMSE) ==")
    print(mun.round(3).to_string(index=False))
    act = p59["pred_mezcla_actual"]
    print("\n== Efecto en las 59 parcelas ocultas respecto de la mezcla actual ==")
    for c in [c for c in p59.columns if c.startswith("pred_mezcla_ganador")] + ["pred_ganador"]:
        dif = p59[c] - act
        print(f"{c:32s} corr {np.corrcoef(p59[c], act)[0, 1]:.3f}  |dif| media {dif.abs().mean():.3f}"
              f"  max {dif.abs().max():.3f}  sesgo {dif.mean():+.3f}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--analizar", action="store_true")
    ap.add_argument("--n-jobs", type=int, default=7)
    args = ap.parse_args()

    if args.analizar:
        df = pd.read_csv(SALIDA / "predicciones_cv.csv", dtype={"id": str})
        p59 = pd.read_csv(SALIDA / "predicciones_59_comparacion.csv")
        analizar(df, p59)
        return

    from pipeline.modelado import cargar_datos, podar_redundantes

    d = cargar_datos()
    cols = podar_redundantes(d.X)
    print(f"Pipeline: {len(d.y)} parcelas, {len(cols)} variables tras la poda")
    ganadores = cargar_ganadores(d)
    for ds, g in ganadores.items():
        print(f"  {ds}: {len(g['cols'])} variables ({len(g['nums'])} num + {len(g['cats'])} cat)")

    SALIDA.mkdir(parents=True, exist_ok=True)
    df = correr_cv(d, cols, ganadores, args.n_jobs)
    df.round(6).to_csv(SALIDA / "predicciones_cv.csv", index=False)
    p59 = predicciones_59(d, cols, ganadores)
    analizar(df, p59)


if __name__ == "__main__":
    main()
