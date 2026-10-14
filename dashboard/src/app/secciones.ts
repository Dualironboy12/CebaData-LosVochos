export interface Seccion {
  id: string;
  etiqueta: string;
  corto: string;
  icono: string;
  eyebrow: string;
  titulo: string;
}

export const SECCIONES: Seccion[] = [
  { id: 'mapa', etiqueta: 'Mapa de parcelas', corto: 'Mapa', icono: 'map', eyebrow: 'Sección 1 de 5', titulo: 'Mapa de parcelas' },
  { id: 'parcela', etiqueta: 'Ficha de parcela', corto: 'Ficha', icono: 'parcel', eyebrow: 'Sección 2 de 5', titulo: 'Ficha de parcela' },
  { id: 'modelo', etiqueta: 'Desempeño del modelo', corto: 'Modelo', icono: 'activity', eyebrow: 'Sección 3 de 5', titulo: 'Desempeño del modelo' },
  { id: 'hallazgos', etiqueta: 'Hallazgos clave', corto: 'Hallazgos', icono: 'bulb', eyebrow: 'Sección 4 de 5', titulo: 'Hallazgos clave' },
  { id: 'simulador', etiqueta: 'Simulador y riesgo crediticio', corto: 'Simulador', icono: 'sliders', eyebrow: 'Sección 5 de 5', titulo: 'Simulador y riesgo crediticio' },
];
