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
   - `node test_fixde.js` → **必須 1902+ PASS / 0 FAIL**
   - 瀏覽器實測（自己的端口，非 8123）
3. 版本升號只能用 `python tools/bump.py <新版本>`（一次同步 index.html 的 `GAME_VER` 與 sw.js 的 `APP_VER`；
   測試有斷言比對兩者相等，漂移立刻紅）。
4. CHANGELOG 手寫一條（設計如此：卡面敘事不自動生成）。
5. **提交前跑一鍵驗證**（五項一次做完，任一紅就不該提交）：

   ```bash
   python tools/verify.py
   ```

   語法／`CRLF==0`／版本雙處同步／Node exit=0／**至少 1902 PASS**／0 FAIL／
   正常完成標記／**兩條亂數流哨兵**。其中任何一項缺失都判紅；「程序崩潰但來不及印
   `FAIL:`」不再可能被當成綠燈。
   第五項專防一種作弊：為了讓測試變綠而刪掉釘定種子斷言 —— 那等於拆掉整個位元契約。

6. `git commit` 到自己分支 → 通知合併（合併流程見第七節；出卡與合併權見第八節）。
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

## 六之二、部署目錄衛生（T370，機器守衛）

`安卓探索\glimmer-town` 是**玩家的遊玩目錄**，只能有執行期檔案。這條從 T349 起就是規矩，
但一直沒有機器在守，於是 T359→T369 連續十張卡把 **66 個 review PNG／probe HTML（19.1 MB）**
堆了進去。其中 **10 個 probe** 會 `<iframe src="index.html">` 載入同目錄遊戲並執行
`newWorldSeeded(301); addMoney(...)`，而且 **0/10 設過 slot 3**；配上 `curSlot()` 遇不合法鍵回 **1**
與 25 秒自動存檔，就是一顆對玩家存檔的未爆彈（實際引爆需要有人從 8123 打開 probe）。

**現在有守衛了**：`merge_bay.py` 的 preflight 會掃描部署目錄，白名單外多出**任何檔案或任何目錄**
就 fail-closed，交易在動 master 之前就停。目錄比檔案更危險——T349 那次誤導審閱者的殘留 `.git`
就長在這個位置。

紀律：
- **實拍與 probe 一律放自己的車位、用自己的埠**（8125／8126／8127），不要放進玩家目錄。
- 若真有新的執行期資產要進玩家目錄，改 `merge_bay.py` 的 `DEPLOY_ALLOWED`——
  這是刻意的摩擦，逼人做出「這檔該不該讓玩家看到」的明確決定。
- 部署步驟自己的 `.glimmer-deploy-*` 暫存檔不算殘留（掃描會跳過前綴）。

---

## 七、交易式合併流程（T358）

車位施工完成後，由當班者在 `master` 執行**一條命令**：

```bash
cd C:\dev\glimmer-town && python tools/merge_bay.py kimi --deploy
```

（`codex`／`grok` 同理；**`--deploy` 與 `--no-deploy` 互斥必填**（T358.1 起，缺旗標會被直接擋下）；`--status` 會列各車位 ahead/behind，
並檢查 active transaction 與部署 receipt，發現漂移會以非零退出。）腳本**只能從
`C:\dev\glimmer-town` 的 `master` 執行**；車位裡那份副本會拒絕
運行，避免把施工分支誤認成合併主控台。

### 直寫 master 的發佈與收據復原（T373）

若一張合法的直寫 `master` 卡已改動執行期檔，當班者要從 canonical master 明示發佈：

```bash
cd C:\dev\glimmer-town && python tools/merge_bay.py --publish
```

`--publish` 只發佈**當前乾淨 master HEAD**：它不合任何 bay、不推進 master、不建 integration worktree、
也不回同步車位。它仍會跑 master 內 canonical verifier（PASS 不得低於 `MIN_PASS`）、驗部署目錄身份與
純淨度、只從 frozen HEAD 的 Git blobs 取 `index.html`／`sw.js`，再走同一條 journal／原子替換／receipt
寫入路徑。它與 `BAY --deploy/--no-deploy`、`--resume`、`--abort`、`--status` 互斥，且有 active transaction
時直接拒絕。

這是**唯一**允許在 receipt 已誠實報紅時修復的明示動作：`--publish` 不會在前置階段把舊 receipt 當作
通行證；它重發已驗證 master，完成後仍必須讓既有 receipt verifier 回 `match`。不要手改 receipt，也不要
手動複製 runtime。bay 合併／resume 路徑的 receipt 漂移守衛維持 fail-closed，不能拿 `--publish` 繞過一筆
尚未完成的 bay transaction。

### 不可變量

- 開始時釘住 `master` 基底 B 與 bay 交接點 S 的完整 OID；後續不拿會移動的分支名代替交易輸入。
- 合併只發生在鎖定的 `C:\dev\glimmer-town-integration` worktree。衝突、語法錯誤、測試崩潰與
  1897 PASS 都只留在 integration；`master` 不進 `MERGE_HEAD`。
- integration 產生兩父提交 M（父代必須精確為 B、S），由 canonical master 內的可信
  `verify.py` 驗證；只有 `verified_oid == M` 才能把 master 以 `--ff-only` 從 B 推到 M。
- 任何 Git 查詢非零退出都判紅；`status` 查詢失敗絕不解讀成 clean。
- 同一時間只容許一筆交易；交易狀態持久寫進共用 Git 目錄，程序被中斷後可對帳續接。

### 正常流程

| 步 | 動作 | 為什麼非機械化不可 |
|---|---|---|
| 1 | 驗 canonical master／bay 路徑、分支、HEAD-ref、共用 Git 目錄、clean 狀態，凍結 B/S | 防錯目錄、detached HEAD、查詢假綠與測試期間漂移 |
| 2 | 用 master 內的 verifier 驗 bay，並在完成後重驗 B/S 未變 | incoming 分支不能把閘門本身改弱 |
| 3 | 從 B 建獨立 integration worktree，合入**精確 S OID**，產生 M | master 在衝突與紅測試期間逐位元不動 |
| 4 | 再用可信 verifier 驗 M，驗後重查 HEAD 與 clean 狀態 | 防「兩邊各自綠，合起來紅」及測試期間篡改 |
| 5 | master 仍精確等於 B 時，執行 `git merge --ff-only <精確 M OID>` | master 只接受剛驗過的 M，不追隨可能移動的 integration branch ref |
| 6 | `--deploy` 才發布 `index.html`、`sw.js`；最後才替換 SW | SW install 不會先把舊 index 收進新快取 |
| 7 | 只把 clean 且純 behind 的 bay 用 `--ff-only` 回同步 | ahead／diverged／dirty 車位一律列為 skipped，絕不替別人合併 |

### 衝突、續接與放棄

衝突只留在腳本列出的 integration 路徑。到該處解衝突並 `git add`，**不必手動 commit**，然後：

```bash
cd C:\dev\glimmer-town
python tools/merge_bay.py --resume kimi
```

`--resume` 先把持久狀態與 Git 現況對帳：只接受仍在 B+S 合併中的 worktree，或父代精確為
B/S 的既有 merge commit；master 若已從 B 前進，不會偷偷把新 master 再混入舊交易，而是停手。
若決定丟棄尚未進 master 的證據，才顯式執行：

```bash
python tools/merge_bay.py --abort kimi
```

已經推進 master 的交易不能 abort，只能 resume 完成部署／同步／清理。

### 部署 journal 與誠實邊界

部署內容直接從 verified M 的 Git blobs 讀取，不讀可能被編輯器改動中的 master 工作樹。
腳本會先驗 `_這是部署目錄請勿在此施工.txt` 與 runtime 白名單，在 8123 目錄先持久建立
不可覆寫的 journal，然後才寫同 filesystem 的舊檔備份與新檔 stage，依序以 `os.replace`
發布 `index.html` → `sw.js`。發布失敗且回滾寫入成功時，會立刻把**兩檔都回滾**並逐位元驗證；
若回滾本身也失敗，journal 會保留，待故障解除後由 resume 恢復，絕不假稱已回滾。
若程序被強殺或斷電，下次 merge/resume 會讀 journal：兩檔都已是 new 時，先把 exact source
OID 的 Git blobs 與 live runtime 逐檔核對，將該 OID＋兩檔 expected hash receipt 持久寫入
Git common-dir，最後才刪 journal；任何 mixed 狀態都由備份恢復成 old。若 target hash 已不屬於
journal 的 old/new（例如較新部署），則零寫入停手，絕不拿舊備份降級。下一次命令會把 receipt
重新綁回該 OID 的 blobs，既能抓 OneDrive 晚到回退，也不接受手造 hash 自圓其說。
若已標記 committed 但尚未清完 journal 時兩檔又一起回到可證明的 old，resume 會先把
`deployed` 狀態持久退回 false，再重發同一個 verified OID，避免留下無法續接的假 committed。

這不是檔案系統提供的「跨兩檔同時原子交易」：HTTP client 理論上仍可能在兩次 replace 的毫秒級
窗口讀到混版；要消除此窗口必須停 8123 server，或改成版本目錄後原子切 server root。journal
保證的是**崩潰後可判定、可恢復，不假裝兩個檔名能在同一瞬間切換**。
同理，Windows／OneDrive 的雲端持久性不是 `fsync`／`os.replace` 能替供應商承諾的；receipt 的
作用是讓晚到回退變成明確紅燈，而不是宣稱它不會發生。

`atlas.html` 是施工圖鑑，只供 8124／8125／8126。它刻意不在 runtime 白名單，永遠不 mirror
到玩家 8123 目錄。

### 時間與輸出

車位 gate 與 integration gate 會跑兩次完整套件，約 3～4 分鐘。呼叫端 timeout 應至少 25 分鐘；
即使外層被中斷，也不要猜進度或手動補 merge，直接從 master 執行同一 bay 的 `--resume`。驗收數據
只寫真跑結果；未跑就明標「未驗證」。

bay 回同步的 clean→`--ff-only` 仍以本文件的**單寫者協議**為前提：合併程序持鎖期間，bay 擁有者
不得同時寫該 worktree。Git 沒有能阻止非合作編輯器／OneDrive 在兩個系統呼叫之間落檔的「目錄交易鎖」；
因此觀測到 dirty、ahead、diverged 會零寫入 skipped，但不把非合作的同毫秒寫入誇稱為可原子隔離。

---

## 八、出卡、鎖序與合併權（T362）

第七節把「合併這個動作」做成交易式、互斥、可續接；但 T358.1／T361 事故證明還缺一層：
**卡從哪來、誰先施工、誰能按合併鈕**當時都沒有唯一真相，於是兩張都碰 `tools/`＋CHANGELOG 的
卡各自成立、互不知曉，T361 搶在 T358.1 之前進 master。本節補上這層人的流程；工具層不變。

### 三個角色分離

| 角色 | 誰能當 | 規則 |
|---|---|---|
| **發卡**（卡號＋施工順序） | **只有業主**（或業主指定的一方） | 卡號與順序的唯一發卡源 |
| **施工**（接卡寫 code） | 四方皆可 | 在自己車位，過第三節驗收閘門 |
| **合併**（執行 `merge_bay.py`） | 四方皆可，**只要不是作者本人** | 從 `C:\dev\glimmer-town` 的 master 執行 |

### 三條規則

1. **發卡集中**：任何一方都可以**提案**卡面（定位錨／允許觸碰／禁區／驗收／回滾五欄齊全，
   如 Codex 提案 T358.1），但卡號與「先做哪張」經發卡源確認才生效。
   杜絕兩張卡同時存在而互不知曉。
2. **開工鎖序＋觸碰宣告**：接卡第一件事永遠是把最新 master 併入自己車位再動工
   （T358.1 若出卡時就做這步，後續衝突不會發生）；同時在 `docs/tasks/` 留一條 claim
   （卡號／施工者／預計觸碰的檔案群）。兩卡觸碰集合相交——尤其 `tools/`、`index.html`
   共用段、`docs/CHANGELOG.md`——**強制串行**：後卡等前卡進 master 才開工。
3. **作者不自合**：`merge_bay.py` 只能由**非作者**的一方從 canonical master 執行
   （T361 由 Kimi 覆核合併 Grok 即為正例；Grok 主動聲明「不自審自合」是對的自律，
   本節把它變成制度）。合併者須會解 integration 衝突與 `--resume` 續接；
   首次擔任合併者的一方，由有經驗的一方陪跑一次確認手法一致。

### 接卡速查表（動手前對表自查）

```
業主(發卡) → 任一方(寫卡面) → 任一方(施工) → 另一方(合併) → master
```

| 檢查 | 合法 | 不合法 |
|---|---|---|
| 發卡 | 業主確認卡號＋順序（AI 可提案卡面） | AI 自定卡號、自排序直接開工（T358.1/T361 事故根源） |
| 合併 | 非施工者的任何一方執行 `merge_bay.py` | 施工者合併自己的卡（自審自合） |
| 順序 | 觸碰相交的卡串行；開工先把最新 master 併入車位 | 相交卡並行施工；在舊 master 上動工 |

中間三站誰站都行，只有兩個限制：**起點永遠是業主；最後一站不能是上一站那個人。**

### 寫卡面的三個必查（T374 事故）

出卡者自查，避免卡面自相矛盾把施工者逼進死路：

1. **「bump 版本」與「禁止觸碰 `sw.js`／`docs/ARCH.md`」不能同時寫。**
   `APP_VER` 住在 `sw.js`，且有一條斷言比對它與 `GAME_VER` 相等（T349）；
   `docs/ARCH.md` 的現況行必須宣告當前版本，否則 T371b 守衛紅。
   要 bump 就必須把這兩檔列進**允許觸碰**，並限定「只改版本字，不得夾帶」。
2. **卡面引用的既有函式要先查作用域。** T374 初稿要施工者「照 `field()` 的手法」，
   但 `field()`／`plantGrid()` 定義在另一個區塊，精靈建構處根本拿不到——
   卡面必須寫明是「抄手法」還是「呼叫」，並列出該處實際拿得到的頂層工具。
3. **CHANGELOG 條目的位置也是守衛。** 標頭 `# CHANGELOG` 必須在第 1 行，
   條目接在慣例區之後、彼此最新在最上。寫在第 1 行會把標頭擠掉 ⇒ 閘門直接紅。
   **加完 CHANGELOG 才是交付前最後一次跑閘門的時機**，不是加之前。

### 指紋比對有雜訊底：半透明像素的 ±1 捨入（T380 實測）

指紋 diff 出現「非目標鍵」不一定是流位移事故。T380 覆核時 `bld/2_2_11`（住宅）日層 hash 變了，
查到底是：**3~4 個半透明玻璃窗像素（alpha 121/180/194）的 ±1 捨入**。
canvas 內部存預乘 alpha，`getImageData`/`putImageData` 往返對低 alpha 像素會掉精度。

**判別流程（照這個順序，不要看到非目標鍵就停手，也不要看到一筆就放行）：**

1. 量該鍵的**不透明像素數、bbox、逐列剖面、前 12 主要色** —— 全同則不是內容改變。
2. 找出差異像素，看 **alpha 是否 < 255**。是 ⇒ 捨入雜訊。
3. **排除流位移**：流位移會**擴散**。找一個在改動點【之後】才生成的大家族
   （例如 `stampRoof` 對 k1/k2/k3 共 108 鍵），若它們沒一起變，就不是位移。
   再確認新碼的 `rand(`/`spriteTexRand`/`R()`/`ri(` token 數與 `cv(`/`plate(` 呼叫數未變。
4. **做對照組**：在乾淨 master 上做一個同區域的瑣碎改動（例如把某矩形改窄 1px），
   看該鍵會不會跟著漂。不漂 ⇒ 不是「任何改動都會擾動」，漂 ⇒ 純環境雜訊。
5. 以上都指向雜訊 ⇒ **記錄放行**；任何一步不成立 ⇒ 停手回報。

⇒ 卡面不要寫「指紋出現非目標鍵就停手」這種二值阻塞規則，會把雜訊誤判成事故。

### 出卡的自我檢核不能用同一個模型驗自己（T380 事故）

T380 卡面要施工者「先斷言地墊菱形格數 == 4161」當防錯。但 4161 是連續范數
`|dx|+2|dy| ≤ 64` 的整數解數，而 `plate`→`dia`（`index.html:1017-1025,1178`）實際光柵是
**4224 px**（逐列 `x ∈ [cx-w, cx+w-1]`，右邊少 1 px；`y 84..147` 沒有 y=148；
最寬列 y115 與 y116；光柵對稱中心 (67.5,115.5)）。兩者對稱差 129 px。

出卡者量到「4161 ✓」是因為**先用范數篩格子、再數那些格子不透明** ——
只證明了「范數區內都不透明」，沒證明「地墊等於范數區」。**自我檢核必須拿另一個來源當真值**
（此處＝直接重跑 `dia()` 的迴圈），否則就是循環論證，還會把錯的數字交給施工者當基線。

### 覆核的盲區：指紋比對只證明「沒有不該變的」（T379 事故）

atlas 指紋全比對是流位移事故唯一的網（Node 端對純流位移失明），但它有一個結構性盲區：

> **它證明「沒有不該變的鍵變動」，不證明「該變的鍵變對了」。**

T378 覆核時比對出「204 變動鍵、零不可解釋漂移」並判定通過。但 k22 的 16 個鍵本來就在
預期變動白名單裡 —— 而它們正是壞掉的那批（精細田放大後把自帶穀倉蓋掉 57~100%），
指紋比對對此完全失明。玩家隔天就回報「農場蓋住普通建築」。

**所以覆核必須成對做：**

1. **指紋 diff** ⇒ 界定「哪些鍵變了」，確認沒有意外的鍵。
2. **對變動鍵本身做視覺／量化驗證** ⇒ 確認變對了。
   方法：對同一鍵在兩版之間量特徵色的像素數（例如「自帶建築色存活率」），
   或直接看 atlas 圖。**卡面若寫了「不得蓋到 X」，覆核就必須有一條檢查對應它。**

T378 卡面自己寫了「不得蓋到農場自帶的穀倉／建築（各變體自查）」——
施工者沒自查，覆核者也沒驗。**卡面的每一條「不得」都要在驗收清單裡有對應的檢查項。**

### 誠實邊界

本節是**協議**不是程式：`merge_bay.py` 的單交易鎖能保證「合併動作」互斥，
但擋不住非合作的自行發卡或作者偷按合併鈕。發現違規的補救是事實核查（`git log` 圖、
`--status`、部署 receipt）＋退件，不是事後改歷史。施工權可以分散；
**發卡權與合併權必須集中**——這是本節的一句話版本。
