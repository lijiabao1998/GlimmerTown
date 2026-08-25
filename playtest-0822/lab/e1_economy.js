// ===== 超大卡實驗室 E1：經濟曲線＋稅率敏感度＋政策全矩陣對帳 =====
const G = window.GV;
const W = (m) => require('fs').writeSync(2, 'FINDING|' + m + '\n');
const stepN = (n) => { for (let i = 0; i < n; i++) G.step(1); };

// ===== 場景：seed301 AI 城長到 pop≥3000 =====
G.newWorldSeeded(301); G.setDiff(1);
G.ai(true);
for (let d = 0; d < 500 && G.stats().pop < 3000; d++) G.step(1);
G.ai(false);
const base = G.stats();
W('E-base pop=' + base.pop + ' bld=' + base.buildings + ' money=' + Math.round(base.money) +
  ' happy=' + base.happy.toFixed(2) + ' day=' + base.day);

// ===== E1 對照步基線（10 日均）=====
{
  const mA = G.stats().money;
  let happy0 = G.stats().happy;
  stepN(10);
  const net = (G.stats().money - mA) / 10;
  W('E1-baseline 日淨=' + net.toFixed(1) + ' happyΔ=' + (G.stats().happy - happy0).toFixed(3));
}

// ===== E2 稅率敏感度：taxR/C/I 各 ×0.75 與 ×1.25，各 30 日 =====
for (const key of ['taxR', 'taxC', 'taxI']) {
  for (const mult of [0.75, 1.25]) {
    const cur = G.pol() || {};
    const patch = Object.assign({}, cur); patch[key] = (cur[key] || 1) * mult;
    G.pol(patch);
    const mA = G.stats().money; const p0 = G.stats().pop; const h0 = G.stats().happy;
    stepN(30);
    const net = (G.stats().money - mA) / 30;
    W('E2-tax|' + key + 'x' + mult + ' 日淨=' + net.toFixed(0) +
      ' happyΔ=' + (G.stats().happy - h0).toFixed(3) + ' popΔ=' + (G.stats().pop - p0));
    const back = Object.assign({}, cur); back[key] = cur[key] || 1;
    G.pol(back);
  }
}

// ===== E3 政策全矩陣對帳：逐一開 40 日，量 net/happy/pop 變化 =====
const cur0Full = Object.assign({taxR:1,taxC:1,taxI:1}, G.pol() || {});
const KEYS = Object.keys(cur0Full).filter(k => typeof cur0Full[k] === 'boolean');
W('E3-policy-count=' + KEYS.length);
const cur0 = cur0Full;
// 基線 20 日
let bNet, bH = G.stats().happy, bP = G.stats().pop;
{ const mA = G.stats().money; stepN(20); bNet = (G.stats().money - mA) / 20; }
for (const k of KEYS) {
  const patch = Object.assign({}, cur0); patch[k] = true;
  G.pol(patch);
  const mA = G.stats().money; const hA = G.stats().happy; const pA = G.stats().pop;
  stepN(40);
  const net = (G.stats().money - mA) / 40;
  const dH = G.stats().happy - hA, dP = G.stats().pop - pA;
  // 還原
  G.pol(cur0);
  // 恢復期 5 日洗掉殘留
  stepN(5);
  W('E3-pol|' + k + ' 日淨Δ=' + (net - bNet).toFixed(1) + ' happyΔ/40d=' + dH.toFixed(3) + ' popΔ=' + dP);
}
console.log('E-done');
