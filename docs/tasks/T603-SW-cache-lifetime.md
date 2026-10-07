# T603 補充卡：入口導航與快取生命週期

## 目的與授權範圍

本輪為已授權的助手雲端候選修復，從藝術候選 `19fa39a4c94f9004a94031de1ada40f28d0ec288` 分支。只修復成功入口導航被背景快取寫入阻塞的問題。這不是55FPS修復，也不代表T603完整驗收通過。既有圖片批准不豁免效能或逐像素門檻；本候選不合併、不部署。

## 已重現證據

- 原樣觀測失敗：[37555521558](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37555521558)。來源 `d9d2383`；服務端26ms完成HTTP200，SW已完成fetch/open/clone，卻只出現cache-put-begin，約300秒內無end/error/reply，候選文件未提交。保留原始failure與完整基線觀測控制，沒有原樣重跑。
- 隔離修復：[37556937518](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37556937518)。來源 `7036277`；285檢查、91截圖。故意延遲cache write8.10秒，文件於寫入開始後249ms提交，早於完成7.851秒；最終快取4494197bytes及SHA256精確一致。故意寫入失敗仍保留網路導航；入口網路連線中斷的真Chrome回載證明fetch-error→cache hit→reply-offline，原站未傳成功文件。此輪仅改測試副本，正式SW仍未改。
- 隔離artifact SHA256：`67c4643841a413f37d9dfda7f2ac6c76d5b9bb6eff64ac861c7ef49497d1a969`。

## 允許觸碰與定位錨

1. `sw.js` 的 `if(req.mode==='navigate'){`：成功entry回應先clone，cache open/put改為背景promise；在fetch handler同步 `waitUntil`，讓其採納完整寫入promise。clone/cache失敗不得吞掉成功回應。其他路由、scope、version/cache keys、install/activate、manifest、靜態資源及離線503原文均不動。
2. `test_fixde.js` 的 `async fireFetch(request) {`：mock加入忠實同步 `waitUntil`，原快取斷言在事件生命週期完成後檢查。任何原斷言、原意、PASS下限、六哨兵均不改；不阻塞導航另以真正pending promise專測。
3. `docs/tasks/t603-shots/sw603.test.mjs`、`fixtures/sw-before-lifetime603.js`：37項獨立對抗性測試及hash綁定的原SW。涵蓋pending open/put、原body先消費、clone時序、完整event lifetime、streaming body、並行事件、失敗、離線命中/缺失/儲存故障及所有不變路由。
4. `.github/workflows/town603-sw-cache-fix.yml`：獨立候選CI，複製全部原Linux驗證與四個Chrome phase及原Mac前景工作，另加37項SW契約。原工作流不改，執行器、閾值、資料及正式驗收程序不降級。
5. 本補充卡：記錄真實結果，不提前寫整體通過。

## 程式修復

產品SW候選SHA256為 `79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2`，與已驗證的純修復逐byte相同。`index.html`保持 `6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69`，不改filter、繪圖、美術、遊戲、存檔或亂數。

`waitUntil(response.then(()=>cacheWrite).catch(()=>{}))` 在同步事件handler登記。`cacheWrite`在網路回應完成且clone成功後指向完整open/put chain。延迟open/put不阻塞回應；同步與非同步儲存錯誤均保留成功回應。此修復不聲稱修好了Cache Storage內部停滯；瀏覽器仍可依平台生命週期預算終止過長背景工作。

## 驗證與發布界線

- 本地37/37純契約、SW／整份原測試語法、差異空白檢查通過；原阻塞SW、過早結束lifetime及過晚clone的負例均已判紅。
- 完整原回歸及精確候選的真Chrome/Mac結果待CI。本地不重複啟動先前在共用RAM限制下退出137的全套Node作業。
- 原候選Linux已有12531回歸斷言、63工具鏈及全部四phase通過；不得把舊SHA通過冒充本候選通過。
- 原Mac夜間約21FPS、55FPS要求及手機夜間暖幀相對預算仍阻擋。已測有縮減面積的filter clip不逐像素等價；不降低閾值、不再盲試同類裁切微調。
- 本輪不新增圖像變化。任何後續可見變動仍須業主交圖確認。

獨立覆核已確認mock的response/lifetime rejection均會傳出，晚登記waitUntil判錯、pending lifetime確實延後事件完成；YAML解析比對證明六個原工作完整保留。37項專測從repo根目錄及/tmp執行均通過。完整CI仍待本候選SHA結果。
