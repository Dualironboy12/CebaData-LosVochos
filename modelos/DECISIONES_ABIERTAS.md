# Decisiones de modelado (fase 2)

Cerradas el **2026-10-06** (defaults iniciales) y **ampliadas el mismo día** con el superciclo Classic ML.

## Cerradas

| # | Tema | Decisión |
| --- | --- | --- |
| D1 | Cardinalidad de CV | **Leave-one-municipio-out** (LOGO). Reportar `n_test` por fold y RMSE/MAE/r² OOF globales. Chequeo adicional por `pixel_clima`. |
| D2 | Encoder de categoricals | **One-Hot** ajustado solo en el train de cada fold (`handle_unknown="ignore"`). |
| D3 | `pixel_clima` como feature | **Categórico** (cuando esté en el CSV de features). |
| D4 | Stack Classic ML | **Baselines** (`media_global`, `media_estado`) + **ridge**, **elasticnet**, **random_forest**, **hist_gradient_boosting**, **lightgbm**. HPO solo en top-K tras el grid. |
| D5 | Tamaño del barrido | **Superciclo full:** 1024 CSVs del catálogo × modelos capa B; HPO top-30 (cupo 15 reto / 15 extendido). |
| D6 | Ramas git | Trabajar en **`dev-modelos`**. |
| D7 | Versionar artefactos | Métricas y predicciones en `comparativas/superciclo_v1/` y `salidas/superciclo_v1/`; no versionar miles de joblibs. |

## Resultado del superciclo v1 (referencia)

- Informe: [`comparativas/superciclo_v1/informe_superciclo.html`](comparativas/superciclo_v1/informe_superciclo.html)
- Veredicto automático (umbrales del plan): ver `meta_analisis.json` en la misma carpeta.

## Reabrir

Solo con acuerdo explícito del equipo.
