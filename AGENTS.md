# 微光小鎮·主線（town）— 給 GPT／Codex 與所有 AI 寫入者

> **English summary.** This is the main-line repo (`lijiabao1998/GlimmerTown`). Before any change, read `docs/迭代不改壞標準.md` (the owner's "never iterate it into breakage" standard, mandatory for gameplay and art), `docs/RULES.md` and `docs/COLLAB.md`. Work on a branch, keep `main` green, open a PR, and never claim a check passed unless it actually ran.

業主 2026-10-10 定：**不管迭代玩法還是美術，都不准迭代壞。** 開工前依序讀：

1. **`docs/迭代不改壞標準.md`**——必讀、每張卡收工前逐條對第 8 節自檢清單。
2. `docs/RULES.md`——施工鐵律（範圍、代碼、流程、存檔槽紀律）。
3. `docs/COLLAB.md`——誰寫哪裡、車位、埠號、雲端收件。
4. `docs/ARCH.md`——代碼地圖（改哪裡先在這裡找到位置）。
5. `docs/tasks/T639-主線跑法總綱.md`——業主 2026-10-14 交辦的主線跑法：一條落地路、誰能合什麼、T640–T649 卡序。GPT 怎麼跑以下面「GPT 連續迭代（T653）」一節為準：T639 裡「待辦空了就停、GPT 不自己出題」與 T649 不再適用。

## 最常被忘的幾條

- 分支 → CI 綠 → PR → 合併；**能直推 `main` 也不直推**，main 隨時要綠，不准帶紅合併、不准靠重跑賭過。
- **開分支就開 draft PR**，CI 自動跑（T640）；不准再把分支名寫進工作流，也不要拿手動 dispatch 代替 PR 的自動 CI（例外：動繪製迴圈或宣稱效能的卡，要手動 dispatch 一次跑只紀錄的 native-acceptance，結果寫進卡面；dispatch 那一輪的 gate 一律紅，跑完要在 Actions 重跑 PR 那一輪，gate 才會回綠，T642）；轉 ready 會重跑一輪；合併前把 Codex 的 P0／P1 在 PR 上一行回覆（修了附 commit，不修寫理由）。**合併一律 `sha=$(python tools/session_audit.py --premerge <PR>) && gh pr merge <PR> --merge --match-head-commit "$sha"`**：gate 綠、Codex 審過**當前 head** 且審完、P0／P1 都回覆了才放行，合併釘在驗過的 head 上；推了修補提交後，在 PR 留言 `@codex review` 讓它重審（T642）。
- **開工巡檢**：Claude 每次開工跑 `python tools/session_audit.py`，把四行結論給業主；沒回覆的 Codex P0／P1 登記在 `docs/REVIEW-FINDINGS.md`（T642），處置欄寫巡檢列出的「意見 <ID>」（T656）。
- **GPT 可以自己合併自己的 PR**（業主 2026-10-14「自己合就行」）：分支 CI 綠、PR 接在最新 `main` 上、`docs/迭代不改壞標準.md` 第 8 節自檢逐條打勾才合；美術照下面「GPT 連續迭代（T653）」一節：業主授權連續做的方向，第一波等業主看，第二波起自己合。
- **main 紅了**：讓它變紅的那次合併，由作者先開純 `git revert -m 1 <合併提交>` 的 PR，不在 main 上疊修補賭綠（T639）。直推進 main 的普通提交同樣用 `git revert <提交>`。純 revert 免卡面規則，棘輪以被撤提交的父提交為基準，這條路不會被守衛擋住（T650）。
- **開分支與推送**：`git switch --no-track -c <分支> origin/main`、`git push origin HEAD:refs/heads/<分支>`。本倉庫 `push.default=upstream`，從 origin/main 開的分支會追蹤 main，裸推會直推 main（T650 起因）。
- **提交身分**：Claude 提交一律 `git -c user.name=Claude -c user.email=noreply@anthropic.com commit`；GPT 在自己的工作樹設 repo-local `user.name="GPT (Codex)"`，只能經 GitHub 連接器以業主帳號提交時也可以（業主 2026-10-16 允許，T657），PR 內文第一行寫「GPT 編輯」；不動全域設定（T639）。
- 卡面（`docs/tasks/Txxx-*.md`）動手前先推，驗收條件之後不准改鬆；**claim 寫在卡頭**，不另開 `.claim` 檔（T639）。
- **新卡標題下一行要有卡頭機讀欄**（T641，CI 的 scope 會核）：`<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->`。`families`（改哪些美術家族，用 SPR_PINS 鍵「/」前的家族名逐字寫，逗號分隔，沒有寫「無」；CI 的 fp_diff 會比對，T643）、`valve`（逃生閥）、`removed_asserts`（有意刪掉幾條既有斷言）從卡面第一個 commit 起不准改；`owner_ok` 只准從空變成業主原話（附日期），有字之後不准改。一個 PR 一張卡；純文件（全部 `.md`）走快道，不跑瀏覽器各道。`gpt/` 分支動 `.github/`、`tools/`、規則檔、改既有斷言，CI 直接判紅，交 main 寫入者。
- 美術先給業主看樣張、業主點頭才接（業主授權連續做的方向照下面 T653 一節）；每張新圖要有逃生閥，閥關時整幀與改前相同；既有像素指紋零變動。**像素指紋以 CI 的 fp job 為正本**（T643）：改圖的 PR 只准原封提交同一個 PR 最近一輪 fp 附件（`Town-main-fp-<sha>`）裡的 `docs/SPR_PINS.json` 與 `docs/ART_PINS.json`，不准手改；動到的家族要寫進卡頭 `families`、`owner_ok` 要有業主原話；兩份基線衝突時都取 main 的版本，等 CI 重烘再原封提交。本機 `fp_snapshot.py` 只是預覽。**T654 起 SPR 家族解凍**：scene603 的精靈指紋鎖不再凍結 1586 鍵，改成跟著提交的 `docs/SPR_PINS.json` 走——只准在提交檔有差異的鍵上變，其餘照舊逐鍵不變。release635 不放寬：它把後批閥全關，照規矩掛登記 `tNNNOn` 閥的 SPR 美術在那裡會還原成舊值，所以仍逐鍵等於批准前的 main——沒掛閥或閥漏關的改圖照紅。gpt/ 分支可以提交 CI 重烘的 SPR_PINS（T653）。**SPR 之外按需烘焙的新美術要登記進 `GV.artAtlas646()`**（T646，`index.html` 裡 `sprAtlas356` 下面那一個），不登記 fp 就看不到。**整幀比對（T648）**：CI 的 frame job 逐幀比 base 與 head——非美術卡畫面要零變；美術卡卡頭要寫 `valve`，閥關時整幀等於 base；畫面變了 CI 出接觸表（附件 `Town-main-frame-<sha>`），業主看了點頭才寫 `owner_ok`（T653 連續迭代：owner_ok 逐字寫業主授權原話，見下面一節）。**業主批准的美術批次登記在 `docs/APPROVED_ART.json`**（T647：批准提交、`approved/*` 標籤、index 雜湊），發佈台架從這裡讀；改 `approved` 一節要卡頭 `owner_ok`，新批次加了 `tNNNOn` 就要在 `valves` 登記逃生閥（gpt/ 分支只准改 `valves` 一節，T653）。
- 玩法：六哨兵恆等、舊存檔來回不變、平衡數字前後多城配對比較並由業主決定。
- 量測先用最簡單的新舊交錯對比確認是不是真問題；**同一個問題診斷卡最多連開 2 張**，再來就交業主。
- 改到 `index.html`／`sw.js` 就 bump 版本；不准把雜湊或版本號寫死在腳本。
- 玩家本機目錄（`安卓探索\glimmer-town`、埠 8123）只在業主明說後用 `tools/merge_bay.py --publish` 發佈，任何人不得在那裡跑測試；載入遊戲的工具一律先把 `localStorage` 的 `glimmerville.v1.slot` 設成 `'3'`。
- **本機 master 只快轉**（T645）：`C:\dev\glimmer-town` 的 master 只做 `git fetch origin` 加 `git merge --ff-only origin/main`，不在上面施工、提交或合併；`--publish` 會擋領先 origin/main 的 master，`BAY --deploy` 已退役。
- 沒跑過的不寫「通過」；試兩次沒進展就停，交業主。
- **Codex 審查最多兩輪**（T651）：**P0，以及本次改動造成的回歸（不論 Codex 標 P1 還是 P2），都不受此限：任何一輪都必須修好；修不了就暫停，不准收尾合併**（`--premerge` 只看有沒有回覆，擋不住「回覆說不修」，要靠這條自律）。同一個 PR 修完兩輪 Codex 意見後，新冒出的意見——不是回歸的 P2 直接登記 `docs/REVIEW-FINDINGS.md`；P1 先判斷，是這張卡承諾的東西壞了、或本次改動造成的回歸，就修（修不了就暫停），只是「範圍還能再擴大」才在 PR 上一行回覆理由、登記後續卡號（`--premerge` 只要求 P0／P1 有回覆）。還不收斂就停手，把「收尾合併／再修／暫停」交業主。卡面先寫「範圍外」，審查意見落在那裡就照登記——但範圍外只豁免擴大涵蓋的建議，本次改動造成的回歸一律修或暫停。等 CI 超過十分鐘，主動告訴業主在等什麼、大概多久。

## GPT 連續迭代（T653）

業主 2026-10-16：「gpt main 改 main 做就行」「一次比如十個美術 然後一次二十波」「我覺得就第一波看 如果沒回應 繼續， gpt 的圖跟你的一樣 很放心」。
業主只給方向，GPT 照 [`docs/GPT-方向.md`](docs/GPT-方向.md) 一波接一波做，不必每波問業主。**每一波＝一張卡＝一條 `gpt/` 分支＝一個 PR。** 守住 main 的是 CI 的 gate，不是分支名；GPT 和 Claude 一樣是 main 寫入者，只是不碰守衛。
**本節是《迭代不改壞標準》§1.6、§3.1、§3.3、§8 對美術「業主點頭」的業主授權例外：照本節做，不算違反標準，不必再問業主。**

**方向檔**（以 `origin/main` 那份為準）：
- 「開關」（運行／暫停／停止／等方向）與「方向」只照業主原話改。業主在對話給方向時，GPT 開一個只改方向檔的 PR（文件道，gate 綠就自己合），原話逐字抄進「方向」、開關改「運行」，寫日期。
- 待辦、卡住、已完成三節由 GPT 維護，跟著每一波的 PR 一起更新。

**卡號**：GPT 用 **T670–T699**，用完接 **T800–T999**（T657）；Claude 兩段都不用。`git fetch origin --prune` 後，取這段裡 `origin/main` 與每一條 `origin/gpt/*` 分支的 `docs/tasks/` 都還沒用過的最小號（開著的 `[等業主]`、`[卡住]` 與等著合的 PR，佔的號只在它自己的分支上，main 看不到）。T999 也用完才停，在卡住表寫「卡號用完，請 Claude 再劃一段」。
**PR 標題**一律寫 `T6xx［待辦 N］主題`（N 是待辦表的序），下一波才知道哪些項已經有人在做。

**每一波**：
0. **開工**：`git fetch origin`；開關不是「運行」就不開新卡。看 main 最近一次跑完的主工作流與部署，紅了照下面「停手」處理。手上已經有一個要自己合的 gpt PR 開著，先把它做完或標卡住（第一波的 `[等業主]` PR 記在卡住表就算標過；等第一波而還不能合的第二波，算開著）。
1. **挑題**：待辦最上面、而且沒有開著的 gpt PR 標題寫著它的序的那一項（開著的 PR 正在做的項，main 的待辦表上看不出來）。待辦空了，照方向原話拆下一波寫進待辦：每項寫對應原話哪一句、要動的美術家族。
2. **卡面先推**：`git switch --no-track -c gpt/<主題> origin/main`。
   - 第一個 commit 只放卡 `docs/tasks/T6xx-*.md`。
   - 卡頭 `families` 寫要動的家族，`valve` 寫這波的逃生閥 `?noT6xx / window.__noT6xx`，`owner_ok` 見下。
   - 推上去，開 draft PR。
3. **施工**：照標準 §3 畫圖。
   - 新批次用行首 `function t6xxOn(){` 的啟用函式，網址 `?noT6xx=1` 與 `window.__noT6xx` 都要關得掉。
   - 在 `docs/APPROVED_ART.json` 的 `valves` 登記 `"T6xx": "__noT6xx"`（gpt/ 只准改這一節）。
   - 新美術登記進 `GV.artAtlas646()`，不登記 fp 看不到。
   - 提交身分：能設 repo-local `user.name="GPT (Codex)"` 就設；只能經 GitHub 連接器以業主帳號提交時照樣提交，PR 內文第一行寫「GPT 編輯」（T657）。作者不是閘門，不要為這個停下來。
4. **看 CI**：
   - fp 摘要動到的家族要包含在卡頭 `families` 裡。
   - 從這個 PR 最近一輪的 fp 附件 `Town-main-fp-<sha>`，原封提交 `docs/SPR_PINS.json`／`docs/ART_PINS.json`，不准手改；再推一次等 fp 綠。
   - 打開 frame 附件 `Town-main-frame-<sha>` 的接觸表，對照方向原話與標準 §3 自己檢查；不合格就自己重畫，不用問業主。
5. **合併**：
   - CI 每一道都要真的綠（fp、frame、scene、release 都算），不准帶紅合併。require-gate 規則集沒有繞過者，gate 紅本來就合不進去。
   - 一律開 PR 合併。protect-main 規則集對 Codex 連接器開了繞過（可以不經 PR 直推 main），那是給業主的，GPT 不准用。
   - PR 接在最新 main 上；標準第 8 節自檢逐條處理；Codex 審查照 T651（最多兩輪）。
   - 能跑就用 `sha=$(python tools/session_audit.py --premerge N) && gh pr merge N --merge --match-head-commit "$sha"`。
6. **合完**：看 main 主工作流與部署綠，在方向檔已完成表記一列（卡號、PR、日期、沒跑的守衛），回到第 0 步。

**owner_ok**：卡頭 owner_ok 逐字寫業主授權這個方向的原話與日期，例如 `業主 2026-10-16「我覺得就第一波看 如果沒回應 繼續」`。不准寫業主沒說過的話。

**業主授權連續做**（方向原話寫明「第一波看、沒回應就繼續」這類授權時）：
- **數量**：方向寫了波數或總數，就照那個數量做完；方向寫明「我不說停就一直做」這類話（業主 2026-10-16「我不説停就無限迭代」，T657），就沒有上限，一直做到業主說停或開關改掉。
- **第一波**：PR 標題加 `[等業主]`，CI 綠之後先不合，在卡住表記「等業主看第一波」。
  - PR 開滿 **12 小時**，業主沒在 PR 或對話裡說不行，就當同意：照第 5 步自己合，PR 內文引用授權原話。
  - 業主說要改，就照改再合。
  - 等的時候可以先做第二波（開卡、施工、CI 綠），但**第一波合併之前第二波先不合**；業主對第一波說要改，同樣的意見也套到第二波再合。
- **第二波起**（第一波合併之後）：不等業主，照第 5 步自己合。
- **仍要等業主或交 Claude**（PR 標 `[等業主]`，不自己合）：
  - 全局觀感：色調、光影、夜色、天氣、霧、倒影、影子、後製；
  - 建築、人、車的數量與密度；
  - 玩法數值、存檔格式；
  - 刪除或改畫已批准的舊圖；
  - 任何守衛：`tools/`、`.github/`、規則檔、別張卡的 `docs/tasks/t*-shots/`、`test_fixde.js` 的既有斷言。這些 scope 會判紅。

**卡住**：同一項推了 3 個 commit，CI 還紅在同一條、沒有進展＝卡住。開 `[卡住]` draft PR 留著，在卡住表寫一列（原因、PR），接著做下一項。

**停手**（碰到就停）：
- 開關改成暫停、停止或等方向；
- 連續 2 項卡住；
- `[等業主]` 與 `[卡住]` 的 PR 合計開著 3 個（第一波那個不算）；
- main 紅或部署紅：是自己合的那次弄紅的，先開純 `git revert -m 1` PR，然後停；
- 方向做完；卡號用完；
- 要做這一節沒寫到的對外動作。

實驗線（`lijiabao1998/GlimmerTown-lab`，業主桌面 `新的迭代`）有自己的 `AGENTS.md`；兩條線卡號各自獨立，規矩不要串。
