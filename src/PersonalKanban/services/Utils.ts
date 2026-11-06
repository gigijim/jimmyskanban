import { v4 as uuidv4 } from "uuid";
import moment from "moment";

import { Column, Record, Stamp } from "PersonalKanban/types";

/** 完成區的 Droppable id 後綴：`${columnId}${DONE_SUFFIX}` */
export const DONE_SUFFIX = "::done";

export const STAMPS: Stamp[] = ["", "important", "done"];

/** 原版的建立時間格式（舊資料相容用） */
export const LEGACY_TIME_FORMAT = "DD-MM-YYYY h:mm:ss a";

export const getId = (): string => {
  return uuidv4();
};

export const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

/** 目前時間（ISO 8601）。保留原版函式名稱，避免大幅改動呼叫端。 */
export const getCreatedAt = (now?: string) => {
  return now || new Date().toISOString();
};

/** 解析時間字串（支援 ISO 與原版格式） */
export const parseTime = (value?: string | null) => {
  if (!value) return null;
  const m = moment(value, [moment.ISO_8601, LEGACY_TIME_FORMAT], true);
  return m.isValid() ? m : null;
};

/** 顯示用時間格式 */
export const formatTime = (value?: string | null, format = "YYYY/MM/DD HH:mm") => {
  const m = parseTime(value);
  return m ? m.format(format) : "";
};

/** 舊版時間字串轉 ISO（無法解析則保留原值） */
export const toISO = (value?: string | null) => {
  const m = parseTime(value);
  return m ? m.toISOString() : value || undefined;
};

export const isDone = (record: Record) => record.stamp === "done";

/** 依完成時間由新到舊 */
export const sortDone = (records: Record[]) =>
  [...records].sort((a, b) => {
    const ta = parseTime(a.completedAt)?.valueOf() || 0;
    const tb = parseTime(b.completedAt)?.valueOf() || 0;
    return tb - ta;
  });

/** 將欄位的便條紙分成「進行中」（保留原順序）與「已完成」（依完成時間新→舊） */
export const splitRecords = (records: Record[] = []) => ({
  active: records.filter((r) => !isDone(r)),
  done: sortDone(records.filter(isDone)),
});

/**
 * 套用印章，處理完成時間與最後修改時間。
 * - 改成 done：記錄 completedAt
 * - 從 done 改成其他：清除 completedAt
 */
export const applyStamp = (record: Record, stamp: Stamp, now?: string): Record => {
  const current = record.stamp || "";
  if (current === stamp) return record;
  const t = getCreatedAt(now);
  return {
    ...record,
    stamp,
    completedAt: stamp === "done" ? t : null,
    updatedAt: t,
  };
};

/** 印章循環：無 → 特重要 → 已完成! → 無 */
export const nextStamp = (stamp: Stamp = ""): Stamp =>
  STAMPS[(STAMPS.indexOf(stamp) + 1) % STAMPS.length];

/** 進行中區塊的數量 */
export const activeCount = (column: Column) =>
  (column.records || []).filter((r) => !isDone(r)).length;

/**
 * 移動便條紙（支援進行中 / 已完成兩個區塊）。
 * - 同一欄內：在進行中 / 完成區之間拖曳 = 蓋上 / 取消「完成」印章
 * - 跨欄移動：印章與所有時間（建立 / 修改 / 完成）都不變，
 *   卡片依原本的狀態放進目的欄對應的區塊（完成的進完成區，其他進進行中區）
 * @param toDone       目的地是否為完成區
 * @param destinationIndex 目的地區塊內的位置（完成區依時間排序，位置忽略）
 */
export const moveRecord = ({
  columns,
  recordId,
  sourceColumnId,
  destinationColumnId,
  destinationIndex,
  toDone,
  now,
}: {
  columns: Column[];
  recordId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  destinationIndex: number;
  toDone: boolean;
  now?: string;
}): Column[] => {
  const newColumns = columns.map((c) => ({ ...c, records: [...(c.records || [])] }));
  const source = newColumns.find((c) => c.id === sourceColumnId);
  const destination = newColumns.find((c) => c.id === destinationColumnId);
  if (!source || !destination) return columns;

  const sourceIndex = source.records.findIndex((r) => r.id === recordId);
  if (sourceIndex < 0) return columns;
  let [record] = source.records.splice(sourceIndex, 1);

  const t = getCreatedAt(now);
  const columnChanged = sourceColumnId !== destinationColumnId;

  // 跨欄：維持原狀態；同欄：依放下的區塊改變印章
  const intoDone = columnChanged ? isDone(record) : toDone;
  if (!columnChanged) {
    if (toDone && !isDone(record)) record = applyStamp(record, "done", t);
    if (!toDone && isDone(record)) record = applyStamp(record, "", t);
  }

  if (intoDone) {
    destination.records.push(record);
    return newColumns;
  }

  // 未完成的卡片放到別欄的完成區時，排在進行中區最後
  if (columnChanged && toDone) destinationIndex = Number.MAX_SAFE_INTEGER;

  const records = destination.records;
  const active = records.filter((r) => !isDone(r));
  let insertAt: number;
  if (destinationIndex < active.length) {
    insertAt = records.indexOf(active[Math.max(0, destinationIndex)]);
  } else if (active.length) {
    insertAt = records.indexOf(active[active.length - 1]) + 1;
  } else {
    insertAt = 0;
  }
  records.splice(insertAt, 0, record);
  return newColumns;
};

/** 原版的移動邏輯（保留，供相容使用） */
export const reorderCards = ({
  columns,
  sourceColumn,
  destinationColumn,
  sourceIndex,
  destinationIndex,
}: {
  columns: Column[];
  sourceColumn: Column;
  destinationColumn: Column;
  sourceIndex: number;
  destinationIndex: number;
}) => {
  const getColumnIndex = (columnId: string) =>
    columns.findIndex((c) => c.id === columnId);

  const getRecords = (columnId: string) => [
    ...columns.find((c) => c.id === columnId)?.records!,
  ];

  const current = getRecords(sourceColumn.id);
  const next = getRecords(destinationColumn.id);
  const target = current[sourceIndex];

  if (sourceColumn.id === destinationColumn.id) {
    const reordered = reorder(current, sourceIndex, destinationIndex);
    const newColumns = columns.map((c) => ({ ...c }));
    newColumns[getColumnIndex(sourceColumn.id)].records = reordered;
    return newColumns;
  }

  current.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, target);
  const newColumns = columns.map((c) => ({ ...c }));
  newColumns[getColumnIndex(sourceColumn.id)].records = current;
  newColumns[getColumnIndex(destinationColumn.id)].records = next;
  return newColumns;
};

/* ---------- 匯入 / 匯出 ---------- */

const str = (v: any, d = "") => (v === undefined || v === null ? d : String(v));

/**
 * 將 Column[] 正規化（補齊欄位、修正型別、去除重複 id）。接受：
 * - 本工具備份檔 { app, columns: [...] }
 * - 原版 Personal Kanban 的 columns 陣列
 * 版本判斷與資料格式遷移請用 Schema.ts 的 readBackup()。
 */
export const normalizeColumns = (input: any): Column[] => {
  const list = Array.isArray(input) ? input : input && Array.isArray(input.columns) ? input.columns : null;
  if (!list) throw new Error("invalid");
  const colIds = new Set<string>();
  const recIds = new Set<string>();
  return list
    .filter((c: any) => c && typeof c === "object")
    .map((c: any) => {
      let id = str(c.id) || getId();
      if (colIds.has(id)) id = getId();
      colIds.add(id);
      const records: Record[] = (Array.isArray(c.records) ? c.records : [])
        .filter((r: any) => r && typeof r === "object")
        .map((r: any) => {
          let rid = str(r.id) || getId();
          if (recIds.has(rid)) rid = getId();
          recIds.add(rid);
          const stamp: Stamp = STAMPS.includes(r.stamp) ? r.stamp : "";
          const createdAt = toISO(r.createdAt) || getCreatedAt();
          return {
            // 保留不認得的欄位：新版本備份檔匯入舊版本時資料不會遺失（向前相容）
            ...r,
            id: rid,
            title: str(r.title, "Untitled"),
            description: str(r.description),
            color: str(r.color),
            createdAt,
            updatedAt: toISO(r.updatedAt) || createdAt,
            completedAt: stamp === "done" ? toISO(r.completedAt) || createdAt : null,
            stamp,
          };
        });
      const wipLimit = parseInt(c.wipLimit, 10);
      return {
        ...c,
        id,
        title: str(c.title, "Untitled"),
        description: str(c.description),
        color: str(c.color),
        wipEnabled: Boolean(c.wipEnabled),
        wipLimit: isNaN(wipLimit) ? 0 : wipLimit,
        createdAt: toISO(c.createdAt) || getCreatedAt(),
        records,
      } as Column;
    });
};

/** 合併：以 id 比對，欄位不存在就加入；便條紙以最後修改時間較新的為準 */
export const mergeColumns = (current: Column[], incoming: Column[]): Column[] => {
  const result = current.map((c) => ({ ...c, records: [...(c.records || [])] }));
  const allRecords = () => result.flatMap((c) => c.records!.map((r) => ({ r, c })));
  incoming.forEach((inc) => {
    let col = result.find((c) => c.id === inc.id);
    if (!col) {
      col = { ...inc, records: [] };
      result.push(col);
    }
    (inc.records || []).forEach((rec) => {
      const found = allRecords().find((x) => x.r.id === rec.id);
      if (!found) {
        col!.records!.push(rec);
        return;
      }
      const newer = (parseTime(rec.updatedAt)?.valueOf() || 0) > (parseTime(found.r.updatedAt)?.valueOf() || 0);
      if (newer) {
        found.c.records = found.c.records!.filter((r) => r.id !== rec.id);
        col!.records!.push(rec);
      }
    });
  });
  return result;
};

const csvCell = (v: any) => {
  const s = str(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV（含 BOM，Excel 開中文不亂碼） */
export const toCSV = (columns: Column[], headers: string[], stampLabel: (s: Stamp) => string, areaLabel: (done: boolean) => string) => {
  const rows = [headers];
  columns.forEach((col) => {
    const { active, done } = splitRecords(col.records);
    [...active, ...done].forEach((r) => {
      rows.push([
        col.title,
        areaLabel(isDone(r)),
        r.title,
        str(r.description),
        stampLabel(r.stamp || ""),
        formatTime(r.createdAt, "YYYY-MM-DD HH:mm:ss"),
        formatTime(r.updatedAt, "YYYY-MM-DD HH:mm:ss"),
        formatTime(r.completedAt, "YYYY-MM-DD HH:mm:ss"),
      ]);
    });
  });
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
};

export const getInitialState = () => {
  const t = getCreatedAt();
  return [
    {
      id: getId(),
      title: "Todo",
      color: "Orange",
      records: [
        {
          id: getId(),
          color: "Yellow",
          title: "Clear Board",
          description:
            "Make a fresh start by erasing this board. Click delete button on main toolbar.",
          createdAt: t,
          updatedAt: t,
          completedAt: null,
          stamp: "important" as Stamp,
        },
      ],
      createdAt: t,
    },
    {
      id: getId(),
      title: "In-Progress",
      color: "Red",
      records: [
        {
          id: getId(),
          color: "Purple",
          title: "Click the stamp area at the bottom-right of a card",
          description: "None → 特重要 → 已完成!  A done card moves to the completed section below.",
          createdAt: t,
          updatedAt: t,
          completedAt: null,
          stamp: "" as Stamp,
        },
      ],
      createdAt: t,
    },
    {
      id: getId(),
      title: "Completed",
      color: "Green",
      records: [
        {
          id: getId(),
          color: "Indigo",
          title: "Be Awesome",
          description: "Rock the world with your creativity !",
          createdAt: t,
          updatedAt: t,
          completedAt: t,
          stamp: "done" as Stamp,
        },
      ],
      createdAt: t,
    },
  ];
};

/* ------------------------------------------------------------------ */
/* 搜尋（模糊比對）                                                     */
/* ------------------------------------------------------------------ */

/** 全形 / 半形、大小寫、連續空白都視為相同 */
export const normalizeSearch = (s?: string | null) =>
  (s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * token 的字元依序出現在 text 中，且分布範圍不太大
 * （例：「中電」可找到「中華電信」，但不會在一大段文字裡東湊一個字西湊一個字）
 */
const fuzzyIncludes = (text: string, token: string) => {
  if (token.length < 2) return false;
  const maxSpan = Math.max(token.length * 3, token.length + 4);
  for (let start = text.indexOf(token[0]); start >= 0; start = text.indexOf(token[0], start + 1)) {
    let i = 1;
    let pos = start;
    while (i < token.length) {
      pos = text.indexOf(token[i], pos + 1);
      if (pos < 0 || pos - start + 1 > maxSpan) break;
      i++;
    }
    if (i === token.length) return true;
    if (pos < 0) return false;
  }
  return false;
};

/**
 * 搜尋字串用空白分成多個關鍵字，每個關鍵字都要符合（完全包含或模糊比對）。
 * @param extra 額外可被搜尋的文字（例如印章名稱「急件」「完成」）
 */
export const matchRecord = (record: Record, query: string, extra = "") => {
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const text = normalizeSearch(`${record.title}\n${record.description || ""}\n${extra}`);
  return tokens.every((tok) => text.includes(tok) || fuzzyIncludes(text, tok));
};

/** 篩選看板：每欄只留下符合的便條紙，沒有符合的欄位不顯示 */
export const filterColumns = (columns: Column[], query: string, extraOf?: (r: Record) => string) => {
  if (!normalizeSearch(query)) return columns;
  return columns
    .map((c) => ({ ...c, records: (c.records || []).filter((r) => matchRecord(r, query, extraOf ? extraOf(r) : "")) }))
    .filter((c) => c.records.length > 0);
};
