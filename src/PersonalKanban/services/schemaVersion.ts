/**
 * 資料格式版本（與程式版本 package.json version 分開）。
 * 只有「資料結構」改變時才 +1，並且必須在 Schema.ts 的 MIGRATIONS 加上
 * 從舊版本升級的轉換函式。規則請見 docs/DATA_FORMAT.md。
 *
 *   0 = 原版 Personal Kanban（localStorage 的 columns 陣列）
 *   1 = JimmysKanban v2：便條紙加上 updatedAt / completedAt / stamp，時間改 ISO 8601
 */
export const SCHEMA_VERSION = 1;
