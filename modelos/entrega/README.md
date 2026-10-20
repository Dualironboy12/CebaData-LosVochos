# Modelo de entrega: mezcla

Arquitectura firmada por el equipo (2026-10-13) para el Reto AgroCebada FIRA 2026.

El código que entrena y el que predice en runtime están en el submódulo [`../../sistema/api/`](../../sistema/api/) (repo [cebadata_api](https://github.com/ALNM7/cebadata_api), commit fijado). El dashboard que los consulta es [`../../sistema/dashboard/`](../../sistema/dashboard/). Esta carpeta guarda la decisión; no duplica el pipeline.

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

Inferencia: `sistema/api/api/predictor.py`. Entrenamiento: `sistema/api/pipeline/` (pasos 01–10). Cómo reentrenar: el README de [`sistema/api`](../../sistema/api/README.md). El artefacto publicado cuenta 122 variables en la mezcla; la cuenta de esta ficha es 121 (`lon` ya va en las columnas del ensamble). La corrección propuesta está en [`../../docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md`](../../docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md).

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

1. El paso 07 del pipeline comparó los tres candidatos con las dos validaciones. Donde se califica, ensamble y mezcla empatan (diferencia < 0.010 t/ha); la mezcla tiene el mejor MAE y recorta casi a la mitad la caída del ensamble en LOMO.
2. **Prueba pareada del ganador del superciclo** ([`../comparativas/prueba_ganador_en_pipeline/INFORME.md`](../comparativas/prueba_ganador_en_pipeline/INFORME.md)): el LightGBM ganador del superciclo (13 variables con N + edafología) no supera a la mezcla bajo el criterio fijado de antemano (≥ 0.010 de mejora estratificada, LOMO no peor, IC bootstrap excluye 0). Los datos externos tampoco lo cumplen.
3. El aporte del superciclo a la entrega es la **idea de la longitud** como señal espacial fuerte en esta caja geográfica, no el CSV ni el joblib del ganador.

## Predicciones de las 59 parcelas

[`ID_area_rendimiento_70_30_con_predicciones.csv`](ID_area_rendimiento_70_30_con_predicciones.csv) copia el CSV oficial (`ID_POLIGONO`, `AREA_HA`, `RENDIMIENTO_T_HA`, `CONJUNTO`) y rellena solo las 59 filas de `PREDICCION` con la predicción de la mezcla que sirve la API (`sistema/api/artefactos/tablas/predicciones.csv`). Las 138 de entrenamiento conservan el rendimiento observado. El archivo oficial en `DATASET_RETO_AGRO_2026/` no se modifica.

## Límites

- Una sola temporada (abril–octubre 2025).
- La longitud funciona porque el rendimiento cambia de oeste a este dentro de ~45 km; fuera de esta región ninguno es confiable.
- Con la mezcla solo la parte del ensamble reacciona al clima: en el simulador el efecto sale la mitad de grande.
- La lluvia de mayo puede actuar como indicador de zona; su peso SHAP no prueba causalidad.
- **SHAP explica solo el LightGBM del ensamble** (peso 1/6), no la mezcla completa.
- Herramienta de apoyo; no sustituye la evaluación crediticia.
