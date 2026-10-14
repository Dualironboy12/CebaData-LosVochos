# CebaData Dashboard

Dashboard web en español, hecho en Angular, para consultar el modelo que predice el rendimiento de cebada (t/ha) en 197 parcelas del altiplano de Hidalgo, Puebla y Tlaxcala, ciclo abril a octubre de 2025.

Los datos los sirve [cebadata_api](https://github.com/ALNM7/cebadata_api) (API de Django que carga los artefactos congelados del modelo). Este repo es solo el front.

El modelo es uno solo: la **mezcla** del ensamble (LightGBM, Random Forest y Elastic Net) con un LightGBM de solo longitud. La comparación con los otros dos enfoques vive únicamente en el panel de metodología de "Desempeño del modelo".

## Cómo ejecutarlo

Necesitas Node 20.19 o mayor (o 22.12 o mayor) y npm.

```bash
npm install
```

### Con la API real

1. Levanta la API (ver el README de `cebadata_api`): `pip install -r requirements.txt` y `python manage.py runserver` en el puerto 8000. No necesita el pipeline.
2. En este repo:

   ```bash
   npm start            # http://localhost:4200
   ```

`ng serve` manda las peticiones a `/api` al puerto 8000 con `proxy.conf.json`. Si la API está en otro lado, cambia el `target` de ese archivo, o pon la dirección completa en `apiUrl` de `src/environments/environment.ts` (y agrega el origen del front en `CORS_ALLOWED_ORIGINS` de la API).

### Modo demostración (sin servidor)

```bash
npm run start:demo   # datos simulados en el navegador, siempre los mismos
```

Sirve para revisar el diseño sin tener la API. Muestra la etiqueta "Datos de demostración". Para publicar una versión así: `npm run build:demo`.

### Otros comandos

```bash
npm run build        # compilación de producción en dist/
npm test             # pruebas (Vitest)
```

Necesitas conexión a internet para el mapa base (OpenStreetMap) y la tipografía Inter. Leaflet viene de npm. El archivo `.npmrc` activa `legacy-peer-deps` porque npm 10 falla al resolver los peers de Vitest.

### Si el mapa sale en gris o bloqueado

- Recarga sin caché con `Ctrl + Shift + R`.
- Abre la app desde `http://localhost` y no con `file://`: OpenStreetMap exige la cabecera `Referer`.
- Desactiva extensiones que borran esa cabecera.
- Los tiles de OpenStreetMap son un servicio de voluntarios y sirven para desarrollo y demostraciones con poco tráfico. Para uso real cambia `TILES` y `TILES_ATTR` en `src/app/features/mapa/mapa-page.ts` por un proveedor con llave (MapTiler, Stadia Maps) o un servidor propio. Política vigente: https://operations.osmfoundation.org/policies/tiles/

## Secciones

1. **Mapa de parcelas**: 197 parcelas con color por rendimiento (verde claro = bajo, oscuro = alto), borde punteado para las predichas, filtros, KPIs, tabla ordenable y exportación a CSV. También puede colorearse por riesgo crediticio.
2. **Ficha de parcela**: predicción con intervalo, curva de índices satelitales (NDVI, EVI, LAI, NDDI, NDWI; Sentinel-2 o Planet), clima mensual, cascada tipo SHAP y 5 parcelas vecinas.
3. **Desempeño del modelo**: métricas de la mezcla donde se califica (validación anidada estratificada por municipio) y en una zona nueva (un municipio fuera, LOMO), error contra sus referencias, importancia por familia, dispersión, residuales, robustez espacial y metodología. Dentro de la metodología, un párrafo y una tabla estática justifican por qué se eligió la mezcla.
4. **Hallazgos clave**: tres tarjetas narrativas con gráficas. El texto se arma con los números que devuelve la API.
5. **Simulador y riesgo crediticio**: dos modos. "Parcela existente" simula escenarios de lluvia de mayo y temperatura mínima de abril con el modelo real, aviso de rango (con la nota de que con la mezcla solo la parte del ensamble reacciona al clima y de que la lluvia de mayo puede actuar como indicador de zona), y semáforo de riesgo con precio y costo editables. "Nueva parcela" estima una parcela que no está en los datos a partir de ubicación, municipio, área y clima opcional: muestra la predicción con su intervalo, las parcelas vecinas usadas, cuántas de las 121 variables se imputaron (con la lista completa y su origen) y los avisos cuando la ubicación queda lejos o fuera de las zonas de entrenamiento.

## Estructura

```
src/
  index.html, main.ts, styles.css      arranque y estilos globales (modo claro y oscuro, responsive)
  environments/                        environment.ts (API) y environment.demo.ts (datos simulados)
  app/
    app.ts, app.html, app.routes.ts    shell, navegación y rutas con # (#/mapa, #/parcela/AGC_003)
    core/
      api/ceba-api.ts                  único lugar que habla con la API (HttpCebaApi y DemoCebaApi)
      demo/demo-data.ts                generador de datos simulados
      models.ts                        tipos de la API
      state.ts                         estado compartido: filtros, supuestos de riesgo, parcela elegida
      tooltip.ts, theme.ts, ...        tooltip, tema claro y oscuro, formato, colores, reglas de riesgo
    shared/                            iconos, estados vacíos y de error, y las gráficas en SVG sin librerías
    features/                          una página por sección (mapa, parcela, modelo, hallazgos, simulador)
```

Usa componentes standalone, signals, `resource` para cargar datos y rutas con carga diferida.

## Endpoints que consume

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/api/parcelas` | lista de parcelas |
| GET | `/api/parcelas/:id` | `{ parcela, serie, clima, shap, shap_otras, base, vecinos }` |
| GET | `/api/modelo/metricas` | métricas de la mezcla (estratificada y LOMO), dispersión, residuales, importancias, robustez, hallazgos y la tabla de comparación para la metodología |
| POST | `/api/simulador` | recibe `{ id, delta_lluvia_mayo_pct, delta_tmin_abril_c }` |
| GET | `/api/nueva-parcela/opciones` | municipios conocidos, meses de clima que usa el modelo y rangos |
| POST | `/api/predecir` | recibe `{ lat, lon, municipio, area_ha, clima? }` |

Los tipos están en `src/app/core/models.ts`. Si la API no tiene cargadas las curvas satelitales, la ficha muestra "Sin observaciones" en esa gráfica.

## Reglas de riesgo

Equilibrio = costo por hectárea / precio por tonelada.

- **Riesgo bajo**: el límite inferior del intervalo es mayor o igual al equilibrio.
- **Riesgo medio**: la predicción supera el equilibrio, pero el límite inferior no.
- **Riesgo alto**: la predicción queda por debajo del equilibrio.

Herramienta de apoyo; no sustituye la evaluación crediticia.

## Accesibilidad

Ni el riesgo ni el conjunto se comunican solo con color: siempre hay icono, forma o etiqueta. Las gráficas tienen tooltip (también con teclado) y leyenda visible, y el diagrama de dispersión trae una tabla alternativa. El mapa se complementa con la tabla, que se recorre con teclado.

## Pipeline y modelos

Ya no viven aquí. Están en [cebadata_api](https://github.com/ALNM7/cebadata_api): `pipeline/` (solo para reproducir el reporte y regenerar artefactos) y la API, que solo carga los artefactos congelados.
