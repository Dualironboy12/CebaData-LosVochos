# 10_zonal_soilgrids.R
# Estadística zonal de las capas SoilGrids por parcela (media ponderada, exact=TRUE).
# Escribe el CSV extendido en DATASETS_EXTERNOS/despensa_extendida/.
#
# Ejecutar desde la raíz:  Rscript analisis/datos_soilgrids/R/10_zonal_soilgrids.R

Sys.setenv(CEBA_CARRIL = "soilgrids")
source("analisis/R/00_setup.R")

tifs <- sort(list.files(RUTA_EXT$soilgrids_dir, pattern = "\\.tif$", full.names = TRUE))
stopifnot(length(tifs) >= 300)
message("Capas a zonificar: ", length(tifs))

base <- read_csv(RUTA_EXT$despensa, show_col_types = FALSE, guess_max = 1000) |>
  select(ID_POLIGONO, estado, municipio, conjunto, rendimiento_t_ha, lon, lat, area_ha)
stopifnot(nrow(base) == 197)

parc <- st_read(RUTA$parcelas, quiet = TRUE) |>
  st_zm() |>
  transmute(ID_POLIGONO = ID_POLIGON) |>
  st_transform(CRS_SOILGRIDS) |>
  st_make_valid()
stopifnot(setequal(parc$ID_POLIGONO, base$ID_POLIGONO))
# terra trabaja mejor con SpatVector
parc_v <- vect(parc)

servicio_de <- function(capa) {
  # clay_0-5cm_mean -> clay; MostProbable / Acrisols -> wrb
  ifelse(!grepl("_", capa) | capa == "MostProbable", "wrb", sub("_.*$", "", capa))
}

factor_de <- function(capa) {
  s <- servicio_de(capa)
  unname(ifelse(s %in% names(SG_FACTOR), SG_FACTOR[s], 1))
}

extraer <- function(ruta) {
  capa <- tools::file_path_sans_ext(basename(ruta))
  r <- rast(ruta)
  # Los GeoTIFF de la librería soilgrids a veces vienen sin CRS; las coords ya están en Homolosine.
  if (is.na(crs(r)) || crs(r) == "") crs(r) <- CRS_SOILGRIDS
  NAflag(r) <- -32768
  ext <- terra::extract(r, parc_v, fun = mean, na.rm = TRUE, exact = TRUE, ID = FALSE)
  v <- as.numeric(ext[[1]])
  fac <- factor_de(capa)
  if (fac != 1) v <- v / fac
  tibble(ID_POLIGONO = parc$ID_POLIGONO, !!paste0("sg_", capa) := v)
}

message("Extrayendo (puede tardar unos minutos)...")
vals <- map(tifs, extraer) |> reduce(left_join, by = "ID_POLIGONO")
ext <- base |> left_join(vals, by = "ID_POLIGONO")
stopifnot(nrow(ext) == 197, sum(is.na(ext$rendimiento_t_ha)) == 59)

# Inventario de calidad por capa
cal <- map_dfr(names(vals)[-1], function(col) {
  x <- ext[[col]]
  tibble(
    columna = col,
    capa = sub("^sg_", "", col),
    servicio = servicio_de(sub("^sg_", "", col)),
    n_na = sum(is.na(x)),
    n_distintos = n_distinct(x[!is.na(x)]),
    media = round(mean(x, na.rm = TRUE), 4),
    sd = round(sd(x, na.rm = TRUE), 4),
    minimo = round(min(x, na.rm = TRUE), 4),
    maximo = round(max(x, na.rm = TRUE), 4)
  )
})
guardar_tab(cal, "10_calidad_capas")

dir.create(DIR_DESP_EXT, recursive = TRUE, showWarnings = FALSE)
write_csv(ext, RUTA_EXT$soilgrids_csv, na = "")

dic <- tibble(
  columna = names(ext),
  grupo = case_when(
    columna %in% c("ID_POLIGONO", "estado", "municipio", "conjunto", "rendimiento_t_ha", "lon", "lat", "area_ha") ~ "Identificación",
    TRUE ~ paste0("SoilGrids (", servicio_de(sub("^sg_", "", columna)), ")")
  ),
  descripcion = case_when(
    columna == "ID_POLIGONO" ~ "Identificador AGC_###",
    startsWith(columna, "sg_") ~ paste0("SoilGrids capa ", sub("^sg_", "", columna), " (valor convertido)"),
    TRUE ~ columna
  ),
  fuente = if_else(startsWith(columna, "sg_"), "ISRIC SoilGrids 2.0", "Reto (despensa)")
)
write_csv(dic, RUTA_EXT$soilgrids_dic, na = "")
message("CSV: ", RUTA_EXT$soilgrids_csv, " (", nrow(ext), " x ", ncol(ext), ")")

guardar_interm(ext, "parcelas_soilgrids")
guardar_interm(parc, "parcelas_sf_sg")
message("10_zonal_soilgrids.R terminado.")
