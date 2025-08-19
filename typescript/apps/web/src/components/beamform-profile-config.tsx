import React, { useMemo, useState } from "react";
import {
  BeamformerConfig,
  computePattern,
  computeWeights,
  computeProfile,
  defaultAngles,
  toCsv,
  parseCsvConfig,
  PatternPoint,
  Profile,
} from "@aloe/core";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { WebStorage } from "@aloe/adapters-web";
import { Slider } from "./ui/slider";
import { VerticalSlider } from "./ui/vertical-slider";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

const storage = new WebStorage();

type Props = {
  config?: BeamformerConfig;
  setConfig?: (cfg: BeamformerConfig) => void;
  setPattern?: (pattern: PatternPoint[]) => void;
  setProfile?: (profile: Profile) => void;
};

export default function BeamformProfileConfig({ config: externalConfig, setConfig, setPattern, setProfile }: Props) {
  const [elements, setElements] = useState<number>(Math.min(1024, Math.max(1, externalConfig?.elements ?? 64)));
  const [spacing, setSpacing] = useState<number>(externalConfig?.spacing ?? 0.5);
  const [spacingUnit, setSpacingUnit] = useState<"wavelength" | "meters">(externalConfig?.spacingUnit ?? "wavelength");
  const [frequencyHz, setFrequencyHz] = useState<number>(externalConfig?.frequencyHz ?? 5_000_000);
  const [waveSpeed, setWaveSpeed] = useState<number>(externalConfig?.waveSpeed ?? 1540);
  const [steerAngleDeg, setSteerAngleDeg] = useState<number>(externalConfig?.steerAngleDeg ?? 0);
  const [windowType, setWindowType] = useState<string>(
    (externalConfig?.windowType as string) ?? "chebyshev"
  );
  const [chebDb, setChebDb] = useState<number>(externalConfig && (externalConfig as any).chebyshevSidelobeDb ? (externalConfig as any).chebyshevSidelobeDb : 30);
  const [focusDepth, setFocusDepth] = useState<number | undefined>(externalConfig?.focusDepth);

  const baseCfg: Omit<BeamformerConfig, "weightsOverride" | "windowType"> = {
    elements,
    spacing,
    spacingUnit,
    frequencyHz,
    waveSpeed,
    steerAngleDeg,
    chebyshevSidelobeDb: chebDb,
    focusDepth,
  } as any;

  const [weights, setWeights] = useState<number[]>(() => {
    const tmp = { ...(baseCfg as any), windowType } as BeamformerConfig;
    return computeWeights(tmp);
  });

  const prevNonCustomWeightsRef = React.useRef<number[] | null>(null);

  React.useEffect(() => {
    const tmp = { ...(baseCfg as any), windowType } as BeamformerConfig;
    const w = computeWeights(tmp);
    if (windowType === "custom") {
      // Use the last non-custom weights for continuity if available,
      // otherwise fall back to the freshly computed weights.
      const prev = prevNonCustomWeightsRef.current ?? w;
      const desiredLen = elements;
      const adjusted = prev.length === desiredLen
        ? prev
        : [...prev.slice(0, desiredLen), ...Array(Math.max(0, desiredLen - prev.length)).fill(0)];
      setWeights(adjusted);
    } else {
      setWeights(w);
      prevNonCustomWeightsRef.current = w;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, spacing, spacingUnit, frequencyHz, waveSpeed, windowType, chebDb]);

  const cfgWithOverride: BeamformerConfig = useMemo(() => {
    const partial = { ...(baseCfg as any), windowType } as BeamformerConfig;
    if (windowType === "custom") {
      return { ...(partial as any), customWeights: weights } as BeamformerConfig;
    }
    return partial;
  }, [baseCfg, windowType, weights]);

  const pattern = useMemo(() => computePattern(cfgWithOverride, defaultAngles(), true), [cfgWithOverride]);
  const profile = useMemo(() => computeProfile(cfgWithOverride), [cfgWithOverride]);

  React.useEffect(() => {
    setPattern && setPattern(pattern);
    setProfile && setProfile(profile);
    setConfig && setConfig(cfgWithOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfgWithOverride, pattern, profile]);

  const exportCsv = async () => {
    const csv = toCsv({ config: cfgWithOverride, profile, pattern });
    const fileName = `beamformer_${elements}el_${windowType}.csv`;
    await storage.saveText(fileName, csv);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsvConfig(text);
    setElements(parsed.config.elements);
    setSpacing(parsed.config.spacing);
    setSpacingUnit(parsed.config.spacingUnit);
    setFrequencyHz(parsed.config.frequencyHz);
    setWaveSpeed(parsed.config.waveSpeed);
    setSteerAngleDeg(parsed.config.steerAngleDeg);
    setWindowType(parsed.config.windowType as string);
    setChebDb(parsed.config.chebyshevSidelobeDb ?? 30);
    if ((parsed.config as any).weightsOverride && (parsed.config as any).weightsOverride.length === parsed.config.elements) {
      setWeights((parsed.config as any).weightsOverride);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration</CardTitle>
        <CardDescription>Setup elements, spacing, frequency, steering, window, and weights.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">

          <div className="flex gap-2">
            <Button onClick={exportCsv}>Export CSV</Button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); }} />
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>Import CSV</Button>
          </div>


          <div>
            <Label>Elements</Label>
            <Input type="text" value={String(elements)} onChange={e => {
                const raw = e.target.value.trim();
                const parsed = Math.floor(Number(raw));
                if (!Number.isFinite(parsed)) return setElements(elements);
                setElements(Math.min(1024, Math.max(1, parsed)));
              }} />
          </div>

          <div>
            <Label>Spacing ({spacingUnit})</Label>
            <div className="flex gap-2 items-center">
              <Input type="text" value={String(spacing)} onChange={e => {
                const raw = e.target.value.trim();
                const parsed = Number(raw);
                if (!Number.isFinite(parsed)) return setSpacing(spacing);
                setSpacing(parsed);
              }} />
              <Select value={spacingUnit} onValueChange={(v) => setSpacingUnit(v as any)}>
                <SelectTrigger style={{ minWidth: 140 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wavelength">wavelengths</SelectItem>
                  <SelectItem value="meters">meters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Frequency (Hz)</Label>
            <Input type="number" value={String(frequencyHz)} onChange={e => setFrequencyHz(Number(e.target.value))} />
          </div>

          <div>
            <Label>Wave speed (m/s)</Label>
            <Input type="number" value={String(waveSpeed)} onChange={e => setWaveSpeed(Number(e.target.value))} />
          </div>

          <div>
            <Label>Focus depth (m)</Label>
            <Input type="number" value={focusDepth !== undefined ? String(focusDepth) : ""} onChange={e => setFocusDepth(e.target.value === "" ? undefined : Number(e.target.value))} />
          </div>

          <div>
            <Label>Steer angle (deg)</Label>
            <div className="flex items-center gap-3">
              <div style={{ flex: 1 }}>
                <Slider min={-90} max={90} step={0.1} value={[steerAngleDeg]} onValueChange={(v) => setSteerAngleDeg(v[0])} />
              </div>
              <div style={{ minWidth: 64, textAlign: "right", color: "#111827", fontWeight: 600 }}>{steerAngleDeg.toFixed(1)}°</div>
            </div>
          </div>

          <div>
            <Label>Window</Label>
            <Select value={windowType} onValueChange={(v) => setWindowType(v as any)}>
              <SelectTrigger style={{ minWidth: 180 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangular">rectangular</SelectItem>
                <SelectItem value="hamming">hamming</SelectItem>
                <SelectItem value="triangular">triangular</SelectItem>
                <SelectItem value="chebyshev">chebyshev</SelectItem>
                <SelectItem value="custom">custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {windowType === "chebyshev" && (
            <div>
              <Label>Chebyshev SLL (dB)</Label>
              <div className="flex items-center gap-3">
                <div style={{ flex: 1 }}>
                  <Slider min={0} max={60} step={1} value={[chebDb]} onValueChange={(v) => setChebDb(v[0])} />
                </div>
                <div style={{ minWidth: 64, textAlign: "right", color: "#111827", fontWeight: 600 }}>{chebDb.toFixed(0)} dB</div>
              </div>
            </div>
          )}

          {/* Mini weights preview: shows the current weights for any configuration */}
          <div className="h-32 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weights.map((w, i) => ({ idx: i + 1, w }))} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                <YAxis hide />
                <Tooltip formatter={(v: any) => Number(v).toFixed(4)} />
                <Bar dataKey="w" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {windowType === "custom" && (
            <fieldset style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
              <legend>Weights (custom)</legend>
              <div className="grid grid-cols-6 gap-2">
                {weights.map((w, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Label className="">#{i + 1}</Label>
                    <div className="text-sm mt-1">{w.toFixed(2)}</div>
                    <div className="h-20 flex items-center">
                      <div className="w-6 flex justify-center">
                        <VerticalSlider min={0} max={1} step={0.0001} value={[w]} onValueChange={(v) => {
                          const newWeights = [...weights];
                          newWeights[i] = v[0];
                          setWeights(newWeights);
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


