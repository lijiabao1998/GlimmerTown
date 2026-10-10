# T629 HUD 補間進度夾下限：長幀時人口、金錢不再顯示成負幾十億

**發卡／施工**：Claude（09-30 T601 實拍時記下的小卡；業主 2026-10-10「123 town 你處理好吧」授權本輪 town 由 Claude 處理）。
**claim**：Claude；分支 `claude/town-hud-tween-629`（工作樹 `C:/dev/glimmer-town-629`），base `420cdca`；要等 T627（發佈管線通用化）合併、T628 發出去之後重定基底，版本號接在 T628 後面。
**合併權**：同上；Claude 出卡＝施工同一方，如實聲明。

## 問題

`tweenHudStart()`（T423 R01 的 HUD 數字補間）用 `k=Math.min(1,(now-t0)/dur)` 算進度，只夾了上限。`requestAnimationFrame` 給的時間戳是**這一幀開始的時間**，可能早於呼叫 `tweenHudStart()` 時取的 `t0=performance.now()`（長幀、背景分頁回來、無頭瀏覽器的虛擬時間都會發生），這時 `k` 是負的，三次緩出 `1-(1-k)^3` 會變成很大的負數，顯示值被推到負幾十億；而 `updHud()` 每 250 毫秒用「目前顯示值」當下一段的起點，錯誤會一直滾下去。只影響畫面上的數字，模擬變數（money／pop／jobs）不受影響。09-30 無頭 Chrome 實拍看到人口、金錢負幾十億就是這個。

## 做法

一行：`const k=Math.max(0,Math.min(1,(now-t0)/dur))`。

## 守衛

- G1：rAF 時間戳早於起點 5 秒時，顯示值停在起點（不外推）。
- G2：一半時介於起點與目標之間。
- G3：結束停在目標。
- G4：原文釘。
- 測試橋 `window.__t629T`（設定起點／目標並啟動補間、讀目前顯示值）；守衛期間暫換 `requestAnimationFrame`／`cancelAnimationFrame`，結束一定還原。

## 允許觸碰

`index.html`（那一行＋版本號）、`sw.js`（只經 bump）、`test_fixde.js`（測試橋＋守衛）、`docs/ARCH.md`（現況行、行數）、`docs/SPR_PINS.json`（版本欄）、`docs/CHANGELOG.md`、本卡。

## 驗收

`verify.py` ALL GREEN；紅源：拿掉 `Math.max(0,…)` 首紅落在 T629 G1；分支手動觸發 Pages 工作流（原生計時除外）全綠；合併後網站部署、`verify-published` 綠。

## 回滾

`git revert`。

## 施工紀錄

（施工後補）
