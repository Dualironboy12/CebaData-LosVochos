# Próximos pasos

Guía después del KDD (fase 1). Resume qué sigue, qué decide el equipo humano, qué puede ejecutar un agente, y recomendaciones de diseño para tablas de entrenamiento y modelos.

Contexto corto del análisis: [`RESUMEN_DE_ANALISIS.md`](RESUMEN_DE_ANALISIS.md). Informe detallado: [`salida/kdd.html`](salida/kdd.html). Reglas del repo: [`../AGENTS.md`](../AGENTS.md).

## Dónde estamos

| Fase | Estado | Dónde |
| --- | --- | --- |
| 1. Análisis de datos (R) | Hecha: tabla de trabajo + lectura KDD | `analisis/` |
| — Despensa / CSVs de entrenamiento | Pendiente: congelar y versionar | `dataset_entrenamiento/` |
| 2. Modelos (Python) | Pendiente; solo arranca con pedido explícito del equipo | `modelos/` |
| 3. Dashboard | Después de un modelo estable (stack por acordar; a menudo Django) | `dashboard/` |
| Reporte y video | Al cerrar el desarrollo | — |

Producto actual de la fase 1: [`salida/parcelas_trabajo.csv`](salida/parcelas_trabajo.csv) (197 filas; rendimiento vacío en las 59 de predicción).

## Orden recomendado

```text
1. Decidir criterios humanos (ubicación, CSVs, validación)     ← 1–6 cerradas (2026-10-01)
2. Regenerar despensa con NUBE_MAX = 30 y versionar CSVs en `dataset_entrenamiento/`
3. Abrir fase 2 en `modelos/`: baseline + classic ML + misma CV espacial
4. En paralelo: inventario y alineación de datos externos (p. ej. INEGI) en `dataset_entrenamiento/`
5. Elegir modelo y CSV ganadores
6. Predecir las 59 parcelas
7. Dashboard (`dashboard/`) y, al final, reporte / video
```

Las decisiones 1–6 ya están tomadas (sección siguiente). Quedan pendientes las que dependen de resultados de entrenamiento (7–9).

---

## Decisiones del equipo (humanos)

Registro de lo que el equipo ya acordó y de lo que sigue abierto. Un agente no debe cambiar estos criterios sin un nuevo acuerdo explícito.

### Cerradas (2026-10-01)

| # | Pregunta | Decisión |
| --- | --- | --- |
| 1 | Tabla base | **Despensa + CSVs derivadas.** Se conserva `parcelas_trabajo.csv` (y sus columnas) como despensa. A partir de ella se generan tablas reducidas o tablas que integren datos nuevos; no se sustituye la despensa por una sola CSV “final” prematura. |
| 2 | Ubicación como feature | **Tres filosofías a comparar:** (1) sin ubicación de ningún tipo; (2) con *algunos* datos de ubicación; (3) con *todos* los datos de ubicación disponibles (`estado`, `municipio`, coordenadas, `pixel_clima`, etc.). La elección de entrega se hace después de ver CV. |
| 3 | Años previos | **Dos familias temporales:** datasets solo con el ciclo **2025**, y datasets que usan **todos los ciclos anuales** disponibles (2022–2025 / antecedentes). Se construyen y se comparan; no se mezcla la regla en silencio. |
| 4 | Umbral de nube | **`NUBE_MAX = 30`**, para maximizar fechas usables al condensar índices (`porcentaje_nubosidad <= 30` en las series Básico y PRO). |
| 5 | Validación | **Oficial = por municipio.** Además se reporta validación por píxel de clima como chequeo. No se usa corte aleatorio de parcelas como criterio oficial. |
| 6 | Datos externos | **Dos carriles en paralelo.** Prioridad: empezar entrenamientos con datasets construidos solo con lo entregado por el reto. En paralelo: conseguir, documentar y alinear datos externos (en especial **INEGI**) con los `AGC_###` / geometrías del reto, para armar datasets más ricos más adelante. |

#### Matriz de CSVs que implica (datos del reto)

Cruzar filosofía de ubicación × ventana temporal. Cada celda puede ser una CSV versionada (o un grupo con/sin Planet, etc.):

|  | Solo ciclo 2025 | Todos los ciclos (2022–2025) |
| --- | --- | --- |
| Sin ubicación | CSV a construir | CSV a construir |
| Ubicación parcial | CSV a construir | CSV a construir |
| Ubicación completa | CSV a construir | CSV a construir |

Detalle de “ubicación parcial” (qué columnas exactas entran: p. ej. solo `estado`, o estado + municipio sin coordenadas) **aún se puede afinar** al armar el manifiesto; el principio son las tres filosofías.

#### Nota sobre el umbral 30 y la despensa actual

**Hecho (2026-10-03).** Se puso `NUBE_MAX <- 30` en `R/00_setup.R`, se re-ejecutó todo el pipeline (`bash analisis/correr.sh`) y [`salida/parcelas_trabajo.csv`](salida/parcelas_trabajo.csv) ya refleja nube ≤ 30. Una copia congelada, con su manifiesto, vive en [`../dataset_entrenamiento/despensa/`](../dataset_entrenamiento/despensa/MANIFIESTO.md) (`parcelas_despensa_nube30_v1.csv`).

Comprobaciones: 197 filas, rendimiento vacío solo en las 59 de `PREDICCION`, ninguna parcela por debajo de 5 observaciones en ningún sensor. Las lecturas del KDD se mantienen; cambian algunos valores de correlación en los índices de vegetación (por ejemplo, el mejor Landsat pasó de ρ = 0.27 a 0.31) y el mejor Planet pasó de `ndvi_planet_media_sep_oct` a `lai_planet_max`. Los resultados con nube 0 ya no se conservan en `salida/`; sí en el historial de git.

#### Carril externo (INEGI y afines)

- No bloquea el primer entrenamiento con datos del reto.
- Cada fuente externa debe quedar documentada: origen, licencia/uso, fecha de descarga, cómo se une a `ID_POLIGONO` / geometría, y qué columnas aporta.
- Los datasets “ricos” que salgan de ese carril se versionan aparte (no se sobrescribe la despensa oficial del reto).
- **Avance (2026-10-03):** primera fuente integrada, edafología INEGI 1:250 000. CSV extendido (despensa nube 30 + 6 columnas `edaf_*`) en [`../DATASETS_EXTERNOS/despensa_extendida/`](../DATASETS_EXTERNOS/despensa_extendida/README.md); lectura exploratoria en [`08_lectura_edaf.md`](08_lectura_edaf.md): el suelo aporta poco más allá del estado. Falta decidir si pasa a `dataset_entrenamiento/curados_extendidos/` y qué otras fuentes siguen.

### Pendientes (después de experimentar / acuerdo explícito)

7. **Cuándo abrir fase 2 y fase 3** — `modelos/` y `dashboard/` solo con pedido explícito (`AGENTS.md`).
8. **Modelo y CSV de entrega**, métrica de desempate, y si el error en Tlaxcala se reporta aparte.
9. **Commits, push y textos del reporte / video.**

---

## Qué puede hacer un agente (con supervisión)

Un agente ejecuta, compara y documenta. No fija el criterio de “qué cuenta como bueno” ni abre fases sin permiso.

| Tarea | Agente | Humano |
| --- | --- | --- |
| Reproducir el KDD, tablas y figuras | Sí | — |
| Proponer sets de columnas a partir del KDD | Propone | **Aprueba** el set final |
| Construir varias CSVs versionadas + manifiesto | Sí | Define qué variantes existen |
| Incluir o no ubicación / años previos | Simula escenarios | **Decide** el criterio |
| Implementar CV espacial y baselines | Sí | Elige el esquema oficial |
| Entrenar y comparar modelos (métricas) | Sí | **Elige** el modelo de entrega |
| Ablaciones e importancias (preguntas bonus) | Sí | **Redacta** la justificación |
| Datos externos | Busca y documenta opciones | **Aprueba** fuentes |
| Pasar a `modelos/` o `dashboard/` | Solo si se pide | **Pide** explícito |
| Commits / push / entregables FIRA | Solo si se pide | **Autoriza** |

---

## Filosofía de diseño

1. **Una fila = una parcela.** Todas las tablas de entrenamiento comparten `ID_POLIGONO` y el mismo `CONJUNTO`. El rendimiento vacío en predicción se conserva.

2. **El condensamiento es una hipótesis.** Probar CSVs distintos es probar *cómo* resumir el mundo, no acumular columnas por acumular.

3. **Misma validación en todos los experimentos.** Si cambia la CV o la semilla entre CSVs, la comparación no vale.

4. **Pocas variantes bien hechas.** Con 138 etiquetas, 20 tablas × 10 modelos sobreajustan el *pipeline*. Apuntar a **3–5 CSVs** y un puñado de modelos.

5. **Sensores separados.** Sentinel-2, Landsat y Planet no se funden en una sola columna de NDVI.

6. **Baseline primero.** Antes de redes o stacks complejos: media por municipio (o estado) y un modelo lineal / ridge. Eso fija el techo “tonto” que hay que superar.

7. **Explicabilidad cuenta.** El reto pide justificar variables e índices. Un modelo interpretable + ablaciones responde mejor las preguntas bonus que un artefacto opaco.

8. **Reproducible y liviano.** Preferir lo que corra en CPU, con semillas fijas y dependencias claras en `modelos/`.

---

## Pruebas con diferentes CSVs de entrenamiento

Sí es viable —y recomendable— formar **varias tablas** con más o menos datos (dataset oficial y, si se aprueba, externos), distintos periodos o familias de variables, y entrenar **el mismo protocolo de modelos** sobre cada una.

### Variantes alineadas a las decisiones del equipo

Partir de la despensa (tras regenerar con **nube ≤ 30**). Prioridad: datos del reto. Luego, datasets con externos.

| Eje | Niveles acordados |
| --- | --- |
| Ubicación | Sin ubicación · Parcial · Completa |
| Tiempo | Solo 2025 · Todos los ciclos anuales |
| Externos | Solo reto (primera ola) · + INEGI/otros (segunda ola, en paralelo) |

Dentro de cada celda de la matriz ubicación × tiempo, un agente puede proponer subvariantes (núcleo mínimo, + Planet, + clima térmico, etc.) siempre con manifiesto. No hace falta entrenar las 6+ de golpe el primer día: conviene un orden, por ejemplo:

1. Sin ubicación + solo 2025 (núcleo).
2. Misma base + ubicación parcial y + ubicación completa.
3. Repetir la mejor filosofía de ubicación con **todos los ciclos**.
4. Cuando haya capas INEGI alineadas: nueva familia de CSVs versionadas.

### Cómo compararlas con rigor

- Validación **oficial por municipio**; además reportar el mismo experimento con folds por píxel de clima.
- Mismos modelos, mismas semillas, mismas métricas (RMSE, MAE, r²; opcionalmente por estado / Tlaxcala).
- Versionar archivos (`parcelas_v….csv`) y un **manifiesto** (columnas, `NUBE_MAX`, ventana temporal, filosofía de ubicación, fuentes).
- Reportar el tamaño efectivo (municipios / píxeles por fold).
- Separar claramente la ola “solo reto” de la ola “+ externos”.

---

## Elección de modelos

### Modelo propio vs Hugging Face / model zoo

Para este reto conviene **entrenar el predictor nosotros** sobre nuestras tablas (scikit-learn, LightGBM, XGBoost, etc.).

- El problema es **tabular y pequeño** (~138 etiquetas), no visión ni texto.
- No hay un modelo público que ya sepa cebada en esta zona con la partición 70/30 del reto.
- El jurado valora justificación de variables; un pipeline propio se enlaza directo con el KDD.

Hugging Face / zoos sirven poco como “descargar y predecir t/ha”. Sí pueden inspirar experimentos tabulares avanzados, pero casi siempre **entrenados aquí** con nuestros datos. Un LLM no sustituye el modelo de rendimiento (a lo sumo ayuda a redactar).

### Classic ML vs redes / transformers / modelos grandes

Con n ≈ 138, vecinos que comparten clima y Tlaxcala casi discreto:

| Enfoque | Ventajas | Desventajas / riesgo aquí |
| --- | --- | --- |
| **Classic ML** (ridge, Random Forest, LightGBM/XGBoost) | Encaja en tablas pequeñas; rápido; fácil CV espacial y ablaciones; importancias / SHAP para el reporte | Depende de un buen condensamiento; muchas columnas colineales ensucian la lectura |
| **MLP / redes sobre la misma tabla** | Interacciones no lineales; útil como contraste | Sobreajuste fácil; más hiperparámetros; menos interpretable |
| **Transformers / series o imágenes crudas** | En teoría usan la trayectoria diaria sin resumir tanto | Pocas parcelas, huecos por nube, más cómputo y código; difícil justificar si no ganan claro en CV |
| **Modelos grandes (LLM, etc.)** | Redacción / documentación | No predicen t/ha de forma fiable desde el CSV |

### Ruta práctica recomendada

```text
Baseline (media por municipio o ridge)
    → LightGBM o Random Forest sobre 3–5 CSVs
    → (opcional) MLP pequeño u otro tabular como contraste
    → Elegir el que gane en CV espacial y se pueda explicar
```

No hace falta “algo más moderno” para competir bien. Hace falta **buen condensamiento + validación espacial + no filtrar información de vecinos**.

---

## Checklist de arranque de la fase 2 (cuando el equipo lo pida)

- [x] Humanos: decisiones 1–6 (despensa, 3 filosofías de ubicación, 2 ventanas temporales, nube 30, CV municipio + chequeo píxel, externos en paralelo).
- [ ] Agente / equipo: regenerar despensa con `NUBE_MAX = 30` y versionarla en `dataset_entrenamiento/` (documentar el cambio).
- [ ] Agente: construir CSVs de la matriz (reto) en `dataset_entrenamiento/` + manifiesto; afinar columnas de “ubicación parcial”.
- [ ] Humanos: pedir explícitamente abrir trabajo en `modelos/`.
- [ ] Agente: baseline + 1–2 modelos en `modelos/`, CV por municipio (+ reporte por píxel), tabla de métricas.
- [ ] En paralelo: inventario INEGI / externos en `dataset_entrenamiento/`, documentación y alineación a parcelas del reto.
- [ ] Humanos: elegir modelo y CSV de entrega (decisión 8); criterio Tlaxcala.
- [ ] Agente: predicciones de las 59, artefacto reproducible en `modelos/`.
- [ ] Humanos: pedir trabajo en `dashboard/` cuando el modelo esté estable; autorizar commits/push (decisión 9).
- [ ] Ir pasando hallazgos del KDD al reporte (metodología / resultados).

## Regla de oro

> El agente ejecuta y compara. El equipo fija criterios, abre fases y firma lo que se entrega.
