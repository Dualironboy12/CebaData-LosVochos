import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CebaApi } from '../../core/api/ceba-api';
import { fmt, fmtMXN, fmtSigned, normalizarId } from '../../core/format';
import { NivelRiesgo, Parcela, RespuestaSimulador } from '../../core/models';
import { NIVELES, ORDEN_NIVELES, nivelRiesgo } from '../../core/risk';
import { EstadoApp } from '../../core/state';
import { TipDirective, b, fila, tip } from '../../core/tooltip';
import { IconComponent } from '../../shared/icon';
import { NuevaParcelaComponent } from './nueva-parcela';
import { RiskBadgeComponent } from '../../shared/risk-badge';
import { ErrorStateComponent, SkelComponent } from '../../shared/states';

@Component({
  selector: 'ceba-simulador-page',
  imports: [RouterLink, IconComponent, SkelComponent, ErrorStateComponent, RiskBadgeComponent, TipDirective, NuevaParcelaComponent],
  templateUrl: './simulador-page.html',
  host: { style: 'display:contents' },
})
export class SimuladorPage {
  protected readonly estado = inject(EstadoApp);
  private readonly api = inject(CebaApi);
  private readonly router = inject(Router);

  protected readonly fmt = fmt;
  protected readonly fmtSigned = fmtSigned;
  protected readonly fmtMXN = fmtMXN;
  protected readonly niveles = NIVELES;
  protected readonly ordenNiveles = ORDEN_NIVELES;
  protected readonly parcelas = this.estado.parcelas;

  protected readonly modo = signal<'existente' | 'nueva'>('existente');
  protected readonly actual = signal<string | null>(null);
  protected readonly dl = signal(0);
  protected readonly dt = signal(0);
  protected readonly aplicado = signal({ dl: 0, dt: 0 });
  protected readonly resultado = signal<RespuestaSimulador | null>(null);
  protected readonly calculando = signal(false);
  protected readonly errorSim = signal<string | null>(null);
  protected readonly errorBusqueda = signal<string | null>(null);
  protected readonly errorRiesgo = signal<string | null>(null);
  protected readonly nivelSel = signal<NivelRiesgo | null>(null);

  protected readonly lista = computed(() => this.parcelas.value() ?? []);
  protected readonly porId = computed(() => new Map(this.lista().map((p) => [p.id, p])));
  protected readonly parcelaActual = computed(() => this.porId().get(this.actual() ?? ''));
  protected readonly sucio = computed(() => !!this.resultado() && (this.dl() !== this.aplicado().dl || this.dt() !== this.aplicado().dt));

  /* ---------- riesgo ---------- */
  protected readonly filasRiesgo = computed(() => {
    const be = this.estado.equilibrio();
    return this.lista().map((p) => ({ p, n: nivelRiesgo(p.rendimiento_pred, p.intervalo_inf, be), margen: p.intervalo_inf - be }));
  });
  protected readonly conteo = computed(() => {
    const c: Record<NivelRiesgo, number> = { bajo: 0, medio: 0, alto: 0 };
    this.filasRiesgo().forEach((r) => c[r.n]++);
    return c;
  });
  protected readonly visibles = computed(() => {
    const sel = this.nivelSel();
    return this.filasRiesgo()
      .filter((r) => !sel || r.n === sel)
      .sort((a, c) => a.margen - c.margen || a.p.id.localeCompare(c.p.id));
  });
  protected readonly equilibrioValido = computed(() => !isNaN(this.estado.equilibrio()));

  /** Geometría de la gráfica comparativa (base contra escenario). */
  protected readonly mini = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    const be = this.estado.equilibrio();
    const vals = [r.base.inf, r.base.sup, r.escenario.inf, r.escenario.sup, ...(isNaN(be) ? [] : [be])];
    const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.5;
    const hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.5;
    const P = (v: number) => ((v - lo) / (hi - lo)) * 100;
    const ticks: { v: number; p: number }[] = [];
    for (let t = Math.ceil(lo); t <= hi; t++) ticks.push({ v: t, p: P(t) });
    const fila1 = (nombre: string, x: { pred: number; inf: number; sup: number }, color: string) => ({
      nombre, color, inf: P(x.inf), ancho: P(x.sup) - P(x.inf), pred: P(x.pred),
      tip: tip(nombre, fila('Predicción: ', b(fmt(x.pred, 2)), ' t/ha'), fila(`Intervalo: ${fmt(x.inf, 2)} a ${fmt(x.sup, 2)}`)),
    });
    return {
      ticks,
      be: isNaN(be) ? null : { p: P(be), texto: `Equilibrio ${fmt(be, 2)}` },
      filas: [fila1('Base', r.base, 'var(--bar-mute)'), fila1('Escenario', r.escenario, 'var(--bar)')],
    };
  });
  protected readonly nivelesResultado = computed(() => {
    const r = this.resultado();
    const be = this.estado.equilibrio();
    if (!r || isNaN(be)) return null;
    return { base: nivelRiesgo(r.base.pred, r.base.inf, be), escenario: nivelRiesgo(r.escenario.pred, r.escenario.inf, be) };
  });

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    /* al tener las parcelas, simula la que se estaba viendo (o AGC_003) */
    effect(() => {
      const lista = this.lista();
      if (!lista.length || this.actual()) return;
      const recordada = this.estado.parcelaId();
      const id = recordada && this.porId().has(recordada) ? recordada : this.porId().has('AGC_003') ? 'AGC_003' : lista[0].id;
      this.actual.set(id);
      this.simular();
    });
  }

  protected elegir(texto: string): void {
    const q = normalizarId(texto);
    if (!this.porId().has(q)) {
      this.errorBusqueda.set(`No encontramos "${texto.trim()}". Prueba con un ID como AGC_003.`);
      return;
    }
    this.errorBusqueda.set(null);
    this.actual.set(q);
    this.estado.elegirParcela(q);
    this.dl.set(0);
    this.dt.set(0);
    this.resultado.set(null);
    this.simular();
  }

  protected restablecer(): void {
    this.dl.set(0);
    this.dt.set(0);
    this.simular();
  }

  protected async simular(): Promise<void> {
    const id = this.actual();
    if (!id) return;
    this.calculando.set(true);
    this.errorSim.set(null);
    const cuerpo = { id, delta_lluvia_mayo_pct: this.dl(), delta_tmin_abril_c: this.dt() };
    try {
      const r = await this.api.simular(cuerpo);
      if (this.actual() !== id) return;
      this.resultado.set(r);
      this.aplicado.set({ dl: cuerpo.delta_lluvia_mayo_pct, dt: cuerpo.delta_tmin_abril_c });
    } catch (e) {
      this.errorSim.set((e as Error).message);
    } finally {
      this.calculando.set(false);
    }
  }

  protected leerEntradas(precioTxt: string, costoTxt: string): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      const pv = parseFloat(precioTxt);
      const cv = parseFloat(costoTxt);
      if (!(pv > 0) || !(cv > 0)) {
        this.errorRiesgo.set('Escribe un precio y un costo mayores a cero para calcular el riesgo.');
        return;
      }
      this.errorRiesgo.set(null);
      this.estado.guardarRiesgo({ precio: pv, costo: cv });
    }, 140);
  }

  protected filtrarNivel(n: NivelRiesgo): void {
    this.nivelSel.update((a) => (a === n ? null : n));
  }

  protected verEnMapa(): void {
    this.estado.colorPor.set('riesgo');
    this.estado.nivelFiltro.set(this.nivelSel());
    this.router.navigate(['/mapa']);
  }

  protected recargar(): void {
    this.parcelas.reload();
  }

  protected municipioDe(p: Parcela | undefined): string {
    return p ? `${p.municipio}, ${p.estado}` : '';
  }

  protected decimalesUnidad(u: string): number {
    return u === '°C' ? 1 : 0;
  }
}
