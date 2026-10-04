# 09_descarga_soilgrids.R
# Comprueba que existan los GeoTIFF de SoilGrids; si faltan, lanza el script Python.
#
# Ejecutar desde la raíz:  Rscript analisis/datos_soilgrids/R/09_descarga_soilgrids.R

Sys.setenv(CEBA_CARRIL = "soilgrids")
source("analisis/R/00_setup.R")

dir_tif <- RUTA_EXT$soilgrids_dir
man <- RUTA_EXT$soilgrids_manifiesto
n_tif <- length(list.files(dir_tif, pattern = "\\.tif$", full.names = TRUE))
message("GeoTIFF en ", dir_tif, ": ", n_tif)

necesita <- n_tif < 300 || !file.exists(man)
if (necesita) {
  py <- RUTA_EXT$soilgrids_venv
  script <- RUTA_EXT$soilgrids_descarga
  if (!file.exists(py)) {
    stop("Falta el venv de SoilGrids. Corre: bash DATASETS_EXTERNOS/soilgrids/preparar_entorno.sh")
  }
  message("Lanzando descarga Python (puede tardar)...")
  # AppImage de Cursor inyecta LD_LIBRARY_PATH; entorno limpio evita ModuleNotFoundError.
  status <- system2(
    "env",
    c("-i", paste0("HOME=", Sys.getenv("HOME")), "PATH=/usr/bin:/bin", py, script),
    stdout = "", stderr = ""
  )
  if (!identical(status, 0L)) stop("descargar_capas.py falló con código ", status)
  n_tif <- length(list.files(dir_tif, pattern = "\\.tif$", full.names = TRUE))
}

message("Capas disponibles: ", n_tif)
stopifnot(n_tif >= 300)
guardar_tab(tibble(n_geotiff = n_tif, manifiesto = as.character(file.exists(man))), "09_inventario_tif")
message("09_descarga_soilgrids.R terminado.")
