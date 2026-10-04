"""Lista qué ofrece SoilGrids y prueba una descarga pequeña sobre las parcelas.

Uso (con el entorno activado, desde la raíz del repo):
    python DATASETS_EXTERNOS/soilgrids/explorar_disponibles.py

Escribe en DATASETS_EXTERNOS/soilgrids/temporal/ (no se versiona):
    disponibles.json      servicios, capas, CRS y extensión de cada servicio
    prueba_*.tif          descargas de prueba sobre el área de las parcelas
"""
import json
from pathlib import Path

import pandas as pd
from pyproj import Transformer
from soilgrids import SoilGrids

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
TEMP = AQUI / "temporal"
TEMP.mkdir(exist_ok=True)

CRS_IGH = "urn:ogc:def:crs:EPSG::152160"  # Homolosine interrumpida, la nativa de SoilGrids (250 m)
IGH_PROJ = "+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs"

sg = SoilGrids()

# ---- 1. Qué hay disponible ---------------------------------------------------------------
disponibles = {}
for servicio, info in SoilGrids.MAP_SERVICES.items():
    wcs, capas = SoilGrids._get_service_and_coverage_list(servicio)
    obj = SoilGrids._get_coverage_obj(wcs, capas, capas[0])
    disponibles[servicio] = {
        "nombre": info["name"],
        "unidades": info["units"],
        "url": info["link"],
        "n_capas": len(capas),
        "capas": list(capas),
        "crs_soportados": [c.getcodeurn() for c in obj.supportedCRS],
        "extension_nativa": [
            {"srs": b["nativeSrs"], "bbox": [float(x) for x in b["bbox"]]} for b in obj.boundingboxes
        ],
    }
    print(f"{servicio:9s} {info['name']:<48s} {len(capas):3d} capas", flush=True)

(TEMP / "disponibles.json").write_text(json.dumps(disponibles, indent=1, ensure_ascii=False), encoding="utf-8")

# ---- 2. Descarga de prueba sobre las parcelas ---------------------------------------------
csv = RAIZ / "DATASETS_EXTERNOS" / "despensa_extendida" / "parcelas_despensa_extendida_edaf_v1.csv"
p = pd.read_csv(csv, usecols=["lon", "lat"])
tr = Transformer.from_crs("EPSG:4326", IGH_PROJ, always_xy=True)
x, y = tr.transform(p["lon"].to_numpy(), p["lat"].to_numpy())
margen = 1500  # m
west, east = float(x.min()) - margen, float(x.max()) + margen
south, north = float(y.min()) - margen, float(y.max()) + margen
print(f"\nCaja de las parcelas en Homolosine (m): W={west:.0f} S={south:.0f} E={east:.0f} N={north:.0f}")

for servicio, capa in [("phh2o", "phh2o_0-5cm_mean"), ("clay", "clay_0-5cm_mean")]:
    salida = TEMP / f"prueba_{capa}.tif"
    datos = sg.get_coverage_data(
        service_id=servicio, coverage_id=capa, crs=CRS_IGH,
        west=west, south=south, east=east, north=north, output=str(salida),
    )
    v = datos.values[0]
    validos = v[v != datos.rio.nodata] if datos.rio.nodata is not None else v
    print(f"{capa}: forma={datos.shape}, resolución={sg.metadata['grid_res']}, nodata={datos.rio.nodata}, "
          f"min={validos.min()}, mediana={sorted(validos.ravel())[validos.size // 2]}, max={validos.max()}, "
          f"archivo={salida.stat().st_size / 1024:.0f} KB")
