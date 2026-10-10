#!/usr/bin/env python3
"""Genera la matriz de CSVs de entrenamiento (temporal × ubicación × extendidos).

Matriz: 2 × 32 × 16 = 1024 archivos + catálogo en manifiestos/.
Ejecutar desde la raíz del repo:

    python3 dataset_entrenamiento/scripts/generar_datasets.py
"""

from __future__ import annotations

import csv
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR_DESPENSA = ROOT / "dataset_entrenamiento" / "despensa"
DIR_RETO = ROOT / "dataset_entrenamiento" / "curados_reto"
DIR_EXT = ROOT / "dataset_entrenamiento" / "curados_extendidos"
DIR_MAN = ROOT / "dataset_entrenamiento" / "manifiestos"
DIR_EXT_SRC = ROOT / "DATASETS_EXTERNOS" / "despensa_extendida"

DESPENSA_SOLO = DIR_DESPENSA / "parcelas_despensa_nube30_v1.csv"
DESPENSA_MULTI = DIR_DESPENSA / "parcelas_despensa_multianio_nube30_v1.csv"
CSV_EDAF = DIR_EXT_SRC / "parcelas_despensa_extendida_edaf_v1.csv"
CSV_SG = DIR_EXT_SRC / "parcelas_despensa_extendida_soilgrids_v1.csv"
CATALOGO = DIR_MAN / "catalogo_datasets_v1.csv"
MANIFIESTO_MAESTRO = DIR_MAN / "manifiesto_matriz_v1.json"

N_PARCELAS = 197

# Núcleo agronómico (siempre presente salvo ubicación/externos)
NUCLEO = [
    "ID_POLIGONO",
    "conjunto",
    "rendimiento_t_ha",
    "area_ha",
    "ndvi_s2_int",
    "ndvi_s2_media_sep_oct",
    "crc_s2_media",
    "vi6t_landsat_max",
    "lai_planet_max",
    "lluvia_ciclo_mm",
    "pendiente_grados",
    "elevacion_m",
]

# Bloque B multi-año (lista cerrada; debe existir en la despensa multi)
BLOQUE_B = [
    "ndvi_s2_max_2022",
    "ndvi_s2_int_2022",
    "ndvi_s2_media_sep_oct_2022",
    "ndvi_s2_max_2023",
    "ndvi_s2_int_2023",
    "ndvi_s2_media_sep_oct_2023",
    "ndvi_s2_max_2024",
    "ndvi_s2_int_2024",
    "ndvi_s2_media_sep_oct_2024",
    "crc_s2_media_2022",
    "crc_s2_media_2023",
    "crc_s2_media_2024",
    "vi6t_landsat_max_2022",
    "vi6t_landsat_max_2023",
    "vi6t_landsat_max_2024",
    "lluvia_ciclo_mm_2022",
    "lluvia_ciclo_mm_2023",
    "lluvia_ciclo_mm_2024",
    "ndvi_s2_max_hist_media",
    "ndvi_s2_int_hist_media",
    "ndvi_s2_media_sep_oct_hist_media",
    "crc_s2_media_hist_media",
    "vi6t_landsat_max_hist_media",
    "lluvia_ciclo_mm_hist_media",
]

# Ubicación L (orden canónico para tags)
L_COLS = ["estado", "municipio", "lon", "lat", "pixel_clima"]
L_SHORT = {
    "estado": "est",
    "municipio": "mun",
    "lon": "lon",
    "lat": "lat",
    "pixel_clima": "pix",
}

# Extendidos E (orden canónico)
E_SPEC = [
    ("n", "sg_nitrogen_0-5cm_mean"),
    ("edaf", "edaf_grupo"),
    ("cec", "sg_cec_0-5cm_mean"),
    ("silt", "sg_silt_0-5cm_mean"),
]
E_CODES = [c for c, _ in E_SPEC]
E_COL = {c: col for c, col in E_SPEC}

EDAF_A_OTROS = {"vertisol", "andosol"}


def read_csv_dict(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            out = {k: r.get(k, "") for k in fieldnames}
            w.writerow(out)


def index_by_id(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {r["ID_POLIGONO"]: r for r in rows}


def recode_edaf(valor: str) -> str:
    if not valor:
        return valor
    if valor.strip().lower() in EDAF_A_OTROS:
        return "otros"
    # Normalizar a Title case para categorías restantes (PHAEOZEM → Phaeozem)
    return valor.strip().title()


def ubic_tag(subset: tuple[str, ...]) -> str:
    if not subset:
        return "sin_ubic"
    if len(subset) == len(L_COLS):
        return "ubic_completa"
    shorts = [L_SHORT[c] for c in subset]  # subset ya ordenado canónicamente
    return "ubic_" + "-".join(shorts)


def ext_tag(subset: tuple[str, ...]) -> str:
    if not subset:
        return "reto"
    return "-".join(subset)


def all_subsets(items: list[str]) -> list[tuple[str, ...]]:
    out: list[tuple[str, ...]] = []
    for k in range(len(items) + 1):
        for comb in itertools.combinations(items, k):
            out.append(comb)
    return out


def merge_row(
    base: dict[str, str],
    edaf: dict[str, dict[str, str]],
    sg: dict[str, dict[str, str]],
    pid: str,
) -> dict[str, str]:
    row = dict(base)
    if pid in edaf:
        row["edaf_grupo"] = recode_edaf(edaf[pid].get("edaf_grupo", ""))
    if pid in sg:
        for _, col in E_SPEC:
            if col.startswith("sg_"):
                row[col] = sg[pid].get(col, "")
    return row


def main() -> None:
    for p in (DESPENSA_SOLO, DESPENSA_MULTI, CSV_EDAF, CSV_SG):
        if not p.exists():
            raise SystemExit(f"Falta entrada: {p}")

    solo = read_csv_dict(DESPENSA_SOLO)
    multi = read_csv_dict(DESPENSA_MULTI)
    edaf = index_by_id(read_csv_dict(CSV_EDAF))
    sg = index_by_id(read_csv_dict(CSV_SG))

    assert len(solo) == N_PARCELAS and len(multi) == N_PARCELAS
    for col in NUCLEO + L_COLS:
        if col not in solo[0]:
            raise SystemExit(f"Columna ausente en despensa solo2025: {col}")
    for col in BLOQUE_B:
        if col not in multi[0]:
            raise SystemExit(f"Columna ausente en despensa multianio: {col}")

    bases = {
        "solo2025": [merge_row(r, edaf, sg, r["ID_POLIGONO"]) for r in solo],
        "multianio": [merge_row(r, edaf, sg, r["ID_POLIGONO"]) for r in multi],
    }

    # Limpiar salidas previas de esta versión
    for d in (DIR_RETO, DIR_EXT):
        d.mkdir(parents=True, exist_ok=True)
        for old in d.glob("parcelas_*_v1.csv"):
            old.unlink()
    DIR_MAN.mkdir(parents=True, exist_ok=True)

    ubic_subsets = all_subsets(L_COLS)
    ext_subsets = all_subsets(E_CODES)
    assert len(ubic_subsets) == 32
    assert len(ext_subsets) == 16

    catalog_rows: list[dict[str, str]] = []
    n_written = 0

    for temporal, rows in bases.items():
        nucleo_cols = list(NUCLEO) + (BLOQUE_B if temporal == "multianio" else [])
        for s in ubic_subsets:
            for t in ext_subsets:
                u_tag = ubic_tag(s)
                e_tag = ext_tag(t)
                fname = f"parcelas_{temporal}_{u_tag}_{e_tag}_v1.csv"
                out_dir = DIR_RETO if e_tag == "reto" else DIR_EXT
                rel = f"{out_dir.name}/{fname}"
                cols = nucleo_cols + list(s) + [E_COL[c] for c in t]
                write_csv(out_dir / fname, rows, cols)

                pred = [r for r in rows if r["conjunto"] == "PREDICCION"]
                ent = [r for r in rows if r["conjunto"] == "ENTRENAMIENTO"]
                if any(r.get("rendimiento_t_ha", "").strip() for r in pred):
                    raise SystemExit(f"Rendimiento no vacío en PREDICCION: {fname}")
                if any(not r.get("rendimiento_t_ha", "").strip() for r in ent):
                    raise SystemExit(f"Rendimiento vacío en ENTRENAMIENTO: {fname}")
                if len(rows) != N_PARCELAS:
                    raise SystemExit(f"Filas != {N_PARCELAS}: {fname}")

                catalog_rows.append(
                    {
                        "dataset_id": fname.replace(".csv", ""),
                        "archivo": rel,
                        "temporal": temporal,
                        "ubic_tag": u_tag,
                        "ext_tag": e_tag,
                        "n_filas": str(N_PARCELAS),
                        "n_columnas": str(len(cols)),
                        "columnas": "|".join(cols),
                        "ubic_cols": "|".join(s) if s else "",
                        "ext_cols": "|".join(E_COL[c] for c in t) if t else "",
                        "carpeta": out_dir.name,
                        "version": "v1",
                    }
                )
                n_written += 1

    cat_fields = [
        "dataset_id",
        "archivo",
        "temporal",
        "ubic_tag",
        "ext_tag",
        "n_filas",
        "n_columnas",
        "columnas",
        "ubic_cols",
        "ext_cols",
        "carpeta",
        "version",
    ]
    write_csv(CATALOGO, catalog_rows, cat_fields)

    manifesto = {
        "version": "v1",
        "n_datasets": n_written,
        "ejes": {
            "temporal": ["solo2025", "multianio"],
            "ubicacion": {
                "n": 32,
                "columnas_L": L_COLS,
                "tags": "sin_ubic | ubic_completa | ubic_<est-mun-lon-lat-pix>",
            },
            "extendidos": {
                "n": 16,
                "E": E_SPEC,
                "edaf_recode": "Vertisol/Andosol → otros",
                "tags": "reto | códigos cortos unidos por -",
            },
        },
        "nucleo": NUCLEO,
        "bloque_b_multianio": BLOQUE_B,
        "entradas": {
            "solo2025": str(DESPENSA_SOLO.relative_to(ROOT)),
            "multianio": str(DESPENSA_MULTI.relative_to(ROOT)),
            "edaf": str(CSV_EDAF.relative_to(ROOT)),
            "soilgrids": str(CSV_SG.relative_to(ROOT)),
        },
        "salidas": {
            "curados_reto": str(DIR_RETO.relative_to(ROOT)),
            "curados_extendidos": str(DIR_EXT.relative_to(ROOT)),
            "catalogo": str(CATALOGO.relative_to(ROOT)),
        },
        "como_regenerar": "python3 dataset_entrenamiento/scripts/generar_datasets.py",
    }
    MANIFIESTO_MAESTRO.write_text(
        json.dumps(manifesto, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    n_reto = len(list(DIR_RETO.glob("parcelas_*_v1.csv")))
    n_ext = len(list(DIR_EXT.glob("parcelas_*_v1.csv")))
    print(f"Escritos {n_written} CSVs (reto={n_reto}, extendidos={n_ext})")
    print(f"Catálogo: {CATALOGO.relative_to(ROOT)} ({len(catalog_rows)} filas)")
    assert n_written == 1024
    assert n_reto + n_ext == 1024
    assert len(catalog_rows) == 1024


if __name__ == "__main__":
    main()
