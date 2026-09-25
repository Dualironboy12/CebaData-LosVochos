# Dataset Reto AgroCebada 2026

Guía de los archivos que están en esta carpeta. El objetivo del reto es estimar el **rendimiento de cebada (t/ha)** de 197 parcelas en Hidalgo, Puebla y Tlaxcala. El rendimiento observado corresponde al ciclo **abril–octubre de 2025** y solo está visible en 138 parcelas (`ENTRENAMIENTO`). Las otras 59 (`PREDICCION`) hay que estimarlas.

La descripción oficial del proveedor está en [`Descripcion_general_variables_DataSet.docx`](Descripcion_general_variables_DataSet.docx) y el significado de cada índice en [`Diccionario_de_indices_satelitales.docx`](Diccionario_de_indices_satelitales.docx). Las ecuaciones de los índices están en el [README del repositorio](../README.md) y en `Ecuaciones_indices_AgroCebada_FIRA_2026.pdf`.

## Cómo se relacionan

La unidad de análisis es la parcela. Todas las tablas comparten el identificador `AGC_001` … `AGC_197`.

```text
Parcelas (shapefile)  ---- ID_POLIGON  --+
                                          |
ID, área, rendimiento (CSV) -- ID_POLIGONO +--> una fila por parcela
                                          |     con la etiqueta de rendimiento
Índices Básico (CSV)  ------ ID_POLIGONO -+
Índices PRO (CSV)     ------ ID_POLIGONO -+--> muchas filas por parcela
                                               (una por fecha y sensor)

Precipitación, Tmin, Tmax (GeoTIFF mensuales) --+
                                                 +--> se asignan a cada parcela
Elevación y pendiente (GeoTIFF estáticos) ------+    con estadística zonal
```

| Pieza | Qué aporta | Cómo se une |
| --- | --- | --- |
| Shapefile de parcelas | Dónde está cada parcela, municipio, estado y si es entrenamiento o predicción | Geometría. El campo se llama `ID_POLIGON` |
| `ID_area_rendimiento_…csv` | Área y rendimiento (la variable a predecir) | `ID_POLIGONO` |
| CSV Básico | Serie temporal Sentinel-2 y Landsat, 2022–2025 | `ID_POLIGONO` + `fecha_captura` + `sensor` |
| CSV PRO | Serie temporal Planet, solo 2025 | `ID_POLIGONO` + `fecha_captura` |
| CHIRPS / CHIRTS | Clima mensual de los tres estados, 2022–2025 | Intersección espacial del polígono con el ráster |
| CEM | Elevación y pendiente, sin fecha | Intersección espacial, en otro sistema de coordenadas |

El shapefile y el CSV de rendimiento describen las mismas 197 parcelas: misma área (diferencia menor a 0.01 ha) y el mismo valor de `CONJUNTO`. El rendimiento **no** viene dentro del shapefile.

## Qué abrir con qué

| Formato | Archivos | Aplicación |
| --- | --- | --- |
| `.csv` | Tablas de índices, rendimiento e inventarios | LibreOffice Calc, Excel, pandas o R. El Básico cabe en Excel (107 666 filas). |
| `.shp` + `.shx` + `.dbf` + `.prj` + `.cpg` | Parcelas | QGIS o ArcGIS. En Python, `geopandas`. Hay que mantener los cinco archivos juntos y con el mismo nombre base. |
| `.tif` | Clima y topografía | QGIS, ArcGIS o `rasterio` / GDAL. Son rásteres científicos de punto flotante; un visor de fotos los muestra en negro o vacíos. |
| `.docx` | Descripción y diccionario | Word o LibreOffice Writer. |
| `.zip` | Paquetes originales de parcelas, clima y topografía | Ya están descomprimidos en las carpetas del mismo nombre. Se trabaja con las carpetas. |

En QGIS se pueden cargar a la vez el shapefile, un GeoTIFF de precipitación y el de elevación. QGIS reproyecta al vuelo para verlos juntos. Para calcular estadísticas, el código tiene que reproyectar de verdad (ver más abajo).

Las fechas de los CSV vienen como texto `DD/MM/AAAA`. En pandas:

```python
import pandas as pd

basico = pd.read_csv(
    "Conjunto_datos_BASICO_AgroCebada2026.csv",
    parse_dates=["fecha_captura"],
    dayfirst=True,
)
```

Sin `dayfirst=True`, `04/05/2025` se puede leer como 5 de abril en vez del 4 de mayo. El CSV de rendimiento trae una coma final: pandas crea una columna vacía sin nombre; se puede ignorar.

## 1. Parcelas

`Parcelas_Reto_AGC_CONJUNTO_70_30/Parcelas_Reto_AGC_CONJUNTO.shp`

197 polígonos (tipo PolygonZ, una parte cada uno). Sistema **EPSG:4326** (WGS 84, grados). Extensión aproximada: longitud −98.61 a −98.20, latitud 19.52 a 19.98. Es el altiplano de cebada entre Apan, Calpulalpan y Chignahuapan, un recorte pequeño dentro de los rásteres estatales.

Codificación de texto: UTF-8 (archivo `.cpg`).

| Campo | Contenido |
| --- | --- |
| `Cultivo` | Cebada. El texto mezcla `CEBADA` (147) y `Cebada` (50). |
| `ID_POLIGON` | Identificador. El nombre está recortado: el formato DBF limita el nombre del campo. El valor sí es `AGC_001` … `AGC_197` y coincide con `ID_POLIGONO` de los CSV. |
| `área_ha` | Superficie en hectáreas. Lleva acento; en código hay que usar ese nombre exacto. |
| `Municipio` | Municipio. |
| `Estado` | Hidalgo, Puebla o Tlaxcala. |
| `CONJUNTO` | `ENTRENAMIENTO` o `PREDICCION`. |

| Estado | Municipio | Parcelas |
| --- | --- | ---: |
| Hidalgo | Singuilucan | 23 |
| Hidalgo | Almoloya | 14 |
| Hidalgo | Cuautepec de Hinojosa | 9 |
| Hidalgo | Emiliano Zapata | 3 |
| Hidalgo | Apan | 1 |
| Hidalgo | Tepeapulco | 1 |
| Puebla | Chignahuapan | 100 |
| Tlaxcala | Calpulalpan | 44 |
| Tlaxcala | Nanacamilpa de Mariano Arista | 2 |

La mitad de las parcelas está en un solo municipio (Chignahuapan). En validación cruzada conviene tenerlo en cuenta: parcelas vecinas comparten clima, suelo y manejo, y un corte aleatorio filtra esa dependencia.

## 2. Identificador, área y rendimiento

`ID_area_rendimiento_70_30_Reto_AgroCebada.csv`

Una fila por parcela. Es la tabla de la variable objetivo.

| Columna | Unidad | Lectura |
| --- | --- | --- |
| `ID_POLIGONO` | — | Misma clave que el shapefile. |
| `AREA_HA` | ha | 0.35 a 64.3 ha. Media 6.6 ha. Total 1 301 ha. |
| `RENDIMIENTO_T_HA` | t/ha | Cosecha del ciclo abril–octubre 2025. Vacío en predicción. |
| `CONJUNTO` | — | `ENTRENAMIENTO` (138) o `PREDICCION` (59). |

El rendimiento de entrenamiento va de **2.00 a 5.59 t/ha** (media 3.96). Por estado, en las parcelas con etiqueta:

| Estado | Entrenamiento | Predicción | Área (ha) | Rendimiento medio (t/ha) | Rango |
| --- | ---: | ---: | ---: | ---: | --- |
| Hidalgo | 36 | 15 | 532 | 3.76 | 2.00–4.87 |
| Puebla | 71 | 29 | 502 | 4.48 | 2.15–5.59 |
| Tlaxcala | 31 | 15 | 268 | 2.98 | 2.50–3.50 |

En Tlaxcala los valores observados solo toman unos pocos escalones entre 2.5 y 3.5. Conviene tratarlo como una característica del dato reportado al explorar errores por estado.

Un valor vacío en `RENDIMIENTO_T_HA` significa «oculto para el reto». Sustituirlo por cero haría que el modelo aprendiera un rendimiento nulo.

## 3. Índices satelitales — conjunto Básico

`Conjunto_datos_BASICO_AgroCebada2026.csv` (33 MB, 107 666 filas, 96 columnas)

Observaciones de **Sentinel-2** (59 040 filas) y **Landsat** (48 626 filas) del 1 de enero de 2022 al 31 de diciembre de 2025. Cubre las 197 parcelas. Cada fila es una parcela en una fecha y un sensor. La combinación `ID_POLIGONO` + `fecha_captura` + `sensor` es única.

Los dos sensores comparten el archivo y **casi no comparten columnas**:

- En filas `Sentinel-2` vienen NDVI, EVI, CRC, MCRC, NDSVI, SRNDI, MRA, LAI, FAPAR, SAVI, NDTI, STI, NDWI, ENDWI, MSI, EMSI, DSWI2–5, NDDI y ENDDI. `vi6t_*` va vacío.
- En filas `Landsat` solo viene VI6T. El resto de índices va vacío.

Ese vacío es estructural. Imputarlo mezcla sensores que no midieron esa variable.

Cada índice trae cuatro estadísticos del interior de la parcela:

| Sufijo | Significado |
| --- | --- |
| `_promedio` | Media de los píxeles de la parcela en esa fecha |
| `_std` | Desviación estándar dentro de la parcela (heterogeneidad) |
| `_max` | Máximo dentro de la parcela |
| `_min` | Mínimo dentro de la parcela |

`porcentaje_nubosidad` va de 0 a 100 y es el criterio de calidad.

Cuando la nubosidad de Sentinel-2 es 100, los índices vienen vacíos (14 163 filas, todas con nube = 100). Con índices presentes, la nube media es baja y ninguna fila llega a 100. Cuatro parcelas (`AGC_019`, `AGC_086`, `AGC_103`, `AGC_173`) el 7 de diciembre de 2022 tienen el resto de índices, nube 0, y FAPAR vacío.

En Landsat, VI6T falta en 17 577 filas. De esas, 14 521 tienen nube = 100 y 3 056 no traen ni VI6T ni porcentaje de nubosidad: no hay con qué recuperarlas.

Observaciones por parcela: Sentinel-2, unas 300 fechas (298–301); Landsat, unas 211 (195–391). El año está repartido de forma parecida (unas 26 000–28 000 filas por año) y también los meses. La serie incluye barbecho, siembra y cosecha, no solo el ciclo de la cebada.

### Cómo leer los índices

El diccionario oficial es conceptual: el nombre describe la intención del índice. Los umbrales de libros de texto (por ejemplo «NDVI > 0.6 = cultivo vigoroso») se calcularon en otras regiones y otras fechas. Aquí la serie es de todo el año, así que la mediana cae en suelo descubierto o cultivo incipiente. La señal útil es la trayectoria de cada parcela, sobre todo entre abril y octubre de 2025, que es el ciclo de la etiqueta.

Rangos del `_promedio` cuando el valor existe:

| Índice | Qué busca | Mín | Mediana | P95 | Máx |
| --- | --- | ---: | ---: | ---: | ---: |
| NDVI | Vegetación verde, vigor | −0.07 | 0.18 | 0.60 | 0.82 |
| EVI | Vigor, con menos efecto de suelo y atmósfera | −0.03 | 0.13 | 0.52 | 0.91 |
| SAVI | Vegetación ajustada por brillo del suelo | −0.01 | 0.11 | 0.38 | 0.62 |
| LAI | Superficie foliar respecto al suelo | −0.19 | 0.02 | 0.75 | 3.04 |
| FAPAR | Fracción de radiación fotosintética absorbida | 0.00 | 0.11 | 0.59 | 0.91 |
| NDWI | Contraste ligado a agua o humedad del dosel | −0.37 | −0.11 | 0.28 | 0.70 |
| ENDWI | Variante de índice de humedad | −0.32 | 0.01 | 0.53 | 0.83 |
| MSI | Estrés hídrico (sube cuando falta agua) | 0.18 | 1.24 | 1.54 | 2.17 |
| EMSI | Variante de estrés hídrico | 0.09 | 0.98 | 1.34 | 1.96 |
| CRC | Residuo de cultivo en superficie | −0.70 | 0.39 | 0.46 | 0.56 |
| MCRC | Variante de cobertura de residuo | −0.69 | 0.37 | 0.45 | 0.59 |
| NDSVI | Vegetación senescente, no fotosintética | −0.70 | 0.31 | 0.44 | 0.61 |
| SRNDI | Infrarrojo de onda corta contra rojo | −0.82 | 0.19 | 0.29 | 0.49 |
| NDTI | Suelo, residuo y labranza | −0.18 | 0.12 | 0.30 | 0.43 |
| STI | Relación simple de labranza / residuo | 0.73 | 1.28 | 1.85 | 2.51 |
| DSWI2 | Estrés hídrico y condición del cultivo | 0.18 | 2.20 | 2.66 | 3.87 |
| DSWI3 | Otra combinación de la misma familia | 0.18 | 1.90 | 2.58 | 4.23 |
| DSWI4 | Otra combinación de la misma familia | 0.70 | 0.84 | 1.35 | 2.16 |
| DSWI5 | Combinación multibanda de la misma familia | 0.57 | 0.81 | 1.65 | 3.13 |
| NDDI | Sequedad, combina vegetación y humedad | −0.29 | 0.08 | 0.15 | 0.28 |
| ENDDI | Variante de sequedad | −0.26 | 0.14 | 0.19 | 0.31 |
| MRA | Variable espectral del proveedor (MRA) | 0.020 | 0.021 | 0.031 | 0.041 |
| VI6T | Índice espectral-térmico de Landsat | −0.80 | −0.61 | −0.60 | −0.43 |

Dos lecturas prácticas de esa tabla:

- **LAI negativo** sale de la fórmula cuando SAVI es bajo. Ahí la parcela tiene poca hoja; el número deja de ser una superficie foliar física.
- **MRA** casi no se mueve (0.020–0.041). **VI6T** tampoco: toda la variación útil está en un intervalo estrecho alrededor de −0.61, y el signo negativo es el nivel de la fórmula, no un «vigor negativo».

CRC, MCRC, NDSVI, NDTI y STI describen residuo y labranza. MSI, EMSI, NDWI, ENDWI, NDDI, ENDDI y la familia DSWI describen humedad o estrés. NDVI, EVI, SAVI, LAI y FAPAR describen el dosel verde.

## 4. Índices satelitales — conjunto PRO

`Conjunto_datos_PRO_AgroCebada.csv` (4.8 MB, 47 804 filas, 20 columnas)

Solo **Planet**, solo **2025** (1 de enero al 30 de diciembre), las 197 parcelas, 311 fechas distintas. Unas 243 observaciones por parcela (233–251). Columnas: `ID_POLIGONO`, `fecha_captura`, `sensor` (`Planet`), NDVI, EVI, LAI y MSAVI, cada uno con `_promedio`, `_std`, `_max` y `_min`, más `porcentaje_nubosidad`.

12 057 filas (25 %) tienen los cuatro índices vacíos y nubosidad = 100. Con índice presente, la nube no llega a 100.

| Índice | Qué busca | Mín | Mediana | P95 | Máx |
| --- | --- | ---: | ---: | ---: | ---: |
| NDVI | Vigor y vegetación verde | 0.01 | 0.28 | 0.72 | 0.91 |
| EVI | Vigor con menos efecto de suelo y atmósfera | 0.03 | 0.16 | 0.49 | 0.88 |
| LAI | Superficie foliar | −0.11 | 0.96 | 2.54 | 3.66 |
| MSAVI | Vegetación con ajuste adaptativo del suelo | 0.01 | 0.16 | 0.48 | 0.78 |

NDVI, EVI y LAI se llaman igual que en el Básico y **vienen de otro sensor, otras bandas y otro procesamiento**. Un 0.4 de NDVI Planet y un 0.4 de NDVI Sentinel-2 se pueden comparar como historias paralelas de la misma parcela. Fundirlos en una sola columna, como si fueran la misma medición, desplaza la serie. Si se usan juntos, el modelo tiene que saber de qué sensor sale cada valor.

Planet aporta más detalle dentro de la parcela (`_std`, `_min`, `_max`) porque su píxel es más fino. El ciclo que hay que predecir es 2025, así que esta serie cae justo sobre la temporada de la etiqueta.

## 5. Precipitación mensual CHIRPS

Carpeta `Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025/`

48 GeoTIFF, uno por mes, de enero 2022 a diciembre 2025:

```text
Precipitacion_mensual/{año}/PREC_{año}_{mes}.tif
```

Ejemplo: `Precipitacion_mensual/2025/PREC_2025_08.tif` es la lluvia acumulada de agosto de 2025.

| Propiedad | Valor |
| --- | --- |
| Variable | Precipitación acumulada del mes (suma de los días) |
| Unidad | mm/mes |
| Fuente | CHIRPS |
| Tamaño | 65 columnas × 72 filas |
| Resolución | 0.05° (unos 5 km) |
| CRS | EPSG:4326 |
| Tipo | Float32, compresión LZW |
| Sin dato | −9999 |
| Extensión | Oeste −99.950, este −96.700, sur 17.800, norte 21.400 |

Esa extensión cubre Hidalgo, Puebla y Tlaxcala completos, no solo las parcelas. El inventario (`inventario_CHIRPS_precipitacion_mensual_2022_2025.csv`) trae, por mes, los días acumulados, el mínimo, el máximo y la media de **toda la región**. Los 48 meses traen todos los días esperados (2024 es bisiesto: febrero tiene 29). Esos mínimos y máximos incluyen costa, sierra y el Pico de Orizaba; el valor de una parcela sale de muestrear el píxel que la cubre.

En el altiplano la lluvia se concentra de mayo a octubre. Agosto y septiembre suelen ser los meses más húmedos. Para el ciclo abril–octubre 2025, la lluvia relevante es la de esos meses en el píxel de cada parcela; los años 2022–2024 sirven como antecedente o como climatología.

Nota de archivo: el zip de origen se llama `Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025.zip`.

## 6. Temperatura mensual CHIRTS-ERA5

Carpeta `Reto_AgroCebada_Temperatura_2022_2025/`

96 GeoTIFF: 48 de temperatura mínima y 48 de máxima, enero 2022 a diciembre 2025.

```text
Tmin/{año}/Tmin_{año}_{mes}.tif
Tmax/{año}/Tmax_{año}_{mes}.tif
```

| Propiedad | Valor |
| --- | --- |
| Tmin | Promedio mensual de la temperatura mínima diaria |
| Tmax | Promedio mensual de la temperatura máxima diaria |
| Unidad | °C |
| Fuente | CHIRTS-ERA5 |
| Tamaño, resolución, CRS | Igual que CHIRPS: 65 × 72, 0.05°, EPSG:4326 |
| Tipo | Float32, compresión Deflate |
| Sin dato | −9999 |

La retícula coincide con la de precipitación a efectos de apilar matrices: la esquina norte difiere en el séptimo decimal de grado (unos centímetros), muy por debajo del píxel de 5 km. Cada archivo lleva su propia georreferencia; al extraer por polígono se usa esa georreferencia y el desplazamiento no cambia el píxel.

El inventario `inventario_temperatura_2022_2025.csv` resume cada capa sobre toda la región. En ese recorte estatal, las medias mensuales de Tmin bajan hasta unos 5 °C en píxeles de sierra y las de Tmax suben hasta unos 42 °C en píxeles cálidos. Las parcelas del reto están en el altiplano, así que su temperatura hay que leerla en su píxel.

Temperatura media aproximada del mes: `(Tmin + Tmax) / 2`. Amplitud térmica: `Tmax - Tmin`. Ambas se pueden calcular después de extraer los dos valores en la parcela.

Nota de archivo: el zip de origen se llama `Reto_AgroCebada_Temperatura_2022_2025_RECORTADA_CHIRPS.zip` y se descomprime en esta carpeta. `LEEME_.txt` es la nota del proveedor.

## 7. Topografía INEGI CEM

Carpeta `Reto_AgroCebada_Topografia_INEGI_CEM4/Reto_AgroCebada_Topografia_INEGI_CEM4/`

Dos rásteres estáticos (no cambian con el año):

| Archivo | Variable | Unidad | Rango en el ráster |
| --- | --- | --- | --- |
| `Elevacion_INEGI_CEM4_120m.tif` | Altitud del terreno | m s.n.m. | 8 a 5 608 (media 1 828) |
| `Pendiente_INEGI_CEM4_120m_grados.tif` | Inclinación, método Horn 3×3 | grados | 0 a 70.6 (media 10.2) |

| Propiedad | Valor |
| --- | --- |
| Tamaño | 2 900 × 3 362 píxeles |
| Resolución | 120 m |
| CRS | **EPSG:6372** (México ITRF2008 / LCC, metros) |
| Esquina noroeste | 2 715 840 E, 1 053 840 N |
| Esquina sureste | 3 063 840 E, 650 400 N |
| Tipo | Float32, compresión Deflate, teselas de 256 |
| Sin dato | −9999 |
| Píxeles válidos | 4 081 208 de elevación; 4 047 765 de pendiente |

El metadato interno indica mosaico de los CEM estatales nativos de 120 m (Hidalgo, Puebla y Tlaxcala, 2017), transformados a EPSG:6372 por vecino más cercano. El máximo de 5 608 m es la sierra (el Citlaltépetl queda en el recorte de Puebla). Las parcelas de cebada están mucho más abajo; otra vez, el número que importa es el de la parcela.

La pendiente se derivó de este DEM de 120 m. En una parcela de 1 ha, 120 m es un solo píxel o poco más: la pendiente entregada describe la ladera general, no el microrrelieve dentro del lote.

Para extraerla, los polígonos (EPSG:4326) se reproyectan a EPSG:6372, o el ráster se reproyecta a EPSG:4326. Verlos encimados en QGIS funciona por la reproyección al vuelo; el cálculo zonal tiene que usar un solo CRS.

## Cómo armar la tabla de modelado

El modelo del reto pide **un rendimiento por parcela**. Las series y los rásteres hay que resumirlos a esa unidad.

1. Partir de las 197 parcelas y conservar `CONJUNTO` como la partición oficial. Las 59 de predicción se estiman al final; sus etiquetas las tiene el comité.
2. Filtrar la serie satelital. Un punto de partida razonable es quedarse con `porcentaje_nubosidad` igual a 0, o por debajo de un umbral que el equipo documente. Separar Sentinel-2, Landsat y Planet.
3. Recortar la serie al periodo que se vaya a usar. La etiqueta es abril–octubre 2025. El resto de 2022–2025 es contexto (años anteriores, barbecho, el arranque del ciclo).
4. Resumir cada parcela a unas pocas columnas: integral o máximo de NDVI en el ciclo, fecha del máximo, media de los meses de llenado de grano, desviación dentro de la parcela, etc.
5. En los rásteres de clima, sacar el valor del píxel de cada mes (media zonal; con píxeles de 5 km casi todas las parcelas caen en un solo píxel y muchas parcelas vecinas comparten el mismo número). Conviene sumar lluvia y promediar temperaturas de abril a octubre de 2025, y decidir aparte si entran los años previos.
6. En elevación y pendiente, estadística zonal con los polígonos en EPSG:6372. Ignorar −9999.
7. Unir todo por `ID_POLIGONO`. El resultado de trabajo es una tabla de 197 filas. Las 138 de entrenamiento ajustan el modelo; las 59 de predicción reciben el estimado.

El píxel de clima mide unos 5 km de lado (del orden de 2 500 ha). La parcela media mide 6.6 ha. La precipitación y la temperatura distinguen zonas y municipios, y casi no distinguen parcelas colindantes. El contraste entre vecinos sale de los índices satelitales, del tamaño, de la pendiente y de lo que el equipo agregue de fuentes públicas.

## Fuentes

- CHIRPS: Funk et al. (2015), *Scientific Data*, 2, 150066. https://doi.org/10.1038/sdata.2015.66
- CHIRTS-ERA5: Climate Hazards Center (2025), University of California, Santa Barbara. https://doi.org/10.15780/G2F08J
- Elevación: INEGI, Continuo de Elevaciones Mexicano. Insumos estatales de 120 m mosaicos a EPSG:6372.
- Índices y parcelas: materiales entregados por FIRA para el Reto AgroCebada 2026.
