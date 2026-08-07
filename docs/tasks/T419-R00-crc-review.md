# T419 覆核退修證據：R00 補全（真實瀏覽器逐鍵 CRC／硬容量／位元恆等）

覆核方 P1-②（R00 CRC 未驗證）與 P1-④（buildSprites 未重測）的補測記錄。
量測日期：2026-08-07；機位：同一 8128（after＝bay/deepseek）/ 8129（base＝master 95a46b8 抽出檔，臨時目錄），同一瀏覽器（ZCode IAB／同 DPR）。

## 1. 真實瀏覽器逐鍵 CRC（atlas.html#autotest 實算，非 Node mock）

方法：`http://127.0.0.1:8129/atlas.html#autotest`（base）與 `8128/atlas.html#autotest`（after）
各算一次逐鍵 CRC（img＋night 分列，1374 entries），頁面內 PINS 物件原樣匯出後程式比對。

| 群組 | 鍵數 | base | after | 判定 |
|---|---:|---|---|---|
| 非白名單 bld/* 及其餘家族 | 1371 | 同 | 同 | **CRC 全數恆等（changed=0／added=0／removed=0）** |
| `bld/25_1_0`（R01 目標） | 1 | img `7c91ceb5` | img `c006a544` | img 變（預期）；night `b27517de` **恆等** |
| `bld/26_1_0`（R02 目標） | 1 | img `d6a0e771` | img `f6f8a99c` | img 變（預期）；night `95b27e84` **恆等** |
| `bld/26_1_1`／`26_1_2`（R02 目標） | 2 | img 各一 | img 各一 | img 變（預期）；本鍵無 night |

**結論**：真實瀏覽器下，非白名單 1371 鍵逐位 CRC 全數恆等；白名單 4 鍵僅日間 img 改變、
night 全部不變（符合卡面第 3 節「本卡不碰 night」）。此即卡面第 7 節要求的
「R00→交付版指紋白名單」比對結論，已由真實 canvas 坐實。

## 2. 開機烘焙效能（buildSprites 5×，與 R00 同法：Node mock 同環境直接計時）

| 版本 | runs（ms） | p50 | max |
|---|---|---|---|
| R00（2026-08-06 帳本值） | 165ms／274ms | 165 | 274 |
| base（master 95a46b8 同法重測） | 91/93/102/150/151 | 102 | 151 |
| **after（bay/deepseek）** | 89/96/104/118/156 | **104** | **156** |

- after vs base 同法：p50 +2.0%（104/102）、max +3.3%（156/151）——遠低於卡面第 5 節
  `p50<=R00×1.15`、`max<=R00×1.25` 硬線（R00 為 165/274 時：189.75／342.5）。
- 真實瀏覽器整頁 boot（同機同法五次，domContentLoaded−navigationStart）：base p50 4490ms／max 4922ms；
  after p50 4784ms／max 5156ms——含 pass 的開機成本差異 +6.5%／+4.8%，同為同一量級、未觸線。

## 3. 容量帳（after 全量，R00 同法 Node mock＋瀏覽器交叉確認）

| 指標 | R00 | base（重測） | after | 硬線 | 判定 |
|---|---:|---:|---:|---:|---|
| index.html UTF-8 bytes | 1,843,518 | 1,843,518 | **1,846,704** | 20 MiB（20,971,520）；2.5 MiB 黃線 | ✓（+3,186 B＝+0.17%） |
| atlas entries／families／skipped | 1374/116/37 | 1374/116/37 | **1374/116/37** | 1,500 entries | ✓ 恆等 |
| persistent canvas 張數 | 1781 | 1202（同法） | **1202** | 2,800 | ✓ 恆等 |
| persistent canvas 總像素 | 18,487,119 | 17,479,505（同法） | **17,479,505** | 33,000,000 | ✓ 恆等 |
| sprFootAudit 逐鍵 | ok，65 條 | ok，65 條 | **ok，65 條** | 不新增 below | ✓ 恆等 |

## 4. 固定城 raw-save 位元恆等（卡面第 5 節存檔哨兵）

三種配方（seed312＋2 日、seed301／seed22＋400 日 AI）base vs after 的 `GV.rawSave()` 逐字節比對：

| 配方 | base len | after len | 差異字節 |
|---|---:|---:|---|
| seed312 | 5678 | 5678 | 恰 2 處：`"gameVer":"11.44"→"11.45"`、`"ver":"11.44"→"11.45"` |
| seed301 | 12191 | 12191 | 同上恰 2 處 |
| seed22 | 11343 | 11343 | 同上恰 2 處 |

**結論**：除 release tail 合法 bump 的版本號欄位外，固定城 raw-save **逐字節完全恆等**——
T419 pass 純畫布像素加蓋，零存檔影響。saveSize 哨兵 5494（seed312 配方）兩版相等。
1000×1000 壓力槽非本輪必要（未觸存檔格式變更）。

## 5. 附註

- 覆核方 P1-② 要求之「逐鍵足印」即上表第 1 節（atlas.html 匯出的 img/night CRC 全集，
  base/after 各 1375 鍵含 `__meta`，原始 JSON 於臨時目錄 %TEMP%/t419_base/{base,after}_pins.json 留存，
  覆核者可複測）。
- R00 manifest 的 buildSprites5x runs 記為 [119,124,...] p50 165/max 274——本輪同法重測兩版
  均遠低於該基線，且 after 對 base 增量 <5%；未改寫 R00 基線（卡面第 6 節「不能把基線重釘成新常態」）。
- 樣張：before（master 版 25_1_0／26_1_0）與 after 遊戲內日間 z2／特寫 z3 見卡面帳本第 6 節與
  %TEMP% 樣張清單。
