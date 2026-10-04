# 07_despensa_extendida_edaf.R
# Despensa extendida: une la edafología INEGI (1:250 000, Serie II) a la despensa congelada (nube 30).
#
# Para cada parcela se elige el polígono de suelo con mayor área de intersección y se copian sus
# atributos. No se imputa nada y no se modifica la despensa del reto.
#
# Entradas
#   dataset_entrenamiento/despensa/parcelas_despensa_nube30_v1.csv (+ diccionario)
#   DATASET_RETO_AGRO_2026/Parcelas_Reto_AGC_CONJUNTO_70_30/ (parcelas, EPSG:4326)
#   DATASETS_EXTERNOS/INEGI_EDAFOLOGIA_2025/ (shapefile sin .prj; se asigna EPSG:6372)
# Salidas
#   DATASETS_EXTERNOS/despensa_extendida/parcelas_despensa_extendida_edaf_v1.csv (+ _diccionario.csv)
#   tablas/07_edaf_join_resumen.csv
#   intermedio/edaf_recorte.rds, edaf_parcelas_sf.rds (los usa 08_relaciones_edaf.R)
#
# Ejecutar desde la raíz del repo:  Rscript analisis/R/07_despensa_extendida_edaf.R

source("analisis/R/00_setup.R")

BUFFER_M <- 5000 # margen alrededor de las parcelas al recortar la edafología

# ---- Despensa base ---------------------------------------------------------------------------------

base <- read_csv(RUTA_EXT$despensa, show_col_types = FALSE, guess_max = 1000)
base_dic <- read_csv(RUTA_EXT$despensa_dic, show_col_types = FALSE)
stopifnot(nrow(base) == 197, n_distinct(base$ID_POLIGONO) == 197)

# ---- Parcelas y edafología -------------------------------------------------------------------------

parc <- st_read(RUTA$parcelas, quiet = TRUE) |>
  st_zm() |>
  transmute(ID_POLIGONO = ID_POLIGON) |>
  st_transform(CRS_EDAF) |>
  st_make_valid()
stopifnot(setequal(parc$ID_POLIGONO, base$ID_POLIGONO))
parc$area_m2 <- as.numeric(st_area(parc))

message("Leyendo edafología nacional (puede tardar)...")
edaf <- suppressWarnings(st_read(RUTA_EXT$edafologia, quiet = TRUE)) |> st_set_crs(CRS_EDAF)
campos <- c(edaf_grupo = "N_G1", edaf_grupo_cod = "GRUPO1", edaf_textura = "TEXTURA",
            edaf_clase_tex = "CLASE_TEX", edaf_clave_wrb = "CLAVE_WRB")
stopifnot(all(campos %in% names(edaf)))

zona <- st_as_sfc(st_bbox(parc)) |> st_buffer(BUFFER_M)
edaf_c <- edaf[lengths(st_intersects(edaf, zona)) > 0, unname(campos)] |>
  rename(!!!setNames(unname(campos), names(campos)))
rm(edaf)
if (!all(st_is_valid(edaf_c))) edaf_c <- st_make_valid(edaf_c)
edaf_c$edaf_poligono <- seq_len(nrow(edaf_c))
message("Polígonos de suelo en el área de las parcelas (+", BUFFER_M / 1000, " km): ", nrow(edaf_c))

# ---- Intersección y polígono dominante -------------------------------------------------------------

inter <- suppressWarnings(st_intersection(parc, edaf_c))
inter$area_inter_m2 <- as.numeric(st_area(inter))

dominante <- inter |>
  st_drop_geometry() |>
  group_by(ID_POLIGONO) |>
  arrange(desc(area_inter_m2), .by_group = TRUE) |>
  mutate(n_poligonos_suelo = n()) |>
  slice_head(n = 1) |>
  ungroup() |>
  mutate(edaf_fraccion_area = round(pmin(area_inter_m2 / area_m2, 1), 4)) |>
  select(ID_POLIGONO, all_of(names(campos)), edaf_fraccion_area, n_poligonos_suelo, edaf_poligono)

# Parcelas sin intersección (no debería haber ninguna) quedan con NA en las columnas edaf_*.
sin_suelo <- setdiff(base$ID_POLIGONO, dominante$ID_POLIGONO)
if (length(sin_suelo) > 0) warning("Parcelas sin polígono de suelo: ", paste(sin_suelo, collapse = ", "))

ext <- base |>
  left_join(select(dominante, -n_poligonos_suelo, -edaf_poligono), by = "ID_POLIGONO")

# ---- Comprobaciones --------------------------------------------------------------------------------

stopifnot(
  nrow(ext) == 197,
  identical(ext$ID_POLIGONO, base$ID_POLIGONO),
  sum(!is.na(ext$rendimiento_t_ha)) == 138,
  all(is.na(ext$rendimiento_t_ha[ext$conjunto == "PREDICCION"])),
  all(ext$conjunto[is.na(ext$rendimiento_t_ha)] == "PREDICCION"),
  # las columnas originales no cambian
  isTRUE(all.equal(ext[names(base)], base, check.attributes = FALSE))
)
n_sin_grupo <- sum(is.na(ext$edaf_grupo))
message("Parcelas sin grupo de suelo: ", n_sin_grupo)
stopifnot(n_sin_grupo == 0)

# ---- Tabla de control ------------------------------------------------------------------------------

resumen <- ext |>
  left_join(select(dominante, ID_POLIGONO, n_poligonos_suelo), by = "ID_POLIGONO") |>
  group_by(edaf_grupo) |>
  summarise(
    parcelas = n(),
    entrenamiento = sum(conjunto == "ENTRENAMIENTO"),
    prediccion = sum(conjunto == "PREDICCION"),
    claves_wrb = n_distinct(edaf_clave_wrb),
    estados = paste(sort(unique(estado)), collapse = " / "),
    fraccion_area_min = min(edaf_fraccion_area),
    fraccion_area_mediana = round(median(edaf_fraccion_area), 4),
    parcelas_con_varios_suelos = sum(n_poligonos_suelo > 1),
    .groups = "drop"
  ) |>
  arrange(desc(parcelas))
guardar_tab(resumen, "07_edaf_join_resumen")
print(resumen)
message("Fracción de área: mínimo ", min(ext$edaf_fraccion_area), ", mediana ", median(ext$edaf_fraccion_area),
        "; polígonos de suelo distintos usados: ", n_distinct(dominante$edaf_poligono))

# ---- Escritura del CSV extendido y su diccionario --------------------------------------------------

dir.create(DIR_DESP_EXT, recursive = TRUE, showWarnings = FALSE)
write_csv(ext, RUTA_EXT$extendida, na = "")

dic_edaf <- tibble(
  columna = c("edaf_grupo", "edaf_grupo_cod", "edaf_textura", "edaf_clase_tex", "edaf_clave_wrb", "edaf_fraccion_area"),
  grupo = "Edafología (INEGI)",
  descripcion = c(
    "Grupo de suelo principal (INEGI N_G1, clasificación WRB) del polígono dominante en la parcela",
    "Código del grupo de suelo principal (INEGI GRUPO1)",
    "Textura de la unidad de suelo (INEGI TEXTURA)",
    "Clase textural codificada por INEGI (CLASE_TEX); en esta zona coincide con la textura: 2 = media, 3 = fina",
    "Clave WRB completa de la unidad: grupo y calificadores (INEGI CLAVE_WRB)",
    "Fracción de la parcela cubierta por el polígono de suelo elegido (0 a 1); el polígono es el de mayor intersección"
  )
)
dic <- bind_rows(
  mutate(base_dic, fuente = "Reto (despensa nube 30 v1)"),
  mutate(dic_edaf, fuente = "INEGI edafología 1:250 000 Serie II")
)
stopifnot(setequal(dic$columna, names(ext)))
write_csv(dic, RUTA_EXT$extendida_dic, na = "")
message("CSV extendido: ", RUTA_EXT$extendida, " (", nrow(ext), " x ", ncol(ext), ")")

# ---- Intermedios para el análisis (08) -------------------------------------------------------------

guardar_interm(edaf_c, "edaf_recorte")
guardar_interm(left_join(parc, select(ext, ID_POLIGONO, edaf_grupo), by = "ID_POLIGONO"), "edaf_parcelas_sf")

message("07_despensa_extendida_edaf.R terminado.")
