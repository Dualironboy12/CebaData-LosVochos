# Entrega — Reto AgroCebada FIRA 2026

Equipo Los Vochos. Fecha límite en plataforma: **19 de octubre de 2026, 23:59 h**.

El reporte técnico y el video se envían por correo. No están en este repositorio. Aquí quedan el código, la documentación para ejecutarlo y el enlace del dashboard.

## Dónde está cada pieza

| Pedido de las bases | Dónde |
| --- | --- |
| Reporte técnico y video (máx. 5 min) | Por correo. No se versionan en GitHub. |
| Código del modelo | Ficha en [`modelos/entrega/`](modelos/entrega/). Pipeline y artefactos: submódulo [`sistema/api`](sistema/api) ([cebadata_api](https://github.com/ALNM7/cebadata_api)). |
| Código de la aplicación | [`sistema/api`](sistema/api) y [`sistema/dashboard`](sistema/dashboard) ([DashboardCebaData](https://github.com/ALNM7/DashboardCebaData)). |
| Cómo ejecutarlo | [`INSTALACION.md`](INSTALACION.md) y `bash scripts/levantar_local.sh`. |
| Enlace en línea | https://dashboard-ceba-data.vercel.app/ (API: https://cebadata-api.onrender.com). Historia: [`docs/CAMINO_A_HOSTING.md`](docs/CAMINO_A_HOSTING.md). |
| Declaración de IA y prompts | [`PROMPTS.md`](PROMPTS.md), para el anexo que va en el reporte enviado por correo. |
| Preguntas guía | Panel «Hallazgos» del dashboard. |

## Levantar en local

Ver [`INSTALACION.md`](INSTALACION.md). Resumen: `git clone --recurse-submodules` y `bash scripts/levantar_local.sh`.

## Checklist contra las bases

- [x] Prototipo: dashboard que consulta el modelo
- [x] Código y documentación de ejecución
- [x] Enlace en línea: https://dashboard-ceba-data.vercel.app/
- [ ] Transcribir a `PROMPTS.md` las sesiones de Claude Code de la API y el dashboard (enlaces en [`CUMPLIMIENTO_BASES.md`](CUMPLIMIENTO_BASES.md))
- [ ] Confirmar que el remoto de GitHub es privado (contiene el dataset oficial) o retirar el dataset del árbol si se hace público
- [ ] Titular de `LICENSE` (hoy una sola persona; sugerido: Equipo Los Vochos)

## Verificación (2026-10-18)

- `bash scripts/levantar_local.sh`: `/api/salud` y `/api/parcelas` en el puerto 8000, y el proxy del dashboard en el 4200, responden 200.
- `sistema/api`: 37 pruebas pasan, 1 se omite (falta optuna) y `test_la_api_no_importa_el_pipeline` falla solo cuando pytest también recolecta `pipeline/tests`, porque eso importa el paquete `pipeline`. La misma prueba pasa sola.
- `sistema/dashboard`: `npm test` (11) y `npm run build`.
- En línea: https://cebadata-api.onrender.com/api/salud respondió 200 tras unos 62 s (arranque en frío de Render). https://dashboard-ceba-data.vercel.app/ respondió 200.

## Paquete

El enlace de este repositorio y el del dashboard van a la plataforma. El PDF y el video van por correo. No hace falta un zip con `node_modules/`, `dist/`, `.venv/` ni los logs de `scripts/.logs/`. El dataset oficial y la despensa ya están en el repositorio; no reempaquetarlos salvo que la plataforma pida un único archivo.
