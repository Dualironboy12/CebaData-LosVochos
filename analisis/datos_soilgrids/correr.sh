#!/usr/bin/env bash
# Carril SoilGrids. Desde la raíz del repo:
#   bash analisis/datos_soilgrids/correr.sh
# Requiere GeoTIFF en DATASETS_EXTERNOS/soilgrids/datos/ (el script 09 los descarga si faltan).
set -euo pipefail
cd "$(dirname "$0")/../.."

ENTORNO="${CEBA_ENV:-$HOME/.local/share/ceba-env/env}"
if [ -x "$ENTORNO/bin/Rscript" ]; then
  export PATH="$ENTORNO/bin:$PATH"
  export PROJ_DATA="$ENTORNO/share/proj" PROJ_LIB="$ENTORNO/share/proj" GDAL_DATA="$ENTORNO/share/gdal"
fi
export CEBA_CARRIL=soilgrids

for f in analisis/datos_soilgrids/R/09_*.R analisis/datos_soilgrids/R/1[0-2]_*.R; do
  [ -f "$f" ] || continue
  echo "==> $f"
  Rscript "$f"
done

if [ -f analisis/datos_soilgrids/informe/kdd_soilgrids.Rmd ]; then
  echo "==> analisis/datos_soilgrids/informe/kdd_soilgrids.Rmd"
  Rscript -e 'rmarkdown::render("analisis/datos_soilgrids/informe/kdd_soilgrids.Rmd", output_dir = "analisis/datos_soilgrids/salida", quiet = TRUE)'
  echo "Listo. Informe: analisis/datos_soilgrids/salida/kdd_soilgrids.html"
fi
