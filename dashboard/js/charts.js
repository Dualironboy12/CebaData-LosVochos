/* CebaData · gráficas (SVG y HTML sin librerías). Todas con tooltip, leyenda externa y colores por variables CSS. */
(function (global) {
  "use strict";
  var esc = UI.esc, fmt = UI.fmt;

  /* ---------- utilidades ---------- */
  function niceStep(range, n) {
    var raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }
  function niceTicks(min, max, n) {
    var st = niceStep(max - min, n || 5), out = [];
    for (var v = Math.ceil(min / st - 1e-9) * st; v <= max + 1e-9; v += st) out.push(Math.round(v * 1e9) / 1e9);
    return { ticks: out, step: st };
  }
  function niceDomain(min, max, n) {
    var st = niceStep(max - min, n || 5);
    return { lo: Math.floor(min / st + 1e-9) * st, hi: Math.ceil(max / st - 1e-9) * st, step: st };
  }
  function decimals(step) { return Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); }
  function tip(title, rows) {
    var h = "<b>" + esc(title) + "</b>";
    (rows || []).forEach(function (r) {
      h += '<div class="tt-row">' + (r.k ? '<span class="tt-k" style="background:' + r.k + '"></span>' : "") + "<span>" + r.t + "</span></div>";
    });
    return h;
  }
  function mount(el, draw) {
    el._cbDraw = draw;
    el._cbLast = 0;
    function run(force) {
      var w = Math.floor(el.clientWidth);
      if (!w) return;
      if (!force && Math.abs(w - el._cbLast) < 2) return;
      el._cbLast = w;
      el._cbDraw(el, w);
    }
    run(true);
    if (!el._cbRO && global.ResizeObserver) {
      el._cbRO = new ResizeObserver(UI.debounce(function () { run(false); }, 90));
      el._cbRO.observe(el);
    }
  }
  function topRound(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }
  function el2(w, h, inner, label) {
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || "") + '">' + inner + "</svg>";
  }

  /* ---------- barras horizontales (HTML) ---------- */
  function hbar(el, o) {
    var vals = o.items.map(function (i) { return i.value; });
    var max = o.max || Math.max.apply(null, vals) * 1.18;
    var lw = o.labelWidth || 170;
    var f = o.format || function (v) { return fmt(v, o.decimals == null ? 2 : o.decimals); };
    var h = '<div class="hbars' + (o.ref ? " with-ref" : "") + '" style="--lw:' + lw + 'px;--lg:12px">';
    o.items.forEach(function (it) {
      var pct = Math.max(0, it.value / max * 100);
      var t = it.tip || tip(it.label, [{ t: (o.valueName || "Valor") + ": <b>" + f(it.value) + "</b>" + (o.unit ? " " + o.unit : "") }]);
      h += '<div class="hbar' + (it.key ? " is-key" : "") + '" tabindex="0" data-tip="' + esc(t) + '">' +
        '<div class="hbar-label">' + esc(it.label) + (it.sub ? "<small>" + esc(it.sub) + "</small>" : "") + "</div>" +
        '<div class="hbar-track"><div class="hbar-fill ' + (it.cls || "") + '" style="width:' + pct + '%"></div>' +
        '<div class="hbar-val" style="left:' + pct + '%">' + f(it.value) + (it.flag ? '<span class="flag' + (it.cls === "warn" ? " warn" : "") + '">' + esc(it.flag) + "</span>" : "") + "</div></div></div>";
    });
    if (o.ref) {
      var fr = o.ref.value / max;
      h += '<div class="hbar-ref' + (fr > 0.7 ? " end" : "") + '" style="left:calc(var(--lw) + var(--lg) + (100% - var(--lw) - var(--lg)) * ' + fr.toFixed(4) + ')"><span>' + esc(o.ref.label) + "</span></div>";
    }
    h += "</div>";
    if (o.axis) {
      var tk = niceTicks(0, max, 5), dd = decimals(tk.step);
      h += '<div class="hbars-axis" style="--lw:' + lw + 'px"><i></i><div>' + tk.ticks.map(function (v) {
        return '<span style="left:' + (v / max * 100) + '%">' + fmt(v, dd) + "</span>";
      }).join("") + "</div></div>";
    }
    el.innerHTML = h;
  }

  /* ---------- barras verticales (precipitación) ---------- */
  function vbar(el, o) {
    mount(el, function (host, w) {
      var h = o.height || 230, m = { l: 44, r: 8, t: 22, b: 28 };
      var pw = w - m.l - m.r, ph = h - m.t - m.b;
      var maxV = Math.max.apply(null, o.items.map(function (i) { return i.value; }));
      var dom = niceDomain(0, maxV * 1.1, 4), tk = niceTicks(dom.lo, dom.hi, 4);
      var y = function (v) { return m.t + ph - (v - dom.lo) / (dom.hi - dom.lo) * ph; };
      var step = pw / o.items.length, bw = Math.min(44, step * 0.56);
      var s = "";
      tk.ticks.forEach(function (v) {
        s += '<line class="grid-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
          '<text class="ax-text" x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v, 0) + "</text>";
      });
      s += '<text class="ax-title" x="' + m.l + '" y="10">' + esc(o.unit || "") + "</text>";
      o.items.forEach(function (it, i) {
        var x = m.l + step * i + (step - bw) / 2, top = y(it.value), bh = y(dom.lo) - top;
        s += '<g class="bar-g" tabindex="0" data-tip="' + esc(tip(it.tipTitle || it.label, [{ k: "var(--s-blue)", t: (o.name || "Valor") + ": <b>" + fmt(it.value, 0) + "</b> " + esc(o.unit || "") }])) + '">' +
          '<rect x="' + (m.l + step * i) + '" y="' + m.t + '" width="' + step + '" height="' + ph + '" fill="transparent"/>' +
          '<path d="' + topRound(x, top, bw, bh, 4) + '" fill="var(--s-blue)"/>' +
          '<text class="lbl-ink" x="' + (x + bw / 2) + '" y="' + (top - 6) + '" text-anchor="middle">' + fmt(it.value, 0) + "</text></g>" +
          '<text class="ax-text" x="' + (x + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(it.label) + "</text>";
      });
      s += '<line class="axis-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + y(dom.lo) + '" y2="' + y(dom.lo) + '"/>';
      host.innerHTML = el2(w, h, s, o.aria);
    });
  }

  /* ---------- lineas por categoria (temperaturas) ---------- */
  function lineCat(el, o) {
    mount(el, function (host, w) {
      var h = o.height || 230, m = { l: 44, r: 40, t: 22, b: 28 };
      var pw = w - m.l - m.r, ph = h - m.t - m.b;
      var all = [];
      o.series.forEach(function (s) { all = all.concat(s.values); });
      var dom = niceDomain(Math.min.apply(null, all) - 1.2, Math.max.apply(null, all) + 1.2, 4), tk = niceTicks(dom.lo, dom.hi, 4);
      var n = o.cats.length, step = pw / n;
      var X = function (i) { return m.l + step * i + step / 2; };
      var Y = function (v) { return m.t + ph - (v - dom.lo) / (dom.hi - dom.lo) * ph; };
      var dd = decimals(tk.step);
      var s = "";
      tk.ticks.forEach(function (v) {
        s += '<line class="grid-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>' +
          '<text class="ax-text" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, dd) + "</text>";
      });
      s += '<text class="ax-title" x="' + m.l + '" y="10">' + esc(o.unit || "") + "</text>";
      o.cats.forEach(function (c, i) { s += '<text class="ax-text" x="' + X(i) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(c) + "</text>"; });
      s += '<line class="axis-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + (m.t + ph) + '" y2="' + (m.t + ph) + '"/>';
      s += '<line class="cross" id="lc-cross" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" style="display:none"/>';
      o.series.forEach(function (se) {
        var d = se.values.map(function (v, i) { return (i ? "L" : "M") + X(i) + "," + Y(v); }).join("");
        s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
        se.values.forEach(function (v, i) {
          s += '<circle class="lc-pt" data-i="' + i + '" cx="' + X(i) + '" cy="' + Y(v) + '" r="4.5" fill="' + se.color + '" stroke="var(--surface)" stroke-width="2"/>';
        });
        var last = se.values.length - 1;
        s += '<text class="lbl-ink2" x="' + (X(last) + 10) + '" y="' + (Y(se.values[last]) + 4) + '">' + esc(se.short) + "</text>";
      });
      s += '<rect id="lc-hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent" style="touch-action:pan-y"/>';
      host.innerHTML = el2(w, h, s, o.aria);
      var svg = host.firstChild, cross = svg.querySelector("#lc-cross"), hit = svg.querySelector("#lc-hit");
      function at(e) {
        var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (w / r.width);
        var i = Math.max(0, Math.min(n - 1, Math.floor((x - m.l) / step)));
        cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.style.display = "";
        svg.querySelectorAll(".lc-pt").forEach(function (c) { c.setAttribute("r", c.getAttribute("data-i") == i ? 6.5 : 4.5); });
        UI.Tip.show(tip(o.cats[i], o.series.map(function (se) { return { k: se.color, t: esc(se.name) + ": <b>" + fmt(se.values[i], 1) + "</b> " + esc(o.unit || "") }; })), e.clientX, e.clientY);
      }
      function off() {
        cross.style.display = "none";
        svg.querySelectorAll(".lc-pt").forEach(function (c) { c.setAttribute("r", 4.5); });
        UI.Tip.hide();
      }
      hit.addEventListener("pointermove", at); hit.addEventListener("pointerdown", at); hit.addEventListener("pointerleave", off);
    });
  }

  /* ---------- curva de un indice satelital ---------- */
  function suavizar(pts, t0, t1, bw) {
    var out = [];
    for (var t = t0; t <= t1; t += 86400000 * 2) {
      var sw = 0, sv = 0;
      pts.forEach(function (p) {
        var z = (t - p.t) / (bw * 86400000), wgt = Math.exp(-0.5 * z * z);
        sw += wgt; sv += wgt * p.v;
      });
      if (sw > 1e-6) out.push({ t: t, v: sv / sw });
    }
    return out;
  }
  function indexChart(el, o) {
    var pts = o.points.map(function (p) { var q = p.fecha.split("-"); return { t: Date.UTC(+q[0], +q[1] - 1, +q[2]), v: p.valor, f: p.fecha }; })
      .sort(function (a, b) { return a.t - b.t; });
    mount(el, function (host, w) {
      if (!pts.length) { host.innerHTML = UI.emptyState({ icono: "layers", titulo: "Sin observaciones", texto: "No hay imágenes disponibles de esta fuente para la parcela." }); return; }
      var h = w < 520 ? 260 : 300, m = { l: 46, r: 14, t: 30, b: 30 };
      var pw = w - m.l - m.r, ph = h - m.t - m.b;
      var T0 = Date.UTC(2025, 2, 15), T1 = Date.UTC(2025, 10, 15);
      var cur = suavizar(pts, pts[0].t, pts[pts.length - 1].t, 9);
      var vs = pts.map(function (p) { return p.v; }).concat(cur.map(function (c) { return c.v; }));
      var vmin = Math.min.apply(null, vs), vmax = Math.max.apply(null, vs), pad = (vmax - vmin) * 0.12;
      var dom = niceDomain(vmin - pad, vmax + pad, 5), tk = niceTicks(dom.lo, dom.hi, 5), dd = decimals(tk.step);
      var X = function (t) { return m.l + (t - T0) / (T1 - T0) * pw; };
      var Y = function (v) { return m.t + ph - (v - dom.lo) / (dom.hi - dom.lo) * ph; };
      var vd = o.decimals == null ? 2 : o.decimals;
      var peak = cur.reduce(function (b, c) { return c.v > b.v ? c : b; }, cur[0]);
      var s = "";
      var bx0 = X(Date.UTC(2025, 3, 1)), bx1 = X(Date.UTC(2025, 9, 31));
      s += '<rect class="band" x="' + bx0 + '" y="' + m.t + '" width="' + (bx1 - bx0) + '" height="' + ph + '"/>';
      s += '<text class="band-text" x="' + ((bx0 + bx1) / 2) + '" y="' + (m.t - 10) + '" text-anchor="middle">Ciclo abril a octubre</text>';
      tk.ticks.forEach(function (v) {
        s += '<line class="grid-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>' +
          '<text class="ax-text" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, dd) + "</text>";
      });
      var meses = ["mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov"];
      var skipAlt = w < 520;
      meses.forEach(function (mn, i) {
        var t = Date.UTC(2025, 2 + i, 1);
        if (t < T0) return;
        if (skipAlt && i % 2 === 1) return;
        s += '<text class="ax-text" x="' + X(t) + '" y="' + (h - 9) + '" text-anchor="middle">' + mn + "</text>";
      });
      s += '<line class="axis-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + (m.t + ph) + '" y2="' + (m.t + ph) + '"/>';
      var d = cur.map(function (c, i) { return (i ? "L" : "M") + X(c.t).toFixed(1) + "," + Y(c.v).toFixed(1); }).join("");
      s += '<path d="' + d + '" fill="none" stroke="var(--bar-strong)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p) {
        s += '<circle cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.6" fill="var(--bar)" fill-opacity=".75" stroke="var(--surface)" stroke-width="1.2"/>';
      });
      /* pico */
      var px = X(peak.t), py = Y(peak.v);
      var pd = new Date(peak.t);
      var ptxt = "Pico " + fmt(peak.v, vd) + " · " + pd.getUTCDate() + " " + UI.MESES_CORTO[pd.getUTCMonth()];
      var lx = Math.max(m.l + 56, Math.min(w - m.r - 56, px));
      s += '<line x1="' + px + '" x2="' + px + '" y1="' + (py + 8) + '" y2="' + (m.t + ph) + '" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3"/>';
      s += '<circle cx="' + px + '" cy="' + py + '" r="6.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>';
      s += '<text class="lbl-ink" x="' + lx + '" y="' + (py - 14) + '" text-anchor="middle" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">' + ptxt + "</text>";
      s += '<line class="cross" id="ix-cross" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" style="display:none"/>';
      s += '<circle id="ix-dot" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" style="display:none"/>';
      s += '<rect id="ix-hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent" style="touch-action:pan-y"/>';
      host.innerHTML = el2(w, h, s, o.aria);
      var svg = host.firstChild, cross = svg.querySelector("#ix-cross"), dot = svg.querySelector("#ix-dot"), hit = svg.querySelector("#ix-hit");
      function move(e) {
        var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * (w / r.width);
        var t = T0 + (x - m.l) / pw * (T1 - T0);
        var near = pts.reduce(function (b, p) { return Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b; }, pts[0]);
        var useObs = Math.abs(X(near.t) - x) < 14;
        var c = cur.reduce(function (b, q) { return Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b; }, cur[0]);
        var ref = useObs ? near : c;
        if (!useObs && Math.abs(c.t - t) > 4 * 86400000) { off(); return; }
        cross.setAttribute("x1", X(ref.t)); cross.setAttribute("x2", X(ref.t)); cross.style.display = "";
        dot.setAttribute("cx", X(ref.t)); dot.setAttribute("cy", Y(useObs ? near.v : c.v)); dot.style.display = "";
        var dt = new Date(ref.t);
        var rows = [];
        if (useObs) rows.push({ k: "var(--bar)", t: "Observación: <b>" + fmt(near.v, vd) + "</b>" });
        var cc = cur.reduce(function (b, q) { return Math.abs(q.t - ref.t) < Math.abs(b.t - ref.t) ? q : b; }, cur[0]);
        rows.push({ k: "var(--bar-strong)", t: "Curva suavizada: <b>" + fmt(cc.v, vd) + "</b>" });
        UI.Tip.show(tip(dt.getUTCDate() + " de " + UI.MESES_LARGO[dt.getUTCMonth()] + " de 2025", rows), e.clientX, e.clientY);
      }
      function off() { cross.style.display = "none"; dot.style.display = "none"; UI.Tip.hide(); }
      hit.addEventListener("pointermove", move); hit.addEventListener("pointerdown", move); hit.addEventListener("pointerleave", off);
      if (o.onPeak) o.onPeak({ valor: peak.v, fecha: peak.t });
    });
  }

  /* ---------- cascada horizontal estilo SHAP (HTML) ---------- */
  function waterfall(el, o) {
    var rows = [], cum = o.base, lo = o.base, hi = o.base;
    o.items.forEach(function (it) { var a = cum; cum += it.contribucion; rows.push({ it: it, a: a, b: cum }); lo = Math.min(lo, cum); hi = Math.max(hi, cum); });
    var rest = { a: cum, b: cum + o.otras }; cum = rest.b; lo = Math.min(lo, cum); hi = Math.max(hi, cum);
    var pad = (hi - lo) * 0.14 + 0.04;
    var dom = niceDomain(lo - pad, hi + pad, 5), tk = niceTicks(dom.lo, dom.hi, 5), dd = decimals(tk.step);
    var P = function (v) { return ((v - dom.lo) / (dom.hi - dom.lo) * 100); };
    var h = '<div class="wf"><div class="wf-grid">' + tk.ticks.map(function (v) { return '<i style="left:' + P(v) + '%"></i>'; }).join("") + "</div>";
    function row(name, sub, body, cls, tipHtml) {
      return '<div class="wf-row ' + (cls || "") + '" tabindex="0" data-tip="' + esc(tipHtml) + '"><div class="wf-name">' + esc(name) + (sub ? "<small>" + esc(sub) + "</small>" : "") + '</div><div class="wf-plot">' + body + "</div></div>";
    }
    function marker(v, color, label) {
      return '<span style="position:absolute;left:calc(' + P(v) + '% - 8px);top:11px;width:16px;height:16px;border-radius:50%;background:' + color + ';border:2px solid var(--surface);box-shadow:0 0 0 1.5px ' + color + '"></span>' +
        '<span class="wf-val" style="left:calc(' + P(v) + '% + 14px)">' + label + "</span>";
    }
    h += row("Promedio de las parcelas", "Punto de partida", marker(o.base, "var(--bar-mute)", fmt(o.base, 2) + " t/ha"), "",
      tip("Promedio de las parcelas", [{ t: "Rendimiento medio observado: <b>" + fmt(o.base, 2) + "</b> t/ha" }]));
    rows.forEach(function (r, i) {
      var up = r.it.contribucion >= 0, l = Math.min(r.a, r.b), rg = Math.max(r.a, r.b);
      var vtxt = r.it.valorTexto;
      var body = '<div class="wf-bar ' + (up ? "up" : "down") + '" style="left:' + P(l) + "%;width:max(3px," + (P(rg) - P(l)) + '%)"></div>' +
        '<span class="wf-val" style="left:calc(' + P(rg) + '% + 7px)"><span class="arrow">' + (up ? "▲" : "▼") + "</span>" + UI.fmtSigned(r.it.contribucion, 2) + "</span>";
      if (i < rows.length) body += '<span class="wf-conn" style="left:' + P(r.b) + '%"></span>';
      h += row(r.it.etiqueta, vtxt, body, "", tip(r.it.etiqueta, [
        { t: "Valor en esta parcela: <b>" + esc(vtxt) + "</b>" },
        { k: up ? "var(--up)" : "var(--down)", t: (up ? "Sube" : "Baja") + " la predicción en <b>" + fmt(Math.abs(r.it.contribucion), 2) + "</b> t/ha" },
        { t: '<span class="tt-sub">Acumulado: ' + fmt(r.b, 2) + " t/ha</span>" }]));
    });
    var upR = rest.b >= rest.a, lR = Math.min(rest.a, rest.b), rR = Math.max(rest.a, rest.b);
    h += row("Otras variables", o.otrasSub || "Efecto combinado del resto", '<div class="wf-bar ' + (upR ? "up" : "down") + '" style="left:' + P(lR) + "%;width:max(3px," + (P(rR) - P(lR)) + '%)"></div>' +
      '<span class="wf-val" style="left:calc(' + P(rR) + '% + 7px)"><span class="arrow">' + (upR ? "▲" : "▼") + "</span>" + UI.fmtSigned(o.otras, 2) + '</span><span class="wf-conn" style="left:' + P(rest.b) + '%"></span>', "",
      tip("Otras variables", [{ t: "Efecto combinado: <b>" + UI.fmtSigned(o.otras, 2) + "</b> t/ha" }]));
    h += row("Predicción de esta parcela", "Resultado final", marker(rest.b, "var(--ink)", "<b>" + fmt(rest.b, 2) + " t/ha</b>"), "sep",
      tip("Predicción de esta parcela", [{ t: "Rendimiento predicho: <b>" + fmt(rest.b, 2) + "</b> t/ha" }]));
    h += '<div class="wf-axis"><i></i><div>' + tk.ticks.map(function (v) { return '<span style="left:' + P(v) + '%">' + fmt(v, dd) + "</span>"; }).join("") + "</div></div></div>";
    el.innerHTML = h;
  }

  /* ---------- dispersion observado vs predicho ---------- */
  var FORMAS = {
    circulo: function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"'; },
    cuadro: function (x, y, r) { return '<rect x="' + (x - r) + '" y="' + (y - r) + '" width="' + (2 * r) + '" height="' + (2 * r) + '" rx="1.5"'; },
    triangulo: function (x, y, r) { return '<path d="M' + x + "," + (y - r * 1.2) + "L" + (x + r * 1.1) + "," + (y + r * 0.85) + "L" + (x - r * 1.1) + "," + (y + r * 0.85) + 'Z"'; }
  };
  function scatter(el, o) {
    mount(el, function (host, w) {
      var h = Math.min(w * 0.82, 420), m = { l: 48, r: 14, t: 12, b: 42 };
      var pw = w - m.l - m.r, ph = h - m.t - m.b;
      var vs = []; o.points.forEach(function (p) { vs.push(p.x, p.y); });
      var dom = niceDomain(Math.min.apply(null, vs) - 0.05, Math.max.apply(null, vs) + 0.05, 9), tk = niceTicks(dom.lo, dom.hi, 9), dd = decimals(tk.step);
      var X = function (v) { return m.l + (v - dom.lo) / (dom.hi - dom.lo) * pw; };
      var Y = function (v) { return m.t + ph - (v - dom.lo) / (dom.hi - dom.lo) * ph; };
      var s = "";
      tk.ticks.forEach(function (v) {
        s += '<line class="grid-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><line class="grid-line" y1="' + m.t + '" y2="' + (m.t + ph) + '" x1="' + X(v) + '" x2="' + X(v) + '"/>' +
          '<text class="ax-text" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, dd) + '</text><text class="ax-text" x="' + X(v) + '" y="' + (m.t + ph + 16) + '" text-anchor="middle">' + fmt(v, dd) + "</text>";
      });
      s += '<line x1="' + X(dom.lo) + '" y1="' + Y(dom.lo) + '" x2="' + X(dom.hi) + '" y2="' + Y(dom.hi) + '" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="6 4"/>';
      s += '<text class="lbl-ink2" x="' + (X(dom.hi) - 6) + '" y="' + (Y(dom.lo) - 8) + '" text-anchor="end">Línea punteada: predicción perfecta (1:1)</text>';
      s += '<text class="ax-title" x="' + (m.l + pw / 2) + '" y="' + (h - 6) + '" text-anchor="middle">Rendimiento observado (t/ha)</text>';
      s += '<text class="ax-title" transform="translate(13 ' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">Rendimiento predicho (t/ha)</text>';
      o.points.forEach(function (p) {
        var g = o.groups[p.g];
        s += FORMAS[g.forma](+X(p.x).toFixed(1), +Y(p.y).toFixed(1), 5) + ' fill="' + g.color + '" fill-opacity=".72" stroke="var(--surface)" stroke-width="1.3"/>';
      });
      s += '<circle id="sc-ring" r="9" fill="none" stroke="var(--ink)" stroke-width="2" style="display:none"/>';
      s += '<rect id="sc-hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent" style="touch-action:pan-y"/>';
      host.innerHTML = el2(w, h, s, o.aria);
      var svg = host.firstChild, ring = svg.querySelector("#sc-ring"), hit = svg.querySelector("#sc-hit");
      function move(e) {
        var r = svg.getBoundingClientRect(), k = w / r.width, mx = (e.clientX - r.left) * k, my = (e.clientY - r.top) * k;
        var best = null, bd = 18 * 18;
        o.points.forEach(function (p) { var dx = X(p.x) - mx, dy = Y(p.y) - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = p; } });
        if (!best) { ring.style.display = "none"; UI.Tip.hide(); return; }
        ring.setAttribute("cx", X(best.x)); ring.setAttribute("cy", Y(best.y)); ring.style.display = "";
        var g = o.groups[best.g], res = best.x - best.y;
        UI.Tip.show(tip(best.id + " · " + best.mun, [
          { k: g.color, t: esc(g.nombre) },
          { t: "Observado: <b>" + fmt(best.x, 2) + "</b> t/ha" }, { t: "Predicho: <b>" + fmt(best.y, 2) + "</b> t/ha" },
          { t: '<span class="tt-sub">Diferencia: ' + UI.fmtSigned(res, 2) + " t/ha</span>" }]), e.clientX, e.clientY);
      }
      hit.addEventListener("pointermove", move); hit.addEventListener("pointerdown", move);
      hit.addEventListener("pointerleave", function () { ring.style.display = "none"; UI.Tip.hide(); });
    });
  }

  /* ---------- histograma ---------- */
  function histogram(el, o) {
    mount(el, function (host, w) {
      var h = 250, m = { l: 40, r: 10, t: 14, b: 54 };
      var pw = w - m.l - m.r, ph = h - m.t - m.b, bwv = o.bin;
      var lo = Math.floor(Math.min.apply(null, o.values) / bwv) * bwv, hi = Math.ceil((Math.max.apply(null, o.values) + 1e-9) / bwv) * bwv;
      var nb = Math.round((hi - lo) / bwv), bins = [];
      for (var i = 0; i < nb; i++) bins.push(0);
      o.values.forEach(function (v) { var k = Math.min(nb - 1, Math.floor((v - lo) / bwv)); bins[k]++; });
      var dom = niceDomain(0, Math.max.apply(null, bins) * 1.1, 4), tk = niceTicks(0, dom.hi, 4);
      var X = function (v) { return m.l + (v - lo) / (hi - lo) * pw; };
      var Y = function (v) { return m.t + ph - v / dom.hi * ph; };
      var s = "";
      tk.ticks.forEach(function (v) {
        s += '<line class="grid-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="ax-text" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, 0) + "</text>";
      });
      bins.forEach(function (c, i) {
        var a = lo + i * bwv, b = a + bwv, x = X(a) + 1, bw = X(b) - X(a) - 2, top = Y(c);
        var t = tip(UI.fmtSigned(a, 1) + " a " + UI.fmtSigned(b, 1) + " t/ha", [{ k: "var(--bar)", t: "<b>" + c + "</b> parcelas" }]);
        s += '<g tabindex="0" data-tip="' + esc(t) + '"><rect x="' + (x - 1) + '" y="' + m.t + '" width="' + (bw + 2) + '" height="' + ph + '" fill="transparent"/>' +
          (c ? '<path d="' + topRound(x, top, bw, Y(0) - top, 3) + '" fill="var(--bar)"/>' : "") + "</g>";
      });
      s += '<line class="axis-line" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
      s += '<line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + m.t + '" y2="' + Y(0) + '" stroke="var(--ink)" stroke-width="1.5"/>';
      for (var v = Math.ceil(lo); v <= hi + 1e-9; v += 0.5) s += '<text class="ax-text" x="' + X(v) + '" y="' + (Y(0) + 16) + '" text-anchor="middle">' + UI.fmtSigned(v, 1).replace("+", "") + "</text>";
      s += '<text class="ax-title" x="' + (m.l + pw / 2) + '" y="' + (h - 22) + '" text-anchor="middle">Residual: observado menos predicho (t/ha)</text>';
      s += '<text class="ax-text" x="' + m.l + '" y="' + (h - 6) + '">← El modelo predijo de más</text><text class="ax-text" x="' + (w - m.r) + '" y="' + (h - 6) + '" text-anchor="end">El modelo predijo de menos →</text>';
      s += '<text class="ax-title" x="' + m.l + '" y="8">Parcelas</text>';
      host.innerHTML = el2(w, h, s, o.aria);
    });
  }

  global.Charts = { hbar: hbar, vbar: vbar, lineCat: lineCat, indexChart: indexChart, waterfall: waterfall, scatter: scatter, histogram: histogram, tip: tip, mount: mount };
})(window);
