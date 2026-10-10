# CebaData

Dashboard web en español para consultar un modelo de machine learning que predice el rendimiento de cebada (t/ha) en 197 parcelas del altiplano de Hidalgo, Puebla y Tlaxcala, ciclo abril a octubre de 2025.

Los datos que muestra son **simulados** (semilla fija, siempre iguales) y siguen la estructura de la API real.

## Cómo ejecutarlo

No necesita instalación ni compilación. **Hay que abrirlo desde un servidor local**, no con doble clic sobre `index.html`.

1. Abre una terminal en la carpeta del proyecto (la que contiene `index.html`).
2. Ejecuta:

   ```bash
   python3 -m http.server 8000
   ```

   En Windows, si `python3` no funciona, usa `python -m http.server 8000` o `py -m http.server 8000`.
3. Abre `http://localhost:8000` en el navegador.
4. Para detener el servidor, presiona `Ctrl + C` en la terminal.

Necesitas conexión a internet para el mapa base y la tipografía Inter. Leaflet va incluido en `vendor/`.

### Por qué no con doble clic

El mapa base usa los tiles oficiales de OpenStreetMap. Su política de uso exige que cada petición indique desde qué sitio se hace (cabecera `Referer`). Con `file://` el navegador no la manda y OpenStreetMap bloquea los tiles con el mensaje "app is not following the tile usage policy". Con `http://localhost` sí se manda y el mapa carga. Si abres el archivo directo, la página muestra un aviso con estos pasos.

### Si el mapa sale en gris o bloqueado

- Recarga sin caché con `Ctrl + Shift + R`.
- Confirma que la dirección empieza con `http://localhost`.
- Desactiva extensiones que borran la cabecera de referencia (algunos bloqueadores de rastreo).
- Los tiles de OpenStreetMap son un servicio de voluntarios. Sirven para desarrollo y demostraciones con poco tráfico. Para publicar la herramienta con uso real, cambia `TILES` y `TILES_ATTR` en `js/views/mapa.js` por un proveedor de mapas con llave (por ejemplo MapTiler o Stadia Maps) o por un servidor de tiles propio. La política vigente está en https://operations.osmfoundation.org/policies/tiles/

## Secciones

1. **Mapa de parcelas**: 197 parcelas con color por rendimiento (verde claro = bajo, oscuro = alto), borde punteado para las predichas, filtros, KPIs, tabla ordenable y exportación a CSV. También puede colorearse por riesgo crediticio.
2. **Ficha de parcela**: predicción con intervalo, curva de índices satelitales (NDVI, EVI, LAI, NDDI, NDWI; Sentinel-2 o Planet), clima mensual, cascada tipo SHAP y 5 parcelas vecinas.
3. **Desempeño del modelo**: métricas de validación cruzada anidada, comparación de modelos, dispersión, residuales, importancia por familia, robustez espacial y metodología.
4. **Hallazgos clave**: tres tarjetas narrativas con mini gráfica.
5. **Simulador y riesgo crediticio**: escenarios de lluvia de mayo y temperatura mínima de abril, con aviso de rango, y semáforo de riesgo con precio y costo editables.

## Estructura

```
index.html          Estructura, navegación y carga de scripts
css/styles.css      Estilos, modo claro y oscuro, responsive
js/data.js          Capa de datos (único lugar con datos simulados)
js/ui.js            Iconos, formato, tooltip, estado compartido, reglas de riesgo
js/charts.js        Gráficas en SVG y HTML sin librerías
js/views/*.js       Una vista por sección
js/app.js           Arranque, rutas (#/mapa, #/parcela/ID, ...) y tema
vendor/leaflet/     Leaflet 1.9.4
```

## Conectar una API real

Todo el dashboard pide sus datos solo a través de `CebaApi` (`js/data.js`). Para usar un servidor propio:

```js
CebaApi.configurar({ baseUrl: "https://mi-servidor" });
```

Endpoints esperados:

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/parcelas` | lista de parcelas |
| GET | `/api/parcelas/:id` | `{ parcela, serie, clima, shap, shap_otras, base, vecinos }` |
| GET | `/api/modelo/metricas` | métricas, modelos, dispersión, residuales, importancias, robustez y hallazgos |
| POST | `/api/simulador` | recibe `{ id, delta_lluvia_mayo_pct, delta_tmin_abril_c }` |

Los campos de cada parcela, serie, clima y shap son los de la especificación del proyecto. `data.js` documenta además los campos extra que se usan (por ejemplo `unidad` en `shap`, o `fuera_de_rango` en el simulador).

## Reglas de riesgo

Equilibrio = costo por hectárea / precio por tonelada.

- **Riesgo bajo**: el límite inferior del intervalo es mayor o igual al equilibrio.
- **Riesgo medio**: la predicción supera el equilibrio, pero el límite inferior no.
- **Riesgo alto**: la predicción queda por debajo del equilibrio.

Herramienta de apoyo; no sustituye la evaluación crediticia.

## Accesibilidad

Ni el riesgo ni el conjunto se comunican solo con color: siempre hay icono, forma o etiqueta. Las gráficas tienen tooltip, leyenda visible y, cuando hay muchos puntos, una tabla alternativa. El mapa se complementa con la tabla, que se recorre con teclado.

## Pipeline y modelos

La carpeta `pipeline/` trae el pipeline de datos y el modelo (LightGBM, Random Forest y Elastic Net con ensamble) que genera las predicciones de las 59 parcelas. El paso a paso para correrlo está en [`pipeline/README.md`](pipeline/README.md). Resumen:

```bash
cd pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python correr_pipeline.py
```

Necesita la carpeta `DATASET_RETO_AGRO_2026/` en la raíz del repo. Las salidas quedan en `pipeline/salidas/`. El dashboard todavía muestra datos simulados y no lee esas salidas.
