/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Provides functions for generating various windowing functions used in beamforming (moved).
 */

import { WindowType } from "./types.js";

export function rectangularWindow(N: number): number[] {
  return Array.from({ length: N }, () => 1);
}

export function hammingWindow(N: number): number[] {
  if (N <= 1) return [1];
  const a0 = 0.54;
  const a1 = 1 - a0;
  const M = N - 1;
  return Array.from({ length: N }, (_, n) => a0 - a1 * Math.cos((2 * Math.PI * n) / M));
}

export function triangularWindow(N: number): number[] {
  if (N <= 1) return [1];
  const M = N - 1;
  return Array.from({ length: N }, (_, n) => 1 - Math.abs((n - M / 2) / (M / 2)));
}

export function chebyshevWindow(N: number, sidelobeDb: number = 30): number[] {
  if (N <= 1) return [1];

  const M = N - 1;
  const A = Math.pow(10, sidelobeDb / 20);
  if (!isFinite(A) || A <= 1) return new Array(N).fill(1);

  const acosh = (z: number) => Math.log(z + Math.sqrt(z * z - 1));
  const beta = Math.cosh(acosh(A) / M);

  const Tm = (x: number) => {
    const tol = 1e-15;
    if (Math.abs(x) <= 1 + 1e-12) {
      const xc = Math.max(-1, Math.min(1, x));
      return Math.cos(M * Math.acos(xc));
    } else {
      const ax = Math.max(1 + tol, Math.abs(x));
      const base = Math.cosh(M * acosh(ax));
      return (x < 0 && (M & 1)) ? -base : base;
    }
  };

  const TMbeta = Math.cosh(M * acosh(beta));

  const Y = new Array<number>(N);
  for (let k = 0; k < N; k++) {
    Y[k] = Tm(beta * Math.cos(Math.PI * k / N)) / TMbeta;
  }

  const w = new Array<number>(N).fill(0);
  const half = Math.floor(N / 2);
  for (let n = 0; n < N; n++) {
    let s = Y[0];
    for (let k = 1; k < half; k++) {
      s += 2 * Y[k] * Math.cos((2 * Math.PI * k * n) / N);
    }
    if ((N & 1) === 0) {
      s += Y[half] * Math.cos(Math.PI * n);
    }
    w[n] = s / N;
  }

  const maxVal = Math.max(...w.map(v => Math.abs(v)));
  const inv = maxVal > 0 ? 1 / maxVal : 1;
  for (let i = 0; i < N; i++) w[i] *= inv;

  for (let i = 0; i < N; i++) {
    if (w[i] < 0) w[i] = 0;
  }

  const shift = Math.floor(N / 2);
  const wc = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    wc[i] = w[(i + shift) % N];
  }

  for (let i = 0; i < Math.floor(N / 2); i++) {
    const j = N - 1 - i;
    const avg = 0.5 * (wc[i] + wc[j]);
    wc[i] = wc[j] = avg;
  }

  return wc;
}

export function makeWindow(type: WindowType, N: number, chebDb = 30): number[] {
  switch (type) {
    case "rectangular": return rectangularWindow(N);
    case "hamming":     return hammingWindow(N);
    case "triangular":  return triangularWindow(N);
    case "chebyshev":   return chebyshevWindow(N, chebDb);
    default:            return rectangularWindow(N);
  }
}
