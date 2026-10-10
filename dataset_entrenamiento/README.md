# Dataset de entrenamiento

Aquí vive la **despensa congelada**, la **matriz de CSVs curados** (reto y extendidos) y la documentación de fuentes. Productos derivados para la fase de modelos; el dataset oficial de FIRA no se modifica ([`../DATASET_RETO_AGRO_2026/`](../DATASET_RETO_AGRO_2026/)).

Reglas: [`AGENTS.md`](AGENTS.md) · [`../AGENTS.md`](../AGENTS.md) · roadmap en [`../README.md#roadmap`](../README.md#roadmap).

## Estructura

```text
dataset_entrenamiento/
  despensa/                 ← despensas congeladas (solo 2025 y multi-año)
  curados_reto/             ← T = ∅ (solo datos del reto + núcleo)
  curados_extendidos/       ← T ≠ ∅ (núcleo + subconjuntos de E)
  manifiestos/              ← catálogo + manifiesto maestro de la matriz
  fuentes/                  ← notas de origen (INEGI, SoilGrids)
  scripts/generar_datasets.py
```

## Despensas

| Archivo | Dimensión | Rol |
| --- | --- | --- |
| [`despensa/parcelas_despensa_nube30_v1.csv`](despensa/parcelas_despensa_nube30_v1.csv) | 197 × 101 | Base de `solo2025`. Manifiesto: [`despensa/MANIFIESTO.md`](despensa/MANIFIESTO.md). |
| [`despensa/parcelas_despensa_multianio_nube30_v1.csv`](despensa/parcelas_despensa_multianio_nube30_v1.csv) | 197 × 125 | Base de `multianio` (bloque A 2025 + bloque B 2022–2024). Manifiesto: [`despensa/MANIFIESTO_MULTIANIO.md`](despensa/MANIFIESTO_MULTIANIO.md). |

Regenerar multi-año: `Rscript analisis/datos_fira/R/13_despensa_multianio.R` desde la raíz.

## Matriz curada v1

| Eje | Niveles |
| --- | --- |
| Temporal | `solo2025`, `multianio` (2) |
| Ubicación | \(2^5 = 32\) subconjuntos de \(L\) |
| Extendidos | \(2^4 = 16\) subconjuntos de \(E\) |

**Total: 1024 CSVs.** Catálogo: [`manifiestos/catalogo_datasets_v1.csv`](manifiestos/catalogo_datasets_v1.csv). El entrenamiento elige filas del catálogo; no hace falta entrenar los 1024 el primer día.

### Núcleo (siempre presente)

`ID_POLIGONO`, `conjunto`, `rendimiento_t_ha`, `area_ha`, `ndvi_s2_int`, `ndvi_s2_media_sep_oct`, `crc_s2_media`, `vi6t_landsat_max`, `lai_planet_max`, `lluvia_ciclo_mm`, `pendiente_grados`, `elevacion_m`.

En `multianio` se añaden las 24 columnas del bloque B (máx/int/fase NDVI S2, CRC, VI6T y lluvia por año 2022–2024 + medias históricas). Planet histórico no se inventa.

### Ubicación \(L\)

`estado`, `municipio`, `lon`, `lat`, `pixel_clima`.

| `ubic_tag` | Significado |
| --- | --- |
| `sin_ubic` | Ninguna columna de \(L\) |
| `ubic_completa` | Las cinco |
| `ubic_<códigos>` | Parcial: códigos cortos ordenados unidos por `-` (`est`, `mun`, `lon`, `lat`, `pix`), p. ej. `ubic_est-mun` |

### Extendidos \(E\)

| Código | Columna |
| --- | --- |
| `n` | `sg_nitrogen_0-5cm_mean` |
| `edaf` | `edaf_grupo` (Vertisol/Andosol → `otros`) |
| `cec` | `sg_cec_0-5cm_mean` |
| `silt` | `sg_silt_0-5cm_mean` |

| `ext_tag` | Significado |
| --- | --- |
| `reto` | Sin columnas de \(E\) → va a `curados_reto/` |
| `n`, `edaf`, `n-edaf`, … | Subconjunto de \(E\) → `curados_extendidos/` |

### Nombre de archivo

```text
parcelas_{temporal}_{ubic_tag}_{ext_tag}_v1.csv
```

Ejemplos: `parcelas_solo2025_sin_ubic_reto_v1.csv`, `parcelas_multianio_ubic_est-mun_n-edaf_v1.csv`.

### Cómo regenerar

Desde la raíz del repo:

```bash
python3 dataset_entrenamiento/scripts/generar_datasets.py
```

Entradas: despensas + CSVs en [`../DATASETS_EXTERNOS/despensa_extendida/`](../DATASETS_EXTERNOS/despensa_extendida/). Sobrescribe los `*_v1.csv` de `curados_*` y reescribe el catálogo. Manifiesto maestro: [`manifiestos/manifiesto_matriz_v1.json`](manifiestos/manifiesto_matriz_v1.json).

## Estado

- [x] Despensa `nube30_v1` (solo 2025).
- [x] Despensa `multianio_nube30_v1`.
- [x] Matriz curada v1 (1024 CSVs + catálogo).
- [x] Notas en `fuentes/` (enlaces a INEGI / SoilGrids).
- [x] Fase 2 abierta: ingesta en `modelos/` lee el catálogo (entrenamiento de estimadores pendiente).

## Convenciones

- Versionar (`v1`, `v2`); no sobrescribir en silencio un CSV ya citado por un experimento.
- `rendimiento_t_ha` vacío en `PREDICCION`; no rellenar con cero.
- Commits solo con autorización del equipo.
- Bitácora de agentes: [`../PROMPTS.md`](../PROMPTS.md).
