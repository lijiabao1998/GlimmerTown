# T679 手機 HUD、分類與工具列一致化候選
<!-- card: families=無; valve=?noT679 / window.__noT679; owner_ok=業主 2026-10-27 對「Town PR78 你接受這批圖、要合併嗎？」選「圖我看過，接受，合」; removed_asserts=0 -->

**發卡／施工**：GPT (Codex)，2026-10-27；業主有界 UI 指示。
**claim**：GPT (Codex)；分支 `gpt/town-mobile-ui-t679`；base `ffd4d36c1c54274667d402e0d5a9a6866c3c068b`（T717 v11.250）。
**業主原話**：「你打磨一下UI吧 UI 下面的和上面的非常不匹配手機」「town」。
**交付邊界**：只交 Draft 候選；不 merge、不 release、不部署 Pages、不放寬守衛。T677／P06 獨立 hold 保留；方向檔「暫停」不改。

## 基準與證據限制

- 重新 fetch main 與所有 origin/gpt/* 卡面後，最小未用號為 T679；T677 仍在獨立 PR74，P06 在 PR73。
- main 主工作流 40449733995 已 completed/success，含 gate／deploy／verify-published。
- 原始參考：Library `libfile_3cf0b52e60848191b5194d75cea2ffd9`，file `file_000000000c0c81fd92445683bdeb812d`，`1000060606.jpg`，922×2048／609541 B。prepare 成功，但現行 helper 兩次均 `download failed`；本地沒有可讀位元，**未看過該原圖，不作原圖缺陷判定**。候選依目前 main 的真 Chromium 截圖與源碼驗收；原圖比較仍是未完成項。
- 已保存目前 main 的未裁切 390×844／1440×900 截圖及幾何。第一組過早拍到 boot overlay，標為不合格基準保留；第二組經 boot 完成與實際進入遊戲後才合格。
- 首次原樣 verify.py：T270 PNG 重建環境首紅（4279 PASS），後續種子尚未執行；不改斷言，按既有 CI 的隔離 Pillow／zlib-ng setup 修環境後再跑。
- 本地 session_audit.py 的 gh API 被 Forbidden 阻擋，原日誌保留；已從同一業主 Primary GitHub 連線先行唯讀取得 main 工作流與 open PR 事實，不宣稱 session_audit 通過。

## 目標

只在 <900 CSS px 的既有遊戲 UI，統一 HUD／分類條／工具列的底色、邊線、圓角、字體、留白與選取狀態；修窄屏 padding 蓋掉 safe-area、底部不同基準與密度斷裂。保留既有元素、id、事件、分類重建、工具可見性／價格／解鎖、手勢與存檔行為。

## 允許觸碰與定位錨

- `index.html`：在 `</style>` 前新增一塊限手機的 T679 CSS；既有 CSS 不改寫。限定 #hud／.chip／.hudGrp552／.hbtn、#toolcats、#tools／.tool／#toolsExp、#zoomer，以及為 HUD／底 dock 讓位的 #hint／#mini／#miniToggle／#toasts／#info 位置與限高。
- `index.html`：緊接 `if(window.__noTitle428&&document.documentElement&&document.documentElement.classList)` 所在逃生閥初始化區，新增 `function t679On(){` 與根元素 ui679 class；?noT679=1 或頁面載入前 window.__noT679 關閉本批。不得改既有事件與 DOM 骨架。
- `docs/APPROVED_ART.json`：只在 valves 登記 T679，批准批次不動；無 SPR／ART 像素家族變更。
- `sw.js`／`index.html`：只由 bump.py 升到 v11.251；README 版本行、ARCH 現況／機械行數與自動地圖同步。
- `docs/tasks/T679-手機HUD與工具列一致化.md`：本卡與施工／驗收紀錄。
- `docs/tasks/t679-shots/`：新建本卡真 Chromium 驗證腳本；輸出在倉庫外，不修改任何既有守衛。
- `docs/CHANGELOG.md`：只追加本卡，具名且如實記獨立覆核。

## 範圍外

Canvas／引擎／模擬／經濟／平衡／價格／存檔格式／閾值／既有斷言／tools／.github／規則檔／既有卡截圖均不動；T717 程式與 noT717 雙閥逐字保留；不帶入 T677／P06 產品或候選。不重畫開始畫面或既有建築，不作效能改善宣稱。原已存在的其他 UI 缺口只登記；本卡造成的回歸必修或暫停。

## 驗收條件（首次提交起凍結，不得改鬆）

1. 320×740、390×844、430×932 直向與 844×390 橫向：HUD、分類與工具列未出可視區；分類與工具可捲到末端；展開／收合與分類切換仍可操作。所有本批主動作按鈕最小 40×40 CSS px，工具最小 52×56。
2. 使用真 Chromium 非零四邊 safe-area 模擬；HUD top/left/right padding 不小於安全區，dock／分類／縮放都從同一 bottom 安全基準排版，正常與展開無分類／工具重疊。
3. 工具、分類、速度、面板與縮放至少各一條真點擊互動後查實際 UI 狀態；既有 DOM id／工具順序／解鎖／顯示價不變，slot=3 在載入 index 前設好；不使用玩家 origin 8123。
4. 1440×900 與 1024×768 桌面 computed styles／元素幾何相等於精確 base；原始桌面與手機 PNG 作交付證據。noT679 的 query 與 window 兩條路均恢復 base 的 UI 幾何／樣式；Canvas 原幀與既有像素指紋由原 CI 驗證不變。
5. 新增驗證的 safe-area 與 dock 排版檢查各做一次定向壞法，首紅必落目標；原失敗／完整 logs／原始 PNG 都保存，不靠重跑賭綠。
6. 完成後 verify.py ALL GREEN、六哨兵、舊檔往返、scope／ledger／ratchet、fp、frame、scene602、browser core/world/neighbors、package、pages-browser、approved-art-release、approved-fire-release、t717-evidence、port-t677 適用性與 gate 均在最終 head 真跑。無繪製變更或效能宣稱，不另 dispatch native-acceptance。
7. 獨立覆核本卡 diff 與本卡承諾，所有本次造成的回歸修好；官方 Codex 審查如未完成，明確保留未驗項。全部維持 Draft；原圖無法取得或任何 required gate 不過，交付明示阻塞，不宣稱完整驗收／上線。

## 回滾

?noT679=1 或載入前 window.__noT679=true 退回原 UI；候選整張可 git revert。不得回退 T717 或解除港區 hold。

## 沒做成的事

原始 Library 圖片尚無可讀位元，未完成原圖比較；session_audit.py 因本地 gh Forbidden 未完成；最終提交的完整 CI／官方 Codex 審查尚待記錄於 PR78，未合併／未發布。


## 施工與首紅紀錄（2026-10-27）

- 卡面第一提交 6dcdbf1af729211748c56e715646bd0bc95ed633，Draft PR78；卡頭與上述驗收條件原封保留。
- 本體只加 T679 mobile CSS、t679On／root class 和版本字；既有 CSS／DOM／事件／Canvas／T715／T717／模擬與存檔程式逐字保留。新閥只加 valves；APPROVED_ART 的批准批次未動。
- 主操作最小40×40，工具56×60，分類與工具共用安全底距及縮放通道；原工具橫滑、展開縱滑與返回頂端收合的行為保留。資訊面板沿用可覆蓋工具的原底錨，避免橫屏展開後只剩一行內容；雙側 safe-area、HUD 下方限高另驗。
- 同模型獨立代理覆核抓到320px旋轉鈕40.09375px造成6+6+1，修為40px後7+6、HUD213→169px。另修面板雙邊安全區；獨立844×390非零安全區真touch Stats開／關、展開面板197px可讀高度通過。這是同模型獨立覆核，不是外部第三方或官方GitHub Codex簽核。
- 首輪原樣verify：4279 PASS、T270 PNG環境首紅；依既有setup_t602_zlib.sh隔離Pillow12.2.0／zlib-ng後，base12837 PASS與六哨兵全過。候選12840 PASS、六哨兵全過；施工中曾因新增CSS後ARCH未同步首紅，之後重新產圖並ALL GREEN。未改任何斷言或判準。
- 新QA首輪讀5MB基底時Node預設buffer不足，保留ENOBUFS日誌並只加讀取容量。後續首紅保留：hint原inline top蓋CSS（以限定手機CSS處理）、地形類有兩個on導致locator不唯一（限定分類）、既有panelIn動畫另有0.16秒delay（等待真動畫完成）、寬橫屏分類全數可見不需捲動（只在overflow驗native scroll）。
- 六手機／橫屏狀態、非零四邊safe-area、真touch到最後工具及返回收合、最後分類、速度／縮放／面板互動與query/window兩回退路已驗。Desktop computed styles／geometry已與精確base相同；完整label比較首紅差在原0.35秒數字動畫仍差1（如2098→2099、982→983），固定等待不是定稿證據，改驗可見數字已穩定後再比；原失敗保留，未改產品動畫。最後比較與exact-head結果以PR78收據為準。
- safe-area定向壞法首紅為「safe-area HUD」，分類bottom=0壞法首紅為「dock separation」，兩者均exit1，未落其他守衛；未刪既有守衛／閾值。
- 所有原PNG、每次首紅與完整log留在本次獨立evidence目錄，交付時另存可下載證據。正式產品仍T717 v11.250；本分支v11.251僅Draft。

## 合併前同步（2026-10-28，Claude）

- 業主 2026-10-27 看過 GPT 交付的 4 張官方原圖後，選「圖我看過，接受，合」（卡頭 owner_ok 由空寫成這句原話；families、valve、removed_asserts 未動）。
- 順序：T718（PR79，v11.251）先合。理由是倉庫改名後，舊網址 `https://lijiabao1998.github.io/GlimmerTown/` 只回 301，本分支原有的 `fetchLiveFile`（`redirect: 'error'`）實測連試 6 次都失敗，pages-browser 必紅。PR79 已於 2026-10-28 以 merge commit `fd9ea8c` 合入 main；Codex 卡住，業主同意只對 PR79 這一次豁免。
- 本分支做了兩件事：用 merge commit 接上 main `fd9ea8c`，以及用 `tools/bump.py` 升到 v11.252。唯一的衝突在 `docs/ARCH.md`：兩邊錨點集合完全相同，只差行號；取本分支版本後以 `tools/arch_map.py --fix` 重算。README 版本行、ARCH 現況與行數、CHANGELOG 本卡條目同步。產品 CSS／DOM／t679On 逐字未動；T718 的 `<head>` 標籤由合併帶入。
- 未改任何斷言、守衛、tools、.github 或判準。最終 head 的完整 CI 與 Codex 審查以 PR78 收據為準；之前在 eeb0e16 跑過的綠燈不能代替新 head。
