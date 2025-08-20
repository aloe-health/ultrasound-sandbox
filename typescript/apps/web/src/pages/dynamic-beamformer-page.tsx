import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { createPointSourceGenerator, runFrame, envelope, DynamicBeamformingConfig, createSumBeamformer, createDelayAndSumBeamformer, createDelayAndSumApodizedBeamformer } from "@aloe/core";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import DynamicBeamformConfig from "../components/dynamic-beamformer/dynamic-beamform-config";
import PointSourceConfig from "../components/dynamic-beamformer/point-source-config";
import BeamformOutputViewer from "../components/dynamic-beamformer/beamform-output-viewer";

const Row = (props: { children: ReactNode; className?: string }) => (
  <div className={"flex items-center gap-2 " + (props.className || "")}>{props.children}</div>
);

export default function DynamicBeamformerPage() {
  const [scanLines, setScanLines] = useState(40);
  const [samples, setSamples] = useState(256);
  const [elements, setElements] = useState(32);
  // element spacing: user controls a value and a unit (mm or wavelengths)
  const [spacingValue, setSpacingValue] = useState(0.25); // default 0.25 wavelengths
  const [spacingUnit, setSpacingUnit] = useState<"mm"|"wavelengths">("wavelengths");
  // dt in microseconds for easier human input (stored as µs)
  const [dtUs, setDtUs] = useState(0.1); // 0.1 µs => 1e-7 s
  const [c, setC] = useState(1540);
  const [offset, setOffset] = useState(0);
  const [speed, setSpeed] = useState(1540);
  // frequency in MHz for input
  const [freqMhz, setFreqMhz] = useState(5);
  const [mode, setMode] = useState<"raw"|"envelope">("envelope");
  const [bfType, setBfType] = useState<"sum"|"delay"|"delay-apod">("delay");
  const [windowType, setWindowType] = useState<"rectangular"|"hamming"|"triangular"|"chebyshev">("hamming");
  const [chebSll, setChebSll] = useState(30);
  const [autoRun, setAutoRun] = useState(false);
  const [rangePos, setRangePos] = useState(10);

  const [frame, setFrame] = useState<number[][]>([]);

  const cfg: DynamicBeamformingConfig = useMemo(()=> {
    const frequencyHz = freqMhz * 1e6;
    // convert spacingValue+unit into meters
    const wavelength = c / frequencyHz;
    const elementSpacing = spacingUnit === "mm" ? spacingValue / 1000 : spacingValue * wavelength;
    return ({
      /** seconds */ timeStep: dtUs * 1e-6,
      /** m/s */ propagationSpeed: c,
      scanning: { numScanLines: scanLines, type: "phased", range: [-rangePos, rangePos], samples },
      /** meters */ array: { elements, elementSpacing },
    });
  }, [scanLines, samples, elements, spacingValue, spacingUnit, dtUs, c, freqMhz, rangePos]);

  const runningRef = useRef(false);
  const queuedRef = useRef(false);

  async function generateOnce() {
    if (runningRef.current) { queuedRef.current = true; return; }
    runningRef.current = true;
    try {
      const gen = createPointSourceGenerator({ offset, speed, frequencyHz: freqMhz * 1e6 });
      let bf;
      if (bfType === "sum") bf = createSumBeamformer();
      else if (bfType === "delay-apod") bf = createDelayAndSumApodizedBeamformer({ windowType, chebyshevSidelobeDb: chebSll });
      else bf = createDelayAndSumBeamformer();
      await new Promise<void>(r=>setTimeout(r,0));
      const res = runFrame(cfg, gen, bf);
      const out = mode === "envelope" ? res.beamformed.map(envelope) : res.beamformed;
      setFrame(out);
    } finally {
      runningRef.current = false;
      if (queuedRef.current) { queuedRef.current = false; setTimeout(() => generateOnce(), 0); }
    }
  }

  const run = () => generateOnce();

  useEffect(() => {
    if (!autoRun) return;
    let alive = true;
    function tick() {
      if (!alive) return;
      generateOnce();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { alive = false; };
  }, [autoRun, cfg, bfType, windowType, chebSll, mode, offset, speed, freqMhz]);



  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold m-0">Dynamic Beamformer</h1>
        <p className="mt-2 text-gray-500">Point-source generator + ideal sum beamformer. Logs preview to console.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent>
            <div className="mb-2">
              <h3 className="text-sm font-semibold m-0">Beamforming</h3>
            </div>
            <DynamicBeamformConfig
              scanLines={scanLines} setScanLines={setScanLines}
              samples={samples} setSamples={setSamples}
              elements={elements} setElements={setElements}
              spacingValue={spacingValue} setSpacingValue={setSpacingValue}
              spacingUnit={spacingUnit} setSpacingUnit={setSpacingUnit}
              dtUs={dtUs} setDtUs={setDtUs}
              c={c} setC={setC}
              rangePos={rangePos} setRangePos={setRangePos}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-2">
              <h3 className="text-sm font-semibold m-0">Point Source</h3>
            </div>
            <PointSourceConfig
              offset={offset} setOffset={setOffset}
              speed={speed} setSpeed={setSpeed}
              freqMhz={freqMhz} setFreqMhz={setFreqMhz}
              mode={mode} setMode={setMode}
              bfType={bfType} setBfType={setBfType}
              windowType={windowType} setWindowType={setWindowType}
              chebSll={chebSll} setChebSll={setChebSll}
              scanning={cfg.scanning}
            />
          </CardContent>
        </Card>
      </div>
      <div className="flex items-center gap-2 mb-4">
        {autoRun ? (
          <Button variant="destructive" onClick={()=>setAutoRun(false)}>Stop</Button>
        ) : (
          <Button variant="outline" onClick={()=>setAutoRun(true)}>Auto Run</Button>
        )}
        {!autoRun && <Button onClick={run}>Run simulation</Button>}
      </div>
      <BeamformOutputViewer frame={frame} cfg={cfg} />
    </div>
  );
}

 


