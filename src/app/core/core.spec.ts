import { describe, expect, it } from 'vitest';

import { yieldColor } from './colors';
import { DatosDemo } from './demo/demo-data';
import { fmt, fmtSigned, normalizarId } from './format';
import { nivelRiesgo } from './risk';

describe('formato', () => {
  it('da el signo y usa coma o punto según es-MX', () => {
    expect(fmt(3.456, 2)).toBe('3.46');
    expect(fmt(null)).toBe('–');
    expect(fmtSigned(-0.5, 1)).toBe('−0.5');
    expect(fmtSigned(0.5, 1)).toBe('+0.5');
  });
  it('normaliza IDs escritos de varias formas', () => {
    expect(normalizarId('3')).toBe('AGC_003');
    expect(normalizarId(' agc_010 Calpulalpan')).toBe('AGC_010');
    expect(normalizarId('')).toBe('');
  });
});

describe('riesgo', () => {
  it('bajo si el límite inferior alcanza el equilibrio, medio si solo la predicción, alto si ninguno', () => {
    expect(nivelRiesgo(4, 3.5, 3.4)).toBe('bajo');
    expect(nivelRiesgo(4, 3.0, 3.4)).toBe('medio');
    expect(nivelRiesgo(3.0, 2.5, 3.4)).toBe('alto');
  });
});

describe('color de rendimiento', () => {
  it('es más oscuro con más rendimiento', () => {
    const suma = (c: string) => (c.match(/\d+/g) ?? []).map(Number).reduce((a, b) => a + b, 0);
    expect(suma(yieldColor(5.5))).toBeLessThan(suma(yieldColor(2.1)));
    expect(yieldColor(null)).toBe('#cccccc');
  });
});

describe('datos de demostración', () => {
  const d = new DatosDemo();
  it('tiene 197 parcelas, 59 de predicción y medias exactas', () => {
    expect(d.parcelas.length).toBe(197);
    const pre = d.parcelas.filter((p) => p.conjunto === 'PREDICCION');
    expect(pre.length).toBe(59);
    const obs = d.parcelas.filter((p) => p.conjunto === 'ENTRENAMIENTO');
    expect(obs.reduce((s, p) => s + (p.rendimiento_obs ?? 0), 0) / obs.length).toBeCloseTo(3.96, 2);
  });
  it('el simulador sin cambios no mueve la predicción', () => {
    const r = d.simular({ id: 'AGC_003', delta_lluvia_mayo_pct: 0, delta_tmin_abril_c: 0 })!;
    expect(r.diferencia).toBe(0);
    expect(d.simular({ id: 'NOPE', delta_lluvia_mayo_pct: 0, delta_tmin_abril_c: 0 })).toBeNull();
  });
});
