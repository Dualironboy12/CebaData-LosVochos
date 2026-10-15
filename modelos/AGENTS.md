# Agentes — `modelos/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto de esta carpeta: [`README.md`](README.md). Tablas de entrada: [`../dataset_entrenamiento/`](../dataset_entrenamiento/). Criterios de validación y filosofía: [`../README.md#roadmap`](../README.md#roadmap).

## Alcance

- Fase 2 **cerrada en entrega** (2026-10-13): modelo firmado = **mezcla** en [`entrega/`](entrega/).
- Exploración / superciclo: `src/ceba_modelos`, `scripts/`, `comparativas/`.
- Leer features desde `dataset_entrenamiento/` vía `src/ceba_modelos`; no re-curar el dataset oficial aquí.
- Diseño: [`PROPUESTA_MODELOS.md`](PROPUESTA_MODELOS.md), [`ESTADO_DATOS.md`](ESTADO_DATOS.md), [`DECISIONES_ABIERTAS.md`](DECISIONES_ABIERTAS.md) (D1–D8).

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
6. El pipeline de entrega (`entrega/pipeline/`) exporta a `../api/artefactos/`. No mover el pipeline de vuelta a `api/`.
7. D8 ya firmó la mezcla; no cambiar el modelo de entrega sin acuerdo explícito del equipo. La prueba pareada está en `comparativas/prueba_ganador_en_pipeline/`.
8. Dashboard y API viven fuera de esta carpeta (`../dashboard/`, `../api/`).

## Fuera de alcance (salvo pedido explícito)

- Análisis exploratorio en R (`analisis/`) o cambio de criterios KDD.
- Integración de fuentes externas nuevas (eso va en `dataset_entrenamiento/`).
- UI Django u otro frontend (`dashboard/`).
