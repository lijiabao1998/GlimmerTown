# T268 PWA 快取生命週期與離線入口

版本：v5.0 ｜ 難度：★★★ ｜ 前置：T267 ｜ 寫者：GPT

## 目標

把目前「能註冊但容易永遠卡舊版」的 Service Worker 收斂成可更新、可離線、且不誤傷
同源其他快取的最小 PWA 殼層：

- 舊共用名稱遷移到專屬 `glimmerville-shell-v3`，安裝時只預快取 canonical
  `index.html`、manifest 與 icon；scope 根路徑離線時統一回退 canonical index，不重複預抓。
- 導航採 network-first：在線優先取得最新版並回寫 canonical `index.html`，離線時由
  canonical 快取承接 `/`、`index.html?query` 與 PWA `start_url`。
- 非導航只接管三個明確 app-shell 路徑並採 cache-first／忽略 query；非 GET、跨源、
  scope 外及任意其他同源資源完全不攔截。
- activate 只刪除本專案專屬前綴舊版，以及精確 legacy `gv-v1`／`gv-v2`；
  不以寬泛 `gv-*` 規則誤刪同源其他應用／測試快取。
- `skipWaiting()` 與 `clients.claim()` 都納入對應 `waitUntil()` 的生命週期 Promise。
- 頁面以 `scope:'./'`、`updateViaCache:'none'` 註冊，非安全情境或註冊失敗時留下可見警告。
- 更正 README：手機開 `http://<電腦IP>` 可玩，但一般瀏覽器不把它視為安全情境，
  因此不能承諾 Service Worker、離線安裝或完整 PWA；這些能力需 HTTPS（或同裝置 localhost）。

本卡不改遊戲模擬、亂數、Canvas、存檔 schema、localStorage、manifest 身分或玩家槽位資料。

## 現況故障

1. 固定 `gv-v2` 搭配 cache-first，舊客戶端可長期只拿到舊 `index.html`。
2. 預快取只有 `./index.html`，離線直接開 scope 根路徑 `/` 會 miss。
3. `index.html?cb=...` 以完整 URL 比對，離線時不命中 canonical 入口。
4. activate 目前刪除所有 `key !== CACHE` 的同源 Cache Storage，會誤刪不屬於本遊戲的快取。
5. `skipWaiting()`／`clients.claim()` 在 `waitUntil()` 外啟動，事件完成不保證等待它們。
6. fetch handler 無 method／origin guard，會不必要地接管 POST 或跨源 GET。
7. README 把手機 LAN 明文 HTTP 描述成完整 PWA；實際上 Service Worker 需要安全情境。

## 策略規格

```text
install:
  open glimmerville-shell-v3
  addAll(["./index.html", "./manifest.json", "./icon.svg"])
  await skipWaiting()

activate:
  delete old keys under "glimmerville-shell-"
  delete exact legacy "gv-v1" and "gv-v2"
  preserve every unrelated cache
  await clients.claim()

fetch:
  if method != GET, origin differs, or URL is outside registration scope:
    do not call respondWith

  if request.mode == "navigate":
    try network
      if response.ok and URL is scope root or index.html:
        best-effort put clone under canonical "./index.html"
      return network response even if cache.put fails
    catch network error:
      return canonical "./index.html" cache
      if cache is absent, return explanatory text/plain 503

  if pathname is index.html, manifest.json, or icon.svg:
    cached match(ignoreSearch=true) or network

  otherwise:
    do not call respondWith
```

網路回應為 4xx/5xx 時仍照實回傳，不以舊 HTML 掩蓋伺服器錯誤；只有 fetch 真正 reject
（離線／連線失敗）才使用離線入口。

## 允許觸摸

- `sw.js`：完整生命週期與 fetch 策略。
- `index.html`：只修 Service Worker 註冊參數與可見錯誤提示；不得動遊戲模擬。
- `README.md`：修正 Android／LAN HTTP 的安全情境說明。
- `test_fixde.js`：T268 Service Worker VM 行為測試；更新舊的 `gv-v2` 黃金斷言。
- 本任務卡；全部驗收完成後才可在 `docs/CHANGELOG.md` 頂部追加一行。

`manifest.json` 不修改；`index.html` 仍建立 `index.pre-T268.html`，以亂數呼叫行與完整
回歸測試證明遊戲本體沒有被註冊提示改動干擾。

## 硬性不變量

1. 單寫者：只有主代理寫檔；子代理只讀。
2. 不刪除任何資料夾；不碰 `localhost` 的 s1/s2；真瀏覽器只用
   `127.0.0.1:8123` 與 slot 3。
3. `index.html` 相對備份只允許 Service Worker 註冊尾段變更；主亂數呼叫行不得改動。
4. 不新增、移動或補償 `R()`／`ri()`／`Math.random()` 呼叫。
5. 不清除 localStorage、IndexedDB 或玩家存檔。
6. activate 只可刪專屬 `glimmerville-shell-` 舊版與精確 legacy `gv-v1`／`gv-v2`；
   不得用寬泛 `gv-` 前綴或「為了乾淨」刪除其他 Cache Storage。
7. cache 寫入失敗不得吞掉已成功取得的網路導航回應。
8. 不為測試在一般遊戲暴露新的 GV 修改鉤子。

## 驗收

1. 修改前基線 769 PASS／0 FAIL；修改後只增不減。
2. `sw.js`、`test_fixde.js` 與 `index.html` 內嵌 script 語法通過；`git diff --check` 無錯。
3. VM install 驗證三個 shell URL、`glimmerville-shell-v3` 與 `skipWaiting` 等待完成。
4. VM activate 以 `gv-v1`／`gv-v2`／專屬 v2／專屬 v3／非本專案 cache 混合輸入，
   精確只刪三個舊 cache，並等待 `clients.claim()`。
5. POST、跨源、scope 外與非白名單同源 GET 不被 respondWith；白名單靜態 query
   可命中 canonical 快取。
6. 在線 `/index.html?query` 回傳 network 並更新 canonical index；模擬 cache.put 失敗時
   仍回傳成功的 network response。
7. 離線 `/`、`/index.html?query` 與 manifest `start_url` 都回退同一 canonical index。
8. README 明確區分 LAN HTTP「可玩」與 HTTPS／localhost「可離線安裝」。
9. 真瀏覽器驗證 active worker、cache keys、精確 legacy 清除、非本專案 sentinel cache 保留；
   離線重載 `/` 與 query 入口可見開始畫面，Console error 0。
10. 槽 1／2 前後不變；若為驗收建立 sentinel cache，結束後只移除該測試 cache。

## 官方依據

- W3C Service Workers（`waitUntil`、`skipWaiting`、install／activate）：
  https://w3c.github.io/ServiceWorker/
- Chrome for Developers：Service Worker lifecycle：
  https://developer.chrome.com/docs/workbox/service-worker-lifecycle
- web.dev PWA 工具與除錯（LAN IP 的 HTTP 不等同 localhost 安全情境）：
  https://web.dev/learn/pwa/tools-and-debug/
- W3C Secure Contexts：
  https://www.w3.org/TR/secure-contexts/

## 回退點

- `backups/index.pre-T268.html`
  - SHA-256：`DCC7BF80C5FE739AC2AD54B1E3CE71F28402C68A96786E729588636E0EACE9D9`
  - 大小：1,188,947 bytes
- `backups/sw.pre-T268.js`
  - SHA-256：`0D496AA6B581F5146E9E1D8B7EBD5FDB7665A73C60D10828D550892573DD5160`
  - 大小：853 bytes
- `backups/README.pre-T268.md`
  - SHA-256：`404E9EC2490A7FC9EA195225729C8D4DC94D6165354557BA367DE7AFC6BF07F7`
  - 大小：3,727 bytes
- `backups/test_fixde.pre-T268.js`
  - SHA-256：`A0DAB16DAD68BD7C83895E208C2D148DBDAE6D135A79ED5527EEABC951822BA5`
  - 大小：73,828 bytes

## 停手／回滾

- 任一既有 769 斷言失敗且無法定位，停止並只回退本卡觸摸的四個實作／測試文件。
- 若真瀏覽器更新會清除非本專案 cache、離線導航無回應、形成 reload loop，或槽 1／2
  被改變，整卡回退；槽 3 是手冊指定的專用驗收槽。
- 不得用整檔備份覆蓋 T269 之後的成果。

## 完成實錄（2026-07-23）

- 基線 `769 PASS / 0 FAIL`；完成後 `791 PASS / 0 FAIL`，新增 22 個 T268 斷言。
- `node --check sw.js`、`node --check test_fixde.js`、`index.html` 內嵌 script 語法與
  `git diff --check` 全部通過；index 相對備份的 `R()`／`ri()`／`Math.random()` 呼叫數不變。
- 兩次獨立唯讀審查及各自 VM mock 均確認：生命週期等待、精確舊 cache 清理、
  foreign cache 保留、導航 fallback、request gates 與 503 行為無阻斷問題。
- 真 Chrome（`127.0.0.1:8123`）以專案內短命探針實測 14/14：
  query worker 啟用、scope／`updateViaCache`、controller、三個精確 shell URL、
  `gv-v1`／`gv-v2`／專屬 v2 清除、兩個 foreign sentinel 保留、canonical worker 還原，
  並只清理本次建立的 sentinel。
- 精確確認伺服器提供的 `index.html` 與工作區 SHA-256 相同後暫停該專案 HTTP server；
  真離線導航 `/` 與 `/index.html?offline=...` 都顯示完整開始畫面。隨即以原命令、
  原工作目錄隱藏重啟；恢復連線後 Console error 0。
- 存檔面板實看槽 1、槽 2 仍為空；只載入允許的槽 3。驗收城市在頁面執行／自動存檔期間
  繼續推進，因此不沿用 T267 的第 269 天人口數作 T268 宣稱。
