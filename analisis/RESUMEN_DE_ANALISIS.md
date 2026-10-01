# Resumen del análisis (KDD)

Explicación sencilla de lo que salió del análisis de datos (fase 1), para el equipo y para quien entre al repo después. El detalle técnico, las tablas y las figuras están en [`salida/kdd.html`](salida/kdd.html). Cómo se generó todo: [`README.md`](README.md). Qué sigue: [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md).

## En una frase

Tenemos **197 parcelas** de cebada; en **138** sabemos el rendimiento de 2025 y en **59** hay que estimarlo. El análisis muestra que **dónde está la parcela** explica mucho del rendimiento, que **la lluvia y la vegetación al final del ciclo** aportan señal útil, y que **meter todos los índices a la vez no ayuda** porque muchos miden casi lo mismo.

## Qué problema estamos resolviendo

El reto pide estimar el rendimiento (toneladas por hectárea) del ciclo **abril–octubre de 2025**.

| Conjunto | Parcelas | Rendimiento |
| --- | ---: | --- |
| Entrenamiento | 138 | Visible (2.0 a 5.6 t/ha, aprox.) |
| Predicción | 59 | Oculto: hay que estimarlo |

La unidad de trabajo es **una fila por parcela**. Las series satelitales y los rásteres de clima se resumen hasta esa unidad. Eso ya está en [`salida/parcelas_trabajo.csv`](salida/parcelas_trabajo.csv) (197 filas, ~100 columnas).

## De dónde salen los datos (sin tecnicismos)

Imagina cada parcela como un lote con:

1. **Ubicación** — estado, municipio, tamaño.
2. **Fotos del satélite en el tiempo** — índices de “qué tan verde / húmedo / con residuo está el cultivo” (Sentinel-2, Landsat, Planet).
3. **Clima del mes** — lluvia y temperatura (píxeles grandes, ~5 km).
4. **Relieve** — elevación y pendiente.
5. **La etiqueta** — rendimiento real, solo en entrenamiento.

Reglas importantes que el análisis respetó:

- No se inventa el rendimiento de las 59 de predicción (dejarlo vacío; un cero sería mentira).
- Sentinel-2, Landsat y Planet **no se mezclan** en la misma columna: son sensores distintos.
- Si hay nube total, el índice no existe: no se rellena con el de otro sensor.

## Qué descubrimos (lo importante)

### 1. La ubicación pesa mucho

Solo saber el **estado** explica cerca de la **mitad** de la variación del rendimiento. El **municipio**, cerca de **dos tercios**.

La mitad de las parcelas está en **Chignahuapan** (Puebla). Puebla tiende a rendimientos más altos; Tlaxcala, más bajos y con **pocos valores distintos** (casi escalones entre 2.5 y 3.5 t/ha).

**Lectura para el equipo:** un modelo que “adivina” el municipio puede verse bueno, pero no necesariamente entiende el cultivo. Hay que validar sin mezclar vecinos al azar.

### 2. El clima es de zona, no de lote

Lluvia y temperatura cubren las 197 parcelas con solo **~25 celdas**. Muchas parcelas vecinas **comparten el mismo clima**.

- **Temperatura** (sobre todo la amplitud térmica): se correlaciona fuerte con el rendimiento *en general*, pero **casi desaparece** si miras dentro de un mismo estado. En la práctica, a menudo está midiendo “eres de Tlaxcala o de Puebla”.
- **Lluvia** del ciclo: correlación negativa moderada que **sí se sostiene** dentro del estado. Más lluvia en la zona no equivale aquí, sola, a más rendimiento; la asociación hay que leerla con cuidado (pocas celdas distintas).

### 3. El “verdor” del cultivo ayuda, pero poco y al final del ciclo

Los índices de vegetación (NDVI y familia) **no** son la variable mágica.

- La señal más clara de Sentinel-2 ronda correlaciones débiles–moderadas (~0.3) con el rendimiento.
- Las parcelas de mayor rendimiento no destacan tanto por un máximo de NDVI altísimo, sino porque **mantienen más verdor en septiembre–octubre** (fase final del ciclo).
- Planet cuenta una historia parecida, con números un poco más altos; **no** es el mismo NDVI que Sentinel-2.

También aparece señal del **residuo / cobertura** (CRC) y algo de **pendiente**.

### 4. Hay mucha información repetida

Había ~**88** variables numéricas candidatas; con correlación alta se agrupan en ~**46** grupos. Por ejemplo NDVI, EVI, SAVI, LAI y FAPAR de Sentinel-2 se comportan casi como **una sola familia**.

**Lectura:** no hay que meter “todos los índices”. Conviene **un representante por familia** (o un método que tolere colinealidad).

### 5. Agrupar parcelas “parecidas” no agrupa rendimientos

Sin usar el rendimiento, las parcelas se agrupan sobre todo por **geografía y sensores**, no por productividad. Eso refuerza que el rendimiento no es una etiqueta de “tipo de parcela” fácil de ver a ojo.

### 6. Calidad de los datos: usable, con matices

- Las llaves `AGC_###` cuadran entre shapefile y CSV.
- Con filtro estricto de nube (solo escenas sin nube) **todas** las parcelas tienen suficientes fechas en el ciclo 2025.
- La temporada de lluvias (justo el ciclo) es cuando más nubes hay: por eso el filtro importa.
- Dos parcelas quedan con un hueco en alguna fase de NDVI; no se imputó.

## Mapa mental de las fuentes

```text
Parcela (AGC_###)
 ├── Ubicación y área          → explica mucho del rendimiento
 ├── Índices Sentinel-2        → dosel, humedad, residuo (ciclo 2025)
 ├── Índices Planet            → dosel 2025 (otra medición)
 ├── Landsat VI6T              → señal térmica/espectral
 ├── Lluvia / temperatura      → zona (~5 km), no el lote
 └── Elevación / pendiente     → relieve de la ladera
```

## Cómo navegar el análisis en el repo

| Si quieres… | Abre… |
| --- | --- |
| Entender el análisis en 5 minutos | Este archivo |
| Saber qué hacer después | [`PROXIMOS_PASOS.md`](PROXIMOS_PASOS.md) |
| Leer el informe completo con figuras | [`salida/kdd.html`](salida/kdd.html) |
| Usar la tabla de una fila por parcela | [`salida/parcelas_trabajo.csv`](salida/parcelas_trabajo.csv) |
| Saber qué significa cada columna | [`salida/parcelas_trabajo_diccionario.csv`](salida/parcelas_trabajo_diccionario.csv) |
| Ver un número concreto (correlaciones, etc.) | [`salida/tablas/`](salida/tablas/) |
| Ver un gráfico | [`salida/figuras/`](salida/figuras/) |
| Cambiar parámetros o re-correr | [`README.md`](README.md) y `R/00_setup.R` |
| Código de cada etapa | `R/01_seleccion.R` … `R/06_patrones.R` |

Figuras útiles para compartir con el equipo:

- `05_mapa_rendimiento.png` — dónde están las parcelas y el rendimiento.
- `05_rendimiento_estado.png` / `05_hist_rendimiento.png` — diferencias entre estados.
- `05_trayectoria_ndvi.png` — verdor a lo largo del ciclo según el rendimiento.
- `05_correlaciones_top.png` — qué variables se mueven con el rendimiento (global vs dentro del estado).
- `06_correlacion_variables.png` — qué índices se repiten entre sí.

## Respuestas preliminares a las preguntas “bonus” del reto

Todavía son **descriptivas** (el modelo las confirmará o corregirá):

1. **¿Qué índice importa más?** Integral de NDVI (Sentinel-2) y CRC; el NDVI de septiembre–octubre separa mejor los cuartiles de rendimiento que el máximo solo.
2. **¿Qué variable climática pesa más?** La lluvia del ciclo, si se mira dentro del mismo estado. La temperatura “gana” en global porque distingue estados.
3. **¿Qué combinación funciona mejor?** Aún no se sabe: eso es trabajo de la fase de modelos, probando condensamientos distintos.

## Qué no hizo este análisis

- No entrenó modelos ni calculó RMSE/MAE/r² de predicción.
- No rellenó rendimientos ocultos.
- No modificó el dataset oficial.
- No eligió el set final de variables para la entrega (deja candidatas y advertencias).
