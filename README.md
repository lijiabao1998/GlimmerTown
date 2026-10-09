# 微光小鎮 Glimmerville

**一座長期生長中的城市模擬。**

GlimmerTown 是一個從單檔瀏覽器城市建造遊戲一路演化而來的長期工程：核心玩法、城市系統、程序化美術、驗證工具與數百輪迭代都保留在同一條可追溯的開發歷史裡。

目前原始碼：**v11.212 · T603**
核心執行檔：`index.html`（約 **4.5 MB / 50,852 行**）

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

## 本輪：T603 原生美術與雲端發布整合

回收中心、長者中心、狗公園、堆肥站各三款已批准藍灰美術；保留完整原生 Canvas、日夜動畫、既有存檔、模擬與亂數契約。沒有採用實驗性的保留圖層、來源觀察器或 CanvasKit renderer。

GitHub 本倉庫是本輪原始碼與驗收紀錄來源。雲端 Pages 只發布七個已核對的 runtime 檔案，沿用獨立主線存檔／快取空間，不讀写 Lab 或使用者電腦的城市。候選分支不會部署；main 必須通過完整驗證、Linux 畫面／模型／存檔檢查、原生前景瀏覽器的原相對效能／存活門檻、套件契約與真瀏覽器升級／離線存檔重開，才可發布並驗實際 HTTPS。

這是已批准美術的增量發布，不宣稱 55 FPS、速度提升或新效能架構完成。活躍整城診斷的未通過項與原始資料獨立保留。實際是否已部署，以 [Pages 工作流](https://github.com/lijiabao1998/GlimmerTown/actions/workflows/town-main-pages-candidate.yml) 和發布後驗證結果為準。

- [本輪已批准的跨環境驗收政策](tools/pages/RELEASE-ACCEPTANCE621.md)
- [T603 美術與歷史驗證](docs/tasks/t603-shots/README.md)
- [雲端套件與發布邊界](docs/tasks/main-pages/README.md)
- [T602 → T603 升級、存檔與離線重開契約](tools/pages/UPGRADE618.md)

## 前輪已驗：T602

**藍灰第二批：大農場、社區菜園、天然氣井，各三款新圖；補齊背水碼頭。**

- 大農場三款保留四作物階段
- 三類日夜、四季、四向、近遠景與施工／鄰棟遮擋驗證
- 背水碼頭依真水方向挑款，原T601前岸三款保留
- 320–420px窄屏分類列與展開工具列保留右側縮放鈕通道
- T591/T601已批准素材、橘色住商工、既有模擬／存檔／亂數不變；T596/T600預覽仍關閉

業主於2026-10-06看完16張原始PNG後確認本輪上線。正式玩家部署沿用本機canonical master的交易式流程；GitHub本倉庫是來源與收件鏡像，未改用Lab Pages。

已驗工程候選的完整驗收：

- `verify.py`：**ALL GREEN，發版收口12,525 PASS／0 FAIL**；六組哨兵一致
- 工具鏈 **63／63**
- 真Chrome **390項檢查、366張PNG，例外／console／應用錯誤0**
- 原1,580個sprite鍵零變動、新增6鍵；兩次獨立開機指紋一致
- 三份v11.210種子存檔往返相容；手機四寬度收展／真觸控建造／存讀檔通過

性能界線：桌機同鏡頭暖幀p95約3.7ms，首次新圖冷烘焙約151ms。Headless手機短RAF樣本原圖／新圖約2.8／2.9fps，兩者暖繪製約13–18ms且沒有暖幀反覆烘焙；**這不是實機手機FPS保證**。

來源：
- [T602驗收結果](docs/tasks/t602-shots/results602.json)
- [已驗候選CI](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37414898575)
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
