# T705 CI 整幀比對加鐵道與列車場景
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude，2026-10-22。
**claim**：Claude；分支 `ccr-55a8c5ef-8fh1h5`（本會話指定分支）；base `0d6954e`（T704 合併後的 main，v11.246）。
**如實聲明**：等 T704 CI 時，場景的鋪法已先在暫存區試做（只是實驗，沒進 repo）；本卡的驗收條件在那之前寫好，之後沒改。
**業主原話**：2026-10-22「Claude，你讀一下鐵軌狀況，然後把鐵軌問題和火車高鐵動畫解決掉」；同日選「每張卡先給我看圖」。

## 問題

CI 的 frame job（T648）有 6 個場景：兩座存檔城市、消防、住商工、設施、工業。**沒有一個場景有鐵軌或列車**，所以：

- 夜間白屏（T704）那種只在有鐵路時才發生的錯，CI 看不到；
- 接下來的軌道、列車、平交道、橋、月台、高鐵各卡改了畫面，接觸表上也看不到，業主沒有圖可以點頭。

## 做什麼

`tools/pages/frame-compare.cjs`：

1. 新增 `railRig()`：用遊戲本身的 `GV.place('rail'|'road'|'tram'|'station', x, y)` 鋪一張鐵道測試場（和玩家操作同一條路）：
   - 東西向主線，跨過一條南北向道路（平交道）；
   - 東端 L 彎往南、南端 L 彎往西；
   - T 字岔線往南、盡頭是線尾（車擋）；
   - 十字交叉；
   - 過水的鐵路橋；
   - 一座車站（3×3，已落成）挨著主線；
   - 輕軌接鐵路的接頭；
   - 一組平行雙線。
   之後 `recalcAllMasks()`、`recalcAllRailMasks()`。
2. 五列固定位置的三節列車（直線、轉角、線尾前、橋上、平行線上），`frame()` 在 `freeze()` 清空載具之後放回去，所以每一幀畫的都是同一組列車。
3. 兩個新場景：`rail`（zoom 0.7，整張測試場）與 `rail-close`（zoom 1.6，轉角、十字、車站一帶）。各照既有 `states()` 出 15 幀（4 視角×晝夜、春秋、冬有雪／沒雪、雪夜、高畫質晝夜）。
4. `--self-test` 加一條：場景表裡有這兩個鐵道場景。

## 驗收條件（動手前寫好，之後不改鬆）

- [x] `node tools/pages/frame-compare.cjs --self-test` 綠。
- [x] 本機用新工具跑 main 對 main：兩個鐵道場景每一幀都穩定（unstable 0）且 base 兩頁相同；接觸表看得到軌道與列車，晝夜、雪都看過。
- [x] 紅源：本機把 head 的 `index.html` 改壞一處鐵道畫法（例如 `SPR.railBridge` 的軌長），新工具在鐵道場景報出變動的幀，原有 6 個場景不變。
- [ ] 本 PR 的 CI frame job 用 base 的工具（照 T648 設計），所以本 PR 自己那一輪看不到新場景，這是預期；證據以本機實跑為準，寫在本卡。
- [ ] CI 每一道綠；Codex 照 T651；`session_audit.py --premerge` 放行才合。

## 允許觸碰

`tools/pages/frame-compare.cjs`、本卡與 `docs/tasks/t705-shots/`、`docs/CHANGELOG.md`。不動 `index.html`（不升版）。

## 範圍外

鐵道與列車本身的任何修正（T706 起各卡）。

## 回滾

純 `git revert -m 1` PR。

## 施工紀錄

**2026-10-22（Claude）**

- 卡面先推（`ddac446`），之後提交工具（`f6ae2e1`）。
- `tools/pages/frame-compare.cjs`：頁內橋加 `railRig()`（`GV.place` 鋪場；同一格第二次經過就跳過，其餘放置失敗直接丟錯）與 `keepTrains()`（`freeze()` 後放回固定列車；非鐵道場景沒有固定列車，行為和原本逐字相同）；場景表加 `rail`（中心 31,29、zoom 0.7）與 `rail-close`（中心 40,26、zoom 1.6）；`--self-test` 加一條。
- 固定列車五列：主線直線、東端轉角（車頭剛轉過彎）、T 岔線尾前、橋上、平行線。
- 本機：`--self-test` ok；同版對同版 8 場景 121 幀 0 變；紅源（橋的軌長 6→8）只紅在 `rail` 全景 15 幀，原 6 場景 0 變，base 兩頁逐幀相同。詳 `t705-shots/README.md`。
- CI、Codex：見 PR，結果回填這裡。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核。
