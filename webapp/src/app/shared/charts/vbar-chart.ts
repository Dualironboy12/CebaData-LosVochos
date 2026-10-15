import { Component, computed, input } from '@angular/core';

import { fmt } from '../../core/format';
import { TipDirective, b, filaK, tip, TipData } from '../../core/tooltip';
import { anchoDelHost, niceDomain, niceTicks, topRound } from './chart-utils';

export interface ItemColumna {
  label: string;
  tipTitle?: string;
  value: number;
}

/** Columnas verticales (lluvia mensual). */
@Component({
  selector: 'ceba-vbar',
  imports: [TipDirective],
  host: { style: 'display:block' },
  template: `
    @if (g(); as g) {
      <svg [attr.viewBox]="'0 0 ' + g.w + ' ' + g.h" [attr.width]="g.w" [attr.height]="g.h" role="img" [attr.aria-label]="aria()">
        @for (t of g.ticks; track t.v) {
          <line class="grid-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="ax-text" [attr.x]="g.ml - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.texto }}</text>
        }
        <text class="ax-title" [attr.x]="g.ml" y="10">{{ unit() }}</text>
        @for (c of g.cols; track c.label) {
          <g class="bar-g" tabindex="0" [cebaTip]="c.tip">
            <rect [attr.x]="c.xHit" [attr.y]="g.mt" [attr.width]="g.step" [attr.height]="g.ph" fill="transparent" />
            <path [attr.d]="c.path" fill="var(--s-blue)" />
            <text class="lbl-ink" [attr.x]="c.cx" [attr.y]="c.top - 6" text-anchor="middle">{{ c.texto }}</text>
          </g>
          <text class="ax-text" [attr.x]="c.cx" [attr.y]="g.h - 8" text-anchor="middle">{{ c.label }}</text>
        }
        <line class="axis-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="g.base" [attr.y2]="g.base" />
      </svg>
    }
  `,
})
export class VbarChart {
  readonly items = input.required<ItemColumna[]>();
  readonly unit = input<string>('');
  readonly name = input<string>('Valor');
  readonly aria = input<string>('');
  readonly height = input<number>(230);

  private readonly ancho = anchoDelHost();

  protected readonly g = computed(() => {
    const w = this.ancho();
    const items = this.items();
    if (!w || !items.length) return null;
    const h = this.height();
    const ml = 44, mr = 8, mt = 22, mb = 28;
    const pw = w - ml - mr, ph = h - mt - mb;
    const maxV = Math.max(...items.map((i) => i.value));
    const dom = niceDomain(0, maxV * 1.1, 4);
    const tk = niceTicks(dom.lo, dom.hi, 4);
    const y = (v: number) => mt + ph - ((v - dom.lo) / (dom.hi - dom.lo)) * ph;
    const step = pw / items.length;
    const bw = Math.min(44, step * 0.56);
    return {
      w, h, ml, mr, mt, ph, step, base: y(dom.lo),
      ticks: tk.ticks.map((v) => ({ v, y: y(v), texto: fmt(v, 0) })),
      cols: items.map((it, i) => {
        const x = ml + step * i + (step - bw) / 2;
        const top = y(it.value);
        const t: TipData = tip(it.tipTitle ?? it.label, filaK('var(--s-blue)', `${this.name()}: `, b(fmt(it.value, 0)), ` ${this.unit()}`));
        return { label: it.label, tip: t, xHit: ml + step * i, cx: x + bw / 2, top, path: topRound(x, top, bw, y(dom.lo) - top, 4), texto: fmt(it.value, 0) };
      }),
    };
  });
}
