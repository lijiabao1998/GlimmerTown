# T419 — ART-LOOP：DeepSeek 原創素材自治迭代特許（第一期：尾端靜態像素素材）

**狀態：已發卡，待 DeepSeek 認領。** 它不是 DeepSeek 自行發 T 號、也不是自行合併或上線的授權。

## 0. 授權模型與排程前置

| 角色 | 權限 |
|---|---|
| 業主 | 一次發出 T419；可隨時撤銷、暫停或結束整條 ART-LOOP。 |
| DeepSeek | 在 `bay/deepseek` 內自行編號 `ART-R01...ART-Rnn`、施工、驗證、commit、記帳。 |
| 非作者覆核者 | 看樣張／重跑閘門／審 diff，決定退修或通過。 |
| 非作者合併者 | 從 canonical master 跑交易式 `merge_bay.py deepseek --deploy`；DeepSeek 不自合、不 publish。 |

**「無限」的精確含義**：T419 可有無限個 `ART-Rnn` 小輪與無限個六小時施工窗口；它們都必須在本卡的美術、容量與玩法邊界內。它不表示可以無限長的未覆核分支、無限檔案／記憶體、無限擴大玩法範圍。

### 開工前置（硬）

1. T418a 或任何已 claim、觸碰 `index.html` 的卡必須先合併或正式撤回；T419 與所有 `index.html` 卡**強制串行**。
2. DeepSeek 先把最新 master 合入 `bay/deepseek`，完成 COLLAB 進場三連；本卡第一筆施工 commit 必填 claim（施工者、base OID、起算時間、預計白名單）。
3. 先完成 **ART-R00：當前 master 素材盤點**，產出 `docs/tasks/T419-R00-manifest.json`。ROADMAP／舊卡／舊行號只可當線索，R00 實測與當前 `git log`／`CHANGELOG` 才是唯一真相。
4. R00 必列：`index.html` UTF-8 bytes、PWA shell bytes、atlas entries／families／skipped、持久 canvas 張數／總像素、五次同機 `buildSprites` 中位數／最大值、固定測試城 `GV.saveSize()`、兩枚種子釘與完整套件 PASS。它還必須收錄 atlas.html 匯出的每個 `bld/*` `img/night` CRC、`sprFootAudit()` 的逐鍵結果與 metadata 清冊；這些才是後續白名單差分的比較起點。

## 1. 六小時施工窗口（ART-RUN）

- 一個 ART-RUN 自 claim commit 的 Asia/Taipei 時間起算，**連續六小時**，包含偵查、畫圖、測試、等待與文件；不得暫停、拆帳、換模型或重開終端來重置計時。
- `T+5:30` 起禁止開新素材目標；只可完成已宣告目標、取樣張、跑驗證、commit 與記帳。
- `T+6:00` 或任一硬停止條件先到時，立即停止新增／修改素材碼。若末筆已綠，留下乾淨 commit、寫 `STOP: TIMEBOX` 或對應原因；若仍有未驗證改動，不得靜默丟棄或硬湊綠，寫 `BLOCKED: TIMEBOX_WITH_UNVERIFIED_WORK` 並等業主決定。
- 每個已驗收小輪都要獨立 commit；不限制六小時內的 `ART-Rnn` 數量。合併後若業主未結束本卡，下一個 ART-RUN 必從新 master 重新起算六小時。
- 每一個 ART-RUN 收束後都必停給非作者覆核；通過才合併／部署。覆核不是新的施工窗口，也不允許作者藉覆核時間再加素材。

## 2. 第一期唯一施工面（嚴格白名單）

**允許檔案**：

- `index.html`：只限 `buildSprites()` 裡，**T413b 夜景烘焙完整結束後、`R=__savedR;` 之前**新建的單一 `T419 ART-LOOP 靜態加蓋 pass`；只改既有 `SPR.bld[key].img` 的日間靜態像素。
- `test_fixde.js`：只增 T419 的守衛／基線讀取／破壞性測試；既有斷言不得放寬、刪除或改期望來取得綠燈。
- `docs/tasks/T419-...md`、`docs/tasks/T419-R00-manifest.json`；每輪只更新本卡內的帳本。
- 每個準備 `--deploy` 的 ART-RUN，最後一筆**送覆核前** commit 必須是同一分支內的 release tail：以既有 `bump.py` 更新當前可用的下一版號，補齊 `sw.js`、ARCH、CHANGELOG 與本卡收束帳，然後重跑全綠。這是唯一的 `sw.js`／版本例外，仍由非作者覆核；小輪中不得手改版本或快取。若不能完成這筆送覆核前的 release tail，該窗口只能交付 `--no-deploy`，不得拿舊 cache 版號直接部署。

**每輪可畫的東西**：既有建築的門窗附屬、材質、招牌骨架、屋頂小件、貼地邊界與用途辨識細節。它們是烘入既有 sprite 的原創像素資訊；不新增玩法狀態、不新增永久資料結構，也不要求新的執行期選擇器。

**每輪白名單**：在帳本寫出 `ART_LOOP_KEYS=[...]`。目標必須是當前 `SPR.bld` 已存在的鍵，且不屬第 4 節的豁免／謹慎區。每輪只可讓該組鍵的像素內容改變；`w/h/ax/ay/sc/night`、SPR key 集合、metadata 集合都必須恆等。

## 3. 美術風格契約（比素材數量優先）

所有素材必須 **100% 原創**：不得下載、引用、描摹、轉換 TheoTown、Cities: Skylines、其他遊戲、素材庫、照片、AI 點陣圖或外來字型。

畫風固定為本作的等距像素語言：

1. 64×32 指的是**世界格基底**，不是所有 sprite canvas 的固定尺寸；畫布本身仍維持目標鍵既有的 `w/h/ax/ay`。所有落筆用 2:1 等角斜率、整數像素與 `fillRect` 級語言；地面物保持菱形／足印，只有垂直構件可越上緣。
2. 沿用家族既有的冷暗外框、主色、`shade()` 明暗階與材質邏輯；新色須由既有家族色票／shade 衍生，不能以高飽和雜色搶畫面。
3. 禁止抗鋸齒、漸層、半透明照片感、emoji、文字字型、寫實貼圖，以及「為了提高像素數／色數」而加的噪點。
4. 每一筆新增細節必須能回答：玩家在固定 z2 視角看出的是哪一個**輪廓、材質、用途或層次**；答不出就不收進已驗收輪。
5. T419 pass 排在 T413b 夜景烘焙之後；夜間只檢查既有夜圖與新日間底圖是否相容，本卡不碰 night／nightCity／夜景烘焙。新增像素不得依賴專屬夜窗／夜光語意；若需要，停止並另立普通美術卡。

## 4. 永久禁區（碰到即 STOP，不在本卡辯論）

- 玩法與狀態：`tick`／`newWorld`／`load`／`save`／`doPlace`／`canPlace`／`aiStep`／經濟／AI／COST／TOOLS／RLE／地圖尺寸／存檔格式／HUD／工具列。
- 動態與快取：`draw`／`groundCache`／任何每幀路徑、粒子、煙、載具、`tools/`。`sw.js` 僅第 2 節明定的送覆核前 release tail 可由 `bump.py` 寫入。
- 亂數／基元：`R()`、`ri()`、`rand()`、`Math.random()`、`spriteTexRand`、`plate`、`speck`、`windows`、`dia`、`isoBox`、`outlineSprite`，以及它們的呼叫數、順序、幾何常數。
- 管線凍結島：`HERO_PIX`／`drawHeroPix`、T229 季節表、T273/T274、T345 徽記、T413 夜景烘焙、T417 `stampRoof`／屋頂線／雪帽／冰柱／night mask、任何 `sc` 縮放路徑。
- 已整治或謹慎區：k22／k23／k53 農牧、k121–133 深加工、k68／71／73／76／112／127。後續 R00 發現新的凍結區亦自動加入，不得以舊 ROADMAP 反駁。

需要以上任何一項才能做得更好時，正確結果是 `STOP: NEEDS_NORMAL_CARD`，附具體掛點與理由；不得順手越界。

## 5. 資源與格式硬停止線

美術資料主要烘在 `index.html/buildSprites`，**不是存檔**。因此 20 MiB 不可誤寫成 localStorage 存檔上限；以下是 **T419 自訂、不可跨越的運營上限**，不是宣稱的瀏覽器／格式客觀最大值。任一命中即停止本 ART-RUN，且不得在 T419 內自行修引擎。

| 類別 | 硬線 | 量法／動作 |
|---|---:|---|
| 時間 | 6 小時 | claim 起算；到點 `STOP: TIMEBOX`。 |
| 執行期來源絕對天花板 | `index.html` UTF-8 `20 MiB` | 目前 R00 實測值寫入；達線前停止，禁止以壓縮、minify 或拆檔規避。 |
| Canvas 記憶體 | `33,000,000 px`、`2,800` 張 persistent canvas、`1,500` atlas entries | R00 實測後逐輪重算；任一超線 `STOP: CANVAS_CAP`。 |
| 開機烘焙效能 | 同一 8128／同一瀏覽器／同 DPR 的五次 p50 `<= R00×1.15` 且最大值 `<= R00×1.25` | 超線 `STOP: BOOT_COST`；不拿跨機掛鐘數字偷換基線。 |
| 存檔／瀏覽器容量哨兵 | 每輪固定城市 raw save bytes **精確不變**；R00、瀏覽器／平台基線變更時才跑 1000×1000 壓力槽，要求 `GV.saveSize() <= 1,000,000` 字元且任何 `localStorage.setItem` 例外即紅 | `STOP: SAVE_OR_QUOTA`；不改 `save/load/RLE_F/MAP_SIZES` 來掩蓋。 |

補充：20 MiB 是不可跨越的格式天花板，不是手機安全承諾；若來源大小超過 2.5 MiB，帳本必標黃並要求覆核特別確認。正常情況下 canvas／開機成本會先逼停不當膨脹。

## 6. 每輪施工與驗收閉環

每個 `ART-Rnn` 依序做：

1. **偵查**：讀當前 master 的 `git log`、CHANGELOG、R00 manifest、目標最後註冊位置；確認不是死圖、不是豁免鍵、不是已被其他卡 claim 的區域。
2. **設計**：在帳本寫「原問題 → z2 可見目標 → ART_LOOP_KEYS → 預期風格語意」。先截 before；不能先寫一堆像素再找理由。
3. **施工**：只在 T419 pass 內，以固定色票、整數像素、純 key 查表落筆；不得新增 SPR key 或 metadata，不得修改尺寸／錨點／`sc`／night。
4. **機器軌**：完整 `node test_fixde.js`、`python tools/verify.py`、兩枚種子釘、token／序列快照、atlas 指紋白名單與 metadata 恆等。R00 的 `sprFootAudit()` 是逐鍵基線：非目標鍵必須完全相同；目標鍵的 `below/belowMax` 不得增加。任一紅即停在該輪，不能把基線重釘成新常態。
5. **人眼軌**：自己的 8128、slot 3、固定 DPR／機位，拍日間 z2＋特寫 z3；影響夜間讀感才拍夜；多格建築才拍四旋轉。相同狀態重繪兩次必須逐位一致。樣張只留車位，合併前移出 worktree。
6. **破壞性證明**：至少一條該輪專屬守衛要能在「拿掉本輪 pass／改錯 key 白名單／改尺寸或放入亂數 token」時真紅（exit code、FAIL 與 stderr 三者皆記）。
7. **記帳／commit**：帳本填實測數，commit；沒有跑過的項目明寫「未驗證」，不可抄前輪數據。

### 每輪帳本模板

| 輪次 | 目標與鍵 | 可見改善（z2） | 機器／樣張 | 資源值 | commit／狀態 |
|---|---|---|---|---|---|
| R00 | 當前 master 清冊 | 不施工 | 基線完成後填 | bytes／canvas／atlas／p50 | — |
| R01 | 待施工時填 | 待實拍 | 待實跑 | 待量 | — |

## 7. 非作者覆核、合併與下一窗口

覆核者必須獨立：重跑全套、比對 R00→交付版指紋白名單（非白名單 `bld/*` 的 `img/night` CRC 必須恆等；`nightCity` 不屬可變白名單）、抽查每輪樣張、看真實 browser 而非只看 Node canvas mock、重演至少一條破壞性測試、核對時間與容量帳。release tail 也屬同一個覆核對象，不能在通過後再補一筆未覆核快取改動。機器綠但 z2 看不出改善／風格不一致，覆核可直接退修。

通過後，非作者從 `C:\dev\glimmer-town` 執行：

```powershell
$env:PYTHONIOENCODING='utf-8'
python tools/merge_bay.py deepseek --deploy
```

DeepSeek 不得自行跑這條命令、不得自行 `--publish`。合併與部署成功、所有車位回同步後，若業主未關閉 T419，才可開下一個六小時 ART-RUN；否則本卡以最後一筆 `STOP:` 記錄收束。

## 8. 發卡／施工 claim（由正式流程填寫）

- 發卡 commit：—
- 施工者：DeepSeek
- base OID：—
- ART-RUN-01 起算（Asia/Taipei）：—
- R00 manifest commit：—
- 目前狀態：已發卡；T418a 已合併。DeepSeek 認領前仍須完成最新 master 的進場三連與 ART-R00。

---

# 【T419 ART-LOOP 施工帳本】(DeepSeek bay/deepseek)

## 發卡／施工 claim（第 8 節正式流程填寫）

- 發卡 commit：`b62e785`（Codex，純文件；仍待非作者合併者合入 master——覆核方 P1-①）
- 施工者：DeepSeek
- base OID：`95a46b8`（master，T418a 已合併）
- ART-RUN-01 起算（Asia/Taipei）：2026-08-06 23:35
- R00 manifest commit：`45ce6b5`（本卡第一筆施工 commit；原帳誤寫 d1f2865 為 amend 前 OID，已修正）
- 預計白名單（R01）：見 R01 帳本行
- 目前狀態：覆核退修整理完成，待二輪覆核（STOP: AWAIT_REVIEW_R2）

## 每輪帳本

| 輪次 | 目標與鍵 | 可見改善（z2） | 機器／樣張 | 資源值 | commit／狀態 |
|---|---|---|---|---|---|
| R00 | 當前 master 清冊（`docs/tasks/T419-R00-manifest.json`） | 不施工 | 套件 PASS 4273／兩釘 4153/4550／verify ALL GREEN | index.html 1,843,518 B（1.76 MiB，<2.5 MiB 黃線）；PWA shell sw.js 3881/manifest 748/icon 581-1688；atlas entries 1374／families 116／skipped 37；persistent canvas 1781 張／18,487,119 px（<33M／<2800）；buildSprites 5× p50 165ms／max 274ms；固定城 saveSize 11,799 | `45ce6b5`（claim＋R00；commit 號已修正） |

R00 附註：img/night 逐鍵 CRC 已於真實瀏覽器補測完成（覆核退修 P1-②），結論見 `docs/tasks/T419-R00-crc-review.md`：非白名單 1371 鍵 CRC 全數恆等、白名單 4 鍵僅日間 img 變／night 不變。
| R02 | k26 風力塔架（`ART_LOOP_KEYS=['26_1_0','26_1_1','26_1_2']`）：原問題=z2 上「細塔柱＋兩小葉片」結構弱；加蓋=桁架橫撐 3 條＋塔身右側暗＋基座墩＋輪轂葉根（日間靜態像素，色票由 #b0b8c0/#d0d8e0 衍生） | z2 發電設施結構感（風力塔桁架） | 套件 PASS 4278→**4283**（+5 T419 守衛）/verify ALL GREEN/兩釘恆等；drawn 集合恰等白名單；metadata 恒等（w64/h112/ax32/ay110） | index.html +30 行；26 三鍵加蓋約 +300 px | **已隨 R01 合併為單一受管區**（覆核退修收口：卡面第 2 節只准一個 T419 pass）；commit 見退修帳 |
| R01 | k25 太陽能板場（`ART_LOOP_KEYS=['25_1_0']`）：原問題=z2 上「灰底＋8 條藍板」與工廠灰頂難區分；加蓋=板間分割暗縫＋板面反光高光＋板下厚度陰影＋支架斜撐 3 組＋兩側圍欄＋變電箱黃警示（日間靜態像素，色票由 #3a4a6a/#5a7aaa/#8a9a7a 衍生） | z2 板陣結構感／用途辨識（光伏＝發電設施） | 套件 PASS 4273→**4283**/verify ALL GREEN/兩釘 4153/4550；drawn 集合恰等白名單（k25＋k26 四鍵）；metadata 恒等（w136/h150/ax68/ay148/有 night 鍵）；破壞性七案全紅（M1-M7 見退修帳） | index.html +44 行（合併後單一受管區 39 行）；canvas 總像素 17,479,505（base/after 同法恆等）；buildSprites 5× p50 104ms／max 156ms（同法重測） | **待 commit**（覆核退修整理後，R02 已併入單一受管區） |

R01 附註：樣張 after 已拍（`%TEMP%/t419_r01_25_1_0.png`，atlas 篩選 25_1_0 日間）；**before 未拍**（R00 階段遺漏，卡面第 6 節「先截 before」——覆核者可用 master 版本對比）；非白名單 bld/* CRC 恒等於瀏覽器端覆核（headless 無真像素）。

## ART-RUN-01 收束（原）＋覆核退修整理（2026-08-07）

原收束：完成 ART-R00（盤點）＋ART-R01（k25 太陽能）＋ART-R02（k26 風力）——45ce6b5/0762de8/release tail；STOP: AWAIT_REVIEW。覆核方四 P1＋三收口，以下為退修整理：

**P1-① 發卡鏈**：b62e785（純文件發卡）仍只在 bay/codex——由非作者合併者先行合入 master，DeepSeek 再以新 master 重整分支。本批次不直接跑 `merge_bay.py deepseek --deploy`。
**P1-② R00 CRC 補全**：真實瀏覽器逐鍵 CRC/足印比對完成，結論入 `docs/tasks/T419-R00-crc-review.md`（非白名單 1371 鍵全數恆等；白名單 4 鍵僅日間 img 變）。
**P1-③ 白名單守衛假綠修復**：drawn 橋改為與實際 lookup key 同源（`const hk419/hk26` 單源鏈：lookup→push 同一變數）；守衛新增「KEY 單源」四斷言（單源鏈存在＋禁硬寫字面量 lookup/bridge）。破壞性七案全紅（M1-M7：改錯 k25/k26 真正 lookup、改常數值、硬寫 bridge、拿掉 pass——每案首行 FAIL 逐字匹配）。
**P1-④ 硬容量驗收**：buildSprites 5× 同法重測（after p50 104ms/max 156ms vs base p50 102ms/max 151ms，增量 <5%）；容量帳（canvas 1202 張/17,479,505 px、atlas 1374/116/37、bytes 1,846,704 全數 base/after 恆等）；固定城三配方 raw-save 逐字節比對：除 gameVer 版本號（11.44→11.45 合法 bump）外**全部恆等**——詳見 crc-review。
**收口①雙 pass 合併**：R01/R02 合併為單一 `T419 ART-LOOP 靜態加蓋 pass` 受管區（卡面第 2 節「單一 pass」）。
**收口②R02 獨立 commit**：R02 原被塞進 release tail（bf63dda 違規）——發卡鏈正規化後以新 master 重整分支時拆出獨立 commit。
**收口③帳本/樣張**：R00 commit 號修正（d1f2865→45ce6b5）；樣張補齊：before（master 版）遊戲內日間 z2/z3＋atlas 鍵圖、after 遊戲內 z2/z3，全部存 `%TEMP%/t419_{before,after}_{z2,z3}_game.png`、`t419_{before,after}_25_1_0_atlas.png`、`t419_{before,after}_26_1_0_atlas.png`。
- 版本仍 v11.45（退修不 bump；下一 release tail 視二輪覆核結果而定）。
- 樣張：見上；R01 原遺漏 before 已補拍（master 版遊戲內）。
- **STOP: AWAIT_REVIEW_R2（覆核退修整理完成；不自合、不 publish，交回非作者二輪覆核）**。
