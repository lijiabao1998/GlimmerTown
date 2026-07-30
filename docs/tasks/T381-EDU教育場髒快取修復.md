# T381 EDU 教育場髒快取修復

**Claim**：卡號 T381｜施工者 Claude（bay-kimi）｜出卡源 業主 2026-07-30（指定「T381 起下一空號」＋與 T343 施工串行、本卡先行）
**預計觸碰**：index.html（stampCov＋GV 鉤子）、test_fixde.js（T381 測試塊＋釘子重釘）、sw.js＋docs/ARCH.md（僅版本字）、docs/CHANGELOG.md、本卡。

## 病灶（T343 偵查 X1 路實測確認）

EDU 教育場只在 `rebuildCov()` 尾端被寫入；`doPlace`→`stampCov` 增量更新 COV.* 從不動 EDU。
rebuildCov 全檔僅 6 個呼叫點（newWorld／setSvcBudget／營養午餐開關／undo／load×2），doPlace 不在其中。
實測（seed301/diff1/AI/day421，13 校 3 大學 9 圖書館 1 高中）：COV.school>0 共 1189 格（覆蓋場正確），
但 rebuildCov 前 EDU 均值 0.00、非零 0 格；rebuildCov 後均值 46.96、167 格非零；再 tick 不變。
⇒ 玩家每次讀檔刷新一次、隨建設再度腐化＝間歇性髒快取。
受害讀取點 7 個：judgeWealth eduTerm／AI aiEduSum／eduSumT342→techGold／eduIndMul（lv3 工業稅）／市民需求卡／統計面板／晶片面板。

## 修法（二選一 → 選增量鏈）

**採用**：把 EDU 加進 `stampCov` 增量鏈——`eduStaticAt(i)` 是該格五個教育覆蓋場
（school/university/library/highsch/campus）計數的純函數；蓋/撤印後對同一個（預算縮放後的）
方框逐格重算 `EDU[i]=eduStaticAt(x,y)`，即與全量重建**位元恆等**、隨時一致。
**否決**：tick 內每日重建（rebuildNoise 式）——留一整天髒窗口（放校當日 7 個讀取點仍讀 0），
且對非教育建設日空燒 O(N²)；增量鏈成本只在教育建築蓋/拆時付一個方框（≤25×25 格）。
兩法皆不消耗 R()＝亂數流呼叫次數不變（鐵律2 安全）。

## 定位錨

- `function stampCov(field,x,y,r,delta){`（index.html）
- rebuildCov 尾端 `EDU[idx(x,y)]=eduStaticAt(x,y); // T142`（不動，保持全量重建語義）
- GV 鉤子錨：`noiseAt:(x,y)=>NOISE[idx(x,y)], // T325 測試用`（其後加 `eduAt`）

## 禁區

- `eduStaticAt` 公式與 EDU_W_* 權重、7 個讀取點、rebuildCov 本體邏輯——一律不動。
- 不得新增任何 `R()`/`rand` 消耗（鐵律2）；不得動其他 COV 場語義。
- 釘定種子斷言不得刪除、不得改寫成常數（verify.py 哨兵在守）。

## 驗收

1. **建校後不 load、EDU 即非 0**：新測試——fresh world `GV.place('school')` 後 `GV.eduAt` 立即 >0；
   同格與 `GV.rebuildCov()` 後全圖逐格相等（增量 ≡ 全量）；doze 後對稱回 0。
2. 疊加場景：school+library 重疊格 EDU=85（50+35），拆 school 後=35。
3. 釘定種子 seed301 pop===4153／seed22 pop===4550：EDU 影響 aiEduSum 與 lv3 工業稅 ⇒
   **移位＝預期行為**；若移位，按鐵律19 以六種子 {301,22,77,9,5,15} 崩城率 master vs bay 對照，
   崩城率不得升高，據實重釘並在本卡記錄兩側數值。
4. `node test_fixde.js` 全綠（≥1902 PASS／0 FAIL）。
5. `python tools/verify.py` ALL GREEN。

## 回滾

單 commit `git revert`。EDU 為運行時場不入存檔（load 後 rebuildCov 全量重建），無存檔遷移／污染問題。

## 串行聲明

與 T343 施工（bay-codex）觸碰集合相交（index.html）⇒ 強制串行：本卡先進 master，
T343 開工第一步併入含本卡的最新 master。

## 驗收數據（施工後回填）

（待回填）
