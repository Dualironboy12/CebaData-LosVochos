# 06_patrones.R
# KDD, etapa 4 (minería, parte de estructura): qué variables repiten la misma información y qué
# perfiles de parcela aparecen. Es descriptivo: no predice rendimiento ni ajusta modelos.
#
# Usa las 197 parcelas porque las variables explicativas existen en las dos particiones y aquí
# no interviene la etiqueta, salvo para leer después el rendimiento medio de cada grupo (solo las
# de ENTRENAMIENTO).
#
# Salidas
#   tablas/06_pares_redundantes.csv, 06_grupos_redundantes.csv, 06_pca_varianza.csv,
#          06_pca_cargas.csv, 06_pca_vs_rendimiento.csv, 06_perfiles_parcelas.csv, 06_perfiles_resumen.csv
#   figuras/06_*.png

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

K_PERFILES <- 4        # número de perfiles de parcela; se justifica con el dendrograma
UMBRAL_REDUNDANCIA <- 0.90 # |rho| a partir del cual dos variables se consideran redundantes

trabajo <- leer_interm("parcelas_trabajo")

excluir <- c("ID_POLIGONO", "cultivo", "municipio", "estado", "conjunto", "rendimiento_t_ha", "lon", "lat",
             "pixel_clima", "sensores_confiables")
X <- trabajo |>
  select(where(is.numeric)) |>
  select(-any_of(excluir), -starts_with("n_obs_")) |>
  select(where(~ sd(.x, na.rm = TRUE) > 0))
# Sin imputación: si una parcela no tiene observaciones limpias en alguna fase, esa variable queda vacía.
# La redundancia usa correlaciones por pares; el PCA y los perfiles necesitan filas completas.
filas_ok <- complete.cases(X)
message("Variables candidatas: ", ncol(X), " sobre ", nrow(X), " parcelas; ",
        sum(!filas_ok), " con algún vacío (", paste(trabajo$ID_POLIGONO[!filas_ok], collapse = ", "), ").")

# ---- Redundancia entre variables ----------------------------------------------------------------------------

R <- cor(X, method = "spearman", use = "pairwise.complete.obs")

pares <- which(upper.tri(R) & abs(R) >= UMBRAL_REDUNDANCIA, arr.ind = TRUE) |>
  as_tibble() |>
  transmute(variable_a = colnames(R)[col], variable_b = rownames(R)[row], rho = R[cbind(row, col)]) |>
  arrange(desc(abs(rho)))
guardar_tab(pares |> mutate(rho = round(rho, 3)), "06_pares_redundantes")

# Grupos: componentes conectados del grafo de redundancia (|rho| >= umbral).
hc_vars <- hclust(as.dist(1 - abs(R)), method = "average")
grupo_id <- cutree(hc_vars, h = 1 - UMBRAL_REDUNDANCIA)
grupos <- tibble(variable = names(grupo_id), grupo = unname(grupo_id)) |>
  group_by(grupo) |>
  mutate(tamano = n()) |>
  ungroup() |>
  filter(tamano > 1) |>
  arrange(desc(tamano), grupo, variable)
guardar_tab(grupos, "06_grupos_redundantes")

# Cuántas variables independientes quedan si se conserva una por grupo.
n_grupos_total <- n_distinct(grupo_id)
message("Con |rho| >= ", UMBRAL_REDUNDANCIA, ", las ", ncol(X), " variables se reducen a ", n_grupos_total, " grupos.")

# Mapa de calor ordenado por el agrupamiento (solo los nombres se ven si hay pocos).
ord <- hc_vars$order
R_larga <- as_tibble(R[ord, ord], rownames = "a") |>
  pivot_longer(-a, names_to = "b", values_to = "rho") |>
  mutate(a = factor(a, levels = colnames(R)[ord]), b = factor(b, levels = colnames(R)[ord]))
p_heat <- ggplot(R_larga, aes(a, b, fill = rho)) +
  geom_raster() +
  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", limits = c(-1, 1), name = "Spearman") +
  labs(title = "Correlación entre variables candidatas",
       subtitle = paste0("Ordenadas por agrupamiento jerárquico. ", ncol(X), " variables, ", n_grupos_total,
                         " grupos con |rho| >= ", UMBRAL_REDUNDANCIA, "."),
       x = NULL, y = NULL) +
  tema_ceba() +
  theme(axis.text.x = element_text(angle = 90, hjust = 1, vjust = .5, size = 4.5),
        axis.text.y = element_text(size = 4.5), panel.grid = element_blank())
guardar_fig(p_heat, "06_correlacion_variables", ancho = 11, alto = 10)

# ---- PCA exploratorio ----------------------------------------------------------------------------------------------------

trabajo <- trabajo[filas_ok, ]
X <- X[filas_ok, ]
pca <- prcomp(X, center = TRUE, scale. = TRUE)
varianza <- tibble(
  componente = paste0("PC", seq_along(pca$sdev)),
  n = seq_along(pca$sdev),
  varianza = pca$sdev^2 / sum(pca$sdev^2)
) |> mutate(acumulada = cumsum(varianza))
guardar_tab(varianza |> slice_head(n = 15) |> mutate(across(c(varianza, acumulada), ~ round(.x, 4))), "06_pca_varianza")

p_scree <- varianza |> slice_head(n = 15) |>
  ggplot(aes(n, varianza)) +
  geom_col(fill = "#4575b4") +
  geom_line(aes(y = acumulada), colour = "firebrick") + geom_point(aes(y = acumulada), colour = "firebrick") +
  scale_y_continuous(labels = percent) +
  labs(title = "PCA: varianza explicada", subtitle = "Barras: por componente. Línea roja: acumulada. Variables estandarizadas.",
       x = "Componente", y = "Varianza") +
  tema_ceba()
guardar_fig(p_scree, "06_pca_varianza", ancho = 7, alto = 4)

scores <- as_tibble(pca$x[, 1:6]) |> bind_cols(trabajo |> select(ID_POLIGONO, estado, municipio, conjunto, rendimiento_t_ha))
cargas <- as_tibble(pca$rotation[, 1:4], rownames = "variable") |>
  pivot_longer(-variable, names_to = "componente", values_to = "carga")
cargas_top <- cargas |>
  group_by(componente) |>
  slice_max(abs(carga), n = 8) |>
  ungroup()
guardar_tab(cargas_top |> mutate(carga = round(carga, 3)), "06_pca_cargas")

pct <- function(i) sprintf("PC%d (%.1f%%)", i, 100 * varianza$varianza[i])
p_pca <- ggplot(scores, aes(PC1, PC2)) +
  geom_point(aes(colour = estado, shape = conjunto), size = 2.1, alpha = .85) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  scale_shape_manual(values = c(ENTRENAMIENTO = 16, PREDICCION = 4), name = "Conjunto") +
  labs(title = "Parcelas en las dos primeras componentes", subtitle = "Las cruces (predicción) caen dentro de la nube de entrenamiento si el reparto es representativo.",
       x = pct(1), y = pct(2)) +
  tema_ceba()
guardar_fig(p_pca, "06_pca_parcelas", ancho = 8, alto = 6)

pca_rend <- scores |>
  filter(conjunto == "ENTRENAMIENTO") |>
  summarise(across(PC1:PC6, ~ cor(.x, rendimiento_t_ha, method = "spearman"))) |>
  pivot_longer(everything(), names_to = "componente", values_to = "rho_rendimiento") |>
  mutate(rho_rendimiento = round(rho_rendimiento, 3))
guardar_tab(pca_rend, "06_pca_vs_rendimiento")

# ---- Perfiles de parcela -------------------------------------------------------------------------------------------------------------

# Agrupamiento jerárquico (Ward) sobre las componentes que suman ~90 % de la varianza.
n_pc <- which(varianza$acumulada >= .90)[1]
Z <- pca$x[, 1:n_pc, drop = FALSE]
hc_par <- hclust(dist(Z), method = "ward.D2")

# Alturas de fusión: un salto grande antes de K sugiere ese número de grupos.
alturas <- tibble(k = 2:10, altura = rev(hc_par$height)[1:9])
p_dend_h <- ggplot(alturas, aes(k, altura)) +
  geom_line() + geom_point() +
  geom_vline(xintercept = K_PERFILES, linetype = 2, colour = "firebrick") +
  scale_x_continuous(breaks = 2:10) +
  labs(title = "Agrupamiento de parcelas: altura de fusión según el número de grupos",
       subtitle = paste0("Línea roja: K = ", K_PERFILES, ". Un codo marca el punto donde unir más grupos cuesta mucho."),
       x = "Número de perfiles", y = "Altura (Ward)") +
  tema_ceba()
guardar_fig(p_dend_h, "06_perfiles_codo", ancho = 7, alto = 4)

perfil <- cutree(hc_par, k = K_PERFILES)
perfiles <- trabajo |>
  transmute(ID_POLIGONO, estado, municipio, conjunto, rendimiento_t_ha) |>
  mutate(perfil = paste0("P", unname(perfil)))
guardar_tab(perfiles |> select(ID_POLIGONO, perfil), "06_perfiles_parcelas")

resumen_perfil <- perfiles |>
  group_by(perfil) |>
  summarise(
    parcelas = n(),
    hidalgo = sum(estado == "Hidalgo"), puebla = sum(estado == "Puebla"), tlaxcala = sum(estado == "Tlaxcala"),
    entrenamiento = sum(conjunto == "ENTRENAMIENTO"), prediccion = sum(conjunto == "PREDICCION"),
    rend_media = round(media_na(rendimiento_t_ha), 2),
    rend_sd = round(sd(rendimiento_t_ha, na.rm = TRUE), 2),
    .groups = "drop"
  )
guardar_tab(resumen_perfil, "06_perfiles_resumen")

# Qué variables caracterizan cada perfil (media estandarizada; se muestran las de mayor contraste).
Xz <- scale(X) |> as_tibble() |> mutate(perfil = perfiles$perfil)
caract <- Xz |>
  pivot_longer(-perfil, names_to = "variable", values_to = "z") |>
  group_by(perfil, variable) |>
  summarise(z = mean(z), .groups = "drop") |>
  group_by(variable) |>
  mutate(contraste = max(z) - min(z)) |>
  ungroup()
vars_top <- caract |> distinct(variable, contraste) |> slice_max(contraste, n = 18) |> pull(variable)
p_car <- caract |>
  filter(variable %in% vars_top) |>
  mutate(variable = fct_reorder(variable, contraste)) |>
  ggplot(aes(perfil, variable, fill = z)) +
  geom_tile(colour = "white") +
  geom_text(aes(label = sprintf("%.1f", z)), size = 3) +
  scale_fill_gradient2(low = "#2166ac", mid = "white", high = "#b2182b", name = "z medio") +
  labs(title = "Qué distingue a cada perfil", subtitle = "Media estandarizada de las 18 variables con mayor contraste entre perfiles.",
       x = NULL, y = NULL) +
  tema_ceba()
guardar_fig(p_car, "06_perfiles_caracteristicas", ancho = 7, alto = 6)

p_pf <- scores |>
  mutate(perfil = perfiles$perfil) |>
  ggplot(aes(PC1, PC2, colour = perfil)) +
  geom_point(aes(shape = conjunto), size = 2.1, alpha = .85) +
  scale_shape_manual(values = c(ENTRENAMIENTO = 16, PREDICCION = 4), name = "Conjunto") +
  labs(title = paste0("Perfiles de parcela (K = ", K_PERFILES, ")"), x = pct(1), y = pct(2), colour = "Perfil") +
  tema_ceba()
guardar_fig(p_pf, "06_perfiles_pca", ancho = 8, alto = 6)

p_pr <- perfiles |>
  filter(conjunto == "ENTRENAMIENTO") |>
  ggplot(aes(perfil, rendimiento_t_ha, fill = perfil)) +
  geom_boxplot(alpha = .5, outlier.shape = NA) +
  geom_jitter(aes(colour = estado), width = .15, height = 0, size = 1.5, alpha = .8) +
  scale_colour_manual(values = COL_ESTADO, name = "Estado") +
  guides(fill = "none") +
  labs(title = "Rendimiento por perfil de parcela", subtitle = "Los perfiles se formaron sin usar el rendimiento.",
       x = NULL, y = "Rendimiento (t/ha)") +
  tema_ceba()
guardar_fig(p_pr, "06_perfiles_rendimiento", ancho = 7, alto = 5)

kw <- kruskal.test(rendimiento_t_ha ~ perfil, data = filter(perfiles, conjunto == "ENTRENAMIENTO"))
resumen <- tibble(
  dato = c("variables_candidatas", "parcelas_en_pca", "grupos_redundantes_umbral", "grupos_con_mas_de_una_variable",
           "componentes_90pct", "k_perfiles", "kruskal_chi2", "kruskal_p"),
  valor = c(ncol(X), nrow(X), n_grupos_total, n_distinct(grupos$grupo), n_pc, K_PERFILES,
            round(unname(kw$statistic), 3), signif(kw$p.value, 3))
)
guardar_tab(resumen, "06_resumen")

message("\nKruskal-Wallis rendimiento ~ perfil: chi2 = ", round(kw$statistic, 2), ", p = ", signif(kw$p.value, 3))
message("Componentes usadas para el agrupamiento: ", n_pc, " (>= 90 % de la varianza).")
message("Perfiles:"); print(resumen_perfil)
message("PCA vs rendimiento:"); print(pca_rend)
message("06_patrones.R terminado.")
