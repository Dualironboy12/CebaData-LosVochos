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
