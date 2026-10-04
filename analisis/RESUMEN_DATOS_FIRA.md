# Resumen — datos del reto (FIRA)

Explicación sencilla de lo que salió del análisis de datos (fase 1), para el equipo y para quien entre al repo después. El detalle técnico, las tablas y las figuras están en [`datos_fira/salida/kdd.html`](datos_fira/salida/kdd.html). Cómo se generó todo: [`README.md`](README.md). Roadmap del equipo: [`../README.md`](../README.md) (§ Roadmap).

## En una frase

Tenemos **197 parcelas** de cebada; en **138** sabemos el rendimiento de 2025 y en **59** hay que estimarlo. El análisis muestra que **dónde está la parcela** explica mucho del rendimiento, que **la lluvia y la vegetación al final del ciclo** aportan señal útil, y que **meter todos los índices a la vez no ayuda** porque muchos miden casi lo mismo.

## Qué problema estamos resolviendo

El reto pide estimar el rendimiento (toneladas por hectárea) del ciclo **abril–octubre de 2025**.

| Conjunto | Parcelas | Rendimiento |
| --- | ---: | --- |
| Entrenamiento | 138 | Visible (2.0 a 5.6 t/ha, aprox.) |
| Predicción | 59 | Oculto: hay que estimarlo |

La unidad de trabajo es **una fila por parcela**. Las series satelitales y los rásteres de clima se resumen hasta esa unidad. Eso ya está en [`datos_fira/salida/parcelas_trabajo.csv`](datos_fira/salida/parcelas_trabajo.csv) (197 filas, ~100 columnas).

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
- Planet cuenta una historia parecida, con asociaciones de tamaño similar; **no** es el mismo NDVI que Sentinel-2.

También aparece señal del **residuo / cobertura** (CRC) y algo de **pendiente**.

### 4. Hay mucha información repetida

Había ~**88** variables numéricas candidatas; con correlación alta se agrupan en ~**45** grupos. Por ejemplo NDVI, EVI, SAVI, LAI y FAPAR de Sentinel-2 se comportan casi como **una sola familia**.

**Lectura:** no hay que meter “todos los índices”. Conviene **un representante por familia** (o un método que tolere colinealidad).

### 5. Agrupar parcelas “parecidas” no agrupa rendimientos

Sin usar el rendimiento, las parcelas se agrupan sobre todo por **geografía y sensores**, no por productividad. Eso refuerza que el rendimiento no es una etiqueta de “tipo de parcela” fácil de ver a ojo.

### 6. Calidad de los datos: usable, con matices

- Las llaves `AGC_###` cuadran entre shapefile y CSV.
- Con el filtro de nube elegido (≤ 30 %) **todas** las parcelas tienen suficientes fechas en el ciclo 2025 (también las tenían con nube 0, pero con menos fechas).
- La temporada de lluvias (justo el ciclo) es cuando más nubes hay: por eso el filtro importa.
- Con nube ≤ 30 la tabla de trabajo no tiene vacíos en los índices (con nube 0 había dos parcelas con una fase vacía). Si vuelve a pasar, no se imputa.


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

## Cómo navegar este carril

| Si quieres… | Abre… |
| --- | --- |
| Entender el análisis FIRA en 5 minutos | Este archivo |
| Ver el roadmap del equipo | [`../README.md`](../README.md) (§ Roadmap) |
| Leer el informe completo con figuras | [`datos_fira/salida/kdd.html`](datos_fira/salida/kdd.html) |
| Usar la tabla de una fila por parcela | [`datos_fira/salida/parcelas_trabajo.csv`](datos_fira/salida/parcelas_trabajo.csv) |
| Diccionario de columnas | [`datos_fira/salida/parcelas_trabajo_diccionario.csv`](datos_fira/salida/parcelas_trabajo_diccionario.csv) |
| Tablas / figuras | [`datos_fira/salida/tablas/`](datos_fira/salida/tablas/) · [`datos_fira/salida/figuras/`](datos_fira/salida/figuras/) |
| Código | [`datos_fira/R/`](datos_fira/R/) · setup en [`R/00_setup.R`](R/00_setup.R) |
| Resumen del suelo INEGI | [`RESUMEN_DATOS_INEGI.md`](RESUMEN_DATOS_INEGI.md) |
| Resumen SoilGrids | [`RESUMEN_DATOS_SOILGRIDS.md`](RESUMEN_DATOS_SOILGRIDS.md) |
| Congelar CSVs / modelos / dashboard | [`../dataset_entrenamiento/`](../dataset_entrenamiento/) · [`../modelos/`](../modelos/) · [`../dashboard/`](../dashboard/) |

Figuras útiles:

- `datos_fira/salida/figuras/05_mapa_rendimiento.png`
- `datos_fira/salida/figuras/05_rendimiento_estado.png` / `05_hist_rendimiento.png`
- `datos_fira/salida/figuras/05_trayectoria_ndvi.png`
- `datos_fira/salida/figuras/05_correlaciones_top.png`
- `datos_fira/salida/figuras/06_correlacion_variables.png`


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
