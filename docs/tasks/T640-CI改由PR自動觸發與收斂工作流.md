# T640 CI 改由 PR 自動觸發、收斂工作流、scene602 升為部署閘

**發卡／施工**：Claude。T639 主線跑法總綱的第一張施工卡（業主 2026-10-14「你決定主綫怎麽加」「方案出來之後直接施工就行」）。
**claim**：Claude；分支 `claude/town-ci-trigger-640`，base `ea12e64`。
**合併權**：Claude（守衛／規則道，main 寫入者）；Claude 出卡＝施工同一方，如實聲明。

## 起因（痛點）

- 七個工作流都只在 push 到名單分支時觸發，再加手動。Claude 每張卡手動 dispatch，結果不會掛到 PR 上（#18、#22 的檢查清單都是空的）；GPT 每張卡改一次觸發名單，6 天改了 7 次。
- `town603-*` 四個、`town634-candidate` 綁的是已合併或已放棄的分支。`town602-candidate` 每次推 main 都重跑一份跟主工作流重複的 validate，約 9 分鐘。
- `native-acceptance` 設了 continue-on-error，卻每次推送都佔約 10 分鐘 macOS，同一棵樹一綠一紅，main 長期掛紅 X。
- 附件只保留 14 天，證據會過期。
- Codex 只在轉 ready 時審查，PR 又常秒合，審查必然晚到。
- `scene602.js` 用和 `fp_snapshot` 相同的 CRC，斷言 SPR_PINS 全部 1586 鍵等於 Linux Chrome 實算值——它是 CI 上唯一的全量像素指紋比對，卻不在部署的必過清單裡。

## 做法

1. `town-main-pages-candidate.yml`（檔名不改，PR 頁的檢查名稱不變）：
   - `on` 改成 `push: [main]`、`pull_request`（opened、synchronize、reopened、ready_for_review）、`workflow_dispatch`；刪掉 4 個 gpt 分支名。
   - `concurrency` 改成 `town-main-${{ github.event.pull_request.number || github.ref }}`，PR 上新的推送會取消舊的那一輪；推 main 不取消。
   - `native-acceptance` 只在手動觸發時跑（`if: github.event_name == 'workflow_dispatch'`），仍只紀錄。動繪製迴圈或宣稱效能的卡，自己手動跑一次。
   - 把 `town602-candidate.yml` 的 browser job（scene602）原樣搬進來，命名 `scene602`，加進 deploy 的 needs。
   - Playwright 釘 `1.64.0`（10-07 發佈，主線 CI 從那時起一直用它）。
   - 附件保留：小檔（日誌、JSON、摘要、套件證據、Pages 瀏覽器證據、已發佈驗證）90 天；Chrome 截圖大包（world、neighbors、core、world-review、兩個 release、native、scene602、runtime）維持 14 天。
2. `git rm` 六個檔：`town602-candidate`、`town603-candidate`、`town603-clean-art`、`town603-foreground`、`town603-sw-main`、`town634-candidate`。腳本全部留在倉庫。
3. check634（T634 的獨立美術合約與負控制，原本只掛在 GPT 候選分支）：本卡在 validate 加一步試跑，`@napi-rs/canvas` 釘 `1.0.11`（T634 候選 CI 當時解析到的版本）。綠就留在 validate；紅就拿掉，在本卡「放寬了什麼」寫明紅在哪一條（T634 的像素仍由 approved-art-release 守）。
4. `AGENTS.md`「最常被忘的幾條」：開分支就開 draft PR、CI 自動跑；不准再把分支名寫進工作流，也不要為 PR 手動 dispatch；轉 ready 會重跑一輪；合併前把 Codex 的 P0／P1 在 PR 上一行回覆（修了附 commit，不修寫理由）。

## 放寬了什麼

- `native-acceptance` 從「每次推送都跑、只紀錄」改成「手動才跑、只紀錄」。它本來就不擋部署；T633 已記錄它對「有沒有改壞」幾乎沒有分辨力。
- `town634-candidate` 的候選守衛退場；check634 是否留在 validate 看試跑結果（見施工紀錄）。
- **變嚴**：scene602 從不擋部署變成部署必過。

## 驗收

1. 觸發：本卡 PR 不 dispatch 也出現檢查（PR 的檢查清單不是空的）；轉 ready 後出現新的 `pull_request` 一輪。
2. 紅源（一個改壞的提交，驗完 revert）：同時改 test_fixde 一條 SEEDPIN 期望值、SPR_PINS 一個 CRC。validate 首紅落在「Full original regression and exact six sentinels」、scene602 首紅落在 SPR 指紋那條，兩者都顯示在 PR 上；其他 job 照綠。
3. 合併提交上跑：release634／635、release-identity 在 `refs/pull/N/merge` 上實跑綠一次。
4. 合併後：main 推送時 deploy 的 needs 多了 scene602，`verify-published` 綠；`gh api …/actions/workflows` 顯示刪掉的 6 個是 deleted。
5. `verify.py` ALL GREEN。

## 風險

- 有幾支工具第一次在合併提交上跑，可能有沒想到的 HEAD 假設——先在 PR 上全綠一次。
- scene602 裡有 T626 計時判準；升閘後若誤紅，照標準第 4 節另開卡拆成只紀錄，不准重跑賭綠。
- scene602 的 v11.210 凍結夾具會擋下任何改清冊的美術；T643 之前不開改 `sprAtlas356` 家族的美術卡（T639 總綱已寫）。
- fork 的 PR 也會觸發；公開倉庫沒有 secrets，deploy 只在 push main，可以接受。

## 回滾

`git revert`（六個工作流檔回來、觸發回到名單）。

## 施工紀錄

（施工後補）

**聲明**：Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。
