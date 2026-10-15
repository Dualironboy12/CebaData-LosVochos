import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/* Iconos de trazo 24x24. El contenido es estático y de confianza (no viene de la API). */
const ICONS: Record<string, string> = {
  map: '<path d="M9 4 3 6.500v13L9 17l6 3 6-2.500v-13L15 7z"/><path d="M9 4v13M15 7v13"/>',
  parcel: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
  sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
  moon: '<path d="M21 12.800A9 9 0 1 1 11.200 3a7 7 0 0 0 9.800 9.800z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.500-3.500"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.500 2.700 2.700L16 9.500"/>',
  warn: '<path d="M10.300 3.800 2.500 17.500A2 2 0 0 0 4.200 20.500h15.600a2 2 0 0 0 1.700-3L13.700 3.800a2 2 0 0 0-3.400 0z"/><path d="M12 9.500v4M12 17h.01"/>',
  stop: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="m9.500 9.500 5 5m0-5-5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  flask: '<path d="M9 3h6M10 3v6L4.500 18.500A2 2 0 0 0 6.200 21.500h11.600a2 2 0 0 0 1.700-3L14 9V3"/><path d="M7.500 15h9"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  pencil: '<path d="M12 20h9M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.500 6.200L3 16"/><path d="M3 12a9 9 0 0 1 15.500-6.200L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  solid: '<circle cx="12" cy="12" r="6" fill="currentColor"/>',
  dashed: '<circle cx="12" cy="12" r="7.500" stroke-dasharray="3.200 2.800"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  pin: '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
};

@Component({
  selector: 'svg[cebaIcon]',
  template: '',
  host: {
    class: 'ico',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    '[attr.width]': 'tamano()',
    '[attr.height]': 'tamano()',
    '[innerHTML]': 'html()',
  },
})
export class IconComponent {
  readonly cebaIcon = input.required<string>();
  readonly tamano = input<number>(18);
  private readonly san = inject(DomSanitizer);
  protected readonly html = computed<SafeHtml>(() => this.san.bypassSecurityTrustHtml(ICONS[this.cebaIcon()] ?? ''));
}
