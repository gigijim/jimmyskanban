import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

import { decryptFromText, encryptToText, peekText, SecureDecryptError, SecureFormatError } from "./SecureText";
import { makeBackup, readBackup } from "./Schema";

const FAST = { iterations: 2000 }; // 測試用較少迭代次數；正式匯出用預設 600,000
const NOW = "2026-11-07T02:20:30.123Z";

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "__fixtures__", "schema1-jimmyskanban-v2.1.0.json"), "utf8")
);

describe("encrypted text backup", () => {
  it("round-trips a backup and keeps the timestamp", async () => {
    const backup = makeBackup(readBackup(fixture).columns, "test");
    const { text, exportedAt } = await encryptToText(backup, "p@ss 密碼", { ...FAST, now: NOW });
    expect(exportedAt).toBe(NOW);
    expect(text).toMatch(/^JimmysKanban encrypted backup\n/);
    expect(text).toContain(`JKB1|2000|${NOW}|`);
    expect(peekText(text)).toEqual({ exportedAt: NOW, iterations: 2000 });
    const out = await decryptFromText(text, "p@ss 密碼");
    expect(out.exportedAt).toBe(NOW);
    expect(readBackup(out.data).columns).toEqual(readBackup(backup).columns);
  });

  it("is compressed (much shorter than the JSON as base64)", async () => {
    const big = { columns: Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, title: "重複的欄位標題 repeated", records: [] })) };
    const { text } = await encryptToText(big, "x", FAST);
    expect(text.length).toBeLessThan(JSON.stringify(big).length / 2);
  });

  it("ignores line breaks and spaces added when pasting", async () => {
    const { text } = await encryptToText({ a: 1 }, "pw", FAST);
    const wrapped = text.replace(/(.{20})/g, "$1\n  ");
    expect((await decryptFromText(wrapped, "pw")).data).toEqual({ a: 1 });
  });

  it("rejects a wrong password", async () => {
    const { text } = await encryptToText({ a: 1 }, "right", FAST);
    await expect(decryptFromText(text, "wrong")).rejects.toBeInstanceOf(SecureDecryptError);
  });

  it("detects a tampered timestamp", async () => {
    const { text } = await encryptToText({ a: 1 }, "pw", { ...FAST, now: NOW });
    const forged = text.replace(`|${NOW}|`, "|2020-01-01T00:00:00.000Z|");
    await expect(decryptFromText(forged, "pw")).rejects.toBeInstanceOf(SecureDecryptError);
  });

  it("uses a fresh salt and IV each time", async () => {
    const a = await encryptToText({ a: 1 }, "pw", { ...FAST, now: NOW });
    const b = await encryptToText({ a: 1 }, "pw", { ...FAST, now: NOW });
    expect(a.text).not.toBe(b.text);
  });

  it("rejects text that is not an encrypted backup", async () => {
    await expect(decryptFromText("hello", "pw")).rejects.toBeInstanceOf(SecureFormatError);
    expect(peekText("hello")).toBeNull();
  });
});
