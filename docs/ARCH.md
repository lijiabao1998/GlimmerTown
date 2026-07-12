# 架構聖經（ARCH）— 《微光小鎮 Glimmerville》代碼地圖

單檔遊戲：`index.html`（約 1650 行）。等距像素城市建造模擬，全部美術程式化生成。
**讀完本文件你應該能回答：任何一個功能在第幾節、動它要遵守什麼不變量。**

## 1. 檔案分節地圖

HTML 部分：`<style>`（全部 CSS）→ `<body>`（canvas#game、#hud、#hint、#tools、#toasts、#dragcost、#zoomer、#info、#start 開始畫面）→ 一個大 IIFE `<script>`。

Script 內以註解分節（搜尋 `=====` 可跳轉）：

| 節 | 名稱 | 內容 / 關鍵符號 |
|----|------|----------------|
| 0 | 小工具 | `$` `clamp` `lerp` `mulberry32`(種子隨機) `R`/`ri` `makeNoise`(值噪聲) |
| 1 | 常數與狀態 | `TW=64 TH=32 N=72` `SAVEKEY` `DAYLEN=0.9` `CYCLE=110` `KNAME LVNAME POPS JOBSC JOBSI PLANT_CAP=50 COST TOOLS`；全域狀態 `money day speed pop jobs cityHappy dem msIdx tool muted visT simAcc cam`；`resize()` `T(i)` `idx(x,y)` `inMap` |
| 2 | 程式化像素美術 | helper：`cv dia speck diaEdge isoBox windows outlineSprite shade plate`；`SPR` 註冊表；`buildSprites()`（全部 sprite）；`drawLogo()` |
| 3 | 世界生成 | `genWorld(seed)` `computeFoam()` `newWorld()` |
| 4 | 建造邏輯 | `recalcMask` `recalcAllMasks` `roadCostAt` `canPlace` `placeCost` `doPlace` |
| 5 | 模擬 | `hasRoadNear` `computePower`(道路BFS) `countNear` `tick()`(一天) |
| 6 | 小車與煙 | `cars smokes roadDirs DIRV updCars updSmoke` |
| 7 | 繪製 | `stars waterF DIRSCR daylight() draw(dt) drawCursor` |
| 8 | 輸入 | `hover pt rect pointers toTile isRectTool paintTo undoPlace` pointer 事件、`zoomStep clampCam commitRect inspect`；全域 `firstPaint dozeArm longPressT undoStack undoGroup openUndo closeUndo`（v1.2） |
| 9 | 音效 | `AC initAudio tone sTick sBuild sErr sPop sFanfare` ＋ `sndMode` 三段開關與環境音排程器（T05） |
| 10 | UI | `buildToolbar toast updHud showHint checkHints` 鍵盤快捷鍵；`drawMini`（T06 小地圖）、`showStats`（T04）、`showHelp`（T09）、`showSlots/匯出入`（T07）、`undo()`（T10） |
| 11 | 存檔 | `save() load()` 槽位化（T07）：鍵 `SAVEKEY+'.s1/.s2/.s3'`、目前槽 `'.slot'`、舊裸鍵自動遷移；自動存檔 25s + visibilitychange |
| 12 | 主迴圈 | `advance(dt)` `frame(ts)`(rAF) + setInterval(250ms) 後備迴圈 |
| 13 | 啟動 | `buildSprites buildToolbar resize drawLogo begin()`；`window.GV` 除錯 API |

## 2. 資料模型

`tiles`＝長度 N*N 的一維陣列，`idx(x,y)=y*N+x`。每格：

```js
{
  t: 0|1|2,        // 地形 0水 1沙 2草
  tree: 0..4,      // 0無樹；1..4 = 樹變體索引+1
  gv: 0..3,        // 草地外觀變體
  road: 0|1, bridge: 0|1,   // bridge 隱含 road=1 且 t===0
  mask: 0..15,     // 道路連接位罩（見§4 位向約定）
  zone: 0|1|2|3,   // 分區 0無 1住宅 2商業 3工業
  deco: 0..3,      // 裝飾 0無 1岩石 2蘆葦 3野花叢（T02；建造時自動清除）
  bld: null | { k, lv, v, age, pw, h },
  rp: false,       // 本格道路是否通電（computePower 每天重算）
  wm: 0..15        // 水岸泡沫位罩（computeFoam 算）
}
```

`bld.k`：1住宅 2商業 3工業 4公園 5發電廠（v1.3 起：6消防局 7學校）。`lv` 1..3（k≥4 恆1）。`v` 外觀變體：k≤3 為 0..3（T01），公園/電廠 0..2。
`age` 天數（升級計時）。`pw` 是否供電（k=4/5 恆 true）。`h` 幸福度（僅住宅有意義）。

人口/就業查表：`POPS=[0,8,22,54]`（住宅各級人口）`JOBSC=[0,5,14,38]` `JOBSI=[0,7,20,48]`。

## 3. 遊戲數值（動平衡前先看這）

- 起始資金 3000。`COST={road:15,bridge:60,zone:8,park:60,plant:550,doze:2}`；放置時格上有樹自動加收 doze 費。
- 稅收（每天、僅通電）：住宅 `pop*0.12`、商業 `jobs*0.18`、工業 `jobs*0.15`。
- 維護費（每天）：道路 0.02/格、公園 0.5、電廠 4。
- 需求（每天重算，`workers=pop*0.6`）：
  `dem[1]=clamp((jobs*1.2+25-workers)/70,-1,1)`
  `dem[2]=clamp((workers*.45-jobsC)/50,-1,1)`
  `dem[3]=clamp((workers*.55-jobsI)/55,-1,1)`
- 生長：每天收集「有分區、無建築、2 格內有通電道路」的候選格，洗牌後最多生成 3 棟，機率 `p=.10+.5*max(0,dem)`（住宅另乘幸福係數）。
- 升級：`lv<3 && pw && age>14 && dem>.15 &&（住宅另要 h>.45）&& 機率.035/天`。
- 幸福：基礎 .62 ＋公園(4格內) −工業(3格內)*.09 −電廠(4格內)*.18 −無電.3，夾在 .05~1。
- 電力：`computePower()` 從每座電廠四鄰道路做 BFS（上限 90 步）標記 `rp`；建築需「2 格內有 rp 道路」且全城供電數 ≤ 電廠數*50。
- 里程碑 `MILES`：人口 [50,150,400,900,1600,2600] → 獎金。破產保底：資金<20 且入不敷出且距上次>60天 → 送 250。

## 4. 座標系統（動渲染必讀）

- **美術像素（art px）**：sprite 內部座標。一格菱形 64 寬 × 32 高，斜率固定 2:1（橫 2px = 縱 1px）。
- **世界座標（world px）**：tile(x,y) 的菱形**頂點**在 `wx=(x-y)*32`，`wy=(x+y)*16`；底頂點在 `(wx, wy+32)`。
- **螢幕變換**：`z=cam.z`（裝置像素整數倍率 1..4），`ox=round(W/2-cam.x*z)`；
  tile 左上角螢幕座標 `sx=ox+((x-y)*32-32)*z`，`sy=oy+((x+y)*16)*z`。
- **反變換**（滑鼠→格子）`toTile()`：`fx=(wx/32+wy/16)/2`，`fy=(wy/16-wx/32)/2`。
- **錨點約定**：每個物件 sprite 記錄 `{ax,ay,w,h}`，(ax,ay) 對應**該格底頂點**。
  繪製：`drawImage(img, sx+(32-ax)*z, sy+(32-ay)*z, w*z, h*z)`。
- **位向約定**（road mask / diaEdge edges / foam wm 共用）：
  bit1=鄰(x,y-1)=畫面右上邊；bit2=(x+1,y)=右下；bit4=(x,y+1)=左下；bit8=(x-1,y)=左上。

## 5. 美術管線（新增 sprite 照抄這套流程）

helper（第 2 節開頭）：
- `cv(w,h)` 建離屏 canvas，回 `[canvas, ctx]`。
- `dia(g,cx,ty,hw,col)` 實心菱形：中心 cx、頂點 y=ty、半寬 hw（**必須偶數**）、高=hw。
- `diaEdge(g,edges,col,cx=32,ty=0,hw=32)` 菱形描邊（edges 用 §4 位罩）。
- `speck(...)` 菱形內隨機點綴；`isoBox(g,cx,by,hw,h,cL,cR,cTop)` 等距方塊（含 AO/簷口），回傳屋頂頂點 y；
- `windows(g,ng,cx,by,hw,h,rand,litP,opts)` 牆面窗（同步把亮窗畫進夜間圖層 ng）；
- `outlineSprite(c,r,g,b)` 給整張透明 canvas 的實體描 1px 輪廓；`plate(g,ax,ay,col)` 建築地基板。

慣例：
- 建築畫布 72×112、錨點 ax=36 ay=110；電廠 88×120/44/118；公園 64×56/32/53；樹 40×48/20/45；地形與道路 64×32；橋 64×44（橋面在畫布 y=4，繪製時 `sy-4*z`）；懸崖 64×56。
- **結構體先畫在獨立 canvas `sc`，`outlineSprite` 描邊後再貼回主畫布**（地基不描邊）。
- **夜間圖層**：亮的東西（窗、招牌、警示燈）同步畫在 `nc`（夜 canvas），存進 `SPR.xxx.night`；繪製階段收集進 `nightSprites`，天黑時以 `screen` 混合疊加。
- 煙囪冒煙點存 `smoke:[{dx,dy}]`（相對錨點）；電廠閃燈 `lamp:{dx,dy}`。
- 註冊：`SPR.bld['k_lv_v']`、`SPR.tree[]`、`SPR.park[]`、`SPR.plant`、`SPR.road[16]`、`SPR.bridge[16]`、`SPR.foam[16]`、`SPR.zone{}`、`SPR.car[]`（8色×A/B朝向）。

## 6. 繪製順序（draw()，每幀）

天空漸層 → 星星(夜) → **地面層**（全圖掃描＋可視裁切：懸崖→地形→泡沫→道路/橋→分區覆蓋）→ **物件層**（樹/建築/車/煙 依 `dep=x+y` 排序）→ 晝夜 multiply 色調 → 黃昏橙色 → 夜燈 screen 疊加 → 游標/框選。
`daylight()` 由 `visT` 算出亮度 b（0.34~1）與黃昏量。水面 3 幀每 0.5s 輪換。

## 7. 主迴圈與時間

- `advance(dtReal)`：`visT+=min(dt,2)`；`simAcc+=dt*speed`；每滿 `DAYLEN=0.9s` 跑一次 `tick()`（一天），單次最多補 8 天；再更新車/煙（動畫 dt 上限 .05）。
- `frame()` rAF 正常驅動；**setInterval(250ms) 後備**：偵測 rAF 停擺（分頁隱藏）超過 400ms 時接手模擬＋低頻補畫。改主迴圈前先理解這個雙軌設計。
- `speed`：0 暫停 / 1 / 3（HUD 按鈕循環）。

## 8. 輸入模型

- 工具 `TOOLS`：pan(檢視/平移)、road、zr/zc/zi(分區)、park、plant、doze。
- **rect 工具**（zr/zc/zi/park/doze）：按下拉框、放開結算（`commitRect` 先總價後施工）；
  **paint 工具**（road）：拖曳連續鋪設，`paintTo` 做 L 型補間防斷路；plant 單點。
- pan 工具：單指/左鍵拖曳平移；點擊（未移動）＝ `inspect()` 檢視面板。
- 任意工具：中/右鍵拖曳平移、滾輪縮放；**雙指**＝pinch 縮放＋平移（進入雙指即取消畫線/框選）。
- 鍵盤：1-8 切工具、空白鍵暫停、Esc 回檢視。

## 9. 存檔（v1）

槽位鍵 `glimmerville.v1.s1/.s2/.s3`（目前槽記在 `.slot`；舊裸鍵啟動時自動遷入 s1），JSON：
`{v:1, seed, money, day, msIdx, cam:{x,y,z}, ter, tre, rd, zn, dc, bl, ach, nm}`
其中 ter/tre/rd/zn/dc 是長 N*N 的數字字串（rd：0無 1路 2橋；dc＝deco）；`bl=[[i,k,lv,v,age],...]`；
`ach`＝已解鎖成就 id 陣列；`nm`＝鎮名。dc/ach/nm 均為可選欄位（舊檔容錯）。
讀檔後重算 mask/foam；`pop/jobs/pw/h` 由下一次 tick 重算，不存。
**變更規則見 RULES 第 9 條。** 音效設定另存 `.snd`（0/1/2，舊 `.mute` 自動遷移）。

## 10. GV 除錯 API（驗收全靠它）

```js
GV.center()            // 螢幕中心的 [x,y] 格座標
GV.place(tool,x,y)     // 靜默放置，回傳是否成功（tool: 'road'|'zr'|'zc'|'zi'|'park'|'plant'|'doze'）
GV.tile(x,y)           // 某格資料快照
GV.setSpeed(3)         // 設模擬速度
GV.stats()             // {money,pop,jobs,day,buildings,poweredBld,roads,zones,happy,dem,cars}
```

## 11. 不變量清單（改壞任何一條＝驗收失敗）

1. `dia/diaEdge` 的 hw 恆為偶數；sprite 不得畫出畫布邊界。
2. 動 road 後 recalcMask 自己＋四鄰；動地形後 computeFoam。
3. `bld.k===4|5` 的 `pw` 恆 true；只有 k≤3 參與電力配額與稅收。
4. 夜燈只畫在 night canvas；日間主圖不含發光元素。
5. 讀檔絕不拋錯：任何異常 → 回傳 false → 自動開新圖。
6. 單檔、零依賴、繁中 UI；`window.GV` 永遠存在。
7. 模擬邏輯只在 `tick()`；渲染不得改遊戲狀態（`waterF/waterT` 除外）。
8. 主迴圈雙軌（rAF＋interval 後備）不可退化成單軌。
9. 建造/拆除的**唯一**資料變更點是 `doPlace()`——撤銷系統的快照掛鉤在那裡，繞過它改 tile＝撤銷壞掉。
10. 新增建築種類 k 時必須同步：KNAME、COST、TOOLS、keydown 快捷鍵表、canPlace/placeCost/doPlace、
    SPR.bld['k_1_v']、inspect()、小地圖色表（drawMini 內陣列）、統計面板計數。
