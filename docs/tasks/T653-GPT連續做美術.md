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

- GitHub 設定（App、必要檢查、bypass）一律不動。現況：require-gate 規則集對 ChatGPT Codex Connector 是 Always allow（COLLAB §規則集），GPT 經連接器合併在技術上可以不等 gate。這條守不住的是自律，寫進 AGENTS，不改設定。
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

（施工後補）

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
