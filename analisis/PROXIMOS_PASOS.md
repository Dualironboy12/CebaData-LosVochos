# Próximos pasos

Guía después del KDD (fase 1). Resume qué sigue, qué decide el equipo humano, qué puede ejecutar un agente, y recomendaciones de diseño para tablas de entrenamiento y modelos.

Contexto corto del análisis: [`RESUMEN_DE_ANALISIS.md`](RESUMEN_DE_ANALISIS.md). Informe detallado: [`salida/kdd.html`](salida/kdd.html). Reglas del repo: [`../AGENTS.md`](../AGENTS.md).

## Dónde estamos

| Fase | Estado | Dónde |
| --- | --- | --- |
| 1. Análisis de datos (R) | Hecha: tabla de trabajo + lectura KDD | `analisis/` |
| 2. Modelos (Python) | Pendiente; solo arranca con pedido explícito del equipo | `modelo/` |
| 3. Dashboard (Django) | Después de un modelo estable | `dashboard/` |
| Reporte y video | Al cerrar el desarrollo | — |

Producto actual de la fase 1: [`salida/parcelas_trabajo.csv`](salida/parcelas_trabajo.csv) (197 filas; rendimiento vacío en las 59 de predicción).

## Orden recomendado

```text
1. Decidir criterios humanos (ubicación, CSVs, validación)
2. Congelar 3–5 tablas de entrenamiento (condensamientos)
3. Abrir fase 2: baseline + classic ML + misma CV espacial
4. Elegir modelo y CSV ganadores
5. Predecir las 59 parcelas
6. Dashboard y, al final, reporte / video
```

No hace falta más exploración a ciegas del dataset oficial. Sí hace falta **cerrar decisiones de diseño** y luego **comparar de forma controlada**.

---

## Decisiones que el equipo tiene que tomar (humanos)

Estas no las debe “inventar” un agente solo: cambian el RMSE, la narrativa del reporte y el riesgo de aprender geografía en vez de cultivo.

1. **¿Se congela `parcelas_trabajo.csv` como base o se genera una versión reducida?**  
   El CSV grande es la despensa; para modelar suele convenir un subconjunto documentado.

2. **¿Se permiten `estado`, `municipio`, coordenadas o `pixel_clima` como features?**  
   Explican ~50–67 % de la varianza del rendimiento. Suben el RMSE aparente, pero el modelo puede memorizar zona. Hay que decidir el criterio (precisión vs generalización / justificación ante el jurado).

3. **¿Entran los años 2022–2024 como antecedente?**  
   Hoy solo el ciclo 2025 está en la tabla de trabajo; los años previos existen en intermedios y figuras.

4. **¿Umbral de nube definitivo?**  
   Ahora es 0 (`NUBE_MAX`). 10 y 30 añaden pocas observaciones; conviene congelar uno.

5. **Esquema de validación oficial del equipo**  
   Por municipio, por píxel de clima, u otro corte espacial. **No** corte aleatorio de parcelas.

6. **¿Se buscan datos externos** (suelo, clima público, etc.)?  
   El reto lo permite; hay que aprobar fuentes y alcance.

7. **Cuándo abrir fase 2 y fase 3**  
   Según `AGENTS.md`, modelos y Django solo si el equipo lo pide de forma explícita.

8. **Modelo y CSV que se entregan**, métrica de desempate, y si se reporta error aparte en Tlaxcala.

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
| Pasar a `modelo/` o `dashboard/` | Solo si se pide | **Pide** explícito |
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

8. **Reproducible y liviano.** Preferir lo que corra en CPU, con semillas fijas y dependencias claras en `modelo/`.

---

## Pruebas con diferentes CSVs de entrenamiento

Sí es viable —y recomendable— formar **varias tablas** con más o menos datos (dataset oficial y, si se aprueba, externos), distintos periodos o familias de variables, y entrenar **el mismo protocolo de modelos** sobre cada una.

### Variantes sugeridas (partir de `parcelas_trabajo.csv`)

| ID | Contenido (idea) | Qué pregunta responde |
| --- | --- | --- |
| A. Núcleo 2025 | Pocas columnas: p. ej. `ndvi_s2_int`, `ndvi_s2_media_sep_oct`, `crc_s2_media`, `lluvia_ciclo_mm`, `pendiente_grados`, `area_ha` | ¿Basta lo mínimo? |
| B. Núcleo + clima | A + temperaturas / amplitud | ¿La temperatura aporta o solo copia el estado? |
| C. Núcleo + Planet | A + columnas Planet (nombres aparte) | ¿El sensor fino suma? |
| D. + 2022–2024 | Resúmenes de años previos | ¿El historial de la parcela importa? |
| E. + ubicación | Alguna de las anteriores + estado/municipio/píxel | Techo de RMSE vs riesgo de aprender geografía |
| F. + externos | Solo si el equipo aprueba fuentes | ¿Vale el costo de integrarlas? |

No hace falta correr las seis el primer día: **A, C y E** suelen ser el mínimo informativo.

### Cómo compararlas con rigor

- Misma partición / CV espacial en todas.
- Mismos modelos, mismas semillas, mismas métricas (RMSE, MAE, r²; opcionalmente por estado).
- Versionar archivos (`parcelas_vA.csv`, …) y un **manifiesto** (columnas, filtro de nube, periodo, fuentes).
- Reportar también el tamaño efectivo (cuántos municipios / píxeles de clima quedan en cada fold).

Un agente puede generar las CSVs, el manifiesto y la tabla comparativa. El equipo elige cuál se congela para la entrega.

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

- [ ] Humanos: decidir ubicación sí/no, umbral de nube, CV, y lista de CSVs (A–F).
- [ ] Agente: crear `modelo/`, leer la(s) CSV, baseline + 1–2 modelos, tabla de métricas.
- [ ] Humanos: elegir modelo y condensamiento finales.
- [ ] Agente: predicciones de las 59, artefacto reproducible (modelo + script de inferencia).
- [ ] Humanos: pedir dashboard cuando el modelo esté estable.
- [ ] En paralelo: ir pasando hallazgos del KDD al reporte (metodología / resultados).

## Regla de oro

> El agente ejecuta y compara. El equipo fija criterios, abre fases y firma lo que se entrega.
