/* Sección 4 · Hallazgos clave */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt;

  function mount(host) {
    var destroyed = false;
    host.innerHTML = [1, 2, 3].map(function () { return '<div class="card skel-card" style="min-height:260px">' + UI.skel(14, "30%") + UI.skel(30, "60%", "margin-top:14px") + UI.skel(14, "80%", "margin-top:14px") + UI.skel(14, "70%", "margin-top:8px") + "</div>"; }).join("");
    CebaApi.metricas().then(function (m) { if (!destroyed) render(m.hallazgos); }).catch(function (err) {
      if (destroyed) return;
      host.innerHTML = UI.errorState(err && err.message, true);
      var b = host.querySelector("[data-empty-action]"); if (b) b.addEventListener("click", function () { mount(host); });
    });

    function card(n, q, a, texto, charts, nota) {
      return '<article class="card finding">' +
        '<div class="f-top"><span class="f-q">Hallazgo ' + n + " · " + esc(q) + '</span><h2 class="f-a">' + esc(a) + "</h2>" + texto +
        (nota ? '<p class="f-note" style="margin-top:12px">' + nota + "</p>" : "") + "</div>" +
        '<div class="f-chart">' + charts + "</div></article>";
    }

    function render(h) {
      host.innerHTML =
        card(1, "¿Qué índice satelital importa más?", "El NDVI, pero por cómo cambia en el tiempo y no por qué tan alto llega.",
          '<p class="f-p">Lo que más ayuda al modelo es la <strong>velocidad de verdeo</strong> (qué tan rápido arranca el cultivo) y la <strong>velocidad de senescencia</strong> (qué tan rápido se seca al madurar). El valor máximo que alcanza el NDVI casi no aporta.</p>' +
          '<p class="f-p" style="margin-top:10px">Después del NDVI siguen el <strong>NDDI</strong> y el <strong>LAI</strong>.</p>',
          '<h3>Importancia por índice satelital</h3><div id="h1a"></div><h3 style="margin-top:20px">Dentro del NDVI: qué medida pesa más</h3><div id="h1b"></div>',
          "La importancia mide cuánto empeora el modelo si esa variable se quita.") +
        card(2, "¿Qué variable climática pesa más?", "La lluvia de mayo, el mes de siembra.",
          '<p class="f-p">Cuánta agua recibe el suelo al momento de sembrar pesa más que cualquier otra variable de clima. Es un dato que se conoce temprano en el ciclo, lo que ayuda a anticipar el rendimiento.</p>' +
          '<p class="f-p" style="margin-top:10px">Detrás aparecen la lluvia de julio y la temperatura mínima de abril, que tiene que ver con las heladas de inicio de ciclo.</p>',
          '<h3>Importancia de las variables de clima</h3><div id="h2a"></div>',
          "El clima en conjunto es la familia que más pesa (0.38). Esta gráfica lo desglosa.") +
        card(3, "¿Qué combinación de variables funciona mejor?", "Con solo el clima se logra casi el mismo error que con todas las variables.",
          '<p class="f-p">Se probó el modelo con distintos bloques de variables. <strong>Solo clima</strong> (0.507) empata en la práctica con usar <strong>todas</strong> (0.508), así que agregar más datos no mejoró la predicción.</p>' +
          '<p class="f-p" style="margin-top:10px">Las imágenes satelitales por sí solas son lo más débil (0.613). Sumadas al clima mantienen un error muy parecido (0.512).</p>',
          '<h3>Error (RMSE) por bloque de variables, menor es mejor</h3><div id="h3a"></div><div class="legend" style="margin-top:12px"><span class="legend-item"><span class="sw" style="background:var(--bar)"></span>Bloques con error parecido</span><span class="legend-item"><span class="sw" style="background:var(--bar-mute)"></span>Bloque con más error</span><span class="legend-item"><span style="display:inline-block;width:0;height:14px;border-left:2px dashed var(--ink-2)"></span>Predecir el promedio (0.846)</span></div>',
          "Las diferencias entre los cuatro primeros son menores a 0.01 t/ha, por lo que no conviene leer un orden entre ellos.");

      var $ = function (s) { return host.querySelector(s); };
      Charts.hbar($("#h1a"), { items: h.indices.map(function (x, i) { return { label: x.etiqueta, value: x.valor, key: i === 0, cls: i === 0 ? "strong" : "" }; }), max: 0.1, decimals: 2, labelWidth: 150, valueName: "Importancia" });
      Charts.hbar($("#h1b"), { items: h.dentro_ndvi.map(function (x, i) { return { label: x.etiqueta, value: x.valor, key: i < 2, cls: i < 2 ? "strong" : x.etiqueta === "Valor máximo" ? "mute" : "", flag: x.etiqueta === "Valor máximo" ? "Casi no aporta" : "" }; }), max: 0.06, decimals: 3, labelWidth: 150, valueName: "Importancia" });
      Charts.hbar($("#h2a"), { items: h.clima.map(function (x, i) { return { label: x.etiqueta, value: x.valor, key: i === 0, cls: i === 0 ? "strong" : x.etiqueta === "Resto del clima" ? "mute" : "" }; }), max: 0.19, decimals: 3, labelWidth: 170, valueName: "Importancia" });
      Charts.hbar($("#h3a"), {
        items: h.bloques.map(function (x) {
          var peor = x.etiqueta === "Solo satelital";
          return { label: x.etiqueta, value: x.rmse, cls: peor ? "mute" : "", flag: peor ? "Más error" : "", key: x.etiqueta === "Solo clima",
            tip: Charts.tip(x.etiqueta, [{ t: "RMSE: <b>" + fmt(x.rmse, 3) + "</b> t/ha" }]) };
        }), max: 1.0, decimals: 3, labelWidth: 170, axis: true, ref: { value: 0.846, label: "Promedio 0.846" }, valueName: "RMSE", unit: "t/ha"
      });
    }
    return { destroy: function () { destroyed = true; } };
  }

  global.Views = global.Views || {};
  global.Views.hallazgos = { mount: mount };
})(window);
