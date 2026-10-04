#!/usr/bin/env bash
# Pipeline KDD de los datos del reto (FIRA). Desde la raíz del repo:
#   bash analisis/datos_fira/correr.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

ENTORNO="${CEBA_ENV:-$HOME/.local/share/ceba-env/env}"
if [ -x "$ENTORNO/bin/Rscript" ]; then
  export PATH="$ENTORNO/bin:$PATH"
  export PROJ_DATA="$ENTORNO/share/proj" PROJ_LIB="$ENTORNO/share/proj" GDAL_DATA="$ENTORNO/share/gdal"
fi
export CEBA_CARRIL=fira

for f in analisis/datos_fira/R/0[1-6]_*.R; do
  echo "==> $f"
  Rscript "$f"
done

echo "==> analisis/datos_fira/informe/kdd.Rmd"
Rscript -e 'rmarkdown::render("analisis/datos_fira/informe/kdd.Rmd", output_dir = "analisis/datos_fira/salida", quiet = TRUE)'
echo "Listo. Informe: analisis/datos_fira/salida/kdd.html"
