import { Component, computed, input } from '@angular/core';

import { Y_MAX, Y_MIN } from '../../core/colors';
import { fmt } from '../../core/format';
import { Parcela } from '../../core/models';
import { TipDirective, b, fila, filaSub, tip } from '../../core/tooltip';

/** Lo mínimo que necesita la barra: sirve para una parcela y para una estimación de parcela nueva. */
export type ParaIntervalo = Pick<Parcela, 'rendimiento_pred' | 'intervalo_inf' | 'intervalo_sup' | 'rendimiento_obs'>;

/** Intervalo de predicción de una parcela sobre una escala de rendimiento. */
@Component({
  selector: 'ceba-interval-bar',
  imports: [TipDirective],
  template: `
    @let g = geo();
    <div>
      <div class="ibar">
        <span class="ibar-lbl" [style.left.%]="g.pPred">Predicho {{ fmt(parcela().rendimiento_pred, 2) }}</span>
        <div class="ibar-track">
          <div class="ibar-range" tabindex="0" [cebaTip]="tipIntervalo()" [style.left.%]="g.pInf" [style.width.%]="g.pSup - g.pInf"></div>
          <div class="ibar-pred" [style.left.%]="g.pPred"></div>
          @if (parcela().rendimiento_obs !== null) {
            <div class="ibar-obs" tabindex="0" [cebaTip]="tipObservado()" [style.left.%]="g.pObs"></div>
          }
        </div>
        <div class="ibar-ticks" aria-hidden="true">
          @for (t of g.ticks; track t.v) {
            <span [style.left.%]="t.p">{{ t.v }}</span>
          }
        </div>
      </div>
      <div class="ibar-ends">
        <span>Límite inferior <b class="num">{{ fmt(parcela().intervalo_inf, 2) }}</b></span>
        <span>Límite superior <b class="num">{{ fmt(parcela().intervalo_sup, 2) }}</b></span>
      </div>
      <div class="legend" style="margin-top:10px">
        <span class="legend-item"><span class="sw" style="background:var(--bar);opacity:.55;height:10px;width:22px;border-radius:5px"></span>Intervalo de predicción</span>
        <span class="legend-item"><span class="sw" style="background:var(--ink);width:4px;height:16px;border-radius:2px"></span>Predicho</span>
        @if (parcela().rendimiento_obs !== null) {
          <span class="legend-item"><span class="sw" style="border:3px solid var(--ink);width:12px;height:12px;transform:rotate(45deg) scale(.8);border-radius:2px"></span>Observado</span>
        }
      </div>
    </div>
  `,
})
export class IntervalBarComponent {
  readonly parcela = input.required<ParaIntervalo>();
  protected readonly fmt = fmt;

  protected readonly geo = computed(() => {
    const p = this.parcela();
    const vals = [p.intervalo_inf, p.intervalo_sup, p.rendimiento_pred, Y_MIN, Y_MAX, ...(p.rendimiento_obs != null ? [p.rendimiento_obs] : [])];
    const lo = Math.floor(Math.min(...vals) * 2) / 2;
    const hi = Math.ceil(Math.max(...vals) * 2) / 2;
    const P = (v: number) => ((v - lo) / (hi - lo)) * 100;
    const ticks: { v: number; p: number }[] = [];
    for (let t = Math.ceil(lo); t <= hi + 1e-9; t++) ticks.push({ v: t, p: P(t) });
    return { pInf: P(p.intervalo_inf), pSup: P(p.intervalo_sup), pPred: P(p.rendimiento_pred), pObs: P(p.rendimiento_obs ?? 0), ticks };
  });

  protected readonly tipIntervalo = computed(() => {
    const p = this.parcela();
    return tip('Intervalo de predicción', fila('De ', b(fmt(p.intervalo_inf, 2)), ' a ', b(fmt(p.intervalo_sup, 2)), ' t/ha'), filaSub('Rango donde es probable que caiga el rendimiento real'));
  });
  protected readonly tipObservado = computed(() => tip('Rendimiento observado', fila(b(fmt(this.parcela().rendimiento_obs, 2)), ' t/ha medidos en campo')));
}
