# Agentes — `dataset_entrenamiento/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto de esta carpeta: [`README.md`](README.md). Análisis y criterios: [`../README.md#roadmap`](../README.md#roadmap), [`../analisis/RESUMEN_DATOS_FIRA.md`](../analisis/RESUMEN_DATOS_FIRA.md). Diccionario oficial: [`../DATASET_RETO_AGRO_2026/README.md`](../DATASET_RETO_AGRO_2026/README.md).

## Alcance

- Despensa congelada, CSVs curados (solo reto y extendidos) y documentación de fuentes externas.
- Productos **derivados** listos para entrenar; no es el dataset oficial de FIRA.
- Criterios de diseño ya acordados viven en `README.md#roadmap` (ubicación, ciclos, `NUBE_MAX = 30`, etc.); un agente no los cambia sin nuevo acuerdo explícito del equipo.

## Lineamientos (heredan del repo)

- Documentación visible en español.
- Commits y push solo si el prompt lo pide.
- Los archivos de `DATASET_RETO_AGRO_2026/` **no se alteran**; se leen y se copian/transforman hacia productos aquí.
- Bitácora obligatoria en `PROMPTS.md` (formato en el `AGENTS.md` raíz).

## Reglas de datos (cruces)

Aplican las del [`../AGENTS.md`](../AGENTS.md), en especial:

- Unir por `AGC_###` (`ID_POLIGON` en shapefile, `ID_POLIGONO` en CSV).
- `RENDIMIENTO_T_HA` / `rendimiento_t_ha` vacío en predicción: no rellenar con cero.
- Sentinel-2, Landsat y Planet en columnas distintas; no imputar vacíos entre sensores.
- Una fila por parcela en las tablas de entrenamiento.
- Documentar umbral de nubosidad, periodo y filosofía de ubicación en el manifiesto de cada CSV.

## Reglas propias de esta carpeta

1. Versionar CSVs (`…_v1`, `…_v2`); no sobrescribir en silencio un archivo ya citado por un experimento en `modelos/`.
2. Toda fuente externa: origen, licencia/uso, fecha de descarga, CRS, join a parcela y columnas aportadas (`fuentes/` o equivalente).
3. No mezclar en el mismo commit/PR, sin pedirlo, trabajo de la subrama “solo reto” con el de “extendido”; respetar el flujo de ramas del [`README.md`](README.md).
4. Binarios enormes: preferir script de descarga + `.gitignore` y documentar reproducción, salvo que el equipo pida versionarlos.
5. No entrenar modelos ni montar el dashboard dentro de esta carpeta.

## Fuera de alcance (salvo pedido explícito)

- Código de `modelos/` o `dashboard/`.
- Modificar el dataset oficial.
- Cambiar `NUBE_MAX` u otros criterios cerrados en el roadmap del README raíz sin acuerdo del equipo.
