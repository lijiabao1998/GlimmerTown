# T650 revert 道永遠開著：純 revert 免卡面規則、棘輪以被撤提交的父提交為基準
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude。T639 主線跑法「main 紅了就開純 revert PR」的補洞卡，由 T641 合併後的一次誤推引出。
**claim**：Claude；分支 `claude/town-revert-path-650`。

## 起因（照實寫）

T641 合併（e4d9402）後，要做「文件快道＋凍結欄違規」的實測：開一個丟棄用的草稿 PR，只改 T641 卡頭 `families`（無→fire），看 scope／gate 變紅就關掉。

分支是用 `git switch -c X origin/main` 開的，會自動追蹤 main；這個倉庫的 `push.default=upstream`，所以 `git push origin X` **推到了 main**。業主憑證有規則集繞過權，「必須走 PR」只記成 bypass，沒有擋下。違規提交 0a2b1d8 就這樣直接進了 main。

要照 T639 開 revert PR 時，才發現 scope 自己會擋住這條路：

1. `is_pure_revert` 只認 main 上的**合併提交**；0a2b1d8 是直推的普通提交，撤銷它不算純 revert。
2. 就算認得出來，純 revert 也只免了「一 PR 一卡」。撤銷 0a2b1d8 會把 families 從 fire 改回「無」，照樣被**凍結欄規則**判紅。
3. 棘輪拿撤銷前的 base 比。撤銷一個加過斷言的 PR，PASS 數一定下降，**棘輪必紅**。

也就是說，「main 紅就 revert」這條規則可能被守衛自己卡死。等業主把 gate 設成必要檢查以後，這種 revert PR 就只能靠繞過權合併。

## 改什麼

- `tools/scope.py`
  - `is_pure_revert` 改成認 main 第一父鏈上的任何提交（合併或直推），比對它對第一父的反向 diff。
  - 認定為純 revert 時，卡面規則（一 PR 一卡、卡頭、凍結欄、owner_ok、撞號）全免，因為它只是把 main 退回它自己有過的內容；gpt 越道與寫死 SHA 照查。
  - 新輸出 `ratchet_base`：純 revert 時是被撤提交的第一父，否則是 base。
  - 只在「卡面有違規」或「full 道（要跑棘輪）」時才算是不是純 revert，因為要算幾十個 patch-id。
- 工作流：scope 輸出 `ratchet_base`；棘輪用它當基準，舊版 scope.py 沒給就用 base（本卡自己的 PR 跑的是 base 上的舊 scope.py）。
- AGENTS：「main 紅了」那一行補一句，說明純 revert 免卡面規則、直推的提交也一樣用 `git revert`。

## 紅源

- 單元測試（`tools/test_scope.py`）新增 6 例：
  - 撤銷直推的凍結欄改動 → 綠，且 `ratchet_base`＝被撤提交的父提交。
  - 不是純 revert（順手改內文）→ 照樣判凍結欄紅。
  - 撤銷直推的加斷言 → full 道綠、`ratchet_base` 換掉。
  - 撤銷「只改有卡頭舊卡內文＋加斷言」的合併 → 卡面本來就沒違規，`ratchet_base` 照樣換掉。
  - 不是 revert 時 `ratchet_base`＝base。
  - gpt/ 的純 revert 照查越道。
- 突變：只認合併提交、純 revert 不免卡面規則、棘輪基準恆為 base、只在卡面違規時才查 revert，各自要首紅在目標測試。
- **實案**：本卡合併後，開撤銷 0a2b1d8 的 PR，scope 判純 revert、gate 綠，合併後 main 回到 families=無。

## 驗收

- 工具鏈全綠、`verify.py` ALL GREEN、突變全中。
- 本卡 PR 的 gate 綠。
- 撤銷 0a2b1d8 的 PR gate 綠並合併；main 上 T641 卡頭回到 `families=無`。

## 施工紀錄

**2026-10-15（Claude）**

- 誤推那輪剛好成了 T641「文件道＋凍結欄違規」的真實紅源，比原本打算的丟棄用 PR 更直接：push main run 38621256674 的結果是 scope 紅（`card-frozen`：families 在 0a2b1d8 從「無」改成 fire），validate 綠，重的各道 7 個全 skipped（docs 道），gate 紅，deploy／verify-published skipped。網站沒有被重新部署，停在 T641 那輪（run 38621187714，deploy＋verify-published 綠）。
- 實作照「改什麼」。scope 對真倉庫跑一次 18 秒（Windows；60 個 patch-id）。
- 本機預演撤銷 0a2b1d8（`commit-tree` 拿 e4d9402 的樹、父提交 0a2b1d8）：docs 道、`revert_of`＝0a2b1d8、`ratchet_base`＝e4d9402、無違規。
- **紅源（本機突變）**：本卡 5 條加 T641 原有 13 條，共 18 條全首紅在目標測試。第一輪「只在卡面違規時才查 revert」沒被抓到：所有測試的純 revert 都恰好帶卡面違規。補了「撤銷只改有卡頭舊卡內文＋加斷言的合併」（卡面乾淨、棘輪照樣要換基準）後抓到。單元測試 20→27 例，工具鏈 83→90 例全綠。（PR 第一版的說明寫「18 種」，其實當時是 4＋13＝17 種，T641 原有的條數數錯了；加了下一條的第 5 條後才是 18。）
- **Codex 審查 P2（PR #27），照改**：`git patch-id --stable` 會剝掉空白。內容等於反向 patch、只多一個空白的改動（例如卡頭前多一個空格，卡頭因此失效）會被認成純 revert，連卡頭規則一起免掉。純 revert 既然要免掉全部卡面規則，比對就得逐字：改用 `--verbatim`（git 2.40 起有），加 `test_whitespace_altered_revert_is_not_pure`，突變「patch-id 剝空白」首紅在它。預演撤銷 0a2b1d8 照樣判純 revert。
- AGENTS 加兩行：「main 紅了」補直推提交與純 revert 免卡面規則；「開分支與推送」寫明 `--no-track` 與 `HEAD:refs/heads/<分支>`。
- 本卡不碰 T641 卡（一 PR 一卡）。T641 卡面「文件快道實測結果補在下方」那一筆，等本卡和撤銷 PR 合併後，由一個純文件 PR 去補。那個 PR 本身也就是文件快道的綠色實測：gate 綠、重的各道 skipped、合併後不部署。
- `verify.py` ALL GREEN。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
