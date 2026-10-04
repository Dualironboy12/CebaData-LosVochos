# Agentes — `analisis/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto: [`README.md`](README.md). Resúmenes: [`RESUMEN_DATOS_FIRA.md`](RESUMEN_DATOS_FIRA.md), [`RESUMEN_DATOS_INEGI.md`](RESUMEN_DATOS_INEGI.md), [`RESUMEN_DATOS_SOILGRIDS.md`](RESUMEN_DATOS_SOILGRIDS.md). Roadmap: [`../README.md`](../README.md) (§ Roadmap).

## Alcance

- Fase 1: análisis en **R**, en tres carriles: `datos_fira/`, `datos_inegi/`, `datos_soilgrids/`.
- Setup compartido: `R/00_setup.R` (`CEBA_CARRIL=fira|inegi|soilgrids`).
- Orquestador: `bash analisis/correr.sh [fira|inegi|soilgrids|todo]`.
- **Python** solo para adquirir SoilGrids en `DATASETS_EXTERNOS/soilgrids/`; el KDD de esas capas es en R.
- No entrenar modelos ni montar el dashboard aquí.

## Lineamientos

- Documentación visible en español.
- Commits y push solo si el prompt lo pide.
- No modificar `DATASET_RETO_AGRO_2026/` salvo pedido explícito.
- Bitácora en `PROMPTS.md`.
- Criterios de despensa (`NUBE_MAX`, ubicación, ciclos) en el roadmap del README raíz; no cambiarlos sin acuerdo.

## Reglas propias

1. Parámetros globales en `R/00_setup.R`.
2. Regenerar FIRA con `bash analisis/correr.sh fira`.
3. Congelar datos de entrenamiento en `dataset_entrenamiento/`.
4. No abrir `modelos/` o `dashboard/` sin pedido explícito.
