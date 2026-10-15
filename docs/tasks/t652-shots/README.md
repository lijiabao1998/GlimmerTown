# T652 獨立樣張（未接進遊戲）

10 款新商業外觀的 Canvas 程式、控制頁與檢查。不是已批准美術，不是200款完成，不是遊戲實拍。

- `designs652.js`：10 個具名結構設計和純 Canvas 畫筆。
- `preview.html`：季節、雪、日夜、四視角、遠景與重設。
- `check652.cjs`：結構邊界、不相交、去重、6個故意改壞負控制、400組畫筆命令確定性；命令記錄不是像素測試。
- `render652.cjs`：真 Chromium 產40張狀態接觸表＋遠景，逐款驗像素確定性、邊緣裁切、夜圖沒有伸出日圖外。腳本尚未成功執行，不能把交付腳本說成驗收通過。

本雲端首次 Chromium 啟動在 socket() Operation not permitted 失敗，沒有截圖。沒有以不安全參數繞過、沒有以軟渲染圖冒充Chrome。
現有CI沒有本卡獨立頁入口；需要合規寫入者另行接入預覽job，本分支不修改工作流或其他卡台架。

可用環境執行：`node docs/tasks/t652-shots/check652.cjs`；已安裝釘版Playwright的環境執行 `node docs/tasks/t652-shots/render652.cjs evidence/t652-preview`。
不引入遊戲執行期依賴。index、sw、兩份pins、APPROVED_ART及既有測試逐位不變。
完整原遊戲CI、原生像素驗證、業主圖審、遊戲接線仍未完成。
