# Fuentes externas usadas en la matriz curada

Las capas crudas y el detalle de licencia/CRS viven en [`../../DATASETS_EXTERNOS/`](../../DATASETS_EXTERNOS/). Aquí solo se anota qué entra a los CSVs de `curados_extendidos/`.

| Fuente | Producto alineado a parcela | Columnas en la matriz (\(E\)) | Documentación |
| --- | --- | --- | --- |
| INEGI edafología | `parcelas_despensa_extendida_edaf_v1.csv` | `edaf_grupo` (Vertisol/Andosol → `otros`) | [`../../DATASETS_EXTERNOS/despensa_extendida/README.md`](../../DATASETS_EXTERNOS/despensa_extendida/README.md), KDD [`../../analisis/RESUMEN_DATOS_INEGI.md`](../../analisis/RESUMEN_DATOS_INEGI.md) |
| SoilGrids 2.0 | `parcelas_despensa_extendida_soilgrids_v1.csv` | `sg_nitrogen_0-5cm_mean`, `sg_cec_0-5cm_mean`, `sg_silt_0-5cm_mean` | [`../../DATASETS_EXTERNOS/soilgrids/`](../../DATASETS_EXTERNOS/soilgrids/), KDD [`../../analisis/RESUMEN_DATOS_SOILGRIDS.md`](../../analisis/RESUMEN_DATOS_SOILGRIDS.md) |

Join: `ID_POLIGONO` (`AGC_###`). No se copian las 336 capas ni la textura INEGI completa a esta carpeta; el generador selecciona el subconjunto \(E\).
