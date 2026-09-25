# Instrucciones para agentes

Reglas operativas del repositorio **CebaData** (equipo Los Vochos, Reto AgroCebada FIRA 2026). El contexto del reto para personas está en [`README.md`](README.md). El diccionario de datos está en [`DATASET_RETO_AGRO_2026/README.md`](DATASET_RETO_AGRO_2026/README.md).

Leer este archivo al empezar una tarea. Antes de cerrarla, agregar una entrada al final de [`PROMPTS.md`](PROMPTS.md).

## Qué se construye

Un estimado de rendimiento de cebada (t/ha) por parcela y un dashboard web para consultarlo. La etiqueta observada es el ciclo **abril–octubre de 2025**. Hay 197 parcelas (`AGC_001` … `AGC_197`): 138 de `ENTRENAMIENTO` con rendimiento y 59 de `PREDICCION` sin él. Esa partición es la oficial; las 59 se estiman al entregar.

## Fases y fase actual

La fase actual es **análisis de datos**.

| Fase | Alcance | Stack | Dónde va el código |
| --- | --- | --- | --- |
| 1. Análisis de datos | Calidad, distribuciones, relaciones, filtros y variables candidatas. El producto es una lectura reproducible y, cuando toque, una tabla de trabajo por parcela | R | `analisis/` |
| 2. Modelos | Entrenar y evaluar el modelo de rendimiento. Métricas de referencia del reto: RMSE, MAE, r² | Python | `modelo/` |
| 3. Frontend | Dashboard que ejecute el modelo y permita consultar resultados | Django | `dashboard/` |

Fuera de estas tres fases, y solo cuando el desarrollo esté cerrado, quedan el reporte técnico y el video de máximo 5 minutos. Esos entregables ya están descritos en el README (extensiones por sección, video, código fuente).

Trabajar dentro de la fase actual. Pasar a modelos o a Django solo si la persona lo pide de forma explícita en el prompt. Un script de exploración en Python durante la fase 1 también queda fuera de alcance: el análisis es en R.

El README llama «Etapa 1» y «Etapa 2» al calendario de FIRA (entrega del proyecto, luego presentación ante el jurado). Esas etapas oficiales conviven con las tres fases de esta tabla.

## Bitácora obligatoria

Todo agente que trabaje en el repo agrega una entrada en [`PROMPTS.md`](PROMPTS.md), al final, sin reescribir ni borrar entradas anteriores. Sirve para el anexo de uso de inteligencia artificial que pide el reporte.

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

Cuando el trabajo llegue al reporte o al video:

- Respetar las extensiones de palabra del README. En anexos, máximo 2 cuartillas, con la aportación de cada integrante y la declaración de uso de agentes apoyada en `PROMPTS.md`.
- El video demostrativo dura como máximo 5 minutos.
- La aplicación tiene que poder ejecutarse con el código y la documentación del repo.

## Convenciones de trabajo

- Documentación y nombres de secciones visibles para el equipo, en español.
- Commits y push solo si el prompt lo pide.
- Dejar el dataset crudo, `LICENSE` y los PDF de las bases como están, salvo pedido explícito.
- Preferir cambios acotados a la fase y a los archivos que la tarea necesita.
