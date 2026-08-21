# T553 run_cmd 子行程編碼（工具鏈假紅：地圖沒漂，是子行程講 cp936）

**日期**：2026-08-21　**發卡**：Claude（T552 ROADMAP 稽核判定「四條真欠之首」，業主「繼續」）
**出處**：T370 合併首輪被擋的根因，ROADMAP 掛帳自 2026-07-29；帳本 91 條升格為程式碼欠帳。

## 0. 病灶（2026-08-21 稽核實測復現，不是推論）

`tools/verify.py` 與 `tools/merge_bay.py` 各有一個 `run_cmd`（各自檔內**唯一**的
`subprocess.run` 呼叫點），都對子行程輸出做嚴格 `decode('utf-8')`、解不開就把
returncode 改寫成 125。而子 Python 行程走 pipe 時 stdout 用系統碼頁（本機 cp936），
印中文就炸：

- **活案例**：verify 第 6 閘跑 `arch_map.py --check`，該工具綠路徑也印中文
  → cp936 位元組 → 解碼失敗 → rc 被改寫 125 → 印「code map RED … drifted」。
  **地圖根本沒漂，是子行程講 cp936。**
- 三週來靠人肉紀律頂著（跑 merge 帶 `PYTHONUTF8=1`，記憶與帳本各記一條）——
  這正是本卡要消滅的形態：**把紀律寫進記憶，不如把它寫進程式碼。**

## 1. 落地（兩行修，兩條守衛看守）

兩個 `run_cmd` 的 `subprocess.run` 各加：

```python
env={**os.environ, 'PYTHONUTF8': '1', 'PYTHONIOENCODING': 'utf-8'},
```

**為什麼兩個變數缺一不可**：`PYTHONIOENCODING` 對 stdio 有最高優先權（UTF-8 mode
也讓位給它），少了它，敵意父環境（如 `PYTHONIOENCODING=gbk`）會穿透 `PYTHONUTF8=1`；
`PYTHONUTF8` 則涵蓋 fs/argv 等 stdio 以外的文字層。**展開順序讓我方值覆蓋父值**＝
敵意環境被中和，這是修法的核心，不是巧合。非 Python 子行程（node/git/Chrome）
無視這兩個變數，無副作用。

**同族病防治（譜系第七例的預防）**：同一條規則寫在兩處（verify 與 merge_bay 各一份）。
**不抽共用模組**——動 merge 管線的 import 結構，風險大於兩行重複；改由
**兩條各自的故障注入測試**看守：任何一份漏掉 env，它自己的測試就紅。

## 2. 為什麼這張卡是安全的

不碰 `index.html`／`sw.js`／`test_fixde.js`。⇒ **不 bump、不 arch、不 fp_snapshot、
六哨兵無涉**。工具鏈測試 57 → 60 例。

## 3. 驗收計畫

- **G1（靈魂）verify 注入測試**：敵意環境（`mock.patch.dict` 設 `PYTHONIOENCODING=gbk`、
  pop `PYTHONUTF8`）下，`verify.run_cmd` 跑一個印 `sys.stdout.encoding`＋中文的子腳本
  → rc 必須是真實 0（不是 125）、中文在 stdout、子行程自報編碼含 utf-8。
  **敵意注入是機器無關的鑑別力**：不靠本機恰好是 cp936——在任何 locale 的機器上，
  gbk 中文位元組都解不開 UTF-8。若測試只是直接跑，會**繼承環境裡的 PYTHONUTF8 而測不到**
  （審計指名的坑，寫進失敗訊息）。
- **G2 merge_bay 注入測試**：同 G1，對 `merge_bay.run_cmd`。
- **G3 行為證明（活假紅收口）**：乾淨環境（pop 兩變數）下
  `verify.run_cmd([python, 'tools/arch_map.py', '--check'])` → rc 0、無「not valid UTF-8」。
  這就是第 0 節那個假紅的直接復現轉綠。
- 紅源：①verify 拔 env= → G1 紅；②merge_bay 拔 env= → G2 紅；
  ③env 只留 PYTHONUTF8、拿掉 PYTHONIOENCODING → G1 **仍必須紅**
  （證明優先權論證是真的，兩變數缺一不可）。

**明確不動**：125 改寫機制保留（launch 失敗與真非 UTF-8 輸出的最後防線）；
`configure_stdio()`（T366b 收的是**輸出側**，另一層）；`fp_snapshot.py` 的 3 處
subprocess（Chrome 子行程，非 Python stdio，無此病）；timeout／input_bytes 路徑。
