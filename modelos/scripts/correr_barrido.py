#!/usr/bin/env python3
"""Primer barrido: baselines + Ridge + HistGBM sobre los 9 CSVs (D1–D5).

Uso (desde la raíz del repo):
  env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \\
    PYTHONPATH=modelos/src python modelos/scripts/correr_barrido.py
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "modelos" / "src"))

from ceba_modelos.catalogo import filter_catalogo, load_catalogo  # noqa: E402
from ceba_modelos.config import load_config  # noqa: E402
from ceba_modelos.ingesta import load_from_catalog_row  # noqa: E402
from ceba_modelos.train_cv import run_cv_modelo  # noqa: E402


def main() -> None:
    cfg = load_config()
    cat = load_catalogo(cfg["paths"]["catalogo"])
    subset = filter_catalogo(cat, cfg.get("barrido_inicial"))
    modelos = list(cfg["modelos"])
    seed = int(cfg["seed"])
    out_dir = ROOT / "modelos" / "salidas" / f"barrido_{date.today().isoformat()}"
    out_dir.mkdir(parents=True, exist_ok=True)

    summaries = []
    print(f"Barrido: {len(subset)} datasets × {len(modelos)} modelos → {out_dir}")

    for _, row in subset.iterrows():
        bundle = load_from_catalog_row(row, cfg)
        for nombre in modelos:
            result = run_cv_modelo(
                bundle,
                nombre,
                seed=seed,
                leave_one_group_out=cfg["cv"]["leave_one_group_out"],
                group_col=cfg["cv"]["group_col"],
            )
            s = result["summary"]
            summaries.append(s)
            stem = f"{bundle.dataset_id}__{nombre}"
            result["folds"].to_csv(out_dir / f"{stem}_folds.csv", index=False)
            result["oof"].to_csv(out_dir / f"{stem}_oof.csv", index=False)
            print(
                f"  {bundle.dataset_id} | {nombre}: "
                f"RMSE_OOF={s['rmse_oof']:.4f} MAE={s['mae_oof']:.4f} "
                f"r2={s['r2_oof']:.4f} (folds RMSE μ={s['rmse_fold_mean']:.4f})"
            )

    import pandas as pd

    tab = pd.DataFrame(summaries).sort_values(["rmse_oof", "mae_oof"])
    tab_path = out_dir / "resumen_barrido.csv"
    tab.to_csv(tab_path, index=False)
    meta = {
        "fecha": date.today().isoformat(),
        "seed": seed,
        "cv": cfg["cv"],
        "modelos": modelos,
        "n_datasets": len(subset),
        "decisiones": "D1 LOGO municipio; D2 OHE; D3 pixel cat; D4 sklearn; D5 9 CSVs",
        "mejor_rmse_oof": tab.iloc[0].to_dict() if len(tab) else None,
    }
    (out_dir / "manifiesto_barrido.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\nMejor RMSE_OOF:\n{tab.head(5).to_string(index=False)}")
    print(f"\nOK → {tab_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
