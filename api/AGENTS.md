# Agentes — `api/`

Instrucciones para quien (o qué agente) trabaje en esta carpeta. **No reemplazan** las reglas del repositorio: al empezar, leer también [`../AGENTS.md`](../AGENTS.md). Al cerrar la tarea, anotar en [`../PROMPTS.md`](../PROMPTS.md).

Contexto: [`README.md`](README.md). Modelo de entrega: [`../modelos/entrega/`](../modelos/entrega/). Frontend: [`../dashboard/`](../dashboard/).

## Alcance

- Backend Django REST de **solo lectura** sobre `artefactos/` congelados.
- No importa ni ejecuta el pipeline en runtime.
- Endpoints: salud, parcelas, métricas, simulador, nueva parcela / predecir.

## Reglas propias

1. No regenerar `artefactos/` desde aquí: eso se hace en `modelos/entrega/` (`python -m pipeline.run_pipeline --desde 10`).
2. Mantener pins de numpy/pandas/sklearn/lightgbm/joblib alineados con `modelos/entrega/pipeline/requirements-pipeline.txt`.
3. La API no debe importar el paquete `pipeline` (lo verifica `tests/test_artefactos.py`).
4. CORS: orígenes del dashboard en `CORS_ALLOWED_ORIGINS`.
5. Commits y push solo con autorización.

## Pruebas

```bash
cd api && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
```
