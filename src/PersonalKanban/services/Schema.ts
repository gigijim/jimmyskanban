import { Column } from "PersonalKanban/types";
import { normalizeColumns } from "PersonalKanban/services/Utils";
import { SCHEMA_VERSION } from "PersonalKanban/services/schemaVersion";

export { SCHEMA_VERSION };

export const BACKUP_FORMAT = "jimmyskanban-backup";

/** 備份檔來自比目前程式更新的版本：請先更新程式再匯入 */
export class NewerSchemaError extends Error {
  schemaVersion: number;
  constructor(schemaVersion: number) {
    super(`backup schema ${schemaVersion} is newer than ${SCHEMA_VERSION}`);
    this.name = "NewerSchemaError";
    this.schemaVersion = schemaVersion;
  }
}

/**
 * 判斷輸入資料的格式版本。
 * - 陣列：原版 Personal Kanban 的 localStorage 內容 → 0
 * - { app: "PersonalKanban-export", columns }：從原版匯出的檔案 → 0
 * - { schemaVersion: n, columns }：本工具 v2.1 之後的備份 → n
 * - { app: "JimmysKanban", columns }（v2.0 的備份，尚無 schemaVersion）→ 1
 */
export const detectSchema = (input: any): number => {
  if (Array.isArray(input)) return 0;
  if (!input || typeof input !== "object" || !Array.isArray(input.columns)) {
    throw new Error("invalid");
  }
  if (typeof input.schemaVersion === "number" && isFinite(input.schemaVersion)) {
    return Math.max(0, Math.floor(input.schemaVersion));
  }
  if (input.app === "PersonalKanban-export") return 0;
  return 1;
};

/**
 * 升級函式：MIGRATIONS[n] 把格式 n 的 columns 轉成格式 n+1。
 * 新增資料格式版本時，只能「加」一個新的函式，不要修改舊的。
 */
const MIGRATIONS: { [from: number]: (columns: any[]) => any[] } = {
  // 0 → 1：補 updatedAt / completedAt / stamp，舊時間格式轉 ISO
  0: (columns) => normalizeColumns(columns),
};

/** 讀取任何版本的備份 / 資料庫內容，依序升級到目前格式 */
export const readBackup = (input: any): { columns: Column[]; fromVersion: number } => {
  const fromVersion = detectSchema(input);
  if (fromVersion > SCHEMA_VERSION) throw new NewerSchemaError(fromVersion);
  let columns: any[] = Array.isArray(input) ? input : input.columns;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`missing migration ${v} -> ${v + 1}`);
    columns = migrate(columns);
  }
  return { columns: normalizeColumns(columns), fromVersion };
};

/** 產生備份檔內容（之後所有版本都必須能讀取這個格式） */
export const makeBackup = (columns: Column[], appVersion: string) => ({
  app: "JimmysKanban",
  format: BACKUP_FORMAT,
  schemaVersion: SCHEMA_VERSION,
  appVersion,
  exportedAt: new Date().toISOString(),
  columns,
});
