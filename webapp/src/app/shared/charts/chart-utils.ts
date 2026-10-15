import { DestroyRef, ElementRef, Signal, inject, signal } from '@angular/core';

/* Utilidades compartidas por las gráficas SVG. */

export function niceStep(range: number, n: number): number {
  const raw = range / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
}

export function niceTicks(min: number, max: number, n = 5): { ticks: number[]; step: number } {
  const st = niceStep(max - min, n);
  const out: number[] = [];
  for (let v = Math.ceil(min / st - 1e-9) * st; v <= max + 1e-9; v += st) out.push(Math.round(v * 1e9) / 1e9);
  return { ticks: out, step: st };
}

export function niceDomain(min: number, max: number, n = 5): { lo: number; hi: number; step: number } {
  const st = niceStep(max - min, n);
  return { lo: Math.floor(min / st + 1e-9) * st, hi: Math.ceil(max / st - 1e-9) * st, step: st };
}

export function decimals(step: number): number {
  return Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
}

/** Barra con las esquinas de arriba redondeadas. */
export function topRound(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Ancho del elemento anfitrión, que se actualiza al redimensionar.
 * Hay que llamarlo en el constructor (o en un inicializador de campo) de un componente.
 */
export function anchoDelHost(): Signal<number> {
  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const ancho = signal(Math.floor(el.clientWidth));
  let ultimo = 0;
  let pendiente: ReturnType<typeof setTimeout> | undefined;
  const ro = new ResizeObserver(() => {
    clearTimeout(pendiente);
    pendiente = setTimeout(() => {
      const w = Math.floor(el.clientWidth);
      if (w && Math.abs(w - ultimo) >= 2) {
        ultimo = w;
        ancho.set(w);
      }
    }, 60);
  });
  ro.observe(el);
  inject(DestroyRef).onDestroy(() => {
    clearTimeout(pendiente);
    ro.disconnect();
  });
  return ancho;
}
