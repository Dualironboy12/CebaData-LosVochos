# Agentes — `analisis/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto de esta carpeta: [`README.md`](README.md). Lectura para el equipo: [`RESUMEN_DE_ANALISIS.md`](RESUMEN_DE_ANALISIS.md). Siguientes pasos: [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md).

## Alcance

- Fase 1: análisis de datos en **R** (calidad, distribuciones, relaciones, filtros, variables candidatas).
- Productos: lectura reproducible (`salida/kdd.html`), figuras/tablas y la tabla de trabajo por parcela (`salida/parcelas_trabajo.csv`).
- No entrenar modelos ni montar el dashboard aquí. Las CSVs de entrenamiento congeladas viven en [`../dataset_entrenamiento/`](../dataset_entrenamiento/); el código de modelos en [`../modelos/`](../modelos/).

## Lineamientos (heredan del repo)

- Documentación visible en español.
- Commits y push solo si el prompt lo pide.
- No modificar `DATASET_RETO_AGRO_2026/` salvo pedido explícito.
- Bitácora obligatoria en `PROMPTS.md` (formato en el `AGENTS.md` raíz).
- Un script de exploración en **Python** durante la fase 1 queda fuera de alcance: el análisis es en R.

## Reglas de datos

Aplican las del [`../AGENTS.md`](../AGENTS.md) (cruces `AGC_###`, rendimiento vacío en predicción, sensores separados, etc.). Criterios de diseño ya acordados para la despensa de entrenamiento (`NUBE_MAX`, ubicación, ciclos) están en [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md); no cambiarlos sin acuerdo del equipo.

## Reglas propias de esta carpeta

1. Parámetros globales del pipeline (`NUBE_MAX`, ciclo, rutas) en `R/00_setup.R`, no dentro de un gráfico.
2. Regenerar salidas con `bash analisis/correr.sh` desde la raíz del repo cuando cambien criterios que afecten la despensa.
3. Al congelar datos para entrenar, copiar/versionar hacia `dataset_entrenamiento/` (no sustituir en silencio solo `salida/` como “oficial de modelos” sin documentarlo).
4. Preferir cambios acotados a scripts/informe de análisis; no abrir `modelos/` o `dashboard/` desde esta carpeta sin pedido explícito.

## Fuera de alcance (salvo pedido explícito)

- Entrenamiento, RMSE/MAE/r² de predicción (`modelos/`).
- UI del dashboard (`dashboard/`).
- Integración de fuentes externas nuevas como producto de entrenamiento (`dataset_entrenamiento/`).
