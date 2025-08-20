/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-20
 * Purpose: Strict types and interfaces for dynamic beamforming (simulation loop).
 */

export type ScanType = "linear" | "phased";

export interface ScanningConfig {
  /** Number of scan lines per frame */
  numScanLines: number;
  /** Scan geometry */
  type: ScanType;
  /**
   * Inclusive range for the scan dimension.
   * - For type === "phased": degrees [minDeg, maxDeg]
   * - For type === "linear": meters [minX, maxX]
   */
  range: [number, number];
  /** Number of temporal samples per scan line */
  samples: number;
}

export interface ArrayConfig {
  /** Number of receive/transmit elements in the linear array */
  elements: number;
  /** Center-to-center element spacing (meters) */
  elementSpacing: number;
}

export interface DynamicBeamformingConfig {
  /** Simulation timestep between consecutive samples (seconds) */
  timeStep: number;
  /** Speed of sound (m/s) in the propagation medium */
  propagationSpeed: number;
  /** Scanning configuration */
  scanning: ScanningConfig;
  /** Array geometry configuration */
  array: ArrayConfig;
}

/** Matrix with shape [samples][elements] */
export type SampleMatrix = number[][];

/** Beamformed scanline vector with length = samples */
export type ScanlineVector = number[];

/**
 * Generator that produces raw per-element samples for a single scan line.
 * Implementations should NOT vary their output by scanlineIndex for a given config
 * (i.e., same output for each scan line), unless explicitly specified by a more
 * advanced generator.
 */
export interface ScanlineGenerator {
  generateScanline(scanlineIndex: number, cfg: DynamicBeamformingConfig): SampleMatrix;
}

/**
 * Dynamic beamformer interface. Consumes the per-element sample matrix for a
 * specific scan line and outputs a single beamformed vector of length `samples`.
 */
export interface DynamicBeamformer {
  beamform(matrix: SampleMatrix, scanlineIndex: number, cfg: DynamicBeamformingConfig): ScanlineVector;
}

/** Utility function to compute element x-position (meters) for a linear array */
export function elementPositionMeters(index: number, array: ArrayConfig): number {
  const center = (array.elements - 1) / 2;
  return (index - center) * array.elementSpacing;
}


