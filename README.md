# JimmysKanban 離線看板

改寫自 [nishantpainter/personal-kanban](https://github.com/nishantpainter/personal-kanban)（MIT）。

**👉 線上使用 / 安裝：https://gigijim.github.io/jimmyskanban/**
原版是 React + Material-UI + localStorage；本版改成**零相依、無建置步驟**的純 HTML/CSS/JS，
專為「公司電腦擋 Chrome 擴充套件、不能裝軟體」的環境設計。

## 三種安裝方式（都不需要擴充套件、不需要系統管理員權限）

| 方式 | 適合 | 怎麼做 |
|---|---|---|
| **A. 網頁一鍵安裝（PWA）** | 能連到網址一次的電腦 | 用 Edge / Chrome 打開 **https://gigijim.github.io/jimmyskanban/** → 按右上角「📥 安裝到電腦」（或網址列的安裝圖示）。之後從開始功能表/桌面開啟，**完全離線可用** |
| **B. 單一 HTML 檔** | 完全不能上網、或網址被擋 | 下載 [`dist/jimmyskanban-offline.html`](dist/jimmyskanban-offline.html)（約 80 KB），放在桌面或網路磁碟，**雙擊即用** |
| **C. 內網自架** | 想給整個部門用 | 把整個資料夾放到任何靜態網頁伺服器（IIS、Nginx、內網 SharePoint 靜態站），或 `node tools/serve.js 8080` |

為什麼不容易被資安政策擋：
- 不是擴充套件、不是 .exe，不寫登錄檔、不需安裝權限（PWA 是瀏覽器內建功能）
- **不連任何外部網路**：沒有 CDN、沒有追蹤、沒有字型下載；PWA 版附嚴格 CSP（`default-src 'self'`）
- 資料只存在瀏覽器的 IndexedDB，不會上傳到任何地方

> 注意：A 與 B 的資料庫**各自獨立**（瀏覽器依網址來源分開保存）。要搬資料請用「備份 → 匯入」。

## 功能

- **便條紙三個時間**：建立時間、最後修改時間、完成時間（卡片下方簡寫，滑鼠停留/編輯視窗顯示完整時間）
- **欄位上下分區**：上方「進行中」、下方「已完成」；完成區依完成時間新→舊排序
- **標題拉寬**：預設欄寬 340px（原版 250px），標題最多顯示 3 行；欄寬可在 ⚙️ 設定中 260–560px 調整
- **右下角印章**：點一下循環「無 → 特重要 → 已完成! → 無」。標記已完成會自動移到該欄下方完成區；把卡片拖進完成區＝標記完成，拖出＝取消完成
- 拖曳便條紙 / 拖曳欄位標題調整順序、WIP 上限提示、便條紙顏色、搜尋（按 `/`）、深淺色主題
- `Ctrl+Z` / `Ctrl+Y` 復原/重做，`Ctrl+S` 立即備份

## 本機資料庫與備份

- 資料庫：IndexedDB 單一 object store，整個看板是一份 JSON 文件（IndexedDB 不可用時自動退回 localStorage）
- **手動備份**：💾 選單 →「備份（匯出 JSON）」。Edge/Chrome 會跳出「另存新檔」，可直接存到 OneDrive / 網路磁碟
- **彈性匯出**：JSON（完整備份）、CSV（Excel 可直接開，中文不亂碼）、Markdown（貼週報）
- **匯入**：「取代」或「合併」（以 id 比對，修改時間較新的勝出）。也能匯入**原版 personal-kanban** 的資料
- **自動快照**：每 30 分鐘、以及匯入 / 清空 / 還原前，自動在本機留一份（最多 20 份），可一鍵還原
- **備份提醒**：超過 N 天未備份會在上方提醒（設定中可調整或關閉）

## 開發

不需要 `npm install`（沒有任何相依套件），只要 Node 18+：

```bash
npm start          # http://localhost:8080
npm test           # 資料模型單元測試（node:test）
npm run build      # 產生 dist/jimmyskanban-offline.html
npm run icons      # 重新產生 icons/*.png
```

修改任何檔案後：遞增 `sw.js` 的 `CACHE` 版本號，並執行 `npm run build` 更新單檔版。

| 檔案 | 說明 |
|---|---|
| `js/model.js` | 純資料邏輯（欄位/便條紙/印章/排序/匯入正規化/CSV/Markdown），有單元測試 |
| `js/storage.js` | IndexedDB 存取、自動快照、持久保存 |
| `js/io.js` | 匯出入檔案 |
| `js/app.js` | 介面與拖曳 |
| `sw.js` | Service Worker（離線快取） |
