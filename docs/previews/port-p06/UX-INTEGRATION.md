# P06 UX / Touch：實作與驗收紀錄

起點 `f1483c40d35bd6db30f44fab59477d865e60a1d6`；先凍結卡面提交 `91a2518fadaf14474e78e421d720f354751bdf65`。本輪只修改候選 UI，不是港區功能重寫或正式發布。

## 第一版實作

- `native-ui.html`：玩家資訊層、港口選單、四個真實 owner counts、三個主要動作、原因詳情與完整診斷抽屜。桌面預設小 chip，展開 360 CSS px；手機量測原生 HUD／工具列／縮放位置，保留城市區域及內部捲動。
- `native-ui.js`：只讀開面板 discovery；關閉營運時的檢查只調用既有合法性檢查器，不提交計畫。啟用、重新檢查、停用、重播、reset／confirm、live 仍調用既有 API。選單保留原生表單行為；UI 事件停止向世界層冒泡，不更改原生 canvas handlers。
- `build.cjs`：僅把原單行 UI 注入抽成上述兩檔；沒有其他 builder 語意變動。
- `native-fixtures.js`：只增加只讀 `inputState()`，供真 Chrome 比對 pointer/capture/selected/tool 狀態；沒有 setter。
- `ui-browser.cjs`：新的獨立瀏覽器在原 222 驗收及所有性能診斷完成後才啟動。重新以 Git 原始 blobs 建置 f1483c40，要求與先前交付 HTML SHA 完全相等，保存四個 viewport 的完整 before/after 原圖。使用真 Chrome trusted mouse/touch/keyboard/CDP touch，不宣稱實體 Android/iOS 裝置或原生手機 picker 驗收。
- `ui-scope-test.cjs`：114 個 protected source/workflow/rule/pause 檔案對 f1483c40 位元組相同；builder 與 fixture 只准上述精確邊界。

## 首次本機失敗（保留，不冒充瀏覽器失敗）

2026-10-25 16:47 UTC，首次新 UI build 已完成 JavaScript syntax 與 night contract，接著 state-only lifecycle VM 在 `new MutationObserver(render)` 出現 `ReferenceError: MutationObserver is not defined`。該次尚未執行 lifecycle assertions，也沒有啟動 Chrome。舊 mock 沒有瀏覽器 observer/layout API，並非貨櫃／城市時間錯誤。

修正限定在候選 `lifecycle-test.cjs` 的 VM bootstrap：新增 inert MutationObserver/ResizeObserver 與零幾何 DOM stub。仍執行所有 scripts，原 lifecycle predicates 及兩類 source-mutant 反證完全保留；不加 production test escape、不排除 UI script。此 VM 不主張 UI layout/event 正確，必須由真 Chrome 驗收。

## 第一版提交前已實跑

- 完整 candidate build、night contract、native lifecycle 與來源 mutant：通過。
- 原 geometry equivalence 1,777 與 vector call-stream 5,446：通過。
- 原 native train／old-save focused：8/8；原始程式未改。
- 114 protected source、builder／fixture 邊界：通過。
- 真 Chrome UI、原 222、完整新 head CI 與新性能：尚待官方執行；本文件不先宣稱通過。

## 一直保留的發布限制

Draft PR73，不合併、不部署。正式 main T707、Pages、存檔與經濟不變。原 generic scope/gate 紅、原 cold-view +2.4–3.9ms、long-run severe stalls、同候選 ON/OFF Canvas queue cross-charge 的因果歸屬未解除；OFF stall 不是已證明原生獨有問題。UI 成功不等於 release-ready。完整新結果與 first-red logs 由 CI artifact 及交付 receipt 記錄，不改凍結卡面要求。
