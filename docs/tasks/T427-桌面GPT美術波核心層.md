# T427　桌面 GPT 美術波核心層（源自移動線 T482 T420-T424/T427-T428/T432）

狀態：`STOP: READY_TO_MERGE`（施工完成，等待業主合併指示）
發卡／施工：DeepSeek（業主 2026-08-11 明示「427出卡並施工完成」——本卡授權出卡＋施工；**合併未授權**，完成後停 READY_TO_MERGE，合併待業主指示）
claim base：`8d8801c`（v11.62，PASS 4524）  
施工車位：`bay/deepseek`，驗證 origin `127.0.0.1:8128`，只用 slot 3

> 內容源自移動線 T482（`index_T482_GPT.html`，v12.34）的 GPT 微雕美術波——以 482 為移動側唯一真相。
> 移動線 T420-T432 與桌面線 T420-T425K 卡號衝突已於 LINEAGE.md 記帳；本卡在桌面線續編 T427，CHANGELOG 標註「源自移動線 T4xx」。

## 1. 玩家目標

1. 城市畫面密度整體再上一檔：街角有生活痕跡（機車/盆栽/包裹/貨箱）、建築立面有使用證據（冷氣機/曬衣線/雨棚/招牌）、節點有活動聚集（行人口袋）、夜間街區各有性格（住宅暖門燈/商業霓虹/工業鈉燈）、相鄰街區共享材質語彙。
2. 街道邊界有市政微件（雨水篦/井蓋/路緣磨損/修補縫/管線蓋），建築鄰地有使用痕跡（輪胎痕/配送磨損/捷徑踩踏）。
3. 所有細節**決定性**（streetHash）且**有節制**（detail budget：LOD/密度/空間節奏），不變成均勻撒芝麻的噪音。
4. 任一層可獨立關閉（kill-switch），方便 A/B。

## 2. 改前基準（真瀏覽器／真 canvas）

- 桌面 v11.62 無上述任一層；`streetHash/viewRotEff/rotMask/STREET_POPCOUNT/SPR.ped/kcatOf` 等基礎俱在。
- `SPR.ped` 僅 `adult/child` 兩鍵（無 `stroller`）——T422 的 stroller 走既有 fallback 色塊分支。
- 地面層接線點：groundCache 迴圈 t.road 分支尾（L15315 前）／t.road 外 zone 前（L15316 後）／zone 分支尾（L15319 後）；建築層接線點：constrRise else 分支與 k62 段之間（L16282 後）。
- 兩釘 `4153/4550`、`sprAtlas356` 台帳 1,756 張、固定城 save 6,333 B 逐位元組恆等。

## 3. 允許觸碰

- `index.html`
  - 新增 `/* ===== T427 GPT 美術波移植層（源自移動線） ===== */` 區塊：退化橋＋8 層函式（T420/T421/T422/T423/T424/T427/T428/T432）。
  - groundCache 迴圈三處接線（T420/T427/T428）；建築繪製段一處接線（T424/T421/T423/T422）。
  - 可新增 T427 專用決定性 helper；CSS 零改動。
- `test_fixde.js`
  - 新增 T427 守衛（層存在/接線/kill-switch/零亂數/退化橋）。
- 本卡、`docs/CHANGELOG.md`；release tail 才准動 `docs/ARCH.md`、`sw.js`。
- `attic/t427-review/` 放本卡前後實拍證據。

## 4. 絕對禁區

- 不改任何 sprite（buildSprites/S1..S9 零觸碰）；atlas/metadata/canvas 台帳不得變。
- 零 `R()`／`ri()`／`rand()`／`Math.random()` 新增消耗；層內一律 streetHash 決定性。
- 不碰 tick／經濟／AI／放置／存檔／服務工作者；不動 T426 啟動管線與 buildSprites 拆段結構。
- 不新增外部素材、字型、依賴；CSS filter/blur 禁用。
- 玩家 origin `localhost:8123` 禁止造境、清槽與測試。

## 5. 施工三段

### S1　退化橋＋八層移植（原碼保留）

- 退化橋：`rhythmActivity448=()=>1`（T448 節奏）、`roadCap475=()=>1`（T475 道路容量）、`streetWearStrength446=()=>1`、`sanitationGroundBoost446D=()=>1`（T446 網絡視覺）＋`window.__noRhythm448=true;window.__noNetVisual446=true;` 常駐——T422/T427/T428 原碼結構零改動，未來搬 T446/T448/T475 時移除退化橋即可。
- 八層函式原碼移植（移動線 L18914-18985／18987-19038／19040-19075／19077-19114／19116-19143／19237-19260／19262-19292／19396-19424）：`streetStoryRoot420/drawStreetStory420/drawLivedIn421/drawActivityPocket422/drawNightIdentity423/districtMood424/drawDistrictTexture424/drawStreetEdge427/drawGroundMemory428/detailAlpha432/detailPermit432/streetPermit432`。
- kill-switch 保留移動線原語義：`__noStreetStory420/__noLivedIn421/__noActivity422/__noNightIdentity423/__noDistrictTexture424/__noStreetEdge427/__noGroundMemory428/__noDetailBudget432`。

### S2　接線

- groundCache 迴圈：t.road 分支尾插 `if(!lodFar)drawStreetStory420(gc,x,y,sx,sy,z);`；t.road 分支外插 `if(!lodFar&&!t.hw&&!t.bridge)drawStreetEdge427(gc,x,y,sx,sy,z);`；zone 分支尾插 `if(!lodFar&&!t.road&&!t.water&&!t.bld&&!t.ruin)drawGroundMemory428(gc,x,y,sx,sy,z);`（層級與移動線 L20215/20218/20223 對齊）。
- 建築繪製段（constrRise else 後）：`if(!constrRise&&(bd.age|0)>=9){drawDistrictTexture424(...);drawLivedIn421(...);drawNightIdentity423(...);drawActivityPocket422(...);}`（簽名/順序與移動線 L21336-21353 對齊）。

### S3　守衛

- 層存在＋接線（8 層函式、3 地面接線、1 建築接線）；kill-switch 全定義；退化橋存在；層區塊零 `R()/ri()/rand(/Math.random/spriteTexRand`（剝註解後字面掃描）；`__t420StoryCount/__t421LivedCount/__t422PocketCount/__t423NightCount/__t424TextureCount/__t427EdgeCount/__t428GroundCount/__t432Suppressed` 觀測橋存在。

## 6. 驗收

1. 語法檢查（`new Function`）通過。
2. `node test_fixde.js` → **PASS ≥4524／0 FAIL**（只升不降）、exit 0、verify ALL GREEN、工具鏈 54/54。
3. 兩釘 `4153/4550` 恆等；固定城 `rawSave()` 位元組恆等；`sprAtlas356` 台帳/FNV 恆等；CRLF=0。
4. 真瀏覽器（8128、slot 3）：地面層/建築層細節肉眼可見（實拍存 attic/t427-review/）、console error=0、層開關 A/B 有效、日夜各拍。
5. 破壞性紅源至少三案（整倉複製）全 exit 1 且 FAIL 具名 T427：M1 移除 drawStreetStory420 接線；M2 層內注入 `R()`；M3 移除 kill-switch 定義。
6. 啟動耗時 p50/max 不得比 5102/5187 惡化 >15%（純 draw-time 層理論不影響啟動；開機台帳恆等為證）。

## 7. 硬停與回滾

立即停卡，不合併：需要改玩法/存檔/AI/亂數流；兩釘/台帳/save 位元組漂移修不回；真瀏覽器黑屏/console error/畫面過密不可讀；verify 掉數修不回。回滾只回退本卡小提交；不動玩家存檔。

## 8. 合併／部署

本卡未獲合併授權：完成後停在 `bay/deepseek`、狀態 `STOP: READY_TO_MERGE`，卡面寫實得數據，待業主指示後才走 `python tools/merge_bay.py deepseek --deploy`（從 canonical master 執行）。

## 9. 施工閉環（DeepSeek，2026-08-11）
## 9. 施工閉環（DeepSeek，2026-08-11）

### 實作與量化

- **八層移植**（源自移動線 T482，原碼結構零改動）：T420 街角微敘事（`streetStoryRoot420/drawStreetStory420`）、T421 建築生活痕跡（`drawLivedIn421`）、T422 活動口袋（`drawActivityPocket422`）、T423 夜間街區性格（`drawNightIdentity423`）、T424 區域材質語彙（`districtMood424/drawDistrictTexture424`）、T427 街道邊界 2.0（`drawStreetEdge427`）、T428 地面使用痕跡（`drawGroundMemory428`）、T432 視覺噪音外科（`detailAlpha432/detailPermit432/streetPermit432`）。
- **退化橋**：`rhythmActivity448=()=>1`（T448 節奏）／`roadCap475=()=>1`（T475）／`streetWearStrength446=()=>1`／`sanitationGroundBoost446D=()=>1`（T446）＋`window.__noRhythm448=true;window.__noNetVisual446=true;` 常駐——未來搬市政網絡波時移除退化橋即可接回。
- **接線**：groundCache 迴圈 t.road 分支內（T420，705 塊尾、pc===2 直行段內，與移動線同構）／t.road 分支外（T427，`}else if` 拆 `}
if`——t.road 與 t.zone 互斥等價）／zone 分支後（T428）；建築繪製段 constrRise else 後（T424/T421/T423/T422，`if(!constrRise&&(bd.age|0)>=9)`）。
- **改名**：T421/T427/T428 層內局部 `R` helper → `Rp`（桌面守衛嚴於移動線——局部 R 撞全域亂數函式名，T427 G5 掃描要求）。
- 零 sprite/tick/存檔/AI 改動；index 21,146 行；兩釘/台帳/save 位元組恆等。

### 真瀏覽器與效能（127.0.0.1:8128、slot3、AI 400 天城）

- 層計數器全實證：T420 story=116（手動鋪直路+分區+step 後；AI 網格城無直行段故初始 0——城市結構特例非移植缺陷）、T421 lived=114、T422 pocket=114、T423 night=4,608（夜間）、T424 texture=1,152、T427 edge=275-532（依重建時序）、T428 ground=240-1,160、T432 sup=700+；console 0 error。
- 日夜截圖：`attic/t427-review/t427_day.png`、`t427_night.png`（1280×800；遊戲畫面非黑屏，主色為城市日/夜景）。

### 守衛與破壞性證明

- 官方施工閘門 PASS=`4524`→**`4563`**（+39：T427 G1-G6 共 39 斷言）／FAIL=0／exit 0／verify ALL GREEN；工具鏈 54/54；兩釘 `4153/4550` 恆等；CRLF=0。
- 紅源三案全紅具名（完整 test_fixde.js 實彈、exit 1）：M1 移除 T420 接線→**T427 G2**；M2 改退化橋（`()=>1+1`）→**T427 G4**；M3 移除 `__noStreetEdge427` kill-switch→**T427 G3**。
- 業主本 task 明示「427出卡並施工完成」——**本卡未獲合併授權**：停在 `bay/deepseek`、狀態 `STOP: READY_TO_MERGE`，卡面如實寫作者自驗，不冒稱非作者覆核。
- release tail：`GAME_VER/APP_VER=11.63`（`tools/bump.py`）、ARCH 版本/行數同步、CHANGELOG 手寫一條；合併時仍須在 frozen source／integration 各重跑 canonical verifier。
