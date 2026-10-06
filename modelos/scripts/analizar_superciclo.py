#!/usr/bin/env python3
"""Agrega resúmenes del superciclo y genera figuras PNG para el informe."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "modelos" / "src"))

from ceba_modelos.config import load_config  # noqa: E402


def _barh(path: Path, labels: list[str], values: list[float], title: str, xlabel: str) -> None:
    fig, ax = plt.subplots(figsize=(8, max(3, 0.35 * len(labels) + 1)))
    y = np.arange(len(labels))
    ax.barh(y, values, color="#2c7fb8")
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=8)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel)
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def main() -> None:
    cfg = load_config(ROOT / "modelos" / "config" / "superciclo.yaml")
    out = ROOT / cfg["paths"]["salidas"]
    comp = ROOT / cfg["paths"]["comparativas"]
    fig_dir = comp / "figuras"
    fig_dir.mkdir(parents=True, exist_ok=True)

    resumen = pd.read_csv(out / "resumen_superciclo.csv")
    resumen.to_csv(comp / "resumen_superciclo.csv", index=False)

    a = resumen[resumen["capa"] == "A"]
    b = resumen[resumen["capa"] == "B"].dropna(subset=["rmse_oof"])
    c = resumen[resumen["capa"] == "C"].dropna(subset=["rmse_oof"])

    base_g = float(a.loc[a["modelo"] == "media_global", "rmse_oof"].iloc[0])
    base_e = float(a.loc[a["modelo"] == "media_estado", "rmse_oof"].iloc[0])

    best_b = b.sort_values("rmse_oof").iloc[0]
    best_c = c.sort_values("rmse_oof").iloc[0] if len(c) else best_b
    hpo_gain = float(best_b["rmse_oof"]) - float(best_c["rmse_oof"])

    # Rankings
    top20_b = b.sort_values("rmse_oof").head(20)
    top20_c = c.sort_values("rmse_oof").head(20) if len(c) else top20_b
    top20_b.to_csv(comp / "ranking_capa_B_top20.csv", index=False)
    top20_c.to_csv(comp / "ranking_capa_C_top20.csv", index=False)

    reto = b[b["ext_tag"] == "reto"].sort_values("rmse_oof")
    ext = b[b["ext_tag"] != "reto"].sort_values("rmse_oof")
    reto.head(15).to_csv(comp / "ranking_solo_reto_top15.csv", index=False)
    ext.head(15).to_csv(comp / "ranking_extendido_top15.csv", index=False)

    # Figuras ranking
    tb = top20_b.head(10)
    labels = [f"{r.modelo[:12]}|{r.dataset_id[-40:]}" for r in tb.itertuples()]
    _barh(
        fig_dir / "01_top10_capa_B.png",
        labels,
        tb["rmse_oof"].tolist(),
        "Top-10 capa B (RMSE OOF)",
        "RMSE OOF",
    )

    # Baseline vs top
    labels2 = ["media_global", "media_estado"] + [
        f"{r.modelo}" for r in tb.head(8).itertuples()
    ]
    vals2 = [base_g, base_e] + tb.head(8)["rmse_oof"].tolist()
    _barh(
        fig_dir / "02_baseline_vs_top.png",
        labels2,
        vals2,
        "Baselines vs top-8 capa B",
        "RMSE OOF",
    )

    # Por familia
    fam = b.groupby("modelo")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "03_mejor_por_familia.png",
        fam.index.tolist(),
        fam.values.tolist(),
        "Mejor RMSE OOF por familia (capa B)",
        "RMSE OOF",
    )

    # Por temporal
    temp = b.groupby("temporal")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "04_mejor_por_temporal.png",
        temp.index.astype(str).tolist(),
        temp.values.tolist(),
        "Mejor RMSE OOF por ventana temporal",
        "RMSE OOF",
    )

    # Por ext_tag (top tags by best rmse)
    ext_best = b.groupby("ext_tag")["rmse_oof"].min().sort_values().head(12)
    _barh(
        fig_dir / "05_mejor_por_ext_tag.png",
        ext_best.index.astype(str).tolist(),
        ext_best.values.tolist(),
        "Mejor RMSE OOF por ext_tag (12 mejores)",
        "RMSE OOF",
    )

    # Ubic: peores y mejores
    ubic_best = b.groupby("ubic_tag")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "06_mejor_por_ubic_tag_top15.png",
        ubic_best.head(15).index.astype(str).tolist(),
        ubic_best.head(15).values.tolist(),
        "Mejores ubic_tag (min RMSE en capa B)",
        "RMSE OOF",
    )
    _barh(
        fig_dir / "07_peor_ubic_tag.png",
        ubic_best.tail(10).index.astype(str).tolist()[::-1],
        ubic_best.tail(10).values.tolist()[::-1],
        "Peores ubic_tag (min RMSE aún alto)",
        "RMSE OOF",
    )

    # Diagnósticos OOF ganador
    gan_files = list((out / "oof").glob("GANADOR_*_oof.csv"))
    diag = {}
    if gan_files:
        oof = pd.read_csv(gan_files[0])
        by_mun = (
            oof.assign(err2=(oof["y_pred"] - oof["y_true"]) ** 2, abserr=(oof["y_pred"] - oof["y_true"]).abs())
            .groupby("municipio")
            .agg(n=("y_true", "size"), rmse=("err2", "mean"), mae=("abserr", "mean"))
            .reset_index()
        )
        by_mun["rmse"] = by_mun["rmse"] ** 0.5
        by_mun = by_mun.sort_values("rmse", ascending=False)
        by_mun.to_csv(comp / "diag_error_por_municipio.csv", index=False)
        _barh(
            fig_dir / "08_error_por_municipio.png",
            by_mun["municipio"].astype(str).tolist(),
            by_mun["rmse"].tolist(),
            "RMSE OOF por municipio (ganador)",
            "RMSE",
        )

        fig, ax = plt.subplots(figsize=(5, 4))
        ax.hist(oof["residuo"], bins=20, color="#2c7fb8", edgecolor="white")
        ax.axvline(oof["residuo"].mean(), color="firebrick", linestyle="--", label=f"media={oof['residuo'].mean():.3f}")
        ax.set_title("Residuos OOF (y_pred - y_true)")
        ax.legend()
        fig.tight_layout()
        fig.savefig(fig_dir / "09_hist_residuos.png", dpi=120)
        plt.close(fig)

        fig, ax = plt.subplots(figsize=(5, 5))
        ax.scatter(oof["y_true"], oof["y_pred"], alpha=0.7, c="#2c7fb8")
        lims = [
            min(oof["y_true"].min(), oof["y_pred"].min()),
            max(oof["y_true"].max(), oof["y_pred"].max()),
        ]
        ax.plot(lims, lims, "k--", lw=1)
        ax.set_xlabel("y_true")
        ax.set_ylabel("y_pred")
        ax.set_title("Calibración OOF")
        fig.tight_layout()
        fig.savefig(fig_dir / "10_calibracion.png", dpi=120)
        plt.close(fig)

        diag["residuo_mean"] = float(oof["residuo"].mean())
        diag["residuo_std"] = float(oof["residuo"].std())
        diag["peores_municipios"] = by_mun.head(3)[["municipio", "n", "rmse"]].to_dict(orient="records")
        diag["municipios_n1"] = by_mun.loc[by_mun["n"] == 1, "municipio"].astype(str).tolist()

    # Estabilidad top20
    stab = top20_b[["dataset_id", "modelo", "rmse_oof", "rmse_fold_std"]].copy()
    stab["fragil"] = (stab["rmse_fold_std"] > 0.4) & (stab["rmse_oof"] < base_e)
    stab.to_csv(comp / "diag_estabilidad_top20.csv", index=False)

    # Toxic tags: min rmse worse than baseline estado
    toxic = ubic_best[ubic_best > base_e]
    # Dominancia top50
    top50 = b.sort_values("rmse_oof").head(50)
    dom = {
        "modelo": top50["modelo"].value_counts().to_dict(),
        "temporal": top50["temporal"].value_counts().to_dict(),
        "ext_tag": top50["ext_tag"].value_counts().head(10).to_dict(),
        "ubic_tag": top50["ubic_tag"].value_counts().head(10).to_dict(),
    }

    best_reto = float(reto.iloc[0]["rmse_oof"]) if len(reto) else None
    best_ext = float(ext.iloc[0]["rmse_oof"]) if len(ext) else None

    umbral = float(cfg["veredicto"]["hpo_mejora_minima_rmse"])
    if hpo_gain < umbral and float(best_b["rmse_oof"]) < base_e - 0.15:
        veredicto = "Classic suficiente para entrega"
        detalle = (
            f"HPO mejoró solo {hpo_gain:.4f} RMSE (<{umbral}); "
            f"mejor B ya bate baseline estado por {base_e - float(best_b['rmse_oof']):.3f}."
        )
    elif hpo_gain >= umbral:
        veredicto = "Seguir afinando Classic"
        detalle = f"HPO aportó {hpo_gain:.4f} RMSE; conviene otra pasada corta o más features."
    else:
        veredicto = "Explorar otra vía"
        detalle = (
            f"Mejora vs baseline limitada (best={float(best_c['rmse_oof']):.3f}, "
            f"baseline_estado={base_e:.3f})."
        )

    pixel_path = out / "chequeo_pixel_ganador.csv"
    pixel_rmse = None
    if pixel_path.is_file():
        pix = pd.read_csv(pixel_path)
        pixel_rmse = float(((pix["rmse"] ** 2) * pix["n"]).sum() / pix["n"].sum()) ** 0.5

    meta = {
        "baseline_global_rmse": base_g,
        "baseline_estado_rmse": base_e,
        "best_b": best_b.to_dict(),
        "best_c": best_c.to_dict() if len(c) else best_b.to_dict(),
        "hpo_gain_rmse": hpo_gain,
        "best_reto_rmse": best_reto,
        "best_ext_rmse": best_ext,
        "gap_reto_vs_ext": None
        if best_reto is None or best_ext is None
        else best_reto - best_ext,
        "dominancia_top50": dom,
        "ubic_toxicos": toxic.index.astype(str).tolist()[:15],
        "diagnostico_oof": diag,
        "pixel_rmse_agregado": pixel_rmse,
        "veredicto": veredicto,
        "veredicto_detalle": detalle,
        "umbral_hpo": umbral,
    }
    (comp / "meta_analisis.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8"
    )
    print(f"Análisis OK → {comp.relative_to(ROOT)}")
    print(f"Veredicto: {veredicto}")


if __name__ == "__main__":
    main()
