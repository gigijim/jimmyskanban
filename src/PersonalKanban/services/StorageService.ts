import { Column } from "PersonalKanban/types";
import { readBackup, SCHEMA_VERSION } from "PersonalKanban/services/Schema";
import type { ActivityLog } from "PersonalKanban/services/Activity";

/*
 * 本機資料庫（單純化設計）
 * IndexedDB 只有一個 object store「kv」：
 *   kv["columns"]   = 整個看板（與原版相同的 Column[] 結構）
 *   kv["snapshots"] = 自動快照（最多 MAX_SNAPSHOTS 份）
 *   kv["activity"]  = 活動紀錄 { since, days: { "YYYY-MM-DD": 次數 } }（只存在本機，不進備份）
 * 啟動時先載入到記憶體，之後讀取為同步（維持原版 API），寫入為防抖非同步。
 * IndexedDB 不可用時退回 localStorage。
 */

const DARK_MODE = "dark_mode";
const COLUMNS = "columns";
const SNAPSHOTS = "snapshots";
const ACTIVITY = "activity";
const META = "meta";
const LAST_BACKUP = "last_backup";
const DB_NAME = "jimmyskanban";
const STORE = "kv";
const LS_PREFIX = "jimmyskanban:";
const MAX_SNAPSHOTS = 20;
const SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000;

export type SnapshotReason =
  | "auto"
  | "manual"
  | "beforeImport"
  | "beforeClear"
  | "beforeColumnDelete"
  | "beforeRestore"
  | "beforeUpdate"
  | "beforeMigration";

export type Snapshot = {
  id: string;
  at: string;
  reason: SnapshotReason;
  /** 快照內容的資料格式版本（v2.0 的快照沒有這個欄位 → 視為 1） */
  schemaVersion?: number;
  columns: Column[];
};

let db: IDBDatabase | null = null;
let backend: "indexeddb" | "localstorage" = "indexeddb";
let columnsCache: Column[] | null = null;
let saveTimer: any = null;
let pending: Column[] | null = null;

function lsGet(key: string) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : JSON.parse(v);
  } catch (e) {
    return null;
  }
}

function lsSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore */
  }
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) return resolve(null);
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function idbGet(key: string): Promise<any> {
  if (!db) return Promise.resolve(lsGet(LS_PREFIX + key));
  return new Promise((resolve, reject) => {
    const r = db!.transaction(STORE, "readonly").objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function idbSet(key: string, value: any): Promise<void> {
  if (!db) {
    lsSet(LS_PREFIX + key, value);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * 啟動時呼叫一次：開資料庫、載入看板。
 * - 資料庫記錄資料格式版本 kv["meta"].schemaVersion（v2.0 沒有這個欄位 → 視為 1）
 * - 版本較舊時自動升級，升級前先存一份快照
 * - 找不到資料時，把原版 Personal Kanban 的 localStorage 資料搬進來（格式 0）
 */
export async function init() {
  db = await openDB();
  if (!db) backend = "localstorage";
  try {
    const meta = (await idbGet(META)) || {};
    let saved = await idbGet(COLUMNS);
    let storedVersion = typeof meta.schemaVersion === "number" ? meta.schemaVersion : 1;
    if (!Array.isArray(saved)) {
      const legacy = lsGet(COLUMNS); // 原版 Personal Kanban 的 localStorage
      if (Array.isArray(legacy)) {
        saved = legacy;
        storedVersion = 0;
      }
    }
    if (Array.isArray(saved)) {
      if (storedVersion > SCHEMA_VERSION) {
        // 資料來自更新版的程式（例如更新後又回到舊版）：不覆寫，原樣使用
        columnsCache = saved;
      } else {
        const { columns } = readBackup({ schemaVersion: storedVersion, columns: saved });
        if (storedVersion < SCHEMA_VERSION) {
          await addSnapshot(saved, "beforeMigration", storedVersion);
          await idbSet(COLUMNS, columns);
        }
        columnsCache = columns;
      }
    }
    if (storedVersion <= SCHEMA_VERSION) await idbSet(META, { ...meta, schemaVersion: SCHEMA_VERSION });
    const act = await idbGet(ACTIVITY);
    if (act && typeof act.since === "string" && act.days && typeof act.days === "object") activityCache = act;
  } catch (e) {
    console.error("[JimmysKanban] 讀取資料庫失敗", e);
  }
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => false);
  }
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.hidden && flush());
}

export function flush() {
  if (!pending) return Promise.resolve();
  clearTimeout(saveTimer);
  const value = pending;
  pending = null;
  return idbSet(COLUMNS, value);
}

export function getItem(key: string) {
  return lsGet(key);
}

export function setItem(key: string, value: any) {
  lsSet(key, value);
}

export function getDarkMode() {
  return getItem(DARK_MODE);
}

export function setDarkMode(value: boolean) {
  return setItem(DARK_MODE, value);
}

export function getColumns() {
  return columnsCache;
}

export function setColumns(value: Column[]) {
  columnsCache = value;
  pending = clone(value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const v = pending;
    pending = null;
    if (!v) return;
    idbSet(COLUMNS, v)
      .then(() => maybeAutoSnapshot(v))
      .catch((e) => console.error("[JimmysKanban] 存檔失敗", e));
  }, 300);
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const v = await idbGet(SNAPSHOTS);
  return Array.isArray(v) ? v : [];
}

export async function addSnapshot(columns: Column[], reason: SnapshotReason, schemaVersion = SCHEMA_VERSION) {
  const list = await listSnapshots();
  list.unshift({ id: `snap-${Date.now()}`, at: new Date().toISOString(), reason, schemaVersion, columns: clone(columns) });
  await idbSet(SNAPSHOTS, list.slice(0, MAX_SNAPSHOTS));
}

async function maybeAutoSnapshot(columns: Column[]) {
  const list = await listSnapshots();
  const last = list.find((s) => s.reason === "auto");
  if (last && Date.now() - Date.parse(last.at) < SNAPSHOT_INTERVAL_MS) return;
  await addSnapshot(columns, "auto");
}

// ---------- 活動紀錄
let activityCache: ActivityLog | null = null;
let activityTimer: any;

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function getActivity(): ActivityLog | null {
  return activityCache;
}

/** 記錄一次便條紙操作（新增 / 編輯 / 蓋章 / 移動 / 刪除） */
export function logActivity(count = 1) {
  const d = today();
  if (!activityCache) activityCache = { since: d, days: {} };
  activityCache = { ...activityCache, days: { ...activityCache.days, [d]: (activityCache.days[d] || 0) + count } };
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    idbSet(ACTIVITY, activityCache).catch((e) => console.error("[JimmysKanban] 活動紀錄存檔失敗", e));
  }, 500);
}

export function getLastBackup(): string | null {
  return getItem(LAST_BACKUP);
}

export function setLastBackup(value: string) {
  setItem(LAST_BACKUP, value);
}

export function getBackend() {
  return backend;
}

const StorageService = {
  init,
  flush,
  getItem,
  setItem,
  getDarkMode,
  setDarkMode,
  getColumns,
  setColumns,
  listSnapshots,
  addSnapshot,
  getLastBackup,
  setLastBackup,
  getBackend,
  getActivity,
  logActivity,
};

export default StorageService;
