/* ============================================================
   CebaData · capa de datos
   ------------------------------------------------------------
   Todo el dashboard obtiene sus datos SOLO a traves de CebaApi.
   Hoy responde con datos simulados (generados con semilla fija,
   siempre iguales). Para conectar una API real basta con
   asignar la URL base:

       CebaApi.configurar({ baseUrl: "https://mi-servidor" });

   Endpoints que se esperan (los mismos que simula este archivo):
     GET  /api/parcelas            -> lista de parcelas
     GET  /api/parcelas/:id        -> { parcela, serie, clima, shap,
                                        shap_otras, base, vecinos }
     GET  /api/modelo/metricas     -> metricas, comparativos y hallazgos
     POST /api/simulador           -> { id, delta_lluvia_mayo_pct,
                                        delta_tmin_abril_c }
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- utilidades ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function laplace(rnd) {
    var u = rnd() - 0.5;
    return -Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function round(x, d) { var f = Math.pow(10, d); return Math.round(x * f) / f; }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function sd(a) { var m = mean(a); return Math.sqrt(mean(a.map(function (x) { return (x - m) * (x - m); }))); }
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371, p = Math.PI / 180;
    var dLat = (lat2 - lat1) * p, dLon = (lon2 - lon1) * p;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  /* ---------- configuracion del escenario ---------- */
  var MUNICIPIOS = [
    { nombre: "Calpulalpan",        estado: "Tlaxcala", centro: [19.585, -98.560], radio: 0.075, n: 48, base: 3.00, ajuste: 0.00,  elev: 2560, err: 0.90 },
    { nombre: "Chignahuapan",       estado: "Puebla",   centro: [19.860, -98.260], radio: 0.080, n: 44, base: 4.50, ajuste: 0.00,  elev: 2520, err: 1.15 },
    { nombre: "Singuilucan",        estado: "Hidalgo",  centro: [19.970, -98.440], radio: 0.060, n: 38, base: 3.80, ajuste: -0.30, elev: 2610, err: 1.35 },
    { nombre: "Emiliano Zapata",    estado: "Hidalgo",  centro: [19.905, -98.350], radio: 0.050, n: 25, base: 3.80, ajuste: 0.10,  elev: 2590, err: 0.95 },
    { nombre: "Cuautepec",          estado: "Hidalgo",  centro: [19.990, -98.325], radio: 0.040, n: 24, base: 3.80, ajuste: 0.15,  elev: 2490, err: 0.75 },
    { nombre: "Almoloya",           estado: "Hidalgo",  centro: [19.885, -98.470], radio: 0.040, n: 18, base: 3.80, ajuste: 0.00,  elev: 2640, err: 0.85 }
  ];
  var N_PREDICCION = 59;
  var MEDIA_OBS = 3.96, SD_OBS = 0.846, MEDIA_PRED = 3.93;
  var RMSE_CV = 0.508, MAE_CV = 0.362;

  var CLIMA_BASE = {
    prec: [38, 105, 150, 196, 206, 170, 62],
    tmax: [24.1, 24.3, 23.8, 23.0, 23.2, 23.1, 23.0],
    tmin: [11.3, 12.9, 13.3, 12.9, 13.1, 12.6, 11.5]
  };
  var MESES = ["Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"];

  /* ---------- generacion de parcelas ---------- */
  var rnd = mulberry32(20250407);
  var crudas = [];
  MUNICIPIOS.forEach(function (m, mi) {
    for (var i = 0; i < m.n; i++) {
      var ang = rnd() * 2 * Math.PI, rad = m.radio * Math.sqrt(rnd());
      var lat = m.centro[0] + rad * Math.sin(ang) * 0.9;
      var lon = m.centro[1] + rad * Math.cos(ang);
      var elev = Math.round(m.elev + gauss(rnd) * 75 + (lat - m.centro[0]) * 400);
      crudas.push({
        mi: mi, estado: m.estado, municipio: m.nombre,
        lat: round(lat, 5), lon: round(lon, 5),
        area_ha: round(clamp(Math.exp(Math.log(3.4) + gauss(rnd) * 0.55), 0.6, 14), 1),
        elevacion_m: elev,
        pendiente_grados: round(clamp(Math.abs(gauss(rnd)) * 3.2 + 0.4, 0.3, 11), 1),
        z: gauss(rnd)
      });
    }
  });
  /* mezcla determinista para que los ID no sigan el orden por municipio */
  for (var s = crudas.length - 1; s > 0; s--) {
    var j = Math.floor(rnd() * (s + 1));
    var tmp = crudas[s]; crudas[s] = crudas[j]; crudas[j] = tmp;
  }
  /* AGC_003 (ejemplo de la ficha) cae en Chignahuapan */
  (function () {
    var k = crudas.findIndex(function (p) { return p.municipio === "Chignahuapan"; });
    var t = crudas[2]; crudas[2] = crudas[k]; crudas[k] = t;
  })();

  /* conjunto: 59 de prediccion repartidas por municipio */
  var idxs = crudas.map(function (_, i) { return i; }).filter(function (i) { return i !== 2; });
  for (var q = idxs.length - 1; q > 0; q--) {
    var w = Math.floor(rnd() * (q + 1)); var t2 = idxs[q]; idxs[q] = idxs[w]; idxs[w] = t2;
  }
  var esPred = {};
  esPred[2] = true;
  idxs.slice(0, N_PREDICCION - 1).forEach(function (i) { esPred[i] = true; });

  /* rendimiento latente (verdad) con media y desviacion exactas en el conjunto observado */
  var yRaw = crudas.map(function (p) {
    var m = MUNICIPIOS[p.mi];
    return m.base + m.ajuste + 0.0011 * (p.elevacion_m - m.elev) * -1 + p.z * 0.62;
  });
  var obsIdx = crudas.map(function (_, i) { return i; }).filter(function (i) { return !esPred[i]; });
  var y = yRaw.slice();
  for (var it = 0; it < 40; it++) {
    var vals = obsIdx.map(function (i) { return y[i]; });
    var m0 = mean(vals), s0 = sd(vals);
    y = y.map(function (v) { return clamp(MEDIA_OBS + (v - m0) * (SD_OBS / s0), 2.0, 5.6); });
  }

  /* residuales del modelo (validacion cruzada) con RMSE y MAE objetivo */
  var rndRes = mulberry32(global.__SEED_RES || 101);
  var eBase = crudas.map(function (p) { return laplace(rndRes) * MUNICIPIOS[p.mi].err; });
  function residuales(k) {
    var e = eBase.map(function (v) { return Math.sign(v) * Math.pow(Math.abs(v), k); });
    var sel = obsIdx.map(function (i) { return e[i]; });
    var mu = mean(sel);
    e = e.map(function (v) { return v - mu; });
    var rm = Math.sqrt(mean(obsIdx.map(function (i) { return e[i] * e[i]; })));
    return e.map(function (v) { return v * RMSE_CV / rm; });
  }
  (function () {
    var lo = 0.5, hi = 1.6, e;
    for (var i = 0; i < 40; i++) {
      var k = (lo + hi) / 2;
      e = residuales(k);
      var mae = mean(obsIdx.map(function (ix) { return Math.abs(e[ix]); }));
      if (mae > MAE_CV) lo = k; else hi = k;
    }
    eBase = residuales((lo + hi) / 2);
  })();

  var predRaw = crudas.map(function (_, i) { return esPred[i] ? y[i] + eBase[i] : y[i] - eBase[i]; });
  /* media predicha de las 59 parcelas = 3.93 */
  (function () {
    var ids = Object.keys(esPred).map(Number).filter(function (i) { return i !== 2; });
    var objetivo = MEDIA_PRED * N_PREDICCION - 4.12;
    var cur = ids.reduce(function (s2, i) { return s2 + predRaw[i]; }, 0);
    var delta = (objetivo - cur) / ids.length;
    ids.forEach(function (i) { predRaw[i] += delta; });
    predRaw[2] = 4.12;
  })();

  var parcelas = crudas.map(function (p, i) {
    var m = MUNICIPIOS[p.mi];
    var pred = esPred[i] ? clamp(round(predRaw[i], 2), 2.2, 5.6) : round(predRaw[i], 2);
    var hw = i === 2 ? 0.76 : clamp(0.76 * Math.pow(m.err / 1.05, 0.7) * (0.9 + rnd() * 0.2), 0.5, 1.25);
    var pr = {
      id: "AGC_" + ("00" + (i + 1)).slice(-3),
      estado: p.estado, municipio: p.municipio, area_ha: p.area_ha,
      conjunto: esPred[i] ? "PREDICCION" : "ENTRENAMIENTO",
      rendimiento_obs: esPred[i] ? null : round(y[i], 2),
      rendimiento_pred: pred,
      intervalo_inf: round(pred - hw, 2),
      intervalo_sup: round(pred + hw, 2),
      lat: p.lat, lon: p.lon,
      elevacion_m: p.elevacion_m, pendiente_grados: p.pendiente_grados
    };
    return pr;
  });
  /* ajuste fino por redondeo: medias exactas a 2 decimales */
  (function () {
    var obs = parcelas.filter(function (p) { return p.conjunto === "ENTRENAMIENTO"; });
    var pre = parcelas.filter(function (p) { return p.conjunto === "PREDICCION"; });
    var dO = MEDIA_OBS * obs.length - obs.reduce(function (s2, p) { return s2 + p.rendimiento_obs; }, 0);
    obs[0].rendimiento_obs = round(obs[0].rendimiento_obs + dO, 2);
    var pPre = pre.filter(function (p) { return p.id !== "AGC_003"; });
    var dP = MEDIA_PRED * pre.length - pre.reduce(function (s2, p) { return s2 + p.rendimiento_pred; }, 0);
    var ult = pPre[pPre.length - 1];
    ult.rendimiento_pred = round(ult.rendimiento_pred + dP, 2);
    ult.intervalo_inf = round(ult.intervalo_inf + dP, 2);
    ult.intervalo_sup = round(ult.intervalo_sup + dP, 2);
    parcelas[2].intervalo_inf = 3.36; parcelas[2].intervalo_sup = 4.88;
  })();

  /* ---------- clima por parcela ---------- */
  var climaPorId = {};
  var zRend = {};
  parcelas.forEach(function (p, i) {
    var r = mulberry32(900 + i * 7);
    var ref = p.rendimiento_obs != null ? p.rendimiento_obs : p.rendimiento_pred;
    var z = (ref - MEDIA_OBS) / SD_OBS;
    zRend[p.id] = z;
    var lluviaZona = p.estado === "Puebla" ? 12 : p.estado === "Tlaxcala" ? -14 : 0;
    var ajusteT = (p.elevacion_m - 2580) * -0.0016;
    var meses = [];
    for (var m = 0; m < 7; m++) {
      var prec = CLIMA_BASE.prec[m] + lluviaZona * (m === 1 ? 1.6 : 1) + (m === 1 ? 26 * z : 8 * z) + gauss(r) * (m === 1 ? 14 : 18);
      meses.push({
        mes: m + 4,
        prec_mm: Math.round(clamp(prec, 20, 250)),
        tmax_c: round(clamp(CLIMA_BASE.tmax[m] + ajusteT + gauss(r) * 0.25, 22.7, 24.6), 1),
        tmin_c: round(clamp(CLIMA_BASE.tmin[m] + ajusteT * 0.7 + (m === 0 ? -0.25 * z : 0) + gauss(r) * 0.22, 10.9, 13.6), 1)
      });
    }
    climaPorId[p.id] = meses;
  });

  /* rangos del conjunto de entrenamiento (para avisos del simulador) */
  var entren = parcelas.filter(function (p) { return p.conjunto === "ENTRENAMIENTO"; });
  var RANGO_ENT = {
    lluvia_mayo: {
      min: Math.min.apply(null, entren.map(function (p) { return climaPorId[p.id][1].prec_mm; })),
      max: Math.max.apply(null, entren.map(function (p) { return climaPorId[p.id][1].prec_mm; }))
    },
    tmin_abril: {
      min: Math.min.apply(null, entren.map(function (p) { return climaPorId[p.id][0].tmin_c; })),
      max: Math.max.apply(null, entren.map(function (p) { return climaPorId[p.id][0].tmin_c; }))
    }
  };

  /* ---------- series de indices satelitales (bajo demanda) ---------- */
  var INDICES = ["ndvi", "evi", "lai", "nddi", "ndwi"];
  function diaDelAnio(f) { return Math.round((Date.UTC(f.y, f.m - 1, f.d) - Date.UTC(f.y, 0, 0)) / 86400000); }
  function fechaDeDia(doy) {
    var d = new Date(Date.UTC(2025, 0, doy));
    return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
  }
  function construirSerie(p) {
    var idx = parcelas.indexOf(p);
    var r = mulberry32(5000 + idx * 13);
    var z = zRend[p.id];
    var vmax = clamp(0.56 + 0.06 * z + gauss(r) * 0.02, 0.4, 0.7);
    var t1 = 176 + gauss(r) * 5 - 4 * z, s1 = 13 + r() * 3;
    var t2 = 291 + gauss(r) * 4 + 3 * z, s2 = 10 + r() * 3;
    var vmin = 0.15 + gauss(r) * 0.008;
    function crudo(t) {
      var base = sigmoid((t - t1) / s1) - sigmoid((t - t2) / s2);
      return base + 0.1 * Math.exp(-Math.pow((t - 243) / 33, 2));
    }
    var pico = 0;
    for (var t = 91; t <= 304; t++) pico = Math.max(pico, crudo(t));
    function ndviAt(t) { return vmin + (vmax - vmin) * crudo(t) / pico; }
    var amp = vmax / 0.56;
    function ndwiAt(t) { var u = (ndviAt(t - 9) - vmin) / (vmax - vmin); return 0.045 + 0.255 * u * Math.min(amp, 1.2); }
    var f = {
      ndvi: ndviAt,
      evi: function (t) { var u = (ndviAt(t) - vmin) / (vmax - vmin); return 0.085 + 0.37 * u * amp; },
      lai: function (t) { var u = (ndviAt(t) - vmin) / (vmax - vmin); return 0.22 + 3.0 * u * Math.pow(amp, 1.6); },
      ndwi: ndwiAt,
      nddi: function (t) { var a = ndviAt(t), b = ndwiAt(t); return (a - b) / (a + b); }
    };
    var ruido = { ndvi: 0.013, evi: 0.012, lai: 0.11, nddi: 0.02, ndwi: 0.01 };
    var out = [];
    var fuentes = [
      { cod: "S2", paso: 5, ini: 92, sesgo: 0, sdk: 1, nube: function (t) { return t > 160 && t < 275 ? 0.42 : 0.2; } },
      { cod: "Planet", paso: 2, ini: 91, sesgo: 0.012, sdk: 1.5, nube: function (t) { return t > 160 && t < 275 ? 0.55 : 0.3; } }
    ];
    fuentes.forEach(function (fu) {
      for (var d = fu.ini; d <= 304; d += fu.paso) {
        if (r() < fu.nube(d)) continue;
        INDICES.forEach(function (ind) {
          var v = f[ind](d) + gauss(r) * ruido[ind] * fu.sdk;
          if (ind === "ndvi" || ind === "evi") v += fu.sesgo;
          out.push({ fecha: fechaDeDia(d), fuente: fu.cod, indice: ind, valor: round(v, ind === "lai" ? 2 : 3) });
        });
      }
    });
    return out;
  }

  /* ---------- explicacion tipo SHAP ---------- */
  function construirShap(p) {
    var idx = parcelas.indexOf(p);
    var r = mulberry32(8000 + idx * 17);
    var cl = climaPorId[p.id];
    var z = zRend[p.id];
    var efectoZona = p.estado === "Puebla" ? 0.32 : p.estado === "Tlaxcala" ? -0.38 : 0.04;
    var mun = MUNICIPIOS.filter(function (m) { return m.nombre === p.municipio; })[0];
    var velocidadVerdeo = round(0.0052 + 0.0007 * z + gauss(r) * 0.0003, 4);
    var velocidadSen = round(0.0041 - 0.0004 * z + gauss(r) * 0.0003, 4);
    var cand = [
      { variable: "prec_mayo", etiqueta: "Lluvia de mayo", valor: cl[1].prec_mm, unidad: "mm", c: (cl[1].prec_mm - 105) / 38 * 0.34 },
      { variable: "nddi_verdeo", etiqueta: "Velocidad de verdeo NDDI", valor: round(velocidadVerdeo * 1.4, 4), unidad: "por día", c: 0.30 * z + gauss(r) * 0.07 },
      { variable: "lon", etiqueta: "Longitud", valor: p.lon, unidad: "°", c: efectoZona * 0.55 + gauss(r) * 0.04 },
      { variable: "lat", etiqueta: "Latitud", valor: p.lat, unidad: "°", c: efectoZona * 0.45 + gauss(r) * 0.04 },
      { variable: "ndvi_verdeo", etiqueta: "Velocidad de verdeo NDVI", valor: velocidadVerdeo, unidad: "por día", c: 0.24 * z + gauss(r) * 0.06 },
      { variable: "ndvi_senescencia", etiqueta: "Velocidad de senescencia NDVI", valor: velocidadSen, unidad: "por día", c: -0.18 * z + gauss(r) * 0.06 },
      { variable: "prec_julio", etiqueta: "Lluvia de julio", valor: cl[3].prec_mm, unidad: "mm", c: (cl[3].prec_mm - 196) / 45 * 0.17 },
      { variable: "prec_junio", etiqueta: "Lluvia de junio", valor: cl[2].prec_mm, unidad: "mm", c: (cl[2].prec_mm - 150) / 45 * 0.13 },
      { variable: "tmin_abril", etiqueta: "Temperatura mínima de abril", valor: cl[0].tmin_c, unidad: "°C", c: (cl[0].tmin_c - 11.3) * 0.20 },
      { variable: "tmax_agosto", etiqueta: "Temperatura máxima de agosto", valor: cl[4].tmax_c, unidad: "°C", c: -(cl[4].tmax_c - 23.2) * 0.22 },
      { variable: "elevacion", etiqueta: "Elevación", valor: p.elevacion_m, unidad: "m", c: -(p.elevacion_m - mun.elev) / 150 * 0.12 + efectoZona * 0.1 },
      { variable: "lai_max", etiqueta: "LAI máximo", valor: round(2.9 + 0.7 * z + gauss(r) * 0.15, 2), unidad: "", c: 0.14 * z + gauss(r) * 0.05 },
      { variable: "ndwi_agosto", etiqueta: "NDWI de agosto", valor: round(0.29 + 0.025 * z, 3), unidad: "", c: 0.10 * z + gauss(r) * 0.05 },
      { variable: "pendiente", etiqueta: "Pendiente del terreno", valor: p.pendiente_grados, unidad: "°", c: -(p.pendiente_grados - 3) * 0.035 },
      { variable: "prec_sept", etiqueta: "Lluvia de septiembre", valor: cl[5].prec_mm, unidad: "mm", c: (cl[5].prec_mm - 170) / 45 * 0.07 },
      { variable: "ndvi_max", etiqueta: "NDVI máximo", valor: round(0.56 + 0.06 * z, 2), unidad: "", c: 0.04 * z + gauss(r) * 0.03 }
    ];
    var objetivo = p.rendimiento_pred - MEDIA_OBS;
    var suma = cand.reduce(function (s2, k) { return s2 + k.c; }, 0);
    var resto = objetivo - suma;
    var pesoTot = cand.reduce(function (s2, k) { return s2 + Math.abs(k.c) + 0.02; }, 0);
    cand.forEach(function (k) { k.c += resto * (Math.abs(k.c) + 0.02) / pesoTot; });
    cand.sort(function (a, b) { return Math.abs(b.c) - Math.abs(a.c); });
    var top = cand.slice(0, 8);
    var otras = cand.slice(8).reduce(function (s2, k) { return s2 + k.c; }, 0);
    return {
      shap: top.map(function (k) {
        return { variable: k.variable, etiqueta: k.etiqueta, valor_variable: k.valor, unidad: k.unidad, contribucion: round(k.c, 3) };
      }),
      shap_otras: round(otras, 3),
      n_otras: cand.length - 8 + 40
    };
  }

  /* ---------- vecinos ---------- */
  function vecinosDe(p) {
    return parcelas
      .filter(function (q) { return q.id !== p.id; })
      .map(function (q) { return { q: q, d: haversine(p.lat, p.lon, q.lat, q.lon) }; })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, 5)
      .map(function (o) {
        return {
          id: o.q.id, municipio: o.q.municipio, distancia_km: round(o.d, 2),
          rendimiento: o.q.rendimiento_obs != null ? o.q.rendimiento_obs : o.q.rendimiento_pred,
          tipo: o.q.rendimiento_obs != null ? "observado" : "predicho"
        };
      });
  }

  /* ---------- metricas del modelo ---------- */
  function construirMetricas() {
    var disp = entren.map(function (p) {
      return { id: p.id, estado: p.estado, municipio: p.municipio, obs: p.rendimiento_obs, pred: p.rendimiento_pred };
    });
    return {
      validacion: {
        esquema: "Validación cruzada anidada",
        rmse: 0.508, mae: 0.362, r2: 0.64,
        baseline: { nombre: "Predecir el promedio", rmse: 0.846, r2: 0 }
      },
      modelos: [
        { nombre: "Promedio (referencia)", rmse: 0.846, referencia: true },
        { nombre: "Elastic Net", rmse: 0.530 },
        { nombre: "Random Forest", rmse: 0.522 },
        { nombre: "LightGBM", rmse: 0.507 },
        { nombre: "Ensamble", rmse: 0.508, elegido: true }
      ],
      dispersion: disp,
      residuales: disp.map(function (d) { return round(d.obs - d.pred, 3); }),
      importancia_familias: [
        { familia: "Clima", valor: 0.38 }, { familia: "Ubicación", valor: 0.19 },
        { familia: "NDVI", valor: 0.08 }, { familia: "NDDI", valor: 0.07 },
        { familia: "LAI", valor: 0.05 }, { familia: "NDWI", valor: 0.05 },
        { familia: "CRC", valor: 0.05 }, { familia: "NDTI", valor: 0.04 },
        { familia: "MSI", valor: 0.04 }, { familia: "Topografía", valor: 0.02 }
      ],
      robustez_espacial: [
        { municipio: "Cuautepec", rmse: 0.39 }, { municipio: "Almoloya", rmse: 0.45 },
        { municipio: "Calpulalpan", rmse: 0.47 }, { municipio: "Chignahuapan", rmse: 0.68 },
        { municipio: "Singuilucan", rmse: 0.97 }
      ],
      hallazgos: {
        indices: [
          { etiqueta: "NDVI", valor: 0.08 }, { etiqueta: "NDDI", valor: 0.07 }, { etiqueta: "LAI", valor: 0.05 }
        ],
        dentro_ndvi: [
          { etiqueta: "Velocidad de verdeo", valor: 0.036 },
          { etiqueta: "Velocidad de senescencia", valor: 0.028 },
          { etiqueta: "Valor máximo", valor: 0.007 },
          { etiqueta: "Otras medidas", valor: 0.009 }
        ],
        clima: [
          { etiqueta: "Lluvia de mayo", valor: 0.071 },
          { etiqueta: "Lluvia de julio", valor: 0.042 },
          { etiqueta: "Temp. mínima de abril", valor: 0.038 },
          { etiqueta: "Lluvia de junio", valor: 0.034 },
          { etiqueta: "Temp. máxima de agosto", valor: 0.028 },
          { etiqueta: "Lluvia de septiembre", valor: 0.025 },
          { etiqueta: "Resto del clima", valor: 0.142 }
        ],
        bloques: [
          { etiqueta: "Solo clima", rmse: 0.507 },
          { etiqueta: "Todas las variables", rmse: 0.508 },
          { etiqueta: "Clima + satelital", rmse: 0.512 },
          { etiqueta: "Topografía + ubicación", rmse: 0.514 },
          { etiqueta: "Solo satelital", rmse: 0.613 }
        ]
      },
      rango_entrenamiento: RANGO_ENT
    };
  }

  /* ---------- simulador ---------- */
  function efectoLluvia(p) {
    return p >= 0 ? 0.010 * p - 0.00008 * p * p : 0.010 * p - 0.00014 * p * p;
  }
  function efectoTmin(t) { return 0.05 * t - 0.03 * t * t; }
  function simular(body) {
    var p = parcelas.filter(function (q) { return q.id === body.id; })[0];
    if (!p) return { error: "Parcela no encontrada", status: 404 };
    var dl = clamp(Number(body.delta_lluvia_mayo_pct) || 0, -40, 40);
    var dt = clamp(Number(body.delta_tmin_abril_c) || 0, -2, 2);
    var cl = climaPorId[p.id];
    var lluviaBase = cl[1].prec_mm, tminBase = cl[0].tmin_c;
    var lluviaEsc = round(lluviaBase * (1 + dl / 100), 0);
    var tminEsc = round(tminBase + dt, 1);
    var dif = efectoLluvia(dl) + efectoTmin(dt);
    var hwBase = (p.intervalo_sup - p.intervalo_inf) / 2;
    var hwEsc = hwBase * (1 + 0.18 * Math.abs(dl) / 40 + 0.12 * Math.abs(dt) / 2);
    var predEsc = clamp(p.rendimiento_pred + dif, 1.0, 6.5);
    var fuera = [];
    if (lluviaEsc < RANGO_ENT.lluvia_mayo.min || lluviaEsc > RANGO_ENT.lluvia_mayo.max) {
      fuera.push({ variable: "lluvia_mayo", etiqueta: "Lluvia de mayo", valor: lluviaEsc, min: RANGO_ENT.lluvia_mayo.min, max: RANGO_ENT.lluvia_mayo.max, unidad: "mm" });
    }
    if (tminEsc < RANGO_ENT.tmin_abril.min || tminEsc > RANGO_ENT.tmin_abril.max) {
      fuera.push({ variable: "tmin_abril", etiqueta: "Temperatura mínima de abril", valor: tminEsc, min: RANGO_ENT.tmin_abril.min, max: RANGO_ENT.tmin_abril.max, unidad: "°C" });
    }
    return {
      id: p.id,
      base: { pred: p.rendimiento_pred, inf: p.intervalo_inf, sup: p.intervalo_sup },
      escenario: { pred: round(predEsc, 2), inf: round(predEsc - hwEsc, 2), sup: round(predEsc + hwEsc, 2) },
      diferencia: round(predEsc - p.rendimiento_pred, 2),
      diferencia_pct: round((predEsc / p.rendimiento_pred - 1) * 100, 1),
      entradas: { lluvia_mayo_base: lluviaBase, lluvia_mayo_escenario: lluviaEsc, tmin_abril_base: tminBase, tmin_abril_escenario: tminEsc },
      fuera_de_rango: fuera,
      rango_entrenamiento: RANGO_ENT
    };
  }

  /* ---------- "servidor" simulado ---------- */
  var config = { baseUrl: null, latenciaMs: [140, 320] };
  function esperar() {
    var lat = config.latenciaMs;
    var ms = lat[0] + Math.random() * (lat[1] - lat[0]);
    return new Promise(function (ok) { setTimeout(ok, ms); });
  }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  var metricasCache = null;

  function simulado(metodo, ruta, cuerpo) {
    var m;
    if (metodo === "GET" && ruta === "/api/parcelas") return copia(parcelas);
    if (metodo === "GET" && (m = ruta.match(/^\/api\/parcelas\/([A-Za-z0-9_]+)$/))) {
      var p = parcelas.filter(function (q) { return q.id === m[1]; })[0];
      if (!p) return { error: "Parcela no encontrada", status: 404 };
      var sh = construirShap(p);
      return copia({
        parcela: p, serie: construirSerie(p), clima: climaPorId[p.id],
        shap: sh.shap, shap_otras: sh.shap_otras, base: MEDIA_OBS, vecinos: vecinosDe(p)
      });
    }
    if (metodo === "GET" && ruta === "/api/modelo/metricas") {
      metricasCache = metricasCache || construirMetricas();
      return copia(metricasCache);
    }
    if (metodo === "POST" && ruta === "/api/simulador") return simular(cuerpo || {});
    return { error: "Ruta no encontrada: " + ruta, status: 404 };
  }

  function solicitar(metodo, ruta, cuerpo) {
    if (config.baseUrl) {
      var opts = { method: metodo, headers: { "Content-Type": "application/json" } };
      if (cuerpo) opts.body = JSON.stringify(cuerpo);
      return fetch(config.baseUrl + ruta, opts).then(function (r) {
        if (!r.ok) throw new Error("Error " + r.status + " en " + ruta);
        return r.json();
      });
    }
    return esperar().then(function () {
      var res = simulado(metodo, ruta, cuerpo);
      if (res && res.error) { var e = new Error(res.error); e.status = res.status; throw e; }
      return res;
    });
  }

  global.CebaApi = {
    configurar: function (o) { Object.assign(config, o || {}); },
    parcelas: function () { return solicitar("GET", "/api/parcelas"); },
    parcela: function (id) { return solicitar("GET", "/api/parcelas/" + encodeURIComponent(id)); },
    metricas: function () { return solicitar("GET", "/api/modelo/metricas"); },
    simular: function (cuerpo) { return solicitar("POST", "/api/simulador", cuerpo); }
  };
  global.CebaConst = { MESES: MESES, MEDIA_OBS: MEDIA_OBS, INDICES: INDICES };
})(window);
