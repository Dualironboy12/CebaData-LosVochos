# Análisis de datos (fase 1, R)

Proceso KDD sobre el dataset del reto: qué datos hay, qué tan confiables son, cómo se relacionan entre sí y con el rendimiento, y qué variables quedan como candidatas para la fase de modelos. No entrena modelos.

Reglas globales: [`../AGENTS.md`](../AGENTS.md). Reglas de esta carpeta: [`AGENTS.md`](AGENTS.md). Despensa/CSVs de entrenamiento: [`../dataset_entrenamiento/`](../dataset_entrenamiento/). Modelos: [`../modelos/`](../modelos/). Dashboard: [`../dashboard/`](../dashboard/).

| Documento | Para qué |
| --- | --- |
| [`RESUMEN_DE_ANALISIS.md`](RESUMEN_DE_ANALISIS.md) | Lectura corta e intuitiva para el equipo |
| [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md) | Qué sigue, decisiones humano/agente, CSVs y modelos |
| [`salida/kdd.html`](salida/kdd.html) | Informe completo con tablas y figuras |
| [`AGENTS.md`](AGENTS.md) | Lineamientos para desarrollo asistido en esta carpeta |

## Cómo correrlo

Desde la raíz del repositorio:

```bash
bash analisis/correr.sh
```

Ejecuta en orden los seis scripts `01` a `06` de `analisis/R/` y compila `analisis/informe/kdd.Rmd`. Cada script también se puede correr solo (`Rscript analisis/R/03_transformacion.R`), siempre desde la raíz, porque leen los resultados que dejó el anterior en `analisis/salida/intermedio/`.

### Requisitos

- R 4.3 o superior.
- Paquetes: `dplyr`, `tidyr`, `readr`, `stringr`, `lubridate`, `purrr`, `forcats`, `tibble`, `ggplot2`, `scales`, `sf`, `terra`, `knitr`, `rmarkdown`.
- Pandoc, para compilar el informe (viene con RStudio o Positron; en otro caso se instala aparte). Quarto no hace falta.
- `sf` y `terra` requieren las bibliotecas del sistema GDAL, GEOS y PROJ. En Ubuntu o Mint: `sudo apt install libgdal-dev libgeos-dev libproj-dev libudunits2-dev` y luego `install.packages(c("sf", "terra"))`. Si no se tiene acceso de administrador, un entorno de conda-forge con `r-base r-sf r-terra r-tidyverse r-rmarkdown pandoc` funciona sin instalar nada en el sistema. `correr.sh` usa automáticamente el entorno de `~/.local/share/ceba-env/env` si existe (o el que indique la variable `CEBA_ENV`), y define `PROJ_DATA` y `GDAL_DATA`.

## Etapas

| Script | Etapa KDD | Qué hace | Salidas principales |
| --- | --- | --- | --- |
| `00_setup.R` | — | Rutas, paquetes y parámetros (`NUBE_MAX`, ciclo, semilla) | — |
| `01_seleccion.R` | Selección | Inventario de fuentes y verificación de llaves entre shapefile y CSV | `01_inventario_fuentes`, `01_verificacion_llaves` |
| `02_calidad.R` | Preprocesamiento | Fechas, nubosidad, vacíos estructurales, consistencia y rangos; separa Sentinel-2, Landsat y Planet | `02_*` |
| `03_transformacion.R` | Transformación | Filtro de nube, recorte al ciclo abril–octubre 2025, resumen por parcela y sensor | `03_indices_ciclo`, sensibilidad al umbral |
| `04_clima_topografia.R` | Transformación | Estadística zonal de lluvia, temperatura, elevación y pendiente; ensambla la tabla de trabajo | `parcelas_trabajo.csv` |
| `05_relaciones.R` | Minería | Distribución del rendimiento, trayectorias del ciclo y correlaciones (global y dentro de cada estado) | `05_*` |
| `06_patrones.R` | Minería | Redundancia entre variables, PCA exploratorio y perfiles de parcela | `06_*` |
| `07_despensa_extendida_edaf.R` | Extensión externa (opcional) | Une la edafología INEGI a la despensa congelada (nube 30) y escribe el CSV extendido en `DATASETS_EXTERNOS/despensa_extendida/` | `07_edaf_join_resumen` |
| `08_relaciones_edaf.R` | Extensión externa (opcional) | Suelo contra rendimiento: tablas, pruebas exploratorias, boxplot y mapa suelo + rendimiento | `08_*`, [`08_lectura_edaf.md`](08_lectura_edaf.md) |
| `informe/kdd.Rmd` | Interpretación | Lectura en español con tablas y figuras | `kdd.html` |

### Extensión con datos externos (07 y 08)

No forman parte de `correr.sh`. Necesitan la despensa congelada en `dataset_entrenamiento/despensa/` y el recorte de edafología versionado en `DATASETS_EXTERNOS/despensa_extendida/`; el shapefile nacional de INEGI (225 MB) no se versiona y solo hace falta para rehacer el recorte. Se corren aparte, en orden y desde la raíz:

```bash
Rscript analisis/R/07_despensa_extendida_edaf.R
Rscript analisis/R/08_relaciones_edaf.R
```

(Con el entorno local, anteponer `PATH`, `PROJ_DATA`, `PROJ_LIB` y `GDAL_DATA` como en `correr.sh`.) Detalle de la fuente, el CRS y las columnas añadidas: [`DATASETS_EXTERNOS/despensa_extendida/`](../DATASETS_EXTERNOS/despensa_extendida/README.md). `patchwork` es opcional: solo se usa para el mapa por estado.

## Qué produce

```text
analisis/salida/
  parcelas_trabajo.csv              197 filas, una por parcela; rendimiento vacío en las 59 de predicción
  parcelas_trabajo_diccionario.csv  grupo y descripción de cada columna
  kdd.html                          informe
  tablas/                           CSV de cada etapa
  figuras/                          PNG de cada etapa
  intermedio/                       objetos R regenerables (no se versionan)
```

## Decisiones que conviene conocer

- **Nubosidad.** Se conservan observaciones con `porcentaje_nubosidad <= 30` (`NUBE_MAX` en `00_setup.R`, decisión del equipo; el primer KDD usó 0). La tabla `03_sensibilidad_nube.csv` compara 0, 10 y 30, y `03_parametros.csv` guarda los parámetros de la corrida.
- **Sensores.** Sentinel-2, Landsat y Planet se resumen por separado y el sensor va en el nombre de la columna (`ndvi_s2_max`, `ndvi_planet_max`, `vi6t_landsat_media`). No se imputan vacíos entre sensores.
- **Ciclo.** Solo abril–octubre de 2025 entra a la tabla de trabajo. Los años 2022–2024 se usan como contexto en figuras y quedan extraídos en `intermedio/`.
- **Clima.** Estadística zonal ponderada por la fracción exacta de píxel cubierta (`exact = TRUE`). Con `weights = TRUE`, una parcela menor que el píxel y sin centro de celda adentro devuelve NaN.
- **Topografía.** Los polígonos se reproyectan a EPSG:6372 antes de la estadística zonal.
- **Rendimiento.** Se deja vacío en predicción. Ninguna correlación usa esas parcelas.
- **Correlaciones.** Se reportan globales y dentro de cada estado, con p ajustado por Benjamini-Hochberg. Son exploratorias.
- **Sin imputación.** Si una parcela no tiene observaciones limpias en una fase del ciclo, esa columna queda vacía. Con nube 0 pasaba en `AGC_016` y `AGC_096`; con el umbral 30 vigente no queda ningún vacío.

## Convenciones

- Los datos de `DATASET_RETO_AGRO_2026/` solo se leen.
- Los cambios de parámetros se hacen en `00_setup.R`, no dentro de una figura.
- La despensa de `salida/parcelas_trabajo.csv` alimenta el análisis; al congelar datasets para entrenar se versionan en `dataset_entrenamiento/` (ver `PROXIMOS_PASOS.md`).
- Cada sesión de agente se anota en [`PROMPTS.md`](../PROMPTS.md).
