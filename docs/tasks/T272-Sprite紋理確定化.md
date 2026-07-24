# T272 Sprite 紋理確定化

日期：2026-07-23  
狀態：完成  
風險：低（純載入期美術紋理；不改模擬、存檔、數值或 Service Worker）

## 問題

`buildSprites()` 仍有 9 個以 ambient `Math.random()` 產生紋理點綴的來源：

- 通用 `plate()` 內 1 個來源，影響約 130 次地基生成。
- 8 個大型建築／大型地基的直接 `speck(...,()=>Math.random())`。

因此相同版本、相同世界種子在兩次全新載入後，建築日間 sprite 仍可能有像素差異。這不會改變模擬，但會污染像素回歸與跨載入重播證據。

## 施工邊界

1. 一次清除上述 9 個載入期來源。
2. 使用專屬、固定 seed、每次 `buildSprites()` 起手重設的局部 PRNG。
3. 不得改用既有 `rand`，不得新增或移動全域 `R()`／`ri()` 消耗。
4. 保留全部 `speck` 的顏色、數量、座標、菱形範圍與 2×1 像素尺寸。
5. 不改任何存檔格式、模擬公式、建築資料、玩家槽位或 PWA 資產。

## 開工基線

- `backups/index.pre-T272.html`
  - 1,189,179 bytes
  - SHA-256 `3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097`
- `backups/test_fixde.pre-T272.js`
  - 111,936 bytes
  - SHA-256 `58EA4FE4EAF56811DA2DB7B3940FACEFD3C24A99BB360EC0DB7B91A209B13664`
- 修改前：`node test_fixde.js` 全數通過（841 PASS／0 FAIL）。

## 驗收閉環

1. 先加入跨 ambient random 的紅測試，現況必須真失敗。
2. 兩個 fresh VM 以不同 ambient `Math.random` 執行正式 `mulberry32 → seed/state → reset → plate` 鏈，操作 fingerprint 必須相同。
3. seed/reset、`plate()` 與 `buildSprites()` 區段的載入期 `Math.random()` 必須為 0。
4. 9 個逐點 mutant 任一恢復 ambient `Math.random()`，來源審計都必須失敗。
5. 相對 pre-T272，`R()`／`ri()` 呼叫行逐行一致；既有共用 `rand` 呼叫行逐行一致。
6. 全量測試只增不減、index/test 語法通過。
7. 真瀏覽器以 `127.0.0.1` 驗證兩個 fresh、不同 ambient random 的 sprite fingerprint 相同，開始畫面與建築渲染正常、Console 0 error；不讀寫 s1/s2。

## 停手／回退

若無法在不改既有 `rand`／`R()`／`ri()` 流的前提下閉環，還原上述兩份 pre-T272 備份並停止本卡。不得刪除任何資料夾。

## 完成記錄

- `index.html` 完成檔：1,189,428 bytes；SHA-256
  `3C1E1A900457AA1365CB88B80907A9DF8CA9FC6A4F315667D1CB049C43BFD6F6`。
- `test_fixde.js` 完成檔：119,972 bytes；SHA-256
  `B6163B37EC7E230E865216092D2F0E91CEC7E26C71831DF754BA5A08A5B8602D`。
- 真紅：pre-T272 正式碼在新跨 ambient fingerprint 測試得到
  `841 PASS / 1 FAIL / exit 1`。
- 真綠：`node test_fixde.js` 得到 `888 PASS / 0 FAIL / exit 0`；
  `node --check test_fixde.js`、UTF-8 抽取全部 inline script 的 VM 語法編譯與
  `git diff --check` 均通過。
- 終審曾發現第一版 fresh VM 直接注入固定 RNG、未執行正式 reset 鏈，導致
  reset 退回 ambient random 仍會假綠。修正後以 `fs.readFileSync` 記憶體
  monkeypatch 將正式 reset 改為 `()=>Math.random()`，完整 suite 精確
  `exit 1`，死於跨 ambient 正式鏈 fingerprint；無關 HTML 差異亦會被
  current 反向正規化後逐 byte 等於 pre-T272 的 guard 攔截。
- 9 個允許的 `speck` 接點逐一還原 ambient random 的 mutant 全被攔截；
  `R()`／`ri()`／既有共用 `rand()` 呼叫行與 pre-T272 逐行相同。pre-T272
  index 備份 SHA-256 已釘死在測試內。
- 真瀏覽器 `127.0.0.1:8123`：兩個 fresh、不同 ambient random 的 9-key
  sprite 合併 fingerprint 同為 `054636b3`；將 `plate` 接點退回 ambient
  random 後兩個 fingerprint 分岔。正式開始畫面與 slot 3 冬季城鎮、
  建築、HUD、小地圖均正常，Console warning/error 為 0；未讀寫 s1/s2。
- 驗收用 `.t272-browser-probe.html` 已以單檔刪除，未刪除任何資料夾。
