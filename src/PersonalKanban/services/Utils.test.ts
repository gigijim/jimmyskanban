import { describe, it, expect } from "vitest";
import {
  activeCount,
  applyStamp,
  formatTime,
  mergeColumns,
  moveRecord,
  nextStamp,
  normalizeColumns,
  parseTime,
  splitRecords,
  toCSV,
} from "./Utils";
import { Column, Record } from "PersonalKanban/types";

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-01-02T00:00:00.000Z";
const T2 = "2026-01-03T00:00:00.000Z";
const T3 = "2026-01-04T00:00:00.000Z";

const rec = (id: string, extra: Partial<Record> = {}): Record => ({
  id,
  title: id,
  createdAt: T0,
  updatedAt: T0,
  completedAt: null,
  stamp: "",
  ...extra,
});
const done = (id: string, at: string) => rec(id, { stamp: "done", completedAt: at });

const board = (): Column[] => [
  { id: "A", title: "A", records: [rec("a1"), done("ad1", T1), rec("a2"), done("ad2", T2)] },
  { id: "B", title: "B", records: [rec("b1"), rec("b2")] },
];

const area = (cols: Column[], colId: string) => {
  const c = cols.find((x) => x.id === colId)!;
  const { active, done } = splitRecords(c.records);
  return { active: active.map((r) => r.id), done: done.map((r) => r.id) };
};
const find = (cols: Column[], id: string) => cols.flatMap((c) => c.records!).find((r) => r.id === id)!;

describe("splitRecords / activeCount", () => {
  it("keeps active order and sorts done newest first", () => {
    expect(area(board(), "A")).toEqual({ active: ["a1", "a2"], done: ["ad2", "ad1"] });
  });
  it("activeCount ignores done records", () => {
    expect(activeCount(board()[0])).toBe(2);
  });
});

describe("stamps", () => {
  it("'' -> done sets completedAt and updatedAt", () => {
    const r = applyStamp(rec("x"), "done", T1);
    expect(r).toMatchObject({ stamp: "done", completedAt: T1, updatedAt: T1, createdAt: T0 });
  });
  it("done -> important clears completedAt", () => {
    const r = applyStamp(done("x", T1), "important", T2);
    expect(r).toMatchObject({ stamp: "important", completedAt: null, updatedAt: T2 });
  });
  it("same stamp returns the same object", () => {
    const r = rec("x", { stamp: "important" });
    expect(applyStamp(r, "important", T1)).toBe(r);
  });
  it("cycles '' -> important -> done -> ''", () => {
    expect(nextStamp("")).toBe("important");
    expect(nextStamp("important")).toBe("done");
    expect(nextStamp("done")).toBe("");
  });
});

describe("moveRecord", () => {
  it("dropping into another column's done area marks it done", () => {
    const out = moveRecord({ columns: board(), recordId: "b1", sourceColumnId: "B", destinationColumnId: "A", destinationIndex: 0, toDone: true, now: T3 });
    expect(find(out, "b1")).toMatchObject({ stamp: "done", completedAt: T3, updatedAt: T3 });
    expect(area(out, "A").done).toEqual(["b1", "ad2", "ad1"]);
    expect(area(out, "B").active).toEqual(["b2"]);
  });
  it("dragging out of done into active at index 1 clears the stamp and inserts between", () => {
    const out = moveRecord({ columns: board(), recordId: "ad1", sourceColumnId: "A", destinationColumnId: "A", destinationIndex: 1, toDone: false, now: T3 });
    expect(find(out, "ad1")).toMatchObject({ stamp: "", completedAt: null, updatedAt: T3 });
    expect(area(out, "A")).toEqual({ active: ["a1", "ad1", "a2"], done: ["ad2"] });
  });
  it("same-column reorder does not change updatedAt", () => {
    const out = moveRecord({ columns: board(), recordId: "a1", sourceColumnId: "A", destinationColumnId: "A", destinationIndex: 1, toDone: false, now: T3 });
    expect(area(out, "A").active).toEqual(["a2", "a1"]);
    expect(find(out, "a1").updatedAt).toBe(T0);
  });
  it("cross-column move into active changes updatedAt", () => {
    const out = moveRecord({ columns: board(), recordId: "a1", sourceColumnId: "A", destinationColumnId: "B", destinationIndex: 0, toDone: false, now: T3 });
    expect(area(out, "B").active).toEqual(["a1", "b1", "b2"]);
    expect(find(out, "a1").updatedAt).toBe(T3);
  });
  it("appends after the last active card when index is past the end", () => {
    const out = moveRecord({ columns: board(), recordId: "b1", sourceColumnId: "B", destinationColumnId: "A", destinationIndex: 99, toDone: false, now: T3 });
    expect(area(out, "A").active).toEqual(["a1", "a2", "b1"]);
  });
  it("returns the input unchanged for unknown ids", () => {
    const cols = board();
    expect(moveRecord({ columns: cols, recordId: "nope", sourceColumnId: "A", destinationColumnId: "B", destinationIndex: 0, toDone: false })).toBe(cols);
    expect(moveRecord({ columns: cols, recordId: "a1", sourceColumnId: "A", destinationColumnId: "Z", destinationIndex: 0, toDone: false })).toBe(cols);
  });
});

describe("time parsing", () => {
  it("accepts ISO and the original Personal Kanban format", () => {
    expect(formatTime(T0, "YYYY-MM-DD")).toBe(parseTime(T0)!.format("YYYY-MM-DD"));
    expect(formatTime("06-11-2026 3:05:09 pm", "YYYY/MM/DD HH:mm:ss")).toBe("2026/11/06 15:05:09");
    expect(formatTime("garbage")).toBe("");
    expect(formatTime(null)).toBe("");
  });
});

describe("normalizeColumns", () => {
  it("rejects garbage", () => {
    expect(() => normalizeColumns(null)).toThrow();
    expect(() => normalizeColumns({})).toThrow();
    expect(() => normalizeColumns("x")).toThrow();
  });
  it("accepts the original Personal Kanban array", () => {
    const out = normalizeColumns([
      { id: "c", title: "Todo", wipEnabled: true, wipLimit: 3, createdAt: "06-11-2026 3:05:09 pm", records: [{ id: "r", title: "R", createdAt: "06-11-2026 3:05:09 pm" }] },
    ]);
    expect(out[0]).toMatchObject({ id: "c", wipEnabled: true, wipLimit: 3 });
    const r = out[0].records![0];
    expect(r.stamp).toBe("");
    expect(r.completedAt).toBeNull();
    expect(formatTime(r.createdAt, "YYYY/MM/DD HH:mm")).toBe("2026/11/06 15:05");
    expect(r.updatedAt).toBe(r.createdAt);
  });
  it("accepts a backup file, de-duplicates ids, cleans stamps", () => {
    const out = normalizeColumns({
      app: "JimmysKanban",
      columns: [
        { id: "c", title: "1", records: [{ id: "r", title: "a", stamp: "done" }, { id: "r", title: "b", stamp: "weird" }] },
        { id: "c", title: "2", records: [] },
      ],
    });
    expect(out[0].id).not.toBe(out[1].id);
    const [a, b] = out[0].records!;
    expect(a.id).not.toBe(b.id);
    expect(a.stamp).toBe("done");
    expect(a.completedAt).toBeTruthy();
    expect(b.stamp).toBe("");
  });
});

describe("mergeColumns", () => {
  it("appends new columns and records", () => {
    const out = mergeColumns(board(), [{ id: "C", title: "C", records: [rec("c1")] }]);
    expect(out.map((c) => c.id)).toEqual(["A", "B", "C"]);
    expect(find(out, "c1")).toBeTruthy();
  });
  it("newer record wins, even when it moved to another column", () => {
    const out = mergeColumns(board(), [{ id: "B", title: "B", records: [rec("a1", { title: "new", updatedAt: T3 })] }]);
    expect(area(out, "A").active).toEqual(["a2"]);
    expect(area(out, "B").active).toContain("a1");
    expect(find(out, "a1").title).toBe("new");
  });
  it("older record is ignored", () => {
    const cols = board();
    cols[0].records![0] = rec("a1", { title: "current", updatedAt: T2 });
    const out = mergeColumns(cols, [{ id: "A", title: "A", records: [rec("a1", { title: "stale", updatedAt: T1 })] }]);
    expect(find(out, "a1").title).toBe("current");
  });
});

describe("toCSV", () => {
  it("has a BOM, escapes cells, one row per record", () => {
    const cols: Column[] = [{ id: "A", title: "A", records: [rec("x", { title: 'a, "b"\nc' }), done("y", T1)] }];
    const csv = toCSV(cols, ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"], (s) => s, (d) => (d ? "done" : "active"));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"a, ""b""\nc"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});
