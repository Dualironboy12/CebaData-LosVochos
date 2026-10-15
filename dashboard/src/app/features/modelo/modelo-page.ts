import { Component, computed, inject, resource } from '@angular/core';

import { CebaApi } from '../../core/api/ceba-api';
import { fmt, fmtSigned } from '../../core/format';
import { b, fila, filaSub, tip } from '../../core/tooltip';
import { HbarChart, ItemBarra } from '../../shared/charts/hbar-chart';
import { HistogramChart } from '../../shared/charts/histogram-chart';
import { GrupoDispersion, ScatterChart } from '../../shared/charts/scatter-chart';
import { IconComponent } from '../../shared/icon';
import { ErrorStateComponent, SkelCardComponent } from '../../shared/states';

const SUB: Record<string, string> = {
  CRC: 'Residuos de cultivo en el suelo', NDTI: 'Labranza y residuos', MSI: 'Estrés de humedad', NDDI: 'Señal de sequía',
  NDWI: 'Agua en las hojas', LAI: 'Densidad de hojas', NDVI: 'Verdor del cultivo', FAPAR: 'Luz que absorbe el cultivo',
  Clima: 'Lluvia y temperatura', 'Ubicación': 'Latitud, longitud, estado y municipio', 'Topografía': 'Elevación y pendiente',
  'NDVI histórico': 'Verdor de ciclos anteriores', 'Área': 'Tamaño de la parcela', Suelo: 'Propiedades del suelo (SoilGrids)',
};

export const GRUPOS: Record<string, GrupoDispersion> = {
  Puebla: { nombre: 'Puebla', color: 'var(--st-puebla)', forma: 'circulo' },
  Hidalgo: { nombre: 'Hidalgo', color: 'var(--st-hidalgo)', forma: 'cuadro' },
  Tlaxcala: { nombre: 'Tlaxcala', color: 'var(--st-tlaxcala)', forma: 'triangulo' },
};

const RUIDO = 0.01;

@Component({
  selector: 'ceba-modelo-page',
  imports: [IconComponent, SkelCardComponent, ErrorStateComponent, HbarChart, ScatterChart, HistogramChart],
  templateUrl: './modelo-page.html',
  host: { style: 'display:contents' },
})
export class ModeloPage {
  private readonly api = inject(CebaApi);
  protected readonly metricas = resource({ loader: () => this.api.metricas() });
  protected readonly fmt = fmt;
  protected readonly fmtSigned = fmtSigned;
  protected readonly Math = Math;
  protected readonly gruposLista = Object.values(GRUPOS);
  protected readonly grupos = GRUPOS;

  protected readonly m = computed(() => (this.metricas.hasValue() ? this.metricas.value() : undefined));
  protected readonly n = computed(() => this.m()?.n_parcelas ?? { total: 197, medidas: 138, ocultas: 59 });

  /** Cuánto baja el error frente a la referencia de cada validación. */
  protected mejora(v: { rmse: number; baseline: { rmse: number } }): number {
    return Math.round(((v.baseline.rmse - v.rmse) / v.baseline.rmse) * 100);
  }

  /* ---------- error de la mezcla contra sus referencias ---------- */
  protected readonly errores = computed<ItemBarra[]>(() => {
    const m = this.m();
    if (!m) return [];
    const v = m.validacion, l = m.lomo;
    const barra = (label: string, value: number, cls: ItemBarra['cls'], detalle: string, key = false): ItemBarra => ({
      label, value, cls, key, flag: key ? 'Modelo usado' : '',
      tip: tip(label, fila('RMSE: ', b(fmt(value, 3)), ' t/ha'), filaSub(detalle)),
    });
    return [
      barra('Promedio (referencia)', v.baseline.rmse, 'mute', 'Siempre predice el promedio de las parcelas'),
      barra('Mezcla, donde se califica', v.rmse, 'strong', 'Validación anidada estratificada por municipio', true),
      barra('Promedio de las demás zonas', l.baseline.rmse, 'mute', 'Predice el promedio de las parcelas de los otros municipios'),
      barra('Mezcla, en zona nueva', l.rmse, 'strong', 'Un municipio completo fuera en cada ronda (LOMO)', true),
    ];
  });
  protected readonly maxErrores = computed(() => Math.max(1.1, (this.m()?.lomo.baseline.rmse ?? 0) * 1.08));

  protected readonly importancia = computed<ItemBarra[]>(() =>
    (this.m()?.importancia_familias ?? []).map((x, i) => ({ label: x.familia, sub: SUB[x.familia] ?? '', value: x.valor, key: i === 0 })),
  );
  protected readonly maxImportancia = computed(() => Math.max(0.1, ...(this.m()?.importancia_familias ?? []).map((x) => x.valor)) * 1.2);

  /* ---------- dispersión y errores ---------- */
  protected readonly puntos = computed(() => (this.m()?.dispersion ?? []).map((d) => ({ id: d.id, mun: d.municipio, g: d.estado, x: d.obs, y: d.pred })));
  protected readonly dentroMedio = computed(() => {
    const r = this.m()?.residuales ?? [];
    return r.length ? Math.round((r.filter((x) => Math.abs(x) <= 0.5).length / r.length) * 100) : 0;
  });

  /* ---------- robustez ---------- */
  protected readonly robustez = computed<ItemBarra[]>(() => {
    const v = this.m()?.validacion;
    return (this.m()?.robustez_espacial ?? []).map((x) => {
      const alto = !!v && x.rmse > 0.6;
      return {
        label: x.municipio, value: x.rmse, cls: alto ? 'warn' : '', flag: alto ? '▲ Más error' : '',
        tip: tip(
          x.municipio,
          fila('RMSE al dejarlo fuera: ', b(fmt(x.rmse, 2)), ' t/ha', x.n ? ` (${x.n} parcelas)` : ''),
          filaSub(alto && v ? `Es ${fmt(x.rmse / v.rmse, 1)} veces el error donde se califica` : 'Cerca o por debajo del error donde se califica'),
        ),
      };
    });
  });

  /* ---------- justificación de la mezcla (tabla estática de la metodología) ---------- */
  protected readonly justificacion = computed(() => {
    const c = this.m()?.comparacion ?? [];
    const ens = c.find((x) => x.id === 'ensamble'), ubi = c.find((x) => x.id === 'ubicacion'), mez = c.find((x) => x.id === 'mezcla');
    if (!ens || !ubi || !mez) return '';
    const empata = Math.abs(ens.estratificada.rmse - mez.estratificada.rmse) < RUIDO;
    return (
      `${empata ? 'Donde se califica, la mezcla y el ensamble empatan en RMSE (la diferencia es menor a ' + fmt(RUIDO, 3) + ' t/ha, dentro del ruido de la validación)' : 'Donde se califica, la mezcla obtiene un RMSE de ' + fmt(mez.estratificada.rmse, 3) + ' frente a ' + fmt(ens.estratificada.rmse, 3) + ' del ensamble'}` +
      ` y tiene el menor MAE (${fmt(mez.estratificada.mae, 3)}). En una zona nueva de la región la ubicación sola es la mejor (${fmt(ubi.lomo.rmse, 3)}), el ensamble se cae a ${fmt(ens.lomo.rmse, 3)} y la mezcla queda en ${fmt(mez.lomo.rmse, 3)}. ` +
      'Por eso se eligió la mezcla: conserva la precisión del ensamble donde se califica y recorta buena parte de su caída fuera de las zonas conocidas, con una narrativa que se puede explicar parcela por parcela.'
    );
  });
}
