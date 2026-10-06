#!/usr/bin/env bash
# Crea modelos/.venv con el Python del sistema (evita el AppImage de Cursor).
set -euo pipefail
cd "$(dirname "$0")"
PY=/usr/bin/python3
if [[ ! -x "$PY" ]]; then
  echo "No se encontró $PY" >&2
  exit 1
fi
rm -rf .venv
# En algunas distros no hay ensurepip: venv sin pip + get-pip.py
env -i HOME="$HOME" PATH="/usr/bin:/bin" "$PY" -m venv --without-pip .venv
env -i HOME="$HOME" PATH="/usr/bin:/bin" "$PY" -c \
  "import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py','get-pip.py')"
env -i HOME="$HOME" PATH="$PWD/.venv/bin:/usr/bin:/bin" python get-pip.py -q
rm -f get-pip.py
.venv/bin/pip install -q -r requirements.txt
echo "Listo. Activar con: source modelos/.venv/bin/activate"
echo "Desde la raíz: PYTHONPATH=modelos/src python modelos/scripts/smoke_ingesta.py"
# Si Cursor apunta python al AppImage, usar:
#   env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" PYTHONPATH=modelos/src python modelos/scripts/smoke_ingesta.py
