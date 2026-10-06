#!/usr/bin/env python3
"""Superciclo Classic ML: capas A (baselines) → B (1024×modelos) → C (HPO top-K).

Uso (raíz del repo):
  env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \\
    PYTHONPATH=modelos/src python modelos/scripts/correr_superciclo.py
"""

from __future__ import annotations

import ast
import json
import sys
import time
from pathlib import Path
from typing import Any

import pandas as pd
from joblib import Parallel, delayed

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "modelos" / "src"))

from ceba_modelos.catalogo import load_catalogo, csv_path_for_row  # noqa: E402
from ceba_modelos.config import load_config  # noqa: E402
from ceba_modelos.estimadores import expand_param_grid  # noqa: E402
from ceba_modelos.ingesta import load_from_catalog_row, load_dataset_bundle  # noqa: E402
from ceba_modelos.train_cv import fit_predict_full, run_cv_modelo  # noqa: E402


SUMMARY_COLS = [
    "dataset_id",
    "temporal",
    "ubic_tag",
    "ext_tag",
    "modelo",
    "capa",
    "hparams_id",
    "hparams_json",
    "n_folds",
    "n_features",
    "rmse_oof",
    "mae_oof",
    "r2_oof",
    "rmse_fold_mean",
    "rmse_fold_std",
    "mae_fold_mean",
    "r2_fold_mean",
    "error",
]


def _key(capa: str, dataset_id: str, modelo: str, hparams_id: str) -> str:
    return f"{capa}|{dataset_id}|{modelo}|{hparams_id}"


def _hparams_id(params: dict[str, Any] | None) -> str:
    if not params:
        return "default"
    return json.dumps(params, sort_keys=True, default=str)


def _done_keys(path: Path) -> set[str]:
    if not path.is_file():
        return set()
    df = _read_resumen(path)
    if df.empty:
        return set()
    return {
        _key(str(r.capa), str(r.dataset_id), str(r.modelo), str(r.hparams_id))
        for r in df.itertuples()
    }


def _read_resumen(path: Path) -> pd.DataFrame:
    """Lee resumen tolerando filas con distinto nº de campos."""
    import csv

    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return pd.DataFrame(columns=SUMMARY_COLS)
    df = pd.DataFrame(rows)
    for c in SUMMARY_COLS:
        if c not in df.columns:
            df[c] = ""
    for c in ("rmse_oof", "mae_oof", "r2_oof", "rmse_fold_mean", "rmse_fold_std", "mae_fold_mean", "r2_fold_mean"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in ("n_folds", "n_features"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df[SUMMARY_COLS]


def _append_summaries(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    df = pd.DataFrame(rows)
    for c in SUMMARY_COLS:
        if c not in df.columns:
            df[c] = ""
    df = df[SUMMARY_COLS]
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        df.to_csv(path, mode="a", header=False, index=False)
    else:
        df.to_csv(path, index=False)


def _rewrite_resumen_clean(path: Path) -> pd.DataFrame:
    df = _read_resumen(path)
    df.to_csv(path, index=False)
    return df


def _eval_one(
    row_dict: dict[str, Any],
    modelo: str,
    cfg: dict[str, Any],
    *,
    capa: str,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    bundle = load_from_catalog_row(pd.Series(row_dict), cfg)
    hid = _hparams_id(params)
    result = run_cv_modelo(
        bundle,
        modelo,
        seed=int(cfg["seed"]),
        leave_one_group_out=bool(cfg["cv"]["leave_one_group_out"]),
        group_col=cfg["cv"]["group_col"],
        params=params,
        hparams_id=hid,
        capa=capa,
    )
    return {"summary": result["summary"], "oof": result["oof"]}


def _eval_baseline(
    row_dict: dict[str, Any],
    modelo: str,
    cfg: dict[str, Any],
) -> dict[str, Any]:
    return _eval_one(row_dict, modelo, cfg, capa="A", params=None)


def seleccionar_top_k(resumen_b: pd.DataFrame, cfg: dict[str, Any]) -> pd.DataFrame:
    hpo = cfg["hpo"]
    k = int(hpo["top_k"])
    max_reto = int(hpo["max_reto"])
    max_ext = int(hpo["max_extendido"])
    df = resumen_b.sort_values(["rmse_oof", "mae_oof"]).copy()
    reto_idx: list[Any] = []
    ext_idx: list[Any] = []
    for idx, r in df.iterrows():
        is_reto = str(r["ext_tag"]) == "reto"
        if is_reto and len(reto_idx) < max_reto:
            reto_idx.append(idx)
        elif (not is_reto) and len(ext_idx) < max_ext:
            ext_idx.append(idx)
        if len(reto_idx) + len(ext_idx) >= k:
            break
    return df.loc[reto_idx + ext_idx].reset_index(drop=True)


def main() -> None:
    cfg_path = ROOT / "modelos" / "config" / "superciclo.yaml"
    cfg = load_config(cfg_path)
    # Alinear paths de ingesta (despensa_meta ya está)
    out_dir = ROOT / cfg["paths"]["salidas"]
    out_dir.mkdir(parents=True, exist_ok=True)
    resumen_path = out_dir / "resumen_superciclo.csv"
    ckpt_path = out_dir / "checkpoint.json"
    oof_dir = out_dir / "oof"
    oof_dir.mkdir(exist_ok=True)

    cat = load_catalogo(cfg["paths"]["catalogo"])
    seed = int(cfg["seed"])
    n_jobs = int(cfg.get("n_jobs", 4))
    done = _done_keys(resumen_path)

    # Una fila prototipo para baselines (cualquier dataset; features ignoradas)
    proto = cat.iloc[0]

    meta = {
        "seed": seed,
        "n_datasets": len(cat),
        "n_jobs": n_jobs,
        "config": str(cfg_path.relative_to(ROOT)),
    }
    (out_dir / "manifiesto_inicio.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    t0 = time.time()

    # ---- Capa A ----
    print("=== Capa A: baselines ===")
    for bas in cfg["baselines"]:
        k = _key("A", "baseline", bas, "default")
        if k in done:
            print(f"  skip {bas}")
            continue
        out = _eval_baseline(proto.to_dict(), bas, cfg)
        s = out["summary"]
        s["dataset_id"] = "baseline"
        s["temporal"] = ""
        s["ubic_tag"] = ""
        s["ext_tag"] = ""
        s["capa"] = "A"
        _append_summaries(resumen_path, [s])
        out["oof"].to_csv(oof_dir / f"A_baseline__{bas}_oof.csv", index=False)
        done.add(k)
        print(f"  {bas}: RMSE_OOF={s['rmse_oof']:.4f}")

    # ---- Capa B ----
    print(f"=== Capa B: {len(cat)} datasets × {len(cfg['modelos_capa_b'])} modelos ===")
    jobs: list[tuple[dict, str]] = []
    for _, row in cat.iterrows():
        rd = row.to_dict()
        for modelo in cfg["modelos_capa_b"]:
            k = _key("B", rd["dataset_id"], modelo, "default")
            if k not in done:
                jobs.append((rd, modelo))

    print(f"  pendientes: {len(jobs)}")

    def _run_b(rd: dict, modelo: str) -> dict[str, Any] | None:
        try:
            out = _eval_one(rd, modelo, cfg, capa="B", params=None)
            s = out["summary"]
            s["capa"] = "B"
            return s
        except Exception as e:  # noqa: BLE001
            return {
                "dataset_id": rd["dataset_id"],
                "temporal": rd.get("temporal", ""),
                "ubic_tag": rd.get("ubic_tag", ""),
                "ext_tag": rd.get("ext_tag", ""),
                "modelo": modelo,
                "capa": "B",
                "hparams_id": "default",
                "n_folds": 0,
                "n_features": 0,
                "rmse_oof": float("nan"),
                "mae_oof": float("nan"),
                "r2_oof": float("nan"),
                "rmse_fold_mean": float("nan"),
                "rmse_fold_std": float("nan"),
                "mae_fold_mean": float("nan"),
                "r2_fold_mean": float("nan"),
                "error": str(e),
            }

    chunk = max(32, n_jobs * 8)
    for i in range(0, len(jobs), chunk):
        batch = jobs[i : i + chunk]
        results = Parallel(n_jobs=n_jobs, prefer="processes")(
            delayed(_run_b)(rd, m) for rd, m in batch
        )
        rows = [r for r in results if r is not None]
        _append_summaries(resumen_path, rows)
        for r in rows:
            done.add(_key("B", r["dataset_id"], r["modelo"], r.get("hparams_id", "default")))
        print(f"  B progreso {min(i + chunk, len(jobs))}/{len(jobs)} (+{len(rows)})")
        ckpt_path.write_text(
            json.dumps({"done": len(done), "elapsed_s": time.time() - t0}, indent=2) + "\n"
        )

    # ---- Top-K + OOF top-N de B ----
    full = _rewrite_resumen_clean(resumen_path)
    capa_b = full[full["capa"] == "B"].dropna(subset=["rmse_oof"]).sort_values("rmse_oof")
    top_n = int(cfg.get("oof_top_n", 20))
    top_b = capa_b.head(top_n)
    print(f"=== Guardando OOF top-{top_n} capa B ===")
    for r in top_b.itertuples():
        oof_path = oof_dir / f"B_{r.dataset_id}__{r.modelo}_oof.csv"
        if oof_path.is_file():
            continue
        row = cat.loc[cat["dataset_id"] == r.dataset_id].iloc[0]
        out = _eval_one(row.to_dict(), str(r.modelo), cfg, capa="B", params=None)
        out["oof"].to_csv(oof_path, index=False)

    top_k_df = seleccionar_top_k(capa_b, cfg)
    top_k_df.to_csv(out_dir / "top_k_hpo_candidatos.csv", index=False)
    print(f"=== Capa C: HPO sobre {len(top_k_df)} candidatos ===")

    # ---- Capa C ----
    grids = cfg["hpo"]["grids"]
    c_jobs: list[tuple[dict, str, dict]] = []
    for r in top_k_df.itertuples():
        modelo = str(r.modelo)
        grid = grids.get(modelo, {})
        combos = expand_param_grid(grid) if grid else [{}]
        row = cat.loc[cat["dataset_id"] == r.dataset_id].iloc[0].to_dict()
        for params in combos:
            # coalescer null YAML
            clean = {k: (None if v == "null" else v) for k, v in params.items()}
            hid = _hparams_id(clean if clean else None)
            if not clean:
                hid = "default"
                # skip pure default already in B
                continue
            k = _key("C", row["dataset_id"], modelo, hid)
            if k not in done:
                c_jobs.append((row, modelo, clean))

    print(f"  pendientes HPO: {len(c_jobs)}")

    def _run_c(rd: dict, modelo: str, params: dict) -> dict[str, Any]:
        try:
            out = _eval_one(rd, modelo, cfg, capa="C", params=params)
            s = out["summary"]
            s["capa"] = "C"
            return s
        except Exception as e:  # noqa: BLE001
            return {
                "dataset_id": rd["dataset_id"],
                "temporal": rd.get("temporal", ""),
                "ubic_tag": rd.get("ubic_tag", ""),
                "ext_tag": rd.get("ext_tag", ""),
                "modelo": modelo,
                "capa": "C",
                "hparams_id": _hparams_id(params),
                "hparams_json": str(params),
                "n_folds": 0,
                "n_features": 0,
                "rmse_oof": float("nan"),
                "mae_oof": float("nan"),
                "r2_oof": float("nan"),
                "rmse_fold_mean": float("nan"),
                "rmse_fold_std": float("nan"),
                "mae_fold_mean": float("nan"),
                "r2_fold_mean": float("nan"),
                "error": str(e),
            }

    for i in range(0, len(c_jobs), chunk):
        batch = c_jobs[i : i + chunk]
        results = Parallel(n_jobs=n_jobs, prefer="processes")(
            delayed(_run_c)(rd, m, p) for rd, m, p in batch
        )
        _append_summaries(resumen_path, results)
        print(f"  C progreso {min(i + chunk, len(c_jobs))}/{len(c_jobs)}")

    # ---- Mejor C + predicción 59 + OOF ganador ----
    full = _rewrite_resumen_clean(resumen_path)
    capa_c = full[full["capa"] == "C"].dropna(subset=["rmse_oof"])
    capa_b = full[full["capa"] == "B"].dropna(subset=["rmse_oof"]).sort_values("rmse_oof")
    if len(capa_c):
        best = capa_c.sort_values("rmse_oof").iloc[0]
    else:
        best = capa_b.iloc[0]
        print("  aviso: sin filas C válidas; usando mejor B")

    print(
        f"=== Mejor: {best['dataset_id']} | {best['modelo']} | "
        f"RMSE={best['rmse_oof']:.4f} (capa {best['capa']}) ==="
    )

    params_best = None
    if best.get("hparams_json") and str(best["hparams_json"]) not in ("", "nan"):
        try:
            params_best = ast.literal_eval(str(best["hparams_json"]))
        except (ValueError, SyntaxError):
            params_best = None
    elif best["hparams_id"] not in ("default", "", "nan"):
        try:
            params_best = json.loads(str(best["hparams_id"]))
        except json.JSONDecodeError:
            params_best = None

    row_best = cat.loc[cat["dataset_id"] == best["dataset_id"]].iloc[0]
    out_best = _eval_one(
        row_best.to_dict(),
        str(best["modelo"]),
        cfg,
        capa=str(best["capa"]),
        params=params_best,
    )
    out_best["oof"].to_csv(
        oof_dir / f"GANADOR_{best['dataset_id']}__{best['modelo']}_oof.csv", index=False
    )

    bundle = load_from_catalog_row(row_best, cfg)
    pred = fit_predict_full(
        bundle, str(best["modelo"]), seed=seed, params=params_best
    )
    pred_df = bundle.meta_pred.copy()
    pred_df["rendimiento_pred_t_ha"] = pred
    pred_df["dataset_id"] = best["dataset_id"]
    pred_df["modelo"] = best["modelo"]
    pred_df["capa"] = best["capa"]
    pred_df["hparams_id"] = best["hparams_id"]
    pred_df.to_csv(out_dir / "prediccion_59_ganador.csv", index=False)

    # pixel check on ganador OOF
    oof = out_best["oof"].copy()
    oof["err2"] = (oof["y_pred"] - oof["y_true"]) ** 2
    oof["abserr"] = (oof["y_pred"] - oof["y_true"]).abs()
    pix = (
        oof.groupby("pixel_clima", dropna=False)
        .agg(n=("y_true", "size"), rmse=("err2", "mean"), mae=("abserr", "mean"))
        .reset_index()
    )
    pix["rmse"] = pix["rmse"] ** 0.5
    pix.to_csv(out_dir / "chequeo_pixel_ganador.csv", index=False)

    elapsed = time.time() - t0
    manifiesto = {
        "elapsed_s": elapsed,
        "n_resumen": len(_read_resumen(resumen_path)),
        "mejor": best.to_dict() if hasattr(best, "to_dict") else dict(best),
        "baseline_global_rmse": float(
            full[(full["capa"] == "A") & (full["modelo"] == "media_global")]["rmse_oof"].iloc[0]
        )
        if len(full[(full["capa"] == "A") & (full["modelo"] == "media_global")])
        else None,
    }
    (out_dir / "manifiesto_fin.json").write_text(
        json.dumps(manifiesto, indent=2, ensure_ascii=False, default=str) + "\n",
        encoding="utf-8",
    )
    print(f"OK superciclo en {elapsed / 60:.1f} min → {resumen_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
