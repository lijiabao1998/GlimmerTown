# 審查發現帳（T642）

合併前到的 Codex P0／P1，在 PR 上一行回覆（修了附 commit，不修寫理由）就好；沒回覆的會被開工巡檢（`tools/session_audit.py`）列出，登記在這裡。每條一行，不展開——發現帳本身不准長成新的儀式。

| PR | 等級 | 位置 | 處置 |
|---|---|---|---|
| #16 | P1 | .github/workflows/town-main-pages-candidate.yml:217 | 工作流寫死批准提交（APPROVED_BASE634）→ T647 核准美術登記冊取代 |
| #17 | P1 | docs/tasks/t635-shots/release635.cjs:44 | squash 合併後祖先檢查必紅 → 業主設定只留 merge commit 後已化解；T647 改用 approved/* 標籤＋雜湊 |
| #24 | P1 | docs/tasks/T640-CI改由PR自動觸發與收斂工作流.md:3 | 不成立：PR 的 7 個提交作者都是 `Claude <noreply@anthropic.com>`，審查看到的 Codex 作者應是審查環境自己的合併提交（PR 上已回覆） |
| #24 | P2 | AGENTS.md:16 | 照改 8e95b18：「不要手動 dispatch」加 native-acceptance 例外 |
