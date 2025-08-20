import React from "react";
import { Button } from "../ui/button";
import { DynamicBeamformingConfig } from "@aloe/core";

export default function BeamformOutputViewer(props: {
  frame: number[][];
  cfg?: DynamicBeamformingConfig;
}){
  const { frame, cfg } = props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    if (!frame || frame.length === 0) return;
    if (cfg && cfg.scanning.type === "phased") return drawPolar(frame, cfg);
    drawHeatmap(frame);
  }, [frame]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "dynamic-frame.png"; a.click();
  };

  const drawHeatmap = (frame: number[][]) => {
    const canvas = canvasRef.current;
    if (!canvas || frame.length === 0) return;
    const scanlines = frame.length;
    const samplesLocal = frame[0].length;

    // Fixed display size (CSS pixels)
    const displayW = 700;
    const displayH = 300;
    const pixelRatioBase = Math.max(1, Math.min(4, Math.round(window.devicePixelRatio || 1)));
    const RENDER_SCALE = 1; // render at 2x for crisper output
    const pixelRatio = pixelRatioBase * RENDER_SCALE;
    const iw = displayW * pixelRatio;
    const ih = displayH * pixelRatio;

    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(iw, ih);

    // find min/max over frame for normalization
    let minV = Infinity, maxV = -Infinity;
    for (let L = 0; L < scanlines; L++) for (let s = 0; s < samplesLocal; s++) { const v = frame[L][s]; if (v < minV) minV = v; if (v > maxV) maxV = v; }
    const range = maxV - minV || 1;

    let ptr = 0;
    // sample the frame for each internal pixel using bilinear interpolation
    for (let y = 0; y < ih; y++) {
      const sampleIdx = (y / (ih - 1)) * (samplesLocal - 1);
      for (let x = 0; x < iw; x++) {
        const scanIdx = (x / (iw - 1)) * (scanlines - 1);
        const v = sampleFrameBilinear(frame, scanIdx, sampleIdx);
        const norm = (v - minV) / range;
        const c = valueToTurbo(norm);
        img.data[ptr++] = c[0]; img.data[ptr++] = c[1]; img.data[ptr++] = c[2]; img.data[ptr++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // draw basic stats along left side if config is available
    if (cfg) {
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.font = `${12 * pixelRatio}px monospace`;
      let ly = 12 * pixelRatio;
      const lx = 8 * pixelRatio;
      ctx.fillText(`type: ${cfg.scanning?.type ?? 'n/a'}`, lx, ly);
      ly += 16 * pixelRatio;
      if ((cfg.scanning as any)?.range) ctx.fillText(`range: ${(cfg.scanning as any).range[0]}° → ${(cfg.scanning as any).range[1]}°`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`dt: ${cfg.timeStep ?? 'n/a'}`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`samples: ${samplesLocal}`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`scanlines: ${scanlines}`, lx, ly);
    }
  };

  function drawPolar(frame: number[][], cfg: DynamicBeamformingConfig) {
    const canvas = canvasRef.current;
    if (!canvas || frame.length === 0) return;
    const displayW = 700; const displayH = 300;
    const scanlines = frame.length; const samplesLocal = frame[0].length;

    // Fixed internal resolution based on devicePixelRatio (not on samples count)
    const pixelRatioBase = Math.max(1, Math.min(4, Math.round(window.devicePixelRatio || 1)));
    const RENDER_SCALE = 2;
    const pixelRatio = pixelRatioBase * RENDER_SCALE;
    const iw = displayW * pixelRatio; const ih = displayH * pixelRatio;
    canvas.width = iw; canvas.height = ih;
    canvas.style.width = displayW + 'px'; canvas.style.height = displayH + 'px';
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const img = ctx.createImageData(iw, ih);
    const cx = iw/2; const cy = Math.max(4 * pixelRatio, Math.round(ih * 0.08));
    const R = Math.min(cx, ih - cy) * 0.92;
    const maxDepth = samplesLocal * (cfg?.timeStep || 1) * (cfg?.propagationSpeed || 1) / 2;
    let maxV = 0; for (let L=0; L<scanlines; L++) for (let s=0; s<samplesLocal; s++){ const v=Math.abs(frame[L][s]); if (v>maxV) maxV=v; }
    const minDb = -60; let ptr = 0; const [minAng, maxAng] = cfg?.scanning.range || [0,0];

    for (let j=0;j<ih;j++){
      for (let i=0;i<iw;i++){
        const dx = i - cx; const dy = j - cy; if (dy < 0) { img.data[ptr++]=8; img.data[ptr++]=8; img.data[ptr++]=8; img.data[ptr++]=255; continue; }
        const rPix = Math.sqrt(dx*dx + dy*dy);
        if (rPix > R){ img.data[ptr++]=8; img.data[ptr++]=8; img.data[ptr++]=8; img.data[ptr++]=255; continue; }
        const angleRad = Math.atan2(dx, dy); const angleDeg = angleRad*180/Math.PI;
        if (angleDeg < Math.min(minAng,maxAng) || angleDeg > Math.max(minAng,maxAng)){ img.data[ptr++]=6; img.data[ptr++]=6; img.data[ptr++]=6; img.data[ptr++]=255; continue; }
        const fracR = rPix / R; const depth = fracR * maxDepth; const sampleIdx = depth / ((cfg?.timeStep || 1) * (cfg?.propagationSpeed || 1) / 2);
        const t = (angleDeg - minAng) / (maxAng - minAng); const scanIdx = t * (scanlines - 1);
        const val = sampleFrameBilinear(frame, scanIdx, sampleIdx);
        const absVal = Math.abs(val);
        const db = maxV > 0 ? 20 * Math.log10(absVal / maxV) : minDb;
        const dbClamped = Math.max(minDb, db);
        const norm = (dbClamped - minDb) / (-minDb);
        const ccol = valueToTurbo(norm);
        img.data[ptr++]=ccol[0]; img.data[ptr++]=ccol[1]; img.data[ptr++]=ccol[2]; img.data[ptr++]=255;
      }
    }
    ctx.putImageData(img,0,0);

    // draw outlines and labels scaled so they appear consistent at CSS size
    ctx.strokeStyle = "white"; ctx.lineWidth = 1.5 * pixelRatio; ctx.beginPath();
    const startRad = (minAng * Math.PI) / 180; const endRad = (maxAng * Math.PI) / 180;
    const steps = 120; const pts: {x:number;y:number}[] = [];
    for (let k = 0; k <= steps; k++){
      const a = startRad + (endRad - startRad) * (k / steps);
      const px = cx + R * Math.sin(a);
      const py = cy + R * Math.cos(a);
      pts.push({x: px, y: py});
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    if (pts.length >= 2) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(cx, cy); ctx.moveTo(pts[pts.length-1].x, pts[pts.length-1].y); ctx.lineTo(cx, cy); ctx.stroke();
    }
    const midA = startRad + (endRad - startRad) * 3/4;
    // show distance in centimeters, move slightly right so it doesn't overlap the arc
    const distText = `${Math.round(maxDepth * 100).toString().padStart(3, ' ')} cm`;
    const labelX = cx + R * Math.sin(midA) * 1.08 + (18 * pixelRatio);
    const labelY = cy + R * Math.cos(midA) * 0.98 + (18 * pixelRatio);
    ctx.textAlign = "right"; ctx.font = `${12 * pixelRatio}px sans-serif`; ctx.fillStyle = "white"; ctx.fillText(distText, labelX, labelY);

    const barW = Math.round(iw * 0.04); const barH = Math.round(R * 0.9);
    const barX = Math.min(Math.round(cx + R + (8 * pixelRatio)), iw - barW - (60 * pixelRatio)); const barY = Math.round(cy + R * 0.05);
    const barImg = ctx.createImageData(barW, barH);
    for (let by = 0; by < barH; by++){
      const frac = 1 - by / (barH - 1);
      const dbVal = minDb + frac * (-minDb);
      const norm = (dbVal - minDb) / (-minDb);
      const col = valueToTurbo(norm);
      for (let bx = 0; bx < barW; bx++){
        const idx = (by * barW + bx) * 4;
        barImg.data[idx] = col[0]; barImg.data[idx+1] = col[1]; barImg.data[idx+2] = col[2]; barImg.data[idx+3] = 255;
      }
    }
    ctx.putImageData(barImg, barX, barY);
    // draw border around dB color bar
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1 * pixelRatio;
    ctx.strokeRect(barX - 0.5 * pixelRatio, barY - 0.5 * pixelRatio, barW + 1 * pixelRatio, barH + 1 * pixelRatio);
    ctx.fillStyle = "white"; ctx.textAlign = "left"; ctx.font = `${11 * pixelRatio}px monospace`;
    const ticks = [0, -20, -40, -60];
    for (const tdb of ticks){
      const frac = 1 - (tdb - minDb) / (-minDb);
      const y = barY + Math.round(frac * (barH-1));
      ctx.strokeStyle = "white"; ctx.beginPath(); ctx.moveTo(barX - (6 * pixelRatio), y); ctx.lineTo(barX, y); ctx.stroke();
      const labelX = Math.min(iw - (8 * pixelRatio), barX + barW + (12 * pixelRatio));
      ctx.fillText(`${tdb} dB`, labelX, y + (4 * pixelRatio));
    }

    // draw basic stats along left side if config is available
    if (cfg) {
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.font = `${12 * pixelRatio}px monospace`;
      let ly = 12 * pixelRatio;
      const lx = 8 * pixelRatio;
      ctx.fillText(`type: ${cfg.scanning?.type ?? 'n/a'}`, lx, ly);
      ly += 16 * pixelRatio;
      if ((cfg.scanning as any)?.range) ctx.fillText(`range: ${(cfg.scanning as any).range[0]}° → ${(cfg.scanning as any).range[1]}°`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`dt: ${cfg.timeStep ?? 'n/a'}`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`samples: ${samplesLocal}`, lx, ly);
      ly += 16 * pixelRatio;
      ctx.fillText(`scanlines: ${scanlines}`, lx, ly);
    }
  }

  function sampleFrameBilinear(frame: number[][], scanIdx: number, sampleIdx: number): number { const L0=Math.floor(scanIdx), L1=L0+1, s0=Math.floor(sampleIdx), s1=s0+1; const a=scanIdx-L0, b=sampleIdx-s0; const v00=getFrameVal(frame,L0,s0), v10=getFrameVal(frame,L1,s0), v01=getFrameVal(frame,L0,s1), v11=getFrameVal(frame,L1,s1); const v0=v00*(1-a)+v10*a; const v1=v01*(1-a)+v11*a; return v0*(1-b)+v1*b; }

  function getFrameVal(frame: number[][], L:number, s:number): number { if (L<0 || L>=frame.length) return 0; if (s<0 || s>=frame[0].length) return 0; return frame[L][s]; }

  const valueToTurbo = (t: number): [number, number, number] => {
    const r = Math.round(255 * Math.min(1, Math.max(0, 1.25 * t - 0.25)));
    const g = Math.round(255 * Math.min(1, Math.max(0, 1.25 * (1 - Math.abs(t - 0.5) * 2))))
    const b = Math.round(255 * Math.min(1, Math.max(0, 1.25 * (1 - t) - 0.25)));
    return [r, g, b];
  };

  return (
    <div className="inline-block m-2 rounded shadow-md overflow-hidden" style={{ background: 'black' }}>
      <div className="relative">
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated", display: 'block' }} />
        <div className="absolute right-2 top-2 opacity-0 hover:opacity-100 transition-opacity">
          <Button variant="outline" onClick={download}>Download PNG</Button>
        </div>
      </div>
    </div>
  );
}


