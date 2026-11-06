import { describe, expect, it } from "vitest";
import moment from "moment";

import { buildDaily, buildWeeks, countFromRecords, levelOf, summarize, yearsWithData } from "./Activity";
import { Column } from "PersonalKanban/types";

const local = (s: string) => moment(s, "YYYY-MM-DD HH:mm").toISOString();

const cols: Column[] = [
  {
    id: "A",
    title: "A",
    records: [
      { id: "1", title: "a", createdAt: local("2026-01-01 09:00"), updatedAt: local("2026-01-01 09:00") },
      { id: "2", title: "b", createdAt: local("2026-01-01 10:00"), updatedAt: local("2026-01-03 10:00"), completedAt: local("2026-01-05 08:00"), stamp: "done" },
      { id: "3", title: "c", createdAt: "05-01-2026 3:00:00 pm" }, // 原版時間格式
    ],
  },
];

describe("activity", () => {
  it("derives history from created / updated / completed times", () => {
    expect(countFromRecords(cols)).toEqual({ "2026-01-01": 2, "2026-01-03": 1, "2026-01-05": 2 });
  });
  it("uses the recorded log from its start day, history before it", () => {
    const daily = buildDaily(cols, { since: "2026-01-03", days: { "2026-01-03": 4, "2026-01-04": 2 } });
    expect(daily).toEqual({ "2026-01-01": 2, "2026-01-03": 4, "2026-01-04": 2 });
  });
  it("maps counts to 0-4 levels", () => {
    expect([0, 1, 2, 3, 4].map((n) => levelOf(n, 4))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 30, 60, 100].map((n) => levelOf(n, 100))).toEqual([0, 1, 2, 3, 4]);
  });
  it("builds 53 Sunday-first weeks ending on the given day", () => {
    const weeks = buildWeeks(moment("2026-11-07", "YYYY-MM-DD"));
    expect(weeks.length).toBe(53);
    expect(weeks.every((w) => w.length === 7 && w[0].date.day() === 0)).toBe(true);
    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek.find((c) => c.day === "2026-11-07")!.future).toBe(false);
    expect(lastWeek.filter((c) => c.future).length).toBe(0); // 2026-11-07 是週六
  });
  it("summarizes totals and streaks", () => {
    const daily = { "2026-01-01": 2, "2026-01-02": 1, "2026-01-03": 5, "2026-01-05": 1, "2026-01-06": 1 };
    expect(summarize(daily, "2026-01-01", "2026-01-06", "2026-01-06")).toEqual({
      total: 10,
      activeDays: 5,
      longest: 3,
      current: 2,
      busiest: { day: "2026-01-03", count: 5 },
    });
    expect(yearsWithData({ "2024-02-01": 1, "2026-01-01": 1 })).toEqual(["2026", "2024"]);
  });
});
