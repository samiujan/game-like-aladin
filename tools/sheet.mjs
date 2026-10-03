// Dev tool: render all sprite pixel-maps to a PNG contact sheet.
// Run: node tools/sheet.mjs [out.png]
// Shims `document` with a minimal Canvas2D implementation so sprites.js
// runs unmodified in node, then encodes the sheet as PNG (zlib + CRC32).

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- tiny Canvas2D shim (RGBA buffer) ----
class Ctx2D {
  constructor(cv) { this.cv = cv; this._fill = [0, 0, 0, 255]; }
  set fillStyle(v) { this._fill = parseColor(v); }
  get fillStyle() { return this._fill; }
  fillRect(x, y, w, h) {
    const { width: W, height: H, data } = this.cv;
    const [r, g, b, a] = this._fill;
    const sa = a / 255;
    for (let yy = Math.max(0, y | 0); yy < Math.min(H, (y + h) | 0); yy++) {
      for (let xx = Math.max(0, x | 0); xx < Math.min(W, (x + w) | 0); xx++) {
        const i = (yy * W + xx) * 4;
        data[i] = r * sa + data[i] * (1 - sa);
        data[i + 1] = g * sa + data[i + 1] * (1 - sa);
        data[i + 2] = b * sa + data[i + 2] * (1 - sa);
        data[i + 3] = Math.max(data[i + 3], a);
      }
    }
  }
  clearRect() {}
  save() {} restore() {}
  translate() {} scale() {} rotate() {}
  beginPath() {} arc() {} fill() {} stroke() {} moveTo() {} lineTo() {}
  get globalAlpha() { return 1; }
  set globalAlpha(v) {}
  get globalCompositeOperation() { return 'source-over'; }
  set globalCompositeOperation(v) {}
  drawImage(img, dx, dy) {
    const W = this.cv.width, H = this.cv.height;
    const sw = img.width, sh = img.height;
    const sctx = img.getContext('2d'); // ensure data allocated
    const src = img.data;
    for (let y = 0; y < sh; y++) {
      const ty = (dy | 0) + y;
      if (ty < 0 || ty >= H) continue;
      for (let x = 0; x < sw; x++) {
        const tx = (dx | 0) + x;
        if (tx < 0 || tx >= W) continue;
        const si = (y * sw + x) * 4;
        const sa = src[si + 3];
        if (!sa) continue;
        const di = (ty * W + tx) * 4;
        const a = sa / 255;
        this.cv.data[di] = src[si] * a + this.cv.data[di] * (1 - a);
        this.cv.data[di + 1] = src[si + 1] * a + this.cv.data[di + 1] * (1 - a);
        this.cv.data[di + 2] = src[si + 2] * a + this.cv.data[di + 2] * (1 - a);
        this.cv.data[di + 3] = Math.max(this.cv.data[di + 3], sa);
      }
    }
  }
}

class ShimCanvas {
  constructor() { this.width = 0; this.height = 0; this._ctx = null; this.data = null; }
  getContext() {
    if (!this._ctx) {
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      this._ctx = new Ctx2D(this);
    }
    return this._ctx;
  }
}

function parseColor(str) {
  if (typeof str === 'string' && str.startsWith('#')) {
    const h = str.slice(1);
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 255];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
  }
  return [0, 0, 0, 255];
}

// ---- PNG encode ----
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
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG(cv) {
  const { width, height, data } = cv;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- shim document BEFORE importing sprites.js ----
globalThis.document = { createElement: () => new ShimCanvas() };
const SPR = await import(path.join(here, '..', 'js', 'sprites.js'));

// ---- layout the contact sheet ----
const groups = [
  ['HERO.idle', SPR.HERO.idle], ['HERO.run', SPR.HERO.run], ['HERO.jump', SPR.HERO.jump],
  ['HERO.fall', SPR.HERO.fall], ['HERO.crouch', SPR.HERO.crouch], ['HERO.slash1', SPR.HERO.slash1],
  ['HERO.slash2', SPR.HERO.slash2], ['HERO.slash3', SPR.HERO.slash3], ['HERO.throw', SPR.HERO.throw],
  ['HERO.hurt', SPR.HERO.hurt], ['HERO.dead', SPR.HERO.dead], ['HERO.climb', SPR.HERO.climb],
  ['BANDIT.walk', SPR.BANDIT.walk], ['BANDIT.windup', SPR.BANDIT.windup], ['BANDIT.slash', SPR.BANDIT.slash], ['BANDIT.guard', SPR.BANDIT.guard],
  ['THROWER.walk', SPR.THROWER.walk], ['THROWER.windup', SPR.THROWER.windup], ['THROWER.thrown', SPR.THROWER.thrown],
  ['CHARGER.walk', SPR.CHARGER.walk], ['CHARGER.telegraph', SPR.CHARGER.telegraph], ['CHARGER.charge', SPR.CHARGER.charge],
  ['BRUTE.walk', SPR.BRUTE.walk], ['BRUTE.windup', SPR.BRUTE.windup], ['BRUTE.slam', SPR.BRUTE.slam],
  ['BOSS.idle', SPR.BOSS.idle], ['BOSS.walk', SPR.BOSS.walk], ['BOSS.windup', SPR.BOSS.windup],
  ['BOSS.lunge', SPR.BOSS.lunge], ['BOSS.slamA', SPR.BOSS.slamA], ['BOSS.slamB', SPR.BOSS.slamB],
  ['BOSS.volley', SPR.BOSS.volley], ['BOSS.stagger', SPR.BOSS.stagger],
  ['props.coin', SPR.PROPS.coin], ['props.apricot', SPR.PROPS.apricot], ['props.knifePickup', SPR.PROPS.knifePickup],
  ['props.chest', SPR.PROPS.chest], ['props.chestOpen', SPR.PROPS.chestOpen], ['props.pot', SPR.PROPS.pot],
  ['props.checkpoint', SPR.PROPS.checkpoint], ['props.heart', SPR.PROPS.heart], ['props.heartEmpty', SPR.PROPS.heartEmpty],
  ['FX.knife', SPR.FX.knife],
];

const SCALE = 2, PAD = 6;
let maxW = 0, totalH = PAD;
const rows = [];
for (const [name, frames] of groups) {
  const rowW = frames.reduce((a, f) => a + f.width * SCALE + PAD, PAD);
  const rowH = Math.max(...frames.map(f => f.height)) * SCALE;
  rows.push({ name, frames, rowW, rowH });
  maxW = Math.max(maxW, rowW);
  totalH += rowH + PAD * 2;
}
const sheetW = Math.ceil(maxW) + PAD, sheetH = totalH;

const cv = new ShimCanvas();
cv.width = sheetW; cv.height = sheetH;
cv.getContext('2d');
ctx_fill(cv, 0, 0, sheetW, sheetH, '#40284a');

let y = PAD;
for (const { name, frames, rowH } of rows) {
  let x = PAD;
  for (const f of frames) {
    for (let sy = 0; sy < f.height; sy++) {
      for (let sx = 0; sx < f.width; sx++) {
        const si = (sy * f.width + sx) * 4;
        if (!f.data[si + 3]) continue;
        ctx_fill(cv, x + sx * SCALE, y + sy * SCALE, SCALE, SCALE,
          `rgb(${f.data[si]},${f.data[si + 1]},${f.data[si + 2]})`);
      }
    }
    x += f.width * SCALE + PAD;
  }
  y += rowH + PAD * 2;
}

const outPath = process.argv[2] || '/tmp/sheet.png';
fs.writeFileSync(outPath, encodePNG(cv));
console.log(`wrote ${outPath} (${sheetW}x${sheetH})`);
for (const { name, frames } of rows) console.log(`  ${name.padEnd(20)} ${frames.map(f => f.width + 'x' + f.height).join(', ')}`);

function ctx_fill(cv, x, y, w, h, color) {
  const ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
