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

（施工後補）
