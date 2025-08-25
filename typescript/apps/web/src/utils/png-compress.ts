import pako from 'pako';

// Minimal PNG encoder that accepts RGBA Uint8Array pixel data and returns a
// compressed PNG Uint8Array. It does not perform resizing or colorspace
// conversions. It will write a truecolor (RGBA) PNG with 8-bit channels.
// Uses pako to create the zlib-compressed IDAT chunk so it works in-browser.

function writeUint32BE(arr: number[], v: number) {
  arr.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
}

function crc32(buf: Uint8Array) {
  let table: number[] | null = (crc32 as any)._table || null;
  if (!table) {
    table = new Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as any)._table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function encodePNG(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error('Invalid pixel buffer length');

  const chunks: number[] = [];
  // PNG signature
  const sig = [137,80,78,71,13,10,26,10];
  const outBytes: number[] = [...sig];

  // IHDR
  const ihdrData: number[] = [];
  writeUint32BE(ihdrData, width);
  writeUint32BE(ihdrData, height);
  ihdrData.push(8); // bit depth
  ihdrData.push(6); // color type = RGBA
  ihdrData.push(0); // compression
  ihdrData.push(0); // filter
  ihdrData.push(0); // interlace
  writeUint32BE(outBytes, ihdrData.length);
  outBytes.push(...ihdrData);
  const ihdrCrc = crc32(new Uint8Array([].concat(...[['I'.charCodeAt(0)], ['H'.charCodeAt(0)], ['D'.charCodeAt(0)], ['R'.charCodeAt(0)]] as any)));
  // above silly concat is wrong for CRC: we'll compute CRC properly below

  // Helper to append chunk properly
  function appendChunk(typeStr: string, dataArr: number[]) {
    writeUint32BE(outBytes, dataArr.length);
    for (let i = 0; i < 4; i++) outBytes.push(typeStr.charCodeAt(i));
    outBytes.push(...dataArr);
    const typeAndData = new Uint8Array(4 + dataArr.length);
    for (let i = 0; i < 4; i++) typeAndData[i] = typeStr.charCodeAt(i);
    for (let i = 0; i < dataArr.length; i++) typeAndData[4 + i] = dataArr[i];
    const crc = crc32(typeAndData);
    writeUint32BE(outBytes, crc);
  }

  // Replace IHDR append using helper
  outBytes.length = sig.length; // reset to just signature
  appendChunk('IHDR', ihdrData);

  // IDAT: create raw image data with filter byte per scanline (0 = none)
  const raw: number[] = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter type 0
    const rowStart = y * width * 4;
    for (let x = 0; x < width * 4; x++) raw.push(rgba[rowStart + x]);
  }
  const rawBuf = new Uint8Array(raw);
  const compressed = pako.deflate(rawBuf, { level: 6 });
  appendChunk('IDAT', Array.from(compressed));

  // IEND
  appendChunk('IEND', []);

  return new Uint8Array(outBytes);
}

export async function canvasToCompressedPNG(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  // Ensure we don't downscale: get actual canvas width/height
  const w = canvas.width; const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  const imgData = ctx.getImageData(0, 0, w, h);
  return encodePNG(w, h, imgData.data as unknown as Uint8Array);
}


