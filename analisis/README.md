# Análisis de datos (fase 1, R)

Tres carriles por fuente de datos. El setup compartido está en [`R/00_setup.R`](R/00_setup.R). El roadmap del equipo (decisiones, CSVs, modelos) vive en el [`README.md`](../README.md) raíz (§ Roadmap).

| Documento | Para qué |
| --- | --- |
| [`RESUMEN_DATOS_FIRA.md`](RESUMEN_DATOS_FIRA.md) | Lectura del KDD con datos del reto |
| [`RESUMEN_DATOS_INEGI.md`](RESUMEN_DATOS_INEGI.md) | Lectura del suelo INEGI vs rendimiento |
| [`RESUMEN_DATOS_SOILGRIDS.md`](RESUMEN_DATOS_SOILGRIDS.md) | Lectura del KDD SoilGrids + variables a incluir |
| [`AGENTS.md`](AGENTS.md) | Lineamientos para agentes en esta carpeta |

## Carriles

| Carril | Carpeta | Contenido | Informe |
| --- | --- | --- | --- |
| Datos del reto (FIRA) | [`datos_fira/`](datos_fira/) | Scripts `01`–`06`, tabla de trabajo, KDD | [`datos_fira/salida/kdd.html`](datos_fira/salida/kdd.html) |
| Edafología INEGI | [`datos_inegi/`](datos_inegi/) | Scripts `07`–`08`, tablas y mapas de suelo | (lectura en el resumen) |
| SoilGrids | [`datos_soilgrids/`](datos_soilgrids/) | Scripts `09`–`12`, zonal 336 capas, KDD | [`datos_soilgrids/salida/kdd_soilgrids.html`](datos_soilgrids/salida/kdd_soilgrids.html) |

## Cómo correr

Desde la raíz del repositorio:

```bash
bash analisis/correr.sh              # solo FIRA
bash analisis/correr.sh fira
bash analisis/correr.sh inegi
bash analisis/correr.sh soilgrids
bash analisis/correr.sh todo
```

También: `bash analisis/datos_fira/correr.sh` (y análogos). Cada script suelto se corre con `CEBA_CARRIL` implícito en el script (`Rscript analisis/datos_fira/R/03_transformacion.R`).

SoilGrids necesita el entorno Python de [`DATASETS_EXTERNOS/soilgrids/`](../DATASETS_EXTERNOS/soilgrids/) (`bash .../preparar_entorno.sh`). El análisis (zonal, correlaciones, informe) es en R.

### Requisitos

- R 4.3+, paquetes: dplyr, tidyr, readr, stringr, lubridate, purrr, forcats, tibble, ggplot2, scales, sf, terra, knitr, rmarkdown; `patchwork` opcional (mapas por estado INEGI).
- Entorno local opcional: `~/.local/share/ceba-env/env` (o `CEBA_ENV`).

## Convenciones

- `DATASET_RETO_AGRO_2026/` solo se lee.
- Parámetros globales en `R/00_setup.R` (`NUBE_MAX = 30`).
- Despensa congelada: [`../dataset_entrenamiento/despensa/`](../dataset_entrenamiento/despensa/).
- CSVs extendidos: [`../DATASETS_EXTERNOS/despensa_extendida/`](../DATASETS_EXTERNOS/despensa_extendida/).
- Bitácora de agentes: [`../PROMPTS.md`](../PROMPTS.md).
