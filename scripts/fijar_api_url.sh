#!/usr/bin/env bash
# Fija la URL pública de la API en el build de producción del dashboard.
# Uso: bash scripts/fijar_api_url.sh https://cebadata-api.onrender.com
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Uso: bash scripts/fijar_api_url.sh https://host-de-la-api" >&2
  exit 1
fi
URL="${1%/}"
ARCHIVO="$(cd "$(dirname "$0")/.." && pwd)/dashboard/src/environments/environment.prod.ts"
python3 - "$ARCHIVO" "$URL" <<'PY'
import pathlib, sys
ruta, url = sys.argv[1], sys.argv[2]
texto = pathlib.Path(ruta).read_text()
viejo = "apiUrl: 'https://SUSTITUIR-URL-API'"
nuevo = f"apiUrl: '{url}'"
if viejo not in texto and f"apiUrl: '{url}'" not in texto:
    raise SystemExit(f"No encontré el marcador en {ruta}. Edítalo a mano.")
pathlib.Path(ruta).write_text(texto.replace(viejo, nuevo))
print(f"apiUrl = {url}")
PY
