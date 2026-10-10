/* CebaData · arranque, navegación por hash y tema claro/oscuro */
(function () {
  "use strict";
  var icon = UI.icon;
  var main = document.getElementById("main");
  var titleEl = document.getElementById("page-title");
  var eyebrowEl = document.getElementById("page-eyebrow");
  var current = null;

  /* ---------- navegación ---------- */
  function href(s) {
    return s.id === "parcela" && App.state.parcelaId ? s.ruta + "/" + App.state.parcelaId : s.ruta;
  }
  function buildNav() {
    document.getElementById("nav-side").innerHTML = UI.SECCIONES.map(function (s) {
      return '<a class="nav-link" data-s="' + s.id + '" href="' + href(s) + '">' + icon(s.icono) + "<span>" + s.etiqueta + "</span></a>";
    }).join("");
    document.getElementById("nav-bottom").innerHTML = UI.SECCIONES.map(function (s) {
      return '<a data-s="' + s.id + '" href="' + href(s) + '">' + icon(s.icono) + "<span>" + s.corto + "</span></a>";
    }).join("");
  }
  function marcarNav(id) {
    document.querySelectorAll("[data-s]").forEach(function (a) {
      var s = UI.SECCIONES.filter(function (x) { return x.id === a.dataset.s; })[0];
      a.setAttribute("href", href(s));
      if (a.dataset.s === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function route() {
    var h = location.hash.replace(/^#\/?/, "").split("/");
    var id = h[0] || "mapa";
    var sec = UI.SECCIONES.filter(function (s) { return s.id === id; })[0];
    if (!sec) { location.replace("#/mapa"); return; }
    if (current && current.destroy) { try { current.destroy(); } catch (e) {} }
    UI.Tip.hide();
    main.innerHTML = "";
    titleEl.textContent = sec.titulo;
    eyebrowEl.textContent = sec.eyebrow;
    document.title = sec.titulo + " · CebaData";
    marcarNav(sec.id);
    window.scrollTo(0, 0);
    current = Views[sec.id].mount(main, h.slice(1).filter(Boolean).map(decodeURIComponent));
    marcarNav(sec.id);
  }

  /* ---------- tema ---------- */
  function temaActual() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function pintaToggle() {
    var oscuro = temaActual() === "dark";
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.innerHTML = icon(oscuro ? "sun" : "moon") + '<span class="tt-label">' + (oscuro ? "Modo claro" : "Modo oscuro") + "</span>";
      b.setAttribute("aria-pressed", String(oscuro));
    });
  }
  function alternarTema() {
    var nuevo = temaActual() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nuevo);
    try { localStorage.setItem("cebadata-tema", nuevo); } catch (e) {}
    pintaToggle();
  }

  /* ---------- aviso si se abre sin servidor ---------- */
  function avisoArchivoLocal() {
    if (location.protocol !== "file:") return;
    var d = document.createElement("div");
    d.className = "callout callout-warn";
    d.setAttribute("role", "alert");
    d.style.margin = "12px 32px 0";
    d.innerHTML = icon("warn") + "<div><strong>Estás abriendo la página como archivo local.</strong> El mapa de OpenStreetMap no cargará porque exige que la página se sirva por http. En la carpeta del proyecto ejecuta <code>python3 -m http.server 8000</code> y abre <code>http://localhost:8000</code>.</div>";
    main.parentNode.insertBefore(d, main);
  }

  /* ---------- arranque ---------- */
  avisoArchivoLocal();
  document.querySelectorAll("[data-icon]").forEach(function (el) { el.innerHTML = icon(el.dataset.icon); });
  UI.initTooltip();
  buildNav();
  document.querySelectorAll(".theme-toggle").forEach(function (b) { b.addEventListener("click", alternarTema); });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", pintaToggle);
  }
  pintaToggle();
  window.addEventListener("hashchange", route);
  route();
})();
