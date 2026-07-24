# T269 PWA Manifest 更新閉環

版本：v5.0 ｜ 難度：★★ ｜ 前置：T268 ｜ 寫者：GPT

## 目標

讓已受 Service Worker 控制的客戶端在線時確實取得最新 `manifest.json`，離線時仍能回退，
並把 manifest 的導航 scope 與既有 Service Worker scope 明確對齊：

- `manifest.json` 顯式加入可攜的相對 `scope:"./"`，保留既有 `start_url:"./index.html"`。
- 刻意不新增 `id`：本專案可部署於任意子目錄，而 manifest `id` 的相對 URL 以
  `start_url` 的 origin 根為 base，不以 manifest 目錄為 base；盲填 `./index.html`
  會把 `/glimmer-town/index.html` 身分改成 `/index.html`。
- Service Worker 對 canonical manifest 採 network-first：成功的 2xx 回應 best-effort
  回寫 canonical manifest key；HTTP 4xx/5xx 照實返回且不污染快取；只有 fetch reject
  才讀離線快取。
- cache 升到專屬 v4，安裝中的新 worker 不與 v3 共寫同一個 Cache Storage。
- 不擴張到圖示資產：192／512 PNG 與獨立 maskable 圖示留給下一張卡處理。

本卡不改遊戲模擬、亂數、Canvas、存檔 schema、localStorage、玩家槽位或 `index.html`。

## 現況故障

1. T268 已讓 HTML 導航 network-first，但 manifest 仍走一般 app-shell cache-first。
2. 已受控頁面再次抓 manifest 時可能長期命中安裝期的舊 metadata。
3. `manifest.json` 沒有顯式 `scope`；目前雖由 `start_url` 推導出相同目錄，但欠缺靜態契約。
4. 若只改策略卻沿用 v3，新舊 worker 會在 install 階段共寫同一 cache，破壞版本隔離。
5. 可攜子目錄部署沒有一個固定 root-relative `id` 可安全寫死。

## 策略規格

```text
manifest:
  start_url = "./index.html"  // 不變
  scope = "./"
  id absent                  // fallback identity 繼續等於 resolved start_url

cache:
  current = glimmerville-shell-v4
  activate 精確刪除專屬舊版與 legacy gv-v1/gv-v2

fetch canonical manifest:
  try network
    if response.ok:
      best-effort put clone under canonical manifest URL
    return network response even if cache.put fails
  catch fetch rejection
    return canonical cached manifest
    if cache absent:
      return valid JSON 503 explanation
```

## 允許觸摸

- `manifest.json`：只新增 `scope:"./"`。
- `sw.js`：cache v4 與 manifest 專用 network-first／offline fallback。
- `test_fixde.js`：更新 T268 當前 cache 斷言，新增 T269 manifest／VM 行為測試。
- 本任務卡；全部驗收完成後才可在 `docs/CHANGELOG.md` 頂部追加一行。

## 硬性不變量

1. 單寫者：只有主代理寫檔；子代理只讀。
2. 不刪除任何資料夾；不清站點資料；真瀏覽器只用 `127.0.0.1:8123`。
3. `index.html` 與 `index.pre-T269.html` SHA-256 必須完全一致。
4. 不新增、移動或補償 `R()`／`ri()`／`Math.random()` 呼叫。
5. `start_url`、name、short_name、display、orientation、顏色與 icons 逐值不變。
6. 不新增 manifest `id`；正式部署路徑固定且實看 Chrome Computed App Id 前不得猜測。
7. HTTP 錯誤不得用舊 manifest 掩蓋；cache 寫入失敗不得吞掉成功網路回應。
8. activate 不得用寬泛 `gv-` 前綴刪除 foreign cache。
9. 不新增 GV 修改鉤子，不碰 save/load/localStorage。

## 驗收

1. 修改前基線 `791 PASS / 0 FAIL`；修改後只增不減。
2. `sw.js`、`test_fixde.js` 語法、manifest JSON parse 與 `git diff --check` 通過。
3. 在兩個不同深度的部署 base 下，`scope:"./"` 都解析為 manifest 所在應用目錄，
   `start_url` 在 scope 內，缺省 identity 仍等於 resolved start URL。
4. 與 `manifest.pre-T269.json` 比對，除新增 scope 外其他欄位逐值完全一致。
5. install 開啟 v4 並預快取既有三個 app-shell URL；activate 刪專屬 v3、
   保留 v4／`gv-other-app`／任意 foreign cache。
6. 在線 manifest query 回傳 fresh 並更新 canonical key。
7. 模擬 cache.put 拒絕時仍回 fresh；HTTP 503 照實返回且不覆蓋已快取 manifest。
8. fetch reject 時 manifest query 回退 canonical；快取缺失時回 valid JSON 503。
9. T268 的導航、request gates、legacy cleanup、503 與 foreign-cache 測試持續通過。
10. 真瀏覽器以短命專案內探針預植 stale manifest，確認在線 fetch 得 fresh 並回寫；
    精確停服後再次 fetch query 得同一 cached manifest；重啟後 Console error 0。
11. 探針與其 cache 測試資料在卡尾清理；槽 1／2 完全不觸碰。

## 官方依據

- W3C Web App Manifest：`id` 預設為 `start_url`，顯式相對 id 以 start URL 的 origin
  為 base；`scope` 建議明確且以 `/` 結尾：
  https://www.w3.org/TR/appmanifest/
- Chrome for Developers：既有 PWA 加 id 前應核對 Computed App Id：
  https://developer.chrome.com/docs/capabilities/pwa-manifest-id
- web.dev：manifest scope／start_url／更新：
  https://web.dev/articles/add-manifest
  https://web.dev/learn/pwa/update

## 回退點

- `backups/index.pre-T269.html`
  - SHA-256：`3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`
  - 大小：1,189,179 bytes
- `backups/sw.pre-T269.js`
  - SHA-256：`3E849CC8568C8F322AAEE1185941C531DA1D11A58E755D3176CFDF65107AF4C7`
  - 大小：2,116 bytes
- `backups/manifest.pre-T269.json`
  - SHA-256：`5D1FCF63592918A894222B3FCD79923311397ACD30ACC7328F3C770D168EF35A`
  - 大小：363 bytes
- `backups/test_fixde.pre-T269.js`
  - SHA-256：`F06F2D1C8962F6B39FCF8DD37F00DA583F49AF7DA3EB5F5DB4D6E53E66964673`
  - 大小：83,920 bytes

## 停手／回滾

- 任一既有 791 斷言失敗且無法定位，停止並只回退本卡三個實作／測試文件。
- 若 manifest identity、start_url 或 scope 越出應用目錄；HTTP 錯誤被舊 metadata
  掩蓋；foreign cache 被刪；或離線 manifest 無法回退，整卡回退。
- 不得用整檔備份覆蓋 T270 之後的成果。

## 完成實錄（2026-07-23）

- 基線 `791 PASS / 0 FAIL`；完成後 `812 PASS / 0 FAIL`，新增 21 個 T269 斷言。
- `manifest.json` 只新增 `scope:"./"`；`index.html` 與 T269 備份同為
  `3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`，位元組完全相同。
- v4 VM 實證：v3／legacy 精確清理、foreign cache 保留、在線 fresh 回寫 canonical、
  fetch reject fallback、HTTP 503 不污染、`cache.put` 拒絕仍回 fresh。
- 第一輪唯讀終審抓到 `caches.open()` 位於 network fetch 前的 blocker；已改為 network
  最外層、cache open／put／match 全部 best-effort，並新增故障注入：Cache Storage open
  拒絕時在線仍回 network，離線則回 valid JSON 503。第二次獨立對抗審查再用 201
  驗證 `.ok` 語義，並要求硬鎖 backup SHA／既有 start_url；兩項 guard 已補，最終 812/812。
- 真 Chrome `127.0.0.1:8123`：query worker 在線將人工 stale manifest 更新為 fresh，
  canonical cache 同步，v3 被刪且 foreign sentinel 保留；精確停服後同頁 fetch query
  仍得到狀態 200 的同一 manifest。伺服器以原工作目錄重啟後，canonical worker 還原、
  sentinel 清理，最後再以修正後 byte 版 query worker 驗證並還原；所有頁面 Console error 0。
- 兩個短命探針檔均已移除；最終 Cache Storage 只見 `glimmerville-shell-v4`，未碰 localStorage
  或任何玩家槽位。
