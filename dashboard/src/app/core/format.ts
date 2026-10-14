/* Formato de números y fechas en español de México. */

export function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return '–';
  if (Number(n) === 0) n = 0;
  return Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtSigned(n: number, d = 2): string {
  return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);
}

export function fmtMXN(n: number): string {
  return '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

export const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "AGC_3", "3" o "agc_003" → "AGC_003"; devuelve '' si no hay nada que normalizar. */
export function normalizarId(texto: string): string {
  let q = texto.trim().toUpperCase().replace(/\s.*/, '');
  if (!q) return '';
  if (/^\d{1,3}$/.test(q)) q = 'AGC_' + ('00' + q).slice(-3);
  return q;
}

export function descargarCSV<T>(nombre: string, filas: T[], columnas: { titulo: string; valor: (f: T) => unknown }[]): void {
  const enc = columnas.map((c) => c.titulo).join(',');
  const cuerpo = filas.map((f) =>
    columnas
      .map((c) => {
        const v = c.valor(f);
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      })
      .join(','),
  );
  const blob = new Blob(['﻿' + enc + '\n' + cuerpo.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
