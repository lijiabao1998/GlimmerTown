# T384b — 流向圖層 UI:統計第三 tab＋主畫布 overlay

狀態:**已出卡,待施工(自主 loop R3)。**
發卡:業主 loop 直令(GPT 順位 1 第二階段;資料層 T384a 已隨 v11.8 上線)。
出卡+施工+自審:Claude(業主 loop 授權)。
前置:master `2fcab82`(v11.8,PASS 3365);UI 先例行號皆 T384 偵查第三路實測(v11.7 基準,
落地前以 grep 錨重定位)。資料一律purely消費 T384a 的 `GV.flowStat/flowNodes384/flowRoads384`。
路徑:bay-kimi,bump 11.9,merge_bay kimi --deploy(UTF-8 env)。

> 自審風險披露:同 T384a。本卡動主畫布 draw ⇒ 像素回歸風險最高,逃生閥+預設關閉是紅線。

---

## 一句話

統計面板加第三個 tab「流向」(statTab/dataTable 純讀呈現產銷/缺口/庫存/瓶頸),
面板內按鈕開關主畫布稀疏 overlay(鏈節點角色標記+壅堵/通勤走廊 top 路段高亮);
全部復用既有機制(T343b tab 三觸點/metroShow 三件套/traceOverlay 脈動),零新機制。

## 設計決策(五條,施工不得自行更改)

1. **tab 三觸點**(T343b 先例,不動 showStats 主體):`statsTabs343()` 加 `#statsFlow384` 鈕、
   `bindStatsTabs343()` 加一行綁定、新 `showFlowPanel384()` 照 `showTechPanel343`(17141-17155)模板:
   `#infoBody` = h3+statsTabs343('flow')+statTab 彙總列+dataTable(nodes/roads 可排序)+overlay 開關鈕。
   數據全走 statTab/dataTable(T323 鐵律);**ok:false ⇒「尚無資料(本日結算後更新)」列,
   任何欄位空值後備,面板 HTML 禁 NaN/undefined/Infinity(test 5845 模式)**。
2. **主畫布 overlay=metroShow 三件套**:`let flowShow384=false`(不進存檔)+面板內鈕翻轉
   (不加第 15 顆 HUD 鈕=T343 決策5)+draw() 插槽在地鐵 overlay 同區(建築後、夜燈前),
   守衛 `if(flowShow384&&!lodMini&&!window.__noFlow384)`(**逃生閥必備**=像素回歸紅線);
   座標一律 isoW2V(15174 抄法=旋轉相容,T367b/T375 前科)。
3. **畫什麼(稀疏,禁全圖逐格著色)**:flowNodes384 節點畫角色色小菱形+字元
   (produce▲/process◆/store■/export⬆/consume●,色票用既有 KCAT 色系,不新增 sprite=零鐵律2 面);
   flowRoads384 的 jamTop(紅脈動)/corridorTop(橙脈動)各 10 格,traceOverlay 式 sin 脈動。
   overlay 關閉=零迭代=逐像素恆等(traceOverlay 先例的驗收寫法)。
4. **draw 函式回 meta 計數器**(drawTechTree343 先例):`drawFlowOverlay384()` 回
   `{nodes,jams,cors}`,Node 斷言計數而非像素;`GV.setFlowShow384`(仿 18582)+
   `GV.flowPanel384()` 回面板 HTML 供斷言。
5. **Node 測試面**:test ids 白名單加 `statsFlow384`/`bFlowOverlay384`(:87);
   面板互動鈕=白名單 id+`$()` 綁 onclick(mock 陷阱:innerHTML 不生子元素、未註冊 id 回
   throwaway div=綁定靜默丟失)。

## 允許觸碰

`index.html`(statsTabs343/bindStatsTabs343/新 showFlowPanel384/flowShow384+draw 插槽/
drawFlowOverlay384/GV 兩鉤子+bump)、`sw.js`(bump 同步)、`test_fixde.js`(ids 白名單+新斷言,
既有斷言不動)、`docs/ARCH.md`(§7 UI 層補 tab/overlay 兩句+版本行)、`docs/CHANGELOG.md`、
本卡、loop 帳本。

## 禁止觸碰

1. 模擬側零觸碰;T384a 快照段/GV 資料函式不改(只消費)。
2. 零新 sprite/零 HUD 鈕/零亂數 token(draw 用 visT 脈動=既有 traceOverlay 手法,非亂數)。
3. `showInfoPanel()` 慣例:`display='block'` 全檔恰 1 次(test 4073-4076 釘死)不得多。
4. 新 CSS 不得插在 `#toolcats{…}` 與 `\n#tools{` 之前(test 268/286 取第一匹配)。
5. 存檔零欄位;`buildSprites` 零觸碰(T383c 咬);其他車位。

## 不變量

1. flowShow384 預設 false+__noFlow384 逃生閥 ⇒ 既有像素基線恆等(關閉=零迭代)。
2. 兩釘種子原值;PASS 只增(3365 起);verify ALL GREEN;11.9 三處同步。
3. 面板純讀:開關 tab/overlay 前後 `GV.stats()` JSON 全等(T372 先例)。

## 驗收清單

1. **綁定真實性**:Node 端點擊 `#statsFlow384`/`#bFlowOverlay384`(白名單 id)後狀態真的變
   (面板 HTML 含流向列/flowShow384 翻轉)——破壞性:副本從 ids 白名單刪 id ⇒ 相應斷言紅。
2. **零資料後備**:新城未 tick 開面板 ⇒ 含「尚無資料」,禁 NaN/undefined/Infinity 字樣。
3. **overlay 計數**:造鏈條城(直寫 k49/k121/k64/k18)後 `drawFlowOverlay384()` meta.nodes≥4;
   `__noFlow384=true` ⇒ draw 短路回 null/零計數。
4. **純讀**:開關前後 stats 全等;存檔零新鍵探針延用。
5. **真瀏覽器**(8125 槽3):開 tab、開 overlay、console 0 error、實拍留卡外(不入 worktree)。
6. 閘門:套件 0 FAIL、verify ALL GREEN、工具鏈 54/54;破壞性各案紅源驗明(fail-fast 順序意識)。

## 回滾

單一 bay commit revert;overlay 預設關+逃生閥 ⇒ 玩家可見面=一顆 tab 鈕與自選 overlay。

---

## 施工記錄(施工後填)
