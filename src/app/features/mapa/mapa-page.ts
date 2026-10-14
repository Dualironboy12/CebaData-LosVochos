import { Component, ElementRef, OnDestroy, computed, effect, inject, resource, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { CebaApi } from '../../core/api/ceba-api';
import { Y_MAX, Y_MIN, rampCss, yieldColor } from '../../core/colors';
import { descargarCSV, fmt } from '../../core/format';
import { esc } from '../../core/html';
import { NivelRiesgo, Parcela } from '../../core/models';
import { NIVELES, ORDEN_NIVELES } from '../../core/risk';
import { EstadoApp, valorMostrado } from '../../core/state';
import { IconComponent } from '../../shared/icon';
import { RendCellComponent } from '../../shared/rend-cell';
import { RiskBadgeComponent } from '../../shared/risk-badge';
import { EmptyStateComponent, ErrorStateComponent, SkelComponent } from '../../shared/states';

/* Mapa base oficial de OpenStreetMap. Requiere abrir la app por http(s), ver README. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const ZONAS = [
  { nombre: 'Calpulalpan, Tlaxcala', corto: 'Calpulalpan, Tlaxcala', estado: 'Tlaxcala' },
  { nombre: 'Singuilucan y Emiliano Zapata, Hidalgo', corto: 'Singuilucan y Emiliano Zapata, Hgo.', estado: 'Hidalgo' },
  { nombre: 'Chignahuapan, Puebla', corto: 'Chignahuapan, Puebla', estado: 'Puebla' },
];

interface Columna {
  k: string;
  t: string;
  r?: boolean;
  get: (p: Parcela) => string | number;
}
const COLUMNAS: Columna[] = [
  { k: 'id', t: 'ID', get: (p) => p.id },
  { k: 'municipio', t: 'Municipio', get: (p) => p.municipio },
  { k: 'area', t: 'Área (ha)', r: true, get: (p) => p.area_ha },
  { k: 'rend', t: 'Rend. (t/ha)', r: true, get: (p) => valorMostrado(p) },
  { k: 'int', t: 'Intervalo', r: true, get: (p) => (p.conjunto === 'PREDICCION' ? p.intervalo_inf : -1) },
];

const promedio = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

@Component({
  selector: 'ceba-mapa-page',
  imports: [RouterLink, IconComponent, SkelComponent, ErrorStateComponent, EmptyStateComponent, RiskBadgeComponent, RendCellComponent],
  templateUrl: './mapa-page.html',
  host: { style: 'display:contents' },
})
export class MapaPage implements OnDestroy {
  protected readonly estado = inject(EstadoApp);
  private readonly api = inject(CebaApi);
  private readonly router = inject(Router);

  protected readonly metricas = resource({ loader: () => this.api.metricas() });
  protected readonly parcelas = this.estado.parcelas;

  protected readonly Y_MIN = Y_MIN;
  protected readonly Y_MAX = Y_MAX;
  protected readonly zonas = ZONAS;
  protected readonly columnas = COLUMNAS;
  protected readonly niveles = NIVELES;
  protected readonly ordenNiveles = ORDEN_NIVELES;
  protected readonly rampa = rampCss();
  protected readonly fmt = fmt;
  protected readonly yieldColor = yieldColor;
  protected readonly valorMostrado = valorMostrado;

  private readonly mapaEl = viewChild<ElementRef<HTMLElement>>('mapa');
  private mapa: L.Map | null = null;
  private capa: L.LayerGroup | null = null;
  private anillo: L.CircleMarker | null = null;
  private marcadores = new Map<string, L.Layer & { getLatLng(): L.LatLng }>();
  private ro: ResizeObserver | null = null;

  protected readonly cargando = computed(() => this.parcelas.isLoading() || this.metricas.isLoading());
  protected readonly fallo = computed(() => this.parcelas.error() ?? this.metricas.error());

  protected readonly datos = computed(() => this.parcelas.value() ?? []);
  protected readonly estados = computed(() => [...new Set(this.datos().map((p) => p.estado))].sort());
  protected readonly municipios = computed(() => {
    const est = this.estado.filtros().estado;
    return [...new Set(this.datos().filter((p) => !est || p.estado === est).map((p) => p.municipio))].sort();
  });

  protected readonly kpis = computed(() => {
    const d = this.datos();
    const obs = d.filter((p) => p.rendimiento_obs != null);
    const pre = d.filter((p) => p.conjunto === 'PREDICCION');
    return {
      total: d.length, nObs: obs.length, nPred: pre.length,
      mObs: obs.length ? promedio(obs.map((p) => p.rendimiento_obs as number)) : NaN,
      mPred: pre.length ? promedio(pre.map((p) => p.rendimiento_pred)) : NaN,
    };
  });

  /** Parcelas que pasan los filtros. */
  protected readonly visibles = computed(() => {
    const f = this.estado.filtros();
    const riesgo = this.estado.colorPor() === 'riesgo';
    const nivel = this.estado.nivelFiltro();
    this.estado.equilibrio();
    return this.datos().filter((p) => {
      if (f.estado && p.estado !== f.estado) return false;
      if (f.municipio && p.municipio !== f.municipio) return false;
      if (f.conjunto && p.conjunto !== f.conjunto) return false;
      const v = valorMostrado(p);
      if (f.min > Y_MIN + 1e-9 && v < f.min - 1e-9) return false;
      if (f.max < Y_MAX - 1e-9 && v > f.max + 1e-9) return false;
      if (riesgo && nivel && this.estado.riesgoDe(p) !== nivel) return false;
      return true;
    });
  });

  protected readonly ordenadas = computed(() => {
    const { col, dir } = this.estado.orden();
    const c = COLUMNAS.find((x) => x.k === col) ?? COLUMNAS[0];
    return this.visibles()
      .slice()
      .sort((a, b) => {
        const x = c.get(a), y = c.get(b);
        const r = typeof x === 'string' ? x.localeCompare(y as string, 'es') : x - (y as number);
        return (r || a.id.localeCompare(b.id)) * dir;
      });
  });

  protected readonly conteoRiesgo = computed(() => {
    const cnt: Record<NivelRiesgo, number> = { bajo: 0, medio: 0, alto: 0 };
    this.estado.equilibrio();
    this.datos().forEach((p) => cnt[this.estado.riesgoDe(p)]++);
    return cnt;
  });

  protected readonly relleno = computed(() => {
    const f = this.estado.filtros();
    const a = ((f.min - Y_MIN) / (Y_MAX - Y_MIN)) * 100;
    const b = ((f.max - Y_MIN) / (Y_MAX - Y_MIN)) * 100;
    return { left: a, width: b - a };
  });

  protected readonly resaltada = signal<string | null>(null);

  constructor() {
    /* crea el mapa cuando ya existe su contenedor en pantalla */
    effect(() => {
      const el = this.mapaEl()?.nativeElement;
      const d = this.datos();
      if (!el || !d.length || this.mapa) return;
      this.crearMapa(el, d);
    });
    /* repinta los marcadores cuando cambia lo que se ve o cómo se colorea */
    effect(() => {
      const lista = this.visibles();
      this.estado.colorPor();
      this.estado.equilibrio();
      if (this.mapa) this.pintar(lista);
    });
    effect(() => this.resaltar(this.resaltada()));
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.mapa?.remove();
    this.mapa = null;
  }

  protected recargar(): void {
    this.parcelas.reload();
    this.metricas.reload();
  }

  /* ---------- mapa ---------- */
  private crearMapa(el: HTMLElement, d: Parcela[]): void {
    const mapa = L.map(el, { zoomControl: false, zoomSnap: 0.25, minZoom: 8, maxZoom: 17, attributionControl: true });
    L.tileLayer(TILES, { maxZoom: 19, attribution: TILES_ATTR }).addTo(mapa);
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
    this.capa = L.layerGroup().addTo(mapa);
    this.mapa = mapa;
    const todos = L.latLngBounds(d.map((p) => [p.lat, p.lon] as [number, number]));
    mapa.fitBounds(todos, { padding: [30, 30] });
    setTimeout(() => {
      mapa.invalidateSize();
      mapa.fitBounds(todos, { padding: [30, 30] });
    }, 60);
    this.ro = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.ro.observe(el);
    this.pintar(this.visibles());
  }

  private pintar(lista: Parcela[]): void {
    if (!this.capa) return;
    this.capa.clearLayers();
    this.marcadores.clear();
    const riesgo = this.estado.colorPor() === 'riesgo';
    for (const p of lista) {
      const pred = p.conjunto === 'PREDICCION';
      const m = riesgo
        ? L.marker([p.lat, p.lon], { icon: this.iconoRiesgo(p), keyboard: false })
        : L.circleMarker([p.lat, p.lon], {
            radius: 8, fillColor: yieldColor(valorMostrado(p)), fillOpacity: 0.95, color: '#16211a', weight: pred ? 2 : 1.2, dashArray: pred ? '3 3' : undefined,
          });
      m.bindTooltip(this.tooltip(p), { sticky: true, className: 'cb-tt', direction: 'top', offset: [0, -8] });
      m.on('click', () => this.abrir(p.id));
      m.addTo(this.capa);
      this.marcadores.set(p.id, m as unknown as L.Layer & { getLatLng(): L.LatLng });
    }
    this.resaltar(this.resaltada());
  }

  private tooltip(p: Parcela): string {
    const pred = p.conjunto === 'PREDICCION';
    let h = `<b>${esc(p.id)}</b> · ${esc(p.municipio)}<br>`;
    h += pred
      ? `Predicho: <b>${fmt(p.rendimiento_pred, 2)}</b> t/ha<br><span style='color:var(--ink-3)'>Intervalo ${fmt(p.intervalo_inf, 2)} a ${fmt(p.intervalo_sup, 2)}</span>`
      : `Observado: <b>${fmt(p.rendimiento_obs, 2)}</b> t/ha`;
    h += `<br><span style='color:var(--ink-3)'>${pred ? 'Parcela de predicción' : 'Parcela de entrenamiento'}</span>`;
    if (this.estado.colorPor() === 'riesgo') h += `<br><b>${NIVELES[this.estado.riesgoDe(p)].etiqueta}</b>`;
    return h;
  }

  private iconoRiesgo(p: Parcela): L.DivIcon {
    const n = this.estado.riesgoDe(p);
    const c = NIVELES[n].color;
    const dash = p.conjunto === 'PREDICCION' ? ' stroke-dasharray="3 2.2"' : '';
    const s = 22;
    const inner =
      n === 'bajo'
        ? `<circle cx="11" cy="11" r="8" fill="${c}" stroke="#16211a" stroke-width="2"${dash}/>`
        : n === 'medio'
          ? `<path d="M11 2.500 20 18.500H2z" fill="${c}" stroke="#16211a" stroke-width="2" stroke-linejoin="round"${dash}/>`
          : `<rect x="4" y="4" width="14" height="14" rx="1.500" transform="rotate(45 11 11)" fill="${c}" stroke="#16211a" stroke-width="2"${dash}/>`;
    return L.divIcon({ className: '', html: `<svg width="${s}" height="${s}" viewBox="0 0 22 22">${inner}</svg>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
  }

  private resaltar(id: string | null): void {
    if (!this.mapa) return;
    if (this.anillo) {
      this.mapa.removeLayer(this.anillo);
      this.anillo = null;
    }
    const m = id ? this.marcadores.get(id) : null;
    if (!m) return;
    this.anillo = L.circleMarker(m.getLatLng(), { radius: 15, fill: false, color: '#111', weight: 3, interactive: false }).addTo(this.mapa);
  }

  private abrir(id: string): void {
    this.estado.elegirParcela(id);
    this.router.navigate(['/parcela', id]);
  }

  /** Acerca el mapa a lo que quedó después de filtrar. */
  private reencuadrar(): void {
    const l = this.visibles();
    if (this.mapa && l.length) {
      this.mapa.flyToBounds(L.latLngBounds(l.map((p) => [p.lat, p.lon] as [number, number])), { padding: [40, 40], maxZoom: 13, duration: 0.5 });
    }
  }

  protected irAZona(i: number | 'todo'): void {
    if (!this.mapa) return;
    const d = this.datos();
    if (i === 'todo') {
      this.mapa.flyToBounds(L.latLngBounds(d.map((p) => [p.lat, p.lon] as [number, number])), { padding: [30, 30], duration: 0.6 });
      return;
    }
    const z = ZONAS[i];
    this.mapa.flyToBounds(L.latLngBounds(d.filter((p) => p.estado === z.estado).map((p) => [p.lat, p.lon] as [number, number])), { padding: [40, 40], duration: 0.6 });
  }

  /* ---------- filtros ---------- */
  private despues(): void {
    /* espera a que los filtros se reflejen en `visibles` */
    queueMicrotask(() => this.reencuadrar());
  }
  protected cambiarEstado(v: string): void {
    this.estado.filtros.update((f) => ({ ...f, estado: v, municipio: '' }));
    this.despues();
  }
  protected cambiarMunicipio(v: string): void {
    this.estado.filtros.update((f) => ({ ...f, municipio: v }));
    this.despues();
  }
  protected cambiarConjunto(v: string): void {
    this.estado.filtros.update((f) => ({ ...f, conjunto: v as '' | 'ENTRENAMIENTO' | 'PREDICCION' }));
    this.despues();
  }
  protected moverMin(v: string): void {
    this.estado.filtros.update((f) => ({ ...f, min: Math.min(+v, f.max) }));
  }
  protected moverMax(v: string): void {
    this.estado.filtros.update((f) => ({ ...f, max: Math.max(+v, f.min) }));
  }
  protected soltarRango(): void {
    this.despues();
  }
  protected limpiar(): void {
    this.estado.limpiarFiltros();
    this.despues();
  }
  protected colorear(v: 'rendimiento' | 'riesgo'): void {
    this.estado.colorPor.set(v);
    if (v === 'rendimiento') this.estado.nivelFiltro.set(null);
  }
  protected filtrarNivel(n: NivelRiesgo): void {
    this.estado.nivelFiltro.update((a) => (a === n ? null : n));
    this.despues();
  }

  /* ---------- tabla ---------- */
  protected ordenarPor(k: string): void {
    if (k === 'int' && this.estado.colorPor() === 'riesgo') return;
    this.estado.orden.update((o) => ({ col: k, dir: o.col === k ? (-o.dir as 1 | -1) : 1 }));
  }
  protected ariaOrden(k: string): 'ascending' | 'descending' | 'none' {
    const o = this.estado.orden();
    return o.col === k ? (o.dir > 0 ? 'ascending' : 'descending') : 'none';
  }
  protected iconoOrden(k: string): string {
    const a = this.ariaOrden(k);
    return a === 'none' ? 'sort' : a === 'ascending' ? 'up' : 'down';
  }
  protected abrirFila(id: string): void {
    this.abrir(id);
  }
  protected teclaFila(e: Event, id: string): void {
    e.preventDefault();
    this.abrir(id);
  }

  protected exportar(): void {
    descargarCSV('cebadata_parcelas.csv', this.ordenadas(), [
      { titulo: 'id', valor: (p) => p.id },
      { titulo: 'estado', valor: (p) => p.estado },
      { titulo: 'municipio', valor: (p) => p.municipio },
      { titulo: 'area_ha', valor: (p) => p.area_ha },
      { titulo: 'conjunto', valor: (p) => p.conjunto },
      { titulo: 'rendimiento_obs', valor: (p) => p.rendimiento_obs },
      { titulo: 'rendimiento_pred', valor: (p) => p.rendimiento_pred },
      { titulo: 'intervalo_inf', valor: (p) => p.intervalo_inf },
      { titulo: 'intervalo_sup', valor: (p) => p.intervalo_sup },
      { titulo: 'lat', valor: (p) => p.lat },
      { titulo: 'lon', valor: (p) => p.lon },
      { titulo: 'elevacion_m', valor: (p) => p.elevacion_m },
      { titulo: 'pendiente_grados', valor: (p) => p.pendiente_grados },
      { titulo: 'riesgo_crediticio', valor: (p) => this.estado.riesgoDe(p) },
    ]);
  }
}
