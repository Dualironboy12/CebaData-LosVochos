"""Ingesta de un CSV curado + sidecar de metadatos de CV.

Contrato:
- Features = columnas del CSV menos llaves/etiqueta.
- Meta de CV (municipio, pixel_clima, estado) siempre desde la despensa,
  aunque el CSV sea sin_ubic (esas columnas no van a X salvo que el CSV las traiga).
- PREDICCION no aporta y; rendimiento vacío no se convierte a 0.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .config import load_config, resolve_data_path


@dataclass
class DatasetBundle:
    """Paquete listo para CV / entrenamiento / predicción."""

    dataset_id: str
    temporal: str
    ubic_tag: str
    ext_tag: str
    feature_cols: list[str]
    numeric_cols: list[str]
    categorical_cols: list[str]
    X_train: pd.DataFrame
    y_train: pd.Series
    meta_train: pd.DataFrame
    X_pred: pd.DataFrame
    meta_pred: pd.DataFrame
    n_train: int = 0
    n_pred: int = 0
    warnings: list[str] = field(default_factory=list)

    def group_labels(self, col: str) -> pd.Series:
        if col not in self.meta_train.columns:
            raise KeyError(f"Columna de grupo ausente en meta: {col}")
        return self.meta_train[col]


def _load_meta(despensa_rel: str, meta_cols: list[str]) -> pd.DataFrame:
    path = resolve_data_path(despensa_rel)
    cols = ["ID_POLIGONO", *meta_cols]
    df = pd.read_csv(path, usecols=cols, dtype={"ID_POLIGONO": str})
    if df["ID_POLIGONO"].duplicated().any():
        raise ValueError("Despensa con ID_POLIGONO duplicado")
    if df[meta_cols].isna().any().any():
        raise ValueError(f"NA en columnas de meta CV: {meta_cols}")
    return df


def _split_feature_types(
    feature_cols: list[str],
    frame: pd.DataFrame,
    categoricas_conocidas: list[str],
) -> tuple[list[str], list[str]]:
    cats = [c for c in feature_cols if c in categoricas_conocidas]
    nums = [c for c in feature_cols if c not in cats]
    promoted: list[str] = []
    for c in nums:
        if not pd.api.types.is_numeric_dtype(frame[c]):
            promoted.append(c)
    cats = cats + promoted
    nums = [c for c in feature_cols if c not in cats]
    return nums, cats


def load_dataset_bundle(
    csv_path: str | Path,
    dataset_id: str,
    temporal: str = "",
    ubic_tag: str = "",
    ext_tag: str = "",
    config: dict[str, Any] | None = None,
) -> DatasetBundle:
    cfg = config or load_config()
    never = set(cfg["never_features"])
    meta_cols = list(cfg["cv_meta_cols"])
    cat_known = list(cfg.get("categoricas_conocidas", []))
    target = cfg["target"]
    id_col = cfg["id_col"]
    conj_col = cfg["conjunto_col"]
    train_name = cfg["conjunto_train"]
    pred_name = cfg["conjunto_pred"]

    raw = pd.read_csv(csv_path, dtype={id_col: str})
    warnings: list[str] = []

    if len(raw) != 197:
        warnings.append(f"n_filas={len(raw)} (esperado 197)")
    if target not in raw.columns or id_col not in raw.columns or conj_col not in raw.columns:
        raise ValueError(f"CSV sin columnas mínimas ({id_col}, {conj_col}, {target}): {csv_path}")

    feature_cols = [c for c in raw.columns if c not in never]
    meta = _load_meta(cfg["paths"]["despensa_meta"], meta_cols)

    # Validar IDs
    if set(raw[id_col]) != set(meta[id_col]):
        raise ValueError("IDs del CSV no coinciden con la despensa de meta")

    train_mask = raw[conj_col] == train_name
    pred_mask = raw[conj_col] == pred_name
    train = raw.loc[train_mask].copy()
    pred = raw.loc[pred_mask].copy()

    y_train = pd.to_numeric(train[target], errors="coerce")
    if y_train.isna().any():
        raise ValueError("Hay NA en rendimiento_t_ha dentro de ENTRENAMIENTO")

    pred_y = pred[target]
    if pred_y.notna().any():
        # strings vacíos → NA al leer; si hay valor real, error
        as_num = pd.to_numeric(pred_y, errors="coerce")
        if as_num.notna().any():
            raise ValueError("Rendimiento no vacío en PREDICCION")

    X_train = train[feature_cols].copy()
    X_pred = pred[feature_cols].copy()

    meta_idx = meta.set_index(id_col)
    meta_train = meta_idx.loc[train[id_col]].reset_index()
    meta_pred = meta_idx.loc[pred[id_col]].reset_index()
    meta_train.insert(1, conj_col, train[conj_col].to_numpy())
    meta_pred.insert(1, conj_col, pred[conj_col].to_numpy())

    for c in feature_cols:
        if c in cat_known:
            X_train[c] = X_train[c].astype("string")
            X_pred[c] = X_pred[c].astype("string")
        else:
            X_train[c] = pd.to_numeric(X_train[c], errors="coerce")
            X_pred[c] = pd.to_numeric(X_pred[c], errors="coerce")

    nums, cats = _split_feature_types(feature_cols, X_train, cat_known)

    if nums and X_train[nums].isna().any().any():
        bad = X_train[nums].columns[X_train[nums].isna().any()].tolist()
        warnings.append(f"NA en features numéricas (train): {bad}")

    return DatasetBundle(
        dataset_id=dataset_id,
        temporal=temporal,
        ubic_tag=ubic_tag,
        ext_tag=ext_tag,
        feature_cols=feature_cols,
        numeric_cols=nums,
        categorical_cols=cats,
        X_train=X_train.reset_index(drop=True),
        y_train=y_train.reset_index(drop=True),
        meta_train=meta_train.reset_index(drop=True),
        X_pred=X_pred.reset_index(drop=True),
        meta_pred=meta_pred.reset_index(drop=True),
        n_train=len(X_train),
        n_pred=len(X_pred),
        warnings=warnings,
    )


def load_from_catalog_row(row: pd.Series, config: dict[str, Any] | None = None) -> DatasetBundle:
    from .catalogo import csv_path_for_row

    path = csv_path_for_row(row)
    return load_dataset_bundle(
        csv_path=path,
        dataset_id=str(row["dataset_id"]),
        temporal=str(row["temporal"]),
        ubic_tag=str(row["ubic_tag"]),
        ext_tag=str(row["ext_tag"]),
        config=config,
    )


def summarize_bundle(b: DatasetBundle) -> dict[str, Any]:
    g = b.meta_train["municipio"].value_counts()
    return {
        "dataset_id": b.dataset_id,
        "temporal": b.temporal,
        "ubic_tag": b.ubic_tag,
        "ext_tag": b.ext_tag,
        "n_train": b.n_train,
        "n_pred": b.n_pred,
        "n_features": len(b.feature_cols),
        "n_numeric": len(b.numeric_cols),
        "n_categorical": len(b.categorical_cols),
        "feature_cols": b.feature_cols,
        "categorical_cols": b.categorical_cols,
        "municipios": int(g.shape[0]),
        "municipio_min_n": int(g.min()) if len(g) else 0,
        "municipio_max_n": int(g.max()) if len(g) else 0,
        "y_mean": float(np.mean(b.y_train)),
        "y_std": float(np.std(b.y_train)),
        "warnings": b.warnings,
    }
