# Agentes — `dashboard/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto: [`README.md`](README.md). API: [`../api/`](../api/). Modelo: [`../modelos/entrega/`](../modelos/entrega/).

## Alcance

- Frontend Angular (standalone, signals) que consume la API vía `src/app/core/api/ceba-api.ts`.
- En local, `proxy.conf.json` reenvía `/api` a `http://localhost:8000`.
- En producción, fijar `apiUrl` en `src/environments/environment.prod.ts`.

## Reglas propias

1. No reinventar el contrato: los tipos viven en `src/app/core/models.ts` y deben coincidir con la API.
2. Si la API no está disponible, usar `npm run start:demo` (datos simulados).
3. Textos de SHAP / explicación: dejar claro que la cascada describe el LightGBM del ensamble (peso 1/6), no la mezcla completa.
4. No versionar `node_modules/`, `dist/` ni `.angular/`.
5. Commits y push solo con autorización.

## Pruebas

```bash
cd dashboard
npm ci
npm test
npm run build
```

Levantar con la API: `bash ../scripts/levantar_local.sh`.
