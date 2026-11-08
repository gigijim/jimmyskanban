/**
 * 版本更新紀錄（右上角 GitHub 按鈕打開的視窗）
 * 新版本加在最上面；tw = 繁體中文，en = 英文（日文介面也顯示英文）。
 */
export type ChangelogEntry = {
  version: string;
  date: string;
  tw: string[];
  en: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.8.1",
    date: "2026-11-08",
    tw: ["右上角所有按鈕滑鼠移過去都有說明提示", "新增欄位按鈕放大，並與右側功能按鈕以分隔線區隔", "重新設計資料匯入 / 匯出圖示（資料庫 ⇄ 文件）", "視窗標題改為「Offline-Kanban 離線式個人看板」，不再重複", "刪除欄位改名「刪除整條欄位(含便條)」，跳出紅色警告並先自動存快照", "欄位標題字體放大加粗；進行中 / 已完成改為藍 / 綠彩色標籤，便條數改為同色醒目徽章"],
    en: ["Tooltips on every toolbar button", "Larger add-column button, separated from the other buttons", "New import / export icon (database ⇄ document)", "Window title is now \"Offline-Kanban 離線式個人看板\" without repetition", "\"Delete whole column (with cards)\" shows a red warning and saves a snapshot first", "Larger column titles; blue / green labels and bold count badges for In progress / Done"],
  },
  {
    version: "2.8.0",
    date: "2026-11-08",
    tw: [
      "左上角標題可自訂（點兩下修改），只存在本機",
      "GitHub 按鈕改為顯示版本更新紀錄，並附 GitHub 連結",
      "語言只保留繁體中文、English、日本語",
    ],
    en: [
      "Custom board title (double-click to edit), stored on this device only",
      "GitHub button now shows this changelog with a link to the repository",
      "Languages reduced to Traditional Chinese, English and Japanese",
    ],
  },
  {
    version: "2.7.3",
    date: "2026-11-07",
    tw: ["「Done!」印章改用粗獷的 Black Ops One 字體（內建，離線可用）"],
    en: ["Bold Black Ops One font for the Done! stamp (bundled, works offline)"],
  },
  {
    version: "2.7.2",
    date: "2026-11-07",
    tw: ["移除欄位的鉛筆按鈕，改為點兩下欄位標題進入編輯"],
    en: ["Double-click a column title to edit it (pencil button removed)"],
  },
  {
    version: "2.7.1",
    date: "2026-11-07",
    tw: ["修正新增便條後畫面自動跳到已完成區的問題"],
    en: ["Fixed the page jumping to the done area after closing a dialog"],
  },
  {
    version: "2.7.0",
    date: "2026-11-07",
    tw: ["活動紀錄熱度圖（類似 GitHub）", "深色高對比模式", "加密壓縮文字匯出 / 匯入", "完成印章改為「Done!」"],
    en: ["GitHub-style activity heatmap", "High-contrast dark mode", "Encrypted, compressed text export / import", "Done stamp now reads \"Done!\""],
  },
  {
    version: "2.6.1",
    date: "2026-11-07",
    tw: ["已完成便條的標題不再有刪除線"],
    en: ["No strikethrough on done card titles"],
  },
  {
    version: "2.6.0",
    date: "2026-11-07",
    tw: ["依色彩學新增更多便條與欄位顏色（色票選擇）", "移除 WIP 進行中上限功能"],
    en: ["More card and column colours as swatches", "Removed WIP limits"],
  },
  {
    version: "2.5.0",
    date: "2026-11-07",
    tw: ["標題旁新增搜尋框，支援模糊搜尋，結果依欄位分類"],
    en: ["Fuzzy search box next to the title, results grouped by column"],
  },
  {
    version: "2.4.0",
    date: "2026-11-07",
    tw: [
      "欄位標題完整顯示、新增按鈕移到右側並放大",
      "刪除欄位移到編輯視窗；移除刪除全部便條按鈕",
      "欄寬可拖曳調整、捲動時欄位標題固定在上方",
      "便條垃圾桶滑鼠移過顯示紅色",
    ],
    en: [
      "Full column titles, larger add button on the right",
      "Column delete moved into the edit dialog; delete-all removed",
      "Resizable columns and sticky column headers",
      "Card trash icon turns red on hover",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-11-06",
    tw: ["更換更新與備份按鈕圖示"],
    en: ["New icons for the update and backup buttons"],
  },
  {
    version: "2.3.1",
    date: "2026-11-06",
    tw: ["便條跨欄位移動時保留印章與所有時間"],
    en: ["Moving a card to another column keeps its stamp and times"],
  },
  {
    version: "2.3.0",
    date: "2026-11-06",
    tw: [
      "每欄保留 6 張進行中便條的空間，已完成區對齊同一水平線",
      "印章改為空白 / 急件 / 完成，點擊後由小選單選取",
      "便條顯示更多內文，只顯示建立時間，滑鼠提示完整時間",
      "編輯視窗可修改時間、內文輸入框加高",
    ],
    en: [
      "Six reserved active slots per column; done sections aligned",
      "Stamps 空白 / 急件 / 完成 chosen from a small menu",
      "More card text; created time on card, all times in the tooltip",
      "Editable times and a taller description box",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-11-06",
    tw: ["已完成便條套用灰色", "緊湊排版，不縮放也能看到所有欄位"],
    en: ["Done cards are greyed out", "Compact layout so all columns fit"],
  },
  {
    version: "2.1.0",
    date: "2026-11-06",
    tw: ["手動檢查更新按鈕", "版本化的資料格式，舊備份永遠可匯入"],
    en: ["Manual update button", "Versioned data format; old backups always import"],
  },
  {
    version: "2.0.0",
    date: "2026-11-06",
    tw: ["以原版 Personal Kanban 原始碼重建並延伸功能"],
    en: ["Rebuilt on the original Personal Kanban source"],
  },
  {
    version: "1.0.0",
    date: "2026-11-06",
    tw: ["JimmysKanban 首版：離線看板（PWA + 單一檔案版）"],
    en: ["First release: offline kanban (PWA + single file)"],
  },
];
