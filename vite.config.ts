import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { createHash } from "crypto";
import path from "path";

/**
 * 產生 Service Worker：預先快取所有建置出的檔案，第一次開啟後即可完全離線。
 * 快取版本由檔案清單雜湊而來，每次建置內容改變就自動換版。
 */
function serviceWorker(): Plugin {
  const publicFiles = ["./", "index.html", "manifest.json", "favicon.ico", "logo192.png", "logo512.png", "logo.svg"];
  return {
    name: "jimmyskanban-sw",
    apply: "build",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => f !== "index.html");
      const files = [...publicFiles, ...assets];
      const version = createHash("sha256").update(files.join("|")).digest("hex").slice(0, 12);
      const source = `// 由 vite.config.ts 自動產生，請勿手動修改
const CACHE = "jimmyskanban-${version}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("jimmyskanban-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // ignoreVary：伺服器常回 Vary: Origin / Accept-Encoding，不忽略會讓離線時找不到快取
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) =>
      hit ||
      fetch(req).catch(() => (req.mode === "navigate" ? caches.match("index.html") : undefined))
    )
  );
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

// 一般模式：dist/        → GitHub Pages / 內網（PWA，可「安裝」）
// single 模式：dist-single/ → 單一 HTML 檔，雙擊即用
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    plugins: [react(), ...(single ? [viteSingleFile()] : [serviceWorker()])],
    resolve: {
      alias: { PersonalKanban: path.resolve(__dirname, "src/PersonalKanban") },
    },
    define: { __SINGLE_FILE__: JSON.stringify(single) },
    publicDir: single ? false : "public",
    build: {
      outDir: single ? "dist-single" : "dist",
      emptyOutDir: true,
      assetsInlineLimit: single ? 100000000 : 4096,
      chunkSizeWarningLimit: 2000,
    },
    test: { environment: "node" },
  } as any;
});
