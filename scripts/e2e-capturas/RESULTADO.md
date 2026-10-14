# Prueba punta a punta (HTTP)

Fecha: 2026-10-13T22:28:15-06:00

## API directa :8000
- GET /api/salud → 200
- GET /api/parcelas → 200
- GET /api/parcelas/AGC_003 → 200
- GET /api/modelo/metricas → 200
- GET /api/nueva-parcela/opciones → 200
- POST /api/simulador → 200
- POST /api/predecir → 200

## Proxy Angular :4200 → API
- GET / → 200
- GET /api/salud (proxy) → 200
- GET /api/parcelas (proxy) → 200

## Nota
El navegador embebido del agente no alcanzó localhost del host (ERR_CONNECTION_REFUSED).
La verificación se hizo por HTTP contra API y proxy. Para capturas visuales: abrir http://localhost:4200 con bash scripts/levantar_local.sh.
