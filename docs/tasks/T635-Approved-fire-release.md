# T635 已批准三款消防設施：發布補充卡

本卡在發布修改前固定。業主 2026-10-12 02:03 UTC 明示：「消防局沒問題按照Claude的標準沒問題就上綫」。批准對象為 `bc9c70fdd0cdc03fc6679c23ad45d7e7eb205105` 與 Library 同一項目 version1。本卡不重新設計、不增加款式；原候選、穿牆前圖、全部原FAIL保留。

## 基準與鎖序

分支 `gpt/town-fire-three-candidates-635`；最新 `origin/main=7ad6931eaa1bed87af053f8097b05a0e669656a6`，候選兩提交ahead、clean。只寫隔離checkout，不写C:/dev/glimmer-town、玩家8123、Lab／3D／FPV。遵循AGENTS、RULES、COLLAB、迭代不改壞標準、main-pages README的T627／T630現行發布規範。repo無CLAUDE.md／.agents/skills，已讀全域CLAUDE說明及相關skill catalog；HF／banner與本卡無關。

## 定位錨與允許觸碰

- `index.html`：只有 `function t635On(){` 預設條件和 `const GAME_VER=`。普通無query啟用三款；noT635 URL／runtime保留。bakeFire635及其遮擋修正、車庫／塔／院落像素不改。
- `sw.js`：tools/bump.py只升APP_VER，不動cache／存檔／lifetime。
- `docs/tasks/t602-shots/test602.js`、`docs/tasks/t603-shots/test603.js`：只修ROOT文字替換在巢狀模板消耗Windows反斜線；new Function綁定__dirname／__filename參數。原body每項assert、像素、亂數、回退、結果全部不改。T603同一潛在問題會在T602修好後才走到，故一併覆蓋。
- `docs/tasks/t602-shots/`新增portable bootstrap回歸：实际經两份harness组装脚本，dated Windows／unicode／引號／backtick／POSIX路徑；保留原raw-replacement首紅SyntaxError，原body SHA固定於修改前git來源。
- `test_fixde.js`：eval(js)前按原T602／T603／T634歷史DOM-mock模式加__noT635；不冒稱新預設驗收。原T602 G1相鄰可新增portable檢查，不移除原閘門。
- `docs/tasks/t635-shots/`：正式普通URL原生消防驗收與production核驗。批准來源固定bc9c70f，基準固定7ad6931，禁止current-source期望值fallback。正常URL不設T635 activation／escape，確實draw候選；新舊footprint、建造／升級／fire／slot3、四向日夜雪、有效燈、三個穿牆樣本、default／URL／runtime逃生、1586圖集與無關315設計保留，每個新閘門有首紅來源。
- `.github/workflows/town-main-pages-candidate.yml`：增加本分支trigger和mandatory approved-fire-release job／deploy依賴。原validate、三phase browser、package、pages-browser、approved-art-release、T630 diagnostic、verify-published全保留。新job驗無query真正default-on，不能借舊逃生lane掩蓋新路。
- `docs/tasks/t634-shots/release634.cjs`：如原315世界整幀對照確實需要隔離新消防，僅明示／記錄__noT635；315生成器、像素、場景、紅源、filter計數、六哨兵、存讀、安全契約不放寬。新mandatory消防job独立验真正普通URL及批准fire整幀。
- `docs/ARCH.md`、`docs/SPR_PINS.json`：版本／行數／定位／敘述，1586原釘值不改不重產。
- T635卡／claim、CHANGELOG、必要發布記錄：按實際驗收收口，不能先稱CI全綠或上線。

## 禁區

所有批准S19／T591／T592／T634／315設計、bakeFire635像素、footprint／入口／成本／升級／覆蓋／消防派車／存檔／RNG、UI與七檔package namespace不改。不可降低閾值、刪斷言、抹去原FAIL、強推main、自合、繞權限或用baseline红灯冒稱完整通過。美術實質改動須另交預覽。

## 固定驗收與發布順序

1. 原Windows T602／T603案与portable negative；修後两份原body結果不變、真實exit0。
2. 原verify完整0FAIL、六哨兵、63工具鏈、圖集與舊存檔；mock不代替原生default路徑。
3. 真Chrome普通URL对批准bc9c70f的像素／整街，新舊footprint／建造／升級／派車／slot3不變；1586無關圖集不變。固定頁面／來源SHA及HEAD，origin/profile隔離，載入前slot3。
4. draft PR並attach本task；exact head全必要CI，包括原Linux三phase、package、真Mac worker/save upgrade/offline、315保留與新消防job。T630原native時序是diagnostic，FAIL不改綠、不新放寬；main發布前原needs全綠。
5. 非施工者覆核diff、default真像素、原assert保留、CI報告；修後重驗exacthead；非作者正常PR merge，不繞原閘門。
6. main exact SHA同輪CI与Pages deploy／verify-published；正式HTTPS七資產与commit、三款真畫面、合成slot3旧/新存檔载入、升級/fire、worker升级及fresh-process offline重开。未部署／未核驗成功不稱上線。

## 回滾

發布前紅留分支，main／正式站不動；noT635即退原批准消防圖且不改存檔。正式回滾只經正常PR与原发布管线，禁手搬runtime、改receipt或強推main。

## 發布閉合與本機收件（2026-10-13 補記）

PR #17 已於 2026-10-12 03:48:34 UTC 正常合入 main `8d79bc42b9f67f8acd087044debf2a2d32f4be83`（v11.221）。同 SHA 的 run [38201218382](https://github.com/lijiabao1998/GlimmerTown/actions/runs/38201218382) 必要 validate／三 phase browser／approved-art-release／approved-fire-release／package／pages-browser 全成功，deploy 與 verify-published 也成功；原回歸 12597 PASS／0 FAIL、63 工具鏈。Codex 本次讀回 PR 與各 job 結果，並以原 release-identity 的 live 模式核對七檔 HTTPS 與提交套件完全一致，不以先前候選綠燈代替正式發佈證據。

原 native-acceptance job 仍為 failure，報告列出 complete unchanged T620 collection、approved runtime/source/model/save controls 與 unchanged timing windows 三類拒絕；歷史 CRC 860 差異保留。T630 已將它設為診斷，不擋部署，但不是全部原生驗收通過或只有計時紅。

本機收件只 fast-forward 到 bay/codex；親跑原套件為 12594 PASS／1 FAIL，六哨兵不變，獨立工具鏈 63／63 通過。T635 G1 的跨平台 VM 限制 10000ms 在第一次 T603 Windows 造境逾時；聚焦重現 10 例中 9 過、1 逾時（10429.6867ms），不是路徑／原 body SHA 斷言失敗。不改時限、不重跑賭過、不繞主線閘。canonical 仍 d88e36d／v11.214、玩家仍 v11.210，receipt=match；本次未新增第三方美術覆核。完整證據與後續修台架的範圍阻塞見 Local-receipt-records 補卡。
