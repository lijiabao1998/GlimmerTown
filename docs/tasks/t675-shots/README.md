# T675：第三波工業工坊候選

狀態：十款原創英式工坊已在本地接入 index 並持續打磨，未完成 Chrome／CI／原生驗收，0/10 完成。此目錄不替代原測試。下列資料只作建築語彙靈感，不宣稱歷史復原；已看與未看照片的範圍另列。工作門、吊架、設備與場地構件為遊戲原創設計。

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
|8 鏈條作坊|[Mushroom Green](https://historicengland.org.uk/listing/the-list/list-entry/1343216)|低長磚坊、四個長側窗、兩側六煙囪；保持原工業發煙抽樣，不因出口多增加排放次數|低長量體與兩排成組煙囪，異於既有 L 型鐵匠坊|
|9 石灰窯|[Kepwick](https://historicengland.org.uk/listing/the-list/list-entry/1021190)|厚石方體、深拱出料口、頂部裝料孔與斜扶壁；原址靠坡，本款自立縮編石體|無住宅屋頂、無亮玻璃窗，以厚牆與深拱組成；不畫假坡／假河|

Lowestoft 329 Whapload Road 只曾作初步研究，其長排倉庫不支持本候選高窄煙塔，故沒有用作煙塔來源。

## 固定設計適用性

十款燃燒／通風煙口數為 `[1,1,1,3,0,1,1,2,6,2]`。只有款4穀倉沒有煙口。通風百葉不作亮窗；款2及9的深拱可有爐內暖光，不是室外燈光池。十款皆無額外招牌，無新增招牌功能。整合時仍須驗原遊戲疊層不越界，不能因候選圖沒有該層便宣布驗收不適用。

## 可重現候選檢查

需既有 `@napi-rs/canvas`。執行本目錄 `render-node.cjs <輸出目錄>` 生成日／夜、晴／雪四張十款接觸表；`candidate-contract.cjs` 驗50組（十款×四季無雪＋冬雪），確定性、非重複、夜層包含於實體、掛點及預先固定煙口數。

七個負控制分別刪除夜層、刪煙口、替穀倉捏造煙口、錯家族、煙掛點越界及夜光落於透明區、捏造浮空實體點，皆須在指定目標首次失敗。`candidate-contract.json` 記錄本次50組與七負控制通過；這不是原 verify 或整合路由測試。

`compare-existing.cjs <輸出PNG>` 只讀原 T634 台架，重畫既有鐵匠、織布、陶窯、啤酒廠供輪廓比對；不改該台架。已目視比較：新玻璃錐體成主量體、針織坊連窗與半四坡頂、鏈坊低長雙排煙口均不同；後續仍要在遊戲實際縮放與場景中檢查辨識度。

## 待完成

來源照片目視、原尺寸細節；實際路由、逃生閥、預覽與疊層契約；獨立獲准的 T673 家族清單相容性擴充；完整既有 verify／CI／精確 fp；每款 Chrome 覆蓋、native 原紀錄與效能取樣；審查、premerge及發布。不得用候選結果填作完成。

### 來源目視進度（2026-10-17）

已目視 NT Levant 頁面主圖（高石機房、低翼與煙囪）；Historic England 信號樓研究 PDF 第19頁、Figure 9 Chichester（四坡頂、木玻璃上層、磚底座、開放外階）；Lion Salt Works 的公開照片（木百葉牆／磚爐屋，依此將候選主棚長玻璃改為不發亮的百葉）。這些是研究核對，未把他人照片納入遊戲或提交庫。

其餘照片尚未全部目視：Historic England DP174858 檔案頁明示影像服務中斷；煙塔結構以已核對的1379882完整記錄為據。Dallas Dhu 圖片讀取受阻。玻璃窯管理方頁未能完成照片讀取，保留既有建築記錄來源與照片缺口。無法看圖的項目不宣稱已完成照片驗證。

`selector675.js` 是尚未接入的獨立選款草稿；`selector-contract.cjs` 驗121項，包含22個分桶、非適用建築拒收、快取50筆上限、URL／window閥及T596優先；另有兩個負控制驗證刪預覽讓出、放寬建築種類會被擋。這不等於遊戲實際路由已通過。

鏈坊已目視 Historic England 1343216 公開實景照片，依山牆成對鐵欄開口修正候選：端面兩口、長側四口，避免把正面當住宅玻璃窗列。候選冷烘軟體Canvas交錯A/B每款30組結果中，新款中位數約3.2–5.8ms、既有對照約6.7–15.2ms；這只用於製作階段，不能代替Chrome或實際路由熱快取驗收。

補充幾何檢查：五種季節／雪態的每一款實體alpha均只有一個8鄰接連通區；加入孤立像素的負控制會失敗。鏈坊煙囪基座已下降至穿入真屋頂的位置，避免高於低簷形成懸空；這仍需後續Chrome場景複核。

## 打磨候選與效能範圍

所有模型新增屋簷／砌縫、窗洞凹深、獨立門窗構件及各自用途設備。候選契約固定 50 組、7 項負控制，仍驗單一連通體／夜層留在實體內／固定煙口。render-details.cjs 為棚屋、玻璃窯、石灰窯輸出原尺寸和 5 倍並列；放大不平滑。這些圖只驗 Canvas 外觀，不替代遊戲內真 Chrome。

打磨中途軟體 Canvas 冷烘基準顯示模型3較舊款慢（中位 16.21ms 對8.26ms），其餘數據也保留，不能宣稱無效能回歸；最終新版仍須交錯冷／熱與實際原生記錄。所有新增細節只在 bake 中執行，熱繪仍使用精靈快取，沒有新增逐幀細節循環。

補充：空夜層尚未寫入前，略過無效果的 destination-out 清除；50 組 body/night 雜湊在此前後逐位一致。最新交錯冷烘中模型3中位8.22ms（舊款7.24ms），其餘款亦保留原數據，不能用軟體烘圖推論手機 FPS。新增 CI 斷言只追加四組，既有 test_fixde.js 前綴逐位保留；倉庫原 px601 與原生 Canvas 各自跑50組／七負控制，兩者不混為 Chrome。

## 接入複核補正

玻璃窯（2）與石灰窯（9）的爐口夜光不應產生舊 T149 半徑44的室外地面光池；只在本家族兩款外加適用性條件，保留原 T149／T671 內層條件、其餘八款和所有舊款。新 check-ground-glow.cjs 以實際原分支重放，原生／px601各驗十款與移除修復負控制；兩款夜遮罩逐位保留。仍待真 Chrome 圖核對。

cache-benchmark.cjs 對原 spr634 和實際 spr675 做交錯熱快取比較：每款30樣本、每樣本1000呼叫、200對預熱；原款中位0.232–1.426µs，新款0.141–1.167µs。完整p90及樣本數在 cache-benchmark.json；cold-benchmark.json 保留30組冷烘及模型3較慢結果。此為隔離來源量測，不宣稱瀏覽器、手機或原生績效。

量測標籤補正：上述候選冷烘腳本實際使用 @napi-rs/canvas 原生 Canvas backend；早期摘要誤稱軟體Canvas。px601是另跑的像素契約backend，不能混稱。數值未改，完整冷烘檔已更正backend標籤。
