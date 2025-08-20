/* Minimal dynamic beamformer that sums across elements (no delays/apodization). */

import { DynamicBeamformer, DynamicBeamformingConfig, SampleMatrix, ScanlineVector } from "../types.js";

export function createSumBeamformer(): DynamicBeamformer {
  return {
    beamform: (matrix: SampleMatrix, _scanlineIndex: number, cfg: DynamicBeamformingConfig): ScanlineVector => {
      const samples = cfg.scanning.samples;
      const elements = cfg.array.elements;
      const output: number[] = new Array(samples).fill(0);
      for (let s = 0; s < samples; s++) {
        let acc = 0;
        const row = matrix[s];
        for (let e = 0; e < elements; e++) acc += row[e];
        output[s] = acc;
      }
      return output;
    }
  };
}


