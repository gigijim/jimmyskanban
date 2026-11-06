/*
 * 版本資訊與手動更新。
 *
 * PWA（安裝版 / 網址版）：Service Worker 只在使用者按「立即更新」時才下載新版檔案，
 *   不會自己在背景換版本。新版第一次啟動時，StorageService 會自動升級資料格式（升級前存快照）。
 * 單一 HTML 檔版：無法自我更新，只能檢查是否有新版並提供下載連結。
 */
import { SCHEMA_VERSION } from "PersonalKanban/services/schemaVersion";

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;
declare const __SINGLE_FILE__: boolean;

export const APP_VERSION: string = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
export const BUILD_ID: string = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
export const IS_SINGLE_FILE: boolean = typeof __SINGLE_FILE__ !== "undefined" ? __SINGLE_FILE__ : false;

/** 官方發佈位置（單檔版用來檢查新版；PWA 版用自己所在的網址） */
export const RELEASE_URL = "https://gigijim.github.io/jimmyskanban/";

export type ReleaseInfo = {
  version: string;
  build: string;
  schemaVersion: number;
  builtAt?: string;
};

export type UpdateCheck = {
  current: ReleaseInfo;
  latest: ReleaseInfo;
  hasUpdate: boolean;
};

export const CURRENT: ReleaseInfo = { version: APP_VERSION, build: BUILD_ID, schemaVersion: SCHEMA_VERSION };

const manifestUrl = () =>
  IS_SINGLE_FILE || !/^https?:$/.test(location.protocol)
    ? `${RELEASE_URL}asset-manifest.json`
    : new URL("asset-manifest.json", location.href).toString();

/** 能否在這個環境就地更新（有 Service Worker 控制頁面） */
export const canSelfUpdate = () =>
  !IS_SINGLE_FILE && "serviceWorker" in navigator && Boolean(navigator.serviceWorker.controller);

/** 檢查最新版本（只讀一個小 JSON，不下載任何程式檔） */
export async function checkForUpdate(): Promise<UpdateCheck> {
  const res = await fetch(`${manifestUrl()}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const m = await res.json();
  const latest: ReleaseInfo = { version: m.version, build: m.build, schemaVersion: m.schemaVersion, builtAt: m.builtAt };
  return { current: CURRENT, latest, hasUpdate: Boolean(latest.build) && latest.build !== BUILD_ID };
}

/** 請 Service Worker 下載並切換到最新版；成功後由呼叫端重新載入頁面 */
export function applyUpdate(): Promise<ReleaseInfo> {
  return new Promise((resolve, reject) => {
    const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!sw) return reject(new Error("no service worker"));
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error("timeout")), 120000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      if (e.data && e.data.ok) resolve(e.data.release);
      else reject(new Error((e.data && e.data.error) || "update failed"));
    };
    sw.postMessage({ type: "APPLY_UPDATE" }, [channel.port2]);
  });
}
