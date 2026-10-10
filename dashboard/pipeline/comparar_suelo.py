"""Compara el modelo SIN suelo (referencia guardada) contra la corrida actual CON suelo.

Uso (despues de correr paso05b_soilgrids.py y luego correr_pipeline.py):
    python comparar_suelo.py

Lee:
  referencia_sin_suelo/   resultados de la version sin suelo (vienen en el zip)
  salidas/                resultados de la corrida actual

Imprime tres evidencias y un veredicto:
  1. Validacion anidada del paso 07 (RMSE, MAE, R2 del ensamble), antes vs despues.
  2. Ablacion del paso 08: "todo" vs "todo_sin_suelo". Es la prueba mas limpia,
     porque ambos bloques se evaluan con exactamente las mismas particiones.
  3. Peso SHAP de la familia suelo y cuanto cambian las 59 predicciones.

Regla de decision (documentarla en el reporte):
  Se adopta el suelo solo si baja el RMSE del ensamble al menos 0.010 t/ha
  Y en la ablacion "todo" le gana a "todo_sin_suelo". Diferencias menores
  estan dentro del ruido de la validacion y no justifican la complejidad extra.
"""
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).parent
REF = RAIZ / "referencia_sin_suelo"
ACT = RAIZ / "salidas"
UMBRAL_MEJORA = 0.010


def leer(carpeta, nombre):
    ruta = carpeta / nombre
    if not ruta.exists():
        raise SystemExit(f"No encuentro {ruta}. Corre primero el pipeline completo.")
    return pd.read_csv(ruta)


def main():
    if not (ACT / "suelo_parcela.csv").exists():
        raise SystemExit("No existe salidas/suelo_parcela.csv: corre src/paso05b_soilgrids.py "
                         "y despues correr_pipeline.py antes de comparar.")

    print("=" * 64)
    print("1) Validacion anidada (paso 07), ensamble")
    print("=" * 64)
    ref = leer(REF, "metricas_optimizadas.csv").set_index("modelo")
    act = leer(ACT, "metricas_optimizadas.csv").set_index("modelo")
    tabla = pd.DataFrame({
        "rmse_sin_suelo": ref["rmse"], "rmse_con_suelo": act["rmse"],
        "mae_sin_suelo": ref["mae"], "mae_con_suelo": act["mae"],
        "r2_sin_suelo": ref["r2"], "r2_con_suelo": act["r2"],
    })
    tabla["delta_rmse"] = tabla["rmse_con_suelo"] - tabla["rmse_sin_suelo"]
    print(tabla.round(4).to_string())
    delta_ens = float(tabla.loc["ensamble", "delta_rmse"])

    print("\n" + "=" * 64)
    print("2) Ablacion pareada (paso 08), mismas particiones")
    print("=" * 64)
    abla = leer(ACT, "ablacion_bloques.csv").set_index("bloque")
    print(abla.round(4).to_string())
    gana_ablacion = None
    if {"todo", "todo_sin_suelo"} <= set(abla.index):
        d = abla.loc["todo", "rmse"] - abla.loc["todo_sin_suelo", "rmse"]
        gana_ablacion = d < 0
        print(f"\ntodo - todo_sin_suelo = {d:+.4f} t/ha "
              f"({'el suelo ayuda' if gana_ablacion else 'el suelo NO ayuda'})")

    print("\n" + "=" * 64)
    print("3) Peso del suelo y efecto en las predicciones")
    print("=" * 64)
    shap = leer(ACT, "shap_importancia.csv")
    fam = shap.groupby("familia")["shap_medio_abs"].sum().sort_values(ascending=False)
    rank = list(fam.index).index("suelo") + 1 if "suelo" in fam.index else None
    if rank:
        print(f"Familia suelo: suma |SHAP| = {fam['suelo']:.3f} t/ha (lugar {rank} de {len(fam)})")
        print(shap[shap.familia == "suelo"][["variable", "shap_medio_abs"]].round(4)
              .to_string(index=False))
    p_ref = leer(REF, "predicciones_59_parcelas.csv").set_index("ID_POLIGONO")
    p_act = leer(ACT, "predicciones_59_parcelas.csv").set_index("ID_POLIGONO")
    cambio = (p_act["RENDIMIENTO_T_HA_PRED"] - p_ref["RENDIMIENTO_T_HA_PRED"]).abs()
    print(f"\nCambio en las 59 predicciones: medio {cambio.mean():.3f} t/ha, "
          f"maximo {cambio.max():.3f} t/ha")

    print("\n" + "=" * 64)
    adoptar = (-delta_ens >= UMBRAL_MEJORA) and (gana_ablacion is not False)
    if adoptar:
        print(f"VEREDICTO: ADOPTAR SUELO. El RMSE del ensamble baja {-delta_ens:.3f} t/ha "
              f"(umbral {UMBRAL_MEJORA}) y la ablacion lo confirma.")
    else:
        print(f"VEREDICTO: NO ADOPTAR SUELO. Cambio de RMSE {delta_ens:+.3f} t/ha, "
              f"por debajo del umbral de {UMBRAL_MEJORA} o sin respaldo en la ablacion.")
        print("Para volver a la version sin suelo: borra salidas/suelo_parcela.csv "
              "y corre de nuevo correr_pipeline.py.")
    print("=" * 64)


if __name__ == "__main__":
    main()
