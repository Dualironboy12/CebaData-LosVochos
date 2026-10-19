# Propuesta de cambios para los repos de ALNM7

No se aplican en este repositorio. Los submódulos quedan en los commits publicados (`cebadata_api` `9d64758`, `DashboardCebaData` `aa766ad`). Si Alfredo los integra, aquí solo se actualiza el puntero del submódulo.

El reporte técnico de este repo sigue usando **121** variables para la mezcla. El artefacto publicado todavía dice 122 en el campo de la mezcla.

## 1. `n_variables` de la mezcla: 121, no 122

En `cebadata_api/pipeline/pasos/paso07_optimizacion.py` la mezcla cuenta `len(cols) + 1`. `lon` ya está dentro de `cols`, así que se cuenta dos veces. El ensamble y la mezcla usan las mismas 121 columnas.

```python
# hoy
n_vars = {"ensamble": len(cols), "ubicacion": 1, "mezcla": len(cols) + 1}

# propuesta
# La mezcla reusa las mismas columnas del ensamble (lon ya está en cols).
n_vars = {"ensamble": len(cols), "ubicacion": 1, "mezcla": len(cols)}
```

Después, reexportar solo el paso 10 para que `artefactos/metricas_dashboard.json` deje de decir `"n_variables": 122` en el modelo de entrega y en la fila de la mezcla. El resto de las predicciones no debería moverse. En el README de la API, la tabla de candidatos dice 122 en la fila de la mezcla; pasa a 121.

## 2. Texto de SHAP en la ficha

En `DashboardCebaData/src/app/features/parcela/parcela-page.html`, el texto publicado atribuye la cascada a «la parte del ensamble». SHAP solo cubre el LightGBM de ese ensamble, que pesa 1/6 de la mezcla.

Texto propuesto:

> La cascada explica el LightGBM del ensamble (peso 1/6 de la mezcla), no la mezcla completa. Lo que aporta el resto del ensamble y el modelo de ubicación (peso 1/2) queda en «Otras variables».

Conviene la misma aclaración en el panel de desempeño del modelo, si ese texto todavía habla de la mezcla completa.

## 3. Python 3.12 o superior

`.python-version` de la API fija 3.13. El entorno del equipo y las 38 pruebas corren en 3.12. Propuesta: dejar 3.12 en `.python-version` y decir en el README «Python 3.12 o superior». No cambia los artefactos.
