# 多 AI 協作規約（T351）

三方（Claude / Kimi / Codex）都可施工。以下是**唯一**一份權威說明；任何與此衝突的舊副本一律作廢。

---

## 一、地理：哪個目錄是什麼

| 路徑 | 身分 | 可否寫 |
|---|---|---|
| `C:\dev\glimmer-town` | **原始碼唯一真相**（git `master`） | 只有「當班施工者」可直接寫 |
| `安卓探索\bay-kimi` | Kimi 的施工車位（git worktree，分支 `bay/kimi`） | Kimi 專屬 |
| `安卓探索\bay-codex` | Codex 的施工車位（git worktree，分支 `bay/codex`） | Codex 專屬 |
| `安卓探索\glimmer-town` | **玩家遊玩目錄（部署目標）**，只放執行期檔案 | 只由合併後的部署步驟寫 |

**車位＝真 git worktree**，共用 `C:\dev\glimmer-town` 的物件庫與 config。所以在車位裡：
`git log` / `git diff master` / `node test_fixde.js` 全部照常，寫入只影響自己分支，**不可能撞車**。

### 進場三連（每次開工第一件事，鐵律21）

```bash
git rev-parse --abbrev-ref HEAD     # 我在哪個分支
git log --oneline -1                # HEAD 是什麼
grep -o "GAME_VER='[0-9.]*'" index.html
```

三者對不上就先問，別動手。歷史事故：有人讀到部署目錄裡搬家前的殘留 `.git`（HEAD=T308/v7.1），
得出「測試紅、+2641 行未提交、專案飛到一半」四項全錯的結論（真倉庫當時全綠全提交）。

---

## 二、端口配置（獨立 origin ＝ 獨立 localStorage ＝ 保護玩家存檔）

| 端口 | 服務目錄 | 用途 |
|---|---|---|
| **8123** | `安卓探索\glimmer-town` | **玩家的城市在這個 origin 的 localStorage 裡。任何人不得在此跑測試。** |
| 8124 | `C:\dev\glimmer-town` | 當班施工者驗證 |
| 8125 | `安卓探索\bay-kimi` | Kimi 驗證 |
| 8126 | `安卓探索\bay-codex` | Codex 驗證 |

瀏覽器端測試前必做：`localStorage.setItem('glimmerville.v1.slot','3')` — **只用槽 3，絕不碰 s1/s2**（鐵律3）。

---

## 三、施工流程

1. 在自己車位開工，卡面照舊（定位錨／允許觸碰／禁區／驗收／回滾）。
2. **驗收三件套**缺一不可：
   - `node -e` 語法檢查（`new Function` 整個 script 區塊）
   - `node test_fixde.js` → **必須 1850+ PASS / 0 FAIL**
   - 瀏覽器實測（自己的端口，非 8123）
3. 版本升號只能用 `python tools/bump.py <新版本>`（一次同步 index.html 的 `GAME_VER` 與 sw.js 的 `APP_VER`；
   測試有斷言比對兩者相等，漂移立刻紅）。
4. CHANGELOG 手寫一條（設計如此：卡面敘事不自動生成）。
5. `git commit` 到自己分支 → 通知合併。合併由當班者做 `git merge bay/<name>`，衝突就地解。
6. 部署只在 `master` 上做：`cp index.html sw.js` 到 `安卓探索\glimmer-town`，並驗**逐位元相同**。

---

## 四、不可違反的硬約束（詳版見記憶 iron-rules）

- **鐵律2 亂數流**：新增消耗 `R()` 的 sprite 生成只能放 `buildSprites` 尾端；改公式不得改變 `R()` 呼叫次數/順序。
  40+ 個釘定種子值（如 seed301 400 天 pop=4153）就是位元契約，動了就紅。
- **鐵律13 load 重建**：新多格建築必須進 `MSZ` 表，否則 root 失 `sz` → ref 格全失。
- **鐵律14 稅收守衛**：新 k 若會抵達 tick 第二經濟迴圈，必須補顯式 `else if(b.k===K);`，
  否則 fall through 到工業稅，`lv≥4` 時 `JOBSI[lv]` 為 `undefined` → money NaN → 存檔崩壞。
- **鐵律18 行中註釋**：錨定替換段中間一律用 `/* */`；行尾 `//` 前必查同行是否還有後續語句（已犯三次）。
- **鐵律19 AI 行為**：改 AI 時，資金/決策旋鈕全是擲骰子（實測非單調：k=0/.25/.5/1 → 3155/474/3418/387）。
  只能用「健康城市永不進入的狀態」做手術式介入，並用多種子**崩城率**驗收。
- **鐵律20/22 換行與版本**：`.gitattributes` 已強制 LF、`backups/`+`attic/` 標 `-text`（位元契約）。
  任何 git 還原/切換後驗 `CRLF==0`。

---

## 五、審查角色（不需授權即可做）

跨區**讀**與跨區**跑測試**都不需要授權。所以任何一方隨時可以當審查員：

```bash
git -C C:\dev\glimmer-town log --oneline -5
cd C:\dev\glimmer-town && node test_fixde.js
git -C C:\dev\glimmer-town diff HEAD~1 --stat
```

值得抽查的點：釘定種子斷言是否真的覆蓋健康種子、位元恆等宣稱是否有對照數據、
CHANGELOG 是否記了「被否決的方案與否決依據」（本專案要求記，因為那是最貴的資訊）。

---

## 六、OneDrive 風險提醒

兩個車位在 OneDrive 同步範圍內。本專案曾因 OneDrive 毫秒級回退 `index.html` 而搬到 `C:\dev`。
車位是 git worktree，所以回退**可偵測可復原**：

```bash
git status --short      # 出現非預期修改 → 可能是同步回退
git diff | head -40     # 確認內容
git checkout -- <file>  # 復原到自己的 commit
```

紀律：**改完就 commit**，別讓未提交的成果在 OneDrive 裡過夜。
