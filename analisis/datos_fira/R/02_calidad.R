# 02_calidad.R
# KDD, etapa 2: preprocesamiento y calidad.
# Tipa las series (fechas DD/MM/AAAA), separa los sensores y mide qué tan usable es cada fuente.
# No se imputa nada: los vacíos del CSV Básico entre Sentinel-2 y Landsat son parte del diseño del archivo.
#
# Salidas
#   tablas/02_resumen_series.csv        cobertura por sensor
#   tablas/02_vacios_estructurales.csv  porcentaje de vacíos por sensor y tipo de columna
#   tablas/02_consistencia.csv          pruebas de nubosidad, vacíos y orden min/promedio/max
#   tablas/02_rangos_indices.csv        mín, mediana, P95 y máx de cada índice (_promedio)
#   tablas/02_calidad_rendimiento.csv   distribución de la etiqueta por estado
#   figuras/02_nubosidad_mensual.png, 02_hist_nubosidad.png
#   intermedio/serie_s2.rds, serie_landsat.rds, serie_planet.rds

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

parcelas <- leer_interm("parcelas_base")

# ---- Lectura tipada ------------------------------------------------------------

basico <- read_csv(
  RUTA$basico, show_col_types = FALSE, progress = FALSE,
  col_types = cols(.default = col_double(), ID_POLIGONO = col_character(),
                   fecha_captura = col_character(), sensor = col_character())
) |>
  mutate(fecha = dmy(fecha_captura), .after = fecha_captura) |>
  select(-fecha_captura)

pro <- read_csv(
  RUTA$pro, show_col_types = FALSE, progress = FALSE,
  col_types = cols(.default = col_double(), ID_POLIGONO = col_character(),
                   fecha_captura = col_character(), sensor = col_character())
) |>
  mutate(fecha = dmy(fecha_captura), .after = fecha_captura) |>
  select(-fecha_captura)

stopifnot(!anyNA(basico$fecha), !anyNA(pro$fecha)) # si falla, el formato de fecha cambió

# ---- Separación por sensor -------------------------------------------------------
# Sentinel-2: todas las columnas de índices salvo vi6t. Landsat: solo vi6t.
# Planet queda en su propia tabla y sus columnas nunca se mezclan con las de Sentinel-2.

cols_vi6t <- str_subset(names(basico), "^vi6t_")
serie_s2 <- basico |>
  filter(sensor == "Sentinel-2") |>
  select(-all_of(cols_vi6t), -sensor)
serie_landsat <- basico |>
  filter(sensor == "Landsat") |>
  select(ID_POLIGONO, fecha, all_of(cols_vi6t), porcentaje_nubosidad)
serie_planet <- pro |> select(-sensor)

guardar_interm(serie_s2, "serie_s2")
guardar_interm(serie_landsat, "serie_landsat")
guardar_interm(serie_planet, "serie_planet")

series <- list(`Sentinel-2` = serie_s2, Landsat = serie_landsat, Planet = serie_planet)
indice_ref <- c(`Sentinel-2` = "ndvi_promedio", Landsat = "vi6t_promedio", Planet = "ndvi_promedio")

# ---- Resumen de cobertura ----------------------------------------------------------

resumen <- imap_dfr(series, function(d, nombre) {
  obs <- count(d, ID_POLIGONO)
  ref <- indice_ref[[nombre]]
  tibble(
    sensor = nombre,
    filas = nrow(d),
    parcelas = n_distinct(d$ID_POLIGONO),
    fecha_min = format(min(d$fecha), "%Y-%m-%d"),
    fecha_max = format(max(d$fecha), "%Y-%m-%d"),
    obs_por_parcela_min = min(obs$n),
    obs_por_parcela_mediana = median(obs$n),
    obs_por_parcela_max = max(obs$n),
    duplicados_parcela_fecha = sum(duplicated(d[c("ID_POLIGONO", "fecha")])),
    filas_con_indice = sum(!is.na(d[[ref]])),
    pct_con_indice = round(100 * mean(!is.na(d[[ref]])), 1),
    filas_nube_100 = sum(d$porcentaje_nubosidad == 100, na.rm = TRUE),
    filas_nube_vacia = sum(is.na(d$porcentaje_nubosidad))
  )
})
guardar_tab(resumen, "02_resumen_series")

# ---- Vacíos estructurales (diseño del archivo) vs vacíos por nube ----------------------

vacios_estructurales <- basico |>
  group_by(sensor) |>
  summarise(
    columnas_s2 = round(100 * mean(is.na(pick(matches("^(ndvi|evi|savi|lai|fapar)_promedio$")))), 1),
    columnas_vi6t = round(100 * mean(is.na(pick(matches("^vi6t_promedio$")))), 1),
    .groups = "drop"
  ) |>
  rename(`% vacío en NDVI/EVI/SAVI/LAI/FAPAR` = columnas_s2, `% vacío en VI6T` = columnas_vi6t)
guardar_tab(vacios_estructurales, "02_vacios_estructurales")

# ---- Consistencia -------------------------------------------------------------------

# Cuántas filas violan mín <= promedio <= máx (con tolerancia numérica por redondeo).
violaciones_orden <- function(d, indices) {
  map_int(indices, function(i) {
    p <- d[[paste0(i, "_promedio")]]; mn <- d[[paste0(i, "_min")]]; mx <- d[[paste0(i, "_max")]]
    sum(!is.na(p) & !is.na(mn) & !is.na(mx) & (p < mn - 1e-3 | p > mx + 1e-3))
  }) |> sum()
}
std_negativa <- function(d) sum(unlist(d |> select(matches("_std$")) |> map(~ sum(.x < 0, na.rm = TRUE))))

idx_s2_todos <- str_subset(names(serie_s2), "_promedio$") |> str_remove("_promedio$")
idx_pl_todos <- str_subset(names(serie_planet), "_promedio$") |> str_remove("_promedio$")

s2_nube100 <- serie_s2 |> filter(porcentaje_nubosidad == 100)
s2_indices <- serie_s2 |> filter(!is.na(ndvi_promedio))
consist <- tribble(
  ~prueba, ~valor,
  "S2: filas con nube = 100", nrow(s2_nube100),
  "S2: de esas, con NDVI presente (debe ser 0)", sum(!is.na(s2_nube100$ndvi_promedio)),
  "S2: filas sin NDVI y con nube < 100 (debe ser 0)", sum(is.na(serie_s2$ndvi_promedio) & serie_s2$porcentaje_nubosidad < 100),
  "S2: nube máxima entre filas con NDVI", max(s2_indices$porcentaje_nubosidad),
  "S2: filas con NDVI y FAPAR vacío", sum(!is.na(serie_s2$ndvi_promedio) & is.na(serie_s2$fapar_promedio)),
  "S2: parcelas distintas en esas filas", n_distinct(serie_s2$ID_POLIGONO[!is.na(serie_s2$ndvi_promedio) & is.na(serie_s2$fapar_promedio)]),
  "Landsat: filas con VI6T vacío", sum(is.na(serie_landsat$vi6t_promedio)),
  "Landsat: VI6T vacío y nube = 100", sum(is.na(serie_landsat$vi6t_promedio) & serie_landsat$porcentaje_nubosidad == 100, na.rm = TRUE),
  "Landsat: VI6T vacío y nube vacía (no recuperables)", sum(is.na(serie_landsat$vi6t_promedio) & is.na(serie_landsat$porcentaje_nubosidad)),
  "Landsat: VI6T vacío con nube entre 0 y 99", sum(is.na(serie_landsat$vi6t_promedio) & serie_landsat$porcentaje_nubosidad < 100, na.rm = TRUE),
  "Planet: filas con los 4 índices vacíos", sum(is.na(serie_planet$ndvi_promedio) & is.na(serie_planet$evi_promedio) & is.na(serie_planet$lai_promedio) & is.na(serie_planet$msavi_promedio)),
  "Planet: de esas, con nube = 100", sum(is.na(serie_planet$ndvi_promedio) & serie_planet$porcentaje_nubosidad == 100),
  "Planet: nube máxima entre filas con NDVI", max(serie_planet$porcentaje_nubosidad[!is.na(serie_planet$ndvi_promedio)]),
  "S2: violaciones de mín <= promedio <= máx", violaciones_orden(serie_s2, idx_s2_todos),
  "Planet: violaciones de mín <= promedio <= máx", violaciones_orden(serie_planet, idx_pl_todos),
  "S2: desviaciones estándar negativas", std_negativa(serie_s2),
  "Planet: desviaciones estándar negativas", std_negativa(serie_planet),
  "Parcelas del Básico ausentes en la tabla base", length(setdiff(basico$ID_POLIGONO, parcelas$ID_POLIGONO)),
  "Parcelas de la tabla base sin datos en PRO", length(setdiff(parcelas$ID_POLIGONO, pro$ID_POLIGONO))
) |> mutate(valor = as.character(valor))
guardar_tab(consist, "02_consistencia")

# ---- Rangos de cada índice (solo donde existe el valor) ----------------------------------

rangos <- function(d, nombre) {
  d |>
    select(matches("_promedio$")) |>
    pivot_longer(everything(), names_to = "indice", values_to = "valor") |>
    filter(!is.na(valor)) |>
    group_by(indice) |>
    summarise(n = n(), min = min(valor), mediana = median(valor),
              p95 = quantile(valor, .95), max = max(valor), .groups = "drop") |>
    mutate(sensor = nombre, indice = str_remove(indice, "_promedio$"), .before = 1)
}
tab_rangos <- bind_rows(rangos(serie_s2, "Sentinel-2"), rangos(serie_landsat, "Landsat"), rangos(serie_planet, "Planet")) |>
  mutate(across(min:max, ~ round(.x, 3)))
guardar_tab(tab_rangos, "02_rangos_indices")

# ---- Calidad de la etiqueta ---------------------------------------------------------------

cal_rend <- parcelas |>
  group_by(estado) |>
  summarise(
    entrenamiento = sum(conjunto == "ENTRENAMIENTO"),
    prediccion = sum(conjunto == "PREDICCION"),
    rend_min = min_na(rendimiento_t_ha),
    rend_media = round(media_na(rendimiento_t_ha), 2),
    rend_mediana = median(rendimiento_t_ha, na.rm = TRUE),
    rend_max = max_na(rendimiento_t_ha),
    valores_distintos = n_distinct(rendimiento_t_ha, na.rm = TRUE),
    .groups = "drop"
  )
guardar_tab(cal_rend, "02_calidad_rendimiento")

# ---- Figuras: nubosidad ---------------------------------------------------------------------

nube_mensual <- imap_dfr(series, function(d, nombre) {
  d |>
    filter(!is.na(porcentaje_nubosidad)) |>
    mutate(mes = floor_date(fecha, "month")) |>
    group_by(mes) |>
    summarise(prop_nube100 = mean(porcentaje_nubosidad == 100), .groups = "drop") |>
    mutate(sensor = nombre)
})

p_nube <- ggplot(nube_mensual, aes(mes, prop_nube100, colour = sensor)) +
  annotate("rect", xmin = CICLO_INI, xmax = CICLO_FIN, ymin = -Inf, ymax = Inf, fill = "#fee08b", alpha = .35) +
  geom_line(linewidth = .7) +
  scale_y_continuous(labels = percent, limits = c(0, 1)) +
  labs(title = "Escenas totalmente nubladas por mes",
       subtitle = "Franja amarilla: ciclo abril–octubre 2025. Con nube = 100 los índices vienen vacíos.",
       x = NULL, y = "Proporción de filas con nube = 100", colour = "Sensor") +
  tema_ceba()
guardar_fig(p_nube, "02_nubosidad_mensual")

hist_nube <- imap_dfr(series, ~ tibble(sensor = .y, nube = .x$porcentaje_nubosidad)) |> filter(!is.na(nube))
p_hist <- ggplot(hist_nube, aes(nube)) +
  geom_histogram(binwidth = 5, boundary = 0, fill = "#4575b4") +
  facet_wrap(~sensor, scales = "free_y") +
  labs(title = "Distribución del porcentaje de nubosidad",
       subtitle = "La masa está en los extremos: casi despejado o casi cubierto.",
       x = "porcentaje_nubosidad", y = "Filas") +
  tema_ceba()
guardar_fig(p_hist, "02_hist_nubosidad", ancho = 9, alto = 3.5)

message("\n", "Consistencia:")
print(consist, n = Inf)
message("02_calidad.R terminado.")
