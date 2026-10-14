# T637 GPT 可以自己合併自己的 PR（規則補一句）

**發卡／施工**：Claude。業主 2026-10-14 回 Claude 同日的問題「GPT 的合併權限：要不要寫進規則，並規定合併前必須等自動審查跑完？」：「自己合就行」。
**claim**：Claude；分支 `claude/town-gpt-self-merge-637`，base `b08ca05`。
**合併權**：同上；Claude 出卡＝施工同一方，如實聲明。

## 做法

- 根目錄 `AGENTS.md`「最常被忘的幾條」加一條：GPT 可以自己合併自己的 PR；條件是分支 CI 綠、PR 接在最新 `main` 上、`docs/迭代不改壞標準.md` 第 8 節自檢逐條打勾；美術要業主看圖的，照舊等業主點頭。
- `docs/迭代不改壞標準.md` 第 1 節第 6 條補同一句。
- 「合併前必須等自動審查跑完」業主沒有要求，**不加**這個條件。
- 實驗線同日另改（直推實驗線 main 297ebb3）：AGENTS 第 3 節例外段、標準、GPT／Codex 開場白、CLAUDE.md、AUTORUN.md、DECISIONS。

## 允許觸碰

本卡、`AGENTS.md`、`docs/迭代不改壞標準.md`、`docs/CHANGELOG.md`。不碰任何程式與測試。

## 驗收

`verify.py` ALL GREEN；分支 CI 綠；合併後網站照常部署。

## 回滾

`git revert`。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
