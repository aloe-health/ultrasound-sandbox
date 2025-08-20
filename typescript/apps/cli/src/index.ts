#!/usr/bin/env bun
/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Command-line interface for beamformer computations and CSV export.
 */
import { Command } from "commander";
import {
  ProfileConfig,
  computePattern,
  computeProfile,
  defaultAngles,
  toCsv,
  // dynamic
  DynamicBeamformingConfig,
  createSumBeamformer,
  createPointSourceGenerator,
  runFrame,
  createDelayAndSumBeamformer,
  createDelayAndSumApodizedBeamformer,
  // signal
  envelope,
} from "@aloe/core";
import { NodeStorage } from "@aloe/adapters-node";
import { parseCsvConfig } from "@aloe/core";

const program = new Command();

program
  .name("beamform")
  .description("Beamforming utilities (profiles and dynamic)")
  .version("0.1.0");

// profiles subcommand group
const profiles = program.command("profiles").description("Static profile utilities");

profiles.command("compute")
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
    let cfg: ProfileConfig = {
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

    const csv = toCsv({ config: cfg as any, snapshot: profile, pattern });
    const st = new NodeStorage();
    await st.saveText(opts.out, csv);
    console.log(`Wrote ${opts.out}`);
  });

// dynamic subcommand group
const dynamic = program.command("dynamic").description("Dynamic beamforming simulation");

dynamic.command("simulate")
  .description("Simulate one frame with point-source generator and selected beamformer")
  .option("--scan-type <t>", "linear|phased", "phased")
  .option("--scan-lines <int>", "number of scan lines", (v)=>parseInt(v,10), 40)
  .option("--range <min,max>", "range (deg for phased, meters for linear)", "-10,10")
  .option("--samples <int>", "samples per scan line", (v)=>parseInt(v,10), 1024)
  .option("--elements <int>", "array elements", (v)=>parseInt(v,10), 64)
  .option("--spacing <m>", "element spacing (m)", parseFloat, 0.0005)
  .option("--dt <s>", "time step (s)", parseFloat, 1e-7)
  .option("--c <mps>", "propagation speed (m/s)", parseFloat, 1540)
  .option("--freq <hz>", "source frequency (Hz)", parseFloat, 5_000_000)
  .option("--offset <val>", "offset within range (deg for phased, m for linear)", parseFloat, 0)
  .option("--speed <mps>", "point-source radial speed (m/s)", parseFloat, 1540)
  .option("--bf <type>", "beamformer: sum|delay|delay-apod (default: delay)", "delay")
  .option("--window <type>", "apodization window (rectangular|hamming|triangular|chebyshev)", "hamming")
  .option("--cheb-sll <db>", "chebyshev sidelobe dB (used if window=chebyshev)", parseFloat, 30)
  .option("--envelope", "apply Hilbert envelope to each scanline")
  .action(async (opts) => {
    const [rmin, rmax] = String(opts.range).split(",").map(Number);
    const cfg: DynamicBeamformingConfig = {
      /** seconds */
      timeStep: opts.dt,
      /** meters per second */
      propagationSpeed: opts.c,
      scanning: {
        numScanLines: opts.scanLines,
        type: opts.scanType,
        range: [rmin, rmax],
        samples: opts.samples,
      },
      array: {
        elements: opts.elements,
        /** meters */
        elementSpacing: opts.spacing,
      },
    };

    const gen = createPointSourceGenerator({ offset: opts.offset, /** m/s */ speed: opts.speed, frequencyHz: opts.freq });

    let bf;
    switch (opts.bf) {
      case "sum":
        bf = createSumBeamformer();
        break;
      case "delay-apod":
        bf = createDelayAndSumApodizedBeamformer({ windowType: opts.window, chebyshevSidelobeDb: opts.chebSll });
        break;
      case "delay":
      default:
        bf = createDelayAndSumBeamformer();
    }

    const res = runFrame(cfg, gen, bf);
    const out = opts.envelope ? res.beamformed.map(envelope) : res.beamformed;
    console.log("Simulated frame:");
    console.log({
      scanParams: res.scanParams.slice(0, 5),
      firstScanlinePreview: out[0]?.slice(0, 16),
      dims: { scanlines: out.length, samples: out[0]?.length }
    });
  });

program.parse();
