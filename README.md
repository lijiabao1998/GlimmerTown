# 微光小鎮 Glimmerville

**一座長期生長中的城市模擬。**

GlimmerTown 是一個從單檔瀏覽器城市建造遊戲一路演化而來的長期工程：核心玩法、城市系統、程序化美術、驗證工具與數百輪迭代都保留在同一條可追溯的開發歷史裡。

目前主線：**v11.210 · T601**  
核心執行檔：`index.html`（約 **4.4 MB / 50,578 行**）

> Build a city. Let it live. Keep the history.

---

## 現在它是什麼

最初的 GlimmerTown 是一個「鋪路 → 分區 → 城市自己長起來」的小遊戲；現在主線已經成為一個高密度、長期維護的城市模擬單體。

目前包含的核心層面包括：

- **城市建造**：道路、住宅／商業／工業分區、公共設施、多格建築、拆除、復原
- **基礎設施**：電力、供水、污水、垃圾處理與服務覆蓋
- **公共服務**：消防、警察、醫療、教育、郵政、墓園等
- **交通與物流**：道路層級、鐵路、輕軌、港口、機場、停車與多種交通設施
- **經濟與治理**：稅率、政策、預算、就業、維護費、城市等級與評分
- **城市事件**：天氣、季節、火災、災害、疾病與其他動態事件
- **城市生活**：晝夜、燈光、車流、行人、施工、生長、升級與建築老化
- **歷史與觀察**：統計、通知、成就、顧問／因果追溯、存檔與分享碼

它仍然以瀏覽器即可執行為前提，核心美術與大量視覺資產以 Canvas 程式化生成／烘焙，不依賴外部遊戲素材包。

---

## 最新主線：T601

T601 是目前主線的最新美術批次：

**藍灰重畫第一批：8 類滿版新圖落地**

- 公園
- 發電廠
- 垃圾場
- 地熱
- 溫室
- 信仰中心
- 民宿
- 釣魚碼頭

每類都有多款變體，並處理日／夜／冬季狀態；新圖保持既有模擬、存檔與亂數行為不變。

最新機械驗收包括：

- `verify.py`：**ALL GREEN**
- **PASS = 12,513**
- 六組核心哨兵保持一致
- 既有 sprite 指紋 **1,556 鍵零變動**，新增 24 鍵
- 模擬人口不變
- 真實 Chrome 驗證例外：**0**

完整細節見：

- [架構與代碼地圖](docs/ARCH.md)
- [變更歷史](docs/CHANGELOG.md)
- [驗證說明](docs/VERIFY.md)

---

## 三條開發線

GlimmerTown 現在不是只有一個 repo，而是三條彼此有明確角色的長期線：

### 1. [GlimmerTown](https://github.com/lijiabao1998/GlimmerTown)

**主線。**

成熟、長期維護、歷史最完整的 2D 單體。  
這裡優先考慮相容性、可回退、既有存檔、模擬穩定與可驗證修改。

### 2. [GlimmerTown-lab](https://github.com/lijiabao1998/GlimmerTown-lab)

**美術與高變異實驗線。**

新的視覺語言、建築資產、城市風格與多 agent 實驗先在這裡快速演化，再由人工 taste gate 決定哪些值得留下。

### 3. [GlimmerTown3D-lab](https://github.com/lijiabao1998/GlimmerTown3D-lab)

**3D 模組化重建線。**

不是把主線「改成 3D」，而是把多年累積在 2D 系統裡的城市規則逐一拆出、驗證、對拍，再重建成模組化 Three.js／TypeScript 世界。

---

## 為什麼仍然是單體

主線的巨大 `index.html` 不是「還沒來得及拆」的臨時狀態，而是一條有意保留的歷史產品線。

它的價值包括：

- 單檔即可保存與移動
- 長期存檔與版本相容
- 修改能直接對既有世界做回歸
- 大量歷史行為仍可被機械驗證
- 每一輪施工都能精確追蹤「什麼變了、什麼不該變」

模組化重建則交給 3D 實驗線處理。兩條線承擔不同任務，不互相取代。

---

## 驗證文化

這個專案不是「畫面看起來沒壞就算完成」。

主線長期保留：

- 健康釘與固定指紋
- sprite 指紋與像素回歸
- Chrome 實跑
- 模擬哨兵
- 可回退 feature flag
- 變更前後的資料／人口／亂數流檢查
- 對抗式 regression tests

重要原則：

> **變動不一定是壞事，但一定要有人知道。**

詳細入口：

- [VERIFY.md](docs/VERIFY.md)
- [HEALTH-PINS.json](docs/HEALTH-PINS.json)
- [SPR_PINS.json](docs/SPR_PINS.json)
- [RULES.md](docs/RULES.md)

---

## 快速開始

最簡單的方式是直接用瀏覽器開啟 `index.html`。

若要透過本機 HTTP：

```bash
python -m http.server 8123
```

然後開啟：

```text
http://localhost:8123/
```

手機若要使用完整 PWA / Service Worker，請使用固定的 HTTPS 網址。
LAN IP 的明文 HTTP 並不等於 localhost，也不保證完整 PWA 能力。

### 存檔提醒

存檔跟著 browser origin：

> **換網域、IP 或 port = 換 origin = localStorage 存檔彼此獨立。**

需要搬家時，請使用遊戲內的分享碼匯出／匯入。

---

## Repository map

主要檔案：

- `index.html` — 主遊戲與主線 runtime
- `test_fixde.js` — 大型回歸／驗證入口
- `sw.js` — Service Worker
- `manifest.json` — PWA manifest
- `atlas.html` — 圖像／資產觀察工具
- `docs/ARCH.md` — 現況架構與代碼地圖
- `docs/CHANGELOG.md` — 長期施工歷史
- `docs/ROADMAP.md` — 路線與後續方向
- `docs/LINEAGE.md` — 系統血統與演化
- `docs/COLLAB.md` — 多 agent / 協作規則

---

## 開發哲學

GlimmerTown 的開發方式可以壓成幾句話：

1. **先保住真實行為，再談重構。**
2. **能測的就不要靠印象。**
3. **新視覺不能偷偷改模擬。**
4. **每個重要變更都留下回退路徑。**
5. **失敗、退修與被否決的方案也是歷史的一部分。**
6. **主線追求耐久；實驗線追求探索。**

---

## 原創性

GlimmerTown 使用「城市建造模擬」這一公共玩法類型，但程式碼、美術、名稱、數值與專案結構均為獨立建立。

專案沒有使用 TheoTown 的素材、代碼或資料；相關比較文件只用於玩法／系統研究與差異記錄：

- [THEOTOWN-PARITY.md](docs/THEOTOWN-PARITY.md)
- [SURPASS.md](docs/SURPASS.md)

---

## 狀態

**Active development.**

主線目前：**v11.210 · T601**  
實驗線與 3D 線仍持續演化；README 只描述可公開確認的現況，不取代 `docs/ARCH.md` 與 commit history 作為工程真相源。
