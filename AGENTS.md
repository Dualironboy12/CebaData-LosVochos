# Instrucciones para agentes

Reglas operativas del repositorio **CebaData** (equipo Los Vochos, Reto AgroCebada FIRA 2026). El README explica qué es el repo, la arquitectura y cómo ejecutarlo. El diccionario de datos está en [`DATASET_RETO_AGRO_2026/README.md`](DATASET_RETO_AGRO_2026/README.md).

Leer este archivo al empezar una tarea. Antes de cerrarla, agregar una entrada al final de [`PROMPTS.md`](PROMPTS.md).

## Qué se construye

Un estimado de rendimiento de cebada (t/ha) por parcela y un dashboard web para consultarlo. La etiqueta observada es el ciclo **abril–octubre de 2025**. Hay 197 parcelas (`AGC_001` … `AGC_197`): 138 de `ENTRENAMIENTO` con rendimiento y 59 de `PREDICCION` sin él. Esa partición es la oficial; las 59 se estiman al entregar.

**Modelo de entrega firmado:** la **mezcla** (ensamble LightGBM + RF + Elastic Net + LightGBM de solo longitud). Ficha en [`modelos/entrega/`](modelos/entrega/). El pipeline y la API están en el submódulo [`sistema/api`](sistema/api) (fuente de verdad: [cebadata_api](https://github.com/ALNM7/cebadata_api)). El dashboard está en [`sistema/dashboard`](sistema/dashboard) ([DashboardCebaData](https://github.com/ALNM7/DashboardCebaData)).

## Fases y fase actual

La fase actual es **entrega**: el proceso está documentado aquí; la API y el dashboard publicados viven en sus repos y se incluyen como submódulos. El reporte técnico y el video los prepara otra integrante y se envían por correo; no se agregan a este repositorio.

| Fase | Alcance | Stack | Dónde va el código |
| --- | --- | --- | --- |
| 1. Análisis de datos | Calidad, distribuciones, relaciones, filtros y variables candidatas. Tres carriles: FIRA, INEGI, SoilGrids | R | `analisis/` |
| — | Despensa congelada y CSVs curados (reto y extendidos) | — | `dataset_entrenamiento/` |
| 2. Modelos | Explorar, comparar y firmar el modelo de entrega | Python | `modelos/` (la ficha de la mezcla en `modelos/entrega/`; el pipeline en `sistema/api/pipeline/`) |
| 3. API | Servir artefactos congelados (solo lectura) | Django REST | `sistema/api` (submódulo) |
| 4. Frontend | Dashboard interactivo | Angular | `sistema/dashboard` (submódulo) |

Cada carpeta de trabajo de este repo (`analisis/`, `dataset_entrenamiento/`, `modelos/`) tiene su `AGENTS.md` local que **remite a este archivo**. `sistema/` no se edita aquí.

La lista de lo que queda en el repositorio está en [`ENTREGA.md`](ENTREGA.md). Cómo ejecutar en local: [`INSTALACION.md`](INSTALACION.md). El camino a Render y Vercel: [`docs/CAMINO_A_HOSTING.md`](docs/CAMINO_A_HOSTING.md).

## Submódulos

`sistema/api` y `sistema/dashboard` apuntan a commits fijos de los repos de ALNM7. No se modifican desde este árbol. Un cambio se propone en ese repo (ver [`docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md`](docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md)); cuando se integra, aquí se actualiza el puntero del submódulo.

El README llama «Etapa 1» y «Etapa 2» al calendario de FIRA. Esas etapas oficiales conviven con las fases de esta tabla.

## Bitácora obligatoria

Todo agente que trabaje en el repo agrega una entrada en [`PROMPTS.md`](PROMPTS.md), al final, sin reescribir ni borrar entradas anteriores. Sirve para el anexo de uso de inteligencia artificial. Ese anexo va en el reporte, que se envía por correo y no se versiona aquí.

Formato:

```markdown
## AAAA-MM-DD — título breve

**Modelo**

Nombre y versión del modelo que ejecutó la tarea (por ejemplo, Grok 4.7).

**Prompt**

> Texto recibido, fiel al mensaje de la persona.

**Acciones**

- Qué se hizo, en el orden en que importa para entender el resultado.

**Afectaciones**

- Archivos creados, modificados o eliminados, y qué cambió en cada uno.
- Qué quedó fuera de la tarea (datos crudos, commits, fases que no se tocaron).
```

Anotar también una sesión que no haya editado archivos, si el agente analizó el repo o recomendó una decisión. El prompt largo se conserva; un resumen sustituye al texto original solo si el mensaje incluye datos adjuntos voluminosos, y en ese caso se dice qué se omitió.

## Datos que no se alteran

Los archivos dentro de `DATASET_RETO_AGRO_2026/` son la entrega oficial. Se leen y se copian hacia productos derivados. Un agente los modifica solo si el prompt lo pide.

Al cruzar tablas y rásteres:

- Unir por el valor `AGC_###`. En el shapefile el campo se llama `ID_POLIGON`; en los CSV, `ID_POLIGONO`. El área del shapefile es `área_ha` (con acento).
- `RENDIMIENTO_T_HA` vacío significa etiqueta oculta. Dejarlo vacío. Un cero sería un rendimiento falso.
- En el CSV Básico, Sentinel-2 y Landsat comparten filas y casi ninguna columna. Landsat solo trae VI6T. Esos vacíos son del diseño del archivo.
- NDVI, EVI y LAI de Planet (CSV PRO, solo 2025) salen de otro sensor. Mantenerlos en columnas distintas a las de Sentinel-2.
- Fechas en texto `DD/MM/AAAA`.
- Lluvia y temperatura: GeoTIFF mensuales, EPSG:4326, píxel de 0.05°, sin dato −9999. El píxel mide unos 5 km; parcelas vecinas pueden compartir el mismo valor.
- Elevación y pendiente: EPSG:6372, 120 m. Reproyectar antes de la estadística zonal.
- El objetivo de modelado es una fila por parcela, con el rendimiento de un solo ciclo.

El detalle de rangos, nubosidad y software para abrir cada formato está en la guía del dataset.

## Entregables posteriores

El reporte técnico y el video demostrativo no se escriben en este repositorio. Los prepara otra integrante y se envían por correo. No recrear `reporte/` ni un guion aquí.

La aplicación tiene que poder ejecutarse con el código y la documentación del repo (`bash scripts/levantar_local.sh`).

## Convenciones de trabajo

- Documentación y nombres de secciones visibles para el equipo, en español.
- Commits y push solo si el prompt lo pide.
- Dejar el dataset crudo, `LICENSE` y los PDF de las bases como están, salvo pedido explícito.
- Preferir cambios acotados a la fase y a los archivos que la tarea necesita.
- No re-curar el dataset oficial dentro de `modelos/` ni reentrenar la mezcla sin acuerdo: los artefactos en `sistema/api/artefactos/` son la fuente de verdad en runtime, y el repo de ALNM7 manda sobre esa carpeta.
