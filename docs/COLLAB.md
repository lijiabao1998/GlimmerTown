# 多 AI 協作規約（T351）

四方（Claude / Kimi / Codex / Grok）都可施工。以下是**唯一**一份權威說明；任何與此衝突的舊副本一律作廢。

---

## 一、地理：哪個目錄是什麼

| 路徑 | 身分 | 可否寫 |
|---|---|---|
| `C:\dev\glimmer-town` | **原始碼唯一真相**（git `master`） | 只有「當班施工者」可直接寫 |
| `安卓探索\bay-kimi` | Kimi 的施工車位（git worktree，分支 `bay/kimi`） | Kimi 專屬 |
| `安卓探索\bay-codex` | Codex 的施工車位（git worktree，分支 `bay/codex`） | Codex 專屬 |
| `安卓探索\bay-grok` | Grok 的施工車位（git worktree，分支 `bay/grok`） | Grok 專屬 |
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
| 8127 | `安卓探索\bay-grok` | Grok 驗證 |

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
5. **提交前跑一鍵驗證**（五項一次做完，任一紅就不該提交）：

   ```bash
   python tools/verify.py
   ```

   語法／`CRLF==0`／版本雙處同步／全套 0 FAIL／**亂數流哨兵**。
   第五項專防一種作弊：為了讓測試變綠而刪掉釘定種子斷言 —— 那等於拆掉整個位元契約。

6. `git commit` 到自己分支 → 通知合併（合併流程見第七節）。
7. 部署只在 `master` 上做，並且交給合併腳本的 `--deploy`（它會驗逐位元相同）。手動 `cp` 是歷史做法，已不建議。

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

三個車位在 OneDrive 同步範圍內。本專案曾因 OneDrive 毫秒級回退 `index.html` 而搬到 `C:\dev`。
車位是 git worktree，所以回退**可偵測可復原**：

```bash
git status --short      # 出現非預期修改 → 可能是同步回退
git diff | head -40     # 確認內容
git checkout -- <file>  # 復原到自己的 commit
```

紀律：**改完就 commit**，別讓未提交的成果在 OneDrive 裡過夜。

---

## 七、合併流程（T352）

車位施工完成後，由當班者在 `master` 執行**一條命令**：

```bash
cd C:\dev\glimmer-town && python tools/merge_bay.py kimi --deploy
```

（`codex` 同理；不加 `--deploy` 就只合併不發佈；`--status` 只看各車位領先/落後幾個 commit。）

腳本的七步，任一步紅就停，不會留下半成品：

| 步 | 動作 | 為什麼非機械化不可 |
|---|---|---|
| 1 | 車位工作區乾淨 + 領先 master ≥1 commit，並列出待合併 commit | 防止併入未提交的東西，或做一次空合併 |
| 2 | **在車位裡先跑完整套件**（CRLF=0 + 0 FAIL） | 壞的東西根本進不了 master |
| 3 | master 工作區乾淨 | 避免混入當班者未提交的改動 |
| 4 | `git merge --no-ff --no-edit bay/<name>` | 留下 merge commit，歷史上看得出「這批來自誰」 |
| 5 | 合併後三項機械檢查：CRLF=0、版本雙處同步、全套 0 FAIL | 兩邊各自都對、合起來卻壞，是真實存在的狀態 |
| 6 | `--deploy`：寫入玩家目錄並**逐位元比對** | 部署與倉庫不得有差 |
| 7 | 把 master 回同步到**所有**車位 | 讓另一個車位立刻跟上，縮小下次衝突面 |

### 衝突時

腳本**不會** abort，它保留衝突狀態、列出衝突檔，並印出本專案已知的衝突點與解法：

| 檔案 | 解法 |
|---|---|
| `docs/CHANGELOG.md` | 聯集合併，新條目在最上 |
| `test_fixde.js` | 雙方都往同一錨點前插測試 → **兩塊都留** |
| `index.html` | 真衝突：對照卡面的「允許觸碰區」判斷歸屬 |
| 版本字串 | **不要手改**，解完後跑 `python tools/bump.py <ver>` |

解完 `git add -A && git commit`，再重跑同一條命令，它會從第 5 步重新驗一遍。

### 降低衝突的三條紀律

1. **卡要小、合要勤** —— 車位漂越久，這個 16k 行單檔的衝突面越大。
2. **卡面寫清「允許觸碰區」** —— 這是單檔專案唯一可機械化的邊界。
3. **合完立刻回同步全部車位**（第 7 步自動做），讓兩個車位永遠同起點。

### 已知陷阱

腳本會跑**兩次**完整套件（車位閘門 + 合併後驗證），約 3～4 分鐘，**超過某些工具的 2 分鐘逾時**。
若在有逾時限制的環境呼叫，請丟到背景執行；被中斷時合併本身可能已完成而後半檢查沒跑，
此時直接補跑 `python tools/verify.py` 即可（實際發生過一次）。
