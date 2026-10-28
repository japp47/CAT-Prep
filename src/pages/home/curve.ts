/**
 * The CAT score curve drawn as a dot plot (D42): one column per slice of the score range, as tall as the bell curve
 * there. Shared by the flat drawing in the first download and the 3D field that replaces it.
 */

/** The z-score above which the top 1% sit: the 99th percentile. */
export const Z99 = 2.326;

/** `cols` columns from z = −3 to z = 3, each with `n` dots, `rows` at the middle. */
export function curveColumns(cols: number, rows: number): { z: number; n: number }[] {
  return Array.from({ length: cols }, (_, c) => {
    const z = -3 + (6 * c) / (cols - 1);
    return { z, n: Math.max(1, Math.round(rows * Math.exp((-z * z) / 2))) };
  });
}

/** The share of takers below z, as a whole percentile from 1 to 99 (erf by Abramowitz and Stegun 7.1.26). */
export function percentileAt(z: number): number {
  const x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const phi = 0.5 * (1 + (z < 0 ? -erf : erf));
  return Math.min(99, Math.max(1, Math.round(phi * 100)));
}

/** 1st, 2nd, 3rd, 4th, 11th, 21st… */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return n + (teen ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
}
