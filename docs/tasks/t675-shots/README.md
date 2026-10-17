# T675：第三波工業工坊候選

狀態：十款獨立 Canvas 草稿，尚未接入 index，未完成 Chrome／CI／原生驗收，0/10 完成。此目錄不替代原測試。來源文字已核對；來源照片仍待完成目視核對，不能把搜尋圖說當成已看原圖。

## 原型、縮編與防重複

|款|建築記錄|保留的結構與遊戲縮編|與現有款差異|
|---|---|---|---|
|0 機房|[Levant NT](https://www.nationaltrust.org.uk/visit/cornwall/levant-mine-and-beam-engine/history-of-levant-mine-and-beam-engine)、[建築記錄](https://heritagerecords.nationaltrust.org.uk/HBSMR/MonRecord.aspx?skin=printerfriendly&uid=MNA100115)|石機房、低鍋爐翼與獨立煙囪；收縮至單格，非礦業玩法|窄高主樓與低翼高度差、巨拱窗，非既有規則多層啤酒廠窗列|
|1 煮鹽棚|[Lion Salt Works](https://historicengland.org.uk/listing/the-list/list-entry/1020841)|低木棚、長脊通風口、較高磚爐屋；縮短長度|長百葉屋脊，非鋸齒工廠屋頂|
|2 玻璃錐窯|[Red House Glass Cone](https://historicengland.org.uk/listing/the-list/list-entry/1076007)、[管理方歷史](https://www.dudley.gov.uk/things-to-do/museums/red-house-glass-cone/red-house-history/)|連續收尖開頂錐體、底拱、低側屋；非完整原址複製|主體本身是大錐窯，既有陶窯是山牆作坊旁小瓶窯；量體與入口不同|
|3 煙燻坊|[Grimsby Sidebottom Street](https://historicengland.org.uk/listing/the-list/list-entry/1379882)、[檔案照片條目](https://historicengland.org.uk/images-books/photos/item/DP174858)|高窄 L 型煙室、頂部通風開口、低工作間；原址多通風帽縮為三個，不冒稱精確復原|煙室大面實牆、頂部通風，非住宅式整牆亮窗；量體有 L 型頂輪廓|
|4 穀倉|[Historic England](https://historicengland.org.uk/listing/the-list/list-entry/1167827)、[NT 記錄](https://heritagerecords.nationaltrust.org.uk/HBSMR/MonRecord.aspx?skin=printerfriendly&uid=MNA141211)|木倉架在石墩上、突出門廊、半四坡頂；縮為六支點|實體架空結構與踏階，非既有貼地紅穀倉；無燃燒出口|
|5 針織工作間|[框架針織工坊檔案](https://historicengland.org.uk/images-books/photos/item/BB70/00391)、[Ruddington 記錄](https://www.heritagegateway.org.uk/Gateway/Results_Single_Print.aspx?resourceID=19191&uid=317760)|上層長連窗、下層入口、附屬低屋；小型化工作間|兩層長玻璃工作層＋半四坡頂，不同於既有三層分離小窗山牆織布坊|
|6 工業辦事房|[Historic England signal-box review](https://historicengland.org.uk/research/results/reports/6071/RailwaySignalBoxes_AReview)|磚底座、通透木玻璃上層、外階；僅把信號樓建築語彙改為辦事房，不新增鐵路功能|通透上層與實底對比、可見踏板支架，而非普通住宅外掛招牌|
|7 麥芽窯|[Dallas Dhu HES LB8689](https://portal.historicenvironment.scot/designation/LB8689)|方窯、反曲石板頂、百葉頂帽、較低倉翼；縮編大複合體|方形反曲頂與分層頂帽，異於圓形尖頂烘啤酒花屋及既有城市釀酒廠|
|8 鏈條作坊|[Mushroom Green](https://historicengland.org.uk/listing/the-list/list-entry/1343216)|低長磚坊、四個前窗、兩側六煙囪；保持原工業發煙抽樣，不因出口多增加排放次數|低長量體與兩排成組煙囪，異於既有 L 型鐵匠坊|
|9 石灰窯|[Kepwick](https://historicengland.org.uk/listing/the-list/list-entry/1021190)|厚石方體、深拱出料口、頂部裝料孔與斜扶壁；原址靠坡，本款自立縮編石體|無住宅屋頂、無亮玻璃窗，以厚牆與深拱組成；不畫假坡／假河|

Lowestoft 329 Whapload Road 只曾作初步研究，其長排倉庫不支持本候選高窄煙塔，故沒有用作煙塔來源。

## 固定設計適用性

十款燃燒／通風煙口數為 `[1,1,1,3,0,1,1,2,6,2]`。只有款4穀倉沒有煙口。通風百葉不作亮窗；款2及9的深拱可有爐內暖光，不是室外燈光池。十款皆無額外招牌，無新增招牌功能。整合時仍須驗原遊戲疊層不越界，不能因候選圖沒有該層便宣布驗收不適用。

## 可重現候選檢查

需既有 `@napi-rs/canvas`。執行本目錄 `render-node.cjs <輸出目錄>` 生成日／夜、晴／雪四張十款接觸表；`candidate-contract.cjs` 驗50組（十款×四季無雪＋冬雪），確定性、非重複、夜層包含於實體、掛點及預先固定煙口數。

六個負控制分別刪除夜層、刪煙口、替穀倉捏造煙口、錯家族、煙掛點越界及夜光落於透明區，皆須在指定目標首次失敗。`candidate-contract.json` 記錄本次50組與六負控制通過；這不是原 verify 或整合路由測試。

`compare-existing.cjs <輸出PNG>` 只讀原 T634 台架，重畫既有鐵匠、織布、陶窯、啤酒廠供輪廓比對；不改該台架。已目視比較：新玻璃錐體成主量體、針織坊連窗與半四坡頂、鏈坊低長雙排煙口均不同；後續仍要在遊戲實際縮放與場景中檢查辨識度。

## 待完成

來源照片目視、原尺寸細節；實際路由、逃生閥、預覽與疊層契約；獨立獲准的 T673 家族清單相容性擴充；完整既有 verify／CI／精確 fp；每款 Chrome 覆蓋、native 原紀錄與效能取樣；審查、premerge及發布。不得用候選結果填作完成。
