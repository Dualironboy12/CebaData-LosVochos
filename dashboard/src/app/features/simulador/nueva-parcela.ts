import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CebaApi } from '../../core/api/ceba-api';
import { fmt } from '../../core/format';
import { CampoClima, RespuestaNuevaParcela, VariableImputada } from '../../core/models';
import { nivelRiesgo } from '../../core/risk';
import { EstadoApp } from '../../core/state';
import { IconComponent } from '../../shared/icon';
import { RiskBadgeComponent } from '../../shared/risk-badge';
import { EmptyStateComponent, ErrorStateComponent, SkelComponent } from '../../shared/states';
import { IntervalBarComponent } from '../parcela/interval-bar';
import { FormularioNuevaParcela, armarPeticion } from './nueva-parcela.util';

const MESES: Record<number, string> = { 4: 'Abril', 5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre' };
const ORIGEN: Record<VariableImputada['origen'], string> = {
  vecinos: 'Vecinos cercanos',
  mediana_municipio: 'Mediana del municipio',
  mediana_entrenamiento: 'Mediana de entrenamiento',
};
const METODO: Record<RespuestaNuevaParcela['imputacion']['metodo'], string> = {
  vecinos_ponderados: 'Promedio de las 3 parcelas conocidas más cercanas, ponderado por distancia',
  mediana_municipio: 'Mediana de las parcelas del municipio (no hay vecinas cerca)',
  mediana_entrenamiento: 'Mediana de las parcelas de entrenamiento (no hay vecinas cerca)',
};

@Component({
  selector: 'ceba-nueva-parcela',
  imports: [RouterLink, IconComponent, SkelComponent, ErrorStateComponent, EmptyStateComponent, RiskBadgeComponent, IntervalBarComponent],
  templateUrl: './nueva-parcela.html',
})
export class NuevaParcelaComponent {
  private readonly api = inject(CebaApi);
  protected readonly estado = inject(EstadoApp);
  protected readonly opciones = resource({ loader: () => this.api.opcionesNuevaParcela() });

  protected readonly fmt = fmt;
  protected readonly origenes = ORIGEN;
  protected readonly metodos = METODO;

  protected readonly form = signal<FormularioNuevaParcela>({ municipio: '', lat: '', lon: '', area_ha: '', clima: {} });
  protected readonly errores = signal<Record<string, string>>({});
  protected readonly calculando = signal(false);
  protected readonly errorApi = signal<string | null>(null);
  protected readonly resultado = signal<RespuestaNuevaParcela | null>(null);

  protected readonly filasClima = computed(() => {
    const c = this.opciones.value()?.clima;
    if (!c) return [];
    return Object.keys(MESES).map(Number).map((mes) => ({
      mes, nombre: MESES[mes],
      celdas: (['prec_mm', 'tmax_c', 'tmin_c'] as CampoClima[]).map((campo) => ({ campo, clave: `${campo}_${mes}`, usa: c[campo].includes(mes) })),
    }));
  });

  protected readonly nivel = computed(() => {
    const r = this.resultado();
    const be = this.estado.equilibrio();
    return r && !isNaN(be) ? nivelRiesgo(r.prediccion.pred, r.prediccion.inf, be) : null;
  });
  protected readonly paraBarra = computed(() => {
    const r = this.resultado();
    return r ? { rendimiento_pred: r.prediccion.pred, intervalo_inf: r.prediccion.inf, intervalo_sup: r.prediccion.sup, rendimiento_obs: null } : null;
  });
  protected readonly grupos = computed(() => {
    const v = this.resultado()?.imputacion.variables_imputadas ?? [];
    const por = new Map<string, VariableImputada[]>();
    v.forEach((x) => por.set(x.grupo, [...(por.get(x.grupo) ?? []), x]));
    return [...por.entries()].map(([nombre, vars]) => ({ nombre, vars }));
  });
  protected readonly columnasMunicipio = computed(() => {
    const im = this.resultado()?.imputacion;
    return im ? im.n_proporcionadas - (im.datos_usuario.length - 1) : 0;
  });
  protected readonly hayErrorClima = computed(() => Object.keys(this.errores()).some((k) => /^(prec_mm|tmax_c|tmin_c)_\d+$/.test(k)));
  protected readonly hayAlerta = computed(() => (this.resultado()?.avisos ?? []).some((a) => a.nivel === 'alerta'));

  protected poner(campo: 'municipio' | 'lat' | 'lon' | 'area_ha', valor: string): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
    this.errores.update(({ [campo]: _, ...resto }) => resto);
  }
  protected ponerClima(clave: string, valor: string): void {
    this.form.update((f) => ({ ...f, clima: { ...f.clima, [clave]: valor } }));
    this.errores.update(({ [clave]: _, ...resto }) => resto);
  }

  protected limpiar(): void {
    this.form.set({ municipio: '', lat: '', lon: '', area_ha: '', clima: {} });
    this.errores.set({});
    this.resultado.set(null);
    this.errorApi.set(null);
  }

  protected async estimar(): Promise<void> {
    const v = armarPeticion(this.form(), this.opciones.value());
    if (!v.ok) {
      this.errores.set(v.errores);
      return;
    }
    this.errores.set({});
    this.errorApi.set(null);
    this.calculando.set(true);
    try {
      this.resultado.set(await this.api.predecir(v.peticion));
    } catch (e) {
      this.resultado.set(null);
      this.errorApi.set((e as Error).message);
    } finally {
      this.calculando.set(false);
    }
  }

  protected valorTexto(v: VariableImputada): string {
    switch (v.unidad) {
      case 'mm': case 'm': return `${fmt(v.valor, 0)} ${v.unidad}`;
      case '°C': return `${fmt(v.valor, 1)} °C`;
      case '°': return `${fmt(v.valor, 3)}°`;
      case 'por día': return `${fmt(v.valor, 4)} por día`;
      case 'ha': return `${fmt(v.valor, 1)} ha`;
      default: return fmt(v.valor, Math.abs(v.valor) >= 100 ? 0 : 3);
    }
  }
  protected claseAviso(nivel: string): string {
    return nivel === 'info' ? 'callout' : 'callout callout-warn';
  }
  protected iconoAviso(nivel: string): string {
    return nivel === 'info' ? 'info' : 'warn';
  }
}
