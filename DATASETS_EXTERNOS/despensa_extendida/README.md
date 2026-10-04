# Despensa extendida

CSV que amplía la despensa congelada del reto con columnas de fuentes externas. Por ahora aporta una: **edafología INEGI**. Cada fuente nueva se añade con su propio script y su documento de fuente; la despensa del reto nunca se modifica.

## Base

- [`dataset_entrenamiento/despensa/parcelas_despensa_nube30_v1.csv`](../../dataset_entrenamiento/despensa/MANIFIESTO.md): 197 parcelas, nube ≤ 30, ciclo abril–octubre 2025.
- Geometría de las parcelas: `DATASET_RETO_AGRO_2026/Parcelas_Reto_AGC_CONJUNTO_70_30/` (EPSG:4326).

## Cruce espacial

1. Se obtiene la edafología recortada. Si existe el shapefile nacional, se le asigna EPSG:6372 (no trae `.prj`; ver [`fuentes_edafologia.md`](fuentes_edafologia.md)), se recorta al área de las parcelas más 5 km y se guarda en `edafologia_recorte_parcelas_v1.gpkg`. Si no existe, se lee directamente ese `.gpkg`.
2. Las parcelas se transforman de EPSG:4326 a EPSG:6372.
3. Se intersecta cada parcela con los polígonos de suelo y se elige, por parcela, el polígono con **mayor área de intersección**.
4. Se unen los atributos al CSV de la despensa por `ID_POLIGONO` (`AGC_###`).

## Columnas añadidas

`edaf_grupo`, `edaf_grupo_cod`, `edaf_textura`, `edaf_clase_tex`, `edaf_clave_wrb`, `edaf_fraccion_area`. Definiciones en [`fuentes_edafologia.md`](fuentes_edafologia.md) y en el diccionario del CSV.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `parcelas_despensa_extendida_edaf_v1.csv` | Despensa nube 30 + columnas `edaf_*` (197 filas) |
| `parcelas_despensa_extendida_edaf_v1_diccionario.csv` | Diccionario de todas las columnas, con la fuente (reto / INEGI) |
| `edafologia_recorte_parcelas_v1.gpkg` | Recorte de la edafología INEGI (140 polígonos, EPSG:6372, ~0.7 MB). Es la entrada que hace reproducible el cruce sin el shapefile nacional |
| `fuentes_edafologia.md` | Origen, licencia, CRS y limitaciones de la edafología |

El control del cruce queda en `analisis/datos_inegi/salida/tablas/07_edaf_join_resumen.csv` (parcelas por grupo, fracción de área mínima, parcelas sin suelo).

## Cómo regenerar

Desde la raíz del repo, con el entorno de `analisis/correr.sh`:

```bash
Rscript analisis/datos_inegi/R/07_despensa_extendida_edaf.R   # genera el CSV extendido
Rscript analisis/datos_inegi/R/08_relaciones_edaf.R           # tablas, figuras y mapa suelo + rendimiento
```

Estos dos scripts no forman parte de `correr.sh`: son opcionales. Con solo el contenido versionado del repo funcionan (07 lee el `.gpkg`). El shapefile nacional de INEGI, de 225 MB, no se versiona y solo se usa si está presente; con `CEBA_EDAF_RECORTE=1` se fuerza a usar el `.gpkg` aunque esté.

## Reglas

- Los archivos originales de INEGI y la despensa del reto no se modifican. `DATASETS_EXTERNOS/` está en `.gitignore` salvo esta carpeta: los datos crudos nuevos no se suben por accidente.
- No se imputa nada: una parcela sin polígono de suelo quedaría con `NA` (hoy no hay ninguna).
- `rendimiento_t_ha` vacío sigue significando etiqueta oculta.
- Copiar este CSV a `dataset_entrenamiento/curados_extendidos/` es un paso posterior, en la subrama del dataset extendido.

## SoilGrids

| Archivo | Contenido |
| --- | --- |
| `parcelas_despensa_extendida_soilgrids_v1.csv` | Identificación de parcela + 336 columnas `sg_*` (valores convertidos) |
| `parcelas_despensa_extendida_soilgrids_v1_diccionario.csv` | Diccionario |

Regenerar: `bash analisis/correr.sh soilgrids`. Fuente: [`../soilgrids/fuentes_soilgrids.md`](../soilgrids/fuentes_soilgrids.md). Análisis: [`../../analisis/RESUMEN_DATOS_SOILGRIDS.md`](../../analisis/RESUMEN_DATOS_SOILGRIDS.md).

