import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, Injectable, inject, input } from '@angular/core';
import { signal } from '@angular/core';

/* Contenido del tooltip como datos (no como HTML), para no necesitar innerHTML. */
export type Negrita = { b: string };
export type Trozo = string | Negrita;
export interface FilaTip {
  /** color del punto que antecede al texto */
  k?: string;
  trozos: Trozo[];
  /** texto secundario (gris) */
  sub?: boolean;
}
export interface TipData {
  titulo: string;
  filas: FilaTip[];
}

export const b = (texto: string | number): Negrita => ({ b: String(texto) });
export const fila = (...trozos: Trozo[]): FilaTip => ({ trozos });
export const filaK = (k: string, ...trozos: Trozo[]): FilaTip => ({ k, trozos });
export const filaSub = (texto: string): FilaTip => ({ trozos: [texto], sub: true });
export const tip = (titulo: string, ...filas: FilaTip[]): TipData => ({ titulo, filas });

export interface EstadoTip {
  data: TipData;
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class TooltipService {
  private readonly doc = inject(DOCUMENT);
  readonly estado = signal<EstadoTip | null>(null);

  constructor() {
    const d = this.doc;
    d.addEventListener('scroll', () => this.ocultar(), true);
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.ocultar();
    });
    d.addEventListener('pointerdown', (e) => {
      /* un toque fuera de cualquier elemento con tooltip lo cierra */
      const el = e.target as Element | null;
      if (!el?.closest?.('[data-tip-activo]')) this.ocultar();
    });
  }

  mostrar(data: TipData, x: number, y: number): void {
    this.estado.set({ data, x, y });
  }
  ocultar(): void {
    if (this.estado()) this.estado.set(null);
  }
}

/** Muestra un tooltip al pasar el cursor, tocar o enfocar el elemento. */
@Directive({
  selector: '[cebaTip]',
  host: {
    '[attr.data-tip-activo]': '"1"',
    '(pointermove)': 'mover($event)',
    '(pointerleave)': 'servicio.ocultar()',
    '(pointerdown)': 'tocar($event)',
    '(focus)': 'enfocar()',
    '(blur)': 'servicio.ocultar()',
  },
})
export class TipDirective {
  readonly cebaTip = input.required<TipData | null>();
  protected readonly servicio = inject(TooltipService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  protected mover(e: PointerEvent): void {
    const t = this.cebaTip();
    if (t && e.pointerType !== 'touch') this.servicio.mostrar(t, e.clientX, e.clientY);
  }
  protected tocar(e: PointerEvent): void {
    const t = this.cebaTip();
    if (t && e.pointerType === 'touch') this.servicio.mostrar(t, e.clientX, e.clientY);
  }
  protected enfocar(): void {
    const t = this.cebaTip();
    if (!t) return;
    const r = this.el.nativeElement.getBoundingClientRect();
    this.servicio.mostrar(t, r.left + r.width / 2, r.top);
  }
}
