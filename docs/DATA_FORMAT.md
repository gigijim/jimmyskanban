# 資料格式與相容性規則

目標：**任何時候匯出的備份檔，之後所有版本都能匯入**；改版不會弄壞使用者的資料。

## 兩種版本號

| 名稱 | 位置 | 什麼時候改 |
|---|---|---|
| 程式版本 `version` | `package.json` | 每次發佈新功能 / 修正（顯示在「檢查更新」） |
| 資料格式版本 `SCHEMA_VERSION` | `src/PersonalKanban/services/schemaVersion.ts` | **只有資料結構改變時**才 +1 |

| SCHEMA | 說明 |
|---|---|
| 0 | 原版 Personal Kanban：localStorage `columns` 陣列，時間為 `DD-MM-YYYY h:mm:ss a` |
| 1 | JimmysKanban v2：便條紙加 `updatedAt` / `completedAt` / `stamp`，時間為 ISO 8601 |

## 備份檔格式（schema 1）

```json
{
  "app": "JimmysKanban",
  "format": "jimmyskanban-backup",
  "schemaVersion": 1,
  "appVersion": "2.1.0",
  "exportedAt": "2026-11-06T12:00:00.000Z",
  "columns": [
    {
      "id": "…", "title": "待辦", "description": "", "color": "Orange",
      "wipEnabled": false, "wipLimit": 0, "createdAt": "ISO",
      "records": [
        { "id": "…", "title": "…", "description": "", "color": "Yellow",
          "createdAt": "ISO", "updatedAt": "ISO", "completedAt": "ISO 或 null",
          "stamp": "" }
      ]
    }
  ]
}
```

`stamp`：`""`（無）、`"important"`（特重要）、`"done"`（已完成!）。

匯入也接受：原版的 `columns` 陣列、從原版網站匯出的 `{ "app": "PersonalKanban-export", "columns": [...] }`、v2.0 沒有 `schemaVersion` 的備份。

## 本機資料庫（IndexedDB `jimmyskanban`，object store `kv`）

| key | 內容 |
|---|---|
| `columns` | 整個看板（與備份檔的 `columns` 相同） |
| `meta` | `{ schemaVersion }`，沒有這個 key 代表 v2.0（schema 1） |
| `snapshots` | 自動快照陣列 `{ id, at, reason, schemaVersion, columns }`，最多 20 份 |

新版程式啟動時，若 `meta.schemaVersion` 比程式舊，會先存一份 `beforeMigration` 快照，再自動升級資料。

## 改版時必須遵守

1. **只新增欄位，不改名、不刪除、不改變既有欄位的意義或型別。** 新欄位一律是可省略的（舊資料沒有它也要能運作）。
2. 不認得的欄位會被原樣保留（`normalizeColumns` 會 `...` 展開保留），所以新版備份匯入舊版也不會掉資料。
3. 真的需要改結構時：
   - `SCHEMA_VERSION` +1
   - 在 `Schema.ts` 的 `MIGRATIONS` **新增**一個 `舊版本 → 新版本` 的轉換函式（不要修改舊的轉換函式）
   - 把新格式的備份範例放進 `services/__fixtures__/`，檔名 `schema<N>-說明.json`
4. `__fixtures__` 裡的檔案**只能新增，不能修改或刪除**。`Schema.test.ts` 會逐一確認它們都還能匯入；測試沒過，GitHub Actions 就不會發佈。
5. 備份檔的 `schemaVersion` 比程式新時，程式會拒絕匯入並提示「請先檢查更新」，不會用舊程式硬讀而弄壞資料。

## 更新機制（給維護者）

- `public/sw.js` **在各版本間保持不變**，所以瀏覽器不會在背景自動換版本。
- 每次建置會產生 `asset-manifest.json`（版本、建置編號、資料格式版本、檔案清單）。
- 使用者按右上角「檢查更新」→ 讀取 `asset-manifest.json` 比對建置編號；按「立即更新」→ 先存 `beforeUpdate` 快照 → Service Worker 下載新清單的全部檔案到新快取 → 切換 → 重新載入。下載失敗時不會切換，舊版照常可用。
- 單一 HTML 檔版無法自我更新，只會提示並提供下載連結。
