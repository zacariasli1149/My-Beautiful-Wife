# 老婆的小本本

記錄老婆說過的事：想去的地方、想吃的美食、禮物靈感、喜好與地雷、習慣小事、重要資訊（含每年倒數的紀念日）。
手機和電腦都可以「加入主畫面／安裝為 App」，**離線也能用**，連上網路後自動同步。

## 功能

- 心願清單：想去／想吃／禮物可以打勾完成，有進度圈和完成日期
- 一鍵 Google 地圖：用地點名稱搜尋，或貼上 Google 地圖分享連結
- 照片：新增或編輯時就能上傳（禮物可以拍款式），自動壓縮，在「回憶牆」集中瀏覽
- 快捷功能：「今天去哪玩？」「今天吃什麼？」隨機抽、送禮靈感頁、搜尋與 #標籤
- 設定與同步：狀態、上次同步時間、立即同步、這台裝置停止同步、下載備份／從備份還原

## 架構（和 Accounting-Book 相同）

| 部分 | 位置 |
|---|---|
| App（PWA、離線快取） | `public/`：`index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/` |
| 同步 API | `worker.js`（Cloudflare Worker），`/api/*` |
| 資料庫 | Durable Object（SQLite）：每筆資料一列、照片存成 BLOB |
| 部署設定 | `wrangler.jsonc` |

- App 資料先存在裝置上（資料在 localStorage、照片在 IndexedDB），之後在背景同步。
- 同步以「每一筆」為單位，比較最後修改時間，新的贏；刪除會留下標記，避免被其他裝置同步回來。
- 照片在上傳前先壓到 1.8MB 以下（SQLite 單一欄位上限 2MB）。

## 部署與密碼

1. Cloudflare Workers Builds 已連結這個 repo，push 之後重新部署即可（Deploy command：`npx wrangler deploy`）。
2. `wrangler.jsonc` 的 `name` 必須和 Cloudflare 上的 Worker 名稱一致（目前是 `my-beautiful-wife`）。
3. 設定同步密碼：Cloudflare 後台 → Workers & Pages → 這個 Worker → Settings → Variables and Secrets → Add → 類型選 **Secret**，名稱 `SYNC_PASSWORD`，值至少 8 個字元。
4. 每台裝置第一次打開 App →「她的檔案」右上角齒輪（或首頁的同步狀態）→ 輸入密碼 →「連線並同步」。
5. 密碼錯 10 次會鎖 15 分鐘。

## 本機測試

```
echo 'SYNC_PASSWORD=至少八個字元的密碼' > .dev.vars
npx wrangler dev
```

## 其他

- 根目錄的 `index.html` 是早期發布在 claude.ai 的版本（使用 claude.ai 的雲端資料庫），不會部署到 Cloudflare。
- 改版時記得把 `public/sw.js` 裡的 `VERSION` 加一，讓手機上的離線快取更新。
