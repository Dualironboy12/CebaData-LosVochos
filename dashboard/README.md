# Dashboard

Aplicación o interfaz web que ejecutará el modelo y permitirá consultar resultados (fase 3 del equipo). Es el entregable de frontend del reto.

Todavía **no hay diseño ni stack fijados** aquí. Alfredo (equipo) puede liderar este desarrollo. El resto del repo no debe asumir rutas concretas dentro de esta carpeta hasta que exista un scaffold acordado.

Contexto del proyecto: [`../README.md`](../README.md). Reglas globales: [`../AGENTS.md`](../AGENTS.md). Reglas de esta carpeta: [`AGENTS.md`](AGENTS.md). Decisiones de datos y modelos: [`../analisis/PROXIMOS_PASOS.md`](../analisis/PROXIMOS_PASOS.md).

## Qué va aquí

- Código de la interfaz (p. ej. Django u otro stack que el equipo elija).
- Fixtures o datos **mock** para diseñar y probar pantallas sin esperar al modelo final.
- Documentación mínima para levantar la app en local.

## Qué no va aquí

- El dataset oficial del reto (`DATASET_RETO_AGRO_2026/`).
- CSVs de entrenamiento ni la despensa curada (`dataset_entrenamiento/`).
- Artefactos de modelos entrenados (`modelos/`), salvo el contrato de carga/inferencia que el dashboard necesite consumir.

## Flujo de Git en este track

Una sola rama de trabajo para el dashboard. Los cambios maduros hacen merge hacia `main` del repositorio (vía PR cuando el equipo lo autorice).

| Rol | Rama | Notas |
| --- | --- | --- |
| Trabajo del dashboard | **_por definir_** | Anotar aquí el nombre cuando se cree (p. ej. `feat/dashboard`). |

```text
main
 └── dev-dashboard  →  PR → main
```

**Rama de este track (rellenar):**

```text
dev-dashboard
```

## Estado

- [ ] Rama creada y nombre anotado arriba.
- [ ] Stack y estructura inicial definidos.
- [ ] Mock de parcelas / predicciones para UI.
- [ ] Integración con el modelo de entrega (cuando exista en `modelos/`).

## Convenciones

- Commits y push solo con autorización del equipo.
- Preferir contratos de datos estables (`ID_POLIGONO`, `conjunto`, `rendimiento_t_ha`, estimado, etc.) alineados con la despensa, para no reescribir la UI cuando llegue el modelo real.
- Leer [`AGENTS.md`](AGENTS.md) y [`../AGENTS.md`](../AGENTS.md) al empezar.
- Cada sesión de agente que toque esta carpeta se anota en [`../PROMPTS.md`](../PROMPTS.md).
