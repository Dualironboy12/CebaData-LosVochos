# Manifiesto — despensa multi-año `multianio_nube30_v1`

Despensa con **bloque A** (ciclo etiqueta 2025, idéntico a `nube30_v1`) y **bloque B** (contexto abr–oct 2022–2024). La etiqueta sigue siendo el rendimiento 2025; en predicción queda vacío.

| Campo | Valor |
| --- | --- |
| Archivo | `parcelas_despensa_multianio_nube30_v1.csv` |
| Diccionario | `parcelas_despensa_multianio_nube30_v1_diccionario.csv` |
| Versión | v1 |
| Fecha de congelación | 2026-10-06 |
| Origen bloque A | copia de `parcelas_despensa_nube30_v1.csv` |
| Origen bloque B | series Básico + clima mensual (`intermedio/`), `NUBE_MAX = 30` |
| Cómo regenerar | `Rscript analisis/datos_fira/R/13_despensa_multianio.R` desde la raíz |
| Dimensión | 197 filas × 125 columnas |
| Columnas bloque B | 24 |
| Llave | `ID_POLIGONO` |
| Umbral de nube | `NUBE_MAX = 30` |
| Ciclo etiqueta | abril–octubre 2025 |
| Contexto histórico | abr–oct 2022, 2023, 2024 (NA si no hay observaciones) |
| Planet histórico | no se inventa (Planet solo existe en 2025, bloque A) |
| Partición | 138 ENTRENAMIENTO / 59 PREDICCION |
| SHA-256 CSV | `cc3c0d85df8efb7bdd5b3cfded5f2c3d14ddad0c18eb2922403866c03d0bb7ed` |
| SHA-256 diccionario | `7620f5f0654ce52482fdf91db7ff8a631749e323501276fd2ba7913ab2bef54e` |

## Bloque B (lista cerrada)

- `ndvi_s2_max_2022`
- `ndvi_s2_int_2022`
- `ndvi_s2_media_sep_oct_2022`
- `ndvi_s2_max_2023`
- `ndvi_s2_int_2023`
- `ndvi_s2_media_sep_oct_2023`
- `ndvi_s2_max_2024`
- `ndvi_s2_int_2024`
- `ndvi_s2_media_sep_oct_2024`
- `crc_s2_media_2022`
- `crc_s2_media_2023`
- `crc_s2_media_2024`
- `vi6t_landsat_max_2022`
- `vi6t_landsat_max_2023`
- `vi6t_landsat_max_2024`
- `lluvia_ciclo_mm_2022`
- `lluvia_ciclo_mm_2023`
- `lluvia_ciclo_mm_2024`
- `ndvi_s2_max_hist_media`
- `ndvi_s2_int_hist_media`
- `ndvi_s2_media_sep_oct_hist_media`
- `crc_s2_media_hist_media`
- `vi6t_landsat_max_hist_media`
- `lluvia_ciclo_mm_hist_media`

## Reglas

- No editar este archivo. Un cambio de criterio genera `multianio_nube30_v2`.
- `rendimiento_t_ha` vacío = etiqueta oculta; no rellenar.
- La despensa `nube30_v1` (solo 2025) no se modifica; es la base de `solo2025`.

