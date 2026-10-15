import { Component, computed, input } from '@angular/core';

import { yieldColor } from '../core/colors';
import { fmt } from '../core/format';

/** Rendimiento con su punto de color: sólido si es observado, punteado si es predicho. */
@Component({
  selector: 'ceba-rend',
  template: `
    <span class="yv">
      <span class="dot" [class.dashed]="predicho()" [style.background]="color()"></span>
      <b class="num">{{ texto() }}</b>
      <span class="t">{{ predicho() ? 'Pred.' : 'Obs.' }}</span>
    </span>
  `,
  host: { style: 'display:contents' },
})
export class RendCellComponent {
  readonly valor = input.required<number>();
  readonly predicho = input<boolean>(false);
  protected readonly color = computed(() => yieldColor(this.valor()));
  protected readonly texto = computed(() => fmt(this.valor(), 2));
}
