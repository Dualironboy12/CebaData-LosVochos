# CebaData — Los Vochos

Repositorio del equipo **Los Vochos** para el **Reto AgroCebada FIRA 2026**.

El reto pide un modelo analítico que prediga el rendimiento de parcelas de cebada en Hidalgo, Tlaxcala y Puebla, y una herramienta funcional (aplicación web, dashboard u otra interfaz) para consultar y visualizar esos resultados. FIRA busca usar percepción remota —imágenes satelitales y variables derivadas— como apoyo a la toma de decisiones en el sector agroalimentario.

Este documento resume las [bases de participación](Reto%20Agrocebada%20Bases.pdf) y las [ecuaciones de índices](Ecuaciones_indices_AgroCebada_FIRA_2026.pdf). Ante cualquier diferencia, prevalece el PDF oficial.

## Objetivo

Desarrollar un modelo capaz de estimar el rendimiento agrícola de parcelas de cebada y convertirlo en una solución tecnológica usable. El propósito de FIRA es incidir en productividad, eficiencia y desarrollo sostenible, y fortalecer las capacidades analíticas de quienes se forman en el campo mexicano.

## Contexto

La información satelital y ambiental permite entender el comportamiento de los cultivos, pero sigue siendo difícil convertir grandes volúmenes de datos en herramientas que anticipen la producción. El reto aplica estadística, modelación predictiva y aprendizaje automático a un problema real de interés nacional, en el marco del apoyo para fomentar la innovación tecnológica Industria 4.0 (subcomponente Emprendedores Innovadores).

## Quién puede participar

- Estudiantes de licenciatura con inscripción vigente en universidades de **Hidalgo, Tlaxcala y Puebla**.
- Carreras: ciencia de datos, actuaría o afines al desarrollo de soluciones para la agricultura basada en datos.
- Equipos de **3 a 5** integrantes. Pueden mezclar licenciaturas y universidades.
- El capitán registra al equipo, adjunta el comprobante de inscripción vigente de cada integrante y, una vez validado el registro, recibe las credenciales de la plataforma oficial.

No pueden participar estudiantes con familiares consanguíneos empleados o prestadores de servicios de FIRA al momento de la convocatoria, quienes realicen servicio social en FIRA, ni cónyuges, concubinas o descendientes directos de esas personas. Tampoco quienes aparezcan en SUSTRAE o BUROTEC al solicitar el incentivo.

Si el equipo queda entre los tres finalistas, FIRA pide por integrante: CURP, estado de cuenta con CLABE, banco y titular, identificación oficial, constancia de situación fiscal y la documentación adicional que indiquen las Reglas de Operación.

## Dataset

La base se descarga de la plataforma oficial del reto. Contiene **197 parcelas georreferenciadas** de cebada en Puebla, Hidalgo y Tlaxcala, con índices de vegetación, precipitación, temperatura y rendimiento al final de la cosecha.

El rendimiento se entrega solo para el **70 %** de las parcelas. El reto consiste en estimar el **30 %** restante. El rendimiento real del conjunto de evaluación lo resguarda el comité organizador y se usa únicamente para la calificación final.

Se puede complementar con cualquier otra información de acceso público. Hay dos conjuntos de índices: **Básico** (Sentinel-2 y Landsat) y **PRO** (Planet). Las ecuaciones están más abajo.

La guía de archivos, unidades y cruces está en [`DATASET_RETO_AGRO_2026/README.md`](DATASET_RETO_AGRO_2026/README.md).

## Plan de trabajo del equipo

El equipo construye la solución en tres fases (más la despensa de entrenamiento). El calendario oficial de FIRA (más abajo) sigue su propio nombre: Etapa 1 es el desarrollo y la entrega; Etapa 2 es la presentación ante el jurado.

| Fase | Trabajo | Herramienta | Carpeta |
| --- | --- | --- | --- |
| 1. Análisis de datos | Explorar el dataset, documentar calidad, relaciones y variables candidatas | **R** | [`analisis/`](analisis/) |
| — | Despensa congelada y CSVs curados (reto y extendidos) para entrenar | — | [`dataset_entrenamiento/`](dataset_entrenamiento/) |
| 2. Modelos | Desarrollar y entrenar los modelos que estiman el rendimiento | **Python** | [`modelos/`](modelos/) |
| 3. Frontend | Publicar el modelo como dashboard en una página web | **Django** (u otro stack que acuerde el equipo) | [`dashboard/`](dashboard/) |

**Fase actual: modelos (fase 2).** Datos curados listos en `dataset_entrenamiento/`; diseño e ingesta en [`modelos/`](modelos/). El dashboard se abre solo con pedido explícito. Detalle operativo abajo (§ Roadmap). Instrucciones: [`AGENTS.md`](AGENTS.md).

## Roadmap

Guía operativa después del KDD. Un agente no cambia los criterios cerrados sin acuerdo nuevo del equipo. Lecturas cortas: [`analisis/RESUMEN_DATOS_FIRA.md`](analisis/RESUMEN_DATOS_FIRA.md), [`analisis/RESUMEN_DATOS_INEGI.md`](analisis/RESUMEN_DATOS_INEGI.md), [`analisis/RESUMEN_DATOS_SOILGRIDS.md`](analisis/RESUMEN_DATOS_SOILGRIDS.md).

### Dónde estamos

| Fase | Estado | Dónde |
| --- | --- | --- |
| 1. Análisis (R) | FIRA, INEGI y SoilGrids con lectura | `analisis/datos_*` |
| Despensa / CSVs | Despensa nube 30 + multi-año; matriz curada v1 (1024 CSVs) | `dataset_entrenamiento/` |
| 2. Modelos (Python) | Abierta: propuesta + ingesta; falta baseline/entrenamiento | `modelos/` |
| 3. Dashboard | Después de un modelo estable | `dashboard/` |
| Reporte y video | Al cerrar el desarrollo | — |

### Orden recomendado

```text
1. Criterios humanos 1–6 (cerrados 2026-10-01)
2. Despensa NUBE_MAX=30 versionada (hecho) + matriz curada v1 en dataset_entrenamiento/ (hecho)
3. Fase 2 en modelos/: baseline + classic ML + misma CV espacial (filtrar catálogo)
4. Externos prioritarios ya en curados_extendidos/ (INEGI edaf + SoilGrids N/CEC/silt)
5. Elegir modelo y CSV ganadores → predecir las 59
6. Dashboard y, al final, reporte / video
```

### Decisiones cerradas (2026-10-01)

| # | Pregunta | Decisión |
| --- | --- | --- |
| 1 | Tabla base | Despensa + CSVs derivadas |
| 2 | Ubicación | Tres filosofías: ninguna / parcial / completa |
| 3 | Años previos | Solo 2025 y todos los ciclos (comparar) |
| 4 | Umbral de nube | `NUBE_MAX = 30` |
| 5 | Validación | Oficial por municipio; chequeo por píxel de clima |
| 6 | Datos externos | Dos carriles en paralelo: solo reto primero; INEGI/SoilGrids en paralelo |

**Matriz de CSVs v1:** 2 temporales × 32 ubicaciones × 16 paquetes extendidos = **1024** archivos en `dataset_entrenamiento/curados_reto/` y `curados_extendidos/`. Catálogo: `dataset_entrenamiento/manifiestos/catalogo_datasets_v1.csv`. Regenerar: `python3 dataset_entrenamiento/scripts/generar_datasets.py`.

**Despensas:** `parcelas_despensa_nube30_v1.csv` (solo 2025, 197×101) y `parcelas_despensa_multianio_nube30_v1.csv` (2025 + contexto 2022–2024, 197×125).

**Carril externo:** INEGI `edaf_grupo` y SoilGrids (`sg_nitrogen_0-5cm_mean`, `sg_cec_0-5cm_mean`, `sg_silt_0-5cm_mean`) entran como eje \(E\) de la matriz. Detalle en `dataset_entrenamiento/fuentes/` y `DATASETS_EXTERNOS/despensa_extendida/`.

**Pendientes humanas:** decisiones de CV/encoder en [`modelos/DECISIONES_ABIERTAS.md`](modelos/DECISIONES_ABIERTAS.md); modelo y CSV de entrega; abrir dashboard; commits/push/textos del reporte.

### Agente vs humano

El agente reproduce, construye CSVs, entrena y documenta. El equipo aprueba sets de columnas, abre fases, elige el modelo de entrega y autoriza commits. Regla: *el agente ejecuta y compara; el equipo fija criterios y firma lo que se entrega.*

### Filosofía de diseño (resumen)

Una fila = una parcela; el condensamiento es una hipótesis; misma CV en todos los experimentos; 3–5 CSVs y pocos modelos; sensores separados; baseline primero; explicabilidad; reproducible en CPU.

### Modelos (fase 2 en curso)

Priorizar classic ML (Ridge, RF/HistGBM, opcional LightGBM) sobre tablas propias. Baseline media por municipio → classic ML sobre el barrido del catálogo → elegir por CV espacial. Detalle: [`modelos/PROPUESTA_MODELOS.md`](modelos/PROPUESTA_MODELOS.md). Hugging Face / LLM no sustituyen el predictor de t/ha.

### Checklist fase 2

- [x] Decisiones 1–6
- [x] Despensa nube 30 en `dataset_entrenamiento/despensa/`
- [x] Despensa multi-año + matriz curada v1 (1024 CSVs + catálogo)
- [x] Fase 2 abierta; propuesta + pipeline de ingesta en `modelos/`
- [ ] Baseline + 1–2 modelos, CV municipio (+ píxel); filtrar catálogo
- [x] Externos prioritarios en matriz (`edaf` + SoilGrids N/CEC/silt)
- [ ] Elegir modelo y CSV de entrega; predicciones de las 59
- [ ] Pedido de `dashboard/`; autorizar commits/push

Cuando las tres fases estén cerradas, el equipo prepara también el [reporte técnico](#reporte-técnico) y el [video de presentación](#aplicación-o-interfaz) (máximo 5 minutos) que pide la convocatoria.

El uso de agentes de desarrollo está permitido. Cada agente anota en [`PROMPTS.md`](PROMPTS.md) modelo, prompt, acciones y afectaciones. Instrucciones: [`AGENTS.md`](AGENTS.md).

## Cómo se desarrolla el reto

**Etapa 1.** Desarrollo del modelo y de la aplicación o interfaz web. Los tres equipos con mayor puntaje, según los criterios de esta convocatoria, pasan como finalistas. La notificación llega por la plataforma y al correo del capitán.

**Etapa 2.** Presentación de máximo **15 minutos** ante el jurado. Los tres primeros lugares se dan a conocer en el **III Congreso Nacional de Ciencia de Datos**, el **20 de noviembre de 2026**, donde también es la premiación. FIRA no cubre traslado, hospedaje ni viáticos.

## Entregables

### Reporte técnico

Se sube a la plataforma del reto con esta estructura:

| Sección | Extensión |
| --- | --- |
| Introducción | 400–550 palabras |
| Justificación | 100–200 palabras |
| Objetivos | 200 palabras |
| Metodología | 600–700 palabras |
| Resultados y discusión | 800 palabras |
| Uso de la ciencia de datos en la inclusión financiera del sector agro | 300 palabras |
| Conclusiones | 400 palabras |
| Bibliografía | — |
| Anexos | máximo 2 cuartillas |

En anexos debe describirse la actividad y la aportación de cada integrante. Si el equipo es finalista, el jurado considera esa información. El uso de inteligencia artificial es válido si el escrito indica dónde se usó y anexa los prompts. La bitácora de esos prompts es [`PROMPTS.md`](PROMPTS.md).

### Aplicación o interfaz

- Prototipo funcional (aplicación, interfaz web o dashboard) que ejecute el modelo y permita consultar los resultados de forma interactiva.
- Código fuente de la aplicación y del modelo, con la documentación necesaria para ejecutarlo.
- Video demostrativo de máximo **5 minutos**. Si hay una herramienta en línea, se entrega el enlace para que el jurado la consulte.

## Criterios de evaluación

### Etapa 1

| Criterio | Peso |
| --- | --- |
| Desempeño predictivo y justificación técnica (precisión, solidez metodológica y variables). Métricas: RMSE, MAE, r² u otras que defina el comité. | 70 % |
| Desarrollo de la aplicación o interfaz web: utilidad para consultar y visualizar resultados. | 30 % |

### Etapa 2

El jurado valora dominio del tema y de las herramientas, interpretación de los resultados, capacidad de transmitir el conocimiento, relación de la herramienta con un problema de política pública (inclusión financiera en el sector agropecuario y rural) y viabilidad de propuestas y conclusiones.

Si hay empate técnico en la evaluación numérica del modelo, el jurado puede desempatar con la calidad de la presentación.

### Preguntas guía (bonus)

Estas preguntas, y su justificación, cuentan como puntos extra:

1. ¿Qué índice es más importante en la predicción?
2. ¿Qué variable climática tiene mayor peso?
3. ¿Qué combinación de variables funciona mejor?

## Calendario

| Hito | Fecha |
| --- | --- |
| Publicación de la convocatoria | 19 de agosto de 2026 |
| Periodo de inscripción | 19 de agosto – 7 de septiembre de 2026 |
| Entrega del dataset (inicio del reto) | 14 de septiembre de 2026 |
| Resolución de dudas (reunión en línea) | 18 de septiembre de 2026 |
| Desarrollo de los entregables | 14 de septiembre – 19 de octubre de 2026 |
| Fecha límite de entrega | 19 de octubre de 2026, 23:59 h |
| Notificación de los 3 finalistas | 3 de noviembre de 2026 |
| Presentación ante el jurado (en línea) | 10 de noviembre de 2026 |
| Congreso y premiación | 20 de noviembre de 2026 |

## Índices satelitales

Ecuaciones de los conjuntos **Básico** y **PRO**, según la nomenclatura de bandas de cada sensor.

### Dataset Básico — Sentinel-2

| Índice | Ecuación |
| --- | --- |
| NDVI | `(B08 - B04) / (B08 + B04)` |
| EVI | `2.5 * ((B08 - B04) / (B08 + (6 * B04) - (7.5 * B02) + 1))` |
| SAVI | `(B08 - B04) * 1.5 / (B08 + B04 + 0.5)` |
| LAI | `(-log((0.69 - SAVI) / 0.59)) / 0.91` |
| CRC | `(B11 - B02) / (B11 + B02)` |
| MCRC | `(B11 - B03) / (B11 + B03)` |
| NDSVI | `(B11 - B04) / (B11 + B04)` |
| SRNDI | `(B12 - B04) / (B12 + B04)` |
| NDTI | `(B11 - B12) / (B11 + B12)` |
| STI | `B11 / B12` |
| NDWI | `(B08 - B11) / (B08 + B11)` |
| ENDWI | `(B08 - B12) / (B08 + B12)` |
| MSI | `B11 / B08` |
| EMSI | `B12 / B08` |
| DSWI2 | `B11 / B03` |
| DSWI3 | `B11 / B04` |
| DSWI4 | `B03 / B04` |
| DSWI5 | `(B08 + B03) / (B11 + B04)` |
| NDDI | `(NDVI_resampled - ENDWI_resampled) / (NDVI_resampled + ENDWI_resampled)` |
| ENDDI | `(NDVI_resampled - NDWI_resampled) / (NDVI_resampled + NDWI_resampled)` |

En NDDI y ENDDI, `resampled` indica datos remuestreados a enteros de 8 bits.

**MRA**

```text
MRA = exp(a + b * NDVI / albedo)
a = ln(0.02) - [b * 0.02]
b = (NDVI_max - 0.02) / (ln(hv / 7) - ln(0.002))
hv = 1   (valor por defecto)
albedo = 0.23
```

**FAPAR.** El procedimiento detallado está en la [guía de Sentinel Hub](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/fapar/).

### Dataset Básico — Landsat

| Índice | Ecuación |
| --- | --- |
| VI6T | `(B3 - ST_B10) / (B3 + ST_B10)` |

### Dataset PRO — Planet

| Índice | Ecuación |
| --- | --- |
| NDVI | `(b8 - b6) / (b8 + b6)` |
| EVI | `2.5 * ((b8 - b6) / (b8 + (6 * b6) - (7.5 * b2) + 1))` |
| MSAVI | `(2 * b8 + 1 - sqrt(((2 * b8 + 1) ** 2) - 8 * (b8 - b6))) / 2` |
| LAI2 | `(5.405 * ((b8 - b7) / (b8 + b7))) - 0.114` |

Los nombres de banda corresponden al instrumento Planet. Referencia: [sensores Planet (PSB.SD)](https://developers.planet.com/docs/apis/data/sensors/#the-psbsd-instrument).

## Causas de descalificación

- Presentar información falsa o que no sea de la autoría de los participantes.
- No entregar la documentación que pida FIRA al avanzar de etapa.
- No presentarse ante el jurado si el equipo avanza.
- Registrar a personas impedidas según el apartado de exclusiones.
- Entregar un proyecto con un tema distinto al de estas bases.
- Incurrir en indisciplina o mal comportamiento, a juicio del jurado o de FIRA.
- Incumplir cualquier punto de las bases.

Lo no previsto lo resuelve el comité organizador y su decisión es inapelable. Inscribirse implica aceptar las bases. El aviso de privacidad está en [fira.gob.mx](https://www.fira.gob.mx), sección Datos Personales, fideicomiso FEGA, «Avisos de Privacidad Reto AgroCebada 2026».

## Documentos en este repositorio

- [`Reto Agrocebada Bases.pdf`](Reto%20Agrocebada%20Bases.pdf) — bases de participación.
- [`Ecuaciones_indices_AgroCebada_FIRA_2026.pdf`](Ecuaciones_indices_AgroCebada_FIRA_2026.pdf) — ecuaciones de los índices satelitales.
- [`DATASET_RETO_AGRO_2026/README.md`](DATASET_RETO_AGRO_2026/README.md) — guía del dataset oficial (no se altera).
- [`analisis/`](analisis/) — KDD en R (carriles FIRA / INEGI / SoilGrids); ver [`analisis/README.md`](analisis/README.md) y los `RESUMEN_DATOS_*.md`.
- [`dataset_entrenamiento/`](dataset_entrenamiento/) — despensa y CSVs curados para entrenar.
- [`modelos/`](modelos/) — entrenamiento y artefactos (fase 2).
- [`dashboard/`](dashboard/) — interfaz web (fase 3).
- [`AGENTS.md`](AGENTS.md) — instrucciones globales para agentes; cada carpeta de trabajo tiene además su `AGENTS.md` local.
- [`PROMPTS.md`](PROMPTS.md) — bitácora de prompts, acciones y afectaciones.

## Licencia

MIT. Ver [LICENSE](LICENSE).
