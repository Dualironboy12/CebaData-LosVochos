/* Sección 1 · Mapa de parcelas */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt, icon = UI.icon;
  /* Mapa base oficial de OpenStreetMap. Requiere abrir la app por http(s), ver README. */
  var TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  var TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  var ZONAS = [
    { nombre: "Calpulalpan, Tlaxcala", estado: "Tlaxcala" },
    { nombre: "Singuilucan y Emiliano Zapata, Hidalgo", corto: "Singuilucan y Emiliano Zapata, Hgo.", estado: "Hidalgo" },
    { nombre: "Chignahuapan, Puebla", estado: "Puebla" }
  ];

  function skeleton() {
    return '<div class="grid grid-4">' + [1, 2, 3, 4].map(function () { return '<div class="card kpi" aria-busy="true">' + UI.skel(12, "60%") + UI.skel(28, "45%", "margin-top:6px") + UI.skel(10, "70%", "margin-top:6px") + "</div>"; }).join("") + "</div>" +
      '<div class="card filters" aria-busy="true">' + UI.skel(36, "100%") + "</div>" +
      '<div class="map-layout"><div class="card" style="min-height:560px">' + UI.skel(560) + '</div><div class="card" style="min-height:560px;padding:16px">' + UI.skel(14, "50%") + [1, 2, 3, 4, 5, 6, 7, 8].map(function () { return UI.skel(30, "100%", "margin-top:10px"); }).join("") + "</div></div>";
  }

  function mount(host) {
    host.innerHTML = skeleton();
    var map = null, destroyed = false, ro = null;

    Promise.all([App.getParcelas(), CebaApi.metricas()]).then(function (res) {
      if (destroyed) return;
      init(res[0], res[1]);
    }).catch(function (err) {
      host.innerHTML = UI.errorState(err && err.message, true);
      var b = host.querySelector("[data-empty-action]");
      if (b) b.addEventListener("click", function () { App._parcelas = null; mount(host); });
    });

    function init(data, met) {
      var st = App.state, F = st.filtros;
      var nObs = data.filter(function (p) { return p.conjunto === "ENTRENAMIENTO"; }).length;
      var nPred = data.length - nObs;
      var mean = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };
      var mObs = mean(data.filter(function (p) { return p.rendimiento_obs != null; }).map(function (p) { return p.rendimiento_obs; }));
      var mPred = mean(data.filter(function (p) { return p.conjunto === "PREDICCION"; }).map(function (p) { return p.rendimiento_pred; }));
      var estados = Array.from(new Set(data.map(function (p) { return p.estado; }))).sort();
      var markers = {}, shownIds = [], hlRing = null;

      host.innerHTML =
        '<section class="grid grid-4" aria-label="Indicadores generales">' +
        kpi("Parcelas", String(data.length), "", nObs + " con medición y " + nPred + " por predecir") +
        kpi("Rendimiento medio observado", fmt(mObs, 2), "t/ha", "Promedio de las " + nObs + " parcelas medidas") +
        kpi("Rendimiento medio predicho", fmt(mPred, 2), "t/ha", "Promedio de las " + nPred + " parcelas sin medición") +
        kpi("Error del modelo (RMSE)", fmt(met.validacion.rmse, 2), "t/ha", "Qué tanto se equivoca en promedio") +
        "</section>" +
        '<section class="card filters" role="group" aria-label="Filtros de parcelas">' +
        '<div class="field"><label for="f-estado">Estado</label><select id="f-estado" class="select"></select></div>' +
        '<div class="field"><label for="f-mun">Municipio</label><select id="f-mun" class="select"></select></div>' +
        '<div class="field"><label for="f-conj">Conjunto</label><select id="f-conj" class="select"><option value="">Todos los conjuntos</option><option value="ENTRENAMIENTO">Entrenamiento</option><option value="PREDICCION">Predicción</option></select></div>' +
        '<div class="field field-range"><div class="range-val"><span class="field-label" id="f-rng-l">Rango de rendimiento</span><span id="f-rng-v"></span></div>' +
        '<div class="dual"><div class="rail"></div><div class="fill" id="f-fill"></div>' +
        '<input type="range" id="f-min" min="' + UI.Y_MIN + '" max="' + UI.Y_MAX + '" step="0.1" aria-label="Rendimiento mínimo (t/ha)"><input type="range" id="f-max" min="' + UI.Y_MIN + '" max="' + UI.Y_MAX + '" step="0.1" aria-label="Rendimiento máximo (t/ha)"></div></div>' +
        '<button type="button" class="btn btn-quiet" id="f-clear">' + icon("x") + "Limpiar filtros</button>" +
        "</section>" +
        '<section class="map-layout">' +
        '<div class="card map-card"><div class="map-top">' +
        '<div class="seg" role="group" aria-label="Qué parcelas mostrar" id="seg-conj">' +
        '<button type="button" data-v="ENTRENAMIENTO">Observado (' + nObs + ')</button><button type="button" data-v="PREDICCION">Predicho (' + nPred + ')</button><button type="button" data-v="">Todas</button></div>' +
        '<div class="seg" role="group" aria-label="Colorear por" id="seg-color"><button type="button" data-v="rendimiento">Color: rendimiento</button><button type="button" data-v="riesgo">Color: riesgo</button></div>' +
        '</div>' +
        '<div class="map-wrap"><span class="map-count pill" id="count" aria-live="polite"></span><div id="map" role="application" aria-label="Mapa de parcelas. Usa la tabla de la derecha para recorrerlas con teclado."></div>' +
        '<div class="map-zones" id="zones"></div><div class="map-legend" id="legend"></div></div></div>' +
        '<aside class="card panel" aria-label="Tabla de parcelas"><div class="panel-head"><div><h2>Parcelas</h2><span class="card-sub" id="tbl-count"></span></div>' +
        '<button type="button" class="btn btn-sm" id="btn-csv">' + icon("download") + "Exportar CSV</button></div>" +
        '<div class="table-scroll" id="tbl-wrap"></div></aside></section>';

      var $ = function (s) { return host.querySelector(s); };
      var selEstado = $("#f-estado"), selMun = $("#f-mun"), selConj = $("#f-conj"), inMin = $("#f-min"), inMax = $("#f-max");

      /* ---------- mapa ---------- */
      map = L.map($("#map"), { zoomControl: false, zoomSnap: 0.25, minZoom: 8, maxZoom: 17, attributionControl: true });
      L.tileLayer(TILES, { maxZoom: 19, attribution: TILES_ATTR }).addTo(map);
      L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(map);
      var layer = L.layerGroup().addTo(map);
      var allBounds = L.latLngBounds(data.map(function (p) { return [p.lat, p.lon]; }));
      map.fitBounds(allBounds, { padding: [30, 30] });
      setTimeout(function () { map.invalidateSize(); map.fitBounds(allBounds, { padding: [30, 30] }); }, 60);
      if (global.ResizeObserver) { ro = new ResizeObserver(function () { map && map.invalidateSize(); }); ro.observe($("#map")); }

      /* zonas */
      $("#zones").innerHTML = ZONAS.map(function (z, i) {
        return '<button type="button" class="btn btn-sm" data-z="' + i + '">' + icon("pin") + esc(z.corto || z.nombre) + "</button>";
      }).join("") + '<button type="button" class="btn btn-sm" data-z="all">' + icon("layers") + "Ver todo</button>";
      $("#zones").addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (b.dataset.z === "all") { map.flyToBounds(allBounds, { padding: [30, 30], duration: .6 }); return; }
        var z = ZONAS[+b.dataset.z];
        var bb = L.latLngBounds(data.filter(function (p) { return p.estado === z.estado; }).map(function (p) { return [p.lat, p.lon]; }));
        map.flyToBounds(bb, { padding: [40, 40], duration: .6 });
      });

      /* ---------- filtros ---------- */
      function municipiosDe(estado) {
        return Array.from(new Set(data.filter(function (p) { return !estado || p.estado === estado; }).map(function (p) { return p.municipio; }))).sort();
      }
      function syncSelects() {
        selEstado.innerHTML = '<option value="">Todos los estados</option>' + estados.map(function (e) { return '<option value="' + esc(e) + '">' + esc(e) + "</option>"; }).join("");
        var muns = municipiosDe(F.estado);
        if (F.municipio && muns.indexOf(F.municipio) < 0) F.municipio = "";
        selMun.innerHTML = '<option value="">Todos los municipios</option>' + muns.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + "</option>"; }).join("");
        selEstado.value = F.estado; selMun.value = F.municipio; selConj.value = F.conjunto;
        inMin.value = F.min; inMax.value = F.max;
        var a = (F.min - UI.Y_MIN) / (UI.Y_MAX - UI.Y_MIN) * 100, b = (F.max - UI.Y_MIN) / (UI.Y_MAX - UI.Y_MIN) * 100;
        $("#f-fill").style.left = a + "%"; $("#f-fill").style.width = (b - a) + "%";
        $("#f-rng-v").textContent = fmt(F.min, 1) + " a " + fmt(F.max, 1) + " t/ha";
        host.querySelectorAll("#seg-conj button").forEach(function (b2) { b2.setAttribute("aria-pressed", String(b2.dataset.v === F.conjunto)); });
        host.querySelectorAll("#seg-color button").forEach(function (b2) { b2.setAttribute("aria-pressed", String(b2.dataset.v === st.colorPor)); });
      }
      function riesgoDe(p) { return UI.nivelRiesgo(p.rendimiento_pred, p.intervalo_inf, UI.equilibrio()); }
      function filtrar() {
        return data.filter(function (p) {
          if (F.estado && p.estado !== F.estado) return false;
          if (F.municipio && p.municipio !== F.municipio) return false;
          if (F.conjunto && p.conjunto !== F.conjunto) return false;
          var v = App.valorMostrado(p);
          if (F.min > UI.Y_MIN + 1e-9 && v < F.min - 1e-9) return false;
          if (F.max < UI.Y_MAX - 1e-9 && v > F.max + 1e-9) return false;
          if (st.colorPor === "riesgo" && st.nivelRiesgo && riesgoDe(p) !== st.nivelRiesgo) return false;
          return true;
        });
      }
      selEstado.addEventListener("change", function () { F.estado = selEstado.value; F.municipio = ""; refresh(true); });
      selMun.addEventListener("change", function () { F.municipio = selMun.value; refresh(true); });
      selConj.addEventListener("change", function () { F.conjunto = selConj.value; refresh(true); });
      inMin.addEventListener("input", function () { F.min = Math.min(+inMin.value, F.max); refresh(false); });
      inMax.addEventListener("input", function () { F.max = Math.max(+inMax.value, F.min); refresh(false); });
      inMin.addEventListener("change", function () { refresh(true); }); inMax.addEventListener("change", function () { refresh(true); });
      $("#f-clear").addEventListener("click", function () { limpiar(); });
      $("#seg-conj").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; F.conjunto = b.dataset.v; refresh(true); });
      $("#seg-color").addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        st.colorPor = b.dataset.v; if (st.colorPor === "rendimiento") st.nivelRiesgo = null; refresh(false);
      });
      function limpiar() { F.estado = ""; F.municipio = ""; F.conjunto = ""; F.min = UI.Y_MIN; F.max = UI.Y_MAX; st.nivelRiesgo = null; refresh(true); }

      /* ---------- marcadores ---------- */
      function tipMapa(p) {
        var pred = p.conjunto === "PREDICCION";
        var h = "<b>" + esc(p.id) + "</b> · " + esc(p.municipio) + "<br>";
        h += pred ? "Predicho: <b>" + fmt(p.rendimiento_pred, 2) + "</b> t/ha<br><span style='color:var(--ink-3)'>Intervalo " + fmt(p.intervalo_inf, 2) + " a " + fmt(p.intervalo_sup, 2) + "</span>"
          : "Observado: <b>" + fmt(p.rendimiento_obs, 2) + "</b> t/ha";
        h += "<br><span style='color:var(--ink-3)'>" + (pred ? "Parcela de predicción" : "Parcela de entrenamiento") + "</span>";
        if (st.colorPor === "riesgo") { var n = UI.NIVELES[riesgoDe(p)]; h += "<br><b>" + n.etiqueta + "</b>"; }
        return h;
      }
      function shapeIcon(p) {
        var n = riesgoDe(p), c = UI.NIVELES[n].color, dash = p.conjunto === "PREDICCION" ? ' stroke-dasharray="3 2.2"' : "";
        var s = 22, inner;
        if (n === "bajo") inner = '<circle cx="11" cy="11" r="8" fill="' + c + '" stroke="#16211a" stroke-width="2"' + dash + "/>";
        else if (n === "medio") inner = '<path d="M11 2.500 20 18.500H2z" fill="' + c + '" stroke="#16211a" stroke-width="2" stroke-linejoin="round"' + dash + "/>";
        else inner = '<rect x="4" y="4" width="14" height="14" rx="1.500" transform="rotate(45 11 11)" fill="' + c + '" stroke="#16211a" stroke-width="2"' + dash + "/>";
        return L.divIcon({ className: "", html: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 22 22">' + inner + "</svg>", iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
      }
      function pintar(list) {
        layer.clearLayers(); markers = {};
        list.forEach(function (p) {
          var pred = p.conjunto === "PREDICCION", m;
          if (st.colorPor === "riesgo") m = L.marker([p.lat, p.lon], { icon: shapeIcon(p), keyboard: false });
          else m = L.circleMarker([p.lat, p.lon], { radius: 8, fillColor: UI.yieldColor(App.valorMostrado(p)), fillOpacity: .95, color: "#16211a", weight: pred ? 2 : 1.2, dashArray: pred ? "3 3" : null });
          m.bindTooltip(tipMapa(p), { sticky: true, className: "cb-tt", direction: "top", offset: [0, -8] });
          m.on("click", function () { App.elegirParcela(p.id); location.hash = "#/parcela/" + p.id; });
          m.addTo(layer); markers[p.id] = m;
        });
      }
      function resaltar(id) {
        if (hlRing) { map.removeLayer(hlRing); hlRing = null; }
        var p = id && markers[id]; if (!p) return;
        hlRing = L.circleMarker(p.getLatLng(), { radius: 15, fill: false, color: "#111", weight: 3, interactive: false }).addTo(map);
      }

      /* ---------- leyenda ---------- */
      function leyenda(list) {
        var el = $("#legend");
        if (st.colorPor === "riesgo") {
          var be = UI.equilibrio(), cnt = { bajo: 0, medio: 0, alto: 0 };
          data.forEach(function (p) { cnt[riesgoDe(p)]++; });
          el.innerHTML = "<h4>Riesgo crediticio</h4>" + ["bajo", "medio", "alto"].map(function (n) {
            var N = UI.NIVELES[n], sh = n === "bajo" ? '<circle cx="9" cy="9" r="6.500"/>' : n === "medio" ? '<path d="M9 2 16 15H2z" stroke-linejoin="round"/>' : '<rect x="3.500" y="3.500" width="11" height="11" rx="1" transform="rotate(45 9 9)"/>';
            return '<button type="button" class="key" data-n="' + n + '" aria-pressed="' + (st.nivelRiesgo === n) + '"><svg width="18" height="18" viewBox="0 0 18 18" fill="' + N.color + '" stroke="#16211a" stroke-width="1.6">' + sh + "</svg><span>" + N.etiqueta + " <b>(" + cnt[n] + ")</b></span></button>";
          }).join("") + '<div class="key"><span class="key-dot dashed" style="background:transparent"></span><span>Borde punteado: parcela predicha</span></div><div class="key" style="display:block;margin-top:8px;color:var(--ink-3)">Equilibrio: <b style="color:var(--ink)">' + fmt(be, 2) + ' t/ha</b>. <a href="#/simulador">Editar precio y costo</a></div>';
        } else {
          el.innerHTML = "<h4>Rendimiento (t/ha)</h4>" + '<div class="ramp" style="background:' + UI.rampCss() + '"></div><div class="ramp-ticks"><span>2.0</span><span>3.0</span><span>4.0</span><span>5.0</span><span>5.6</span></div>' +
            '<div class="key"><span class="key-dot"></span><span>Relleno sólido: observado</span></div><div class="key"><span class="key-dot dashed"></span><span>Borde punteado: predicho</span></div>';
        }
      }
      $("#legend").addEventListener("click", function (e) {
        var b = e.target.closest("button[data-n]"); if (!b) return;
        st.nivelRiesgo = st.nivelRiesgo === b.dataset.n ? null : b.dataset.n; refresh(true);
      });

      /* ---------- tabla ---------- */
      var COLS = [
        { k: "id", t: "ID", get: function (p) { return p.id; } },
        { k: "municipio", t: "Municipio", get: function (p) { return p.municipio; } },
        { k: "area", t: "Área (ha)", r: true, get: function (p) { return p.area_ha; } },
        { k: "rend", t: "Rend. (t/ha)", r: true, get: function (p) { return App.valorMostrado(p); } },
        { k: "int", t: "Intervalo", r: true, get: function (p) { return p.conjunto === "PREDICCION" ? p.intervalo_inf : -1; } }
      ];
      function tabla(list) {
        var wrap = $("#tbl-wrap");
        $("#tbl-count").textContent = list.length + " de " + data.length;
        if (!list.length) {
          wrap.innerHTML = UI.emptyState({ icono: "search", titulo: "No hay parcelas con estos filtros", texto: "Prueba ampliando el rango de rendimiento o quitando algún filtro.", boton: "Limpiar filtros" });
          wrap.querySelector("[data-empty-action]").addEventListener("click", limpiar);
          return;
        }
        var col = COLS.filter(function (c) { return c.k === st.orden.col; })[0] || COLS[0], dir = st.orden.dir;
        var rows = list.slice().sort(function (a, b) {
          var x = col.get(a), y = col.get(b);
          var c = typeof x === "string" ? x.localeCompare(y, "es") : x - y;
          return (c || a.id.localeCompare(b.id)) * dir;
        });
        var riesgo = st.colorPor === "riesgo";
        var h = '<table class="tbl' + (riesgo ? ' tbl-risk' : '') + '"><caption class="sr-only">Parcelas visibles. Haz clic en un encabezado para ordenar.</caption><thead><tr>' + COLS.map(function (c) {
          var last = c.k === "int" && riesgo;
          var sorted = c.k === st.orden.col ? (dir > 0 ? "ascending" : "descending") : "none";
          return '<th class="' + (c.r ? "r" : "") + '" aria-sort="' + sorted + '"><button type="button" data-sort="' + c.k + '">' + (last ? "Riesgo" : c.t) + (last ? "" : icon(sorted === "none" ? "sort" : sorted === "ascending" ? "up" : "down")) + "</button></th>";
        }).join("") + "</tr></thead><tbody>";
        rows.forEach(function (p) {
          var pred = p.conjunto === "PREDICCION", v = App.valorMostrado(p);
          h += '<tr tabindex="0" data-id="' + p.id + '"><td class="id"><a href="#/parcela/' + p.id + '">' + p.id + "</a></td>" +
            '<td title="' + esc(p.municipio + ", " + p.estado) + '">' + esc(p.municipio) + '</td><td class="r num">' + fmt(p.area_ha, 1) + "</td>" +
            '<td class="r"><span class="yv"><span class="dot' + (pred ? " dashed" : "") + '" style="background:' + UI.yieldColor(v) + '"></span><b class="num">' + fmt(v, 2) + '</b><span class="t">' + (pred ? "Pred." : "Obs.") + "</span></span></td>" +
            '<td class="r num">' + (riesgo ? UI.riesgoBadge(riesgoDe(p)) : pred ? fmt(p.intervalo_inf, 2) + " – " + fmt(p.intervalo_sup, 2) : '<span class="muted" title="Parcela medida en campo">–</span>') + "</td></tr>";
        });
        wrap.innerHTML = h + "</tbody></table>";
      }
      $("#tbl-wrap").addEventListener("click", function (e) {
        var sb = e.target.closest("[data-sort]");
        if (sb) { var k = sb.dataset.sort; if (k === "int" && st.colorPor === "riesgo") return; st.orden = { col: k, dir: st.orden.col === k ? -st.orden.dir : 1 }; tabla(shownList); return; }
        var tr = e.target.closest("tr[data-id]"); if (!tr) return;
        App.elegirParcela(tr.dataset.id); location.hash = "#/parcela/" + tr.dataset.id;
      });
      $("#tbl-wrap").addEventListener("keydown", function (e) {
        var tr = e.target.closest("tr[data-id]");
        if (tr && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); App.elegirParcela(tr.dataset.id); location.hash = "#/parcela/" + tr.dataset.id; }
      });
      $("#tbl-wrap").addEventListener("pointerover", function (e) { var tr = e.target.closest("tr[data-id]"); resaltar(tr && tr.dataset.id); });
      $("#tbl-wrap").addEventListener("focusin", function (e) { var tr = e.target.closest("tr[data-id]"); resaltar(tr && tr.dataset.id); });
      $("#tbl-wrap").addEventListener("pointerleave", function () { resaltar(null); });
      $("#btn-csv").addEventListener("click", function () {
        UI.descargarCSV("cebadata_parcelas.csv", shownList, [
          { titulo: "id", valor: function (p) { return p.id; } }, { titulo: "estado", valor: function (p) { return p.estado; } },
          { titulo: "municipio", valor: function (p) { return p.municipio; } }, { titulo: "area_ha", valor: function (p) { return p.area_ha; } },
          { titulo: "conjunto", valor: function (p) { return p.conjunto; } }, { titulo: "rendimiento_obs", valor: function (p) { return p.rendimiento_obs; } },
          { titulo: "rendimiento_pred", valor: function (p) { return p.rendimiento_pred; } }, { titulo: "intervalo_inf", valor: function (p) { return p.intervalo_inf; } },
          { titulo: "intervalo_sup", valor: function (p) { return p.intervalo_sup; } }, { titulo: "lat", valor: function (p) { return p.lat; } },
          { titulo: "lon", valor: function (p) { return p.lon; } }, { titulo: "elevacion_m", valor: function (p) { return p.elevacion_m; } },
          { titulo: "pendiente_grados", valor: function (p) { return p.pendiente_grados; } },
          { titulo: "riesgo_crediticio", valor: function (p) { return riesgoDe(p); } }
        ]);
      });

      /* ---------- refresco ---------- */
      var shownList = [];
      function refresh(ajustar) {
        syncSelects();
        shownList = filtrar();
        pintar(shownList);
        leyenda(shownList);
        tabla(shownList);
        $("#count").textContent = "Mostrando " + shownList.length + " de " + data.length + " parcelas";
        if (ajustar && shownList.length) {
          var bb = L.latLngBounds(shownList.map(function (p) { return [p.lat, p.lon]; }));
          map.flyToBounds(bb, { padding: [40, 40], maxZoom: 13, duration: .5 });
        }
      }
      refresh(false);
    }

    function kpi(l, v, u, n) {
      return '<div class="card kpi"><span class="kpi-label">' + esc(l) + '</span><span class="kpi-value">' + esc(v) + (u ? "<small>" + esc(u) + "</small>" : "") + '</span><span class="kpi-note">' + esc(n) + "</span></div>";
    }

    return { destroy: function () { destroyed = true; if (ro) ro.disconnect(); if (map) { map.remove(); map = null; } } };
  }

  global.Views = global.Views || {};
  global.Views.mapa = { mount: mount };
})(window);
