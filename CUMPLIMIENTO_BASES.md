# Revisión frente a las bases del Reto AgroCebada FIRA 2026

Documento interno del equipo (2026-10-13). Ante duda, prevalece [`Reto Agrocebada Bases.pdf`](Reto%20Agrocebada%20Bases.pdf).

## Cumple / sin conflicto

| Requisito | Estado |
| --- | --- |
| Modelo que predice rendimiento de cebada (Hidalgo, Tlaxcala, Puebla) | Sí: mezcla, 197 parcelas, ciclo 2025 |
| Prototipo funcional (dashboard) + código + documentación de ejecución | Sí: `dashboard/` + `api/` + `scripts/levantar_local.sh` |
| Estimar el 30 % oculto; no usar sus etiquetas | Sí: `RENDIMIENTO_T_HA` vacío en PREDICCION; predicciones en artefactos |
| Métricas RMSE / MAE / r² | Sí: en `metricas_dashboard.json` y panel del dashboard |
| Datos públicos adicionales permitidos | Sí; INEGI/SoilGrids se evaluaron y **no** entran en la entrega |
| Uso de IA permitido si se declara y se anexan prompts | Parcial: ver pendientes |
| Autoría del equipo | Alfredo N (ALNM7) es integrante registrado; API y dashboard son su aporte + Claude Code |

## Pendientes del equipo (antes de subir a la plataforma)

1. **Prompts de Claude Code de Alfredo.** Los commits de `api/` y `dashboard/` llevan `Co-Authored-By: Claude Sonnet 5.5` y enlaces `Claude-Session`. Esas conversaciones **no** están en [`PROMPTS.md`](PROMPTS.md). Hay que pedirlas e incorporarlas al anexo de IA. Sesiones conocidas (desde el historial de commits):
   - `https://claude.ai/code/session_01FXyU9Cim2y1EtCkR54vR2V`
   - `https://claude.ai/code/session_016c2kpZiWBUpsnUApbJ4ZTr`
2. **Video** de máximo 5 minutos, grabado a partir de [`reporte/GUION_VIDEO.md`](reporte/GUION_VIDEO.md). El PDF del reporte ya está en `reporte/REPORTE_TECNICO.pdf`.
3. **Despliegue** (Render o Railway + Vercel): seguir [`ENTREGA.md`](ENTREGA.md). Hace falta cuenta del equipo para fijar `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` y `environment.prod.ts`.
4. **Visibilidad del dataset en GitHub.** El dataset oficial está versionado en el repo. Confirmar que el remoto es privado o decidir no redistribuir el zip oficial.
5. **Licencia MIT.** Hoy figura un solo titular; sugerir «Equipo Los Vochos» o la lista de integrantes.

## Riesgos a vigilar (no son descalificación automática)

- **SHAP ≠ mezcla completa.** La cascada explica el LightGBM del ensamble (peso 1/6). El dashboard y el reporte lo dicen.
- **Skills de diseño de terceros** (`.claude/` de impeccable etc.) se retiraron del entregable; se declaran como herramientas usadas en la memoria de desarrollo.
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
