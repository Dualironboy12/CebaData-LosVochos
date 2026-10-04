# 12_patrones_soilgrids.R
# Redundancia, PCA exploratorio y ranking de variables SoilGrids a incluir.
#
# Ejecutar desde la raíz:  Rscript analisis/datos_soilgrids/R/12_patrones_soilgrids.R

Sys.setenv(CEBA_CARRIL = "soilgrids")
source("analisis/R/00_setup.R")

ext <- leer_interm("parcelas_soilgrids")
corr <- read_csv(file.path(DIR_TAB, "11_correlaciones.csv"), show_col_types = FALSE)
entren <- ext |> filter(conjunto == "ENTRENAMIENTO")
cols <- corr$variable
cols <- cols[map_lgl(cols, \(c) n_distinct(entren[[c]], na.rm = TRUE) >= 5)]

# Matriz de correlaciones entre variables (mean únicamente, para legibilidad)
cols_mean <- corr |> filter(estadistico == "mean", variable %in% cols) |> pull(variable)
M <- entren |> select(all_of(cols_mean)) |> as.matrix()
R <- cor(M, use = "pairwise.complete.obs", method = "spearman")

# Pares redundantes |ρ| >= 0.9
pares <- which(abs(R) >= 0.9 & upper.tri(R), arr.ind = TRUE)
pares_df <- if (nrow(pares) == 0) {
  tibble(v1 = character(), v2 = character(), rho = double())
} else {
  tibble(v1 = rownames(R)[pares[, 1]], v2 = colnames(R)[pares[, 2]],
         rho = R[pares]) |> arrange(desc(abs(rho)))
}
guardar_tab(pares_df, "12_pares_redundantes")

# Agrupación por umbral |ρ| >= 0.9 (componentes conexas)
adj <- abs(R) >= 0.9
diag(adj) <- TRUE
visitado <- setNames(rep(FALSE, nrow(adj)), rownames(adj))
lista <- list(); gid <- 0L
for (v in rownames(adj)) {
  if (visitado[[v]]) next
  gid <- gid + 1L
  cola <- v
  membros <- character()
  while (length(cola)) {
    u <- cola[[1]]; cola <- cola[-1]
    if (isTRUE(visitado[[u]])) next
    visitado[[u]] <- TRUE
    membros <- c(membros, u)
    vecinos <- names(which(adj[u, ]))
    cola <- c(cola, vecinos[!visitado[vecinos]])
  }
  lista[[gid]] <- membros
}
grupos_df <- map_dfr(seq_along(lista), \(i) tibble(variable = lista[[i]], grupo = i, tamano = length(lista[[i]])))
guardar_tab(grupos_df, "12_grupos_redundantes")

# Heatmap de correlación entre mean (orden por clustering)
ord <- hclust(as.dist(1 - abs(R)), method = "average")$order
R_ord <- R[ord, ord]
heat_long <- as_tibble(R_ord, rownames = "v1") |>
  pivot_longer(-v1, names_to = "v2", values_to = "rho") |>
  mutate(v1 = factor(v1, levels = rownames(R_ord)), v2 = factor(v2, levels = colnames(R_ord)))
p_heat <- ggplot(heat_long, aes(v1, v2, fill = rho)) +
  geom_tile() +
  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", midpoint = 0, name = "ρ") +
  labs(title = "Correlación entre capas SoilGrids (mean)",
       subtitle = "Ordenadas por agrupamiento jerárquico. |ρ| ≥ 0.9 = casi la misma señal.",
       x = NULL, y = NULL) +
  tema_ceba() + theme(axis.text = element_blank(), axis.ticks = element_blank())
guardar_fig(p_heat, "12_correlacion_variables", ancho = 8, alto = 7)

# PCA sobre mean estandarizadas (entrenamiento + predicción, complete cases)
X <- ext |> select(ID_POLIGONO, conjunto, rendimiento_t_ha, all_of(cols_mean))
ok <- complete.cases(X[cols_mean])
Xok <- X[ok, ]
Z <- scale(as.matrix(Xok[cols_mean]))
pca <- prcomp(Z, center = FALSE, scale. = FALSE)
var_exp <- tibble(componente = paste0("PC", seq_along(pca$sdev)),
                  varianza = pca$sdev^2 / sum(pca$sdev^2),
                  acumulada = cumsum(varianza))
guardar_tab(var_exp, "12_pca_varianza")
scores <- as_tibble(pca$x[, 1:min(6, ncol(pca$x))]) |>
  mutate(ID_POLIGONO = Xok$ID_POLIGONO, conjunto = Xok$conjunto, rendimiento_t_ha = Xok$rendimiento_t_ha)
p_pca <- ggplot(scores, aes(PC1, PC2)) +
  geom_point(data = filter(scores, conjunto == "PREDICCION"), colour = "grey60", shape = 4) +
  geom_point(data = filter(scores, conjunto == "ENTRENAMIENTO"), aes(colour = rendimiento_t_ha), alpha = .85) +
  scale_colour_viridis_c(option = "plasma", direction = -1, name = "t/ha") +
  labs(title = "PCA de capas SoilGrids (mean)",
       subtitle = "Puntos: entrenamiento. Cruces: predicción.") +
  tema_ceba()
guardar_fig(p_pca, "12_pca_parcelas", ancho = 7, alto = 6)

# Ranking consolidado
rep_grupo <- grupos_df |> group_by(grupo) |>
  left_join(corr |> select(variable, rho_intra_estado, p_intra_bh, rho_global, p_global_bh, n_distintos, estadistico, servicio),
            by = "variable") |>
  arrange(desc(abs(rho_intra_estado))) |>
  slice_head(n = 1) |>
  ungroup()

ranking <- corr |>
  left_join(grupos_df |> select(variable, grupo, tamano), by = "variable") |>
  mutate(
    es_representante = variable %in% rep_grupo$variable,
    recomendacion = case_when(
      n_distintos < 10 ~ "descartar_poca_variacion",
      estadistico == "uncertainty" & (is.na(p_intra_bh) | p_intra_bh > 0.1) ~ "solo_control_calidad",
      !is.na(p_intra_bh) & p_intra_bh < 0.1 & abs(rho_intra_estado) >= 0.15 & es_representante ~ "incluir",
      !is.na(p_intra_bh) & p_intra_bh < 0.1 & abs(rho_intra_estado) >= 0.15 & !es_representante ~ "redundante_de_incluido",
      !is.na(p_global_bh) & p_global_bh < 0.05 & abs(rho_global) >= 0.2 & abs(rho_intra_estado) < 0.1 ~ "proxy_de_estado",
      estadistico == "mean" & es_representante & abs(rho_intra_estado) >= 0.1 ~ "considerar",
      TRUE ~ "descartar"
    )
  ) |>
  arrange(desc(abs(rho_intra_estado)), desc(abs(rho_global)))
guardar_tab(ranking, "12_ranking_variables")

incluir <- ranking |> filter(recomendacion == "incluir") |>
  select(variable, capa, servicio, profundidad, estadistico,
         rho_intra_estado, p_intra_bh, rho_global, n_distintos)
# si muy pocas, ampliar con "considerar" top
if (nrow(incluir) < 5) {
  incluir <- ranking |> filter(recomendacion %in% c("incluir", "considerar")) |>
    slice_head(n = 15) |>
    select(variable, capa, servicio, profundidad, estadistico,
           rho_intra_estado, p_intra_bh, rho_global, n_distintos)
}
guardar_tab(incluir, "12_variables_recomendada")

resumen <- tibble(
  n_capas_analizadas = nrow(corr),
  n_mean = sum(corr$estadistico == "mean", na.rm = TRUE),
  n_grupos_redundantes = n_distinct(grupos_df$grupo),
  n_incluir = sum(ranking$recomendacion == "incluir"),
  n_considerar = sum(ranking$recomendacion == "considerar"),
  n_proxy_estado = sum(ranking$recomendacion == "proxy_de_estado"),
  pc1_var = round(var_exp$varianza[1], 3),
  pc5_acum = round(var_exp$acumulada[min(5, nrow(var_exp))], 3)
)
guardar_tab(resumen, "12_resumen")
print(incluir, n = 30)
message("12_patrones_soilgrids.R terminado.")
