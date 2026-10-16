# Entrega — Reto AgroCebada FIRA 2026

Equipo Los Vochos. Fecha límite en plataforma: **19 de octubre de 2026, 23:59 h**.

Qué se sube: el reporte en PDF, el enlace al código, el video (máx. 5 min) y, si ya está publicado, el enlace del dashboard.

## Dónde está cada pieza

| Pedido de las bases | Dónde |
| --- | --- |
| Reporte técnico (estructura y extensiones) | [`reporte/REPORTE_TECNICO.pdf`](reporte/REPORTE_TECNICO.pdf). Fuente: `reporte/`. Recompilar: `cd reporte && make pdf`. Conteos: `make palabras`. |
| Código del modelo | [`modelos/entrega/`](modelos/entrega/) (entrenamiento) y [`api/artefactos/`](api/artefactos/) (lo que corre en la API). |
| Código de la aplicación | [`api/`](api/) y [`dashboard/`](dashboard/). |
| Cómo ejecutarlo | `bash scripts/levantar_local.sh` (API :8000, dashboard :4200). |
| Video (máx. 5 min) | Guion en [`reporte/GUION_VIDEO.md`](reporte/GUION_VIDEO.md). El archivo de video lo graba el equipo y se sube a la plataforma; no vive en git. |
| Enlace en línea | Ver despliegue abajo. Sustituir esta línea cuando exista la URL. |
| Declaración de IA y prompts | Anexo del reporte y [`PROMPTS.md`](PROMPTS.md). |
| Preguntas guía | Sección de resultados del reporte y panel «Hallazgos» del dashboard. |

## Levantar en local

Requisitos: Python ≥ 3.12, Node ≥ 20.19 (o ≥ 22.12).

```bash
bash scripts/levantar_local.sh
```

A mano: `api/` con `pip install -r requirements.txt` y `python manage.py runserver`; `dashboard/` con `npm install` y `npm start`.

## Despliegue (cuentas del equipo)

El repositorio deja la configuración. Publicar exige cuentas de Render (o Railway) y de Vercel. Hasta que esas URLs existan, el jurado puede correr el proyecto en local. Plan B si la API no llega a tiempo: `cd dashboard && npm run build:demo` (datos simulados, con la etiqueta de demostración). No presentar ese build como si fueran las predicciones del modelo.

### 1. API en Render

1. Nuevo Blueprint o Web Service desde este repo, raíz de build `api/` (o usar [`api/render.yaml`](api/render.yaml) con la raíz del servicio en `api`).
2. Variables obligatorias:
   - `DJANGO_SECRET_KEY` (Render puede generarla)
   - `DJANGO_ALLOWED_HOSTS` = el host de Render, sin esquema
   - `CORS_ALLOWED_ORIGINS` = origen exacto del front, sin barra final (se completa en el paso 2)
3. Salud: `GET /api/salud`.
4. Railway es equivalente: [`api/railway.json`](api/railway.json). Mismas variables en el panel.

### 2. Dashboard en Vercel

1. Importar el repo. Directorio raíz: `dashboard`. [`dashboard/vercel.json`](dashboard/vercel.json) fija el build (`npm run build`) y `dist/cebadata-dashboard/browser`.
2. Antes del build de producción, fijar la URL de la API:

```bash
bash scripts/fijar_api_url.sh https://HOST-DE-LA-API
```

3. Copiar el origen del front (por ejemplo `https://cebadata.vercel.app`) a `CORS_ALLOWED_ORIGINS` de la API y redesplegar la API.
4. Comprobar en el navegador: mapa con parcelas, ficha, métricas, hallazgos y que el simulador responda (es un POST).

## Checklist contra las bases

- [x] Introducción 400–550, justificación 100–200, objetivos ~200, metodología 600–700, resultados ~800, inclusión financiera ~300, conclusiones ~400
- [x] Bibliografía y anexos (trabajo del equipo en bloque + declaración de IA; máx. 2 cuartillas)
- [x] Prototipo: dashboard que consulta el modelo
- [x] Código y documentación de ejecución
- [x] Guion de video de 5 min
- [ ] Video grabado y subido por el equipo
- [ ] Enlace en línea (cuentas Render/Vercel)
- [ ] Transcribir a `PROMPTS.md` las sesiones de Claude Code de la API y el dashboard (enlaces en [`CUMPLIMIENTO_BASES.md`](CUMPLIMIENTO_BASES.md))
- [ ] Confirmar que el remoto de GitHub es privado (contiene el dataset oficial) o retirar el dataset del árbol si se hace público
- [ ] Titular de `LICENSE` (hoy una sola persona; sugerido: Equipo Los Vochos)

## Verificación (2026-10-15)

- `cd reporte && make pdf`: PDF de 9 páginas. Conteos `texcount`: introducción 444, justificación 163, objetivos 201, metodología 696, resultados 796, inclusión financiera 298, conclusiones 400. Anexos en las dos últimas páginas.
- `cd api && .venv/bin/pytest`: 38 pruebas.
- `cd modelos/entrega && .venv/bin/pytest pipeline/tests -p no:django`: 11 pruebas (incluyen la paridad de artefactos).
- `cd dashboard && npm test -- --watch=false`: 11 pruebas. `npm run build` escribe `dist/cebadata-dashboard/browser`.
- Clon local del commit anterior: las 38 pruebas de la API pasan. El reporte nuevo aún no estaba en ese commit; el PDF se compiló en el árbol de trabajo.

## Paquete

Subir el PDF y los enlaces. No hace falta un zip con `node_modules/`, `dist/`, `.venv/` ni los logs de `scripts/.logs/`. El dataset oficial y la despensa ya están en el repositorio; no reempaquetarlos salvo que la plataforma pida un único archivo.
