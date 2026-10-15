# Modelo de entrega: mezcla

Arquitectura firmada por el equipo (2026-10-13) para el Reto AgroCebada FIRA 2026. La API en [`../../api/`](../../api/) carga los artefactos exportados aquí; el dashboard en [`../../dashboard/`](../../dashboard/) los consulta.

## Arquitectura

La predicción final es el **promedio** de dos bloques:

| Pieza | Variables | Peso |
| --- | --- | --- |
| LightGBM | 121 (satélite, clima, topografía, ubicación) | 1/6 |
| Random Forest | las mismas 121 | 1/6 |
| Elastic Net | las mismas 121 (con escalador) | 1/6 |
| LightGBM de longitud | solo `lon` | 1/2 |

- Preprocesamiento: imputador de mediana compartido; el escalador solo lo usa Elastic Net.
- El bloque LightGBM + RF + Elastic Net forma el **ensamble** (promedio simple de los tres).
- La **mezcla** es `(ensamble + lgbm_longitud) / 2`.

Código de inferencia en runtime: [`../../api/api/predictor.py`](../../api/api/predictor.py). Entrenamiento: [`pipeline/`](pipeline/) (pasos 01–10).

## Métricas (validación anidada, 138 parcelas)

| Enfoque | Variables | RMSE estratificada | MAE | RMSE LOMO | Sesgo LOMO |
| --- | --- | --- | --- | --- | --- |
| Ensamble | 121 | 0.508 | 0.362 | 0.722 | −0.102 |
| Solo ubicación (`lon`) | 1 | 0.525 | 0.364 | 0.539 | +0.077 |
| **Mezcla (entrega)** | **121** | **0.508** | **0.354** | **0.595** | **−0.013** |

- **Estratificada por municipio** (5 × 3): mide lo que se califica (las 59 ocultas están en los mismos municipios).
- **LOMO** (un municipio fuera): mide zona nueva dentro de la región.
- Baseline de referencia: predecir el promedio → RMSE 0.846 (estratificada).

## Por qué se eligió

1. **Paso 07 del pipeline** comparó los tres candidatos con las dos validaciones. Donde se califica, ensamble y mezcla empatan (diferencia < 0.010 t/ha); la mezcla tiene el mejor MAE y recorta casi a la mitad la caída del ensamble en LOMO.
2. **Prueba pareada del ganador del superciclo** ([`../comparativas/prueba_ganador_en_pipeline/INFORME.md`](../comparativas/prueba_ganador_en_pipeline/INFORME.md)): el LightGBM ganador del superciclo (13 variables con N + edafología) no supera a la mezcla bajo el criterio fijado de antemano (≥ 0.010 de mejora estratificada, LOMO no peor, IC bootstrap excluye 0). Los datos externos tampoco lo cumplen.
3. El aporte del superciclo a la entrega es la **idea de la longitud** como señal espacial fuerte en esta caja geográfica, no el CSV ni el joblib del ganador.

## Límites (hay que decirlos tal cual)

- Una sola temporada (abril–octubre 2025).
- La longitud funciona porque el rendimiento cambia de oeste a este dentro de ~45 km; fuera de esta región ninguno es confiable.
- Con la mezcla solo la parte del ensamble reacciona al clima: en el simulador el efecto sale la mitad de grande.
- La lluvia de mayo puede actuar como indicador de zona; su peso SHAP no prueba causalidad.
- **SHAP explica solo el LightGBM del ensamble** (peso 1/6), no la mezcla completa. La cascada de la ficha y los paneles de importancia lo deben indicar.
- Herramienta de apoyo; no sustituye la evaluación crediticia.

## Cómo reentrenar y exportar

```bash
# Desde la raíz del repo
python3 -m venv modelos/entrega/.venv
source modelos/entrega/.venv/bin/activate
pip install -r modelos/entrega/pipeline/requirements-pipeline.txt

# DATASET_RETO_AGRO_2026 debe estar en la raíz (o CEBADATA_DATASET=...)
PYTHONPATH=modelos/entrega python -m pipeline.run_pipeline           # pasos 01–10 (~8 min)
PYTHONPATH=modelos/entrega python -m pipeline.run_pipeline --desde 10  # solo reexportar api/artefactos/

PYTHONPATH=modelos/entrega python -m pytest modelos/entrega/pipeline/tests -p no:django
```

Después: `git diff api/artefactos/`, pruebas de la API (`cd api && pytest`) y commit.

## Artefactos que consume la API

`api/artefactos/` (versionados, ~2 MB):

- `modelo/`: imputador, escalador, lgbm, rf, enet, lgbm_longitud
- `metadata.json`: orden de las 121 variables, pesos, versiones, checksums
- `metricas_dashboard.json`: métricas y hallazgos para el panel
- `tablas/`: parcelas, predicciones, features, SHAP, clima, serie satelital, vecinos
