# T27 PWA 離線化（安卓「加到主畫面」）
版本：v1.5 ｜ 難度：★★ ｜ 前置：無 ｜ 建議模型：Sonnet

## 目標
遊戲變成可安裝的 PWA：安卓 Chrome「加到主畫面」→ 全螢幕圖示啟動、完全離線可玩。
**本卡例外**：允許新增兩個檔案 `manifest.json`、`sw.js`（RULES 單檔原則的既定豁免）。

## 允許觸碰
新增 manifest.json、sw.js；index.html 的 `<head>`（link manifest＋theme-color 已有）與第 13 節（註冊 SW）。

## 行為規格
1. `manifest.json`：name「微光小鎮 Glimmerville」、short_name「微光小鎮」、start_url "./index.html"、display "fullscreen"、orientation "landscape"、background_color "#0d1226"、theme_color "#0d1226"、icons：**用程式化生成的 data URI 不可行（manifest 不吃 dataURI 於部分實作）**——改為新增第三個檔案豁免 `icon-192.png` 與 `icon-512.png`？不：用 Canvas 在構建時生成不可行（無構建）。方案：icons 指向 `icon.svg`（允許的第 3 個新檔，手寫 SVG：深藍圓角方底＋像素風小屋——SVG 手寫成 pixel 方塊組，原創）。`"icons":[{"src":"icon.svg","sizes":"any","type":"image/svg+xml","purpose":"any maskable"}]`。
2. `sw.js`：install 時 cache（'gv-v1'）四個檔案 `./index.html ./manifest.json ./icon.svg ./sw.js`；fetch 走 cache-first、miss 再網路；activate 清舊 cache 鍵。約 25 行，保持極簡。
3. index.html：`<head>` 加 `<link rel="manifest" href="manifest.json">`＋`<link rel="icon" href="icon.svg">`；第 13 節末尾：
   `if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});`
4. 版本升級策略註記：日後改版要把 sw.js 的 cache 鍵 'gv-v1' 升號（寫進 sw.js 頂部註解）。

## 硬性不變量
file:// 直開仍完全可玩（SW 註冊有協議防護）；遊戲代碼零行為變更；三個新檔案之外不加任何檔案。

## 本卡驗收
1. localhost 載入 → DevTools Application：manifest 讀取正常（名稱/圖示）、SW activated。
2. Network 離線模式（DevTools offline）重新整理 → 遊戲照常載入可玩。
3. file:// 直開 index.html → 無 console 錯誤。
4. VERIFY.md 第 1、2 項。

## 回滾
git checkout -- index.html && rm manifest.json sw.js icon.svg
