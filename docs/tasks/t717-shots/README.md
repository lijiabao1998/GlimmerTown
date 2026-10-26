# T717 交接候選：尚未完成驗收

本機候選在 `/tmp/GlimmerTown-t717`；首個候選已快進提交原 PR77，head `5ccb62289778fea23c0496276a8b23b09cbe5a91`，保持 Draft。2026-10-26 10:37 UTC 業主已明確批准有界 CI-first 例外；本次只新增工作流專項job與必要gate依賴，其他既有jobs不改。最終畫面與性能仍須另行批准。

## 已完成
- `check-717.cjs`：G2 2000組／8000四角、G3 2000組／16000原生四角、G1精確原文與外包、G4兩種閥；5個破壞首紅全在指定條款。`geometry-results.json`為實跑收據。
- T603原生契約130checks：`native603.log`。沒有修改T603任何守衛／台架。
- 從候選移除新增helper與兩處外包、還原版本，能逐bytes重建main index；原test_fixde.js是候選完整prefix。
- 新台架語法檢查通過。靜態審查更正：`CYCLE=110`，`visT=20`其實夜晚；T717真黃昏用80並檢查`daylight().dusk>0`，沒有改T715歷史。

## 本機歷史首紅（保留；後續官方 CI 見下）
- `baseline-verify.log`及`baseline-verify-memory512.log`：原碼兩次298PASS後SIGKILL。第二次只縮Node heap；原因未知，沒有直接證據將其歸因磁碟。不再盲重跑。
- 改前3份舊存檔獨立測試通過；改後重驗被SIGKILL，因此**候選存檔驗收未完成**。
- 標準Chrome啟動socket EPERM，未載頁。正式升權路徑另遭bwrap唯讀錯誤，沒有繞過限制。
- eq/perfab均未真跑，沒有本卡真PNG或性能結果。原CI、六哨兵、全套、Mac、精確候選Codex均未完成。

## 官方 CI 台架命令

```sh
node docs/tasks/t717-shots/check-717.cjs
node docs/tasks/t717-shots/eq.cjs <git-materialized-main-index.html> <exact-head-index.html> <evidence-directory>
node docs/tasks/t717-shots/perfab.cjs <exact-head-index.html> <evidence-directory>/perf.json
```

執行者必須先以Git物件核對完整base/head及檔案SHA，不能把任意傳入檔名視為來源證明。

- eq：完整48組，四頁main/main-repeat/on/off，共192原PNG。共用相同星空輸入；完整tiles SHA與stats相同；真黃昏／白天／夜晚，縮放0.6/1/2/3、四向。
- perf：6情境各40輪AB/BA共80raw，JS與強制readback耗時分列；全部raw保留，中位數與p95，4暖機明示。`collected`僅代表收據完整，不是性能改善／無回歸通過；不宣稱真GPU玩家FPS。
- ci717.py已加入精確head物件、雙份原verify、192PNG解碼與接觸表、完整raw校驗；正式執行結果仍待CI；不得將runner存在宣稱為驗收完成。

## 同輪工作盤點（只讀）
- T658／`claude/town-civic-five-658`／PR53：已於2026-10-18關閉未合併，業主保留已有美術，不續做。
- T702／`claude/town-train-702`／PR66：已於2026-10-22關閉未合併，後續由T704–T713取代，不復活。
- 沒有證據確立另有同輪因weekly limit中斷、已授權可續的性能卡。T715不重做，T716已放棄；T677/P06、PR74與P07不在本輪。

owner_ok保持空；業主確認最終圖像與性能之前，不Ready／合併／部署。

## 官方 CI 首輪：保留首紅，不是驗收完成

2026-10-26 run [40310599842](https://github.com/lijiabao1998/GlimmerTown/actions/runs/40310599842)，專項 artifact `12645163840`，head `5ccb62289778fea23c0496276a8b23b09cbe5a91`。`first-ci-receipt.json`摘錄原始結果，完整192圖、480 raw、全部logs保留在官方附件；不覆寫首輪。

- 官方專項 baseline/head 原 verify 均exit0，原suite PASS12833/12837，六哨兵均一致；geometry與5負控、130 native603、3舊存檔通過。
- 圖像矩陣48組全產出，但A/A自身不同，因此未通過；接觸表實圖定位到DOM開始畫面仍覆蓋canvas。`.hide`只對boot有CSS，對start無效，title動畫仍跑。這是台架缺陷，不是可忽略差異或產品等價證明。修復只在測試副本隱藏非canvas DOM、用原生stopTitleAnim停止title並核對定格；保留真正compositor截圖，不換readback取巧。
- 首輪480 raw完整，但只供診斷：強制readback總時間改善不等於GPU／遊玩FPS，也不能越過影像首紅。修台架後同城全量重收，不裁慢幀。
- 原frame job另有23 changed、0 leaked，唯一失敗為owner_ok空；不代填owner_ok。原validate明確ALL GREEN，fp/scene602/ratchet/approved-art/fire通過；world亦已通過。首輪gate因frame及T717專項紅而紅，deploy/verify-published跳過。
- 新job限定baseline尚無T717的初次promotion，避免以已含T717的未來main錯比valve-off；部分promotion仍failclosed，原jobs與門檻不變。
- Mac原生官方dispatch及最終head Codex仍待完成；本節不是最終圖像或性能批准。
