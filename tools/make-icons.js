#!/usr/bin/env node
// 產生 App 圖示（只用 Node 內建 zlib/fs，無任何相依套件）
// 用法：node tools/make-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
}

// 形狀以 0..1 的座標定義，使用 4x4 超取樣做反鋸齒
function roundRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || y < ry || x > rx + rw || y > ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
const BLUE = [37, 99, 235], WHITE = [255, 255, 255], RED = [220, 38, 38];

function shapeAt(x, y, maskable) {
  // 背景
  const bg = maskable ? true : roundRect(x, y, 0, 0, 1, 1, 0.22);
  if (!bg) return null;
  // 內容區（maskable：中央 60% 安全區）
  const pad = maskable ? 0.2 : 0.16;
  const size = 1 - pad * 2;
  const u = (x - pad) / size, v = (y - pad) / size;
  // 紅色印章圓點（第三欄右下）
  if ((u - 0.86) ** 2 + (v - 0.80) ** 2 <= 0.13 ** 2) return RED;
  const barW = 0.24, gap = 0.14, heights = [0.70, 0.45, 0.58];
  for (let i = 0; i < 3; i++) {
    const bx = i * (barW + gap);
    if (roundRect(u, v, bx, 0.08, barW, heights[i], 0.06)) return WHITE;
  }
  return BLUE;
}

function render(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const S = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const c = shapeAt((px + (sx + 0.5) / S) / size, (py + (sy + 0.5) / S) / size, maskable);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const i = (py * size + px) * 4;
      if (a) { buf[i] = r / a; buf[i + 1] = g / a; buf[i + 2] = b / a; buf[i + 3] = (a / (S * S)) * 255; }
    }
  }
  return encodePNG(size, size, buf);
}

const outputs = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true]
];
for (const [name, size, maskable] of outputs) {
  fs.writeFileSync(path.join(OUT, name), render(size, maskable));
  console.log('wrote icons/' + name);
}

// SVG 版（同設計）
const pad = 0.16 * 512, cs = 512 - pad * 2, bw = 0.24 * cs, gp = 0.14 * cs;
const bars = [0.70, 0.45, 0.58].map((hh, i) =>
  `<rect x="${(pad + i * (bw + gp)).toFixed(1)}" y="${(pad + 0.08 * cs).toFixed(1)}" width="${bw.toFixed(1)}" height="${(hh * cs).toFixed(1)}" rx="${(0.06 * cs).toFixed(1)}" fill="#fff"/>`
).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${0.22 * 512}" fill="#2563eb"/>${bars}<circle cx="${(pad + 0.86 * cs).toFixed(1)}" cy="${(pad + 0.80 * cs).toFixed(1)}" r="${(0.13 * cs).toFixed(1)}" fill="#dc2626"/></svg>\n`;
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);
console.log('wrote icons/icon.svg');
