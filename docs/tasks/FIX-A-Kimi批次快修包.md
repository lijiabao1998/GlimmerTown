# FIX-A Kimi 批次快修包（審查確認的 9 項小缺陷）
難度：★★ ｜ 建議模型：Opus ｜ 全部修改均有審查團定位錨，逐項最小修改

## 修復清單（全部要做）
1. **診所/墓園幽靈工業稅**（index.html ~1936）：經濟 else-if 鏈在 `else if(b.k===10);` 後補
   `else if(b.k===13); else if(b.k===16);`——並順手修同病的既有 `else if(b.k===7);`（學校）。
2. **圖書館/郵局維護費 ×2**（~1934-1935）：`else if(b.k===14)libraries++;`→`else if(b.k===14);`，
   `else if(b.k===15)posts++;`→`else if(b.k===15);`（第一迴圈已計數）。
3. **快速路標價與實扣不符**：TOOLS 中 hwy 的 `pr` 顯示改為與 placeCost 一致（實際 $120 → 顯示 '$120'；
   查證 placeCost 實值後以代碼為準統一）。
4. **快捷鍵修飾鍵防護**：keydown 處理器開頭加
   `if(e.ctrlKey||e.metaKey||e.altKey){if(!((e.ctrlKey||e.metaKey)&&e.key==='z'))return;}`
   （保留 Ctrl+Z 撤銷；其餘組合鍵放行給瀏覽器）。
5. **P/p 鍵位混亂**：取消大寫 'P' 綁定；水管改用 'g'、警察局改用 'j'（查 keydown map 現況避免再撞），
   ARCH §8 快捷鍵行同步重寫為實際全表。
6. **昂貴單體建築禁拖曳連放**：pointermove 的 paint 排除清單（現有 `tool!=='plant'`）擴為
   `!['plant','water','police','hospital','clinic','library','post','cemetery','stad','fire','school','dump'].includes(tool)`
   （所有單體建築一律點放；道路/水管/路飾仍可拖）。
7. **供水閘門範圍**：升級判定中 `b.wa` 要求僅在 `b.lv===2`（升 Lv3）時生效，Lv1→Lv2 不需水
   （符合 T31 卡與 CHANGELOG 語義）。
8. **deathAge/sickDays 存檔**：sk/dt 欄位擴為同時保存天數（如 sk 存 0-9 的 sickDays 上限 9、dt 同理，
   或新增可選欄位 skd/dtd 字串——選最小侵入方案），load 容錯舊檔缺欄位。
9. **SPR.*N 死碼**：刪除 `SPR.waterTowerN/policeN/hospitalN/clinicN` 四個賦值（保留區塊右括號；
   夜燈走物件 .night 屬性不受影響）。

## 文檔同步
ARCH.md：§8 快捷鍵全表更新；§2 註記「序列化鍵 rc=路飾、rcl=道路等級（命名歷史地雷勿混淆）」。
CHANGELOG 補一行 FIX-A。

## 驗收（Browser + GV，localStorage 鐵律照舊）
1. 隔離單棟診所/墓園/學校 20 天：淨值 = −維護費（無幽靈收入）；圖書館 −2/天、郵局 −3/天。
2. 快速路工具列顯示價 = 實扣。
3. Ctrl+P/Ctrl+L 不再切工具；Ctrl+Z 撤銷仍好用；'g' 水管 'j' 警察局生效。
4. 醫院拖曳 → 只放一棟。
5. 無水的住宅可升 Lv2、不能升 Lv3；供水後可升 Lv3。
6. 生病 2 天存檔重載 → sickDays 延續（第 3 天按規則轉死亡判定）。
7. VERIFY.md 冒煙 + 零 console 錯誤 + 像素亮度檢查。

## 回滾
git checkout -- index.html docs/ARCH.md
