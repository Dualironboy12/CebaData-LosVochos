/* Sección 3 · Desempeño del modelo */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt, icon = UI.icon;

  var SUB = { CRC: "Residuos de cultivo en el suelo", NDTI: "Labranza y residuos", MSI: "Estrés de humedad", NDDI: "Señal de sequía", NDWI: "Agua en las hojas", LAI: "Densidad de hojas", NDVI: "Verdor del cultivo" };
  var GRUPOS = {
    Puebla: { nombre: "Puebla", color: "var(--st-puebla)", forma: "circulo" },
    Hidalgo: { nombre: "Hidalgo", color: "var(--st-hidalgo)", forma: "cuadro" },
    Tlaxcala: { nombre: "Tlaxcala", color: "var(--st-tlaxcala)", forma: "triangulo" }
  };
  function shapeSvg(g) {
    var s = g.forma === "circulo" ? '<circle cx="7" cy="7" r="5"/>' : g.forma === "cuadro" ? '<rect x="2" y="2" width="10" height="10" rx="1.500"/>' : '<path d="M7 1.500 13 12H1z" stroke-linejoin="round"/>';
    return '<svg width="14" height="14" viewBox="0 0 14 14" fill="' + g.color + '" aria-hidden="true">' + s + "</svg>";
  }

  function skeleton() {
    return '<div class="grid grid-3">' + UI.skelCard(70) + UI.skelCard(70) + UI.skelCard(70) + "</div>" +
      '<div class="grid grid-2">' + UI.skelCard(220) + UI.skelCard(220) + "</div><div class=\"grid grid-2\">" + UI.skelCard(320) + UI.skelCard(320) + "</div>" + UI.skelCard(200);
  }

  function mount(host) {
    var destroyed = false;
    host.innerHTML = skeleton();
    CebaApi.metricas().then(function (m) {
      if (destroyed) return;
      render(m);
    }).catch(function (err) {
      if (destroyed) return;
      host.innerHTML = UI.errorState(err && err.message, true);
      var b = host.querySelector("[data-empty-action]"); if (b) b.addEventListener("click", function () { mount(host); });
    });

    function render(m) {
      var v = m.validacion, mejora = Math.round((v.baseline.rmse - v.rmse) / v.baseline.rmse * 100);
      var minRmse = Math.min.apply(null, m.modelos.filter(function (x) { return !x.referencia; }).map(function (x) { return x.rmse; }));
      host.innerHTML =
        '<div class="callout">' + icon("info") + "<div><strong>" + esc(v.esquema) + ".</strong> Cada parcela se predice con un modelo que no la vio al entrenarse, así que estas cifras reflejan cómo se comporta con parcelas nuevas.</div></div>" +
        '<section class="grid grid-3" aria-label="Métricas de validación">' +
        metric("RMSE", fmt(v.rmse, 3), "t/ha", "Error típico de la predicción. Entre menor, mejor.",
          '<span class="gain">' + icon("down") + mejora + " % menos error</span><span>que " + esc(v.baseline.nombre.toLowerCase()) + " (RMSE " + fmt(v.baseline.rmse, 3) + ")</span>") +
        metric("MAE", fmt(v.mae, 3), "t/ha", "Cuánto se desvía la predicción en promedio, sin castigar más los errores grandes.",
          "<span>En una parcela típica, el modelo se desvía unas " + fmt(v.mae, 2) + " toneladas por hectárea.</span>") +
        metric("R²", fmt(v.r2, 2), "", "Qué parte de las diferencias de rendimiento entre parcelas explica el modelo.",
          '<span class="gain">' + icon("up") + "Explica " + Math.round(v.r2 * 100) + " %</span><span>" + esc(v.baseline.nombre) + " explica " + v.baseline.r2 + " %</span>") +
        "</section>" +

        '<section class="grid grid-2">' +
        '<div class="card chart-card"><div class="card-head"><div><h2>Error por modelo (RMSE)</h2><p>Menor es mejor. Todos se comparan con la misma validación.</p></div></div><div class="card-body"><div id="c-mod"></div>' +
        '<p class="card-sub" style="margin-top:14px">LightGBM (0.507) y el ensamble (0.508) quedan prácticamente empatados. Los dos reducen el error cerca de 40 % frente a predecir el promedio. Se usa el ensamble porque combina varios modelos y suele ser más estable.</p><div class="legend" style="margin-top:12px"><span class="legend-item"><span class="sw" style="background:var(--bar-mute)"></span>Referencia (promedio)</span><span class="legend-item"><span class="sw" style="background:var(--bar)"></span>Modelos probados</span><span class="legend-item"><span class="sw" style="background:var(--bar-strong)"></span>Modelo usado en esta herramienta</span></div></div></div>' +
        '<div class="card chart-card"><div class="card-head"><div><h2>Importancia por familia de variables</h2><p>Qué tanto pesa cada grupo de variables en las predicciones.</p></div></div><div class="card-body"><div id="c-imp"></div></div></div></section>' +

        '<section class="grid grid-2">' +
        '<div class="card chart-card"><div class="card-head"><div><h2>Observado contra predicho</h2><p>Cada punto es una parcela medida. Entre más cerca de la línea punteada, mejor acertó el modelo.</p></div></div><div class="card-body"><div class="chart-box" id="c-sc"></div>' +
        '<div class="legend" style="margin-top:8px">' + Object.keys(GRUPOS).map(function (k) { return '<span class="legend-item">' + shapeSvg(GRUPOS[k]) + k + "</span>"; }).join("") + '<span class="legend-item"><span class="sw-line" style="display:inline-block;width:18px;border-top:2px dashed var(--ink-2)"></span>Predicción perfecta</span></div>' +
        '<details style="margin-top:10px"><summary class="btn btn-sm" style="display:inline-flex">Ver datos como tabla</summary><div class="table-scroll" style="max-height:260px;margin-top:8px">' + tablaDisp(m.dispersion) + "</div></details></div></div>" +
        '<div class="card chart-card"><div class="card-head"><div><h2>Distribución de los errores</h2><p>Diferencia entre lo observado y lo predicho. Lo ideal es que se concentre alrededor de cero.</p></div></div><div class="card-body"><div class="chart-box" id="c-hi"></div>' +
        '<p class="card-sub" id="hi-note" style="margin-top:12px"></p><div class="legend" style="margin-top:8px"><span class="legend-item"><span class="sw" style="background:var(--bar)"></span>Número de parcelas</span><span class="legend-item"><span class="sw" style="background:var(--ink);width:2px;height:14px;border-radius:0"></span>Cero (sin error)</span></div></div></div></section>' +

        '<section class="card chart-card"><div class="card-head"><div><h2>Robustez espacial</h2><p>Error (RMSE) al dejar fuera un municipio completo.</p></div></div><div class="card-body">' +
        '<div class="callout" style="margin-bottom:14px">' + icon("info") + "<div>Esta prueba quita un municipio entero, entrena con los demás y mide qué tan bien predice ahí. <strong>Mide el desempeño en zonas que el modelo no vio</strong>, que es justo lo que pasa cuando se usa en una región nueva.</div></div>" +
        '<div id="c-rob"></div><div class="legend" style="margin-top:12px"><span class="legend-item"><span class="sw" style="background:var(--bar)"></span>Error similar al global</span><span class="legend-item"><span class="sw" style="background:var(--down)"></span>▲ Error claramente mayor: tomar las predicciones con más cautela</span><span class="legend-item"><span style="display:inline-block;width:0;height:14px;border-left:2px dashed var(--ink-2)"></span>RMSE global (' + fmt(v.rmse, 3) + ")</span></div></div></section>" +

        '<details class="details" id="metodo"><summary><span>Metodología</span>' + icon("chevron") + '</summary><div class="prose">' + metodologia(m) + "</div></details>";

      var $ = function (s) { return host.querySelector(s); };
      Charts.hbar($("#c-mod"), {
        items: m.modelos.map(function (x) {
          var cls = x.referencia ? "mute" : x.elegido ? "strong" : "";
          return { label: x.nombre, value: x.rmse, cls: cls, key: !!x.elegido, flag: x.elegido ? "Modelo usado" : (!x.referencia && x.rmse === minRmse ? "Menor RMSE" : ""),
            tip: Charts.tip(x.nombre, [{ t: "RMSE: <b>" + fmt(x.rmse, 3) + "</b> t/ha" }, { t: '<span class="tt-sub">' + (x.referencia ? "Siempre predice el promedio de las parcelas" : "Validación cruzada anidada") + "</span>" }]) };
        }), max: 1.1, decimals: 3, labelWidth: 150, axis: true, valueName: "RMSE", unit: "t/ha"
      });
      Charts.hbar($("#c-imp"), {
        items: m.importancia_familias.map(function (x, i) { return { label: x.familia, sub: SUB[x.familia] || (x.familia === "Clima" ? "Lluvia y temperatura" : x.familia === "Ubicación" ? "Latitud y longitud" : x.familia === "Topografía" ? "Elevación y pendiente" : ""), value: x.valor, key: i === 0 }; }),
        max: 0.46, decimals: 2, labelWidth: 170, axis: true, valueName: "Importancia"
      });
      Charts.scatter($("#c-sc"), {
        groups: GRUPOS, aria: "Dispersión de rendimiento observado contra predicho por estado",
        points: m.dispersion.map(function (d) { return { id: d.id, mun: d.municipio, g: d.estado, x: d.obs, y: d.pred }; })
      });
      var dentro = m.residuales.filter(function (r) { return Math.abs(r) <= 0.5; }).length;
      $("#hi-note").textContent = "En " + Math.round(dentro / m.residuales.length * 100) + " de cada 100 parcelas la predicción quedó a menos de 0.5 t/ha del valor medido. Los errores grandes son pocos y se reparten hacia los dos lados.";
      Charts.histogram($("#c-hi"), { values: m.residuales, bin: 0.2, aria: "Histograma de residuales" });
      Charts.hbar($("#c-rob"), {
        items: m.robustez_espacial.map(function (x) {
          var alto = x.rmse > 0.6;
          return { label: x.municipio, value: x.rmse, cls: alto ? "warn" : "", flag: alto ? "▲ Más error" : "",
            tip: Charts.tip(x.municipio, [{ t: "RMSE al dejarlo fuera: <b>" + fmt(x.rmse, 2) + "</b> t/ha" }, { t: '<span class="tt-sub">' + (alto ? "Es " + fmt(x.rmse / v.rmse, 1) + " veces el error global" : "Cerca o por debajo del error global") + "</span>" }]) };
        }), max: 1.25, decimals: 2, labelWidth: 150, axis: true, ref: { value: v.rmse, label: "Global " + fmt(v.rmse, 3) }, valueName: "RMSE", unit: "t/ha"
      });
    }

    function metric(nombre, valor, unidad, texto, cmp) {
      return '<div class="card metric"><span class="lbl">' + esc(nombre) + '</span><span class="big num">' + esc(valor) + (unidad ? "<small>" + esc(unidad) + "</small>" : "") + '</span><span class="hint">' + esc(texto) + '</span><div class="cmp">' + cmp + "</div></div>";
    }
    function tablaDisp(d) {
      return '<table class="tbl"><thead><tr><th><button type="button" disabled style="cursor:default">Parcela</button></th><th><button type="button" disabled style="cursor:default">Estado</button></th><th class="r"><button type="button" disabled style="cursor:default">Observado</button></th><th class="r"><button type="button" disabled style="cursor:default">Predicho</button></th><th class="r"><button type="button" disabled style="cursor:default">Diferencia</button></th></tr></thead><tbody>' +
        d.map(function (x) { return "<tr style='cursor:default'><td class='id'>" + x.id + "</td><td>" + esc(x.estado) + "</td><td class='r num'>" + fmt(x.obs, 2) + "</td><td class='r num'>" + fmt(x.pred, 2) + "</td><td class='r num'>" + UI.fmtSigned(x.obs - x.pred, 2) + "</td></tr>"; }).join("") + "</tbody></table>";
    }
    function metodologia() {
      return "<p>Resumen de cómo se construyó el modelo y cómo se evaluó. Está escrito para leerse sin ser especialista en ciencia de datos.</p>" +
        "<h3>Datos</h3><p>197 parcelas del altiplano de Hidalgo, Puebla y Tlaxcala durante el ciclo de abril a octubre de 2025. En 138 se midió el rendimiento en campo y se usaron para entrenar. Las otras 59 no tienen medición y son las que el modelo predice.</p>" +
        "<h3>Variables</h3><ul><li><strong>Clima:</strong> lluvia, temperatura máxima y temperatura mínima de cada mes.</li><li><strong>Satélite:</strong> series de índices de Sentinel-2 y Planet (NDVI, EVI, LAI, NDDI, NDWI y otros). De cada curva se sacan medidas de su forma, como la velocidad de verdeo, la velocidad de senescencia y el valor máximo.</li><li><strong>Ubicación y topografía:</strong> latitud, longitud, elevación y pendiente.</li></ul>" +
        "<h3>Modelos probados</h3><p>Se compararon Elastic Net, Random Forest y LightGBM, además de un ensamble que combina sus predicciones. Como referencia se usó un modelo que siempre responde el promedio de las parcelas.</p>" +
        "<h3>Validación cruzada anidada</h3><p>Las parcelas se reparten en grupos. Un grupo se aparta para evaluar y con el resto se ajusta el modelo, incluyendo la elección de sus parámetros. Eso se repite hasta que todas las parcelas han sido evaluadas sin que el modelo las haya visto. Así se evita que las cifras salgan más bonitas de lo que serían en la práctica.</p>" +
        "<h3>Intervalos de predicción</h3><p>Cada predicción viene con un rango. Se construye a partir de los errores que el modelo tuvo en la validación, y es más amplio en zonas donde se equivocó más.</p>" +
        "<h3>Explicación de cada predicción</h3><p>La gráfica de cascada de la ficha usa valores tipo SHAP. Parte del rendimiento promedio y reparte la diferencia entre las variables que más influyeron.</p>" +
        "<h3>Qué tomar en cuenta</h3><ul><li>El modelo aprendió de una sola temporada. Conviene validarlo con más años antes de depender de él.</li><li>Fuera de los rangos de lluvia y temperatura que vio al entrenar, las predicciones son menos confiables. El simulador avisa cuando pasa.</li><li>Es una herramienta de apoyo y no sustituye la evaluación crediticia.</li><li>Los datos que muestra este tablero son simulados para demostración.</li></ul>";
    }
    return { destroy: function () { destroyed = true; } };
  }

  global.Views = global.Views || {};
  global.Views.modelo = { mount: mount };
})(window);
