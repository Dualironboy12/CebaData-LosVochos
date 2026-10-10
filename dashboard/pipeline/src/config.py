"""Configuracion central del pipeline del Reto AgroCebada 2026.

Todas las rutas y parametros viven aqui para que cualquiera del equipo
pueda correr el pipeline cambiando una sola cosa: RUTA_DATASET.
"""
from pathlib import Path

# Ruta a la carpeta DATASET_RETO_AGRO_2026 descomprimida (con los zips internos ya extraidos).
# Por defecto es una carpeta DATASET_RETO_AGRO_2026/ a la altura de pipeline/ (en el repo CebaData-LosVochos ya viene incluida; aqui hay que copiarla).
RUTA_DATASET = Path(__file__).resolve().parents[2] / "DATASET_RETO_AGRO_2026"


def _dir_con(base, *candidatos):
    """Devuelve el primer candidato que exista; el zip del reto anida carpetas de forma distinta segun como se descomprima."""
    for c in candidatos:
        if (base / c).exists():
            return base / c
    return base / candidatos[0]


# Carpeta donde el pipeline escribe sus salidas
RUTA_SALIDAS = Path(__file__).resolve().parents[1] / "salidas"

# --- Archivos de entrada -------------------------------------------------
SHAPEFILE = RUTA_DATASET / "Parcelas_Reto_AGC_CONJUNTO_70_30" / "Parcelas_Reto_AGC_CONJUNTO.shp"
CSV_RENDIMIENTO = RUTA_DATASET / "ID_area_rendimiento_70_30_Reto_AgroCebada.csv"
CSV_BASICO = RUTA_DATASET / "Conjunto_datos_BASICO_AgroCebada2026.csv"
CSV_PRO = RUTA_DATASET / "Conjunto_datos_PRO_AgroCebada.csv"

DIR_PRECIPITACION = _dir_con(
    RUTA_DATASET,
    "Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025/Precipitacion_mensual",
    "Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025/Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025/Precipitacion_mensual")
DIR_TEMPERATURA = _dir_con(
    RUTA_DATASET,
    "Reto_AgroCebada_Temperatura_2022_2025",
    "Reto_AgroCebada_Temperatura_2022_2025_RECORTADA_CHIRPS/Reto_AgroCebada_Temperatura_2022_2025")
DIR_TOPOGRAFIA = _dir_con(
    RUTA_DATASET,
    "Reto_AgroCebada_Topografia_INEGI_CEM4/Reto_AgroCebada_Topografia_INEGI_CEM4",
    "Reto_AgroCebada_Topografia_INEGI_CEM4/Reto_AgroCebada_Topografia_INEGI_CEM4/Reto_AgroCebada_Topografia_INEGI_CEM4")

# --- Parametros metodologicos (documentados en el reporte) ---------------
# Umbral de nubosidad: una observacion se considera limpia si su porcentaje
# de nubosidad es estrictamente menor a este valor. Con 20 % el EDA mostro
# que practicamente no quedan indices nulos y se conserva una mediana de 32
# observaciones S2 por parcela dentro del ciclo.
UMBRAL_NUBOSIDAD = 20.0

# Ciclo de produccion al que corresponde el rendimiento (abril a octubre 2025)
CICLO_INICIO = "2025-04-01"
CICLO_FIN = "2025-10-31"

# Anios cubiertos por los rasters climaticos
ANIOS_CLIMA = [2022, 2023, 2024, 2025]

# CRS de trabajo para operaciones metricas (el de los rasters del CEM)
CRS_METRICO = "EPSG:6372"

TOTAL_PARCELAS = 197
N_ENTRENAMIENTO = 138
N_PREDICCION = 59
