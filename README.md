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

## Estructura del proyecto

```text
analisis/                 KDD en R (FIRA, INEGI, SoilGrids)
dataset_entrenamiento/    Despensa + 1024 CSVs curados
modelos/                  Exploración (superciclo) + ficha de la mezcla
sistema/api               Submódulo: API Django + pipeline (ALNM7/cebadata_api)
sistema/dashboard         Submódulo: Angular (ALNM7/DashboardCebaData)
docs/                     Camino a hosting y propuestas a esos repos
INSTALACION.md            Descargar, instalar y ejecutar en local
DATASET_RETO_AGRO_2026/   Dataset oficial (no alterar)
PROMPTS.md                Bitácora de uso de IA
```

En línea: [dashboard](https://dashboard-ceba-data.vercel.app/) y [API](https://cebadata-api.onrender.com).

## Ejecutar localmente

Instrucciones completas: [`INSTALACION.md`](INSTALACION.md). Resumen:

```bash
git clone --recurse-submodules https://github.com/Dualironboy12/CebaData-LosVochos.git
cd CebaData-LosVochos
bash scripts/levantar_local.sh
# API:       http://127.0.0.1:8000/api/salud
# Dashboard: http://127.0.0.1:4200
```

Modelo de entrega: **mezcla** ([`modelos/entrega/`](modelos/entrega/)). El pipeline que lo regenera está en `sistema/api`, no en esta carpeta.

## Plan de trabajo del equipo

El calendario oficial de FIRA llama «Etapa 1» al desarrollo/entrega y «Etapa 2» a la presentación ante el jurado. Internamente el equipo usa estas fases:

| Fase | Trabajo | Stack | Carpeta |
| --- | --- | --- | --- |
| 1. Análisis | Calidad, relaciones, variables candidatas | R | [`analisis/`](analisis/) |
| — | Despensa y CSVs curados | — | [`dataset_entrenamiento/`](dataset_entrenamiento/) |
| 2. Modelos | Entrenar, comparar y firmar el predictor | Python | [`modelos/`](modelos/), [`modelos/entrega/`](modelos/entrega/) |
| 3. API | Servir artefactos congelados | Django REST | [`sistema/api`](sistema/api) |
| 4. Frontend | Consulta interactiva | Angular | [`sistema/dashboard`](sistema/dashboard) |

**Fase actual: entrega.** Este repo documenta el proceso. La API y el dashboard publicados están en sus repos y entran aquí como submódulos. El reporte técnico y el video se envían por correo y no viven en este repositorio. Lista de lo que sí está aquí: [`ENTREGA.md`](ENTREGA.md).

## Roadmap

Lecturas cortas: [`analisis/RESUMEN_DATOS_FIRA.md`](analisis/RESUMEN_DATOS_FIRA.md), [`analisis/RESUMEN_DATOS_INEGI.md`](analisis/RESUMEN_DATOS_INEGI.md), [`analisis/RESUMEN_DATOS_SOILGRIDS.md`](analisis/RESUMEN_DATOS_SOILGRIDS.md).

### Dónde estamos

| Fase | Estado | Dónde |
| --- | --- | --- |
| 1. Análisis (R) | Cerrada (referencia) | `analisis/datos_*` |
| Despensa / CSVs | Lista (1024 CSVs) | `dataset_entrenamiento/` |
| 2. Modelos | Entrega firmada: mezcla | `modelos/entrega/` |
| 3. API | Publicada en Render; submódulo | `sistema/api` |
| 4. Dashboard | Publicado en Vercel; submódulo | `sistema/dashboard` |

### Decisiones cerradas (2026-10-01 y posteriores)

| # | Pregunta | Decisión |
| --- | --- | --- |
| 1 | Tabla base | Despensa + CSVs derivadas |
| 2 | Ubicación | Tres filosofías: ninguna / parcial / completa |
| 3 | Años previos | Solo 2025 y todos los ciclos (comparar) |
| 4 | Umbral de nube | `NUBE_MAX = 30` |
| 5 | Validación | Oficial por municipio; chequeo por píxel de clima |
| 6 | Datos externos | Dos carriles; evaluados y **no** usados en la entrega |
| D8 | Modelo de entrega | **Mezcla** (2026-10-13); ver [`modelos/entrega/`](modelos/entrega/) |

**Pendientes humanas:** prompts de sesiones Claude Code de Alfredo para completar el anexo; confirmar que los repos de ALNM7 siguen públicos; confirmar si este repo debe permanecer privado respecto al dataset oficial; titular de la licencia. El reporte y el video los prepara otra integrante y se envían por correo.

### Checklist

- [x] Decisiones 1–6 y D1–D8
- [x] Despensa + matriz curada v1
- [x] Superciclo Classic ML + prueba pareada del ganador
- [x] Modelo de entrega: mezcla; artefactos en `sistema/api/artefactos/`
- [x] API y dashboard en sus repos, incluidos aquí como submódulos
- [x] Enlace en línea: https://dashboard-ceba-data.vercel.app/

El uso de agentes de desarrollo está permitido. Cada agente anota en [`PROMPTS.md`](PROMPTS.md). Instrucciones: [`AGENTS.md`](AGENTS.md).

## Memoria de desarrollo

Resumen de etapas, actividades y por qué se tomaron las decisiones. Detalle de prompts en [`PROMPTS.md`](PROMPTS.md).

### 1. Planeación (2026-09-24)

Se fijó el plan de trabajo en tres fases (análisis → modelos → interfaz), las reglas para agentes (`AGENTS.md`, bitácora `PROMPTS.md`) y el alcance del reto. **Por qué:** alinear al equipo antes de tocar datos y dejar trazabilidad del uso de IA que pedirán los anexos.

### 2. KDD en R, tres carriles (2026-09-29 a 2026-10-04)

Análisis exploratorio del dataset FIRA; luego edafología INEGI y capas SoilGrids como carriles paralelos. Se documentaron resúmenes por fuente. **Por qué:** entender calidad, sesgos espaciales y candidatos a features antes de congelar una matriz de entrenamiento; las bases permiten datos públicos adicionales.

### 3. Despensa y matriz de 1024 CSV (2026-10-03 a 2026-10-06)

Se congeló la despensa con `NUBE_MAX=30`, la multi-año, y una matriz 2×32×16 (temporal × ubicación × externos). **Por qué:** una fila = una parcela; comparar hipótesis de ubicación y de datos externos con la misma CV por municipio, sin re-curar el oficial en cada experimento.

### 4. Superciclo Classic ML (2026-10-06)

Barrido de baselines + ridge/elasticnet/RF/HistGBM/LightGBM sobre el catálogo, HPO en el top-K. El ganador automático usaba longitud + píxel climático + N + edafología. **Por qué:** medir con rigor qué aporta arquitectura vs. features vs. externos, con semilla y CV fijas (D1–D7).

### 5. Pipeline de Alfredo y primer dashboard (2026-10-06 a 2026-10-10)

Alfredo (integrante) construyó un pipeline propio sobre el dataset oficial (features fenológicas densas, Optuna anidado) y un dashboard en JavaScript; luego migró el front a Angular. **Por qué:** separar entrenamiento reproducible de un backend ligero que solo carga artefactos, y dar una UI para mapa, ficha, métricas y simulador.

### 6. API con la mezcla (2026-10-13)

Se consolidó el modelo único: promedio del ensamble (LGBM+RF+ENet) y un LightGBM de solo longitud. Artefactos versionados (~2 MB), Django sin base de datos, endpoints de lectura + simulador + parcela nueva. **Por qué:** la mezcla empata al ensamble donde se califica y mejora la robustez LOMO; la longitud captura el gradiente oeste–este de la región.

### 7. Prueba pareada del ganador del superciclo (2026-10-13)

Se evaluó el ganador del superciclo (con y sin externos; hiperparámetros fijos u Optuna anidado) dentro de la validación del pipeline de la API. **Veredicto: no vale la pena sustituir la mezcla.** Los externos no pasan el umbral de 0.010 t/ha. Informe: [`modelos/comparativas/prueba_ganador_en_pipeline/INFORME.md`](modelos/comparativas/prueba_ganador_en_pipeline/INFORME.md).

### 8. Integración al monorepo (2026-10-13)

`api/` y `dashboard/` entraron por `git subtree` (historial de Alfredo conservado). **Por qué:** un solo repo ejecutable para el jurado, con modelo firmado, API y front documentados.

### 9. Separación en repos y hosting (2026-10-18)

Render y Vercel despliegan un servicio por repo. La API y el dashboard volvieron a [cebadata_api](https://github.com/ALNM7/cebadata_api) y [DashboardCebaData](https://github.com/ALNM7/DashboardCebaData), publicados en https://cebadata-api.onrender.com y https://dashboard-ceba-data.vercel.app/. Este repositorio documenta el proceso y los incluye como submódulos en commits fijos. **Por qué:** el hosting no admite bien el monorepo, y duplicar el código aquí divergía de lo que está en línea. Detalle: [`docs/CAMINO_A_HOSTING.md`](docs/CAMINO_A_HOSTING.md).

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

En anexos debe describirse la actividad y la aportación de cada integrante. Si el equipo es finalista, el jurado considera esa información. El uso de inteligencia artificial es válido si el escrito indica dónde se usó y anexa los prompts. La bitácora de esos prompts es [`PROMPTS.md`](PROMPTS.md). El reporte y el video no se versionan aquí: se envían por correo.

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
- [`analisis/`](analisis/) — KDD en R (carriles FIRA / INEGI / SoilGrids).
- [`dataset_entrenamiento/`](dataset_entrenamiento/) — despensa y CSVs curados.
- [`modelos/`](modelos/) — exploración; [`modelos/entrega/`](modelos/entrega/) — ficha del modelo firmado (mezcla).
- [`sistema/api`](sistema/api) — submódulo de la API y del pipeline.
- [`sistema/dashboard`](sistema/dashboard) — submódulo del dashboard.
- [`INSTALACION.md`](INSTALACION.md) — descargar, instalar y ejecutar en local.
- [`docs/CAMINO_A_HOSTING.md`](docs/CAMINO_A_HOSTING.md) — de este repo a Render y Vercel.
- [`AGENTS.md`](AGENTS.md) — instrucciones para agentes (cada carpeta tiene su `AGENTS.md` local).
- [`PROMPTS.md`](PROMPTS.md) — bitácora de prompts, acciones y afectaciones.
- [`CUMPLIMIENTO_BASES.md`](CUMPLIMIENTO_BASES.md) — revisión frente a las bases del reto.
- [`ENTREGA.md`](ENTREGA.md) — qué queda en este repositorio. El reporte y el video se envían por correo.

## Licencia

MIT. Ver [LICENSE](LICENSE).
