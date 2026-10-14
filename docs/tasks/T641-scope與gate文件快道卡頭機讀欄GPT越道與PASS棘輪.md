# T641 scope／gate：文件快道、卡頭機讀欄、gpt/ 越道判紅、PASS 棘輪
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**發卡／施工**：Claude。T639 主線跑法總綱第二張施工卡（業主 2026-10-14「你決定主綫怎麽加」「方案出來之後直接施工就行」）。
**claim**：Claude；分支 `claude/town-scope-gate-641`。
**合併權**：Claude（守衛／規則道）；Claude 出卡＝施工同一方，如實聲明。

## 起因

「誰能合、要跑哪些閘門」現在全靠文字：`protect-main` 沒有必要檢查、核准數 0；5 個純文件 PR 各跑了約 23＋9 分鐘；CI 的 `--min-pass 12534` 比實際 PASS（約 12,616）低約 80 條，刪幾十條斷言照樣綠；AGENTS「不准寫死雜湊」兩天內被寫回兩次。實驗線的同類條件也只停在文字（T744 卡自承靠 GPT 自律）。對應文章：語意核准規則、審意圖多於逐行。

## 做法

1. 新 `tools/scope.py`（只讀、只用標準庫）：輸入 base、head、head_ref，輸出 JSON 與工作摘要。
   - **道別**：改動全部以 `.md` 結尾＝docs，否則 full（所以 `docs/tasks/*-shots/*.cjs`、`SPR_PINS.json` 自然走 full）。
   - **卡頭機讀欄**：這次新增的 `docs/tasks/T*.md`，標題下一行必須是 `<!-- card: families=…; valve=…; owner_ok=…; removed_asserts=… -->`。`families`、`valve`、`removed_asserts`（與可選的 `cont`）從第一個加入這張卡的 commit 起凍結；`owner_ok` 只准從空變成業主原話，有字之後不准再改。base 已經有卡頭的卡，同樣不准改凍結欄。新卡號在 base 已存在＝撞號。舊卡（沒有卡頭）照舊可以補記。
   - **一 PR 一卡**：full 道要帶一張卡（新增一張，或沒新增時恰好修改一張已有卡頭的卡）；純 revert（diff 的 `git patch-id` 等於某個 main 合併提交第一父的反向 diff）免卡。
   - **gpt/ 越道**：`head_ref` 是 `gpt/**` 時，碰 `.github/`、`tools/`、`test_fixde.js` 的刪改行（只新增不算）、不屬於本卡的 `docs/tasks/*-shots/`、`docs/SPR_PINS.json`（T643 起另有例外）、規則檔（AGENTS.md、docs/RULES.md、docs/COLLAB.md、docs/迭代不改壞標準.md）＝紅，訊息寫「交 main 寫入者」。
   - **寫死提交 SHA**：守衛程式（`.github/`、`tools/`、`docs/tasks/*-shots/`、`test_fixde.js` 裡的 .js/.cjs/.mjs/.py/.yml/.yaml/.sh）新增行出現 40 位十六進位＝紅；`docs/APPROVED_ART.json` 例外（T647 建立）；JSON 證據不算；64 位只警告。
2. 工作流：
   - 第一個 job `scope`；`scope.py` 取自 base（`git show $BASE:tools/scope.py`），base 沒有才用 head 的——PR 改 scope.py 要合併後才生效。分支名經環境變數傳入，不嵌進指令。
   - browser、package、pages-browser、兩個 release、scene602 加 `if: !cancelled() && lane=='full'`；validate 兩道都跑。
   - 新 `ratchet`（full 道）：同一台跑機上 base 與 head 各跑一次完整 test_fixde，head 的 PASS 不准少於 base 減卡頭 `removed_asserts`。
   - 新 `gate`（`if: always()`）：docs 道要 scope＋validate 綠、其他 skipped；full 道每一道都要綠。**它是唯一的必要檢查**（業主在 GitHub 規則集只要求它，見總綱）。
   - deploy 改成 `needs: [scope, gate]`，純文件推 main 不重新部署。
3. 單元測試 `tools/test_scope.py`（臨時 git 倉庫當夾具，不開遠端測試分支），由 `tools/test_toolchain.py` 匯入，所以既有的「Toolchain regression」一步就會跑到。
4. `AGENTS.md`：卡頭欄位寫法與一 PR 一卡。

## 放寬了什麼

- 純文件道不跑瀏覽器各道與兩個 release；純文件推 main 不重新部署（畫面與執行檔沒變）。
- **變嚴**：PASS 下限從寫死的 12534 改成「不准少於 base」；gpt/ 越道、卡頭改宣告、撞號、守衛程式寫死 SHA 由機器判紅。

## 驗收

1. `tools/test_scope.py` 16 個案例：只改 README＝docs；改 shots 腳本＝full；full 沒卡紅、加卡綠；一次兩張新卡紅；新卡沒卡頭紅；第二個 commit 改 families 紅；owner_ok 空→有字綠、有字→空紅；撞號紅；gpt/ 改 tools 紅、只在 test_fixde 新增一行不紅、改既有斷言紅、改規則檔與別張卡的 shots 紅；守衛 yml 新增 40 位 SHA 紅、APPROVED_ART.json 與 shots JSON 不紅；64 位只警告；純 revert 免卡、revert 夾帶改動要卡；removed_asserts 回報；舊卡補記走 docs 道。
2. 紅源（突變）：把 scope.py 的各條規則逐一改鬆，對應的測試要首紅。
3. 活測：本卡 PR 推一個純文件 commit，gate 綠、重的各道 skipped；全道那一輪 gate 綠、棘輪 base 與 head 的 PASS 數寫在摘要。
4. `verify.py` ALL GREEN。

## 回滾

`git revert`。

## 施工紀錄

**2026-10-15（Claude）**

- 卡面先推（47f4eff，帶卡頭機讀欄）；實作：`tools/scope.py`、`tools/test_scope.py`（由 `test_toolchain.py` 匯入，工具鏈 63→79 例全綠）、工作流加 `scope`／`ratchet`／`gate`、重的各道 `if: !cancelled() && lane=='full'`、deploy `needs: [scope, gate]`、AGENTS 卡頭寫法。分支名與各 SHA 一律經環境變數傳進指令，不嵌入。
- 自己的規則先咬到自己：判斷「推 main 時 before 全零」原本寫了 40 個 0，會被「守衛程式新增 40 位十六進位」判紅，改成用正規式判全零。
- **紅源（本機突變）**：把 scope.py 的規則逐一改鬆，跑 16 例：道別恆為 docs→4 例紅（含目標 full 道要卡、shots 腳本走 full）；新卡不要卡頭→「新卡沒卡頭」紅；凍結欄不檢查→「families 改動」紅；owner_ok 不單向→「owner_ok 只准從空」紅；不查撞號→撞號例紅；gpt 可動 tools→對應例紅；gpt 可改既有斷言→對應例紅；不查寫死 SHA→對應例紅；不認純 revert→純 revert 例紅；一次兩張新卡也行→對應例紅。10／10 都首紅在目標測試。
- **CI 實跑**（PR #26，run 38608580871）：scope 判 full、無違規；ratchet base PASS 12,622 → head 12,622（removed_asserts 0）；gate 綠；其餘各道全綠。
- 「純文件 commit 走快道」沒辦法在本卡 PR 裡實測（scope 看整個 PR 的改動，本 PR 有程式改動一定是 full）——改在合併後的純文件後續 PR 實測，並在那裡推一個改卡頭凍結欄的違規提交看 scope／gate 紅（結果補在下方）。
- `verify.py` ALL GREEN。
- **Codex 審查兩條 P2（PR #26），照改**：
  - 「一 PR 一卡」原本只在 full 道數、只數新卡——文件道可以一次加好幾張卡；full 道加一張新卡同時再碰任意張有卡頭的舊卡也綠，而且 `removed_asserts` 取所有被碰卡的最大值，**碰一下別張舊卡就能借它的額度**（這是 Codex 沒點名、順著看出來的實際漏洞）。改成新卡＋動到的有卡頭舊卡一起數，任何道都最多一張；沒卡頭的舊卡（T640 以前）不算。
  - 卡頭原本只在「有了之後」才凍結：第一個 commit 先放沒卡頭的卡、第二個 commit 才補卡頭，`prev` 一直是空的，凍結就從第二個 commit 才開始算。改成新卡第一個 commit 就要有合法卡頭。
  - 加了 3 條突變（文件道不數卡、只數新卡不數舊卡、首個 commit 可無卡頭）。原本的「新卡不要卡頭」突變因此沒被抓到——原測試被新規則蓋過去了；它真正還守的是「第一個 commit 有卡頭、後面拿掉」，補了這條測試。單元測試 16→20 例、工具鏈 79→83 例全綠，13／13 突變都首紅在目標測試。
- **文件快道實測（2026-10-15，合併後補記，PR #26 → e4d9402）**：
  - **紅**：本來要開一個丟棄用的 PR 推「改卡頭凍結欄」的違規提交，結果因為 `push.default=upstream` 誤推進了 main（0a2b1d8）。push run 38621256674 的結果：scope 紅（`card-frozen`：families 從「無」改成 fire），validate 綠，重的 7 道全 skipped，gate 紅，deploy／verify-published skipped。經過與補洞見 T650。
  - **純 revert**：撤銷 PR #28（run 38633257417）走 docs 道，判為純 revert（`ratchet_base`＝e4d9402），重的 7 道 skipped，gate 綠。合併後推 main（run 38636351981）gate 綠、**不部署**，「純文件推 main 不重新部署」成立。
  - **綠**：本筆補記所在的純文件 PR 自己，結果見下一條。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
