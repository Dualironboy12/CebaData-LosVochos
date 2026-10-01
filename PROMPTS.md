# Registro de prompts

Bitácora de agentes de desarrollo. Cada entrada se agrega al final. El formato está en [`AGENTS.md`](AGENTS.md).

## 2026-09-24 — Plan de trabajo y reglas para agentes

**Modelo**

Grok 4.7

**Prompt**

> Agrega un documento AGENTS.md con la informacion que consideres relevante para agentes, y al README.md lo siguiente, redactandolo en ambos casos como sea relevante, ya sea para humanos o para agentes de desarrollo: Se desarrolla el proyecto en 3 etapas: analisis de datos, desarrollo y entrenamiento de modelos de IA, desarrollo de frontend. Se utilizará R para el analisis de datos, se propone python y django para trabajar con los modelos y presentarlo a manera de dashboard en una pagina web. Como consideraciones adicionales, en este momento nos encontramos en la fase de analisis de datos, tras terminar el desarrollo del proyecto, tenemos que tambien que desarrollar un reporte y video de presentacion, toma en cuenta que el uso de agentes esta permitido, pero todo agente que trabaje en el repo tiene que anotar en un archivo llamado PROMPTS.md que prompt recivio, que acciones tomo y que afectaciones tuvo, crea el documento de una vez y añade este prompt tras hacerlo.

**Acciones**

- Se añadió al README la sección «Plan de trabajo del equipo»: tres fases (análisis en R, modelos en Python, dashboard en Django), fase actual de análisis, y el reporte y el video como cierre posterior.
- Se enlazó la guía del dataset, `AGENTS.md` y `PROMPTS.md` desde el README, y se indicó que esta bitácora alimenta la declaración de uso de inteligencia artificial del reporte.
- Se redactó `AGENTS.md` con la fase actual, el alcance de cada fase, las convenciones de carpetas, las reglas de los datos oficiales y la obligación de registrar cada sesión aquí.

**Afectaciones**

- `README.md`: sección nueva de plan de trabajo, enlace a la guía del dataset y actualización de la lista de documentos.
- `AGENTS.md`: archivo nuevo.
- `PROMPTS.md`: archivo nuevo, con esta entrada.
- Sin cambios en el dataset, en el código ni en el historial de git.

## 2026-09-24 — Modelo y versión en la bitácora

**Modelo**

Grok 4.7

**Prompt**

> añade a la bitacora de prompts una seccion donde el agente debe indicar que modelo y version de agente fue responsable del movimiento, en este caso por ejemplo seria grok 4.7

**Acciones**

- Se añadió el campo **Modelo** al formato obligatorio de `AGENTS.md` y a la entrada ya existente de esta bitácora.
- El README ahora pide que cada registro incluya el modelo y la versión, además del prompt, las acciones y las afectaciones.

**Afectaciones**

- `AGENTS.md`: el formato de cada entrada exige el nombre y la versión del modelo.
- `README.md`: la frase de la bitácora incluye ese dato.
- `PROMPTS.md`: la entrada del plan de trabajo queda atribuida a Grok 4.7, y se agregó esta entrada.
- Sin cambios en el dataset, en el código ni en el historial de git.

## 2026-09-24 — Commit y push del plan de trabajo

**Modelo**

Grok 4.7

**Prompt**

> Execute the selected diff-tab commit-and-push action. Stage the changes you worked on, commit, and push for this branch. Current branch: main. Base branch: main.

**Acciones**

- Se revisó el estado de `main` y se confirmó que el README del dataset ya estaba en el historial.
- Se incluyeron en el commit `README.md`, `AGENTS.md` y `PROMPTS.md`, y se empujó la rama `main` a `origin`.

**Afectaciones**

- Historial de git: un commit nuevo en `main`, publicado en el remoto.
- Sin cambios en el dataset ni en el código de análisis, modelos o dashboard.

## 2026-09-29 — Diseño del plan de KDD en R

**Modelo**

Claude Sonnet 5.5

**Prompt**

> Necesitamos realizar un KDD en el dataset para entender como se relacionan entre si los datos, y poder visualizarlos mas facilmente y encontrar patrones y relaciones, usaremos R para esto, ayudame a diseñar el plan para ello

**Acciones**

- Se revisaron `README.md`, `AGENTS.md`, la guía del dataset y `PROMPTS.md`. Se comprobó que `analisis/` estaba vacío.
- Se diseñó un plan de KDD en R con las cinco etapas (selección, preprocesamiento, transformación, minería, interpretación), reglas de cruce heredadas de `AGENTS.md`, lista de figuras y alcance excluido (modelos, imputación, cambios al dataset).

**Afectaciones**

- Sin cambios en el repositorio. El plan quedó en un archivo de planes fuera del repo.

## 2026-09-29 — Implementación del KDD en R

**Modelo**

Claude Sonnet 5.5

**Prompt**

> KDD del dataset de cebada en R
>
> Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.
>
> To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
>
> (Se omite el plan adjunto: es el diseño de la entrada anterior.)

**Acciones**

- R del sistema no tenía `sf`, `terra`, `rmarkdown` ni pandoc, ni bibliotecas GDAL, y no había acceso de administrador. Con aprobación de la persona se descargó micromamba y se creó un entorno de conda-forge en `~/.local/share/ceba-env` (fuera del repo) con R 4.5, `sf`, `terra`, `tidyverse`, `rmarkdown` y pandoc.
- Se creó `analisis/` con seis scripts de R (`00_setup.R` a `06_patrones.R`), el informe `informe/kdd.Rmd` y `correr.sh` para ejecutarlo todo.
- Selección: inventario de las nueve fuentes y verificación de llaves entre shapefile y CSV (197 parcelas, 138 de entrenamiento y 59 de predicción, sin discrepancias).
- Calidad: fechas tipadas, separación de Sentinel-2, Landsat y Planet, vacíos estructurales frente a vacíos por nube, consistencia (mín ≤ promedio ≤ máx, desviaciones) y rangos. Se detectó una fila de Landsat con VI6T vacío que no se explica por nube (17 578 vacíos contra 17 577 de la guía).
- Transformación: filtro de nube 0, recorte a abril–octubre de 2025, resumen por parcela y sensor con el sensor en el nombre de la columna. Con ese filtro ninguna parcela queda con menos de 5 observaciones. Se añadieron medias de NDVI por fase (mayo–julio, agosto, septiembre–octubre) después de ver en las trayectorias que la diferencia por rendimiento aparece al final del ciclo.
- Clima y topografía: estadística zonal con `exact = TRUE` (con `weights = TRUE` las parcelas menores que el píxel devolvían NaN) y polígonos reproyectados a EPSG:6372. Las 197 parcelas caen sobre 25 celdas de clima.
- Relaciones: mapa, distribuciones, trayectorias del ciclo por cuartil de rendimiento, dispersiones y correlaciones de Spearman globales y dentro de cada estado, con ajuste de Benjamini-Hochberg.
- Patrones: redundancia entre variables, PCA exploratorio y cuatro perfiles de parcela.
- Hallazgos principales: el estado y el municipio explican cerca del 50 % y el 67 % de la varianza del rendimiento; la temperatura pierde su asociación dentro de cada estado, la lluvia no; los índices de NDVI tienen señal débil; los perfiles no separan el rendimiento.
- El informe se escribió en R Markdown porque Quarto no está instalado, como preveía el plan.
- Se probó el flujo completo desde cero (`bash analisis/correr.sh`) tras borrar `analisis/salida/`.

**Afectaciones**

- Archivos creados: `analisis/README.md`, `analisis/.gitignore`, `analisis/correr.sh`, `analisis/R/00_setup.R` a `06_patrones.R`, `analisis/informe/kdd.Rmd`.
- Salidas generadas en `analisis/salida/`: `parcelas_trabajo.csv` (197 filas, 101 columnas), `parcelas_trabajo_diccionario.csv`, `kdd.html`, `tablas/` y `figuras/`. `salida/intermedio/` se genera pero no se versiona.
- `PROMPTS.md`: estas dos entradas.
- Fuera del repo: entorno de micromamba en `~/.local/share/ceba-env`.
- Sin cambios en `DATASET_RETO_AGRO_2026/`, en `modelo/` ni en `dashboard/`. Sin commits ni push.

## 2026-09-30 — Documentos de resumen y próximos pasos

**Modelo**

Claude Sonnet 5.5

**Prompt**

> Ok, ahora, por favor, estructura esta informacion de cuales son los siguientes pasos, que responsabilidades corresponden a agentes vs humanos, y recomendaciones para pruebas de diferentes CSVs de entrenamiento, eleccion de modelos y filosofia de diseño, y lo que hablamos aqui, en un archivo md llamado PROXIMOS PASOS en la carpeta @analisis/ adicionalmente en esa misma carpeta escribe un RESUMEN DE ANALISIS.md donde hagas una explicacion lo mas sencilla, intuitiva y comprensible posible de las observaciones que hicimos durante el KDD, para poder compartirlo con los demas compañeros asi como para que sea mas facil navegar toda la informacion en el analisis kdd para quienes despues puedan revisar el repo

**Acciones**

- Se escribió `analisis/RESUMEN_DE_ANALISIS.md` con una lectura sencilla de los hallazgos del KDD y una guía de navegación del directorio `analisis/`.
- Se escribió `analisis/PROXIMOS_PASOS.md` con el orden de trabajo, decisiones humanas vs tareas de agente, filosofía de diseño, variantes de CSV, y criterios Classic ML vs Hugging Face / redes.
- Se enlazaron ambos documentos desde `analisis/README.md`.

**Afectaciones**

- `analisis/RESUMEN_DE_ANALISIS.md`: archivo nuevo.
- `analisis/PROXIMOS_PASOS.md`: archivo nuevo.
- `analisis/README.md`: tabla de documentos al inicio.
- `PROMPTS.md`: esta entrada.
- Sin cambios en el dataset, en scripts de R, en salidas regeneradas, ni en `modelo/` o `dashboard/`. Sin commits.
