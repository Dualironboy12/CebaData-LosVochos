"""Descarga las 336 capas de SoilGrids al área de las parcelas del reto.

Uso (desde la raíz del repo, con el venv de esta carpeta):
  env -i HOME=$HOME PATH=/usr/bin:/bin \\
    DATASETS_EXTERNOS/soilgrids/.venv/bin/python \\
    DATASETS_EXTERNOS/soilgrids/descargar_capas.py

Reanuda: si el .tif ya existe y pesa > 0, lo salta (salvo --force).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd
from pyproj import Transformer
from soilgrids import SoilGrids

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
DIR_DATOS = AQUI / "datos"
DIR_DATOS.mkdir(exist_ok=True)

CRS_IGH = "urn:ogc:def:crs:EPSG::152160"
IGH_PROJ = "+proj=igh +lat_0=0 +lon_0=0 +datum=WGS84 +units=m +no_defs"
MARGEN_M = 1500
NODATA = -32768

# Factores: valor_real = entero / factor (FAQ ISRIC / SoilGrids 2.0).
FACTORES = {
    "bdod": 100, "cec": 10, "cfvo": 10, "clay": 10, "nitrogen": 100,
    "phh2o": 10, "sand": 10, "silt": 10, "soc": 10, "ocs": 1, "ocd": 10, "wrb": 1,
}


def bbox_parcelas() -> tuple[float, float, float, float]:
    csv = RAIZ / "DATASETS_EXTERNOS" / "despensa_extendida" / "parcelas_despensa_extendida_edaf_v1.csv"
    if not csv.exists():
        csv = RAIZ / "dataset_entrenamiento" / "despensa" / "parcelas_despensa_nube30_v1.csv"
    p = pd.read_csv(csv, usecols=["lon", "lat"])
    tr = Transformer.from_crs("EPSG:4326", IGH_PROJ, always_xy=True)
    x, y = tr.transform(p["lon"].to_numpy(), p["lat"].to_numpy())
    return (
        float(x.min()) - MARGEN_M,
        float(y.min()) - MARGEN_M,
        float(x.max()) + MARGEN_M,
        float(y.max()) + MARGEN_M,
    )


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Re-descargar aunque exista el .tif")
    ap.add_argument("--servicio", default=None, help="Solo un service_id (prueba)")
    args = ap.parse_args()

    west, south, east, north = bbox_parcelas()
    print(f"Bbox Homolosine (m): W={west:.0f} S={south:.0f} E={east:.0f} N={north:.0f}")

    sg = SoilGrids()
    servicios = list(SoilGrids.MAP_SERVICES)
    if args.servicio:
        servicios = [args.servicio]

    manifiesto = {
        "fecha": date.today().isoformat(),
        "crs": CRS_IGH,
        "bbox_m": {"west": west, "south": south, "east": east, "north": north},
        "margen_m": MARGEN_M,
        "resolucion_m": [250, 250],
        "nodata": NODATA,
        "factores": FACTORES,
        "cita": "Poggio et al. (2021) SoilGrids 2.0, SOIL 7, 217–240. https://doi.org/10.5194/soil-7-217-2021",
        "licencia": "CC BY 4.0 (ISRIC SoilGrids)",
        "capas": {},
    }

    total = ok = skip = fail = 0
    for servicio in servicios:
        _, capas = SoilGrids._get_service_and_coverage_list(servicio)
        for capa in capas:
            total += 1
            out = DIR_DATOS / f"{capa}.tif"
            if out.exists() and out.stat().st_size > 0 and not args.force:
                skip += 1
                manifiesto["capas"][capa] = {
                    "servicio": servicio, "archivo": out.name,
                    "bytes": out.stat().st_size, "sha256": sha256(out), "estado": "existente",
                }
                continue
            last_err = None
            for intento in range(1, 4):
                try:
                    sg.get_coverage_data(
                        service_id=servicio, coverage_id=capa, crs=CRS_IGH,
                        west=west, south=south, east=east, north=north,
                        output=str(out), local_file=False,
                    )
                    ok += 1
                    manifiesto["capas"][capa] = {
                        "servicio": servicio, "archivo": out.name,
                        "bytes": out.stat().st_size, "sha256": sha256(out), "estado": "descargado",
                        "factor": FACTORES.get(servicio, 1),
                    }
                    print(f"OK  {capa} ({out.stat().st_size // 1024} KB)", flush=True)
                    last_err = None
                    break
                except Exception as exc:  # noqa: BLE001
                    last_err = exc
                    print(f"RETRY {intento}/3 {capa}: {exc}", file=sys.stderr, flush=True)
                    import time; time.sleep(5 * intento)
            if last_err is not None:
                fail += 1
                manifiesto["capas"][capa] = {
                    "servicio": servicio, "archivo": out.name, "estado": "error", "error": str(last_err)[:500],
                }
                print(f"ERR {capa}: {last_err}", file=sys.stderr, flush=True)

    man_path = DIR_DATOS / "manifiesto_descarga.json"
    man_path.write_text(json.dumps(manifiesto, indent=1, ensure_ascii=False), encoding="utf-8")

    md = [
        "# Manifiesto — GeoTIFF SoilGrids (área de parcelas)",
        "",
        f"- Fecha: {manifiesto['fecha']}",
        f"- CRS: {CRS_IGH} (250 m)",
        f"- Capas en inventario: {total}; descargadas ahora: {ok}; ya existían: {skip}; errores: {fail}",
        f"- Detalle: `{man_path.name}`",
        f"- Cita: {manifiesto['cita']}",
        f"- Licencia: {manifiesto['licencia']}",
        "",
        "Los valores son enteros escalados; ver factores en el JSON y en `CAPAS.md`.",
    ]
    (DIR_DATOS / "MANIFIESTO.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\nResumen: total={total} ok={ok} skip={skip} fail={fail}")
    print(f"Manifiesto: {man_path}")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
