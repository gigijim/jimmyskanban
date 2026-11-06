/**
 * 活動紀錄（類似 GitHub contributions）
 *
 * 每天的活動次數來源：
 * - 開始記錄（log.since）之後：實際記錄的每一次操作（新增 / 編輯 / 蓋章 / 移動 / 刪除便條紙）
 * - 開始記錄之前：從便條紙的建立、最後修改、完成時間推算（舊資料也看得到歷史）
 * - 開始記錄的那一天：取兩者較大的值
 */
import moment from "moment";

import { Column } from "PersonalKanban/types";
import { parseTime } from "PersonalKanban/services/Utils";

export type ActivityLog = { since: string; days: { [day: string]: number } };

export const DAY = "YYYY-MM-DD";

export const dayKey = (value?: string | Date | null) => {
  if (!value) return null;
  const m = value instanceof Date ? moment(value) : parseTime(value);
  return m && m.isValid() ? m.format(DAY) : null;
};

/** 從便條紙時間推算每天的活動數 */
export const countFromRecords = (columns: Column[]) => {
  const out: { [day: string]: number } = {};
  const add = (v?: string | null) => {
    const d = dayKey(v);
    if (d) out[d] = (out[d] || 0) + 1;
  };
  columns.forEach((c) =>
    (c.records || []).forEach((r) => {
      add(r.createdAt);
      if (r.updatedAt && r.updatedAt !== r.createdAt && r.updatedAt !== r.completedAt) add(r.updatedAt);
      if (r.completedAt) add(r.completedAt);
    })
  );
  return out;
};

export const buildDaily = (columns: Column[], log?: ActivityLog | null) => {
  const history = countFromRecords(columns);
  if (!log) return history;
  const out: { [day: string]: number } = {};
  Object.keys(history).forEach((d) => {
    if (d < log.since) out[d] = history[d];
  });
  Object.keys(log.days).forEach((d) => {
    if (d >= log.since) out[d] = log.days[d];
  });
  out[log.since] = Math.max(history[log.since] || 0, log.days[log.since] || 0) || 0;
  if (!out[log.since]) delete out[log.since];
  return out;
};

/** 0~4 級顏色：依有活動日子的分布切成四段（與 GitHub 相同的做法） */
export const levelOf = (count: number, max: number) => {
  if (!count) return 0;
  if (max <= 4) return Math.min(4, count);
  const r = count / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
};

/** 日曆格：每欄一週（週日開始），最後一欄包含 end 那天 */
export const buildWeeks = (end: moment.Moment, weeks = 53) => {
  const last = end.clone().startOf("day");
  const start = last.clone().subtract(weeks - 1, "weeks").startOf("week"); // moment 預設週日開始
  const out: { day: string; date: moment.Moment; future: boolean }[][] = [];
  const cur = start.clone();
  while (cur.isSameOrBefore(last, "day") || cur.day() !== 0) {
    if (cur.day() === 0) out.push([]);
    out[out.length - 1].push({ day: cur.format(DAY), date: cur.clone(), future: cur.isAfter(last, "day") });
    cur.add(1, "day");
  }
  return out;
};

export const summarize = (daily: { [day: string]: number }, from: string, to: string, today: string) => {
  let total = 0;
  let activeDays = 0;
  let busiest = { day: "", count: 0 };
  let longest = 0;
  let run = 0;
  const cur = moment(from, DAY);
  const end = moment(to, DAY);
  while (cur.isSameOrBefore(end, "day")) {
    const d = cur.format(DAY);
    const n = daily[d] || 0;
    total += n;
    if (n) {
      activeDays++;
      run++;
      longest = Math.max(longest, run);
      if (n > busiest.count) busiest = { day: d, count: n };
    } else {
      run = 0;
    }
    cur.add(1, "day");
  }
  // 目前連續天數：從今天（今天還沒活動就從昨天）往回數
  let current = 0;
  const back = moment(today, DAY);
  if (!daily[today]) back.subtract(1, "day");
  while (daily[back.format(DAY)]) {
    current++;
    back.subtract(1, "day");
  }
  return { total, activeDays, longest, current, busiest };
};

export const yearsWithData = (daily: { [day: string]: number }) =>
  Array.from(new Set(Object.keys(daily).map((d) => d.slice(0, 4))))
    .sort()
    .reverse();
