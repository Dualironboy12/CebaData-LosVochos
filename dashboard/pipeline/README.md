# Pipeline de datos, Reto AgroCebada FIRA 2026

Pipeline reproducible que convierte el dataset crudo del reto en tablas limpias listas para la ingenieria de features y el modelado. Los pasos 01 a 06 corren en menos de un minuto; con Optuna y SHAP el total ronda los 8 minutos.

## Estructura

```
pipeline/
  correr_pipeline.py        corre los 4 pasos en orden
  requirements.txt
  src/
    config.py               rutas y parametros (umbral de nubosidad, ciclo, CRS)
    paso01_parcelas.py      tabla maestra: ID, conjunto, estado, municipio, area, rendimiento, centroide
    paso02_satelital.py     separa sensores, marca observaciones limpias y del ciclo 2025
    paso03_clima_topografia.py  extrae clima mensual y topografia por parcela
    paso04_validaciones.py  22 checks de integridad; truena si algo no cuadra
    paso05_features.py      tabla de modelado: fenologia, clima, historia, estaticos
    paso05b_soilgrids.py    (opcional, requiere internet) suelo de SoilGrids por parcela
    paso06_baselines.py     baselines con CV repetida estratificada por municipio
    paso07_optimizacion.py  poda de redundancia, Optuna anidado, ensamble y predicciones finales (~3 min)
    paso08_interpretacion.py  SHAP, ablacion por bloques y robustez espacial (respuestas a preguntas guia)
  salidas/                  aqui se escriben los CSV resultantes
```

## Como correrlo (paso a paso)

Todos los comandos se corren desde la raiz del repo. Si estas en `DashboardCebaData`, primero copia la carpeta `DATASET_RETO_AGRO_2026/` del repo CebaData-LosVochos a la raiz de este repo (junto a `pipeline/`), porque aqui no se versiona. Necesitas Python 3.10 o mayor.

1. **Revisa que el dataset del reto este descomprimido.** El pipeline lee `DATASET_RETO_AGRO_2026/` (en la raiz del repo, a la altura de `pipeline/`). Los CSV y el shapefile ya vienen sueltos; los zips de clima y topografia deben estar extraidos en carpetas con el mismo nombre del zip (`Reto_AgroCebada_CHIRPS_Precipitacion_2022_2025/`, `Reto_AgroCebada_Temperatura_2022_2025/`, `Reto_AgroCebada_Topografia_INEGI_CEM4/`). Si tu dataset esta en otro lado, cambia `RUTA_DATASET` en `pipeline/src/config.py`.
2. **Crea y activa un entorno virtual.**

   ```bash
   cd pipeline
   python3 -m venv .venv
   source .venv/bin/activate        # en Windows: .venv\Scripts\activate
   ```

3. **Instala dependencias.**

   ```bash
   pip install -r requirements.txt
   ```

   `geopandas` y `rasterio` traen sus propias dependencias binarias; con `pip` reciente se instalan sin compilar. Si falla en Windows, usa conda: `conda install -c conda-forge geopandas rasterio`.
4. **Corre el pipeline completo.**

   ```bash
   python correr_pipeline.py
   ```

   Ejecuta los pasos 01 a 08 en orden y se detiene si alguno falla. Los pasos 01 a 06 tardan menos de un minuto; el paso 07 (Optuna anidado) es el lento. En una corrida de prueba el total fue de unos 8 minutos.
5. **Revisa las salidas** en `pipeline/salidas/`. Empieza por `reporte_validacion.txt` (las 22 validaciones deben salir en OK), luego `metricas_optimizadas.csv` y `predicciones_59_parcelas.csv`. La tabla de abajo describe cada archivo.

Tambien puedes correr un paso suelto desde `pipeline/src/` (por ejemplo `python paso07_optimizacion.py`), siempre que ya existan las salidas de los pasos anteriores.

### Datos externos: suelo de SoilGrids (opcional, permitido por las bases)

Las bases permiten usar datos publicos externos documentando la fuente. El
unico que agregamos es suelo (SoilGrids 2.0 de ISRIC), porque es la variable
ambiental que mas le falta al dataset oficial y varia dentro de cada zona
climatica. Ya esta 100 % cableado; solo hay que descargar los valores desde
una maquina con internet normal:

```
cd src
python paso05b_soilgrids.py      # consulta las 197 parcelas (unos minutos, reanudable)
cd ..
python correr_pipeline.py        # el paso 05 integra el suelo y 07/08 lo evaluan
```

`paso05b_soilgrids.py` es reanudable: guarda el avance cada 10 parcelas, asi
que si se corta la conexion basta volver a correrlo. Una vez que existe
`salidas/suelo_parcela.csv`, el resto del pipeline lo detecta solo: el paso 05
lo une (5 columnas: pH, carbono organico, arcilla, arena, CIC), el paso 07 lo
mete al modelo, y el paso 08 le calcula SHAP como familia "suelo" y agrega dos
bloques a la ablacion (`solo_suelo` y `todo_sin_suelo`) para medir si aporta.
La integracion esta verificada de punta a punta; si al final el suelo no baja
el RMSE, se deja fuera sin tocar nada mas.

Para saber si el suelo mejoro el modelo: `python comparar_suelo.py`. Compara
contra `referencia_sin_suelo/` (resultados de la version sin suelo, incluidos
en el zip) y da un veredicto con una regla fija: se adopta el suelo solo si el
RMSE del ensamble baja al menos 0.010 t/ha y la ablacion pareada lo confirma.

Fuente a citar: Poggio et al. (2021), SoilGrids 2.0, SOIL 7, 217-240,
https://doi.org/10.5194/soil-7-217-2021

## Salidas

| Archivo | Contenido |
|---|---|
| `parcelas_maestro.csv` | 197 parcelas con ID, conjunto, estado, municipio, area, rendimiento (nulo en las 59 de prediccion) y centroide lon/lat |
| `satelital_s2.csv` | Sentinel-2: 22 indices x 4 estadisticos, con banderas `limpia` (nubosidad < 20 %) y `en_ciclo_2025` |
| `satelital_landsat.csv` | Landsat: solo VI6T (el resto de sus columnas viene vacio por diseno del dataset) |
| `satelital_planet.csv` | Planet 2025: NDVI, EVI, LAI, MSAVI, mismas banderas |
| `clima_mensual_parcela.csv` | Formato largo: parcela, anio, mes, precipitacion, tmax, tmin (2022 a 2025, sin nulos) |
| `topografia_parcela.csv` | Elevacion y pendiente medias por parcela (media zonal sobre el CEM) |
| `reporte_validacion.txt` | Resultado de las 22 validaciones |
| `features_modelado.csv` | 197 parcelas x 135 columnas: fenologia por indice (pico, fecha de pico, integral, tasas de verdeo y senescencia, S2 y Planet por separado), clima mensual y agregado del ciclo, grados-dia, anomalia de precipitacion, historia NDVI 2022 a 2024, topografia y ubicacion |
| `suelo_parcela.csv` | (si se corre el paso 05b) pH, carbono organico, arcilla, arena y CIC de SoilGrids |
| `metricas_baseline.csv` | RMSE, MAE y R2 (media y desviacion) de los 4 baselines con CV 5x10 |
| `importancias_baseline.csv` | Importancia por permutacion del mejor baseline |
| `metricas_optimizadas.csv` | Metricas de la validacion anidada (Optuna dentro de cada fold) |
| `hiperparametros_finales.json` | Hiperparametros del modelo final y variables usadas |
| `predicciones_59_parcelas.csv` | Prediccion final por parcela con intervalo empirico (cuantil 90 del error de CV) |
| `shap_importancia.csv`, `fig_shap_*.png` | Importancia SHAP por variable y por familia |
| `ablacion_bloques.csv` | RMSE por subconjunto de variables (responde la pregunta guia 3) |
| `robustez_espacial.csv` | RMSE dejando cada municipio fuera |
| `respuestas_preguntas_guia.txt` | Respuestas redactadas a las 3 preguntas guia del reto |

## Resultados baseline (15 sep, sin optimizar ni incluir suelo)

| Modelo | RMSE (t/ha) | MAE | R2 |
|---|---|---|---|
| Media global | 0.846 | 0.749 | -0.01 |
| Elastic Net | 0.548 | 0.399 | 0.57 |
| Random Forest | 0.518 | 0.376 | 0.61 |
| HistGradientBoosting | 0.531 | 0.399 | 0.59 |

Validacion cruzada repetida (5 particiones x 10 repeticiones) estratificada por municipio. Estos numeros son el piso a mejorar con Optuna, seleccion de variables, suelo y ensamble.

## Resultados optimizados (17 sep, paso 07, validacion ANIDADA)

| Modelo | RMSE (t/ha) | MAE | R2 |
|---|---|---|---|
| LightGBM (Optuna) | 0.507 | 0.368 | 0.64 |
| Random Forest (Optuna) | 0.522 | 0.369 | 0.62 |
| Elastic Net (Optuna) | 0.530 | 0.380 | 0.61 |
| Ensamble (promedio) | 0.508 | 0.362 | 0.64 |

La validacion es anidada: Optuna solo ve el fold de entrenamiento, asi que estos numeros no estan inflados por la busqueda de hiperparametros (son mas conservadores y mas honestos que los del paso 06). El ensamble tiene el mejor MAE y la varianza mas baja; es el modelo que genera predicciones_59_parcelas.csv, con intervalos de +/- 0.76 t/ha (cuantil 90 del error absoluto de CV). Solo usa el dataset oficial: SoilGrids (paso 05b) sigue siendo opcional y se puede evaluar despues.

## Decisiones metodologicas (para el reporte tecnico)

- El identificador del shapefile viene truncado como `ID_POLIGON`; se renombra a `ID_POLIGONO` para unificar la llave.
- El CSV de rendimiento trae una columna vacia sin nombre; se descarta.
- Umbral de nubosidad de 20 %: por debajo de el, menos del 1 % de los indices viene nulo y toda parcela conserva al menos 26 observaciones S2 dentro del ciclo. El umbral es un parametro en `config.py` por si queremos sensibilizarlo.
- El clima se muestrea en el centroide de la parcela porque el pixel de CHIRPS/CHIRTS (~5 km) es mucho mas grande que cualquier parcela; la topografia (pixel 120 m) si se promedia zonalmente con `all_touched=True`.
- Ninguna fila satelital se elimina: el filtrado queda como bandera para que cada experimento decida, pero con el criterio unificado.
- Planet y Sentinel-2 se mantienen como fuentes separadas, como advierte el diccionario del reto.
