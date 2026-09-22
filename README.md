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

En anexos debe describirse la actividad y la aportación de cada integrante. Si el equipo es finalista, el jurado considera esa información. El uso de inteligencia artificial es válido si el escrito indica dónde se usó y anexa los prompts.

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

## Incentivo

El incentivo es por integrante y lo otorga FIRA, sujeto a normatividad, disponibilidad presupuestal y al cumplimiento de requisitos. La UDI se toma con el valor publicado al 1 de enero de 2026 (**$8.6662 MXN**).

| Lugar | UDIS por integrante | Equivalente aproximado |
| --- | ---: | ---: |
| 1.° | 2,884.77 | $25,000 MXN |
| 2.° | 1,730.86 | $15,000 MXN |
| 3.° | 1,153.91 | $10,000 MXN |

El equivalente en pesos es el producto del monto en UDIS por la cotización publicada; la entrega ocurre después del congreso.

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

## Licencia

MIT. Ver [LICENSE](LICENSE).
