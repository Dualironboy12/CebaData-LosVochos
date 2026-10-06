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

## 2026-10-01 — Decisiones humanas 1–6 en PROXIMOS_PASOS

**Modelo**

Claude Sonnet 5.5

**Prompt**

> 1A conservamos las columnas originales como despensa, generamos a partir de el csv reducidas o integrando nuevos datos, 2B probaremos con datasets con 3 filosofias: sin ubicacion de ningun tipo, con algunos datos de ubicacion, y con todos los datos de ubicacion, 3B formamos dos tipos de dataset, con todos los ciclos anuales vs solo con 2025, 4 Para tratar de maximizar datos usaremos el umbral de 30, 5C, 6B quisiera priorizar el comenzar entrenamientos con datasets construidos con los datos entregados, y en paralelo buscar conseguir, documentar y alinear datos externos, especialmente de Inegi con los datos provistos para el reto para construir nuevos datasets mas ricos para modelos mejor entrenados o mas grandes

**Acciones**

- Se registraron en `analisis/PROXIMOS_PASOS.md` las decisiones 1–6 del equipo (despensa + CSVs derivadas; tres filosofías de ubicación; solo 2025 vs todos los ciclos; NUBE_MAX = 30; CV oficial por municipio + chequeo por píxel; datos del reto primero y externos/INEGI en paralelo).
- Se actualizaron la matriz de CSVs, la nota de regenerar la despensa (hoy está con nube 0), el orden recomendado y el checklist.
- Quedaron pendientes las decisiones 7–9 (abrir fases, modelo de entrega, commits/reporte).

**Afectaciones**

- `analisis/PROXIMOS_PASOS.md`: sección de decisiones del equipo y ajustes relacionados.
- `PROMPTS.md`: esta entrada.
- Sin cambio de `NUBE_MAX` en el código ni regeneración de `parcelas_trabajo.csv` en esta sesión. Sin commits.

## 2026-10-03 — Carpetas dashboard, dataset_entrenamiento y modelos

**Modelo**

Claude Sonnet 5.5

**Prompt**

> Ok, en un momento creare las ramas diferentes, de momento, ayudame con lo siguiente: integre 3 nuevas carpetas, cada una con un readme, documenta los readmes y deja un espacio para que pueda poner que rama corresponde el trabajo de esa carpeta una vez las haya creado, @dashboard/ es donde pondremos el desarrollo del dashboard que entregaremos, todavia no tengo nada definido al respecto, Alfredo, un compañero de equipo ha mencionado que el lo puede realizar, unicamente necesitamos una rama aqui, @dataset_entrenamiento/ es donde pondremos nuestra despensa una vez hayamos congelado los datos de entrenamiento que usaremos, los datasets ya curados y preparados para entrenamiento, asi como en su momento el dataset extendido con datos externos, con una extension de la despensa y nuevos datasets curados con datos externos, asi como la informacion de las fuentes de los datos, tendremos 3 ramas aqui, una principal con la despensa congelada del dataset, y 2 subramas que alimentan la rama principal, una para el dataset unicamente con datos provistos, y otra con el dataset extendido, primero haran merge hacia la rama principal del dataset, luego al main, y finalmente @modelos/ donde pondremos los modelos que vayamos entrenando, categorizados por su tipo de arquitectura y si fueron entrenados con datos externos o unicamente el dataset ya existente, tendremos aqui 2 ramas, una "principal" que sera la que aloje los modelos entrenados con el dataset original, y una subrama que tendra los modelos reentrenados o reconstruidos para aprovechar el dataset extendido, haran merge entre si antes de hacer merge al main

**Acciones**

- Se crearon `dashboard/README.md`, `dataset_entrenamiento/README.md` y `modelos/README.md` con propósito, qué sí/no va, flujo de ramas, placeholders para nombres de rama, estructura sugerida y estado.
- Se actualizó `AGENTS.md` para apuntar a `modelos/` y `dataset_entrenamiento/` (antes decía `modelo/`).

**Afectaciones**

- `dashboard/README.md`, `dataset_entrenamiento/README.md`, `modelos/README.md`: nuevos.
- `AGENTS.md`: rutas de carpetas de fases.
- `PROMPTS.md`: esta entrada.
- Sin código de app ni CSVs; sin creación de ramas git; sin commits.

## 2026-10-03 — AGENTS.md locales en dashboard, dataset y modelos

**Modelo**

Claude Sonnet 5.5

**Prompt**

> Añade tambien un documento AGENTS.md para cada carpeta que acabamos de mencionar que refieran al @AGENTS.md para mantener buenas practicas y lineamientos con desarrollo asistido

**Acciones**

- Se crearon `dashboard/AGENTS.md`, `dataset_entrenamiento/AGENTS.md` y `modelos/AGENTS.md`, cada uno remitiendo al `AGENTS.md` raíz, a `PROMPTS.md` y a reglas propias del track.
- Se enlazaron desde los README de cada carpeta y se mencionó en el `AGENTS.md` raíz.

**Afectaciones**

- `dashboard/AGENTS.md`, `dataset_entrenamiento/AGENTS.md`, `modelos/AGENTS.md`: nuevos.
- `dashboard/README.md`, `dataset_entrenamiento/README.md`, `modelos/README.md`: enlace al AGENTS local.
- `AGENTS.md` (raíz): nota sobre AGENTS por carpeta.
- `PROMPTS.md`: esta entrada.
- Sin ramas git ni commits.

## 2026-10-03 — Revisión de READMEs y AGENTS del repo

**Modelo**

Claude Sonnet 5.5

**Prompt**

> Revisa todos los READMEs y AGENTs del repo, corrigelos si tienen inconsistencias

**Acciones**

- Se unificó la ruta `modelo/` → `modelos/` en `analisis/PROXIMOS_PASOS.md` y se añadió `dataset_entrenamiento/` al mapa de fases.
- Se alineó el plan de trabajo y la lista de documentos del `README.md` raíz con las carpetas reales y el wording de stack del dashboard.
- Se creó `analisis/AGENTS.md` (faltaba respecto a las otras carpetas de trabajo) y se actualizó el `AGENTS.md` raíz (AGENTS locales + puente `dataset_entrenamiento/` sin abrir fase 2).
- Se actualizaron enlaces en `analisis/README.md`, `RESUMEN_DE_ANALISIS.md` y convenciones de los README de `dashboard/`, `dataset_entrenamiento/` y `modelos/`.
- Se añadió en la guía del dataset oficial un párrafo que apunta a `analisis/` y `dataset_entrenamiento/` sin alterar el carácter de solo lectura de `DATASET_RETO_AGRO_2026/`.

**Afectaciones**

- `README.md`, `AGENTS.md`, `analisis/AGENTS.md` (nuevo), `analisis/README.md`, `analisis/PROXIMOS_PASOS.md`, `analisis/RESUMEN_DE_ANALISIS.md`, `DATASET_RETO_AGRO_2026/README.md`, READMEs de `dashboard/`, `dataset_entrenamiento/`, `modelos/`.
- `PROMPTS.md`: esta entrada.
- No se reescribieron entradas históricas de `PROMPTS.md` que mencionan `modelo/`. Sin commits.

## 2026-10-03 — Despensa nube 30 congelada y despensa extendida con edafología INEGI

**Modelo**

Claude Sonnet 5.5 (Cursor).

**Prompt**

> Despensa extendida con edafología INEGI y análisis R — Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
>
> (Se omite el contenido del plan adjunto, que ya consta en el chat; resumen: regenerar y congelar la despensa con umbral de nube 30; crear `DATASETS_EXTERNOS/despensa_extendida/`; script R 07 de cruce espacial con la edafología INEGI; script R 08 de relaciones suelo–rendimiento con mapa de suelo y rendimiento; rutas, READMEs y bitácora.)

**Acciones**

- Se cambió `NUBE_MAX` a 30 en `analisis/R/00_setup.R` y se agregó `03_parametros.csv` para que el informe lea el umbral real en lugar de tenerlo escrito a mano. Se regeneró todo con `bash analisis/correr.sh`. Verificación: 197 filas, rendimiento vacío solo en las 59 de predicción, ninguna parcela por debajo de 5 observaciones (mínimos: Sentinel-2 27, Landsat 8, Planet 60) y sin vacíos en los índices (con nube 0 había dos). Las conclusiones del informe se mantuvieron; cambiaron algunos valores de correlación y la mejor variable de Planet.
- Se congeló la despensa en `dataset_entrenamiento/despensa/` (CSV, diccionario y `MANIFIESTO.md` con SHA-256). Una segunda corrida completa dio el mismo hash.
- Se documentó `DATASETS_EXTERNOS/despensa_extendida/` (README y `fuentes_edafologia.md`: fuente, licencia, CRS asignado EPSG:6372 por falta de `.prj`, campos y limitaciones).
- Script `07_despensa_extendida_edaf.R`: recorte de la edafología al área de las parcelas más 5 km (140 polígonos), intersección en EPSG:6372, polígono de mayor área por parcela y 6 columnas `edaf_*`. Resultado: 197 filas × 107 columnas, 138 con rendimiento, 0 parcelas sin suelo. Dominan 5 grupos (Phaeozem 136, Planosol 28, Umbrisol 24, Vertisol 6, Andosol 3) y 22 polígonos distintos.
- Script `08_relaciones_edaf.R`: tablas de rendimiento por suelo, suelo por estado, pruebas Kruskal-Wallis (global, sin la media del estado y dentro de estado) y R² ajustado; boxplot por grupo y textura; mapa de suelo con el rendimiento encima (general y por estado). Lectura en `analisis/08_lectura_edaf.md`: el estado pesa mucho más que el suelo; el Umbrisol rinde algo menos dentro de Hidalgo (p ≈ 0.07); la textura no aporta.
- Se actualizaron los textos que decían «nube 0» o citaban `AGC_016`/`AGC_096` en `kdd.Rmd`, `analisis/README.md`, `RESUMEN_DE_ANALISIS.md` y `PROXIMOS_PASOS.md`.
- Incidencia: los archivos nuevos creados con la herramienta de escritura salieron en cp1252 en vez de UTF-8; se reconvirtieron y se comprobó que todos los archivos tocados son UTF-8 válido.

**Afectaciones**

- Modificados: `analisis/R/00_setup.R` (NUBE_MAX = 30, rutas y CRS de externos), `analisis/R/03_transformacion.R` (tabla de parámetros), `analisis/informe/kdd.Rmd`, `analisis/README.md`, `analisis/AGENTS.md`, `analisis/RESUMEN_DE_ANALISIS.md`, `analisis/PROXIMOS_PASOS.md`, `dataset_entrenamiento/README.md`, y todas las salidas regeneradas de `analisis/salida/` (tablas, figuras, `parcelas_trabajo*.csv`, `kdd.html`).
- Creados: `analisis/R/07_despensa_extendida_edaf.R`, `analisis/R/08_relaciones_edaf.R`, `analisis/08_lectura_edaf.md`, `analisis/salida/tablas/03_parametros.csv`, `07_*` y `08_*` en `tablas/` y `figuras/`, `dataset_entrenamiento/despensa/` (CSV, diccionario, `MANIFIESTO.md`), `DATASETS_EXTERNOS/despensa_extendida/` (README, `fuentes_edafologia.md`, CSV extendido y diccionario).
- `PROMPTS.md`: esta entrada.
- Fuera de la tarea: el shapefile y el zip de INEGI no se movieron ni se copiaron; el CSV extendido no se copió a `dataset_entrenamiento/curados_extendidos/`; `07` y `08` no se agregaron a `correr.sh`; no se entrenó ningún modelo ni se tocó el dashboard; el plan no se editó; sin commits.

## 2026-10-03 — Recorte versionado de la edafología y reglas de gitignore

**Modelo**

Claude Sonnet 5.5 (Cursor).

**Prompt**

> Realiza entonces el recorte, ajusta las lecturas de datos, y ajusta los gitignore y mds

Contexto: la persona preguntó antes si podía borrar los datos originales de INEGI porque no caben en GitHub.

**Acciones**

- `07_despensa_extendida_edaf.R` ahora escribe el recorte de la edafología (140 polígonos, campos originales de INEGI, EPSG:6372 dentro del archivo) en `DATASETS_EXTERNOS/despensa_extendida/edafologia_recorte_parcelas_v1.gpkg` (~0.7 MB) cuando existe el shapefile nacional, y lo lee de ahí cuando no existe (o con `CEBA_EDAF_RECORTE=1`). Se comprobó que ambas rutas dan CSV extendido y tabla de control idénticos (mismos SHA-256) y que `08_relaciones_edaf.R` corre sin cambios.
- `00_setup.R`: nueva ruta `RUTA_EXT$edaf_recorte`.
- `.gitignore` raíz: se ignora `DATASETS_EXTERNOS/*` salvo `despensa_extendida/`, y se agregó `!.gitignore`. Antes la regla `.*` ocultaba los dos `.gitignore` (raíz y `analisis/`), así que ninguno se compartía con el equipo.
- Documentación actualizada en `fuentes_edafologia.md` (metadatos y PDF ya no están en el repo; cómo obtener el original), `despensa_extendida/README.md` y `analisis/README.md`.
- Hallazgo, sin corregir: el shapefile nacional (`.shp` de 225 MB) ya está en el commit local `b7ee2d5` (aún sin publicar), por lo que `.gitignore` no basta y un push fallaría por el límite de 100 MB de GitHub. Quitarlo exige reescribir esos commits locales; no se hizo sin confirmación.

**Afectaciones**

- Modificados: `analisis/R/00_setup.R`, `analisis/R/07_despensa_extendida_edaf.R`, `analisis/README.md`, `DATASETS_EXTERNOS/despensa_extendida/README.md`, `DATASETS_EXTERNOS/despensa_extendida/fuentes_edafologia.md`, `analisis/salida/tablas/07_edaf_join_resumen.csv` (redondeo de la mediana).
- Creados: `DATASETS_EXTERNOS/despensa_extendida/edafologia_recorte_parcelas_v1.gpkg`, `.gitignore` (ahora versionable).
- No se borró ni movió el shapefile nacional, no se tocó el índice de git ni el historial y no hubo commits.

## 2026-10-04 — Push rechazado por el shapefile de INEGI: limpieza de commits locales

**Modelo**

Claude Sonnet 5.5 (Cursor).

**Prompt**

> Tengo este tema: (salida de `git push`: GitHub rechaza `cdv_edaf_esc_250k_serie II_cont_nac.shp`, 224.90 MB, por superar el límite de 100 MB)

**Acciones**

- Se comprobó que el archivo seguía en el historial local sin publicar: aparecía en `b7ee2d5` y, aunque el commit `50d4cea` ya lo quitaba, el blob viajaba en el push.
- Se creó la rama de respaldo `respaldo-antes-de-limpiar` y se reescribieron solo los tres commits locales (`origin/main..HEAD`) con `git filter-branch`, quitando `DATASETS_EXTERNOS/INEGI_EDAFOLOGIA_2025/`. Los commits de `origin/main` no se tocaron, así que el push no necesita `--force`.
- Verificación: el árbol final es idéntico al anterior a la limpieza y el objeto más grande del rango sin publicar pesa 2.3 MB.

**Afectaciones**

- Historial local: `main` reescrito (hashes nuevos en los tres commits sin publicar). `PROMPTS.md`: esta entrada, sin commitear.
- No se hizo push. La rama `respaldo-antes-de-limpiar` conserva el blob grande; borrarla (y correr `git gc`) cuando ya no haga falta.

## 2026-10-04 — Entorno de Python y exploración de SoilGrids

**Modelo**

Claude Sonnet 5.5 (Cursor).

**Prompt**

> Primero crea la carpeta dentro de @DATASETS_EXTERNOS/ y dentro crea y prepara el entorno para python, luego prueba a instalar "pip install soilgrids", luego prueba a usarlo para descargar datos, si funciona, primero genera un documento temporal con los datos que hay disponibles, para despues elegir cuales integraremos al nuevo analisis

**Acciones**

- Se creó `DATASETS_EXTERNOS/soilgrids/` con `preparar_entorno.sh`, que crea el venv y, si falta `python3-venv`, lo crea sin pip y arranca pip con `get-pip.py` (era el caso en esta máquina). Se instaló `soilgrids` 0.1.5 y se fijaron versiones en `requirements.txt`.
- `explorar_disponibles.py` listó los 12 servicios de SoilGrids (336 capas) y descargó dos capas de prueba (pH y arcilla, 0–5 cm) sobre la caja de las 197 parcelas, en EPSG:152160 a 250 m, sin errores. Se midió su variación entre parcelas: la arcilla da 86 valores distintos, el pH solo 12.
- Se escribió `DISPONIBLES_TEMPORAL.md` (capas, unidades y factores de conversión, advertencias y tabla de candidatas por marcar) y un `README.md` de la carpeta.
- Se añadió la excepción `!DATASETS_EXTERNOS/soilgrids/` al `.gitignore` raíz; `.venv/` y `temporal/` quedan ignorados dentro de la carpeta.
- Incidencia: ejecutado desde el AppImage de Cursor, Python no reconoce el venv salvo con entorno limpio (`env -i`); documentado en el README.

**Afectaciones**

- Creados: `DATASETS_EXTERNOS/soilgrids/` (`README.md`, `DISPONIBLES_TEMPORAL.md`, `preparar_entorno.sh`, `requirements.txt`, `explorar_disponibles.py`, `.gitignore`; `.venv/` y `temporal/` locales y sin versionar). Modificados: `.gitignore` raíz y `PROMPTS.md`.
- Fuera de la tarea: no se integró ninguna variable a la despensa ni al análisis, no se tocó el código R y no hubo commits. Python se usa solo para adquisición de datos; el análisis sigue en R.

## 2026-10-04 — Reorganización analisis/ (3 carriles) y KDD SoilGrids (336 capas)

**Modelo**

Claude Sonnet 5.5 (Cursor).

**Prompt**

> Reorganización de análisis y KDD SoilGrids (336 capas) — Implement the plan as specified…

**Acciones**

- Se reorganizó `analisis/` en `datos_fira/`, `datos_inegi/` y `datos_soilgrids/` con salidas propias; setup compartido en `R/00_setup.R` (`CEBA_CARRIL`); orquestador `bash analisis/correr.sh [fira|inegi|soilgrids|todo]`.
- El roadmap de `PROXIMOS_PASOS.md` pasó al README raíz (§ Roadmap). Quedaron 4 MD en `analisis/`: README + `RESUMEN_DATOS_FIRA.md`, `RESUMEN_DATOS_INEGI.md`, `RESUMEN_DATOS_SOILGRIDS.md`. Se actualizaron enlaces en dataset_entrenamiento, modelos, dashboard y AGENTS.
- Se descargaron las 336 capas SoilGrids (~11 MB) con `descargar_capas.py` (reintentos; 1 fallo recuperado). Documentación: `CAPAS.md`, `fuentes_soilgrids.md`.
- Pipeline R 09–12: zonal (197×344), correlaciones, heatmaps, PCA, ranking. Informe `datos_soilgrids/salida/kdd_soilgrids.html`. Variable prioritaria: `sg_nitrogen_0-5cm_mean`; 94 capas proxy de estado.
- Carril FIRA regenerado con éxito tras el move. SoilGrids CRS: string Homolosine (EPSG:152160 no resolvía en PROJ local).

**Afectaciones**

- Movidos/creados: estructura `analisis/datos_*`, runners, scripts 09–12, informe SoilGrids, CSV `parcelas_despensa_extendida_soilgrids_v1.csv`, GeoTIFF en `DATASETS_EXTERNOS/soilgrids/datos/`.
- Eliminados: `analisis/PROXIMOS_PASOS.md`, `RESUMEN_DE_ANALISIS.md`, `08_lectura_edaf.md`.
- Modificados: README raíz, AGENTS, READMEs de tracks, `00_setup.R`, docs SoilGrids/despensa_extendida.
- Sin commits. No se copió a `curados_extendidos/` ni se entrenó modelos.

## 2026-10-06 — Matrices de datasets de entrenamiento (1024 CSVs)

**Modelo**

Composer (Cursor Agent).

**Prompt**

> Matrices de datasets de entrenamiento — Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself. To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

**Acciones**

- Se creó `analisis/datos_fira/R/13_despensa_multianio.R` y se congeló `parcelas_despensa_multianio_nube30_v1.csv` (197×125: bloque A = nube30_v1; bloque B = NDVI/CRC/VI6T/lluvia 2022–2024 + medias históricas; NUBE_MAX=30; sin Planet histórico).
- Se escribió `dataset_entrenamiento/scripts/generar_datasets.py` (matriz 2×32×16): núcleo agronómico, \(L\)={estado,municipio,lon,lat,pixel_clima}, \(E\)={n,edaf,cec,silt} con Vertisol/Andosol→otros; naming `ubic_tag`/`ext_tag`; catálogo y manifiesto JSON.
- Se materializaron 1024 CSVs (64 reto + 960 extendidos) y se verificó: 197 filas, llaves AGC, rendimiento vacío solo en PREDICCION, catálogo alineado.
- Se documentó README de `dataset_entrenamiento/`, `fuentes/README.md`, roadmap del README raíz y esta entrada.

**Afectaciones**

- Creados: script R 13, despensa multi-año (+ diccionario + MANIFIESTO_MULTIANIO.md), `generar_datasets.py`, `curados_reto/` (64), `curados_extendidos/` (960), `manifiestos/catalogo_datasets_v1.csv`, `manifiesto_matriz_v1.json`, `fuentes/README.md`.
- Modificados: `dataset_entrenamiento/README.md`, `README.md` (roadmap/checklist), `PROMPTS.md`.
- Fuera de la tarea: no se entrenó en `modelos/`, no se alteró `DATASET_RETO_AGRO_2026/`, no se editó el archivo del plan, sin commits.

## 2026-10-06 — Apertura fase 2: propuesta de modelos + pipeline de ingesta

**Modelo**

Composer (Cursor Agent).

**Prompt**

> Oficialmente podemos comenzar la etapa 2, entrenar agentes, prepara el repo, revisa el estado de los datos, genera un documento en modelos proponiendo modelos y arquitecturas que puedan funcionar para las caracteristicas que tienen nuestros datasets, y comienza a diseñar el pipeline de ingesta de datos para los modelos, si hay decisiones importantes que tomar comentame

**Acciones**

- Se marcó la fase actual como **modelos** en `AGENTS.md` y el roadmap del README raíz.
- Se revisó el estado de datos (197/138/59, núcleo sin NA, 1024 CSVs) en `modelos/ESTADO_DATOS.md`.
- Se escribió `PROPUESTA_MODELOS.md` (baselines, Ridge/RF/HistGBM, CV espacial, plan corto) y `DECISIONES_ABIERTAS.md`.
- Se implementó el paquete `modelos/src/ceba_modelos` (catálogo, ingesta con sidecar de municipio/píxel, CV LOGO) + `config/default.yaml` + `scripts/smoke_ingesta.py` (9 CSVs del barrido OK).
- Entorno: `preparar_entorno.sh`, `requirements.txt`, `.gitignore` (venv/salidas).

**Afectaciones**

- Creados: docs y código bajo `modelos/` (ingesta, config, smoke, venv local no versionado).
- Modificados: `AGENTS.md`, `README.md`, `modelos/README.md`, `modelos/AGENTS.md`, `dataset_entrenamiento/README.md`, `PROMPTS.md`.
- Fuera: no se entrenó aún ningún estimador; sin dashboard; sin commits.

## 2026-10-06 — Cierre decisiones D1–D7 + primer barrido en dev-modelos

**Modelo**

Composer (Cursor Agent).

**Prompt**

> Si bien todavia tenemos bastante tiempo… D1: default, D2: Default, D3: Default, D4: Default, D5: rama: dev-modelos, D6: default

**Acciones**

- Se cerraron D1–D7 en `DECISIONES_ABIERTAS.md` (LOGO, OHE, pixel categórico, sklearn, barrido 9, rama `dev-modelos`, métricas sin joblib masivo). Interpretación: “D5=rama” del mensaje = D6 del doc; barrido y artefactos en default.
- Se creó la rama `dev-modelos`.
- Se implementó preprocess/estimadores/train_cv y `scripts/correr_barrido.py`. Baseline espacial = `media_estado` (media_municipio degenera bajo LOGO).
- Se ejecutó el barrido 9×4: mejor RMSE_OOF ≈ 0.653 con HistGBM + `multianio_ubic_completa_reto`.

**Afectaciones**

- Creados/modificados: código bajo `modelos/src`, scripts, config, docs, `salidas/barrido_2026-10-06/`, copia en `comparativas/`.
- Rama local `dev-modelos` (sin commit ni push salvo pedido).

## 2026-10-06 — Superciclo Classic ML (1024 × modelos × HPO)

**Modelo**

Composer (Cursor Agent).

**Prompt**

> Superciclo Classic ML (1024 × modelos × HPO top-K) — Implement the plan as specified…

**Acciones**

- Config `superciclo.yaml`; estimadores ElasticNet, RF, HistGBM, LightGBM; `train_cv` con params/HPO.
- Runner `correr_superciclo.py` (capas A/B/C, joblib, checkpoint); reparación de CSV con columnas irregulares tras HPO.
- Grid completo: 2 baselines + 5120 celdas B + 360 HPO C. Mejor C: LightGBM + `solo2025_ubic_lon-pix_n-edaf` RMSE_OOF≈0.533 (HPO Δ≈0.009 vs mejor B).
- Análisis + informe HTML con rankings, barras, diagnósticos y recomendaciones (incl. contrato dashboard).
- Actualizados DECISIONES D4/D5, README modelos, PROMPTS.

**Afectaciones**

- Creados/modificados bajo `modelos/` (config, src, scripts, salidas/superciclo_v1, comparativas/superciclo_v1).
- Predicción 59 en `salidas/superciclo_v1/prediccion_59_ganador.csv`.
- Sin commits; rama `dev-modelos`.
