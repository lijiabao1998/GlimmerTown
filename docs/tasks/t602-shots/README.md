# T602 可重現盤點與舊檔驗收

來源是 GlimmerTown 主線 `bc2a064`／v11.210，不是 Lab。`fixtures/` 是程序化種子測試城，沒有玩家資料。三城原始存檔、檔案 SHA256、改動前獨立盤點的 root SHA256 都已保存。

## 真城配方

固定 72×72，依序 `newWorldSeeded(seed)`、`setDiff(diff)`、`ai(true)`，逐次 `GV.step(1)`。`steps=420` 是推進420次，遊戲日數為421；400次對應401。

| 種子 | 難度 | 步數 | 人口 | root數 | GV.stats建築格數 |
|---|---:|---:|---:|---:|---:|
| 22 | 3 沙盒 | 420 | 2397 | 956 | 2557 |
| 777 | 1 | 400 | 2639 | 915 | 2481 |
| 301 | 1 | 400 | 780 | 334 | 613 |

`GV.stats().buildings` 包含 ref 占地格，不能直接當建築棟數。盤點必須排除 `b.ref`。

```bash
node docs/tasks/t602-shots/census602.js 22 3 420 --json=/tmp/census22.json
node docs/tasks/t602-shots/census602.js 777 1 400 --json=/tmp/census777.json
node docs/tasks/t602-shots/census602.js 301 1 400 --json=/tmp/census301.json
```

可加 `--repo=/path/to/baseline` 指定另一份原始碼；`--save=/tmp/city.json` 匯出測試存檔；`--off` 在開機前關閉T602。預設明確開啟T602，T596保持關閉。程式只在暫存目錄建立執行台架，結束即刪除，不在被驗倉庫加 `_run.js`。

## 剩餘藍灰種類頻率

排除橘色住商工、T601八類及T590已移植素材。T59136類園區屬已移植範圍；水塔、診所、派出所已由T590的獨立家族重畫，不能因 `portedLot591()` 沒認出它們而再次納入。

| 類型 | seed22 | seed777 | seed301 | 合計 |
|---|---:|---:|---:|---:|
| k53 大農場 | 11 | 15 | 3 | 29 |
| k29 回收中心 | 3 | 3 | 0 | 6 |
| k49 油井 | 3 | 3 | 0 | 6 |
| k85 樂齡中心 | 3 | 3 | 0 | 6 |
| k92 遛狗公園 | 3 | 3 | 0 | 6 |
| k104 社區菜園 | 3 | 2 | 1 | 6 |
| k117 天然氣井 | 2 | 2 | 2 | 6 |
| k88 堆肥場 | 2 | 3 | 0 | 5 |

T601的歷史「最常見八類」敘述漏列大農場；本輪按重新量測的root頻率排序。這份台架也逐項復現T601卡面八類數量（159、27、26、21、15、10、10、8）。本輪選53，並在六棟同分組中選遍布三城的104及117。

## v11.210 舊檔與新圖並存

```bash
node docs/tasks/t602-shots/oldsave602.js --json=/tmp/oldsave602.json
```

此工具在讀入index之前把模擬localStorage設為槽3，並在開機前開啟T602。驗證三份原檔的SHA256，再依改動前獨立盤點的root指紋驗證全部k/lv/v/尺寸/lot欄位，逐格檢查root/ref，存檔後比對關鍵欄位，再次載入比對完整root資料。根指紋格式及排序見 `fixtures/manifest.json`。

這裡是Node資料相容驗證，不能代替真瀏覽器的畫面、互動與效能驗收。舊檔指的是本輪改動前v11.210存檔；不把它冒稱為任意歷史版本覆蓋。

## Linux完整閘門的PNG壓縮環境

T270要求三張圖示逐bytes可重建。Linux一般libz會使192圖示變成590bytes，雖然像素和解壓scanline完全一致，但不符合原581bytes指紋。

已用真正的zlib-ng2.2.5相容函式庫＋Pillow12.2.0復現三張原圖示SHA256，不改PNG、不改生成器、不改任何測試判準。`tools/setup_t602_zlib.sh` 從官方PyPI固定網址下載zlib-ng1.0.0 sdist，先驗SHA256，再編譯內含的zlib-ng2.2.5；所有安裝都留在指定暫存目錄，不更換系統libz。

```bash
source tools/setup_t602_zlib.sh /tmp/glimmertown-png-runtime
python tools/verify.py
python -m unittest tools.test_toolchain
```

在CI中，環境腳本與完整閘門須在同一個shell步驟執行，或明確把環境變數傳給下一步。完整套件不可並行重跑，以免記憶體壓力造成SIGKILL。
