# T422 — 遠景夜城 LOD 與天際線辨識

- **發卡**：Codex（業主於 2026-08-08 明示指定 Codex 出卡；卡號／順序為 T422，接 T421）
- **施工**：Codex（`bay/codex`，驗證埠 8126）
- **覆核＋合併**：非 Codex 方；Codex 不自合、不 publish
- **線別**：桌面線
- **狀態**：ISSUED；卡面先行，產品碼尚未施工

## Claim

- 發卡依據：業主明示「T422 你出卡，你施工，你做完」，並要求嚴格遵守施工紀律。
- 發卡 commit：本卡首個提交（施工前以實際 OID 回填）。
- 施工者：Codex。
- 車位／埠：`bay/codex`／8126；瀏覽器只用 `127.0.0.1:8126` 與槽 3。
- base OID：`ac4055523c3594a979d3dc731eadbeae9df93868`。
- 進場三連：branch=`bay/codex`；HEAD=`ac40555`；`GAME_VER=11.47`。
- 基線：`python tools/verify.py` → PASS=4324／FAIL=0／exit 0／ALL GREEN／CRLF=0。
- 預計觸碰：本卡、`index.html` 遠景 mini 建築夜燈、`test_fixde.js` T422 守衛、
  `docs/CHANGELOG.md`；非作者放行後的 release tail 才准觸碰 `sw.js`／`docs/ARCH.md` 版本帳。
- 鎖序：開工時 `bay/codex` 與 master 0/0；未見另一張會碰 `index.html` 的已授權桌面卡。
- 版本：施工期不預先 bump；若無插隊，release tail 預期 v11.48，實際以覆核時 master 為準。
- 交付：`STOP: AWAIT_REVIEW`；Codex 不自合、不 publish。

## 一、玩家問題與實碼定樁

T413a 已把「遠眺夜城」列為另卡：現行 `nightDepth` 依賴 `fxOn`，而 `fxOn` 在
`lodMini`（`z<0.5`）必為 false，所以 T413b 的五個近／中景 overlay 在遠景全部短路。

但遠景不是完全沒燈。`draw()` 的 T107 `if(lodMini)` 分支已經：

1. 把每個可見建築 root 退化為 2–4 px `MINI_BLD_PAL` 色塊；
2. 對發電廠或已供電建築向既有 `nightSprites` **推一筆同尺寸、同暖白色矩形**；
3. 最終由既有 `b<.72 || stormA>0` 的 `screen` 合成器繪製。

因此真正缺口是：**全城遠景夜燈都是同一塊暖白，會覆住 mini 建築底色，住宅／商業／
工業／地標在縮遠後失去辨識。** 本卡只修這一筆，不另造夜景管線。

## 二、設計裁決（有約束力）

### D1 — 原位升級，不接 T413 註冊器

只改 T107 `lodMini` 分支既有的一筆 `nightSprites.push`。不得修改
`drawNightCity413`／`drawNightCityTop413`、`NIGHT413`／`NIGHT413T` 或其精確呼叫點。

理由：T413 dispatcher 在遠景的 `nightDepth` 本來就是 0，硬接會改既有守衛、層序與效能邊界；
原位替換天然沿用現成可見物件、旋轉、深度排序、暴雨亮窗與 screen 合成。

### D2 — 一棟仍只准一筆 rect

遠景每個已供電可見 root 仍恰好 push 一筆矩形，不新增第二筆光暈、線條或粒子：

- 住宅 `R`：暖黃、小於底色塊，保留住宅輪廓；
- 商業 `C`：青／粉／金三色的決定性短招牌；
- 工業與公用 `I/E/W`：冷藍工作燈；
- 其餘公共／交通／地標：偏白金的中心亮點。

矩形寬高受既有 `blkSz` 限制，最小 1 px；不得超出原 mini 色塊。

### D3 — 密度由既有畫面自然形成，不重建 `nightTier413`

城市越密，本來就有越多可見 root；建築等級／多格尺寸已反映於 `blkSz`。本卡不為取色呼叫
`ensureNightTier413()`，也不新增 N²／viewport 迴圈。

否決「強制讀 nightTier」：首次重建會對每格呼叫 7×7 的 `urbanDens406`，在 216 圖上新增
每日約 49×N² 鄰域讀；只為 2–4 px 色塊不划算。

### D4 — 四個狀態邊界

- 晴日：T422 on/off 逐像素恆等。
- `z>=0.5`：T422 on/off 逐像素恆等；近景 T413b 完全不動。
- 白天暴雨：維持既有 generic 暖白 mini rect，不套 T422 類型色，避免改 T212 stormLit 語義。
- `window.__noFarNight422=true`：走改動前原文 generic rect，作逐像素 A/B 回退。

## 三、定位錨

### A. 類型真相源

```js
const kcatOf=(k)=>KCB[k]||'S';
```

### B. 唯一產品掛點

```js
if(lodMini){ // T107：z<0.5 建築本體退化 2~4px 色塊＋夜窗簡化單色亮塊
```

及其中既有：

```js
if(bd.k===5||bd.pw)nightSprites.push({rect:[blkX,blkY,blkSz,blkSz]});
```

### C. 既有消費器（只讀，不改）

```js
for(const nsp of nightSprites){
```

## 四、允許觸碰

1. `docs/tasks/T422-遠景夜城LOD.md`：claim、施工帳、驗收與覆核結果。
2. `index.html`：
   - 在 T413/T107 附近新增一個純函式，僅計算單筆遠景燈 rect 的位置／尺寸／顏色；
   - T107 `lodMini` 分支中原本的一筆 generic push，改為「T422 夜間類型化／其他狀態原樣回退」；
   - 測試觀測所需的純計數欄位；不得加入正式 `window.GV` 新 API。
3. `test_fixde.js`：測試專用 bridge、T422 靜態／行為／破壞性守衛。
4. `docs/CHANGELOG.md`：慣例區後最新位置一卡一行；作者交回狀態必須阻擋自合。
5. 非作者初審通過後的 release tail：`tools/bump.py` 所需 `index.html`／`sw.js` 版本字、
   `docs/ARCH.md` 現況行、CHANGELOG 與本卡收束帳。

## 五、禁區與硬不變量

- 不碰 tick、經濟、AI、存檔、`data.v`、建築資料、建造／升級公式。
- 不碰 T413 五繪製器、註冊陣列、呼叫點、`nightCity` 烘焙或近景 sprite。
- 新增區塊零 `R()`／`ri()`／`vri()`／`Math.random()`／`Date.now()`／`performance.now()`／`crypto`。
- 不新增任何 tile／viewport／N² 迴圈；不得重掃 `objs`。
- 每個符合既有條件的 mini 建築仍只 push 一筆 rect；不得增加 canvas draw 數。
- 不改 `MINI_BLD_PAL`、`KCB`、`kcatOf`、`nightSprites` 消費器與 T212 stormLit。
- `z>=0.5`、晴日、白天暴雨、`__noFarNight422` 回退四條逐像素邊界必須各有驗收。
- 不新增素材鍵、外部檔案、依賴或 DOM；不碰玩家 8123 與 s1/s2。

## 六、驗收矩陣

### A. 機械閘門

- `python tools/verify.py`：exit 0、0 FAIL、ALL GREEN、PASS ≥4324 且只增不減、CRLF=0。
- `python -B -m unittest tools.test_toolchain` 全綠。
- GAME_VER／APP_VER 施工期維持 11.47；release tail 才同步下一版。
- 兩條種子釘 4153／4550 原樣。

### B. Node 行為守衛

1. 純函式：住宅／商業／工業／地標四類輸出色與幾何可區分；同座標重算逐值相同。
2. 幾何：每一類 rect 都包含於 `[blkX,blkY,blkSz,blkSz]`，寬高皆 ≥1。
3. 接線：完整 `GV.forceDraw()`；`z=.35` 深夜時 T422 命中 >0，`z=.5`、晴日正午、
   `__noFarNight422=true` 時 T422 命中皆 0。
4. 回退：開關關閉時 legacy generic push 仍命中，不能把遠景夜窗整段刪掉。
5. 複雜度：受管切片恰一個 `nightSprites.push`，純函式無迴圈；每幀 T422 命中數不超過
   既有可見 mini 建築候選數。
6. 完整 forceDraw 包住 R 與 Math.random 計數，本卡路徑兩者皆 0。

### C. 真瀏覽器（8126、槽 3）

目標流程：載入遊戲 → 槽 3 建固定城市 → 鎖 speed=0／weather=0 → 縮放 z=.35 →
鎖深夜 → 類型化遠景燈可見。

- 960×600 與 390×844 各一輪；Console 無相關 error／warn。
- 深夜 z=.35：on/off canvas CRC 不同；on 連續兩次同相位 CRC 相同。
- 晴日 z=.35：on/off CRC 相同。
- 深夜 z=.5 與 z=1：on/off CRC 相同。
- 四旋轉各至少一張深夜 z=.35 檢查；燈點跟建築走、無漂移／裁切／閃爍。
- 人眼：不看 before，也能指出住宅暖、商業彩、工業冷、地標亮四種語言；若看不出，視為不合格。
- FPS 前景 3 秒量測 ≥55；同場景 on/off 不得出現可重現的明顯回退。

### D. 破壞性四案（必須逐案 exit 非 0，並記首個紅點）

1. 把 `lodMini` 接線門檻改成 `<.25`：z=.35 行為守衛紅。
2. 四族強制同色／同幾何：類型可區分守衛紅。
3. 在受管分支重複 push：恰一筆／候選上限守衛紅。
4. 在純函式插入 `R()` 或 `Math.random()`：零亂數守衛紅。

判紅同時看 exit code、FAIL 行與 stderr；不得只 grep `FAIL:`。

## 七、停止／回滾

立即停止並回報 `BLOCKED`：

- 必須修改 T413 dispatcher、近景夜燈或 `nightSprites` 消費器才能成立；
- 需要新增第二次地圖／viewport 掃描；
- 晴日或 z>=.5 出現像素差；
- 任何種子釘、PASS、版本或存檔契約下降；
- 玩家 s1/s2 被讀寫。

回滾：T422 是一個 helper＋T107 單一 push 替換；退回本卡產品 commit 即恢復原 generic rect，
不涉及資料遷移。任何未通過的類型可單獨改回 generic，不得為保留工作量放寬守衛。

## 八、交付規則

作者完成後：

- 卡面狀態改 `STOP: AWAIT_REVIEW`；
- CHANGELOG 寫 `驗收:BLOCKED（非作者簽核未落地；作者僅完成自測，禁止合併）`；
- 分支 clean、全部成果 commit，回報 tip／PASS／exit／CRLF／版本／瀏覽器證據；
- Codex 不執行 `merge_bay.py codex`、不執行 `--publish`、不碰玩家部署。

非作者覆核通過後，才可完成 release tail 並從 canonical master 執行
`python tools/merge_bay.py codex --deploy`。
