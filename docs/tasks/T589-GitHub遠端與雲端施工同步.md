# T589 GitHub 遠端與雲端施工同步協議

**發卡／施工**：業主 2026-09-24 指示「寫進去好了」，承接同日的三件事：主線首推 GitHub、建立 `protect-main` 規則集、把 ChatGPT Codex Connector 設為完全繞過。卡號接已入主的 T588。
**claim**：Claude；canonical master 直寫（T373 路徑），base `db3f1c1`／v11.198。開工前 `git fetch origin` 驗 `master..origin/main`＝0、`origin/main..master`＝0、工作樹 clean。
**合併權**：純文件卡，直寫 master；runtime 零變更、不 bump、不 `--publish`。Claude 出卡＝施工同一方，**未經非作者覆核，如實聲明**（T557 簽核閘允許的自簽聲明形式）。

## 定位錨與問題

- `docs/COLLAB.md` 第一節地理表（錨點 `| \`C:\dev\glimmer-town\` | **原始碼唯一真相**`）只列本機目錄。2026-09-24 起主線多了 GitHub 遠端 `origin`（`lijiabao1998/GlimmerTown`，**公開**），全套文件沒有一句描述它。
- 同日的規則集 `protect-main` 讓 Codex 雲端可以直推 `main`——這些提交完全不經本機 `verify.py`、亂數流哨兵、T557 簽核閘、凍結 base 與部署 receipt。沒有寫下來的收件協議，這就是一條新的無閘門路徑（T557 同族病：守衛站在沒人走的門口，而人走的是另一扇門）。
- 本地分支 `master` 與遠端 `main` 不同名；`push.default=upstream` 只存在本倉庫 config，沒有任何文件記載。

## 允許觸碰

- `docs/COLLAB.md`：第一節地理表**新增一列**（遠端），檔尾**新增第九節**。既有文字一字不改。
- `docs/CHANGELOG.md`：慣例區後插入 T589 條目（最新在最上）。
- 本卡。

## 禁區與停手線

- `index.html`、`sw.js`、`test_fixde.js`、`tools/`、`docs/ARCH.md` 與其他 docs 零觸碰（不 bump，也就不需要 `arch_map --fix`）。
- 不改「進場三連」（COLLAB 鐵律21）的三條命令本身；`fetch` 寫成第九節的前置步驟，不重編號任何既有規則。
- 不動 GitHub 規則集或倉庫設定：本卡只記錄 2026-09-24 的現況。
- 不推送：本卡落地後推不推 GitHub，由業主決定。

## 驗收

- `git diff --stat` 只出現允許的三個檔；`git diff --check` 為 0。
- CRLF＝0（`verify.py` 第 2 項已涵蓋 `docs/*.md` 與 `docs/tasks/*.md`）。
- `python tools/verify.py` ALL GREEN；T557 閘對新條目的三條斷言（有驗收欄／具名／無待覆核語意）通過。
- 第九節的每個事實都有可覆核來源：遠端網址（`git remote -v`）、`push.default`（`git config --local push.default`）、規則集內容（`gh api repos/lijiabao1998/GlimmerTown/rules/branches/main`，任何人可讀）、首推 OID（`git ls-remote origin`）。

## 回滾

`git revert <T589 commit>`。純文件，無 runtime、無部署。

## 施工紀錄

- 2026-09-24 開工：`git fetch origin` 後 `master..origin/main`＝0、`origin/main..master`＝0，工作樹 clean，base `db3f1c1`。
- 動了三個檔：COLLAB.md +72 行（第一節一列＋第九節）、CHANGELOG +1、本卡；`git diff --check`＝0。
- 第九節的數字全是當日實測：`merge_bay.py` 第 357 行 `if branch != 'master'`、`git grep -c -w master` 得 98（`merge_bay.py`）與 35（`test_toolchain.py`）；規則集 id 23925785 由 `gh api .../rules/branches/main` 讀回 `deletion`、`non_fast_forward`、`pull_request`（核准數 0）三條。
- **自己抓到自己的一次誤判**：第一次查 CRLF 用 `grep -c $'\r'`，三個檔都回報「每行都有 CR」，連沒動過的 `ARCH.md` 和 HEAD blob 也一樣——這不合理。改用 Python 數位元組，真值是三檔 CR＝0；在這個 shell 裡 `$'\r'` 沒被解讀成 CR，成了匹配每一行的空樣式。以 `verify.py` 的 CRLF=0 為準。
- `python tools/verify.py`：**ALL GREEN**，PASS=11698（T588 為 11695；+3＝T557 閘對新條目的三條斷言），exit 0，六哨兵 seed22=639／seed22m=14523／seed301=780／seed301m=2297／seed7=117／seed7m=77 全吻合，code map fresh。
- 覆核狀態：Claude 出卡＝施工同一方，未經非作者覆核，如實聲明。
