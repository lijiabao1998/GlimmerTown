# FIX-D 建造模擬正確性修復（T39-T100 批次後審查確認）
難度：★★★ ｜ 建議模型：Opus ｜ 狀態：**已施工完成**（2026-07-17，工作樹已含全部修復）

## 背景
T39-T60／T62-T100 兩批大量新增建築與系統後，審查團複核建造／拆除／存檔路徑，確認一批正確性缺陷：
單變體建築變體鍵錯配、多格建築 ref 格拆除孤兒化、水管拆不掉、軌道遮罩不重算、存檔覆寫無保險。
總指揮另追加四項 COV 蓋印對稱與軌道遮罩遺漏，歸入本卡同批落地。

## 問題清單與修法（全部已落地）
1. **七種單變體建築變體鍵錯配**（k19 機場／k20 停車場／k22 農場／k23 牧場／k25 太陽能／k31 監獄／k32 大學）：
   `SPR.bld` 只生成 `k_1_0` 一鍵，doPlace 卻寫 `v:ri(3)`，v≠0 時渲染取不到 sprite。三層修復：
   ① 放置端固定 `v:0`；② 渲染取鍵加 `_0` 兜底（`SPR.bld[k_lv_v]||SPR.bld[k_lv_0]`）；
   ③ load 還原時無對應鍵則正規化 `v=0`。
2. **多格建築 ref 格拆除孤兒化**：doze 多格分支原直接讀點擊格 `t.bld.sz`，ref 格只有 `{k,ref}` 無 sz
   → 落單格分支只清一格、其餘格成孤兒。改為先解析 root 再取 `sz`；體育場（k9）拆除 4 格對稱撤 stadium 覆蓋印。
3. **水管拆不掉**：canPlace 拆除白名單漏 `t.wp` → 對水管永遠回「這裡沒東西」。補上 `!t.wp`。
4. **軌道遮罩不重算**：rail／tram 放置與拆除原只算自己一格，鄰格遮罩不更新 → 改 `recalcRailMask4`（自己＋四鄰）；
   §11 新增 `recalcAllRailMasks()`（對照 §4 道路版 recalcAllMasks），load 還原 rl／tr 後呼叫全量補算。
5. **存檔覆寫無保險**：save 覆寫主鍵前先備份 `<key>_bak`、`setItem` 失敗改 `console.warn` 不再靜默；
   load 主鍵毀損先嘗試救 `_bak`；importShare 覆寫前同樣備份、匯入失敗還原舊檔。

## 總指揮追加（同批落地）
6. k28 救護站／k30 高級消防放置端補 `stampCov(+1)`——doze 單格分支本有對稱撤印，缺放置蓋印會 Uint8 下溢 0→255。
7. k20 停車場／k31 監獄／k32 大學放置端於 root 蓋印一次、doze 多格分支對稱撤印一次（對齊 rebuildCov 語義）。
8. `undo()` 補 `recalcAllRailMasks()`（撤銷含鋪軌／拆軌時遮罩一併補算，快照格只重算道路版）。
9. doze tram 分支補 `t.tramMask=0`（原只清 tram／tramBridge）。

## 驗收
- node 回歸通過（t31／t33-t38＋test_fixde）。
- 瀏覽器與實機冒煙待人（localStorage 鐵律照舊：測前快照全部 glimmerville 鍵、只用槽3、測後還原）。

## 回滾
git checkout -- index.html
