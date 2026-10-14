import { Component, input, output } from '@angular/core';

import { IconComponent } from './icon';

@Component({
  selector: 'ceba-skel',
  template: '',
  host: {
    class: 'skel',
    style: 'display:block',
    '[style.height.px]': 'h()',
    '[style.width]': 'w()',
    '[style.margin-top]': 'mt()',
  },
})
export class SkelComponent {
  readonly h = input<number>(14);
  readonly w = input<string>('100%');
  readonly mt = input<string>('0');
}

@Component({
  selector: 'ceba-skel-card',
  imports: [SkelComponent],
  template: `
    <div class="card skel-card" aria-busy="true">
      <ceba-skel [h]="14" w="40%" />
      <div style="height:12px"></div>
      <ceba-skel [h]="alto()" />
    </div>
  `,
  host: { style: 'display:contents' },
})
export class SkelCardComponent {
  readonly alto = input<number>(160);
}

@Component({
  selector: 'ceba-empty-state',
  imports: [IconComponent],
  template: `
    <div class="empty" role="status">
      <div class="ico-wrap"><svg [cebaIcon]="icono()"></svg></div>
      <strong>{{ titulo() }}</strong>
      <p>{{ texto() }}</p>
      @if (boton()) {
        <button type="button" class="btn" (click)="accion.emit()">{{ boton() }}</button>
      }
    </div>
  `,
  host: { style: 'display:contents' },
})
export class EmptyStateComponent {
  readonly icono = input<string>('search');
  readonly titulo = input.required<string>();
  readonly texto = input<string>('');
  readonly boton = input<string | null>(null);
  readonly accion = output<void>();
}

@Component({
  selector: 'ceba-error-state',
  imports: [EmptyStateComponent],
  template: `
    <div class="card err-box">
      <ceba-empty-state
        icono="warn"
        titulo="No se pudieron cargar los datos"
        [texto]="mensaje() || 'Revisa tu conexión e inténtalo de nuevo.'"
        [boton]="reintentar() ? 'Reintentar' : null"
        (accion)="reintento.emit()"
      />
    </div>
  `,
  host: { style: 'display:contents' },
})
export class ErrorStateComponent {
  readonly mensaje = input<string | undefined>('');
  readonly reintentar = input<boolean>(true);
  readonly reintento = output<void>();
}
