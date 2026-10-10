"""Resolución de rutas del repo desde cualquier CWD."""

from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    """Raíz del repo (directorio que contiene AGENTS.md y DATASET_RETO_AGRO_2026/)."""
    here = Path(__file__).resolve()
    for p in [here.parent, *here.parents]:
        if (p / "AGENTS.md").is_file() and (p / "DATASET_RETO_AGRO_2026").is_dir():
            return p
    raise RuntimeError("No se encontró la raíz del repo (AGENTS.md + DATASET_RETO_AGRO_2026/).")


def modelos_dir() -> Path:
    return repo_root() / "modelos"
