// ===== 超大卡實驗室 E5：多種子平衡分佈＋火災政策 A/B =====
const G = window.GV;
const W = (m) => require('fs').writeSync(2, 'FINDING|' + m + '\n');
const stepN = (n) => { for (let i = 0; i < n; i++) G.step(1); };

// ===== E5a 多種子平衡分佈：8 種子 × 400 日 AI =====
const seeds = [7, 22, 101, 202, 303, 404, 505, 606];
for (const s of seeds) {
  G.newWorldSeeded(s); G.setDiff(1);
  G.ai(true); stepN(400); G.ai(false);
  const st = G.stats();
  W('E5a|seed=' + s + ' pop=' + st.pop + ' bld=' + st.buildings + ' money=' + Math.round(st.money) +
    ' happy=' + st.happy.toFixed(2) + ' ruins=' + st.ruins + ' fires=' + st.fires);
}

// ===== E5b 火災政策 A/B：同城 smokeDetect 開關各 200 日，數起火 =====
// （用 ignite 次數不可直接讀——改以 fires 累計與 ruins 增量近似；另以 hist 曲線長度確認）
G.newWorldSeeded(301); G.setDiff(1);
G.ai(true); stepN(300); G.ai(false);
let firesA0 = G.stats().fires, ruinsA0 = G.stats().ruins;
// 關閉（預設）200 日
stepN(200);
const firesOff = G.stats().fires - firesA0, ruinsOff = G.stats().ruins - ruinsA0;
// 開啟 smokeDetect 再 200 日
G.pol(Object.assign({}, G.pol() || {}, { smokeDetect: true }));
firesA0 = G.stats().fires; ruinsA0 = G.stats().ruins;
stepN(200);
const firesOn = G.stats().fires - firesA0, ruinsOn = G.stats().ruins - ruinsA0;
W('E5b-smoke|關:火災' + firesOff + '/廢墟+' + ruinsOff + ' vs 開:火災' + firesOn + '/廢墟+' + ruinsOn +
  '（注意：fires 是當下燃燒數非累計，解讀需謹慎）');
console.log('E5-done');
