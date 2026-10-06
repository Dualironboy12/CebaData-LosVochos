# Propuesta de modelos y arquitecturas

Documento de diseño para la fase 2 (Python, `modelos/`). Basado en el perfil de los CSVs curados v1 (ver [`ESTADO_DATOS.md`](ESTADO_DATOS.md)) y en las decisiones del roadmap (CV por municipio, métricas RMSE / MAE / r², classic ML primero).

## 1. Qué problema es

| Aspecto | Valor |
| --- | --- |
| Tarea | Regresión: `rendimiento_t_ha` |
| Unidad | 1 fila = 1 parcela |
| n entrenamiento | 138 |
| n predicción | 59 (sin etiqueta) |
| Features | Tablas densas, 9–40 variables útiles por CSV |
| Estructura espacial | Clustering fuerte por municipio / estado / píxel clima |
| Señal | Índices de dosel (S2/Planet), VI6T, lluvia, topo; opcional suelo (E) e historial 2022–2024 |

No es un problema de visión ni de series crudas: las series ya están condensadas. Un LLM o un modelo HF de lenguaje **no** sustituyen el predictor tabular.

## 2. Familias recomendadas (prioridad)

### A. Baselines (obligatorios, día 1)

| Modelo | Idea | Por qué |
| --- | --- | --- |
| **Media global** | Predice \(\bar{y}\) del train fold | Piso trivial |
| **Media por municipio** | Predice media del municipio visto en train; si el municipio del test no aparece, cae a media global | Baseline espacial del roadmap; mide cuánto “vale” solo la geografía |

Estos no usan el núcleo agronómico; sirven para anclar si un ML aporta algo por encima de la ubicación.

### B. Classic ML (prioridad alta)

| Modelo | Encaje | Notas de uso |
| --- | --- | --- |
| **Ridge / ElasticNet** | Muy buen fit a p pequeño y colinealidad (NDVI fases ≈ integral) | Escalar numéricas; OHE o target-encoding con cuidado en CV para categoricals |
| **Random Forest** | No linealidades suaves, robusto a escala | `min_samples_leaf` alto (3–5) para n=138; no hiper-tunear a muerte |
| **HistGradientBoosting / LightGBM** | Suele ganar en tabular pequeño-mediano | Regularizar fuerte (`max_depth` 3–5, `min_child_samples` ≥ 10); early stopping interno con un fold holdout o iteraciones fijas |

**Orden de implementación:** baseline → Ridge → RF o HistGBM → LightGBM si el entorno lo permite.

### C. Modelos aplazados (solo si classic ML estanca)

| Modelo | Cuándo considerarlo | Riesgo |
| --- | --- | --- |
| SVR (RBF) | Señal suave, pocas features | Sensible a escala e hiperparámetros |
| MLP pequeño (2 capas, ≤64 unidades) | Como control “no lineal denso” | Overfitting fácil con n=138 |
| Stacking (Ridge + árbol) | Cuando haya 2–3 modelos estables | Complejidad de entrega |

**Fuera de alcance razonable:** CNNs sobre rásteres, transformers espaciales, fine-tune de foundation models satelitales, AutoML pesado. El condensamiento ya es la hipótesis de features.

## 3. Cómo casan con nuestras características

```text
n=138, p~10–40  →  modelos lineales + árboles; CV espacial obligatoria
municipios con 1 parcela  →  folds desbalanceados; reportar n_test por fold
elevación/temp ~ estado (KDD)  →  comparar sin_ubic vs con ubicación
multi-año añade ~24 cols  →  Ridge/árboles lo absorben; no hace falta RNN
edaf_grupo (3–5 niveles)  →  categoría de baja cardinalidad; OHE dentro de fold
sg_* continuas  →  como numéricas del núcleo
```

## 4. Preprocesamiento (contrato con la ingesta)

1. Separar **meta** (`ID_POLIGONO`, `conjunto`, `municipio`, `pixel_clima`, `estado`) de **X** y **y**.
2. `y` solo en `ENTRENAMIENTO`; filas `PREDICCION` van a un bundle de inferencia sin `y`.
3. Numéricas: `StandardScaler` **ajustado solo en el train fold** (para Ridge/SVR/MLP). Árboles pueden omitir escala.
4. Categóricas presentes en X (`estado`, `municipio`, `edaf_grupo`, a veces `pixel_clima`):
   - Opción por defecto: **One-Hot** con categorías del train fold; niveles nuevos en test → columna 0.
   - Alternativa (decidir): target encoding con CV interna (más riesgo de leakage si se hace mal).
5. No imputar `y`. Features del núcleo actual no tienen NA; si aparece NA en un CSV futuro, política: fallar ruidoso o mediana del train fold (documentar).

## 5. Validación

| Nivel | Esquema | Uso |
| --- | --- | --- |
| Oficial | GroupKFold / LeaveOneGroupOut por **municipio** | Comparar modelos y CSVs |
| Chequeo | Mismos folds pero agrupar reporte por **pixel_clima** (o segundo GroupKFold) | Detectar fuga climática |
| Prohibido como oficial | `train_test_split` aleatorio de parcelas | Solo humo interno |

Semilla fija (p. ej. `SEED=20261006`) en todos los experimentos. Métricas por fold y media ± sd: RMSE, MAE, r².

## 6. Plan de experimentos (corto)

1. **Smoke:** 1 CSV (`solo2025_sin_ubic_reto`) × baselines + Ridge.
2. **Barrido reto:** 6 CSVs de ubicación/temporal × Ridge + HistGBM.
3. **Extendidos:** mismos 2–3 mejores ubicaciones × `reto` vs `n` vs `n-edaf`.
4. **Elegir** (humano): modelo + `dataset_id` de entrega → predecir las 59.

Artefactos por corrida: métricas CSV, `joblib` del pipeline sklearn, manifiesto (dataset_id, semilla, git hash si hay, columnas).

## 7. Entrega hacia dashboard

Contrato tentativo (se fija al elegir modelo):

- Entrada: fila(s) con las mismas columnas de features del CSV ganador (sin `rendimiento_t_ha`).
- Salida: `ID_POLIGONO`, `rendimiento_pred_t_ha`, opcional intervalo o `modelo_id`.
- Empaquetado: `Pipeline` sklearn (preprocess + estimador) serializado.

## 8. Qué no decide este documento

Ver sección de decisiones abiertas al final de esta sesión / en el mensaje al equipo. En particular: subset exacto de CSVs del primer barrido, encoder de categoricals, y si LightGBM entra en el entorno mínimo o nos quedamos en `sklearn` puro.
