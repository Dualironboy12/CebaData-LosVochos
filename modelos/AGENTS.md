# Agentes — `modelos/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto de esta carpeta: [`README.md`](README.md). Tablas de entrada: [`../dataset_entrenamiento/`](../dataset_entrenamiento/). Criterios de validación y filosofía: [`../README.md#roadmap`](../README.md#roadmap).

## Alcance

- Fase 2 **abierta** (2026-10-06): entrenar y evaluar estimadores de rendimiento (RMSE, MAE, r²).
- Leer features desde `dataset_entrenamiento/` vía `src/ceba_modelos` (catálogo + ingesta); no re-curar el dataset oficial aquí.
- Organizar por arquitectura y por origen de datos (solo reto vs extendido), según el [`README.md`](README.md).
- Diseño: [`PROPUESTA_MODELOS.md`](PROPUESTA_MODELOS.md), [`ESTADO_DATOS.md`](ESTADO_DATOS.md), [`DECISIONES_ABIERTAS.md`](DECISIONES_ABIERTAS.md).

## Lineamientos (heredan del repo)

- Documentación visible en español.
- Commits y push solo si el prompt lo pide.
- No modificar `DATASET_RETO_AGRO_2026/`.
- Preferir cambios acotados a la tarea.
- Bitácora obligatoria en `PROMPTS.md` (formato en el `AGENTS.md` raíz).

## Reglas propias de esta carpeta

1. Leer features desde `dataset_entrenamiento/` (o rutas que ese track documente); no re-curar el dataset oficial dentro de `modelos/` salvo pedido explícito.
2. Conservar vacío el rendimiento en parcelas `PREDICCION`; no usar ceros como etiqueta.
3. Validación **oficial por municipio**; reportar también chequeo por píxel de clima cuando se comparen corridas. No presentar corte aleatorio de parcelas como criterio oficial.
4. Al comparar CSVs o arquitecturas: misma CV, mismas semillas, mismas métricas; citar versión del CSV y manifiesto.
5. Separar artefactos/código de `solo_reto/` y `extendido/`; respetar el flujo de ramas del [`README.md`](README.md) (merge entre ramas de modelos antes de ir a `main`).
6. No implementar el dashboard aquí; el contrato de inferencia para `dashboard/` se documenta cuando haya modelo de entrega.
7. Elegir el modelo/CSV de entrega es decisión humana (punto 8 del roadmap en el README raíz); el agente propone métricas y no congela la entrega solo.

## Fuera de alcance (salvo pedido explícito)

- Análisis exploratorio en R (`analisis/`) o cambio de criterios KDD.
- Integración de fuentes externas nuevas (eso va en `dataset_entrenamiento/`).
- UI Django u otro frontend (`dashboard/`).
