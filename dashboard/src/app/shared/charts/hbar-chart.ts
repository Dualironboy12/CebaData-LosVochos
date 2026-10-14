import { Component, computed, input } from '@angular/core';

import { fmt } from '../../core/format';
import { TipDirective, TipData, b, fila, tip } from '../../core/tooltip';
import { decimals, niceTicks } from './chart-utils';

export interface ItemBarra {
  label: string;
  value: number;
  /** línea gris debajo de la etiqueta */
  sub?: string;
  /** etiqueta en negritas (la barra destacada) */
  key?: boolean;
  cls?: '' | 'mute' | 'strong' | 'warn';
  flag?: string;
  tip?: TipData;
}

/** Barras horizontales con etiqueta a la izquierda, valor al final, línea de referencia y eje opcionales. */
@Component({
  selector: 'ceba-hbar',
  imports: [TipDirective],
  template: `
    <div class="hbars" [class.with-ref]="ref()" [style]="estilo()">
      @for (it of items(); track it.label) {
        <div class="hbar" [class.is-key]="it.key" tabindex="0" [cebaTip]="tipDe(it)">
          <div class="hbar-label">
            {{ it.label }}
            @if (it.sub) {
              <small>{{ it.sub }}</small>
            }
          </div>
          <div class="hbar-track">
            <div class="hbar-fill" [class]="it.cls ?? ''" [style.width.%]="pct(it)"></div>
            <div class="hbar-val" [style.left.%]="pct(it)">
              {{ f(it.value) }}
              @if (it.flag) {
                <span class="flag" [class.warn]="it.cls === 'warn'">{{ it.flag }}</span>
              }
            </div>
          </div>
        </div>
      }
      @if (refPos(); as r) {
        <div class="hbar-ref" [class.end]="r.fr > 0.7" [style.left]="r.left">
          <span>{{ r.label }}</span>
        </div>
      }
    </div>
    @if (eje(); as e) {
      <div class="hbars-axis" [style]="'--lw:' + labelWidth() + 'px'">
        <i></i>
        <div>
          @for (t of e; track t.v) {
            <span [style.left.%]="t.left">{{ t.texto }}</span>
          }
        </div>
      </div>
    }
  `,
})
export class HbarChart {
  readonly items = input.required<ItemBarra[]>();
  readonly max = input<number | undefined>(undefined);
  readonly decimales = input<number>(2);
  readonly labelWidth = input<number>(170);
  readonly axis = input<boolean>(false);
  readonly ref = input<{ value: number; label: string } | undefined>(undefined);
  readonly valueName = input<string>('Valor');
  readonly unit = input<string>('');

  protected readonly tope = computed(() => this.max() ?? Math.max(...this.items().map((i) => i.value)) * 1.18);
  protected readonly estilo = computed(() => `--lw:${this.labelWidth()}px;--lg:12px`);

  protected readonly refPos = computed(() => {
    const r = this.ref();
    if (!r) return null;
    const fr = r.value / this.tope();
    return { fr, label: r.label, left: `calc(var(--lw) + var(--lg) + (100% - var(--lw) - var(--lg)) * ${fr.toFixed(4)})` };
  });

  protected readonly eje = computed(() => {
    if (!this.axis()) return null;
    const max = this.tope();
    const tk = niceTicks(0, max, 5);
    const dd = decimals(tk.step);
    return tk.ticks.map((v) => ({ v, left: (v / max) * 100, texto: fmt(v, dd) }));
  });

  protected pct(it: ItemBarra): number {
    return Math.max(0, (it.value / this.tope()) * 100);
  }
  protected f(v: number): string {
    return fmt(v, this.decimales());
  }
  protected tipDe(it: ItemBarra): TipData {
    return it.tip ?? tip(it.label, fila(`${this.valueName()}: `, b(this.f(it.value)), this.unit() ? ` ${this.unit()}` : ''));
  }
}
