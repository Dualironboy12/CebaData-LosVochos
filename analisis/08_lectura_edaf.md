# Lectura: suelo (INEGI) y rendimiento

Segundo análisis exploratorio, sobre la [despensa extendida](../DATASETS_EXTERNOS/despensa_extendida/README.md). Mismas reglas que el KDD: solo las 138 parcelas de entrenamiento cuando aparece el rendimiento, y todo es exploración, no prueba. Generado por `R/08_relaciones_edaf.R`; tablas en `salida/tablas/08_*.csv` y figuras en `salida/figuras/08_*.png`.

## Qué suelo hay

Las 197 parcelas caen en 5 grupos de suelo (WRB) y en solo **22 polígonos** distintos del mapa de INEGI (1:250 000), así que el suelo describe la zona, no el lote.

| Grupo | Parcelas | Con rendimiento | Dónde | Rendimiento medio (t/ha) |
| --- | --- | --- | --- | --- |
| Phaeozem | 136 | 97 | Hidalgo, Puebla y Tlaxcala | 3.96 |
| Planosol | 28 | 19 | Puebla (casi todas) e Hidalgo | 4.40 |
| Umbrisol | 24 | 16 | **Solo Hidalgo** | 3.41 |
| Vertisol | 6 | 4 | Hidalgo y Puebla | 4.51 |
| Andosol | 3 | 2 | **Solo Tlaxcala** | 3.00 |

Vertisol y Andosol tienen 4 y 2 parcelas con etiqueta: no se pueden leer. La textura solo toma dos valores (media, 117 parcelas; fina, 21) y `edaf_clase_tex` repite la misma información.

## Qué se ve

1. **El estado pesa mucho más que el suelo.** El Phaeozem rinde 4.50 t/ha en Puebla, 3.92 en Hidalgo y 2.98 en Tlaxcala: con el *mismo* tipo de suelo la diferencia entre estados es de 1.5 t/ha, más que cualquier diferencia entre suelos dentro de un estado.
2. **A primera vista el suelo sí se relaciona con el rendimiento** (Kruskal-Wallis p = 0.005, η² = 0.08), pero buena parte es el estado: el Umbrisol está solo en Hidalgo y el Andosol solo en Tlaxcala. Al restar la media de cada estado, el efecto baja a p = 0.04 y η² = 0.05.
3. **Dentro de Puebla no hay diferencia** entre Phaeozem y Planosol (4.50 contra 4.40 t/ha, p = 0.92).
4. **Dentro de Hidalgo el Umbrisol rinde menos** que el Phaeozem (3.41 contra 3.92 t/ha, p = 0.07, 16 y 15 parcelas). Es la única pista con algo de sustancia; queda como hipótesis.
5. **Aporte sobre el estado:** el R² ajustado pasa de 0.496 (solo estado) a 0.524 (estado + grupo de suelo), con p = 0.02 en la comparación de modelos. Una mejora pequeña y apoyada en pocas parcelas. La textura no añade nada (0.495, p = 0.42).

## Qué significa para los datasets

- `edaf_grupo` es una candidata razonable para la versión extendida, con la salvedad de que se comporta casi como una variable de ubicación (22 polígonos). En la filosofía «sin ubicación» no debe entrar; en «parcial» o «completa» sí puede.
- Para modelar conviene agrupar los suelos con pocas parcelas (por ejemplo Vertisol y Andosol en «otros») o usar un método que tolere categorías raras.
- `edaf_textura` y `edaf_clase_tex` son redundantes entre sí y casi sin señal; basta una de las dos, o ninguna.
- La validación por municipio ya prevista en [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md) es la que dirá si el suelo aporta algo real fuera de la muestra.

## Limitaciones

Escala 1:250 000, levantamiento 2002–2006, CRS del shapefile asignado (sin `.prj`; ver [`fuentes_edafologia.md`](../DATASETS_EXTERNOS/despensa_extendida/fuentes_edafologia.md)), grupos de 2 a 4 parcelas y una sola temporada de rendimiento.
