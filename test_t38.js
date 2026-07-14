// T38 殯葬/墓園系統 DOM mock 測試
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock（複製自 test_t36.js）----
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

// ---- 場景 ----
const TEST_SEED = process.env.GT_SEED ? +process.env.GT_SEED : 1;
window.GV.newWorldSeeded(TEST_SEED);
window.GV.weather(0);
window.GV.addMoney(5000);

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

// 道路與電廠
for (let x = cx - 8; x <= cx + 8; x++) place('road', x, cy);
place('plant', cx - 3, cy + 1);

// 建造一排住宅
for (let x = cx - 5; x <= cx + 5; x++) place('zr', x, cy - 2);

// 給足夠時間生長
for (let attempt = 0; attempt < 8; attempt++) {
  step(60);
  let grown = 0;
  for (let x = cx - 5; x <= cx + 5; x++) {
    const t = tile(x, cy - 2);
    if (t.bld && t.bld.k === 1) grown++;
  }
  if (grown >= 5) break;
}

// 找出連續住宅
let hx = null, hy = null;
for (let x = cx - 5; x <= cx + 2; x++) {
  if (tile(x, cy - 2).bld && tile(x, cy - 2).bld.k === 1 &&
      tile(x + 1, cy - 2).bld && tile(x + 1, cy - 2).bld.k === 1 &&
      tile(x + 2, cy - 2).bld && tile(x + 2, cy - 2).bld.k === 1) {
    hx = x; hy = cy - 2;
    break;
  }
}
assert(hx !== null, '應找到連續住宅排');
console.log('home strip start:', hx, hy);

// 輔助：找一個可放置墓園的陸地空格
function findCemeterySpot(anchorX, anchorY) {
  for (let dy of [0, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) {
    for (let dx of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const x = anchorX + dx, y = anchorY + dy;
      if (window.GV.canPlaceTool('cemetery', x, y) === null) return { x, y };
    }
  }
  return null;
}

// 測試墓園可建造
const cem1 = findCemeterySpot(hx, hy);
assert(cem1, '應找到墓園可建位置');
const cemPlaced = place('cemetery', cem1.x, cem1.y);
assert(cemPlaced, '墓園應成功建造');
assert(tile(cem1.x, cem1.y).bld.k === 16, '建造後應為墓園 (k=16)');

// 測試死亡事件無墓園覆蓋時會降低鄰近幸福
window.GV.clearDeath(hx, hy);
const neighborX = hx + 1;
const beforeFar = tile(neighborX, hy).bld.h;
window.GV.igniteDeath(hx, hy);
step(1);
const afterFar = tile(neighborX, hy).bld.h;
console.log('neighbor happiness before/after uncovered death:', beforeFar, afterFar);
assert(afterFar < beforeFar - 0.05, '無墓園覆蓋的死亡應降低鄰近住宅幸福');

// 測試墓園半徑10內死亡事件不擴散幸福懲罰
window.GV.clearDeath(hx, hy);
step(1); // 讓 deathPenalty 消退
const beforeNear = tile(neighborX, hy).bld.h;
// 在死亡點半徑10內放置墓園
const cem2 = findCemeterySpot(hx + 2, hy - 2); // 盡量靠近 hx
assert(cem2, '應找到鄰近墓園可建位置');
const distToDeath = Math.abs(cem2.x - hx) + Math.abs(cem2.y - hy); // Manhattan
assert(distToDeath <= 10, '測試墓園應在死亡點半徑10內');
const cemNearPlaced = place('cemetery', cem2.x, cem2.y);
assert(cemNearPlaced, '鄰近墓園應成功建造');
window.GV.igniteDeath(hx, hy);
step(1);
const afterNear = tile(neighborX, hy).bld.h;
console.log('neighbor happiness before/after covered death:', beforeNear, afterNear);
assert(afterNear >= beforeNear - 0.02, '墓園半徑10內死亡不應降低鄰近住宅幸福');

// 測試就業：墓園每座 +2（jobs 在 tick 後重算，故先放墓園再 step）
const cem3 = findCemeterySpot(hx + 12, hy);
assert(cem3, '應找到第三座墓園可建位置');
place('cemetery', cem3.x, cem3.y);
const statsBefore = window.GV.stats();
step(1);
const statsAfter = window.GV.stats();
assert(statsAfter.jobs === statsBefore.jobs + 2, '每座墓園應增加 2 就業');

// 測試存檔/讀檔保留 death 與墓園
window.GV.save();
window.GV.newWorld();
window.GV.load();
const loadedCem = tile(cem1.x, cem1.y);
assert(loadedCem.bld && loadedCem.bld.k === 16, '讀檔後墓園應保留');
const loadedDeath = tile(hx, hy);
assert(loadedDeath.bld && loadedDeath.bld.death === 1, '讀檔後 death 標記應保留');

console.log('\nT38 殯葬/墓園系統 DOM mock 測試全部通過');
process.exit(0);
