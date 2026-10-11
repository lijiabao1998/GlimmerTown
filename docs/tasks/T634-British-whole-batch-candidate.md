# T634 全城剩餘英式美術候選（住宅、商業、工業與所有未換新類型）

## 授權、順序與 claim
業主 2026-10-10 明確批准「一批做完」，包含住宅、商店、工廠，並批准施工方選用未占用任務編號、發布任務卡、推送候選分支與建立草稿 PR。T634 接在已合併 T633 之後；從最新 main `d88e36d866226ac182dd92ecab63c29a540a4ef8` / v11.214 開始。施工：GPT。分支：`gpt/town-british-whole-batch-634`。不合併、不部署、不碰玩家目錄或 8123。新圖保持候選預覽開關關閉，業主看圖確認後才另行討論正式啟用。

2026-10-10 22:25 UTC 查核：main 最新為 T633；遠端 Claude 分支均為 T626–T633，無 T634；僅開放 PR #2 舊 T603 與 #3 舊 SW 修復，main 已包含乾淨 T603 與後續修復。既有已批准素材保留，不因其風格不同而覆寫。

## 固定目標與覆蓋
133 建築種類逐類列帳。新增目前仍舊圖的 69 非住商工種類，以及 k1/2/3 每類 3 等級 × 12 款，共 108 住商工組合。每個非住商工種類至少 3 種結構變體，不能只有換色。以英式紅磚、暖石、板岩屋頂、煙囪、凸窗／豎窗、山牆、門廊、鐵柵欄為建築語彙；工業、能源、交通及運動設施保持功能可辨識，不把所有設施畫成住宅。

必須同時盤點現行新園區及無 lot574 的舊檔路徑；11 個已批准園區類型 k8/29/53/60/63/66/85/88/92/104/117 的舊檔缺口需要只讀視覺適配，保留已批准源圖及實際足跡，不能擴地、改存檔或重寫 bd。所有其他已批准 T590–T603／四類高樓圖像不動。

## 定位錨／允許觸碰
- index.html：新增獨立 T634 Canvas 工具箱、具名家族工廠、樣式目錄、按需有界快取及 opt-in 開關／noT634 逃生閥；不增外部執行期依賴。
- lotVariant574、lotSprite574、lotHooks574、lotKey591、lotV591、bakeLot574 的 T634 分派；draw 建築精靈選擇、reflectSprite 及相關煙／夜燈／季節／施工掛點的本批視覺分派。保留原始分支作逐位回退。
- test_fixde.js 僅新增本批守衛；因新接線必要而變動的原文釘必須逐條說明，既有行為判準不得放寬。
- docs/tasks/T634*、docs/tasks/t634-shots/*：固定卡面、完整清冊、Canvas 預覽、測試、圖片與結果。
- docs/ARCH.md、docs/CHANGELOG.md、docs/SPR_PINS.json（既有 payload 不改，只在需要時增加新鍵）、tools/spr_families.json（只追加）；sw.js 僅版本同步。
- .github/workflows/town634-candidate.yml：候選專用無部署驗證，完整原閘門、真 Chromium 圖像及回退／存檔測試。

## 禁區
tick／AI／經濟／成本／容量／放置邏輯／MSZ／存檔格式與內容／世界 RNG／T596 與 T600 預設狀態／既有已批准像素。禁止刪除既有鍵，禁止統一換色假裝全批完工。禁止放寬守衛、跳過紅測試、在 main 或部署目錄施工。

## 驗收條件（實作前固定，不准改鬆）
1. 完整 133 類新舊路徑清冊，每類標示保留、新製或舊足跡適配；108 RCI 款逐項列出，不得遺漏。
2. 真 Chromium 完整接觸表：本批全部款式，日／夜／春夏秋冬、雪有無；整城街景含 RCI、公共服務、交通及工業；四視角、遠景、施工、懸停、倒影、行人、煙、招牌狀態。圖片由業主定稿，工程綠燈不代替美術認可。
3. 既有 SPR 指紋 payload 零變動；T634 預設關及 noT634 逃生閥整幀與基線逐位相同；同一執行環境、凍結相同視覺输入。
4. 完整 verify.py 全綠、六個哨兵恆等、工具鏈套件；至少三個種子舊存檔載入→儲存→再載入欄位不變，包含無 lots574 舊格式。
5. 新守衛有獨立規格真值與故意改壞紅源；首紅落於目標守衛，不用自產表自證。
6. 視覺快取有界，零每幀烘焙／像素回讀；按倉庫標準先做至少 30 組新舊交錯中位數／p90，不把 headless 計時冒充實機 55 FPS。
7. 本體變動才 bump；ARCH map 同步；不寫死新的執行檔雜湊／版本在驗證工具。
8. 最終精確提交 CI 綠才可稱驗證完成。草稿 PR 不代表合併或上線許可。

## 基線與已知環境限制（施工前）
初始 verify 在本雲端環境通過語法、CRLF、版本與 ARCH，於 T270 PNG 生成器環境不一致失敗（4035 PASS，哨兵尚未執行）；已依倉庫原有 tools/setup_t602_zlib.sh 裝設隔離 zlib-ng/Pillow，重現三張 PNG 的原始精確 hash，原資產及斷言不改，正在重驗。
本地 Chromium 因執行環境 socket() Operation not permitted 無法啟動；不能以 Node mock 代替。使用候選 CI 的真 Chrome 產圖與驗證；未取得真圖前不得宣稱完成。

## 回滾
候選預設不啟用；?noT634=1／window.__noT634 即時回舊路。最終提交可 git revert。所有原始 SPR 與舊分派保留。

## 沒做成的事／驗收結果
已實作，仍在候選驗收中。首次本體提交 136e3532b32b8e30821a514bdf22cd277fb8b5c0，草稿 PR #16；沒有合併或部署。完整 133 類路由、108 住商工設計及 207 設施款目錄見 coverage634.json／coverage634.md。

- 原 main 基準：12569 PASS、六哨兵、工具鏈、真 Chrome 133 類現行與舊檔接觸表全部通過（run38091948939）。
- 首輪候選真 Chrome：RCI1440 狀態／80PNG、設施3504 狀態／200PNG與世界／舊檔場景任務通過（run38093281630）。完整回歸仍紅，不能視為整批完成。
- 已保留首輪失敗並修正：T557 卡面未具名、T549 指紋版本 metadata 未同步、T403c 不必要的牧場原文變動、T445 新煙粒足跡的精確原文釘。沒有放寬行为閾值。
- SPR_PINS 只同步版本 metadata，全部1586既有payload原樣；原 fp_snapshot.py 僅認 Windows Chrome，本雲端不可執行，改由同一 CI Chrome 的原git基線／候選逐鍵與整幀比對提供真實像素證據，絕不把 metadata 改動說成新測量。
- 精確末版仍須重新跑全套、煙／旗／轉子／舊狗公園角色與施工掛點、紅源／cache守衛，並交業主預覽。CI 綠燈、圖審、合併與上線分開。

## 2026-10-10 建築細化修訂（業主要求後重新出圖）
業主看過首輪住宅／商業局部預覽後要求增加建築細節。此版增加凹入窗框、窗楣窗台、門廊與店面層次、牆角砌石與磚石分層、簷口板岩、煙囪帽，以及公共與工業各自的功能細節。完整315款仍逐項列帳，未改款由 detail634.cjs 逐一列出，不能把比較或工程檢查當成業主已審美術。

新版比較以業主看過的 immutable 136e3532b32b8e30821a514bdf22cd277fb8b5c0 為前版，兩個隔離 Chrome 頁面、同相機同光照，輸出全315款日夜源圖、具名細節和合成／真實seed22街景；slot3，禁止自動儲存或推進模擬。

前次9ae65dc6的兩個紅燈保留：T574 G8d遠景原文釘已恢復原行，T634專用rotorBase在原行之後清除；世界工具誤用普通園區工廠處理已批准k5，改呼叫原bakeArt601。後續本地全套到12355 PASS才遇到T590 G5a旗子原文釘，現在只新增精確T634旗鉤條件，原有分支與斷言仍在。T596煙粒實際足跡原文釘同步相同sz三元式。待本次精確提交全套重新驗證，尚不宣稱全綠。

- 8e210acd 本地回歸的 T574 G14g 原文數量釘：因新增兩處 T634 舊狗公園足跡換算，lotGround574 呼叫從3變5。守衛改為嚴格要求總5、其中恰2是T634原足跡分支，原3個深度推送仍恰3；不放行任意呼叫或取消行為測試。真Chrome另驗四向實際狗／主人可見像素與錯誤深度紅源。

## 8e210acd 擴展世界實測後的修正
- 真Chrome完整保留／退回／存檔／懸停等3268項通過，32項紅。24項來自角色工具將T429休閒訪客誤算遛狗主人；改以呼叫來源區分，原訪客照畫，專屬狗與主人仍逐一驗身分、幀、座標、尺寸、可見像素，深度紅源保留。
- 8項是真問題：新k3單格與舊k58三格足跡的煙粒在本體前繪，出生點被屋頂覆蓋。orderSmoke634僅在T634開啟時，將符合實際足跡的候選煙粒附於所属非lot本體之後、前景鄰樓之前；不改煙量、掛點、年齡、漂移、色彩或建築/存檔欄位。既有lot排序及非候選／旗關路径原樣。新增獨立順序守衛與no-op紅源，真Chrome煙粒可見性守衛不放寬。
- 細化版315款日圖都與136e353不同，289夜層更新、26夜層未變；56張真Chrome對照產出成功。日夜整城光照仍遵循原有調光，不把源圖夜層合成視為實際街景亮度。
- 修正前本地完整verify已達12572 PASS與六哨兵不變；本次煙排序修正必須再跑精確提交CI，仍未取得合併或部署許可。

## 2026-10-11 參考 Lab 全批重製（施工前固定補充）
業主最新要求「Town 你參考 lab再重做一下 GPT」。沿用本卡、315款授權範圍及既有候選分支，不將美術修訂誤當合併或部署批准。03:50 UTC 核對 Town main 仍 d88e36d866226ac182dd92ecab63c29a540a4ef8、候選873ea1d4ad62fb92a286a02068e4fceaee314214，Lab main 54ecba5e186c1b2a8b258aae2be2ebe11d13efe6；Claude 的 Town 既有分支止於 T633，Lab 無開放 PR。Lab 全程只讀。

實際圖像診斷：873ea1 街景的單格高層過於細長，密集淺色窗框和腰線壓過磚石面；公共設施部分量體在大地坪中偏小。Lab T717 真實遊戲樣張則有寬實量體、厚板岩屋頂、清楚暗面與凹窗。歷史 Lab 圖明示其來源95f7d430，不能冒充54ecba5e新截圖；最新Lab美術文件與源碼另行只讀核對。單格 Town 不照搬 Lab 2×2 的像素尺寸。

本次僅改既有允許區：core634.js、rci634.js、civic634.js、industry634.js 與其 index.html 生成塊；t634-shots 的完整帳冊、針對性守衛及圖審工具；T634任務卡、ARCH、CHANGELOG、SPR_PINS版本 metadata、sw.js版本；候選workflow僅比較基準與新增本次驗證。掛點與實際足跡仍須保真，不改玩法、保存、既有批准美術。

新增且不得放鬆的驗收：
1. 全315款對873ea1逐項日夜源圖比較，列出變更／未變更；不得只改色後宣稱重製。RCI須可見的量體比例、樓層節奏與屋頂結構改善；設施須功能可辨、材質大面與前後層次可讀。
2. 保留原315款身分與結構變體、既有133類清冊和全部舊檔路徑；不擴足跡、不改保存欄位。
3. 給出相同相機／同光照的真Chrome街景前後PNG、全批接觸表及近景；原日夜四季、雪、四向、遠景、疊層／煙／角色全部守衛照跑。新圖必须来自本次精確提交。
4. 原完整verify、六哨兵、工具鏈、既有像素／預設關與逃生閥逐位比較，及原紅源仍須通過。任何新守衛須有独立規格真值及首紅落於目標的故意改壞來源。
5. 重新量30組交錯暖幀，零每幀烘焙／回讀及有界快取；headless結果僅作參考。先全部完成候選再整批交業主看，不逐小批索取審美決定。

回滾仍為既有noT634逃生閥與候選提交回退。前版873ea1本體及已展示圖片完整留存；未完成項與真實紅燈會追加記錄，不更改原验收門檻。


## 2026-10-11 同棟附屋相交與相鄰比例修訂（施工前固定）
業主看過 fd7a6df 真 Chrome 新圖後指出部分建築像非法疊在旁棟、排列比例不自然，要求先修 Town 再看圖。既有六項 CI 全綠不代替此視覺驗收。沿用候選分支與檔案 claim，不合併、不部署。

已追溯回原圖：合成街景 root (28,29) 的 3_2_4 維多利亞啤酒廠，以及 root (34,23) 的 1_1_5 花園郊區坡頂屋，都各有一個1×1 root。前者一層附屋簷高23、過窄且高屋脊；後者附屋約31.6%基底侵入主屋，整附屋後畫而未裁切內部屋頂。不能只因存檔足跡沒變就說幾何正確，也不能拉開原場景來遮掩。

固定驗收追加：
1. 逐款掃描315設計的量體基座／足跡，區分同棟接合、明示垂直退台與跨地塊溢出。修正相交屋頂、無意穿牆、狹長單層附屋與不合理畫序；不得用透明裁圖抹掉真正超界或刪除守衛。
2. 上述兩棟必須保留其原相機、原街景和原座標的 fd7 前後比較；另加同相機單棟／密集相鄰比較，四向日夜。新場景不得代替原問題場景。
3. 修復須有可獨立驗證的結構守衛與故意還原問題的紅源。全315源圖、既有四季夜層、舊足跡、煙／轉子／角色、存檔及原回歸照跑。
4. 本體與生成片段、對照工具、coverage、ARCH／CHANGELOG及版本元資料仍在已 claim 範圍。fd7源與原圖完整留存，最新精確提交重新CI後交付真Chrome PNG；圖像判斷以業主新回饋為準。


## 2026-10-11 業主批准發佈（施工前固定）
業主已看過7105c585的修正街景、两棟修前後與單棟／相鄰圖，明確要求「沒問題，上綫吧，成功之後待命」。7105c585六項候選CI全綠。發佈只將此已批准美術改為正常進站預設開啟，保留noT634和window.__noT634立即回退；不再改任何圖形、比例、材質、模擬或存檔。

原候選預設關閉條款仍是歷史驗收紀錄。本次有授權的唯一行為差異是预設開啟；explicit window.__t634=false仍可供独立旧路對照。正式來源變動同步版本。

允許觸碰／claim：core634.js內t634On旗標與註釋、index生成塊及GAME_VER、sw.js版本、ARCH/CHANGELOG/SPR_PINS版本metadata；T634卡與release634說明；check634/scene634只追加發佈旗標及逃生閥驗證，既有幾何／畫像／保存判準不得放鬆；新增release634真Chrome腳本證明對已批准7105全315款及日夜整幀恆等；候選workflow接入該脚本，main Pages workflow僅將候選分支加入非部署驗證觸發。

固定驗收：
1. 無query正常進站即開啟；?T634=1相容；?noT634=1與window.__noT634回原圖。新增首紅落點控制，不能只檢源文字。
2. 全315款日/夜與已批准immutable7105的像素完全相同；相同相機四向日夜街景像素相同。不得重畫或以新基線容納差異。
3. 完整verify、六哨兵、工具鏈、T634既有世界/角色/煙/季節/保存及全部紅源保持，正式Pages預合併驗證全綠。
4. 非作者獨立覆核，核對main及候選未漂移後由非作者合併精確已驗SHA；不force、不覆蓋他人工作。
5. main正式工作流validate/browser/package/pages-browser、deploy及verify-published通過，確認正式HTTP資產版本與真Chrome首次進站/存檔/離線重開。不得把只合併或只部署綠冒稱正式驗收成功。

回滾：noT634即時回舊美術，或正常revert發佈提交；保留舊SPR與分派。玩家電腦/8123與Lab不動。未做成：此段為實作前卡面，發佈切換與正式部署仍未執行。

### 發佈台架補充（更動測試前固定）
獨立覆核與實跑確認：test_fixde.js 的通用 Canvas getImageData只回4個透明位元組，原套件已將T602/T603全局關閉以驗舊路；T634預設開啟時在第1114項的普通forceDraw得到空圖拒絕。這是台架不能造新像素，不把它修成產品允許空圖。
追加允許觸碰test_fixde.js：只在既有T602/T603舊路設定旁加入T634舊路設定與明示此lane範圍；原全部斷言／六哨兵／完成標記保留。T603獨立舊配方測試因此照原路運行。沒有把它當成default-on驗收。
新增不可豁免的補償閘門：release634在真正Chrome、普通無query網址且無__t634/__noT634 override，重跑相同72格/難度1/AI400天的seed301、7、22人口與金流六哨兵（780/2297，117/77，639/14523）；並檢查開圖/畫圖/存讀前後新圖始終開啟，正常新圖存檔重開保真。全315已批准像素／四向日夜逐位恆等與既有T634世界3500級真Chrome行為驗證仍必須通過。此明示舊路Node lane＋新路Chrome lane不得合稱只靠逃生閥安全，也不更改模擬或像素預期值。

### main正式發佈閘門補充（工作流改動前固定）
獨立覆核要求新增default-on證據不只在候選分支跑一次：允許main Pages工作流新增required approved-art-release job，執行同一release634真Chrome無query/六哨兵/存檔/批准圖恆等；deploy.needs必須包含此job。既有validate/browser/package/pages-browser全數保留，原native計時參考規則不改。候選分支先跑相同所有閘門，main合併SHA再跑一次才可部署。baseline634辅助圖明示?noT634舊路與escape baseline標籤，不能冒充新正式預設。


### 原生濾鏡覆蓋台架修正（施工前固定）
68c3的7項候選CI已通過；此前acafd的Pages world在完成308正常新圖／308舊路／308only-new-escape畫面後，因舊的三條濾鏡覆蓋判準而失敗。實測正常新圖308幀全部shadowCalls=0、fractionalCalls=0；舊路與only-new-escape各有90幀真正陰影，且全部像素與immutable main相同。原因是目前133類正常新圖均帶既有__t590標記和落地影，原renderer有意不重疊壓扁陰影；不能改批准圖來製造呼叫。失敗原樣保留。

獨立覆核及非作者發佈方已確認：這是路徑覆蓋修復，不降低像素或行為閾值。追加claim僅tools/pages/release-world-filters634.cjs及其測試、tools/pages/release-correctness.cjs的exact allowlist接線、tools/pages/release-acceptance.test.mjs的附加守衛；T634 release634.cjs/md與CHANGELOG。禁止修改凍結scene603.js、native-correctness.cjs及其身份釘；index/sw/315美術完全不改、無版本變更。

固定驗收：
1. 原正常308矩陣、原逐像素／state／draw count比較和固定種子存檔不動；不可覆寫或追加fallback資料到原256/32/16/4陣列。
2. 額外同城同鏡頭32組fractional＋4組aligned mobile，僅同步設置真正支持的window.__noT591=true，T634新圖仍開啟。每幀記錄實際T591/T634/T603狀態，finally恢復旗標值及own-property，不改快取或city資料。
3. baseline和candidate使用相同fallback fixture；candidate只設新escape的對照必須與immutable main全RGBA零差，原state/draw count要求保留。三條原native filter覆蓋謂詞原样在明示fallback資料上執行；沒有假計數或換低門檻。
4. 保留原正常反射wrong-edge紅源，再加夜間fallback陰影專屬wrong-edge紅源，要求真像素受損、恢復後零差。exact-anchor與反向還原測試证明overlay無旁改。
5. release634的原360幀另加透傳native filter計數，直接比較批准7105與release的實際呼叫；原315日夜／6哨兵／存讀／3紅源與零錯誤完整保留。
6. 完整本地工具／回歸及精確新提交候選與Pages required CI重驗；舊紅與advisory均保留。沒有全部required綠不合併，非作者負責merge。

回滾：還原本補充測試overlay及接線即可；產品來源維持同一批准版本。當前為施工前卡面，尚未聲稱修正CI通過。


### DPR2 首紅證據隔離診斷（施工前固定；非驗收）
178007 的候選7項成功，但正式 Pages world 在 aligned-dpr2-day 正常新圖／T591 fallback 的 frameValid 綜合判準首次失敗；失敗 frame 原先尚未保存，不能猜測 unstablePixels 或將候選綠燈當發布成功。原178007紅證據、PR16及正式閘門不動。

非作者發佈方已同意從178007建立 gpt/town-634-dpr2-diagnostic，僅 contents:read、無deploy 的隔離診斷。此為同一問題的第一輪針對性DPR2診斷，不新建美術或效能追蹤工程。

允許觸碰：本卡與claim；tools/pages/release-world-filters634.cjs及其測試，僅首紅證據／逐项子判準／透傳保留原兩次getImageData之RGBA；新增 tools/pages/release-dpr2-diagnostic634.cjs與測試；新增 .github/workflows/town634-dpr2-diagnostic.yml；本卡追加實測結果。不得修改 index/sw、批准315圖、凍結scene603/native-correctness、現有workflows、正式frameValid或三條filter門檻。

固定驗收：
1. 首個失敗frame須在原check前保存：原PNG、原兩次readback的A/B RGBA、差異像素數/bbox/具體RGBA、逐項判準、旗標與相機、精確來源身份。
2. 透傳spy不得新增getImageData、forceDraw、warmup、重畫、重試或容差；finally恢復原方法descriptor/value/own-property。保留原first-failure與門檻。
3. 最小真Chrome診斷先重現同36組fallback前序及DPR2首紅；可只略去無關原正常308長矩陣，明示不等同驗收，未重現不算修復。輸出manifest列出每個精確省略段並可反向還原，保留固定city/相機/順序。
4. 任一修復必須由實測根因導出，先獨立覆核；產品/批准圖若需更動先回報。回候選後原全套required CI全部重跑且全綠，再由非作者決定merge。
5. 隔離workflow只有特定診斷分支push觸發、contents:read、無deploy/外部服務/安全設定變動。來源漂移與診斷本身失敗必須明示；本輪沒有正式release通過語義。

回滾：不移動PR16，拋棄隔離診斷分支即可；此段為施工前卡面，尚未取得首紅frame。


### DPR2 彩虹快照邊界修復（施工前固定）
隔離1db4/38120974678精確重現原首紅。首對原RGBA3351差異全部在T248紅色虹帶 x188–592/y260–273，通道最大差1、alpha相同；source幾何外緣y260.796、海面y274，sprite/ground快取與城市其餘像素不變。rainbowT實值尚未記錄，但原draw(.016)會遞減它，現有snapshot沒有重套此純視覺時鐘。兩位獨立覆核同意且非作者發佈方批准只修fallback快照。

允許觸碰僅既有helper/test與其exact overlay接線（均在helper中）；本卡/claim；隔離workflow僅加tools/pages路徑觸發以免文檔卡重跑已知紅Chrome。產品、凍結源、正式workflow及原308矩陣不改。

固定驗收：在原grow22同一evaluate task剛結束、任何matrix draw前，只讀取得immutable PREV真實rainbowT，有限且大於0，否則停止，不造9/清零/關彩虹。candidate即時值也記錄。fallback36每次canonical原有三draw前套同PREV值；每次draw後必保留原自然遞減，finally精確還原caller值及原method descriptor/ownership，exception亦然。live/performance/原308完全不套wrapper。獨立PREV與candidate-only-new-escape仍全RGBA零差。共享值、pre/post/final值與來源全記錄。

新增三項真Chrome對照：恢復原自然倒數必在原stablePixels守衛紅，另一個非零共享值必有真像素差，恢復原值全RGBA零差；原陰影wrong-edge仍完整。測試只能新增，不降低原判準；透明3draw/2read守衛仍保留。先同隔離最小Chrome驗證有證據修復，再回PR16做原全套精確SHA驗證。舊兩輪紅證據保留；本段尚未聲稱修復通過。


### 彩虹自然衰減紅源的固定四相位覆蓋（施工前固定）
ec3b / run38139520638 的最小Chrome實測：PREV與candidate同task grow後rainbowT皆9；36配對全RGBA/state通過、原陰影wrong-edge949像素差且恢復0。新增自然倒數紅源實際9→8.984→8.968→8.952，但原兩次RGBA完全相同，原守衛沒有紅；負控制可見性守衛因此正確攔下。此零差結果与原失敗證據保留，不冒充可見紅源。

兩位獨立覆核與非作者發佈方批准固定4相位覆盖：樣本必須恰為當次觀測PREV正值及原3draw真實post值，共四個；本次來源數列9/8.984/8.968/8.952，未來由實測trace直接派生，不寫死值、不搜尋。四相位一律全跑，不因命中或零差提前結束。每相位都有同時計shared對照（原3draw2read、unstablePixels0）及原自然倒數（不改dt/不補draw）。每個自然倒數樣本須保持所有非stability判準、精確時計/復原；只要有像素變化，必須由原stablePixels守衛首次拒絕。全部四相位至少一個真正可見紅源，否則保留紅燈停止回報，不能增試到過。四個相位的PNG/A/B/判準與零差全部保存。

原36配對、原308矩陣、零像素容差及任何產品/批准圖不改；非零錯時計有像素差、恢復共享時計全RGBA零差仍保留。新增unit紅源證明少相位、選擇性早停、全不可見、錯讀數或復原不完整都不能通過。允許觸碰僅helper及其tests、本卡/claim；原自然衰減函數、原frameValid/coverage/negativeValid不改。這是覆蓋修復，不是降低正式像素驗收門檻。


### 已驗診斷整合回候選（2026-10-11 12:57 UTC）
36d81e6 / run38140790689 已完成真正Chrome最小診斷，731 checks、188 PNG、零runtime/console/app錯誤；實測PREV/candidate正值均9，36配對全RGBA/state通過。四個固定phase9/8.984/8.968/8.952的shared不穩定像素全0；natural drift為0/0/3594/0，唯一可見樣本被原stablePixels守衛拒絕，零差不改稱red。錯誤非零時計3772像素差、恢復0；陰影wrong-edge949差、恢復0。16份raw A/B與SHA均保留，原178007及1db4/ec3b紅報告不改。

僅將已驗helper/test、完整卡/claim、release634.md及CHANGELOG整合回PR16。診斷runner/workflow留隔離分支，不進候選。產品仍v11.218與原批准圖像同一bytes，原308/正式CI/workflow依賴不變；此最小731checks不是release通過，精確候選必須重新全套required CI、非作者覆核後才由非作者merge。
