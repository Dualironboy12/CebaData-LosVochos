#!/usr/bin/env bash
# Carril edafología INEGI. Desde la raíz del repo:
#   bash analisis/datos_inegi/correr.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

ENTORNO="${CEBA_ENV:-$HOME/.local/share/ceba-env/env}"
if [ -x "$ENTORNO/bin/Rscript" ]; then
  export PATH="$ENTORNO/bin:$PATH"
  export PROJ_DATA="$ENTORNO/share/proj" PROJ_LIB="$ENTORNO/share/proj" GDAL_DATA="$ENTORNO/share/gdal"
fi
export CEBA_CARRIL=inegi

for f in analisis/datos_inegi/R/0[7-8]_*.R; do
  echo "==> $f"
  Rscript "$f"
done
echo "Listo. Tablas y figuras en analisis/datos_inegi/salida/"
