#!/usr/bin/env bun
/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Command-line interface for beamformer computations and CSV export.
 */
import { Command } from "commander";
import {
  BeamformerConfig,
  computePattern,
  computeProfile,
  defaultAngles,
  toCsv,
} from "@aloe/core";
import { NodeStorage } from "@aloe/adapters-node";
import { parseCsvConfig } from "@aloe/core";

const program = new Command();

program
  .name("beamform")
  .description("Phased array beamformer utilities")
  .version("0.1.0");

program.command("compute")
  .description("Compute weights, delays, and pattern; export CSV")
  .option("-n, --elements <int>", "number of elements", (v)=>parseInt(v,10), 64)
  .option("-s, --spacing <number>", "spacing value (meters or wavelengths)", parseFloat, 0.5)
  .option("-u, --spacing-unit <unit>", "spacing unit (wavelength|meters)", "wavelength")
  .option("-f, --frequency <hz>", "frequency in Hz", parseFloat, 5_000_000)
  .option("-c, --wavespeed <mps>", "wave speed (m/s)", parseFloat, 1540)
  .option("-a, --steer <deg>", "steer angle (deg)", parseFloat, 0)
  .option("-w, --window <type>", "window (rectangular|hamming|triangular|chebyshev)", "hamming")
  .option("--cheb-sll <db>", "chebyshev sidelobe level in dB", parseFloat, 30)
  .option("--angles <start,end,step>", "angle sweep (deg)", "-90,90,0.25")
  .option("-o, --out <file>", "output CSV file", "beamformer.csv")
  .option("--from-csv <file>", "load a previously saved CSV to reuse its config/weights")
  .action(async (opts) => {
    let cfg: BeamformerConfig = {
      elements: opts.elements,
      spacing: opts.spacing,
      spacingUnit: opts.spacingUnit,
      frequencyHz: opts.frequency,
      waveSpeed: opts.wavespeed,
      steerAngleDeg: opts.steer,
      windowType: opts.window,
      chebyshevSidelobeDb: opts.chebSll
    };

    // Optional: override from existing CSV config
    if (opts.fromCsv) {
      const st = new NodeStorage();
      const txt = await st.loadText(opts.fromCsv);
      if (!txt) {
        console.error(`Could not load ${opts.fromCsv}`);
        process.exit(1);
      }
      const parsed = parseCsvConfig(txt);
      cfg = { ...cfg, ...parsed.config }; // keep CLI values by spreading appropriately if desired
      // Use overrides from file if present
      if ((parsed.config as any).customWeights) {
        cfg.customWeights = (parsed.config as any).customWeights;
      }
    }

    const [start, end, step] = String(opts.angles).split(",").map(Number);
    const sweep = defaultAngles(start, end, step);

    const profile = computeProfile(cfg as any);
    const pattern = computePattern(cfg as any, sweep);

    const csv = toCsv({ config: cfg as any, profile, pattern });
    const st = new NodeStorage();
    await st.saveText(opts.out, csv);
    console.log(`Wrote ${opts.out}`);
  });

program.parse();
