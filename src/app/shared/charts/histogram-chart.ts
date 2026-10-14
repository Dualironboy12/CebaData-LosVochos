import { Component, computed, input } from '@angular/core';

import { fmt, fmtSigned } from '../../core/format';
import { TipDirective, b, filaK, tip } from '../../core/tooltip';
import { anchoDelHost, niceDomain, niceTicks, topRound } from './chart-utils';

/** Histograma de residuales (observado menos predicho). */
@Component({
  selector: 'ceba-histogram',
  imports: [TipDirective],
  host: { style: 'display:block' },
  template: `
    @if (c(); as c) {
      <svg [attr.viewBox]="'0 0 ' + c.w + ' ' + c.h" [attr.width]="c.w" [attr.height]="c.h" role="img" [attr.aria-label]="aria()">
        @for (t of c.ticks; track t.v) {
          <line class="grid-line" [attr.x1]="c.ml" [attr.x2]="c.w - c.mr" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="ax-text" [attr.x]="c.ml - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.texto }}</text>
        }
        @for (bn of c.bins; track bn.i) {
          <g tabindex="0" [cebaTip]="bn.tip">
            <rect [attr.x]="bn.x - 1" [attr.y]="c.mt" [attr.width]="bn.w + 2" [attr.height]="c.ph" fill="transparent" />
            @if (bn.n) {
              <path [attr.d]="bn.path" fill="var(--bar)" />
            }
          </g>
        }
        <line class="axis-line" [attr.x1]="c.ml" [attr.x2]="c.w - c.mr" [attr.y1]="c.y0" [attr.y2]="c.y0" />
        <line [attr.x1]="c.x0" [attr.x2]="c.x0" [attr.y1]="c.mt" [attr.y2]="c.y0" stroke="var(--ink)" stroke-width="1.5" />
        @for (m of c.marcas; track m.v) {
          <text class="ax-text" [attr.x]="m.x" [attr.y]="c.y0 + 16" text-anchor="middle">{{ m.texto }}</text>
        }
        <text class="ax-title" [attr.x]="c.ml + c.pw / 2" [attr.y]="c.h - 22" text-anchor="middle">Residual: observado menos predicho (t/ha)</text>
        <text class="ax-text" [attr.x]="c.ml" [attr.y]="c.h - 6">← El modelo predijo de más</text>
        <text class="ax-text" [attr.x]="c.w - c.mr" [attr.y]="c.h - 6" text-anchor="end">El modelo predijo de menos →</text>
        <text class="ax-title" [attr.x]="c.ml" y="8">Parcelas</text>
      </svg>
    }
  `,
})
export class HistogramChart {
  readonly values = input.required<number[]>();
  readonly bin = input<number>(0.2);
  readonly aria = input<string>('');

  private readonly ancho = anchoDelHost();

  protected readonly c = computed(() => {
    const w = this.ancho();
    const vals = this.values();
    if (!w || !vals.length) return null;
    const h = 250;
    const ml = 40, mr = 10, mt = 14, mb = 54;
    const pw = w - ml - mr, ph = h - mt - mb, bw = this.bin();
    const lo = Math.floor(Math.min(...vals) / bw) * bw;
    const hi = Math.ceil((Math.max(...vals) + 1e-9) / bw) * bw;
    const nb = Math.round((hi - lo) / bw);
    const cuentas = new Array<number>(nb).fill(0);
    vals.forEach((v) => cuentas[Math.min(nb - 1, Math.floor((v - lo) / bw))]++);
    const dom = niceDomain(0, Math.max(...cuentas) * 1.1, 4);
    const tk = niceTicks(0, dom.hi, 4);
    const X = (v: number) => ml + ((v - lo) / (hi - lo)) * pw;
    const Y = (v: number) => mt + ph - (v / dom.hi) * ph;
    const marcas: { v: number; x: number; texto: string }[] = [];
    for (let v = Math.ceil(lo); v <= hi + 1e-9; v += 0.5) marcas.push({ v, x: X(v), texto: fmtSigned(v, 1).replace('+', '') });
    return {
      w, h, ml, mr, mt, ph, pw, y0: Y(0), x0: X(0), marcas,
      ticks: tk.ticks.map((v) => ({ v, y: Y(v), texto: fmt(v, 0) })),
      bins: cuentas.map((n, i) => {
        const a = lo + i * bw, bb = a + bw, x = X(a) + 1, ancho = X(bb) - X(a) - 2, top = Y(n);
        return {
          i, n, x, w: ancho, path: topRound(x, top, ancho, Y(0) - top, 3),
          tip: tip(`${fmtSigned(a, 1)} a ${fmtSigned(bb, 1)} t/ha`, filaK('var(--bar)', b(n), ' parcelas')),
        };
      }),
    };
  });
}
