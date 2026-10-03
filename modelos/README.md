# Modelos

Aquí van los **modelos entrenados** (y el código o notebooks que los producen), organizados por tipo de arquitectura y por si se entrenaron solo con el dataset del reto o con el dataset extendido (externos).

La fase de modelos del equipo usa Python. Las tablas de entrada salen de [`../dataset_entrenamiento/`](../dataset_entrenamiento/). El dashboard las consumirá desde [`../dashboard/`](../dashboard/) cuando haya un artefacto de entrega.

Reglas globales: [`../AGENTS.md`](../AGENTS.md). Reglas de esta carpeta: [`AGENTS.md`](AGENTS.md). Decisiones de validación y filosofía: [`../analisis/PROXIMOS_PASOS.md`](../analisis/PROXIMOS_PASOS.md).

## Qué va aquí

- Pipelines de entrenamiento y evaluación (RMSE, MAE, r²; CV oficial por municipio, chequeo por píxel de clima).
- Artefactos versionados (p. ej. `.joblib`, `.pkl`, carpeta de métricas) cuando el equipo decida versionarlos en git o documentar dónde viven.
- Comparativas entre condensamientos de CSV y entre arquitecturas.
- Predicciones sobre las 59 parcelas de `PREDICCION` del modelo elegido.

## Organización sugerida

Categorizar por arquitectura y por origen de datos:

```text
modelos/
  README.md
  solo_reto/                    ← entrenados con curados_reto / despensa sin externos
    baseline/
    classic_ml/                 ← ridge, RF, LightGBM, etc.
    otros/                      ← MLP u otros si se prueban
  extendido/                    ← reentrenados o reconstruidos con dataset extendido
    baseline/
    classic_ml/
    otros/
  comparativas/                 ← tablas de métricas entre corridas
  entrega/                      ← (más adelante) modelo + script de inferencia elegidos
```

Los nombres internos se ajustan cuando exista el primer entrenamiento real.

## Qué no va aquí

- Despensa y CSVs crudos de features (`dataset_entrenamiento/`).
- UI del dashboard (`dashboard/`).
- Modificar `DATASET_RETO_AGRO_2026/`.

## Flujo de Git en este track

Dos ramas: una **principal de modelos** (dataset original / solo reto) y una **subrama** (modelos sobre dataset extendido). Hacen merge entre sí (la subrama alimenta o se integra en la principal de modelos) **antes** del merge hacia `main` del repositorio.

| Rol | Rama | Contenido típico |
| --- | --- | --- |
| Principal de modelos | **_por definir_** | Entrenamientos y artefactos con datos solo del reto |
| Subrama: dataset extendido | **_por definir_** | Reentrenos / reconstrucciones que aprovechan datos externos |

```text
main
 └── [rama principal modelos — solo reto]
       └── [subrama modelos extendido]  →  merge → principal modelos
             →  luego PR de [principal modelos] → main
```

**Ramas de este track (rellenar cuando existan):**

```text
Principal (solo dataset del reto):   ________________________________
Subrama (dataset extendido):         ________________________________
```

## Relación con `dataset_entrenamiento/`

| Entrada (dataset) | Salida típica aquí |
| --- | --- |
| `curados_reto/` / despensa sin externos | `solo_reto/` |
| `curados_extendidos/` | `extendido/` |

Cada corrida debería citar en un README o manifiesto corto: ruta del CSV, versión, semilla, CV y métricas.

## Estado

- [ ] Dos ramas creadas y nombres anotados arriba.
- [ ] Primer baseline con CSV solo-reto.
- [ ] Comparativa mínima (baseline vs classic ML) documentada.
- [ ] Experimentos con dataset extendido cuando exista en `dataset_entrenamiento/`.
- [ ] Modelo de entrega + predicciones de las 59 (decisión humana 8).

## Convenciones

- No abrir entrenamiento masivo en `main` sin pasar por las ramas de este track.
- Misma CV y semillas al comparar CSVs (ver `PROXIMOS_PASOS.md`).
- Commits y push solo con autorización del equipo.
- Sesiones de agente: [`../PROMPTS.md`](../PROMPTS.md).
- Leer [`AGENTS.md`](AGENTS.md) y [`../AGENTS.md`](../AGENTS.md) al empezar.
- Según el `AGENTS.md` raíz, el trabajo de modelos arranca cuando el equipo lo pide de forma explícita; esta carpeta queda lista para ese momento.
