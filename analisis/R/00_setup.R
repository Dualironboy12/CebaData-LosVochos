# 00_setup.R
# Rutas, paquetes, parámetros y utilidades compartidas del análisis (fase 1, R).
# Cada script del análisis empieza con: source("analisis/R/00_setup.R")
# y se ejecuta desde la raíz del repositorio.

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

DIR_DATOS   <- "DATASET_RETO_AGRO_2026"
DIR_ANALISIS <- "analisis"
DIR_SALIDA  <- file.path(DIR_ANALISIS, "salida")
DIR_FIG     <- file.path(DIR_SALIDA, "figuras")
DIR_TAB     <- file.path(DIR_SALIDA, "tablas")
DIR_INTERM  <- file.path(DIR_SALIDA, "intermedio") # no se versiona

for (d in c(DIR_FIG, DIR_TAB, DIR_INTERM)) dir.create(d, recursive = TRUE, showWarnings = FALSE)

RUTA <- list(
  parcelas   = file.path(DIR_DATOS, "Parcelas_Reto_AGC_CONJUNTO_70_30", "Parcelas_Reto_AGC_CONJUNTO.shp"),
  rendimiento = file.path(DIR_DATOS, "ID_area_rendimiento_70_30_Reto_AgroCebada.csv"),
  basico     = file.path(DIR_DATOS, "Conjunto_datos_BASICO_AgroCebada2026.csv"),
  pro        = file.path(DIR_DATOS, "Conjunto_datos_PRO_AgroCebada.csv"),
  lluvia_dir = file.path(DIR_DATOS, "Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025", "Precipitacion_mensual"),
  temp_dir   = file.path(DIR_DATOS, "Reto_AgroCebada_Temperatura_2022_2025"),
  topo_dir   = file.path(DIR_DATOS, "Reto_AgroCebada_Topografia_INEGI_CEM4", "Reto_AgroCebada_Topografia_INEGI_CEM4")
)

# Fuentes externas (scripts 07 y 08). No forman parte de correr.sh.
DIR_EXTERNOS <- "DATASETS_EXTERNOS"
DIR_DESP_EXT <- file.path(DIR_EXTERNOS, "despensa_extendida")
RUTA_EXT <- list(
  # Shapefile nacional de INEGI (225 MB): no se versiona; opcional si existe el recorte de abajo.
  edafologia = file.path(DIR_EXTERNOS, "INEGI_EDAFOLOGIA_2025", "conjunto_de_datos",
                         "cdv_edaf_esc_250k_serie II_cont_nac.shp"),
  # Recorte de la edafología al área de las parcelas (+5 km), con los campos usados y el CRS embebido.
  # Sí se versiona (unos cientos de KB) y permite reproducir 07 y 08 sin el shapefile nacional.
  edaf_recorte = file.path(DIR_DESP_EXT, "edafologia_recorte_parcelas_v1.gpkg"),
  # Despensa congelada con NUBE_MAX = 30 (ver dataset_entrenamiento/despensa/MANIFIESTO.md).
  despensa   = file.path("dataset_entrenamiento", "despensa", "parcelas_despensa_nube30_v1.csv"),
  despensa_dic = file.path("dataset_entrenamiento", "despensa", "parcelas_despensa_nube30_v1_diccionario.csv"),
  extendida  = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_edaf_v1.csv"),
  extendida_dic = file.path(DIR_DESP_EXT, "parcelas_despensa_extendida_edaf_v1_diccionario.csv")
)
# El shapefile de INEGI no trae .prj; sus coordenadas están en EPSG:6372 (metros).
CRS_EDAF <- 6372

# ---- Parámetros del análisis (se cambian aquí, no dentro de un gráfico) ------

SEMILLA <- 2026
set.seed(SEMILLA)

# Ciclo de la etiqueta de rendimiento: abril a octubre de 2025.
CICLO_INI <- as.Date("2025-04-01")
CICLO_FIN <- as.Date("2025-10-31")
MESES_CICLO <- 4:10

# Filtro de nubosidad: se conservan observaciones con porcentaje_nubosidad <= NUBE_MAX.
# Decisión del equipo (2026-10-01): 30, para maximizar las fechas usables al condensar
# los índices. El primer KDD se corrió con 0 (punto de partida de la guía del dataset).
# La sensibilidad a 0, 10 y 30 se reporta en 03_transformacion.R.
NUBE_MAX <- 30

# Mínimo de observaciones válidas en el ciclo para considerar confiable el resumen de una parcela.
MIN_OBS_CICLO <- 5

# Índices de Sentinel-2 y Planet que se resumen por parcela.
IDX_S2 <- c("ndvi", "evi", "savi", "lai", "fapar", "ndwi", "endwi", "msi", "emsi",
            "ndti", "sti", "crc")
IDX_PLANET <- c("ndvi", "evi", "lai", "msavi")

# Familias de índices (lectura de la guía del dataset).
FAMILIA <- c(
  ndvi = "Dosel", evi = "Dosel", savi = "Dosel", lai = "Dosel", fapar = "Dosel", msavi = "Dosel",
  ndwi = "Humedad", endwi = "Humedad", msi = "Humedad", emsi = "Humedad",
  ndti = "Residuo/labranza", sti = "Residuo/labranza", crc = "Residuo/labranza",
  vi6t = "Térmico"
)

# ---- Utilidades --------------------------------------------------------------

# Tema gráfico común.
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

# Máximo o NA si no hay valores (evita -Inf y avisos).
max_na <- function(x) if (all(is.na(x))) NA_real_ else max(x, na.rm = TRUE)
min_na <- function(x) if (all(is.na(x))) NA_real_ else min(x, na.rm = TRUE)
media_na <- function(x) if (all(is.na(x))) NA_real_ else mean(x, na.rm = TRUE)
