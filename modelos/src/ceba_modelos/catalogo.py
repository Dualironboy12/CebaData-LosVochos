"""Lectura y filtrado del catálogo de datasets curados."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from .config import resolve_data_path
from .paths import repo_root


def load_catalogo(catalogo_rel: str) -> pd.DataFrame:
    path = resolve_data_path(catalogo_rel)
    df = pd.read_csv(path)
    required = {
        "dataset_id",
        "archivo",
        "temporal",
        "ubic_tag",
        "ext_tag",
        "n_filas",
        "n_columnas",
        "columnas",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Catálogo incompleto, faltan: {sorted(missing)}")
    return df


def filter_catalogo(
    cat: pd.DataFrame,
    filtros: list[dict[str, str]] | None,
) -> pd.DataFrame:
    """Si filtros es una lista de {temporal, ubic_tag, ext_tag}, deja solo esas filas."""
    if not filtros:
        return cat.copy()
    keys = {(f["temporal"], f["ubic_tag"], f["ext_tag"]) for f in filtros}
    mask = cat.apply(
        lambda r: (r["temporal"], r["ubic_tag"], r["ext_tag"]) in keys, axis=1
    )
    out = cat.loc[mask].copy()
    if len(out) != len(keys):
        found = {(r.temporal, r.ubic_tag, r.ext_tag) for r in out.itertuples()}
        missing = keys - found
        raise ValueError(f"Filtros sin match en catálogo: {sorted(missing)}")
    return out.reset_index(drop=True)


def csv_path_for_row(row: pd.Series | dict[str, Any]) -> Path:
    archivo = row["archivo"] if isinstance(row, dict) else row["archivo"]
    path = repo_root() / "dataset_entrenamiento" / archivo
    if not path.is_file():
        # catálogo guarda p.ej. curados_reto/foo.csv
        path = repo_root() / "dataset_entrenamiento" / str(archivo)
    if not path.is_file():
        raise FileNotFoundError(path)
    return path.resolve()
