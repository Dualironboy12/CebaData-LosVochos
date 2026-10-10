# Modelos

Fase 2: entrenar y evaluar estimadores de rendimiento (t/ha) en Python. Entradas desde [`../dataset_entrenamiento/`](../dataset_entrenamiento/). El dashboard consumirá el artefacto de entrega desde [`../dashboard/`](../dashboard/) más adelante.

Reglas: [`AGENTS.md`](AGENTS.md) · [`../AGENTS.md`](../AGENTS.md) · roadmap [`../README.md#roadmap`](../README.md#roadmap).

## Documentos de diseño

| Doc | Contenido |
| --- | --- |
| [`ESTADO_DATOS.md`](ESTADO_DATOS.md) | Readiness de despensas/matriz |
| [`PROPUESTA_MODELOS.md`](PROPUESTA_MODELOS.md) | Familias Classic ML y CV |
| [`DECISIONES_ABIERTAS.md`](DECISIONES_ABIERTAS.md) | D1–D7 (superciclo amplía D4/D5) |
| [`config/superciclo.yaml`](config/superciclo.yaml) | Grid 1024, modelos, HPO top-K |
| [`comparativas/superciclo_v1/informe_superciclo.html`](comparativas/superciclo_v1/informe_superciclo.html) | Informe técnico del superciclo |
| [`comparativas/superciclo_v1/resumen_equipo/Resumen_equipo_superciclo_Classic_ML.pdf`](comparativas/superciclo_v1/resumen_equipo/Resumen_equipo_superciclo_Classic_ML.pdf) | **PDF para el equipo** (lenguaje claro, top 10, heatmaps) |

## Superciclo Classic ML (v1)

Capas A (baselines) → B (1024 × ridge/elasticnet/RF/HistGBM/LightGBM) → C (HPO top-30).

```bash
bash modelos/preparar_entorno.sh
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python -u modelos/scripts/correr_superciclo.py
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python modelos/scripts/analizar_superciclo.py
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python modelos/scripts/generar_informe_superciclo.py
```

Entregables: `salidas/superciclo_v1/` (resumen, predicción 59) y `comparativas/superciclo_v1/` (rankings, figuras, HTML).

## Estructura

```text
modelos/
  config/default.yaml
  config/superciclo.yaml
  src/ceba_modelos/
  scripts/correr_superciclo.py
  scripts/analizar_superciclo.py
  scripts/generar_informe_superciclo.py
  salidas/superciclo_v1/
  comparativas/superciclo_v1/
  requirements.txt
```

## Entorno

```bash
bash modelos/preparar_entorno.sh
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python modelos/scripts/smoke_ingesta.py
```

Deps: numpy, pandas, scikit-learn, pyyaml, joblib, lightgbm, matplotlib.

## Ingesta (contrato)

1. Catálogo `catalogo_datasets_v1.csv`.
2. Features = CSV curado menos llaves/etiqueta.
3. Meta CV desde despensa aunque el CSV sea `sin_ubic`.
4. CV oficial LOGO por municipio.

## Estado

- [x] Fase 2 abierta; ingesta + barrido piloto 9 CSVs.
- [x] Superciclo v1 (1024 × 5 modelos + HPO) e informe HTML.
- [ ] Modelo de entrega firmado por el equipo (candidato en informe).
- [ ] Dashboard (fase 3).

## Rama

Trabajo en **`dev-modelos`** (D6).

## Convenciones

- Misma CV y semilla al comparar.
- Commits solo con autorización.
- Bitácora: [`../PROMPTS.md`](../PROMPTS.md).
