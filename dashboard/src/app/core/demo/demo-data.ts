/* ============================================================
   Datos de demostración
   ------------------------------------------------------------
   Generador de datos simulados (semilla fija, siempre iguales)
   que sigue la misma estructura que sirve cebadata_api. Solo se
   usa con la configuración `demo` (npm run start:demo); con la
   configuración normal el dashboard pide todo a la API.
   ============================================================ */
import {
  ClimaMes,
  DetalleParcela,
  FueraDeRango,
  IndiceId,
  ItemShap,
  Metricas,
  OpcionesNuevaParcela,
  Parcela,
  PeticionNuevaParcela,
  PeticionSimulador,
  PuntoSerie,
  RangoEntrenamiento,
  RespuestaNuevaParcela,
  RespuestaSimulador,
  VariableImputada,
  Vecino,
} from '../models';

/* ---------- utilidades ---------- */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (rnd: () => number) => {
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const laplace = (rnd: () => number) => {
  const u = rnd() - 0.5;
  return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
};
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const round = (x: number, d: number) => {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
};
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) * (x - m))));
};
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Error con código HTTP, igual que el de la API real. */
export class ErrorDemo extends Error {
  constructor(mensaje: string, readonly status = 400) {
    super(mensaje);
  }
}

/* ---------- escenario ---------- */
interface MunicipioDemo {
  nombre: string;
  estado: string;
  centro: [number, number];
  radio: number;
  n: number;
  base: number;
  ajuste: number;
  elev: number;
  err: number;
}
const MUNICIPIOS: MunicipioDemo[] = [
  { nombre: 'Calpulalpan', estado: 'Tlaxcala', centro: [19.585, -98.56], radio: 0.075, n: 48, base: 3.0, ajuste: 0.0, elev: 2560, err: 0.9 },
  { nombre: 'Chignahuapan', estado: 'Puebla', centro: [19.86, -98.26], radio: 0.08, n: 44, base: 4.5, ajuste: 0.0, elev: 2520, err: 1.15 },
  { nombre: 'Singuilucan', estado: 'Hidalgo', centro: [19.97, -98.44], radio: 0.06, n: 38, base: 3.8, ajuste: -0.3, elev: 2610, err: 1.35 },
  { nombre: 'Emiliano Zapata', estado: 'Hidalgo', centro: [19.905, -98.35], radio: 0.05, n: 25, base: 3.8, ajuste: 0.1, elev: 2590, err: 0.95 },
  { nombre: 'Cuautepec', estado: 'Hidalgo', centro: [19.99, -98.325], radio: 0.04, n: 24, base: 3.8, ajuste: 0.15, elev: 2490, err: 0.75 },
  { nombre: 'Almoloya', estado: 'Hidalgo', centro: [19.885, -98.47], radio: 0.04, n: 18, base: 3.8, ajuste: 0.0, elev: 2640, err: 0.85 },
];
const N_PREDICCION = 59;
const MEDIA_OBS = 3.96;
const SD_OBS = 0.846;
const MEDIA_PRED = 3.93;
const RMSE_CV = 0.508;
const MAE_CV = 0.362;

const CLIMA_BASE = {
  prec: [38, 105, 150, 196, 206, 170, 62],
  tmax: [24.1, 24.3, 23.8, 23.0, 23.2, 23.1, 23.0],
  tmin: [11.3, 12.9, 13.3, 12.9, 13.1, 12.6, 11.5],
};
const INDICES: IndiceId[] = ['ndvi', 'evi', 'lai', 'nddi', 'ndwi'];

interface Cruda {
  mi: number;
  estado: string;
  municipio: string;
  lat: number;
  lon: number;
  area_ha: number;
  elevacion_m: number;
  pendiente_grados: number;
  z: number;
}

export class DatosDemo {
  readonly parcelas: Parcela[];
  readonly rango: RangoEntrenamiento;
  private readonly clima = new Map<string, ClimaMes[]>();
  private readonly zRend = new Map<string, number>();
  private readonly entren: Parcela[];
  private metricasCache: Metricas | null = null;

  constructor() {
    const rnd = mulberry32(20250407);
    const crudas: Cruda[] = [];
    MUNICIPIOS.forEach((m, mi) => {
      for (let i = 0; i < m.n; i++) {
        const ang = rnd() * 2 * Math.PI;
        const rad = m.radio * Math.sqrt(rnd());
        const lat = m.centro[0] + rad * Math.sin(ang) * 0.9;
        const lon = m.centro[1] + rad * Math.cos(ang);
        const elev = Math.round(m.elev + gauss(rnd) * 75 + (lat - m.centro[0]) * 400);
        crudas.push({
          mi, estado: m.estado, municipio: m.nombre,
          lat: round(lat, 5), lon: round(lon, 5),
          area_ha: round(clamp(Math.exp(Math.log(3.4) + gauss(rnd) * 0.55), 0.6, 14), 1),
          elevacion_m: elev,
          pendiente_grados: round(clamp(Math.abs(gauss(rnd)) * 3.2 + 0.4, 0.3, 11), 1),
          z: gauss(rnd),
        });
      }
    });
    /* mezcla determinista para que los ID no sigan el orden por municipio */
    for (let s = crudas.length - 1; s > 0; s--) {
      const j = Math.floor(rnd() * (s + 1));
      [crudas[s], crudas[j]] = [crudas[j], crudas[s]];
    }
    /* AGC_003 (ejemplo de la ficha) cae en Chignahuapan */
    const k = crudas.findIndex((p) => p.municipio === 'Chignahuapan');
    [crudas[2], crudas[k]] = [crudas[k], crudas[2]];

    /* conjunto: 59 de prediccion repartidas por municipio */
    const idxs = crudas.map((_, i) => i).filter((i) => i !== 2);
    for (let q = idxs.length - 1; q > 0; q--) {
      const w = Math.floor(rnd() * (q + 1));
      [idxs[q], idxs[w]] = [idxs[w], idxs[q]];
    }
    const esPred = new Set<number>([2]);
    idxs.slice(0, N_PREDICCION - 1).forEach((i) => esPred.add(i));

    /* rendimiento latente (verdad) con media y desviacion exactas en el conjunto observado */
    const yRaw = crudas.map((p) => {
      const m = MUNICIPIOS[p.mi];
      return m.base + m.ajuste + 0.0011 * (p.elevacion_m - m.elev) * -1 + p.z * 0.62;
    });
    const obsIdx = crudas.map((_, i) => i).filter((i) => !esPred.has(i));
    let y = yRaw.slice();
    for (let it = 0; it < 40; it++) {
      const vals = obsIdx.map((i) => y[i]);
      const m0 = mean(vals);
      const s0 = sd(vals);
      y = y.map((v) => clamp(MEDIA_OBS + (v - m0) * (SD_OBS / s0), 2.0, 5.6));
    }

    /* residuales del modelo (validacion cruzada) con RMSE y MAE objetivo */
    const rndRes = mulberry32(101);
    let eBase = crudas.map((p) => laplace(rndRes) * MUNICIPIOS[p.mi].err);
    const residuales = (kk: number) => {
      let e = eBase.map((v) => Math.sign(v) * Math.pow(Math.abs(v), kk));
      const mu = mean(obsIdx.map((i) => e[i]));
      e = e.map((v) => v - mu);
      const rm = Math.sqrt(mean(obsIdx.map((i) => e[i] * e[i])));
      return e.map((v) => (v * RMSE_CV) / rm);
    };
    let lo = 0.5;
    let hi = 1.6;
    for (let i = 0; i < 40; i++) {
      const kk = (lo + hi) / 2;
      const e = residuales(kk);
      const mae = mean(obsIdx.map((ix) => Math.abs(e[ix])));
      if (mae > MAE_CV) lo = kk;
      else hi = kk;
    }
    eBase = residuales((lo + hi) / 2);

    const predRaw = crudas.map((_, i) => (esPred.has(i) ? y[i] + eBase[i] : y[i] - eBase[i]));
    /* media predicha de las 59 parcelas = 3.93 */
    const ids = [...esPred].filter((i) => i !== 2);
    const objetivo = MEDIA_PRED * N_PREDICCION - 4.12;
    const cur = ids.reduce((s2, i) => s2 + predRaw[i], 0);
    const delta = (objetivo - cur) / ids.length;
    ids.forEach((i) => (predRaw[i] += delta));
    predRaw[2] = 4.12;

    this.parcelas = crudas.map((p, i) => {
      const m = MUNICIPIOS[p.mi];
      const pred = esPred.has(i) ? clamp(round(predRaw[i], 2), 2.2, 5.6) : round(predRaw[i], 2);
      const hw = i === 2 ? 0.76 : clamp(0.76 * Math.pow(m.err / 1.05, 0.7) * (0.9 + rnd() * 0.2), 0.5, 1.25);
      return {
        id: 'AGC_' + ('00' + (i + 1)).slice(-3),
        estado: p.estado, municipio: p.municipio, area_ha: p.area_ha,
        conjunto: esPred.has(i) ? 'PREDICCION' : 'ENTRENAMIENTO',
        rendimiento_obs: esPred.has(i) ? null : round(y[i], 2),
        rendimiento_pred: pred,
        intervalo_inf: round(pred - hw, 2),
        intervalo_sup: round(pred + hw, 2),
        lat: p.lat, lon: p.lon, elevacion_m: p.elevacion_m, pendiente_grados: p.pendiente_grados,
      } as Parcela;
    });

    /* ajuste fino por redondeo: medias exactas a 2 decimales */
    const obs = this.parcelas.filter((p) => p.conjunto === 'ENTRENAMIENTO');
    const pre = this.parcelas.filter((p) => p.conjunto === 'PREDICCION');
    const dO = MEDIA_OBS * obs.length - obs.reduce((s2, p) => s2 + (p.rendimiento_obs ?? 0), 0);
    obs[0].rendimiento_obs = round((obs[0].rendimiento_obs ?? 0) + dO, 2);
    const pPre = pre.filter((p) => p.id !== 'AGC_003');
    const dP = MEDIA_PRED * pre.length - pre.reduce((s2, p) => s2 + p.rendimiento_pred, 0);
    const ult = pPre[pPre.length - 1];
    ult.rendimiento_pred = round(ult.rendimiento_pred + dP, 2);
    ult.intervalo_inf = round(ult.intervalo_inf + dP, 2);
    ult.intervalo_sup = round(ult.intervalo_sup + dP, 2);
    this.parcelas[2].intervalo_inf = 3.36;
    this.parcelas[2].intervalo_sup = 4.88;

    /* clima por parcela */
    this.parcelas.forEach((p, i) => {
      const r = mulberry32(900 + i * 7);
      const ref = p.rendimiento_obs != null ? p.rendimiento_obs : p.rendimiento_pred;
      const z = (ref - MEDIA_OBS) / SD_OBS;
      this.zRend.set(p.id, z);
      const lluviaZona = p.estado === 'Puebla' ? 12 : p.estado === 'Tlaxcala' ? -14 : 0;
      const ajusteT = (p.elevacion_m - 2580) * -0.0016;
      const meses: ClimaMes[] = [];
      for (let m = 0; m < 7; m++) {
        const prec = CLIMA_BASE.prec[m] + lluviaZona * (m === 1 ? 1.6 : 1) + (m === 1 ? 26 * z : 8 * z) + gauss(r) * (m === 1 ? 14 : 18);
        meses.push({
          mes: m + 4,
          prec_mm: Math.round(clamp(prec, 20, 250)),
          tmax_c: round(clamp(CLIMA_BASE.tmax[m] + ajusteT + gauss(r) * 0.25, 22.7, 24.6), 1),
          tmin_c: round(clamp(CLIMA_BASE.tmin[m] + ajusteT * 0.7 + (m === 0 ? -0.25 * z : 0) + gauss(r) * 0.22, 10.9, 13.6), 1),
        });
      }
      this.clima.set(p.id, meses);
    });

    this.entren = this.parcelas.filter((p) => p.conjunto === 'ENTRENAMIENTO');
    const lluvias = this.entren.map((p) => this.clima.get(p.id)![1].prec_mm);
    const tmins = this.entren.map((p) => this.clima.get(p.id)![0].tmin_c);
    this.rango = {
      lluvia_mayo: { min: Math.min(...lluvias), max: Math.max(...lluvias) },
      tmin_abril: { min: Math.min(...tmins), max: Math.max(...tmins) },
    };
  }

  /* ---------- API simulada ---------- */
  listaParcelas(): Parcela[] {
    return structuredClone(this.parcelas);
  }

  detalle(id: string): DetalleParcela | null {
    const p = this.parcelas.find((q) => q.id === id);
    if (!p) return null;
    const sh = this.shap(p);
    return structuredClone({
      parcela: p, serie: this.serie(p), clima: this.clima.get(p.id)!,
      shap: sh.shap, shap_otras: sh.otras, base: MEDIA_OBS, vecinos: this.vecinos(p),
    });
  }

  metricas(): Metricas {
    if (!this.metricasCache) this.metricasCache = this.construirMetricas();
    return structuredClone(this.metricasCache);
  }

  simular(body: PeticionSimulador): RespuestaSimulador | null {
    const p = this.parcelas.find((q) => q.id === body.id);
    if (!p) return null;
    const dl = clamp(Number(body.delta_lluvia_mayo_pct) || 0, -40, 40);
    const dt = clamp(Number(body.delta_tmin_abril_c) || 0, -2, 2);
    const cl = this.clima.get(p.id)!;
    const lluviaBase = cl[1].prec_mm;
    const tminBase = cl[0].tmin_c;
    const lluviaEsc = round(lluviaBase * (1 + dl / 100), 0);
    const tminEsc = round(tminBase + dt, 1);
    const efectoLluvia = (x: number) => (x >= 0 ? 0.01 * x - 0.00008 * x * x : 0.01 * x - 0.00014 * x * x);
    const efectoTmin = (t: number) => 0.05 * t - 0.03 * t * t;
    const dif = efectoLluvia(dl) + efectoTmin(dt);
    const hwBase = (p.intervalo_sup - p.intervalo_inf) / 2;
    const hwEsc = hwBase * (1 + (0.18 * Math.abs(dl)) / 40 + (0.12 * Math.abs(dt)) / 2);
    const predEsc = clamp(p.rendimiento_pred + dif, 1.0, 6.5);
    const fuera: FueraDeRango[] = [];
    const R = this.rango;
    if (lluviaEsc < R.lluvia_mayo.min || lluviaEsc > R.lluvia_mayo.max) {
      fuera.push({ variable: 'lluvia_mayo', etiqueta: 'Lluvia de mayo', valor: lluviaEsc, min: R.lluvia_mayo.min, max: R.lluvia_mayo.max, unidad: 'mm' });
    }
    if (tminEsc < R.tmin_abril.min || tminEsc > R.tmin_abril.max) {
      fuera.push({ variable: 'tmin_abril', etiqueta: 'Temperatura mínima de abril', valor: tminEsc, min: R.tmin_abril.min, max: R.tmin_abril.max, unidad: '°C' });
    }
    return {
      id: p.id,
      base: { pred: p.rendimiento_pred, inf: p.intervalo_inf, sup: p.intervalo_sup },
      escenario: { pred: round(predEsc, 2), inf: round(predEsc - hwEsc, 2), sup: round(predEsc + hwEsc, 2) },
      diferencia: round(predEsc - p.rendimiento_pred, 2),
      diferencia_pct: round((predEsc / p.rendimiento_pred - 1) * 100, 1),
      entradas: { lluvia_mayo_base: lluviaBase, lluvia_mayo_escenario: lluviaEsc, tmin_abril_base: tminBase, tmin_abril_escenario: tminEsc },
      fuera_de_rango: fuera,
      rango_entrenamiento: structuredClone(R),
    };
  }

  opcionesNuevaParcela(): OpcionesNuevaParcela {
    const por = new Map<string, { municipio: string; estado: string; n: number }>();
    this.parcelas.forEach((p) => {
      const m = por.get(p.municipio) ?? { municipio: p.municipio, estado: p.estado, n: 0 };
      m.n++;
      por.set(p.municipio, m);
    });
    return {
      municipios: [...por.values()].sort((a, b) => a.municipio.localeCompare(b.municipio, 'es')),
      clima: { prec_mm: [4, 5, 6, 7, 8, 9, 10], tmax_c: [4, 5, 6, 8], tmin_c: [4, 6] },
      rangos: {
        lat: { min: 19.52, max: 19.98 }, lon: { min: -98.61, max: -98.2 }, area_ha: { min: 0.1, max: 500 },
        prec_mm: { min: 0, max: 400 }, tmax_c: { min: 22, max: 27 }, tmin_c: { min: 9, max: 14 },
      },
      limites: { area_ha: [0.1, 500] },
    };
  }

  /** Estimación simulada: promedio de las 3 parcelas más cercanas ponderado por 1/distancia^2. */
  predecir(c: PeticionNuevaParcela): RespuestaNuevaParcela {
    const num = (v: unknown, nombre: string, lo: number, hi: number) => {
      if (typeof v !== 'number' || !isFinite(v) || v < lo || v > hi) throw new ErrorDemo(`${nombre} debe ser un número entre ${lo} y ${hi}.`);
      return v;
    };
    const lat = num(c.lat, 'lat', -90, 90), lon = num(c.lon, 'lon', -180, 180), area = num(c.area_ha, 'area_ha', 0.1, 500);
    if (!c.municipio || !c.municipio.trim()) throw new ErrorDemo('municipio es obligatorio.');
    const conocida = this.parcelas.find((p) => p.municipio.toLowerCase() === c.municipio.trim().toLowerCase());
    const orden = this.parcelas.map((p) => ({ p, d: haversine(lat, lon, p.lat, p.lon) })).sort((a, b) => a.d - b.d);
    const vec = orden.slice(0, 3);
    const w = vec.map((v) => 1 / Math.max(v.d, 0.5) ** 2);
    const sw = w.reduce((s, x) => s + x, 0);
    const pred = vec.reduce((s, v, i) => s + v.p.rendimiento_pred * (w[i] / sw), 0);
    const dNn = orden[0].d;
    const sd = Math.sqrt(vec.reduce((s, v, i) => s + (w[i] / sw) * (v.p.rendimiento_pred - pred) ** 2, 0));
    const factor = 1 + 0.25 * Math.min(dNn / 5, 4);
    const semi = Math.sqrt(0.749 ** 2 + sd ** 2) * factor;
    const avisos: RespuestaNuevaParcela['avisos'] = [
      { codigo: 'estimacion_de_zona', nivel: 'info', mensaje: 'Es una estimación de zona: el modelo no conoce las imágenes de satélite ni la topografía de esta parcela, solo su ubicación, su área y el clima que le des. El resto se toma de parcelas conocidas cercanas.' },
    ];
    if (!conocida) avisos.push({ codigo: 'municipio_desconocido', nivel: 'alerta', mensaje: `El municipio «${c.municipio.trim()}» no tiene parcelas de entrenamiento: el modelo no tiene su efecto de zona.` });
    if (dNn > 15) avisos.push({ codigo: 'fuera_de_zona', nivel: 'alerta', mensaje: `La ubicación queda fuera de las zonas de entrenamiento (la parcela conocida más cercana está a ${dNn.toFixed(1)} km). Aquí la predicción no es confiable.` });
    else if (dNn > 5) avisos.push({ codigo: 'lejos_de_parcelas', nivel: 'aviso', mensaje: `La parcela conocida más cercana está a ${dNn.toFixed(1)} km: la estimación es menos confiable y el intervalo es más ancho.` });
    const base = vec[0].p;
    const muestra: [string, string, string, string, number][] = [
      ['elevacion_m', 'Elevación', 'Topografía', 'm', base.elevacion_m], ['pendiente_grados', 'Pendiente del terreno', 'Topografía', '°', base.pendiente_grados],
      ['ndvi_pico', 'NDVI máximo', 'Satélite', '', 0.57], ['ndvi_tasa_verdeo', 'Velocidad de verdeo NDVI', 'Satélite', 'por día', 0.0052],
      ['ndvi_tasa_senescencia', 'Velocidad de senescencia NDVI', 'Satélite', 'por día', -0.0041], ['lai_pico', 'LAI máximo', 'Satélite', '', 2.9],
      ['nddi_auc', 'Integral de NDDI', 'Satélite', '', 0.31], ['ndvi_auc_2024', 'NDVI acumulado 2024', 'Historia NDVI', '', 3.1],
    ];
    const imputadas: VariableImputada[] = muestra.map(([variable, etiqueta, grupo, unidad, valor]) => ({ variable, etiqueta, grupo, valor, unidad, origen: 'vecinos' }));
    const dados = c.clima ? Object.values(c.clima).reduce((s, m) => s + Object.keys(m ?? {}).length, 0) : 0;
    const clima: Record<string, number> = {};
    for (const [campo, meses] of Object.entries(c.clima ?? {})) for (const [m, v] of Object.entries(meses ?? {})) clima[`${campo}_m${m.padStart(2, '0')}`] = v;
    const grupos: Record<string, number> = {};
    imputadas.forEach((v) => (grupos[v.grupo] = (grupos[v.grupo] ?? 0) + 1));
    return {
      prediccion: { pred: round(pred, 2), inf: round(pred - semi, 2), sup: round(pred + semi, 2) },
      entradas: { lat, lon, area_ha: area, municipio: conocida?.municipio ?? c.municipio.trim(), estado: conocida?.estado ?? null, clima },
      intervalo: { semiancho: round(semi, 3), semiancho_base: 0.749, factor_distancia: round(factor, 2), dispersion_vecinos: round(sd, 3), nota: 'Regla práctica: el intervalo base de las demás parcelas, ensanchado por la distancia al vecino más cercano y por la dispersión entre vecinos. No está calibrado.' },
      imputacion: {
        metodo: 'vecinos_ponderados', n_variables: 15 + dados + imputadas.length, n_proporcionadas: 15 + dados, n_calculadas: 0, n_imputadas: imputadas.length,
        datos_usuario: ['Latitud', 'Longitud', 'Área', 'Municipio'], por_grupo: grupos,
        vecinos: vec.map((v, i) => ({ id: v.p.id, municipio: v.p.municipio, distancia_km: round(v.d, 2), peso: round(w[i] / sw, 3), rendimiento: v.p.rendimiento_pred })),
        variables_imputadas: imputadas,
      },
      avisos,
    };
  }

  /* ---------- piezas ---------- */
  private serie(p: Parcela): PuntoSerie[] {
    const idx = this.parcelas.indexOf(p);
    const r = mulberry32(5000 + idx * 13);
    const z = this.zRend.get(p.id)!;
    const vmax = clamp(0.56 + 0.06 * z + gauss(r) * 0.02, 0.4, 0.7);
    const t1 = 176 + gauss(r) * 5 - 4 * z;
    const s1 = 13 + r() * 3;
    const t2 = 291 + gauss(r) * 4 + 3 * z;
    const s2 = 10 + r() * 3;
    const vmin = 0.15 + gauss(r) * 0.008;
    const crudo = (t: number) => sigmoid((t - t1) / s1) - sigmoid((t - t2) / s2) + 0.1 * Math.exp(-Math.pow((t - 243) / 33, 2));
    let pico = 0;
    for (let t = 91; t <= 304; t++) pico = Math.max(pico, crudo(t));
    const ndviAt = (t: number) => vmin + ((vmax - vmin) * crudo(t)) / pico;
    const amp = vmax / 0.56;
    const ndwiAt = (t: number) => {
      const u = (ndviAt(t - 9) - vmin) / (vmax - vmin);
      return 0.045 + 0.255 * u * Math.min(amp, 1.2);
    };
    const f: Record<IndiceId, (t: number) => number> = {
      ndvi: ndviAt,
      evi: (t) => 0.085 + 0.37 * ((ndviAt(t) - vmin) / (vmax - vmin)) * amp,
      lai: (t) => 0.22 + 3.0 * ((ndviAt(t) - vmin) / (vmax - vmin)) * Math.pow(amp, 1.6),
      ndwi: ndwiAt,
      nddi: (t) => {
        const a = ndviAt(t);
        const b = ndwiAt(t);
        return (a - b) / (a + b);
      },
    };
    const ruido: Record<IndiceId, number> = { ndvi: 0.013, evi: 0.012, lai: 0.11, nddi: 0.02, ndwi: 0.01 };
    const fechaDeDia = (doy: number) => new Date(Date.UTC(2025, 0, doy)).toISOString().slice(0, 10);
    const fuentes = [
      { cod: 'S2' as const, paso: 5, ini: 92, sesgo: 0, sdk: 1, nube: (t: number) => (t > 160 && t < 275 ? 0.42 : 0.2) },
      { cod: 'Planet' as const, paso: 2, ini: 91, sesgo: 0.012, sdk: 1.5, nube: (t: number) => (t > 160 && t < 275 ? 0.55 : 0.3) },
    ];
    const out: PuntoSerie[] = [];
    fuentes.forEach((fu) => {
      for (let d = fu.ini; d <= 304; d += fu.paso) {
        if (r() < fu.nube(d)) continue;
        INDICES.forEach((ind) => {
          let v = f[ind](d) + gauss(r) * ruido[ind] * fu.sdk;
          if (ind === 'ndvi' || ind === 'evi') v += fu.sesgo;
          out.push({ fecha: fechaDeDia(d), fuente: fu.cod, indice: ind, valor: round(v, ind === 'lai' ? 2 : 3) });
        });
      }
    });
    return out;
  }

  private shap(p: Parcela): { shap: ItemShap[]; otras: number } {
    const idx = this.parcelas.indexOf(p);
    const r = mulberry32(8000 + idx * 17);
    const cl = this.clima.get(p.id)!;
    const z = this.zRend.get(p.id)!;
    const efectoZona = p.estado === 'Puebla' ? 0.32 : p.estado === 'Tlaxcala' ? -0.38 : 0.04;
    const mun = MUNICIPIOS.find((m) => m.nombre === p.municipio)!;
    const velocidadVerdeo = round(0.0052 + 0.0007 * z + gauss(r) * 0.0003, 4);
    const velocidadSen = round(0.0041 - 0.0004 * z + gauss(r) * 0.0003, 4);
    const cand = [
      { variable: 'prec_mm_m05', etiqueta: 'Lluvia de mayo', valor: cl[1].prec_mm, unidad: 'mm', c: ((cl[1].prec_mm - 105) / 38) * 0.34 },
      { variable: 'nddi_tasa_verdeo', etiqueta: 'Velocidad de verdeo NDDI', valor: round(velocidadVerdeo * 1.4, 4), unidad: 'por día', c: 0.3 * z + gauss(r) * 0.07 },
      { variable: 'lon', etiqueta: 'Longitud', valor: p.lon, unidad: '°', c: efectoZona * 0.55 + gauss(r) * 0.04 },
      { variable: 'lat', etiqueta: 'Latitud', valor: p.lat, unidad: '°', c: efectoZona * 0.45 + gauss(r) * 0.04 },
      { variable: 'ndvi_tasa_verdeo', etiqueta: 'Velocidad de verdeo NDVI', valor: velocidadVerdeo, unidad: 'por día', c: 0.24 * z + gauss(r) * 0.06 },
      { variable: 'ndvi_tasa_senescencia', etiqueta: 'Velocidad de senescencia NDVI', valor: velocidadSen, unidad: 'por día', c: -0.18 * z + gauss(r) * 0.06 },
      { variable: 'prec_mm_m07', etiqueta: 'Lluvia de julio', valor: cl[3].prec_mm, unidad: 'mm', c: ((cl[3].prec_mm - 196) / 45) * 0.17 },
      { variable: 'prec_mm_m06', etiqueta: 'Lluvia de junio', valor: cl[2].prec_mm, unidad: 'mm', c: ((cl[2].prec_mm - 150) / 45) * 0.13 },
      { variable: 'tmin_c_m04', etiqueta: 'Temperatura mínima de abril', valor: cl[0].tmin_c, unidad: '°C', c: (cl[0].tmin_c - 11.3) * 0.2 },
      { variable: 'tmax_c_m08', etiqueta: 'Temperatura máxima de agosto', valor: cl[4].tmax_c, unidad: '°C', c: -(cl[4].tmax_c - 23.2) * 0.22 },
      { variable: 'elevacion_m', etiqueta: 'Elevación', valor: p.elevacion_m, unidad: 'm', c: (-(p.elevacion_m - mun.elev) / 150) * 0.12 + efectoZona * 0.1 },
      { variable: 'lai_pico', etiqueta: 'LAI máximo', valor: round(2.9 + 0.7 * z + gauss(r) * 0.15, 2), unidad: '', c: 0.14 * z + gauss(r) * 0.05 },
      { variable: 'ndwi_auc', etiqueta: 'Integral de NDWI', valor: round(0.29 + 0.025 * z, 3), unidad: '', c: 0.1 * z + gauss(r) * 0.05 },
      { variable: 'pendiente_grados', etiqueta: 'Pendiente del terreno', valor: p.pendiente_grados, unidad: '°', c: -(p.pendiente_grados - 3) * 0.035 },
      { variable: 'prec_mm_m09', etiqueta: 'Lluvia de septiembre', valor: cl[5].prec_mm, unidad: 'mm', c: ((cl[5].prec_mm - 170) / 45) * 0.07 },
      { variable: 'ndvi_pico', etiqueta: 'NDVI máximo', valor: round(0.56 + 0.06 * z, 2), unidad: '', c: 0.04 * z + gauss(r) * 0.03 },
    ];
    const objetivo = p.rendimiento_pred - MEDIA_OBS;
    const suma = cand.reduce((s2, k) => s2 + k.c, 0);
    const resto = objetivo - suma;
    const pesoTot = cand.reduce((s2, k) => s2 + Math.abs(k.c) + 0.02, 0);
    cand.forEach((k) => (k.c += (resto * (Math.abs(k.c) + 0.02)) / pesoTot));
    cand.sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
    const top = cand.slice(0, 8);
    const otras = cand.slice(8).reduce((s2, k) => s2 + k.c, 0);
    return {
      shap: top.map((k) => ({ variable: k.variable, etiqueta: k.etiqueta, valor_variable: k.valor, unidad: k.unidad, contribucion: round(k.c, 3) })),
      otras: round(otras, 3),
    };
  }

  private vecinos(p: Parcela): Vecino[] {
    return this.parcelas
      .filter((q) => q.id !== p.id)
      .map((q) => ({ q, d: haversine(p.lat, p.lon, q.lat, q.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map((o) => ({
        id: o.q.id, municipio: o.q.municipio, distancia_km: round(o.d, 2),
        rendimiento: o.q.rendimiento_obs != null ? o.q.rendimiento_obs : o.q.rendimiento_pred,
        tipo: o.q.rendimiento_obs != null ? ('observado' as const) : ('predicho' as const),
      }));
  }

  private construirMetricas(): Metricas {
    const disp = this.entren.map((p) => ({ id: p.id, estado: p.estado, municipio: p.municipio, obs: p.rendimiento_obs ?? 0, pred: p.rendimiento_pred }));
    return {
      modelo: { nombre: 'Mezcla', descripcion: 'Promedio de las predicciones del ensamble y del modelo de ubicación.', n_variables: 122 },
      validacion: {
        esquema: 'Validación cruzada anidada estratificada por municipio',
        rmse: 0.508, mae: 0.354, r2: 0.64, sesgo: 0.005,
        baseline: { nombre: 'Predecir el promedio', rmse: 0.846, r2: 0 },
      },
      lomo: {
        esquema: 'Un municipio completo fuera en cada ronda (LOMO)',
        rmse: 0.594, mae: 0.473, r2: 0.51, sesgo: -0.013,
        baseline: { nombre: 'Promedio de las demás zonas', rmse: 1.153, r2: -0.85 },
      },
      comparacion: [
        { id: 'ensamble', nombre: 'Ensamble', descripcion: 'LightGBM, Random Forest y Elastic Net con todas las variables.', elegido: false, n_variables: 121,
          estratificada: { rmse: 0.508, mae: 0.362, r2: 0.64, sesgo: 0 }, lomo: { rmse: 0.722, mae: 0.6, r2: 0.28, sesgo: -0.102 } },
        { id: 'ubicacion', nombre: 'Solo ubicación', descripcion: 'LightGBM que solo usa la longitud.', elegido: false, n_variables: 1,
          estratificada: { rmse: 0.525, mae: 0.364, r2: 0.62, sesgo: 0.011 }, lomo: { rmse: 0.539, mae: 0.378, r2: 0.6, sesgo: 0.077 } },
        { id: 'mezcla', nombre: 'Mezcla', descripcion: 'Promedio de las predicciones del ensamble y del modelo de ubicación.', elegido: true, n_variables: 122,
          estratificada: { rmse: 0.508, mae: 0.354, r2: 0.64, sesgo: 0.005 }, lomo: { rmse: 0.594, mae: 0.473, r2: 0.51, sesgo: -0.013 } },
      ],
      dispersion: disp,
      residuales: disp.map((d) => round(d.obs - d.pred, 3)),
      importancia_familias: [
        { familia: 'Clima', valor: 0.38 }, { familia: 'Ubicación', valor: 0.19 }, { familia: 'NDVI', valor: 0.08 },
        { familia: 'NDDI', valor: 0.07 }, { familia: 'LAI', valor: 0.05 }, { familia: 'NDWI', valor: 0.05 },
        { familia: 'CRC', valor: 0.05 }, { familia: 'NDTI', valor: 0.04 }, { familia: 'MSI', valor: 0.04 },
        { familia: 'Topografía', valor: 0.02 },
      ],
      robustez_espacial: [
        { municipio: 'Cuautepec', rmse: 0.39 }, { municipio: 'Almoloya', rmse: 0.45 }, { municipio: 'Calpulalpan', rmse: 0.47 },
        { municipio: 'Chignahuapan', rmse: 0.68 }, { municipio: 'Singuilucan', rmse: 0.97 },
      ],
      hallazgos: {
        indices: [{ etiqueta: 'NDVI', valor: 0.08 }, { etiqueta: 'NDDI', valor: 0.07 }, { etiqueta: 'LAI', valor: 0.05 }],
        dentro_ndvi: [
          { etiqueta: 'Velocidad de verdeo', valor: 0.036 }, { etiqueta: 'Velocidad de senescencia', valor: 0.028 },
          { etiqueta: 'Valor máximo', valor: 0.007 }, { etiqueta: 'Otras medidas', valor: 0.009 },
        ],
        clima: [
          { etiqueta: 'Lluvia de mayo', valor: 0.071 }, { etiqueta: 'Lluvia de julio', valor: 0.042 },
          { etiqueta: 'Temp. mínima de abril', valor: 0.038 }, { etiqueta: 'Lluvia de junio', valor: 0.034 },
          { etiqueta: 'Temp. máxima de agosto', valor: 0.028 }, { etiqueta: 'Lluvia de septiembre', valor: 0.025 },
          { etiqueta: 'Resto del clima', valor: 0.142 },
        ],
        bloques: [
          { etiqueta: 'Solo clima', clave: 'solo_clima', rmse: 0.507 }, { etiqueta: 'Todas las variables', clave: 'todo', rmse: 0.508 },
          { etiqueta: 'Clima + satelital', clave: 'clima_mas_satelital', rmse: 0.512 },
          { etiqueta: 'Topografía + ubicación', clave: 'solo_topografia_ubicacion', rmse: 0.514 },
          { etiqueta: 'Solo satelital', clave: 'solo_satelital', rmse: 0.613 },
        ],
        familia_clima: 0.38,
      },
      n_parcelas: { total: this.parcelas.length, medidas: this.entren.length, ocultas: this.parcelas.length - this.entren.length },
      rango_entrenamiento: structuredClone(this.rango),
    };
  }
}
