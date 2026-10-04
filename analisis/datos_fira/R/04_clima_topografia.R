# 04_clima_topografia.R
# KDD, etapa 3 (continuación): clima y topografía por parcela, y ensamble de la tabla de trabajo.
#
# Reglas:
#   - Lluvia (CHIRPS) y temperatura (CHIRTS-ERA5): GeoTIFF mensuales, EPSG:4326, píxel de 0.05° (~5 km).
#     Sin dato = -9999 (se convierte a NA). Estadística zonal ponderada por la fracción exacta de píxel cubierta.
#   - Elevación y pendiente (INEGI CEM): EPSG:6372, 120 m. Los polígonos se reproyectan a EPSG:6372
#     antes de la estadística zonal.
#   - Ciclo: abril a octubre de 2025. Los años 2022-2024 se extraen para contexto y no entran
#     a la tabla de trabajo.
#
# Salidas
#   parcelas_trabajo.csv y parcelas_trabajo_diccionario.csv (en analisis/datos_fira/salida/)
#   tablas/04_pixeles_clima.csv, 04_clima_mensual_2025.csv, 04_topografia.csv
#   intermedio/clima_mensual.rds, parcelas_trabajo.rds

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

parcelas <- leer_interm("parcelas_base")
parcelas_sf <- leer_interm("parcelas_sf") # EPSG:4326
indices_ciclo <- leer_interm("indices_ciclo")
stopifnot(nrow(parcelas_sf) == 197, setequal(parcelas_sf$ID_POLIGONO, parcelas$ID_POLIGONO))

v4326 <- vect(parcelas_sf["ID_POLIGONO"])

# ---- Utilidades de lectura de rásteres mensuales ----------------------------------------------

leer_pila <- function(dir, prefijo) {
  archivos <- list.files(dir, pattern = paste0("^", prefijo, "_\\d{4}_\\d{2}\\.tif$"), recursive = TRUE, full.names = TRUE)
  stopifnot(length(archivos) == 48)
  nombres <- str_match(basename(archivos), "_(\\d{4})_(\\d{2})\\.tif$")
  o <- order(nombres[, 2], nombres[, 3])
  pila <- rast(archivos[o])
  names(pila) <- paste0(nombres[o, 2], "-", nombres[o, 3])
  NAflag(pila) <- -9999
  pila[pila == -9999] <- NA # respaldo por si el metadato no declara el sin dato
  pila
}

zonal_mensual <- function(pila, nombre_var) {
  # exact = TRUE pondera por la fracción exacta de cada píxel cubierta. Con weights = TRUE una
  # parcela menor que el píxel y sin ningún centro de celda adentro devuelve NaN.
  z <- terra::extract(pila, v4326, fun = mean, na.rm = TRUE, exact = TRUE, ID = FALSE)
  bind_cols(tibble(ID_POLIGONO = parcelas_sf$ID_POLIGONO), as_tibble(z)) |>
    pivot_longer(-ID_POLIGONO, names_to = "anio_mes", values_to = "valor") |>
    mutate(variable = nombre_var,
           anio = as.integer(str_sub(anio_mes, 1, 4)),
           mes = as.integer(str_sub(anio_mes, 6, 7))) |>
    select(ID_POLIGONO, variable, anio, mes, valor)
}

# ---- Clima ---------------------------------------------------------------------------------

prec <- leer_pila(RUTA$lluvia_dir, "PREC")
tmin <- leer_pila(file.path(RUTA$temp_dir, "Tmin"), "Tmin")
tmax <- leer_pila(file.path(RUTA$temp_dir, "Tmax"), "Tmax")

clima_mensual <- bind_rows(
  zonal_mensual(prec, "lluvia_mm"),
  zonal_mensual(tmin, "tmin_c"),
  zonal_mensual(tmax, "tmax_c")
)
stopifnot(!anyNA(clima_mensual$valor))
guardar_interm(clima_mensual, "clima_mensual")

# Cuántos píxeles distintos cubren las 197 parcelas (el clima no separa parcelas vecinas).
celdas_por_parcela <- terra::extract(prec[[1]], v4326, cells = TRUE, touches = TRUE) |>
  as_tibble() |>
  mutate(ID_POLIGONO = parcelas_sf$ID_POLIGONO[ID]) |>
  select(ID_POLIGONO, celda = cell)

pix <- celdas_por_parcela |>
  group_by(ID_POLIGONO) |>
  summarise(pixeles_que_toca = n_distinct(celda), celda_principal = first(celda), .groups = "drop") |>
  left_join(parcelas |> select(ID_POLIGONO, estado, municipio), by = "ID_POLIGONO")

resumen_pix <- pix |>
  count(celda_principal, name = "parcelas_en_el_pixel") |>
  count(parcelas_en_el_pixel, name = "pixeles") |>
  arrange(parcelas_en_el_pixel)
tab_pix <- bind_rows(
  tibble(dato = "Parcelas", valor = nrow(pix)),
  tibble(dato = "Píxeles CHIRPS/CHIRTS distintos (píxel principal)", valor = n_distinct(pix$celda_principal)),
  tibble(dato = "Parcelas que tocan más de un píxel", valor = sum(pix$pixeles_que_toca > 1)),
  resumen_pix |> transmute(dato = paste0("Píxeles con ", parcelas_en_el_pixel, " parcela(s)"), valor = pixeles)
)
guardar_tab(tab_pix, "04_pixeles_clima")
guardar_interm(pix, "pixeles_clima")

# Variables del ciclo abr-oct 2025.
clima_ciclo <- clima_mensual |>
  filter(anio == 2025, mes %in% MESES_CICLO) |>
  pivot_wider(names_from = variable, values_from = valor, id_cols = c(ID_POLIGONO, mes)) |>
  group_by(ID_POLIGONO) |>
  summarise(
    lluvia_ciclo_mm = sum(lluvia_mm),
    lluvia_mes_max_mm = max(lluvia_mm),
    tmin_ciclo_c = mean(tmin_c),
    tmax_ciclo_c = mean(tmax_c),
    .groups = "drop"
  ) |>
  mutate(tmedia_ciclo_c = (tmin_ciclo_c + tmax_ciclo_c) / 2,
         amplitud_ciclo_c = tmax_ciclo_c - tmin_ciclo_c)

# Tabla mensual 2025 (referencia; también alimenta figuras).
clima_2025 <- clima_mensual |> filter(anio == 2025) |>
  pivot_wider(names_from = variable, values_from = valor)
guardar_tab(clima_2025 |> group_by(mes) |> summarise(across(c(lluvia_mm, tmin_c, tmax_c), ~ round(mean(.x), 2))),
            "04_clima_mensual_2025")

# ---- Topografía (EPSG:6372) --------------------------------------------------------------------------

elev <- rast(file.path(RUTA$topo_dir, "Elevacion_INEGI_CEM4_120m.tif"))
pend <- rast(file.path(RUTA$topo_dir, "Pendiente_INEGI_CEM4_120m_grados.tif"))
NAflag(elev) <- -9999; NAflag(pend) <- -9999
elev[elev == -9999] <- NA; pend[pend == -9999] <- NA
stopifnot(st_crs(crs(elev))$epsg == 6372)

v6372 <- project(v4326, crs(elev)) # reproyección real de los polígonos antes de la estadística zonal

zona <- function(r, fun, nombre, ...) {
  terra::extract(r, v6372, fun = fun, na.rm = TRUE, ID = FALSE, ...) |>
    as_tibble() |> setNames(nombre)
}
topografia <- tibble(ID_POLIGONO = parcelas_sf$ID_POLIGONO) |>
  bind_cols(
    zona(elev, mean, "elevacion_m", exact = TRUE),
    zona(elev, min, "elevacion_min_m", touches = TRUE),
    zona(elev, max, "elevacion_max_m", touches = TRUE),
    zona(pend, mean, "pendiente_grados", exact = TRUE),
    zona(pend, max, "pendiente_max_grados", touches = TRUE)
  ) |>
  mutate(relieve_m = elevacion_max_m - elevacion_min_m)
stopifnot(!anyNA(topografia))

# Píxeles de 120 m que toca cada parcela (una parcela de 0.35 ha cabe en un píxel).
topografia$pixeles_topo <- terra::extract(elev, v6372, fun = function(x) sum(!is.na(x)), touches = TRUE, ID = FALSE)[[1]]
guardar_tab(topografia |> mutate(across(where(is.numeric), ~ round(.x, 2))), "04_topografia")

# ---- Ensamble de la tabla de trabajo ---------------------------------------------------------------------
# Una fila por parcela. El rendimiento queda vacío en las parcelas de PREDICCION.

trabajo <- parcelas |>
  left_join(clima_ciclo, by = "ID_POLIGONO") |>
  left_join(topografia |> select(-pixeles_topo), by = "ID_POLIGONO") |>
  left_join(pix |> select(ID_POLIGONO, pixel_clima = celda_principal), by = "ID_POLIGONO") |>
  left_join(indices_ciclo, by = "ID_POLIGONO") |>
  relocate(rendimiento_t_ha, .after = conjunto)

stopifnot(
  nrow(trabajo) == 197, !anyDuplicated(trabajo$ID_POLIGONO),
  sum(!is.na(trabajo$rendimiento_t_ha)) == 138,
  all(is.na(trabajo$rendimiento_t_ha[trabajo$conjunto == "PREDICCION"]))
)

guardar_interm(trabajo, "parcelas_trabajo")
write_csv(trabajo, file.path(DIR_SALIDA, "parcelas_trabajo.csv"), na = "")
message("Tabla de trabajo: ", file.path(DIR_SALIDA, "parcelas_trabajo.csv"), " (", nrow(trabajo), " x ", ncol(trabajo), ")")

# ---- Diccionario de columnas -----------------------------------------------------------------------------

# Reglas en orden: gana la primera que coincide con el nombre de la columna.
reglas <- tribble(
  ~patron, ~grupo, ~descripcion,
  "^ID_POLIGONO$", "Identificación", "Identificador AGC_### de la parcela",
  "^cultivo$", "Identificación", "Cultivo normalizado (Cebada)",
  "^area_ha$", "Parcela", "Superficie en hectáreas (shapefile)",
  "^(municipio|estado)$", "Parcela", "Ubicación administrativa",
  "^conjunto$", "Parcela", "Partición oficial: ENTRENAMIENTO o PREDICCION",
  "^rendimiento_t_ha$", "Etiqueta", "Rendimiento abr-oct 2025 en t/ha; vacío en PREDICCION",
  "^(lon|lat)$", "Parcela", "Punto dentro del polígono, grados EPSG:4326",
  "^pixel_clima$", "Clima", "Celda CHIRPS/CHIRTS de la parcela; el mismo valor implica el mismo clima",
  "^lluvia_ciclo_mm$", "Clima", "Lluvia acumulada abr-oct 2025 (mm) en el píxel",
  "^lluvia_mes_max_mm$", "Clima", "Lluvia del mes más lluvioso del ciclo (mm)",
  "^t(min|max|media)_ciclo_c$", "Clima", "Temperatura media del ciclo abr-oct 2025 (°C)",
  "^amplitud_ciclo_c$", "Clima", "Tmax - Tmin medias del ciclo (°C)",
  "^(elevacion|relieve)", "Topografía", "Elevación o relieve interno de la parcela (m), INEGI CEM 120 m",
  "^pendiente", "Topografía", "Pendiente de la ladera (grados), INEGI CEM 120 m",
  "^n_obs_", "Calidad", "Observaciones válidas del ciclo que sostienen el resumen del sensor",
  "^sensores_confiables$", "Calidad", "Sensores con al menos MIN_OBS_CICLO observaciones válidas",
  "_s2_", "Sentinel-2", "Resumen del ciclo 2025",
  "_landsat_", "Landsat", "Resumen del ciclo 2025",
  "_planet_", "Planet", "Resumen del ciclo 2025"
)
estadistico <- c(media = "media", max = "máximo", min = "mínimo", int = "integral trapezoidal (índice x día)",
                 doy_max = "día del año del máximo", std_media = "media de la desviación estándar dentro de la parcela",
                 media_may_jul = "NDVI medio de mayo a julio", media_ago = "NDVI medio de agosto",
                 media_sep_oct = "NDVI medio de septiembre a octubre")

describir <- function(col) {
  i <- which(str_detect(col, reglas$patron))[1]
  if (is.na(i)) return(c("Otro", ""))
  desc <- reglas$descripcion[i]
  if (reglas$grupo[i] %in% c("Sentinel-2", "Landsat", "Planet")) {
    desc <- paste0(desc, ": ", estadistico[[str_extract(col, "(doy_max|std_media|media_may_jul|media_ago|media_sep_oct|media|max|min|int)$")]])
  }
  c(reglas$grupo[i], desc)
}
dic <- tibble(columna = names(trabajo)) |>
  mutate(grupo = map_chr(columna, ~ describir(.x)[1]), descripcion = map_chr(columna, ~ describir(.x)[2]))
stopifnot(!any(dic$grupo == "Otro"))
write_csv(dic, file.path(DIR_SALIDA, "parcelas_trabajo_diccionario.csv"), na = "")

message("\nPíxeles de clima:")
print(tab_pix, n = Inf)
message("04_clima_topografia.R terminado.")
