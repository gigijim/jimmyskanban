# JimmysKanban 離線看板

以 [nishantpainter/personal-kanban](https://github.com/nishantpainter/personal-kanban)（MIT）為基礎延伸，
**保留原版的介面與操作方式**（Material-UI 外觀、欄位與便條紙的新增 / 編輯 / 刪除對話框、拖曳排序、深色模式、多語系），
再加上離線安裝、本機資料庫與備份功能。

**👉 線上使用 / 安裝：https://gigijim.github.io/jimmyskanban/**

## 新增功能

| 功能 | 說明 |
|---|---|
| 三個時間 | 每張便條紙顯示「建立」「修改」「完成」時間；編輯視窗顯示到秒 |
| 欄位上下分區 | 每個欄位分成上方「進行中」、下方「已完成」；完成區依完成時間新→舊排序 |
| 標題加寬 | 欄寬 250px → 320px，標題由單行截斷改為最多兩行 |
| 右下角印章 | 點一下循環「無 → 特重要 → 已完成!」；也可在編輯視窗選擇。標成已完成會自動移到該欄下方完成區；拖進完成區＝完成，拖出＝取消完成 |
| WIP 上限 | 只計算「進行中」的便條紙 |
| 本機資料庫 | IndexedDB（取代原版 localStorage）；會自動搬入原版 Personal Kanban 的舊資料 |
| 備份 / 匯入 / 匯出 | 工具列 ☁ 按鈕：備份 JSON、匯出 CSV（Excel 不亂碼）、匯入（取代 / 合併）、自動快照與還原 |
| 繁體中文 | 新增繁體中文介面，瀏覽器為 zh-TW 時自動使用 |

為了離線與資安考量，移除了原版會連外的部分：Google Fonts（改為內建字型）、Google Analytics、Tiny Manager 廣告按鈕與外部圖片。

## 安裝方式（都不需要擴充套件、不需要系統管理員權限）

1. **網頁一鍵安裝（PWA）**：用 Edge / Chrome 開啟上方網址 → 工具列的 ⬇ 安裝按鈕（或網址列右側的「安裝」圖示）。之後從開始功能表 / 桌面開啟，離線也能用。
2. **單一 HTML 檔**：下載 https://gigijim.github.io/jimmyskanban/jimmyskanban-offline.html （另存新檔），放在桌面或網路磁碟，雙擊開啟。適合完全不能上網的電腦。
3. **內網自架**：`npm run build` 後把 `dist/` 放到任何靜態網站伺服器（IIS、Nginx…）。

> 不同開啟方式（網址 / 單檔）的資料庫是分開的，要搬資料請用「備份 → 匯入」。

## 開發

```bash
npm install
npm run dev        # http://localhost:8080
npm test           # 資料邏輯單元測試（vitest）
npm run build      # dist/（PWA）與 dist-single/index.html（單一檔）
```

推送到 `main` 後，GitHub Actions 會自動測試、建置並發布到 GitHub Pages。
