# T598 統計面板「🔧 v3.0 維護」只數 root（業主裁決 S1）

**發卡／施工**：同 T597 的決策單第二題（S1＝開小卡修）。業主 2026-09-27「我覺得你來做就行」，Claude 採預設 S1。Claude 出卡＋施工。
**claim**：同 T597（worktree `C:\dev\gt-t597`，分支 `fix/t597-cemcap`，等 T596 推上後 rebase 落地）。驗證埠 8129+（真 Chrome、載入前設槽 3），不碰 8123／8199。
**合併權**：canonical master 直寫（T373 路徑）後 `git push`。Claude 出卡＝施工同一方，未經第三方覆核，如實聲明。不做 `--publish`。

## 定位錨

- `index.html` `function showStats(){` 的逐類計數 else-if 鏈（`const kCnt=Object.create(null);` 之後）與 `const v3Up=` 那一行。
- tick 的扣款真值：主計數迴圈開頭 `if(!b||b.ref)continue;`（只數 root）＋ `upkeep=roadUpkeep+…` 那一行的係數。

## 病灶（工作流 showstats-audit 逐一核對）

- T574 起火車站 k17（3×3）、港口 k18（3×3）、輕軌站 k21（2×2）、風力 k26（2×2）、污水廠 k27（3×3）、救護站 k28（2×2）、回收中心 k29（2×2）、高級消防 k30（3×3）變成多格地塊，ref 格帶 k；showStats 這 8 個計數沒有 `!b.ref`，一座算成 4／9 座，進 `v3Up` → 「🔧 v3.0 維護」多報 ×4／×9。
- 救護站係數：tick 自 T95 起是 `am*4`，面板還是 T89 抄的 `nAm*3`。其他 15 個係數與 tick 同值。
- 另有 8 個逐格計數（消防局 k6、學校 k7、垃圾場 k8、警察局 k11、醫院 k12、圖書館 k14、郵局 k15、墓園 k16）宣告並累加、但從未被讀；照樣加 `!b.ref`（行為零變化），免得哪天被接到一列上又多報。
- 純顯示：模擬扣的維護費走主迴圈，本來就只數 root。

## 做法

1. 上述 16 個計數各加 `&&!b.ref`（沿用同段 k19／20／22–25／31／32 的既有寫法，ref 格落空不命中任何分支）。
2. `v3Up` 的 `nAm*3` → `nAm*4`；該行行尾加 T598 註解。

## 允許觸碰

- `index.html`：showStats 的 16 個計數條件、`v3Up` 一個係數＋行尾註解。其他一行都不改。
- `test_fixde.js`：新增 T598 守衛塊（執行尾端、T595 之後、完成標記之前）。
- `docs/ARCH.md`、`sw.js`（只經 bump）、`docs/SPR_PINS.json`（只准 `__meta.ver`）、`docs/CHANGELOG.md`、本卡。

## 守衛（T598 G0–G7）

自建新城（空城日淨額 0、服務預算全 1），8 類各蓋一座新地塊＋一座舊存檔形態 1×1；係數從 tick 的 `upkeep` 原文抽（G1b）、根數用 `GV.tile` 普查；G2a tick 當天真扣款＝root 數×係數；**G2 面板＝tick 真扣款**；G5 開面板零副作用；G3 不過天再蓋一座 3×3 火車站面板只多 6（面板是即時重數）；G4 過一天仍相等；G6 面板 16 個係數與 tick 同名項逐一同值；G7 showStats 掃描迴圈 32 個逐類計數裡，凡多格種類一律帶 `!b.ref`。

## 驗收

- 紅源（整倉複本、完整套件）：原樣→G2；只加 ref 不改救護站→G2；只改救護站→G2；漏一個 ref（k26）→G2；k17 除以面積假修法→G2；沒蓋的類係數漂移（nPr*6）→G6；只漏墓園死計數→G7；只做 9 個必要改動、8 個死計數不動→G7；控制組綠。首紅必須是 T598 守衛。
- 真 Chrome：新蓋一座 3×3 火車站，「🔧 v3.0 維護」顯示 −6.0（不是 −54.0）。
- verify.py ALL GREEN、PASS 不降、六哨兵逐位恆等、`SPR_PINS` 1,552 鍵零差異。

## 回滾

`git revert <T598 commit>`（純顯示層）。
