/*
 * 相容性測試：__fixtures__ 裡每一個歷史格式的備份檔，未來所有版本都必須能匯入。
 * 規則：這些檔案「只能新增，不能修改或刪除」。新增資料格式版本時，
 * 請把新格式的備份範例也放進 __fixtures__（檔名以 schema<N>- 開頭）。
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { detectSchema, makeBackup, NewerSchemaError, readBackup, SCHEMA_VERSION } from "./Schema";
import { formatTime } from "./Utils";

const FIXTURES = path.join(__dirname, "__fixtures__");
const load = (f: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, f), "utf8"));
const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".json"));

describe("every historical backup format still imports", () => {
  it("has fixtures", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  files.forEach((file) => {
    it(file, () => {
      const data = load(file);
      const expectedVersion = Number(/^schema(\d+)-/.exec(file)![1]);
      expect(detectSchema(data)).toBe(expectedVersion);
      const { columns } = readBackup(data);
      expect(columns.length).toBeGreaterThan(0);
      columns.forEach((c) => {
        expect(typeof c.id).toBe("string");
        (c.records || []).forEach((r) => {
          expect(typeof r.id).toBe("string");
          expect(typeof r.title).toBe("string");
          expect(formatTime(r.createdAt)).not.toBe("");
          expect(formatTime(r.updatedAt)).not.toBe("");
          expect(["", "important", "done"]).toContain(r.stamp);
          if (r.stamp === "done") expect(formatTime(r.completedAt)).not.toBe("");
          else expect(r.completedAt).toBeNull();
        });
      });
    });
  });
});

describe("schema 0 (original Personal Kanban)", () => {
  it("keeps every column, record, color, WIP limit and converts old times", () => {
    const { columns, fromVersion } = readBackup(load("schema0-personal-kanban-localstorage.json"));
    expect(fromVersion).toBe(0);
    expect(columns.map((c) => c.id)).toEqual(["col-todo", "col-done"]);
    expect(columns[0]).toMatchObject({ color: "Orange", wipEnabled: true, wipLimit: 5, description: "原版欄位" });
    const r = columns[0].records![0];
    expect(r).toMatchObject({ id: "rec-1", title: "寫週報", description: "多行\n內容", color: "Yellow", stamp: "" });
    expect(formatTime(r.createdAt, "YYYY/MM/DD HH:mm:ss")).toBe("2021/02/03 09:20:11");
    expect(formatTime(columns[0].records![1].createdAt, "YYYY/MM/DD HH:mm:ss")).toBe("2023/12/15 16:05:09");
  });

  it("the exported file from the original site gives the same result", () => {
    const a = readBackup(load("schema0-personal-kanban-localstorage.json")).columns;
    const b = readBackup(load("schema0-personal-kanban-export.json")).columns;
    expect(b).toEqual(a);
  });
});

describe("schema 1 (JimmysKanban v2.x)", () => {
  it("v2.0 backup without schemaVersion keeps stamps and times exactly", () => {
    const { columns, fromVersion } = readBackup(load("schema1-jimmyskanban-v2.0.0.json"));
    expect(fromVersion).toBe(1);
    const [a1, a2, a3] = columns[0].records!;
    expect(a1.stamp).toBe("important");
    expect(a2.stamp).toBe("");
    expect(a3).toMatchObject({ stamp: "done", completedAt: "2026-11-06T11:00:00.000Z", updatedAt: "2026-11-06T11:00:00.000Z" });
  });

  it("export → import round trip is lossless", () => {
    const { columns } = readBackup(load("schema1-jimmyskanban-v2.1.0.json"));
    const again = readBackup(JSON.parse(JSON.stringify(makeBackup(columns, "test")))).columns;
    expect(again).toEqual(columns);
  });

  it("makeBackup writes the current schema version", () => {
    const b = makeBackup([], "9.9.9");
    expect(b).toMatchObject({ app: "JimmysKanban", format: "jimmyskanban-backup", schemaVersion: SCHEMA_VERSION, appVersion: "9.9.9" });
  });
});

describe("forward compatibility", () => {
  it("a backup from a newer data format is refused with a clear error (update the app first)", () => {
    const future = { ...load("schema1-jimmyskanban-v2.1.0.json"), schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => readBackup(future)).toThrow(NewerSchemaError);
  });

  it("unknown fields added by future versions are preserved, not dropped", () => {
    const data = load("schema1-jimmyskanban-v2.1.0.json");
    data.columns[0].futureColumnField = { x: 1 };
    data.columns[0].records[0].tags = ["a", "b"];
    const { columns } = readBackup(data);
    expect((columns[0] as any).futureColumnField).toEqual({ x: 1 });
    expect((columns[0].records![0] as any).tags).toEqual(["a", "b"]);
  });

  it("garbage is rejected", () => {
    expect(() => readBackup(null)).toThrow();
    expect(() => readBackup({ foo: 1 })).toThrow();
    expect(() => readBackup("text")).toThrow();
  });
});

describe("translations", () => {
  it("every language has exactly the same keys as English", () => {
    const dir = path.join(__dirname, "..", "assets", "locales");
    const keys = (l: string) => Object.keys(JSON.parse(fs.readFileSync(path.join(dir, l, "translations.json"), "utf8"))).sort();
    const en = keys("en");
    fs.readdirSync(dir).forEach((l) => expect([l, keys(l)]).toEqual([l, en]));
  });
});
