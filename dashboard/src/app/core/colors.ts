/* Color de rendimiento: un solo tono verde, claro = bajo, oscuro = alto. */

export const Y_MIN = 2.0;
export const Y_MAX = 5.6;

const RAMP: [number, [number, number, number]][] = [
  [2.0, [228, 243, 220]],
  [2.6, [191, 227, 180]],
  [3.2, [147, 207, 140]],
  [3.8, [99, 181, 101]],
  [4.4, [58, 149, 72]],
  [5.0, [29, 114, 55]],
  [5.6, [11, 74, 38]],
];

export function yieldColor(v: number | null | undefined): string {
  if (v == null) return '#cccccc';
  v = Math.max(Y_MIN, Math.min(Y_MAX, v));
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i][0]) {
      const a = RAMP[i - 1];
      const b = RAMP[i];
      const t = (v - a[0]) / (b[0] - a[0]);
      const c = [0, 1, 2].map((k) => Math.round(a[1][k] + (b[1][k] - a[1][k]) * t));
      return `rgb(${c.join(',')})`;
    }
  }
  return `rgb(${RAMP[RAMP.length - 1][1].join(',')})`;
}

export function rampCss(): string {
  return (
    'linear-gradient(90deg,' +
    RAMP.map((r) => `rgb(${r[1].join(',')}) ${Math.round(((r[0] - Y_MIN) / (Y_MAX - Y_MIN)) * 100)}%`).join(',') +
    ')'
  );
}
