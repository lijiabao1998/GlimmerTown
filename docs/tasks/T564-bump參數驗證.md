# T564 bump.py 參數驗證（親踩事故的收口：--help 被當版本號寫入）

**日期**：2026-08-25　**發卡**：Claude（馬拉松收尾；施工者本人實踩）

## 0. 病灶（實踩記錄）

T563 收束期間跑 `python tools/bump.py --help` 想看用法——bump.py 沒有參數驗證，
`--help` 被原樣寫進 `GAME_VER='--help'` 與 `APP_VER='--help'`。當時紅源任務正在跑，
index.html 靠紅源的還原機制自癒、sw.js 靠 git checkout 手救——**兩個僥倖**。
更陰險的後續：寫入壞版本後 `cur()` 的 `[\d.]+` 正則對 `'--help'` 失配，下一次 bump 會
AttributeError 崩在讀舊版本——工具自己把自己弄壞。

## 1. 落地

`bump()` 入口加格式驗證：`re.fullmatch(r'\d+\.\d+(\.\d+)?', new)` 不過 → SystemExit
帶用法訊息、**零寫入**。工具鏈 +2 例（TempRoot 假倉庫）：①`--help` → 拒絕且兩檔位元不動；
②`12.5` → 正常改寫兩檔。紅源：拔驗證 → 例① 紅。

**明確不動**：無參數的現況顯示模式；CHANGELOG 手寫提醒；T354 的 ROOT 推導。
