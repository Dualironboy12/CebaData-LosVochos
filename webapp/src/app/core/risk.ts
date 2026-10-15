import { NivelRiesgo } from './models';

/* Reglas de riesgo crediticio. Equilibrio = costo por hectárea / precio por tonelada. */

export interface InfoNivel {
  id: NivelRiesgo;
  etiqueta: string;
  icono: string;
  cls: 'low' | 'mid' | 'high';
  color: string;
  regla: string;
}

export const NIVELES: Record<NivelRiesgo, InfoNivel> = {
  bajo: { id: 'bajo', etiqueta: 'Riesgo bajo', icono: 'check', cls: 'low', color: '#1b6e3a', regla: 'El límite inferior del intervalo es mayor o igual al equilibrio.' },
  medio: { id: 'medio', etiqueta: 'Riesgo medio', icono: 'warn', cls: 'mid', color: '#d98a1f', regla: 'La predicción supera el equilibrio, pero el límite inferior no.' },
  alto: { id: 'alto', etiqueta: 'Riesgo alto', icono: 'stop', cls: 'high', color: '#a3271f', regla: 'La predicción queda por debajo del equilibrio.' },
};

export const ORDEN_NIVELES: NivelRiesgo[] = ['bajo', 'medio', 'alto'];

export function nivelRiesgo(pred: number, inf: number, equilibrio: number): NivelRiesgo {
  if (inf >= equilibrio) return 'bajo';
  if (pred >= equilibrio) return 'medio';
  return 'alto';
}
