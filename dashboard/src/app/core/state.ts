import { Injectable, computed, inject, resource, signal } from '@angular/core';

import { CebaApi } from './api/ceba-api';
import { Y_MAX, Y_MIN } from './colors';
import { NivelRiesgo, Parcela } from './models';
import { NIVELES, nivelRiesgo } from './risk';
import { guardar, leer } from './storage';

export interface Filtros {
  estado: string;
  municipio: string;
  conjunto: '' | 'ENTRENAMIENTO' | 'PREDICCION';
  min: number;
  max: number;
}
export type ColorPor = 'rendimiento' | 'riesgo';
export interface Orden {
  col: string;
  dir: 1 | -1;
}
export interface SupuestosRiesgo {
  precio: number;
  costo: number;
}

export const FILTROS_INICIALES: Filtros = { estado: '', municipio: '', conjunto: '', min: Y_MIN, max: Y_MAX };

/** Estado que se comparte entre secciones: filtros del mapa, supuestos de riesgo y parcela elegida. */
@Injectable({ providedIn: 'root' })
export class EstadoApp {
  private readonly api = inject(CebaApi);

  readonly filtros = signal<Filtros>({ ...FILTROS_INICIALES });
  readonly colorPor = signal<ColorPor>('rendimiento');
  readonly nivelFiltro = signal<NivelRiesgo | null>(null);
  readonly orden = signal<Orden>({ col: 'id', dir: 1 });
  readonly riesgo = signal<SupuestosRiesgo>(leer<SupuestosRiesgo>('cebadata-riesgo', { precio: 5600, costo: 19500 }));
  readonly parcelaId = signal<string | null>(leer<string | null>('cebadata-parcela', null));

  /** Las 197 parcelas, una sola carga para todas las secciones. */
  readonly parcelas = resource({ loader: () => this.api.parcelas() });

  readonly equilibrio = computed(() => {
    const r = this.riesgo();
    return r.precio > 0 ? r.costo / r.precio : NaN;
  });

  elegirParcela(id: string): void {
    this.parcelaId.set(id);
    guardar('cebadata-parcela', id);
  }

  guardarRiesgo(r: SupuestosRiesgo): void {
    this.riesgo.set(r);
    guardar('cebadata-riesgo', r);
  }

  limpiarFiltros(): void {
    this.filtros.set({ ...FILTROS_INICIALES });
    this.nivelFiltro.set(null);
  }

  riesgoDe(p: Parcela): NivelRiesgo {
    return nivelRiesgo(p.rendimiento_pred, p.intervalo_inf, this.equilibrio());
  }

  etiquetaRiesgo(p: Parcela): string {
    return NIVELES[this.riesgoDe(p)].etiqueta;
  }
}

/** Rendimiento que se muestra: el medido si existe y, si no, el predicho. */
export function valorMostrado(p: Parcela): number {
  return p.rendimiento_obs != null ? p.rendimiento_obs : p.rendimiento_pred;
}
