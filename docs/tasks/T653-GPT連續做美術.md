# T653 GPT 連續做美術：只擋守衛、主線方向檔、第一波看沒回應就繼續
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude，2026-10-16。
**claim**：Claude；分支 `claude/town-gpt-waves-653`。
**業主原話**：
- 「我覺得 gpt main 改 main 做就行」
- 「gpt 的美術標準是沒問題……一次比如十個美術 然後一次二十波」
- 「我覺得就第一波看 如果沒回應 繼續， gpt 的圖跟你的一樣 很放心」
- 「你 把 gpt 需要的前置工程做完」

**取代**：同日 11 張卡的設計（建 App、lane-guard／merge-ok 必要檢查、owner_ok 改留言）不做。業主選擇信任 GPT 當 main 寫入者，守住 main 的仍是 CI 的 gate。

## 起因

業主要 GPT 拿到一句話就連續做很多波美術（例：每波 10 座、20 波），不要卡住。主線現在會把 GPT 卡在三處：

1. scope 的 gpt 越道把 `docs/SPR_PINS.json`、`docs/APPROVED_ART.json` 也算越道。新美術批次要在登記冊的 `valves` 登記逃生閥，改到 SPR 家族要提交重烘的指紋，所以 GPT 的美術 PR 一定紅（#39 就卡在 gate／scope）。
2. 主線沒有方向檔，也沒有 GPT 連續迭代的規則：每個任務做一張就停，下一次不知道從哪接；碰到要看圖的點就停下來等。
3. `docs/HANDOFF-GPT.txt` 是 2026-07 的舊手冊，叫 GPT 開 8123 埠（業主的玩家目錄）、CHANGELOG 寫「驗收:通過」，和現行規則衝突。

## 做什麼

1. **`tools/scope.py`**：gpt/ 越道只擋守衛。
   - 照擋：`.github/`、`tools/`、規則檔、`test_fixde.js` 刪改既有行、別張卡的 `docs/tasks/t*-shots/`（裡面是台架程式）。
   - 拿掉：`docs/SPR_PINS.json`、`docs/APPROVED_ART.json`。
   - gpt/ 的純 revert 查被撤提交自己的正向 diff（審查修正 2）。
   - 巡檢（session_audit）同步，含登記冊只准改 valves（審查修正 5）。
   - 但 gpt/ 改登記冊的 `approved` 一節（業主批准的批次與錨點）照樣算越道；`valves` 一節可以改。
   - `gpt_lane()` 純函式同步（巡檢共用）；docstring 同步。
2. **`docs/GPT-方向.md`（新）**：主線版方向檔，照實驗線的格式：開關、方向（業主原話逐字）、待辦、卡住、已完成。GPT 卡號保留 T670–T699，避免和 Claude 撞號。
3. **`AGENTS.md` 新增「GPT 連續迭代（T653）」一節**：
   - 每波一卡一 PR；卡面先單獨推；
   - 美術 PR 自己合的條件：CI 全綠（含 fp、frame）、原封提交本 PR 最近一輪 fp 附件的指紋、新批次的閥登記在 `valves`、卡頭 owner_ok 逐字引用業主授權原話；
   - **業主授權連續做**：第一波開 `[等業主]` PR，開滿 12 小時業主沒說不行就自己合；第二波起不等；全局觀感、玩法、刪改舊圖、守衛仍要等業主或交 Claude；
   - 卡住記卡住表、跳下一波；連續 2 波卡住、main 紅、Pages 紅就停；
   - 第 24 行等處的 gpt 限制文字同步。
4. **`docs/迭代不改壞標準.md` §3.2**：gpt 那半句同步。
5. **`docs/HANDOFF-GPT.txt`**：檔頭加作廢說明，指到 AGENTS 新節。
6. **`docs/REVIEW-FINDINGS.md`**：補登 Codex #41 P1（意見 4290085613，T656 卡面沒先推）。本卡第一個 commit 就做，照 T656 的承諾。

## 範圍外

- GitHub 設定（App、必要檢查、bypass）一律不動。現況（2026-10-16 用 `gh api .../rulesets/<id>` 實查）：
  - require-gate 沒有繞過者，gate 紅誰都合不進 main；
  - protect-main 對 Codex 連接器（Integration 1144995）是 Always allow（COLLAB 規則集表），GPT 技術上可以不經 PR 直推 main。這條守不住的是自律，寫進 AGENTS，不改設定。
- 美術核准改成 PR 留言、owner_ok 出處驗證：不做，業主選擇信任。
- T655（整幀比對後續）。

## 紅源

- `test_scope`：
  - gpt/ 提交 SPR_PINS → 綠（原本紅）；
  - gpt/ 在登記冊 `valves` 加自己的閥 → 綠（原本紅）；
  - gpt/ 改登記冊 `approved` → 紅，規則 gpt-lane；
  - gpt/ 碰 tools／.github／規則檔／別張卡的台架 → 照紅；
  - `gpt_lane()` 純函式各分支。
- `test_session_audit`：巡檢的 gpt 判定同步（SPR_PINS、登記冊不再報；守衛照報）。
- 突變：新判定逐條改鬆或改嚴，對應測試要紅。
- 文件：AGENTS 新節、方向檔、HANDOFF 作廢說明，對照現行規則逐條核（施工紀錄寫出核對結果）。

## 驗收

工具鏈全綠、`verify.py` ALL GREEN、本卡 PR 的 gate 綠、Codex 照 T651。

## 放寬了什麼（寫明）

- **放寬**：gpt/ 可以提交 `docs/SPR_PINS.json`、可以改登記冊的 `valves`。
- **理由**：業主信任 GPT 當 main 寫入者；這兩個檔被擋，GPT 的美術 PR 一定紅。
- **還留著什麼**：
  - 指紋要等於 CI 實算（fp_diff）；
  - 動到的家族要寫進卡頭、要有 owner_ok；
  - 新批次的閥要真的關得掉（approved_art 的後批規則）；
  - 閥關時整幀等於 base（frame）；
  - release635 逐鍵等於批准前的 main；
  - gpt/ 照樣不准碰守衛與 `approved`。
- **已知風險**（業主選擇接受）：
  - GPT 可以借一張已核准舊卡的 families／owner_ok（T654 審查找到）；
  - 卡頭 owner_ok 是 GPT 自己寫的，機器分不出是不是業主原話。
  - 補法：開工巡檢把每個合併 PR 的 owner_ok 原話列給業主看。

## 回滾

`git revert`。

## 施工紀錄

- **scope**：`gpt_lane()` 拿掉 SPR_PINS 與登記冊兩條；新純函式 `gpt_registry_problem(bt, ht)` 只准改 `valves`（建立、刪除、解析失敗、頂層不是物件、改其他頂層鍵都算越道，用排序 JSON 比，`True` 不等於 `1`）。檢查放在純 revert 清空之後。
- **方向檔、AGENTS 新節、標準 §3.2、HANDOFF 作廢說明、補登 Codex #41 P1**：照「做什麼」。
- 實查規則集（`gh api .../rulesets/<id>`）：require-gate 沒有繞過者；protect-main 對 Codex 連接器 Always allow。AGENTS 原本寫「規則集對連接器開了繞過、不准拿來合紅的 PR」不準確，改成「gate 紅本來就合不進去；protect-main 的繞過（不經 PR 直推）GPT 不准用」。
- **施工前對抗審查**（工作流 3 面向、每條再派人反駁，12 個代理）：成立 7 條（去重 6 件），全修；駁回 1 條。
  1. P1 撞號：第一波等業主時先做第二波，第二波只看 main，會拿到同一個卡號、做同一個待辦項（審查者用 scope 實際模擬出撞號紅）。
     改成卡號要看 main 加每一條 `origin/gpt/*` 分支；PR 標題寫 `T6xx［待辦 N］`，下一波跳過開著的 PR 正在做的項。
  2. P1 GPT 撤不了自己那一波：照 AGENTS 開純 revert，scope 會把刪自己的台架目錄、拿掉自己加的 test_fixde 行判成越道，main 一直紅到 Claude 來（違反 T650）。
     改成 gpt/ 的純 revert 查被撤提交自己的正向 diff（問「當初能不能從 gpt/ 落地」）。撤別人的守衛或 approved 改動照紅（既有兩條測試照過），補單元一條。
  3. P1 標準 §1.6、§3.1、§3.3、§8 與 AGENTS 第 24 行還寫「美術要業主點頭」：照字面 GPT 第二波起永遠不敢自己合。
     各處加 T653 例外；新節開頭寫明「本節是標準對美術『業主點頭』的業主授權例外」。
  4. P1 第二波可能在第一波被業主看到之前就合併上線：改成第二波可以先做到 CI 綠，但第一波合併之前不合；業主對第一波的意見也套到第二波。
  5. P2 巡檢不再查 gpt/ 改登記冊 `approved`：補上 `registry_pair()`，比照 CI 拿合併提交的第一個父提交和合併提交比，補單元一條。
  6. P2 T639 總綱還寫「待辦空了就停、GPT 不自己出題」：T639 不改；AGENTS 必讀清單那一行註明「GPT 怎麼跑以 T653 一節為準，T639 那兩句與 T649 不再適用」。
  - 駁回：「照自然方式給既有種類加款式會撞發佈台架紅」——台架事實正確，但 GPT 照新節做（新批次 tNNNOn＋登記閥，台架會關掉它）就不會撞上。
- 單元：test_scope 38 條、test_session_audit 35 條；工具鏈 176 條；verify.py ALL GREEN。
- 突變 14 個全殺：
  - gpt 改 approved 不擋、登記冊檢查整段拿掉、只比 approved、用 == 比、建立放行、刪除放行；
  - SPR_PINS 又算越道、登記冊又整檔算越道（scope 與巡檢各一）、守衛不擋；
  - gpt 純 revert 改回查反向 diff、純 revert 不認被撤的卡；
  - 巡檢不查登記冊、巡檢比錯父提交。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
