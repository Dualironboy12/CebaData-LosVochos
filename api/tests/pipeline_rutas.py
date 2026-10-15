"""Rutas compartidas por las pruebas de la API hacia artefactos y el pipeline de entrega."""
from pathlib import Path

# api/tests/ -> api/
RAIZ = Path(__file__).resolve().parents[1]
# api/ -> raíz del repo
REPO = RAIZ.parent
ENTREGA_PIPELINE = REPO / "modelos" / "entrega" / "pipeline"
