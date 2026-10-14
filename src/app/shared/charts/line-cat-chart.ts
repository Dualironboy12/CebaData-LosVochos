import { Component, computed, inject, input, signal } from '@angular/core';

import { fmt } from '../../core/format';
import { TooltipService, b, filaK, tip } from '../../core/tooltip';
import { anchoDelHost, decimals, niceDomain, niceTicks } from './chart-utils';

export interface SerieLinea {
  name: string;
  short: string;
  color: string;
  values: number[];
}

/** Líneas por categoría (temperaturas mensuales), con cruz y tooltip al pasar el cursor. */
@Component({
  selector: 'ceba-line-cat',
  host: { style: 'display:block' },
  template: `
    @if (g(); as g) {
      <svg [attr.viewBox]="'0 0 ' + g.w + ' ' + g.h" [attr.width]="g.w" [attr.height]="g.h" role="img" [attr.aria-label]="aria()">
        @for (t of g.ticks; track t.v) {
          <line class="grid-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="ax-text" [attr.x]="g.ml - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.texto }}</text>
        }
        <text class="ax-title" [attr.x]="g.ml" y="10">{{ unit() }}</text>
        @for (c of cats(); track $index) {
          <text class="ax-text" [attr.x]="g.X($index)" [attr.y]="g.h - 8" text-anchor="middle">{{ c }}</text>
        }
        <line class="axis-line" [attr.x1]="g.ml" [attr.x2]="g.w - g.mr" [attr.y1]="g.mt + g.ph" [attr.y2]="g.mt + g.ph" />
        @if (activo() !== null) {
          <line class="cross" [attr.x1]="g.X(activo()!)" [attr.x2]="g.X(activo()!)" [attr.y1]="g.mt" [attr.y2]="g.mt + g.ph" />
        }
        @for (s of g.series; track s.name) {
          <path [attr.d]="s.d" fill="none" [attr.stroke]="s.color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
          @for (p of s.pts; track $index) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="activo() === $index ? 6.5 : 4.5" [attr.fill]="s.color" stroke="var(--surface)" stroke-width="2" />
          }
          <text class="lbl-ink2" [attr.x]="s.lx" [attr.y]="s.ly" >{{ s.short }}</text>
        }
        <rect
          [attr.x]="g.ml" [attr.y]="g.mt" [attr.width]="g.pw" [attr.height]="g.ph" fill="transparent" style="touch-action:pan-y"
          (pointermove)="mover($event, g)" (pointerdown)="mover($event, g)" (pointerleave)="salir()"
        />
      </svg>
    }
  `,
})
export class LineCatChart {
  readonly cats = input.required<string[]>();
  readonly series = input.required<SerieLinea[]>();
  readonly unit = input<string>('');
  readonly aria = input<string>('');
  readonly height = input<number>(230);

  private readonly ancho = anchoDelHost();
  private readonly tt = inject(TooltipService);
  protected readonly activo = signal<number | null>(null);

  protected readonly g = computed(() => {
    const w = this.ancho();
    const cats = this.cats();
    if (!w || !cats.length) return null;
    const h = this.height();
    const ml = 44, mr = 40, mt = 22, mb = 28;
    const pw = w - ml - mr, ph = h - mt - mb;
    const todo = this.series().flatMap((s) => s.values);
    const dom = niceDomain(Math.min(...todo) - 1.2, Math.max(...todo) + 1.2, 4);
    const tk = niceTicks(dom.lo, dom.hi, 4);
    const step = pw / cats.length;
    const X = (i: number) => ml + step * i + step / 2;
    const Y = (v: number) => mt + ph - ((v - dom.lo) / (dom.hi - dom.lo)) * ph;
    const dd = decimals(tk.step);
    return {
      w, h, ml, mr, mt, ph, pw, step, X,
      ticks: tk.ticks.map((v) => ({ v, y: Y(v), texto: fmt(v, dd) })),
      series: this.series().map((s) => {
        const pts = s.values.map((v, i) => ({ x: X(i), y: Y(v) }));
        const last = pts[pts.length - 1];
        return {
          name: s.name, short: s.short, color: s.color, pts,
          d: pts.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(''),
          lx: last.x + 10, ly: last.y + 4,
        };
      }),
    };
  });

  protected mover(e: PointerEvent, g: { ml: number; step: number }): void {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    const w = this.ancho();
    const x = (e.clientX - r.left) * (w / r.width);
    const n = this.cats().length;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - g.ml) / g.step)));
    this.activo.set(i);
    this.tt.mostrar(
      tip(this.cats()[i], ...this.series().map((s) => filaK(s.color, `${s.name}: `, b(fmt(s.values[i], 1)), ` ${this.unit()}`))),
      e.clientX, e.clientY,
    );
  }
  protected salir(): void {
    this.activo.set(null);
    this.tt.ocultar();
  }
}
