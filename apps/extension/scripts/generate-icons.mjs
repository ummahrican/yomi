// Generates Yomi's extension/store icons as real PNGs with ZERO dependencies
// (pure Node + zlib), so it runs anywhere — locally, in CI, on a fresh clone —
// without ImageMagick, sharp, or a browser. Re-run with: `pnpm icons`.
//
// Mark: a rounded indigo tile with a white "feed" glyph (three bulleted bars),
// rendered at 4x supersampling and box-downsampled for clean anti-aliasing.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icon");
const SIZES = [16, 32, 48, 128, 512];
const SS = 4; // supersampling factor

// Brand palette — Tailwind emerald-500 (#10b981), matching the extension UI.
const BG = [16, 185, 129];
const FG = [255, 255, 255];

// --- geometry helpers (normalized 0..1 space) ---
function inRoundedRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  if (x >= r && x <= 1 - r) return y >= 0 && y <= 1;
  if (y >= r && y <= 1 - r) return x >= 0 && x <= 1;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function inCapsule(x, y, x0, x1, yc, rad) {
  if (x < x0) return (x - x0) ** 2 + (y - yc) ** 2 <= rad * rad;
  if (x > x1) return (x - x1) ** 2 + (y - yc) ** 2 <= rad * rad;
  return Math.abs(y - yc) <= rad;
}
function inDot(x, y, cx, cy, rad) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
}

// Three bulleted bars, centered vertically.
const BARS = [
  { y: 0.30, x1: 0.78 },
  { y: 0.50, x1: 0.78 },
  { y: 0.70, x1: 0.60 },
];
const BAR_H = 0.075; // half-height (radius) of each bar
const BAR_X0 = 0.34;
const DOT_X = 0.24;
const DOT_R = 0.075;

function isForeground(x, y) {
  for (const b of BARS) {
    if (inDot(x, y, DOT_X, b.y, DOT_R)) return true;
    if (inCapsule(x, y, BAR_X0, b.x1, b.y, BAR_H)) return true;
  }
  return false;
}

function sampleColor(nx, ny) {
  if (isForeground(nx, ny)) return [FG[0], FG[1], FG[2], 255];
  if (inRoundedRect(nx, ny, 0.22)) return [BG[0], BG[1], BG[2], 255];
  return [0, 0, 0, 0];
}

function renderRGBA(size) {
  const S = size * SS;
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Premultiplied-alpha average over the SSxSS subpixel block.
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (px * SS + sx + 0.5) / S;
          const ny = (py * SS + sy + 0.5) / S;
          const [cr, cg, cb, ca] = sampleColor(nx, ny);
          const af = ca / 255;
          r += cr * af; g += cg * af; b += cb * af; a += ca;
        }
      }
      const n = SS * SS;
      const aAvg = a / n;
      const i = (py * size + px) * 4;
      if (aAvg <= 0) {
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      } else {
        const wsum = a / 255; // sum of alpha fractions
        out[i] = Math.round(r / wsum);
        out[i + 1] = Math.round(g / wsum);
        out[i + 2] = Math.round(b / wsum);
        out[i + 3] = Math.round(aAvg);
      }
    }
  }
  return out;
}

// --- minimal PNG encoder (RGBA, no deps) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  // Each scanline gets a leading filter byte (0 = none).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const png = encodePng(size, renderRGBA(size));
  writeFileSync(join(OUT_DIR, `${size}.png`), png);
  console.log(`wrote icon/${size}.png (${png.length} bytes)`);
}
console.log(`done -> ${OUT_DIR}`);
