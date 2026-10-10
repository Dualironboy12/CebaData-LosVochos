"""Estimadores Classic ML (baselines + sklearn + LightGBM)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin, clone
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import ElasticNet, Ridge
from sklearn.pipeline import Pipeline

from .preprocess import make_preprocessor

try:
    from lightgbm import LGBMRegressor

    HAS_LGBM = True
except ImportError:  # pragma: no cover
    HAS_LGBM = False
    LGBMRegressor = None  # type: ignore


class MediaGlobalRegressor(BaseEstimator, RegressorMixin):
    def fit(self, X, y):
        self.media_ = float(np.mean(y))
        return self

    def predict(self, X):
        n = len(X) if hasattr(X, "__len__") else X.shape[0]
        return np.full(n, self.media_, dtype=float)


class MediaGrupoRegressor(BaseEstimator, RegressorMixin):
    """Baseline espacial: media del grupo en train; fallback a media global."""

    def __init__(self, grupos: np.ndarray | None = None):
        self.grupos = grupos

    def fit(self, X, y, grupos=None):
        g = grupos if grupos is not None else self.grupos
        if g is None:
            raise ValueError("MediaGrupoRegressor requiere grupos")
        g = np.asarray(g)
        y = np.asarray(y, dtype=float)
        self.media_global_ = float(np.mean(y))
        df = pd.DataFrame({"g": g, "y": y})
        self.medias_ = df.groupby("g")["y"].mean().to_dict()
        return self

    def predict(self, X, grupos=None):
        g = grupos if grupos is not None else self.grupos
        if g is None:
            raise ValueError("predict requiere grupos")
        g = np.asarray(g)
        return np.array(
            [self.medias_.get(v, self.media_global_) for v in g], dtype=float
        )


MediaMunicipioRegressor = MediaGrupoRegressor


def _defaults(nombre: str, seed: int) -> dict[str, Any]:
    if nombre == "ridge":
        return {"alpha": 1.0}
    if nombre == "elasticnet":
        return {"alpha": 1.0, "l1_ratio": 0.5, "max_iter": 5000}
    if nombre == "random_forest":
        return {
            "n_estimators": 200,
            "max_depth": None,
            "min_samples_leaf": 5,
            "random_state": seed,
            "n_jobs": 1,
        }
    if nombre == "hist_gradient_boosting":
        return {
            "max_depth": 4,
            "max_iter": 200,
            "learning_rate": 0.05,
            "min_samples_leaf": 10,
            "random_state": seed,
        }
    if nombre == "lightgbm":
        return {
            "n_estimators": 200,
            "num_leaves": 31,
            "learning_rate": 0.05,
            "min_child_samples": 10,
            "random_state": seed,
            "verbosity": -1,
            "n_jobs": 1,
        }
    return {}


def build_estimator(
    nombre: str,
    numeric_cols: list[str],
    categorical_cols: list[str],
    *,
    seed: int = 0,
    params: dict[str, Any] | None = None,
) -> Any:
    p = {**_defaults(nombre, seed), **(params or {})}
    # YAML null → None
    for k, v in list(p.items()):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            p[k] = None

    if nombre == "media_global":
        return MediaGlobalRegressor()
    if nombre in ("media_municipio", "media_estado", "media_grupo"):
        return MediaGrupoRegressor()

    if nombre == "ridge":
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=True)
        return Pipeline([("pre", pre), ("model", Ridge(alpha=float(p["alpha"])))])

    if nombre == "elasticnet":
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=True)
        return Pipeline(
            [
                ("pre", pre),
                (
                    "model",
                    ElasticNet(
                        alpha=float(p["alpha"]),
                        l1_ratio=float(p["l1_ratio"]),
                        max_iter=int(p.get("max_iter", 5000)),
                        random_state=seed,
                    ),
                ),
            ]
        )

    if nombre == "random_forest":
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=False)
        md = p.get("max_depth")
        if md is not None:
            md = int(md)
        return Pipeline(
            [
                ("pre", pre),
                (
                    "model",
                    RandomForestRegressor(
                        n_estimators=int(p.get("n_estimators", 200)),
                        max_depth=md,
                        min_samples_leaf=int(p["min_samples_leaf"]),
                        random_state=seed,
                        n_jobs=int(p.get("n_jobs", 1)),
                    ),
                ),
            ]
        )

    if nombre == "hist_gradient_boosting":
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=False)
        return Pipeline(
            [
                ("pre", pre),
                (
                    "model",
                    HistGradientBoostingRegressor(
                        max_depth=int(p["max_depth"]),
                        max_iter=int(p["max_iter"]),
                        learning_rate=float(p["learning_rate"]),
                        min_samples_leaf=int(p.get("min_samples_leaf", 10)),
                        random_state=seed,
                    ),
                ),
            ]
        )

    if nombre == "lightgbm":
        if not HAS_LGBM:
            raise ImportError("lightgbm no está instalado")
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=False)
        return Pipeline(
            [
                ("pre", pre),
                (
                    "model",
                    LGBMRegressor(
                        n_estimators=int(p.get("n_estimators", 200)),
                        num_leaves=int(p["num_leaves"]),
                        learning_rate=float(p["learning_rate"]),
                        min_child_samples=int(p["min_child_samples"]),
                        random_state=seed,
                        verbosity=int(p.get("verbosity", -1)),
                        n_jobs=int(p.get("n_jobs", 1)),
                    ),
                ),
            ]
        )

    raise ValueError(f"Modelo desconocido: {nombre}")


def clone_estimator(est: Any) -> Any:
    return clone(est)


def expand_param_grid(grid: dict[str, list[Any]]) -> list[dict[str, Any]]:
    """Producto cartesiano de un dict de listas (valores YAML null → None)."""
    if not grid:
        return [{}]
    keys = list(grid.keys())
    combos: list[dict[str, Any]] = [{}]
    for k in keys:
        vals = grid[k]
        nxt: list[dict[str, Any]] = []
        for base in combos:
            for v in vals:
                d = dict(base)
                d[k] = None if v is None or (isinstance(v, str) and v.lower() == "null") else v
                nxt.append(d)
        combos = nxt
    return combos
