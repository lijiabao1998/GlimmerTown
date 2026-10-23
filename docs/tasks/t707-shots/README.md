# T707 證據

## 行為測試（`check-articulation.cjs`，`test_fixde.js` 尾端呼叫）

取 `index.html` 實際的 `updTrains` 與 T706／T707 helper 原文，在 24×24 小網格上用固定種子的亂數重放（每步 1/30 秒）。車廂位置取繪製迴圈實際呼叫的 `cars707(tr)`；離軌距離與間距用獨立幾何算（軌道中心線＝相鄰鐵路格中心的連線）。

| 項目 | 本卡 | 改前（T706 合併後的 main） |
|---|---|---|
| 轉角（矩形環線 60 秒） | 每節離軌 0，相鄰兩節間距恆為 0.62 | 最遠離軌 1.23 格 |
| 剛放上彎道格的列車 | 三節沿彎排開，離軌 0 | — |
| 線尾（直線兩頭線尾 30 秒） | 離軌 0；折返 3 次，前後位置集合相同 | 最遠離軌 1.23 格 |
| 兩列對向（30 秒） | 最近兩節隔 1.93 格，不穿過 | 穿過 552 步 |
| 車站 | 在車站旁停 1.5 秒 | 不停 |
| 尾燈／機車 | 每列恰一節尾燈、恰一節機車；推送時機車在最後 | — |

- 閥全關（T707 起每一張卡的 `__noTNNN`）：四個場景每一步每一輛車都和改前相同。
- 改前基準是固定檔 `base-v11.247.js`：T706 合併後 `index.html` 裡 `streetHash`、`listBldK`、`railDirs`、`updTrains`、`updTrams`、`t706On`、`railDirs706`、`spawnDir706` 八個函式的原文，用和測試相同的大括號配對逐字抽出、未改一字。測試只讀這個檔，不在執行時去 git 歷史裡找。
- `?noT707=1` 關、`?noT707=0` 不誤關；繪製迴圈真的用 `cars707`、尾燈只畫在帶尾燈那一節（原文比對）。
- 負控制：拿掉軌跡取樣 → 首紅 G1；回補只往正後方找 → 首紅 G1b；拿掉折返重建 → 首紅 G2；拿掉閉塞 → 首紅 G3。

## 真 Chromium 連拍（`strip.cjs`）

`owner-corner.png`、`owner-deadend.png`、`owner-headon.png`、`owner-station.png`：同一個場景逐步推進 `updTrains`（固定 dt、固定亂數），每張四排＝本卡白天、現在白天、本卡夜晚、現在夜晚（現在＝同一份程式加 `window.__noT707`）。量到的離軌：本卡四個場景都是 0；現在轉角、線尾 0.94 格。

## 整幀比對（T705 的鐵道場景，本機跑 CI 同一支工具）

`frame-local.md` 是工具輸出；`frame-rail-close-day.png`／`frame-rail-close-night.png` 是近景 r0 的接觸表（縮 60%）。四欄：base｜head｜head 關閥｜差異。

- 變了 30 幀，全在 `rail`／`rail-close` 兩個鐵道場景；原本 6 個場景零變。
- 閥關後仍不同：0 幀。
- 結論紅只因為卡頭 `owner_ok` 還空著（美術卡要業主看過接觸表才寫）。

CI 的附件下載不了（下載會轉到 `productionresultssa*.blob.core.windows.net`，這個雲端環境的網路政策擋掉），所以接觸表用本機跑的；CI 那一輪的 frame 結論以 PR 上的 job 為準。
