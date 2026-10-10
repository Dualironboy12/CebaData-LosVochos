"""Preprocesamiento por fold (One-Hot + escala opcional)."""

from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def make_preprocessor(
    numeric_cols: list[str],
    categorical_cols: list[str],
    *,
    scale_numeric: bool = False,
) -> ColumnTransformer:
    num_pipe: list = []
    if scale_numeric and numeric_cols:
        num_pipe = [("scaler", StandardScaler())]
    transformers = []
    if numeric_cols:
        if num_pipe:
            transformers.append(
                ("num", Pipeline(num_pipe), list(numeric_cols))
            )
        else:
            transformers.append(("num", "passthrough", list(numeric_cols)))
    if categorical_cols:
        transformers.append(
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                list(categorical_cols),
            )
        )
    if not transformers:
        raise ValueError("No hay columnas para preprocesar")
    return ColumnTransformer(transformers, remainder="drop")
