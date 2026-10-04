# 00_setup.R
# Rutas, paquetes, parámetros y utilidades compartidas del análisis (fase 1, R).
# Cada script empieza con: source("analisis/R/00_setup.R")
# y se ejecuta desde la raíz del repositorio.
#
# Carril de salida (figuras/tablas/intermedio):
#   CEBA_CARRIL=fira|inegi|soilgrids  (por defecto: fira)
# Los scripts de cada carpeta datos_* fijan el carril antes del source, o se exporta
# la variable de entorno al correr.

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(stringr)
  library(lubridate)
  library(purrr)
  library(forcats)
  library(tibble)
  library(ggplot2)
  library(scales)
  library(sf)
  library(terra)
})

# ---- Rutas -----------------------------------------------------------------

if (!file.exists("AGENTS.md") || !dir.exists("DATASET_RETO_AGRO_2026")) {
  stop("Ejecutar desde la raíz del repositorio (donde están AGENTS.md y DATASET_RETO_AGRO_2026/).")
}

DIR_DATOS    <- "DATASET_RETO_AGRO_2026"
DIR_ANALISIS <- "analisis"
DIR_FIRA     <- file.path(DIR_ANALISIS, "datos_fira")
DIR_INEGI    <- file.path(DIR_ANALISIS, "datos_inegi")
DIR_SG       <- file.path(DIR_ANALISIS, "datos_soilgrids")

CEBA_CARRIL <- Sys.getenv("CEBA_CARRIL", unset = "fira")
DIR_CARRIL <- switch(CEBA_CARRIL,
  fira = DIR_FIRA,
  inegi = DIR_INEGI,
  soilgrids = DIR_SG,
  stop("CEBA_CARRIL debe ser fira, inegi o soilgrids; recibido: ", CEBA_CARRIL)
)

DIR_SALIDA <- file.path(DIR_CARRIL, "salida")
DIR_FIG    <- file.path(DIR_SALIDA, "figuras")
DIR_TAB    <- file.path(DIR_SALIDA, "tablas")
DIR_INTERM <- file.path(DIR_SALIDA, "intermedio") # no se versiona

for (d in c(DIR_FIG, DIR_TAB, DIR_INTERM)) dir.create(d, recursive = TRUE, showWarnings = FALSE)

RUTA <- list(
  parcelas   = file.path(DIR_DATOS, "Parcelas_Reto_AGC_CONJUNTO_70_30", "Parcelas_Reto_AGC_CONJUNTO.shp"),
  rendimiento = file.path(DIR_DATOS, "ID_area_rendimiento_70_30_Reto_AgroCebada.csv"),
  basico     = file.path(DIR_DATOS, "Conjunto_datos_BASICO_AgroCebada2026.csv"),
  pro        = file.path(DIR_DATOS, "Conjunto_datos_PRO_AgroCebada.csv"),
  lluvia_dir = file.path(DIR_DATOS, "Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025", "Precipitacion_mensual"),
  temp_dir   = file.path(DIR_DATOS, "Reto_AgroCebada_Temperatura_2022_2025"),
  topo_dir   = file.path(DIR_DATOS, "Reto_AgroCebada_Topografia_INEGI_CEM4", "Reto_AgroCebada_Topografia_INEGI_CEM4"),
  # Despensa FIRA regenerada (carril datos_fira)
  parcelas_trabajo = file.path(DIR_FIRA, "salida", "parcelas_trabajo.csv"),
  parcelas_trabajo_dic = file.path(DIR_FIRA, "salida", "parcelas_trabajo_diccionario.csv")
)

# Fuentes externas (carriles inegi y soilgrids).
DIR_EXTERNOS <- "DATASETS_EXTERNOS"
DIR_DESP_EXT <- file.path(DIR_EXTERNOS, "despensa_extendida")
DIR_SOILGRIDS <- file.path(DIR_EXTERNOS, "soilgrids")
RUTA_EXT <- list(
  edafologia = file.path(DIR_EXTERNOS, "INEGI_EDAFOLOGIA_2025", "conjunto_de_datos",
                         "cdv_edaf_esc_250k_serie II_cont_nac.shp"),
  edaf_recorte = file.path(DIR_DESP_EXT, "edafologia_recorte_parcelas_v1.gpkg"),
  despensa   = file.path("dataset_entrenamiento", "despensa", "parcelas_despensa_nube30_v1.csv"),
  despensa_dic = file.path("dataset_entrenamiento", "despensa", "parcelas_despensa_nube30_v1_diccionario.csv"),
  extendida  = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_edaf_v1.csv"),
  extendida_dic = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_edaf_v1_diccionario.csv"),
  soilgrids_dir = file.path(DIR_SOILGRIDS, "datos"),
  soilgrids_manifiesto = file.path(DIR_SOILGRIDS, "datos", "manifiesto_descarga.json"),
  soilgrids_csv = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_soilgrids_v1.csv"),
  soilgrids_dic = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_soilgrids_v1_diccionario.csv"),
  soilgrids_venv = file.path(DIR_SOILGRIDS, ".venv", "bin", "python"),
  soilgrids_descarga = file.path(DIR_SOILGRIDS, "descargar_capas.py")
)
CRS_EDAF <- 6372
# Homolosine interrumpida (EPSG:152160); string porque algunos PROJ no resuelven el código.
CRS_SOILGRIDS <- "+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs"

# ---- Parámetros del análisis (se cambian aquí, no dentro de un gráfico) ------

SEMILLA <- 2026
set.seed(SEMILLA)

CICLO_INI <- as.Date("2025-04-01")
CICLO_FIN <- as.Date("2025-10-31")
MESES_CICLO <- 4:10

# Decisión del equipo (2026-10-01): NUBE_MAX = 30.
NUBE_MAX <- 30
MIN_OBS_CICLO <- 5

IDX_S2 <- c("ndvi", "evi", "savi", "lai", "fapar", "ndwi", "endwi", "msi", "emsi",
            "ndti", "sti", "crc")
IDX_PLANET <- c("ndvi", "evi", "lai", "msavi")

FAMILIA <- c(
  ndvi = "Dosel", evi = "Dosel", savi = "Dosel", lai = "Dosel", fapar = "Dosel", msavi = "Dosel",
  ndwi = "Humedad", endwi = "Humedad", msi = "Humedad", emsi = "Humedad",
  ndti = "Residuo/labranza", sti = "Residuo/labranza", crc = "Residuo/labranza",
  vi6t = "Térmico"
)

# Factores de conversión SoilGrids (valor_real = valor_entero / factor). Confirmados con FAQ ISRIC.
SG_FACTOR <- c(bdod = 100, cec = 10, cfvo = 10, clay = 10, nitrogen = 100,
               phh2o = 10, sand = 10, silt = 10, soc = 10, ocs = 1, ocd = 10, wrb = 1)

# ---- Utilidades --------------------------------------------------------------

tema_ceba <- function() {
  theme_minimal(base_size = 11) +
    theme(plot.title = element_text(face = "bold"),
          plot.subtitle = element_text(colour = "grey35"),
          panel.grid.minor = element_blank(),
          legend.position = "bottom")
}

COL_ESTADO <- c(Hidalgo = "#1b9e77", Puebla = "#d95f02", Tlaxcala = "#7570b3")

guardar_fig <- function(p, nombre, ancho = 8, alto = 5) {
  ruta <- file.path(DIR_FIG, paste0(nombre, ".png"))
  ggsave(ruta, p, width = ancho, height = alto, dpi = 150, bg = "white")
  message("Figura: ", ruta)
  invisible(ruta)
}

guardar_tab <- function(x, nombre) {
  ruta <- file.path(DIR_TAB, paste0(nombre, ".csv"))
  write_csv(x, ruta, na = "")
  message("Tabla: ", ruta, " (", nrow(x), " filas)")
  invisible(ruta)
}

guardar_interm <- function(x, nombre) saveRDS(x, file.path(DIR_INTERM, paste0(nombre, ".rds")))
leer_interm    <- function(nombre) readRDS(file.path(DIR_INTERM, paste0(nombre, ".rds")))

max_na <- function(x) if (all(is.na(x))) NA_real_ else max(x, na.rm = TRUE)
min_na <- function(x) if (all(is.na(x))) NA_real_ else min(x, na.rm = TRUE)
media_na <- function(x) if (all(is.na(x))) NA_real_ else mean(x, na.rm = TRUE)
