# Prueba: ¿vale la pena meter el modelo ganador del superciclo en el pipeline de la API?

**Veredicto: no.** Ninguna variante del ganador cumple el criterio fijado de antemano, ni sola ni mezclada con el ensamble, y los datos externos (SoilGrids N + edafología INEGI) tampoco lo cumplen.

Script: [`../../scripts/prueba_ganador_en_pipeline.py`](../../scripts/prueba_ganador_en_pipeline.py). Salidas de esta carpeta: `metricas.csv`, `comparacion_pareada.csv`, `lomo_por_municipio.csv`, `predicciones_59_comparacion.csv`, `verificacion_reproduccion.csv` y las predicciones por parcela y fold (`predicciones_cv.csv`).

## Qué se hizo

Se evaluó el ganador **dentro** del esquema de validación del paso 07 del pipeline de la API (se importó sin modificarlo): las mismas 138 parcelas, los mismos folds y las mismas métricas.

- **Estratificada por municipio:** 5 folds × 3 repeticiones, semilla 42. Es la que mide lo que se califica, porque las 59 parcelas ocultas están en los mismos municipios.
- **LOMO:** un municipio completo fuera en cada ronda, 9 rondas. Mide zona nueva.

**Ganador:** LightGBM del superciclo (`lon + pixel_clima + nitrógeno SoilGrids + edafología INEGI`, más las 9 variables base del reto: 13 variables), con los hiperparámetros del superciclo (`num_leaves=31, learning_rate=0.03, min_child_samples=10`).

**Variantes:**

| Nombre | Qué es |
|---|---|
| `ganador` / `ganador_sin_ext` | hiperparámetros fijos del superciclo, con y sin N + edafología |
| `ganador_opt` / `ganador_sin_ext_opt` | con Optuna anidado, como el resto del pipeline; descuenta el sesgo de haberlo elegido entre ~1000 combinaciones |
| `mezcla_<g>` | (ensamble + g) / 2: el ganador sustituye al modelo de longitud |

**Validación del montaje:** los tres modelos del pipeline (ensamble, ubicación, mezcla) reproducen sus cifras publicadas con diferencia menor a 0.0001 (`verificacion_reproduccion.csv`).

**Criterio fijado antes de correr** (misma regla de ruido de 0.010 que usa el pipeline). Un candidato vale la pena frente a la mezcla actual solo si cumple las tres:

1. Baja el RMSE estratificado al menos 0.010 t/ha.
2. No empeora el RMSE en LOMO.
3. El intervalo bootstrap del 95 % de la diferencia estratificada (por parcelas) queda por debajo de 0.

## Resultados (RMSE en t/ha)

| Modelo | Estratificada | LOMO |
|---|---|---|
| **mezcla actual** | **0.508** | 0.594 |
| ensamble | 0.508 | 0.722 |
| ubicación (solo `lon`) | 0.525 | 0.539 |
| ganador (hiperparámetros del superciclo) | 0.582 | **0.533** |
| ganador sin externos | 0.587 | 0.546 |
| ganador con Optuna anidado | 0.547 | 0.555 |
| ganador sin externos, con Optuna anidado | 0.537 | 0.578 |
| mezcla con el ganador (ensamble + ganador) | 0.533 | 0.584 |
| mezcla con el ganador con Optuna anidado | 0.520 | 0.607 |
| promedio de las demás zonas (referencia) | 0.850 | 1.153 |

### Diferencias pareadas contra la mezcla actual (negativo = mejor)

Los intervalos son bootstrap del 95 %; en LOMO se muestra el de municipios, que es el más conservador.

| Candidato | Δ estratificada [IC parcelas] | Δ LOMO [IC municipios] | ¿Vale la pena? |
|---|---|---|---|
| ganador | +0.074 [+0.041, +0.106] | −0.062 [−0.229, +0.038] | No (criterio 1) |
| ganador con Optuna anidado | +0.040 [+0.013, +0.066] | −0.040 [−0.162, +0.089] | No (criterio 1) |
| mezcla con el ganador | +0.025 [+0.007, +0.044] | −0.010 [−0.045, +0.012] | No (criterio 1) |
| mezcla con el ganador con Optuna anidado | +0.012 [−0.002, +0.026] | +0.013 [−0.020, +0.043] | No (criterios 1, 2 y 3) |

## Lectura

1. **Donde se califica, el ganador pierde.** Con validación estratificada queda 0.025–0.074 t/ha por encima de la mezcla, y los intervalos de las variantes principales excluyen el cero. El diseño que ganó el superciclo (validación por municipio, 13 variables) no es el mejor cuando los municipios sí están representados en el entrenamiento.
2. **En zona nueva (LOMO) el ganador luce mejor, pero no es concluyente.** Baja 0.062 t/ha, pero el intervalo por municipios es amplio (−0.229, +0.038) porque hay 9 municipios y Chignahuapan trae la mitad de las parcelas. Además esa cifra sufre sesgo de selección: los hiperparámetros se eligieron con LOMO en el superciclo. Con Optuna anidado la ventaja baja de 0.062 a 0.040 y en la mezcla desaparece.
3. **El modelo de una sola variable (`lon`) ya captura casi todo lo valioso.** Sigue siendo mejor en estratificada que cualquier variante del ganador usada sola (0.525 contra 0.537–0.587) y empata con él en LOMO (0.539 contra 0.533). Las 9 variables base del reto, el píxel climático y los externos no aportan sobre la longitud en estas validaciones.
4. **Los datos externos no pasan el criterio.** En las cuatro comparaciones con y sin N + edafología, la mejora en estratificada nunca llega a 0.010 y a veces cambia de signo (−0.005, +0.010, −0.002, +0.004). En LOMO los cuatro signos favorecen a los externos (−0.008 a −0.023), pero los intervalos rozan el cero. Es una señal pequeña y consistente solo en zona nueva, no suficiente para justificar integrar dos fuentes externas.
5. **Efecto en las 59 ocultas:** poner el ganador cambiaría la mezcla en promedio 0.10 t/ha por parcela (máximo 0.28), con correlación 0.987. Es un cambio menor que el error del modelo.

## Qué no cubre esta prueba

- Es una sola temporada y 138 parcelas. La diferencia entre modelos en LOMO depende mucho de Chignahuapan y Singuilucan.
- El ganador se evaluó con los hiperparámetros del superciclo y con Optuna anidado. No se exploraron otras arquitecturas ni pesos distintos en la mezcla.
- No se optimizaron pesos de la mezcla; se mantuvo el promedio simple.
- No cambia la decisión humana de qué modelo se entrega ([`../../AGENTS.md`](../../AGENTS.md), regla 7).

## Corrección a lo dicho antes

Se afirmó que el `ubic_lon` del superciclo (RMSE 0.550) era el equivalente al modelo de longitud de la API. No es así: ese modelo del superciclo usa 10 variables (las 9 base del reto más `lon`), mientras que el de la API usa solo `lon`. Son modelos distintos, y el de una variable resulta mejor en estratificada (0.525 contra 0.582 del ganador).
