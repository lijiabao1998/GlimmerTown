# T595 墓園資訊面板崩潰（未宣告的 `cemeteries`）

**發卡／施工**：業主 2026-09-27 指派（原文英文）：以 acorn 作用域分析掃主 IIFE 的自由變數，懷疑 `inspect()` 的墓園分支引用了不存在的 `cemeteries`；要求「先重現，確認後改成真正的全城墓園計數（或當場計算），顯示原本想顯示的容量；六哨兵逐位不動、不加世界亂數；補一條檢視墓園不丟例外且容量列在場的守衛；照清單落地」。Claude 出卡＋施工。
**claim**：Claude；獨立 worktree `C:\dev\gt-t595`（分支 `fix/t595-cemetery`，base `f89be0f`＝T594 卡面），因為 canonical master 當時有 T594 施工中的未提交改動。T594 施工 session 已同意本卡用 T595，並告知 T594 會先落地（v11.203）；本卡落地前 rebase 到 T594 之上、bump 到 v11.204。驗證埠 8129+（真 Chrome、載入前設槽 3），不碰 8123／8199。
**合併權**：canonical master 直寫（T373 路徑）後 `git push`。Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。**不做 `--publish`**：業主本次明示不碰玩家安裝目錄。

## 定位錨

- `index.html` `function inspect(x,y){` 的墓園分支：`else if(b.k===16)html=`…`容量 ${cemeteries*3}`…`。
- `cemeteries` 只是 `tick()` 裡主計數迴圈的區域變數（`let popN=0,…,cemeteries=0;`），`inspect()` 看不到。
- 最早含這一行的提交是 `a15d64f`（Kimi T29–T38），T38 墓園就帶著這個錯；之後沒有任何測試點過墓園的資訊面板。

## 重現（動手前，base f89be0f，真 Chrome 8131、槽 3）

- 新城、`GV.place('cemetery',39,37)`（T574 起墓園是 3×3 地塊），相機對準地塊中心，檢視工具真點一下：
  `ReferenceError: cemeteries is not defined`，堆疊 `inspect@21579 ← inspect@21568（ref 格轉 root）← endPointer@21359`；資訊面板沒有打開（`#info` display none）。
- `GV.inspectAt(39,37)` 同一個例外。

## 量到的另一件事（本卡不修，交業主）

墓園容量在模擬裡的真值是 `tick()` 死亡前置的 `cemCap=cemCount*3+bigCem*24+cremPre342*40`，而它的計數迴圈**逐格**數 k16 與 k107、只有 k54 限 root。T574 之後墓園是 3×3、火葬場是 2×2，ref 格也帶 `k`，於是（真 Chrome 同城逐步量，暫存副本只多一行把區域變數抄出來）：

| 城裡有 | cemCount | bigCem | cremPre342 | cemCap |
|---|---|---|---|---|
| 無 | 0 | 0 | 0 | 0 |
| 一座墓園 | 9 | 0 | 0 | **27**（原意 3） |
| ＋一座大墓園 | 9 | 1 | 0 | 51 |
| ＋一座火葬場 | 9 | 1 | 4 | **211**（原意 67） |

主計數迴圈（就業、維護費）有 `if(!b||b.ref)continue;`，所以那邊一座墓園只算一座；只有死亡前置這一段沒濾 ref。改成只數 root 會改變模擬軌跡（安撫量變少），要不要改、要不要重釘，是業主層級決定；本卡只讓面板說實話。另一個跟著變假的字句：大墓園面板寫「安撫容量 24（=8 座墓園）」，而現在一座新墓園就貢獻 27。

## 做法

1. 在 `function inspect(x,y){` 之前新增 `cemPool595()`：即時掃全圖，用**跟 `tick()` 死亡前置一模一樣的口徑**數 k16（逐格）、k54（root）、k107（逐格），回傳 `{cem,big,crem,cap}`，`cap` 公式同 tick。當場算而不是讀 tick 快照：`tickBld` 是 tick 開頭的索引，剛蓋好、還沒過一天的墓園看不到。
2. 墓園分支改成 `全城安撫容量 ${cemPool595().cap}`：顯示的是模擬真的在用的那個池（全城共用，不是這一座自己的），不是 3×座數。
3. `tick()` 一行都不動（RULES 2／3：不重排、不刪註解），所以六哨兵逐位恆等是結構保證；兩份口徑一致改由守衛釘住。
4. 零世界亂數：`cemPool595` 只讀 `tiles`。

## 允許觸碰

- `index.html`：新增 `cemPool595`（inspect 之前）；inspect 墓園分支那一行。其他一行都不改。
- `test_fixde.js`：新增 T595 守衛；測試專用注入一行（`inject343`，把 tick 的區域 `cemCap` 抄到 `window.__t595Cap`，只存在於測試載入的副本）。
- `docs/ARCH.md`、`sw.js`（只經 bump）、`docs/CHANGELOG.md`、本卡。
- `docs/SPR_PINS.json`：**不准變**。

## 驗收

- 真 Chrome：點墓園（ref 格與 root）資訊面板打開、零例外、顯示全城安撫容量，且數值等於 tick 的 `cemCap`。
- 守衛：檢視墓園不丟例外、容量列在場；面板數值＝tick 真值（城裡同時有墓園、大墓園、火葬場，三項都要算進去）；剛放下、還沒過一天的第二座墓園立刻反映在面板上。
- 紅源：把墓園分支改回 `cemeteries*3`、漏算火葬場、改讀快照，各自要紅在本卡守衛。
- verify.py ALL GREEN、PASS 不降、六哨兵 seed301 780／seed301m 2297／seed7 117／seed7m 77／seed22 639／seed22m 14523 逐位恆等；工具鏈 OK；CRLF 0；`SPR_PINS` 零差異。

## 回滾

`git revert <T595 commit>`（純檢視層，無存檔欄位、無開關）。
