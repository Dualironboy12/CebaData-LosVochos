#!/usr/bin/env bash
# Crea el entorno virtual de Python para trabajar con SoilGrids e instala las dependencias.
#
# Uso, desde cualquier carpeta:
#   bash DATASETS_EXTERNOS/soilgrids/preparar_entorno.sh
# Luego:
#   source DATASETS_EXTERNOS/soilgrids/.venv/bin/activate     (Linux / macOS)
#   .venv\Scripts\activate                                    (Windows, desde esta carpeta)
#
# Variables opcionales:
#   PYTHON=python3.12   intérprete a usar (por defecto python3)
#   CEBA_VENV=/ruta     dónde crear el entorno (por defecto, .venv junto a este script)
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"
VENV="${CEBA_VENV:-.venv}"

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "No se encontró $PYTHON. Instala Python 3.10 o superior." >&2
  exit 1
fi
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' \
  || { echo "Se necesita Python 3.10 o superior (hay $("$PYTHON" -V))." >&2; exit 1; }

if [ ! -x "$VENV/bin/python" ]; then
  if "$PYTHON" -m venv "$VENV" 2>/dev/null; then
    echo "Entorno creado en $VENV"
  else
    # Debian/Ubuntu sin el paquete python3-venv: no trae ensurepip. Se crea el entorno sin pip
    # y se instala pip con get-pip.py (alternativa: sudo apt install python3-venv).
    echo "python -m venv falló (¿falta python3-venv?). Creando el entorno sin pip y arrancando pip aparte..."
    rm -rf "$VENV"
    "$PYTHON" -m venv --without-pip "$VENV"
    "$PYTHON" - <<'PY'
import urllib.request
urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", "/tmp/ceba-get-pip.py")
PY
    "$VENV/bin/python" /tmp/ceba-get-pip.py --quiet
    rm -f /tmp/ceba-get-pip.py
  fi
fi

"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install -r requirements.txt

echo
echo "Listo. Versiones instaladas:"
"$VENV/bin/python" -m pip list --format=freeze | grep -iE "^(soilgrids|rasterio|rioxarray|xarray|numpy|owslib|requests)=="
