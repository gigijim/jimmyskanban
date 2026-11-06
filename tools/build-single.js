#!/usr/bin/env node
// 產生「單一 HTML 檔」離線版：dist/jimmyskanban-offline.html
// 把 CSS / JS / 圖示全部內嵌，可直接用 Email、隨身碟、網路磁碟傳遞，雙擊即可在 Edge/Chrome 開啟。
// 用法：node tools/build-single.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('找不到 index.html'); process.exit(1);
}
let html = read('index.html');

// 單檔版（file://）不使用 manifest / service worker / CSP meta（內嵌 script 需要）
html = html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/i, '');
html = html.replace(/\s*<link rel="manifest"[^>]*>/i, '');
html = html.replace(/\s*<script src="sw-register\.js"><\/script>/i, '');

const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons/icon-192.png')).toString('base64');
html = html.replace(/(href|src)="icons\/icon-192\.png"/g, `$1="${icon}"`);

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  `<style>\n${read(href)}\n</style>`);
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);

const leftovers = html.match(/(src|href)="(?!data:)(?!#)[^"]+"/g);
if (leftovers) { console.error('仍有外部參照：', leftovers); process.exit(1); }

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'jimmyskanban-offline.html');
fs.writeFileSync(out, html);
console.log(`wrote dist/jimmyskanban-offline.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
