# Modelos

Fase 2: entrenar y evaluar estimadores de rendimiento (t/ha) en Python. Entradas desde `[../dataset_entrenamiento/](../dataset_entrenamiento/)`. El dashboard consumirá el artefacto de entrega desde `[../dashboard/](../dashboard/)` más adelante.

Reglas: `[AGENTS.md](AGENTS.md)` · `[../AGENTS.md](../AGENTS.md)` · roadmap `[../README.md#roadmap](../README.md#roadmap)`.

## Documentos de diseño


| Doc                                            | Contenido                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `[ESTADO_DATOS.md](ESTADO_DATOS.md)`           | Readiness de despensas/matriz; perfil de etiqueta; barrido inicial |
| `[PROPUESTA_MODELOS.md](PROPUESTA_MODELOS.md)` | Baselines, classic ML, preproceso, CV, plan de experimentos        |
| `[config/default.yaml](config/default.yaml)`   | Rutas, semilla, columnas de CV, barrido inicial                    |




## Estructura

```text
modelos/
  config/default.yaml
  src/ceba_modelos/       ← paquete (ingesta, catálogo, CV)
  scripts/smoke_ingesta.py
  salidas/                ← métricas / resúmenes (gitignored salvo .gitkeep)
  solo_reto/              ← artefactos solo-reto (cuando haya corridas)
  extendido/              ← artefactos con externos
  comparativas/
  entrega/                ← modelo elegido (más adelante)
  requirements.txt
  preparar_entorno.sh
```



## Entorno

```bash
bash modelos/preparar_entorno.sh
# Desde la raíz del repo (evita AppImage de Cursor si hace falta):
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python modelos/scripts/smoke_ingesta.py
```

Dependencias mínimas: `numpy`, `pandas`, `scikit-learn`, `pyyaml`, `joblib`. LightGBM queda opcional.

## Ingesta (contrato)

1. Elegir filas del catálogo (`catalogo_datasets_v1.csv`), no hardcodear 1024 rutas.
2. Features = columnas del CSV curado excepto `ID_POLIGONO`, `conjunto`, `rendimiento_t_ha`.
3. **Meta de CV** (`municipio`, `pixel_clima`, `estado`) se une siempre desde la despensa `nube30_v1`, aunque el CSV sea `sin_ubic`.
4. 138 train / 59 pred; rendimiento vacío en predicción no se imputa.
5. CV oficial: `LeaveOneGroupOut` por municipio; chequeo por píxel de clima.

API: `ceba_modelos.ingesta.load_from_catalog_row`, `ceba_modelos.cv.iter_group_folds`.

## Estado

- [x] Fase 2 abierta por el equipo (2026-10-06).
- [x] Revisión de datos + propuesta de arquitecturas.
- [x] Pipeline de ingesta + smoke del barrido inicial (9 CSVs).
- [x] Decisiones D1–D7 cerradas; rama de trabajo `dev-modelos`.
- [x] Script `scripts/correr_barrido.py` (baselines + Ridge + HistGBM, CV LOGO).
- [ ] Comparativa documentada tras el primer barrido; ampliar si hace falta.
- [ ] Modelo de entrega + predicciones de las 59 (decisión humana).

### Correr el barrido

```bash
bash modelos/preparar_entorno.sh   # si aún no hay .venv
env -i HOME="$HOME" PATH="$PWD/modelos/.venv/bin:/usr/bin:/bin" \
  PYTHONPATH=modelos/src python modelos/scripts/correr_barrido.py
```

Salida: `modelos/salidas/barrido_YYYY-MM-DD/resumen_barrido.csv`.

## Rama

Trabajo de fase 2 en **`dev-modelos`** (decisión D6).

## Convenciones

- Misma CV y semilla al comparar CSVs (`seed` en `config/default.yaml`).
- Separar `solo_reto/` vs `extendido/`.
- Commits solo con autorización.
- Bitácora: `[../PROMPTS.md](../PROMPTS.md)`.

