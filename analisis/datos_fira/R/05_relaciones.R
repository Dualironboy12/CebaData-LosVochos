# 05_relaciones.R
# KDD, etapa 4 (minería, parte descriptiva): cómo se relacionan las variables con el rendimiento.
#
# Solo se usan las 138 parcelas de ENTRENAMIENTO cuando aparece el rendimiento. Las 59 de PREDICCION
# no tienen etiqueta y no se tocan aquí.
#
# Las correlaciones se leen con dos números:
#   rho_global        Spearman entre la variable y el rendimiento en las 138 parcelas.
#   rho_intra_estado  Spearman después de restar la media de cada estado a ambas variables.
#                     Separa "esta variable distingue estados" de "distingue parcelas dentro de un estado".
# Con ~70 candidatas se reporta también el p ajustado (Benjamini-Hochberg). Es exploración, no prueba.
#
# Salidas
#   tablas/05_rendimiento_municipio.csv, 05_correlaciones.csv
#   figuras/05_*.png

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

trabajo <- leer_interm("parcelas_trabajo")
ciclo_s2 <- leer_interm("ciclo_s2")
ciclo_planet <- leer_interm("ciclo_planet")
clima_mensual <- leer_interm("clima_mensual")

entren <- trabajo |> filter(conjunto == "ENTRENAMIENTO")
stopifnot(nrow(entren) == 138, !anyNA(entren$rendimiento_t_ha))

# ---- Rendimiento: dónde y cuánto -------------------------------------------------------------------

tab_mun <- trabajo |>
  group_by(estado, municipio) |>
  summarise(
    parcelas = n(), entrenamiento = sum(conjunto == "ENTRENAMIENTO"),
    rend_media = round(media_na(rendimiento_t_ha), 2),
    rend_sd = round(sd(rendimiento_t_ha, na.rm = TRUE), 2),
    area_media_ha = round(mean(area_ha), 1),
    .groups = "drop"
  ) |>
  arrange(desc(parcelas))
guardar_tab(tab_mun, "05_rendimiento_municipio")

# Qué parte de la variación del rendimiento corresponde solo a la ubicación administrativa.
# R2 ajustado para no premiar municipios con una sola parcela.
r2aj <- function(f, d) summary(lm(f, data = d))$adj.r.squared
entren_0 <- trabajo |> filter(conjunto == "ENTRENAMIENTO")
var_ubic <- tibble(
  modelo = c("Rendimiento ~ estado", "Rendimiento ~ municipio", "Rendimiento ~ pixel de clima"),
  r2_ajustado = c(r2aj(rendimiento_t_ha ~ estado, entren_0),
                  r2aj(rendimiento_t_ha ~ municipio, entren_0),
                  r2aj(rendimiento_t_ha ~ factor(pixel_clima), entren_0)),
  grupos = c(n_distinct(entren_0$estado), n_distinct(entren_0$municipio), n_distinct(entren_0$pixel_clima))
) |> mutate(r2_ajustado = round(r2_ajustado, 3))
guardar_tab(var_ubic, "05_varianza_ubicacion")

# Mapa de parcelas (puntos; a esta escala el polígono no se distingue).
p_mapa <- ggplot(trabajo, aes(lon, lat)) +
  geom_point(data = filter(trabajo, conjunto == "PREDICCION"), colour = "grey65", shape = 4, size = 1.8) +
  geom_point(data = filter(trabajo, conjunto == "ENTRENAMIENTO"), aes(colour = rendimiento_t_ha, size = area_ha), alpha = .85) +
  scale_colour_viridis_c(option = "plasma", direction = -1, name = "t/ha") +
  scale_size_continuous(range = c(1, 5), name = "Área (ha)") +
  coord_quickmap() +
  labs(title = "Parcelas y rendimiento observado",
       subtitle = "Puntos: entrenamiento con rendimiento. Cruces grises: predicción (etiqueta oculta).",
       x = "Longitud", y = "Latitud") +
  tema_ceba() + theme(legend.box = "vertical")
guardar_fig(p_mapa, "05_mapa_rendimiento", ancho = 7, alto = 6)

p_box <- ggplot(entren, aes(estado, rendimiento_t_ha, fill = estado)) +
  geom_boxplot(outlier.shape = NA, alpha = .5) +
  geom_jitter(width = .15, height = 0, alpha = .6, size = 1.4) +
  scale_fill_manual(values = COL_ESTADO, guide = "none") +
  labs(title = "Rendimiento por estado", subtitle = "Parcelas de entrenamiento (n = 138)",
       x = NULL, y = "Rendimiento (t/ha)") +
  tema_ceba()
guardar_fig(p_box, "05_rendimiento_estado", ancho = 6, alto = 4.5)

p_hist <- ggplot(entren, aes(rendimiento_t_ha, fill = estado)) +
  geom_histogram(binwidth = .25, boundary = 0, colour = "white") +
  facet_wrap(~estado, ncol = 1, scales = "free_y") +
  scale_fill_manual(values = COL_ESTADO, guide = "none") +
  labs(title = "Distribución del rendimiento",
       subtitle = "Tlaxcala toma pocos valores distintos (2.5 a 3.5 t/ha); no es una distribución continua.",
       x = "Rendimiento (t/ha)", y = "Parcelas") +
  tema_ceba()
guardar_fig(p_hist, "05_hist_rendimiento", ancho = 6, alto = 6)

munis <- entren |> count(municipio) |> filter(n >= 5) |> pull(municipio)
p_mun <- entren |>
  filter(municipio %in% munis) |>
  mutate(municipio = fct_reorder(municipio, rendimiento_t_ha, median)) |>
  ggplot(aes(rendimiento_t_ha, municipio, fill = estado)) +
  geom_boxplot(outlier.shape = NA, alpha = .5) +
  geom_jitter(height = .15, alpha = .6, size = 1.2) +
  scale_fill_manual(values = COL_ESTADO, name = "Estado") +
  labs(title = "Rendimiento por municipio", subtitle = "Municipios con al menos 5 parcelas de entrenamiento",
       x = "Rendimiento (t/ha)", y = NULL) +
  tema_ceba()
guardar_fig(p_mun, "05_rendimiento_municipio", ancho = 7, alto = 4)

# ---- Trayectorias del ciclo ---------------------------------------------------------------------------

entren_id <- entren |>
  mutate(cuartil = cut(rendimiento_t_ha,
                       breaks = quantile(rendimiento_t_ha, 0:4 / 4), include.lowest = TRUE,
                       labels = c("Q1 (menor)", "Q2", "Q3", "Q4 (mayor)"))) |>
  select(ID_POLIGONO, estado, cuartil)

trayectoria <- bind_rows(
  ciclo_s2 |> transmute(ID_POLIGONO, fecha, ndvi = ndvi_promedio, sensor = "Sentinel-2"),
  ciclo_planet |> transmute(ID_POLIGONO, fecha, ndvi = ndvi_promedio, sensor = "Planet")
) |>
  inner_join(entren_id, by = "ID_POLIGONO") |>
  mutate(semana = CICLO_INI + 14 * (as.numeric(fecha - CICLO_INI) %/% 14)) |> # ventanas de 14 días desde el inicio del ciclo
  group_by(sensor, cuartil, estado, semana) |>
  summarise(ndvi = median(ndvi), n = n(), .groups = "drop")

p_tray <- trayectoria |>
  group_by(sensor, cuartil, semana) |>
  summarise(ndvi = weighted.mean(ndvi, n), .groups = "drop") |>
  ggplot(aes(semana, ndvi, colour = cuartil)) +
  geom_line(linewidth = .8) +
  facet_wrap(~sensor) +
  scale_colour_brewer(palette = "RdYlBu", direction = -1, name = "Cuartil de rendimiento") +
  labs(title = "Trayectoria de NDVI en el ciclo 2025 según el rendimiento",
       subtitle = "Ventanas de 2 semanas, nubosidad filtrada. Cada sensor en su panel; no se funden.",
       x = NULL, y = "NDVI (media ponderada de medianas)") +
  tema_ceba()
guardar_fig(p_tray, "05_trayectoria_ndvi", ancho = 10, alto = 4.5)

p_tray_est <- ggplot(trayectoria, aes(semana, ndvi, colour = estado, group = interaction(estado, cuartil))) +
  stat_summary(aes(group = estado), fun = median, geom = "line", linewidth = 1) +
  facet_wrap(~sensor) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  labs(title = "Trayectoria de NDVI por estado", subtitle = "Mediana de las ventanas de 2 semanas",
       x = NULL, y = "NDVI") +
  tema_ceba()
guardar_fig(p_tray_est, "05_trayectoria_ndvi_estado", ancho = 10, alto = 4.5)

# ---- Dispersión con los índices del ciclo --------------------------------------------------------------

disp_idx <- entren |>
  select(ID_POLIGONO, estado, rendimiento_t_ha, ndvi_s2_max, ndvi_planet_max, ndvi_s2_int, ndvi_planet_int) |>
  pivot_longer(c(ndvi_s2_max, ndvi_planet_max, ndvi_s2_int, ndvi_planet_int), names_to = "variable", values_to = "valor") |>
  mutate(variable = recode(variable,
    ndvi_s2_max = "NDVI Sentinel-2: máximo del ciclo", ndvi_planet_max = "NDVI Planet: máximo del ciclo",
    ndvi_s2_int = "NDVI Sentinel-2: integral del ciclo", ndvi_planet_int = "NDVI Planet: integral del ciclo"))
p_disp <- ggplot(disp_idx, aes(valor, rendimiento_t_ha)) +
  geom_point(aes(colour = estado), alpha = .75, size = 1.6) +
  geom_smooth(method = "lm", se = TRUE, colour = "grey25", linewidth = .6) +
  facet_wrap(~variable, scales = "free_x") +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  labs(title = "Rendimiento contra NDVI del ciclo", subtitle = "Recta de mínimos cuadrados global (referencia visual)",
       x = NULL, y = "Rendimiento (t/ha)") +
  tema_ceba()
guardar_fig(p_disp, "05_dispersion_ndvi", ancho = 9, alto = 7)

disp_otras <- entren |>
  select(ID_POLIGONO, estado, rendimiento_t_ha, lluvia_ciclo_mm, tmedia_ciclo_c, elevacion_m, pendiente_grados, area_ha) |>
  pivot_longer(c(lluvia_ciclo_mm, tmedia_ciclo_c, elevacion_m, pendiente_grados, area_ha), names_to = "variable", values_to = "valor") |>
  mutate(variable = recode(variable,
    lluvia_ciclo_mm = "Lluvia abr-oct 2025 (mm)", tmedia_ciclo_c = "Temperatura media abr-oct (°C)",
    elevacion_m = "Elevación (m)", pendiente_grados = "Pendiente (grados)", area_ha = "Área (ha)"))
p_otras <- ggplot(disp_otras, aes(valor, rendimiento_t_ha)) +
  geom_point(aes(colour = estado), alpha = .75, size = 1.5) +
  geom_smooth(method = "lm", se = TRUE, colour = "grey25", linewidth = .6) +
  facet_wrap(~variable, scales = "free_x", ncol = 3) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  labs(title = "Rendimiento contra clima, topografía y tamaño",
       subtitle = "El clima toma pocos valores distintos: 25 píxeles cubren las 197 parcelas.",
       x = NULL, y = "Rendimiento (t/ha)") +
  tema_ceba()
guardar_fig(p_otras, "05_dispersion_clima_topografia", ancho = 10, alto = 6)

# Clima mensual 2025 por estado.
clima_est <- clima_mensual |>
  filter(anio == 2025) |>
  inner_join(trabajo |> select(ID_POLIGONO, estado), by = "ID_POLIGONO") |>
  group_by(estado, variable, mes) |>
  summarise(valor = mean(valor), .groups = "drop") |>
  mutate(variable = recode(variable, lluvia_mm = "Lluvia (mm/mes)", tmin_c = "Tmin (°C)", tmax_c = "Tmax (°C)"))
p_clima <- ggplot(clima_est, aes(mes, valor, colour = estado)) +
  annotate("rect", xmin = min(MESES_CICLO), xmax = max(MESES_CICLO), ymin = -Inf, ymax = Inf, fill = "#fee08b", alpha = .3) +
  geom_line(linewidth = .9) +
  facet_wrap(~variable, scales = "free_y") +
  scale_x_continuous(breaks = 1:12, labels = substr(month.abb, 1, 1)) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  labs(title = "Clima mensual 2025 por estado", subtitle = "Media de las parcelas; franja: ciclo abril–octubre",
       x = NULL, y = NULL) +
  tema_ceba()
guardar_fig(p_clima, "05_clima_mensual_estado", ancho = 10, alto = 3.8)

# ---- Correlaciones con el rendimiento ------------------------------------------------------------------------

excluir <- c("ID_POLIGONO", "cultivo", "municipio", "estado", "conjunto", "rendimiento_t_ha", "lon", "lat",
             "pixel_clima", "sensores_confiables")
candidatas <- entren |>
  select(where(is.numeric)) |>
  select(-any_of(excluir), -starts_with("n_obs_")) |>
  select(where(~ sd(.x, na.rm = TRUE) > 0))

# Resta la media del estado (para ambas variables) y correlaciona los residuos.
residuo_estado <- function(x) x - ave(x, entren$estado, FUN = function(v) mean(v, na.rm = TRUE))
y <- entren$rendimiento_t_ha
y_res <- residuo_estado(y)

corr <- map_dfr(names(candidatas), function(v) {
  x <- candidatas[[v]]
  ok <- !is.na(x)
  g <- suppressWarnings(cor.test(x[ok], y[ok], method = "spearman", exact = FALSE))
  i <- suppressWarnings(cor.test(residuo_estado(x)[ok], y_res[ok], method = "spearman", exact = FALSE))
  tibble(variable = v, n = sum(ok), rho_global = unname(g$estimate), p_global = g$p.value,
         rho_intra_estado = unname(i$estimate), p_intra = i$p.value)
}) |>
  mutate(
    p_global_bh = p.adjust(p_global, "BH"),
    p_intra_bh = p.adjust(p_intra, "BH"),
    grupo = case_when(
      str_detect(variable, "_s2_") ~ "Sentinel-2", str_detect(variable, "_landsat_") ~ "Landsat",
      str_detect(variable, "_planet_") ~ "Planet", str_detect(variable, "^(lluvia|tmin|tmax|tmedia|amplitud)") ~ "Clima",
      str_detect(variable, "^(elevacion|pendiente|relieve)") ~ "Topografía", TRUE ~ "Parcela"),
    indice = str_extract(variable, "^[a-z0-9]+"),
    familia = coalesce(unname(FAMILIA[indice]), "Otra")
  ) |>
  arrange(desc(abs(rho_global)))

guardar_tab(corr |> mutate(across(where(is.numeric) & !c(n), ~ signif(.x, 3))), "05_correlaciones")

top <- corr |> slice_max(abs(rho_global), n = 25) |> mutate(variable = fct_reorder(variable, abs(rho_global)))
p_corr <- top |>
  pivot_longer(c(rho_global, rho_intra_estado), names_to = "tipo", values_to = "rho") |>
  mutate(tipo = recode(tipo, rho_global = "Global (138 parcelas)", rho_intra_estado = "Dentro de cada estado")) |>
  ggplot(aes(rho, variable, colour = tipo)) +
  geom_vline(xintercept = 0, colour = "grey60") +
  geom_point(size = 2.2) +
  scale_colour_manual(values = c("Global (138 parcelas)" = "#2c7fb8", "Dentro de cada estado" = "#d95f02"), name = NULL) +
  labs(title = "Las 25 variables más asociadas al rendimiento",
       subtitle = "Spearman. Si el punto naranja se acerca a 0, la señal global venía de diferencias entre estados.",
       x = "Correlación de Spearman con el rendimiento", y = NULL) +
  tema_ceba()
guardar_fig(p_corr, "05_correlaciones_top", ancho = 9, alto = 7)

# Mejor variable por grupo de sensor / fuente (respuesta directa a las preguntas guía).
mejor <- corr |>
  group_by(grupo) |>
  slice_max(abs(rho_global), n = 1, with_ties = FALSE) |>
  ungroup() |>
  select(grupo, variable, rho_global, rho_intra_estado)
guardar_tab(mejor |> mutate(across(where(is.numeric), ~ signif(.x, 3))), "05_mejor_por_fuente")

message("\nTop 12 por |rho| global:")
print(corr |> slice_head(n = 12) |> select(variable, rho_global, rho_intra_estado, p_global_bh), n = Inf)
message("\nMejor por fuente:")
print(mejor, n = Inf)
message("05_relaciones.R terminado.")
