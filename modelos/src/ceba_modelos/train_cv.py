"""CV espacial y métricas (RMSE, MAE, r²)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .cv import iter_group_folds
from .estimadores import build_estimator
from .ingesta import DatasetBundle


def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)) if len(np.unique(y_true)) > 1 else float("nan"),
    }


def run_cv_modelo(
    bundle: DatasetBundle,
    nombre_modelo: str,
    *,
    seed: int,
    leave_one_group_out: bool = True,
    group_col: str = "municipio",
) -> dict[str, Any]:
    X = bundle.X_train
    y = bundle.y_train.to_numpy(dtype=float)
    groups = bundle.meta_train[group_col].to_numpy()
    ids = bundle.meta_train["ID_POLIGONO"].to_numpy()
    mun_all = bundle.meta_train["municipio"].to_numpy()

    fold_rows: list[dict[str, Any]] = []
    oof_pred = np.full(len(y), np.nan)
    oof_id: list[str] = []

    for fold_id, tr, te in iter_group_folds(
        groups, leave_one_group_out=leave_one_group_out, seed=seed
    ):
        est = build_estimator(
            nombre_modelo,
            bundle.numeric_cols,
            bundle.categorical_cols,
            seed=seed,
        )
        X_tr, X_te = X.iloc[tr], X.iloc[te]
        y_tr, y_te = y[tr], y[te]

        if nombre_modelo in ("media_municipio", "media_estado", "media_grupo"):
            # Bajo LOGO por municipio, media_municipio degenera a global;
            # media_estado usa el estado (sigue presente en train).
            if nombre_modelo == "media_estado":
                g_tr = bundle.meta_train["estado"].to_numpy()[tr]
                g_te = bundle.meta_train["estado"].to_numpy()[te]
            else:
                g_tr, g_te = mun_all[tr], mun_all[te]
            est.fit(X_tr, y_tr, grupos=g_tr)
            pred = est.predict(X_te, grupos=g_te)
        else:
            est.fit(X_tr, y_tr)
            pred = est.predict(X_te)

        oof_pred[te] = pred
        m = _metrics(y_te, pred)
        fold_rows.append(
            {
                "fold": fold_id,
                "group": str(groups[te][0]) if len(te) else "",
                "n_test": int(len(te)),
                "n_train": int(len(tr)),
                **m,
            }
        )

    # OOF globales (todas las parcelas de train predichas exactamente una vez en LOGO)
    mask = ~np.isnan(oof_pred)
    oof_m = _metrics(y[mask], oof_pred[mask])
    fold_df = pd.DataFrame(fold_rows)
    summary = {
        "dataset_id": bundle.dataset_id,
        "modelo": nombre_modelo,
        "n_folds": len(fold_rows),
        "rmse_oof": oof_m["rmse"],
        "mae_oof": oof_m["mae"],
        "r2_oof": oof_m["r2"],
        "rmse_fold_mean": float(fold_df["rmse"].mean()),
        "rmse_fold_std": float(fold_df["rmse"].std(ddof=0)),
        "mae_fold_mean": float(fold_df["mae"].mean()),
        "r2_fold_mean": float(fold_df["r2"].mean(skipna=True)),
    }
    oof_table = pd.DataFrame(
        {
            "ID_POLIGONO": ids,
            "municipio": mun_all,
            "y_true": y,
            "y_pred": oof_pred,
            "modelo": nombre_modelo,
            "dataset_id": bundle.dataset_id,
        }
    )
    return {"summary": summary, "folds": fold_df, "oof": oof_table}
