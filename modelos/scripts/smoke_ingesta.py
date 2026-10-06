#!/usr/bin/env python3
"""Smoke test de ingesta: carga el barrido inicial y resume bundles.

Uso (desde la raíz del repo):
  PYTHONPATH=modelos/src python3 modelos/scripts/smoke_ingesta.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "modelos" / "src"))

from ceba_modelos.catalogo import filter_catalogo, load_catalogo  # noqa: E402
from ceba_modelos.config import load_config  # noqa: E402
from ceba_modelos.cv import iter_group_folds  # noqa: E402
from ceba_modelos.ingesta import load_from_catalog_row, summarize_bundle  # noqa: E402


def main() -> None:
    cfg = load_config()
    cat = load_catalogo(cfg["paths"]["catalogo"])
    subset = filter_catalogo(cat, cfg.get("barrido_inicial"))
    print(f"Catálogo total: {len(cat)} | barrido: {len(subset)}")

    summaries = []
    for _, row in subset.iterrows():
        b = load_from_catalog_row(row, cfg)
        s = summarize_bundle(b)
        summaries.append(s)
        # CV folds por municipio (solo cuenta)
        n_folds = sum(
            1
            for _ in iter_group_folds(
                b.meta_train["municipio"].to_numpy(),
                leave_one_group_out=cfg["cv"]["leave_one_group_out"],
                seed=cfg["seed"],
            )
        )
        print(
            f"  {s['dataset_id']}: train={s['n_train']} pred={s['n_pred']} "
            f"feat={s['n_features']} (num={s['n_numeric']} cat={s['n_categorical']}) "
            f"folds_mun={n_folds} warnings={s['warnings']}"
        )
        assert s["n_train"] == 138 and s["n_pred"] == 59
        # sin_ubic no debe tener municipio en features, pero sí en meta
        if b.ubic_tag == "sin_ubic":
            assert "municipio" not in b.feature_cols
            assert "municipio" in b.meta_train.columns

    out = ROOT / "modelos" / "salidas" / "smoke_ingesta_resumen.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    # serializar sin listas enormes repetidas
    slim = [{k: v for k, v in s.items() if k != "feature_cols"} for s in summaries]
    out.write_text(json.dumps(slim, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
