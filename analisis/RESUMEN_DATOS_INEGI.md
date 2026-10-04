# Resumen — edafología INEGI

Lectura del análisis de suelo sobre la [despensa extendida](../DATASETS_EXTERNOS/despensa_extendida/README.md). Solo las 138 parcelas de entrenamiento cuando aparece el rendimiento. Código: [`datos_inegi/R/`](datos_inegi/R/). Tablas: [`datos_inegi/salida/tablas/`](datos_inegi/salida/tablas/). Figuras: [`datos_inegi/salida/figuras/`](datos_inegi/salida/figuras/).

## En una frase

El mapa de suelos de INEGI (1:250 000) asigna a las 197 parcelas solo **5 grupos WRB** y **22 polígonos** distintos: describe la zona, no el lote. Lo que parece relación suelo–rendimiento es en gran parte el **estado**.

## Qué suelo hay

| Grupo | Parcelas | Con rendimiento | Dónde | Rendimiento medio (t/ha) |
| --- | --- | --- | --- | --- |
| Phaeozem | 136 | 97 | Hidalgo, Puebla y Tlaxcala | 3.96 |
| Planosol | 28 | 19 | Puebla (casi todas) e Hidalgo | 4.40 |
| Umbrisol | 24 | 16 | **Solo Hidalgo** | 3.41 |
| Vertisol | 6 | 4 | Hidalgo y Puebla | 4.51 |
| Andosol | 3 | 2 | **Solo Tlaxcala** | 3.00 |

La textura solo toma media (117) o fina (21); `edaf_clase_tex` es redundante con ella.

## Hallazgos

1. **El estado pesa más que el suelo.** Phaeozem: 4.50 t/ha en Puebla, 3.92 en Hidalgo, 2.98 en Tlaxcala.
2. Relación global suelo–rendimiento (Kruskal-Wallis p = 0.005) baja al restar la media del estado (p = 0.04).
3. Dentro de Puebla, Phaeozem ≈ Planosol (p = 0.92).
4. Dentro de Hidalgo, Umbrisol < Phaeozem (3.41 vs 3.92, p ≈ 0.07): pista débil.
5. R² ajustado: estado 0.496 → estado + grupo 0.524 (p = 0.02). La textura no aporta.

## Para los datasets

- `edaf_grupo` candidata en filosofía «parcial» o «completa»; no en «sin ubicación».
- Agrupar Vertisol/Andosol en «otros» o usar un método que tolere categorías raras.
- Validación oficial por municipio (ver roadmap en el README raíz).

## Figuras

- [`08_rendimiento_suelo.png`](datos_inegi/salida/figuras/08_rendimiento_suelo.png)
- [`08_mapa_suelo_rendimiento.png`](datos_inegi/salida/figuras/08_mapa_suelo_rendimiento.png)
- [`08_mapa_suelo_rendimiento_estados.png`](datos_inegi/salida/figuras/08_mapa_suelo_rendimiento_estados.png)

## Limitaciones

Escala 1:250 000, levantamiento 2002–2006, CRS asignado (sin `.prj`); ver [`fuentes_edafologia.md`](../DATASETS_EXTERNOS/despensa_extendida/fuentes_edafologia.md).
