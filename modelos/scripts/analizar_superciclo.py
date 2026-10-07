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


def _barh(
    path: Path,
    labels: list[str],
    values: list[float],
    title: str,
    xlabel: str,
    *,
    guia: str = "← Menor es mejor (error más bajo)",
) -> None:
    fig, ax = plt.subplots(figsize=(8, max(3.2, 0.35 * len(labels) + 1.4)))
    y = np.arange(len(labels))
    ax.barh(y, values, color="#2c7fb8")
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=8)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel)
    ax.set_title(title)
    for i, v in enumerate(values):
        ax.text(v + max(values) * 0.01, i, f"{v:.3f}", va="center", fontsize=7, color="#333")
    fig.text(0.01, 0.01, guia, fontsize=8, color="#444", style="italic")
    fig.tight_layout(rect=[0, 0.05, 1, 1])
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
        "Top-10 capa B — error RMSE en validación",
        "RMSE (t/ha) — menor es mejor",
        guia="Guía: barras más cortas = mejor modelo. RMSE = error típico en t/ha.",
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
        "Baselines vs top-8 — ¿superamos la media ingenua?",
        "RMSE (t/ha) — menor es mejor",
        guia="Guía: un buen modelo debe quedar claramente por debajo de media_global y media_estado.",
    )

    # Por familia
    fam = b.groupby("modelo")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "03_mejor_por_familia.png",
        fam.index.tolist(),
        fam.values.tolist(),
        "Mejor RMSE por familia de modelo",
        "RMSE (t/ha) — menor es mejor",
    )

    # Por temporal
    temp = b.groupby("temporal")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "04_mejor_por_temporal.png",
        temp.index.astype(str).tolist(),
        temp.values.tolist(),
        "Mejor RMSE por ventana temporal",
        "RMSE (t/ha) — menor es mejor",
        guia="Guía: compara solo2025 vs multianio; gana el de menor error.",
    )

    # Por ext_tag (top tags by best rmse)
    ext_best = b.groupby("ext_tag")["rmse_oof"].min().sort_values().head(12)
    _barh(
        fig_dir / "05_mejor_por_ext_tag.png",
        ext_best.index.astype(str).tolist(),
        ext_best.values.tolist(),
        "Mejor RMSE por paquete de datos externos (12 mejores)",
        "RMSE (t/ha) — menor es mejor",
    )

    # Ubic: peores y mejores
    ubic_best = b.groupby("ubic_tag")["rmse_oof"].min().sort_values()
    _barh(
        fig_dir / "06_mejor_por_ubic_tag_top15.png",
        ubic_best.head(15).index.astype(str).tolist(),
        ubic_best.head(15).values.tolist(),
        "Mejores combinaciones de ubicación (menor error)",
        "RMSE (t/ha) — menor es mejor",
        guia="Guía: estas son las ubicaciones que más ayudan (error más bajo).",
    )
    _barh(
        fig_dir / "07_peor_ubic_tag.png",
        ubic_best.tail(10).index.astype(str).tolist()[::-1],
        ubic_best.tail(10).values.tolist()[::-1],
        "Peores combinaciones de ubicación (error aún alto)",
        "RMSE (t/ha) — menor es mejor; aquí todas son malas",
        guia="Guía: barras largas = peores; conviene evitar estos esquemas de ubicación.",
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
            "Error por municipio (modelo ganador)",
            "RMSE (t/ha) — menor es mejor",
            guia="Guía: municipios con barra más larga fallan más. Cuidado si n=1 (ruido).",
        )

        fig, ax = plt.subplots(figsize=(5.4, 4.4))
        ax.hist(oof["residuo"], bins=20, color="#2c7fb8", edgecolor="white")
        ax.axvline(0, color="black", lw=1, label="Cero = sin error")
        ax.axvline(
            oof["residuo"].mean(),
            color="firebrick",
            linestyle="--",
            label=f"Sesgo medio = {oof['residuo'].mean():.3f}",
        )
        ax.set_xlabel("Residuo = predicho − real (t/ha)")
        ax.set_ylabel("Número de parcelas")
        ax.set_title("Residuos en validación")
        ax.legend(fontsize=7)
        fig.text(
            0.01,
            0.01,
            "Guía: ideal ≈ 0 y centrado. Positivo = sobreestima; negativo = subestima.",
            fontsize=7,
            style="italic",
            color="#444",
        )
        fig.tight_layout(rect=[0, 0.06, 1, 1])
        fig.savefig(fig_dir / "09_hist_residuos.png", dpi=120)
        plt.close(fig)

        fig, ax = plt.subplots(figsize=(5.4, 5.2))
        ax.scatter(oof["y_true"], oof["y_pred"], alpha=0.7, c="#2c7fb8", edgecolors="white", s=35)
        lims = [
            min(oof["y_true"].min(), oof["y_pred"].min()),
            max(oof["y_true"].max(), oof["y_pred"].max()),
        ]
        ax.plot(lims, lims, "k--", lw=1, label="Ideal: predicho = real")
        ax.set_xlabel("Rendimiento real (t/ha)")
        ax.set_ylabel("Rendimiento predicho (t/ha)")
        ax.set_title("Calibración: real vs predicho")
        ax.legend(fontsize=7)
        fig.text(
            0.01,
            0.01,
            "Guía: cuanto más cerca de la diagonal, mejor. Lejos = mala calibración.",
            fontsize=7,
            style="italic",
            color="#444",
        )
        fig.tight_layout(rect=[0, 0.06, 1, 1])
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
