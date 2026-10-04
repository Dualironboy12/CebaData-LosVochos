# 11_relaciones_soilgrids.R
# Correlaciones SoilGrids ↔ rendimiento, heatmaps y mapas de las mejores variables.
#
# Ejecutar desde la raíz:  Rscript analisis/datos_soilgrids/R/11_relaciones_soilgrids.R

Sys.setenv(CEBA_CARRIL = "soilgrids")
source("analisis/R/00_setup.R")

ext <- leer_interm("parcelas_soilgrids")
entren <- ext |> filter(conjunto == "ENTRENAMIENTO")
stopifnot(nrow(entren) == 138)

cols_sg <- grep("^sg_", names(ext), value = TRUE)
# Solo numéricas con variación
cols_sg <- cols_sg[map_lgl(cols_sg, \(c) is.numeric(entren[[c]]) && n_distinct(entren[[c]], na.rm = TRUE) > 1)]

spearman <- function(x, y) {
  ok <- complete.cases(x, y)
  if (sum(ok) < 10) return(list(rho = NA_real_, p = NA_real_, n = sum(ok)))
  t <- cor.test(x[ok], y[ok], method = "spearman", exact = FALSE)
  list(rho = unname(t$estimate), p = t$p.value, n = sum(ok))
}

# Residuos sin media de estado
entren <- entren |> group_by(estado) |>
  mutate(rend_resid = rendimiento_t_ha - mean(rendimiento_t_ha)) |> ungroup()

corr <- map_dfr(cols_sg, function(v) {
  g <- spearman(entren[[v]], entren$rendimiento_t_ha)
  i <- spearman(entren[[v]], entren$rend_resid)
  capa <- sub("^sg_", "", v)
  tibble(
    variable = v, capa = capa,
    servicio = if (grepl("_", capa)) sub("_.*$", "", capa) else "wrb",
    estadistico = case_when(
      grepl("_mean$", capa) ~ "mean",
      grepl("_Q0\\.05$", capa) ~ "Q0.05",
      grepl("_Q0\\.5$", capa) ~ "Q0.5",
      grepl("_Q0\\.95$", capa) ~ "Q0.95",
      grepl("_uncertainty$", capa) ~ "uncertainty",
      TRUE ~ "otro"
    ),
    profundidad = str_extract(capa, "\\d+-\\d+cm|0-30cm"),
    n = g$n, rho_global = g$rho, p_global = g$p,
    rho_intra_estado = i$rho, p_intra = i$p
  )
}) |>
  mutate(
    p_global_bh = p.adjust(p_global, "BH"),
    p_intra_bh = p.adjust(p_intra, "BH"),
    n_distintos = map_int(variable, \(v) n_distinct(entren[[v]], na.rm = TRUE))
  ) |>
  arrange(desc(abs(rho_intra_estado)))
guardar_tab(corr, "11_correlaciones")

# Heatmap: mean por servicio × profundidad (rho intra)
heat <- corr |>
  filter(estadistico == "mean", !is.na(profundidad)) |>
  mutate(profundidad = factor(profundidad, levels = c("0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm", "0-30cm")))
p_heat <- ggplot(heat, aes(profundidad, servicio, fill = rho_intra_estado)) +
  geom_tile(colour = "white") +
  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", midpoint = 0,
                       name = "ρ intra-estado") +
  labs(title = "SoilGrids (mean): correlación con rendimiento dentro del estado",
       subtitle = "138 parcelas de entrenamiento. Spearman tras restar la media de cada estado.",
       x = "Profundidad", y = "Servicio") +
  tema_ceba() + theme(axis.text.x = element_text(angle = 45, hjust = 1))
guardar_fig(p_heat, "11_heatmap_mean_intra", ancho = 9, alto = 6)

# Heatmap todos los estadísticos (top servicios por |rho| medio)
top_serv <- corr |> filter(estadistico == "mean") |>
  group_by(servicio) |> summarise(m = mean(abs(rho_intra_estado), na.rm = TRUE), .groups = "drop") |>
  slice_max(m, n = 8) |> pull(servicio)
heat2 <- corr |> filter(servicio %in% top_serv, !is.na(profundidad) | estadistico == "otro") |>
  mutate(etiqueta = if_else(is.na(profundidad), estadistico, paste0(profundidad, "\n", estadistico)))
p_heat2 <- ggplot(filter(corr, servicio %in% top_serv, estadistico != "otro"),
                  aes(estadistico, paste(servicio, profundidad), fill = rho_intra_estado)) +
  geom_tile(colour = "white") +
  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", midpoint = 0, name = "ρ intra") +
  labs(title = "Correlación intra-estado por estadístico (servicios con más señal)",
       x = "Estadístico", y = NULL) +
  tema_ceba() + theme(axis.text.y = element_text(size = 7))
guardar_fig(p_heat2, "11_heatmap_estadisticos", ancho = 8, alto = 10)

# Top 15 para barras
top15 <- corr |> slice_max(abs(rho_intra_estado), n = 15)
p_bar <- ggplot(top15, aes(reorder(capa, abs(rho_intra_estado)), rho_intra_estado, fill = servicio)) +
  geom_col() + coord_flip() +
  labs(title = "15 capas con mayor |ρ| intra-estado vs rendimiento",
       x = NULL, y = "ρ Spearman (intra-estado)", fill = "Servicio") +
  tema_ceba()
guardar_fig(p_bar, "11_top_correlaciones", ancho = 9, alto = 6)

# Mapas de las 6 mejores mean
top6 <- corr |> filter(estadistico == "mean") |> slice_max(abs(rho_intra_estado), n = 6) |> pull(variable)
pts <- st_as_sf(ext, coords = c("lon", "lat"), crs = 4326)
mapas <- map(top6, function(v) {
  ggplot(pts) +
    geom_sf(data = filter(pts, conjunto == "PREDICCION"), colour = "grey60", shape = 4, size = 1.5) +
    geom_sf(data = filter(pts, conjunto == "ENTRENAMIENTO"), aes(colour = .data[[v]]), size = 2) +
    scale_colour_viridis_c(option = "plasma", name = sub("^sg_", "", v)) +
    labs(title = sub("^sg_", "", v)) + tema_ceba() +
    theme(legend.key.width = unit(1.2, "lines"), axis.text = element_text(size = 6))
})
if (requireNamespace("patchwork", quietly = TRUE)) {
  p_map <- patchwork::wrap_plots(mapas, ncol = 3) +
    patchwork::plot_annotation(title = "Top 6 capas mean (ρ intra-estado) sobre las parcelas")
  guardar_fig(p_map, "11_mapas_top6", ancho = 12, alto = 8)
} else {
  walk2(mapas, top6, \(p, v) guardar_fig(p, paste0("11_mapa_", sub("^sg_", "", v)), ancho = 5, alto = 5))
}

# Comparación WRB con INEGI si existe
if (file.exists(RUTA_EXT$extendida) && "sg_MostProbable" %in% names(ext)) {
  edaf <- read_csv(RUTA_EXT$extendida, show_col_types = FALSE) |>
    select(ID_POLIGONO, edaf_grupo)
  # MostProbable en SoilGrids suele ser código entero; documentar distribución
  wrb_tab <- ext |>
    left_join(edaf, by = "ID_POLIGONO") |>
    count(edaf_grupo, sg_MostProbable, name = "parcelas")
  guardar_tab(wrb_tab, "11_wrb_vs_inegi")
}

message("11_relaciones_soilgrids.R terminado.")
