# 審查發現帳（T642）

合併前到的 Codex P0／P1，在 PR 上一行回覆（修了附 commit，不修寫理由）就好；沒回覆的會被開工巡檢（`tools/session_audit.py`）列出，登記在這裡。每條一行，不展開——發現帳本身不准長成新的儀式。

| PR | 等級 | 位置 | 處置 |
|---|---|---|---|
| #16 | P1 | .github/workflows/town-main-pages-candidate.yml:217 | 工作流寫死批准提交（APPROVED_BASE634）→ T647 核准美術登記冊取代 |
| #17 | P1 | docs/tasks/t635-shots/release635.cjs:44 | squash 合併後祖先檢查必紅 → 業主設定只留 merge commit 後已化解；T647 改用 approved/* 標籤＋雜湊 |
| #24 | P1 | docs/tasks/T640-CI改由PR自動觸發與收斂工作流.md:3 | 不成立：PR 的 7 個提交作者都是 `Claude <noreply@anthropic.com>`，審查看到的 Codex 作者應是審查環境自己的合併提交（PR 上已回覆） |
| #24 | P2 | AGENTS.md:16 | 照改 8e95b18：「不要手動 dispatch」加 native-acceptance 例外 |
| #26 | P2 | tools/scope.py:174 | 照改 c0fb94c：一 PR 一卡改成新卡＋動到的有卡頭舊卡合計、任何道都數（順手堵掉「碰別張舊卡借 removed_asserts」） |
| #26 | P2 | tools/scope.py:161 | 照改 c0fb94c：新卡第一個 commit 就要有合法卡頭 |
| #27 | P2 | tools/scope.py:187 | 照改 29c4e61：純 revert 比對改用 patch-id --verbatim，只差空白不算 |
| #28 | P1 | docs/tasks/T641-scope與gate文件快道卡頭機讀欄GPT越道與PASS棘輪.md:2 | 不成立：唯一的提交 7072cef 作者與提交者都是 `Claude <noreply@anthropic.com>`（同 #24）。**合併後才回覆**：合併步驟把意見印出來卻沒停，因此補了 `session_audit.py --premerge` |
| #29 | P1 | tools/session_audit.py:74 | 照改：premerge 要求 Codex 摘要的 headSha＝當前 head 且 status＝completed |
| #29 | P1 | tools/session_audit.py:76 | 照改：審查意見等清單一律分頁 |
| #29 | P2 | tools/session_audit.py:126 | 照改：gate 沒綠就合的 PR 報 gate-not-green |
| #29 | P2 | tools/session_audit.py:134 | 照改：發現帳比完整位置 `| #N |`＋`路徑:行號` |
| #30 | P2 | docs/tasks/T641-…md:62 | 照改：先標「待 CI」，有了 run 號與結果才改成綠 |
