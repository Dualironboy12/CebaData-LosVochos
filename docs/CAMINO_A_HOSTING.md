# Camino a hosting

Cómo el modelo firmado pasó de este repositorio a una API y un dashboard publicados. El código que corre en línea vive en los repos de Alfredo (ALNM7). Aquí queda la historia y, como submódulos, la copia fijada para ejecutarla en local. Ver [`../INSTALACION.md`](../INSTALACION.md).

## 1. Integración en un solo repo (13 de octubre de 2026)

La API (`cebadata_api`) y el dashboard (`DashboardCebaData`) entraron a este repositorio con `git subtree`, en las carpetas `api/` y `dashboard/`. El pipeline de entrenamiento se movió a `modelos/entrega/pipeline` para separarlo del runtime. La idea era un solo clon: `bash scripts/levantar_local.sh` levantaba Django en el 8000 y Angular en el 4200.

## 2. Por qué se separaron otra vez

Render y Vercel despliegan un repositorio (o un directorio raíz) por servicio. Un monorepo con el dataset, el análisis en R y los modelos exploratorios no es un buen origen de build: el contexto es enorme y las raíces de la API y del front no coinciden con lo que cada plataforma espera por defecto.

La API y el dashboard volvieron a sus repos propios, que son los que están conectados a las plataformas:

| Servicio | Repo | URL |
| --- | --- | --- |
| API en Render | https://github.com/ALNM7/cebadata_api | https://cebadata-api.onrender.com |
| Dashboard en Vercel | https://github.com/ALNM7/DashboardCebaData | https://dashboard-ceba-data.vercel.app/ |

Este repositorio se quedó como documentación del proceso (análisis, despensa, superciclo y prueba pareada) y como envoltorio para clonar el sistema completo.

## 3. Cómo quedó el enlace entre los dos

- **Render** arranca `gunicorn cebadata.wsgi:application --preload --workers 1`. `--preload` carga los artefactos una vez. No hay base de datos. Salud: `GET /api/salud`. Variables: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`. El detalle está en `sistema/api/render.yaml` y en el README de la API.
- **Vercel** compila el Angular y publica `dist/cebadata-dashboard/browser`. `sistema/dashboard/vercel.json` reescribe `/api/:path*` hacia `https://cebadata-api.onrender.com/api/:path*`. El front publicado no necesita una URL de API en el código: pide `/api` al mismo origen y Vercel lo manda a Render.
- En local no hace falta ese rewrite. `ng serve` usa `proxy.conf.json` y manda `/api` a `http://localhost:8000`.

## 4. Disponibilidad

El plan gratuito de Render apaga el proceso tras unos minutos sin visitas. El primer clic del jurado puede esperar a que el servicio despierte. Se consideraron tres formas de evitarlo:

1. **Render de pago** (plan Starter, del orden de 7 USD al mes): el proceso no se apaga. Es el cambio más corto porque `render.yaml` ya describe el servicio.
2. **Ping externo** (UptimeRobot o similar cada 5–10 minutos a `/api/salud`): mantiene despierto el plan gratis, con el riesgo de que un reinicio o un fallo del ping vuelva a dejar el arranque en frío. El cupo gratis ronda un mes de horas.
3. **Una máquina virtual siempre gratis** (e2-micro de Google Cloud en una región de Estados Unidos, u Oracle Cloud Ampere): el proceso queda encendido, a cambio de administrar el sistema.

La opción que el equipo dejó publicada es la que está en las URLs de arriba (Render y Vercel). Si se cambia de plan o de host, se actualiza este archivo y el puntero del submódulo solo si también cambia el commit del código.

## 5. Qué hace este repo ahora

`sistema/api` y `sistema/dashboard` son submódulos git en commits fijos (`9d64758` y `aa766ad`). No se editan aquí. Un cambio de la API o del dashboard se propone en el repo de ALNM7; cuando se integra, aquí se mueve el puntero del submódulo. La lista de diferencias conocidas está en [`PROPUESTA_CAMBIOS_REPOS_ALNM7.md`](PROPUESTA_CAMBIOS_REPOS_ALNM7.md).
