# glimmer-town 架構 ／ 代碼地圖（ARCH.md）

**現況（測繪基準）**：單檔 `index.html`，v11.55，約 20,606 行（實測檔案 20,606 行＝T425D 立體感深化後 Python 數
；**行號會漂移，定位一律以 grep 錨點為準**——「實測檔案 N 行」這個措辭是 T371b 守衛的錨點字串，改寫前先看 test_fixde.js）；卡號已到 **T425D**（購物中心立體感深化：等距箱體體積語言——階梯明暗/暗側帶/屋頂板/窗洞，240 元素菱形內含）（CHANGELOG 380+ 條）；測試 `test_fixde.js`、實測 PASS 4,441、exit 0。零執行期相依、無框架無 CDN、全部美術程序化生成。

**讀完本文件你應該能回答：任何一個功能在第幾節、動它要遵守什麼不變量。**

本文件取代 v3.0 版 ARCH.md（該版停在 4,235 行 / T159，其「7 繪製＝stars waterF DIRSCR daylight() draw(dt) drawCursor」一行已完全過時：draw() 現為單一函式 1,914 行，另有旋轉層、地面快取、粒子池等舊文未載的子系統）。

---

## 0. 如何使用本文件

1. 先查 **§1 檔案分節地圖**，用 grep 錨點跳到目標（**行號會漂移，錨點字串才是定位依據**）。
2. 讀該子系統節的「動它會踩到什麼」。
3. 動手前務必掃一次 **§9 跨切面不變量**——七成事故都出在跨切面，不在本地邏輯。
4. **§10** 是「有規矩但沒機器守著」的清單，等同下一張卡的候選題庫。

三個貫穿全檔的縮寫：`k`＝建築種類編號、`sz`＝多格建築 footprint 邊長、`rot`＝視角旋轉檔位（0 南／1 西／2 北／3 東）。

---

## 1. 檔案分節地圖

| 節（含檔內舊編號） | 行號範圍 | grep 錨點 |
|---|---|---|
| CSS 主題變數／HUD／工具列／toast | 16-99 | `--shadow-panel:0 10px 28px` |
| CSS `#info` 面板容器與 `--hud-h` | 100-112, 137-139 | `max-height:max(120px,calc(100vh - 80px` |
| CSS 標準化數據表（`.stab` / `.dtab`） | 113-135 | `.stab{display:grid;grid-template-columns:auto 1fr auto` |
| CSS 開始畫面／小地圖／窄螢幕 | 140-210 | `#start .startPrimary{display:flex` |
| body DOM 骨架（全部靜態節點只有這份） | 213-275 | `<span class="chip" id="money">` |
| 亂數零號：`mulberry32` / `R` / `ri` | 285-298 | `let R=mulberry32(1);` |
| 世界尺寸／SAVEKEY | 306-308 | `const MAP_SIZES=` |
| 價目表 `COST` / `ROAD_COST` / `GAME_VER` | 367-385 | `const COST={road:15,bridge:60,zone:8` |
| `TOOLS` 153 項 ＋ `TOOL_CATS` | 386-543 | `const TOOLS=[` |
| 季節與 360 天年 / `foodPriceOf` | 668-679, 749-757 | `const season=()=>{const doy=(day-1)%360;` |
| T343 科技樹（36 節點／研究狀態／集中 `tq` 效果） | 882-990, 16255-16409 | `const TECH343=[` |
| §2 繪圖基元：`cv` / `dia` / `railTrack` / `isoBox` / `outlineSprite` | 903-1129 | `function cv(w,h){const c=document.createElement('canvas')` |
| 紋理流 `spriteTexRand` ＋ `plate()` | 1130-1142 | `const SPRITE_TEX_SEED=0x54455832;` |
| `HERO_PIX` 手繪點陣表（53 鍵） | 1142-1262 | `const HERO_PIX={` |
| **`buildSprites()` 全體** | 1432-9013 | `const __savedR=R;R=mulberry32(1);` |
| ├ 地形／道路／覆蓋層 | 1273-1458 | `/* ---------- 草地 4 變化 ---------- */` |
| ├ `PARTS` / `DRAFTS` / `mkBld` | 1459-1617 | `const PARTS=` |
| ├ 服務建築與變體 | 1618-2528 | `/* ---------- 公園 3 變化 ---------- */` |
| ├ 多格地標長列 | 2529-4050 | `T355 版面重排` |
| ├ FIX-B 尾端區起點 | 4051 | `/* ===== FIX-B 亂數流對齊：以下 T29/T30/T35/T36` |
| ├ 加蓋層 pass 群（T277→T345→**T382**） | 7507-7774 | `const stampRoof=(key)=>{` / `// ===== T382 全局美術極細化加蓋 pass` |
| └ T364 縮放管線與收尾 | 7864-8046 | `const mkIndustry364=(kind)=>{` |
| §3 世界生成 `genWorld` / `newWorld` | 8180-8330 | `FIX-K：天氣/災害殘留狀態種子化重置` |
| §4 `canPlace` / `placeCost` / `doPlace` | 8384-9363 | `function canPlace(toolId,x,y){` |
| `computePower` | 9387-9425 | `function computePower(){` |
| `COVR` / `COV` / `covFieldOfK` / `stampCov` | 9446-9482 | `const covFieldOfKBase=covFieldOfK;` |
| POL / NOISE 場 | 9476-9534 | `function stampPolSrc(x,y,k,sign){` |
| LAND 場 | 9548-9608 | `function landStaticAt(x,y){` |
| EDU / `rebuildCov` / `judgeWealth` | 9609-9667 | `function rebuildCov(){` |
| `computeWater` / `resilience364At` | 9680-9732 | `function computeWater(){` |
| §5 `aiStep()` AI 市長 | 9825-10339 | `let acts=0;const MAXA=14,RESERVE=poor?50:350;` |
| `buildTickIndex()` | 10340-10357 | `function buildTickIndex(){` |
| **`tick()` 全體** | 10358-11363 | `rebuildNoise(tickBld); // T325` |
| ├ 第一經濟迴圈（計數／幸福） | 10440-10630 | `for(const i88 of tickBld){` |
| ├ 產業鏈 | 10662-10718 | `/* ===== T364b A 深加工鏈 BEGIN =====` |
| ├ 災害段 | 10719-10868 | `// T69/T70 災害（可關）` |
| ├ 生長／升級／合併／火災 | 10882-11071 | `// 生長：收集候選` |
| ├ **第二經濟迴圈（稅收守衛鏈）** | 11126-11217 | `const civicMul=chN>0?1.03:1;` |
| └ 維護費／評分／`aiStep` 呼叫 | 11218-11363 | `if(diff!==3)money+=income-upkeep;` |
| §6 載具與煙／`computeCommute` | 11400-12419 | `function computeCommute(){` |
| §7 繪製起點：`DIRSCR` / 雨雪 | 11928-11964 | `const DIRSCR=[[4,-2],[4,2],[-4,2],[-4,-2]];` |
| 粒子池 `fxParts` | 11963-12026 | `/* ---------- T159 粒子特效豐富化` |
| `daylight()` | 12059-12065 | `function daylight(){` |
| `streetHash` | 12418-12426 | `function streetHash(x,y,salt){` |
| **T367 旋轉變換層** | 12427-12494 | `/* ===== T367 視角四向旋轉：view-space 變換層` |
| 地面快取全域 | 12496-12518 | `let groundDirty=true,groundCache=null,` |
| **`draw()` 全體** | 12519-14432 | `function draw(dt){` |
| ├ 地面層與 groundCache 重烘 | 12657-12944 | `// ---- 地面層 ----（T96：離屏快取` |
| ├ `objs` 收集與深度排序 | 13075-13242 | `// ---- 物件層（依深度排序） ----` |
| ├ 地格分支（建築十餘層加疊） | 13505-14047 | `const t=o.t;` |
| ├ 天氣後製與晝夜 multiply | 14048-14184 | `// ---- 天氣色調（雨天壓暗` |
| └ 夜燈層 `nightSprites` | 14217-14229 | `// ---- 夜間燈光（T212` |
| `drawCursor` / `drawHoverLabel` / `toTile` | 14414-14542 | `function drawHoverLabel(sxOf,syOf,z){` |
| undo 群組 helper | 14531-14533 | `const openUndo=()=>{undoGroup={snaps:[],seen:{},spent:0};};` |
| `commitRect` 批次施作 | 14729-14760 | `const hiBld=(x,y)=>{const b=T(idx(x,y)).bld;` |
| `UP_MAX` / `upCost` / `upgradeBld` | 14762-14779 | `const UP_MAX={9:15,6:10,7:10,11:10,12:10` |
| `inspect()` 建築檢視面板 | 14781-15064 | `function svcStatTable(x,y,b){` |
| §10 UI 起點：`buildToolbar` | 15441-15479 | `function buildToolbar(){` |
| `drawMini` 小地圖 | 15530-15610 | `const MINI_VIEW_NAME=` |
| `statTab` / `dataTable` / `serviceRefRows` | 15611-15676 | `T319 標準化數據表格產生器` |
| `toast` / `updHud` / HUD 三鈕 | 15677-15742 | `T311 提示訊息不刷屏` |
| 存檔槽面板／分享碼 | 15743-15817 | `function showSlots(){` |
| 地圖／場景編輯器 | 15818-15908 | `function showEditor(){` |
| 歷史曲線／城市顧問／因果追溯 | 15909-15995 | `function cityAdvisor(){` |
| `showStats()` 統計面板 | 15996-16367 | `function showStats()` |
| 通知中心／成就 | 16368-16428 | `T114：通知中心——HUD 鈴鐺按鈕` |
| `chipPanel()` 六晶片明細 | 16429-16609 | `function chipPanel(which){` |
| `showHelp()` 五分頁指南 | 16610-16715 | `const tabs=['🚦 上手流程'` |
| `undo()` / 快捷鍵 / 新手提示 | 16716-16778 | `function checkHints(plants,roads){` |
| §11 存檔：槽位／RLE／`save` | 16783-16894 | `function slotKey(n){return SAVEKEY+'.s'+n;}` |
| `MSZ` 多格尺寸反查表 | 16899-16900 | `const MSZ={19:4,20:2,22:2,23:2,24:2,25:2` |
| `load()` | 16901-17037 | `const vlen=(dd)=>{const dn=+(dd&&dd.n)||72;` |
| 自動存檔 | 17038-17039 | `setInterval(()=>{if(tiles)save();},25000);` |
| 主迴圈 `advance` / `frame` | 17046-17087 | `while(simAcc>=DAYLEN&&steps<8){` |
| `begin` / `toMainMenu` / 開始畫面注入 | 17096-17203 | `function toMainMenu(){` |
| `window.GV` 除錯鉤子（194 鍵） | 17208-17691 | `window.GV={` |

外部檔：`sw.js`（APP_VER 於第 6 行）、`test_fixde.js`、`tools/{verify,merge_bay,bump,test_toolchain}.py`、`tools/gen_spr_baseline.js`、`tools/spr_families.json`、`.gitattributes`。

---

## 2. 資料模型與存檔（§11）

### 它做什麼
把 N×N 的 `tiles` 陣列與數十個全域壓成單一 JSON 字串塞 localStorage，並在讀檔時把所有衍生場重算回來。

| 子區 | 行號 | 錨點 |
|---|---|---|
| 定長場陣列配置 `allocGrids` | 11632-11646 | `function allocGrids(){` |
| tile 結構（兩個真相來源） | 8193（genWorld）／16915-16930（load） | `const tile={t,tree:0,gv:ri(4),road:0,` |
| 槽位與鍵空間 | 16783-16797 | `function slotKey(n){` |
| RLE 壓縮層 | 16798-16832 | `const RLE_F=['ter','tre','rd','zn',` |
| `save()` 29 條 per-cell 字串 | 16833-16854 | `ter+=t.t;tre+=String.fromCharCode(48+t.tree);zn+=t.zone;` |
| `save()` bl 元組 | 16855-16870 | `const e=[i,t.bld.k,t.bld.lv,t.bld.v,t.bld.age];` |
| `save()` 頂層欄位 ＋ `_bak` | 16871-16894 | `const data={v:1,n:N,gameVer:GAME_VER,` |
| `load()` 驗證與重建 | 16901-17034 | `rebuildCov(); // T294` |
| `undo()` 主體 | 16717-16740 | `function undo(){` |
| undo 分組序列化 `closeUndo` | 14533 | `const closeUndo=()=>{` |

### 關鍵符號
`SAVEKEY`（`glimmerville.v1`）、`slotKey/curSlot/setSlot/slotInfo`、`RLE_F/rleEnc/rleDec/saveDeflate/saveInflate`、`MSZ`、`vlen`、`data.v`（恆為 1）、`bl`、`rdepArr`、`SHARE_VER='GVX1:'`、`undoGroup`。

### 動它會踩到什麼
- **每格恰好 1 個字元**：29 條 per-cell 字串每格只能寫單一字元。`skd/dtd` 用 `Math.min(9,…)`、`rcl` 用 `String.fromCharCode(48+rc)` 都是為此。**此不變量曾被 `tre` 破壞、已由 T390 修復**（編碼改字元碼 t=10→':'、load 端 DP 救援帶病舊檔、29 條長度+往返位元恆等守衛入 suite）。歷史病灶記錄：T150 把樹種擴到 1..10，`tre+=t.tree` 在 tree===10 時寫兩個字元。實測 seed1／72² 新圖有 67 格 tree===10，`tre` 長 5251 而 N²=5184，一次 save→load 後 1365 格樹種錯位（首個錯位 idx=32）。`vlen()` 只驗 `ter` 長度，完全擋不住。同源風險：`dc`(≤9)／`zn`(≤3)／`rcl`(≤5)／`ow`(≤4) 現在還安全。
- **源字串不得含 `*`**：rleDec 以 `*` 為 token 起點、`,` 為長度分隔。T312 初版用後置格式 `c+'*'+n+';'`，`'01111'` 編成 `'0*4;'` 有歧義＝靜默損壞，現行前置格式才無歧義，**不要「順手改回可讀性較好的後置格式」**。
- **新增 per-cell 字串必須同步進 `RLE_F`**（16803）。漏加不壞資料但失壓，1000² 時單欄位就 1MB。
- **存檔格式只准新增可選欄位**；load 端對缺欄位一律容錯。`data.v` 至今恆 1，代表 210 張卡全走這條路線。
- **`bl` 是位置編碼**：第 6 位 fire（k9 時是 sz）、第 7 位 den、第 8 位 we，前面缺就要補預設佔位（16864-16865）。新增第 9 位不照抄這套寫法，load 端 `rec.length>=7/>=8` 的判斷會整組錯位。
- **`sz` 不落盤（k9 例外），靠 `MSZ[k]` 反查補回**。缺表項＝ref 格全失、該地可被覆蓋建造（FIX-J）。
- **ref 格重建是 load 的最後一步**（17021-17031），任何提前跑的重建都必須對 ref 格不敏感；k9 是唯一在 bl 迴圈就先建 ref 的特例（因為 rebuildCov 要對它的 ref 格蓋 stadium）。
- **五處讀檔入口都要先 `saveInflate`**：16905／16909／16792／15790／15883。
- **不入存檔的 state 必須在 `newWorld()` 與 `load()` 兩處成對歸零**（鐵律7）。特別是 `weather/wxT/rainDays/quakeRecover`——它們會改變 tick 內 `R()` 的呼叫次數，不歸零就跨分頁模擬分岔（FIX-K/FIX-L）。
- **`townName` 未消毒**，可由分享碼進來，注入 innerHTML 前必過 `escHtml`（FIX-E）。
- **T370 未爆彈**：`curSlot()` 對非法值回退槽 1，配 25 秒自動存檔 ＝ 任何在玩家 origin 載入遊戲的探針頁面 25 秒後蓋掉玩家槽 1。

### 已知缺陷（非設計）
- `ab` 是死欄位：save 寫 `t.abandoned`（tile 層），唯一賦值是 `b.abandoned=1`（bld 層，11092），實測 `ab` 恆全 0＝廢棄狀態不跨存檔，`b.crimeDays` 也一起歸零。
- 匯入分享碼的長度驗證用當下全域 `N`（15791），load 用存檔內 `d.n`（16906）＝216² 分享碼在 72² 玩家端被判無效，儘管 load 完全支援跨尺寸互讀。
- `slotInfo` 的人口只算 `POPS[lv]`，忽略 den 倍率與 k33/34/105/127＝槽面板人口顯著低估。
- 新世界 tile 17 鍵、讀檔後 36 鍵。讀 tile 旗標一律只能用 truthiness，用 `===0` 或 `in` 會在兩種世界給不同答案。
- `gv` 存讀不對稱（genWorld 用 `ri(4)`、load 用 `i&3`），草地變體圖案必變。純視覺，但做像素回歸時要知道。

---

## 3. 程序化像素美術管線（§2 ＋ `buildSprites`）

### 它做什麼
啟動時（唯一呼叫點 L17092，**無熱重建入口**）一次性生成全部 sprite。整體結構是「基元 → 資料驅動引擎 → 手寫地標 → 一連串就地加蓋 pass」。

| 子區 | 行號 | 錨點 |
|---|---|---|
| `cv` ＋ snowCap/icicleCap/wetSkin | 903-970 | `function snowCap(` |
| `dia` / `speck` / `diaEdge` | 972-1004 | `function dia(g,cx,ty,hw,col){` |
| `isoBox` / `windows` | 1069-1110 | `function isoBox(g,cx,by,hw,h,cL,cR,cTop){` |
| `outlineSprite` / `shade` | 1111-1129 | `function outlineSprite(c,r,gc,b){` |
| `HERO_PIX` ＋ `drawHeroPix` | 1142-1262 | `const HERO_PIX={` |
| 序幕：替身流 ＋ 三條流 | 1265-1272 | `const __savedR=R;R=mulberry32(1);` |
| `PAL`/`PARTS`/`DRAFTS`/`mkBld` | 1459-1617 | `const DRAFTS=` |
| T277 道路加蓋 | 7507-7536 | `const CURB='#9aa0a8'` |
| T278 屋頂雜項加蓋 | 7537-7592 | `const stampRoof=(key)=>{` |
| T261 夜燈遮罩 ＋ T291 底座裁切 | 7659-7698 | `const clipBase=(s)=>` |
| T345 色環／徽記 | 7699-7774 | `if(!window.__noBadge){` |
| T364a `sc` 縮放契約 ＋ parity | 7864-8027 | `const mkIndustry364=(kind)=>{` |

### 關鍵符號
`SPR`（110 個頂層鍵）、`dia(g,cx,ty,hw,col)`、`isoBox` 回傳的 `rty`、`spriteTexRand`、函式級 `rand=mulberry32(20260712)`、`SZC`／`SZB`、`maskNight`／`clipBase`／`stampRoof`、`_scView`／`_scSrcW`、`window.__noHero`…（71 個開關）。

### 動它會踩到什麼
- **`dia` 的第二參數 `ty` 是菱形頂點 y，不是中心 y**。佔用列 `ty..ty+hw-1`、x 佔 `cx-hw..cx+hw-1`。T355 就是把 ty 當中心，讓中央公園整個裝飾層浮在鄰格空中（離線量到上緣溢出 88px）。判斷貼地元素是否在 n×n footprint 內：`|x-ax|/(32n) + |y-(ay-16n)|/(16n) <= 1`。`hw` 必須是偶數（鐵律6）。
- **亂數流尾端紀律**：三條流分別是全域 R/ri（被 `mulberry32(1)` 替身接管、L8045 還原）、函式級共用 `rand`、隔離的 `spriteTexRand`。實測消耗邊界：`ri()` 止於 4813、`rand()` 止於 6562、`spriteTexRand` 直接引用止於 4506（經 plate 間接到 7248）。在這些行之前插入對應消耗＝位移全部下游。零亂數區塊（純 fillRect／查表／canvas 合成）可自由插入，但仍慣例排尾端以取得「後寫後贏」語意。
- **`DRAFTS` 展開必須 `tasks.sort((k,lv,v) 升序)`**（1602）；拿掉排序或改比較器＝整條流位移。`mkBld` 迴圈刻意跳過 k=1/2/3 的 v>=4（1617），與尾端 T101/T102/T103/T150 是一對。
- **畫布與錨點慣例**：1×1＝72×112 ax36 ay110（by=108）；2×2＝136×150 ax68 ay148；3×3＝208×220 ax104 ay218；4×4＝272×280 ax136 ay278；5×5 不統一。任何覆蓋既有鍵的手繪替換必須逐位元沿用被替換者的 w/h/ax/ay。
- **HERO_PIX 覆蓋＝整張畫布重畫**（T148/T151/T156/T161/T162/T164），所以更早的 detailPass／detailPass2 疊加全數丟失（原始碼明文承認，非缺陷）；排在其後的 T277/T278/T261/T291/T345 才蓋得上去。
- **鐵律11：不要在畫布頂端加東西**。sprite 頂部多為透明天空，積雪／道具／徽記都必須先 getImageData 逐欄掃「該欄最高不透明像素」求屋頂線。牆面是 HERO_PIX 手繪禁區，**只有屋頂是安全加蓋面**。
- **鐵律17：夜燈畫布必須被本體 alpha 遮罩**（T261 `destination-in`）。否則 `'screen'` 疊加＋畫家順序會把亮窗印到後面那棟的屋頂上。排在 T261 之後新增的自帶 night sprite 必須自己補做（見 `parity364`）。
- **加蓋層順序不可任意調換**：T273 → T274 → **T353（必須在 T279 之前，因為 T281 從 farmSea clone）** → T279/T281 → T276/T282 → T277 → T278 → T318 → T261 → T291 → T345 → T359 → T361 → T364b → T364c/d → T368。
- **時相替身必須被所有加蓋層一併處理**：`farmSea[1..3]`、`farmGrow[0..2][0..1]`、`parkS/parkA/parkW`。只掃 `SPR.bld` 會造成「畫面隨日子閃變」（T291/T345 都是後來被 T353 補上這條迴圈的）。
- **`farmGrow` 的錨點 metadata 必須抄 base sprite**（7392-7398 的 `bAnchor`）。`doFarm` 傳的 ax/ay 是繪製座標；抄錯會讓大農場每 4 天整棟跳一次（zoom2 實測 120,48 螢幕像素）。
- **T364a `sc` 契約**：帶 `sc` 的 sprite img 是 2× raw，繪製端建 `_scView` 同步縮 w/h/ax/ay 並保留 `_scSrcW/_scSrcH`。所有幾何一律除以 sc（`u=1/(sp.sc??1)`），snowCap/wetSkin/icicleCap 與施工切片必須走 `_scSrcW` 分支。無 sc 的既有素材必須逐位元不變（測試硬性斷言既有 120 座不得出現 sc）。
- **`||` vs `??` 的 0 陷阱**：`SZB[k]||1` 與 `s.sc??1` 並存。設定表合法值可能為 0 時一律用 `??`。
- **T274 區塊與 T229 色表已被位元級測試凍結**（拿 `backups/index.pre-T274.html` 逐位元比對，含「尾端區塊後必須是單一 LF」）。缺色只能像 T353 那樣另開一張表就地加蓋。
- **git 還原後必查 CRLF**——`git checkout index.html` 會被 autocrlf 換成 CRLF，直接踩爆上述位元測試。

### 已驗證缺口
- ~~`SZC` 缺 20 鍵~~ **已由 T378 補齊、T383a 機器守**：五表（MSZ/SZC/SZB/SZM×2）現況 65 鍵逐鍵相等，新多格建築漏任一表當場紅並點名。
- `k9`（體育場，2×2）**設計性不入五表**（沿用存檔第 6 位 sz，T383a 以斷言凍結此現狀），但 T345 色環 `hw=32*(SZB[9]||1)=32`＝只有應有長度的一半（與 T353 修掉的 k91 同型）——視覺債仍在市面，入表須五表齊補＋改 T383a 斷言。
- T345 徽記在屋頂線距畫布頂端不足 11px 的 sprite 上會整個消失，只剩色環。

---

## 4. 繪製管線與視角旋轉（§7 ＋ T367）

### 它做什麼
`draw(dt)` 單一函式 1,914 行：天空 → 地面（離屏快取）→ 動態疊層 → objs 深度排序繪製 → 全屏後製 → 夜燈 screen → 天氣個體 → 游標。T367 在其上加了一層純視角的 view-space 旋轉。

### 關鍵符號
`daylight()→{b,dusk,ph,d}`、`streetHash(x,y,salt)`、`w2v/v2w/viewDep/isoW2V/rotMask/camLookWorld/setViewRot`、`sxOf/syOf`、`gKey`、`objs`／`dep`、`nightSprites`、`lodFar/lodMini`、`fxParts`、`visT`。

### 動它會踩到什麼
- **rot=0 必須逐位元回歸**：`w2v/v2w` 在 r===0 直接 return，`viewDep(x,y)===x+y`，多格 max ＝ 舊 SE 角，`rotMask(m,0)===m`。所有既有像素基線與 2,869 條斷言都建立在 rot=0。
- **旋轉層區塊禁止出現 `R()/ri()/Math.random`**（靜態斷言，且斷言邊界止於 `STREET_POPCOUNT` 之前——在 12427..12495 之間插東西會踩到）。`viewDep` 不得 `Math.floor` 量化（T367 退修 P4）。
- **旋轉不進存檔格式**：只寫 `localStorage[SAVEKEY+'.viewRot']`。存檔是模擬真相，視角不是。
- **任何新繪製都必須經 `sxOf/syOf` 或 `isoW2V`**，直接寫 `(x-y)*32` 就是漏轉。注意 `sxOf` 帶 `-32`＝回傳菱形左端點，實體要用 `ox+wx*z`（＝sxOf+32z）。
- **日間（含正午）逐像素一致**是硬不變量：`nightDepth` 在 b>=.72 恆 0、`shadowA` 在 quality<2 的日間恆 0、`dusk` 正午恆 0、夜燈閘不開＝零繪製。加任何日間可見的新效果都會撞它。
- **draw() 不得消耗模擬亂數流**。要隨機只有三途：`streetHash(x,y,salt)` 座標決定性、`visT` 決定性相位、或粒子專用的獨立 `Math.random()`。改 streetHash 常數＝全城裝飾一次重排。
- **「渲染不改狀態」的精確界線**：draw() 確實會寫 `trafClock/waterT/waterF/rainbowT/flashT/meteorTrail.t/groundCache*/signalList/fishScanN`——這些是純視覺運行時值，不入存檔、newWorld/load 成對重置。新增視覺狀態必須同步加進重置行。
- **LOD 只裁「畫」不裁「算」**（T107）：`lodFar/lodMini` 不得影響 tick／updCars／updSmoke。
- **`gKey` 必須涵蓋所有影響地面外觀的量**：`ox_oy_z_waterF_win_day_W_H_r{rot}`。反之 `day` 已在鍵內，tick 直改 tile 的路徑**刻意不補 `groundDirty`**——不要「順手」補。`groundDirty` 置真點分散在六處（doPlace 9360／undo 16736／newWorld 8321／load 17034／GV.flood 17605／setViewRot 12480），漏一處＝「改了地圖畫面不變」，且因 day 遞增次日自癒＝間歇性難重現。
- **多格建築只由 root 繪製**；錨點取 footprint 內 view 最大 dep 的角（rot≠0 時未必是 SE 角）。
- **夜燈只能走 `nightSprites`**（14217-14229 唯一出口），在別處自行 `'screen'` 會破壞層序。
- **`'lighter'` 會洗白**：T195 電光／T207 隕石拖尾／T248 彩虹三處都撞過，底下已飽和到 255 或淺藍天時疊上去是變白／看不見，三處都改回 `source-over`。
- **T359 探照燈必須畫在建築本體之後**，畫在之前會被剪影整段蓋掉、截圖完全不可見（Node mock 只能證明「呼叫有發出」，抓不到這種層序錯誤）。
- **多分支選鍵必須先設 base 保底**（T298 農場頻閃：`s` 殘留上一棟建築的 sprite，隨 day 輪替交替閃爍）。
- **每個新視覺層都要有 `window.__noXxx` 開關**——A/B 像素回歸的唯一手段。但驗開關前先 `GV.lookAt` 對準 ＋ `setZoom(2)` ＋ getImageData 確認畫面裡真有那個目標（T160 曾三度誤判）；且建築必須完工（age≥9），A/B diff 全 0 常常是「建築沒長好」而非「效果壞了」。

### 目前仍未跟轉的子系統（rot≠0 時會出錯，逐一實測確認）
> T375 收六列（v10.7）、T376 收載具列（v10.8）。下表為剩餘三列，行號依 T376 後現況校正；
> C 族畫序深度（T377）與 E 族地形邊界（T378）各自另卡。
| # | 位置 | 症狀 |
|---|---|---|
| 1 | ~~七 spawn 點世界 x+y 深度鍵~~ **已修（T389：七點全改 viewDep(x,y)，煙/行人同款 spawn 凍結先例）** | **旋轉收口全清（T375+T376+T388+T389）** |
| 2 | ~~horizonY 世界角投影~~ **已修（T388，現 13741：`oy+6*z` 旋轉不變量）** | ~~rot=1/3 掉腰線、rot=2 掉底點~~ 四檔位地平線恆貼鑽石頂點 |
| 3 | ~~外緣懸崖世界座標判邊~~ **已修（T388，現 13777：w2v 後 view 判邊）** | 四檔位近端恆有崖 |

小地圖（15600 附近）是**已完整跟轉的範本**，修上述任一項可照抄。

---

## 5. 模擬 tick（§5）

### 它做什麼
`advance(dtReal)` 把真實時間轉成 tick 次數（`DAYLEN`=0.9s，單幀最多追 8 天）；`tick()` 一天內依固定順序跑：索引 → 噪音重建 → 日曆／事件／天氣 → 死亡前置 → **第一經濟迴圈**（計數＋幸福）→ 彙總 → 產業鏈 → 災害 → RCI 需求 → 生長 → 升級 → 垂直合併 → 火災 → 犯罪/廢棄/生病/死亡 → **第二經濟迴圈**（稅收）→ 維護費與落帳 → 挑戰/成就 → 評分 → `aiStep()`。

### 關鍵符號
`buildTickIndex/tickBld/tickRoad/tickZone`、`happyParts`（50 項固定長度）、`cityHappy`、`dem[1..3]`、`COV/COVR/stampCov/covFieldOfK/rebuildCov`、`POL/POLBASE/POLTREE`、`NOISE/rebuildNoise`、`LAND/LANDBASE/markLandDirty`、`EDU`、`computePower/computeWater`、`season()/FARM_SEASON_MULT`、`streetHash`、`fin`、`flowStat384`、`cms385`（T385 市長委託：CMS385 池九條、seed+輪次純函式雜湊三選一零 R() 消耗、可選存檔欄 cms385 svcFleet 驗型、零接單城位元恆等；沙盒不出委託；T386b 外貿合約=池加 stock 期末驗收型（到期日驗 steel/fuel 庫存，純讀零模擬寫入，扣庫存方案否決記卡）；T386a 城市專精 spec386（四方向永久單選、sq() 12 效果呼叫掛既有白名單點、未選位元恆等、Lv.6/非沙盒、兩擊確認）；T387a 醫療容量顯示層（flowStat384.med={cap,sick}：容量=四計數×權重 cemCap 慣用語、病患=tick 區域計數器搭死亡轉化迴圈；效果接線 T387b 已接：治癒吃床位（昨日快照 cap；醫院分支無 R 恆無 R、診所骰照擲結果遮蔽=消耗序恆等；非超載城位元恆等；超載=排隊滯留、續累 sickDays））（T384 tick 尾流向快照：學 demWhy 成對歸零＋ok:false，不學 fin 的無歸零殘值；僅面板/測試可讀，禁止餵回模擬）。

### 動它會踩到什麼
- **鐵律14 稅收守衛**：新增任何 k，若它會走到第二經濟迴圈（11131-11217），**必須**補一條顯式 `else if(b.k===K);`。否則 fall through 到工業稅兜底，`JOBSI` 只有 4 格，lv≥4 時 `JOBSI[lv]` undefined → income NaN → money NaN → 存檔崩壞。鏈尾三條範圍分支：`b.k>=124&&b.k<=133`（11207）、`LMCFG309[b.k]`（11208）、`b.k>=81&&b.k<=120&&b.k!==105&&b.k!==106`（11209）。**k>=134 沒有任何守衛。** 歷史事故四次：FIX-A（診所/墓園）、T251（大農場 k53，真的 NaN 崩存檔）、T254（k57）、T290（k65）。
- **鐵律2 亂數流位元契約**：不得改變 `R()/ri()` 的呼叫次數與順序。改機率係數安全，多加一次擲骰或讓某次擲骰被跳過就是破壞。安全手法：用 `streetHash` 做決定性判定（霧/城市事件/移民潮/T364d 防災攔截全走這條），或把新判定掛在既有擲骰**之後**（T364d 的地震還特地把上限從 hit 改成 attempted 以保住 `ri()` 消耗次數）。
- **`happyParts` 必須是固定長度陣列字面量**（50 項，每項用三元式回 0），**絕不可條件 push**——`happyAggSum` 是按索引對齊累加的。
- **`cityHappy` 一天內被寫 4 次，最後一次才算數**（10635／10651／10661／10717）。最終值**不含社宅 k127 的 b.h**（10635 那次含，之後三次只統計 k1）。加任何影響全城幸福的東西前先確認插在哪一次重算之前。
- **COV 是計數場不是布林**，`stampCov(+1)/(-1)` 必須嚴格成對；多減會 0→255 無號下溢。`covFieldOfK` 就是讓 doPlace/doze/rebuildCov 共用同一份映射而自動對稱。特例：巨廈吸收公園要手動 `stampCov('park',…,-1)`；k126 的 `play`、k132 的 `shelter` 是第二個場，三處都要手動維護。
- **`svcBudget` 改值必須立刻 `rebuildCov()`**——增量對稱性只在 budget 不變時成立。
- **中性值恆等**：LANDBASE 空圖恆 128（下游 `(LAND-128)/128` 才精確算出 ×1）、EDU 恆 0、POL/NOISE 恆 0、roadLoad 恆 0、commutePenalty 無就業區恆 0、各產業倍率無設施時恆 1、三張季節乘數表春季恆 1。
- **`tickBld` 是候選超集**：每個遍歷它的迴圈都要 `const b=tiles[i].bld; if(!b)continue;`（火災中途清掉建築）並幾乎必備 `if(b.ref)continue`（多格 ref 格不參與模擬/經濟，否則一棟 3×3 被算 9 棟）；中途新生的建築要當場 `tickBld.push(idx)`。
- **money 落帳只有一處**：`if(diff!==3)money+=income-upkeep;`（11269，沙盒短路）。新收入 `income+=`、新支出 `upkeep+=`；`fin` 只是報表鏡像，只改 fin 不改 upkeep＝數字對不上（T266）。
- **產業鏈的流量 vs 庫存**：`fuelMade/steelMade/…/TaxMul` 是本 tick 流量（10668-10672 統一歸零重算），只有 `supplies/fuel/steel/goods` 是跨日庫存。T346 的 gas 鏈效果刻意由**下一日**讀取。T284 血淚：流轉插在「今日開採入帳前」＝讀到 0 整條鏈死寂；**庫存為 0 不代表鏈斷，要看流量**。
- **第一迴圈與第二迴圈的計數不可重複**——同一建築在兩處都計數會讓維護費翻倍（FIX-A 碑文仍留在 11141-11145）。新建築的計數一律加在第一迴圈。
- **模擬節奏只由 `DAYLEN` 與 `speed` 控制**（鐵律10）。單幀追 8 天上限是防呆，改掉會讓分頁切回來一次跑上百天。

### 效能與歷史
- T316 之前 tick 有 11 個全圖掃描，648² 空城單 tick 244.5ms。`buildTickIndex` 的「候選超集＋條件實時重驗」設計必須維持——遍歷升序索引才與原 row-major 同集合同序、`R()` 消耗逐位不變。
- T354 實測 `computePower` 佔全行程 22.4%（tick 1 次＋aiStep 1 次＋每次 doPlace 各 1 次），同期**否決了三個舊假設**：噪音場僅 1.9%、AI wants 表迴圈 0.4%、`recomputeLandDynamic` 0.4%。**要動效能前先量。**
- T292 LANDBASE 僵屍 bug：增量 `stampCov` 完全不碰 LANDBASE，地價永遠停在 128，拖累生長／稅收／升級三處卻毫無徵兆。任何用增量維護的衍生場都要問「誰在增量路徑上同步它」。
- T341/T342：塔進化曾結構性凍結（分區沿路生長讓 3×3 環必缺一格路），現改成塔門檻降 Lv2+、巨廈由 3×3 簇直接成形；`mgDone` 即使擲骰失敗也要佔位，否則 2×2 塔掃描會吃碎同一簇。

---

## 6. AI 市長／工具與放置（§4 ＋ §5 AI）

### 它做什麼
`TOOLS`（153 項）＋ `canPlace`／`placeCost`／`doPlace` 是玩家與 AI 共用的建造管線；`aiStep()`（9825-10339）在 tick 尾端跑一次，用純確定性掃描替玩家蓋城。

### 關鍵符號
`COST`／`ROAD_COST`、`canPlace`（**null＝可建**，非空字串＝錯誤訊息）、`canPlaceMulti`、`placeCost`、`doPlace`、`tryP`／`tryPClear`／`clearable`、`wants`（78 條）、`UP_MAX`／`UP_JOB`／`upCost`／`upgradeBld`、`commitRect`、`undoGroup`。

### 動它會踩到什麼
- **`doPlace` 是建造/拆除的唯一資料變更點**（扣款、groundDirty、粒子、電網/水網同步、樹污撤印全在 9353-9363）。全檔只有 `undo()` 繞過它直接覆寫 tiles，因此 undo 必須逐項手動補齊這些副作用。
- **`canPlace` 新增分支必須明確 `return null`**，否則落到 8551 的兜底 `'無法建造'`（8452 上方的原始註解就是這個事故的碑文）。`canPlace` 與 `placeCost` 的 case 清單是**兩份手抄副本**。
- **工具列顯示價必須等於 `placeCost` 實扣**（鐵律20）。多數 `pr` 寫成 `'$'+COST.x` 自動同步，但 `oneway`（'$20'）與 `light`（'$60'）是字面值、placeCost 也硬編碼，兩處必須同改。**目前無任何測試守這個一致性。**
- **工具 id 必須與 COST 鍵同名**，唯一例外 `civichall→COST.civicHall`，由 AI 端的 `aiCostOf`（10280）顯式處理。新工具讓 id≠COST 鍵又忘了補＝AI 拿到 undefined 永遠 continue，**不報錯，只是那座建築 AI 永遠不蓋**。
- **多格 root/ref 契約**：root 存 `{k,lv,v,age,pw,h,sz}`、其餘存 `{k,ref:[rx,ry]}`；覆蓋場只在 root 蓋一次（唯一例外 k9 四格皆蓋 stadium）。處理多格一律先 `t.bld.ref||[x,y]` 解析 root 再讀 sz。
- **`UP_JOB[k]` 一律用 `??` 不可用 `||`**（鐵律15／T254）：顯式 0（純擴容不加就業）會被 `||6` 誤 fallback 成每級 +6 幽靈就業。
- **「讓某個 k 變成可升級」這個動作本身就是引信**——進入 `UP_MAX` 就必須確認第二經濟迴圈有它的分支。
- **doze 的 else-if 鏈順序＝拆除優先序**。T117 隕石坑原本落在 zone 之後，導致「曾劃過分區的格子上的隕石坑永遠剷不掉」，才被提到僅次於 ruin。
- **鐵律19（AI 旋鈕非單調）**：AI 早期決策是混沌路徑依賴系統。實證一：掃工資→商業稅乘數 k=0/.25/.5/1 得 pop 3155/474/3418/387（**中間值反而最差**）。實證二：為修水域死鎖試過三種預防式改法，每種都把原本健康的種子打壞（seed22 4550→335）。**正解形態三條**：①優先結構性／配置改動而非給錢（T346d zoneBudget 1→4，六種子三勝一負且崩城率不變）；②必須介入時條件要嚴到健康城市永不滿足（T348 五連條件），這樣健康軌跡位元恆等；③驗收一律多種子看崩城率，單種子變好＝運氣。改 AI 前先讀 9921-9935 與 10017-10023 兩段長註解。
- **AI 全程零 `R()` 消耗**——所有選址都是 row-major 決定性掃描或座標雜湊。
- **AI 建造必須走 `tryP`／`tryPClear`**（三道閘的唯一收口）。唯一例外是 10127 的都市更新，它繞過了資金閘。
- **AI 的動作不進 undo 群組**（tryP 直呼 doPlace 而未 openUndo），玩家撤不掉 AI 蓋的東西——這是刻意的。
- **AI 的節拍常數互相錯開**：服務 day%2、適應性建設 day%2、中庭公園 day%3、公車站 day%10、車隊 day%20、地鐵 day%25、都更 day%30、地標 day%40，路網 %6／%18、水管 %6===3。改任一個都屬於動 AI 旋鈕。

### 已知缺口
- 放置後的即時電網刷新清單（9355）**不含 T257 新增的 nuclear/hydro/geo**，要等下一次 tick 自癒。
- `canPlace` 的 1×1 服務群分支（8399-8403）**沒擋 rail/tram**，而多格通用分支擋。補上會改變 AI 的合法點集合＝需多種子驗收。
- AI 完全不蓋 T364b/c/d 的 13 種建築（k121-133），已 grep 確認這些 id 在 aiStep 全段一次都沒出現。

---

## 7. UI 層（§10）

### 它做什麼
CSS（16-210）＋ 靜態 DOM（213-275）＋ §10 的所有面板函式。九個面板共用唯一容器 `#info` / `#infoBody`。統計面板 tab 列（statsTabs343）現有三顆：城市/科技樹/**流向（T384b，showFlowPanel384＝純消費 T384a 聚合層）**；主畫布另有 T384b 流向 overlay（flowShow384 三件套：預設關/不入存檔/`__noFlow384` 逃生閥，draw 於地鐵層後夜燈前，isoW2V 旋轉相容，視圖參數顯式傳入）。

### 關鍵符號
`showInfoPanel()`（唯一顯示入口）、`syncHudH()` / `--hud-h`、`statTab` / `dataTable` / `bindDataTable`、`toast` / `updHud`、`inspect` / `svcStatTable` / `metroStationTable`、`chipPanel`、`showStats` / `cityAdvisor` / `FACTOR_TRACE`、`drawMini` / `MINI_BLD_PAL`、`showSlots` / `importShareCode`、`showEditor`、`camLookWorld`。

### 動它會踩到什麼
- **顯示面板只准走 `showInfoPanel()`**：全檔 `$('#info').style.display='block'` 必須恰好出現 1 次（892），目前 9 個呼叫點。理由是要先 `syncHudH()` 實測 `#hud` 高度寫進 `--hud-h`，ResizeObserver 是下一幀才回呼、只靠它會在導航欄折行那一幀頂穿。
- **`#hud` 的 z-index 必須是 30**，`#info` 限高不能寫死（420px 寬時導航欄實高 98px）。這三件事是 T322 的三段修法，缺一不可。
- **純數據列一律走 `statTab()`／`dataTable()`**（T319 標準化契約），不要自己拼表格。
- **`chipPanel` 的 pop/jobs 重算式必須逐字鏡像 tick 的累加式**，且因為 tick 順序是「先算 pop 再讓建築生長」，面板必比 HUD 新一個生長步——所以財富分層**必須用最大餘額法歸一到 HUD 的 pop**（16486-16494），保證分層相加＝總人口。
- **`townName` 注入 innerHTML 前必經 `escHtml()`**。
- **所有跳鏡頭一律走 `camLookWorld(worldX,worldY)`**，不可直接寫 `cam.x=(x-y)*32`（T367 退修修的就是這五處）。小地圖繪製要 `w2v`、點擊要 `v2w`。
- **面板內互動控件一律 `addEventListener`，不用內聯 onclick**（`#infoBody` 每次重繪整批重建 DOM）。
- **UI 偏好全走獨立 localStorage 鍵，永不進存檔格式**：`.snd/.q/.ds/.msz/.viewRot/.slot/.scDone`。
- **toast 的視覺節流不得影響通知中心**——不管有沒有被擠掉一定 `log.push` 並 `unread++`；被擠掉的舊條必須立刻 `position:absolute` 脫離排版（T311 修前實測 DOM 殘留 18 條）。`#toasts` 的 bottom 必須 ≥118px（T219：玩家截圖實證 toast 壓住水塔/消防局按鈕）。
- **`MINI_BLD_PAL` 新增條目用顯式索引賦值，不要 push**（這張色表同時被遠景 LOD 色塊複用）。
- **快捷鍵用 `dataset.tid` 在「可見的」按鈕上反查**（FIX-E），不要改回 TOOLS 全表索引。

### 已知缺陷／陷阱
- **`#bMetro` 的 click 監聽掛在 `showStats()` 內部（16331-16338），但 `#bMetro` 是靜態 HUD 元素**。showStats 每呼叫一次就再 addEventListener 一次，而幾乎所有面板控件都以 showStats() 收尾 ＝ 監聽器累積；同區塊末尾又無條件把它設成 opacity 0.55，與 `metroShow` 實際狀態脫節。**（讀碼推得，未實跑；test_fixde.js 全檔查無 bMetro/metroShow 任何斷言＝測試零覆蓋。）**
- `buildToolbar()` 15462 的註解已過期（宣稱「全部 TOOLS 皆未設 unlockRank」，實際有 30 項）。等級不足時工具鈕不渲染，快捷鍵也找不到＝「按了沒反應」是設計行為。
- 開始畫面的災害／畫質／地圖尺寸三顆設定鈕被包在**挑戰按鈕的守衛**裡（`if(startEl&&!$('#bCh1'))`）。
- 地圖尺寸 UI 與檔位表脫節：`MAP_SIZES` 有 7 檔，`msLbl` 只認 108/144/216，而 307 行註解自陳 216² 是安全上限——UI 讓玩家選得到超過自陳上限的尺寸且無標示。
- 切到另一個面板**不會**呼叫 `hideInfo()`，所以因果追溯的紅色高亮會留在畫面上。
- `dtabSort` 是全域單一排序狀態，統計面板（2 欄）與指南速查表（5 欄）共用。
- `showStats()` 每次重繪都跑一次 `cityAdvisor()` 的 O(N²) 全圖掃描。
- 小地圖不是每幀重繪（setInterval 2s ＋ 12 個手動呼叫點），改了 tiles 忘了 `drawMini()` 會停留在最多 2 秒前的狀態。
- `showHelp()` 的分頁分支順序是 0/1/2/4/**else**，新增分頁會掉進 else；16697-16705 整段用 `\uXXXX` 逃逸寫成，grep 中文找不到。
- Escape 鍵 `querySelectorAll('.tool')[0].click()` **無 null 守衛**，目前安全只因為 pan/doze 在每個分類恆渲染。

---

## 8. 測試與工具鏈

### 它做什麼
`test_fixde.js` 用手寫 DOM/BOM mock ＋ `eval(index.html 的 inline script)` 把整個遊戲載進 Node，再以 `window.GV`（194 個鉤子）驅動；`tools/verify.py` 是唯一權威綠燈；`tools/merge_bay.py` 是三個施工車位併回 master 的唯一通道。

### 四類斷言
| 類型 | 位置 | 手法 |
|---|---|---|
| 一般執行期 | 全檔交錯 | `newWorldSeeded(seed)` → place/step → 斷 `stats()`；含釘定種子與逐位元重播 |
| 原始碼靜態 grep | 258, 303-738, 4164-4783 | `html.includes` / 用兩個錨點切區塊後 `!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/` |
| 離線幾何重播 | 2194, 2894, 3067, 3328 | `vm.runInNewContext` ＋ 自製 sandbox（T274 那個是真的軟體光柵器） |
| canvas stub 差分 | 4300-4329 | `gameEllipseTrace` 收 ellipse 呼叫，**必須用 muted/active 差分** |

### 動它會踩到什麼
- **canvas stub 的 `getImageData()` 恆回 4 bytes**（第 60 行）。所有像素級審計在 Node 端都只是煙霧測試（`sprFootAudit` 260、`sprAboveAudit` 371、`sprMetroAudit` 1382 都明標此事）。真實像素驗證只能在瀏覽器 `atlas.html` / DevTools 做。
- **`assert()` 實作與收尾契約必須逐字元不變**（205-208 與 4782-4787）——verify.py 拿整段字面做 count==1 比對。完成標記 `FIX-D/FIX-E 回歸測試全部通過` 必須是最後一個非空行，全檔只能有一個 `process.exit(0)`。
- **`eval(js)` 把遊戲注入模組頂層作用域**，測試與遊戲共用同一 scope。新測試一律用卡號後綴命名區域變數，取通名會遮蔽遊戲函式。
- **整份檔案共用同一個 window/GV/store，測試順序有狀態耦合**。改了地圖尺寸忘了還原＝後面的 findSpot 全部找不到位置。
- **`gameEllipseTrace` 用完必須設回 null、`__noXxx` 設回原值**。
- **`assert` 是 fail-fast**：第一條紅就 exit(1)，後面完全不跑——這也正是 PASS 棘輪能抓到早期斷言被弄壞的原因。
- **`spr_families.json` 只做 `>=` 比較**：新增素材永不必更新基線，只有刻意刪減才重跑 `gen_spr_baseline.js` 降基線。基線檔停在 ver=10.2/total=1323（遊戲已 v10.4，設計如此不是漂移）。`gen_spr_baseline.js` 必須繼續 eval 借用測試的 mock 頭段——基線與斷言必須用同一把尺。
- **GV 讀取型鉤子必須零副作用**（T369 斷言開統計面板前後 `stats()/hist()/rawSave()` 完全等值）。
- **可信驗證器永遠從 canonical master 執行，部署 bytes 永遠從凍結 commit 的 blob 讀**——incoming 程式碼不得驗證自己，也不得決定發佈什麼。
- **CRLF 掃描必須排除 `backups/` 與 `attic/`**（`.gitattributes` 標 `-text`＝位元契約，誤掃會弄紅 T269 的 SHA-256 與 T274 的逐字比對）。

### verify.py 五道 fail-closed 閘門
①語法（inline script 必須恰好一段，`node --check` 走 stdin 不建暫存檔）②CRLF==0（實掃 212 檔）③`GAME_VER`＝`APP_VER` 且各恰好一 match ④套件綠＝exit 0 ＋ FAIL 0 ＋ PASS≥`MIN_PASS` ＋ 最後一行是完成標記，四條同時成立 ⑤harness 契約 ＋ 至少 2 條種子哨兵。`--min-pass` 硬性拒絕低於 1902。

### merge_bay.py 的三個核心保證
- **PASS 兩段棘輪**：`PASS(S)≥PASS(B)` 擋交易發起、`PASS(M)≥PASS(S)` 擋晉升。這才是真正防退化的東西，`MIN_PASS=1902` 只是災難線（實測已 2875）。
- **preflight 三閘**：部署目錄純淨（T370：`DEPLOY_ALLOWED` 從【寫入】白名單改成【存在】白名單，多一個檔或**任何目錄**就紅）、CHANGELOG 簽核已落地（T371：驗收欄不得含「待」且必須具名六方之一）、部署收據無事後回滾。
- **18 個交易階段**落在原子寫入的 `active.json`，`--resume` 可從任一階段接續；master 只被 `git merge --ff-only` 到已在隔離 integration worktree 驗過的那個確切 OID。

`tools/test_toolchain.py`（43 例）是對閘門本身的故障注入回歸，全部在拋棄式 git repo 裡跑。

---

## 9. 跨切面不變量

| # | 不變量 | 在哪強制 | 被哪條測試守著 |
|---|---|---|---|
| 1 | 三條亂數流互不污染（R/ri、`rand=mulberry32(20260712)`、`spriteTexRand`） | index.html 285-298 / 1130-1142 / 1272 | T272 fresh-VM 指紋 mutation-kill（test 2860-2915）；各卡的區塊零亂數 regex |
| 2 | 改的是 `R()` 的**次數**不是數值 | 全檔慣例 | 釘定種子 seed301→4153（test 3757）、seed22→4550（test 4722）；verify.py `MIN_SEED_PINS=2` |
| 3 | 新素材放 `buildSprites` 絕對尾端（FIX-B） | 4051 註解宣告 | 各卡自寫的區塊 regex＋**T383c live token 序快照**（中段插入/刪除/換序消耗即紅） |
| 4 | `buildSprites` 不得偷吃世界流（`__savedR` ↔ 8045 還原） | 1271 / 8045 | T275 globalRPreserved |
| 5 | 五份多格尺寸表必須同步 `MSZ` | MSZ 18102 / SZC 8630 / SZB 8656 / SZM 18670 / SZM 18692 | **T383a 全鍵集合比對**（份數 1/1/1/2＋逐鍵 miss/extra/wrong 全零＋k9 不入表凍結） |
| 6 | 每個 k 都要有稅收守衛分支（鐵律14） | tick 12105-12245 | **T383b 執行期窮舉**（133 鍵合成城、fallback sink 記錄器）＋既有字串斷言與定點 NaN 冒煙 |
| 7 | 多格 ref 格不參與經濟（`if(b.ref)continue`） | 11135 | 間接由釘定種子守 |
| 8 | 讀檔絕不拋錯；存檔格式只准新增可選欄位（鐵律9） | load 全包 try/catch，17036 回 false | 存讀往返測試、_bak 還原測試 |
| 9 | 多格 root 由 `MSZ[k]` 反查補 sz（FIX-J） | load 16948 | FIX-J 專測（sz 保留＋ref 全數重建） |
| 10 | 不入存檔的 state 在 `newWorld` 與 `load` 兩處成對歸零（鐵律7） | 8277-8310 / 16957-17034 | T369 gFlow284、T369.1 gWhCap284、**T384 flowStat384/gMade384、T385 cms385（字串斷言）** |
| 11 | COV/POL 蓋印嚴格成對（`covFieldOfK` 單一映射） | 9453 / 9466-9467 | 增量結果 vs `rebuildCov()` 權威值比對（test 1362, 1592） |
| 12 | CRLF==0（`.gitattributes` 宣告範圍） | `.gitattributes` ＋ verify.py 258-278 | verify.py 閘門②（test_fixde.js 零覆蓋） |
| 13 | `GAME_VER`＝`APP_VER`，快取名由 APP_VER 派生 | index 383 / sw.js 6-7；只准用 `bump.py` | test 907-912 ＋ verify.py 閘門③ |
| 14 | 瀏覽器測試只用槽 3 ＋ 自己的埠（8124-8127） | 紀律（`curSlot()` 16836 回退槽1 是成因） | **無** |
| 15 | 部署目錄只准 9 個名字，多一檔或一目錄即紅 | merge_bay preflight（`scan_deploy_residue`） | test_toolchain 四例 |
| 16 | PASS 只能升不能降 | merge_bay 兩段棘輪 | test_toolchain 各自的拒絕例 |
| 17 | rot=0 逐位元回歸；旋轉不進存檔 | 12427-12494 | test 499-560、T367b 地格 dep（test 540-602） |
| 18 | 日間逐像素一致（b>=.72 零夜間繪製） | daylight() 12059 為單一真相 | 各渲染卡的 A/B 像素回歸（人工，瀏覽器端） |
| 19 | 單一 index.html、零外部依賴、恰好一個 inline script | 專案憲章 | verify.py 語法檢查假設之 |
| 20 | 錨定替換段中間一律用 `/* */`（鐵律18） | 紀律 | **無**（已犯三次：T315、T327、T340） |

---

## 10. 有規矩但沒有機器守著的（下一張卡的線索）

按「價值／成本」排序，前五項都是低成本高價值。

1. ~~五份尺寸表沒有程式化比對~~ **已收口（T383a，2026-08-02）**：全鍵集合比對（份數 1/1/1/2＋miss/extra/wrong 逐鍵點名）。註：出卡偵查發現本條原宣稱的「缺 20 鍵」早被 T378 補齊，守衛以嚴格相等起步。**殘餘**：k9 不入表（T383a 凍結斷言）＋其色環減半視覺債（8698 `||1`）待另卡裁決入表與否。
2. ~~稅收守衛沒有窮舉檢查~~ **已收口（T383b）**：執行期窮舉——KNAME 133 鍵各合成一棟、stub 亂數/道路/電水後 tick 一次，工業稅 fallback 裝 sink 記錄器（`else{const eduIndMul=` 錨點），除 k3 外任何 k 落入即紅並點名。新增 k134 忘補鏈當場咬，不必等 lv4 NaN。
3. ~~per-cell 字串守衛~~ **已收口（T390）**：編碼修+DP 救援+雙守衛（29 條長度===N²、save→load→save 位元組恆等）。原文記錄： `tre` 在 tree===10 時寫兩字元，實測一次存讀後 1365 格樹種錯位。守衛可以是：save 後斷言 29 條字串長度全等於 N²，或存讀往返後逐格比對。同時要修 `tre` 本身（改寫 `String.fromCharCode(48+…)` 或把樹種壓回 0-9）。
4. ~~亂數流守衛凍結在 backups 快照上~~ **已收口（T383c）**：live `buildSprites`（錨點 `function buildSprites(){` ↔ `\nfunction wealthSpr(`）剝註解（六態狀態機＋行數 canary）後對 R/ri/rand呼叫/rand裸引用/spriteTexRand 五類 token 做總數＋行序 CRC 快照（基線 118 / 0x103ef29c，master 87bb1e7 實測）。中段插入/刪除/換序消耗當場紅；純註解編輯免疫（T359「註解不得含 rand(」紀律對本守衛不再必要，但區塊 regex 各卡守衛仍在，紀律照舊）。合法改動＝施工卡同卡更新兩常數並記 delta（PASS 棘輪同款慣例）。T272/T274 快照對快照守衛原樣保留。
5. **槽 3 紀律完全沒有機器守。** RULES 鐵律3、COLLAB、VERIFY 都寫了，但沒有任何東西檢查一份 probe 腳本裡有沒有 `setItem('glimmerville.v1.slot','3')`。T370 的目錄掃描只擋「probe 躺在玩家目錄裡」，擋不住有人在 8123 貼 Console 腳本（T371 剛修掉的 docs/VERIFY.md 就是這型事故）。
6. **sprite 像素在 Node 套件裡根本測不到。** 素材守衛只到「家族計數 ≥ 基線」與中繼資料。真正的像素指紋（CRC32）在 `atlas.html`，但**倉庫裡沒有提交任何指紋基線檔**，也不在任何自動閘門裡。亂數流位移造成的全圖重繪，機器測不出來。
7. **rot≠0 的十個漏轉點沒有任何守衛**（見 §4 表）。可做的是「rot=1 與 rot=0 的畫面在旋轉後應可疊合」的結構性斷言，或至少對「裸等距式 `(x-y)*32`」做全檔靜態掃描並列白名單。
8. **`__no*` 開關 76 個，只有 3 個真的被用來做 A/B**（`__noLife`／`__noWteFx`／`__noRefineryFx`）。其餘只被 `html.includes` 斷言「存在」。開關存在但沒人用它做證明。
9. **工具列顯示價 vs `placeCost` 實扣沒有一致性斷言**（`oneway`／`light` 兩處是字面值硬編碼）。
10. **鐵律17（SPR 撞名）與鐵律6（`hw` 必為偶數）都沒有機器守。** 實測 `SPR` 有 110 個頂層鍵，4 個被賦值兩次（police/hospital/clinic/waterTower，全是 T151/T162 刻意的「後寫後贏」），但沒有任何測試能區分刻意覆蓋與撞名事故。
11. **「絕對尾端」的守衛證明不了尾端。** 各卡寫法是 `html.slice(indexOf('T3xx'), indexOf('R=__savedR'))`——只證明在 buildSprites 內、在流還原之前。事實上 T364b 之後又插了 T364c/d 與 T368。
12. **tail parity 是手抄，沒有結構性守衛。** T261/T291/T345 跑在 7659-7774，之後新增的 `SPR.bld` 鍵必須自己重寫三層（`parity364` 7923、`parity364cd` 8019）。「亂數紀律要求放最尾端」與「視覺紀律要求經過後處理」在結構上互相衝突，目前純靠複製貼上。
13. **CRLF 仍有 14 檔漏網**：`atlas.html`、`npu_bench.html`、`icon.svg`、`docs/HANDOFF-GPT.txt`、`generate_pwa_icons.py`、`t310_final.py`、`test_t31.js`…`test_t38.js`。目前全為 0（無現行漂移），但 T371「擴到 .gitattributes 宣告範圍的全部」是略微高估的說法。`atlas.html` 尤其值得補——它是還在改的活工具。
14. **種子哨兵剛好卡在門檻上**（`MIN_SEED_PINS=2`，目前恰好 2 條），零餘裕；而且哨兵是正則數的，把 `=== 4153` 改寫成 `=== POP_EXPECTED` 就合法地繞過了。
15. **`#bMetro` 的重複監聽（§7）測試零覆蓋。**
16. **T356 的 `skipped≤60` 是「正規化漏了新形狀」的偵測器**，不是效能指標——加了新 SPR 資料形狀卻沒在 `sprAtlas356` 的 `walk()` 補分支，症狀是 skipped 暴增而非某條斷言直接紅。

---

## 11. 常識校正與維護責任

**幾個容易測錯的常識：**
- 一年 **360 天**（春 1／夏 101／秋 201／冬 301-360）。`GV.setDay(370)` **不是冬季**，已經繞回春天（T353 驗收時就這樣測錯過一輪）。
- `GV.tile(x,y)` 回傳 **JSON 深拷貝**，直接改 `.bld.lv` 不持久；要真改必須走 `GV.place`／`GV.upgrade`（T239 血淚）。
- 驗建築效果前建築必須完工：`GV.place` 剛放的 age=0，要走 9 天分階段施工，且升起期的窗燈／霓虹／雪帽／濕膜被 `constrRise` 閘停用。**A/B diff 全 0 常常是「建築沒長好」而不是「效果壞了」。**
- 「合成素材測過 ≠ 真的對」：T183 用實心方塊測 snowCap 通過，真建築零像素差（雪落在透明天空區）。
- 「庫存為 0 ≠ 鏈斷」：T284 是供不應求、日產日銷，加了流量快照才實證鏈是通的。
- `merge_bay.py` 會跑兩次完整套件（數分鐘），超過工具的 2 分鐘逾時；被砍掉時合併可能已完成第 4 步而 5-7 步沒跑，重跑會誤報「nothing to merge」。一開始就丟背景執行。

---

**行號會隨改動漂移。本文件所有定位以 grep 錨點字串為準；行號只是加速跳轉的參考，發現對不上請以錨點重新定位並在該次卡片內順手校正。**

**本文件的維護責任綁在「改動架構的那張卡」上**：凡是新增／移除子系統、改動任一條 §9 不變量、新增手抄副本（尺寸表／case 清單／parity 區塊）、或關掉 §10 任何一條缺口的卡片，都必須在同一張卡內更新本文件對應段落，並在 CHANGELOG 的驗收欄註明「ARCH.md 已同步」。不更新 ARCH.md 的架構改動，等同把下一個人推回本次測繪的起點。
