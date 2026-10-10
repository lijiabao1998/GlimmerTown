# T627 town 發佈管線通用化：版本與雜湊取自提交、升級起點取自線上版本

**發卡／施工**：業主 2026-10-10「123 town 你處理好吧」。T626 處理了計時判準；但 GPT 的 Pages 發佈管線把「核准的執行檔」寫死在程式裡，任何改到 `index.html`／`sw.js` 的卡（連 bump 版本號都算）都過不了，所以業主要的 1（把拖慢的新圖優化掉，T628）根本發不出去。本卡讓管線能發「任何驗證過的版本」。Claude 出卡＋施工。
**claim**：Claude；分支 `claude/town-release-identity-627`（工作樹 `C:/dev/glimmer-town-627`），base `420cdca`（T626 合併後的 main）。完成後正常 PR 合併。**不改遊戲本體**（`index.html`／`sw.js` 不動、不 bump）。
**合併權**：業主授權本輪由 Claude 處理；Claude 出卡＝施工同一方，如實聲明。

## 現況（2026-10-10 唯讀盤點，六個代理人逐檔對照）

寫死在管線裡、跟著某一版走的東西共 196 處（其中 106 處是要保持嚴格的真安全性質）：
- 執行檔雜湊：`index.html` 99bea3bd…、`sw.js` 79cfb7a6…——`build-main.mjs`、`browser-main.mjs`、`native-correctness.cjs`、`docs/tasks/t603-shots/native603.js`、`release-native-acceptance.cjs` 各一份。
- 版本字串：11.211（舊）／11.212（新）散在打包、瀏覽器、升級、原生各處與測試。
- 升級測試的「上一版」是把 T603 反向打補丁重建出 T602（`native603.sourceBaseline603`），只對這一次升級成立。
- 線上網站實際在跑的是 **329f660（v11.211，10-07）**；1076607（T603，v11.212）從沒部署成功過。

## 做法（照盤點出的計畫，七步，每步一個提交）

1. 新模組 `tools/pages/release-identity.cjs`（＋測試）：七個執行檔名單、命名空間替換表、版本解析（`GAME_VER`＝`APP_VER`，各恰一處）、版本比較、`currentRelease`（雜湊取自 `git cat-file blob HEAD:<檔>`，工作樹必須與提交逐位相同）、`previousRelease`（抓線上七個檔、還原命名空間、在 main 第一父鏈上找七個 blob 都對得上、且是 HEAD 祖先的最新提交（覆核後修正：原本先取最新的再驗祖先，main 上多一個不動執行檔的提交就讓所有落後的分支變紅）、打包後與線上逐位相同；每一步失敗就停，不默默退回）、`releaseDelta`（七檔有任何一個變了 → `sw.js` 必須變、版本必須升）。
2. 「這一版」改取自提交：`build-main.mjs`、`browser-main.mjs`、`published-main.mjs` 與測試（版本／快取名照 `APP_VERSION`）。
3. 升級測試改從線上版本升：刪掉反向補丁重建；沒有執行檔變動時記「不適用」並通過。
4. `native603.js` 拆開：T603 的出處檢查只對凍結的 `4dd0fa4` 跑（歷史），結構檢查對現在的 `index.html` 跑。
5. Linux 瀏覽器那條（`scene603.js`／`native-correctness.cjs`）改用上一版／這一版；計時區塊（被雜湊釘住的那幾行）一個字不動；被改到的腳本雜湊重釘一次（從 git 物件算，不從 Windows 工作樹算）。
6. macOS 原生那條同樣改用上一版／這一版（它目前仍擋部署，見 T626）。
7. 防回退：新增測試掃 `tools/pages/*` 與 `scene603.js`，不得再出現這一版的執行檔雜湊或版本字串；文件改寫。

## 保持嚴格、不放鬆（照盤點）

七檔白名單、一般檔案檢查、空輸出夾；三個命名空間錨點與來回還原檢查；Pages 網址與 `/GlimmerTown/` 路徑；他站快取與存檔哨兵；`SLOT_KEYS`；原生區塊與兩處濾鏡、不裁切規則；凍結的存檔夾具；計時區塊與 Chrome 啟動行；升級檢查順序；「升級只能改 gameVer」；`GITHUB_RUN_ATTEMPT==1`；`--min-pass`。

## 判準改動（寫在這裡）

- 「核准」從「寫死的雜湊」改成「合進 main、通過每一個 needs 工作的提交」。仍然強制：測的位元組＝提交的位元組＝打包的位元組、所有工作同一個提交、只有推到 main 才部署。理由：能推 main 的人本來就能改寫死的雜湊，信任邊界本來就在合併。
- 升級起點從「T602（反向補丁重建）」改成「線上網站實際在跑的那一版」。理由：玩家真的會走的升級路徑只有這一條。
- 覆核後補（只加不減）：上一版已經畫 T603 時，舊有的「T603 關掉」比對碰不到 T603 的圖，拔掉 99bea3bd 釘子後就沒有東西守它。world 階段加比「T603 開著」：16 張逃生閥場景與 308 個世界場景，這一版（只開本版新增的逃生旗標）必須與上一版逐像素相同。各階段另加：上一版文件在同一個 Chrome 裡的精靈 CRC 必須等於這一版的，不能只信上一版提交裡的 `SPR_PINS.json`。

## 允許觸碰

`tools/pages/*`（含測試與說明文件）、`docs/tasks/t603-shots/native603.js`、`native603.test.js`、`scene603.js`（計時區塊除外）、`docs/tasks/main-pages/README.md`、本卡、`docs/CHANGELOG.md`。**不碰** `index.html`、`sw.js`、`.github/workflows/*`。

## 驗收

1. 本機：`node --test tools/pages/*.test.mjs`、`node docs/tasks/t603-shots/test603.js`、兩支 `--self-test`、原生兩支測試、`verify.py --min-pass 12534`、工具鏈。
2. 等價：線上仍是 329f660 時，新證據要重現今天的數字（舊包 afa22141／7a6d32d4、base b9190da5、11.211→11.212）。
3. 分支手動觸發 Pages 工作流：除 `native-acceptance`（計時機率）外全綠。
4. 丟棄式分支（不合併）：bump 到 11.213 → 打包／升級全綠、從線上升到 11.213；只改一個位元組不 bump → 打包紅「版本必須升」。驗完刪掉。

## 回滾

`git revert` 本卡合併提交。

## 施工紀錄

**2026-10-10（Claude；施工代理人逐步提交、Claude 審收）**

- **七步照計畫落地**（每步一個提交，見 `git log 420cdca..`）：新模組 `tools/pages/release-identity.cjs`（現版取自 HEAD 的 git blob、版本 `GAME_VER`＝`APP_VER`、上一版＝線上七檔還原命名空間後在 main 第一父鏈上找、版本必須升）；`build-main`／`browser-main`／`published-main` 改用它；升級測試改從線上那一版升；`native603` 拆成「T603 出處＝凍結歷史（只對 4dd0fa4）」與「結構檢查＝現在的 index.html」；Linux 與 macOS 兩條改用上一版／這一版；被改到的腳本雜湊從 git 物件重釘；新增「不得把這一版的雜湊或版本寫回腳本」的防回退測試。
- **第一次施工在第一步中途 session 斷掉**：接手的代理人審了半成品，發現一條檢查被暫時改成 `if (false)`，已恢復。
- **開工後的事實變化**：T626 合併後網站部署成功，線上變成 420cdca（v11.212，與 HEAD 同一個執行檔），真實的上一版因此走「沒有執行檔變動、升級不適用」那條路；舊的 329f660（v11.211）→ T603（v11.212）改成凍結配對測試，照樣重現原本的數字（舊包 afa22141／7a6d32d4、base b9190da5、存檔 382012de→e648de19）。
- **三方覆核（擋關、等價、下一次發佈）9 項，全部成立、全部修好**：
  1. （擋關）上一版原本取「main 上最新的相同提交」再驗是不是祖先——main 多了只改文件的提交（T630、T631）就失敗；改成「是 HEAD 祖先的最新相同提交」。
  2. 上一版已畫 T603 時，舊的「T603 關掉」比對碰不到 T603 的圖；world 階段加比「T603 開著」（16 張逃生閥場景、308 個世界場景）。故意改 T603 圖不掛開關：逃生閥那張 7,117 個像素不同、世界場景 4,152 個像素不同，紅。
  3. 精靈基準改成「同一個 Chrome 裡上一版文件的精靈指紋＝這一版」，不再只讀上一版的 `SPR_PINS.json`。
  4. 線上抓取由 3 次（約 1.5 秒）改成 6 次（1、2、4、8、15 秒間隔）；本機實測 28 次單檔抓取失敗 2 次。
  5. 凍結配對測試改成延遲解析，線上抓不到時只影響需要它的那幾項。
  6. 一個突變測試原本悄悄拿到 `undefined`，改成真的值。
- **本機另驗（Claude）**：暫時工作樹只改一個位元組、不升版本 → 報「Runtime changed (index.html), so the version must increase: 11.212 -> 11.212」；同一份升到 11.213 → 上一版 11.212 → 這一版 11.213、改動 `index.html`／`sw.js`。驗完刪掉。
- **本機網路**：這台到 `lijiabao1998.github.io` 很不穩（3 次 1 成功、1 慢到 20 秒、1 逾時，另有加密錯誤），本機跑升級測試時 4 項因抓不到線上而紅；照設計失敗即停、不放行。CI 上沒有這個問題。
- **CI（分支手動觸發，合併最新 main 後 adcd0eb）**：Pages 工作流 run 38052576228 全綠（validate、browser core／world／neighbors、package、pages-browser、native-acceptance；deploy／verify-published 依規定跳過）；T602 工作流 run 38052578252 綠。
- **風險（照實記）**：world 那一項跑了 34.6 分鐘，上限 45 分鐘；以後新增 `__noT6xx` 開關的卡會多比對約 308 張畫面（本機估多約 8 分鐘），那時要放寬時限。本機 Node 24 內建 WebSocket 遇到 4MB 以上的 CDP 訊息會斷，`scene603` 本機要用 Node 22 或 `ws` 套件（CI 是 Node 22）。

**聲明**：Claude 出卡；施工與覆核由 Claude 的代理人做、Claude 審收，不算第三方覆核，如實聲明。
