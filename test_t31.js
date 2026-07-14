// T31 供水系統最小 DOM mock 測試
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock ----
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
function place(t, x, y) { return window.GV.place(t, x, y); }
function step(n) { return window.GV.step(n); }

// ---- 場景：鋪路 -> 電廠 + 水塔 + 水管 -> 住宅區 ----
window.GV.newWorld();

// 找一塊足夠的平坦陸地（t=1 沙地或 t=2 草地）作為建設中心
let cx = 0, cy = 0;
outer: for (let y = 5; y < N - 10; y++) {
  for (let x = 5; x < N - 10; x++) {
    let ok = true;
    for (let dy = -5; dy <= 5 && ok; dy++) {
      for (let dx = -8; dx <= 8 && ok; dx++) {
        const t = tile(x + dx, y + dy);
        if (!t || (t.t !== 1 && t.t !== 2)) ok = false;
      }
    }
    if (ok) { cx = x; cy = y; break outer; }
  }
}
console.log('build center:', cx, cy, 'tile:', tile(cx, cy));

// 鋪一條橫向主幹道
for (let x = cx - 8; x <= cx + 8; x++) place('road', x, cy);

// 放電廠與水塔（緊鄰道路，讓道路通電/通水）
place('plant', cx - 7, cy - 1);
place('water', cx + 4, cy - 1);

// 住宅區緊鄰道路兩側（與道路相差一格，讓 getMaxRoadClass 能取到道路等級）
for (let x = cx - 3; x <= cx + 3; x++) {
  place('zr', x, cy - 1);
  place('zr', x, cy + 1);
}
// 兩側放商業/工業，提供工作以維持住宅需求
for (let x of [cx - 5, cx - 4]) {
  place('zc', x, cy - 1);
  place('zc', x, cy + 1);
}
for (let x of [cx + 5, cx + 6]) {
  place('zi', x, cy - 1);
  place('zi', x, cy + 1);
}

// 放公園提升幸福、消防局防止火災干擾升級
place('park', cx, cy - 2);
place('park', cx, cy + 2);
place('fire', cx, cy - 3);

// 鎖定晴天，避免天氣扣幸福影響升級
window.GV.weather(0);

// 先不鋪水管，跑一段時間讓建築長到 Lv2
console.log('before step: money=' + window.GV.stats().money + ' pop=' + window.GV.stats().pop);
step(40);
console.log('after 40 steps: money=' + window.GV.stats().money + ' pop=' + window.GV.stats().pop + ' buildings=' + window.GV.stats().buildings);
let b = tile(cx - 3, cy - 1).bld;
console.log('sample tile:', tile(cx - 3, cy - 1));
assert(b && b.lv >= 1, '住宅應至少生長到 Lv1');

// 記錄此時最高等級
let maxLvBefore = 0;
for (let x = cx - 3; x <= cx + 3; x++) {
  for (let y of [cy - 1, cy + 1]) {
    const t = tile(x, y);
    if (t.bld && t.bld.lv > maxLvBefore) maxLvBefore = t.bld.lv;
  }
}
console.log('maxLvBefore (no water pipes):', maxLvBefore);

// 鋪設水管覆蓋所有住宅並連到水塔
for (let x = cx - 3; x <= cx + 4; x++) {
  for (let y = cy - 3; y <= cy + 3; y++) {
    if (y === cy) continue; // 不要蓋在道路上
    place('wpipe', x, y);
  }
}

// 確認水管存在且有連通標記
let pipeCount = 0;
let connectedPipes = 0;
for (let x = cx - 3; x <= cx + 4; x++) {
  for (let y = cy - 3; y <= cy + 3; y++) {
    const t = tile(x, y);
    if (t.wp) { pipeCount++; if (t.wr) connectedPipes++; }
  }
}
assert(pipeCount > 0, '應鋪設地下水管');
assert(connectedPipes > 0, '水塔附近的水管應連通（wr>0）');

// 再跑一段時間，確認住宅獲得供水並能升到 Lv3
step(60);
let maxLvAfter = 0;
let wateredCount = 0;
let poweredCount = 0;
for (let x = cx - 3; x <= cx + 3; x++) {
  for (let y of [cy - 1, cy + 1]) {
    const t = tile(x, y);
    if (t.bld) {
      if (t.bld.lv > maxLvAfter) maxLvAfter = t.bld.lv;
      if (t.bld.wa) wateredCount++;
      if (t.bld.pw) poweredCount++;
    }
  }
}
console.log('after 60 steps with water:');
console.log('sample (cx-3,cy-1):', tile(cx - 3, cy - 1));
console.log('road (cx-3,cy):', tile(cx - 3, cy));
console.log('plant tile (cx-7,cy-1):', tile(cx - 7, cy - 1));
console.log('water tile (cx+4,cy-1):', tile(cx + 4, cy - 1));
console.log('maxLvAfter (with water):', maxLvAfter, 'watered:', wateredCount, 'powered:', poweredCount);
assert(wateredCount > 0, '鋪水管後應有建築獲得供水 (b.wa=true)');
assert(maxLvAfter >= 3, '有水有電後住宅應能升到 Lv3');

// 檢查經濟面板的 upW
const fin = window.GV.stats();
console.log('stats:', fin);
// 沒有直接 upW 鉤子，但可確認水塔維護計入： money 減少合理即可

console.log('\nT31 DOM mock 測試全部通過');
process.exit(0);
