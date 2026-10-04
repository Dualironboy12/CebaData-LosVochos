# 08_relaciones_edaf.R
# Relación entre el tipo de suelo (edafología INEGI) y el rendimiento de las parcelas.
#
# Es análisis exploratorio y descriptivo, igual que 05_relaciones.R. Solo se usan las 138 parcelas de
# ENTRENAMIENTO cuando aparece el rendimiento. Las 59 de PREDICCION no tienen etiqueta y solo se
# dibujan en el mapa como cruces grises.
#
# Ojo con la lectura: el suelo está entrelazado con el estado (Umbrisol solo en Hidalgo, Andosol
# solo en Tlaxcala). Por eso cada comparación se repite dentro del estado.
#
# Entradas
#   DATASETS_EXTERNOS/despensa_extendida/parcelas_despensa_extendida_edaf_v1.csv (script 07)
#   intermedio/edaf_recorte.rds, edaf_parcelas_sf.rds (script 07)
# Salidas
#   tablas/08_rendimiento_por_suelo.csv, 08_suelo_por_estado.csv, 08_pruebas_suelo.csv, 08_r2_suelo.csv
#   figuras/08_rendimiento_suelo.png, 08_mapa_suelo_rendimiento.png, 08_mapa_suelo_rendimiento_estados.png
#
# Ejecutar desde la raíz del repo:  Rscript analisis/datos_inegi/R/08_relaciones_edaf.R

Sys.setenv(CEBA_CARRIL = "inegi")
source("analisis/R/00_setup.R")

ext <- read_csv(RUTA_EXT$extendida, show_col_types = FALSE, guess_max = 1000)
stopifnot(nrow(ext) == 197, !anyNA(ext$edaf_grupo))

# Nombres de suelo en formato legible (PHAEOZEM -> Phaeozem).
ext <- ext |> mutate(across(c(edaf_grupo, edaf_textura), str_to_sentence))
entren <- ext |> filter(conjunto == "ENTRENAMIENTO")
stopifnot(nrow(entren) == 138, !anyNA(entren$rendimiento_t_ha))

# ---- Tablas descriptivas ---------------------------------------------------------------------------

resumir <- function(d, variable) {
  d |>
    group_by(nivel = .data[[variable]]) |>
    summarise(n = n(), media = round(mean(rendimiento_t_ha), 2), sd = round(sd(rendimiento_t_ha), 2),
              mediana = round(median(rendimiento_t_ha), 2), minimo = min(rendimiento_t_ha),
              maximo = max(rendimiento_t_ha), .groups = "drop") |>
    mutate(variable = variable, .before = 1) |>
    arrange(desc(n))
}
tab_suelo <- bind_rows(resumir(entren, "edaf_grupo"), resumir(entren, "edaf_textura"))
guardar_tab(tab_suelo, "08_rendimiento_por_suelo")
print(tab_suelo)

# Suelo por estado: parcelas totales, con etiqueta y rendimiento medio de las etiquetadas.
tab_estado <- ext |>
  group_by(estado, edaf_grupo) |>
  summarise(parcelas = n(), entrenamiento = sum(conjunto == "ENTRENAMIENTO"),
            prediccion = sum(conjunto == "PREDICCION"),
            rend_media = round(mean(rendimiento_t_ha, na.rm = TRUE), 2), .groups = "drop") |>
  mutate(rend_media = ifelse(entrenamiento == 0, NA, rend_media)) |>
  arrange(estado, desc(parcelas))
guardar_tab(tab_estado, "08_suelo_por_estado")
print(tab_estado)

# ---- Pruebas (exploratorias) -----------------------------------------------------------------------
# Kruskal-Wallis con eta^2 por rango: (H - k + 1) / (n - k). Con grupos de 2 a 4 parcelas es solo una pista.

kw <- function(y, g, etiqueta, detalle) {
  g <- droplevels(factor(g))
  k <- nlevels(g); n <- length(y)
  if (k < 2) return(NULL)
  t <- kruskal.test(y ~ g)
  tibble(prueba = etiqueta, detalle = detalle, grupos = k, n = n,
         estadistico = round(unname(t$statistic), 3), gl = unname(t$parameter),
         p = signif(t$p.value, 3), eta2 = round(max(0, (unname(t$statistic) - k + 1) / (n - k)), 3))
}

# Rendimiento sin la media de su estado: quita lo que el suelo comparte con el estado.
entren <- entren |> group_by(estado) |> mutate(rend_resid = rendimiento_t_ha - mean(rendimiento_t_ha)) |> ungroup()

pruebas <- bind_rows(
  kw(entren$rendimiento_t_ha, entren$edaf_grupo, "Kruskal-Wallis", "Rendimiento ~ grupo de suelo (global)"),
  kw(entren$rendimiento_t_ha, entren$edaf_textura, "Kruskal-Wallis", "Rendimiento ~ textura (global)"),
  kw(entren$rend_resid, entren$edaf_grupo, "Kruskal-Wallis", "Rendimiento sin media de estado ~ grupo de suelo"),
  kw(entren$rend_resid, entren$edaf_textura, "Kruskal-Wallis", "Rendimiento sin media de estado ~ textura"),
  # Comparaciones dentro de un estado: solo donde hay al menos 5 parcelas por nivel.
  map_dfr(unique(entren$estado), function(e) {
    d <- entren |> filter(estado == e)
    validos <- d |> count(edaf_grupo) |> filter(n >= 5) |> pull(edaf_grupo)
    d <- d |> filter(edaf_grupo %in% validos)
    if (n_distinct(d$edaf_grupo) < 2) return(NULL)
    kw(d$rendimiento_t_ha, d$edaf_grupo, "Kruskal-Wallis",
       paste0("Dentro de ", e, ": ", paste(sort(unique(d$edaf_grupo)), collapse = " vs "), " (niveles con n >= 5)"))
  })
)
guardar_tab(pruebas, "08_pruebas_suelo")
print(pruebas)

# R2 ajustado: cuánto añade el suelo a lo que ya explica el estado.
r2aj <- function(f) summary(lm(f, data = entren))$adj.r.squared
m_estado <- lm(rendimiento_t_ha ~ estado, data = entren)
m_ambos <- lm(rendimiento_t_ha ~ estado + edaf_grupo, data = entren)
m_ambos_tex <- lm(rendimiento_t_ha ~ estado + edaf_textura, data = entren)
r2_suelo <- tibble(
  modelo = c("Rendimiento ~ estado", "Rendimiento ~ grupo de suelo", "Rendimiento ~ textura",
             "Rendimiento ~ estado + grupo de suelo", "Rendimiento ~ estado + textura"),
  r2_ajustado = round(c(r2aj(rendimiento_t_ha ~ estado), r2aj(rendimiento_t_ha ~ edaf_grupo),
                        r2aj(rendimiento_t_ha ~ edaf_textura), r2aj(rendimiento_t_ha ~ estado + edaf_grupo),
                        r2aj(rendimiento_t_ha ~ estado + edaf_textura)), 3),
  p_aporte_suelo = c(NA, NA, NA, signif(anova(m_estado, m_ambos)$`Pr(>F)`[2], 3),
                     signif(anova(m_estado, m_ambos_tex)$`Pr(>F)`[2], 3))
)
guardar_tab(r2_suelo, "08_r2_suelo")
print(r2_suelo)

# ---- Figura: rendimiento por suelo -----------------------------------------------------------------

etiq <- function(d, v) d |> add_count(.data[[v]], name = "n_nivel") |>
  mutate(nivel = paste0(.data[[v]], "\n(n=", n_nivel, ")"), variable = v)
largo <- bind_rows(etiq(entren, "edaf_grupo"), etiq(entren, "edaf_textura")) |>
  mutate(variable = recode(variable, edaf_grupo = "Grupo de suelo (WRB)", edaf_textura = "Textura"),
         nivel = fct_reorder(nivel, n_nivel, .desc = TRUE))

p_box <- ggplot(largo, aes(nivel, rendimiento_t_ha)) +
  geom_boxplot(outlier.shape = NA, fill = NA, colour = "grey30", width = .55) +
  geom_jitter(aes(colour = estado), width = .15, height = 0, size = 1.8, alpha = .8) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  facet_wrap(~ variable, scales = "free_x") +
  labs(title = "Rendimiento según el suelo de la parcela",
       subtitle = "138 parcelas de entrenamiento. El color indica el estado: el suelo y el estado van muy ligados.",
       x = NULL, y = "Rendimiento (t/ha)") +
  tema_ceba()
guardar_fig(p_box, "08_rendimiento_suelo", ancho = 10, alto = 5)

# ---- Mapa: suelo de fondo y rendimiento encima -----------------------------------------------------

edaf_c <- leer_interm("edaf_recorte") |> mutate(edaf_grupo = str_to_sentence(edaf_grupo))
parc <- leer_interm("edaf_parcelas_sf") |>
  select(ID_POLIGONO) |>
  left_join(select(ext, ID_POLIGONO, estado, conjunto, rendimiento_t_ha), by = "ID_POLIGONO")
pts <- parc |> st_centroid() |> suppressWarnings()

grupos_parcela <- ext |> count(edaf_grupo, sort = TRUE) |> pull(edaf_grupo)
paleta_suelo <- c(Phaeozem = "#e8dcb5", Planosol = "#a9cce3", Umbrisol = "#b5d99c",
                  Vertisol = "#cdb4db", Andosol = "#f9c58b", Otros = "#e6e6e6")
edaf_c <- edaf_c |>
  mutate(suelo = factor(ifelse(edaf_grupo %in% grupos_parcela, edaf_grupo, "Otros"),
                        levels = c(grupos_parcela, "Otros")))

mapa <- function(caja, titulo, subtitulo = NULL, tam = 2.6) {
  ggplot() +
    geom_sf(data = edaf_c, aes(fill = suelo), colour = "white", linewidth = .15) +
    geom_sf(data = filter(pts, conjunto == "PREDICCION"), colour = "grey25", shape = 4, size = tam * .6) +
    geom_sf(data = filter(pts, conjunto == "ENTRENAMIENTO"), colour = "black", size = tam + .9) +
    geom_sf(data = filter(pts, conjunto == "ENTRENAMIENTO"), aes(colour = rendimiento_t_ha), size = tam) +
    scale_fill_manual(values = paleta_suelo, name = "Grupo de suelo", drop = TRUE) +
    scale_colour_viridis_c(option = "plasma", direction = -1, name = "Rendimiento (t/ha)") +
    coord_sf(xlim = c(caja["xmin"], caja["xmax"]), ylim = c(caja["ymin"], caja["ymax"]), expand = FALSE) +
    labs(title = titulo, subtitle = subtitulo) +
    tema_ceba() +
    theme(legend.box = "vertical", axis.text = element_text(size = 7))
}
ampliar <- function(b, m) c(xmin = unname(b["xmin"]) - m, xmax = unname(b["xmax"]) + m,
                            ymin = unname(b["ymin"]) - m, ymax = unname(b["ymax"]) + m)

p_mapa <- mapa(ampliar(st_bbox(pts), 6000), "Suelo (INEGI) y rendimiento observado por parcela",
               "Fondo: grupo de suelo 1:250 000. Puntos: rendimiento de entrenamiento. Cruces: predicción (sin etiqueta).")
guardar_fig(p_mapa, "08_mapa_suelo_rendimiento", ancho = 9, alto = 8)

# Un acercamiento por estado (a escala 1:250 000 las parcelas casi se amontonan en el mapa general).
if (requireNamespace("patchwork", quietly = TRUE)) {
  por_estado <- map(c("Hidalgo", "Puebla", "Tlaxcala"), function(e) {
    mapa(ampliar(st_bbox(filter(pts, estado == e)), 4000), e, tam = 2.2)
  })
  p_estados <- patchwork::wrap_plots(por_estado, nrow = 1) +
    patchwork::plot_layout(guides = "collect") +
    patchwork::plot_annotation(title = "Suelo y rendimiento por estado",
                               subtitle = "Misma paleta y escala de color que el mapa general.") &
    theme(legend.position = "bottom")
  guardar_fig(p_estados, "08_mapa_suelo_rendimiento_estados", ancho = 14, alto = 6)
} else {
  message("patchwork no está instalado: se omite el mapa por estado.")
}

message("08_relaciones_edaf.R terminado.")
