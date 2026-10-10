# T626 town 發佈閘門穩定化：計時比較改穩健統計、原生計時改為紀錄不擋部署

**發卡／施工**：業主 2026-10-10 讀狀態後說「123 town 你處理好吧」（1＝把拖慢的新圖優化掉、2＝預算本身太嚴就由業主批准調整、3＝先讓 main 回綠、網站照常更新，效能另開一張卡）。本卡處理 2 與 3；1 另開 T627。Claude 出卡＋施工。
**claim**：Claude；分支 `claude/town-gates-626`，base `1076607`（PR #7 合併後的 main）；完成後正常 PR 合併。不改遊戲本體（`index.html`／`sw.js` 一個位元組都不動），所以不 bump、核准的執行檔雜湊照舊。
**合併權**：業主授權本輪由 Claude 處理；Claude 出卡＝施工同一方，沒有第三方覆核，如實聲明。

## 現況（2026-10-10 查證）

- PR #7（T603 新圖＋Pages 發佈）10-09 15:25 UTC 合進 main 之後，main 兩個工作流紅：
  - **Town T602 candidate validation**（Linux）：`SCENE602 FAILED: warm draw p95 relative budget`。桌面 30 次暖重畫，新圖開／關的中位數 2.5／2.6 毫秒，一樣；新圖那組剛好有 **兩次** 約 12 毫秒的尖峰、舊圖一次，30 個樣本的 p95 正好落在第二大的那一個 → 3.2 對 12.2 毫秒、超過 3.2×1.5+5。手機白天／夜裡新圖反而較快（3.8 對 5.2、13.2 對 15.3）。
  - **Town main Pages validation and publication**：Linux 正確性、打包、Mac 首訪／離線全綠；只有 `native-acceptance`（GitHub macOS 跑機上的原生計時）被拒：`mobile night same-light warm draw relative budget`。同一份程式 10-09 14:51 在分支上過、15:25 在 main 上不過。那一輪的樣本本身就極吵：桌面夜裡舊圖相鄰兩次重畫 21–230 毫秒、新圖 22–258 毫秒；手機夜裡每組只有 10 個樣本、而且先量完舊圖再量新圖（新圖那組前面剛烘完一大批圖）。
  - `deploy` 需要 `native-acceptance` 成功 → 網站停在 10-07 的版本，T603 的新圖沒上線。
- 本機（Windows、真 Chrome，有 GPU 與沒 GPU 各一次；鏡頭在市中心與社區菜園各一次；新圖開關交錯量）：手機／桌面 × 白天／夜，新圖開關的暖重畫中位數差都在 1 毫秒內。**新圖沒有讓暖重畫變慢**；新圖真正的成本是「第一次畫」（依需要烘圖，0.15–0.95 秒），那是 T627 的事。
- 之後的 T619–T625 都在診斷量測工具本身（追蹤檔超過 64MB、CPU 剖析時間戳負值、視窗啟動時高度改變），沒有一輪量到瓶頸。

## 做法

1. **T602 場景的計時比較改穩健統計**（`docs/tasks/t602-shots/scene602.js`，手機兩相、桌面一處）：
   - 冷畫（清快取後第一次畫）照舊每組各量一次，判準不變（新 ≤ 舊×2＋250 毫秒）。
   - 暖畫改成：兩組都先預熱，再**交錯**量（每一輪新舊各畫一次、先後順序每輪對調），手機每組 30 次、桌面每組 40 次；判準改成**中位數**與 **p90** 都要 ≤ 舊×1.5＋5 毫秒。中位數擋「整體變慢」，p90 擋「經常卡頓」；交錯讓兩組吃到同樣的雜訊，不會因為某一組剛好多一個尖峰就翻紅。
   - RAF 那一段照舊（失敗那一輪 RAF 是過的）。
   - 報告欄位保留舊的 `warmP95`（照舊算、只記錄），新增 `warmMedian`／`warmP90`／`protocol`。
2. **原生計時改為紀錄、不擋部署**（`.github/workflows/town-main-pages-candidate.yml`）：`native-acceptance` 加 `continue-on-error: true`，`deploy` 的 `needs` 拿掉它；工作照跑、證據照存（之後 T627 拿來看趨勢）。部署仍然要求：全套回歸＋六哨兵＋工具鏈＋新圖像素＋舊存檔（validate）、Linux Chrome 三段正確性（browser）、七檔打包與執行檔雜湊（package）、Mac 真首訪＋存檔隔離＋離線重開＋T602→T603 升級（pages-browser）；部署後 `verify-published` 照舊驗真網址。
3. 不動：`index.html`、`sw.js`、任何門檻數字以外的檢查、GPT 的 `tools/pages/*` 腳本與自測（`release-native-acceptance.cjs` 的判斷本身不改，只是不再擋部署）。

## 判準改動（寫在這裡）

- T602 場景暖畫：`p95(新) ≤ p95(舊)×1.5＋5`（依序各量）→ `中位數(新) ≤ 中位數(舊)×1.5＋5` 且 `p90(新) ≤ p90(舊)×1.5＋5`（交錯量、樣本加多）。理由：上面那一輪的實測——30 個樣本的 p95 被「多一個尖峰」決定，量到的是雜訊不是新圖。
- 部署前的原生計時：必過 → 只紀錄。理由：GitHub macOS 跑機同一輪相鄰兩次重畫差到 10 倍，同一份程式一過一不過；拿它擋部署等於擲骰子。T627 會在 Linux 加一道交錯量的計時閘門補回來。
- Linux 報告裡「計時交給原生那一關」的標記（`releaseTiming.requiredLane`）是 GPT 腳本寫死的報告欄位，本卡不改；實際擋不擋部署以工作流的 `needs` 為準。

## 允許觸碰

`docs/tasks/t602-shots/scene602.js`（只動計時那三處與報告欄位）、`.github/workflows/town-main-pages-candidate.yml`（兩行）、本卡、`docs/CHANGELOG.md`。

## 驗收

1. 分支上手動觸發兩個工作流（`workflow_dispatch`）：T602 場景全綠（包含新的計時判準）；Pages 工作流除 `native-acceptance`（允許紅、只紀錄）以外全綠。
2. 合併後 main 上兩個工作流綠（`native-acceptance` 允許紅），`deploy` 跑完、`verify-published` 驗過真網址。
3. 網站版本＝main 的 `index.html`（v11.212，含 T602／T603 新圖）。

## 回滾

`git revert` 本卡的合併提交（工作流與場景腳本回到原樣）。

## 施工紀錄

（施工後補）
