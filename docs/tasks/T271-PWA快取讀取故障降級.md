# T271 PWA 快取讀取故障降級

版本：v5.0 ｜ 難度：★★ ｜ 前置：T270 ｜ 寫者：GPT

## 目標

讓已安裝的 Service Worker 在 Cache Storage 暫時不可讀時仍遵守兩個降級保證：

1. 網路可用：已知 app-shell 靜態資產必須回退到真網路，不得因 `caches.open()`／
   `cache.match()` rejection 而把正常的 200 請求攔死。
2. 網路也離線：導航必須回既有文字 503，不得把 Cache Storage rejection 裸漏給瀏覽器。

本卡不改 precache 內容、manifest、遊戲、模擬、亂數、Canvas、存檔或玩家槽位。

## 修改前紅證據

- `node test_fixde.js` 基線：**830 PASS／0 FAIL**。
- 另以獨立 VM 對現行 `sw.js` 注入 `caches.open()` rejection：
  - 在線 `icon.svg?probe=271`：`respondWith` rejection
    `"cache storage unavailable"`，完全沒有得到原可用的 network response。
  - 離線 `index.html?probe=271` 導航：同樣裸 rejection，沒有既定 503。
- 唯讀測試審核另重現靜態資產 `cache.match()` rejection 時 `networkCalls=0`。

## 實作規格

### 靜態 app-shell

僅改 `SHELL_PATHS` 最後分支：

- 用 async response 流程依序嘗試 `caches.open(CACHE)`、`cache.match(..., {ignoreSearch:true})`。
- 命中立即回 cache，且不得呼叫 network。
- open／match 任一步 rejection 都視為「無可用命中」，隨後只呼叫一次 `fetch(req)`。
- network 自身若也 rejection，維持真正 request failure；不偽造圖片／SVG 的文字 503。

### 導航

- network-first 邏輯、成功回寫 canonical index 與 HTTP 錯誤照實返回全部不變。
- 只強化 fetch rejection 後的離線 fallback：open／match 任一步失敗時回既有
  `text/plain;charset=utf-8` 503「離線且尚未完成首次快取。」。

### Cache 版本

維持 `glimmerville-shell-v5`。本卡沒有改 FILES 或任何資產 bytes；`sw.js` 本身 bytes
變更已足以觸發瀏覽器 Service Worker update，無需製造內容相同的 v6 cache 遷移。

## 允許觸碰

- `sw.js`
- `test_fixde.js`
- 本任務卡
- 全部驗收完成後才可追加 `docs/CHANGELOG.md`

`index.html`、`manifest.json`、README、圖示與其他程式／文件不修改。

## 硬性不變量

1. 單寫者；子代理只讀。
2. 不刪除任何資料夾，不安裝套件，不在專案外寫檔。
3. `index.html` SHA-256 保持
   `3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`。
4. manifest 與四個 icon bytes 不變，SW FILES 仍精確為 T270 六項閉包。
5. method／origin／scope／allowlist guards 不放寬；未知資產仍不得接管。
6. cache 命中仍 cache-first、零 network call；query 仍以 `ignoreSearch` 命中 canonical。
7. manifest 的 T269 network-first／JSON 503／Cache Storage 故障語意全部不變。
8. 不新增、刪除或移動任何 `R()`／`ri()`／`Math.random()` 呼叫。
9. 不讀寫 localStorage，不碰玩家 s1／s2／s3。

## 測試閉環

擴充既有 SW VM harness：

- 計數 network calls；新增 `failMatch(on)` 與 match failure 計數。
- 靜態 cache 命中：回 cached，network calls = 0。
- 靜態 cache miss：回 network，network calls = 1。
- 靜態 open rejection＋network 200：回 network 200，network calls = 1。
- 靜態 match rejection＋network 200：回 network 200，network calls = 1。
- 把修後分支退回修改前 promise chain 的記憶體 mutant：上述故障斷言至少一項必紅。
- 靜態 cache 與 network 同時 rejection：保留 fetch rejection，不造假回應。
- navigation network rejection＋open rejection：回文字 503。
- navigation network rejection＋match rejection：回文字 503。
- navigation network 200＋Cache Storage rejection：仍回 network 200。
- POST、跨源、scope 外、scope 內未知資產 controls 持續不接管。
- T268–T270 全部既有 PWA 與 PNG 測試持續通過，總 PASS 只增不減。

## 真瀏覽器驗收

- `127.0.0.1:8123`，不讀寫 localStorage。
- 正常在線：正式 index 開始畫面、四個 icon 皆可讀、canonical worker 生效。
- 正常離線：index 與至少一張帶 query PNG 由 v5 cache 命中。
- 恢復在線後 canonical worker、唯一 v5 專屬 cache、Console error 0。
- 瀏覽器原生 Cache Storage rejection 無安全的頁面 API 可注入；故障路徑只宣稱
  「獨立 VM 故障注入通過」，不冒充真 Chrome 原生故障實測。

## 回退點

- `backups/index.pre-T271.html`
  - 1,189,179 bytes
  - SHA-256 `3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`
- `backups/sw.pre-T271.js`
  - 3,165 bytes
  - SHA-256 `0AA1D1B518FF18A79EF2839A93362DC5DCB8DF3990FFFAAA4C04B577BFE40221`
- `backups/test_fixde.pre-T271.js`
  - 105,026 bytes
  - SHA-256 `30BFD22D3934CD4A597B04C5397E40E2AEBBF88F2D5D425270E7855AF123290D`

## 停手／回滾

- 既有 830 任一失敗且 30 分鐘內無法定位：只回退本卡 `sw.js`／`test_fixde.js`。
- 任一 guard 被放寬、cache hit 開始打網路、manifest 語意回歸：不得落 CHANGELOG。
- 若需要新增或刪除資料夾，先停手取得使用者允許；本卡不需要。

## 完成記錄（2026-07-23）

- 修改前紅測：原 `sw.js` 在新增 cache hit／miss controls 通過後，於
  `caches.open()` rejection 真正退出；當時結果為 **832 PASS／1 FAIL／exit 1**，
  錯誤精確是 `cache storage unavailable`，不是先改程式再補綠測。
- `sw.js` 最小改動：
  - navigation 的 network reject fallback 將 open／match 包進獨立 `try/catch`；
    命中仍回 canonical index，不可讀則回既有文字 503。
  - 靜態 allowlist 將 cache open／match 包進 async `try/catch`；命中立即返回，
    miss 或 cache rejection 才在 catch 外呼叫一次 `fetch(req)`，故 network rejection
    不會被吞掉。
  - `FILES`、`CACHE` v5、manifest 與資產完全不變；未升空殼 v6。
- 測試 harness 增加 network call、match failure 計數與 `failMatch(on)`；新增 11 項：
  cache hit 零 network、miss 單 fetch、open／match failure 單 fetch、雙故障保留真
  network rejection、導航 open／match failure 文字 503、在線導航 cache failure
  仍回 200、manifest match failure 維持 JSON 503、mutant 定位，以及修改前 promise
  chain mutant 真正 `networkCalls=0` 被抓。完整結果由 830 增至
  **841 PASS／0 FAIL**。
- 唯讀終審通過、無 blocker：確認 guards 未放寬、無雙 fetch、network 錯誤未被吞；
  worker source bytes 已變且註冊使用 `updateViaCache:'none'`，故無需 bump cache version。
- 真 Chrome（`127.0.0.1:8123`，測試程式不呼叫 localStorage）：
  - query worker 在線生效；512 PNG 真尺寸 512×512；無腳本 sandbox index 導航讀到
    title「微光小鎮 Glimmerville」、開始標題「微光小鎮」；cache 僅 v5。
  - 先下載 served `sw.js` 並核對 SHA-256
    `F24D51AD6091E219944EA49C5A9D6FB93E9F080502056C6724CD9B877231A390`
    等於本機，再精確停止唯一 server PID 12908，確認 8123 無監聽。
  - 真離線時，帶 query 512 PNG 仍為 512×512，sandbox index 仍讀到相同 title／開始
    標題；重啟 server PID 23224 後恢復 canonical `sw.js`，專屬 cache 仍只 v5。
  - Console error 0；臨時 `.t271-browser-probe.html` 已移除，驗收分頁已關閉。
- 誠實邊界：Chrome 原生 Cache Storage rejection 沒有安全的頁面注入 API；open／match
  故障結果只宣稱「獨立 VM 故障注入通過」，真 Chrome 驗的是正常在線／離線路徑。
