"""Carga de config YAML."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from .paths import modelos_dir, repo_root


def load_config(path: Path | None = None) -> dict[str, Any]:
    cfg_path = path or (modelos_dir() / "config" / "default.yaml")
    with cfg_path.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if not isinstance(cfg, dict):
        raise ValueError(f"Config inválida: {cfg_path}")
    return cfg


def resolve_data_path(rel: str) -> Path:
    """Ruta relativa al repo → Path absoluto."""
    return (repo_root() / rel).resolve()
