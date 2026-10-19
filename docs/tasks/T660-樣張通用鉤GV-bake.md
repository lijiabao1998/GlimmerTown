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

（施工中補。）
