/* Sección 2 · Ficha de parcela */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt, icon = UI.icon;

  var INDICES = [
    { id: "ndvi", nombre: "NDVI", dec: 2, txt: "Qué tan verde y vigoroso está el cultivo. Sube cuando la planta crece y baja cuando madura." },
    { id: "evi", nombre: "EVI", dec: 2, txt: "Parecido al NDVI, pero distingue mejor cuando el cultivo ya está muy denso." },
    { id: "lai", nombre: "LAI", dec: 2, txt: "Cuántas capas de hojas hay sobre cada metro cuadrado de suelo." },
    { id: "nddi", nombre: "NDDI", dec: 2, txt: "Señal de sequía. Valores altos indican planta y suelo más secos." },
    { id: "ndwi", nombre: "NDWI", dec: 2, txt: "Agua contenida en las hojas. Valores altos indican más humedad en el cultivo." }
  ];
  var FUENTES = [{ id: "S2", nombre: "Sentinel-2" }, { id: "Planet", nombre: "Planet" }];

  function valorTexto(v) {
    var n = v.valor_variable, u = v.unidad;
    if (u === "mm") return fmt(n, 0) + " mm";
    if (u === "°C") return fmt(n, 1) + " °C";
    if (u === "°") return fmt(n, v.variable === "pendiente" ? 1 : 3) + "°";
    if (u === "por día") return fmt(n, 4) + " por día";
    if (u === "m") return fmt(n, 0) + " m";
    return fmt(n, 2);
  }

  function skeleton() {
    return UI.skelCard(60) + '<div class="card skel-card">' + UI.skel(60) + "</div>" + UI.skelCard(280) +
      '<div class="grid grid-2">' + UI.skelCard(220) + UI.skelCard(220) + "</div>" + UI.skelCard(380);
  }

  function intervalBar(p) {
    var obs = p.rendimiento_obs;
    var vals = [p.intervalo_inf, p.intervalo_sup, p.rendimiento_pred, UI.Y_MIN, UI.Y_MAX].concat(obs != null ? [obs] : []);
    var lo = Math.floor(Math.min.apply(null, vals) * 2) / 2, hi = Math.ceil(Math.max.apply(null, vals) * 2) / 2;
    var P = function (v) { return (v - lo) / (hi - lo) * 100; };
    var ticks = "";
    for (var t = Math.ceil(lo); t <= hi + 1e-9; t++) ticks += '<span style="left:' + P(t) + '%">' + t + "</span>";
    var tipIn = Charts.tip("Intervalo de predicción", [{ t: "De <b>" + fmt(p.intervalo_inf, 2) + "</b> a <b>" + fmt(p.intervalo_sup, 2) + "</b> t/ha" }, { t: '<span class="tt-sub">Rango donde es probable que caiga el rendimiento real</span>' }]);
    return '<div><div class="ibar">' +
      '<span class="ibar-lbl" style="left:' + P(p.rendimiento_pred) + '%">Predicho ' + fmt(p.rendimiento_pred, 2) + "</span>" +
      '<div class="ibar-track"><div class="ibar-range" tabindex="0" data-tip="' + esc(tipIn) + '" style="left:' + P(p.intervalo_inf) + "%;width:" + (P(p.intervalo_sup) - P(p.intervalo_inf)) + '%"></div>' +
      '<div class="ibar-pred" style="left:' + P(p.rendimiento_pred) + '%"></div>' +
      (obs != null ? '<div class="ibar-obs" tabindex="0" data-tip="' + esc(Charts.tip("Rendimiento observado", [{ t: "<b>" + fmt(obs, 2) + "</b> t/ha medidos en campo" }])) + '" style="left:' + P(obs) + '%"></div>' : "") + "</div>" +
      '<div class="ibar-ticks" aria-hidden="true">' + ticks + "</div></div>" +
      '<div class="ibar-ends"><span>Límite inferior <b class="num">' + fmt(p.intervalo_inf, 2) + '</b></span><span>Límite superior <b class="num">' + fmt(p.intervalo_sup, 2) + "</b></span></div>" +
      '<div class="legend" style="margin-top:10px"><span class="legend-item"><span class="sw" style="background:var(--bar);opacity:.55;height:10px;width:22px;border-radius:5px"></span>Intervalo de predicción</span>' +
      '<span class="legend-item"><span class="sw" style="background:var(--ink);width:4px;height:16px;border-radius:2px"></span>Predicho</span>' +
      (obs != null ? '<span class="legend-item"><span class="sw" style="border:3px solid var(--ink);width:12px;height:12px;transform:rotate(45deg) scale(.8);border-radius:2px"></span>Observado</span>' : "") + "</div></div>";
  }

  function mount(host, params) {
    var destroyed = false;
    var id = (params && params[0]) || App.state.parcelaId;

    function picker(lista, actual, msg) {
      var h = '<div class="picker"><a class="btn" href="#/mapa">' + icon("left") + 'Volver al mapa</a>' +
        '<div class="field"><label for="pk">Buscar otra parcela (ID o municipio)</label><input id="pk" class="input" list="pk-list" autocomplete="off" placeholder="Ej. AGC_003" value="' + esc(actual || "") + '"></div>' +
        '<datalist id="pk-list">' + lista.map(function (p) { return '<option value="' + p.id + '">' + esc(p.municipio + " · " + (p.conjunto === "PREDICCION" ? "Predicción" : "Entrenamiento")) + "</option>"; }).join("") + "</datalist>" +
        (msg ? '<span class="field-err" role="alert">' + esc(msg) + "</span>" : "") + "</div>";
      return h;
    }
    function bindPicker(lista) {
      var inp = host.querySelector("#pk"); if (!inp) return;
      function go() {
        var q = inp.value.trim().toUpperCase().replace(/\s.*/, "");
        if (!q) return;
        if (/^\d{1,3}$/.test(q)) q = "AGC_" + ("00" + q).slice(-3);
        var ok = lista.filter(function (p) { return p.id === q; })[0];
        if (ok) { App.elegirParcela(ok.id); location.hash = "#/parcela/" + ok.id; }
        else render(lista, null, 'No encontramos la parcela "' + inp.value.trim() + '". Prueba con un ID como AGC_003.');
      }
      inp.addEventListener("change", go);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
    }
    function render(lista, d, msg) {
      if (!d) {
        host.innerHTML = picker(lista, "", msg) + '<div class="card">' + UI.emptyState({ icono: "parcel", titulo: "Elige una parcela para ver su ficha", texto: "Haz clic en una parcela del mapa o escribe su ID arriba. También puedes abrirla desde la tabla del mapa." }) + '<div style="text-align:center;padding-bottom:26px"><a class="btn btn-primary" href="#/mapa">' + icon("map") + "Ir al mapa de parcelas</a></div></div>";
        bindPicker(lista);
        return;
      }
      body(lista, d);
    }

    function body(lista, d) {
      var p = d.parcela, pred = p.conjunto === "PREDICCION";
      var cl = d.clima;
      var estado = { indice: "ndvi", fuente: "S2" };
      host.innerHTML = picker(lista, p.id) +
        '<section class="card ficha-head" aria-label="Datos de la parcela"><div class="ficha-id"><span class="eyebrow">Parcela</span><div class="row"><h2>' + esc(p.id) + "</h2>" +
        '<span class="tag ' + (pred ? "tag-pred" : "tag-train") + '">' + icon(pred ? "dashed" : "solid") + (pred ? "Predicción" : "Entrenamiento") + "</span></div>" +
        '<span class="card-sub">' + esc(p.municipio) + ", " + esc(p.estado) + "</span></div>" +
        '<div class="ficha-stats"><div class="stat"><span>Área</span><strong class="num">' + fmt(p.area_ha, 1) + "<small>ha</small></strong></div>" +
        '<div class="stat"><span>Elevación</span><strong class="num">' + fmt(p.elevacion_m, 0) + "<small>m</small></strong></div>" +
        '<div class="stat"><span>Pendiente</span><strong class="num">' + fmt(p.pendiente_grados, 1) + "<small>grados</small></strong></div></div></section>" +

        '<section class="card pred-card" aria-label="Rendimiento de la parcela"><div class="pred-big"><span class="lbl">' + (pred ? "Rendimiento predicho" : "Rendimiento predicho (validación cruzada)") + '</span><span class="val num">' + fmt(p.rendimiento_pred, 2) + "<small>t/ha</small></span>" +
        (pred ? '<span class="obs-chip">' + icon("info") + "Sin medición en campo: es una parcela de predicción</span>"
          : '<span class="obs-chip">Observado <strong class="num">' + fmt(p.rendimiento_obs, 2) + '</strong> t/ha<span class="muted">· diferencia ' + UI.fmtSigned(p.rendimiento_obs - p.rendimiento_pred, 2) + "</span></span>") + "</div>" +
        intervalBar(p) + "</section>" +

        '<section class="card chart-card"><div class="card-head"><div><h2>Curva del índice satelital en 2025</h2><p id="ix-desc"></p></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end"><div class="seg" role="group" aria-label="Índice" id="seg-ix">' + INDICES.map(function (i) { return '<button type="button" data-v="' + i.id + '">' + i.nombre + "</button>"; }).join("") + "</div>" +
        '<div class="seg" role="group" aria-label="Fuente de imágenes" id="seg-fu">' + FUENTES.map(function (f) { return '<button type="button" data-v="' + f.id + '">' + f.nombre + "</button>"; }).join("") + "</div></div></div>" +
        '<div class="card-body"><div class="chart-box" id="ix-chart" style="min-height:260px"></div>' +
        '<div class="legend" style="margin-top:8px"><span class="legend-item"><span class="sw sw-dot" style="background:var(--bar);opacity:.8"></span><span id="lg-obs">Observaciones</span></span><span class="legend-item"><span class="sw sw-line" style="background:var(--bar-strong)"></span>Curva suavizada</span><span class="legend-item"><span class="sw sw-band"></span>Ciclo abril a octubre</span><span class="legend-item"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.200"/></svg>Pico del ciclo</span></div></div></section>' +

        '<section class="grid grid-2"><div class="card chart-card"><div class="card-head"><div><h2>Lluvia mensual</h2><p>Milímetros de lluvia por mes, abril a octubre.</p></div></div><div class="card-body"><div class="chart-box" id="c-prec"></div>' +
        '<div class="legend" style="margin-top:6px"><span class="legend-item"><span class="sw" style="background:var(--s-blue)"></span>Precipitación (mm)</span></div></div></div>' +
        '<div class="card chart-card"><div class="card-head"><div><h2>Temperaturas mensuales</h2><p>Promedio de la máxima y la mínima de cada mes.</p></div></div><div class="card-body"><div class="chart-box" id="c-temp"></div>' +
        '<div class="legend" style="margin-top:6px"><span class="legend-item"><span class="sw sw-line" style="background:var(--s-orange)"></span>Temperatura máxima (°C)</span><span class="legend-item"><span class="sw sw-line" style="background:var(--s-blue)"></span>Temperatura mínima (°C)</span></div></div></div></section>' +

        '<section class="card chart-card"><div class="card-head"><div><h2>¿Por qué esta predicción?</h2><p>Parte del rendimiento promedio de las parcelas (' + fmt(d.base, 2) + ' t/ha). Cada barra muestra cuánto sube o baja la predicción por el valor que tiene esta parcela en esa variable.</p></div></div>' +
        '<div class="card-body"><div class="legend" style="margin-bottom:12px"><span class="legend-item"><span class="sw" style="background:var(--up)"></span>▲ Sube la predicción</span><span class="legend-item"><span class="sw" style="background:var(--down)"></span>▼ Baja la predicción</span><span class="legend-item muted">Se muestran las 8 variables con más efecto. El eje no empieza en cero.</span></div>' +
        '<div class="chart-box" id="c-wf"></div></div></section>' +

        '<section class="card"><div class="card-head"><div><h2>Parcelas vecinas más cercanas</h2><p>Las 5 parcelas más próximas y su rendimiento.</p></div></div><div class="card-body" style="padding-top:8px"><div class="table-scroll" style="max-height:none">' + vecinos(d.vecinos) + "</div></div></section>";

      bindPicker(lista);
      var $ = function (s) { return host.querySelector(s); };

      function dibujaIndice() {
        var ix = INDICES.filter(function (i) { return i.id === estado.indice; })[0], fu = FUENTES.filter(function (f) { return f.id === estado.fuente; })[0];
        $("#ix-desc").textContent = ix.nombre + ": " + ix.txt;
        $("#lg-obs").textContent = "Observaciones (" + fu.nombre + ")";
        host.querySelectorAll("#seg-ix button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === estado.indice)); });
        host.querySelectorAll("#seg-fu button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === estado.fuente)); });
        var pts = d.serie.filter(function (s) { return s.indice === estado.indice && s.fuente === estado.fuente; });
        Charts.indexChart($("#ix-chart"), { points: pts, decimals: ix.dec, aria: "Curva de " + ix.nombre + " en 2025 para " + p.id + " con " + fu.nombre });
      }
      $("#seg-ix").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { estado.indice = b.dataset.v; dibujaIndice(); } });
      $("#seg-fu").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { estado.fuente = b.dataset.v; dibujaIndice(); } });
      dibujaIndice();

      var meses = ["Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"], largos = ["Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre"];
      Charts.vbar($("#c-prec"), { items: cl.map(function (c, i) { return { label: meses[i], tipTitle: largos[i], value: c.prec_mm }; }), unit: "mm", name: "Lluvia", aria: "Lluvia mensual de abril a octubre" });
      Charts.lineCat($("#c-temp"), {
        cats: meses, unit: "°C", aria: "Temperatura máxima y mínima mensual de abril a octubre",
        series: [{ name: "Máxima", short: "Máx", color: "var(--s-orange)", values: cl.map(function (c) { return c.tmax_c; }) },
          { name: "Mínima", short: "Mín", color: "var(--s-blue)", values: cl.map(function (c) { return c.tmin_c; }) }]
      });
      Charts.waterfall($("#c-wf"), {
        base: d.base, otras: d.shap_otras,
        items: d.shap.map(function (s) { return { etiqueta: s.etiqueta, valorTexto: valorTexto(s), contribucion: s.contribucion }; })
      });
    }

    function vecinos(v) {
      return '<table class="tbl"><thead><tr><th><button type="button" disabled style="cursor:default">Parcela</button></th><th><button type="button" disabled style="cursor:default">Municipio</button></th><th class="r"><button type="button" disabled style="cursor:default">Distancia</button></th><th class="r"><button type="button" disabled style="cursor:default">Rendimiento (t/ha)</button></th></tr></thead><tbody>' +
        v.map(function (n) {
          var pr = n.tipo === "predicho";
          return '<tr data-go="' + n.id + '" tabindex="0"><td class="id"><a href="#/parcela/' + n.id + '">' + n.id + "</a></td><td>" + esc(n.municipio) + '</td><td class="r num">' + fmt(n.distancia_km, 1) + ' km</td><td class="r"><span class="yv"><span class="dot' + (pr ? " dashed" : "") + '" style="background:' + UI.yieldColor(n.rendimiento) + '"></span><b class="num">' + fmt(n.rendimiento, 2) + '</b><span class="t">' + (pr ? "Pred." : "Obs.") + "</span></span></td></tr>";
        }).join("") + "</tbody></table>";
    }

    host.innerHTML = skeleton();
    App.getParcelas().then(function (lista) {
      if (destroyed) return;
      if (!id) { render(lista, null); return; }
      return CebaApi.parcela(id).then(function (d) {
        if (destroyed) return;
        App.elegirParcela(id);
        render(lista, d);
        host.addEventListener("click", function (e) {
          var tr = e.target.closest("tr[data-go]"); if (tr && !e.target.closest("a")) location.hash = "#/parcela/" + tr.dataset.go;
        });
      }, function (err) {
        if (destroyed) return;
        if (err && err.status === 404) { render(lista, null, 'No encontramos la parcela "' + id + '".'); return; }
        throw err;
      });
    }).catch(function (err) {
      if (destroyed) return;
      host.innerHTML = UI.errorState(err && err.message, true);
      var b = host.querySelector("[data-empty-action]"); if (b) b.addEventListener("click", function () { mount(host, params); });
    });
    return { destroy: function () { destroyed = true; } };
  }

  global.Views = global.Views || {};
  global.Views.parcela = { mount: mount };
})(window);
