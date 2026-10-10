# 13_despensa_multianio.R
# Congela la despensa multi-año: bloque A = ciclo etiqueta 2025 (igual que nube30_v1)
# y bloque B = contexto abr–oct 2022–2024 (índices clave + lluvia), sin inventar Planet histórico.
#
# Salidas (dataset_entrenamiento/despensa/):
#   parcelas_despensa_multianio_nube30_v1.csv
#   parcelas_despensa_multianio_nube30_v1_diccionario.csv
#   MANIFIESTO_MULTIANIO.md

Sys.setenv(CEBA_CARRIL = "fira")
source("analisis/R/00_setup.R")

DIR_DESPENSA <- file.path("dataset_entrenamiento", "despensa")
CSV_2025 <- file.path(DIR_DESPENSA, "parcelas_despensa_nube30_v1.csv")
DIC_2025 <- file.path(DIR_DESPENSA, "parcelas_despensa_nube30_v1_diccionario.csv")
OUT_CSV <- file.path(DIR_DESPENSA, "parcelas_despensa_multianio_nube30_v1.csv")
OUT_DIC <- file.path(DIR_DESPENSA, "parcelas_despensa_multianio_nube30_v1_diccionario.csv")
OUT_MAN <- file.path(DIR_DESPENSA, "MANIFIESTO_MULTIANIO.md")

stopifnot(file.exists(CSV_2025), file.exists(DIC_2025))

bloque_a <- read_csv(CSV_2025, show_col_types = FALSE, na = c("", "NA"))
dic_a <- read_csv(DIC_2025, show_col_types = FALSE)
stopifnot(nrow(bloque_a) == 197, !anyDuplicated(bloque_a$ID_POLIGONO))

parcelas <- leer_interm("parcelas_base")
s2 <- leer_interm("serie_s2")
landsat <- leer_interm("serie_landsat")
clima_mensual <- leer_interm("clima_mensual")

ANIOS_HIST <- 2022:2024

# ---- Utilidades (misma lógica que 03_transformacion.R) ---------------------------------------

integral_trap <- function(fecha, y) {
  o <- order(fecha)
  f <- as.numeric(fecha[o])
  y <- y[o]
  if (length(f) < 2) return(NA_real_)
  sum(diff(f) * (head(y, -1) + tail(y, -1)) / 2)
}

ciclo_anio <- function(d, anio, ref) {
  d |>
    filter(
      fecha >= as.Date(sprintf("%d-04-01", anio)),
      fecha <= as.Date(sprintf("%d-10-31", anio)),
      !is.na(.data[[ref]]),
      porcentaje_nubosidad <= NUBE_MAX
    )
}

# ---- Bloque B: satélite histórico ------------------------------------------------------------

res_ndvi_anio <- function(anio) {
  d <- ciclo_anio(s2, anio, "ndvi_promedio")
  sep_oct <- d |>
    filter(month(fecha) %in% 9:10) |>
    group_by(ID_POLIGONO) |>
    summarise(media_sep_oct = mean(ndvi_promedio), .groups = "drop")
  base <- d |>
    group_by(ID_POLIGONO) |>
    summarise(
      max = max(ndvi_promedio),
      int = integral_trap(fecha, ndvi_promedio),
      .groups = "drop"
    )
  parcelas["ID_POLIGONO"] |>
    left_join(base, by = "ID_POLIGONO") |>
    left_join(sep_oct, by = "ID_POLIGONO") |>
    rename_with(~ paste0("ndvi_s2_", .x, "_", anio), -ID_POLIGONO)
}

res_crc_anio <- function(anio) {
  d <- ciclo_anio(s2, anio, "crc_promedio")
  d |>
    group_by(ID_POLIGONO) |>
    summarise(media = mean(crc_promedio), .groups = "drop") |>
    right_join(parcelas["ID_POLIGONO"], by = "ID_POLIGONO") |>
    transmute(ID_POLIGONO, !!paste0("crc_s2_media_", anio) := media)
}

res_vi6t_anio <- function(anio) {
  d <- ciclo_anio(landsat, anio, "vi6t_promedio")
  d |>
    group_by(ID_POLIGONO) |>
    summarise(max = max(vi6t_promedio), .groups = "drop") |>
    right_join(parcelas["ID_POLIGONO"], by = "ID_POLIGONO") |>
    transmute(ID_POLIGONO, !!paste0("vi6t_landsat_max_", anio) := max)
}

res_lluvia_anio <- function(anio) {
  clima_mensual |>
    filter(anio == !!anio, mes %in% MESES_CICLO, variable == "lluvia_mm") |>
    group_by(ID_POLIGONO) |>
    summarise(lluvia = sum(valor), .groups = "drop") |>
    right_join(parcelas["ID_POLIGONO"], by = "ID_POLIGONO") |>
    transmute(ID_POLIGONO, !!paste0("lluvia_ciclo_mm_", anio) := lluvia)
}

bloque_b <- reduce(
  c(
    map(ANIOS_HIST, res_ndvi_anio),
    map(ANIOS_HIST, res_crc_anio),
    map(ANIOS_HIST, res_vi6t_anio),
    map(ANIOS_HIST, res_lluvia_anio)
  ),
  full_join,
  by = "ID_POLIGONO"
)

# Agregados históricos (media de años con dato; NA si ninguno)
media_hist <- function(df, prefijo, anios = ANIOS_HIST) {
  cols <- paste0(prefijo, "_", anios)
  stopifnot(all(cols %in% names(df)))
  rowMeans(as.matrix(df[cols]), na.rm = TRUE) |>
    replace(rowSums(!is.na(df[cols])) == 0, NA_real_)
}

bloque_b <- bloque_b |>
  mutate(
    ndvi_s2_max_hist_media = media_hist(bloque_b, "ndvi_s2_max"),
    ndvi_s2_int_hist_media = media_hist(bloque_b, "ndvi_s2_int"),
    ndvi_s2_media_sep_oct_hist_media = media_hist(bloque_b, "ndvi_s2_media_sep_oct"),
    crc_s2_media_hist_media = media_hist(bloque_b, "crc_s2_media"),
    vi6t_landsat_max_hist_media = media_hist(bloque_b, "vi6t_landsat_max"),
    lluvia_ciclo_mm_hist_media = media_hist(bloque_b, "lluvia_ciclo_mm")
  )

cols_b <- setdiff(names(bloque_b), "ID_POLIGONO")
stopifnot(length(cols_b) >= 15, length(cols_b) <= 30)

# ---- Ensamble -------------------------------------------------------------------------------

despensa <- bloque_a |>
  left_join(bloque_b, by = "ID_POLIGONO") |>
  select(all_of(names(bloque_a)), all_of(cols_b))

stopifnot(
  nrow(despensa) == 197,
  !anyDuplicated(despensa$ID_POLIGONO),
  identical(despensa$ID_POLIGONO, bloque_a$ID_POLIGONO),
  sum(despensa$conjunto == "PREDICCION" & !is.na(despensa$rendimiento_t_ha)) == 0,
  sum(despensa$conjunto == "ENTRENAMIENTO" & is.na(despensa$rendimiento_t_ha)) == 0
)

# Diccionario: bloque A + descripciones del bloque B
dic_b <- tibble(
  columna = cols_b,
  grupo = case_when(
    str_detect(columna, "^lluvia_") ~ "clima_historico",
    str_detect(columna, "hist_media") ~ "contexto_historico",
    str_detect(columna, "landsat") ~ "landsat_historico",
    TRUE ~ "sentinel2_historico"
  ),
  descripcion = case_when(
    str_detect(columna, "^ndvi_s2_max_20") ~
      paste0("NDVI Sentinel-2 máximo del ciclo abr–oct ", str_extract(columna, "20\\d{2}"),
             " (nube <= ", NUBE_MAX, ")."),
    str_detect(columna, "^ndvi_s2_int_20") ~
      paste0("Integral NDVI Sentinel-2 del ciclo abr–oct ", str_extract(columna, "20\\d{2}"), "."),
    str_detect(columna, "^ndvi_s2_media_sep_oct_20") ~
      paste0("NDVI Sentinel-2 medio sep–oct ", str_extract(columna, "20\\d{2}"), "."),
    str_detect(columna, "^crc_s2_media_20") ~
      paste0("CRC Sentinel-2 medio del ciclo abr–oct ", str_extract(columna, "20\\d{2}"), "."),
    str_detect(columna, "^vi6t_landsat_max_20") ~
      paste0("VI6T Landsat máximo del ciclo abr–oct ", str_extract(columna, "20\\d{2}"), "."),
    str_detect(columna, "^lluvia_ciclo_mm_20") ~
      paste0("Lluvia acumulada abr–oct ", str_extract(columna, "20\\d{2}"), " (mm)."),
    columna == "ndvi_s2_max_hist_media" ~ "Media de ndvi_s2_max en 2022–2024 (años con dato).",
    columna == "ndvi_s2_int_hist_media" ~ "Media de ndvi_s2_int en 2022–2024 (años con dato).",
    columna == "ndvi_s2_media_sep_oct_hist_media" ~
      "Media de ndvi_s2_media_sep_oct en 2022–2024 (años con dato).",
    columna == "crc_s2_media_hist_media" ~ "Media de crc_s2_media en 2022–2024 (años con dato).",
    columna == "vi6t_landsat_max_hist_media" ~ "Media de vi6t_landsat_max en 2022–2024 (años con dato).",
    columna == "lluvia_ciclo_mm_hist_media" ~ "Media de lluvia_ciclo_mm en 2022–2024.",
    TRUE ~ "Contexto histórico multi-año."
  )
)

dic <- bind_rows(dic_a, dic_b)
stopifnot(setequal(dic$columna, names(despensa)))

write_csv(despensa, OUT_CSV, na = "")
write_csv(dic, OUT_DIC, na = "")

sha_csv <- system2("sha256sum", OUT_CSV, stdout = TRUE) |> str_split_1("\\s+") |> first()
sha_dic <- system2("sha256sum", OUT_DIC, stdout = TRUE) |> str_split_1("\\s+") |> first()

man <- paste0(
  "# Manifiesto — despensa multi-año `multianio_nube30_v1`\n\n",
  "Despensa con **bloque A** (ciclo etiqueta 2025, idéntico a `nube30_v1`) y **bloque B** ",
  "(contexto abr–oct 2022–2024). La etiqueta sigue siendo el rendimiento 2025; en predicción queda vacío.\n\n",
  "| Campo | Valor |\n| --- | --- |\n",
  "| Archivo | `parcelas_despensa_multianio_nube30_v1.csv` |\n",
  "| Diccionario | `parcelas_despensa_multianio_nube30_v1_diccionario.csv` |\n",
  "| Versión | v1 |\n",
  "| Fecha de congelación | ", format(Sys.Date()), " |\n",
  "| Origen bloque A | copia de `parcelas_despensa_nube30_v1.csv` |\n",
  "| Origen bloque B | series Básico + clima mensual (`intermedio/`), `NUBE_MAX = ", NUBE_MAX, "` |\n",
  "| Cómo regenerar | `Rscript analisis/datos_fira/R/13_despensa_multianio.R` desde la raíz |\n",
  "| Dimensión | ", nrow(despensa), " filas × ", ncol(despensa), " columnas |\n",
  "| Columnas bloque B | ", length(cols_b), " |\n",
  "| Llave | `ID_POLIGONO` |\n",
  "| Umbral de nube | `NUBE_MAX = ", NUBE_MAX, "` |\n",
  "| Ciclo etiqueta | abril–octubre 2025 |\n",
  "| Contexto histórico | abr–oct 2022, 2023, 2024 (NA si no hay observaciones) |\n",
  "| Planet histórico | no se inventa (Planet solo existe en 2025, bloque A) |\n",
  "| Partición | 138 ENTRENAMIENTO / 59 PREDICCION |\n",
  "| SHA-256 CSV | `", sha_csv, "` |\n",
  "| SHA-256 diccionario | `", sha_dic, "` |\n\n",
  "## Bloque B (lista cerrada)\n\n",
  paste0("- `", cols_b, "`", collapse = "\n"), "\n\n",
  "## Reglas\n\n",
  "- No editar este archivo. Un cambio de criterio genera `multianio_nube30_v2`.\n",
  "- `rendimiento_t_ha` vacío = etiqueta oculta; no rellenar.\n",
  "- La despensa `nube30_v1` (solo 2025) no se modifica; es la base de `solo2025`.\n"
)
writeLines(man, OUT_MAN)

message("Despensa multi-año: ", nrow(despensa), " × ", ncol(despensa),
        " → ", OUT_CSV)
message("Bloque B (", length(cols_b), " cols): ", paste(cols_b, collapse = ", "))
message("13_despensa_multianio.R terminado.")
