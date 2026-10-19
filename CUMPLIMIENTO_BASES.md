# Revisión frente a las bases del Reto AgroCebada FIRA 2026

Documento interno del equipo (2026-10-13). Ante duda, prevalece [`Reto Agrocebada Bases.pdf`](Reto%20Agrocebada%20Bases.pdf).

## Cumple / sin conflicto

| Requisito | Estado |
| --- | --- |
| Modelo que predice rendimiento de cebada (Hidalgo, Tlaxcala, Puebla) | Sí: mezcla, 197 parcelas, ciclo 2025 |
| Prototipo funcional (dashboard) + código + documentación de ejecución | Sí: https://dashboard-ceba-data.vercel.app/ y, en local, `sistema/` + [`INSTALACION.md`](INSTALACION.md) |
| Estimar el 30 % oculto; no usar sus etiquetas | Sí: `RENDIMIENTO_T_HA` vacío en PREDICCION; predicciones en artefactos |
| Métricas RMSE / MAE / r² | Sí: en `metricas_dashboard.json` y panel del dashboard |
| Datos públicos adicionales permitidos | Sí; INEGI/SoilGrids se evaluaron y **no** entran en la entrega |
| Uso de IA permitido si se declara y se anexan prompts | Parcial: ver pendientes |
| Autoría del equipo | Alfredo N (ALNM7) es integrante registrado; API y dashboard son su aporte + Claude Code |

## Pendientes del equipo (antes de subir a la plataforma)

1. **Prompts de Claude Code de Alfredo.** Los commits de `api/` y `dashboard/` llevan `Co-Authored-By: Claude Sonnet 5.5` y enlaces `Claude-Session`. Esas conversaciones **no** están en [`PROMPTS.md`](PROMPTS.md). Hay que pedirlas e incorporarlas al anexo de IA. Sesiones conocidas (desde el historial de commits):
   - `https://claude.ai/code/session_01FXyU9Cim2y1EtCkR54vR2V`
   - `https://claude.ai/code/session_016c2kpZiWBUpsnUApbJ4ZTr`
2. **Visibilidad del dataset en GitHub.** El dataset oficial está versionado en el repo. Confirmar que el remoto es privado o decidir no redistribuir el zip oficial.
3. **Repos de ALNM7 públicos.** `sistema/api` y `sistema/dashboard` se clonan desde GitHub. Si esos repos son privados, el jurado no puede bajar los submódulos. El enlace en línea ya no depende de eso: https://dashboard-ceba-data.vercel.app/.
4. **Licencia MIT.** Hoy figura un solo titular; sugerir «Equipo Los Vochos» o la lista de integrantes.

El reporte técnico y el video demostrativo los prepara otra integrante y se envían por correo. No viven en este repositorio.

## Riesgos a vigilar (no son descalificación automática)

- **SHAP ≠ mezcla completa.** La ficha de [`modelos/entrega/`](modelos/entrega/) lo aclara. La ficha publicada es menos precisa; el texto propuesto está en [`docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md`](docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md).
- **Skills de diseño de terceros.** Siguen dentro del repo del dashboard (submódulo), porque esa copia es la fuente de verdad. En este repo no se versionan aparte. Se declaran como herramientas usadas.
- **Submódulos en commit fijo.** Si ALNM7 mueve o cierra el repo, el clon deja de poder inicializar `sistema/`. El enlace de Vercel sigue siendo el que ve el jurado.
- **`n_variables` 122 en el artefacto publicado.** La ficha de [`modelos/entrega/`](modelos/entrega/) cuenta 121. La corrección está propuesta en [`docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md`](docs/PROPUESTA_CAMBIOS_REPOS_ALNM7.md) y no se aplica sobre el submódulo.
- **Una sola temporada** y la longitud como indicador de zona: límites ya documentados en `modelos/entrega/README.md`.

## Causas de descalificación (chequeo)

| Causa | ¿Aplica? |
| --- | --- |
| Información falsa o que no sea de autoría de los participantes | No, si se declaran aportes y prompts de IA |
| No entregar documentación al avanzar de etapa | N/A hasta finalistas |
| No presentarse ante el jurado | N/A hasta finalistas |
| Personas impedidas (exclusiones) | Responsabilidad del capitán al registrar |
| Tema distinto al de las bases | No |
| Indisciplina | N/A |
