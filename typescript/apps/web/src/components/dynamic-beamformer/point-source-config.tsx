import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Slider } from "../ui/slider";
import { ScanningConfig } from "@aloe/core";

const Row = (props: { children: React.ReactNode; className?: string }) => (
  <div className={"flex items-center gap-2 " + (props.className || "")}>{props.children}</div>
);

export default function PointSourceConfig(props: {
  offset: number; setOffset: (v:number)=>void;
  speed: number; setSpeed: (v:number)=>void;
  freqMhz: number; setFreqMhz: (v:number)=>void;
  mode: "raw"|"envelope"; setMode: (v:"raw"|"envelope")=>void;
  bfType: "sum"|"delay"|"delay-apod"; setBfType: (v:"sum"|"delay"|"delay-apod")=>void;
  windowType: "rectangular"|"hamming"|"triangular"|"chebyshev"; setWindowType: (v:any)=>void;
  chebSll: number; setChebSll: (v:number)=>void;
  scanning?: ScanningConfig;
}){
  const { offset, setOffset, speed, setSpeed, freqMhz, setFreqMhz, mode, setMode, bfType, setBfType, windowType, setWindowType, chebSll, setChebSll, scanning } = props;
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Row className="col-span-1 md:col-span-3">
          <Label htmlFor="offset">Offset (deg)</Label>
          <div className="w-full md:w-64">
            <Slider value={[offset]} min={(scanning?.range?.[0]) ?? -45} max={(scanning?.range?.[1]) ?? 45} onValueChange={(v:any)=>setOffset(v[0]||0)} />
          </div>
          <div className="text-sm text-muted-foreground">{offset}°</div>
        </Row>
        <Row><Label htmlFor="speed">Speed (m/s)</Label><Input id="speed" type="number" value={speed} onChange={e=>setSpeed(parseFloat(e.target.value)||0)} className="w-36"/></Row>
        <Row>
          <Label htmlFor="freq">Frequency (MHz)</Label>
          <Input id="freq" type="number" value={freqMhz} onChange={e=>setFreqMhz(parseFloat(e.target.value)||0)} className="w-44"/>
        </Row>
        <Row>
          <Label htmlFor="mode">Output</Label>
          <Select value={mode} onValueChange={(v:any)=>setMode(v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder={mode}/></SelectTrigger>
            <SelectContent>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="envelope">Envelope</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row>
          <Label htmlFor="bf">Beamformer</Label>
          <Select value={bfType} onValueChange={(v:any)=>setBfType(v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder={bfType}/></SelectTrigger>
            <SelectContent>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="delay">Delay+Sum</SelectItem>
              <SelectItem value="delay-apod">Delay+Sum+Apod</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        {bfType === "delay-apod" && (
          <>
            <Row>
              <Label htmlFor="win">Window</Label>
              <Select value={windowType} onValueChange={(v:any)=>setWindowType(v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder={windowType}/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangular">rectangular</SelectItem>
                  <SelectItem value="hamming">hamming</SelectItem>
                  <SelectItem value="triangular">triangular</SelectItem>
                  <SelectItem value="chebyshev">chebyshev</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            {windowType === "chebyshev" && (
              <Row><Label htmlFor="cheb">Cheb SLL (dB)</Label><Input id="cheb" type="number" value={chebSll} onChange={e=>setChebSll(parseFloat(e.target.value)||0)} className="w-36"/></Row>
            )}
          </>
        )}
      </div>
    </div>
  );
}


