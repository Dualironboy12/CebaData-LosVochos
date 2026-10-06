#!/usr/bin/env python3
"""Resumen ejecutivo en PDF del superciclo, en lenguaje natural para el equipo.

Uso (desde la raíz del repo):
  env -i HOME="$HOME" PATH="/usr/bin:/bin" \\
    VIRTUAL_ENV="$PWD/modelos/.venv" \\
    PYTHONPATH="$PWD/modelos/.venv/lib/python3.12/site-packages:$PWD/modelos/src" \\
    /usr/bin/python3 modelos/scripts/generar_resumen_equipo_pdf.py
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
COMP = ROOT / "modelos" / "comparativas" / "superciclo_v1"
SAL = ROOT / "modelos" / "salidas" / "superciclo_v1"
OUT_DIR = COMP / "resumen_equipo"
FIG = OUT_DIR / "figuras"
PDF_PATH = OUT_DIR / "Resumen_equipo_superciclo_Classic_ML.pdf"

FAMILIA_ES = {
    "lightgbm": "LightGBM (árboles con boosting)",
    "hist_gradient_boosting": "Gradient boosting de scikit-learn",
    "random_forest": "Bosque aleatorio",
    "ridge": "Regresión Ridge (lineal regularizada)",
    "elasticnet": "Elastic Net (lineal con mezcla L1/L2)",
    "media_global": "Media global (baseline)",
    "media_estado": "Media por estado (baseline)",
}

EXT_ES = {
    "reto": "Solo datos del reto",
    "n": "Reto + nitrógeno del suelo (SoilGrids)",
    "edaf": "Reto + grupo edafológico (INEGI)",
    "cec": "Reto + capacidad de intercambio catiónico",
    "silt": "Reto + limo (SoilGrids)",
    "n-edaf": "Reto + nitrógeno + edafología",
    "n-edaf-silt": "Reto + nitrógeno + edafología + limo",
    "n-edaf-cec": "Reto + nitrógeno + edafología + CIC",
    "n-edaf-cec-silt": "Reto + nitrógeno + edafología + CIC + limo",
    "n-cec": "Reto + nitrógeno + CIC",
    "n-cec-silt": "Reto + nitrógeno + CIC + limo",
    "n-silt": "Reto + nitrógeno + limo",
    "edaf-cec": "Reto + edafología + CIC",
    "edaf-silt": "Reto + edafología + limo",
    "edaf-cec-silt": "Reto + edafología + CIC + limo",
    "cec-silt": "Reto + CIC + limo",
}


def ubic_es(tag: str) -> str:
    if tag == "sin_ubic" or not tag or (isinstance(tag, float) and np.isnan(tag)):
        return "Sin variables de ubicación"
    if tag == "ubic_completa":
        return "Ubicación completa (estado, municipio, longitud, latitud y píxel climático)"
    raw = str(tag).replace("ubic_", "")
    parts = {
        "est": "estado",
        "mun": "municipio",
        "lon": "longitud",
        "lat": "latitud",
        "pix": "píxel climático",
    }
    names = [parts.get(p, p) for p in raw.split("-")]
    if not names:
        return str(tag)
    if len(names) == 1:
        return f"Solo {names[0]}"
    return "Ubicación: " + ", ".join(names[:-1]) + " y " + names[-1]


def ext_es(tag: str) -> str:
    t = str(tag)
    return EXT_ES.get(t, f"Paquete de datos externos: {t}")


def temporal_es(t: str) -> str:
    if t == "solo2025":
        return "Solo ciclo 2025"
    if t == "multianio":
        return "Multi-año (2022–2025)"
    return str(t)


def modelo_corto(m: str) -> str:
    return {
        "lightgbm": "LightGBM",
        "hist_gradient_boosting": "Hist. boosting",
        "random_forest": "Bosque aleatorio",
        "ridge": "Ridge",
        "elasticnet": "Elastic Net",
    }.get(m, m)


def dataset_frase(row) -> str:
    return (
        f"{temporal_es(row['temporal'])}; {ubic_es(row['ubic_tag'])}; "
        f"{ext_es(row['ext_tag'])}"
    )


def ensure_dirs() -> None:
    FIG.mkdir(parents=True, exist_ok=True)


def load_tables():
    resumen = pd.read_csv(COMP / "resumen_superciclo.csv")
    meta = json.loads((COMP / "meta_analisis.json").read_text(encoding="utf-8"))
    pred59 = pd.read_csv(SAL / "prediccion_59_ganador.csv")
    return resumen, meta, pred59


def top10_por_carril(b: pd.DataFrame, reto: bool) -> pd.DataFrame:
    if reto:
        df = b[b["ext_tag"] == "reto"]
    else:
        df = b[b["ext_tag"] != "reto"]
    # Un modelo por dataset_id (mejor)
    df = df.sort_values("rmse_oof").drop_duplicates("dataset_id", keep="first")
    return df.head(10).reset_index(drop=True)


def mejores_familias(b: pd.DataFrame) -> pd.DataFrame:
    idx = b.groupby("modelo")["rmse_oof"].idxmin()
    return b.loc[idx].sort_values("rmse_oof").reset_index(drop=True)


def fig_barras_familias(fam: pd.DataFrame, path: Path) -> None:
    labels = [modelo_corto(m) for m in fam["modelo"]]
    fig, ax = plt.subplots(figsize=(8, 4.2))
    colors_b = sns.color_palette("Blues_r", n_colors=len(labels))
    ax.barh(labels, fam["rmse_oof"], color=colors_b)
    ax.invert_yaxis()
    ax.set_xlabel("Error RMSE en validación (t/ha)")
    ax.set_title("Mejor resultado de cada familia de modelos")
    for i, v in enumerate(fam["rmse_oof"]):
        ax.text(v + 0.01, i, f"{v:.3f}", va="center", fontsize=9)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_top10_carril(df: pd.DataFrame, title: str, path: Path) -> None:
    labels = []
    for i, r in df.iterrows():
        labels.append(f"{i+1}. {modelo_corto(r['modelo'])} · {ubic_es(r['ubic_tag'])[:42]}")
    fig, ax = plt.subplots(figsize=(9, 5.5))
    ax.barh(labels, df["rmse_oof"], color="#2c7fb8")
    ax.invert_yaxis()
    ax.set_xlabel("Error RMSE (t/ha)")
    ax.set_title(title)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_heatmap_oof(oof_paths: list[tuple[str, Path]], path: Path) -> None:
    """Heatmap: parcelas (filas) × modelos (columnas) con predicción OOF."""
    frames = []
    for name, p in oof_paths:
        if not p.is_file():
            continue
        d = pd.read_csv(p)[["ID_POLIGONO", "y_pred"]].rename(columns={"y_pred": name})
        frames.append(d.set_index("ID_POLIGONO"))
    if not frames:
        return
    mat = pd.concat(frames, axis=1).sort_index()
    # Submuestra visual: ordenar por predicción media
    mat["_m"] = mat.mean(axis=1)
    mat = mat.sort_values("_m").drop(columns="_m")
    # máximo ~40 filas para legibilidad
    if len(mat) > 40:
        idx = np.linspace(0, len(mat) - 1, 40).astype(int)
        mat = mat.iloc[idx]
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(
        mat,
        ax=ax,
        cmap="YlGnBu",
        cbar_kws={"label": "Rendimiento predicho (t/ha)"},
        xticklabels=True,
        yticklabels=False,
    )
    ax.set_title("Mapa de calor: predicciones en validación (mejores configuraciones)")
    ax.set_xlabel("Modelo / configuración")
    ax.set_ylabel("Parcelas de entrenamiento (muestra ordenada)")
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_real_vs_pred(oof_path: Path, path: Path, title: str) -> None:
    d = pd.read_csv(oof_path)
    fig, ax = plt.subplots(figsize=(5.5, 5.2))
    ax.scatter(d["y_true"], d["y_pred"], alpha=0.75, c="#1b9e77", edgecolors="white", s=40)
    lo = min(d["y_true"].min(), d["y_pred"].min())
    hi = max(d["y_true"].max(), d["y_pred"].max())
    ax.plot([lo, hi], [lo, hi], "k--", lw=1, label="Ideal (predicción = realidad)")
    ax.set_xlabel("Rendimiento real (t/ha)")
    ax.set_ylabel("Rendimiento predicho (t/ha)")
    ax.set_title(title)
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_residuos(oof_path: Path, path: Path) -> None:
    d = pd.read_csv(oof_path)
    res = d["y_pred"] - d["y_true"]
    fig, ax = plt.subplots(figsize=(6, 3.8))
    ax.hist(res, bins=18, color="#7570b3", edgecolor="white")
    ax.axvline(res.mean(), color="firebrick", ls="--", label=f"Sesgo medio = {res.mean():.2f} t/ha")
    ax.set_xlabel("Error (predicho − real)")
    ax.set_ylabel("Número de parcelas")
    ax.set_title("Distribución de errores en validación (modelo ganador)")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_error_municipio(path_csv: Path, path: Path) -> None:
    d = pd.read_csv(path_csv).sort_values("rmse", ascending=True)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.barh(d["municipio"].astype(str), d["rmse"], color="#d95f02")
    ax.set_xlabel("Error RMSE (t/ha)")
    ax.set_title("Error por municipio (modelo ganador, validación)")
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def fig_pred59(pred: pd.DataFrame, path: Path) -> None:
    d = pred.sort_values("rendimiento_pred_t_ha")
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(
        d["ID_POLIGONO"].astype(str),
        d["rendimiento_pred_t_ha"],
        color="#1f78b4",
        height=0.8,
    )
    ax.set_xlabel("Rendimiento predicho (t/ha)")
    ax.set_title("Predicciones del ganador sobre las 59 parcelas sin etiqueta")
    ax.tick_params(axis="y", labelsize=6)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def fig_comparacion_metricas(rows: list[dict], path: Path) -> None:
    df = pd.DataFrame(rows)
    fig, ax = plt.subplots(figsize=(8, 4))
    x = np.arange(len(df))
    w = 0.35
    ax.bar(x - w / 2, df["rmse"], w, label="RMSE", color="#2c7fb8")
    ax.bar(x + w / 2, df["mae"], w, label="MAE", color="#fdae61")
    ax.set_xticks(x)
    ax.set_xticklabels(df["nombre"], rotation=20, ha="right", fontsize=8)
    ax.set_ylabel("Error (t/ha)")
    ax.set_title("Comparación de métricas entre los mejores candidatos")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


def oof_path_for(dataset_id: str, modelo: str) -> Path:
    return SAL / "oof" / f"B_{dataset_id}__{modelo}_oof.csv"


def build_pdf(
    fam: pd.DataFrame,
    top_reto: pd.DataFrame,
    top_ext: pd.DataFrame,
    meta: dict,
    pred59: pd.DataFrame,
    figs: dict[str, Path],
) -> None:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="Titulo",
            parent=styles["Heading1"],
            fontSize=18,
            spaceAfter=12,
            textColor=colors.HexColor("#0b3d5c"),
            alignment=TA_CENTER,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2c",
            parent=styles["Heading2"],
            fontSize=13,
            textColor=colors.HexColor("#0b3d5c"),
            spaceBefore=14,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyJ",
            parent=styles["BodyText"],
            fontSize=10,
            leading=14,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Nota",
            parent=styles["BodyText"],
            fontSize=8,
            textColor=colors.HexColor("#555555"),
            leading=11,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Cell",
            parent=styles["BodyText"],
            fontSize=7.5,
            leading=9,
        )
    )

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    story = []

    best_c = meta["best_c"]
    best_b = meta["best_b"]
    bg, be = meta["baseline_global_rmse"], meta["baseline_estado_rmse"]

    story.append(Paragraph("Resumen para el equipo — Modelos de rendimiento de cebada", styles["Titulo"]))
    story.append(
        Paragraph(
            "Superciclo Classic ML · Reto AgroCebada FIRA 2026 · Equipo Los Vochos",
            styles["Nota"],
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "Este documento resume, en lenguaje claro, qué familias de modelos y qué "
            "conjuntos de datos funcionaron mejor tras probar de forma sistemática "
            "todas las tablas curadas (1024) con varios algoritmos clásicos. "
            "La validación oficial deja fuera un municipio completo en cada ronda "
            "(leave-one-municipio-out). La métrica principal es el error RMSE en "
            "toneladas por hectárea: <b>más bajo es mejor</b>.",
            styles["BodyJ"],
        )
    )

    # Mensaje clave
    story.append(Paragraph("Mensaje clave", styles["H2c"]))
    story.append(
        Paragraph(
            f"El mejor resultado afinado obtiene un RMSE de <b>{float(best_c['rmse_oof']):.3f} t/ha</b> "
            f"(explica ~{100*float(best_c['r2_oof']):.0f}% de la varianza en validación), "
            f"frente a una media ingenua por estado de <b>{be:.3f} t/ha</b>. "
            f"Ajustar hiperparámetros apenas mejoró {meta['hpo_gain_rmse']:.3f} t/ha. "
            f"<b>Veredicto:</b> {meta['veredicto']}. "
            "Conviene congelar un candidato Classic para entrega y dashboard, no seguir "
            "barridos masivos de modelos.",
            styles["BodyJ"],
        )
    )
    story.append(
        Paragraph(
            f"<b>Ganador propuesto:</b> {FAMILIA_ES.get(best_c['modelo'], best_c['modelo'])} "
            f"sobre un dataset de {temporal_es(best_c['temporal'])}, "
            f"{ubic_es(best_c['ubic_tag'])}, y {ext_es(best_c['ext_tag'])}.",
            styles["BodyJ"],
        )
    )

    # Familias
    story.append(Paragraph("1. Mejores familias de modelos", styles["H2c"]))
    story.append(
        Paragraph(
            "Para cada familia tomamos su mejor combinación de datos. "
            "LightGBM domina con claridad; los lineales (Ridge) siguen siendo útiles "
            "como referencia interpretable. Elastic Net quedó por debajo de los baselines "
            "en este diseño y no se recomienda.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["familias"]), width=16 * cm, height=8.2 * cm))

    # Tabla familias
    data = [["Familia", "RMSE", "MAE", "r²", "Tipo de datos (resumen)"]]
    for _, r in fam.iterrows():
        data.append(
            [
                Paragraph(modelo_corto(r["modelo"]), styles["Cell"]),
                f"{r['rmse_oof']:.3f}",
                f"{r['mae_oof']:.3f}",
                f"{r['r2_oof']:.2f}",
                Paragraph(dataset_frase(r)[:90], styles["Cell"]),
            ]
        )
    t = Table(data, colWidths=[3.2 * cm, 1.6 * cm, 1.6 * cm, 1.4 * cm, 8.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b3d5c")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f7fa")]),
            ]
        )
    )
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph("2. Top 10 — datos solo del reto (originales)", styles["H2c"]))
    story.append(
        Paragraph(
            "Carril sin SoilGrids ni edafología INEGI. Útil si la entrega debe basarse "
            "únicamente en el dataset oficial del reto.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["top_reto"]), width=16.5 * cm, height=10 * cm))

    data = [["#", "Modelo", "RMSE", "MAE", "r²", "Descripción del dataset"]]
    for i, r in top_reto.iterrows():
        data.append(
            [
                str(i + 1),
                Paragraph(modelo_corto(r["modelo"]), styles["Cell"]),
                f"{r['rmse_oof']:.3f}",
                f"{r['mae_oof']:.3f}",
                f"{r['r2_oof']:.2f}",
                Paragraph(dataset_frase(r), styles["Cell"]),
            ]
        )
    t = Table(data, colWidths=[0.8 * cm, 2.4 * cm, 1.5 * cm, 1.5 * cm, 1.2 * cm, 9.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c7fb8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph("3. Top 10 — datos extendidos (reto + externos)", styles["H2c"]))
    story.append(
        Paragraph(
            "Carril que añade variables de suelo (SoilGrids y/o INEGI). "
            "En el superciclo aportan una mejora pequeña pero consistente respecto al solo-reto.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["top_ext"]), width=16.5 * cm, height=10 * cm))

    data = [["#", "Modelo", "RMSE", "MAE", "r²", "Descripción del dataset"]]
    for i, r in top_ext.iterrows():
        data.append(
            [
                str(i + 1),
                Paragraph(modelo_corto(r["modelo"]), styles["Cell"]),
                f"{r['rmse_oof']:.3f}",
                f"{r['mae_oof']:.3f}",
                f"{r['r2_oof']:.2f}",
                Paragraph(dataset_frase(r), styles["Cell"]),
            ]
        )
    t = Table(data, colWidths=[0.8 * cm, 2.4 * cm, 1.5 * cm, 1.5 * cm, 1.2 * cm, 9.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1b9e77")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph("4. Cómo se comportan los mejores en validación", styles["H2c"]))
    story.append(
        Paragraph(
            "Cada parcela de entrenamiento se predice exactamente una vez cuando su "
            "municipio queda fuera del aprendizaje. Abajo: comparación de métricas, "
            "mapa de calor de predicciones y contraste realidad vs predicción del ganador.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["metricas"]), width=16 * cm, height=8 * cm))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Image(str(figs["heatmap"]), width=16.5 * cm, height=12.5 * cm))

    story.append(PageBreak())
    story.append(Paragraph("5. Real vs predicho (modelo ganador)", styles["H2c"]))
    story.append(
        Paragraph(
            "Si los puntos se acercan a la diagonal, el modelo está bien calibrado. "
            "El histograma de errores muestra si tiende a sobre- o sub-estimar.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["scatter"]), width=11 * cm, height=10.4 * cm))
    story.append(Image(str(figs["residuos"]), width=14 * cm, height=8.5 * cm))
    story.append(Image(str(figs["municipio"]), width=16 * cm, height=9 * cm))

    story.append(PageBreak())
    story.append(Paragraph("6. Predicciones sobre las 59 parcelas ocultas", styles["H2c"]))
    story.append(
        Paragraph(
            "Estas parcelas no tienen rendimiento observado en el reto. "
            "El gráfico muestra la predicción del modelo ganador (ordenadas de menor a mayor). "
            "No hay etiqueta real para comparar aquí; la calidad se respalda en la validación anterior.",
            styles["BodyJ"],
        )
    )
    story.append(Image(str(figs["pred59"]), width=16 * cm, height=12 * cm))

    # Tabla muestra predicciones
    muestra = pred59.sort_values("rendimiento_pred_t_ha", ascending=False).head(12)
    data = [["Parcela", "Municipio", "Estado", "Predicción (t/ha)"]]
    for _, r in muestra.iterrows():
        data.append(
            [
                str(r["ID_POLIGONO"]),
                str(r.get("municipio", "")),
                str(r.get("estado", "")),
                f"{r['rendimiento_pred_t_ha']:.2f}",
            ]
        )
    story.append(Paragraph("Muestra: las 12 predicciones más altas", styles["BodyJ"]))
    t = Table(data, colWidths=[3 * cm, 5 * cm, 3.5 * cm, 3.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b3d5c")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f7fa")]),
            ]
        )
    )
    story.append(t)

    story.append(Paragraph("7. Recomendaciones al equipo", styles["H2c"]))
    story.append(
        Paragraph(
            "• <b>Congelar</b> LightGBM con longitud + píxel climático + nitrógeno y edafología "
            f"(RMSE {float(best_c['rmse_oof']):.3f}) como candidato de entrega.<br/>"
            f"• Mantener un respaldo <b>solo reto</b> (mejor ~{meta['best_reto_rmse']:.3f} RMSE) "
            "por si el jurado prioriza no usar externos.<br/>"
            "• No invertir más tiempo en barridos de 1024 tablas ni en más hiperparámetros: "
            "el margen ya es mínimo.<br/>"
            "• Siguiente paso de producto: empaquetar el modelo en <i>entrega/</i> y abrir el dashboard.<br/>"
            "• Cuidado: algunos municipios tienen una sola parcela; su error individual es ruidoso.",
            styles["BodyJ"],
        )
    )
    story.append(
        Paragraph(
            f"Baselines de referencia — media global: {bg:.3f} t/ha; media por estado: {be:.3f} t/ha. "
            "Informe técnico detallado: modelos/comparativas/superciclo_v1/informe_superciclo.html",
            styles["Nota"],
        )
    )

    doc.build(story)


def main() -> None:
    ensure_dirs()
    resumen, meta, pred59 = load_tables()
    b = resumen[resumen["capa"] == "B"].dropna(subset=["rmse_oof"]).copy()
    fam = mejores_familias(b)
    # Excluir baselines de "familias de modelos" si colaron
    fam = fam[~fam["modelo"].isin(["media_global", "media_estado"])].reset_index(drop=True)
    top_reto = top10_por_carril(b, reto=True)
    top_ext = top10_por_carril(b, reto=False)

    figs = {
        "familias": FIG / "01_mejores_familias.png",
        "top_reto": FIG / "02_top10_solo_reto.png",
        "top_ext": FIG / "03_top10_extendido.png",
        "metricas": FIG / "04_metricas_candidatos.png",
        "heatmap": FIG / "05_heatmap_predicciones.png",
        "scatter": FIG / "06_real_vs_predicho.png",
        "residuos": FIG / "07_residuos.png",
        "municipio": FIG / "08_error_municipio.png",
        "pred59": FIG / "09_predicciones_59.png",
    }

    fig_barras_familias(fam, figs["familias"])
    fig_top10_carril(top_reto, "Top 10 — solo datos del reto", figs["top_reto"])
    fig_top10_carril(top_ext, "Top 10 — datos extendidos", figs["top_ext"])

    # Candidatos para comparar métricas: mejor familia + ganador C + mejor reto
    candidatos = []
    for _, r in fam.head(4).iterrows():
        candidatos.append(
            {
                "nombre": modelo_corto(r["modelo"]),
                "rmse": r["rmse_oof"],
                "mae": r["mae_oof"],
                "dataset_id": r["dataset_id"],
                "modelo": r["modelo"],
            }
        )
    # ganador C
    candidatos.insert(
        0,
        {
            "nombre": "Ganador (ajustado)",
            "rmse": float(meta["best_c"]["rmse_oof"]),
            "mae": float(meta["best_c"]["mae_oof"]),
            "dataset_id": meta["best_c"]["dataset_id"],
            "modelo": meta["best_c"]["modelo"],
        },
    )
    fig_comparacion_metricas(candidatos[:5], figs["metricas"])

    # Heatmap: usar OOF disponibles de top configs LightGBM + ridge si hay
    oof_list: list[tuple[str, Path]] = []
    gan = SAL / "oof" / f"GANADOR_{meta['best_c']['dataset_id']}__{meta['best_c']['modelo']}_oof.csv"
    if gan.is_file():
        oof_list.append(("Ganador", gan))
    for _, r in top_ext.head(4).iterrows():
        p = oof_path_for(r["dataset_id"], r["modelo"])
        label = f"{modelo_corto(r['modelo'])}\n{ext_es(r['ext_tag'])[:28]}"
        if p.is_file():
            oof_list.append((label.replace("\n", " · "), p))
    for _, r in top_reto.head(2).iterrows():
        p = oof_path_for(r["dataset_id"], r["modelo"])
        if p.is_file():
            oof_list.append((f"{modelo_corto(r['modelo'])} · solo reto", p))
    # dedupe by path
    seen = set()
    uniq = []
    for name, p in oof_list:
        if str(p) in seen:
            continue
        seen.add(str(p))
        uniq.append((name, p))
    fig_heatmap_oof(uniq[:6], figs["heatmap"])

    fig_real_vs_pred(gan, figs["scatter"], "Real vs predicho — modelo ganador (validación)")
    fig_residuos(gan, figs["residuos"])
    fig_error_municipio(COMP / "diag_error_por_municipio.csv", figs["municipio"])
    fig_pred59(pred59, figs["pred59"])

    # Export CSV amigables
    fam_out = fam.copy()
    fam_out["familia"] = fam_out["modelo"].map(lambda m: FAMILIA_ES.get(m, m))
    fam_out["descripcion_dataset"] = fam_out.apply(dataset_frase, axis=1)
    fam_out[
        ["familia", "rmse_oof", "mae_oof", "r2_oof", "descripcion_dataset", "dataset_id"]
    ].to_csv(OUT_DIR / "tabla_mejores_familias.csv", index=False)

    for name, df in [("top10_solo_reto", top_reto), ("top10_extendido", top_ext)]:
        o = df.copy()
        o["descripcion"] = o.apply(dataset_frase, axis=1)
        o["modelo_es"] = o["modelo"].map(modelo_corto)
        o[["modelo_es", "rmse_oof", "mae_oof", "r2_oof", "descripcion", "dataset_id"]].to_csv(
            OUT_DIR / f"{name}.csv", index=False
        )

    build_pdf(fam, top_reto, top_ext, meta, pred59, figs)
    print(f"PDF → {PDF_PATH.relative_to(ROOT)}")
    print(f"Figuras → {FIG.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
