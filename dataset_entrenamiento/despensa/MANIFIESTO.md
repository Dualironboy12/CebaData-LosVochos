# Manifiesto — despensa congelada `nube30_v1`

Despensa de parcelas con una fila por parcela, generada por el pipeline en R de `analisis/`. **Sustituye a la base generada con `NUBE_MAX = 0`** (primer KDD), que ya no debe usarse para entrenar.

| Campo | Valor |
| --- | --- |
| Archivo | `parcelas_despensa_nube30_v1.csv` |
| Diccionario | `parcelas_despensa_nube30_v1_diccionario.csv` (columna, grupo, descripción) |
| Versión | v1 |
| Fecha de congelación | 2026-10-03 |
| Origen | `analisis/R/01_*.R` a `06_*.R` → `analisis/salida/parcelas_trabajo.csv` (copia exacta) |
| Cómo regenerar | `bash analisis/correr.sh` desde la raíz del repo |
| Dimensión | 197 filas × 101 columnas |
| Llave | `ID_POLIGONO` (`AGC_001` … `AGC_197`) |
| Umbral de nube | `NUBE_MAX = 30` (`porcentaje_nubosidad <= 30` en las series Básico y PRO) |
| Ciclo de la etiqueta | abril–octubre de 2025 (2025-04-01 a 2025-10-31) |
| Mínimo de observaciones por parcela | `MIN_OBS_CICLO = 5`; ninguna parcela queda por debajo (mínimos: Sentinel-2 27, Landsat 8, Planet 60) |
| Partición | 138 `ENTRENAMIENTO` con `rendimiento_t_ha`; 59 `PREDICCION` con `rendimiento_t_ha` vacío |
| SHA-256 CSV | `07e8c1038d306fc3935bfa26ea5ae960ddac9c63ee07073186a6b4521512b553` |
| SHA-256 diccionario | `d4f286658dccae5fc419729abaee1dfb1537a401c617bf937c7952958b6f2b66` |

## Contenido

- Identificación, geometría resumida (`lon`, `lat`, `area_ha`), `municipio`, `estado`, `conjunto` y la etiqueta.
- Resumen del ciclo por sensor, sin mezclar fuentes: Sentinel-2 (`*_s2_*`), Landsat (`vi6t_landsat_*`) y Planet (`*_planet_*`).
- Clima del ciclo (lluvia y temperatura de GeoTIFF mensuales, píxel de 0.05°) y topografía (elevación y pendiente, reproyectadas a EPSG:6372).
- Columnas de ubicación (`estado`, `municipio`, `lon`, `lat`, `pixel_clima`, …) conviven con las demás: las tres filosofías (sin ubicación / parcial / completa) se obtienen al derivar CSVs desde esta despensa, no al editarla.

## Reglas

- No editar este archivo. Un cambio de criterio genera `nube30_v2` (o equivalente) con su propio manifiesto.
- `rendimiento_t_ha` vacío significa etiqueta oculta; no rellenar.
- Los experimentos en `modelos/` deben citar la versión y el SHA-256 usados.
