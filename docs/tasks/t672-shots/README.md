# T672 最小識別修復

實作只在原 drawOrder 的既有影像 Map 建置之後追加兩行：註解與單格住宅選圖的補充迴圈。原檔刪除行數為零；移除新增兩行後，test_fixde.js 逐字等於 main。原 gpt_lane 對新增兩行回傳零問題，沒有改 scope 或分支命名。

identity-negative.cjs 直接抽取當前原 helper 及原 G23f assert 執行，24 個視角／倍率／日夜組合測識別契約。這是隔離台架契約測試，不假稱真遊戲畫序實測。三個負控制（移除新識別、沒有 drawImage、畫未知影像）都首紅於原 G23f，未放寬或替換該 assert。真遊戲整合仍用完整原 verify 覆核。

驗證中的兩組完整原 verify：main 加最小 helper；T671 未發布實作加同一 helper（僅用作整合驗證，不會混進本 PR 的 index.html）。結果待寫入，未跑完不宣稱通過。
