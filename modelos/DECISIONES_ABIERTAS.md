# Decisiones de modelado (fase 2)

Cerradas el **2026-10-06** tras acuerdo del equipo (defaults D1–D4 y D7; rama `dev-modelos`; barrido inicial de 9 CSVs).

## Cerradas

| # | Tema | Decisión |
| --- | --- | --- |
| D1 | Cardinalidad de CV | **Leave-one-municipio-out** (LOGO). Reportar `n_test` por fold y RMSE/MAE/r² OOF globales (concatenando predicciones). Chequeo adicional por `pixel_clima`. |
| D2 | Encoder de categoricals | **One-Hot** ajustado solo en el train de cada fold (`handle_unknown="ignore"`). |
| D3 | `pixel_clima` como feature | **Categórico** (cuando esté en el CSV de features). |
| D4 | Stack del día 1 | **Solo sklearn**: media global, **media por estado** (baseline espacial usable bajo LOGO), Ridge, `HistGradientBoostingRegressor`. LightGBM más adelante si hace falta. Nota: media por municipio bajo LOGO degenera a media global. |
| D5 | Tamaño del barrido | **9 CSVs** de `config/default.yaml` → `barrido_inicial`. Ampliar solo si el gap `sin_ubic` vs `ubic_completa` lo justifica. |
| D6 | Ramas git | Trabajar en **`dev-modelos`**. |
| D7 | Versionar artefactos | **Métricas y predicciones OOF/pred en repo** (`modelos/salidas/`). No versionar todos los `.joblib`; el de entrega va a `entrega/` cuando se elija. |

## Notas de interpretación del acuerdo

El mensaje del equipo numeró “D5 = rama” y “D6 = default”; en este archivo D5 es el barrido y D6 la rama. Quedó aplicado así: rama = `dev-modelos`; barrido y artefactos = defaults de la tabla.

## Reabrir

Solo con acuerdo explícito del equipo (p. ej. añadir LightGBM o ampliar el barrido).
