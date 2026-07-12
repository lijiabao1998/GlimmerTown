# 通用驗收協議（VERIFY）— 每張任務卡完成後必跑

任務卡自帶的驗收清單是「這張卡專屬」的；本文件是「不管改了什麼都要過」的回歸測試。
**兩者都通過才算完成。**

## 0. 啟動

```
cd glimmer-town
python -m http.server 8123
```
瀏覽器開 `http://localhost:8123`，按 F12 開 DevTools。

## 1. 零錯誤

- [ ] Console 無任何紅色錯誤（載入時、點「開拓新地圖」後、遊玩 1 分鐘內）。

## 2. 標準冒煙腳本（貼進 Console 執行）

```js
(async()=>{
  document.getElementById('bNewGame')?.click();
  const [cx,cy]=GV.center(); const P=GV.place;
  for(let x=cx-8;x<=cx+8;x++)P('road',x,cy);
  for(let y=cy-4;y<=cy+5;y++)P('road',cx,y);
  P('plant',cx+1,cy+1);
  for(let y=cy-2;y<=cy-1;y++)for(let x=cx-7;x<=cx-2;x++)P('zr',x,y);
  for(let y=cy-2;y<=cy-1;y++)for(let x=cx+2;x<=cx+6;x++)P('zc',x,y);
  for(let y=cy+2;y<=cy+3;y++)for(let x=cx-6;x<=cx-2;x++)P('zi',x,y);
  GV.setSpeed(3);
  const s0=GV.stats();
  await new Promise(r=>setTimeout(r,15000));
  const s1=GV.stats();
  console.table([s0,s1]);
  console.log('PASS?',
    s1.buildings>=15 && s1.pop>50 && s1.poweredBld>10 &&
    s1.money!==s0.money && s1.day>s0.day);
})();
```
- [ ] 最後輸出 `PASS? true`。

## 3. 存讀檔往返

- [ ] 點 💾 → 重新整理頁面 → 點「繼續上次的小鎮」→ `GV.stats()` 的 buildings/roads/zones/money 與存檔前一致（day 可略增）。

## 4. 互動抽查（手動，30 秒）

- [ ] 滾輪縮放正常、拖曳平移正常、＋/－按鈕正常。
- [ ] 選「🛣 道路」拖一條路 → 連續不斷；選「🏠 住宅區」拉框 → 顯示成本、放開生效。
- [ ] 檢視工具點一棟建築 → 資訊面板出現且數字合理；✕ 能關閉。
- [ ] 速度按鈕循環 ⏸/1x/3x；🔇 切換後重新整理仍記住。

## 5. 視覺抽查（人眼，模型不能替代）

在 Console 產生縮圖連結給人看：
```js
(()=>{const c=document.getElementById('game');const t=document.createElement('canvas');
t.width=640;t.height=360;t.getContext('2d').drawImage(c,0,0,640,360);
window.open(t.toDataURL('image/png'));})();
```
- [ ] 無錯位、無破圖、無圖層順序錯誤（建築被地面蓋住之類）。
- [ ] 等一個晝夜循環（約 2 分鐘）：夜裡窗燈亮、白天熄。

## 6. 效能護欄（改了繪製/模擬時必跑）

```js
(()=>{let n=0,t0=performance.now();const f=()=>{n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else console.log('FPS≈',(n/3).toFixed(1));};requestAnimationFrame(f);})();
```
- [ ] 桌機 FPS ≥ 55（分頁需在前景）。

## 驗收結果表（貼回覆末尾）

| 項目 | 結果 |
|------|------|
| 1 零錯誤 | ✅/❌ |
| 2 冒煙腳本 | ✅/❌ |
| 3 存讀檔 | ✅/❌ |
| 4 互動抽查 | ✅/❌ |
| 5 視覺抽查 | （由人填） |
| 6 效能 | ✅/❌/不適用 |
| 本卡專屬驗收 | ✅/❌ |
