/* 
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-19
 * Purpose: Unified magnitude vs angle plot (cartesian or semicircular polar).
 */

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { PatternPoint, computePatternStats, PatternStats } from "@aloe/core";
import { Label } from "./ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

type ScalingConfig = {
  mode: "db" | "linear";
  range: "auto" | [number | "auto", number | "auto"];
};
type Props = {
  data: PatternPoint[];
  mode?: "cartesian" | "polar" | "select-polar" | "select-cartesian";
  scalingConfig?: ScalingConfig;
  width?: number | string;
  plotHeight?: number | string;
  title?: string;
};

const ANGLE_TICKS = [-90, -60, -30, 0, 30, 60, 90];
const PLOT_ANGLE_TICKS = ANGLE_TICKS.map((a) => a);

export default function AngleMagPlot({ data, mode = "cartesian", scalingConfig = { mode: "db", range: "auto" }, width = "100%", plotHeight = 420, title = "Magnitude vs Angle" }: Props) {
  // keep local copy
  const [internalData, setInternalData] = React.useState<PatternPoint[]>(() => data.slice());
  React.useEffect(() => setInternalData(data.slice()), [data]);

  const [displayMode, setDisplayMode] = React.useState<"cartesian" | "polar">(() => {
    if (mode === "select-polar") return "polar";
    if (mode === "select-cartesian") return "cartesian";
    return (mode as "cartesian" | "polar");
  });
  React.useEffect(() => {
    if (mode === "select-polar" || mode === "select-cartesian") return;
    setDisplayMode(mode as "cartesian" | "polar");
  }, [mode]);

  // build points sorted by angle and with numeric `val` (do this before y-domain calc)
  const points = internalData
    .slice()
    .sort((a, b) => a.angleDeg - b.angleDeg)
    .map((d) => ({ angleDeg: d.angleDeg, val: scalingConfig.mode === "db" ? d.intensityDb : d.intensityLin }));

  // compute statistics (work from linear intensities)
  const stats: PatternStats | null = React.useMemo(() => {
    try {
      // original data uses PatternPoint with intensityLin
      return computePatternStats(internalData);
    } catch (e) {
      return null;
    }
  }, [internalData]);

  // determine yDomain from data min/max then apply user overrides
  let yDomain: [number, number];
  let yTicks: number[] | undefined;

  if (points.length === 0) {
    return (
      <div style={{ width }}>
        <div style={{ height: plotHeight }} />
      </div>
    );
  }

  const rawVals = points.map((p) => p.val);
  const finiteVals = rawVals.filter(Number.isFinite);
  let dataMin: number;
  let dataMax: number;
  if (finiteVals.length === 0) {
    if (scalingConfig.mode === "db") {
      dataMin = -100;
      dataMax = 0;
    } else {
      dataMin = 0;
      dataMax = 1;
    }
  } else {
    dataMin = Math.min(...finiteVals);
    dataMax = Math.max(...finiteVals);
  }

  const applyRangeOverride = (range: "auto" | [number | "auto", number | "auto"]) => {
    if (range === "auto") return [dataMin, dataMax] as [number, number];
    const [minSide, maxSide] = range as [number | "auto", number | "auto"];
    const minVal = minSide === "auto" ? dataMin : (minSide as number);
    const maxVal = maxSide === "auto" ? dataMax : (maxSide as number);
    return [minVal, maxVal] as [number, number];
  };

  yDomain = applyRangeOverride(scalingConfig.range);

  // if domain collapsed (min == max) expand slightly
  if (Math.abs(yDomain[1] - yDomain[0]) < 1e-12) {
    const v = yDomain[0] || 1;
    yDomain = [v - Math.abs(v) * 0.1 - 1e-3, v + Math.abs(v) * 0.1 + 1e-3];
  }

  // yTicks: produce three ticks [min, mid, max]
  const mid = (yDomain[0] + yDomain[1]) / 2;
  yTicks = [yDomain[0], mid, yDomain[1]];

  // tick formatter: 3 significant digits, scientific if >999 or <0.1 (and non-zero)
  const formatTick = (v: number) => {
    if (!Number.isFinite(v)) return v < 0 ? "-∞" : "∞";
    if (v === 0) return "0";
    const abs = Math.abs(v);
    if (abs > 999 || abs < 0.1) {
      // scientific with 3 significant digits
      return v.toExponential(2);
    }
    // use 3 significant digits but avoid exponential
    const s = v.toPrecision(3);
    return Number(s).toString();
  };

  // clippedData algorithm: include intersections at domain boundaries so plotted lines remain continuous
  const clippedData: { angleDeg: number; plotVal: number | null }[] = [];

  if (points.length === 1) {
    const p = points[0];
    const v = p.val;
    const plotVal = v >= yDomain[0] && v <= yDomain[1] ? v : null;
    clippedData.push({ angleDeg: p.angleDeg, plotVal });
  } else if (points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const x0 = p0.angleDeg;
      const x1 = p1.angleDeg;
      const v0 = p0.val;
      const v1 = p1.val;
      const in0 = v0 != null && v0 >= yDomain[0] && v0 <= yDomain[1];
      const in1 = v1 != null && v1 >= yDomain[0] && v1 <= yDomain[1];

      if (i === 0 && in0) clippedData.push({ angleDeg: x0, plotVal: v0 });

      const intersections: { t: number; b: number }[] = [];
      const dv = v1 - v0;
      if (Math.abs(dv) > 1e-12) {
        [yDomain[0], yDomain[1]].forEach((b) => {
          const t = (b - v0) / dv;
          if (t > 0 && t < 1) intersections.push({ t, b });
        });
        intersections.sort((a, b) => a.t - b.t);
      }

      if (intersections.length === 0) {
        if (in0 && in1) clippedData.push({ angleDeg: x1, plotVal: v1 });
      } else {
        for (const it of intersections) {
          const xi = x0 + it.t * (x1 - x0);
          clippedData.push({ angleDeg: xi, plotVal: it.b });
        }
        if (in1) clippedData.push({ angleDeg: x1, plotVal: v1 });
      }
    }

    // ensure last
    const last = points[points.length - 1];
    const lastV = last.val;
    if (lastV != null && lastV >= yDomain[0] && lastV <= yDomain[1]) {
      const existing = clippedData[clippedData.length - 1];
      if (!existing || existing.angleDeg !== last.angleDeg) clippedData.push({ angleDeg: last.angleDeg, plotVal: lastV });
    }
  }

  // render helpers
  const tooltipFormatter = (value: number) => {
    if (!Number.isFinite(value)) return scalingConfig.mode === "db" ? "-∞ dB" : "—";
    return scalingConfig.mode === "db" ? `${value.toFixed(1)} dB` : `${value.toFixed(2)}x`;
  };


  return (
    <div style={{ width }}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <CardTitle>{title}</CardTitle>
            {stats && (
              <div className="text-sm text-right">
                <div><strong>PSL:</strong> {Number.isFinite(stats.pslDb as number) ? `${(stats.pslDb as number).toFixed(1)} dB` : stats.pslDb === -Infinity ? "-∞ dB" : "—"}</div>
                <div><strong>ISLR:</strong> {stats.islrDb != null && Number.isFinite(stats.islrDb) ? `${stats.islrDb.toFixed(1)} dB` : "—"}</div>
                <div><strong>FWHM:</strong> {stats.fwhmDeg != null ? `${stats.fwhmDeg.toFixed(2)}°` : "—"}</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-2">
            {(mode === "select-polar" || mode === "select-cartesian") && (
              <div className="flex gap-2 items-center">
                <Label>Display mode</Label>
                <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as "cartesian" | "polar") }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartesian">Cartesian</SelectItem>
                    <SelectItem value="polar">Polar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div style={{ width: "100%", height: plotHeight }}>
            <ResponsiveContainer width="100%" height="100%">
          {displayMode === "cartesian" ? (
            <LineChart data={clippedData} margin={{ top: 56, right: 24, left: 56, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="angleDeg" type="number" domain={[-90, 90]} ticks={ANGLE_TICKS} label={{ value: "Angle (deg)", position: "bottom", offset: 12 }} tick={{ fontSize: 12 }} />
              {scalingConfig.mode === "db" ? (
                <YAxis dataKey="plotVal" label={{ value: `Intensity (dB)`, angle: -90, position: "leftCenter", dx: -25 }} width={56} domain={yDomain} ticks={yTicks} tickFormatter={formatTick} />
              ) : (
                <YAxis dataKey="plotVal" label={{ value: `Intensity (linear)`, angle: -90, position: "leftCenter", dx: -25 }} width={56} domain={yDomain} ticks={yTicks} tickFormatter={formatTick} />
              )}
              <Tooltip formatter={(v: number) => tooltipFormatter(v)} labelFormatter={(label) => `${label}°`} />
              <Legend verticalAlign="top" align="right" height={36} />
              <Line name={scalingConfig.mode === "db" ? "Intensity (dB)" : "Intensity (linear)"} type="monotone" dataKey={"plotVal"} stroke="#8884d8" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          ) : (
            <RadarChart data={clippedData.map(d => ({ ...d, angleDeg: d.angleDeg }))} startAngle={0} endAngle={180} cx="50%" cy="50%" outerRadius="90%">
              <PolarGrid gridType="circle"/>
              <PolarAngleAxis dataKey="angleDeg" type="number" domain={[-90, 90]} ticks={PLOT_ANGLE_TICKS as any} tickFormatter={(v) => {
                return `${v}°`;
              }} />
              <PolarRadiusAxis domain={yDomain} ticks={yTicks as any} tickFormatter={formatTick} tick={{ dy: -6 }} />
              <Tooltip formatter={(v: number) => tooltipFormatter(v)} labelFormatter={(label) => `${label}°`}/>
              <Legend verticalAlign="bottom" align="right" height={36} />
              <Radar name={scalingConfig.mode === "db" ? "Intensity (dB)" : "Intensity (linear)"} dataKey="plotVal" stroke="#8884d8" fill="#8884d8" fillOpacity={0} />
            </RadarChart>
            )}
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


