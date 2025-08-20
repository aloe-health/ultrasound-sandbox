/* Simple control loop to generate and beamform one frame */

import { DynamicBeamformingConfig, ScanlineGenerator, DynamicBeamformer, ScanlineVector } from "./types.js";
import { scanlineParam } from "./util.js";

export interface FrameResult {
  /** Matrix with shape [numScanLines][samples] */
  beamformed: number[][];
  /** Per-scanline parameter value (deg for phased, meters for linear) */
  scanParams: number[];
}

export function runFrame(
  cfg: DynamicBeamformingConfig,
  generator: ScanlineGenerator,
  beamformer: DynamicBeamformer
): FrameResult {
  const L = cfg.scanning.numScanLines;
  const out: number[][] = new Array(L);
  const params: number[] = new Array(L);
  for (let i = 0; i < L; i++) {
    params[i] = scanlineParam(cfg, i);
    const raw = generator.generateScanline(i, cfg);
    const bf: ScanlineVector = beamformer.beamform(raw, i, cfg);
    out[i] = bf;
  }
  return { beamformed: out, scanParams: params };
}


