# 03_transformacion.R
# KDD, etapa 3: transformación de las series satelitales a una fila por parcela.
#
# Reglas (ver AGENTS.md y DATASET_RETO_AGRO_2026/README.md):
#   - Filtro de nubosidad: porcentaje_nubosidad <= NUBE_MAX (00_setup.R) y índice presente.
#   - Recorte al ciclo de la etiqueta: CICLO_INI a CICLO_FIN de 2025.
#   - Sentinel-2, Landsat y Planet se resumen por separado; el sensor va en el nombre
#     de la columna (ndvi_s2_max, ndvi_planet_max, vi6t_landsat_media). No se funden.
#   - Sin imputación. Si una parcela no tiene observaciones válidas, el resumen queda en NA.
#
# Resumen por parcela:
#   Índices de dosel (ndvi, evi, savi, lai, fapar, msavi): _max, _media, _int, _doy_max, _std_media
#   Resto de Sentinel-2 y VI6T:                            _media, _max, _min
#   _int      integral trapezoidal en índice x día, solo entre la primera y la última observación válida
#   _doy_max  día del año del máximo (fecha del pico)
#   _std_media  media de la desviación estándar dentro de la parcela (heterogeneidad)
#   ndvi_*_media_may_jul / _media_ago / _media_sep_oct  NDVI medio por fase (Sentinel-2 y Planet)
#   n_obs_*   observaciones válidas del ciclo que sostienen el resumen
#
# Salidas
#   tablas/03_sensibilidad_nube.csv, 03_indices_ciclo.csv
#   figuras/03_obs_validas_ciclo.png, 03_contexto_ndvi_anual.png
#   intermedio/indices_ciclo.rds, ciclo_s2.rds, ciclo_landsat.rds, ciclo_planet.rds

source("analisis/R/00_setup.R")

parcelas <- leer_interm("parcelas_base")
s2 <- leer_interm("serie_s2")
landsat <- leer_interm("serie_landsat")
planet <- leer_interm("serie_planet")

en_ciclo <- function(d) d |> filter(fecha >= CICLO_INI, fecha <= CICLO_FIN)

# ---- Sensibilidad al umbral de nubosidad -------------------------------------------------

sens <- function(d, ref, sensor) {
  crossing(umbral_nube = c(0, 10, 30)) |>
    pmap_dfr(function(umbral_nube) {
      v <- en_ciclo(d) |> filter(!is.na(.data[[ref]]), porcentaje_nubosidad <= umbral_nube)
      obs <- v |> count(ID_POLIGONO) |> right_join(parcelas["ID_POLIGONO"], by = "ID_POLIGONO") |>
        mutate(n = replace_na(n, 0L))
      tibble(sensor = sensor, umbral_nube = umbral_nube, observaciones = nrow(v),
             obs_por_parcela_min = min(obs$n), obs_por_parcela_mediana = median(obs$n),
             parcelas_con_menos_de_min = sum(obs$n < MIN_OBS_CICLO))
    })
}
tab_sens <- bind_rows(
  sens(s2, "ndvi_promedio", "Sentinel-2"),
  sens(landsat, "vi6t_promedio", "Landsat"),
  sens(planet, "ndvi_promedio", "Planet")
)
guardar_tab(tab_sens, "03_sensibilidad_nube")

# Parámetros con los que se generó esta corrida (los lee el informe y el manifiesto de la despensa).
guardar_tab(tibble(parametro = c("NUBE_MAX", "CICLO_INI", "CICLO_FIN", "MIN_OBS_CICLO"),
                   valor = c(NUBE_MAX, format(CICLO_INI), format(CICLO_FIN), MIN_OBS_CICLO) |> as.character()),
            "03_parametros")

# ---- Observaciones válidas del ciclo ---------------------------------------------------------

valido <- function(d, ref) en_ciclo(d) |> filter(!is.na(.data[[ref]]), porcentaje_nubosidad <= NUBE_MAX)
ciclo_s2 <- valido(s2, "ndvi_promedio")
ciclo_landsat <- valido(landsat, "vi6t_promedio")
ciclo_planet <- valido(planet, "ndvi_promedio")
guardar_interm(ciclo_s2, "ciclo_s2")
guardar_interm(ciclo_landsat, "ciclo_landsat")
guardar_interm(ciclo_planet, "ciclo_planet")

# ---- Resumen por parcela ---------------------------------------------------------------------

# Integral trapezoidal (índice x día) con fechas ordenadas.
integral_trap <- function(fecha, y) {
  o <- order(fecha); f <- as.numeric(fecha[o]); y <- y[o]
  if (length(f) < 2) return(NA_real_)
  sum(diff(f) * (head(y, -1) + tail(y, -1)) / 2)
}

resumir <- function(d, indice, sufijo, completo) {
  p <- paste0(indice, "_promedio"); s <- paste0(indice, "_std")
  d |>
    filter(!is.na(.data[[p]])) |>
    group_by(ID_POLIGONO) |>
    summarise(
      media = mean(.data[[p]]),
      max = max(.data[[p]]),
      min = min(.data[[p]]),
      int = integral_trap(fecha, .data[[p]]),
      doy_max = yday(fecha[which.max(.data[[p]])]),
      std_media = if (s %in% names(d)) mean(.data[[s]], na.rm = TRUE) else NA_real_,
      .groups = "drop"
    ) |>
    select(ID_POLIGONO, if (completo) c("max", "media", "int", "doy_max", "std_media") else c("media", "max", "min")) |>
    rename_with(~ paste0(indice, "_", sufijo, "_", .x), -ID_POLIGONO)
}

dosel <- c("ndvi", "evi", "savi", "lai", "fapar")
otros_s2 <- setdiff(IDX_S2, dosel)

res_s2 <- reduce(c(
  map(dosel, ~ resumir(ciclo_s2, .x, "s2", TRUE)),
  map(otros_s2, ~ resumir(ciclo_s2, .x, "s2", FALSE))
), full_join, by = "ID_POLIGONO")
res_planet <- reduce(map(IDX_PLANET, ~ resumir(ciclo_planet, .x, "planet", TRUE)), full_join, by = "ID_POLIGONO")
res_landsat <- resumir(ciclo_landsat, "vi6t", "landsat", FALSE)

# NDVI medio por fase del ciclo (crecimiento may-jul, pico ago, madurez sep-oct). La trayectoria
# por cuartil de rendimiento (05_trayectoria_ndvi.png) muestra que la diferencia aparece al final
# del ciclo, algo que el máximo por sí solo no captura.
ndvi_fases <- function(d, sufijo) {
  d |>
    mutate(fase = case_when(
      month(fecha) %in% 5:7 ~ "media_may_jul",
      month(fecha) == 8 ~ "media_ago",
      month(fecha) %in% 9:10 ~ "media_sep_oct"
    )) |>
    filter(!is.na(fase), !is.na(ndvi_promedio)) |>
    group_by(ID_POLIGONO, fase) |>
    summarise(v = mean(ndvi_promedio), .groups = "drop") |>
    pivot_wider(names_from = fase, values_from = v, names_prefix = paste0("ndvi_", sufijo, "_"))
}
fases_s2 <- ndvi_fases(ciclo_s2, "s2")
fases_planet <- ndvi_fases(ciclo_planet, "planet")

n_obs <- parcelas["ID_POLIGONO"] |>
  left_join(count(ciclo_s2, ID_POLIGONO, name = "n_obs_s2"), by = "ID_POLIGONO") |>
  left_join(count(ciclo_landsat, ID_POLIGONO, name = "n_obs_landsat"), by = "ID_POLIGONO") |>
  left_join(count(ciclo_planet, ID_POLIGONO, name = "n_obs_planet"), by = "ID_POLIGONO") |>
  mutate(across(starts_with("n_obs"), ~ replace_na(.x, 0L)))

indices_ciclo <- parcelas["ID_POLIGONO"] |>
  left_join(n_obs, by = "ID_POLIGONO") |>
  left_join(res_s2, by = "ID_POLIGONO") |>
  left_join(fases_s2, by = "ID_POLIGONO") |>
  left_join(res_landsat, by = "ID_POLIGONO") |>
  left_join(res_planet, by = "ID_POLIGONO") |>
  left_join(fases_planet, by = "ID_POLIGONO")

stopifnot(nrow(indices_ciclo) == 197, !anyDuplicated(indices_ciclo$ID_POLIGONO))

# Marca de confiabilidad: cuántos sensores tienen al menos MIN_OBS_CICLO observaciones válidas.
indices_ciclo <- indices_ciclo |>
  mutate(sensores_confiables = (n_obs_s2 >= MIN_OBS_CICLO) + (n_obs_landsat >= MIN_OBS_CICLO) + (n_obs_planet >= MIN_OBS_CICLO))

guardar_interm(indices_ciclo, "indices_ciclo")
guardar_tab(indices_ciclo, "03_indices_ciclo")

message("\nParcelas con menos de ", MIN_OBS_CICLO, " observaciones válidas (umbral de nube ", NUBE_MAX, "):")
print(summarise(n_obs, s2 = sum(n_obs_s2 < MIN_OBS_CICLO), landsat = sum(n_obs_landsat < MIN_OBS_CICLO), planet = sum(n_obs_planet < MIN_OBS_CICLO)))
message("Columnas de la tabla de índices: ", ncol(indices_ciclo))

# ---- Figuras ------------------------------------------------------------------------------------

obs_larga <- n_obs |>
  pivot_longer(starts_with("n_obs"), names_to = "sensor", values_to = "n") |>
  mutate(sensor = recode(sensor, n_obs_s2 = "Sentinel-2", n_obs_landsat = "Landsat", n_obs_planet = "Planet"))

p_obs <- ggplot(obs_larga, aes(n)) +
  geom_histogram(binwidth = 2, boundary = 0, fill = "#2c7fb8") +
  geom_vline(xintercept = MIN_OBS_CICLO, linetype = 2, colour = "firebrick") +
  facet_wrap(~sensor, scales = "free") +
  labs(title = "Observaciones válidas por parcela en el ciclo 2025",
       subtitle = paste0("Nubosidad <= ", NUBE_MAX, " y índice presente. Línea roja: mínimo de confianza (", MIN_OBS_CICLO, ")."),
       x = "Observaciones válidas (abril–octubre 2025)", y = "Parcelas") +
  tema_ceba()
guardar_fig(p_obs, "03_obs_validas_ciclo", ancho = 9, alto = 3.5)

# Contexto: NDVI Sentinel-2 por mes del año, cada año una línea. Solo se grafica; no entra a la etiqueta.
ctx <- s2 |>
  filter(!is.na(ndvi_promedio), porcentaje_nubosidad <= NUBE_MAX) |>
  mutate(anio = factor(year(fecha)), mes = month(fecha)) |>
  group_by(anio, mes) |>
  summarise(ndvi_mediana = median(ndvi_promedio), .groups = "drop")

p_ctx <- ggplot(ctx, aes(mes, ndvi_mediana, colour = anio)) +
  annotate("rect", xmin = min(MESES_CICLO), xmax = max(MESES_CICLO), ymin = -Inf, ymax = Inf, fill = "#fee08b", alpha = .35) +
  geom_line(linewidth = .8) + geom_point(size = 1.2) +
  scale_x_continuous(breaks = 1:12, labels = month.abb) +
  labs(title = "NDVI Sentinel-2: mediana de las 197 parcelas por mes",
       subtitle = "Franja: meses del ciclo abril–octubre. 2022–2024 son contexto; la etiqueta es solo 2025.",
       x = NULL, y = "NDVI (mediana)", colour = "Año") +
  tema_ceba()
guardar_fig(p_ctx, "03_contexto_ndvi_anual")

message("03_transformacion.R terminado.")
