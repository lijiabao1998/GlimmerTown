# T634／T635 本機收件與發布記錄補充

## 授權與 claim

業主 2026-10-13 指示：「先收進遠端成果、核對本機，更新記錄同時」。本補充只接收已合併成果與補正文件，不另立美術或玩法卡。接收／補記：Codex；車位 bay/codex，遠端來源凍結為 `8d79bc42b9f67f8acd087044debf2a2d32f4be83`（v11.221），本機接收前 master 為 `d88e36d866226ac182dd92ecab63c29a540a4ef8`（v11.214）。不宣稱新增外部第三方美術覆核。

## 定位錨

- COLLAB 第九節：遠端成果先收進施工者車位，再過 canonical 本機交易式閘門。
- README 頂部與狀態段仍寫 v11.212／v11.210，ARCH 仍把已發布的 T634／T603 稱為候選。
- T634／T635 歷史 CHANGELOG 驗收欄仍是施工時的未完成狀態，T557 因此拒絕本機收件；不得繞過或放寬守衛。
- GitHub PR #16／#17 均已合併。正式 main `8d79bc4` 的 run `38201218382` 已完成必要驗證、deploy、verify-published；原 `native-acceptance` 為 failure，依既有 T630 政策屬診斷，不改稱成功。

## 允許觸碰

僅 README.md、docs/ARCH.md 的現況文字、docs/COLLAB.md 的歷史規約適用提醒、docs/CHANGELOG.md、T634／T635 卡面及發布說明（含 docs/tasks/main-pages/README.md 的發布歷史／依賴敘述）、本補充卡。補記原已發布提交、實際本機驗證與玩家版本邊界；不改 ARCH 定位表或任何驗收門檻。

文件在獨立遠端分支 `gpt/town-635-local-receipt-records` 交付，不直推 main。先推本補充卡，再更新記錄。CHANGELOG 更正只限本機 master 尚未包含的 T634／T635 新條目；原施工時驗收欄完整保存在本補充，舊失敗證據、卡面與 master 已有條目保留。不得只刪未完成用字假裝驗收通過。

## 禁區

所有 runtime、test_fixde.js、tools、workflows、SPR／健康基線、存檔與模擬零改動。不 bump、不 --deploy、不 --publish、不手改收據，不測玩家 8123，不碰其他專案或清除任何車位成果。

## 固定驗收

1. 收件前確認四車位 clean 且無未落地成果；接收僅 fast-forward，遇 dirty／ahead／衝突停手。
2. 本機親跑 incoming verify.py 與原 63 項工具鏈；保留實際 exit／PASS／六哨兵，不把 Node 舊圖 mock 當成新圖真瀏覽器證明。
3. 文件更新前後，index.html／sw.js／test_fixde.js SHA256 與凍結來源完全相同；SPR_PINS payload 不變。
4. 最終 verify.py ALL GREEN、PASS 不減、git diff --check=0；更新過的驗收欄引用同一精確 main CI，明示原生診斷仍紅及本次未新增外部第三方覆核。
5. canonical merge_bay.py codex --no-deploy 實跑 B/S/M 閘與棘輪後才稱本機主線已接收；不可直接在 master merge origin/main。
6. 玩家 index／sw／receipt 在收件前後逐位相同，仍 v11.210；四車位同步結果逐個讀回，skipped 據實記錄。
7. 遠端文件交付經正常分支／PR；尚未合併的記錄不冒稱遠端主線已更新。精確提交 CI 與是否合併另記實際狀態。

## 回滾

文件補記可正常 revert。接收前紅燈留車位、master／玩家不動；交易開始後遵循工具的 resume／abort，不 reset --hard、不修改 receipt。玩家版本要升級須業主另行明示。

## 實測與歷史更正

2026-10-13：git fetch 讀回遠端主線 8d79bc4，本機落後 25 提交。四車位原皆 db3f1c1、clean；bay/codex 已 fast-forward 至遠端。首次本機交易在 T557 preflight 明確拒絕 T634 歷史未完成驗收欄，尚未建立交易或推進 master。後續只以真實 CI／發布／本機結果補記，不放寬此守衛。
