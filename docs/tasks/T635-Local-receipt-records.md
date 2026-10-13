# T634／T635 本機收件與發布記錄補充

## 授權與 claim

業主 2026-10-13 指示：「先收進遠端成果、核對本機，更新記錄同時」。本補充只接收已合併成果與補正文件，不另立美術或玩法卡。接收／補記：Codex；車位 bay/codex，遠端來源凍結為 `8d79bc42b9f67f8acd087044debf2a2d32f4be83`（v11.221），本機接收前 master 為 `d88e36d866226ac182dd92ecab63c29a540a4ef8`（v11.214）。不宣稱新增外部第三方美術覆核。

## 定位錨

- COLLAB 第九節：遠端成果先收進施工者車位，再過 canonical 本機交易式閘門。
- README 頂部與狀態段仍寫 v11.212／v11.210，ARCH 仍把已發布的 T634／T603 稱為候選。
- T634／T635 歷史 CHANGELOG 驗收欄仍是施工時的未完成狀態，T557 因此拒絕本機收件；不得繞過或放寬守衛。
- GitHub PR #16／#17 均已合併。正式 main `8d79bc4` 的 run `38201218382` 已完成必要驗證、deploy、verify-published；原 `native-acceptance` 為 failure，依既有 T630 政策屬診斷，不改稱成功。

## 允許觸碰

僅 README.md、docs/ARCH.md 的現況文字、docs/COLLAB.md 的歷史規約適用提醒、docs/CHANGELOG.md、T634／T635 卡面及發布說明（含 docs/tasks/main-pages/README.md 的發布歷史／依賴敘述）、本補充卡。補記原已發布提交、實際本機驗證與玩家版本邊界；不改 ARCH 定位表或任何驗收門檻。

文件在獨立遠端分支 `gpt/town-635-local-receipt-records` 交付，不直推 main。先推本補充卡，再更新記錄。CHANGELOG 更正只限本機 master 尚未包含的 T634／T635 新條目；原施工時驗收欄完整保存在本補充，舊失敗證據、卡面與 master 已有條目保留。不得只刪未完成用字假裝驗收通過。

## 禁區

所有 runtime、test_fixde.js、tools、workflows、SPR／健康基線、存檔與模擬零改動。不 bump、不 --deploy、不 --publish、不手改收據，不測玩家 8123，不碰其他專案或清除任何車位成果。

## 固定驗收

1. 收件前確認四車位 clean 且無未落地成果；接收僅 fast-forward，遇 dirty／ahead／衝突停手。
2. 本機親跑 incoming verify.py 與原 63 項工具鏈；保留實際 exit／PASS／六哨兵，不把 Node 舊圖 mock 當成新圖真瀏覽器證明。
3. 文件更新前後，index.html／sw.js／test_fixde.js SHA256 與凍結來源完全相同；SPR_PINS payload 不變。
4. 最終 verify.py ALL GREEN、PASS 不減、git diff --check=0；更新過的驗收欄引用同一精確 main CI，明示原生診斷仍紅及本次未新增外部第三方覆核。
5. canonical merge_bay.py codex --no-deploy 實跑 B/S/M 閘與棘輪後才稱本機主線已接收；不可直接在 master merge origin/main。
6. 玩家 index／sw／receipt 在收件前後逐位相同，仍 v11.210；四車位同步結果逐個讀回，skipped 據實記錄。
7. 遠端文件交付經正常分支／PR；尚未合併的記錄不冒稱遠端主線已更新。精確提交 CI 與是否合併另記實際狀態。

## 回滾

文件補記可正常 revert。接收前紅燈留車位、master／玩家不動；交易開始後遵循工具的 resume／abort，不 reset --hard、不修改 receipt。玩家版本要升級須業主另行明示。

## 實測與歷史更正

2026-10-13：git fetch 讀回遠端主線 8d79bc4，本機落後 25 提交。四車位原皆 db3f1c1、clean；bay/codex 已 fast-forward 至遠端。首次本機交易在 T557 preflight 明確拒絕 T634 歷史未完成驗收欄，尚未建立交易或推進 master。後續只以真實 CI／發布／本機結果補記，不放寬此守衛。

### 親跑結果與停止點

| 核對 | 本次實得 |
|---|---|
| 遠端 main／發布 | 8d79bc42／v11.221；run38201218382 必要 jobs、deploy／verify-published success，native-acceptance failure 保留 |
| 本機 incoming 完整 verify | 文件補正前、runtime 8d79bc42 原 bytes：12594 PASS／1 FAIL／exit1／RESULT: 1 CHECK(S) FAILED |
| 唯一 suite 紅 | T635 G1 T602/T603 portable bootstrap and retained original assertion bodies |
| 六哨兵 | seed22=639、seed22m=14523、seed301=780、seed301m=2297、seed7=117、seed7m=77，全部匹配 |
| 工具鏈 | 原 63 tests／exit0／OK；324.262s，拋棄式 temp repos；ResourceWarning 原樣保留，非失敗 |
| 聚焦重現 | 原 bootstrap-portability602.test.cjs：10 例、9 PASS／1 FAIL；第一次 T603 Windows 正向案10429.6867ms，ERR_SCRIPT_EXECUTION_TIMEOUT，原 VM 限制10000ms |
| 原不可變 body | 兩份 original immutable assertion body 釘皆通過；定向舊 Windows interpolation 紅源拒絕皆符合原判準 |
| 獨立來源探針 | 原 native603.test.js 匯入4940ms／130原檢查通過；T603台架第三行會在VM內require此模組。這是設定成本觀察，不證明所有逾時成因、也不豁免10秒限值 |
| 真實 HTTPS | release-identity --previous 讀回live=8d79bc42／11.221；七檔還原命名空間後與incoming source一致，runtimeChanged=false |
| 本機 source 未改 | index SHA256 97f2b8a2ea405b6ca3b443c89838258d17e2fdda66b807d478daedc9cbd4d4d0；sw 591594d875daf7360dbd2d7fc4c6c64abbad047463dc9a7a510feb8cddba1dde；test_fixde cc36c094ff77c74a98441ce760fd45f07130c9d00159db2d35b6b0d3c5a22fd4 |
| canonical／其餘車位 | master d88e36d／v11.214；Kimi／Grok／DeepSeek db3f1c1，未推進；只Codex車位接收遠端與文件補記 |
| 玩家保護 | v11.210，receipt source_oid=bdf8e7c2b3269984dec159489851a0843120c669；index 0e99a3bcd38241345694e441286c76cae772c5b3533303188090bb8fa12e5fdc、sw c07e3de14ceccf2c5a8d0777ce7b9ada6db8a1b13a87ec8ca1f30ec23aaa4f4f，收件前後不變 |

**STOP: LOCAL_GATE_RED**。沒有 B/S/M 全綠，故未執行晉升、回同步或發布。文件補正不改產品、台架、任何時限／斷言，未把遠端CI成功移植成本機綠燈。沒有延長逾時、預載模組、關守衛、調NODE_OPTIONS或重跑到成功。修復跨平台驗證台架超出本文件補記範圍，需要業主另行授權微卡；不可先自修再報帳。文件修訂後只做範圍／字元／差異／定位表與收據核對，不冒稱重新跑過完整綠閘。

文件補正核對：十份允許文件均 CRLF=0／控制字元=0，九份 runtime／原測試與遠端來源逐位相同；九條更正前完整條目逐字封存，canonical master 的 648 條既有 CHANGELOG 條目完整保留。git diff --check=0，arch_map.py --check=0（184 列，dead／empty／drift 均 0）。歷史驗收欄更正只排除文件性入場阻塞，不代表本機 suite RED 已解決。

### CHANGELOG 施工時驗收欄封存（遠端8d79bc42逐字）

以下九條是補正前完整原條目，不刪其失敗或未完成的當時事實。CHANGELOG 現行驗收欄補入的是已完成的遠端發布與本機RED邊界，不是把當時失敗改判通過。

```text
2026-10-12 | T635 | 業主批准三款英式消防局上線；只改普通網址預設啟用，保留逃生閥與bc9c70f原美術。v11.221；T602/T603入口改傳入路徑參數以修Windows嚴格模式八進位錯誤，原測試body逐位不改、10項跨平台與負控制通過。新增必過消防原生驗收與原315隔離記錄，不移除原閘門。 | 驗收:GPT施工，原美術已由獨立GPT代理覆核No findings及業主批准；本地原verify 12597PASS／0FAIL與六哨兵通過，精確提交CI和發佈差異獨立覆核進行中，須非作者正常合併及線上實測後才記已發布。
2026-10-11 | T635 | 三款英式原生Canvas本地候選：k6低矮木門鄉鎮站、k30三拱紅磚角塔局、k61低橫現代雙翼中心；僅外觀選圖不加能力，批准main與原存檔保留。獨立覆核發現三处夜光透過山牆／塔樓／辦公翼，本地v11.220以原生繪圖順序同步遮蔽夜層，日層逐位保留、舊預覽封存；四方向日夜雪、真實建造升級存檔火災回歸及reviewer再覆核，更新同一Library項目，預設關閉且待美術確認；原Windows T602 FAIL不改門檻 | 驗收:Codex施工與原生回歸，獨立GPT代理首輪指出P2、修正後原像素與四方向再覆核No findings；真實建造升級火災存檔回歸一致、1586圖集保留；Library同一項目version1已保存，未經業主圖審，正式12590PASS／1T602 Windows FAIL保留；無push／PR／合併／部署
2026-10-11 | T634 | 修正明示fallback快照漏凍結既有彩虹時計：共享immutable PREV實測正值、原3draw/2read與自然遞減不變、finally精確還原；固定四相位負控制保留零差與原首紅，正式36/308零容差及runtime不變。 | 驗收:GPT施工、獨立GPT代理靜態及像素證據覆核，未經外部第三方覆核；最小Chrome731checks通過，精確候選完整CI尚待完成，非作者合併。
2026-10-11 | T634 | 原生filter台架分路覆蓋：保留正常308矩陣，另加同鏡頭36組T591 fallback與原謂詞、獨立像素比較及陰影wrong-edge紅源；批准7105與release另記真filter呼叫。凍結原台架／本體／315圖不改，舊紅證據保留。 | 驗收:GPT施工、獨立GPT代理設計覆核，未經外部第三方覆核；實作後精確CI待完成，非作者合併。
2026-10-11 | T634 | 修發佈驗證工具的隔離頁收尾：完成全部量測後丟棄測試世界再關頁，避免visibilitychange自動存檔撞上fixture寫檔禁令；實跑首輪3471項與6哨兵／3存檔通過但最終pageexception紅，保留紅證據；本體仍v11.218、圖像不動。 | 驗收:GPT施工、獨立GPT代理檢查，未經外部第三方覆核；修正後精確CI尚待完成，未合併／部署。
2026-10-11 | T634 | 業主批准7105圖像上線；只切正常進站預設開啟，保留noT634與即時逃生閥，原315設計不改。v11.218。 | 驗收:GPT施工、獨立GPT代理覆核，非作者負責合併；7105原六項CI全綠及業主图審批准；本次release delta與Pages精確提交驗證尚待完成。
2026-10-11 | T634 | 修正業主真圖指出的同棟附屋穿牆與不自然比例：共牆接合、實際u/v拓撲畫序、依屋寬調屋脊、低附屋單層／雨棚比例、側翼占用牆段不再生成凸窗；新增315足跡／實體射線／實際生成凸窗守衛及原街景＋密集相鄰四向日夜對照。v11.217，預設關閉。 | 驗收:GPT 出卡與施工、獨立GPT代理複核，未經第三方覆核；源碼數學掃描通過，精確提交CI／Chrome與業主圖審仍待完成；不合併、不部署。
2026-10-11 | T634 | 參照 Lab 英式美術全315款候選重製：住商工重新分配量體高度、樓層與屋頂，立面改深窗洞與窄框、暗灰縫及板岩大色面；公共與工業維持功能辨識與舊足跡。v11.216，預設關閉。 | 驗收:GPT 出卡與施工，未經第三方覆核；本次實作驗收中，尚未取得新精確提交 CI 與业主圖審，不合併、不部署。
2026-10-10 | T634 | 全批英式美術候選：剩餘 69 設施＋住商工共 72 家族，108 住商工明確設計＋207 設施結構款，11 類已批准素材補舊檔原足跡路徑。預設關閉，只在 T634 預覽旗標內；原 SPR、存檔、模擬不改。v11.215。 | 驗收:GPT 出卡與施工，尚未第三方覆核；候選整合中；原 main 基準 12569 PASS／六哨兵與真 Chrome 基準全過，本候選尚未完成驗收，未合併／未部署。
```
