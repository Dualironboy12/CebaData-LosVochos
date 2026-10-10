"""Corre el pipeline completo del Reto AgroCebada en orden.

Uso:
    python correr_pipeline.py

Requisitos: ver requirements.txt. La ruta al dataset se ajusta en src/config.py.
"""
import subprocess
import sys
import time
from pathlib import Path

SRC = Path(__file__).parent / "src"
PASOS = [
    "paso01_parcelas.py",
    "paso02_satelital.py",
    "paso03_clima_topografia.py",
    "paso04_validaciones.py",
    "paso05_features.py",
    "paso06_baselines.py",
    "paso07_optimizacion.py",
    "paso08_interpretacion.py",
]
# paso05b_soilgrids.py es opcional (requiere internet) y se corre aparte, una vez.

if __name__ == "__main__":
    inicio = time.time()
    for paso in PASOS:
        print(f"\n=== {paso} " + "=" * (40 - len(paso)))
        resultado = subprocess.run([sys.executable, paso], cwd=SRC)
        if resultado.returncode != 0:
            print(f"\nEl paso {paso} fallo. Se detiene el pipeline.")
            sys.exit(1)
    print(f"\nPipeline completo en {time.time() - inicio:.0f} s. Salidas en pipeline/salidas/")
