import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CebaApi, ErrorApi } from '../../core/api/ceba-api';
import { fmt, fmtSigned, normalizarId } from '../../core/format';
import { ClimaMes, IndiceId, FuenteSatelital, ItemShap } from '../../core/models';
import { EstadoApp } from '../../core/state';
import { yieldColor } from '../../core/colors';
import { IndexChart } from '../../shared/charts/index-chart';
import { LineCatChart } from '../../shared/charts/line-cat-chart';
import { VbarChart } from '../../shared/charts/vbar-chart';
import { WaterfallChart } from '../../shared/charts/waterfall-chart';
import { IconComponent } from '../../shared/icon';
import { RendCellComponent } from '../../shared/rend-cell';
import { EmptyStateComponent, ErrorStateComponent, SkelCardComponent, SkelComponent } from '../../shared/states';
import { IntervalBarComponent } from './interval-bar';

const INDICES: { id: IndiceId; nombre: string; dec: number; txt: string }[] = [
  { id: 'ndvi', nombre: 'NDVI', dec: 2, txt: 'Qué tan verde y vigoroso está el cultivo. Sube cuando la planta crece y baja cuando madura.' },
  { id: 'evi', nombre: 'EVI', dec: 2, txt: 'Parecido al NDVI, pero distingue mejor cuando el cultivo ya está muy denso.' },
  { id: 'lai', nombre: 'LAI', dec: 2, txt: 'Cuántas capas de hojas hay sobre cada metro cuadrado de suelo.' },
  { id: 'nddi', nombre: 'NDDI', dec: 2, txt: 'Señal de sequía. Valores altos indican planta y suelo más secos.' },
  { id: 'ndwi', nombre: 'NDWI', dec: 2, txt: 'Agua contenida en las hojas. Valores altos indican más humedad en el cultivo.' },
];
const FUENTES: { id: FuenteSatelital; nombre: string }[] = [
  { id: 'S2', nombre: 'Sentinel-2' },
  { id: 'Planet', nombre: 'Planet' },
];
const MESES = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
const MESES_LARGOS = ['Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre'];

@Component({
  selector: 'ceba-parcela-page',
  imports: [
    RouterLink, IconComponent, SkelCardComponent, SkelComponent, ErrorStateComponent, EmptyStateComponent, RendCellComponent,
    IntervalBarComponent, IndexChart, VbarChart, LineCatChart, WaterfallChart,
  ],
  templateUrl: './parcela-page.html',
  host: { style: 'display:contents' },
})
export class ParcelaPage {
  /** Parámetro de la ruta (#/parcela/AGC_003). */
  readonly id = input<string | undefined>(undefined);

  protected readonly estado = inject(EstadoApp);
  private readonly api = inject(CebaApi);
  private readonly router = inject(Router);

  protected readonly fmt = fmt;
  protected readonly fmtSigned = fmtSigned;
  protected readonly yieldColor = yieldColor;
  protected readonly indices = INDICES;
  protected readonly fuentes = FUENTES;
  protected readonly meses = MESES;

  protected readonly indice = signal<IndiceId>('ndvi');
  protected readonly fuente = signal<FuenteSatelital>('S2');
  protected readonly mensaje = signal<string | null>(null);

  protected readonly parcelas = this.estado.parcelas;
  protected readonly idActual = computed(() => this.id() || this.estado.parcelaId() || undefined);

  protected readonly detalle = resource({
    params: () => this.idActual(),
    loader: ({ params }) => this.api.parcela(params),
  });

  protected readonly noEncontrada = computed(() => {
    const e = this.detalle.error();
    return e instanceof ErrorApi && e.status === 404;
  });
  protected readonly errorGeneral = computed(() => {
    const e = this.detalle.error() ?? this.parcelas.error();
    return e && !this.noEncontrada() ? e : null;
  });

  protected readonly d = computed(() => (this.detalle.hasValue() ? this.detalle.value() : undefined));
  protected readonly pred = computed(() => this.d()?.parcela.conjunto === 'PREDICCION');
  protected readonly ixActual = computed(() => INDICES.find((i) => i.id === this.indice())!);
  protected readonly fuenteActual = computed(() => FUENTES.find((f) => f.id === this.fuente())!);
  protected readonly puntosSerie = computed(() => (this.d()?.serie ?? []).filter((s) => s.indice === this.indice() && s.fuente === this.fuente()));

  protected readonly lluvia = computed(() => (this.d()?.clima ?? []).map((c: ClimaMes, i) => ({ label: MESES[i], tipTitle: MESES_LARGOS[i], value: c.prec_mm })));
  protected readonly tmax = computed(() => (this.d()?.clima ?? []).map((c) => c.tmax_c));
  protected readonly tmin = computed(() => (this.d()?.clima ?? []).map((c) => c.tmin_c));
  protected readonly series = computed(() => [
    { name: 'Máxima', short: 'Máx', color: 'var(--s-orange)', values: this.tmax() },
    { name: 'Mínima', short: 'Mín', color: 'var(--s-blue)', values: this.tmin() },
  ]);
  protected readonly cascada = computed(() => (this.d()?.shap ?? []).map((s) => ({ etiqueta: s.etiqueta, valorTexto: valorTexto(s), contribucion: s.contribucion })));
  protected readonly base = computed(() => this.d()?.base ?? 0);
  protected readonly valorPicker = computed(() => this.d()?.parcela.id ?? '');

  constructor() {
    /* la ficha recuerda la última parcela vista */
    effect(() => {
      const d = this.d();
      if (d) this.estado.elegirParcela(d.parcela.id);
    });
  }

  protected buscar(texto: string): void {
    const q = normalizarId(texto);
    if (!q) return;
    const ok = (this.parcelas.value() ?? []).some((p) => p.id === q);
    if (ok) {
      this.mensaje.set(null);
      this.router.navigate(['/parcela', q]);
    } else {
      this.mensaje.set(`No encontramos la parcela "${texto.trim()}". Prueba con un ID como AGC_003.`);
    }
  }

  protected irA(id: string): void {
    this.router.navigate(['/parcela', id]);
  }

  protected recargar(): void {
    this.parcelas.reload();
    this.detalle.reload();
  }
}

function valorTexto(v: ItemShap): string {
  const n = v.valor_variable;
  switch (v.unidad) {
    case 'mm': return fmt(n, 0) + ' mm';
    case '°C': return fmt(n, 1) + ' °C';
    case '°': return fmt(n, v.variable === 'pendiente_grados' || v.variable === 'pendiente' ? 1 : 3) + '°';
    case 'por día': return fmt(n, 4) + ' por día';
    case 'm': return fmt(n, 0) + ' m';
    case 'ha': return fmt(n, 1) + ' ha';
    case 'sí/no': return n >= 0.5 ? 'Sí' : 'No';
    default: return fmt(n, Math.abs(n) >= 100 ? 0 : 2);
  }
}
