/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Defines core types and interfaces for the beamformer application.
 */

export type SpacingUnit = "wavelength" | "meters";
export type WindowType = "rectangular" | "hamming" | "triangular" | "chebyshev" | "custom";

/**
 * Beamformer configuration. For `windowType === "custom"` a `weightsOverride` MUST be provided.
 * For other window types `weightsOverride` should not be present.
 */
export type BeamformerConfig =
  | {
      elements: number;
      spacing: number;
      spacingUnit: SpacingUnit;
      frequencyHz: number;
      waveSpeed: number;
      steerAngleDeg: number;
      windowType: Exclude<WindowType, "custom">;
      chebyshevSidelobeDb?: number;
      /** customWeights is not allowed for non-custom window types */
      customWeights?: undefined;
      /** Optional focus depth (m) for future use */
      focusDepth?: number;
    }
  | {
      elements: number;
      spacing: number;
      spacingUnit: SpacingUnit;
      frequencyHz: number;
      waveSpeed: number;
      steerAngleDeg: number;
      windowType: "custom";
      chebyshevSidelobeDb?: number;
      /** For custom windows the explicit per-element weights are required. */
      customWeights: number[];
      /** Optional focus depth (m) for future use */
      focusDepth?: number;
    };

export interface PerElementDelays {
  /** time delay in seconds for each element */
  timeDelays: number[];
  /** phase (radians) for each element at 'frequencyHz' */
  phaseRadians: number[];
}

/** Beam pattern sample at an angle (deg) */
export interface PatternPoint {
  angleDeg: number;
  intensityLin: number;    // normalized 0..1
  intensityDb: number;     // 10*log10(intensityLin), -Inf at 0 (we clamp)
}

export interface BeamResult {
  config: BeamformerConfig;
  /** Profile contains the per-element apodization and delays */
  profile: Profile;
  pattern: PatternPoint[]; // across angles
}

/** Compact per-element profile exported/consumed by UI and CSV routines. */
export interface Profile {
  weights: number[]; // length = elements
  delays: PerElementDelays;
}
