import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Slider } from "../ui/slider";

const Row = (props: { children: React.ReactNode; className?: string }) => (
  <div className={"flex items-center gap-2 " + (props.className || "")}>{props.children}</div>
);

export default function DynamicBeamformConfig(props: {
  scanLines: number; setScanLines: (v:number)=>void;
  samples: number; setSamples: (v:number)=>void;
  elements: number; setElements: (v:number)=>void;
  spacingValue: number; setSpacingValue: (v:number)=>void;
  spacingUnit: "mm"|"wavelengths"; setSpacingUnit: (v:"mm"|"wavelengths")=>void;
  dtUs: number; setDtUs: (v:number)=>void;
  c: number; setC: (v:number)=>void;
  rangePos: number; setRangePos: (v:number)=>void;
}){
  const { scanLines, setScanLines, samples, setSamples, elements, setElements, spacingValue, setSpacingValue, spacingUnit, setSpacingUnit, dtUs, setDtUs, c, setC, rangePos, setRangePos } = props;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Row><Label htmlFor="scanlines">Scan lines</Label><Input id="scanlines" type="number" value={scanLines} onChange={e=>setScanLines(parseInt(e.target.value,10)||0)} className="w-28"/></Row>
      <Row><Label htmlFor="samples">Samples</Label><Input id="samples" type="number" value={samples} onChange={e=>setSamples(parseInt(e.target.value,10)||0)} className="w-28"/></Row>
      <Row><Label htmlFor="elements">Elements</Label><Input id="elements" type="number" value={elements} onChange={e=>setElements(parseInt(e.target.value,10)||0)} className="w-28"/></Row>
      <Row className="col-span-1 md:col-span-2">
        <Label htmlFor="spacing">Element spacing</Label>
        <Input id="spacing" type="number" step="0.01" value={spacingValue} onChange={e=>setSpacingValue(parseFloat(e.target.value)||0)} className="w-36"/>
        <Select value={spacingUnit} onValueChange={(v: any)=>setSpacingUnit(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={spacingUnit} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mm">mm</SelectItem>
            <SelectItem value="wavelengths">wavelengths</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row>
        <Label htmlFor="dt">dt (µs)</Label>
        <Input id="dt" type="number" step="0.01" value={dtUs} onChange={e=>setDtUs(parseFloat(e.target.value)||0)} className="w-36"/>
      </Row>
      <Row><Label htmlFor="c">c (m/s)</Label><Input id="c" type="number" value={c} onChange={e=>setC(parseFloat(e.target.value)||0)} className="w-36"/></Row>
      <Row>
        <Label htmlFor="range">Range (deg)</Label>
        <div className="w-48">
          <Slider value={[rangePos]} min={1} max={90} onValueChange={(v:any)=>setRangePos(v[0]||1)} />
        </div>
        <div className="text-sm text-muted-foreground">±{rangePos}°</div>
      </Row>
    </div>
  );
}


