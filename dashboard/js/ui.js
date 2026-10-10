/* CebaData · utilidades de interfaz: iconos, formato, tooltip, estado compartido y reglas de riesgo */
(function (global) {
  "use strict";

  /* ---------- formato ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(n, d) {
    if (n == null || isNaN(n)) return "–";
    d = d == null ? 2 : d;
    if (Number(n) === 0) n = 0;
    return Number(n).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtSigned(n, d) {
    var s = fmt(Math.abs(n), d);
    return (n > 0 ? "+" : n < 0 ? "−" : "") + s;
  }
  function fmtMXN(n) {
    return "$" + Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 });
  }
  var MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fechaLarga(iso) {
    var p = iso.split("-");
    return Number(p[2]) + " de " + MESES_LARGO[Number(p[1]) - 1];
  }

  /* ---------- iconos (trazo, 24x24) ---------- */
  var ICONS = {
    map: '<path d="M9 4 3 6.500v13L9 17l6 3 6-2.500v-13L15 7z"/><path d="M9 4v13M15 7v13"/>',
    parcel: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
    sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
    moon: '<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.500 2.700 2.700L16 9.500"/>',
    warn: '<path d="M10.300 3.800 2.500 17.500A2 2 0 0 0 4.200 20.500h15.600a2 2 0 0 0 1.700-3L13.700 3.800a2 2 0 0 0-3.400 0z"/><path d="M12 9.500v4M12 17h.01"/>',
    stop: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="m9.500 9.500 5 5m0-5-5 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
    left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    flask: '<path d="M9 3h6M10 3v6L4.500 18.500A2 2 0 0 0 6.200 21.500h11.600a2 2 0 0 0 1.700-3L14 9V3"/><path d="M7.500 15h9"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    pencil: '<path d="M12 20h9M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.500 6.200L3 16"/><path d="M3 12a9 9 0 0 1 15.500-6.200L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
    solid: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
    dashed: '<circle cx="12" cy="12" r="7.500" stroke-dasharray="3.200 2.800"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    pin: '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }

  /* ---------- secciones ---------- */
  var SECCIONES = [
    { id: "mapa", ruta: "#/mapa", etiqueta: "Mapa de parcelas", corto: "Mapa", icono: "map", eyebrow: "Sección 1 de 5", titulo: "Mapa de parcelas" },
    { id: "parcela", ruta: "#/parcela", etiqueta: "Ficha de parcela", corto: "Ficha", icono: "parcel", eyebrow: "Sección 2 de 5", titulo: "Ficha de parcela" },
    { id: "modelo", ruta: "#/modelo", etiqueta: "Desempeño del modelo", corto: "Modelo", icono: "activity", eyebrow: "Sección 3 de 5", titulo: "Desempeño del modelo" },
    { id: "hallazgos", ruta: "#/hallazgos", etiqueta: "Hallazgos clave", corto: "Hallazgos", icono: "bulb", eyebrow: "Sección 4 de 5", titulo: "Hallazgos clave" },
    { id: "simulador", ruta: "#/simulador", etiqueta: "Simulador y riesgo crediticio", corto: "Simulador", icono: "sliders", eyebrow: "Sección 5 de 5", titulo: "Simulador y riesgo crediticio" }
  ];

  /* ---------- color de rendimiento: un solo tono verde, claro = bajo, oscuro = alto ---------- */
  var RAMP = [
    [2.0, [228, 243, 220]], [2.6, [191, 227, 180]], [3.2, [147, 207, 140]],
    [3.8, [99, 181, 101]], [4.4, [58, 149, 72]], [5.0, [29, 114, 55]], [5.6, [11, 74, 38]]
  ];
  var Y_MIN = 2.0, Y_MAX = 5.6;
  function yieldColor(v) {
    if (v == null) return "#cccccc";
    v = Math.max(Y_MIN, Math.min(Y_MAX, v));
    for (var i = 1; i < RAMP.length; i++) {
      if (v <= RAMP[i][0]) {
        var a = RAMP[i - 1], b = RAMP[i];
        var t = (v - a[0]) / (b[0] - a[0]);
        var c = [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); });
        return "rgb(" + c.join(",") + ")";
      }
    }
    return "rgb(" + RAMP[RAMP.length - 1][1].join(",") + ")";
  }
  function rampCss() {
    return "linear-gradient(90deg," + RAMP.map(function (r) {
      return "rgb(" + r[1].join(",") + ") " + Math.round((r[0] - Y_MIN) / (Y_MAX - Y_MIN) * 100) + "%";
    }).join(",") + ")";
  }

  /* ---------- riesgo crediticio ---------- */
  var NIVELES = {
    bajo: { id: "bajo", etiqueta: "Riesgo bajo", icono: "check", cls: "low", color: "#1b6e3a", regla: "El límite inferior del intervalo es mayor o igual al equilibrio." },
    medio: { id: "medio", etiqueta: "Riesgo medio", icono: "warn", cls: "mid", color: "#d98a1f", regla: "La predicción supera el equilibrio, pero el límite inferior no." },
    alto: { id: "alto", etiqueta: "Riesgo alto", icono: "stop", cls: "high", color: "#a3271f", regla: "La predicción queda por debajo del equilibrio." }
  };
  function nivelRiesgo(pred, inf, equilibrio) {
    if (inf >= equilibrio) return "bajo";
    if (pred >= equilibrio) return "medio";
    return "alto";
  }
  function riesgoBadge(nivel) {
    var n = NIVELES[nivel];
    return '<span class="risk-badge ' + n.cls + '">' + icon(n.icono) + n.etiqueta + "</span>";
  }
  function equilibrio() {
    var r = App.state.riesgo;
    return r.precio > 0 ? r.costo / r.precio : NaN;
  }

  /* ---------- almacenamiento seguro ---------- */
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function leer(k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }

  /* ---------- estado compartido ---------- */
  var App = {
    state: {
      filtros: { estado: "", municipio: "", conjunto: "", min: Y_MIN, max: Y_MAX },
      colorPor: "rendimiento",       /* "rendimiento" | "riesgo" */
      nivelRiesgo: null,             /* filtro de nivel cuando se ve el riesgo en el mapa */
      riesgo: leer("cebadata-riesgo", { precio: 5600, costo: 19500 }),
      parcelaId: leer("cebadata-parcela", null),
      orden: { col: "id", dir: 1 }
    },
    _parcelas: null,
    getParcelas: function () {
      if (!App._parcelas) {
        App._parcelas = CebaApi.parcelas().catch(function (e) { App._parcelas = null; throw e; });
      }
      return App._parcelas;
    },
    guardarRiesgo: function () { guardar("cebadata-riesgo", App.state.riesgo); },
    elegirParcela: function (id) { App.state.parcelaId = id; guardar("cebadata-parcela", id); },
    valorMostrado: function (p) { return p.rendimiento_obs != null ? p.rendimiento_obs : p.rendimiento_pred; }
  };

  /* ---------- tooltip global (hover, foco y toque) ---------- */
  var tt, ttOwner = null;
  function ttShow(html, x, y) {
    tt.innerHTML = html;
    tt.hidden = false;
    var r = tt.getBoundingClientRect();
    var left = x + 14, top = y + 16;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    if (top < 8) top = 8;
    tt.style.left = left + "px";
    tt.style.top = top + "px";
  }
  function ttHide() { if (tt) { tt.hidden = true; ttOwner = null; } }
  function initTooltip() {
    tt = document.getElementById("tt");
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest("[data-tip]");
      if (!el) { if (ttOwner && ttOwner !== "api") ttHide(); return; }
      ttOwner = el;
      ttShow(el.getAttribute("data-tip"), e.clientX, e.clientY);
    });
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest && e.target.closest("[data-tip]");
      if (e.pointerType === "touch" && el) { ttOwner = el; ttShow(el.getAttribute("data-tip"), e.clientX, e.clientY); }
      else if (!el) ttHide();
    });
    document.addEventListener("scroll", ttHide, true);
    document.addEventListener("focusin", function (e) {
      var el = e.target.closest && e.target.closest("[data-tip]");
      if (!el) return;
      var r = el.getBoundingClientRect();
      ttOwner = el;
      ttShow(el.getAttribute("data-tip"), r.left + r.width / 2, r.top);
    });
    document.addEventListener("focusout", ttHide);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") ttHide(); });
  }
  var Tip = {
    show: function (html, x, y) { ttOwner = "api"; ttShow(html, x, y); },
    hide: ttHide
  };

  /* ---------- esqueletos y estados ---------- */
  function skel(h, w, extra) {
    return '<div class="skel" style="height:' + h + "px;width:" + (w || "100%") + ";" + (extra || "") + '"></div>';
  }
  function skelCard(h) { return '<div class="card skel-card" aria-busy="true">' + skel(14, "40%") + '<div style="height:12px"></div>' + skel(h || 160) + "</div>"; }
  function emptyState(o) {
    return '<div class="empty" role="status"><div class="ico-wrap">' + icon(o.icono || "search") + "</div><strong>" + esc(o.titulo) + "</strong><p>" + esc(o.texto || "") + "</p>" +
      (o.boton ? '<button type="button" class="btn" data-empty-action>' + esc(o.boton) + "</button>" : "") + "</div>";
  }
  function errorState(msg, retry) {
    return '<div class="card err-box">' + emptyState({ icono: "warn", titulo: "No se pudieron cargar los datos", texto: msg || "Revisa tu conexión e inténtalo de nuevo.", boton: retry ? "Reintentar" : null }) + "</div>";
  }

  /* ---------- descarga CSV ---------- */
  function descargarCSV(nombre, filas, columnas) {
    var enc = columnas.map(function (c) { return c.titulo; }).join(",");
    var cuerpo = filas.map(function (f) {
      return columnas.map(function (c) {
        var v = c.valor(f);
        if (v == null) return "";
        v = String(v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(",");
    });
    var blob = new Blob(["﻿" + enc + "\n" + cuerpo.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  global.App = App;
  global.UI = {
    esc: esc, fmt: fmt, fmtSigned: fmtSigned, fmtMXN: fmtMXN, fechaLarga: fechaLarga, MESES_CORTO: MESES_CORTO, MESES_LARGO: MESES_LARGO,
    icon: icon, SECCIONES: SECCIONES, yieldColor: yieldColor, rampCss: rampCss, Y_MIN: Y_MIN, Y_MAX: Y_MAX,
    NIVELES: NIVELES, nivelRiesgo: nivelRiesgo, riesgoBadge: riesgoBadge, equilibrio: equilibrio,
    skel: skel, skelCard: skelCard, emptyState: emptyState, errorState: errorState,
    descargarCSV: descargarCSV, debounce: debounce, initTooltip: initTooltip, Tip: Tip
  };
})(window);
