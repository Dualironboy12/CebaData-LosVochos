import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';

import { TooltipService } from '../core/tooltip';

@Component({
  selector: 'ceba-tooltip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (servicio.estado(); as e) {
      <div #tt class="tt" role="tooltip">
        <b>{{ e.data.titulo }}</b>
        @for (f of e.data.filas; track $index) {
          <div class="tt-row">
            @if (f.k) {
              <span class="tt-k" [style.background]="f.k"></span>
            }
            <span [class.tt-sub]="f.sub">
              @for (t of f.trozos; track $index) {
                @if (esNegrita(t)) {<b>{{ t.b }}</b>} @else {<span>{{ t }}</span>}
              }
            </span>
          </div>
        }
      </div>
    }
  `,
})
export class TooltipComponent {
  protected readonly servicio = inject(TooltipService);
  private readonly tt = viewChild<ElementRef<HTMLElement>>('tt');

  constructor() {
    afterRenderEffect(() => {
      const e = this.servicio.estado();
      const el = this.tt()?.nativeElement;
      if (!e || !el) return;
      const r = el.getBoundingClientRect();
      let left = e.x + 14;
      let top = e.y + 16;
      if (left + r.width > window.innerWidth - 8) left = e.x - r.width - 14;
      if (left < 8) left = 8;
      if (top + r.height > window.innerHeight - 8) top = e.y - r.height - 14;
      if (top < 8) top = 8;
      el.style.left = left + 'px';
      el.style.top = top + 'px';
    });
  }

  protected esNegrita(t: unknown): t is { b: string } {
    return typeof t === 'object' && t !== null && 'b' in t;
  }
}
