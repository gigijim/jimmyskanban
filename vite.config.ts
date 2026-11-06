import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { SCHEMA_VERSION } from "./src/PersonalKanban/services/schemaVersion";

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8"));

/** 建置編號：git commit（CI 用 GITHUB_SHA），PWA 版與單檔版相同，用來判斷有沒有新版 */
const buildId = (() => {
  if (process.env.JK_BUILD_ID) return process.env.JK_BUILD_ID; // 測試用
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    const sha = execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return dirty ? `${sha}-dev` : sha;
  } catch (e) {
    return `local-${Date.now().toString(36)}`;
  }
})();

/**
 * 產生 asset-manifest.json：版本資訊 + 要離線快取的檔案清單。
 * public/sw.js（固定不變）在使用者按「立即更新」時才讀取它並下載新版。
 */
function assetManifest(): Plugin {
  const publicFiles = ["./", "index.html", "manifest.json", "favicon.ico", "logo192.png", "logo512.png", "logo.svg"];
  return {
    name: "jimmyskanban-asset-manifest",
    apply: "build",
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((f) => f !== "index.html");
      const manifest = {
        app: "JimmysKanban",
        version: pkg.version,
        build: buildId,
        schemaVersion: SCHEMA_VERSION,
        builtAt: new Date().toISOString(),
        files: [...publicFiles, ...assets],
      };
      this.emitFile({ type: "asset", fileName: "asset-manifest.json", source: JSON.stringify(manifest, null, 2) });
    },
  };
}

// 一般模式：dist/        → GitHub Pages / 內網（PWA，可「安裝」）
// single 模式：dist-single/ → 單一 HTML 檔，雙擊即用
export default defineConfig(({ mode }) => {
  const single = mode === "single";
  return {
    base: "./",
    plugins: [react(), ...(single ? [viteSingleFile()] : [assetManifest()])],
    resolve: {
      alias: { PersonalKanban: path.resolve(__dirname, "src/PersonalKanban") },
    },
    define: {
      __SINGLE_FILE__: JSON.stringify(single),
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_ID__: JSON.stringify(buildId),
    },
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
