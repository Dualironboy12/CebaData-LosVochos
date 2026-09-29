#!/usr/bin/env bash
# Ejecuta todo el análisis KDD desde la raíz del repositorio:
#   bash analisis/correr.sh
#
# Si existe un entorno local con sf/terra (micromamba) en
# ~/.local/share/ceba-env/env, se usa; si no, se usa el R del sistema.
set -euo pipefail
cd "$(dirname "$0")/.."

ENTORNO="${CEBA_ENV:-$HOME/.local/share/ceba-env/env}"
if [ -x "$ENTORNO/bin/Rscript" ]; then
  export PATH="$ENTORNO/bin:$PATH"
  export PROJ_DATA="$ENTORNO/share/proj" PROJ_LIB="$ENTORNO/share/proj" GDAL_DATA="$ENTORNO/share/gdal"
fi

for f in analisis/R/0[1-6]_*.R; do
  echo "==> $f"
  Rscript "$f"
done

echo "==> analisis/informe/kdd.Rmd"
Rscript -e 'rmarkdown::render("analisis/informe/kdd.Rmd", output_dir = "analisis/salida", quiet = TRUE)'
echo "Listo. Informe: analisis/salida/kdd.html"
