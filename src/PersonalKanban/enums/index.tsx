import * as c from "@material-ui/core/colors";

/**
 * 便條紙 / 欄位配色
 *
 * 依色相環排列（紅 → 粉 → 紫 → 藍 → 青 → 綠 → 黃 → 橙 → 棕 → 中性色），
 * 同一組裡每個顏色都用相同的 Material 色階，明度一致、彼此不搶眼：
 * - 便條紙：淺色模式 200（粉彩，文字清楚）／深色模式 500 左右
 * - 欄位：  淺色模式 100（比便條紙更淡，當背景襯托卡片）／深色模式 400 左右
 * 太亮的黃綠色系在深色模式改用較深色階，白字才看得清楚。
 *
 * 顏色的 key 會存進資料（例如 "Blue"），已存在的 key 不可改名；
 * 新顏色只能加在這裡，舊版讀到不認得的 key 會顯示預設底色（不會出錯）。
 */
type Hue = keyof typeof HUES;

const HUES = {
  Red: c.red,
  Pink: c.pink,
  Purple: c.purple,
  DeepPurple: c.deepPurple,
  Indigo: c.indigo,
  Blue: c.blue,
  LightBlue: c.lightBlue,
  Cyan: c.cyan,
  Teal: c.teal,
  Green: c.green,
  LightGreen: c.lightGreen,
  Lime: c.lime,
  Yellow: c.yellow,
  Amber: c.amber,
  Orange: c.orange,
  DeepOrange: c.deepOrange,
  Brown: c.brown,
  BlueGrey: c.blueGrey,
  Grey: c.grey,
};

// 深色模式下太亮的色系改用較深色階
const DARK_RECORD_OVERRIDE: { [k in Hue]?: keyof typeof c.red } = {
  Cyan: 700,
  LightBlue: 700,
  LightGreen: 700,
  Lime: 800,
  Yellow: 800,
  Amber: 800,
  Orange: 700,
  Grey: 600,
};
const DARK_COLUMN_OVERRIDE: { [k in Hue]?: keyof typeof c.red } = {
  Cyan: 700,
  LightBlue: 600,
  LightGreen: 700,
  Lime: 800,
  Yellow: 800,
  Amber: 800,
  Orange: 600,
  Grey: 600,
};

const build = (shade: keyof typeof c.red, override: { [k in Hue]?: keyof typeof c.red } = {}) => {
  const out = { Default: "" } as { [k in Hue | "Default"]: string };
  (Object.keys(HUES) as Hue[]).forEach((k) => {
    out[k] = (HUES[k] as any)[override[k] || shade];
  });
  return out;
};

export const RecordColor = build(200);
export const ColumnColor = build(100);

// 深色模式：在 Apple 深灰表面上疊一層原本的色相（像 macOS 的帶色側欄），白字對比清楚
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (color: string, base: string, amount: number) => {
  const a = hex(color);
  const b = hex(base);
  return "#" + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, "0")).join("");
};
const tint = (source: { [k: string]: string }, base: string, amount: number) => {
  const out: any = {};
  Object.keys(source).forEach((k) => (out[k] = source[k] ? mix(source[k], base, amount) : base));
  return out as typeof source;
};
export const DarkRecordColor = tint(build(400, DARK_RECORD_OVERRIDE), "#2C2C2E", 0.42);
export const DarkColumnColor = tint(build(400, DARK_COLUMN_OVERRIDE), "#1C1C1E", 0.2);

/** 顏色名稱（色票的滑鼠提示） */
export const ColorName: { [k in Hue | "Default"]: string } = {
  Default: "預設 Default",
  Red: "紅 Red",
  Pink: "粉紅 Pink",
  Purple: "紫 Purple",
  DeepPurple: "深紫 Deep Purple",
  Indigo: "靛藍 Indigo",
  Blue: "藍 Blue",
  LightBlue: "淺藍 Light Blue",
  Cyan: "青 Cyan",
  Teal: "藍綠 Teal",
  Green: "綠 Green",
  LightGreen: "淺綠 Light Green",
  Lime: "萊姆 Lime",
  Yellow: "黃 Yellow",
  Amber: "琥珀 Amber",
  Orange: "橙 Orange",
  DeepOrange: "深橙 Deep Orange",
  Brown: "棕 Brown",
  BlueGrey: "藍灰 Blue Grey",
  Grey: "灰 Grey",
};

/** 已完成便條紙：疊在原本底色上的深灰色濾層，仍隱約透出原本的顏色 */
export const DONE_OVERLAY = "linear-gradient(rgba(125,125,125,.78), rgba(125,125,125,.78))";
export const DARK_DONE_OVERLAY = "linear-gradient(rgba(10,10,10,.62), rgba(10,10,10,.62))";
