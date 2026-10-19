# Instalar y ejecutar CebaData en local

Este repositorio documenta el proceso del equipo y trae el sistema completo como dos submódulos: la API y el dashboard. Esos repos, de Alfredo (ALNM7), son la fuente de verdad del código que está en línea.

| Pieza | En local | En línea |
| --- | --- | --- |
| API | `sistema/api` · http://127.0.0.1:8000 | https://cebadata-api.onrender.com |
| Dashboard | `sistema/dashboard` · http://127.0.0.1:4200 | https://dashboard-ceba-data.vercel.app/ |

El dashboard en local reenvía `/api` al puerto 8000 (`sistema/dashboard/proxy.conf.json`). En Vercel, el mismo prefijo se reescribe hacia Render.

## Requisitos

- git
- Python 3.12 o superior. El repo de la API fija 3.13 en `.python-version`; las pruebas también pasan en 3.12.
- Node 20.19 o superior, o 22.12 o superior, y npm.

## Descargar

```bash
git clone --recurse-submodules https://github.com/Dualironboy12/CebaData-LosVochos.git
cd CebaData-LosVochos
```

Si el clon ya existe y `sistema/api` o `sistema/dashboard` están vacíos:

```bash
git submodule update --init
```

El ZIP que descarga GitHub **no incluye** los submódulos. Hay que clonar con git. Los repos de ALNM7 tienen que ser públicos (o hace falta acceso) para que el submódulo baje.

Commits fijados: API `9d64758`, dashboard `aa766ad`.

## Instalar y correr

Desde la raíz:

```bash
bash scripts/levantar_local.sh
```

El script crea `sistema/api/.venv`, instala `requirements.txt`, corre `npm ci` en el dashboard si aún no hay `node_modules`, levanta Django en el puerto 8000, espera `GET /api/salud` y luego `ng serve` en el 4200. Ctrl+C detiene los dos.

A mano:

```bash
cd sistema/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 127.0.0.1:8000

# otra terminal
cd sistema/dashboard
npm ci
npm start
```

## Acceso

- Dashboard: http://127.0.0.1:4200
- Salud de la API: http://127.0.0.1:8000/api/salud
- La misma salud, a través del proxy del dashboard: http://127.0.0.1:4200/api/salud

| Método | Ruta | Para qué |
| --- | --- | --- |
| GET | `/api/salud` | Comprobar que la API cargó los artefactos |
| GET | `/api/parcelas` | Las 197 parcelas |
| GET | `/api/parcelas/AGC_003` | Ficha de una parcela |
| GET | `/api/metricas` | RMSE, MAE, r² y hallazgos |
| POST | `/api/simular` | Cambiar clima dentro del rango observado |
| POST | `/api/predecir` | Parcela nueva |

El detalle de cada cuerpo JSON está en [`sistema/api/README.md`](sistema/api/README.md).

## Si algo falla

- **El submódulo está vacío.** `git submodule update --init`. No uses el ZIP de GitHub.
- **`ModuleNotFoundError: django`.** El entorno virtual no está activo o quedó a medias. Bórralo y vuelve a crearlo: `rm -rf sistema/api/.venv` y corre otra vez el script.
- **El puerto 8000 o 4200 está ocupado.** Cierra el proceso anterior o cambia el puerto en el comando de `runserver` / `ng serve`.
- **Node demasiado viejo.** `node -v` tiene que cumplir el requisito de arriba. `npm ci` falla si no.
- **Render tarda la primera vez.** El plan gratuito apaga la API tras un rato sin visitas. El enlace de Vercel vuelve a responder cuando `/api/salud` contesta. En local no pasa.

## Sin instalar nada

El dashboard publicado está en https://dashboard-ceba-data.vercel.app/ y habla con https://cebadata-api.onrender.com. Sirve para el jurado. La primera petición después de un rato de inactividad puede tardar mientras Render despierta el proceso.
