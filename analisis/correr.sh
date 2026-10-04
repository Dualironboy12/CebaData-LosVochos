#!/usr/bin/env bash
# Orquestador de los tres carriles de análisis. Desde la raíz del repo:
#   bash analisis/correr.sh              # solo FIRA (por defecto)
#   bash analisis/correr.sh fira
#   bash analisis/correr.sh inegi
#   bash analisis/correr.sh soilgrids
#   bash analisis/correr.sh todo
set -euo pipefail
cd "$(dirname "$0")/.."
CARRIL="${1:-fira}"

correr() {
  local c="$1"
  echo "======== Carril: $c ========"
  bash "analisis/datos_${c}/correr.sh"
}

case "$CARRIL" in
  fira|inegi|soilgrids) correr "$CARRIL" ;;
  todo)
    correr fira
    correr inegi
    correr soilgrids
    ;;
  *)
    echo "Uso: bash analisis/correr.sh [fira|inegi|soilgrids|todo]" >&2
    exit 1
    ;;
esac
