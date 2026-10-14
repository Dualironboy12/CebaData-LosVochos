import { Component, computed, input } from '@angular/core';

import { fmt, fmtSigned } from '../../core/format';
import { TipDirective, TipData, b, fila, filaK, filaSub, tip } from '../../core/tooltip';
import { decimals, niceDomain, niceTicks } from './chart-utils';

export interface ItemCascada {
  etiqueta: string;
  valorTexto: string;
  contribucion: number;
}

/** Cascada horizontal estilo SHAP: parte del promedio y suma lo que aporta cada variable. */
@Component({
  selector: 'ceba-waterfall',
  imports: [TipDirective],
  template: `
    @if (m(); as m) {
      <div class="wf">
        <div class="wf-grid">
          @for (t of m.ticks; track t.v) {
            <i [style.left.%]="t.p"></i>
          }
        </div>

        <div class="wf-row" tabindex="0" [cebaTip]="m.tipBase">
          <div class="wf-name">Promedio de las parcelas<small>Punto de partida</small></div>
          <div class="wf-plot">
            <span class="wf-punto" style="background:var(--bar-mute);box-shadow:0 0 0 1.5px var(--bar-mute)" [style.left]="'calc(' + m.pBase + '% - 8px)'"></span>
            <span class="wf-val" [style.left]="'calc(' + m.pBase + '% + 14px)'">{{ m.textoBase }}</span>
          </div>
        </div>

        @for (r of m.filas; track r.etiqueta) {
          <div class="wf-row" tabindex="0" [cebaTip]="r.tip">
            <div class="wf-name">{{ r.etiqueta }}<small>{{ r.valorTexto }}</small></div>
            <div class="wf-plot">
              <div class="wf-bar" [class.up]="r.sube" [class.down]="!r.sube" [style.left.%]="r.l" [style.width]="'max(3px,' + r.ancho + '%)'"></div>
              <span class="wf-val" [style.left]="'calc(' + r.pFin + '% + 7px)'"><span class="arrow">{{ r.sube ? '▲' : '▼' }}</span>{{ r.texto }}</span>
              <span class="wf-conn" [style.left.%]="r.pFin"></span>
            </div>
          </div>
        }

        <div class="wf-row" tabindex="0" [cebaTip]="m.resto.tip">
          <div class="wf-name">Otras variables<small>{{ otrasSub() }}</small></div>
          <div class="wf-plot">
            <div class="wf-bar" [class.up]="m.resto.sube" [class.down]="!m.resto.sube" [style.left.%]="m.resto.l" [style.width]="'max(3px,' + m.resto.ancho + '%)'"></div>
            <span class="wf-val" [style.left]="'calc(' + m.resto.pFin + '% + 7px)'"><span class="arrow">{{ m.resto.sube ? '▲' : '▼' }}</span>{{ m.resto.texto }}</span>
            <span class="wf-conn" [style.left.%]="m.resto.pFin"></span>
          </div>
        </div>

        <div class="wf-row sep" tabindex="0" [cebaTip]="m.tipFinal">
          <div class="wf-name">Predicción de esta parcela<small>Resultado final</small></div>
          <div class="wf-plot">
            <span class="wf-punto" style="background:var(--ink);box-shadow:0 0 0 1.5px var(--ink)" [style.left]="'calc(' + m.pFinal + '% - 8px)'"></span>
            <span class="wf-val" [style.left]="'calc(' + m.pFinal + '% + 14px)'"><b>{{ m.textoFinal }}</b></span>
          </div>
        </div>

        <div class="wf-axis">
          <i></i>
          <div>
            @for (t of m.ticks; track t.v) {
              <span [style.left.%]="t.p">{{ t.texto }}</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .wf-punto { position: absolute; top: 11px; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--surface); }
  `,
})
export class WaterfallChart {
  readonly base = input.required<number>();
  readonly otras = input.required<number>();
  readonly items = input.required<ItemCascada[]>();
  readonly otrasSub = input<string>('Efecto combinado del resto');

  protected readonly m = computed(() => {
    const base = this.base();
    let cum = base, lo = base, hi = base;
    const tramos = this.items().map((it) => {
      const a = cum;
      cum += it.contribucion;
      lo = Math.min(lo, cum);
      hi = Math.max(hi, cum);
      return { it, a, b: cum };
    });
    const resto = { a: cum, b: cum + this.otras() };
    cum = resto.b;
    lo = Math.min(lo, cum);
    hi = Math.max(hi, cum);
    const pad = (hi - lo) * 0.14 + 0.04;
    const dom = niceDomain(lo - pad, hi + pad, 5);
    const tk = niceTicks(dom.lo, dom.hi, 5);
    const dd = decimals(tk.step);
    const P = (v: number) => ((v - dom.lo) / (dom.hi - dom.lo)) * 100;

    const filas = tramos.map((r) => {
      const sube = r.it.contribucion >= 0;
      const tp: TipData = tip(
        r.it.etiqueta,
        fila('Valor en esta parcela: ', b(r.it.valorTexto)),
        filaK(sube ? 'var(--up)' : 'var(--down)', sube ? 'Sube' : 'Baja', ' la predicción en ', b(fmt(Math.abs(r.it.contribucion), 2)), ' t/ha'),
        filaSub(`Acumulado: ${fmt(r.b, 2)} t/ha`),
      );
      return {
        etiqueta: r.it.etiqueta, valorTexto: r.it.valorTexto, sube, tip: tp,
        l: P(Math.min(r.a, r.b)), ancho: P(Math.max(r.a, r.b)) - P(Math.min(r.a, r.b)), pFin: P(r.b),
        texto: fmtSigned(r.it.contribucion, 2),
      };
    });
    const sR = resto.b >= resto.a;
    return {
      ticks: tk.ticks.map((v) => ({ v, p: P(v), texto: fmt(v, dd) })),
      pBase: P(base), textoBase: `${fmt(base, 2)} t/ha`,
      tipBase: tip('Promedio de las parcelas', fila('Rendimiento medio observado: ', b(fmt(base, 2)), ' t/ha')),
      filas,
      resto: {
        sube: sR, l: P(Math.min(resto.a, resto.b)), ancho: P(Math.max(resto.a, resto.b)) - P(Math.min(resto.a, resto.b)),
        pFin: P(resto.b), texto: fmtSigned(this.otras(), 2),
        tip: tip('Otras variables', fila('Efecto combinado: ', b(fmtSigned(this.otras(), 2)), ' t/ha')),
      },
      pFinal: P(resto.b), textoFinal: `${fmt(resto.b, 2)} t/ha`,
      tipFinal: tip('Predicción de esta parcela', fila('Rendimiento predicho: ', b(fmt(resto.b, 2)), ' t/ha')),
    };
  });
}
