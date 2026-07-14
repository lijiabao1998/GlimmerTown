// T37 程序化背景音樂 DOM mock 測試
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock（複製自 test_t36.js 並強化 AudioContext）----
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

// 強化 AudioContext mock：記錄節點建立與連接，並提供 composer 需要的 API
const nodeCalls = [];
function MockAudioContext() {
  this.state = 'running';
  this.currentTime = 0;
  this.destination = {};
  this.sampleRate = 48000;
  this.resume = () => {};
  this.suspend = () => {};
  this.createGain = () => {
    const g = {
      gain: {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {}
      },
      connect(n) { nodeCalls.push(['gain-connect', n && n.name || n]); return n; },
      disconnect() { nodeCalls.push(['gain-disconnect']); }
    };
    return g;
  };
  this.createOscillator = () => {
    const o = {
      type: '',
      frequency: { value: 0, exponentialRampToValueAtTime() {} },
      connect(n) { nodeCalls.push(['osc-connect', n && n.name || n]); return n; },
      start(t) { nodeCalls.push(['osc-start', t]); },
      stop(t) { nodeCalls.push(['osc-stop', t]); }
    };
    return o;
  };
  this.createBiquadFilter = () => ({
    type: '',
    frequency: { value: 0 },
    connect(n) { nodeCalls.push(['filter-connect', n && n.name || n]); return n; }
  });
}

const window = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
  AudioContext: MockAudioContext,
  webkitAudioContext: function() { return new MockAudioContext(); },
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
global.performance = { now: () => Date.now() };

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

// ---- T37 驗證 ----
const cmp = window.GV.composer;
const npu = window.GV.npu;
assert(typeof cmp === 'object', 'GV.composer 實例存在');
assert(typeof npu === 'object', 'GV.npu 預留接口存在');
assert(npu.generate('day') === null, 'NPUComposer 目前回傳 null，沿用傳統算法');

// 初始狀態未播放
assert(!cmp.playing, '遊戲初始時 composer 未播放');
assert(cmp.curMood === null, '初始時尚無情緒標籤');

// 模擬 sndMode=2 啟動背景音樂
sndMode = 2;
muted = false;
cmp.start();
assert(cmp.playing, 'sndMode=2 時 composer 應開始播放');
assert(cmp.curMood !== null, '啟動後應選定情緒標籤');
assert(nodeCalls.length > 0, '啟動後應建立 Web Audio 節點');

const moodBefore = cmp.curMood;

// 晴天白天 -> 暴雨 -> storm
window.GV.weather(2);
cmp.update();
assert(cmp.curMood === 'storm', '暴雨時應切換到 storm 情緒');

// 暴雨 -> 雨 -> rain
window.GV.weather(1);
cmp.update();
assert(cmp.curMood === 'rain', '雨天應切換到 rain 情緒');

// 雨 -> 晴，且白天 -> day
window.GV.weather(0);
window.GV.setDay(1);
cmp.update();
assert(cmp.curMood === 'day', '晴天白天應切換到 day 情緒');

// 冬季晴天 -> winter
window.GV.setDay(310);
cmp.update();
assert(cmp.curMood === 'winter', '冬季晴天應切換到 winter 情緒');

// 回到非冬晴天
window.GV.setDay(1);
cmp.update();
assert(cmp.curMood === 'day', '回到非冬晴天應恢復 day');

// sndMode 切換到 1 時應停止背景音樂
sndMode = 1;
muted = false;
cmp.stop();
assert(!cmp.playing, 'sndMode 非 2 時 composer 應停止');

// 確認不同情緒都能產生排程事件（重新啟動以確保 out 存在，再直接 build phrase）
cmp.start();
const moods = ['day', 'rain', 'storm', 'night', 'winter'];
for (const m of moods) {
  cmp.curMood = m;
  const before = nodeCalls.length;
  const phrase = cmp._buildPhrase();
  assert(nodeCalls.length > before, `情緒 ${m} 應生成音符節點`);
  assert(phrase.dur > 0, `情緒 ${m} 應產生正長度的短句`);
}
cmp.stop();

console.log('\nT37 程序化背景音樂 DOM mock 測試全部通過');
process.exit(0);
