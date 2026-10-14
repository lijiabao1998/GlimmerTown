# T635 消防設施三方向本地候選（未批准，預設關閉）

> **最新狀態（2026-10-13 補記）**：標題與下文是候選階段的原始紀錄。bc9c70f 修正圖後已獲業主批准；發布版 v11.221 經 PR #17 合入 main 8d79bc42，普通網址預設啟用。正式同 SHA 必要 CI、deploy／verify-published 已成功，原生 Mac diagnostic 仍紅。本機收件完整套件另為 12594 PASS／1 FAIL（bootstrap VM 10 秒逾時），不能以遠端成功冒稱本機綠燈；詳見 Approved-fire-release 與 Local-receipt-records 補卡。原 12590／1 Windows FAIL、未批准階段與所有退修證據保留。

業主委派：先少量真正外觀不同的英式款，更多變體留未來 DLC；本次總三方向，k6 鄉鎮小站、k30 紅磚城鎮局、k61 現代區域中心，k95 保留。只有本地候選，不推送／PR／合併／部署。卡面只在本地留底，依業主明令不推卡。

基準：最新 origin/main `7ad6931eaa1bed87af053f8097b05a0e669656a6`，v11.218。獨立 checkout 與本地分支 `gpt/town-fire-three-candidates-635`，不改 C:/dev/glimmer-town、任何 bay、玩家 8123、Lab36 或 3D。

## 先量現況與設計

2026-10-12 真 Chrome 155 拍基準日夜各一張接觸表，各 25 格，涵蓋 k6/30/61 所有 lv1 鍵的新舊足跡及 k95。證據在任務工作區 evidence635/baseline/（不放 repo）。遊戲原檔 SHA256 `b714f4488e02bfd054681b918e4319126e12dd7efd00027bc8ad974c5361517c`。

- k6：五個鍵；v0/v3 紅磚雙門＋尖頂塔，v1/v4 白色現代站＋混凝土塔，v2 淺色古典站＋鐘塔。T590 已整鍵重畫，不能稱既有只換色。新建 2x2，舊城 1x1。
- k30：三個現代站結構：三門＋右側高塔；雙門＋左側開放鋼塔；轉角四門＋後方方塔。新建 3x3，舊城 1x1。
- k61：三個獨立結構：紅磚低車庫／辦公樓與混凝土塔；斜屋頂長車庫、辦公樓與鋼塔；玻璃辦公樓／車坪、紅磚塔。新建 4x4，舊城 3x3。
- k95：木、金屬、石腳瞭望塔三款，本卡零修改。
- 三類各可升至 Lv10；升級是既有能力／等級星，不隨候選增設新能力。足跡、入口連路、造價、COV.fire/fire2/fireHQ、消防派遣與車隊、存檔 v、bd.v/sz/lot574 不變。

候選總共三個設計，不是每類再乘三：

1. k6 單層紅磚單室、長向雙坡石板屋頂、寬木板雙門、低山牆鐘與煙囪、短前坪；去掉既有高塔，剪影變成低矮橫向小站。參考 [Tarporley 1865 舊站官方建築記錄](https://historicengland.org.uk/listing/the-list/list-entry/1391766)。它是歷史站，不能稱現役；[同名現代站](https://www.cheshirefire.gov.uk/about-us/local-fire-stations/tarporley-fire-station/) 是另一座建築。
2. k30 三層紅磚站房、陡石板坡頂與老虎窗、三聯淺石拱車庫、偏置六角塔、窄出車坪。參考 [Roman Road 官方記錄](https://historicengland.org.uk/listing/the-list/list-entry/1065084)；官方影像下載 403，未宣稱看過該影像，形體依建築文字與原生尺度設計。
3. k61 低橫灰色三門車庫翼、白灰／陶土色兩層辦公翼、清晰獨立車坪與短多層訓練塊。參考 [Huntingdon 官方站頁](https://www.cambsfire.gov.uk/find-a-fire-station/huntingdon-fire-station/) 與 [官方年報第26頁](https://www.cambsfire.gov.uk/media/3730/annual-report_2022-23_tagged.pdf)。已看官方辦公樓與三門車庫照片；独立訓練塊布局為候選構圖，年報證實多層訓練建築但不把構圖說成實物複製。塔／鐘／車輛皆純美術，不新增訓練、鐘警報、直升機或額外車隊能力。

## 定位錨與允許觸碰

- index.html：在 `if(bd.lot574)s=lotSprite574(...)` 與冬側版選擇之間，加一行只在 `t635On()` 開啟時替換 k6/30/61 的視覺物件；追加 `/* ===== T635 FIRE CANDIDATE BEGIN ===== */` 自含程序繪製與有界快取。原 S19、T591/T592、T634 已批准生成器和選款邏輯一字不動。
- index.html／sw.js：僅由 tools/bump.py 同步 local candidate 版號。
- docs/ARCH.md／docs/ARCH_MAP.json（若既有工具產生）、docs/SPR_PINS.json：只更新版本/行數/新錨，1586 原圖釘值不可改。
- docs/CHANGELOG.md、本卡、本地 claim。
- 不修改既有 tests/tools、外部遊戲依賴、功能、UI、放置／升級／火災／存檔／旋轉；所有外觀以原生 Canvas 程序畫，不引入圖片檔。

## 驗收（動手前固定）

- 原批准程式區塊 hash 不變，1586 atlas 鍵對同機原基準全數相同；原倉庫像素釘不得重釘。本機原 main 對跨環境釘值已有差異，須列出，不把它說成候選綠燈。
- ?T635=1 或 window.__t635=true 才出候選；?noT635=1／window.__noT635=true 即時回原批准圖。正常 URL 和逃生閥整幀對原基準一致，含日／夜／雪／旋轉／遠景。新圖開啟必有可見差異。
- 確定性零隨機抽數，候選 cache 最多 16 筆／120萬畫布像素；關閉不烘候選圖。夜光只落在本體／門燈，雪版不疊双層雪；新舊足跡不外擴。
- 以真遊戲街區與單體拍日／夜／四季／冬有無雪／四轉向／遠景；檢查施工 age0/4/8、懸停、倒影／濕膜、行人、夜燈、等級星。模型自檢不能冒充業主批准或第三方審圖。
- 相同原存檔新舊來回不变；真 GV.place／upgrade／fireAt 的足跡、連路、價格、升級費與 Lv、消防派遣／車隊／覆蓋與 tick 數字對基準一致。不可用「全套 mock 綠」代替行為對照。
- tools/verify.py（含六哨兵）與適用工具鏈檢查照實記錄；不跑大規模無關 benchmark，不靠重跑賭過。
- 審查使用凍結原檔作獨立真值，保留候選修改 patch 和完整結果，未經第三方的部分要明列。
- 正常 Library 支援路徑送預覽；若失敗報明確阻塞，不搬 Lab 舊檔、不造連結。

## 回滾

候選預設關閉；用上述 noT635 開關即時回原批准圖，或移除本卡單行選圖插入和自含候選區塊。不回退 T634/590/591/592。

## 實作與證據（2026-10-11 UTC／本機 10-12）

已實作上述三款程序原生圖、各自新舊足跡、日夜與雪版。只加一行 draw 選圖、約100行自含函式；借既有 makeIso590／lotPoly574／lotLine574／lotEllipse574，不加入外部圖片或依賴。共三設計，不新增設施、價格、功能、車隊或訓練能力。v11.219 只是本地候選。

`evidence635/preview/preview635.json` 的候選源 SHA256：`6655aadae3d37b1d80bf67043181b5d987838a53b05cca8eddcaf2ed4e4053a4`。扣除本卡新增區塊／單行與版本字後，全部原碼與上述 v11.218 基準逐位相同；S19／T591／T592／T634 原批准程式未改。原 docs/SPR_PINS.json 的1586值逐位保留，只更新版本 metadata。

| 驗收 | 實際結果／證據 |
|---|---|
| 現況消防全變體 | 真 Chrome 155，日夜各25格；k6五鍵、k30三鍵、k61三鍵及k95三键，含新舊足跡。approved-fire-day/night.png |
| 既有素材 | 同一Chrome對凍結main，1586 atlas鍵零變動、零增刪。preview635.json |
| 全幀回退 | 日、夜、積雪、rot1/2/3、遠景共7狀態：正常URL與執行期關閥均與原檔PNG逐位相同；開候選全有可見差異。URL noT635 另驗日景相同 |
| 季節與光層 | 春夏秋、冬無雪／積雪皆實拍；6個新舊尺寸×日夜雪，夜光孤兒0、邊緣裁切0，每張都有實際亮窗／門燈 |
| 真建造 | 2x2/3x3/4x4，refs=3/8/15，扣款400/800/1600，與原檔逐位相同 |
| 施工／升級 | 真step：age 0→4→8→9→12；新設施Lv2扣280/280/600，舊城Lv3扣661/661/1416，與原檔相同 |
| 舊檔往返 | 新舊兩座固定fixture：slot3真save/load/save，全部語意欄位相同（只排除時間戳）；sz/refs/v/lot574保持。full-behavior635.json |
| 火災／派遣 | 三個真ignite，車輛確實派出並抵達，樣本8/13/27次更新，完整80次派遣／tick軌跡、經濟、COV及存檔與原檔逐位相同。behavior635.json |
| 抽數 | 真R/rand/Math.random監聽，12次重烘各0次；六哨兵仍780/2297/117/77/639/14523 |
| 倒影 | 三類原生 reflectSprite 本來就回 null（多格先排除，單格不列入），候選維持相同；沒有擅自新增倒影支援 |
| 疊層自檢 | 已看age4施工樓板／鷹架、hover-night淡出、wet-day濕膜與原生街道圖層；只畫本體，保留原生UI。施工0/8亦有截圖 |
| 對抗紅源 | 移除候選選圖→首紅 candidate-visible；忽略 runtime 閥→首紅 escape-frame-parity。兩案皆先真Chrome開機，非語法錯誤 |
| 同色剪影 | evidence635/same-colour-silhouettes.png：從同份程序函式作單色幾何補圖，低山牆／陡坡角塔／低橫翼與後方塔塊可分辨；此補圖用software Canvas，不冒充原生瀏覽器驗收 |
| 工具鏈 | 原樣 python -B -m unittest tools.test_toolchain，63 tests OK。Sandbox第一輪清Temp權限失敗；正常native執行成功，只動測試自己的Temp fixtures |
| 完整守衛 | 基準main與收口前候選皆PASS=12587；卡面／CHANGELOG收口後最終PASS=12590（新增帳目檢查），六哨兵與其餘閘門通過，但同一T602 G1 Windows台架 SyntaxError（octal escape）使verify.py RED；未改舊測試、未放寬閘門、不宣稱ALL GREEN |
| 原發布像素釘 | 本機Chrome155在未改main時已出現跨環境差異，原釘值未重釘；只以同機原main逐鍵／逐幀恆等證候選沒有額外變動 |
| Library | 正常 create_library_file 成功保存 `/Town-fire-three-native-preview.png`，libfile_ace20b91341c81919947bd3cfa56a43e，file_000000005e3081fd9cace5be6491878c；本機Windows無os.setxattr，身份xattr寫回失敗，收據另存JSON，不冒稱已套用 |

採用1560x1000桌機、拋棄式headless Chrome 155，獨立隨機埠、載入前slot3，Browser plugin未提供。每次只一個Chrome，前一輪結束再跑下一輪。美術預覽是暫停且通電的布局fixture（不是自然長成城市）；功能lane另走真正建造／供電／水網／施工／升級／派遣。原native HUD、工具列和夜燈皆保留，最後畫面等待原boot罩自然消失。

曾抓到並修正的本卡問題：①測試插入字串中$'遭replace解讀，改callback，原main語法本來正常；②建路瞬時粒子造成135像素差，固定已完工拍攝時鐘與粒子初態後7場景全恆等；③本卡局部畫點函式叫R，撞到T590字面守衛，改名pixel635，沒有放寬舊守衛；④最初全頁截圖仍有開機罩，已等原生完成後重拍，舊失敗圖不交付。

## 第一輪交付時的未驗與待確認（後續覆核／修正見下節）

- **未經第三方覆核與業主圖審**。目前為作者目視自檢、凍結原檔作獨立來源的行為／像素對照與兩個定向紅源；沒有把同作者自檢冒充第三方審查。交父端／業主看圖選定後才能另談整合。
- 沒有推送，所以沒有新CI／部署驗收；本地完整verify保留原有T602紅燈，此提交只是可審的本地候選，不是可發布綠燈。
- 未量前景真實FPS、冷開機／長時間手機效能；沒有跑大規模benchmark。未測手機viewport、Mac或多款Chrome。滑鼠實際拖拽／滾輪／pointer hover未專項驗，四轉向／zoom以原生GV鉤子驗。
- 施工與濕膜／淡出已實拍目視；未逐像素量樓板、遮擋alpha或每種行人路徑。消防設施沒有設備煙掛點，本卡沒有添假煙；原生反射不支援這三類，維持不支援。
- 已看Huntingdon辦公樓與三門車庫照片、年報第26頁；Roman Road官方照片下載403，依官方建築文字設計，不宣稱照片忠實複製。訓練塊配置是候選構圖。
- 使用者一般存檔沒有讀取：只用隔離slot3合成新舊fixture，非玩家私人城的實測。

**本地提交界線**：依本次業主明示「提交本地候選」保存可審快照。已知未改main同樣紅的Windows台架限制仍保留，不能把本地備份解讀成CI通過／發布授權。遠端收口前再次ls-remote仍是7ad6931，沒有覆蓋任何Claude／main成果；所有執行程序只關自身隔離profile。

## 日夜遮擋覆核與修正（後續委派）

未參與繪製的 `/root/fire_visual_review` 直接看原生單體、整街、日夜、雪、四方向、遠景、施工／淡出／濕膜、同色剪影與官方 Huntingdon 像素，並自讀英國官方資料、全部 diff、原程式及 1586 素材值。確認三款結構不同且批准 main 保留，但找到 P2：後畫的山牆／塔身／辦公翼只遮日層，夜層燈光透過不透明實體。原報告在 evidence635/Independent-visual-review635.md，三個 PNG 樣本為舊 k30 `(735,637)`／171 像素、新 k30 `(902,237)`／50、舊 k61 `(1300,682)`／48。作者另以獨立 PNG 取樣程式重現相同三組數量；不能以天空 orphan=0 冒稱無穿牆。

使用者明確授權修正及同一 Library 預覽更新。本地修正只在 T635 自含繪圖區塊：每個後畫不透明面、線、像素與樹冠，先以相同原生光柵足跡 destination-out 清除被遮住的夜燈，再照原日層配方繪製；直接夜燈筆畫不清除自己。日層幾何／顏色／順序、footprint、入口、SPR、能力與存檔不變，原 noT635 回退保留。local candidate 版號改為 v11.220，未發布。

修正前 index、所有 preview／behavior、已交 Library 圖、獨立 finding 及逐像素樣本完整保存在 evidence635/pre-fix635-5fc3ff3/，不覆寫；Library 舊圖 SHA256 033eb79156ee02f384ff438ce713075437d3c5b4ef27c9ced9976777b33567db。

T602 原始 FAIL 保留：舊台架把 Windows root 文字插進另一層模板，`\2026` 在 strict eval 成八進位 escape；native inline syntax 本身正常。僅記憶體將 __dirname/__filename 作函式參數傳入，原 body 所有 175 assertions 及 main/candidate T602_RESULT 完全相同。未改 repo 測試、門檻或執行環境；診斷不抵消正式 verify 紅燈。詳細證據 evidence635/t602-diagnosis/。

修正後已執行的原生回歸：Chrome155，slot3，單一瀏覽器序列作業；新／舊 fixture 各13狀態（四方向日／夜／積雪＋遠景），合計26組 base=default=escaped 全PNG逐位相同。1586原圖集鍵零增刪、零pixel變動。六種 footprint 的day/night/snow/snow-night：裁邊0、sky orphan0、已確認三色 opaqueWarm0、真實燈光仍>0。白天與白天雪景 single PNG 對封存前圖逐位相同。原三個PNG缺陷樣本夜RGB變為 `(97,80,77)`／`(104,88,79)`／`(128,141,143)`；171／50／48變0／0／0。新增負向來源只把occlude635改no-op，原生Chrome重現三種穿牆（native mask11／19／12點），第一失敗 opaque-night-occlusion，同時舊sky orphan檢查仍0，證實新守衛非假綠。

原生行為 lane：新建2／3／4占地、原費400／800／1600、refs3／8／15、實際step施工age0／4／8／9／12、Lv2／舊Lv3升級、save-load-save語義、三次真ignite與80次派車更新（到達sample8／13／27）、完整模擬tiles／finance／coverage／車軌跡對冻结main一致；R／rand／Math.random0；反射仍按原不支援處理，沒有新增功能。瀏覽器錯誤0。詳見 evidence635/preview/preview635.json、behavior/behavior635.json、night-occlusion-fixed635.json。下一節將以真正再覆核與正式守衛結果收口。

修正後收口：獨立再覆核 `/root/fire_visual_review` 未參與繪製／修正，直接實看新舊四方向24張日夜雪、2遠景、HUD、day/night/snow/snow-night單體、施工／hover／wet及原前圖／負控制；自行逐像素驗原三座標與171／50／48→0。負控制整PNG與封存舊夜景逐位相同；有效玻璃亮像素189／979／721／36／324／801仍在，未見整窗或入口燈被误清。獨立再覆核 No findings，原P2解決；並自行驗26組base=default=escaped、day/snow原圖、整份批准碼及1586釘值均保留。完整原文 evidence635/Independent-visual-rereview635.md。這是獨立代理覆核，不是業主圖審或外部人類第三方批准。

原正式 verify.py 最終仍 RED：12590 PASS／1 FAIL，只剩原main同現的T602 Windows octal escape；六哨兵780／2297／117／77／639／14523全匹配、syntax／CRLF／版號／184地圖錨全通過。verify-fix-closed635.log保留真實輸出。收口前兩次326 PASS早停為作者漏寫CHANGELOG `驗收:` 欄，原失敗log仍保留；補回具名欄後才恢復12590，不修改守衛／門檻。工具鏈來源未變，本輪未重跑無關63工具鏈／benchmark，第一輪63 tests仍為已執行歷史證據。

Library同一項目 `/Town-fire-three-native-preview.png` 已正常replace到version1，libfile_ace20b91341c81919947bd3cfa56a43e保持不變；新file_id=file_00000000dd7081fd858e4c50a66b2d4c，717192bytes，1560×2952，SHA256 b45ed6a0c10ea55029b6f51fd29a71c58a36f772de82225b484b6c5bb2466a58。native Library read可正常返回新版。原version0及原PNG封存；没有另建Library文件。Windows缺os.setxattr，官方metadata helper失敗，身份／version／xattrs及錯誤存JSON；沒有繞過環境或冒稱本地metadata已套用。

目前candidate index SHA256=4a89ed0c069211fe1967102ebe11eb9a9d9f917bbae4496d628c75c8e7e1b751。遠端main再次核對仍7ad6931；既有Claude工作區未動。新版仍預設關閉、只有本地候選；無push／PR／合併／部署，待使用者新版預覽確認。手機／Mac／前景FPS／冷啟動與長時效能未驗；pointer拖曳／滾輪未另測；已測原生GV旋轉／縮放。靜態取樣不代表每個可能遮擋情境已窮盡，但原三例與四方向鄰街已覆核。
