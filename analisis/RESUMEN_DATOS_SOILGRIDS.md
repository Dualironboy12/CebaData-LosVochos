# Resumen — SoilGrids (ISRIC)

Lectura del KDD sobre las **336 capas** de SoilGrids recortadas a las parcelas del reto. Informe con figuras: [`datos_soilgrids/salida/kdd_soilgrids.html`](datos_soilgrids/salida/kdd_soilgrids.html). Código: [`datos_soilgrids/R/`](datos_soilgrids/R/). CSV: [`../DATASETS_EXTERNOS/despensa_extendida/parcelas_despensa_extendida_soilgrids_v1.csv`](../DATASETS_EXTERNOS/despensa_extendida/parcelas_despensa_extendida_soilgrids_v1.csv) (197 × 344). Fuente: [`../DATASETS_EXTERNOS/soilgrids/fuentes_soilgrids.md`](../DATASETS_EXTERNOS/soilgrids/fuentes_soilgrids.md).

## En una frase

SoilGrids da **propiedades continuas a 250 m** (nitrógeno, textura, carbono, pH, CIC, …). Hay más variación entre parcelas que con el mapa INEGI (22 polígonos), pero **casi todo el ρ global es el estado**: dentro del estado solo el **nitrógeno superficial** queda claro; el resto son pistas o proxies territoriales.

## Qué se descargó y midió

- 12 servicios × profundidades × mean / cuantiles / incertidumbre + 31 WRB = **336 capas** (~11 MB).
- Zonal por parcela (`exact = TRUE`), valores convertidos.
- 326 capas con variación suficiente entraron a correlaciones Spearman (global e intra-estado, BH).

## Hallazgos

1. **Nitrógeno 0–5 cm (mean)** es la señal más útil dentro del estado (ρ ≈ 0.24, p BH ≈ 0.08) y también fuerte en global (ρ ≈ 0.66).
2. **94 capas** se comportan como **proxy de estado** (ρ global alto, ρ intra bajo): no deben usarse en la filosofía «sin ubicación» sin cuidado.
3. Textura, carbono y nitrógeno están **muy correlacionados** entre sí (|ρ| ≥ 0.9 en varios pares); conviene un representante por familia.
4. Capas profundas (60–200 cm) de OCD, arena y CIC aparecen en el top intra-estado con p BH > 0.1: pistas, no pruebas.
5. WRB de SoilGrids (probabilidades) se puede cruzar con `edaf_grupo` de INEGI; no sustituye al polígono INEGI.

## Lista recomendada para la despensa extendida

| Prioridad | Columna | Motivo |
| --- | --- | --- |
| Incluir | `sg_nitrogen_0-5cm_mean` | Mejor ρ intra-estado; fertilidad relevante para cebada |
| Considerar | `sg_ocd_60-100cm_mean`, `sg_sand_100-200cm_mean`, `sg_cec_0-5cm_mean`, `sg_silt_0-5cm_mean`, `sg_soc_60-100cm_mean` | Pistas; una por familia si se amplía el set |
| Control | alguna `*_uncertainty` superficial | Revisar parcelas con estimación poco fiable |
| Evitar (1ª ola) | Cuantiles masivos, WRB completo, capas proxy de estado | Inflan columnas / miden el estado |

Detalle del ranking: [`datos_soilgrids/salida/tablas/12_ranking_variables.csv`](datos_soilgrids/salida/tablas/12_ranking_variables.csv) y [`12_variables_recomendada.csv`](datos_soilgrids/salida/tablas/12_variables_recomendada.csv).

## Figuras clave

- [`11_heatmap_mean_intra.png`](datos_soilgrids/salida/figuras/11_heatmap_mean_intra.png) — ρ intra-estado por servicio y profundidad
- [`11_top_correlaciones.png`](datos_soilgrids/salida/figuras/11_top_correlaciones.png)
- [`11_mapas_top6.png`](datos_soilgrids/salida/figuras/11_mapas_top6.png)
- [`12_correlacion_variables.png`](datos_soilgrids/salida/figuras/12_correlacion_variables.png)
- [`12_pca_parcelas.png`](datos_soilgrids/salida/figuras/12_pca_parcelas.png)

## Limitaciones

250 m vs parcelas de pocas hectáreas; estimaciones globales con incertidumbre; 138 etiquetas. La validación oficial por municipio dirá si el nitrógeno (u otras) aportan fuera de la muestra.

## Cómo regenerar

```bash
bash analisis/correr.sh soilgrids
```
