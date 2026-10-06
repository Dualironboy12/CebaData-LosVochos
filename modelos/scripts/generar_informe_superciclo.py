#!/usr/bin/env python3
"""Genera informe HTML gráfico del superciclo (rankings, barras, diagnósticos, recomendaciones)."""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def img_tag(path: Path) -> str:
    if not path.is_file():
        return f"<p><em>Figura no disponible: {path.name}</em></p>"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f'<img src="data:image/png;base64,{b64}" alt="{path.name}" style="max-width:100%;height:auto;"/>'


def df_html(df: pd.DataFrame, n: int = 15) -> str:
    cols = [
        c
        for c in [
            "dataset_id",
            "modelo",
            "temporal",
            "ubic_tag",
            "ext_tag",
            "rmse_oof",
            "mae_oof",
            "r2_oof",
            "rmse_fold_std",
            "hparams_id",
            "capa",
        ]
        if c in df.columns
    ]
    show = df[cols].head(n).copy()
    for c in ("rmse_oof", "mae_oof", "r2_oof", "rmse_fold_std"):
        if c in show.columns:
            show[c] = show[c].map(lambda x: f"{x:.4f}" if pd.notna(x) else "")
    return show.to_html(index=False, classes="tbl", border=0, escape=True)


def main() -> None:
    comp = ROOT / "modelos" / "comparativas" / "superciclo_v1"
    fig = comp / "figuras"
    meta = json.loads((comp / "meta_analisis.json").read_text(encoding="utf-8"))
    top_b = pd.read_csv(comp / "ranking_capa_B_top20.csv")
    top_c = pd.read_csv(comp / "ranking_capa_C_top20.csv")
    reto = pd.read_csv(comp / "ranking_solo_reto_top15.csv")
    ext = pd.read_csv(comp / "ranking_extendido_top15.csv")

    best_b = meta["best_b"]
    best_c = meta["best_c"]
    bg, be = meta["baseline_global_rmse"], meta["baseline_estado_rmse"]

    # Recomendaciones por reglas
    rec_modelos = []
    if meta["hpo_gain_rmse"] < meta["umbral_hpo"]:
        rec_modelos.append(
            f"No seguir tuneando hiperparámetros de la familia ganadora: HPO aportó solo "
            f"{meta['hpo_gain_rmse']:.4f} RMSE (umbral {meta['umbral_hpo']})."
        )
    else:
        rec_modelos.append(
            f"HPO aportó {meta['hpo_gain_rmse']:.4f} RMSE; una pasada extra corta sobre el top-5 puede valer."
        )
    fam_top = list(meta["dominancia_top50"]["modelo"].keys())
    if fam_top and fam_top[0] in ("ridge", "elasticnet") and float(best_c["rmse_oof"]) <= float(
        top_b.loc[top_b["modelo"].isin(["hist_gradient_boosting", "lightgbm", "random_forest"]), "rmse_oof"].min()
        if len(top_b[top_b["modelo"].isin(["hist_gradient_boosting", "lightgbm", "random_forest"])])
        else best_c["rmse_oof"]
    ) + 0.03:
        rec_modelos.append("Lineales competitivos: preferir Ridge/ElasticNet para dashboard (menos deps, interpretable).")
    if fam_top and fam_top[0] in ("hist_gradient_boosting", "lightgbm", "random_forest"):
        rec_modelos.append(
            f"Árboles dominan el top-50 ({fam_top[0]}); no insistir en más alphas lineales."
        )
    rec_modelos.append(f"Veredicto Classic ML: **{meta['veredicto']}** — {meta['veredicto_detalle']}")

    rec_data = []
    rec_data.append(
        f"CSV recomendado (ganador): `{best_c.get('dataset_id')}` con modelo `{best_c.get('modelo')}`."
    )
    if meta.get("best_reto_rmse") is not None:
        rec_data.append(
            f"Mejor solo-reto RMSE={meta['best_reto_rmse']:.4f}; "
            f"mejor extendido RMSE={meta.get('best_ext_rmse')}. "
            f"Gap reto−ext={meta.get('gap_reto_vs_ext')}."
        )
        if meta.get("gap_reto_vs_ext") is not None and abs(meta["gap_reto_vs_ext"]) < 0.02:
            rec_data.append("Gap reto/extendido &lt; 0.02: entregar carril solo-reto salvo que el externo aporte trazabilidad.")
        elif meta.get("gap_reto_vs_ext") is not None and meta["gap_reto_vs_ext"] > 0.03:
            rec_data.append("Extendido mejora de forma clara: mantener un candidato extendido además del reto.")
    if meta.get("ubic_toxicos"):
        rec_data.append(
            "ubic_tag a dejar de priorizar (peores que baseline estado): "
            + ", ".join(f"`{u}`" for u in meta["ubic_toxicos"][:8])
        )
    temp_dom = meta["dominancia_top50"].get("temporal", {})
    if temp_dom:
        rec_data.append(f"Dominancia temporal en top-50: {temp_dom}.")

    rec_pred = [
        f"Predecir las 59 con el ganador C (`modelos/salidas/superciclo_v1/prediccion_59_ganador.csv`).",
        "No versionar miles de joblibs; un artefacto en `entrega/` cuando el equipo firme.",
    ]
    if meta.get("diagnostico_oof", {}).get("peores_municipios"):
        peores = meta["diagnostico_oof"]["peores_municipios"]
        rec_pred.append(
            "Municipios con peor RMSE OOF (confianza desigual): "
            + ", ".join(f"{p['municipio']} ({p['rmse']:.2f})" for p in peores)
        )

    rec_dash = [
        "Entrada: fila(s) con columnas del CSV ganador (sin rendimiento) o ID ya curado.",
        f"Salida: `rendimiento_pred_t_ha`, `modelo_id={best_c.get('modelo')}`, `dataset_id={best_c.get('dataset_id')}`, banda opcional ±{float(best_c['rmse_oof']):.2f} (RMSE OOF).",
        "UI MVP: lista/mapa de predicción → detalle parcela → panel ‘cómo se eligió’ (link a este HTML).",
        "Fuera de MVP: reentrenar en caliente o explorar los 1024 desde la web.",
    ]

    rec_proc = [
        "Re-correr solo capa C si cambia un CSV del top; no repetir los 1024 sin motivo.",
        "Conservar `resumen_superciclo.csv` como evidencia del agotamiento Classic.",
        f"Siguiente paso sugerido: {meta['veredicto']}.",
    ]

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Informe superciclo Classic ML — CebaData</title>
<style>
body {{ font-family: 'Segoe UI', system-ui, sans-serif; margin: 2rem; max-width: 1100px; color: #1a1a1a; background: #fafafa; }}
h1,h2,h3 {{ color: #0b3d5c; }}
.tbl {{ border-collapse: collapse; width: 100%; font-size: 0.85rem; margin: 1rem 0; background: #fff; }}
.tbl th, .tbl td {{ border: 1px solid #ddd; padding: 0.35rem 0.5rem; text-align: left; }}
.tbl th {{ background: #e8f1f8; }}
.card {{ background: #fff; border: 1px solid #e0e0e0; padding: 1rem 1.25rem; margin: 1rem 0; border-radius: 4px; }}
.verdict {{ font-size: 1.2rem; font-weight: 600; color: #0b3d5c; }}
ul {{ line-height: 1.45; }}
code {{ background: #eef3f7; padding: 0.1rem 0.3rem; border-radius: 3px; }}
.fig {{ margin: 1rem 0; }}
.meta {{ color: #555; font-size: 0.9rem; }}
</style>
</head>
<body>
<h1>Superciclo Classic ML</h1>
<p class="meta">CebaData / Los Vochos — fase 2. CV leave-one-municipio-out. Semilla 20261006.</p>

<div class="card">
<h2>Resumen ejecutivo</h2>
<p class="verdict">{meta['veredicto']}</p>
<p>{meta['veredicto_detalle']}</p>
<ul>
<li>Baseline media global RMSE OOF: <strong>{bg:.4f}</strong></li>
<li>Baseline media estado RMSE OOF: <strong>{be:.4f}</strong></li>
<li>Mejor capa B: <code>{best_b.get('dataset_id')}</code> / <code>{best_b.get('modelo')}</code> → <strong>{float(best_b['rmse_oof']):.4f}</strong></li>
<li>Mejor capa C (HPO): <code>{best_c.get('dataset_id')}</code> / <code>{best_c.get('modelo')}</code> → <strong>{float(best_c['rmse_oof']):.4f}</strong> (Δ HPO={meta['hpo_gain_rmse']:.4f})</li>
<li>Chequeo píxel (RMSE agregado): {meta.get('pixel_rmse_agregado')}</li>
</ul>
</div>

<h2>Rankings</h2>
<h3>Top-20 capa B (defaults)</h3>
{df_html(top_b, 20)}
<div class="fig">{img_tag(fig / '01_top10_capa_B.png')}</div>
<div class="fig">{img_tag(fig / '02_baseline_vs_top.png')}</div>

<h3>Top-20 capa C (HPO)</h3>
{df_html(top_c, 20)}

<h3>Solo reto vs extendido (capa B)</h3>
<p><strong>Solo reto</strong></p>
{df_html(reto, 15)}
<p><strong>Extendido</strong></p>
{df_html(ext, 15)}

<h2>Ejes del catálogo</h2>
<div class="fig">{img_tag(fig / '03_mejor_por_familia.png')}</div>
<div class="fig">{img_tag(fig / '04_mejor_por_temporal.png')}</div>
<div class="fig">{img_tag(fig / '05_mejor_por_ext_tag.png')}</div>
<div class="fig">{img_tag(fig / '06_mejor_por_ubic_tag_top15.png')}</div>
<div class="fig">{img_tag(fig / '07_peor_ubic_tag.png')}</div>
<p class="meta">Dominancia top-50: {json.dumps(meta['dominancia_top50'], ensure_ascii=False)}</p>

<h2>Diagnósticos</h2>
<div class="fig">{img_tag(fig / '08_error_por_municipio.png')}</div>
<div class="fig">{img_tag(fig / '09_hist_residuos.png')}</div>
<div class="fig">{img_tag(fig / '10_calibracion.png')}</div>
<p>Residuo medio OOF: {meta.get('diagnostico_oof', {}).get('residuo_mean')}; 
std: {meta.get('diagnostico_oof', {}).get('residuo_std')}.
Municipios con n=1: {meta.get('diagnostico_oof', {}).get('municipios_n1')}</p>
<p class="meta">Límites: LOGO con municipios de 1 parcela hace r² por fold inestable; confiar en RMSE/MAE OOF globales. Selección entre 1024×modelos implica riesgo de sobreajuste al ranking.</p>

<h2>Recomendaciones</h2>
<div class="card"><h3>Modelos</h3><ul>{''.join(f'<li>{x}</li>' for x in rec_modelos)}</ul></div>
<div class="card"><h3>Datasets / features</h3><ul>{''.join(f'<li>{x}</li>' for x in rec_data)}</ul></div>
<div class="card"><h3>Predicción de las 59 y entrega</h3><ul>{''.join(f'<li>{x}</li>' for x in rec_pred)}</ul></div>
<div class="card"><h3>Dashboard (fase 3)</h3><ul>{''.join(f'<li>{x}</li>' for x in rec_dash)}</ul></div>
<div class="card"><h3>Proceso / repo</h3><ul>{''.join(f'<li>{x}</li>' for x in rec_proc)}</ul></div>

</body></html>
"""
    # unescape intentional &lt; in one bullet - we used &lt; in f-string for gap
    out = comp / "informe_superciclo.html"
    out.write_text(html, encoding="utf-8")
    print(f"Informe → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
