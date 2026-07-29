# T373 — 直寫 master 的發佈路徑（`--publish`）＋收據復原缺口

狀態：**已完成、非作者覆核通過（Claude 2026-07-29）、已合併 `9724355`。**
發卡：業主（2026-07-29）；出卡文件：Claude；施工者：**Codex（bay/codex）**；覆核：非作者（Claude 或 Kimi）
前置：master `95a2d1c`（v10.5）已含 T372；三車位 `ahead=0 behind=0 clean`；`deploy receipt=match`。

## 施工 claim

- 施工者：**Codex**（`bay/codex`）
- 認領 commit：`3e738b5`（T362 鎖序後的首筆認領提交）
- 預計觸碰：`tools/merge_bay.py`、`tools/test_toolchain.py`、`docs/COLLAB.md`、`docs/CHANGELOG.md`、本卡狀態

## Codex 施工交付（待非作者覆核）

- 新增獨立 `--publish`：只發佈當前乾淨 master HEAD，canonical verifier＋`MIN_PASS`、部署目錄衛生、
  Git blobs、原有 journal／原子替換／receipt 寫入全部照走；不合 bay、不推 master、不建 integration、
  不回同步車位。
- receipt 漂移時 `--publish` 不在 preflight 呼叫 receipt verifier，改以已驗證 HEAD 重發並在完成後強制
  receipt=`match`；原 `start_transaction()` 的 fail-closed receipt 守衛保留且有新增回歸測試。
- 新增 11 個 tempfile 實彈案例（43→54）：正常／漂移修復／髒 master／active transaction／紅 verifier
  零寫入（含可恢復 journal）／殘留／旗標互斥／兩個硬殺切點／master 競態／bay 路徑仍 fail-closed。
- 自驗已親跑：`python -B -m unittest tools.test_toolchain -v` **54/54 OK**（177.429s）；
  `python tools/verify.py` **2897 PASS / 0 FAIL**、CRLF=0、GAME_VER=APP_VER=10.5。
- 本卡**沒有**執行真實 `--publish`，沒有發佈 T372，也沒有碰玩家部署目錄。

## 為什麼指定 Codex

`tools/merge_bay.py` 的交易式部署（journal／原子替換／崩潰復原／收據綁 git blobs）是 T358 的成果，
設計得很嚴謹。本卡要補的是它的一個**結構盲點**，由原作者補最合適；同時 Claude 近幾張卡連續
自己出卡自己施工自己驗收，換人做對制度較健康。

## 問題（Claude 於 T372 施工中撞到，已實測確認）

### 缺口一：直寫 master 的卡沒有受支援的部署路徑

`--deploy` 只是**車位合併交易**的一個階段。當班施工者直接寫 master（COLLAB 第一節明文允許）
完成一張會動執行期檔的卡時，**沒有任何受支援的方式把它發佈給玩家**。
`merge_bay.py --help` 只有 `--deploy | --no-deploy | --resume | --abort | --status`，
四者都必須依附一筆 bay 交易。

實際後果：T372（v10.5）目前**committed 但未發佈**，玩家停在 `cd13b15`（v10.4）。

### 缺口二：收據守衛沒有復原路徑（更嚴重）

`verify_deploy_receipt()`（`tools/merge_bay.py:1711`）在 `start_transaction` 的 preflight
**第三行無條件呼叫**（2057），且失準時 `raise DeployError('...refusing automation')`：

```python
if load_state(state_path) is not None: raise ToolError(...)
if (Path(config.deploy) / DEPLOY_JOURNAL).exists(): recover_deployment(...)
verify_deploy_receipt(config, runner=runner)      # ← 2057，無條件、會 raise
if deploy_requested: validate_deploy_target(...)
```

於是：**只要收據因任何原因失準，整條合併管線永久卡死**，而唯一出路是手改收據——
**那正是收據設計上要讓它不合法的事**（1745-1749 會把 hash 重新綁回該 OID 的 git blobs）。

失準的成因不只人為：手動複製、從備份還原、發佈中途崩潰但 journal 已被清、
OneDrive 晚到回退之後想重新發佈……目前**全部無解**。

**已實測驗證**：Claude 在 T372 手動複製了 v10.5 位元組到玩家目錄（違反 COLLAB 第三節第 7 點，已記錄），
收據仍指向 `cd13b15` → `--status` 直接 `[FAIL] deployed runtime drifted after journal cleanup:
index.html, sw.js; refusing automation`。**換任何一方來執行合併都會撞同一道牆**，
因為那道牆擋的正是唯一能修好收據的那筆交易。已用「從收據 OID 的 git blobs 還原玩家目錄」
暫時解封（現況 `receipt=match`），**但缺口原封不動**。

## 修法方向（業主已裁定，不得更改）

新增 `--publish` 模式：**入口是「直寫 master 的發佈」，但走完全相同的既有閘門與寫入路徑**。

不是新寫一套部署，而是把 `start_transaction` 裡「驗證 → 部署」那一段的**非合併部分**抽出來重用。

### 必須重用（不得複製一份新的）

- `validate_master()`：master 乾淨、HEAD-ref 正常、凍結 OID
- **canonical verifier**：以 master 內的 `verify.py` 驗該 OID（與交易路徑同一支、同一套 fail-closed 判準）
- `validate_deploy_target()` ＋ `assert_deploy_pristine()`（T370）
- `runtime_bytes_at_commit()`：發佈內容只能來自 **git blobs**，不得讀工作樹
- `deploy_runtime_atomic()`：journal、原子替換、失敗回滾、崩潰復原
- 收據寫入：與交易路徑同一段程式碼

### 必須滿足

1. `--publish` 與 `--deploy`／`--no-deploy`／`--resume`／`--abort`／`--status` **互斥**。
2. 有進行中交易時 `--publish` 必須拒絕（同 preflight 現有規則）。
3. **收據修復**：`--publish` 必須能在收據失準的狀態下執行成功——這是它同時要解的缺口二。
   換言之：`--publish` 自己的 preflight **不得**呼叫會 raise 的 `verify_deploy_receipt`；
   但**必須**在發佈完成後寫出正確收據，使後續 `--status` 回 `match`。
4. `--publish` 不得推進 master、不得建 integration worktree、不得碰任何 bay。
5. PASS 棘輪：發佈前必須驗證該 OID 的套件綠且 `PASS >= MIN_PASS`（沿用既有判準）。

## 允許觸碰

- `tools/merge_bay.py`：新增 `--publish` 及其實作；抽出可重用的發佈序列
- `tools/test_toolchain.py`：本卡測試
- `docs/COLLAB.md`：第七節補「直寫 master 的發佈」與收據復原說明
- `docs/CHANGELOG.md`：一條；本卡狀態行
- **不 bump 版本**（純工具鏈，無執行期改動；比照 T366／T370／T371）

## 禁止觸碰

- **不得放寬任何既有守衛**。特別是：不得讓 `verify_deploy_receipt` 在合併路徑上變成警告，
  不得降低 `MIN_PASS`，不得讓 `assert_deploy_pristine` 可略過。
  本專案 `verify.py` 的 harness 契約明文防「為了讓測試變綠而拆守衛」，同一原則適用於此。
- `index.html` / `sw.js` / `test_fixde.js`（本卡零執行期改動）
- 收據的 schema 與「hash 必須綁回 exact source OID」的判準
- `RUNTIME` 白名單、`DEPLOY_ALLOWED`

## 不變量

1. 既有 42+ 例 `test_toolchain` 全數維持通過，**一例都不得修改其斷言**。
2. `--publish` 走完後 `--status` 必須回 `deploy receipt=match`。
3. 發佈的位元組必須逐位元等於該 OID 的 git blobs。
4. 崩潰語意與交易路徑一致：journal 在、可 resume、mixed 狀態能恢復。

## 驗收清單

**全部在 `tempfile` 拋棄式 repo 上做，不得碰真實玩家目錄。**

1. `python -B -m unittest tools.test_toolchain -v` 全綠，例數 43 → ≥48。
2. 新增故障注入，至少涵蓋：
   - a. 正常 `--publish`：位元組正確、收據寫出、`--status` 回 match
   - b. **收據失準狀態下 `--publish` 能修復**（造一份指向舊 OID 的收據＋現場檔案是新 OID，
     驗 `--publish` 成功且事後 `--status` match）——**這是本卡的核心案型**
   - c. master 髒 → 拒絕
   - d. 有進行中交易 → 拒絕
   - e. 套件紅（注入 verifier 失敗）→ 拒絕且玩家目錄零寫入
   - f. 部署目錄有殘留（T370）→ 拒絕
   - g. `--publish` 與其他旗標同帶 → argparse 拒絕
   - h. 發佈中途硬殺 → journal 留存、下次可恢復
3. `python tools/verify.py` ALL GREEN（本卡不改 index.html，PASS 應維持 2897）。
4. **`--publish` 不得繞過閘門的證明**：把 canonical verifier 注入為紅，確認玩家目錄零寫入。

## 回滾

純工具鏈新增；`git revert` 單一 commit。玩家目錄不受影響（本卡不執行真實發佈）。

## 阻塞規則

- 若「重用既有序列」在實作上必須改動既有函式簽章，導致既有測試需要修改斷言 →
  **停手回報業主**，不得自行修改既有測試。
- 若發現 `--publish` 與收據守衛存在無法兼顧的矛盾 → 停手回報，附具體衝突點。

## 預先裁定（避免施工中停下來等業主，業主可能在休息）

| 疑問 | 裁定 |
|---|---|
| `--publish` 要不要接受指定 OID？ | **不要**。只發佈 master 當前 HEAD，減少誤用面。 |
| 要不要順便做 `--rollback`？ | **不要**，另卡。本卡只解「發佈」與「收據修復」。 |
| 收據失準時要不要先要求人工確認？ | **不要**。`--publish` 本身就是明示動作，再加確認等於沒有自動化路徑。 |
| 要不要把 `verify_deploy_receipt` 改成回傳狀態而非 raise？ | **不要**。合併路徑維持 fail-closed；`--publish` 走自己的 preflight，不呼叫它。 |
| 要不要順手把 T372 發佈出去？ | **不要**。本卡只交付工具；發佈由業主或當班者事後執行 `--publish`。 |
| 測試例數上限？ | 不設。但每一例都要是實彈（注入→紅→還原→綠），不得只驗型別。 |
| 版本要不要 bump？ | **不要**。純工具鏈。 |

## 交接資訊

- master HEAD：`95a2d1c`（v10.5，2897 PASS/0 FAIL）
- 收據現況：`match`，`source_oid=cd13b15`（玩家跑 v10.4）
- 收據位置：`<git common dir>/glimmer-merge/deploy-receipt.json`
- 相關行號（`tools/merge_bay.py`，會漂移，以符號為準）：
  `verify_deploy_receipt` 1711、preflight 呼叫 2057、`deploy_runtime_atomic` 1602、
  `runtime_bytes_at_commit` 1132、`assert_deploy_pristine`（T370）、`validate_deploy_target` 1113
- 車位：`bay-codex`（分支 `bay/codex`，驗證埠 8126）
- 開工第一件事：先把最新 master 併入車位（COLLAB 第八節鎖序）
