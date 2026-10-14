# 微光小鎮·主線（town）— 給 GPT／Codex 與所有 AI 寫入者

> **English summary.** This is the main-line repo (`lijiabao1998/GlimmerTown`). Before any change, read `docs/迭代不改壞標準.md` (the owner's "never iterate it into breakage" standard, mandatory for gameplay and art), `docs/RULES.md` and `docs/COLLAB.md`. Work on a branch, keep `main` green, open a PR, and never claim a check passed unless it actually ran.

業主 2026-10-10 定：**不管迭代玩法還是美術，都不准迭代壞。** 開工前依序讀：

1. **`docs/迭代不改壞標準.md`**——必讀、每張卡收工前逐條對第 8 節自檢清單。
2. `docs/RULES.md`——施工鐵律（範圍、代碼、流程、存檔槽紀律）。
3. `docs/COLLAB.md`——誰寫哪裡、車位、埠號、雲端收件。
4. `docs/ARCH.md`——代碼地圖（改哪裡先在這裡找到位置）。
5. `docs/tasks/T639-主線跑法總綱.md`——業主 2026-10-14 交辦的主線跑法：一條落地路、誰能合什麼、T640–T649 卡序。

## 最常被忘的幾條

- 分支 → CI 綠 → PR → 合併；**能直推 `main` 也不直推**，main 隨時要綠，不准帶紅合併、不准靠重跑賭過。
- **開分支就開 draft PR**，CI 自動跑（T640）；不准再把分支名寫進工作流，也不要拿手動 dispatch 代替 PR 的自動 CI（例外：動繪製迴圈或宣稱效能的卡，要手動 dispatch 一次跑只紀錄的 native-acceptance，結果寫進卡面）；轉 ready 會重跑一輪；合併前把 Codex 的 P0／P1 在 PR 上一行回覆（修了附 commit，不修寫理由）。
- **GPT 可以自己合併自己的 PR**（業主 2026-10-14「自己合就行」）：分支 CI 綠、PR 接在最新 `main` 上、`docs/迭代不改壞標準.md` 第 8 節自檢逐條打勾才合；美術要業主看圖的，照舊等業主點頭再合。
- **main 紅了**：讓它變紅的那次合併，由作者先開純 `git revert -m 1 <合併提交>` 的 PR，不在 main 上疊修補賭綠（T639）。
- **提交身分**：Claude 提交一律 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit`；GPT 在自己的工作樹設 repo-local `user.name="GPT (Codex)"`；不動全域設定（T639）。
- 卡面（`docs/tasks/Txxx-*.md`）動手前先推，驗收條件之後不准改鬆；**claim 寫在卡頭**，不另開 `.claim` 檔（T639）。
- **新卡標題下一行要有卡頭機讀欄**（T641，CI 的 scope 會核）：`<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->`。`families`（改哪些美術家族，沒有寫「無」）、`valve`（逃生閥）、`removed_asserts`（有意刪掉幾條既有斷言）從卡面第一個 commit 起不准改；`owner_ok` 只准從空變成業主原話（附日期），有字之後不准改。一個 PR 一張卡；純文件（全部 `.md`）走快道，不跑瀏覽器各道。`gpt/` 分支動 `.github/`、`tools/`、規則檔、改既有斷言，CI 直接判紅，交 main 寫入者。
- 美術先給業主看樣張、業主點頭才接；每張新圖要有逃生閥，閥關時整幀與改前相同；既有像素指紋零變動。
- 玩法：六哨兵恆等、舊存檔來回不變、平衡數字前後多城配對比較並由業主決定。
- 量測先用最簡單的新舊交錯對比確認是不是真問題；**同一個問題診斷卡最多連開 2 張**，再來就交業主。
- 改到 `index.html`／`sw.js` 就 bump 版本；不准把雜湊或版本號寫死在腳本。
- 玩家本機目錄（`安卓探索\glimmer-town`、埠 8123）只在業主明說後用 `tools/merge_bay.py --publish` 發佈，任何人不得在那裡跑測試；載入遊戲的工具一律先把 `localStorage` 的 `glimmerville.v1.slot` 設成 `'3'`。
- 沒跑過的不寫「通過」；試兩次沒進展就停，交業主。

實驗線（`lijiabao1998/GlimmerTown-lab`，業主桌面 `新的迭代`）有自己的 `AGENTS.md`；兩條線卡號各自獨立，規矩不要串。
