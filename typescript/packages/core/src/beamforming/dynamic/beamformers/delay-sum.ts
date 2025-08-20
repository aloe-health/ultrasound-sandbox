/* Delay-and-sum dynamic beamformer (phased only). */

import { DynamicBeamformer, DynamicBeamformingConfig, SampleMatrix, ScanlineVector, elementPositionMeters } from "../types.js";
import { scanlineParam } from "../util.js";

export function createDelayAndSumBeamformer(): DynamicBeamformer {
  return {
    beamform: (matrix: SampleMatrix, scanlineIndex: number, cfg: DynamicBeamformingConfig): ScanlineVector => {
      const samples = cfg.scanning.samples;
      const elements = cfg.array.elements;
      const dt = cfg.timeStep; // seconds
      const c = cfg.propagationSpeed; // m/s

      if (cfg.scanning.type !== "phased") {
        console.error("DelayAndSum: Only 'phased' scanning is supported currently.");
        // Fallback to simple sum
        const out: number[] = new Array(samples).fill(0);
        for (let s = 0; s < samples; s++) {
          let acc = 0;
          const row = matrix[s];
          for (let e = 0; e < elements; e++) acc += row[e];
          out[s] = acc;
        }
        return out;
      }

      const thetaDeg = scanlineParam(cfg, scanlineIndex);
      const theta = (thetaDeg * Math.PI) / 180;
      const sinTheta = Math.sin(theta);

      // Precompute per-element fractional sample shift (negative delay to advance)
      const shifts: number[] = new Array(elements);
      for (let e = 0; e < elements; e++) {
        const x = elementPositionMeters(e, cfg.array);
        const tau = (x * sinTheta) / c; // seconds
        shifts[e] = -tau / dt; // samples (fractional)
      }

      const out: number[] = new Array(samples).fill(0);
      for (let s = 0; s < samples; s++) {
        let acc = 0;
        for (let e = 0; e < elements; e++) {
          const idx = s + shifts[e];
          acc += sampleRowLinear(matrix, e, idx);
        }
        out[s] = acc;
      }
      return out;
    }
  };
}

function sampleRowLinear(matrix: SampleMatrix, elementIndex: number, sampleIndex: number): number {
  const s0 = Math.floor(sampleIndex);
  const frac = sampleIndex - s0;
  const s1 = s0 + 1;
  if (s0 < 0 || s0 >= matrix.length) return 0;
  const row0 = matrix[s0][elementIndex];
  if (frac <= 1e-12) return row0;
  if (s1 < 0 || s1 >= matrix.length) return row0;
  const row1 = matrix[s1][elementIndex];
  return row0 * (1 - frac) + row1 * frac;
}


