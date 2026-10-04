# Fuente: edafología INEGI (1:250 000, Serie II)

| Campo | Valor |
| --- | --- |
| Producto | Conjunto de datos vectorial edafológico, escala 1:250 000, Serie II (continuo nacional) |
| Institución | INEGI |
| Periodo de levantamiento | 2002–2006 |
| Clasificación | WRB (Base Referencial Mundial del Recurso Suelo, reporte 84, 1999), adaptada por INEGI |
| Formato | Shapefile (polígonos; 75 491 en el continuo nacional) |
| Ubicación local del shapefile nacional | `DATASETS_EXTERNOS/INEGI_EDAFOLOGIA_2025/conjunto_de_datos/cdv_edaf_esc_250k_serie II_cont_nac.shp` (225 MB; **no se versiona**, está en `.gitignore`) |
| Recorte versionado | `DATASETS_EXTERNOS/despensa_extendida/edafologia_recorte_parcelas_v1.gpkg`: los 140 polígonos del área de las parcelas (+5 km), con los campos usados y el CRS EPSG:6372 dentro del archivo (~0.7 MB) |
| Metadatos | Se descargan junto con el conjunto de datos en la ficha de INEGI (abajo); no se versionan |
| Diccionario de datos | PDF `702825224578_1.pdf` en la ficha de INEGI (ficha: <https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=702825224578>) |
| Términos de uso | <https://www.inegi.org.mx/inegi/terminos.html> (indicado en los metadatos). Citar al INEGI como fuente. |
| Cómo obtener el original | Descargar el conjunto de datos «Edafología escala 1:250 000 Serie II (continuo nacional)» desde la ficha de INEGI, descomprimirlo en `DATASETS_EXTERNOS/INEGI_EDAFOLOGIA_2025/conjunto_de_datos/` y correr `07_despensa_extendida_edaf.R`. Solo hace falta si se quiere cambiar el recorte (otro buffer u otra zona); para reproducir el CSV actual basta el `.gpkg` |

## Sistema de coordenadas

El shapefile **no trae `.prj`**. Las coordenadas están en metros y el rango coincide con el de la proyección cónica conforme de Lambert del INEGI, que corresponde a **EPSG:6372** (ITRF2008 / México LCC). Se asigna ese CRS sin transformar (`st_set_crs(6372)`), y las parcelas (EPSG:4326) se transforman a EPSG:6372 para el cruce. Comprobación: al recortar con el área de las parcelas más 5 km quedan 140 polígonos, y las 197 parcelas intersectan al menos uno (22 polígonos distintos resultan dominantes); con un CRS equivocado el recorte quedaría vacío.

## Campos usados

| Campo original | Columna en la despensa extendida | Significado |
| --- | --- | --- |
| `N_G1` | `edaf_grupo` | Nombre del grupo de suelo principal (Phaeozem, Planosol, Umbrisol, …) |
| `GRUPO1` | `edaf_grupo_cod` | Código del grupo principal |
| `TEXTURA` | `edaf_textura` | Textura de la unidad (en esta zona solo MEDIA o FINA) |
| `CLASE_TEX` | `edaf_clase_tex` | Clase textural codificada por INEGI; aquí coincide con la textura (2 = media, 3 = fina), así que las dos columnas son redundantes |
| `CLAVE_WRB` | `edaf_clave_wrb` | Clave WRB completa de la unidad (grupo + calificadores) |
| — (calculado) | `edaf_fraccion_area` | Fracción de la parcela cubierta por el polígono elegido |

Los campos de fase física (`F_SUPERF`, `FRUDICA`, …) vienen todos como `N` en esta zona y no se incorporan.

## Limitaciones

- Escala 1:250 000: un polígono cubre decenas o cientos de hectáreas, así que parcelas vecinas comparten casi siempre la misma unidad. Describe la zona, no el lote.
- Levantamiento de 2002–2006, anterior al ciclo 2025.
- Poca variación en el área: la mayor parte de las parcelas cae en Phaeozem. Cualquier relación con el rendimiento es exploratoria y está entrelazada con el estado (Umbrisol solo en Hidalgo; Tlaxcala casi todo Phaeozem).
