# Dataset de entrenamiento

Aquí vive la **despensa congelada** y los **datasets curados** listos para entrenar: primero solo con datos del reto, después la extensión con datos externos (p. ej. INEGI), más la documentación de fuentes.

No sustituye el dataset oficial de FIRA. Los archivos crudos siguen en [`../DATASET_RETO_AGRO_2026/`](../DATASET_RETO_AGRO_2026/) y no se modifican. Esta carpeta guarda **productos derivados** versionados para la fase de modelos.

Reglas globales: [`../AGENTS.md`](../AGENTS.md). Reglas de esta carpeta: [`AGENTS.md`](AGENTS.md). Análisis y decisiones: [`../analisis/`](../analisis/) · [`../analisis/PROXIMOS_PASOS.md`](../analisis/PROXIMOS_PASOS.md) · [`../analisis/RESUMEN_DE_ANALISIS.md`](../analisis/RESUMEN_DE_ANALISIS.md).

## Qué va aquí

| Pieza | Descripción |
| --- | --- |
| Despensa congelada | Tabla base por parcela (evolución de `analisis/salida/parcelas_trabajo.csv` cuando se congele con los criterios acordados, p. ej. `NUBE_MAX = 30`). |
| Datasets curados (reto) | CSVs reducidas / variantes de la matriz (ubicación × ventana temporal) solo con datos entregados. |
| Despensa / datasets extendidos | Misma unidad (una fila por parcela) más columnas o tablas derivadas de fuentes externas alineadas a `ID_POLIGONO` / geometría. |
| Fuentes | Notas de origen, licencia/uso, fecha de descarga, CRS, join y columnas aportadas. |
| Manifiestos | Qué columnas tiene cada CSV, umbral de nube, periodo, filosofía de ubicación, versión. |

## Qué no va aquí

- Código de entrenamiento (`modelos/`).
- Dashboard (`dashboard/`).
- Rásteres o descargas enormes sin criterio: preferir scripts de obtención + `.gitignore` si los binarios no deben ir al repo; documentar cómo reproducir la descarga.

## Estructura sugerida (se irá llenando)

```text
dataset_entrenamiento/
  README.md                 ← este archivo
  despensa/                 ← despensa congelada (reto)
  curados_reto/             ← CSVs solo con datos del reto
  curados_extendidos/       ← CSVs / despensa ampliada con externos
  fuentes/                  ← documentación de fuentes externas
  manifiestos/              ← versiones y columnas por dataset
```

Las carpetas internas se crean cuando haya contenido real; no hace falta inventar archivos vacíos.

## Flujo de Git en este track

Tres ramas: una **principal del dataset** (aloja la despensa congelada y lo ya integrado) y **dos subramas** que la alimentan. Primero merge de las subramas hacia la principal del dataset; después merge de esa principal hacia `main` del repositorio.

| Rol | Rama | Contenido típico |
| --- | --- | --- |
| Principal del dataset | dev-dataset | Despensa congelada + datasets ya aceptados para uso del equipo |
| Subrama: solo datos del reto | predev-dataset | Curados / variantes sin externos |
| Subrama: dataset extendido | predev-dataset-extendido | Extensión de despensa + curados con externos + docs de fuentes |

```text
main
 └── dev-dataset
       ├── predev-dataset      →  merge → principal dataset
       └── predev-dataset-extendido      →  merge → principal dataset
             →  luego PR de dev-dataset → main
```

**Ramas de este track (rellenar cuando existan):**

```text
Principal (despensa / integración):   ________________________________
Subrama solo datos del reto:          ________________________________
Subrama dataset extendido:            ________________________________
```

## Criterios ya acordados (recordatorio)

Ver detalle en `analisis/PROXIMOS_PASOS.md`:

- Despensa + CSVs derivadas (no tirar la tabla rica).
- Tres filosofías de ubicación: ninguna / parcial / completa.
- Dos ventanas temporales: solo 2025 vs todos los ciclos.
- Umbral de nube de producción: **30** (la despensa del análisis KDD se generó con 0; regenerar antes de congelar).
- Una fila = una parcela; rendimiento vacío en `PREDICCION`.
- Sensores separados (Sentinel-2, Landsat, Planet no se funden).

## Estado

- [ ] Tres ramas creadas y nombres anotados arriba.
- [ ] Despensa regenerada/congelada (nube 30) en `despensa/`.
- [ ] Primeras CSVs curadas solo-reto en `curados_reto/`.
- [ ] Inventario y alineación de fuentes externas en `fuentes/`.
- [ ] Primera extensión documentada en `curados_extendidos/`.

## Convenciones

- Versionar nombres claros (`parcelas_solo2025_sin_ubic_v1.csv`, etc.) y un manifiesto por archivo.
- No sobrescribir en silencio un CSV ya citado por un experimento en `modelos/`; subir versión (`v2`).
- Commits y push solo con autorización del equipo.
- Leer [`AGENTS.md`](AGENTS.md) y [`../AGENTS.md`](../AGENTS.md) al empezar.
- Sesiones de agente: [`../PROMPTS.md`](../PROMPTS.md).
