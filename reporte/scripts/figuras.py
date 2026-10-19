"""Figuras del reporte a partir de los artefactos congelados de la API."""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import json
import shutil

RAIZ = Path(__file__).resolve().parents[2]
DEST = Path(__file__).resolve().parents[1] / "figuras"
DEST.mkdir(parents=True, exist_ok=True)

VERDE = "#2F5D50"
OCRE = "#A67C52"
TINTA = "#1C2421"
GRIS = "#5C6560"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.edgecolor": TINTA,
    "axes.labelcolor": TINTA,
    "xtick.color": TINTA,
    "ytick.color": TINTA,
    "text.color": TINTA,
    "axes.titlesize": 12,
    "axes.labelsize": 10,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.grid": True,
    "grid.color": "#E4E1D8",
    "grid.linewidth": 0.6,
})

d = json.loads((RAIZ / "sistema/api/artefactos/metricas_dashboard.json").read_text())

# Dispersión observado vs. predicho
fig, ax = plt.subplots(figsize=(5.4, 5.0))
xs = [p["obs"] for p in d["dispersion"]]
ys = [p["pred"] for p in d["dispersion"]]
ax.scatter(xs, ys, s=22, c=VERDE, alpha=0.75, linewidths=0)
lo, hi = 1.2, 6.2
ax.plot([lo, hi], [lo, hi], color=OCRE, lw=1.2, label="Identidad")
ax.set_xlim(lo, hi)
ax.set_ylim(lo, hi)
ax.set_xlabel("Rendimiento observado (t/ha)")
ax.set_ylabel("Predicción fuera de muestra (t/ha)")
ax.set_title("Mezcla: 138 parcelas con etiqueta")
ax.set_aspect("equal", adjustable="box")
fig.tight_layout()
fig.savefig(DEST / "dispersion.png", dpi=160)
plt.close()

# Residuales
fig, ax = plt.subplots(figsize=(5.6, 3.6))
ax.hist(d["residuales"], bins=18, color=VERDE, edgecolor="white")
ax.axvline(0, color=OCRE, lw=1.2)
ax.set_xlabel("Residual observado − predicho (t/ha)")
ax.set_ylabel("Parcelas")
ax.set_title("Residuales de la validación estratificada")
fig.tight_layout()
fig.savefig(DEST / "residuales.png", dpi=160)
plt.close()

# Ablación
bloques = d["hallazgos"]["bloques"]
fig, ax = plt.subplots(figsize=(6.4, 3.8))
etiquetas = [b["etiqueta"] for b in bloques][::-1]
rmses = [b["rmse"] for b in bloques][::-1]
colores = [OCRE if e == "Solo clima" else VERDE for e in etiquetas]
ax.barh(etiquetas, rmses, color=colores)
ax.set_xlabel("RMSE estratificado (t/ha)")
ax.set_xlim(0.45, 0.68)
ax.set_title("Ablación por bloques (mismo esquema de validación)")
fig.tight_layout()
fig.savefig(DEST / "ablacion.png", dpi=160)
plt.close()

# LOMO por municipio (mezcla, n >= 5, como publica el artefacto)
rob = d["robustez_espacial"]
fig, ax = plt.subplots(figsize=(6.4, 3.6))
nombres = [f"{r['municipio']} (n={r['n']})" for r in rob]
ax.barh(nombres[::-1], [r["rmse"] for r in rob][::-1], color=VERDE)
ax.set_xlabel("RMSE al dejar el municipio fuera (t/ha)")
ax.set_title("Robustez espacial de la mezcla")
fig.tight_layout()
fig.savefig(DEST / "lomo_municipio.png", dpi=160)
plt.close()

origen = RAIZ / "sistema/api/pipeline/salidas"
for nombre in ("fig_shap_familias.png", "fig_shap_resumen.png"):
    shutil.copy(origen / nombre, DEST / nombre)

print("figuras en", DEST)
