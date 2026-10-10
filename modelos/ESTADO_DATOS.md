# Estado de datos para la fase 2 (2026-10-06)

Revisión de readiness antes de entrenar. Fuentes: despensas + `catalogo_datasets_v1.csv`.

## Resumen

| Pieza | Estado | Notas |
| --- | --- | --- |
| Despensa solo 2025 | Lista | 197 × 101, `NUBE_MAX=30` |
| Despensa multi-año | Lista | 197 × 125 (bloque B 2022–2024) |
| Matriz curada | Lista | 1024 CSVs; 64 reto + 960 extendidos |
| Catálogo | Lista | `dataset_entrenamiento/manifiestos/catalogo_datasets_v1.csv` |
| Núcleo agronómico | Completo | 0 NA en columnas del núcleo (197 parcelas) |
| Bloque B histórico | Completo | 0 NA en muestreo de máx NDVI/lluvia/VI6T 2022 y medias hist. |
| Partición oficial | Intacta | 138 ENTRENAMIENTO / 59 PREDICCION; rendimiento vacío solo en predicción |
| Código de entrenamiento | Pendiente | Esta carpeta; ingesta iniciada en `src/` |

**Veredicto:** los datos de entrada están listos. No hace falta regenerar la matriz para arrancar baselines.

## Perfil de la etiqueta (entrenamiento)

| Estadístico | Valor |
| --- | --- |
| n | 138 |
| min / mediana / max (t/ha) | 2.00 / 4.34 / 5.59 |
| media / sd | 3.96 / 0.85 |
| Estados | Puebla 71, Hidalgo 36, Tlaxcala 31 |
| Municipios distintos | 9 |
| Tamaños por municipio | 1, 1, 1, 3, 5, 10, 16, 30, 71 |
| Píxeles de clima distintos | 23 |

Implicación: hay municipios con **1 parcela** → un fold leave-one-municipio-out deja ese fold con un solo test point; hay que reportar métricas agregadas con cuidado (y no descartar folds sin documentarlo).

## Anchos de tabla en la matriz

- Mínimo (~12 cols): `solo2025` + `sin_ubic` + `reto` (núcleo).
- Máximo (~45 cols): `multianio` + `ubic_completa` + los 4 de \(E\).
- Régimen: **n ≈ 138, p ≪ n** en casi todos los CSVs → classic ML tabular, no deep learning masivo.

## Advertencia de diseño (CV vs features)

Los CSV con `ubic_tag=sin_ubic` **no incluyen** `municipio` ni `pixel_clima` como columnas de features. La CV oficial sigue siendo por municipio. La ingesta debe:

1. Cargar el CSV del catálogo como **features + etiqueta**.
2. Unir por `ID_POLIGONO` un **sidecar de CV** desde la despensa (`municipio`, `pixel_clima`, `estado`) aunque no entren al modelo.

Ver `src/ceba_modelos/ingesta.py`.

## Subconjunto recomendado para el primer barrido

No entrenar los 1024 el día 1. Propuesta inicial (8–12 CSVs):

| temporal | ubic_tag | ext_tag |
| --- | --- | --- |
| solo2025 | sin_ubic | reto |
| solo2025 | ubic_completa | reto |
| solo2025 | ubic_mun | reto |
| solo2025 | ubic_est-mun | reto |
| multianio | sin_ubic | reto |
| multianio | ubic_completa | reto |
| solo2025 | sin_ubic | n |
| solo2025 | sin_ubic | n-edaf |
| solo2025 | sin_ubic | n-edaf-cec-silt |

Filtrar el catálogo por esas tripletas; el pipeline de experimentación (siguiente paso) debe aceptar una lista o un filtro YAML.
