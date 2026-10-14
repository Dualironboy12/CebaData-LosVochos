import { Component, computed, inject, input, signal } from '@angular/core';

import { fmt, fmtSigned } from '../../core/format';
import { TooltipService, b, fila, filaK, filaSub, tip } from '../../core/tooltip';
import { anchoDelHost, decimals, niceDomain, niceTicks } from './chart-utils';

export type Forma = 'circulo' | 'cuadro' | 'triangulo';
export interface GrupoDispersion {
  nombre: string;
  color: string;
  forma: Forma;
}
export interface PuntoDisp {
  id: string;
  mun: string;
  g: string;
  x: number;
  y: number;
}

/** Observado contra predicho; cada estado con su color y su forma. */
@Component({
  selector: 'ceba-scatter',
  host: { style: 'display:block' },
  template: `
    @if (c(); as c) {
      <svg [attr.viewBox]="'0 0 ' + c.w + ' ' + c.h" [attr.width]="c.w" [attr.height]="c.h" role="img" [attr.aria-label]="aria()">
        @for (t of c.ticks; track t.v) {
          <line class="grid-line" [attr.x1]="c.ml" [attr.x2]="c.w - c.mr" [attr.y1]="t.p" [attr.y2]="t.p" />
          <line class="grid-line" [attr.y1]="c.mt" [attr.y2]="c.mt + c.ph" [attr.x1]="t.q" [attr.x2]="t.q" />
          <text class="ax-text" [attr.x]="c.ml - 8" [attr.y]="t.p + 4" text-anchor="end">{{ t.texto }}</text>
          <text class="ax-text" [attr.x]="t.q" [attr.y]="c.mt + c.ph + 16" text-anchor="middle">{{ t.texto }}</text>
        }
        <line [attr.x1]="c.d1.x" [attr.y1]="c.d1.y" [attr.x2]="c.d2.x" [attr.y2]="c.d2.y" stroke="var(--ink-2)" stroke-width="1.5" stroke-dasharray="6 4" />
        <text class="lbl-ink2" [attr.x]="c.d2.x - 6" [attr.y]="c.d1.y - 8" text-anchor="end">Línea punteada: predicción perfecta (1:1)</text>
        <text class="ax-title" [attr.x]="c.ml + c.pw / 2" [attr.y]="c.h - 6" text-anchor="middle">Rendimiento observado (t/ha)</text>
        <text class="ax-title" [attr.transform]="'translate(13 ' + (c.mt + c.ph / 2) + ') rotate(-90)'" text-anchor="middle">Rendimiento predicho (t/ha)</text>
        @for (p of c.puntos; track p.id) {
          @switch (p.forma) {
            @case ('circulo') {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" [attr.fill]="p.color" fill-opacity=".72" stroke="var(--surface)" stroke-width="1.3" />
            }
            @case ('cuadro') {
              <rect [attr.x]="p.x - 5" [attr.y]="p.y - 5" width="10" height="10" rx="1.5" [attr.fill]="p.color" fill-opacity=".72" stroke="var(--surface)" stroke-width="1.3" />
            }
            @default {
              <path [attr.d]="p.tri" [attr.fill]="p.color" fill-opacity=".72" stroke="var(--surface)" stroke-width="1.3" />
            }
          }
        }
        @if (anillo(); as a) {
          <circle [attr.cx]="a.x" [attr.cy]="a.y" r="9" fill="none" stroke="var(--ink)" stroke-width="2" />
        }
        <rect
          [attr.x]="c.ml" [attr.y]="c.mt" [attr.width]="c.pw" [attr.height]="c.ph" fill="transparent" style="touch-action:pan-y"
          (pointermove)="mover($event)" (pointerdown)="mover($event)" (pointerleave)="salir()"
        />
      </svg>
    }
  `,
})
export class ScatterChart {
  readonly puntos = input.required<PuntoDisp[]>();
  readonly grupos = input.required<Record<string, GrupoDispersion>>();
  readonly aria = input<string>('');

  private readonly ancho = anchoDelHost();
  private readonly tt = inject(TooltipService);
  protected readonly anillo = signal<{ x: number; y: number } | null>(null);

  protected readonly c = computed(() => {
    const w = this.ancho();
    const pts = this.puntos();
    if (!w || !pts.length) return null;
    const h = Math.min(w * 0.82, 420);
    const ml = 48, mr = 14, mt = 12, mb = 42;
    const pw = w - ml - mr, ph = h - mt - mb;
    const vs = pts.flatMap((p) => [p.x, p.y]);
    const dom = niceDomain(Math.min(...vs) - 0.05, Math.max(...vs) + 0.05, 9);
    const tk = niceTicks(dom.lo, dom.hi, 9);
    const dd = decimals(tk.step);
    const X = (v: number) => ml + ((v - dom.lo) / (dom.hi - dom.lo)) * pw;
    const Y = (v: number) => mt + ph - ((v - dom.lo) / (dom.hi - dom.lo)) * ph;
    const g = this.grupos();
    return {
      w, h, ml, mr, mt, ph, pw, X, Y,
      ticks: tk.ticks.map((v) => ({ v, p: Y(v), q: X(v), texto: fmt(v, dd) })),
      d1: { x: X(dom.lo), y: Y(dom.lo) }, d2: { x: X(dom.hi), y: Y(dom.hi) },
      puntos: pts.map((p) => {
        const x = +X(p.x).toFixed(1), y = +Y(p.y).toFixed(1), r = 5;
        return {
          id: p.id, x, y, color: g[p.g].color, forma: g[p.g].forma,
          tri: `M${x},${y - r * 1.2}L${x + r * 1.1},${y + r * 0.85}L${x - r * 1.1},${y + r * 0.85}Z`,
        };
      }),
    };
  });

  protected mover(e: PointerEvent): void {
    const c = this.c();
    if (!c) return;
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    const k = c.w / r.width;
    const mx = (e.clientX - r.left) * k, my = (e.clientY - r.top) * k;
    let best: PuntoDisp | null = null;
    let bd = 18 * 18;
    for (const p of this.puntos()) {
      const dx = c.X(p.x) - mx, dy = c.Y(p.y) - my, d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (!best) return this.salir();
    this.anillo.set({ x: c.X(best.x), y: c.Y(best.y) });
    const g = this.grupos()[best.g];
    this.tt.mostrar(
      tip(`${best.id} · ${best.mun}`, filaK(g.color, g.nombre), fila('Observado: ', b(fmt(best.x, 2)), ' t/ha'), fila('Predicho: ', b(fmt(best.y, 2)), ' t/ha'), filaSub(`Diferencia: ${fmtSigned(best.x - best.y, 2)} t/ha`)),
      e.clientX, e.clientY,
    );
  }
  protected salir(): void {
    this.anillo.set(null);
    this.tt.ocultar();
  }
}
