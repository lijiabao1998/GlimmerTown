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

## 第一輪官方綠，原圖人工紅（保留）

`65f423353a8d524237d526d9ca40ad7c4ab28229` 的證據 run `40214233089` 七 job 通過，原 Chromium 222/222、新 UI 856/856。原始附件 `12607616309`（56,981,402 bytes），SHA256 `ce7c320f803b49d74d0635f2c9683022197927428f79745bf66d7c8d43be5083`。

然而 2026-10-25 17:24 UTC 人工打開四尺寸全畫面 PNG，發現 canvas 幾乎全白，只有原生閃電分岔線。immutable f1483c40 的 before 也有同樣現象。這些 36 張 PNG 保留為失敗證據，不能以 856 綠宣稱真城市視覺驗收完成。

實際原因：正常 fixture 的 80 次原生 tick 可留下 `flashT`；fixture 隨後暫停、只做 `draw(0)`，原生 `draw(dt)` 才會遞減閃光，因此單純等待 DOM wall time 不能讓它消退。修補只在新 UI 驗收的準備／截圖同步，沿用既有原生 lifecycle 驗收的真 requestAnimationFrame 時差驅動 `P06Test.draw(dt)`，核對 flash 消退、shake 維持零與城市／財政／貨櫃／clock 完全不變；不直接清 flash、不改原生 renderer 或 fixture。

同輪第一張桌面 default-collapsed 圖另留有 boot overlay：原生 `__boot426.ready` 早於最後 double-rAF 的 overlay 隱藏。新 runner 必須等實際 overlay hidden 才建 fixture，且每張圖再次檢查；不靠任意延長 sleep 或直接藏 overlay。`shakeT` 依原生 tick 而非 draw 遞減，故本同步只對原生 flash 做視覺衰減，並要求 fixture 已有的 shake=0 維持；不為了去震動推進城市。

另有新驗收可見性缺口：原因 drawer 在先前測試後可能仍 open，無條件再次點 summary 反而關閉；只有 textContent 不能證明原因可見。第二版以真點擊明確關閉／打開，再查 open、isVisible 與第一條理由位於內部 scroll viewport。原 222 predicates 不變。這是加強新驗收，不是拿變更過的舊門檻換綠。

同時補齊兩個新 UI oracle：手機手指向下滑時，必須記錄內部 scrollTop 實際減少，不能只靠 trusted touchmove 與零世界洩漏；live return 必須除了 replay→live，還保持 frame/layout/timeMs/acceptedMs 全同。首輪四組 live-return 原始快照已符合後者，但最終 head 仍須實跑更完整的明確判定。

第一輪觀察性能亦全留：長週期 steady fps 13.93→12.73，p95 interval 316.7→333.4ms，max 633.3→666.7ms；5 秒 ON 兩組 27.83/27.19→26.56/25.52fps。不同官方執行的實際末端城市也不同，不能直接推成純 UI 因果。兩次原始完整矩陣與新的精確 head 結果都須交付，不能只選比較好看的那輪。
