# Guion del video demostrativo (máximo 5 minutos)

Reto AgroCebada FIRA 2026 · Equipo Los Vochos. Concepto para grabar; la edición la hace el equipo. Meta de duración: **4:45**, con 15 segundos de margen.

No afirmar causalidad (la lluvia de mayo y la longitud pueden ser indicadores de zona). No presentar un error de las 59 parcelas ocultas. Decir que SHAP explica el LightGBM del ensamble (un sexto de la mezcla), no la mezcla completa.

## Tomas

| # | Pantalla | Notas |
| --- | --- | --- |
| 1 | Título: CebaData, equipo, reto | 3 s, sin música fuerte |
| 2 | Mapa de la región o primera vista del dashboard | Las 197 parcelas |
| 3 | Diapositiva o pizarra: 138 con rendimiento, 59 ocultas | Una frase |
| 4 | Tabla de tres candidatos (reporte o panel «Desempeño») | RMSE 0.508 y LOMO 0.595 |
| 5 | Mapa del dashboard, clic en una parcela (p. ej. AGC_003) | Ficha, intervalo, cascada SHAP |
| 6 | Panel de métricas y de hallazgos | NDVI, lluvia de mayo, bloques |
| 7 | Simulador y, si da tiempo, parcela nueva | Un solo cambio de clima |
| 8 | Cierre: repo, comando `bash scripts/levantar_local.sh`, enlace en línea | El enlace se dice solo si ya está publicado |

## Guion

### 0:00–0:30 · Problema

**Se ve:** título y mapa.

**Se dice:** El Reto AgroCebada pide estimar el rendimiento de cebada, en toneladas por hectárea, en parcelas de Hidalgo, Puebla y Tlaxcala, y poder consultar ese número. Nosotros armamos un modelo y un dashboard. El conjunto tiene 197 parcelas del ciclo abril a octubre de 2025. En 138 hay rendimiento medido. En 59 la etiqueta está oculta y es la que va a calificar el comité. Esas 59 no las usamos para entrenar.

### 0:30–1:15 · Datos

**Se ve:** mapa; si se puede, una serie o el panel de hallazgos sin detenerse.

**Se dice:** Cada parcela junta índices de vegetación de satélite, lluvia y temperatura mensuales, elevación, pendiente y la ubicación. No nos quedamos con el valor máximo del índice: pesan más la velocidad de senescencia y el resto de la dinámica del ciclo. Probamos datos públicos de suelo, de INEGI y de SoilGrids, y no entraron al modelo final: no mejoraron el error bajo un criterio que fijamos antes de ver el resultado.

### 1:15–2:15 · Modelo

**Se ve:** tabla de candidatos en «Desempeño del modelo».

**Se dice:** El modelo de entrega se llama mezcla. Es el promedio de dos cosas. Un ensamble de LightGBM, bosque aleatorio y red elástica, con 121 variables, y un LightGBM que solo usa la longitud. Donde se califica, la validación estratificada por municipio, el error RMSE es 0.508 toneladas por hectárea, el MAE 0.354 y la r cuadrada 0.64. Predecir el promedio daría 0.846. Si dejamos un municipio completo fuera, el RMSE sube a 0.595. El ensamble solo se cae más; la longitud sola generaliza mejor pero no describe el cultivo. La mezcla equilibra las dos pruebas. El límite es claro: es una sola temporada, y la longitud funciona porque aquí el rendimiento cambia de oeste a este. Fuera de esta región no se debe usar sin reentrenar.

### 2:15–3:45 · Dashboard

**Se ve:** mapa, clic en parcela, ficha, métricas, hallazgos, simulador.

**Se dice:** El mapa muestra las 197 parcelas. Al abrir una ficha se ve el estimado, un intervalo y una cascada de explicación. Esa cascada no explica toda la mezcla: explica el LightGBM del ensamble, que pesa un sexto. En hallazgos, el índice de mayor contribución es el NDVI, la variable climática de mayor peso es la lluvia de mayo, y el bloque de menor error es el clima, prácticamente empatado con usar todas las variables. El satélite solo, sin clima, predice peor. En el simulador se puede mover la lluvia dentro del rango observado. El efecto sale atenuado, porque la mitad del modelo es la longitud y esa no cambia con el clima.

### 3:45–4:30 · Para qué sirve

**Se ve:** ficha quieta, luego el cierre.

**Se dice:** El número no sustituye una evaluación de crédito ni una visita. Sirve para consultar un estimado con un error conocido, ordenar parcelas de una zona y conversar con el productor sobre el ciclo. Eso es lo que lo acerca a la inclusión financiera: información de parcela, hecha con datos públicos, con el límite escrito al lado. No es un aforo.

### 4:30–4:45 · Cierre

**Se ve:** URL del repositorio y, si existe, la de la aplicación. Comando de arranque en texto.

**Se dice:** El código, el reporte y las instrucciones están en el repositorio del equipo. En local se levanta con un script: la API en el puerto 8000 y el dashboard en el 4200. [Si hay enlace:] La aplicación en línea está en esta dirección. Gracias.

## Qué no decir

- Que la lluvia de mayo causa el rendimiento.
- Que el RMSE de 0.508 ya es la calificación de las 59.
- Que SHAP explica la mezcla completa.
- Que el modelo sirve en otro estado o en otro año sin datos nuevos.

## Grabación

- Resolución 1920×1080, cursor visible, zoom del navegador al 110 % si el texto se ve chico.
- Una toma continua del dashboard y cortar en edición; la voz puede grabarse encima.
- Ensayar una vez con cronómetro. Si se pasa de 4:50, recortar el simulador, no la tabla de métricas.
