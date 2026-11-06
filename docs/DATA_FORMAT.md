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

`stamp`：`""`（空白）、`"important"`（急件，v2.3 前顯示為「特重要」）、`"done"`（完成）。

欄位的選填欄位 `width`（v2.4 起）：自訂欄寬（px），沒有這個欄位代表依視窗寬度自動分配。屬於 schema 1 的選填欄位，舊版讀到會原樣保留。

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

## 加密文字備份（v2.7 起，`JKB1`）

備份選單的「加密文字匯出 / 匯入」：把與 JSON 備份相同的內容壓縮、加密成一段純文字。

| 步驟 | 演算法 |
|---|---|
| 壓縮 | deflate-raw（瀏覽器內建 `CompressionStream`；不支援時不壓縮，以旗標記錄） |
| 金鑰 | PBKDF2-SHA256，隨機 16 bytes salt，預設 600,000 次 → AES-256 |
| 加密 | AES-256-GCM，隨機 12 bytes IV；`JKB1\|迭代次數\|匯出時間` 作為附加驗證資料（AAD），時間戳記被改就無法解密 |

文字格式（匯入時只認 `JKB1|` 開頭的那一行，換行與空白會自動忽略）：

```
JimmysKanban 加密備份
2026/11/07 10:20:30
JKB1|600000|2026-11-07T02:20:30.123Z|<Base64URL( salt 16 | iv 12 | 密文 )>
```

解密後的內容是一般的 JSON 備份，照樣經過 `readBackup()` 的格式升級，所以舊版的加密文字以後也能匯入。
密文裡的明文第一個 byte 是壓縮旗標（0 = 未壓縮、1 = deflate-raw）。新的演算法只能用新的前綴（例如 `JKB2`），`JKB1` 的解法不可改變。

## 活動紀錄（本機 `kv["activity"]`）

`{ since: "YYYY-MM-DD", days: { "YYYY-MM-DD": 次數 } }`，只存在本機、不進備份。開始記錄前的日子由便條紙時間推算。
