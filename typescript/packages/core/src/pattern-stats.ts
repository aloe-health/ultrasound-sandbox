/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-19
 * Purpose: Compute common pattern statistics: PSL, ISLR, FWHM
 */

import { PatternPoint } from "./types.js";

export interface PatternStats {
  pslDb: number | null;    // peak sidelobe level in dB (relative to main peak = 0 dB)
  pslLin: number | null;   // peak sidelobe linear (0..1)
  islrDb: number | null;   // integrated sidelobe ratio in dB (10*log10(sidelobe/main))
  fwhmDeg: number | null;  // full-width half-maximum in degrees
  mainLobeArea?: number;   // integrated area under main lobe (linear)
  totalArea?: number;      // integrated total area (linear)
}

function trapezoidalIntegrate(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < x.length - 1; i++) {
    const dx = x[i + 1] - x[i];
    s += 0.5 * (y[i] + y[i + 1]) * dx;
  }
  return s;
}

/**
 * Compute pattern statistics using intensityLin values (assumed normalized so peak = 1).
 * - Main lobe is approximated by the half-power (-3 dB / 0.5 linear) region around the peak.
 * - PSL is the largest peak outside the main-lobe region (returned in dB, negative or -Infinity if none).
 * - ISLR = 10*log10(E_sidelobes / E_mainlobe) (dB). If main-lobe energy is zero returns null.
 */
export function computePatternStats(pointsIn: PatternPoint[]): PatternStats {
  if (!pointsIn || pointsIn.length === 0) return { pslDb: null, pslLin: null, islrDb: null, fwhmDeg: null };

  // work on a copy sorted by angle
  const pts = pointsIn.slice().sort((a, b) => a.angleDeg - b.angleDeg);
  const angles = pts.map((p) => p.angleDeg);
  const vals = pts.map((p) => (Number.isFinite(p.intensityLin) ? p.intensityLin : 0));

  // find peak index
  let peakIdx = 0;
  for (let i = 1; i < vals.length; i++) if (vals[i] > vals[peakIdx]) peakIdx = i;
  const peakVal = vals[peakIdx] || 0;

  if (peakVal === 0) {
    return { pslDb: null, pslLin: null, islrDb: null, fwhmDeg: null };
  }

  // find half-power (-3 dB) crossings for FWHM
  const half = peakVal * 0.5;
  const findCross = (start: number, dir: -1 | 1) => {
    let i = start;
    while (i + dir >= 0 && i + dir < vals.length && vals[i] >= half) {
      i += dir;
    }
    const j = i; // first index outside (or edge)
    const k = i - dir; // last index inside
    if (k < 0 || k >= vals.length) return angles[j];
    // linear interpolate between k and j to find exact crossing
    const xk = angles[k];
    const xj = angles[j];
    const yk = vals[k];
    const yj = vals[j];
    if (yk === yj) return xk;
    const t = (half - yk) / (yj - yk);
    return xk + t * (xj - xk);
  };

  // try to find main-lobe boundaries via first local minima (nulls) on each side
  const findNull = (startIdx: number, dir: -1 | 1): number | null => {
    let i = startIdx + dir;
    while (i > 0 && i < vals.length - 1) {
      if (vals[i] <= vals[i - 1] && vals[i] <= vals[i + 1]) {
        return angles[i];
      }
      i += dir;
    }
    return null;
  };

  // determine main-lobe boundaries: prefer first nulls on each side, else use half-power crossings
  let leftCross: number = angles[0];
  let rightCross: number = angles[angles.length - 1];
  if (vals[peakIdx] >= half) {
    const nullLeft = findNull(peakIdx, -1);
    const nullRight = findNull(peakIdx, 1);
    if (nullLeft != null && nullRight != null && nullLeft < angles[peakIdx] && nullRight > angles[peakIdx]) {
      leftCross = nullLeft;
      rightCross = nullRight;
    } else {
      // fallback to half-power crossings
      leftCross = peakIdx === 0 ? angles[0] : findCross(peakIdx, -1);
      rightCross = peakIdx === vals.length - 1 ? angles[angles.length - 1] : findCross(peakIdx, 1);
    }
  }

  const fwhm = Number.isFinite(leftCross) && Number.isFinite(rightCross) ? Math.max(0, rightCross - leftCross) : null;

  // main-lobe indices: include points between leftCross and rightCross (inclusive)
  const mainMask = angles.map((a) => a >= (leftCross - 1e-12) && a <= (rightCross + 1e-12));
  const mainAngles: number[] = [];
  const mainVals: number[] = [];
  const totalAngles: number[] = [];
  const totalVals: number[] = [];
  for (let i = 0; i < angles.length; i++) {
    totalAngles.push(angles[i]);
    totalVals.push(vals[i]);
    if (mainMask[i]) {
      mainAngles.push(angles[i]);
      mainVals.push(vals[i]);
    }
  }

  const totalArea = trapezoidalIntegrate(totalAngles, totalVals);
  const mainArea = trapezoidalIntegrate(mainAngles, mainVals);

  // find peak sidelobe outside main lobe
  let maxSidelobe = 0;
  for (let i = 0; i < vals.length; i++) {
    if (!mainMask[i]) {
      if (vals[i] > maxSidelobe) maxSidelobe = vals[i];
    }
  }

  const pslLin = maxSidelobe > 0 ? maxSidelobe : 0;
  const pslDb = pslLin > 0 ? 10 * Math.log10(pslLin / peakVal) : pslLin === 0 ? -Infinity : null;

  const islrDb = mainArea > 0 ? 10 * Math.log10((Math.max(0, totalArea - mainArea) / mainArea) || Number.EPSILON) : null;

  return {
    pslDb: Number.isFinite(pslDb) ? pslDb : (pslDb === -Infinity ? -Infinity : null),
    pslLin,
    islrDb: Number.isFinite(islrDb) ? islrDb : null,
    fwhmDeg: Number.isFinite(fwhm as number) ? (fwhm as number) : null,
    mainLobeArea: mainArea,
    totalArea: totalArea,
  };
}

export default computePatternStats;


