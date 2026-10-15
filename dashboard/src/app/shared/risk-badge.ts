import { Component, computed, input } from '@angular/core';

import { NivelRiesgo } from '../core/models';
import { NIVELES } from '../core/risk';
import { IconComponent } from './icon';

@Component({
  selector: 'ceba-risk-badge',
  imports: [IconComponent],
  template: `<span class="risk-badge" [class]="info().cls"><svg [cebaIcon]="info().icono"></svg>{{ info().etiqueta }}</span>`,
  host: { style: 'display:contents' },
})
export class RiskBadgeComponent {
  readonly nivel = input.required<NivelRiesgo>();
  protected readonly info = computed(() => NIVELES[this.nivel()]);
}
