/*
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: CSV import/export for beamformer configurations and results.
 */

import { BeamformFullProfile, ProfileConfig, ProfileSnapshot, SpacingUnit, WindowType } from "./types.js";

/** Serialize a config & per-element data into a CSV string. */
export function toCsv(result: BeamformFullProfile): string {
  const { config, snapshot: profile } = result;
  const { weights, delays } = profile;
  const header = [
    "# BeamformerConfig",
    `elements,${config.elements}`,
    `spacing,${config.spacing}`,
    `spacingUnit,${config.spacingUnit}`,
    `frequencyHz,${config.frequencyHz}`,
    `waveSpeed,${config.waveSpeed}`,
    `steerAngleDeg,${config.steerAngleDeg}`,
    `windowType,${config.windowType}`,
    `focusDepth,${config.focusDepth ?? ""}`,
    `chebyshevSidelobeDb,${config.chebyshevSidelobeDb ?? ""}`,
    `customWeights,${(config as any).customWeights ? "present" : ""}`,
    "",
    "index,weight,phaseRadians,timeDelaySeconds"
  ].join("\n");

  const rows = weights.map((w, i) => {
    const phi = delays.phaseRadians[i];
    const tau = delays.timeDelays[i];
    return `${i},${w},${phi},${tau}`;
  });

  return header + "\n" + rows.join("\n") + "\n";
}

/** Parse a CSV produced by toCsv back into a BeamformerConfig and optional weights. */
export function parseCsvConfig(csv: string): { config: ProfileConfig; weights: number[] } {
  const lines = csv.split(/\r?\n/);
  const map = new Map<string, string>();
  let dataStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i].trim();
    if (!L) continue;
    if (L.startsWith("#")) continue;
    if (L.startsWith("index,weight,phaseRadians,timeDelaySeconds")) {
      dataStart = i + 1;
      break;
    }
    const parts = L.split(",");
    if (parts.length >= 2) {
      map.set(parts[0], parts.slice(1).join(","));
    }
  }
  if (dataStart < 0) throw new Error("CSV missing data header row.");

  const elements = Number(map.get("elements") ?? 0);
  const spacing = Number(map.get("spacing") ?? 0);
  const spacingUnit = (map.get("spacingUnit") ?? "wavelength") as SpacingUnit;
  const frequencyHz = Number(map.get("frequencyHz") ?? 1);
  const waveSpeed = Number(map.get("waveSpeed") ?? 1540);
  const steerAngleDeg = Number(map.get("steerAngleDeg") ?? 0);
  const windowType = (map.get("windowType") ?? "rectangular") as WindowType;
  const focusDepthStr = map.get("focusDepth");
  const focusDepth = focusDepthStr ? Number(focusDepthStr) : undefined;
  const chebyshevSidelobeDbStr = map.get("chebyshevSidelobeDb");
  const chebyshevSidelobeDb = chebyshevSidelobeDbStr ? Number(chebyshevSidelobeDbStr) : undefined;

  const weights: number[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const L = lines[i].trim();
    if (!L) continue;
    const [idxStr, wStr] = L.split(",", 4);
    if (idxStr === undefined || wStr === undefined) continue;
    weights.push(Number(wStr));
  }

  const config: ProfileConfig = {
    elements,
    spacing,
    spacingUnit,
    frequencyHz,
    waveSpeed,
    steerAngleDeg,
    windowType,
    chebyshevSidelobeDb,
    focusDepth,
    customWeights: weights.length === elements ? weights : undefined
  };

  return { config, weights };
}
