import { Component, computed, inject, resource } from '@angular/core';

import { CebaApi } from '../../core/api/ceba-api';
import { fmt } from '../../core/format';
import { b, fila, tip } from '../../core/tooltip';
import { HbarChart, ItemBarra } from '../../shared/charts/hbar-chart';
import { ErrorStateComponent, SkelComponent } from '../../shared/states';

const RUIDO = 0.01;
const EXPLICA_MEDIDA: Record<string, string> = {
  'Velocidad de verdeo': 'qué tan rápido arranca el cultivo',
  'Velocidad de senescencia': 'qué tan rápido se seca al madurar',
  'Valor máximo': 'qué tan alto llega el índice',
  'Otras medidas': 'fecha del pico, área bajo la curva y otras',
};
/** Cómo se nombra cada medida dentro de una frase. */
const FRASE_MEDIDA: Record<string, string> = {
  'Velocidad de verdeo': 'la velocidad de verdeo (qué tan rápido arranca el cultivo)',
  'Velocidad de senescencia': 'la velocidad de senescencia (qué tan rápido se seca al madurar)',
  'Valor máximo': 'el valor máximo (qué tan alto llega el índice)',
  'Otras medidas': 'otras medidas de la curva (fecha del pico, área bajo la curva)',
};

@Component({
  selector: 'ceba-hallazgos-page',
  imports: [ErrorStateComponent, SkelComponent, HbarChart],
  templateUrl: './hallazgos-page.html',
  host: { style: 'display:contents' },
})
export class HallazgosPage {
  private readonly api = inject(CebaApi);
  protected readonly metricas = resource({ loader: () => this.api.metricas() });
  protected readonly fmt = fmt;
  protected readonly h = computed(() => (this.metricas.hasValue() ? this.metricas.value().hallazgos : undefined));

  /* ---------- hallazgo 1: índices satelitales ---------- */
  protected readonly indices = computed<ItemBarra[]>(() => (this.h()?.indices ?? []).map((x, i) => ({ label: x.etiqueta, value: x.valor, key: i === 0, cls: i === 0 ? 'strong' : '' })));
  protected readonly maxIndices = computed(() => Math.max(0.1, ...(this.h()?.indices ?? []).map((x) => x.valor)) * 1.2);
  protected readonly dentroNdvi = computed<ItemBarra[]>(() => {
    const d = this.h()?.dentro_ndvi ?? [];
    const orden = [...d].sort((a, c) => c.valor - a.valor);
    const maximo = d.find((x) => x.etiqueta === 'Valor máximo');
    return d.map((x) => {
      const top = orden.indexOf(x) < 2;
      const casiNada = x === maximo && orden.indexOf(x) === orden.length - 1;
      return { label: x.etiqueta, value: x.valor, key: top, cls: top ? 'strong' : casiNada ? 'mute' : '', flag: casiNada ? 'Casi no aporta' : '', sub: EXPLICA_MEDIDA[x.etiqueta] } as ItemBarra;
    });
  });
  protected readonly maxNdvi = computed(() => Math.max(0.06, ...(this.h()?.dentro_ndvi ?? []).map((x) => x.valor)) * 1.2);
  protected readonly lectura1 = computed(() => {
    const h = this.h();
    if (!h) return null;
    const d = [...h.dentro_ndvi].sort((a, c) => c.valor - a.valor);
    const dinamica = h.dentro_ndvi.filter((x) => x.etiqueta.startsWith('Velocidad')).reduce((s, x) => s + x.valor, 0);
    const maximo = h.dentro_ndvi.find((x) => x.etiqueta === 'Valor máximo')?.valor ?? 0;
    const porDinamica = dinamica > maximo;
    const top = h.indices[0]?.etiqueta ?? 'El índice';
    const [segundo, tercero] = [h.indices[1]?.etiqueta, h.indices[2]?.etiqueta];
    const mayor = d[0];
    return {
      titulo: porDinamica && top === 'NDVI' ? 'El NDVI, pero por cómo cambia en el tiempo y no por qué tan alto llega.' : `El ${top}.`,
      mayor: mayor ? FRASE_MEDIDA[mayor.etiqueta] : '',
      segunda: d[1] ? FRASE_MEDIDA[d[1].etiqueta] : '',
      maximoCasiNada: maximo > 0 && d[d.length - 1].etiqueta === 'Valor máximo',
      siguen: segundo && tercero ? `Después del ${top} siguen el ${segundo} y el ${tercero}.` : '',
    };
  });

  /* ---------- hallazgo 2: clima ---------- */
  protected readonly clima = computed<ItemBarra[]>(() => {
    const c = this.h()?.clima ?? [];
    return c.map((x, i) => ({ label: x.etiqueta, value: x.valor, key: i === 0, cls: i === 0 ? 'strong' : x.etiqueta === 'Resto del clima' ? 'mute' : '' }));
  });
  protected readonly maxClima = computed(() => Math.max(0.1, ...(this.h()?.clima ?? []).map((x) => x.valor)) * 1.2);
  protected readonly lectura2 = computed(() => {
    const c = (this.h()?.clima ?? []).filter((x) => x.etiqueta !== 'Resto del clima');
    if (!c.length) return null;
    const [uno, dos] = c;
    const esMayo = uno.etiqueta === 'Lluvia de mayo';
    const tmin = c.find((x) => x.etiqueta === 'Temp. mínima de abril');
    return {
      titulo: esMayo ? 'La lluvia de mayo, el mes de siembra.' : `${uno.etiqueta}.`,
      p1: dos
        ? `${uno.etiqueta} pesa ${fmt(uno.valor / dos.valor, 1)} veces lo que la segunda variable de clima (${dos.etiqueta.toLowerCase()}, ${fmt(dos.valor, 3)}). ${esMayo ? 'Es un dato que se conoce temprano en el ciclo, lo que ayuda a anticipar el rendimiento.' : ''}`
        : `${uno.etiqueta} es la variable de clima que más pesa.`,
      p2: tmin ? 'También aparece la temperatura mínima de abril, que tiene que ver con las heladas de inicio de ciclo.' : '',
      aviso: esMayo ? 'Ojo: en esta región la lluvia de mayo también puede estar haciendo de indicador de zona, así que su peso no prueba por sí solo que la lluvia cause el rendimiento.' : '',
    };
  });
  protected readonly notaClima = computed(() => {
    const m = this.metricas.hasValue() ? this.metricas.value() : undefined;
    const fam = m?.importancia_familias?.[0];
    return fam && fam.familia === 'Clima' ? `El clima en conjunto es la familia que más pesa (${fmt(fam.valor, 2)}). Esta gráfica lo desglosa.` : 'Esta gráfica desglosa el peso de cada variable de clima.';
  });

  /* ---------- hallazgo 3: bloques de variables ---------- */
  protected readonly bloquesOrdenados = computed(() => [...(this.h()?.bloques ?? [])].sort((a, c) => a.rmse - c.rmse));
  protected readonly peor = computed(() => {
    const o = this.bloquesOrdenados();
    return o.length > 2 && o[o.length - 1].rmse - o[0].rmse > 0.05 ? o[o.length - 1] : null;
  });
  protected readonly bloques = computed<ItemBarra[]>(() =>
    (this.h()?.bloques ?? []).map((x) => {
      const peor = this.peor() === x;
      return {
        label: x.etiqueta, value: x.rmse, cls: peor ? 'mute' : '', flag: peor ? 'Más error' : '', key: x.clave === 'solo_clima',
        tip: tip(x.etiqueta, fila('RMSE: ', b(fmt(x.rmse, 3)), ' t/ha'), ...(x.n_variables ? [fila(`${x.n_variables} variables`)] : [])),
      };
    }),
  );
  protected readonly referencia = computed(() => {
    const m = this.metricas.hasValue() ? this.metricas.value() : undefined;
    const r = m?.validacion.baseline.rmse ?? 0.846;
    return { value: r, label: `Promedio ${fmt(r, 3)}` };
  });
  protected readonly lectura3 = computed(() => {
    const h = this.h();
    if (!h) return null;
    const o = this.bloquesOrdenados();
    const solo = h.bloques.find((x) => x.clave === 'solo_clima');
    const todo = h.bloques.find((x) => x.clave === 'todo');
    const sat = h.bloques.find((x) => x.clave === 'solo_satelital');
    const clSat = h.bloques.find((x) => x.clave === 'clima_mas_satelital');
    const mejor = o[0];
    const parecidos = o.filter((x) => x.rmse - mejor.rmse < RUIDO);
    const empata = !!solo && !!todo && Math.abs(solo.rmse - todo.rmse) < RUIDO;
    return {
      titulo: empata && solo?.rmse === mejor.rmse
        ? 'Con solo el clima se logra casi el mismo error que con todas las variables.'
        : `El bloque con menor error es "${mejor.etiqueta.toLowerCase()}".`,
      p1: solo && todo
        ? `Se probó el modelo con distintos bloques de variables. <strong>Solo clima</strong> (${fmt(solo.rmse, 3)}) ${empata ? 'empata en la práctica con' : 'se compara con'} usar <strong>todas</strong> (${fmt(todo.rmse, 3)})${empata ? ', así que agregar más datos no mejoró la predicción' : ''}.`
        : 'Se probó el modelo con distintos bloques de variables.',
      p2: sat
        ? `Las imágenes satelitales por sí solas son lo más ${sat.rmse === o[o.length - 1].rmse ? 'débil' : 'flojo'} (${fmt(sat.rmse, 3)}).${clSat ? ` Sumadas al clima mantienen un error muy parecido (${fmt(clSat.rmse, 3)}).` : ''}`
        : '',
      nota: parecidos.length > 2 ? `Las diferencias entre los ${numero(parecidos.length)} primeros son menores a ${fmt(RUIDO, 2)} t/ha, por lo que no conviene leer un orden entre ellos.` : '',
    };
  });
}

function numero(n: number): string {
  return ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho'][n] ?? String(n);
}
