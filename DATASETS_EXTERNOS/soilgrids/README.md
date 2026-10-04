# SoilGrids (ISRIC)

Entorno de Python y scripts para consultar y descargar propiedades del suelo de [SoilGrids](https://www.isric.org/explore/soilgrids) con la librería [`soilgrids`](https://github.com/gantian127/soilgrids). Es **adquisición de datos externos**: el análisis (estadística zonal, relaciones, mapas) sigue haciéndose en R, en `analisis/`.

Estado: exploración. Qué hay y qué se propone integrar: [`DISPONIBLES_TEMPORAL.md`](DISPONIBLES_TEMPORAL.md).

## Preparar el entorno

Requiere Python 3.10 o superior y acceso a internet. Desde la raíz del repo:

```bash
bash DATASETS_EXTERNOS/soilgrids/preparar_entorno.sh
source DATASETS_EXTERNOS/soilgrids/.venv/bin/activate     # Linux / macOS
```

El script crea `.venv/` junto a él (no se versiona) e instala [`requirements.txt`](requirements.txt), con versiones fijadas. En Debian/Ubuntu sin el paquete `python3-venv` (falta `ensurepip`) lo detecta, crea el entorno sin pip y arranca pip con `get-pip.py`; la alternativa es `sudo apt install python3-venv`. Se puede cambiar el intérprete con `PYTHON=python3.12` o el destino con `CEBA_VENV=/ruta`.

En Windows, crear el entorno a mano: `py -m venv .venv`, activarlo con `.venv\Scripts\activate` y `pip install -r requirements.txt`.

Si se lanza Python desde un terminal de Cursor instalado como AppImage y el entorno no encuentra los paquetes (`ModuleNotFoundError`), ejecutar con el entorno limpio: `env -i HOME=$HOME PATH=/usr/bin:/bin .venv/bin/python script.py`.

## Descargar las 336 capas

```bash
env -i HOME=$HOME PATH=/usr/bin:/bin \
  DATASETS_EXTERNOS/soilgrids/.venv/bin/python \
  DATASETS_EXTERNOS/soilgrids/descargar_capas.py
```

Salida: `datos/*.tif` + manifiesto. Catálogo: [`CAPAS.md`](CAPAS.md). Fuente: [`fuentes_soilgrids.md`](fuentes_soilgrids.md).

## Explorar y probar

```bash
python DATASETS_EXTERNOS/soilgrids/explorar_disponibles.py
```

Lista los servicios y capas, y descarga dos capas de prueba sobre la caja de las 197 parcelas. Escribe en `temporal/` (no se versiona).

## Uso mínimo de la librería

```python
from soilgrids import SoilGrids

sg = SoilGrids()
datos = sg.get_coverage_data(
    service_id="clay", coverage_id="clay_0-5cm_mean",
    crs="urn:ogc:def:crs:EPSG::152160",          # Homolosine, 250 m
    west=-10987806, south=2172101, east=-10942053, north=2225737,   # metros en esa proyección
    output="clay_0-5cm_mean.tif",
)
```

La caja debe darse en la proyección elegida. Los valores se descargan como enteros escalados; las equivalencias están en el documento de capas disponibles.

## Reglas

- `.venv/`, `temporal/` y los datos crudos de gran tamaño no se versionan. Se versionan los scripts, la documentación y, cuando se decida, los GeoTIFF recortados a las parcelas (decenas de KB cada uno).
- Citar a ISRIC al usar los datos (ver el documento de capas disponibles).
- Sin imputar ni alterar la despensa del reto. Las columnas de suelo irán a la despensa extendida, como la edafología de INEGI.
