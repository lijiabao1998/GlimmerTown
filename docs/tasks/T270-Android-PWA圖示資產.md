# T270 Android PWA 圖示資產

版本：v5.0 ｜ 難度：★★★ ｜ 前置：T269 ｜ 寫者：GPT

## 目標

把規格有效但相容性偏弱的單一 SVG 安裝圖示，補成 Android／Chromium 可穩定選用的
光柵資產閉環，同時保留原創 16×16 像素屋作唯一母版：

- 新增不透明正方形 `icon-v1-192.png`、`icon-v1-512.png`，用途只標 `any`。
- 新增獨立不透明 `icon-v1-maskable-512.png`，用途只標 `maskable`。
- 原 `icon.svg` 保留作 HTML favicon 與可重現生成母版；manifest 中只標 `any`，
  不再以同一張超出安全圈的 SVG 同時冒充 maskable。
- maskable 使用滿版 `#0d1226` 背景，前景縮至 75% 並置中；所有非背景像素必須落在
  中心半徑 40% 的 W3C 保證安全圈內。
- 檔名含 `v1`，日後改圖必須換實體 URL；不以 query 假裝 bust Chrome 144 的近 immutable icon。
- Service Worker 升專屬 v5，完整預快取 SVG favicon 與三張 manifest PNG。

本卡不使用外部素材、不做生成式重畫、不改遊戲模擬／亂數／Canvas／存檔／localStorage。
不承諾未執行的 Android 真機安裝；本卡承諾的是資產真值、離線供應與桌面 Chrome 驗證。

## 現況故障

1. manifest 只有 `icon.svg sizes:any purpose:"any maskable"`。
2. 現有前景煙囪與底座部分超出 16×16 圖中心半徑 6.4 的 maskable 保證圈。
3. SVG 圓角底的四角透明；部分平台可能自行填入不可控背景色。
4. Chromium／跨瀏覽器安裝品質通常需要不透明 192／512 PNG fallback。
5. Chrome 144 起 icons metadata 不變時不重抓內容，單純覆寫同 URL 不可靠。
6. 新增圖示 URL 若不進 Service Worker app-shell，離線安裝 metadata 可能引用缺失資產。

## 生成規格

`generate_pwa_icons.py`：

- 只讀取本專案 `icon.svg`，解析原創 `<rect>` 幾何與 fill。
- 驗證 viewBox 為 `0 0 16 16`、背景色為 `#0d1226`。
- any PNG：RGB／8-bit／無 alpha，以滿版背景覆蓋透明角；16 格分別以 12×、32×整數放大。
- maskable PNG：32×32 邏輯畫布、滿版背景；前景以 1.5× 放大後偏移 4 格，
  即佔全幅 75%，輸出 512 時每邏輯格 16px，邊界仍為整數像素。
- 輸出只寫本專案根目錄三個固定檔名，不安裝依賴、不讀寫專案外檔案。

## 允許觸摸

- 新增 `generate_pwa_icons.py` 與三張 PNG。
- `manifest.json`：icons 陣列與既有 scope；不得改 identity/start_url。
- `sw.js`：v5 與完整 FILES。
- `test_fixde.js`：更新當前 cache 斷言、新增 PNG 真值／safe-zone／資產閉包測試。
- 本任務卡；全部驗收完成後才可更新 `docs/CHANGELOG.md`。

`index.html`、README、`icon.svg` 不修改。

## 硬性不變量

1. 單寫者：只有主代理寫檔；子代理只讀。
2. 不刪除任何資料夾，不安裝任何套件，不在專案外建立或修改檔案。
3. `index.html` 與 `index.pre-T270.html` SHA-256 完全一致。
4. `icon.svg` 與 `icon.pre-T270.svg` SHA-256 完全一致。
5. manifest `start_url:"./index.html"`、`scope:"./"`、缺省 `id` 全部不變。
6. 三張 PNG 都必須是實際宣告尺寸、RGB 8-bit、全不透明、正方形。
7. maskable 的每個非背景像素中心距離不得大於 `0.4 × 512`。
8. PNG 不得出現 SVG 調色盤之外的插值／抗鋸齒顏色。
9. manifest icon `src` 必須是無 query 的版本化本地檔名；any 與 maskable 不共用同一資產。
10. SW install FILES 必須包含 index、manifest、SVG favicon 與 manifest 的全部 icon。
11. 不新增、移動或補償 `R()`／`ri()`／`Math.random()`，不碰玩家槽位。

## 驗收

1. 修改前 `812 PASS / 0 FAIL`；修改後只增不減。
2. Python 生成器語法與二次執行 idempotence 通過；三張輸出 SHA-256 穩定。
3. `sw.js`、`test_fixde.js` 語法、manifest JSON、`git diff --check` 通過。
4. PNG parser 驗證 signature／IHDR／IDAT、尺寸、bit depth、color type 與所有像素。
5. 192／512 any 真尺寸正確、無 alpha、只含原 SVG 調色盤。
6. maskable 512 真尺寸正確、無 alpha、前景非空且逐像素全在 40% 安全圈。
7. manifest 精確含 192 any、512 any、獨立 512 maskable 與 SVG any；無合併 `any maskable`。
8. manifest 的每個 icon 檔都存在、宣告尺寸與真 IHDR 一致、同源且位於 scope。
9. v5 install 捕捉到完整資產閉包；activate 刪 v4、保留 v5 與 foreign cache。
10. T268／T269 的導航、manifest 更新、離線、503、Cache Storage 故障測試持續通過。
11. `view_image` 實看三張 PNG；maskable 再以圓形裁切預覽確認屋體／煙囪／底座不缺。
12. 真 Chrome probe 驗證三張圖 naturalWidth／naturalHeight、在線 load；精確停服後換 query
    再 load 仍成功；重啟後 canonical v5 worker、Console error 0，探針清理。
13. 誠實標註：未有 Android 裝置就只寫「桌面 Chrome＋靜態 safe-zone 通過」，
    不寫「Android 真機安裝通過」。

## 官方依據

- W3C App Manifest：maskable safe zone 是中心半徑 40%，圈外可被裁：
  https://www.w3.org/TR/appmanifest/#icon-masks
- web.dev：非透明方形圖、192／512 raster fallback、獨立 maskable：
  https://web.dev/learn/pwa/web-app-manifest
- Chrome 144 icon 更新：icons 欄位／URL 未變時不重新下載：
  https://developer.chrome.com/blog/improvements-to-web-app-updates
- W3C Service Workers／web.dev lifecycle：cache 名稱版本隔離：
  https://w3c.github.io/ServiceWorker/
  https://web.dev/articles/service-worker-lifecycle

## 回退點

- `backups/index.pre-T270.html`
  - SHA-256：`3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`
  - 大小：1,189,179 bytes
- `backups/sw.pre-T270.js`
  - SHA-256：`1A97DE0C33DCE35C7C71F4C29E7E56F62B14B0474BBC299AE6C70132F2DE9E49`
  - 大小：3,077 bytes
- `backups/manifest.pre-T270.json`
  - SHA-256：`DFD4875677CA7CC1F6EF2832ED20F4CC1ED26378A93DB4A79C340903A610E35D`
  - 大小：380 bytes
- `backups/icon.pre-T270.svg`
  - SHA-256：`31E67DD794B00928046AB48678AEAE26763535EC3B40B94F679DDF37047EAF8B`
  - 大小：835 bytes
- `backups/test_fixde.pre-T270.js`
  - SHA-256：`9731E9D12BA8C0E6F668522FFC8626AC30288EB4CCB7B9A5A268CFB32EE24FDB`
  - 大小：91,571 bytes

## 停手／回滾

- 任一既有 812 斷言失敗且無法定位，停止並只回退本卡檔案。
- 任一 PNG 尺寸／透明度／safe-zone／調色盤失敗，或離線圖示缺失，不得落 CHANGELOG。
- 若需新增或刪除資料夾，先停手取得使用者允許；本卡設計不需要。
- 不得用整檔備份覆蓋 T271 之後成果。

## 完成記錄（2026-07-23）

- 新增可重現生成器 `generate_pwa_icons.py`，只讀原 `icon.svg` 的矩形與色票；輸出不透明
  8-bit RGB、整數像素縮放，並提供 `--check` 零寫入模式。
- 產物：
  - `icon-v1-192.png`：581 bytes，
    SHA-256 `A7252477296CC7704BD3D485C8A3A25BCFB6C36BCB5DF2B0DCA666BAB4537951`
  - `icon-v1-512.png`：1,688 bytes，
    SHA-256 `42D58A67CC90BAC9F965DBE8497AA5913AA5907623D2F278C2BA6CCC45566D4D`
  - `icon-v1-maskable-512.png`：1,679 bytes，
    SHA-256 `56FFC2B39731BACF19E121770FDCE612C0CC915BB663C1A781D6E1E213005950`
- maskable 前景 42,624 像素，bbox `(136,112)..(375,399)`；最遠前景像素中心半徑
  `186.742 < 204.8`，安全餘量約 18.058px，越界 0。三圖均精確使用 SVG 的 7 色，
  無 alpha、無 `tRNS`、無插值色。
- manifest 精確列出 192 any、512 any、獨立 512 maskable、SVG any；保留
  `start_url:"./index.html"`、`scope:"./"` 與缺省 `id`。SW 升 v5 並預快取完整資產閉包。
- 完整測試由 812 增至 **830 PASS／0 FAIL**（+18）。PNG parser 驗 CRC／IHDR／IDAT／
  filter／真像素，另以記憶體 mutant 證明會拒絕合法 `tRNS` 透明與 IEND 後尾隨資料；
  `--check` 連跑兩次逐 bytes 重生相同，三檔 bytes／size／mtime 不變，且未建立
  `__pycache__`。本次可重現位元組由 Python 3.13.5／Pillow 12.2.0／zlib 1.3.1
  驗證；測試可探測 Windows `py -3`、`python` 與 Unix `python3`。`node --check`、
  index inline script、manifest JSON contract、
  `git diff --check` 全通過；`index.html`、`icon.svg` 與 pre-T270 備份位元組一致。
- 獨立唯讀驗收另得 PNG 位元解碼 22/22、SW VM 14/14；移除一張 512 asset 的
  SW 記憶體 mutant 會被 suite 當場攔下。終審指出的 `tRNS` 與生成器語義驗證缺口
  已在落 CHANGELOG 前修正。
- 真 Chrome（`127.0.0.1:8123`）：
  - 在線三圖 `naturalWidth/naturalHeight` 為 192／512／512，v5 cache 精確含
    index、manifest、SVG 與三張 PNG，v4 已清。
  - 圓形、squircle、圓角方形三種 mask 預覽均看見完整屋體、煙囪與底座。
  - 精確停止唯一 http.server 並確認 8123 無監聽後，三張改 query URL 仍由 v5
    離線載入成功；重啟後恢復 canonical `sw.js`，只留 `glimmerville-shell-v5`。
  - 正式 index 重新開啟可見完整開始畫面與工具列；全程 Console error 0，未讀寫
    localStorage 或任何玩家槽位；臨時 probe 已移除。
- 誠實邊界：以上是桌面 Chrome 真離線＋靜態 safe-zone 驗收；**未做 Android 真機
  安裝**，不宣稱 Android launcher 的實機安裝結果。
