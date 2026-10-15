import { describe, expect, it } from 'vitest';

import { DatosDemo } from '../../core/demo/demo-data';
import { armarPeticion } from './nueva-parcela.util';

const demo = new DatosDemo();
const op = demo.opcionesNuevaParcela();
const base = { municipio: 'Singuilucan', lat: '19.98', lon: '-98.37', area_ha: '4,5', clima: {} };

describe('formulario de nueva parcela', () => {
  it('arma la petición y acepta coma decimal', () => {
    const r = armarPeticion(base, op);
    expect(r.ok && r.peticion).toEqual({ lat: 19.98, lon: -98.37, municipio: 'Singuilucan', area_ha: 4.5 });
  });
  it('el clima vacío no viaja y el que se llena sí, por mes', () => {
    const r = armarPeticion({ ...base, clima: { prec_mm_5: '140', prec_mm_6: '', tmin_c_4: '11.5' } }, op);
    expect(r.ok && r.peticion.clima).toEqual({ prec_mm: { '5': 140 }, tmin_c: { '4': 11.5 } });
  });
  it('marca cada campo inválido', () => {
    const r = armarPeticion({ municipio: ' ', lat: 'x', lon: '300', area_ha: '0', clima: { prec_mm_5: '-3' } }, op);
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(['area_ha', 'lat', 'lon', 'municipio', 'prec_mm_5']);
  });
});

describe('estimación simulada', () => {
  it('avisa cuando la ubicación queda lejos y ensancha el intervalo', () => {
    const p = demo.parcelas[0];
    const cerca = demo.predecir({ lat: p.lat, lon: p.lon, municipio: p.municipio, area_ha: 3 });
    const lejos = demo.predecir({ lat: 19.43, lon: -99.13, municipio: 'Coyoacán', area_ha: 3 });
    expect(cerca.avisos.map((a) => a.codigo)).toEqual(['estimacion_de_zona']);
    expect(lejos.avisos.map((a) => a.codigo)).toContain('fuera_de_zona');
    expect(lejos.intervalo.semiancho).toBeGreaterThan(cerca.intervalo.semiancho);
  });
  it('rechaza entradas inválidas', () => {
    expect(() => demo.predecir({ lat: 100, lon: 0, municipio: 'x', area_ha: 3 })).toThrow();
  });
});
