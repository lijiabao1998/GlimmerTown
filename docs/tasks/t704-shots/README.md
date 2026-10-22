# T704 證據

## 行為測試（進 CI）

`check-halo.cjs`：從 `index.html` 取出 T149 地面光暈迴圈原文與 T582 車擋條目原文，在 vm 裡重放。`createRadialGradient` 替身遇到非有限數就丟錯（和 Chromium 一樣）。放入三筆條目：車擋 `rect`、正常路燈、故意缺 `x/y` 的條目。

- G1：迴圈不丟錯。
- G2：`save`／`restore` 成對，結束時合成模式回到 `source-over`。
- G3：只有正常路燈畫光暈。
- G4：原始碼裡每一個 `rdecGlow.push({rect:` 都帶 `noHalo:1`。
- 負控制：只拿掉有限數防線 → 首紅 G1；只拿掉 `noHalo` → 首紅 G4；兩個都拿掉（＝main 原樣）→ 首紅 G1。

`test_fixde.js` 尾端追加一段呼叫它。

## 真 Chromium 前後對照（本機，不進 CI）

`live-before-after.cjs <index.html> <outdir> <tag>`，場景橋取自同目錄的 `scene.cjs`（調查階段寫的列車場景）：72×72 地圖、一圈帶岔線的鐵路、兩座車站、幾棟住宅；補算每一格的 `recalcRailMask` 後全圖 37 格軌道、1 個線尾。存檔槽先設 3。Chromium 141（Playwright 1.56.1）。

| | main eacb7ff | T704 |
|---|---|---|
| 夜晚實際 rAF 迴圈 800 ms 的頁面錯誤 | 42 | 0 |
| 第一個錯誤 | `createRadialGradient … non-finite` | 無 |
| 迴圈後的合成模式 | `lighter`（漏掉） | `source-over` |
| 畫面白色像素比例 | 100% | 0% |
| 白天單幀雜湊 | 00c946a2c2a5074e | 00c946a2c2a5074e（相同） |

`night-before-after.png`：左 main（整片白），右 T704（正常，線尾那一格有小紅燈）。

注意：沒補算軌道連接時，場景裡每一格的 `railMask` 都是 0，會被當成線尾而全部亮紅燈；那是測試場景的問題，不是遊戲。
