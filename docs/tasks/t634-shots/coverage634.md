# T634 英式全批候選交付清冊

清冊時間：2026-10-10T22:59:30+00:00。基線：`d88e36d866226ac182dd92ecab63c29a540a4ef8`。本清冊記錄目前工作樹，不冒充最終提交驗收。

**啟用狀態：預設關閉。** 只有 `?T634=1` 或 `window.__t634=true` 啟用候選；`?noT634`／`?noT634=1`／`window.__noT634=true` 優先退回既有路線。正式工程驗收、真瀏覽器圖片與業主視覺定稿均待最終精確提交的 CI；本清冊不宣稱測試通過，也不代表合併或部署。

## 數量與標記

- 133 種建築：50 種純保留已批准素材、72 種新製家族、11 種已批准源圖的舊足跡適配。
- 新建路徑中61種保留已批准圖；72種候選分成57種擴大園區與15種非lot路徑（3種RCI＋12種其他）。
- 108 款RCI＝3類×3等級×12款；207款其他＝69類×3款；合計315款新製候選，不把11類舊足跡適配重算為新家族。
- `retained-approved`＝保留既有批准圖；`new family`＝T634候選新家族；`approved-source legacy adapter`＝新園區保留批准圖，舊檔改用同源縮放適配，適配結果仍待驗收。
- 尺寸是實際占格的寬×高。舊檔不擴地、不改 `bd.v/sz/lot574`；無lot不等於1×1，例如k24、k57、k82。
- RCI名稱與archetype逐字取自目錄；207個其他變體名稱是依v0/v1/v2幾何分支命名的清冊標籤，不是原有遊戲UI名稱，也不表示業主已批准。

## 全133類：候選開啟時的新建與舊檔路徑

路由縮寫：`LOT634`＝draw→lotSprite574→bakeLot574→bake634；`ROOT634`＝draw→spr634→bake634；`LEGACY634`＝draw→spr634→legacyArt634→原批准bakeArt601/602/603→縮放至原足跡。保留路由寫出原藝術批次。`lot`欄是新建根是否帶lot574。

| k | 建築 | 清冊標記 | 新建占格 / lot | 候選新建路由 | 舊檔占格 | 無lot舊檔路由 |
|---:|---|---|---|---|---|---|
| 1 | 住宅 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 2 | 商業 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 3 | 工業 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 4 | 公園 | retained-approved | 1×1 / 否 | T601 SPR.art601 park | 1×1 | T601 SPR.art601 park |
| 5 | 發電廠 | retained-approved | 3×3 / 是 | T601 SPR.lot601 | 1×1 | T590 SPR.plant/plantVar (different approved art from new T601 lot) |
| 6 | 消防局 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 7 | 學校 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 8 | 垃圾場 | approved-source legacy adapter | 3×3 / 是 | T601 bakeArt601 | 1×1 | LEGACY634（T601） |
| 9 | 體育場 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 10 | 水塔 | retained-approved | 1×1 / 否 | T590 SPR.waterTower/waterTowerVar | 1×1 | T590 SPR.waterTower/waterTowerVar |
| 11 | 警察局 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.police/policeVar |
| 12 | 醫院 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.hospital/hospitalVar |
| 13 | 診所 | retained-approved | 1×1 / 否 | T590 SPR.clinic/clinicVar | 1×1 | T590 SPR.clinic/clinicVar |
| 14 | 圖書館 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 15 | 郵局 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 16 | 墓園 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 17 | 火車站 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 18 | 港口 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 19 | 機場 | retained-approved | 7×7 / 是 | T591/T592 pasted T590 art | 4×4 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 20 | 停車場 | retained-approved | 2×2 / 否 | T590 SPR.bld lv1 with legacy higher-level fallback | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 21 | 輕軌站 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 22 | 農場 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 23 | 牧場 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 24 | 地標 | new family | 2×2 / 否 | ROOT634 | 2×2 | ROOT634 |
| 25 | 太陽能 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 26 | 風力 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 27 | 污水廠 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 28 | 救護站 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 29 | 回收中心 | approved-source legacy adapter | 2×2 / 是 | T603 bakeArt603 | 1×1 | LEGACY634（T603） |
| 30 | 高級消防 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 31 | 監獄 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 32 | 大學 | retained-approved | 4×4 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 33 | 住宅摩天樓 | retained-approved | 2×2 / 否 | T599 SPR.bld via vtower599 | 2×2 | T599 SPR.bld via vtower599 |
| 34 | 商業摩天樓 | retained-approved | 2×2 / 否 | T599 SPR.bld via vtower599 | 2×2 | T599 SPR.bld via vtower599 |
| 35 | 博物館 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 36 | 劇院 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 37 | 水族館 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 38 | 動物園 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 39 | 遊樂園 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 40 | 電影院 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 41 | 圖書總館 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 42 | 市政廳 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 43 | 法院 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 44 | 會展中心 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 45 | 研究院 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 46 | 氣象站 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 47 | 植物園 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 48 | 綜合醫院 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 49 | 油井 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 50 | 礦場 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 51 | 太空研究中心 | new family | 7×7 / 是 | LOT634 | 3×3 | ROOT634 |
| 52 | 派出所 | retained-approved | 1×1 / 否 | T590 SPR.policeBox/policeBoxVar590 | 1×1 | T590 SPR.policeBox/policeBoxVar590 |
| 53 | 大農場 | approved-source legacy adapter | 7×7 / 是 | T602 bakeArt602 | 5×5 | LEGACY634（T602） |
| 54 | 大墓園 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 55 | 中央車站 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 56 | 體育園區 | retained-approved | 7×7 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 57 | 食品加工廠 | new family | 3×3 / 否 | ROOT634 | 3×3 | ROOT634 |
| 58 | 核電廠 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 59 | 水力發電廠 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 60 | 地熱發電 | approved-source legacy adapter | 3×3 / 是 | T601 bakeArt601 | 1×1 | LEGACY634（T601） |
| 61 | 消防總局 | retained-approved | 4×4 / 是 | T591/T592 pasted T590 art | 3×3 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 62 | 垃圾焚化發電廠 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 63 | 溫室 | approved-source legacy adapter | 3×3 / 是 | T601 bakeArt601 | 2×2 | LEGACY634（T601） |
| 64 | 倉儲物流中心 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 65 | 大型購物中心 | retained-approved | 5×5 / 是 | T591/T592 pasted T590 art | 4×4 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 66 | 信仰中心 | approved-source legacy adapter | 3×3 / 是 | T601 bakeArt601 | 2×2 | LEGACY634（T601） |
| 67 | 鐘樓 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 68 | 天文台 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 69 | 燈塔 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 70 | 風車 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 71 | 噴泉廣場 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 72 | 紀念碑 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 73 | 觀景塔 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 74 | 涼亭 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 75 | 凱旋門 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 76 | 摩天輪 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 77 | 水塔景觀 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 78 | 古樹神木 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 79 | 碼頭亭 | new family | 1×1 / 否 | ROOT634 | 1×1 | ROOT634 |
| 80 | 旋轉木馬 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 81 | 民宿 | retained-approved | 1×1 / 否 | T601 SPR.art601 | 1×1 | T601 SPR.art601 |
| 82 | 商務旅館 | new family | 2×2 / 否 | ROOT634 | 2×2 | ROOT634 |
| 83 | 度假酒店 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 84 | 幼兒園 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 85 | 樂齡中心 | approved-source legacy adapter | 2×2 / 是 | T603 bakeArt603 | 1×1 | LEGACY634（T603） |
| 86 | 銀行 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 87 | 農貿市場 | retained-approved | 3×3 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 88 | 堆肥場 | approved-source legacy adapter | 2×2 / 是 | T603 bakeArt603 | 1×1 | LEGACY634（T603） |
| 89 | 電視塔 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 90 | 遊艇碼頭 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 91 | 貿易站 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 92 | 遛狗公園 | approved-source legacy adapter | 2×2 / 是 | T603 bakeArt603 | 1×1 | LEGACY634（T603） |
| 93 | 溜冰場 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 94 | 滑板公園 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 95 | 消防瞭望塔 | retained-approved | 1×1 / 否 | T590 SPR.bld lv1 with legacy higher-level fallback | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 96 | 游泳池 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 97 | 釣魚碼頭 | retained-approved | 1×1 / 否 | T601 front-water / T602 rear-water SPR.art601/art602 | 1×1 | T601 front-water / T602 rear-water SPR.art601/art602 |
| 98 | 青年旅舍 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 99 | 婚禮教堂 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 100 | 釀酒廠 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 101 | 水上樂園 | new family | 5×5 / 是 | LOT634 | 2×2 | ROOT634 |
| 102 | 寵物醫院 | retained-approved | 1×1 / 否 | T590 SPR.bld lv1 with legacy higher-level fallback | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 103 | 天際觀景餐廳 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 104 | 社區菜園 | approved-source legacy adapter | 2×2 / 是 | T602 bakeArt602 | 1×1 | LEGACY634（T602） |
| 105 | 住宅巨廈 | retained-approved | 3×3 / 否 | T593 SPR.bld via vdraw590 | 3×3 | T593 SPR.bld via vdraw590 |
| 106 | 商業綜合體 | retained-approved | 3×3 / 否 | T593 SPR.bld via vdraw590 | 3×3 | T593 SPR.bld via vdraw590 |
| 107 | 火葬場 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 108 | 高中 | retained-approved | 4×4 / 是 | T591/T592 pasted T590 art | 2×2 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 109 | 科技園 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 110 | 貨運站 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 111 | 資源回收廠 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 112 | 中央公園 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 113 | 大學城 | retained-approved | 7×7 / 是 | T591/T592 pasted T590 art | 4×4 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 114 | 國際機場 | retained-approved | 9×9 / 是 | T591/T592 pasted T590 art | 5×5 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 115 | 市民中心 | new family | 4×4 / 是 | LOT634 | 3×3 | ROOT634 |
| 116 | 數據中心 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 117 | 天然氣井 | approved-source legacy adapter | 2×2 / 是 | T602 bakeArt602 | 1×1 | LEGACY634（T602） |
| 118 | 化肥廠 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 119 | 中央廚房 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 120 | 魚塘 | new family | 3×3 / 是 | LOT634 | 1×1 | ROOT634 |
| 121 | 煉油廠 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 122 | 鋼鐵廠 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 123 | 造船廠 | new family | 5×5 / 是 | LOT634 | 3×3 | ROOT634 |
| 124 | 籃球場 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 125 | 網球場 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 126 | 兒童遊樂場 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 127 | 社會住宅 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 128 | 變電所 | new family | 2×2 / 是 | LOT634 | 1×1 | ROOT634 |
| 129 | 海水淡化廠 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 130 | 抽水站 | retained-approved | 2×2 / 是 | T591/T592 pasted T590 art | 1×1 | T590 SPR.bld lv1 with legacy higher-level fallback |
| 131 | 防災中心 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |
| 132 | 避難公園 | new family | 4×4 / 是 | LOT634 | 2×2 | ROOT634 |
| 133 | 防災雷達 | new family | 3×3 / 是 | LOT634 | 2×2 | ROOT634 |

### 預設關閉／逃生閥的精確回退清冊

下表同時保留新建與舊檔原路由；不因啟用候選而刪除原SPR鍵。

| k | 新建原路由 | 無lot舊檔原路由 |
|---:|---|---|
| 1 | legacy RCI SPR.bld + wealthSpr; den>=4 and lv3 forces 1_3_4 | legacy RCI SPR.bld + wealthSpr; den>=4 and lv3 forces 1_3_4 |
| 2 | legacy RCI SPR.bld | legacy RCI SPR.bld |
| 3 | legacy RCI SPR.bld | legacy RCI SPR.bld |
| 4 | T601 SPR.art601 park | T601 SPR.art601 park |
| 5 | T601 SPR.lot601 | T590 SPR.plant/plantVar (different approved art from new T601 lot) |
| 6 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 7 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 8 | T601 bakeArt601 | legacy SPR.bld |
| 9 | T574 recipe lot | legacy SPR.bld |
| 10 | T590 SPR.waterTower/waterTowerVar | T590 SPR.waterTower/waterTowerVar |
| 11 | T591/T592 pasted T590 art | T590 SPR.police/policeVar |
| 12 | T591/T592 pasted T590 art | T590 SPR.hospital/hospitalVar |
| 13 | T590 SPR.clinic/clinicVar | T590 SPR.clinic/clinicVar |
| 14 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 15 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 16 | T574 recipe lot | legacy SPR.bld |
| 17 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 18 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 19 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 20 | T590 SPR.bld lv1 with legacy higher-level fallback | T590 SPR.bld lv1 with legacy higher-level fallback |
| 21 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 22 | T574 recipe lot | legacy SPR.bld + SPR.farmSea/farmGrow four-stage crop selection |
| 23 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 24 | legacy SPR.bld | legacy SPR.bld |
| 25 | T574 recipe lot | legacy SPR.bld |
| 26 | T574 recipe lot | legacy SPR.bld |
| 27 | T574 recipe lot | legacy SPR.bld |
| 28 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 29 | T603 bakeArt603 | legacy SPR.bld |
| 30 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 31 | T574 recipe lot | legacy SPR.bld |
| 32 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 33 | T599 SPR.bld via vtower599 | T599 SPR.bld via vtower599 |
| 34 | T599 SPR.bld via vtower599 | T599 SPR.bld via vtower599 |
| 35 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 36 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 37 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 38 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 39 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 40 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 41 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 42 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 43 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 44 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 45 | T574 recipe lot | legacy SPR.bld |
| 46 | T574 recipe lot | legacy SPR.bld |
| 47 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 48 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 49 | T574 recipe lot | legacy SPR.bld |
| 50 | T574 recipe lot | legacy SPR.bld |
| 51 | T574 recipe lot | legacy SPR.bld |
| 52 | T590 SPR.policeBox/policeBoxVar590 | T590 SPR.policeBox/policeBoxVar590 |
| 53 | T602 bakeArt602 | legacy SPR.bld + SPR.farmSea/farmGrow four-stage crop selection |
| 54 | T574 recipe lot | legacy SPR.bld |
| 55 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 56 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 57 | legacy SPR.bld | legacy SPR.bld |
| 58 | T574 recipe lot | legacy SPR.bld |
| 59 | T574 recipe lot | legacy SPR.bld |
| 60 | T601 bakeArt601 | legacy SPR.bld |
| 61 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 62 | T574 recipe lot | legacy SPR.bld |
| 63 | T601 bakeArt601 | legacy SPR.bld |
| 64 | T574 recipe lot | legacy SPR.bld |
| 65 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 66 | T601 bakeArt601 | legacy SPR.bld |
| 67 | legacy SPR.bld | legacy SPR.bld |
| 68 | T574 recipe lot | legacy SPR.bld |
| 69 | legacy SPR.bld | legacy SPR.bld |
| 70 | legacy SPR.bld | legacy SPR.bld |
| 71 | T574 recipe lot | legacy SPR.bld |
| 72 | legacy SPR.bld | legacy SPR.bld |
| 73 | legacy SPR.bld | legacy SPR.bld |
| 74 | legacy SPR.bld | legacy SPR.bld |
| 75 | T574 recipe lot | legacy SPR.bld |
| 76 | T574 recipe lot | legacy SPR.bld |
| 77 | legacy SPR.bld | legacy SPR.bld |
| 78 | legacy SPR.bld | legacy SPR.bld |
| 79 | legacy SPR.bld | legacy SPR.bld |
| 80 | T574 recipe lot | legacy SPR.bld |
| 81 | T601 SPR.art601 | T601 SPR.art601 |
| 82 | legacy SPR.bld | legacy SPR.bld |
| 83 | T574 recipe lot | legacy SPR.bld |
| 84 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 85 | T603 bakeArt603 | legacy SPR.bld |
| 86 | T574 recipe lot | legacy SPR.bld |
| 87 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 88 | T603 bakeArt603 | legacy SPR.bld |
| 89 | T574 recipe lot | legacy SPR.bld |
| 90 | T574 recipe lot | legacy SPR.bld |
| 91 | T574 recipe lot | legacy SPR.bld |
| 92 | T603 bakeArt603 | legacy SPR.bld |
| 93 | T574 recipe lot | legacy SPR.bld |
| 94 | T574 recipe lot | legacy SPR.bld |
| 95 | T590 SPR.bld lv1 with legacy higher-level fallback | T590 SPR.bld lv1 with legacy higher-level fallback |
| 96 | T574 recipe lot | legacy SPR.bld |
| 97 | T601 front-water / T602 rear-water SPR.art601/art602 | T601 front-water / T602 rear-water SPR.art601/art602 |
| 98 | T574 recipe lot | legacy SPR.bld |
| 99 | T574 recipe lot | legacy SPR.bld |
| 100 | T574 recipe lot | legacy SPR.bld |
| 101 | T574 recipe lot | legacy SPR.bld |
| 102 | T590 SPR.bld lv1 with legacy higher-level fallback | T590 SPR.bld lv1 with legacy higher-level fallback |
| 103 | T574 recipe lot | legacy SPR.bld |
| 104 | T602 bakeArt602 | legacy SPR.bld |
| 105 | T593 SPR.bld via vdraw590 | T593 SPR.bld via vdraw590 |
| 106 | T593 SPR.bld via vdraw590 | T593 SPR.bld via vdraw590 |
| 107 | T574 recipe lot | legacy SPR.bld |
| 108 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 109 | T574 recipe lot | legacy SPR.bld |
| 110 | T574 recipe lot | legacy SPR.bld |
| 111 | T574 recipe lot | legacy SPR.bld |
| 112 | T574 recipe lot | legacy SPR.bld |
| 113 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 114 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 115 | T574 recipe lot | legacy SPR.bld |
| 116 | T574 recipe lot | legacy SPR.bld |
| 117 | T602 bakeArt602 | legacy SPR.bld |
| 118 | T574 recipe lot | legacy SPR.bld |
| 119 | T574 recipe lot | legacy SPR.bld |
| 120 | T574 recipe lot | legacy SPR.bld |
| 121 | T574 recipe lot | legacy SPR.bld |
| 122 | T574 recipe lot | legacy SPR.bld |
| 123 | T574 recipe lot | legacy SPR.bld |
| 124 | T574 recipe lot | legacy SPR.bld |
| 125 | T574 recipe lot | legacy SPR.bld |
| 126 | T574 recipe lot | legacy SPR.bld |
| 127 | T574 recipe lot | legacy SPR.bld |
| 128 | T574 recipe lot | legacy SPR.bld |
| 129 | T574 recipe lot | legacy SPR.bld |
| 130 | T591/T592 pasted T590 art | T590 SPR.bld lv1 with legacy higher-level fallback |
| 131 | T574 recipe lot | legacy SPR.bld |
| 132 | T574 recipe lot | legacy SPR.bld |
| 133 | T574 recipe lot | legacy SPR.bld |

## 108款RCI：目錄原名與archetype

每款占格1×1；key為k_等級_變體。住宅財富0/1/2只作繪圖輸入，不更動儲存值；不另計為108以外的新目錄。

| key | 目錄名稱 | archetype | 院落 |
|---|---|---|---|
| 1_1_0 | 紅磚工人連排屋 | three-bay-workers-terrace | rail |
| 1_1_1 | 凸窗半獨立住宅 | bay-fronted-semi-detached | garden |
| 1_1_2 | 都鐸木構小屋 | tudor-cross-wing-cottage | garden |
| 1_1_3 | 科茨沃爾德石屋 | cotswold-stone-cottage | wall |
| 1_1_4 | 喬治式雙聯排屋 | georgian-paired-townhouses | rail |
| 1_1_5 | 花園郊區坡頂屋 | garden-suburb-hipped-house | garden |
| 1_1_6 | 威爾斯礦工連排屋 | welsh-miners-four-cottages | wall |
| 1_1_7 | 蘇格蘭砂岩雙戶屋 | scottish-sandstone-double-villa | rail |
| 1_1_8 | 肯特白木板小屋 | kent-weatherboard-cottage | garden |
| 1_1_9 | 維多利亞別墅 | victorian-villa-rear-wing | garden |
| 1_1_10 | 馬廄改建庭院屋 | stable-conversion-l-court | court |
| 1_1_11 | 愛德華街角尖塔屋 | edwardian-corner-villa-turret | rail |
| 1_2_0 | 倫敦蝶形屋頂排屋 | london-butterfly-roof-terrace | rail |
| 1_2_1 | 愛德華凸窗連排屋 | edwardian-triple-bay-terrace | rail |
| 1_2_2 | 約克郡石砌街屋 | yorkshire-stone-terrace | wall |
| 1_2_3 | 都鐸復興雙山牆住宅 | tudor-revival-twin-gables | garden |
| 1_2_4 | 喬治式粉飾錯落排屋 | georgian-stucco-stepped-terrace | rail |
| 1_2_5 | 維多利亞庭院公寓 | victorian-l-plan-courtyard-flats | court |
| 1_2_6 | 格拉斯哥砂岩公寓 | glasgow-sandstone-tenement | rail |
| 1_2_7 | 安妮女王式宅邸公寓 | queen-anne-gabled-mansion-flats | garden |
| 1_2_8 | 工藝美術庭院住宅 | arts-and-crafts-courtyard | garden |
| 1_2_9 | 花園廣場端部排屋 | garden-square-end-terrace | rail |
| 1_2_10 | 倫敦馬廄巷複式住宅 | london-mews-maisonettes | court |
| 1_2_11 | 愛德華轉角公寓 | edwardian-turret-corner-tenement | rail |
| 1_3_0 | 倫敦紅磚宅邸公寓 | london-redbrick-mansion-block | rail |
| 1_3_1 | 格拉斯哥街角高密公寓 | glasgow-l-plan-tenement-block | court |
| 1_3_2 | 維多利亞周邊式庭院公寓 | victorian-u-court-housing | court |
| 1_3_3 | 愛德華尖塔宅邸街廓 | edwardian-corner-turret-mansions | rail |
| 1_3_4 | 喬治式都市高排屋 | georgian-tall-urban-terrace | rail |
| 1_3_5 | 安妮女王多山牆公寓 | queen-anne-three-gable-mansions | rail |
| 1_3_6 | 維多利亞倉庫改建公寓 | victorian-warehouse-loft-conversion | court |
| 1_3_7 | 三十年代裝飾藝術公寓 | interwar-art-deco-stepped-flats | rail |
| 1_3_8 | 波特蘭石高層宅邸 | portland-stone-mansard-mansions | rail |
| 1_3_9 | 維多利亞哥德式公寓 | victorian-gothic-mansion-flats | wall |
| 1_3_10 | 愛德華四合院宅邸 | edwardian-quadrangle-mansion-flats | court |
| 1_3_11 | 北部工業城密集街廓 | northern-stepped-urban-tenements | rail |
| 2_1_0 | 高街麵包店 | high-street-paired-bakery | pave |
| 2_1_1 | 街角肉舖 | corner-butcher-shop | pave |
| 2_1_2 | 都鐸驛站旅店 | tudor-coaching-inn | court |
| 2_1_3 | 炸魚薯條小店 | fish-and-chip-shop-rear-shed | pave |
| 2_1_4 | 紅獅鄰里酒館 | red-lion-corner-public-house | pub |
| 2_1_5 | 石砌小鎮銀行 | stone-pediment-town-bank | pave |
| 2_1_6 | 三山牆集市店屋 | triple-gable-market-shops | market |
| 2_1_7 | 窄面文具書店 | narrow-stationer-townhouse | pave |
| 2_1_8 | 高街蔬果店 | greengrocer-awning-shop | produce |
| 2_1_9 | 石屋茶室 | village-stone-tearoom | pub |
| 2_1_10 | 維多利亞凸窗古董店 | victorian-bay-front-antique-shop | pave |
| 2_1_11 | 紅磚街角郵局 | corner-sub-post-office | post |
| 2_2_0 | 維多利亞高街商店排屋 | victorian-mixed-height-shop-parade | pave |
| 2_2_1 | 愛德華石砌銀行 | edwardian-bank-cupola | pave |
| 2_2_2 | 倫敦玻璃拱廊商場 | london-covered-shopping-arcade | court |
| 2_2_3 | 維多利亞街角百貨 | victorian-corner-department-store | pave |
| 2_2_4 | 鐘樓集市大廳 | clock-tower-covered-market | market |
| 2_2_5 | 喬治式驛站酒店 | georgian-coaching-hotel-court | court |
| 2_2_6 | 都鐸復興高街商樓 | tudor-revival-three-gable-shops | pave |
| 2_2_7 | 喬治式辦公事務所 | georgian-mansard-office-chambers | rail |
| 2_2_8 | 鐵路街角旅館 | railway-hotel-turret-corner | pave |
| 2_2_9 | 海濱玻璃櫥窗商廊 | seaside-cast-iron-shop-gallery | pave |
| 2_2_10 | 合作社百貨商樓 | cooperative-emporium-gabled | pave |
| 2_2_11 | 運河倉庫辦公樓 | canal-warehouse-office-conversion | court |
| 2_3_0 | 波特蘭石旗艦百貨 | portland-stone-grand-department-store | pave |
| 2_3_1 | 愛德華保險會社大樓 | edwardian-insurance-chambers-tower | pave |
| 2_3_2 | 維多利亞有頂交易所 | victorian-covered-commercial-exchange | court |
| 2_3_3 | 裝飾藝術百貨大樓 | art-deco-stepped-department-store | pave |
| 2_3_4 | 哥德復興銀行總部 | gothic-revival-bank-headquarters | pave |
| 2_3_5 | 喬治式庭院大酒店 | georgian-courtyard-grand-hotel | court |
| 2_3_6 | 都市維多利亞商業街廓 | victorian-tall-high-street-block | pave |
| 2_3_7 | 愛德華玻璃購物拱廊 | edwardian-grand-shopping-arcade | pave |
| 2_3_8 | 北部紡織交易所 | northern-textile-exchange-clock-tower | pave |
| 2_3_9 | 紅磚市場與商務大樓 | redbrick-market-and-office-block | market |
| 2_3_10 | 英式鐵路大酒店 | british-grand-railway-hotel | pave |
| 2_3_11 | 兩戰間石砌辦公大樓 | interwar-stone-stepped-office-block | pave |
| 3_1_0 | 木匠作坊 | joiners-gabled-workshop | timber |
| 3_1_1 | 小鎮鐵匠鋪 | blacksmith-l-plan-forge | forge |
| 3_1_2 | 北向天窗鋸木廠 | northlight-sawmill | logs |
| 3_1_3 | 小型磚窯場 | small-brickyard-kiln | bricks |
| 3_1_4 | 鄰里織布作坊 | weavers-three-storey-workshop | pave |
| 3_1_5 | 運河裝卸小倉庫 | canal-hoist-warehouse | crates |
| 3_1_6 | 牛奶處理工坊 | small-dairy-processing-workshop | dairy |
| 3_1_7 | 拱門修車工坊 | twin-bay-motor-works | garage |
| 3_1_8 | 史托克陶器工坊 | stoke-pottery-bottle-kiln | pottery |
| 3_1_9 | 石匠切石作坊 | stonemasons-open-yard | stoneworks |
| 3_1_10 | 煤商堆料場 | coal-merchants-yard | coal |
| 3_1_11 | 雙山牆印刷工坊 | twin-gable-printing-workshop | crates |
| 3_2_0 | 蘭開夏紡織廠 | lancashire-four-storey-textile-mill | mill |
| 3_2_1 | 黑鄉鐵鑄造廠 | black-country-iron-foundry | foundry |
| 3_2_2 | 北向天窗機械工廠 | northlight-engineering-works | engineering |
| 3_2_3 | 雙窯磚瓦工廠 | twin-kiln-brickworks | doublekiln |
| 3_2_4 | 維多利亞啤酒廠 | victorian-brewery-maltings | brewery |
| 3_2_5 | 雙跨鐵路貨運庫 | twin-span-railway-goods-depot | depot |
| 3_2_6 | 長形繩索工廠 | long-ropewalk-factory | timber |
| 3_2_7 | 造紙廠與水箱 | paper-mill-water-tank | paper |
| 3_2_8 | 約克郡毛紡織廠 | yorkshire-l-plan-woollen-mill | mill |
| 3_2_9 | 皮革加工工廠 | tannery-courtyard-works | tannery |
| 3_2_10 | 電機製造工廠 | edwardian-electrical-manufacturing-works | engineering |
| 3_2_11 | 運河穀物倉庫 | canal-grain-hoist-warehouse | crates |
| 3_3_0 | 蘭開夏大型棉紡廠 | lancashire-cotton-mill-chimney | tallmill |
| 3_3_1 | 重型機械製造廠 | heavy-engineering-northlight-complex | heavy |
| 3_3_2 | 維多利亞鐘樓工業街廓 | victorian-clock-tower-industrial-complex | engineering |
| 3_3_3 | 城市大型釀酒廠 | urban-brewery-malt-house-complex | bigbrewery |
| 3_3_4 | 密集織布與紡紗工廠 | textile-spinning-and-weaving-mill | tallmill |
| 3_3_5 | 渦輪機械製造大廳 | turbine-engineering-hall | powerworks |
| 3_3_6 | 鋼鐵鑄造與橋式吊車廠 | steel-foundry-gantry-works | gantry |
| 3_3_7 | 運河雙排保稅倉庫 | paired-canal-bonded-warehouses | crates |
| 3_3_8 | 大型報業印刷工廠 | metropolitan-newspaper-printing-works | engineering |
| 3_3_9 | 機車與車廂製造工廠 | locomotive-and-carriage-works | depot |
| 3_3_10 | 大型麵粉磨坊 | industrial-flour-mill-silos | flour |
| 3_3_11 | 北部高塔機械工業廠 | northern-tower-engineering-works | towerworks |

## 207款非RCI：逐款清冊名稱

key為k_1_變體；名稱按原始分支幾何描述，三款均可依實際新／舊占格繪製。k22另讀作物階段0/1/2/3，季節與雪態不重計為變體。

| key | 建築 | 變體清冊名稱 | 家族源 |
|---|---|---|---|
| 9_1_0 | 體育場 | 足球場與四面看台 | CIVIC634 |
| 9_1_1 | 體育場 | 橢圓田徑跑道與鐘樓 | CIVIC634 |
| 9_1_2 | 體育場 | 板球橢圓草坪與會館 | CIVIC634 |
| 16_1_0 | 墓園 | 尖塔小教堂分區墓園 | CIVIC634 |
| 16_1_1 | 墓園 | 石拱門軸線墓園 | CIVIC634 |
| 16_1_2 | 墓園 | 樹蔭散置墓石園 | CIVIC634 |
| 22_1_0 | 農場 | 單片田區與糧倉 | INDUSTRY634 |
| 22_1_1 | 農場 | 雙田區石屋農莊 | INDUSTRY634 |
| 22_1_2 | 農場 | 雙穀倉與前排田區 | INDUSTRY634 |
| 24_1_0 | 地標 | 中央鐘塔與雙翼歷史館 | CIVIC634 |
| 24_1_1 | 地標 | 四角塔堡壘 | CIVIC634 |
| 24_1_2 | 地標 | 圓頂柱廊紀念館 | CIVIC634 |
| 25_1_0 | 太陽能 | 六組低架光電板 | INDUSTRY634 |
| 25_1_1 | 太陽能 | 階梯光電板與石屋 | INDUSTRY634 |
| 25_1_2 | 太陽能 | 雙排高架光電棚 | INDUSTRY634 |
| 26_1_0 | 風力 | 單座水平軸風機 | INDUSTRY634 |
| 26_1_1 | 風力 | 雙座錯高水平軸風機 | INDUSTRY634 |
| 26_1_2 | 風力 | 垂直軸風機 | INDUSTRY634 |
| 27_1_0 | 污水廠 | 雙圓形沉澱池 | INDUSTRY634 |
| 27_1_1 | 污水廠 | 三列長方處理池 | INDUSTRY634 |
| 27_1_2 | 污水廠 | 圓頂設備與雙生態池 | INDUSTRY634 |
| 31_1_0 | 監獄 | 十字囚舍監獄 | CIVIC634 |
| 31_1_1 | 監獄 | U形囚舍球場監獄 | CIVIC634 |
| 31_1_2 | 監獄 | 雙列囚舍監獄 | CIVIC634 |
| 45_1_0 | 研究院 | 雙翼圓頂研究院 | CIVIC634 |
| 45_1_1 | 研究院 | U形紅磚玻璃實驗庭 | CIVIC634 |
| 45_1_2 | 研究院 | 石館附圓頂實驗樓 | CIVIC634 |
| 46_1_0 | 氣象站 | 格構氣象塔與百葉箱 | INDUSTRY634 |
| 46_1_1 | 氣象站 | 圓頂氣象觀測館 | INDUSTRY634 |
| 46_1_2 | 氣象站 | 碟形天線與輔助塔 | INDUSTRY634 |
| 49_1_0 | 油井 | 單座磕頭機油井 | INDUSTRY634 |
| 49_1_1 | 油井 | 高架鑽井塔 | INDUSTRY634 |
| 49_1_2 | 油井 | 雙座錯列磕頭機 | INDUSTRY634 |
| 50_1_0 | 礦場 | 井架絞盤與磚煙囪 | INDUSTRY634 |
| 50_1_1 | 礦場 | 階梯露天礦坑 | INDUSTRY634 |
| 50_1_2 | 礦場 | 雙井架與鐵路礦棚 | INDUSTRY634 |
| 51_1_0 | 太空研究中心 | 火箭發射架與裝配館 | INDUSTRY634 |
| 51_1_1 | 太空研究中心 | 鋸齒屋頂研究館與大天線 | INDUSTRY634 |
| 51_1_2 | 太空研究中心 | 門式吊架火箭裝配場 | INDUSTRY634 |
| 54_1_0 | 大墓園 | 中央尖塔十字步道墓園 | CIVIC634 |
| 54_1_1 | 大墓園 | 弧列靈堂與中央紀念柱 | CIVIC634 |
| 54_1_2 | 大墓園 | 十字教堂與長列墓區 | CIVIC634 |
| 57_1_0 | 食品加工廠 | 鋸齒廠房與雙筒倉 | INDUSTRY634 |
| 57_1_1 | 食品加工廠 | 高脊主廠與三儲槽 | INDUSTRY634 |
| 57_1_2 | 食品加工廠 | 雙鋸齒廠房與圓槽 | INDUSTRY634 |
| 58_1_0 | 核電廠 | 單反應爐雙冷卻塔 | INDUSTRY634 |
| 58_1_1 | 核電廠 | 大冷卻塔與長汽機館 | INDUSTRY634 |
| 58_1_2 | 核電廠 | 雙反應爐與屋頂冷卻設備 | INDUSTRY634 |
| 59_1_0 | 水力發電廠 | 側渠水閘與石造機房 | INDUSTRY634 |
| 59_1_1 | 水力發電廠 | 四閘壩體與下游水道 | INDUSTRY634 |
| 59_1_2 | 水力發電廠 | 雙水道中央機房 | INDUSTRY634 |
| 62_1_0 | 垃圾焚化發電廠 | 單高煙囪鋸齒焚化館 | INDUSTRY634 |
| 62_1_1 | 垃圾焚化發電廠 | 雙煙囪高脊焚化館 | INDUSTRY634 |
| 62_1_2 | 垃圾焚化發電廠 | 錯置廠房與粗煙囪 | INDUSTRY634 |
| 64_1_0 | 倉儲物流中心 | 三裝卸門鋸齒倉庫 | INDUSTRY634 |
| 64_1_1 | 倉儲物流中心 | 高倉樓與貨櫃場 | INDUSTRY634 |
| 64_1_2 | 倉儲物流中心 | 連橋雙倉庫 | INDUSTRY634 |
| 67_1_0 | 鐘樓 | 紅磚方形鐘塔 | CIVIC634 |
| 67_1_1 | 鐘樓 | 石拱底座市集鐘樓 | CIVIC634 |
| 67_1_2 | 鐘樓 | 尖塔石造鐘樓 | CIVIC634 |
| 68_1_0 | 天文台 | 單大圓頂天文台 | CIVIC634 |
| 68_1_1 | 天文台 | 雙圓頂天文台 | CIVIC634 |
| 68_1_2 | 天文台 | 圓頂觀測館與戶外望遠設備 | CIVIC634 |
| 69_1_0 | 燈塔 | 紅白分段圓燈塔 | CIVIC634 |
| 69_1_1 | 燈塔 | 守塔屋附方形燈塔 | CIVIC634 |
| 69_1_2 | 燈塔 | 磚石圓塔與環形平台 | CIVIC634 |
| 70_1_0 | 風車 | 石造圓塔風車 | CIVIC634 |
| 70_1_1 | 風車 | 木板錐身風車 | CIVIC634 |
| 70_1_2 | 風車 | 支架穀倉式風車 | CIVIC634 |
| 71_1_0 | 噴泉廣場 | 中央雙層圓噴泉 | CIVIC634 |
| 71_1_1 | 噴泉廣場 | 雙圓噴泉與石拱 | CIVIC634 |
| 71_1_2 | 噴泉廣場 | 長池列噴泉 | CIVIC634 |
| 72_1_0 | 紀念碑 | 圓柱頂像紀念碑 | CIVIC634 |
| 72_1_1 | 紀念碑 | 方尖碑 | CIVIC634 |
| 72_1_2 | 紀念碑 | 階梯和平紀念座 | CIVIC634 |
| 73_1_0 | 觀景塔 | 格構觀景塔與頂棚 | CIVIC634 |
| 73_1_1 | 觀景塔 | 石砌垛口觀景塔 | CIVIC634 |
| 73_1_2 | 觀景塔 | 雙柱圓形觀景艙 | CIVIC634 |
| 74_1_0 | 涼亭 | 八柱圓頂涼亭 | CIVIC634 |
| 74_1_1 | 涼亭 | 長方坡頂涼亭 | CIVIC634 |
| 74_1_2 | 涼亭 | 六柱尖頂涼亭 | CIVIC634 |
| 75_1_0 | 凱旋門 | 古典單拱凱旋門 | CIVIC634 |
| 75_1_1 | 凱旋門 | 中央高拱三聯門 | CIVIC634 |
| 75_1_2 | 凱旋門 | 雙塔鐘面城門 | CIVIC634 |
| 76_1_0 | 摩天輪 | 單輪十二艙摩天輪 | CIVIC634 |
| 76_1_1 | 摩天輪 | 大小雙摩天輪 | CIVIC634 |
| 76_1_2 | 摩天輪 | 木板廣場十六艙摩天輪 | CIVIC634 |
| 77_1_0 | 水塔景觀 | 磚圓塔承托水箱 | CIVIC634 |
| 77_1_1 | 水塔景觀 | 鐵架圓水箱 | CIVIC634 |
| 77_1_2 | 水塔景觀 | 石砌垛口水塔 | CIVIC634 |
| 78_1_0 | 古樹神木 | 四簇樹冠古橡樹 | CIVIC634 |
| 78_1_1 | 古樹神木 | 中央大樹冠古橡樹 | CIVIC634 |
| 78_1_2 | 古樹神木 | 雙幹錯高古橡樹 | CIVIC634 |
| 79_1_0 | 碼頭亭 | 長棧道坡頂碼頭亭 | CIVIC634 |
| 79_1_1 | 碼頭亭 | T形碼頭屋與側棚 | CIVIC634 |
| 79_1_2 | 碼頭亭 | 平台圓頂碼頭亭 | CIVIC634 |
| 80_1_0 | 旋轉木馬 | 六馬條紋頂旋轉木馬 | CIVIC634 |
| 80_1_1 | 旋轉木馬 | 雙層旋轉木馬 | CIVIC634 |
| 80_1_2 | 旋轉木馬 | 八馬方棚旋轉木馬 | CIVIC634 |
| 82_1_0 | 商務旅館 | 石造主樓與門廊大旅館 | CIVIC634 |
| 82_1_1 | 商務旅館 | L形紅磚旅館與角塔 | CIVIC634 |
| 82_1_2 | 商務旅館 | U形庭院噴泉旅館 | CIVIC634 |
| 83_1_0 | 度假酒店 | 三翼莊園泳池酒店 | CIVIC634 |
| 83_1_1 | 度假酒店 | 主館與分散小屋度假村 | CIVIC634 |
| 83_1_2 | 度假酒店 | 雙翼長泳池水療酒店 | CIVIC634 |
| 86_1_0 | 銀行 | 古典柱廊銀行 | CIVIC634 |
| 86_1_1 | 銀行 | 紅磚鐘塔儲蓄銀行 | CIVIC634 |
| 86_1_2 | 銀行 | 階梯退台石造銀行 | CIVIC634 |
| 89_1_0 | 電視塔 | 混凝土環形平台電視塔 | INDUSTRY634 |
| 89_1_1 | 電視塔 | 格構多碟電視塔 | INDUSTRY634 |
| 89_1_2 | 電視塔 | 樓體式天線電視塔 | INDUSTRY634 |
| 90_1_0 | 遊艇碼頭 | 三指狀棧橋遊艇會 | CIVIC634 |
| 90_1_1 | 遊艇碼頭 | L形岸線橫向泊位 | CIVIC634 |
| 90_1_2 | 遊艇碼頭 | 十字棧橋遊艇港 | CIVIC634 |
| 91_1_0 | 貿易站 | 高倉與起重貿易場 | INDUSTRY634 |
| 91_1_1 | 貿易站 | 長廳貨櫃交易所 | INDUSTRY634 |
| 91_1_2 | 貿易站 | 連橋雙館貿易站 | INDUSTRY634 |
| 93_1_0 | 溜冰場 | 露天冰場與會館 | CIVIC634 |
| 93_1_1 | 溜冰場 | 桁架冰場 | CIVIC634 |
| 93_1_2 | 溜冰場 | 雙側看台冰場 | CIVIC634 |
| 94_1_0 | 滑板公園 | 碗池與單坡滑板場 | CIVIC634 |
| 94_1_1 | 滑板公園 | 對向坡台與滑桿場 | CIVIC634 |
| 94_1_2 | 滑板公園 | 階梯障礙滑板場 | CIVIC634 |
| 96_1_0 | 游泳池 | 主泳池與跳台 | CIVIC634 |
| 96_1_1 | 游泳池 | L形浴場與圓戲水池 | CIVIC634 |
| 96_1_2 | 游泳池 | 雙長方泳池與圓池 | CIVIC634 |
| 98_1_0 | 青年旅舍 | 紅磚主館與遮棚旅舍 | CIVIC634 |
| 98_1_1 | 青年旅舍 | 三山牆庭院旅舍 | CIVIC634 |
| 98_1_2 | 青年旅舍 | 石造高館與自行車棚旅舍 | CIVIC634 |
| 99_1_0 | 婚禮教堂 | 側尖塔長堂教堂 | CIVIC634 |
| 99_1_1 | 婚禮教堂 | 十字長堂與高尖塔 | CIVIC634 |
| 99_1_2 | 婚禮教堂 | 圓頂側堂與小鐘塔 | CIVIC634 |
| 100_1_0 | 釀酒廠 | 麥芽高樓與銅釀槽 | INDUSTRY634 |
| 100_1_1 | 釀酒廠 | 鋸齒廠房與雙錐窯 | INDUSTRY634 |
| 100_1_2 | 釀酒廠 | 雙翼釀造樓與發酵槽 | INDUSTRY634 |
| 101_1_0 | 水上樂園 | 雙滑道主泳池樂園 | CIVIC634 |
| 101_1_1 | 水上樂園 | 環形漂流河樂園 | CIVIC634 |
| 101_1_2 | 水上樂園 | 雙池分流滑道樂園 | CIVIC634 |
| 103_1_0 | 天際觀景餐廳 | 單塔圓形觀景餐廳 | CIVIC634 |
| 103_1_1 | 天際觀景餐廳 | 屋頂玻璃餐廳 | CIVIC634 |
| 103_1_2 | 天際觀景餐廳 | 雙塔連橋觀景餐廳 | CIVIC634 |
| 107_1_0 | 火葬場 | 山牆禮堂與側煙囪 | CIVIC634 |
| 107_1_1 | 火葬場 | 十字紀念堂火葬場 | CIVIC634 |
| 107_1_2 | 火葬場 | 長翼館與紀念庭院 | CIVIC634 |
| 109_1_0 | 科技園 | 玻璃連廊三館科技園 | INDUSTRY634 |
| 109_1_1 | 科技園 | 高樓與池畔實驗館 | INDUSTRY634 |
| 109_1_2 | 科技園 | 雙山牆連橋科技園 | INDUSTRY634 |
| 110_1_0 | 貨運站 | 大型門式起重貨櫃場 | INDUSTRY634 |
| 110_1_1 | 貨運站 | 鋸齒貨棚與側吊機 | INDUSTRY634 |
| 110_1_2 | 貨運站 | 石造貨樓與堆疊貨櫃 | INDUSTRY634 |
| 111_1_0 | 資源回收廠 | 鋸齒回收館與分類箱 | INDUSTRY634 |
| 111_1_1 | 資源回收廠 | 輸送設備連接回收館 | INDUSTRY634 |
| 111_1_2 | 資源回收廠 | 門式吊機資源回收場 | INDUSTRY634 |
| 112_1_0 | 中央公園 | 十字花園與中央涼亭 | CIVIC634 |
| 112_1_1 | 中央公園 | 湖心島與湖畔館 | CIVIC634 |
| 112_1_2 | 中央公園 | 運動草坪與樹蔭公園 | CIVIC634 |
| 115_1_0 | 市民中心 | 中央鐘塔三翼市民館 | CIVIC634 |
| 115_1_1 | 市民中心 | 雙翼玻璃中庭市民館 | CIVIC634 |
| 115_1_2 | 市民中心 | 圓頂議事館與附樓 | CIVIC634 |
| 116_1_0 | 數據中心 | 單館屋頂冷卻數據中心 | INDUSTRY634 |
| 116_1_1 | 數據中心 | 錯高雙館數據中心 | INDUSTRY634 |
| 116_1_2 | 數據中心 | 連橋三館數據中心 | INDUSTRY634 |
| 118_1_0 | 化肥廠 | 列罐鋸齒化肥廠 | INDUSTRY634 |
| 118_1_1 | 化肥廠 | 雙圓頂原料倉化肥廠 | INDUSTRY634 |
| 118_1_2 | 化肥廠 | 高處理塔群化肥廠 | INDUSTRY634 |
| 119_1_0 | 中央廚房 | 雙排氣口廚房與冷藏庫 | INDUSTRY634 |
| 119_1_1 | 中央廚房 | 高脊主樓連接鋸齒廚房 | INDUSTRY634 |
| 119_1_2 | 中央廚房 | U形配送中央廚房 | INDUSTRY634 |
| 120_1_0 | 魚塘 | 三片方形魚塘 | INDUSTRY634 |
| 120_1_1 | 魚塘 | 三列長魚塘 | INDUSTRY634 |
| 120_1_2 | 魚塘 | 雙圓形養殖槽 | INDUSTRY634 |
| 121_1_0 | 煉油廠 | 三處理柱煉油廠 | INDUSTRY634 |
| 121_1_1 | 煉油廠 | 雙高柱與大型儲罐 | INDUSTRY634 |
| 121_1_2 | 煉油廠 | 雙前置儲罐煉油廠 | INDUSTRY634 |
| 122_1_0 | 鋼鐵廠 | 單高爐與門式吊機 | INDUSTRY634 |
| 122_1_1 | 鋼鐵廠 | 雙高爐鋼鐵廠 | INDUSTRY634 |
| 122_1_2 | 鋼鐵廠 | 高吊架與鋸齒軋鋼館 | INDUSTRY634 |
| 123_1_0 | 造船廠 | 單船塢門式起重船廠 | INDUSTRY634 |
| 123_1_1 | 造船廠 | 橫向船塢與高吊機 | INDUSTRY634 |
| 123_1_2 | 造船廠 | 雙船塢造船廠 | INDUSTRY634 |
| 124_1_0 | 籃球場 | 單片籃球場 | CIVIC634 |
| 124_1_1 | 籃球場 | 雙片並列籃球場 | CIVIC634 |
| 124_1_2 | 籃球場 | 桁架籃球場 | CIVIC634 |
| 125_1_0 | 網球場 | 單片網球場 | CIVIC634 |
| 125_1_1 | 網球場 | 雙片網球場與小會館 | CIVIC634 |
| 125_1_2 | 網球場 | 石造俱樂部附網球場 | CIVIC634 |
| 126_1_0 | 兒童遊樂場 | 鞦韆與滑梯小塔 | CIVIC634 |
| 126_1_1 | 兒童遊樂場 | 帆船主題遊樂場 | CIVIC634 |
| 126_1_2 | 兒童遊樂場 | 三塔吊橋冒險遊樂場 | CIVIC634 |
| 127_1_0 | 社會住宅 | 紅磚排屋圍合社宅 | CIVIC634 |
| 127_1_1 | 社會住宅 | 三列階梯高低社宅 | CIVIC634 |
| 127_1_2 | 社會住宅 | 雙翼庭院球場社宅 | CIVIC634 |
| 128_1_0 | 變電所 | 雙變壓器與單母線架 | INDUSTRY634 |
| 128_1_1 | 變電所 | 三列變壓器變電所 | INDUSTRY634 |
| 128_1_2 | 變電所 | 雙母線架變電所 | INDUSTRY634 |
| 129_1_0 | 海水淡化廠 | 列罐與預處理池淡化廠 | INDUSTRY634 |
| 129_1_1 | 海水淡化廠 | 三組膜處理設備淡化廠 | INDUSTRY634 |
| 129_1_2 | 海水淡化廠 | 雙大儲水罐淡化廠 | INDUSTRY634 |
| 131_1_0 | 防災中心 | 雙館防災中心與大天線 | INDUSTRY634 |
| 131_1_1 | 防災中心 | 高塔指揮館防災中心 | INDUSTRY634 |
| 131_1_2 | 防災中心 | U形連橋防災中心 | INDUSTRY634 |
| 132_1_0 | 避難公園 | 集結草坪與救援亭 | CIVIC634 |
| 132_1_1 | 避難公園 | 運動球場型避難公園 | CIVIC634 |
| 132_1_2 | 避難公園 | 階梯集會廣場型避難公園 | CIVIC634 |
| 133_1_0 | 防災雷達 | 單碟高塔雷達站 | INDUSTRY634 |
| 133_1_1 | 防災雷達 | 圓頂雷達館與通訊塔 | INDUSTRY634 |
| 133_1_2 | 防災雷達 | 雙碟錯高雷達站 | INDUSTRY634 |

## 11類已批准源圖的舊足跡適配

| k | 建築 | 批准源 | 新園區 | 舊足跡 | 縮放比 |
|---:|---|---|---|---|---|
| 8 | 垃圾場 | T601 | 3×3 | 1×1 | 1/3 |
| 29 | 回收中心 | T603 | 2×2 | 1×1 | 1/2 |
| 53 | 大農場 | T602 | 7×7 | 5×5 | 5/7 |
| 60 | 地熱發電 | T601 | 3×3 | 1×1 | 1/3 |
| 63 | 溫室 | T601 | 3×3 | 2×2 | 2/3 |
| 66 | 信仰中心 | T601 | 3×3 | 2×2 | 2/3 |
| 85 | 樂齡中心 | T603 | 2×2 | 1×1 | 1/2 |
| 88 | 堆肥場 | T603 | 2×2 | 1×1 | 1/2 |
| 92 | 遛狗公園 | T603 | 2×2 | 1×1 | 1/2 |
| 104 | 社區菜園 | T602 | 2×2 | 1×1 | 1/2 |
| 117 | 天然氣井 | T602 | 2×2 | 1×1 | 1/2 |

適配以實際 `n / LOT_PLAN574[k][1]` 縮放新Canvas、錨點與掛點。現代園區仍走原批准路由；批准源圖本身不覆寫。這11類的適配結果仍待真圖與定稿。

## 原始碼可確認的不變量（不是執行通過宣告）

- 本清冊是原始碼推導的交付帳，不等於工程或視覺測試已通過。
- REMAIN634 的72個唯一種類與 ART634 完全一致：39類公共休閒、30類工業基礎設施、3類RCI；與61類原有批准圖的種類集合不相交。
- 新建路徑涵蓋57類擴大園區及15類非lot建築（3類RCI＋12類其他），這72類均另有無lot舊檔分派。
- LEGACY634 恰為11類原有 T601/T602/T603 園區的舊檔缺口；現代園區保留既有批准路由。
- RCI_CATALOG634 明列108個唯一k／等級／變體鍵；非RCI候選為69×3＝207個結構分支。結構差異及美術品質仍待圖片定稿。
- 覆核差異未修改模擬、經濟、AI、成本、容量、放置、MSZ、存讀檔格式或既有 buildSprites 生成。新圖讀取bd／日期／季節，寫自己的Canvas及快取，不重寫建築紀錄。
- 原有SPR鍵與批准源圖函式保留。SPR_PINS 的1586鍵payload未改，只有 __meta 版本變動；實際瀏覽器指紋比較仍待精確提交CI。
- test_fixde.js 的五個原文釘更新保留原斷言與舊分支，僅加入T634接線；覆核未見放寬既有行為門檻或重釘精靈payload。
- 只有 t634On() 成立才選候選圖。非lot建築在zoom<0.5時保留既有通用色塊LOD，這不是家族註冊遺漏。
- 非lot T634快取上限為192項／1600萬像素；園區沿用128項／1200萬像素上限。這是源碼限制，不是效能實測結果。

## 已回報問題與驗收狀態

前三項與航空燈空掛點已看到源碼修正；仍沒有把原文修正等同於行為通過。最終精確提交的CI、冷暖快取與真瀏覽器畫面是尚待確認的邊界。

- **old-multigrid-smoke-anchor**：已看到源碼修正，待精確提交CI。先前舊多格工業煙粒被固定錨定至1×1。現行源碼在T634開啟時改讀 b.sz||1，保留原足跡；四視角煙口吻合仍待CI真圖。 位置：`index.html:updSmoke / particle lot574 size`。
- **old-farm-stage-hook**：已看到源碼修正，待精確提交CI。先前收割煙查stage2，可能退回未縮放的現代園區掛點。現行源碼改查stage3，舊圖暖快取缺失時直接返回，不借用現代園區掛點；快取冷／暖與煙粒畫面仍待CI。 位置：`index.html:attachFarmSmoke574`。
- **old-save-animated-flag**：已看到源碼修正，待精確提交CI。先前非lot T634只提供hooks.flag，卻被要求flagAt而漏畫動態旗。現行條件已接受s.__t634及hooks.flag；實際動畫與遮擋仍待CI。 位置：`index.html:draw / flag eligibility`。
- **lighthouse-baseline-clarification**：不是有效存檔的基線阻擋項。40與58的燈塔偏移差異只涉及T634關閉時帶lot574的人工k69物件。正常放置／讀檔不會給1×1燈塔lot574，因此先前有效存檔回歸警告已更正。 位置：`index.html:drawNightLandmarks413 / k69`。
- **aviation-hook-null**：已看到源碼修正，待精確提交CI。沒有aviation掛點的工廠已在掛點函式回傳null，工業夜燈疊層也會跳過；瀏覽器行為尚待精確CI，不宣稱已通過。 位置：`index.html:lotLightPoint574 / drawNightIndAvia413`。

本清冊不把本機Canvas出樣、Node守衛或靜態原文比對當作真Chrome視覺驗收。工程與視覺接受狀態均為 pending；目前也不宣稱實機55FPS。

## 來源

- `index.html`：REMAIN634、LEGACY634、ART634、RCI_CATALOG634、LOT_PLAN574、MSZ及繪製分派。
- `docs/tasks/t634-shots/asset-coverage-baseline.json`：main基線逐類新／舊路由與足跡。
- `docs/tasks/t634-shots/core634.js`、`civic634.js`、`industry634.js`、`rci634.js`：本批繪圖來源片段。
- `docs/SPR_PINS.json`、`test_fixde.js`與main差異：原有payload及原文釘更動。
- `coverage634.json`：同一清冊的完整結構資料與逐類舊SPR鍵索引。
