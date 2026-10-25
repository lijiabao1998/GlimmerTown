# P06 Port Operations UX / Touch Hardening
<!-- card: families=無; valve=noP06; owner_ok=業主 2026-10-25「只把目前工程驗收式 UI 改成桌機與手機都能自然操作的遊戲介面，並新增真正的 touch / pointer 驗收。」「仍保持 Draft，不合併、不部署。」; removed_asserts=0 -->

claim: GPT (Codex)；既有獨立候選 `gpt/port-p06-native-harbor` / Draft PR73。精確起點 `f1483c40d35bd6db30f44fab59477d865e60a1d6`。正式 main T707 `379b7ad92eaa34be5a10ce5a5e1786a8f67e6bd8` 本輪已重新確認。原P06交付已於2026-10-25 16:28UTC送達；本卡是業主16:36新授權的UI跟進，不是重開港口模擬或P07。

## 允許觸碰

只在 `docs/previews/port-p06/**` 新增UI層、UI-only純契約/真Chrome驗收、必要的既有UI測試導覽調整、證據與說明。主要定位錨是 `build.cjs` 的 `const ui=`／`#p06-panel`；可把這段抽為候選UI檔案。`native-browser.cjs` 的既有222個驗收判定、全部raw性能矩陣保留，僅為新收合/診斷導覽調整實際操作，再在原驗收之後追加獨立UI測試。

既有 `native-bridge.js`、`native-layout.js`、P01–P05、`native-performance.js`、`native-vector-cache.js` 不改語意；以保留原位元組為原則。若測試確需觀察原生input closure，只准在候選fixture加只讀觀察器，不動原生輸入處理。禁止改 `P06.advance`、replay/accepted-time、港口/路/水/dock合法性、watchList、immutable ID、30件守恆、經濟、存檔、財政、人口、AI、main、Pages。既有與已批准新工作流都不改；沿用候選證據工作流，追加測試由候選runner調用。

## 凍結驗收（不事後改鬆）

1. 玩家層為「⚓ 港區營運」、港口名稱/序號/岸向、簡潔狀態、船上/堆場/車上/已出閘四項真實count；raw座標不作主名稱。吊具持貨不假算入其他owner，完整30件及reason codes在診斷可查。
2. 三個主要動作：檢查/重新檢查、明確啟用/停用、收合。開面板以只讀 `P06.scan()` discovery 更新港口列表，不啟用、不改world/ledger/time；多港可用有意義名稱的原生select。未啟用的檢查不偷偷啟用。正常live語意不改；replay返回城市時間只在需要時顯示或放診斷。
3. 所有原QA能力移入「測試與診斷」但不刪：五fixture、重播吊起/裝車/出閘、reset保留原confirm cancel/confirm、clock/座標/layout原始診斷/reason codes。玩家簡潔原因與詳細原原因相符。
4. 1440桌面預設收合小chip；展開320–380 CSS px，rows/cards而非debug長段，不遮大量港口/主岸橋泊位畫面。
5. 真Chrome touch context 412×915、390×844、360×800；全部互動control bounding box至少44×44，主要動作至少48px高；無水平overflow、panel不出viewport，portrait狀態/四counts可讀。使用safe-area、內部scroll，不撐整頁、不遮死原生HUD/底部工具列/右側zoom；收合佔小區域。
6. 真pointer/touch/click/wheel證明panel事件邊界：tap不建造/拆除/選取world；panel drag/scroll不拖鏡頭，select不漏world，表單原生行為正常；跨邊界/取消不留下capture，收合後world點擊/拖曳/縮放正常。不可只呼叫JS函式冒充觸控。
7. 1440真UI完整操作：expand/collapse/discovery/select/check/enable/disable/reset取消與確認/live return/診斷drawer；三手機寬度真tap/drag/scroll與boxes。每次操作以真狀態/快照/可信事件證據核對。保留失敗raw證據及修正，不忽略錯誤。
8. 1440、412、390、360各保留baseline before與新expanded/collapsed全frame原PNG，不裁掉周遭native UI；日/夜/非法拒絕等必要狀態可補充。
9. 精確新head重新跑原P06全部222驗收、cargo/OFF整幀/native pins/economy/lifecycle、cold/warm/longrun/匹配ground/terminal性能及全部P01–P05與原生守衛。原source/fixtures/期望不為UI而放鬆；新增UI測試不能污染原性能量測。
10. 如實比較UI前後性能，不以UX成功當release-ready：原scope/gate紅、cold +2.4–3.9ms、longrun severe stalls、同候選ON/OFF Canvas排隊交互仍是未解除限制。不把OFF stall當成已證明原生獨有問題，也不選跑出好看的性能樣本。
11. 最終交付exactSHA、真可操作HTML、before/after原圖、touch/pointer隔離結果、原回歸與完整CI狀態、性能差及正式發布blockers。Draft保留，不合併、不部署、不更新方向暫停。

## 環境與回滾

own dot cloud；Browser擴充的js工具未提供，本機Chrome已知sandbox/socket受限，不關沙箱繞過。業主明確要求的真Chromium驗收使用原已授權官方CI，測試全新profile/記憶體slot3、非玩家origin/8123。UI可丟棄或回到精確f1483c40候選；不需要改正式來源。

## 首卡狀態

本提交只凍結新UX驗收，尚未實作或通過；結果另附，不改本卡條件。多批次/背壓只讀研究屬另一工作，不在本卡實作。
