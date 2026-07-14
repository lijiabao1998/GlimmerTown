// T35 圖書館系統最小 DOM mock 測試
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock（複製自 test_t34.js）----
const elMap = new Map();
function makeEl(tag, id) {
  const listeners = {};
  const children = [];
  const style = {};
  const dataset = {};
  const el = {
    tagName: tag,
    id: id || '',
    className: '',
    classList: { add() {}, remove() {}, contains() { return false; } },
    style,
    dataset,
    textContent: '',
    innerHTML: '',
    width: 100,
    height: 100,
    addEventListener(ev, fn) { listeners[ev] = listeners[ev] || []; listeners[ev].push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    click() { this.dispatchEvent({ type: 'click' }); },
    appendChild(c) { children.push(c); return c; },
    insertBefore(c) { children.unshift(c); return c; },
    removeChild(c) { const i = children.indexOf(c); if (i >= 0) children.splice(i, 1); return c; },
    remove() { if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext(type) {
      if (type === '2d') {
        return {
          save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
          beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, rect() {}, fillRect() {}, strokeRect() {},
          arc() {}, arcTo() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
          fill() {}, stroke() {}, clip() {},
          fillText() {}, strokeText() {}, measureText() { return { width: 10 }; },
          drawImage() {}, putImageData() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; },
          createLinearGradient() { return { addColorStop() {} }; },
          createRadialGradient() { return { addColorStop() {} }; },
          createPattern() { return {}; },
          setTransform() {}, resetTransform() {}, clearRect() {}, setLineDash() {},
          globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
          canvas: el
        };
      }
      return null;
    },
    children,
    _listeners: listeners
  };
  if (id) elMap.set(id, el);
  return el;
}

const ids = ['game','hud','money','day','pop','jobs','happy','rci','bStats','bHelp','bUndo','bSpeed','bSound','bSave','bNew','hint','hintTxt','hintX','tools','toasts','dragcost','mini','zoomer','zin','zout','info','infoX','infoBody','start','logo','bContinue','bNewGame'];
ids.forEach(id => makeEl('div', id));
makeEl('canvas', 'game');
makeEl('canvas', 'logo');
makeEl('canvas', 'mini');

const document = {
  querySelector(s) {
    if (s.startsWith('#')) return elMap.get(s.slice(1)) || makeEl('div');
    if (s.startsWith('.')) return makeEl('div');
    return makeEl(s);
  },
  querySelectorAll(s) {
    if (s === '.tool') return [];
    return [];
  },
  createElement(tag) { return makeEl(tag); },
  title: '',
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
  visibilityState: 'visible',
  body: makeEl('body')
};

const store = {};
const localStorage = {
  getItem(k) { return store[k] === undefined ? null : store[k]; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};

const navigator = {
  clipboard: null,
  serviceWorker: { register: () => Promise.resolve() }
};

const location = { protocol: 'file:' };

const window = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
  AudioContext: function() { this.state = 'suspended'; this.createGain = () => ({ gain: { value: 0 }, connect() {} }); this.createOscillator = () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 } }); this.destination = {}; this.suspend = () => {}; this.resume = () => {}; },
  webkitAudioContext: function() { return new window.AudioContext(); },
  requestAnimationFrame() {},
  GV: undefined,
  document,
  localStorage,
  navigator,
  location
};

global.window = window;
global.document = document;
global.navigator = navigator;
global.localStorage = localStorage;
global.location = location;
global.requestAnimationFrame = window.requestAnimationFrame;
global.AudioContext = window.AudioContext;
global.webkitAudioContext = window.webkitAudioContext;

// ---- 載入 index.html 中的 script ----
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let js = '';
let i = 0;
while (true) {
  const s = html.indexOf('<script>', i);
  if (s === -1) break;
  const e = html.indexOf('</script>', s);
  if (e === -1) break;
  js += html.slice(s + 8, e) + '\n';
  i = e + 9;
}
eval(js);

// ---- 測試輔助 ----
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

const N = window.GV.N();
function idx(x, y) { return y * N + x; }
function tile(x, y) { return window.GV.tile(x, y); }
function place(t, x, y) { return window.GV.place(t, x, y, true); }
function step(n) { return window.GV.step(n); }

// ---- 場景：道路 + 電廠 + 兩組住宅 ----
const TEST_SEED = process.env.GT_SEED ? +process.env.GT_SEED : 1;
window.GV.newWorldSeeded(TEST_SEED);
window.GV.weather(0);
window.GV.addMoney(5000); // 測試用資金，確保建造與維護無虞

// 找一個離邊緣夠遠的陸地中心
let cx = Math.floor(N / 2), cy = Math.floor(N / 2);
outer: for (let y = 10; y < N - 20; y++) {
  for (let x = 10; x < N - 20; x++) {
    let ok = true;
    for (let dy = -8; dy <= 20 && ok; dy++) {
      for (let dx = -15; dx <= 15 && ok; dx++) {
        const t = tile(x + dx, y + dy);
        if (!t || (t.t !== 1 && t.t !== 2)) ok = false;
      }
    }
    if (ok) { cx = x; cy = y; break outer; }
  }
}
console.log('build center:', cx, cy);

// 橫向主幹道
for (let x = cx - 12; x <= cx + 12; x++) place('road', x, cy);
// 縱向道路到 B 區
for (let y = cy; y <= cy + 14; y++) place('road', cx, y);
// B 區橫向道路
for (let x = cx - 3; x <= cx + 3; x++) {
  place('road', x, cy + 11);
  place('road', x, cy + 13);
}
// 電廠（A/B 各一，確保道路通電）
place('plant', cx - 10, cy - 1);
place('plant', cx - 2, cy + 6);
place('plant', cx + 2, cy + 12);

// A 區：圖書館半徑6內（受加成）
for (let x = cx - 3; x <= cx + 3; x++) {
  place('zr', x, cy - 1);
  place('zr', x, cy + 3);
}
const libraryPlaced = place('library', cx - 2, cy + 1);
assert(libraryPlaced, '圖書館應成功建造');

// B 區：無圖書館覆蓋（對照組）
for (let x = cx - 3; x <= cx + 3; x++) {
  place('zr', x, cy + 10);
  place('zc', x, cy + 12);
  place('zr', x, cy + 14);
}

// 先跑一段時間讓建築生長；若未長出足夠住宅則繼續嘗試
let innerTargets = [], outerTargets = [];
for (let attempt = 0; attempt < 6; attempt++) {
  step(60);
  innerTargets = [];
  outerTargets = [];
  for (let x = cx - 3; x <= cx + 3; x++) {
    for (let y of [cy - 1, cy + 3]) {
      const t = tile(x, y);
      if (t.bld && t.bld.k === 1) innerTargets.push({ x, y });
    }
  }
  for (let x = cx - 3; x <= cx + 3; x++) {
    for (let y of [cy + 14]) {
      const t = tile(x, y);
      if (t.bld && t.bld.k === 1) outerTargets.push({ x, y });
    }
  }
  if (innerTargets.length >= 2 && outerTargets.length >= 2) break;
}

assert(innerTargets.length >= 2, '應找到至少兩棟圖書館覆蓋區內的住宅');
assert(outerTargets.length >= 2, '應找到至少兩棟無圖書館覆蓋區的住宅');

// 測量幸福差異（排除生病）
let innerHappy = 0, outerHappy = 0;
for (const p of innerTargets) {
  const b = tile(p.x, p.y).bld;
  if (!b.sick) innerHappy += b.h;
}
for (const p of outerTargets) {
  const b = tile(p.x, p.y).bld;
  if (!b.sick) outerHappy += b.h;
}
innerHappy /= innerTargets.length;
outerHappy /= outerTargets.length;
console.log('inner/outer happiness:', innerHappy, outerHappy);
assert(innerHappy > outerHappy, '圖書館覆蓋區住宅幸福應高於外側');

// 記錄當前等級，再跑一段時間觀察升級速度
const innerLvBefore = innerTargets.map(p => tile(p.x, p.y).bld.lv);
const outerLvBefore = outerTargets.map(p => tile(p.x, p.y).bld.lv);
step(120);
const innerLvAfter = innerTargets.map(p => tile(p.x, p.y).bld).filter(b => b).map(b => b.lv);
const outerLvAfter = outerTargets.map(p => tile(p.x, p.y).bld).filter(b => b).map(b => b.lv);
const innerLvGain = innerLvAfter.reduce((a, b) => a + b, 0) - innerLvBefore.reduce((a, b) => a + b, 0);
const outerLvGain = outerLvAfter.reduce((a, b) => a + b, 0) - outerLvBefore.reduce((a, b) => a + b, 0);
console.log('inner/outer level gain:', innerLvGain, outerLvGain, 'remaining', innerLvAfter.length, outerLvAfter.length);
assert(innerLvGain >= outerLvGain, '圖書館覆蓋區住宅升級速度應不低於外側');

// 測試存檔/讀檔：圖書館保留
window.GV.save();
window.GV.newWorld();
window.GV.load();
const loadedLibrary = tile(cx - 2, cy + 1);
assert(loadedLibrary.bld && loadedLibrary.bld.k === 14, '讀檔後圖書館應保留');

// 測試就業與維護費
const fin = window.GV.stats();
console.log('stats:', fin);

console.log('\nT35 DOM mock 測試全部通過');
process.exit(0);
