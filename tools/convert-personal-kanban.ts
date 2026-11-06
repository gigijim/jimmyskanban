/*
 * 把原版 Personal Kanban 的匯出檔轉成 JimmysKanban 可匯入的備份檔，並依分類表重新分欄。
 *
 *   npx vite-node tools/convert-personal-kanban.ts <匯出檔.json> <classification.json> <輸出.json> [完成欄位名稱=Completed]
 *
 * classification.json：
 *   { "newColumns": ["【...】"], "assignments": { "<record id>": "<欄位名稱>" }, "lowConfidence": ["<record id>"] }
 *
 * 規則：
 * - 「完成欄位」裡的便條紙 → 移到分類表指定的欄位，蓋上「已完成!」，進入該欄下方的完成區
 *   （原版沒有記錄完成時間，completedAt 以建立時間代替）
 * - 其他欄位的便條紙維持原狀（進行中）
 * - 完成欄位清空後移除；新分類欄位加在最後
 * - 輸出前用 readBackup() 驗證：張數必須與原始檔相同
 */
import fs from "fs";
import { makeBackup, readBackup } from "../src/PersonalKanban/services/Schema";
import { getId, getCreatedAt } from "../src/PersonalKanban/services/Utils";
import { Column, Record } from "../src/PersonalKanban/types";

const [input, classificationFile, output, doneTitle = "Completed"] = process.argv.slice(2);
if (!input || !classificationFile || !output) {
  console.error("usage: vite-node tools/convert-personal-kanban.ts <export.json> <classification.json> <out.json> [doneColumnTitle]");
  process.exit(1);
}

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
const raw = read(input);
const cls = read(classificationFile);

const { columns, fromVersion } = readBackup(raw);
const total = columns.reduce((n, c) => n + (c.records || []).length, 0);
const doneColumn = columns.find((c) => c.title === doneTitle);
if (!doneColumn) throw new Error(`找不到完成欄位「${doneTitle}」`);

const palette = ["Purple", "Green", "Orange", "Red", "Yellow", "Indigo", "Blue"];
const byTitle = new Map<string, Column>(columns.map((c) => [c.title, c]));
const ensureColumn = (title: string) => {
  let col = byTitle.get(title);
  if (!col) {
    col = {
      id: getId(),
      title,
      description: "",
      color: title === "【其他】" ? "" : palette[byTitle.size % palette.length],
      wipEnabled: false,
      wipLimit: 0,
      createdAt: getCreatedAt(),
      records: [],
    };
    byTitle.set(title, col);
    columns.push(col);
  }
  return col;
};
(cls.newColumns || []).forEach(ensureColumn);

let unassigned = 0;
const moved: Record[] = [...(doneColumn.records || [])];
doneColumn.records = [];
for (const rec of moved) {
  let target = cls.assignments && cls.assignments[rec.id];
  if (!target || target === doneTitle) {
    target = "【其他】";
    unassigned++;
  }
  ensureColumn(target).records!.push({
    ...rec,
    stamp: "done",
    completedAt: rec.createdAt || getCreatedAt(),
    updatedAt: rec.updatedAt || rec.createdAt,
  });
}

// 移除已清空的完成欄位；「【其他】」放最後
const result = columns.filter((c) => c !== doneColumn);
const other = result.findIndex((c) => c.title === "【其他】");
if (other >= 0) result.push(result.splice(other, 1)[0]);

const backup = makeBackup(result, "converted-from-personal-kanban");
fs.writeFileSync(output, JSON.stringify(backup, null, 2));

// 驗證：重新讀回來，張數一致
const check = readBackup(read(output)).columns;
const after = check.reduce((n, c) => n + (c.records || []).length, 0);
if (after !== total) throw new Error(`張數不符：原始 ${total}，轉換後 ${after}`);

console.log(`來源格式 schema ${fromVersion} → 備份檔 schema ${backup.schemaVersion}；共 ${after} 張（與原始相同）`);
console.log(`未分類而放到【其他】：${unassigned}；分類不確定：${(cls.lowConfidence || []).length}`);
for (const c of check) {
  const recs = c.records || [];
  const done = recs.filter((r) => r.stamp === "done").length;
  console.log(`  ${c.title.padEnd(14, "　")} 進行中 ${String(recs.length - done).padStart(3)}  已完成 ${String(done).padStart(3)}`);
}
console.log(`輸出：${output}`);
