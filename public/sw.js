/*
 * JimmysKanban Service Worker — 離線運作 + 「手動」更新
 *
 * 這個檔案在各版本之間保持不變，所以瀏覽器不會在背景自動換版本。
 * 程式檔清單放在 asset-manifest.json（每次建置產生）：
 *   - 第一次安裝：下載目前的清單並全部快取
 *   - 之後一律從快取提供（完全離線可用）
 *   - 使用者按「立即更新」時（APPLY_UPDATE 訊息），才下載新清單、切換到新版本
 * 只有這個檔案本身的邏輯需要修改時，才改 SW_VERSION（極少發生）。
 */
const SW_VERSION = 1;
const PREFIX = "jimmyskanban-";
const META_CACHE = PREFIX + "meta";
const MANIFEST = "asset-manifest.json";

let current = null; // { build, version, schemaVersion, cache }

async function getCurrent() {
  if (current) return current;
  const meta = await caches.open(META_CACHE);
  const res = await meta.match("current");
  current = res ? await res.json() : null;
  return current;
}

async function setCurrent(value) {
  const meta = await caches.open(META_CACHE);
  await meta.put("current", new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }));
  current = value;
}

async function cleanup() {
  const cur = await getCurrent();
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((k) => k.startsWith(PREFIX) && k !== META_CACHE && (!cur || k !== cur.cache))
      .map((k) => caches.delete(k))
  );
}

/** 下載最新版的全部檔案到新的快取（失敗時不影響目前版本） */
async function download() {
  const res = await fetch(MANIFEST + "?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("manifest HTTP " + res.status);
  const m = await res.json();
  const name = PREFIX + m.build;
  const cache = await caches.open(name);
  try {
    await cache.addAll(m.files.map((f) => new Request(f, { cache: "reload" })));
  } catch (e) {
    await caches.delete(name);
    throw e;
  }
  return { build: m.build, version: m.version, schemaVersion: m.schemaVersion, cache: name };
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      if (!(await getCurrent())) await setCurrent(await download());
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(cleanup().then(() => self.clients.claim()));
});

self.addEventListener("message", (e) => {
  const port = e.ports && e.ports[0];
  if (!port) return;
  if (e.data && e.data.type === "APPLY_UPDATE") {
    download()
      .then(async (release) => {
        await setCurrent(release);
        await cleanup();
        port.postMessage({ ok: true, release });
      })
      .catch((err) => port.postMessage({ ok: false, error: String(err && err.message ? err.message : err) }));
  } else if (e.data && e.data.type === "GET_VERSION") {
    getCurrent().then((cur) => port.postMessage({ ok: true, release: cur, swVersion: SW_VERSION }));
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // 版本清單永遠走網路（離線時由頁面顯示「無法連線」）
  if (url.pathname.endsWith("/" + MANIFEST)) return;
  e.respondWith(
    (async () => {
      const cur = await getCurrent();
      if (cur) {
        const cache = await caches.open(cur.cache);
        // ignoreVary：伺服器常回 Vary: Origin / Accept-Encoding，不忽略會讓離線時找不到快取
        const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
        if (hit) return hit;
        if (req.mode === "navigate") {
          const index = await cache.match("index.html", { ignoreVary: true });
          if (index) return index;
        }
      }
      return fetch(req);
    })()
  );
});
