/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-20
 * Purpose: Ideal point-source scanline generator with constant reflection and no attenuation.
 */

import { DynamicBeamformingConfig, ScanlineGenerator, SampleMatrix, elementPositionMeters } from "../types.js";

export interface PointSourceGeneratorConfig {
  /** Offset within scanning range. For phased: degrees. For linear: meters. */
  offset: number;
  /** Radial speed of the point source moving away from the array (m/s). */
  speed: number;
  /** Continuous wave frequency in Hz */
  frequencyHz: number;
  /** Base amplitude of the reflected wave. */
  amplitude?: number;
  /** Base phase offset (radians) at t=0 */
  phase0?: number;
}

/**
 * Factory to create a point-source generator instance.
 * The generated scanline is identical for all scanlineIndex values.
 */
export function createPointSourceGenerator(config: PointSourceGeneratorConfig): ScanlineGenerator {
  const amplitude = config.amplitude ?? 1;
  const phase0 = config.phase0 ?? 0;

  return {
    generateScanline: (_scanlineIndex: number, cfg: DynamicBeamformingConfig): SampleMatrix => {
      const samples = cfg.scanning.samples;
      const elements = cfg.array.elements;
      const dt = cfg.timeStep; // seconds
      const c = cfg.propagationSpeed; // m/s

      const matrix: SampleMatrix = new Array(samples);
      for (let s = 0; s < samples; s++) {
        matrix[s] = new Array(elements);
      }

      // Determine point source ray path geometry per element.
      // Two scanning modes:
      // - phased: point source located along angle = offset (degrees) from array normal, moving away
      // - linear: point source located at lateral x = offset (meters) on central axis, moving away
      const isPhased = cfg.scanning.type === "phased";
      const thetaRad = isPhased ? (config.offset * Math.PI) / 180 : 0;

      // We place the source at z(t) = z0 + speed * t (z away from array), x(t) fixed by offset
      // Choose z0 small positive to avoid singularity at t=0
      const z0 = 1e-3; // meters
      const xOffset = isPhased ? 0 : config.offset; // meters when linear

      for (let s = 0; s < samples; s++) {
        const t = s * dt;
        const z = z0 + config.speed * t;
        const xCenter = isPhased ? z * Math.tan(thetaRad) : xOffset;

        for (let e = 0; e < elements; e++) {
          const xElem = elementPositionMeters(e, cfg.array);
          const r = Math.sqrt((xElem - xCenter) * (xElem - xCenter) + z * z);
          const tau = r / c; // time of flight (one-way)
          const omega = 2 * Math.PI * config.frequencyHz; // radians per second
          const phase = omega * (t - 2 * tau) + phase0; // round-trip
          matrix[s][e] = amplitude * Math.cos(phase);
        }
      }

      return matrix;
    }
  };
}


