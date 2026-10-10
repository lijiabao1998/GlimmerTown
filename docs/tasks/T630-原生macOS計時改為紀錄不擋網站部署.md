# T630 原生 macOS 計時改為紀錄、不擋網站部署

**發卡／施工**：業主 2026-10-10「123 town 你處理好吧」的 3（網站照常更新），接著 T626 沒推上去的那一半；業主同日給了 `workflow` 權限。Claude 出卡＋施工。
**claim**：Claude；分支 `claude/town-native-advisory-630`（工作樹 `C:/dev/glimmer-town-630`），base `420cdca`；正常 PR 合併。不改遊戲本體。
**合併權**：業主授權本輪由 Claude 處理；Claude 出卡＝施工同一方，如實聲明。

## 為什麼

- Pages 工作流的 `deploy` 要等 `native-acceptance`（GitHub macOS 跑機上的原生計時）成功才部署。
- 這個計時極吵：10-09 那一輪桌面夜裡相鄰兩次重畫，舊圖 21–230 毫秒、新圖 22–258 毫秒；同一份程式 14:51 過、15:25 不過；而且它刻意禁止重跑（`GITHUB_RUN_ATTEMPT==1`）。
- 結果：網站能不能更新變成擲骰子。10-10 T626 合併那一次剛好過，網站才更新到 v11.212。

## 做法

`.github/workflows/town-main-pages-candidate.yml` 兩處：
1. `native-acceptance` 加 `continue-on-error: true`：照跑、證據照存，失敗不讓整輪變紅。
2. `deploy` 的 `needs` 拿掉 `native-acceptance`。

部署仍然要求：全套回歸＋六哨兵＋工具鏈＋新圖像素＋舊存檔（validate）、Linux Chrome 三段正確性（browser）、七檔打包與執行檔檢查（package）、Mac 真首訪＋存檔隔離＋離線重開＋升級（pages-browser）；部署後 `verify-published` 照舊驗真網址。

## 判準改動（寫在這裡）

部署前的原生計時：必過 → 只紀錄。理由見上；Linux 那條的 T626 交錯量計時（T602 場景）仍然擋，原生計時的數字之後照樣看趨勢。

## 允許觸碰

`.github/workflows/town-main-pages-candidate.yml`（兩處）、本卡、`docs/CHANGELOG.md`。

## 驗收

1. 分支手動觸發 Pages 工作流：工作流能跑（YAML 正確），`native-acceptance` 不論成敗整輪不因它變紅，其他工作全綠；分支上 `deploy` 照規定跳過。
2. 合併後 main 上 Pages 工作流跑完、`deploy` 與 `verify-published` 綠（網站內容不變，仍是 v11.212）。

## 回滾

`git revert`。

## 施工紀錄

**2026-10-10（Claude）**

- 業主給了 `workflow` 權限後，這台機器的 `gh` 權杖從 `gist, read:org, repo` 變成含 `workflow`，改工作流的推送才被 GitHub 接受（第一次授權沒落到這台的權杖上，推送仍被拒，業主重做一次）。
- 改動照卡面兩處，YAML 解析正確。
- 分支手動觸發 Pages 工作流 run 38039990523：validate、browser（core／world／neighbors）、package、pages-browser 全綠；`native-acceptance` 這次剛好也過；`deploy`／`verify-published` 依規定在分支上跳過。
- 合併後 main 會再跑一次並部署（遊戲本體沒變，網站內容仍是 v11.212）。

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
