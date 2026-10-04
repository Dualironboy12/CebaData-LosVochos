# Fuente: SoilGrids 2.0 (ISRIC)

| Campo | Valor |
| --- | --- |
| Producto | SoilGrids 2.0 — propiedades del suelo globales a 250 m |
| Institución | ISRIC — World Soil Information |
| Acceso | WCS público <https://maps.isric.org> (sin llave) |
| Librería de descarga | [`soilgrids`](https://github.com/gantian127/soilgrids) 0.1.5 (MIT) |
| Licencia de datos | CC BY 4.0 |
| Cita | Poggio, L., et al. (2021). SoilGrids 2.0. SOIL, 7, 217–240. <https://doi.org/10.5194/soil-7-217-2021> |
| Datos locales | `DATASETS_EXTERNOS/soilgrids/datos/*.tif` (336 capas, ~11 MB) |
| Manifiesto | `datos/manifiesto_descarga.json` |
| Catálogo | [`CAPAS.md`](CAPAS.md) |

## CRS y recorte

CRS nativo Homolosine (`EPSG:152160`), 250 m. Recorte al bbox de las 197 parcelas del reto más 1.5 km de margen. Valores enteros de 16 bits; sin dato = −32768. Factores de conversión en el manifiesto y en `CAPAS.md`.

## Cómo regenerar

```bash
bash DATASETS_EXTERNOS/soilgrids/preparar_entorno.sh
env -i HOME=$HOME PATH=/usr/bin:/bin \
  DATASETS_EXTERNOS/soilgrids/.venv/bin/python \
  DATASETS_EXTERNOS/soilgrids/descargar_capas.py
```

El análisis (zonal, KDD) está en `analisis/datos_soilgrids/`.
