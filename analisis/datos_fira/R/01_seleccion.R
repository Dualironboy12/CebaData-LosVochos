# 01_seleccion.R
# KDD, etapa 1: selección. Qué datos entran y si las llaves cuadran.
#
# Salidas
#   tablas/01_inventario_fuentes.csv   resumen de cada fuente que entra al análisis
#   tablas/01_verificacion_llaves.csv  pruebas de unión entre shapefile y CSV
#   intermedio/parcelas_base.rds       197 filas: id, área, municipio, estado, conjunto, rendimiento, centroide

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

# ---- Parcelas (shapefile, EPSG:4326) ----------------------------------------

shp <- st_read(RUTA$parcelas, quiet = TRUE) |>
  st_zm() |> # PolygonZ: las alturas no se usan
  rename(ID_POLIGONO = ID_POLIGON, area_ha_shp = `área_ha`)

# ---- Rendimiento (CSV; trae una coma final que crea una columna vacía) -------

rend <- read_csv(RUTA$rendimiento, show_col_types = FALSE, progress = FALSE,
                 name_repair = "minimal") |>
  select(ID_POLIGONO, AREA_HA, RENDIMIENTO_T_HA, CONJUNTO_csv = CONJUNTO)

# ---- Verificación de llaves y atributos --------------------------------------

comparar <- shp |>
  st_drop_geometry() |>
  full_join(rend, by = "ID_POLIGONO")

verif <- tibble(
  prueba = c(
    "Parcelas en el shapefile",
    "Parcelas en el CSV de rendimiento",
    "Identificadores únicos en el shapefile",
    "Identificadores presentes en un solo archivo",
    "Diferencia máxima de área shapefile vs CSV (ha)",
    "Parcelas con CONJUNTO distinto entre shapefile y CSV",
    "Parcelas ENTRENAMIENTO",
    "Parcelas PREDICCION",
    "ENTRENAMIENTO sin rendimiento (debe ser 0)",
    "PREDICCION con rendimiento (debe ser 0)",
    "Valores distintos de Cultivo (texto crudo)"
  ),
  valor = c(
    nrow(shp),
    nrow(rend),
    n_distinct(shp$ID_POLIGONO),
    sum(is.na(comparar$area_ha_shp) | is.na(comparar$AREA_HA)),
    round(max(abs(comparar$area_ha_shp - comparar$AREA_HA), na.rm = TRUE), 4),
    sum(comparar$CONJUNTO != comparar$CONJUNTO_csv, na.rm = TRUE),
    sum(rend$CONJUNTO_csv == "ENTRENAMIENTO"),
    sum(rend$CONJUNTO_csv == "PREDICCION"),
    sum(rend$CONJUNTO_csv == "ENTRENAMIENTO" & is.na(rend$RENDIMIENTO_T_HA)),
    sum(rend$CONJUNTO_csv == "PREDICCION" & !is.na(rend$RENDIMIENTO_T_HA)),
    n_distinct(shp$Cultivo)
  ) |> as.character()
)
guardar_tab(verif, "01_verificacion_llaves")
stopifnot(
  nrow(shp) == 197, nrow(rend) == 197,
  all(verif$valor[c(4, 6, 9, 10)] == "0")
)

# ---- Tabla base de parcelas ---------------------------------------------------
# Cultivo se normaliza (CEBADA / Cebada -> Cebada). El rendimiento vacío se
# conserva vacío en las parcelas de predicción.

centroides <- shp |>
  st_geometry() |>
  st_point_on_surface() |> # punto dentro del polígono; en parcelas pequeñas el efecto de usar grados es despreciable
  suppressWarnings() |>
  st_coordinates() |>
  as_tibble() |>
  rename(lon = X, lat = Y)

parcelas_base <- shp |>
  st_drop_geometry() |>
  bind_cols(centroides) |>
  left_join(rend |> select(ID_POLIGONO, RENDIMIENTO_T_HA), by = "ID_POLIGONO") |>
  transmute(
    ID_POLIGONO,
    cultivo = str_to_sentence(Cultivo),
    area_ha = area_ha_shp,
    municipio = Municipio,
    estado = Estado,
    conjunto = CONJUNTO,
    rendimiento_t_ha = RENDIMIENTO_T_HA,
    lon, lat
  ) |>
  arrange(ID_POLIGONO)

guardar_interm(parcelas_base, "parcelas_base")
guardar_interm(shp, "parcelas_sf")

# ---- Inventario de fuentes -----------------------------------------------------

contar_tifs <- function(dir, patron) length(list.files(dir, pattern = patron, recursive = TRUE))
n_prec <- contar_tifs(RUTA$lluvia_dir, "^PREC_.*\\.tif$")
n_tmin <- contar_tifs(file.path(RUTA$temp_dir, "Tmin"), "\\.tif$")
n_tmax <- contar_tifs(file.path(RUTA$temp_dir, "Tmax"), "\\.tif$")

cab_basico <- names(read_csv(RUTA$basico, n_max = 0, show_col_types = FALSE, progress = FALSE))
cab_pro    <- names(read_csv(RUTA$pro, n_max = 0, show_col_types = FALSE, progress = FALSE))
n_filas <- function(ruta) length(readr::read_lines(ruta, progress = FALSE)) - 1L

inventario <- tribble(
  ~fuente, ~archivo, ~unidad_de_observacion, ~filas_o_capas, ~columnas, ~periodo, ~uso_en_el_analisis,
  "Parcelas", basename(RUTA$parcelas), "parcela (polígono)", nrow(shp), ncol(shp) - 1L, "sin fecha", "Geometría, área, municipio, estado, conjunto",
  "Rendimiento", basename(RUTA$rendimiento), "parcela", nrow(rend), 4L, "ciclo abr-oct 2025", "Etiqueta (solo 138 con valor)",
  "Índices Básico", basename(RUTA$basico), "parcela x fecha x sensor", n_filas(RUTA$basico), length(cab_basico), "2022-2025", "Sentinel-2 (NDVI...) y Landsat (VI6T)",
  "Índices PRO", basename(RUTA$pro), "parcela x fecha", n_filas(RUTA$pro), length(cab_pro), "2025", "Planet (NDVI, EVI, LAI, MSAVI)",
  "Precipitación CHIRPS", "PREC_{año}_{mes}.tif", "píxel de 0.05° x mes", n_prec, NA_integer_, "2022-2025", "Lluvia del ciclo 2025 en el píxel de cada parcela",
  "Tmin CHIRTS-ERA5", "Tmin_{año}_{mes}.tif", "píxel de 0.05° x mes", n_tmin, NA_integer_, "2022-2025", "Temperatura mínima del ciclo",
  "Tmax CHIRTS-ERA5", "Tmax_{año}_{mes}.tif", "píxel de 0.05° x mes", n_tmax, NA_integer_, "2022-2025", "Temperatura máxima del ciclo",
  "Elevación INEGI CEM", "Elevacion_INEGI_CEM4_120m.tif", "píxel de 120 m (EPSG:6372)", 1L, NA_integer_, "estático", "Elevación zonal por parcela",
  "Pendiente INEGI CEM", "Pendiente_INEGI_CEM4_120m_grados.tif", "píxel de 120 m (EPSG:6372)", 1L, NA_integer_, "estático", "Pendiente zonal por parcela"
)
guardar_tab(inventario, "01_inventario_fuentes")

message("\nParcelas por conjunto y estado:")
print(count(parcelas_base, estado, conjunto))
message("01_seleccion.R terminado.")
