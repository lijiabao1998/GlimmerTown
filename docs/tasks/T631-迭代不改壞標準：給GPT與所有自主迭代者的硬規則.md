# T631 迭代不改壞標準：給 GPT 與所有自主迭代者的硬規則

**發卡／施工**：業主 2026-10-10「gpt 是自主迭代，你給 gpt 制定個標準，就是不管是迭代玩法還是美術都不要迭代壞，然後讓 gpt 照著做」；看過草稿後「草稿沒問題，就按照正式的來」「放到綫上」。Claude 出卡＋施工。
**claim**：Claude；分支 `claude/town-iteration-standard-631`（工作樹 `C:/dev/glimmer-town-631`），base `043150f`；正常 PR 合併。只動文件，不改遊戲本體。
**合併權**：業主已看過草稿並同意；Claude 出卡＝施工同一方，如實聲明。

## 做法

1. 新增 `docs/迭代不改壞標準.md`：八節——開工前、玩法、美術、量測與效能、守衛、發佈、停手與回報、收工自檢清單。每條附這幾天真實踩過的坑當例子（T601 第一版的季節／鷹架／雙層雪、T602 計時尖峰、T604–T625 診斷迴圈、T601 循環守衛、T597 墓園容量）。
2. 新增倉庫根目錄 `AGENTS.md`：Codex／GPT 開工會自動讀這個檔；開頭指向標準，列出最常被忘的幾條，並指向 `docs/RULES.md`、`docs/COLLAB.md`、`docs/ARCH.md`。
3. 實驗線（`lijiabao1998/GlimmerTown-lab`）另走一張實驗線卡，放改成實驗線用語的同一份標準，`AGENTS.md`／`CLAUDE.md` 加連結。

## 允許觸碰

`AGENTS.md`（新）、`docs/迭代不改壞標準.md`（新）、本卡、`docs/CHANGELOG.md`。

## 驗收

`verify.py` ALL GREEN；合併後 main 的 Pages 工作流綠（遊戲本體沒變）；GitHub 上 `main` 看得到兩個檔。

## 回滾

`git revert`。

## 施工紀錄

**2026-10-10（Claude）**：照做法 1、2 落地；標準內容即業主看過的草稿，只把主線專用的指令（`verify.py`、`fp_snapshot.py`、`merge_bay.py --publish`、CHANGELOG 驗收欄）寫進對應條目，並補 `docs/RULES.md`／`docs/COLLAB.md` 的互相引用與「能直推 main 也不直推」一條（`docs/COLLAB.md` 載明 Codex 雲端被允許直推）。實驗線版本另見實驗線的卡。

**聲明**：Claude 出卡＝施工同一方，業主看過草稿並同意，未經第三方覆核，如實聲明。
