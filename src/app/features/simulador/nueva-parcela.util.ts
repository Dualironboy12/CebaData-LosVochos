import { CampoClima, ClimaDado, OpcionesNuevaParcela, PeticionNuevaParcela } from '../../core/models';

export interface FormularioNuevaParcela {
  municipio: string;
  lat: string;
  lon: string;
  area_ha: string;
  /** clave "campo_mes" (por ejemplo "prec_mm_5"); vacío = que el modelo lo imputa */
  clima: Record<string, string>;
}

export type ResultadoValidacion = { ok: true; peticion: PeticionNuevaParcela } | { ok: false; errores: Record<string, string> };

const CAMPOS: CampoClima[] = ['prec_mm', 'tmax_c', 'tmin_c'];

function numero(txt: string): number {
  const t = txt.trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
}

/** Valida en el navegador lo mismo que valida la API, para dar el error junto al campo. */
export function armarPeticion(f: FormularioNuevaParcela, op: OpcionesNuevaParcela | undefined): ResultadoValidacion {
  const errores: Record<string, string> = {};
  const lat = numero(f.lat), lon = numero(f.lon), area = numero(f.area_ha);
  if (!f.municipio.trim()) errores['municipio'] = 'Escribe o elige el municipio.';
  if (!isFinite(lat) || lat < -90 || lat > 90) errores['lat'] = 'Escribe una latitud entre -90 y 90 (por ejemplo 19.88).';
  if (!isFinite(lon) || lon < -180 || lon > 180) errores['lon'] = 'Escribe una longitud entre -180 y 180 (por ejemplo -98.35).';
  const [amin, amax] = op?.limites.area_ha ?? [0.1, 500];
  if (!isFinite(area) || area < amin || area > amax) errores['area_ha'] = `Escribe un área entre ${amin} y ${amax} ha.`;

  const clima: ClimaDado = {};
  const limites: Record<CampoClima, [number, number]> = { prec_mm: [0, 1000], tmax_c: [-10, 50], tmin_c: [-20, 40] };
  for (const campo of CAMPOS) {
    for (const mes of op?.clima[campo] ?? []) {
      const clave = `${campo}_${mes}`;
      const txt = f.clima[clave] ?? '';
      if (txt.trim() === '') continue;
      const v = numero(txt);
      const [lo, hi] = limites[campo];
      if (!isFinite(v) || v < lo || v > hi) {
        errores[clave] = `Debe estar entre ${lo} y ${hi}.`;
        continue;
      }
      (clima[campo] ??= {})[String(mes)] = v;
    }
  }
  if (Object.keys(errores).length) return { ok: false, errores };
  return { ok: true, peticion: { lat, lon, municipio: f.municipio.trim(), area_ha: area, ...(Object.keys(clima).length ? { clima } : {}) } };
}
