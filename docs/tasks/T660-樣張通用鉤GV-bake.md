# T660 樣張通用鉤：GV.bake(k,v,winter,season)
<!-- card: families=無; valve=; owner_ok=; removed_asserts=0 -->

**claim**：Claude；分支 `claude/town-bake-hook-660`；base `ac3351e`（v11.236）。首個提交只有本卡。

## 目標

主線現在沒有任何「把某一類建築畫成一張圖」的通用入口：每次做美術卡，寫入者都得在 `index.html` 臨時加一支只給那張卡用的樣張鉤（T658 的 `GV.art658` 就是這樣），卡收掉鉤子就變垃圾，樣張腳本也要重寫一次（T658 期間重寫五支）。

本卡只加一支**唯讀的除錯鉤**：

```js
GV.bake(k, v=0, winter=false, season=null) → {
  k, v, winter, src: 'lot'|'spr', w, h, ax, ay,
  img:  PNG dataURL, night: PNG dataURL|null
} | null | { error }
```

它走**畫面本來就在走的那條路**：`LOT_PLAN574[k]` 有配方 → `lotSprite574(k,v,2,winter,false)`（含 T591 貼圖、T634/T601 各批與本卡之後的新圖）；否則退回 `SPR.bld['k_1_v']`（k11／k12 先看 `policeVar`／`hospitalVar`）。`season` 給了就暫改 `day`、結束還原。

用途只有一個：寫入者與業主在**不進遊戲**的情況下看樣張（日／夜／冬／四季／四視角），把「畫圖 → 看 → 改」從半小時縮到 5 秒。

## 允許觸碰

- `index.html`：在 `GV` 物件裡新增 `bake:` 一支（唯讀，不改任何既有函式、精靈、繪製路徑）。
- `docs/ARCH.md` 依 `tools/arch_map.py --fix` 更新；`docs/CHANGELOG.md` 追加一列；`tools/bump.py` 升版。
- 本卡。

## 範圍外

不改任何美術、不改繪製、不改存檔、不改模擬、不動 `tools/`／`.github/`／規則檔、不動既有斷言。本次改動造成的回歸不算範圍外。

## 驗收（動手前固定）

- [ ] `GV.bake` 四種情形都對：T591 貼圖類（k=7）、園區配方類（挑一個不在 `portK590` 的）、一般 SPR 類（k=4 公園）、不存在的 k 回 `null`。
- [ ] 純讀：同參數連呼兩次，`img` 逐位相同；呼叫前後 `GV.stats()` 不變；不寫 `localStorage`、不抽 `R()`。
- [ ] `season` 參數有效且會還原 `day`（0 春／1 夏／2 秋／3 冬，冬＝有雪）。
- [ ] 非美術卡：CI 的 frame 零變、fp 零變。
- [ ] `node test_fixde.js` 全套綠；版本 11.236 → 11.237。

## 施工證據

**做了什麼**

`index.html` 的 `GV` 物件新增一支 `bake(k, v=0, winter=false, season=null)`（放在 `artAtlas646` 之前），內容只有二十行：

- `LOT_PLAN574[k]` 有配方 → `lotSprite574(k, v, 2, winter, false)`（這條就是畫面在走的路：T591 貼圖、T634／T601 各批、之後的新圖都在裡面）；
- 否則退回 `SPR.policeVar`／`SPR.hospitalVar`（k11／k12）或 `SPR.bld['k_1_v']`／`'k_1_0'`；
- `season` 給了就暫改 `day`（`[1,101,201,301][0..3]`）、`finally` 還原；
- 回 `{k,v,winter,season,src,w,h,ax,ay,img,night}`，圖是 PNG dataURL；找不到圖回 `null`，例外回 `{error}`。

**實際跑過的（不是推論）**

- `node test_fixde.js`：**12768 PASS / 0 FAIL**（含 T371b 的 ARCH 版本釘）。
- 樣張實烘（走插件 `town_bake`，起 headless Chrome 呼叫這支鉤子）：`k=7`、`v=0/1/2`、`season=0/3` 共 6 張，全部 `src="lot"`、`208×240`、`ax=104`、`ay=232`；拼成 1288×990 接觸表，三種配色與春天／冬天兩列都正確顯示出 T591 貼圖的學校外觀。
- 版本 11.236 → 11.237（`tools/bump.py`）；`docs/ARCH.md` 版本行與 `arch_map.py --fix` 已同步。

**還沒跑的（不寫「通過」）**

- CI 的 frame／fp／browser 各道與 Codex 審查：交 PR。
- 「同參數連呼兩次逐位相同、`GV.stats()` 不變」目前是設計上成立（純讀、不呼叫 `R()`、不改狀態），但**沒有寫成斷言**；若要釘進守衛，屬後續卡。
- 四視角：這支鉤子只吃季節，視角仍由引擎在繪製時決定；要四視角得另開參數（後續卡）。

**已知限制**

- 需要該 checkout 的 `index.html` 已有這支鉤子；在 T660 合併前，插件要指到 `C:\dev\town-660` 這種工作樹。
- dataURL 一次回一張圖，多張由呼叫端拼；沒有做磁碟快取（每次都是新烘焙，`lotSprite574` 自己的快取仍在）。

