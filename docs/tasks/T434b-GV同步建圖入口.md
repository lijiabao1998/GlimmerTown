# T434b　`GV` 同步建圖入口（解開美術像素證據的死結）

- 發卡／施工／覆核／合併：**Claude 全鏈**（業主 2026-08-14 goal 授權；夜班自主選題，**業主未逐項核可**）
- 車位：`bay/kimi`（驗證埠 8125）　起點：`master @ 96aef84`（v11.69，PASS 4,810，ALL GREEN）
- **本卡會動 `index.html`** ⇒ 需要 bump、需要兩釘位元恆等
- 前一張：T434a（把 art_diff 的綠字失敗改成紅字失敗，但沒解開死結）

---

## 0. 死結是什麼（T434a 實測，不是推論）

T426 把開機改成 async 分段，用 `bootPaint426()`（`index.html:21011`）推進：

```js
function bootPaint426(){return new Promise(resolve=>{if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(resolve));…
```

**雙重 `requestAnimationFrame`。** 而 rAF 在「不繪製」的環境裡不觸發。T434a 直接量 `__boot426()`：

| 環境 | 停在 | 意義 |
|---|---|---|
| headless `--dump-dom` 的 iframe | **pct=5**「初始化像素素材引擎…」 | `buildSpritesS1()` 從未被呼叫 |
| Browser 面板**未顯示**時 | **pct=2**「準備啟動城市系統…」 | 同上 |

⇒ **`docs/tools/art_diff.html` 在任何自動化環境下都拿不到素材**，
而它是全專案唯一的像素證據來源（Node harness 的 canvas 是空殼，見鐵訓）。
⇒ **T434b 以後所有美術卡都沒有像素證據可交。**

`index.html:21064` 本來就有一條同步分支：

```js
if(typeof requestAnimationFrame==='function'&&…&&document.getElementById('boot426')){bootstrap426();}else{buildSprites();…}
```

但 `buildSprites` **沒有掛在 window 上**（T434a 實測 `typeof w.buildSprites === 'undefined'`），
`GV` 的 213 個鉤子裡也沒有可強制建圖的入口。**差的就是一個入口。**

---

## 1. 範圍（極小）

**做**：在 `window.GV` 上新增**一個唯讀測試鉤子** `buildAllSprites()`，
呼叫既有的同步總管 `buildSprites()`（不是複製它的內容），回傳 `sprAtlas356()` 的 entries 數。

**不做**：
- 不改 `bootstrap426`、不改 `bootPaint426`、不改 `buildSprites` 本身、不改任何 `buildSpritesS*`。
- 不改任何美術。
- 不在開機路徑上呼叫它（**它只有被外部工具呼叫時才會執行**）。

---

## 2. 施工白名單

`index.html`（**只有 `window.GV` 物件內新增一個方法**）、`test_fixde.js`（只增本卡守衛）、
`docs/tools/art_diff.html`（用這個新入口當退路）、本卡、`docs/CHANGELOG.md`、`docs/ARCH.md`（release tail）、`sw.js`（bump）。

---

## 3. 必守的契約（本卡最大的風險就在這裡）

| # | 契約 | 對本卡的意思 |
|---|---|---|
| C1 | **兩釘位元恆等**：seed301 `pop===3781`、seed22 `pop===4550` | 新方法**不得在開機路徑上被呼叫**，所以不消耗任何 `R()`／`ri()`／`rand()` ⇒ 兩釘結構上不可能被動到。但仍要**實跑驗證**，不能只講道理 |
| C2 | T383c 亂數 token 快照（`test_fixde.js:7600`，`119 / 0x6b858c3b`） | 該快照掃的是 `buildSprites()` 函式體（錨點 `function buildSprites(){` ↔ `\nfunction wealthSpr(`）。**新方法要寫在 `window.GV` 物件裡，不能寫進那個區間** |
| C3 | T272 三條亂數流互不污染 | 新方法只是轉呼叫，不新增任何亂數 |
| C4 | `verify.py`：`index.html` 恰一個 `<script>`、CRLF=0、版本同步 | 照舊 |
| C5 | PASS 齒輪只增不減 | 新增守衛 ⇒ PASS 應 > 4,810 |

---

## 4. 驗收條件

| # | 判準 | 怎麼驗 |
|---|---|---|
| A1 | **兩釘位元恆等**：`pop===3781` / `pop===4550` | `tools/verify.py` ALL GREEN（釘在套件裡） |
| A2 | T383c token 快照**不變**（`119 / 0x6b858c3b`） | 套件裡的斷言；另外自己 grep 確認新方法**不在** `buildSprites()` 函式體內 |
| A3 | `GV.buildAllSprites` 存在且**開機路徑不呼叫它** | 守衛：全檔 `buildAllSprites` 的出現次數＝定義 1 次 ＋ 測試/工具引用，**開機段內 0 次** |
| A4 | **art_diff 在無頭環境真的量得到素材**（這是本卡的目的） | 真跑 `--dump-dom`，輸出必須有 `entries=` 非零且有「—— 量測完成 ——」 |
| A5 | 餵空清冊仍必須紅（T434a 的防呆沒被繞過） | 紅源實跑 |
| A6 | 閘門 ALL GREEN、PASS > 4,810、CRLF=0、版本同步 | 指令輸出 |

**A4 是本卡存在的理由**：如果做完 art_diff 還是量不到，這張卡就是失敗的，要如實寫。

---

## 5. STOP 語意

- `STOP: AWAIT_REVIEW` — A1–A6 全部有實測輸出。
- `STOP: BLOCKED` — 加了入口但 A4 仍達不到（那代表還有第三個根因，要先查清楚再談）。

---

## 6. 一句話

**T434a 把壞掉的尺標成「壞了」，T434b 讓它能量。** 差的只是一個入口——
而這個入口之所以值得單獨立卡，是因為它要動 `index.html`，而那意味著兩釘、token 快照、版本鏈全部要重走一遍。
