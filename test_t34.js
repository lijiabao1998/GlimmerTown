// T34 診所系統最小 DOM mock 測試
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock（複製自 test_t33.js）----
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

// A 區：診所半徑6內（受保護）
for (let x = cx - 3; x <= cx + 3; x++) {
  place('zr', x, cy - 1);
  place('zr', x, cy + 3);
}
const clinicPlaced = place('clinic', cx - 2, cy + 1);
assert(clinicPlaced, '診所應成功建造');

// B 區：無任何健康設施（未受保護）
for (let x = cx - 3; x <= cx + 3; x++) {
  place('zr', x, cy + 10);
  place('zc', x, cy + 12);
  place('zr', x, cy + 14);
}

// 先跑一段時間讓建築生長；若未長出足夠住宅則繼續嘗試
let protectedTarget = null, unprotectedTarget = null;
for (let attempt = 0; attempt < 6; attempt++) {
  step(60);
  outer: for (let x = cx - 3; x <= cx + 3; x++) {
    for (let y of [cy - 1, cy + 3]) {
      const t = tile(x, y);
      if (t.bld && t.bld.k === 1) { protectedTarget = { x, y }; break outer; }
    }
  }
  outer: for (let x = cx - 3; x <= cx + 3; x++) {
    for (let y of [cy + 14]) {
      const t = tile(x, y);
      if (t.bld && t.bld.k === 1) { unprotectedTarget = { x, y }; break outer; }
    }
  }
  if (protectedTarget && unprotectedTarget) break;
}

assert(protectedTarget, '應找到診所覆蓋區內的住宅');
assert(unprotectedTarget, '應找到無健康設施覆蓋區的住宅');

window.GV.igniteSick(protectedTarget.x, protectedTarget.y);
window.GV.igniteSick(unprotectedTarget.x, unprotectedTarget.y);
assert(tile(protectedTarget.x, protectedTarget.y).bld.sick === 1, '覆蓋區住宅應被強制生病');
assert(tile(unprotectedTarget.x, unprotectedTarget.y).bld.sick === 1, '未覆蓋區住宅應被強制生病');

// 跑若干天，診所覆蓋區應最終康復，未覆蓋區持續生病
let protectedRecovered = false;
for (let day = 0; day < 10; day++) {
  step(1);
  if (tile(protectedTarget.x, protectedTarget.y).bld.sick === 0) { protectedRecovered = true; break; }
  assert(tile(unprotectedTarget.x, unprotectedTarget.y).bld.sick === 1, '未覆蓋區住宅應持續生病');
}
assert(protectedRecovered, '診所覆蓋區住宅應在 10 天內康復');
assert(tile(unprotectedTarget.x, unprotectedTarget.y).bld.sick === 1, '未覆蓋區住宅仍應生病');

// 測試手動治療
window.GV.clearSick(unprotectedTarget.x, unprotectedTarget.y);
assert(tile(unprotectedTarget.x, unprotectedTarget.y).bld.sick === 0, '手動治療後 sick 應為 0');

// 測試存檔/讀檔：診所與生病標記保留
window.GV.igniteSick(unprotectedTarget.x, unprotectedTarget.y);
assert(tile(unprotectedTarget.x, unprotectedTarget.y).bld.sick === 1, '存檔前生病標記應為 1');
window.GV.save();
window.GV.newWorld();
window.GV.load();
const loadedSick = tile(unprotectedTarget.x, unprotectedTarget.y);
assert(loadedSick.bld && loadedSick.bld.sick === 1, '讀檔後生病標記應保留');
const loadedClinic = tile(cx - 2, cy + 1);
assert(loadedClinic.bld && loadedClinic.bld.k === 13, '讀檔後診所應保留');

// 測試經濟面板 upC
const fin = window.GV.stats();
console.log('stats:', fin);

console.log('\nT34 DOM mock 測試全部通過');
process.exit(0);
