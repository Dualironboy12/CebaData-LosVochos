#!/usr/bin/env bash
# Levanta la API (Django :8000) y el dashboard (Angular :4200) en local.
# Uso, desde la raíz del repo:
#   bash scripts/levantar_local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_DIR="$ROOT/api"
DASH_DIR="$ROOT/dashboard"
API_VENV="${API_VENV:-$API_DIR/.venv}"
LOG_DIR="$ROOT/scripts/.logs"
mkdir -p "$LOG_DIR"

PY=/usr/bin/python3
if [[ ! -x "$PY" ]]; then PY="$(command -v python3)"; fi

if [[ ! -d "$API_VENV" ]]; then
  echo "==> Creando $API_VENV"
  env -i HOME="$HOME" PATH="/usr/bin:/bin" "$PY" -m venv "$API_VENV"
  env -i HOME="$HOME" PATH="$API_VENV/bin:/usr/bin:/bin" pip install -q -r "$API_DIR/requirements.txt"
fi

if [[ ! -d "$DASH_DIR/node_modules" ]]; then
  echo "==> npm install en dashboard/"
  (cd "$DASH_DIR" && npm install)
fi

cleanup() {
  echo ""
  echo "==> Deteniendo servicios..."
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${DASH_PID:-}" ]] && kill "$DASH_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> API en http://localhost:8000"
(
  cd "$API_DIR"
  env -i HOME="$HOME" PATH="$API_VENV/bin:/usr/bin:/bin" \
    DJANGO_DEBUG=1 \
    CORS_ALLOWED_ORIGINS="http://localhost:4200,http://127.0.0.1:4200" \
    python manage.py runserver 8000
) >"$LOG_DIR/api.log" 2>&1 &
API_PID=$!

# Espera salud
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8000/api/salud >/dev/null; then
    echo "    /api/salud OK"
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "La API no arrancó. Ver $LOG_DIR/api.log" >&2
    exit 1
  fi
  sleep 0.5
  if [[ "$i" -eq 40 ]]; then
    echo "Timeout esperando /api/salud. Ver $LOG_DIR/api.log" >&2
    exit 1
  fi
done

echo "==> Dashboard en http://localhost:4200"
(
  cd "$DASH_DIR"
  npm start -- --host 127.0.0.1 --port 4200
) >"$LOG_DIR/dashboard.log" 2>&1 &
DASH_PID=$!

echo ""
echo "Listo."
echo "  API:       http://localhost:8000/api/salud"
echo "  Dashboard: http://localhost:4200"
echo "  Logs:      $LOG_DIR/"
echo "Ctrl+C para detener ambos."
wait
