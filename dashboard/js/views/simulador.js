/* Sección 5 · Simulador y riesgo crediticio */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt, icon = UI.icon;

  function skeleton() {
    return '<div class="card skel-card" style="min-height:340px">' + UI.skel(16, "35%") + UI.skel(200, "100%", "margin-top:16px") + "</div>" + '<div class="card skel-card" style="min-height:420px">' + UI.skel(16, "35%") + UI.skel(300, "100%", "margin-top:16px") + "</div>";
  }

  function mount(host) {
    var destroyed = false;
    host.innerHTML = skeleton();
    App.getParcelas().then(function (lista) { if (!destroyed) init(lista); }).catch(function (err) {
      if (destroyed) return;
      host.innerHTML = UI.errorState(err && err.message, true);
      var b = host.querySelector("[data-empty-action]"); if (b) b.addEventListener("click", function () { App._parcelas = null; mount(host); });
    });

    function init(lista) {
      var st = App.state;
      var porId = {}; lista.forEach(function (p) { porId[p.id] = p; });
      var actual = porId[st.parcelaId] ? st.parcelaId : "AGC_003";
      var ultimo = null, aplicado = { dl: 0, dt: 0 };
      var nivelSel = null;

      host.innerHTML =
        '<section class="card" aria-labelledby="h-sim"><div class="card-head"><div><h2 id="h-sim">Simulador de escenarios</h2><p>Mira cómo cambiaría la predicción de una parcela si la lluvia de mayo o la temperatura mínima de abril fueran distintas.</p></div></div>' +
        '<div class="scn" style="margin-top:14px;border-top:1px solid var(--line)"><div class="scn-controls">' +
        '<div class="field"><label for="sim-p">Parcela (ID o municipio)</label><input id="sim-p" class="input" list="sim-list" autocomplete="off" value="' + esc(actual) + '" placeholder="Ej. AGC_003"><datalist id="sim-list">' +
        lista.map(function (p) { return '<option value="' + p.id + '">' + esc(p.municipio + " · " + (p.conjunto === "PREDICCION" ? "Predicción" : "Entrenamiento")) + "</option>"; }).join("") + '</datalist><span class="field-err" id="sim-err" role="alert" hidden></span></div>' +
        '<div class="slider-field"><div class="slider-head"><label for="sl-l" class="field-label">Lluvia de mayo (variación %)</label><output id="o-l" for="sl-l">0 %</output></div><input type="range" id="sl-l" min="-40" max="40" step="1" value="0"><div class="slider-scale"><span>−40 %</span><span>0</span><span>+40 %</span></div></div>' +
        '<div class="slider-field"><div class="slider-head"><label for="sl-t" class="field-label">Temperatura mínima de abril (variación en °C)</label><output id="o-t" for="sl-t">0.0 °C</output></div><input type="range" id="sl-t" min="-2" max="2" step="0.1" value="0"><div class="slider-scale"><span>−2 °C</span><span>0</span><span>+2 °C</span></div></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="btn btn-primary" id="btn-calc">' + icon("refresh") + 'Recalcular</button><button type="button" class="btn btn-quiet" id="btn-reset">Restablecer</button><span class="stale" id="stale" hidden>' + icon("warn") + "Cambios sin aplicar</span></div>" +
        '<p class="card-sub" style="margin-top:-6px">Los cambios se aplican al pulsar Recalcular.</p></div>' +
        '<div class="scn-result" id="sim-res" aria-live="polite">' + UI.skel(200) + "</div></div></section>" +

        '<section class="card" aria-labelledby="h-risk"><div class="card-head"><div><h2 id="h-risk">Riesgo crediticio por parcela</h2><p>Compara lo que se espera que rinda cada parcela contra lo que necesita rendir para cubrir sus costos.</p></div></div>' +
        '<div class="risk-grid" style="margin-top:14px;border-top:1px solid var(--line)"><div class="risk-inputs">' +
        '<div class="callout">' + icon("pencil") + "<div><strong>Valores de ejemplo, puedes editarlos.</strong> Cambia el precio y el costo por los que quieras evaluar.</div></div>" +
        '<div class="field"><label for="r-precio">Precio por tonelada (MXN)</label><div class="input-wrap"><span class="pre">$</span><input id="r-precio" class="input num" type="number" inputmode="decimal" min="1" step="50" value="' + st.riesgo.precio + '"><span class="edit">' + icon("pencil") + "Editable</span></div></div>" +
        '<div class="field"><label for="r-costo">Costo de producción por hectárea (MXN)</label><div class="input-wrap"><span class="pre">$</span><input id="r-costo" class="input num" type="number" inputmode="decimal" min="1" step="500" value="' + st.riesgo.costo + '"><span class="edit">' + icon("pencil") + "Editable</span></div></div>" +
        '<span class="field-err" id="r-err" role="alert" hidden></span>' +
        '<div class="be-box"><div class="lbl">Rendimiento de equilibrio</div><div class="val num" id="be-val"></div><div class="fx" id="be-fx"></div></div></div>' +
        '<div class="risk-main"><div id="risk-sum"></div><div class="risk-tools"><span class="card-sub" id="risk-count"></span><button type="button" class="btn btn-sm" id="btn-map">' + icon("map") + 'Ver en el mapa</button></div><div class="risk-list" id="risk-list"></div></div></div>' +
        '<p class="risk-note"><strong>Herramienta de apoyo; no sustituye la evaluación crediticia.</strong> El nivel de riesgo se calcula con la predicción de cada parcela y su intervalo, no con su historial ni su situación financiera.</p></section>';

      var $ = function (s) { return host.querySelector(s); };
      var inP = $("#sim-p"), slL = $("#sl-l"), slT = $("#sl-t");

      /* ---------- simulador ---------- */
      function etiquetas() {
        var dl = +slL.value, dt = +slT.value;
        $("#o-l").textContent = UI.fmtSigned(dl, 0).replace("−", "−") + " %";
        $("#o-t").textContent = UI.fmtSigned(dt, 1) + " °C";
        var sucio = !ultimo || dl !== aplicado.dl || dt !== aplicado.dt;
        $("#stale").hidden = !sucio || !ultimo;
      }
      function fila(nombre, sub, r, clase) {
        return '<div class="cmp-row"><div class="nm">' + nombre + "<small>" + sub + '</small></div><div class="cmp-val"><strong class="num">' + fmt(r.pred, 2) + "</strong><span>t/ha · intervalo " + fmt(r.inf, 2) + " a " + fmt(r.sup, 2) + "</span></div></div>";
      }
      function miniChart(r, be) {
        var vals = [r.base.inf, r.base.sup, r.escenario.inf, r.escenario.sup, be];
        var lo = Math.floor(Math.min.apply(null, vals) * 2) / 2 - 0.5, hi = Math.ceil(Math.max.apply(null, vals) * 2) / 2 + 0.5;
        var P = function (v) { return ((v - lo) / (hi - lo) * 100).toFixed(2); };
        var ticks = ""; for (var t = Math.ceil(lo); t <= hi; t++) ticks += '<span style="left:' + P(t) + '%">' + t + "</span>";
        function row(nom, x, col) {
          var tp = Charts.tip(nom, [{ t: "Predicción: <b>" + fmt(x.pred, 2) + "</b> t/ha" }, { t: "Intervalo: " + fmt(x.inf, 2) + " a " + fmt(x.sup, 2) }]);
          return '<div class="cmp-row" style="margin:8px 0"><div class="nm">' + nom + '</div><div class="mtrack" tabindex="0" data-tip="' + esc(tp) + '"><div class="mrange" style="left:' + P(x.inf) + "%;width:" + (P(x.sup) - P(x.inf)).toFixed(2) + "%;background:" + col + '"></div><div class="mpt" style="left:' + P(x.pred) + '%"></div></div></div>';
        }
        return '<div class="mchart" style="position:relative">' + (isNaN(be) ? "" : '<div class="mref' + (P(be) > 70 ? " end" : "") + '" style="left:calc(94px + (100% - 94px) * ' + (P(be) / 100) + ')"><span>Equilibrio ' + fmt(be, 2) + "</span></div>") +
          row("Base", r.base, "var(--bar-mute)") + row("Escenario", r.escenario, "var(--bar)") +
          '<div class="cmp-row" style="margin:0"><div></div><div class="mticks">' + ticks + "</div></div></div>" +
          '<div class="legend"><span class="legend-item"><span class="sw" style="background:var(--bar-mute);height:10px;width:22px;border-radius:5px"></span>Intervalo base</span><span class="legend-item"><span class="sw" style="background:var(--bar);height:10px;width:22px;border-radius:5px"></span>Intervalo del escenario</span><span class="legend-item"><span class="sw" style="background:var(--ink);width:3px;height:14px;border-radius:2px"></span>Predicción</span><span class="legend-item"><span style="display:inline-block;width:0;height:14px;border-left:2px dashed var(--ink-2)"></span>Equilibrio (t/ha)</span></div>';
      }
      function pintaResultado(r) {
        var p = porId[r.id], be = UI.equilibrio();
        var d = r.diferencia, cls = d > 0.004 ? "up" : d < -0.004 ? "down" : "";
        var aviso = "";
        if (r.fuera_de_rango.length) {
          aviso = '<div class="callout callout-warn" role="alert">' + icon("warn") + "<div><strong>El escenario sale del rango observado en los datos de entrenamiento.</strong> " +
            r.fuera_de_rango.map(function (f) { return esc(f.etiqueta) + " de " + fmt(f.valor, f.unidad === "°C" ? 1 : 0) + " " + f.unidad + " queda fuera del rango visto (" + fmt(f.min, f.unidad === "°C" ? 1 : 0) + " a " + fmt(f.max, f.unidad === "°C" ? 1 : 0) + " " + f.unidad + ")."; }).join(" ") +
            " Toma el resultado con más cautela: el modelo no aprendió con valores así.</div></div>";
        }
        var nb = UI.nivelRiesgo(r.base.pred, r.base.inf, be), ne = UI.nivelRiesgo(r.escenario.pred, r.escenario.inf, be);
        var riesgo = isNaN(be) ? "" : '<div class="callout">' + icon("info") + "<div>Con el precio y costo de abajo (equilibrio " + fmt(be, 2) + " t/ha): " + UI.riesgoBadge(nb) + " con la predicción base" + (ne !== nb ? ", " + UI.riesgoBadge(ne) + " con el escenario." : "; el escenario no cambia el nivel.") + "</div></div>";
        var e = r.entradas;
        $("#sim-res").innerHTML =
          '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><h3 style="font-size:14px">Resultado para <a href="#/parcela/' + p.id + '">' + p.id + "</a> · " + esc(p.municipio) + ", " + esc(p.estado) + "</h3></div>" +
          fila("Base", "sin cambios", r.base) + fila("Escenario", "con tus cambios", r.escenario) +
          '<div><span class="diff-chip ' + cls + '">' + icon(d > 0.004 ? "up" : d < -0.004 ? "down" : "check") + "Diferencia " + UI.fmtSigned(d, 2) + " t/ha (" + UI.fmtSigned(r.diferencia_pct, 1) + " %)</span></div>" +
          aviso + miniChart(r, be) +
          '<p class="card-sub">Lluvia de mayo: <b class="num">' + fmt(e.lluvia_mayo_base, 0) + " mm</b> → <b class=\"num\">" + fmt(e.lluvia_mayo_escenario, 0) + " mm</b> · Temperatura mínima de abril: <b class=\"num\">" + fmt(e.tmin_abril_base, 1) + " °C</b> → <b class=\"num\">" + fmt(e.tmin_abril_escenario, 1) + " °C</b></p>" + riesgo;
      }
      function simular() {
        var btn = $("#btn-calc"); btn.disabled = true; btn.lastChild.textContent = "Calculando…";
        var body = { id: actual, delta_lluvia_mayo_pct: +slL.value, delta_tmin_abril_c: +slT.value };
        return CebaApi.simular(body).then(function (r) {
          if (destroyed) return;
          ultimo = r; aplicado = { dl: body.delta_lluvia_mayo_pct, dt: body.delta_tmin_abril_c };
          pintaResultado(r); etiquetas(); resaltarLista();
        }).catch(function (err) {
          if (destroyed) return;
          $("#sim-res").innerHTML = UI.errorState(err && err.message, false);
        }).then(function () { btn.disabled = false; btn.lastChild.textContent = "Recalcular"; });
      }
      function elegir(token) {
        var q = String(token).trim().toUpperCase().replace(/\s.*/, "");
        if (/^\d{1,3}$/.test(q)) q = "AGC_" + ("00" + q).slice(-3);
        var err = $("#sim-err");
        if (!porId[q]) { err.hidden = false; err.textContent = 'No encontramos "' + token.trim() + '". Prueba con un ID como AGC_003.'; return; }
        err.hidden = true; actual = q; inP.value = q; App.elegirParcela(q);
        slL.value = 0; slT.value = 0; ultimo = null; etiquetas();
        $("#sim-res").innerHTML = UI.skel(200);
        simular();
      }
      inP.addEventListener("change", function () { elegir(inP.value); });
      inP.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); elegir(inP.value); } });
      slL.addEventListener("input", etiquetas); slT.addEventListener("input", etiquetas);
      $("#btn-calc").addEventListener("click", simular);
      $("#btn-reset").addEventListener("click", function () { slL.value = 0; slT.value = 0; etiquetas(); simular(); });

      /* ---------- riesgo ---------- */
      function calcularRiesgo() {
        var be = UI.equilibrio();
        return lista.map(function (p) { return { p: p, n: UI.nivelRiesgo(p.rendimiento_pred, p.intervalo_inf, be), margen: p.intervalo_inf - be }; });
      }
      function pintaRiesgo() {
        var pr = st.riesgo, be = UI.equilibrio(), errEl = $("#r-err");
        if (!(pr.precio > 0) || !(pr.costo > 0)) return;
        $("#be-val").innerHTML = fmt(be, 2) + "<small>t/ha</small>";
        $("#be-fx").textContent = UI.fmtMXN(pr.costo) + " ÷ " + UI.fmtMXN(pr.precio) + " por tonelada";
        errEl.hidden = true;
        var rows = calcularRiesgo(), cnt = { bajo: 0, medio: 0, alto: 0 };
        rows.forEach(function (r) { cnt[r.n]++; });
        var tot = rows.length;
        $("#risk-sum").innerHTML = '<div class="risk-cards" role="group" aria-label="Filtrar por nivel de riesgo">' + ["bajo", "medio", "alto"].map(function (n) {
          var N = UI.NIVELES[n];
          return '<button type="button" class="rcard ' + N.cls + '" data-n="' + n + '" aria-pressed="' + (nivelSel === n) + '"><span class="head">' + icon(N.icono) + N.etiqueta + '</span><span class="n num">' + cnt[n] + "<small>de " + tot + " parcelas</small></span><span class=\"rule\">" + esc(N.regla) + "</span></button>";
        }).join("") + '</div><div class="stackbar" role="img" aria-label="Proporción de parcelas por nivel de riesgo: ' + cnt.bajo + " bajo, " + cnt.medio + " medio, " + cnt.alto + ' alto">' +
          ["bajo", "medio", "alto"].map(function (n) { var c = n === "bajo" ? "low" : n === "medio" ? "mid" : "high"; return cnt[n] ? '<span class="' + c + '" style="width:' + (cnt[n] / tot * 100) + '%"></span>' : ""; }).join("") + "</div>";
        var vis = rows.filter(function (r) { return !nivelSel || r.n === nivelSel; }).sort(function (a, b) { return a.margen - b.margen || a.p.id.localeCompare(b.p.id); });
        $("#risk-count").textContent = nivelSel ? vis.length + " parcelas con " + UI.NIVELES[nivelSel].etiqueta.toLowerCase() : "Las " + tot + " parcelas, de menor a mayor margen";
        $("#btn-map").lastChild.textContent = nivelSel ? "Ver " + UI.NIVELES[nivelSel].etiqueta.toLowerCase() + " en el mapa" : "Ver en el mapa";
        $("#risk-list").innerHTML = '<table class="tbl"><caption class="sr-only">Parcelas con su nivel de riesgo crediticio</caption><thead><tr><th><button type="button" disabled style="cursor:default">Parcela</button></th><th><button type="button" disabled style="cursor:default">Municipio</button></th><th class="r"><button type="button" disabled style="cursor:default">Predicho</button></th><th class="r"><button type="button" disabled style="cursor:default">Límite inferior</button></th><th class="r"><button type="button" disabled style="cursor:default">Margen vs. equilibrio</button></th><th><button type="button" disabled style="cursor:default">Riesgo</button></th></tr></thead><tbody>' +
          vis.map(function (r) {
            var p = r.p;
            return '<tr data-id="' + p.id + '" tabindex="0"><td class="id"><a href="#/parcela/' + p.id + '">' + p.id + "</a></td><td>" + esc(p.municipio) + '</td><td class="r num">' + fmt(p.rendimiento_pred, 2) + '</td><td class="r num">' + fmt(p.intervalo_inf, 2) + '</td><td class="r num">' + UI.fmtSigned(r.margen, 2) + "</td><td>" + UI.riesgoBadge(r.n) + "</td></tr>";
          }).join("") + "</tbody></table>";
        resaltarLista();
      }
      function resaltarLista() {
        host.querySelectorAll("#risk-list tr.is-hl").forEach(function (t) { t.classList.remove("is-hl"); });
        var tr = host.querySelector('#risk-list tr[data-id="' + actual + '"]'); if (tr) tr.classList.add("is-hl");
      }
      function leerEntradas() {
        var pv = parseFloat($("#r-precio").value), cv = parseFloat($("#r-costo").value), errEl = $("#r-err");
        if (!(pv > 0) || !(cv > 0)) {
          errEl.hidden = false; errEl.textContent = "Escribe un precio y un costo mayores a cero para calcular el riesgo.";
          return;
        }
        st.riesgo = { precio: pv, costo: cv }; App.guardarRiesgo();
        pintaRiesgo();
        if (ultimo) pintaResultado(ultimo);
      }
      var leerDeb = UI.debounce(leerEntradas, 140);
      $("#r-precio").addEventListener("input", leerDeb); $("#r-costo").addEventListener("input", leerDeb);
      $("#risk-sum").addEventListener("click", function (e) { var b = e.target.closest("button[data-n]"); if (!b) return; nivelSel = nivelSel === b.dataset.n ? null : b.dataset.n; pintaRiesgo(); });
      $("#risk-list").addEventListener("click", function (e) { var tr = e.target.closest("tr[data-id]"); if (tr && !e.target.closest("a")) elegir(tr.dataset.id); });
      $("#btn-map").addEventListener("click", function () { st.colorPor = "riesgo"; st.nivelRiesgo = nivelSel; location.hash = "#/mapa"; });

      etiquetas(); pintaRiesgo(); simular();
    }
    return { destroy: function () { destroyed = true; } };
  }

  global.Views = global.Views || {};
  global.Views.simulador = { mount: mount };
})(window);
