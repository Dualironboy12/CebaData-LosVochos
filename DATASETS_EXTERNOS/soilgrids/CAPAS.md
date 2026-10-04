# SoilGrids: catálogo de capas

Catálogo de las **336 capas** descargadas. Para elegir qué variables de SoilGrids integrar** al análisis. Generado el 2026-10-04 con la librería [`soilgrids`](https://github.com/gantian127/soilgrids) 0.1.5 y `explorar_disponibles.py`; la lista completa de capas está en `temporal/disponibles.json` (no se versiona, se regenera).

## Qué es

SoilGrids 2.0 (ISRIC) es un mapa global de propiedades del suelo a **250 m**, producido con aprendizaje automático sobre perfiles de campo y variables ambientales. No son mediciones: son estimaciones, con su incertidumbre.

- Acceso: servicio WCS público en <https://maps.isric.org>, sin llave. La librería lo descarga como GeoTIFF.
- Cobertura: global, entre -56° y 83° de latitud (cubre sobrado el área de las parcelas).
- CRS nativo: Homolosine interrumpida (`EPSG:152160`), 250 m. También ofrece EPSG:4326, 3857 y 54012, pero en 4326 la librería exige indicar ancho y alto.
- Formato de descarga: GeoTIFF de enteros de 16 bits, sin dato = -32768. Los valores vienen **multiplicados** por un factor (columna «Para convertir»).

## Servicios (propiedades)

| Servicio | Nombre | Unidad cruda | Unidad convertida | Para convertir | Capas | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| `bdod` | Bulk density | cg/cm3 | kg/dm³ | ÷ 100 | 30 | Densidad aparente de la tierra fina |
| `cec` | Citation exchange capacity at ph7 | mmol(c)/kg | cmol(c)/kg | ÷ 10 | 30 | Capacidad de intercambio catiónico (a pH 7) |
| `cfvo` | Coarse fragments volumetric | cm3/dm3 (vol‰) | % (vol) | ÷ 10 | 30 | Fragmentos gruesos (piedras, grava) |
| `clay` | Clay content | g/kg | % (g/100 g) | ÷ 10 | 30 | Textura: fracción de arcilla |
| `nitrogen` | Nitrogen | cg/kg | g/kg | ÷ 100 | 30 | Nitrógeno total |
| `phh2o` | Soil pH in H2O | pH*10 | pH | ÷ 10 | 30 | Acidez; relevante para disponibilidad de nutrientes y para cebada |
| `sand` | Sand content | g/kg | % (g/100 g) | ÷ 10 | 30 | Textura: fracción de arena |
| `silt` | Silt content | g/kg | % (g/100 g) | ÷ 10 | 30 | Textura: fracción de limo |
| `soc` | Soil organic carbon content | dg/kg | g/kg | ÷ 10 | 30 | Carbono orgánico del suelo |
| `ocs` | Soil organic carbon stock | t/ha | t/ha | × 1 | 5 | Reserva de carbono orgánico, solo 0–30 cm |
| `ocd` | Organic carbon densities | hg/dm3 | kg/m³ | ÷ 10 | 30 | Densidad de carbono orgánico |
| `wrb` | World Reference Base (WRB) classes and probabilities | none | probabilidad (%) | según la capa | 31 | Clase de suelo WRB: 1 capa por grupo con su probabilidad, más `MostProbable` |

Los factores de conversión siguen la guía de ISRIC; conviene confirmarlos contra su FAQ antes de usarlos en un modelo.

### Estructura de las capas

- **Profundidades** (30 capas por servicio = 6 profundidades × 5 estadísticos): `0-5cm`, `5-15cm`, `15-30cm`, `30-60cm`, `60-100cm`, `100-200cm`. `ocs` solo tiene `0-30cm`.
- **Estadísticos:** `mean` (media), `Q0.05`, `Q0.5` (mediana), `Q0.95` y `uncertainty`.
- **Nombre de capa:** `<servicio>_<profundidad>_<estadístico>`, por ejemplo `clay_5-15cm_mean`.
- **`wrb`** son 31 capas: una por grupo de suelo (Acrisols, Andosols, Phaeozems, Planosols, Umbrisols, Vertisols, …) con la probabilidad de ese grupo, y `MostProbable` con el grupo más probable. Es la misma clasificación (WRB) de la edafología INEGI que ya está en la despensa, así que sirve para compararlas.

En total hay **336 capas**. Recortadas al área de las parcelas (215 × 183 píxeles) pesan 18–34 KB cada una, así que bajarlas todas serían unos 10 MB. No hace falta: mejor elegir pocas.

## Prueba hecha

Se descargaron `phh2o_0-5cm_mean` y `clay_0-5cm_mean` sobre la caja de las 197 parcelas (más 1.5 km de margen) sin errores, en 250 m. Valores en los 197 puntos de parcela, ya convertidos:

| Capa | Píxeles distintos entre 197 parcelas | Hidalgo (media ± d.e.) | Puebla | Tlaxcala |
| --- | --- | --- | --- | --- |
| pH 0–5 cm | 12 | 6.34 ± 0.25 | 6.39 ± 0.10 | 6.49 ± 0.19 |
| Arcilla 0–5 cm (%) | 86 | 23.3 ± 1.8 | 25.4 ± 2.9 | 23.8 ± 1.1 |

Lectura: la arcilla sí varía entre parcelas incluso dentro de un estado (86 valores distintos, frente a los 22 polígonos de INEGI). El pH cambia poco y viene en pasos de 0.1, así que casi no distingue parcelas.

## Candidatas para elegir

Marcar las que se integran. La propuesta de partida es una sola profundidad agregada (0–30 cm) para no multiplicar columnas con solo 138 parcelas etiquetadas.

| Integrar | Variable | Capas a usar | Motivo |
| --- | --- | --- | --- |
| [ ] | Arcilla | `clay` 0-5, 5-15, 15-30 cm `mean` | Textura; hay variación entre parcelas |
| [ ] | Arena | `sand` 0-5, 5-15, 15-30 cm `mean` | Textura; muy ligada a arcilla y limo (redundante entre sí) |
| [ ] | Limo | `silt` 0-5, 5-15, 15-30 cm `mean` | Cierra la composición (arcilla + arena + limo ≈ 100 %) |
| [ ] | Carbono orgánico | `soc` 0-5, 5-15, 15-30 cm `mean` | Fertilidad y retención de agua |
| [ ] | Nitrógeno | `nitrogen` 0-5, 5-15, 15-30 cm `mean` | Fertilidad; correlaciona con carbono |
| [ ] | pH | `phh2o` 0-5, 5-15, 15-30 cm `mean` | Poca variación observada en la zona |
| [ ] | CIC | `cec` 0-5, 5-15, 15-30 cm `mean` | Capacidad de retener nutrientes |
| [ ] | Densidad aparente | `bdod` 0-5, 5-15, 15-30 cm `mean` | Compactación; menos interpretable |
| [ ] | Fragmentos gruesos | `cfvo` 0-5, 5-15, 15-30 cm `mean` | Pedregosidad |
| [ ] | Reserva de carbono | `ocs_0-30cm_mean` | Ya viene agregada a 0–30 cm |
| [ ] | Clase WRB más probable | `wrb_MostProbable` | Comparación con INEGI |
| [ ] | Incertidumbre | `<servicio>_<prof>_uncertainty` | Para saber qué parcelas tienen estimación poco fiable |

Cómo agregar 0–30 cm: promedio ponderado por espesor de las tres capas superficiales (5, 10 y 15 cm). Se haría una vez, en R, junto con la estadística zonal por parcela (`exact = TRUE`, como con el clima).

## Advertencias

- 250 m frente a parcelas de 2–8 ha: 1 o 2 píxeles por parcela y parcelas vecinas que comparten valor.
- Son estimaciones globales; en esta zona hay pocos perfiles de entrenamiento, así que la incertidumbre es real. Conviene incluir `uncertainty` al menos para revisar.
- Muchas de estas variables están muy correlacionadas entre sí (textura, carbono y nitrógeno). Habrá que reducir redundancia, como en el KDD.
- Licencia y cita: los datos de SoilGrids se publican bajo CC BY 4.0 (confirmar en ISRIC); citar Poggio et al. (2021), *SoilGrids 2.0*, SOIL 7, 217–240, <https://doi.org/10.5194/soil-7-217-2021>. La librería `soilgrids` es MIT.
