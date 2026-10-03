# Agentes — `dashboard/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto de esta carpeta: [`README.md`](README.md). Decisiones de datos/modelos: [`../analisis/PROXIMOS_PASOS.md`](../analisis/PROXIMOS_PASOS.md).

## Alcance

- Fase 3: interfaz web que ejecute o consulte el modelo y muestre resultados.
- Trabajar aquí solo si el prompt lo pide de forma explícita (ver fase actual en [`../AGENTS.md`](../AGENTS.md)).
- Stack aún no fijado; Alfredo puede liderar. No imponer Django u otra herramienta salvo acuerdo del equipo o pedido explícito.

## Lineamientos (heredan del repo)

- Documentación visible en español.
- Commits y push solo si el prompt lo pide.
- No modificar `DATASET_RETO_AGRO_2026/`, `LICENSE` ni los PDF de las bases.
- Cambios acotados a lo que la tarea necesita.
- Bitácora obligatoria en `PROMPTS.md` (formato en el `AGENTS.md` raíz).

## Reglas propias de esta carpeta

1. Preferir **datos mock** o contratos estables (`ID_POLIGONO`, `conjunto`, `rendimiento_t_ha`, estimado, etc.) hasta que exista un artefacto de entrega en `modelos/`.
2. No copiar ni versionar aquí la despensa ni CSVs grandes de `dataset_entrenamiento/`; consumir por ruta acordada o API/fixture.
3. No entrenar modelos dentro de `dashboard/`.
4. Respetar la rama de este track (nombre en [`README.md`](README.md)); no mezclar en el mismo PR trabajo de `modelos/` o `dataset_entrenamiento/` salvo pedido explícito.
5. La app debe poder documentarse lo bastante como para ejecutarse con el código del repo cuando sea entregable.

## Fuera de alcance (salvo pedido explícito)

- Regenerar o curar datasets.
- Elegir el modelo de entrega o calcular métricas de predicción.
- Commits, push o cambios al `AGENTS.md` / `PROMPTS.md` raíz sin que formen parte de la bitácora de la sesión.
