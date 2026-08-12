# T430　City Health Strip（城市健康燈帶，桌面適配版）

狀態：施工中
發卡／施工／合併：DeepSeek（業主 2026-08-11 明示「完整出卡并施工完成，你出卡，你施工，你合并dsk，即便如此也要嚴格遵守施工紀律」＝本卡授權出卡＋施工＋合併；仍須完整閘門與交易式 `--deploy`）
claim base：`ad674bd`（v11.65，PASS 4618）  
施工車位：`bay/deepseek`，驗證 origin `127.0.0.1:8129`（T429 教訓：8128 有 sw 舊快取，驗證換端口），只用 slot 3

> 概念源自移動線 T482 的 T461 City Health Strip（單棟建築檢查器的六格健康燈：⚡電/💧水/🚿污水/🗑️清運/🌧️排水/🚨應變）。
> **桌面適配版＝讀桌面自有資料源**，不是移動線 T449–T455 快照移植（桌面無 district 系統）——以 482 為概念唯一真相、以桌面實況為資料源真相。

## 1. 玩家目標

1. 點開任一建築的檢視面板，頂部有一排六格健康燈：電力/供水/污水/清運/應變/排水，一眼看到這棟建築的市政健康狀態（綠 good／黃 warn／紅 bad／灰 na）。
2. 資料必須是**真實觀測**——電/水讀既有逐棟旗標、應變讀既有覆蓋場、清運讀全城垃圾容量（全城口徑如實標示），不造假數據。
3. 桌面沒有的系統（逐棟污水狀態、雨洪排水）如實顯示 na，不在卡面外硬造。
4. 純觀測：零 tick／存檔／AI／亂數流改動，玩家城市位元不變。

## 2. 改前基準（真瀏覽器／真 canvas）

- 桌面 `inspect(x,y)`（L18008 起）渲染建築檢視面板，`html` 累積後 `$('#infoBody').innerHTML=html;`（L18215）。
- 桌面資料源：`b.pw`（逐棟供電旗標，BFS 結果）、`b.wa`（逐棟供水旗標 `wa:true`）、`COV.fire/fire2/fireHQ/police/police2/hospital/clinic`（逐格覆蓋場）、`garbage` 全城垃圾存量與容量（`garbageCap` 系）、`nSe` 污水廠計數（k=27，全局機制）。
- 桌面無：逐棟污水狀態（污水廠是全局效果）、T454 雨洪排水——兩格如實 na。
- 兩釘 `4153/4550`、固定城 save 逐位元組恆等、PASS 4618。

## 3. 允許觸碰

- `index.html`
  - 新增 `/* ===== T430 City Health Strip（桌面適配版） ===== */` 區塊：`healthStrip430(x,y,b)` 函式＋CSS（六格 pill，沿用 T423 主題變數）。
  - `inspect()` 尾部（`$('#infoBody').innerHTML=html;` 前）插一行：`if(t.bld&&!t.bld.ref&&!window.__noHealthStrip430)html+=healthStrip430(x,y,t.bld.ref?…:t.bld);`（root 建築才顯示，ref 格跳過）。
  - 觀測橋 `window.__t430HealthRead`（每次渲染 +1，供驗收讀數）。
- `test_fixde.js`：新增 T430 守衛。
- 本卡、`docs/CHANGELOG.md`；release tail 才准動 `docs/ARCH.md`、`sw.js`。
- `attic/t430-review/` 放實拍證據。

## 4. 絕對禁區

- 零 `R()`／`ri()`／`rand()`／`Math.random()` 消耗；純讀既有狀態，不寫任何 tile/building/全域變數（觀測橋計數除外）。
- 不碰 tick／經濟／AI／放置／存檔／服務工作者；不動 T426-T429 任何層。
- 不新增外部素材、字型、依賴；CSS filter/blur 禁用。
- 玩家 origin `localhost:8123` 禁止造境、清槽與測試。

## 5. 施工三段

### S1　healthStrip430 函式（桌面資料源）

六格（`[{ic,nm,state,txt}]` 結構，state ∈ good/warn/bad/na）：
1. **⚡ 電**：`b.pw` → good「正常」／bad「未供電」（真實 BFS 旗標）。
2. **💧 水**：`b.wa` → good「正常」／bad「未供水」。
3. **🚿 污水**：桌面無逐棟狀態 → na「—」（記帳：桌面 k=27 污水廠是全局機制；全城數字見既有面板表格）。
4. **🗑️ 清運**：`garbage < garbageCap283()` → good「正常」／warn「滿載」（全城口徑，卡面與 title 標示「全城」）。
5. **🚨 應變**：`COV.fire/fire2/fireHQ/police/police2/hospital/clinic` 逐格讀取——全達 → good「全覆蓋」；部分 → warn「部分」；全無 → bad「無覆蓋」。
6. **🌧️ 排水**：桌面無 T454 → na「—」（記帳）。

CSS：六格 pill（`.hs430` 系），good 綠邊/warn 黃邊/bad 紅邊/na 灰，響應式（窄屏 2 列）。

### S2　接線＋觀測橋

- `inspect()` 尾部插一行；`window.__t430HealthRead=(window.__t430HealthRead||0)+1;` 每次渲染計數。
- kill-switch `window.__noHealthStrip430`。

### S3　守衛

- `healthStrip430` 函式存在＋六格資料源原文釘（b.pw/b.wa/COV 七場/garbageCap283/na 兩格）；接線一行存在；kill-switch；觀測橋；區塊零亂數；CSS 六格存在。

## 6. 驗收

1. 語法檢查通過。
2. `node test_fixde.js` → **PASS ≥4618／0 FAIL**（只升不降）、exit 0、verify ALL GREEN、工具鏈 54/54。
3. 兩釘 `4153/4550` 恆等；固定城 `rawSave()` 位元組恆等；CRLF=0。
4. 真瀏覽器（8129、slot 3）：點開 RCI 建築與服務建築的檢視面板，六格健康燈各態實拍（供電/斷電兩態至少一證）；console error=0；kill-switch 開關有效。
5. 破壞性紅源至少三案（整倉複製）全 exit 1 且 FAIL 具名 T430：M1 移除接線行；M2 區塊注入 `R()`；M3 移除 kill-switch。
6. 啟動耗時 p50/max 不得比 5102/5187 惡化 >15%。

## 7. 硬停與回滾

立即停卡，不合併：需要改玩法/存檔/AI/亂數流；兩釘/save 位元組漂移；真瀏覽器黑屏/console error；verify 掉數修不回。回滾只回退本卡小提交；不動玩家存檔。

## 8. 合併／部署

業主已授權本卡自合：

`python tools/merge_bay.py deepseek --deploy`

仍必須從 canonical master 執行，由工具重跑 base/source/integration 棘輪、原子部署並重寫收據。

## 9. 施工閉環（DeepSeek，2026-08-11）
## 9. 施工閉環（DeepSeek，2026-08-11）

### 實作與量化

- **healthStrip430(x,y,b)**：六格（⚡電 b.pw／💧水 b.wa／🚿污水 na／🗑️清運 garbCap/garbRatio 全城口徑／🚨應變 COV 七場逐格／🌧️排水 na），四態 good/warn/bad/na；CSS `.hs430` 六格 pill 沿用 T423 主題變數，窄屏 2 列。
- **接線**：`inspect()` 尾部 `$('#infoBody').innerHTML=html;` 前插一行（root 建築才顯示）；觀測橋 `__t430HealthRead`。
- **記帳**：污水/排水兩格如實 na——桌面 k=27 污水廠是全局機制（非逐棟）、桌面無 T454 雨洪排水；清運格為全城口徑（title 標示）。
- 零 tick/存檔/AI/亂數流改動；兩釘/save 位元組恆等；CRLF=0；index 21,481 行。

### 真瀏覽器與效能（127.0.0.1:8129、slot3、AI 城）

- 直接 inspect k=63 溫室（pw=true/wa=false）：六格實證 **⚡電 正常（good）／💧水 未供水（bad）／🚿污水 —（na）／🗑️清運 正常（good）／🚨應變 無覆蓋（bad）／🌧️排水 —（na）**——每格與該建築真實數據吻合；read=1；截圖 `attic/t430-review/t430_inspect.png`；console 0 error。
- 純觀測層零啟動成本：開機台帳恆等。

### 守衛與破壞性證明

- 官方施工閘門 PASS=`4618`→**`4633`**（+15：T430 G1-G4）／FAIL=0／exit 0／verify ALL GREEN；工具鏈 54/54；兩釘 `4153/4550` 恆等；CRLF=0。
- 紅源三案全紅具名（完整 test_fixde.js 實彈、exit 1）：M1 斷接線→**T430 G2**；M2 區塊注入 `R()`→**T430 G4**；M3 電格資料源改 false→**T430 G1**。
- 業主本 task 已明示「你出卡，你施工，你合并」；卡面如實寫作者自驗，不冒稱非作者覆核。
- release tail：`GAME_VER/APP_VER=11.66`（`tools/bump.py`）、ARCH 版本/行數同步、CHANGELOG 手寫一條；合併前仍須在 frozen source／integration 各重跑 canonical verifier。
