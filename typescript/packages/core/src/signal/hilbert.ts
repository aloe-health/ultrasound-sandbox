/* Hilbert transform / analytic signal approximation and envelope detection.
 * Note: For simplicity and performance in TS, we implement a minimal FFT-based Hilbert.
 * This is sufficient for visualization and testing. For production, consider a
 * windowed FIR Hilbert transformer or a high-performance FFT backend.
 */

export interface AnalyticSignalResult {
  real: number[];
  imag: number[];
  envelope: number[];
}

/** Compute analytic signal via FFT-based Hilbert transform. */
export function hilbertAnalytic(x: number[]): AnalyticSignalResult {
  const N = x.length;
  // Next power of two for simple radix-2 FFT implementation
  const M = 1 << Math.ceil(Math.log2(Math.max(1, N)));
  const re = new Array(M).fill(0);
  const im = new Array(M).fill(0);
  for (let i = 0; i < N; i++) re[i] = x[i];

  fft(re, im, false);

  // Construct Hilbert multiplier H[k]
  // H[0] = 1, H[N/2]=1 for even N, 2 for k=1..N/2-1, 0 for negative freqs
  const Hre = new Array(M).fill(0);
  const Him = new Array(M).fill(0);
  Hre[0] = 1;
  if (M % 2 === 0) Hre[M / 2] = 1;
  for (let k = 1; k < M / 2; k++) Hre[k] = 2;

  // Apply H in frequency domain
  for (let k = 0; k < M; k++) {
    const r = re[k] * Hre[k] - im[k] * Him[k];
    const ii = re[k] * Him[k] + im[k] * Hre[k];
    re[k] = r; im[k] = ii;
  }

  fft(re, im, true);

  const outRe = re.slice(0, N);
  const outIm = im.slice(0, N);
  const env = new Array(N);
  for (let i = 0; i < N; i++) env[i] = Math.hypot(outRe[i], outIm[i]);
  return { real: outRe, imag: outIm, envelope: env };
}

/** Basic in-place radix-2 Cooley–Tukey FFT. inverse=false for forward. */
function fft(re: number[], im: number[], inverse: boolean): void {
  const n = re.length;
  if (n <= 1) return;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j &= ~bit;
    j |= bit;
    if (i < j) { const tr = re[i]; const ti = im[i]; re[i] = re[j]; im[i] = im[j]; re[j] = tr; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inverse ? -1 : 1);
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const nWRe = wRe * wlenRe - wIm * wlenIm;
        const nWIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nWRe; wIm = nWIm;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
}

/** Envelope-only convenience */
export function envelope(x: number[]): number[] {
  return hilbertAnalytic(x).envelope;
}


