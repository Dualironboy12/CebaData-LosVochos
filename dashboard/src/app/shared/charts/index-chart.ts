import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { fmt, MESES_CORTO, MESES_LARGO } from '../../core/format';
import { TooltipService, b, filaK, tip } from '../../core/tooltip';
import { EmptyStateComponent } from '../states';
import { anchoDelHost, decimals, niceDomain, niceTicks } from './chart-utils';

export interface PuntoIndice {
  fecha: string;
  valor: number;
}
interface Pt {
  t: number;
  v: number;
}
const DIA = 86400000;

/** Promedio móvil gaussiano: la "curva suavizada" que se dibuja sobre las observaciones. */
function suavizar(pts: Pt[], t0: number, t1: number, bw: number): Pt[] {
  const out: Pt[] = [];
  for (let t = t0; t <= t1; t += DIA * 2) {
    let sw = 0;
    let sv = 0;
    for (const p of pts) {
      const z = (t - p.t) / (bw * DIA);
      const w = Math.exp(-0.5 * z * z);
      sw += w;
      sv += w * p.v;
    }
    if (sw > 1e-6) out.push({ t, v: sv / sw });
  }
  return out;
}

/** Curva de un índice satelital a lo largo de 2025, con el pico del ciclo marcado. */
@Component({
  selector: 'ceba-index-chart',
  imports: [EmptyStateComponent],
  host: { style: 'display:block' },
  template: `
    @if (!puntos().length) {
      <ceba-empty-state icono="layers" titulo="Sin observaciones" texto="No hay imágenes disponibles de esta fuente para la parcela." />
    } @else if (g(); as g) {
      <svg [attr.viewBox]="'0 0 ' + g.w + ' ' + g.h" [attr.width]="g.w" [attr.height]="g.h" role="img" [attr.aria-label]="aria()">
        <rect class="band" [attr.x]="g.bx0" [attr.y]="g.mt" [attr.width]="g.bx1 - g.bx0" [attr.height]="g.ph" />
        <text class="band-text" [attr.x]="(g.bx0 + g.bx1) / 2" [attr.y]="g.mt - 10" text-anchor="middle">Ciclo abril a octubre</text>
        @for (t of g.ticks; track t.v) {
          <line class="grid-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="ax-text" [attr.x]="g.ml - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.texto }}</text>
        }
        @for (m of g.meses; track m.x) {
          <text class="ax-text" [attr.x]="m.x" [attr.y]="g.h - 9" text-anchor="middle">{{ m.texto }}</text>
        }
        <line class="axis-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="g.mt + g.ph" [attr.y2]="g.mt + g.ph" />
        <path [attr.d]="g.curva" fill="none" stroke="var(--bar-strong)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        @for (p of g.obs; track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.6" fill="var(--bar)" fill-opacity=".75" stroke="var(--surface)" stroke-width="1.2" />
        }
        <line [attr.x1]="g.px" [attr.x2]="g.px" [attr.y1]="g.py + 8" [attr.y2]="g.mt + g.ph" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="2 3" />
        <circle [attr.cx]="g.px" [attr.cy]="g.py" r="6.5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5" />
        <text class="lbl-ink" [attr.x]="g.lx" [attr.y]="g.py - 14" text-anchor="middle" paint-order="stroke" stroke="var(--surface)" stroke-width="4" stroke-linejoin="round">{{ g.textoPico }}</text>
        @if (cursor(); as c) {
          <line class="cross" [attr.x1]="c.x" [attr.x2]="c.x" [attr.y1]="g.mt" [attr.y2]="g.mt + g.ph" />
          <circle [attr.cx]="c.x" [attr.cy]="c.y" r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" />
        }
        <rect
          [attr.x]="g.ml" [attr.y]="g.mt" [attr.width]="g.pw" [attr.height]="g.ph" fill="transparent" style="touch-action:pan-y"
          (pointermove)="mover($event)" (pointerdown)="mover($event)" (pointerleave)="salir()"
        />
      </svg>
    }
  `,
})
export class IndexChart {
  readonly puntos = input.required<PuntoIndice[]>();
  readonly decimales = input<number>(2);
  readonly aria = input<string>('');
  readonly pico = output<{ valor: number; fecha: number }>();

  private readonly ancho = anchoDelHost();
  private readonly tt = inject(TooltipService);
  protected readonly cursor = signal<{ x: number; y: number } | null>(null);

  private readonly pts = computed<Pt[]>(() =>
    this.puntos()
      .map((p) => {
        const q = p.fecha.split('-');
        return { t: Date.UTC(+q[0], +q[1] - 1, +q[2]), v: p.valor };
      })
      .sort((a, b) => a.t - b.t),
  );
  private readonly curva = computed(() => {
    const pts = this.pts();
    return pts.length ? suavizar(pts, pts[0].t, pts[pts.length - 1].t, 9) : [];
  });

  private readonly T0 = Date.UTC(2025, 2, 15);
  private readonly T1 = Date.UTC(2025, 10, 15);

  protected readonly g = computed(() => {
    const w = this.ancho();
    const pts = this.pts();
    const cur = this.curva();
    if (!w || !pts.length) return null;
    const h = w < 520 ? 260 : 300;
    const ml = 46, mr = 14, mt = 30, mb = 30;
    const pw = w - ml - mr, ph = h - mt - mb;
    const { T0, T1 } = this;
    const vs = [...pts.map((p) => p.v), ...cur.map((c) => c.v)];
    const vmin = Math.min(...vs), vmax = Math.max(...vs), pad = (vmax - vmin) * 0.12;
    const dom = niceDomain(vmin - pad, vmax + pad, 5);
    const tk = niceTicks(dom.lo, dom.hi, 5);
    const dd = decimals(tk.step);
    const X = (t: number) => ml + ((t - T0) / (T1 - T0)) * pw;
    const Y = (v: number) => mt + ph - ((v - dom.lo) / (dom.hi - dom.lo)) * ph;
    const peak = cur.reduce((m, c) => (c.v > m.v ? c : m), cur[0]);
    const pd = new Date(peak.t);
    const px = X(peak.t), py = Y(peak.v);
    const nombres = ['mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov'];
    const saltar = w < 520;
    return {
      w, h, ml, mr, mt, ph, pw, px, py, X, Y, peak,
      bx0: X(Date.UTC(2025, 3, 1)), bx1: X(Date.UTC(2025, 9, 31)),
      ticks: tk.ticks.map((v) => ({ v, y: Y(v), texto: fmt(v, dd) })),
      meses: nombres.flatMap((texto, i) => {
        const t = Date.UTC(2025, 2 + i, 1);
        return t < T0 || (saltar && i % 2 === 1) ? [] : [{ x: X(t), texto }];
      }),
      curva: cur.map((c, i) => (i ? 'L' : 'M') + X(c.t).toFixed(1) + ',' + Y(c.v).toFixed(1)).join(''),
      obs: pts.map((p) => ({ x: +X(p.t).toFixed(1), y: +Y(p.v).toFixed(1) })),
      textoPico: `Pico ${fmt(peak.v, this.decimales())} · ${pd.getUTCDate()} ${MESES_CORTO[pd.getUTCMonth()]}`,
      lx: Math.max(ml + 56, Math.min(w - mr - 56, px)),
    };
  });

  constructor() {
    /* avisa al padre cuándo y cuánto fue el pico de la curva */
    effect(() => {
      const g = this.g();
      if (g) this.pico.emit({ valor: g.peak.v, fecha: g.peak.t });
    });
  }

  protected mover(e: PointerEvent): void {
    const g = this.g();
    if (!g) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    const x = (e.clientX - r.left) * (g.w / r.width);
    const t = this.T0 + ((x - g.ml) / g.pw) * (this.T1 - this.T0);
    const pts = this.pts(), cur = this.curva();
    const cercano = (lista: Pt[], t0: number) => lista.reduce((m, p) => (Math.abs(p.t - t0) < Math.abs(m.t - t0) ? p : m), lista[0]);
    const near = cercano(pts, t);
    const usaObs = Math.abs(g.X(near.t) - x) < 14;
    const c = cercano(cur, t);
    const ref = usaObs ? near : c;
    if (!usaObs && Math.abs(c.t - t) > 4 * DIA) {
      this.salir();
      return;
    }
    this.cursor.set({ x: g.X(ref.t), y: g.Y(usaObs ? near.v : c.v) });
    const dt = new Date(ref.t);
    const cc = cercano(cur, ref.t);
    const d = this.decimales();
    const filas = [];
    if (usaObs) filas.push(filaK('var(--bar)', 'Observación: ', b(fmt(near.v, d))));
    filas.push(filaK('var(--bar-strong)', 'Curva suavizada: ', b(fmt(cc.v, d))));
    this.tt.mostrar(tip(`${dt.getUTCDate()} de ${MESES_LARGO[dt.getUTCMonth()]} de 2025`, ...filas), e.clientX, e.clientY);
  }
  protected salir(): void {
    this.cursor.set(null);
    this.tt.ocultar();
  }
}
