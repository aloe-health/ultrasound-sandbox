import { DynamicBeamformingConfig } from "./types.js";

export function scanlineParam(cfg: DynamicBeamformingConfig, scanlineIndex: number): number {
  const { numScanLines, range } = cfg.scanning;
  const [minVal, maxVal] = range;
  if (numScanLines <= 1) return (minVal + maxVal) / 2;
  const t = scanlineIndex / (numScanLines - 1);
  return minVal + t * (maxVal - minVal);
}


