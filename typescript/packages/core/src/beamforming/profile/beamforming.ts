/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Core beamforming calculations for phased arrays.
 */

import { ProfileConfig, PatternPoint, PerElementDelays, ProfileSnapshot } from "./types.js";
import { makeWindow } from "./windows.js";

/**
 * Compute element spacing in meters.
 */
export function spacingMeters(cfg: ProfileConfig): number {
  const lambda = cfg.waveSpeed / cfg.frequencyHz; // wavelength
  return cfg.spacingUnit === "wavelength" ? cfg.spacing * lambda : cfg.spacing;
}

/**
 * Compute weights array, applying preset window unless weightsOverride is provided.
 * Weights are normalized to unit max.
 */
export function computeWeights(cfg: ProfileConfig): number[] {
  const N = cfg.elements;
  let w: number[];
  if (cfg.windowType === "custom") {
    const cw = cfg.customWeights;
    if (Array.isArray(cw) && cw.length === N) {
      w = [...cw];
    } else {
      // missing or invalid custom weights: fall back to a sensible default (hamming)
      w = makeWindow("hamming", N, cfg.chebyshevSidelobeDb ?? 30);
    }
  } else {
    w = makeWindow(cfg.windowType, N, cfg.chebyshevSidelobeDb ?? 30);
  }

  // Normalize amplitude to max = 1
  const maxVal = Math.max(...w.map(Math.abs));
  if (maxVal > 0) w = w.map(v => v / maxVal);
  return w;
}

/**
 * For a linear array centered at origin along x, element index i has position
 * x_i = (i - (N-1)/2) * d
 * Steering to theta0 requires time delay τ_i = x_i * sin(theta0) / c
 */
export function computeDelays(cfg: ProfileConfig): PerElementDelays {
  const N = cfg.elements;
  const d = spacingMeters(cfg);
  const c = cfg.waveSpeed;
  const theta0 = (cfg.steerAngleDeg * Math.PI) / 180;
  const center = (N - 1) / 2;

  const timeDelays = new Array(N);
  const phaseRadians = new Array(N);

  // If focusDepth is not provided or is 0, fall back to pure-angle steering
  if (cfg.focusDepth == null || cfg.focusDepth === 0) {
    for (let i = 0; i < N; i++) {
      const x = (i - center) * d;
      const tau = (x * Math.sin(theta0)) / c; // seconds (angle steering)
      const phi = 2 * Math.PI * cfg.frequencyHz * tau; // radians at frequency
      timeDelays[i] = tau;
      phaseRadians[i] = phi;
    }
    return { timeDelays, phaseRadians };
  }

  // Focused steering: compute geometric delays so waves from each element
  // arrive in phase at the focal point located at distance `focusDepth`
  // along the steer direction.
  const focusDepth = cfg.focusDepth as number;
  // focal point coordinates (x_f, z_f) in plane of array (y is ignored)
  const xF = focusDepth * Math.sin(theta0);
  const zF = focusDepth * Math.cos(theta0);

  // reference distance is from center element (x = 0) to focal point so the
  // center element has zero relative delay (preserves previous behavior)
  const rRef = Math.sqrt((0 - xF) * (0 - xF) + zF * zF);

  for (let i = 0; i < N; i++) {
    const x = (i - center) * d;
    const r = Math.sqrt((x - xF) * (x - xF) + zF * zF);
    const tau = (r - rRef) / c; // seconds (relative to center element)
    const phi = 2 * Math.PI * cfg.frequencyHz * tau;
    timeDelays[i] = tau;
    phaseRadians[i] = phi;
  }

  return { timeDelays, phaseRadians };
}

/**
 * Convenience: compute a Profile (weights + delays) for a config
 */
export function computeProfile(cfg: ProfileConfig): ProfileSnapshot {
  const weights = computeWeights(cfg);
  const delays = computeDelays(cfg);
  return { weights, delays };
}

/**
 * Compute normalized array factor intensity across angles.
 * AF(θ) = Σ w_i * exp(j * ((i - c) * k d (sinθ - sinθ0)))
 * Intensity = |AF|^2 normalized to peak 1
 */
export function computePattern(
  cfg: ProfileConfig,
  anglesDeg: number[] = defaultAngles(),
  normalized = true
): PatternPoint[] {
  const N = cfg.elements;
  const w = computeWeights(cfg);
  const d = spacingMeters(cfg);
  const lambda = cfg.waveSpeed / cfg.frequencyHz;
  const kd = (2 * Math.PI / lambda) * d;
  const c = (N - 1) / 2;
  const s0 = Math.sin((cfg.steerAngleDeg * Math.PI) / 180);

  let maxI = 0;
  const raw: { angleDeg: number; I: number }[] = [];

  for (const ang of anglesDeg) {
    const s = Math.sin((ang * Math.PI) / 180);
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      const psi = (i - c) * kd * (s - s0);
      // exp(j*psi) = cos(psi) + j sin(psi)
      re += w[i] * Math.cos(psi);
      im += w[i] * Math.sin(psi);
    }
    const I = re * re + im * im;
    if (I > maxI) maxI = I;
    raw.push({ angleDeg: ang, I });
  }

  const out: PatternPoint[] = raw.map(p => {
    const lin = normalized ? (maxI > 0 ? p.I / maxI : 0) : p.I;
    const db = lin > 0 ? 10 * Math.log10(lin) : -Infinity;
    return { angleDeg: p.angleDeg, intensityLin: lin, intensityDb: db };
  });

  return out;
}

export function defaultAngles(start = -90, end = 90, step = 0.25): number[] {
  const v: number[] = [];
  for (let a = start; a <= end + 1e-9; a += step) v.push(Number(a.toFixed(6)));
  return v;
}
