"""Estimadores del barrido inicial (D4: sklearn)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin, clone
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline

from .preprocess import make_preprocessor


class MediaGlobalRegressor(BaseEstimator, RegressorMixin):
    def fit(self, X, y):
        self.media_ = float(np.mean(y))
        return self

    def predict(self, X):
        n = len(X) if hasattr(X, "__len__") else X.shape[0]
        return np.full(n, self.media_, dtype=float)


class MediaGrupoRegressor(BaseEstimator, RegressorMixin):
    """Baseline espacial: media del grupo en train; fallback a media global.

    Bajo leave-one-municipio-out, agrupar por *municipio* degenera a media global
    (el grupo de test nunca está en train). Por eso el barrido usa `media_estado`.
    """

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


# Alias documentado (no usar como baseline bajo LOGO por municipio).
MediaMunicipioRegressor = MediaGrupoRegressor


def build_estimator(
    nombre: str,
    numeric_cols: list[str],
    categorical_cols: list[str],
    *,
    seed: int = 0,
) -> Any:
    if nombre == "media_global":
        return MediaGlobalRegressor()
    if nombre in ("media_municipio", "media_estado", "media_grupo"):
        return MediaGrupoRegressor()
    if nombre == "ridge":
        pre = make_preprocessor(numeric_cols, categorical_cols, scale_numeric=True)
        return Pipeline(
            [
                ("pre", pre),
                ("model", Ridge(alpha=1.0)),
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
                        max_depth=4,
                        max_iter=200,
                        learning_rate=0.05,
                        min_samples_leaf=10,
                        random_state=seed,
                    ),
                ),
            ]
        )
    raise ValueError(f"Modelo desconocido: {nombre}")


def clone_estimator(est: Any) -> Any:
    return clone(est)
