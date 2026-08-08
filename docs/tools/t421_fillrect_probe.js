// T421 R00：fillRect 總數基準探針（入帳供覆核方逐字重放）
// 規格（卡面增量四）：harness 2D mock 的 fillRect 換成計數版（calls++；px+=w*h），
// 載入 index.html 跑完 buildSprites（主 IIFE 開機路徑）後印兩個數。
// 不動 test_fixde.js 主線。
//
// 用法（車位根目錄）：
//   node docs/tools/t421_fillrect_probe.js
// 可選環境變數 T421_INDEX 指向另一份 index.html（預設本目錄上兩層的 index.html）
//
// 本卡唯一基準 = 本探針在 R00 量得的 calls／px。T420 的 931,526 與 927,285 作廢。

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = process.env.T421_INDEX
  ? path.resolve(process.env.T421_INDEX)
  : path.join(ROOT, 'index.html');

let calls = 0;
let px = 0;

function makeEl(tag, id) {
  const listeners = {};
  const children = [];
  const style = {};
  const dataset = {};
  const cls = new Set();
  const el = {
    tagName: tag,
    id: id || '',
    _cls: cls,
    classList: {
      add(...cs) { cs.forEach(c => cls.add(c)); },
      remove(...cs) { cs.forEach(c => cls.delete(c)); },
      contains(c) { return cls.has(c); },
      toggle(c, f) {
        const on = f === undefined ? !cls.has(c) : !!f;
        if (on) cls.add(c); else cls.delete(c);
        return on;
      }
    },
    style,
    dataset,
    textContent: '',
    _html: '',
    width: 100,
    height: 100,
    clientWidth: 800,
    clientHeight: 600,
    offsetHeight: 20,
    onclick: null,
    addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    click() {
      if (typeof el.onclick === 'function') el.onclick({ type: 'click' });
      el.dispatchEvent({ type: 'click' });
    },
    appendChild(c) { children.push(c); c.parentNode = el; return c; },
    insertBefore(c) { children.unshift(c); c.parentNode = el; return c; },
    removeChild(c) {
      const i = children.indexOf(c);
      if (i >= 0) children.splice(i, 1);
      return c;
    },
    remove() {
      if (el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext(type) {
      if (type === '2d') {
        return {
          save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
          beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, rect() {},
          // —— T421 計數版（唯一差異點）——
          fillRect(x, y, w, h) {
            calls++;
            // 與 T420 探針同款：字面 w*h 累加（允許浮點；帳本取整報導）
            const ww = +w || 0;
            const hh = +h || 0;
            px += ww * hh;
          },
          strokeRect() {},
          arc() {}, arcTo() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
          fill() {}, stroke() {}, clip() {},
          fillText() {}, strokeText() {}, measureText() { return { width: 10 }; },
          drawImage() {}, putImageData() {},
          getImageData() { return { data: new Uint8ClampedArray(4) }; },
          createLinearGradient() { return { addColorStop() {} }; },
          createRadialGradient() { return { addColorStop() {} }; },
          createPattern() { return {}; },
          setTransform() {}, resetTransform() {}, clearRect() {}, setLineDash() {},
          globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1,
          font: '', textAlign: '', textBaseline: '',
          canvas: el
        };
      }
      return null;
    },
    children,
    _listeners: listeners
  };
  Object.defineProperty(el, 'className', {
    get() { return [...cls].join(' '); },
    set(v) {
      cls.clear();
      String(v).split(/\s+/).forEach(c => c && cls.add(c));
    }
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = String(v);
      if (v === '') children.length = 0;
    }
  });
  if (id) elMap.set(id, el);
  return el;
}

const elMap = new Map();
const ids = [
  'game', 'hud', 'money', 'day', 'pop', 'jobs', 'happy', 'rci', 'bStats', 'bHelp',
  'bUndo', 'bSpeed', 'bSound', 'bSave', 'bNew', 'hint', 'hintTxt', 'hintX', 'tools',
  'toolcats', 'toasts', 'dragcost', 'mini', 'zoomer', 'zin', 'zout', 'info', 'infoX',
  'infoBody', 'start', 'logo', 'bContinue', 'bNewGame', 'star', 'date',
  'statsCity343', 'statsTech343', 'techTree343', 'techDetail343', 'techStart343',
  'techHome343', 'statsFlow384', 'bFlowOverlay384', 'statsComm385',
  'bCommAcc385_0', 'bCommAcc385_1', 'bCommAcc385_2', 'bCommDrop385',
  'bSpecPick386_0', 'bSpecPick386_1', 'bSpecPick386_2', 'bSpecPick386_3'
];
ids.forEach(id => makeEl(id === 'techTree343' ? 'canvas' : 'div', id));
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
    if (s === '.tool') {
      return elMap.get('tools').children.filter(c => c._cls.has('tool'));
    }
    return [];
  },
  createElement(tag) { return makeEl(tag); },
  title: '',
  addEventListener() {},
  removeEventListener() {},
  hidden: false,
  visibilityState: 'visible',
  body: makeEl('body'),
  documentElement: (() => {
    const props = {};
    return {
      style: {
        setProperty(k, v) { props[k] = v; },
        getPropertyValue(k) { return props[k] || ''; }
      },
      _props: props
    };
  })()
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

function MockAudioContext() {
  this.state = 'running';
  this.currentTime = 0;
  this.destination = {};
  this.sampleRate = 48000;
  this.resume = () => {};
  this.suspend = () => {};
  this.createGain = () => ({
    gain: {
      value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {}, cancelScheduledValues() {}
    },
    connect(n) { return n; },
    disconnect() {}
  });
  this.createOscillator = () => ({
    type: '',
    frequency: { value: 0, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
    connect(n) { return n; },
    start() {},
    stop() {}
  });
  this.createBiquadFilter = () => ({
    type: '', frequency: { value: 0 }, connect(n) { return n; }
  });
  this.createBuffer = (ch, len, sr) => ({
    getChannelData: () => new Float32Array(len || 1),
    length: len || 1,
    sampleRate: sr || 48000
  });
  this.createBufferSource = () => ({
    buffer: null, playbackRate: { value: 1 },
    connect(n) { return n; }, start() {}, stop() {}
  });
  this.createDynamicsCompressor = () => ({
    threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 },
    attack: { value: 0 }, release: { value: 0 }, connect(n) { return n; }
  });
  this.createDelay = () => ({ delayTime: { value: 0 }, connect(n) { return n; } });
  this.createStereoPanner = () => ({ pan: { value: 0 }, connect(n) { return n; } });
}

const windowObj = {
  devicePixelRatio: 1,
  innerWidth: 800,
  innerHeight: 600,
  addEventListener() {},
  removeEventListener() {},
  AudioContext: MockAudioContext,
  webkitAudioContext: function () { return new MockAudioContext(); },
  requestAnimationFrame() {},
  GV: undefined,
  document,
  localStorage,
  navigator,
  location
};

global.window = windowObj;
global.document = document;
// Node 24+：global.navigator 可能是只讀 getter，改 defineProperty／略過
try {
  Object.defineProperty(global, 'navigator', { value: navigator, configurable: true, writable: true });
} catch (_) { /* keep host navigator */ }
try {
  Object.defineProperty(global, 'localStorage', { value: localStorage, configurable: true, writable: true });
} catch (_) {}
try {
  Object.defineProperty(global, 'location', { value: location, configurable: true, writable: true });
} catch (_) {}
global.requestAnimationFrame = windowObj.requestAnimationFrame;
global.AudioContext = windowObj.AudioContext;
global.webkitAudioContext = windowObj.webkitAudioContext;
global.performance = { now: () => Date.now() };

const html = fs.readFileSync(INDEX, 'utf8');
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
if (!js) {
  console.error('T421 fillRect probe: no <script> blocks in', INDEX);
  process.exit(2);
}

// 開機路徑含 buildSprites；不注入 test 專用 harness，避免污染計數。
const t0 = Date.now();
try {
  // eslint-disable-next-line no-eval
  eval(js);
} catch (err) {
  console.error('T421 fillRect probe: eval failed:', err && err.stack || err);
  process.exit(3);
}
const wallMs = Date.now() - t0;

// 可選二次量測：若 GV.buildSprites 在場，再跑一次看是否決定性（sanity，不作基準）
let second = null;
try {
  if (windowObj.GV && typeof windowObj.GV.buildSprites === 'function') {
    const c0 = calls, p0 = px;
    windowObj.GV.buildSprites();
    second = { calls: calls - c0, px: px - p0 };
  }
} catch (_) { /* ignore */ }

let gitHead = null;
try {
  gitHead = require('child_process')
    .execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' })
    .trim();
} catch (_) {}

const out = {
  probe: 'docs/tools/t421_fillrect_probe.js',
  index: INDEX,
  gitHead,
  indexBytes: Buffer.byteLength(html, 'utf8'),
  fillRectCalls: calls,
  fillRectPx: Math.round(px),
  fillRectPxRaw: px,
  wallMsBoot: wallMs,
  secondBuildSprites: second,
  note: 'T421 R00 唯一基準＝本檔 fillRectCalls / fillRectPx（boot 一次）。T420 931526/927285 作廢。'
};

// 帳本慣用：calls 整數；px 四捨五入到整數（浮點來自非整數 fillRect 引數）
out.fillRectPxRaw = px;
out.fillRectPx = Math.round(px);
console.log(JSON.stringify(out, null, 2));
console.log('T421_FILLRECT_BASELINE calls=' + calls + ' px=' + Math.round(px));
process.exit(0);
