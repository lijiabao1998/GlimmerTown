// FIX-D/FIX-E 回歸測試（DOM mock）
// 覆蓋：單變體建築 v=0、多格 doze 從 ref 解析、wp 拆除白名單、軌道遮罩 recalc、
//       存檔 _bak 備份還原、COV 蓋撤印對稱（防 Uint8 下溢）、undo 軌道遮罩、
//       快捷鍵 dataset.tid 反查、doze 鈕去重、showStats 逸出、sw.js 版號、inspect 文案
const fs = require('fs');
const path = require('path');

// ---- 最小 DOM / BOM mock（以 test_t38.js 為底，強化 classList/click/keydown/AudioContext）----
const elMap = new Map();
const allEls = [];
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
      toggle(c, f) { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; }
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
    addEventListener(ev, fn) { listeners[ev] = listeners[ev] || []; listeners[ev].push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach(fn => fn(ev)); return true; },
    click() { if (typeof el.onclick === 'function') el.onclick({ type: 'click' }); el.dispatchEvent({ type: 'click' }); },
    appendChild(c) { children.push(c); c.parentNode = el; return c; },
    insertBefore(c) { children.unshift(c); c.parentNode = el; return c; },
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
  Object.defineProperty(el, 'className', {
    get() { return [...cls].join(' '); },
    set(v) { cls.clear(); String(v).split(/\s+/).forEach(c => c && cls.add(c)); }
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = String(v); if (v === '') children.length = 0; }
  });
  if (id) elMap.set(id, el);
  allEls.push(el);
  return el;
}

const ids = ['game','hud','money','day','pop','jobs','happy','rci','bStats','bHelp','bUndo','bSpeed','bSound','bSave','bNew','hint','hintTxt','hintX','tools','toolcats','toasts','dragcost','mini','zoomer','zin','zout','info','infoX','infoBody','start','logo','bContinue','bNewGame','star','date'];
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
    // 僅回傳仍掛在 #tools 下的工具鈕（真實 DOM 中 innerHTML='' 會 detach 舊鈕；快照式註冊表會殘留幽靈元素）
    if (s === '.tool') return elMap.get('tools').children.filter(c => c._cls.has('tool'));
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

// 強化 AudioContext mock（沿用 test_t37.js，frequency 補 linearRamp 供 tone 滑音）
function MockAudioContext() {
  this.state = 'running';
  this.currentTime = 0;
  this.destination = {};
  this.sampleRate = 48000;
  this.resume = () => {};
  this.suspend = () => {};
  this.createGain = () => ({
    gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
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
  this.createBiquadFilter = () => ({ type: '', frequency: { value: 0 }, connect(n) { return n; } });
  // T260：AI 城市長大會觸發里程碑/升級音效（噪聲 buffer 路徑），舊測試從未養大城市故未暴露
  this.createBuffer = (ch, len, sr) => ({ getChannelData: () => new Float32Array(len || 1), length: len || 1, sampleRate: sr || 48000 });
  this.createBufferSource = () => ({ buffer: null, playbackRate: { value: 1 }, connect(n) { return n; }, start() {}, stop() {} });
  this.createDynamicsCompressor = () => ({ threshold: { value: 0 }, knee: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, connect(n) { return n; } });
  this.createDelay = () => ({ delayTime: { value: 0 }, connect(n) { return n; } });
  this.createStereoPanner = () => ({ pan: { value: 0 }, connect(n) { return n; } });
}

// window 事件留存（keydown 反查測試用）
const winListeners = {};
const window = {
  devicePixelRatio: 1,
  innerWidth: 800,
  innerHeight: 600,
  addEventListener(ev, fn) { (winListeners[ev] = winListeners[ev] || []).push(fn); },
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

const N = window.GV.N();
const SAVEKEY = (html.match(/const SAVEKEY='([^']+)'/) || [])[1];
const SKEY = SAVEKEY + '.s1';
function tile(x, y) { return window.GV.tile(x, y); }
function place(t, x, y) { return window.GV.place(t, x, y, true); }
function findSpot(tool) { // 掃描第一個 canPlace 通過的位置（避邊界 4 格）
  for (let y = 4; y < N - 8; y++) for (let x = 4; x < N - 8; x++) {
    if (window.GV.canPlaceTool(tool, x, y) === null) return { x, y };
  }
  return null;
}
function covScanBad(f, cx, cy, r) { // 掃描半徑 r 方框，回傳第一個非零覆蓋（期望全零時用）
  for (let y = cy - r; y <= cy + r + 3; y++) for (let x = cx - r; x <= cx + r + 3; x++) {
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const v = window.GV.cov(f, x, y);
    if (v) return f + '@' + x + ',' + y + '=' + v;
  }
  return null;
}
function pressKey(k) { // 模擬 window keydown（無修飾鍵）
  (winListeners['keydown'] || []).forEach(fn => fn({ type: 'keydown', key: k, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} }));
}
const cvsEl = elMap.get('game');
function pointer(type, x, y) { // 模擬 canvas 指針事件（單指、左鍵）
  const ev = { type, pointerId: 1, clientX: x, clientY: y, button: 0, preventDefault() {}, stopPropagation() {} };
  (cvsEl._listeners[type] || []).forEach(fn => fn(ev));
}

// ---- 場景：固定種子新圖、鎖晴天、補足資金 ----
window.GV.newWorldSeeded(1);
window.GV.weather(0);
window.GV.addMoney(100000);

// ================= (1) 七種單變體建築 v=0 與存檔正規化 =================
console.log('\n-- (1) 單變體建築 v=0 / save-load 正規化 --');
const SV = [ // [tool, k, sz]；T226/T230/T232：farm/ranch/parking 擴變體移出單變體清單；T228：新增 bigFarm 5×5
  ['airport', 19, 4],
  ['solar', 25, 2], ['prison', 31, 2], ['university', 32, 3], ['bigFarm', 53, 5], ['bigCemetery', 54, 3], ['grandStation', 55, 3], ['sportsComplex', 56, 3], ['foodPlant', 57, 3], ['nuclear', 58, 3], ['hydro', 59, 2], ['fireHQ', 61, 3], ['wasteIncinerator', 62, 2]
];
const svRoots = [];
for (const [tool, k, sz] of SV) {
  const sp = findSpot(tool);
  assert(sp, tool + ' 應找到可建位置');
  assert(place(tool, sp.x, sp.y), tool + ' 應成功建造');
  const b = tile(sp.x, sp.y).bld;
  assert(b && b.k === k && b.v === 0 && b.sz === sz, tool + ' (k=' + k + ') root 應固定 v=0、sz=' + sz);
  svRoots.push({ k, x: sp.x, y: sp.y });
}
// SPR.bld 對應鍵存在（原始碼靜態斷言，mock 無法驗像素）
for (const [, k] of SV) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'SPR.bld 應生成 ' + k + '_1_0');
// 竄改存檔 v=2 → load 應正規化回 0
// T226：農場座標決定性選型＋SPR 鍵存在＋load 保留變體（新設計正面斷言）
{
  const sp = findSpot('farm');
  assert(sp, 'farm 應找到可建位置');
  assert(place('farm', sp.x, sp.y), 'farm 應成功建造');
  const fb = tile(sp.x, sp.y).bld;
  const expV = (sp.x * 5 + sp.y * 11) % 12; // T235：12 作物
  assert(fb && fb.k === 22 && fb.v === expV && fb.sz === 2, 'farm root v 應為座標決定性 (x*5+y*11)%12=' + expV + '、sz=2');
  assert(html.includes("SPR.bld['22_1_1']") && html.includes("SPR.bld['22_1_11']"), 'SPR.bld 應生成 22_1_1..22_1_11（T226/227/235 農場 12 作物）');
  svRoots.push({ k: 22, x: sp.x, y: sp.y, keepV: expV });
}
// T232：停車場座標決定性選型＋SPR 鍵存在＋load 保留變體
{
  const sp = findSpot('parking');
  assert(sp, 'parking 應找到可建位置');
  assert(place('parking', sp.x, sp.y), 'parking 應成功建造');
  const pb2 = tile(sp.x, sp.y).bld;
  const expV = (sp.x * 11 + sp.y * 3) % 3;
  assert(pb2 && pb2.k === 20 && pb2.v === expV && pb2.sz === 2, 'parking root v 應為座標決定性 (x*11+y*3)%3=' + expV + '、sz=2');
  assert(html.includes("SPR.bld['20_1_1']") && html.includes("SPR.bld['20_1_2']"), 'SPR.bld 應生成 20_1_1 / 20_1_2（T232 停車場變體）');
  svRoots.push({ k: 20, x: sp.x, y: sp.y, keepV: expV });
}
// T230：牧場座標決定性選型＋SPR 鍵存在＋load 保留變體
{
  const sp = findSpot('ranch');
  assert(sp, 'ranch 應找到可建位置');
  assert(place('ranch', sp.x, sp.y), 'ranch 應成功建造');
  const rb2 = tile(sp.x, sp.y).bld;
  const expV = (sp.x * 7 + sp.y * 5) % 3;
  assert(rb2 && rb2.k === 23 && rb2.v === expV && rb2.sz === 2, 'ranch root v 應為座標決定性 (x*7+y*5)%3=' + expV + '、sz=2');
  assert(html.includes("SPR.bld['23_1_1']") && html.includes("SPR.bld['23_1_2']"), 'SPR.bld 應生成 23_1_1 / 23_1_2（T230 牧場變體）');
  svRoots.push({ k: 23, x: sp.x, y: sp.y, keepV: expV });
}
window.GV.save();
const d1 = JSON.parse(store[SKEY]);
const SVK = new Set([19, 25, 31, 32, 53, 54, 55, 56, 57, 58, 59, 61, 62]); // T265：wasteIncinerator；T257：nuclear/hydro/fireHQ 亦屬單變體；T228/T233/T234/T241/T254：bigFarm/bigCemetery/grandStation/sportsComplex/foodPlant；T230/T232：ranch/parking 移出
let tampered = 0;
for (const rec of d1.bl) if (SVK.has(rec[1])) { rec[3] = 2; tampered++; }
assert(tampered === 13, '存檔 bl 應含 13 棟單變體建築（實得 ' + tampered + '）');
store[SKEY] = JSON.stringify(d1);
assert(window.GV.load() === true, '竄改後 load 應成功');
for (const r of svRoots) {
  const b = tile(r.x, r.y).bld;
  const expV = r.keepV !== undefined ? r.keepV : 0; // T226：農場變體鍵存在→load 保留原 v；其餘單變體正規化回 0
  assert(b && b.v === expV, 'k=' + r.k + ' load 後 v 應為 ' + expV + '（單變體正規化/農場保留）');
}
// FIX-J 迴歸：save→load 往返後多格 root 應保留 sz、ref 格應全數重建（舊版 load 未補 sz→ref 格全失、可被覆蓋建造）
const SZOF = {}; for (const [, k, sz] of SV) SZOF[k] = sz; SZOF[22] = 2; SZOF[23] = 2; SZOF[20] = 2; // T226/T230/T232：農場/牧場/停車場已移出 SV，sz 表補回
for (const r of svRoots) {
  const b = tile(r.x, r.y).bld;
  assert(b && b.sz === SZOF[r.k], 'k=' + r.k + ' load 後 root 應保留 sz=' + SZOF[r.k]);
  let refs = 0;
  for (let dy = 0; dy < SZOF[r.k]; dy++) for (let dx = 0; dx < SZOF[r.k]; dx++) {
    if (!dx && !dy) continue;
    const rb = tile(r.x + dx, r.y + dy).bld;
    if (rb && rb.k === r.k && rb.ref && rb.ref[0] === r.x && rb.ref[1] === r.y) refs++;
  }
  assert(refs === SZOF[r.k] * SZOF[r.k] - 1, 'k=' + r.k + ' load 後 ref 格應全數重建（' + refs + '/' + (SZOF[r.k] * SZOF[r.k] - 1) + '）');
}

// ================= (2) 多格建築從 ref 格 doze + 體育場對稱撤印 =================
console.log('\n-- (2) ref 格 doze / 體育場 COV --');
const f2 = findSpot('farm');
assert(f2 && place('farm', f2.x, f2.y), '農場應成功建造');
assert(place('doze', f2.x + 1, f2.y + 1), '從 ref 格拆除農場應成功');
for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
  assert(tile(f2.x + dx, f2.y + dy).bld === null, '農場 ref 格 doze 後 (' + dx + ',' + dy + ') 應清空');

const a2 = findSpot('airport');
assert(a2 && place('airport', a2.x, a2.y), '機場應成功建造');
assert(place('doze', a2.x + 2, a2.y + 1), '從 ref 格拆除機場應成功');
for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++)
  assert(tile(a2.x + dx, a2.y + dy).bld === null, '機場 ref 格 doze 後 (' + dx + ',' + dy + ') 應清空');

const s2 = findSpot('stad');
assert(s2 && place('stad', s2.x, s2.y), '體育場應成功建造');
assert(window.GV.cov('stadium', s2.x, s2.y) > 0 && window.GV.cov('stadium', s2.x + 1, s2.y + 1) > 0, '體育場放置後 COV.stadium 應有值');
assert(window.GV.cov('stadium', s2.x + 5, s2.y + 5) > 0, '體育場半徑 10 邊陲格 COV.stadium 應有值');
assert(place('doze', s2.x + 1, s2.y + 1), '從 ref 格拆除體育場應成功');
for (const [dx, dy] of [[0,0],[1,0],[0,1],[1,1]])
  assert(tile(s2.x + dx, s2.y + dy).bld === null, '體育場 doze 後 (' + dx + ',' + dy + ') 應清空');
assert(covScanBad('stadium', s2.x, s2.y, 10) === null, '體育場拆除後 COV.stadium 應全歸 0（' + covScanBad('stadium', s2.x, s2.y, 10) + '）');

// ================= (3) 水管拆除白名單（t.wp） =================
console.log('\n-- (3) wpipe + doze --');
// 水管可埋設於建築/分區下（canPlace 不擋），doze 鏈 bld 優先；故須選全空地才能驗 wp 分支
let w3 = null;
outer3: for (let y = 4; y < N - 8; y++) for (let x = 4; x < N - 8; x++) {
  const tt = tile(x, y);
  if (window.GV.canPlaceTool('wpipe', x, y) === null && !tt.bld && !tt.road && !tt.rail && !tt.tram &&
      !tt.zone && !tt.tree && !tt.deco && !tt.ruin && !tt.rdec && !tt.bus && !tt.dock) { w3 = { x, y }; break outer3; }
}
assert(w3, '應找到全空地鋪水管');
assert(w3 && place('wpipe', w3.x, w3.y), '水管應成功鋪設');
assert(tile(w3.x, w3.y).wp === 1, '鋪設後 wp 應為 1');
assert(window.GV.canPlaceTool('doze', w3.x, w3.y) === null, '純水管格 canPlace doze 應通過');
assert(place('doze', w3.x, w3.y), '拆除水管應成功');
assert(tile(w3.x, w3.y).wp === 0, '拆除後 wp 應歸 0');

// ================= (4) 軌道遮罩：放置互設、拆除清除、load 全量重算 =================
console.log('\n-- (4) railMask --');
let r4 = null;
outer4: for (let y = 4; y < N - 8; y++) for (let x = 4; x < N - 9; x++) {
  if (window.GV.canPlaceTool('rail', x, y) === null && window.GV.canPlaceTool('rail', x + 1, y) === null) { r4 = { x, y }; break outer4; }
}
assert(r4, '應找到相鄰兩格可鋪鐵路');
assert(place('rail', r4.x, r4.y) && place('rail', r4.x + 1, r4.y), '相鄰兩格鐵路應成功鋪設');
assert((tile(r4.x, r4.y).railMask & 2) !== 0, '左格 railMask 應設東向連通 bit');
assert((tile(r4.x + 1, r4.y).railMask & 8) !== 0, '右格 railMask 應設西向連通 bit');
window.GV.save();
assert(window.GV.load() === true, 'save→load 應成功');
assert((tile(r4.x, r4.y).railMask & 2) !== 0 && (tile(r4.x + 1, r4.y).railMask & 8) !== 0, 'load 後 railMask 應仍正確（recalcAllRailMasks 生效）');
assert(place('doze', r4.x, r4.y), '拆除左格鐵路應成功');
assert(tile(r4.x, r4.y).rail === 0 && tile(r4.x, r4.y).railMask === 0, '拆除格 rail/railMask 應歸 0');
assert(tile(r4.x + 1, r4.y).railMask === 0, '鄰格 railMask 連通 bit 應被清除');

// ================= (5) 存檔 _bak 備份／還原／importShare 失敗保護 =================
console.log('\n-- (5) save _bak / importShare --');
window.GV.save();
const S1 = store[SKEY], m1 = JSON.parse(S1).money;
window.GV.addMoney(777);
window.GV.save();
assert(store[SKEY] !== S1, '第二次 save 主鍵應更新');
assert(store[SKEY + '_bak'] === S1, 'save 覆寫前 _bak 應等於前一次主鍵');
store[SKEY] = 'garbage{{{';
assert(window.GV.load() === true, '主鍵毀損時 load 應從 _bak 還原');
assert(window.GV.stats().money === m1, '從 _bak 還原後金額應與備份相符');
// importShare：經存檔槽面板「匯入分享碼」鈕，失敗不得覆蓋現有槽
window.GV.save();
const mainBefore = store[SKEY], bakBefore = store[SKEY + '_bak'];
elMap.get('bSave').onclick(); // showSlots
const ioRow = elMap.get('infoBody').children[elMap.get('infoBody').children.length - 1];
const bImp = ioRow.children[1]; // [匯出, 匯入]
assert(bImp && bImp.textContent === '匯入分享碼', '應找到匯入分享碼鈕');
global.prompt = () => '%%%not-base64%%%';
bImp.dispatchEvent({ type: 'click' });
assert(store[SKEY] === mainBefore && store[SKEY + '_bak'] === bakBefore, 'importShare 垃圾碼失敗不應覆蓋槽位');
global.prompt = () => btoa('{"v":2,"ter":"x"}');
bImp.dispatchEvent({ type: 'click' });
assert(store[SKEY] === mainBefore && store[SKEY + '_bak'] === bakBefore, 'importShare 版本不符失敗不應覆蓋槽位');

// ================= (6) 服務建築 COV 蓋撤印對稱（防 Uint8 下溢 255） =================
console.log('\n-- (6) COV 對稱撤印（k28/k30/k20/k31/k32） --');
// 開新圖隔離：T1 的停車場/監獄/大學仍留存，其 COV 蓋印會污染「全歸 0」掃描
window.GV.newWorldSeeded(2);
window.GV.weather(0);
window.GV.addMoney(10000);
const COVT = [ // [tool, field, radius, dozeFromRef]
  ['ambulance', 'ambulance', 10, false],
  ['fireStation2', 'fire2', 12, false],
  ['parking', 'parking', 8, false],
  ['prison', 'prison', 8, true],
  ['university', 'university', 10, true]
];
for (const [tool, field, r, fromRef] of COVT) {
  const sp = findSpot(tool);
  assert(sp && place(tool, sp.x, sp.y), tool + ' 應成功建造');
  assert(window.GV.cov(field, sp.x, sp.y) > 0, tool + ' 放置後 COV.' + field + ' root 應 >0');
  const dx = tool === 'university' ? 2 : 1;
  assert(place('doze', fromRef ? sp.x + dx : sp.x, fromRef ? sp.y + dx : sp.y), tool + (fromRef ? ' 從 ref 格' : '') + ' 拆除應成功');
  assert(tile(sp.x, sp.y).bld === null, tool + ' 拆除後 root 應清空');
  const bad = covScanBad(field, sp.x, sp.y, r);
  assert(bad === null, tool + ' 拆除後 COV.' + field + ' 應全歸 0（不得 255 下溢；實得 ' + bad + '）');
}

// ================= (7) undo 鋪軌後 railMask 正確 =================
console.log('\n-- (7) undo + recalcAllRailMasks --');
window.GV.newWorldSeeded(3);
window.GV.weather(0);
// 切到「道路」分類並選鐵路工具（走真實工具列按鈕路徑）
elMap.get('toolcats').children.find(b => b.textContent === '道路').click();
elMap.get('tools').children.find(c => c.dataset.tid === 'rail').click();
const cc = window.GV.center(); // 螢幕中心格＝(400,300) 像素對應格
pointer('pointerdown', 400, 300); pointer('pointerup', 400, 300);   // 鋪軌 A（一個 undo group）
pointer('pointerdown', 432, 316); pointer('pointerup', 432, 316);   // 鋪軌 B＝A 東鄰（另一 group）
assert(tile(cc[0], cc[1]).rail === 1, '指針鋪軌 A 應落在中心格');
assert(tile(cc[0] + 1, cc[1]).rail === 1, '指針鋪軌 B 應落在 A 東鄰');
assert((tile(cc[0], cc[1]).railMask & 2) !== 0, 'A 應設東向連通 bit');
elMap.get('bUndo').onclick(); // 撤銷 B（A、B 各自 pointerdown 開組、pointerup 關組 → 兩組，單次 undo 整組彈出 B）
// 新圖 tile 本無 rail 鍵（放置時才動態加上），undo 快照忠實還原 → rail 為 undefined（falsy）即表無軌
assert(!tile(cc[0] + 1, cc[1]).rail, 'undo 後 B 格鐵路應消失（還原放置前快照，rail 為 falsy）');
assert(tile(cc[0], cc[1]).rail === 1, 'undo 後 A 格鐵路應保留');
assert(tile(cc[0], cc[1]).railMask === 0, 'undo 後 A 的 railMask 應重算歸 0（undo 內 recalcAllRailMasks 生效）');
elMap.get('bUndo').onclick(); // 再撤銷 A（LIFO 整組彈出第二組）
assert(!tile(cc[0], cc[1]).rail, '第二次 undo 後 A 格鐵路應消失（undoGroup 整組還原語義）');

// ================= (8) 快捷鍵 dataset.tid 反查 + 每分類恰一個 doze 鈕 =================
console.log('\n-- (8) 快捷鍵反查 / doze 鈕去重 --');
const KEYMAP = { '1':'pan','2':'alley','3':'road','4':'coll','5':'art','6':'hwy','7':'zr','8':'zc','9':'zi','0':'park','-':'doze','=':'rdec','b':'bus','w':'water','g':'wpipe','j':'police','h':'hospital','c':'clinic','l':'library','o':'post','m':'cemetery' };
const CATS = [['基本'], ['道路'], ['分區'], ['服務'], ['大型']];
for (const [cnm] of CATS) {
  const catBtn = elMap.get('toolcats').children.find(b => b.textContent === cnm);
  assert(catBtn, '應找到分類鈕「' + cnm + '」');
  catBtn.click();
  const vis = elMap.get('tools').children.filter(c => c._cls.has('tool'));
  const tids = vis.map(c => c.dataset.tid);
  assert(vis.every(c => !!c.dataset.tid), '「' + cnm + '」全部可見鈕應帶 dataset.tid');
  assert(tids.filter(t => t === 'doze').length === 1, '「' + cnm + '」應恰一個 doze 鈕（實得 ' + tids.filter(t => t === 'doze').length + '）');
  for (const k in KEYMAP) {
    const tid = KEYMAP[k];
    const selBefore = (vis.find(c => c._cls.has('sel')) || { dataset: {} }).dataset.tid;
    let threw = false;
    try { pressKey(k); } catch (e) { threw = true; }
    assert(!threw, '「' + cnm + '」按 ' + k + ' 不得拋錯');
    if (tids.includes(tid)) {
      assert(vis.find(c => c.dataset.tid === tid)._cls.has('sel'), '「' + cnm + '」按 ' + k + ' 應選中可見工具 ' + tid);
    } else {
      const selAfter = (vis.find(c => c._cls.has('sel')) || { dataset: {} }).dataset.tid;
      assert(selAfter === selBefore, '「' + cnm + '」按 ' + k + '（工具 ' + tid + ' 不可見）應不動作');
    }
  }
}

// ================= (9) showStats 逸出 / sw.js 版號 / inspect 文案 =================
console.log('\n-- (9) showStats / sw.js / inspect 文案 --');
window.GV.save();
const d9 = JSON.parse(store[SKEY]);
d9.nm = '<img src=x onerror=alert(1)>';
store[SKEY] = JSON.stringify(d9);
assert(window.GV.load() === true, '帶惡意鎮名存檔 load 應成功');
window.GV.step(1); // fin 完整欄位由 tick 重算（初值缺 upW/upPol 等），先推進一日再開統計面板
elMap.get('bStats').onclick();
const statHtml = elMap.get('infoBody').innerHTML;
assert(statHtml.includes('&lt;img'), 'showStats 鎮名應被 escHtml 逸出');
assert(!statHtml.includes('<img'), 'showStats 不得輸出未逸出的 <img>');
const swSrc = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
assert(swSrc.includes('gv-v2'), 'sw.js CACHE 應為 gv-v2');
assert(!swSrc.includes('gv-v1'), 'sw.js 不得殘留 gv-v1');
for (const s of ['供電 15 棟', '供電 20 棟', '半徑 8 防止犯罪發生', '半徑 10 健康覆蓋（效果同醫院）',
  '升級率 ×1.8', '全城垃圾容量 +30', '半徑 8 內商業 +10% 稅收', '大眾運輸節點',
  '鄰工業的住宅 +幸福', '遊客提升全城商業稅收'])
  assert(html.includes(s), 'inspect 文案應含「' + s + '」');
for (const s of ['供電 30 棟', '冬季/雨天'])
  assert(!html.includes(s), 'inspect 文案不得含舊誤導字串「' + s + '」');

// ================= (10) T251 農場灌溉升級經濟 / 大型建築稅收 NaN 守衛 =================
console.log('\n-- (10) T251 農場升級經濟 / k53-56 稅收 NaN 守衛 --');
// 回歸：k53/54/55/56 在 second-loop 稅收 switch 曾漏 no-tax 守衛→fall through 到工業稅 else，
//       升級 lv≥4 時 JOBSI[lv]=undefined 令 income→NaN→money 存檔崩壞（T251 端到端揪出）。
{
  window.GV.newWorldSeeded(251);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1); // 確保結算生效（diff!==3），否則 money 恆不變、NaN 檢查失效
  window.GV.setSeason(0);                       // 春 mult=1，數值好斷言
  window.GV.addMoney(5000000);
  for (const [tool, k] of [['bigFarm', 53], ['bigCemetery', 54], ['grandStation', 55], ['sportsComplex', 56]]) {
    const sp = findSpot(tool);
    assert(sp, tool + '(T251) 應找到可建位置');
    assert(place(tool, sp.x, sp.y), tool + '(T251) 應成功建造');
    let b = tile(sp.x, sp.y).bld, guard = 0;
    while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
    assert((b.lv || 1) >= 5, tool + '(T251) 應可升到 lv>=5，實際 ' + (b.lv || 1));
    window.GV.step(1);
    assert(isFinite(window.GV.stats().money), tool + '(k' + k + ') 升級 lv5 後 money 不得 NaN（second-loop 稅收守衛）');
  }
}
// 大農場 k53 食物隨灌溉等級精確遞增（Skylines 特化經濟核心：越升級產出越高）
{
  window.GV.newWorldSeeded(252);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0); // 春 mult=1 → food 應精確 = lv×20
  window.GV.addMoney(5000000);
  const sp = findSpot('bigFarm');
  assert(place('bigFarm', sp.x, sp.y), 'bigFarm(食物測) 應成功建造');
  window.GV.step(1);
  const food1 = window.GV.food();
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
  window.GV.step(1);
  const food5 = window.GV.food();
  assert(food1 === 20, 'bigFarm lv1 春季食物應精確 20，實際 ' + food1);
  assert(food5 === 100, 'bigFarm lv5 春季食物應精確 100（lv×20），實際 ' + food5);
  assert(food5 > food1, 'bigFarm 灌溉升級後食物應遞增');
}
// 小農場 k22 食物隨灌溉等級精確遞增（3/級）
{
  window.GV.newWorldSeeded(253);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.addMoney(5000000);
  const sp = findSpot('farm');
  assert(place('farm', sp.x, sp.y), 'farm(食物測) 應成功建造');
  window.GV.step(1);
  const f1 = window.GV.food();
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
  window.GV.step(1);
  const f5 = window.GV.food();
  assert(f1 === 3, 'farm k22 lv1 春季食物應精確 3，實際 ' + f1);
  assert(f5 === 15, 'farm k22 lv5 春季食物應精確 15（lv×3），實際 ' + f5);
}
// T252 牧場 k23 牧養升級：食物隨等級遞增（2/級）且「不隨季節」（畜牧全年穩定＝春/冬相等）
{
  window.GV.newWorldSeeded(255);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(5000000);
  const sp = findSpot('ranch');
  assert(sp, 'ranch(T252) 應找到可建位置');
  assert(place('ranch', sp.x, sp.y), 'ranch(T252) 應成功建造');
  window.GV.setSeason(0); window.GV.step(1);
  const rf1Spring = window.GV.food();
  window.GV.setSeason(3); window.GV.step(1);
  const rf1Winter = window.GV.food();
  assert(rf1Spring === 2 && rf1Winter === 2, 'ranch lv1 食物應精確 2 且春/冬相等（不隨季節），實際 春' + rf1Spring + '/冬' + rf1Winter);
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
  window.GV.setSeason(0); window.GV.step(1);
  const rf5Spring = window.GV.food();
  window.GV.setSeason(3); window.GV.step(1);
  const rf5Winter = window.GV.food();
  assert(rf5Spring === 10 && rf5Winter === 10, 'ranch lv5 食物應精確 10（lv×2）且春/冬相等，實際 春' + rf5Spring + '/冬' + rf5Winter);
  assert(isFinite(window.GV.stats().money), 'ranch(k23) 升級 lv5 後 money 不得 NaN');
  window.GV.save();
  assert(window.GV.load() === true, 'ranch 升級後 save→load 應成功');
  const bl = tile(sp.x, sp.y).bld;
  assert(bl && bl.k === 23 && bl.lv === 5 && bl.sz === 2, 'ranch 存讀檔應保留 lv5/sz2，實際 lv=' + (bl && bl.lv) + ' sz=' + (bl && bl.sz));
}
// T253 電廠/太陽能/風力可升級擴容：computePower 隨機組等級加權（春季 ×1 精確）
{
  window.GV.newWorldSeeded(256);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0); // 春 POWER_SEASON_MULT ×1 → powerCap 精確
  window.GV.addMoney(5000000);
  const sp = findSpot('plant');
  assert(sp, 'plant(T253) 應找到可建位置');
  assert(place('plant', sp.x, sp.y), 'plant(T253) 應成功建造');
  const cap = () => { window.GV.step(1); return window.GV.region().powerCap; };
  assert(cap() === 50, 'plant lv1 powerCap 應為 50，實際 ' + window.GV.region().powerCap);
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 3 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
  assert(cap() === 100, 'plant lv3 powerCap 應為 100（50+2×25），實際 ' + window.GV.region().powerCap);
  // 太陽能 +15、風力 +20（需已有電廠併網）
  const base = cap();
  const ss = findSpot('solar');
  assert(place('solar', ss.x, ss.y), 'solar(T253) 應成功建造');
  assert(cap() === base + 15, 'solar lv1 應 +15 容量，實際 +' + (window.GV.region().powerCap - base));
  const bs = base + 15;
  const ws = findSpot('wind');
  assert(place('wind', ws.x, ws.y), 'wind(T253) 應成功建造');
  assert(cap() === bs + 20, 'wind lv1 應 +20 容量，實際 +' + (window.GV.region().powerCap - bs));
  // 升級後存讀檔保留 lv（plant lv3）
  window.GV.save();
  assert(window.GV.load() === true, 'plant 升級後 save→load 應成功');
  const pl = tile(sp.x, sp.y).bld;
  assert(pl && pl.k === 5 && pl.lv === 3, 'plant 存讀檔應保留 lv3，實際 lv=' + (pl && pl.lv));
  assert(cap() === bs + 20, '存讀檔後 powerCap 應維持（機組等級還原），實際 ' + window.GV.region().powerCap);
}
// T254 食品加工廠加工鏈：procGold=min(全城食物,加工容量)×1.5；食物是瓶頸；升級擴容；jobs 恆定（?? 修復）
{
  window.GV.newWorldSeeded(257);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0); // 春 mult=1
  window.GV.addMoney(8000000);
  const net = () => { const a = window.GV.stats().money; window.GV.step(1); return window.GV.stats().money - a; };
  // 單獨一座加工廠、無農場 → 無食物 → procGold=0，net = -14 維護
  const fp = findSpot('foodPlant');
  assert(fp, 'foodPlant(T254) 應找到可建位置');
  assert(place('foodPlant', fp.x, fp.y), 'foodPlant(T254) 應成功建造');
  assert(net() === -14, 'foodPlant 無農場時 net 應 = -14（僅維護，procGold=0 因無食物），實際 ' + window.GV.stats().jobs);
  const jobsLv1 = window.GV.stats().jobs; // 應含 25（fpN*25）
  // 加 3 座大農場（各 lv1 春季 20 食物 → 共 60）
  let farms = 0;
  for (let i = 0; i < 3; i++) { const s = findSpot('bigFarm'); if (s && place('bigFarm', s.x, s.y)) farms++; window.GV.addMoney(8000000); }
  assert(farms === 3, 'T254 應成功建 3 座大農場，實際 ' + farms);
  window.GV.step(1);
  assert(window.GV.food() === 60, 'T254 3 大農場春季食物應 = 60，實際 ' + window.GV.food());
  // foodPlant lv1（加工容量 40）：net = 農場金幣36 + procGold min(60,40)*1.5=60 - 維護(14+18)=32 → 64
  assert(net() === 64, 'foodPlant lv1+3大農場 net 應 = 64（farmGold36+procGold60-upkeep32），實際 ' + net());
  // 升級 foodPlant 到 lv5（加工容量 120）：procGold min(60,120)*1.5=90 → net = 36+90-32 = 94
  let b = tile(fp.x, fp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(fp.x, fp.y); b = tile(fp.x, fp.y).bld; window.GV.addMoney(8000000); }
  assert(net() === 94, 'foodPlant lv5 net 應 = 94（加工容量120 可處理全部60食物→procGold90），實際 ' + net());
  assert(isFinite(window.GV.stats().money), 'foodPlant 升級 lv5 後 money 不得 NaN');
  // jobs 恆定：升級不加就業（UP_JOB 57:0，?? 修復確保 0 不被 ||6 覆蓋）
  const jobsLv5 = window.GV.stats().jobs;
  assert(jobsLv5 === jobsLv1 + 3 * 18, 'foodPlant 升級後 jobs 應只多出 3 大農場的 54（加工廠升級 0 就業），lv1=' + jobsLv1 + ' lv5=' + jobsLv5);
  // save/load 保留 lv5
  window.GV.save();
  assert(window.GV.load() === true, 'foodPlant 升級後 save→load 應成功');
  const bl = tile(fp.x, fp.y).bld;
  assert(bl && bl.k === 57 && bl.lv === 5 && bl.sz === 3, 'foodPlant 存讀檔應保留 lv5/sz3，實際 lv=' + (bl && bl.lv) + ' sz=' + (bl && bl.sz));
}
// T257 電廠家族：核電/水力/地熱容量精確、可單獨啟動電網、升級擴容、NaN 守衛；消防總局 fireHQ 半徑16
{
  window.GV.newWorldSeeded(258);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.addMoney(9000000);
  const cap = () => { window.GV.step(1); return window.GV.region().powerCap; };
  // 核電單獨啟動電網（無傳統電廠）
  const nk = findSpot('nuclear');
  assert(nk && place('nuclear', nk.x, nk.y), 'nuclear(T257) 應成功建造');
  assert(cap() === 250, 'nuclear lv1 powerCap 應 250（且單獨可啟動電網），實際 ' + window.GV.region().powerCap);
  let b = tile(nk.x, nk.y).bld, guard = 0;
  while ((b.lv || 1) < 3 && guard++ < 15) { window.GV.upgrade(nk.x, nk.y); b = tile(nk.x, nk.y).bld; window.GV.addMoney(9000000); }
  assert(cap() === 330, 'nuclear lv3 powerCap 應 330（250+2×40），實際 ' + window.GV.region().powerCap);
  // 水力 +100、地熱 +45
  const hy = findSpot('hydro');
  assert(hy && place('hydro', hy.x, hy.y), 'hydro(T257) 應成功建造');
  assert(cap() === 430, 'hydro lv1 應 +100 容量，實際 ' + window.GV.region().powerCap);
  const ge = findSpot('geo');
  assert(ge && place('geo', ge.x, ge.y), 'geo(T257) 應成功建造');
  assert(cap() === 475, 'geo lv1 應 +45 容量，實際 ' + window.GV.region().powerCap);
  assert(isFinite(window.GV.stats().money), 'T257 電源建造/升級後 money 不得 NaN');
  // 消防總局：fireHQ 半徑 16 覆蓋（root 起 Chebyshev），doze 對稱歸零
  const fq = findSpot('fireHQ');
  assert(fq && place('fireHQ', fq.x, fq.y), 'fireHQ(T257) 應成功建造');
  assert(window.GV.cov('fireHQ', fq.x, fq.y) > 0, 'fireHQ root 覆蓋應 >0');
  const edge = { x: Math.min(N - 1, fq.x + 16), y: fq.y };
  assert(window.GV.cov('fireHQ', edge.x, edge.y) > 0, 'fireHQ +16 邊陲格覆蓋應 >0（半徑16）');
  const beyond = { x: Math.min(N - 1, fq.x + 17), y: fq.y };
  if (fq.x + 17 <= N - 1) assert(window.GV.cov('fireHQ', beyond.x, beyond.y) === 0, 'fireHQ +17 格應 0（半徑邊界精確）');
  assert(place('doze', fq.x, fq.y), 'fireHQ doze 應成功');
  assert(window.GV.cov('fireHQ', fq.x, fq.y) === 0, 'fireHQ doze 後覆蓋應對稱歸 0');
  // 升級 fireHQ 至 lv5 NaN 檢查（civic 走預設就業 +6/級）
  const fq2 = findSpot('fireHQ');
  assert(fq2 && place('fireHQ', fq2.x, fq2.y), 'fireHQ(NaN測) 應成功建造');
  b = tile(fq2.x, fq2.y).bld; guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(fq2.x, fq2.y); b = tile(fq2.x, fq2.y).bld; window.GV.addMoney(9000000); }
  window.GV.step(1);
  assert(isFinite(window.GV.stats().money), 'fireHQ(k61) 升級 lv5 後 money 不得 NaN（鐵律14 守衛）');
}
// T260 AI 市長：空圖開 AI 跑 120 天 → 城市自己長出來（路/電/區/人口），money 恆有限，存讀保留 aim
{
  window.GV.newWorldSeeded(260);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  assert(window.GV.ai(true) === true, 'GV.ai(true) 應開啟 AI 市長');
  for (let d = 0; d < 120; d++) window.GV.step(1);
  let roads = 0, zones = 0, plants260 = 0, bldRCI = 0;
  for (let i = 0; i < N * N; i++) {
    const t = tile(i % N, (i / N) | 0);
    if (t.road) roads++;
    if (t.zone) zones++;
    const b = t.bld;
    if (b && !b.ref && (b.k === 5 || b.k === 58 || b.k === 59 || b.k === 60)) plants260++;
    if (b && !b.ref && b.k <= 3) bldRCI++;
  }
  const st260 = window.GV.stats();
  assert(roads >= 20, 'AI 120 天應修出 ≥20 格路，實際 ' + roads);
  assert(zones + bldRCI >= 15, 'AI 120 天應劃出 ≥15 分區/RCI 建築，實際 zones=' + zones + ' bld=' + bldRCI);
  assert(plants260 >= 1, 'AI 應自己蓋出電源，實際 ' + plants260);
  assert(st260.pop > 0, 'AI 城市應有人口遷入，實際 ' + st260.pop);
  assert(isFinite(st260.money), 'AI 模式 120 天 money 不得 NaN');
  assert(window.GV.aiInfo().on === true, 'aiInfo 應回報 AI 開啟');
  // 存讀檔保留 AI 狀態
  window.GV.save();
  window.GV.ai(false);
  assert(window.GV.load() === true, 'AI 存檔 load 應成功');
  assert(window.GV.aiInfo().on === true, '存讀檔後 AI 開關應還原為開');
  window.GV.ai(false); // 收尾關閉，避免影響後續測試
}
// 農場升級後存讀檔應保留 lv（走通用 else 分支，非硬編碼 lv:1）
{
  window.GV.newWorldSeeded(254);
  window.GV.weather(0);
  window.GV.addMoney(5000000);
  const sp = findSpot('bigFarm');
  assert(place('bigFarm', sp.x, sp.y), 'bigFarm(存讀測) 應成功建造');
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 6 && guard++ < 15) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(5000000); }
  assert((b.lv || 1) === 6, 'bigFarm 應升到 lv6，實際 ' + (b.lv || 1));
  window.GV.save();
  assert(window.GV.load() === true, 'bigFarm 升級後 save→load 應成功');
  const bl = tile(sp.x, sp.y).bld;
  assert(bl && bl.k === 53 && bl.lv === 6 && bl.sz === 5, 'bigFarm 存讀檔應保留 lv6/sz5，實際 lv=' + (bl && bl.lv) + ' sz=' + (bl && bl.sz));
}

// ================= (11) T262 可調地圖規模 =================
console.log('\n-- (11) T262 可調地圖規模 --');
{
  assert(window.GV.setMapSize(144) === 144, 'GV.setMapSize(144) 應接受並回傳 144');
  window.GV.newWorldSeeded(262);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  assert(window.GV.N() === 144, '新世界後 GV.N() 應為 144，實際 ' + window.GV.N());
  assert(window.GV.tile(120, 120) !== null && window.GV.tile(143, 143) !== null, '144 世界的 (120,120)/(143,143) 應為合法格');
  window.GV.addMoney(100000);
  // 在 72 邊界外區域建造（證明遊戲邏輯在新疆域運作）
  let fx = -1, fy = -1;
  for (let y = 90; y < 138 && fx < 0; y++) for (let x = 90; x < 138; x++) {
    if (window.GV.canPlaceTool('road', x, y) === null) { fx = x; fy = y; break; }
  }
  assert(fx > 0, '144 世界 90+ 區域應找到可鋪路格');
  assert(place('road', fx, fy), '144 世界舊邊界外鋪路應成功');
  let gx = -1, gy = -1;
  for (let y = 90; y < 136 && gx < 0; y++) for (let x = 90; x < 136; x++) {
    if (window.GV.canPlaceTool('farm', x, y) === null) { gx = x; gy = y; break; }
  }
  if (gx > 0) assert(place('farm', gx, gy), '144 世界舊邊界外蓋農場應成功');
  // 存讀 roundtrip：n 欄位保尺寸與建築
  window.GV.save();
  assert(window.GV.load() === true, '144 世界 save→load 應成功');
  assert(window.GV.N() === 144, 'load 後 GV.N() 應維持 144，實際 ' + window.GV.N());
  const rb = tile(fx, fy);
  assert(rb && rb.road === 1, 'load 後 144 世界的路應還原');
  if (gx > 0) { const fb = tile(gx, gy).bld; assert(fb && fb.k === 22, 'load 後 144 世界的農場應還原'); }
  // AI 市長在大地圖跑 30 天不炸
  window.GV.ai(true);
  for (let d = 0; d < 30; d++) window.GV.step(1);
  assert(isFinite(window.GV.stats().money), '144 世界 AI 跑 30 天 money 不得 NaN');
  window.GV.ai(false);
  // 切回 72：偏好生效＋72 存檔照常可讀（跨尺寸互讀）
  assert(window.GV.setMapSize(72) === 72, '切回 72 應成功');
  window.GV.newWorldSeeded(1);
  assert(window.GV.N() === 72, '回 72 世界 GV.N() 應為 72');
  assert(window.GV.setMapSize(999) === 72, '非法尺寸 999 應被拒（維持 72）');
}

// ================= (12) T263 AI 市長災後維護：滅火＋廢墟自動拆除 =================
console.log('\n-- (12) T263 AI 災後維護 --');
{
  window.GV.newWorldSeeded(263);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.addMoney(50000);
  window.GV.ai(false);
  // 手動小城：兩條路夾一排住宅區＋電廠
  let cx = -1, cy = -1;
  for (let y = 10; y < N - 14 && cx < 0; y++) for (let x = 10; x < N - 14; x++) {
    let ok = true;
    for (let dy = 0; dy < 8 && ok; dy++) for (let dx = 0; dx < 12 && ok; dx++) { const t = tile(x + dx, y + dy); if (!t || t.t !== 2 || t.bld || t.road) ok = false; }
    if (ok) { cx = x; cy = y; }
  }
  assert(cx > 0, 'T263 應找到清地');
  for (let i = 0; i < 12; i++) { place('road', cx + i, cy + 3); place('road', cx + i, cy + 6); }
  place('plant', cx + 5, cy + 2);
  for (let i = 0; i < 12; i++) { place('zr', cx + i, cy + 4); place('zr', cx + i, cy + 5); }
  for (let d = 0; d < 60; d++) window.GV.step(1);
  const grown = [];
  for (let i = 0; i < 12; i++) for (const ry of [4, 5]) { const b = tile(cx + i, cy + ry).bld; if (b && b.k === 1 && !b.ref) grown.push([cx + i, cy + ry]); }
  assert(grown.length >= 2, 'T263 應長出 ≥2 棟住宅，實際 ' + grown.length);
  // A) AI 開啟 → 起火隔日撲滅、建築保住
  window.GV.ai(true);
  window.GV.addMoney(50000);
  const [ax2, ay2] = grown[0];
  assert(window.GV.ignite(ax2, ay2) === true, 'T263A ignite 應成功');
  for (let d = 0; d < 2; d++) window.GV.step(1);
  const ba = tile(ax2, ay2).bld;
  assert(ba && ba.k === 1 && !ba.fire, 'T263A AI 應自動滅火保樓（fire=' + (ba ? ba.fire : 'bld亡') + '）');
  // B) AI 關閉燒成廢墟 → 開啟 AI 自動拆除
  window.GV.ai(false);
  const [bx2, by2] = grown[1];
  assert(window.GV.ignite(bx2, by2) === true, 'T263B ignite 應成功');
  for (let d = 0; d < 7; d++) window.GV.step(1);
  const tb = tile(bx2, by2);
  assert(tb.ruin === 1 && !tb.bld, 'T263B 無人管 7 天應燒成廢墟（ruin=' + tb.ruin + '）');
  window.GV.ai(true);
  window.GV.addMoney(50000);
  for (let d = 0; d < 3; d++) window.GV.step(1);
  assert(tile(bx2, by2).ruin === 0, 'T263B AI 應自動拆除廢墟（3 天內）');
  assert(isFinite(window.GV.stats().money), 'T263 money 不得 NaN');
  window.GV.ai(false);
}

// ================= (13) T265 垃圾焚化發電廠：2×2／垃圾／電力／污染／車輛／存讀 =================
console.log('\n-- (13) T265 垃圾焚化發電廠 --');
{
  window.GV.newWorldSeeded(265);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.addMoney(9000000);
  window.GV.ai(false);

  const wt = findSpot('wasteIncinerator');
  assert(wt, 'T265 應找到 2×2 可建位置');
  // 清掉污染半徑外再多 2 格的樹，讓峰值／邊界斷言不受既有樹木減污影響。
  for (let y = Math.max(0, wt.y - 9); y <= Math.min(N - 1, wt.y + 9); y++)
    for (let x = Math.max(0, wt.x - 9); x <= Math.min(N - 1, wt.x + 9); x++)
      if (tile(x, y).tree) place('doze', x, y);
  assert(place('tree', wt.x + 1, wt.y), 'T265 應可在 ref 預置一棵樹以驗證逐格撤銷減污');
  assert(!!tile(wt.x + 1, wt.y).tree, 'T265 ref 樹測試前置應成立');

  const svcCat265 = elMap.get('toolcats').children.find(b => b.textContent === '服務');
  assert(svcCat265, 'T265 應在服務分類');
  svcCat265.click();
  const wtBtn = elMap.get('tools').children.find(c => c.dataset.tid === 'wasteIncinerator');
  assert(wtBtn, '服務分類應有 wasteIncinerator 工具鈕');
  wtBtn.click();
  window.GV.lookAt(wt.x, wt.y);
  const wtCenter = window.GV.center();
  assert(wtCenter[0] === wt.x && wtCenter[1] === wt.y, 'T265 指針驗收前相機中心應對準廠區 root');
  pointer('pointerdown', 400, 300); pointer('pointerup', 400, 300);

  let wb = tile(wt.x, wt.y).bld;
  assert(wb && wb.k === 62 && wb.v === 0 && wb.sz === 2 && wb.lv === 1, 'T265 UI 放置應建立 k62/v0/sz2/lv1 root');
  let wtRefs = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    if (!dx && !dy) continue;
    const rb = tile(wt.x + dx, wt.y + dy).bld;
    if (rb && rb.k === 62 && rb.ref && rb.ref[0] === wt.x && rb.ref[1] === wt.y) wtRefs++;
  }
  assert(wtRefs === 3, 'T265 2×2 應建立 3 個 ref 格，實際 ' + wtRefs);
  assert(window.GV.region().powerCap === 60, 'T265 建造後 powerCap 應即時為 60，實際 ' + window.GV.region().powerCap);
  assert(window.GV.polAt(wt.x, wt.y) === 44, 'T265 污染中心應為 44，實際 ' + window.GV.polAt(wt.x, wt.y));
  assert(window.GV.polAt(wt.x + 7, wt.y) === 6, 'T265 污染 r7 邊界應為 6，實際 ' + window.GV.polAt(wt.x + 7, wt.y));
  assert(window.GV.polAt(wt.x + 8, wt.y) === 0, 'T265 污染 r8 外應為 0，實際 ' + window.GV.polAt(wt.x + 8, wt.y));
  const wtPolBeforeRebuild = window.GV.polAt(wt.x, wt.y);
  window.GV.rebuildCov();
  assert(window.GV.polAt(wt.x, wt.y) === wtPolBeforeRebuild, 'T265 即時污染與 rebuildCov 結果應一致');

  window.GV.step(1);
  let gi = window.GV.garbageInfo();
  assert(gi.capacity === 100 && gi.sources === 1, 'T265 lv1 應精確提供垃圾容量100／來源1，實際 ' + JSON.stringify(gi));
  assert(window.GV.stats().jobs === 12, 'T265 lv1 就業應精確為 12，實際 ' + window.GV.stats().jobs);
  const moneyBeforeWtUpkeep = window.GV.stats().money;
  window.GV.step(1);
  assert(window.GV.stats().money - moneyBeforeWtUpkeep === -10, 'T265 單棟每日維護應精確 -10，實際 ' + (window.GV.stats().money - moneyBeforeWtUpkeep));
  const wtInspect1 = window.GV.inspectAt(wt.x + 1, wt.y + 1);
  for (const s of ['垃圾焚化發電廠', '處理容量 100', '供電 60', '就業 12', '維護費 $10', 'r7/p44'])
    assert(wtInspect1.includes(s), 'T265 inspect lv1 應含「' + s + '」');

  elMap.get('bUndo').onclick();
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
    assert(!tile(wt.x + dx, wt.y + dy).bld, 'T265 undo 後 footprint (' + dx + ',' + dy + ') 應清空');
  assert(window.GV.polAt(wt.x, wt.y) === 0, 'T265 undo 後污染應對稱歸 0');
  assert(window.GV.region().powerCap === 0, 'T265 undo 後 powerCap 應立即為 0');

  assert(place('wasteIncinerator', wt.x, wt.y), 'T265 undo 後應可在原位重建');
  assert(window.GV.region().powerCap === 60, 'T265 重建後 powerCap 應即時回到 60');
  window.GV.step(1);
  wb = tile(wt.x, wt.y).bld;
  let wtGuard = 0;
  while ((wb.lv || 1) < 5 && wtGuard++ < 15) {
    window.GV.upgrade(wt.x + 1, wt.y + 1);
    wb = tile(wt.x, wt.y).bld;
  }
  assert(wb.lv === 5, 'T265 應可由 ref 格升到 Lv5，實際 Lv' + wb.lv);
  assert(window.GV.region().powerCap === 92, 'T265 Lv5 升級後 powerCap 應即時為 92，實際 ' + window.GV.region().powerCap);
  window.GV.step(1);
  gi = window.GV.garbageInfo();
  assert(gi.capacity === 100, 'T265 Lv5 垃圾容量應仍固定 100，實際 ' + gi.capacity);
  assert(window.GV.stats().jobs === 12, 'T265 Lv5 就業應仍固定 12，實際 ' + window.GV.stats().jobs);

  window.GV.save();
  assert(window.GV.load() === true, 'T265 Lv5 save→load 應成功');
  wb = tile(wt.x, wt.y).bld;
  assert(wb && wb.k === 62 && wb.lv === 5 && wb.sz === 2, 'T265 load 應保留 k62/lv5/sz2');
  wtRefs = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    if (!dx && !dy) continue;
    const rb = tile(wt.x + dx, wt.y + dy).bld;
    if (rb && rb.k === 62 && rb.ref && rb.ref[0] === wt.x && rb.ref[1] === wt.y) wtRefs++;
  }
  assert(wtRefs === 3, 'T265 load 後應精確重建 3 個 ref 格，實際 ' + wtRefs);

  wtGuard = 0;
  while ((wb.lv || 1) < 10 && wtGuard++ < 15) {
    window.GV.upgrade(wt.x, wt.y);
    wb = tile(wt.x, wt.y).bld;
  }
  assert(wb.lv === 10, 'T265 應可升到 Lv10，實際 Lv' + wb.lv);
  assert(window.GV.region().powerCap === 132, 'T265 Lv10 升級後 powerCap 應即時為 132，實際 ' + window.GV.region().powerCap);
  window.GV.step(1);
  assert(isFinite(window.GV.stats().money) && window.GV.stats().jobs === 12, 'T265 Lv10 money 應有限且 jobs 仍為12');
  elMap.get('bStats').onclick();
  const wtStatsHtml = elMap.get('infoBody').innerHTML;
  assert(!/NaN|Infinity/.test(wtStatsHtml), 'T265 Lv10 財務面板不得含 NaN/Infinity');
  assert(/const MINI_BLD_PAL=\[[^\]]*'#a86a3a'/.test(html), 'T265 小地圖 palette 應含 k62 獨立色 #a86a3a');
  assert(!window.GV.sprNightAudit().some(x => x.key === '62_1_0'), 'T265 night audit 不得回報 k62 本體外亮燈像素');

  assert(place('doze', wt.x + 1, wt.y + 1), 'T265 應可從任一 ref 格拆除整棟');
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
    assert(!tile(wt.x + dx, wt.y + dy).bld, 'T265 ref doze 後 footprint (' + dx + ',' + dy + ') 應清空');
  assert(window.GV.region().powerCap === 0, 'T265 拆除後 powerCap 應即時為 0');
  assert(window.GV.polAt(wt.x, wt.y) === 0, 'T265 拆除後污染應即時歸 0');
  window.GV.step(1);
  assert(window.GV.garbageInfo().capacity === 0 && window.GV.stats().jobs === 0, 'T265 拆除後垃圾容量／就業應歸 0');
}

// k62 的道路服務來源必須涵蓋整個 2×2 footprint：道路只貼 ref 側，仍要通電、傳播 garbLocal 並派垃圾車。
{
  window.GV.newWorldSeeded(266);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.addMoney(9000000);
  window.GV.ai(false);
  let cx265 = -1, cy265 = -1;
  for (let y = 10; y < N - 14 && cx265 < 0; y++) for (let x = 10; x < N - 14; x++) {
    let ok = true;
    for (let dy = 0; dy < 8 && ok; dy++) for (let dx = 0; dx < 12 && ok; dx++) {
      const t = tile(x + dx, y + dy);
      if (!t || t.t !== 2 || t.bld || t.road) ok = false;
    }
    if (ok) { cx265 = x; cy265 = y; }
  }
  assert(cx265 > 0, 'T265 garbLocal 應找到 12×8 清地');
  for (let i = 0; i < 12; i++) {
    assert(place('road', cx265 + i, cy265 + 3), 'T265 ref 側服務路 row3 應可建');
    assert(place('road', cx265 + i, cy265 + 6), 'T265 住宅另一側服務路 row6 應可建');
  }
  const wt2x = cx265 + 5, wt2y = cy265 + 1;
  assert(place('wasteIncinerator', wt2x, wt2y), 'T265 ref 側鄰路的 k62 應可建');
  for (let i = 0; i < 12; i++) {
    assert(place('zr', cx265 + i, cy265 + 4), 'T265 住宅分區 row4 應可建');
    assert(place('zr', cx265 + i, cy265 + 5), 'T265 住宅分區 row5 應可建');
  }
  for (let d = 0; d < 60; d++) window.GV.step(1);
  assert(tile(wt2x, cy265 + 3).rp === true, 'T265 道路只貼下方 ref 時仍應由 k62 啟動電網');
  const grown265 = [];
  for (let i = 0; i < 12; i++) for (const ry of [4, 5]) {
    const b = tile(cx265 + i, cy265 + ry).bld;
    if (b && b.k === 1 && !b.ref) grown265.push([cx265 + i, cy265 + ry]);
  }
  assert(grown265.length >= 2, 'T265 ref 側路網應長出 ≥2 棟住宅，實際 ' + grown265.length);
  const gi265 = window.GV.garbageInfo();
  const gl265 = window.GV.garbLocalAt(grown265[0][0], grown265[0][1]);
  assert(Math.abs(gl265 - gi265.ratio) < 0.0002, 'T265 garbLocal 應視 ref 側為已連接來源，local=' + gl265 + ' ratio=' + gi265.ratio);
  window.GV.advanceN(0.05, 1);
  const trucks265 = window.GV.svcTrucks().recycle;
  assert(trucks265.length === 1 && trucks265[0].x === wt2x && trucks265[0].y === wt2y, 'T265 垃圾車應由唯一 k62 root 出勤');
}

// ================= (14) T266 垃圾服務可觀測性：報表／顧問／警告重置 =================
console.log('\n-- (14) T266 垃圾服務可觀測性 --');
{
  window.GV.newWorldSeeded(266);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.setSeason(0);
  window.GV.ai(false);

  let gi266 = window.GV.garbageInfo();
  assert(gi266.lastWarningDay === -999, 'T266 新圖應將垃圾警告節流重置為 -999');
  window.GV.step(1);
  gi266 = window.GV.garbageInfo();
  assert(gi266.amount === 0 && gi266.capacity === 0, 'T266 空城垃圾應為 0/0');
  assert(window.GV.stats().happy === 0.6, 'T266 空城 guard 不得改變基礎幸福 0.60');
  assert(!window.GV.log().some(l => l.m.includes('垃圾堆積')), 'T266 空城 0/0 不得誤報垃圾堆積');

  window.GV.addMoney(9000000);
  let cx266 = -1, cy266 = -1;
  for (let y = 10; y < N - 14 && cx266 < 0; y++) for (let x = 10; x < N - 14; x++) {
    let ok = true;
    for (let dy = 0; dy < 8 && ok; dy++) for (let dx = 0; dx < 12 && ok; dx++) {
      const t = tile(x + dx, y + dy);
      if (!t || t.t !== 2 || t.bld || t.road) ok = false;
    }
    if (ok) { cx266 = x; cy266 = y; }
  }
  assert(cx266 > 0, 'T266 應找到 12×8 清地');
  const wt266x = cx266 + 5, wt266y = cy266 + 1;
  assert(place('wasteIncinerator', wt266x, wt266y), 'T266 應可建一座 k62 供報表驗收');
  window.GV.step(1);
  const money266BeforePanel = window.GV.stats().money;
  const hist266BeforePanel = window.GV.hist().slice(-1)[0];
  assert(hist266BeforePanel && hist266BeforePanel.net === -10, 'T266 單座 k62 歷史 net 應精確 -10，實際 ' + (hist266BeforePanel && hist266BeforePanel.net));
  elMap.get('bStats').onclick();
  const stats266 = elMap.get('infoBody').innerHTML;
  assert(stats266.includes('⚡ 電廠 -10.0'), 'T266 財務面板應把 k62 的既有 $10 維護鏡像到電廠分項');
  assert(stats266.includes('建築：住0 商0 工0 公園0 電廠1'), 'T266 建築統計應把單座 k62 精確計為電廠1');
  assert(!stats266.includes('電廠4'), 'T266 2×2 k62 的三個 ref 不得重複計成電廠4');
  const hist266AfterPanel = window.GV.hist().slice(-1)[0];
  assert(window.GV.stats().money === money266BeforePanel && hist266AfterPanel.net === hist266BeforePanel.net,
    'T266 開啟統計面板前後 money/net 必須完全不變');

  elMap.get('bHelp').onclick();
  const help266 = elMap.get('infoBody').innerHTML;
  assert(help266.includes('焚化發電廠 +100 垃圾容量並供電，但污染很高'), 'T266 玩法指南應說明焚化廠的容量／供電／高污染取捨');

  // 用 k62 啟動真道路電網養出住宅，再補普通電廠並拆 k62：
  // 住宅仍有電、實際垃圾 >0，但垃圾容量歸零，才能驗證真超載而非空城 0/0。
  for (let i = 0; i < 12; i++) {
    assert(place('road', cx266 + i, cy266 + 3), 'T266 服務路 row3 應可建');
    assert(place('road', cx266 + i, cy266 + 6), 'T266 住宅另一側服務路 row6 應可建');
  }
  assert(place('plant', cx266 + 1, cy266 + 2), 'T266 應可補普通電廠維持拆除 k62 後的住宅供電');
  for (let i = 0; i < 12; i++) {
    assert(place('zr', cx266 + i, cy266 + 4), 'T266 住宅分區 row4 應可建');
    assert(place('zr', cx266 + i, cy266 + 5), 'T266 住宅分區 row5 應可建');
  }
  for (let d = 0; d < 60; d++) window.GV.step(1);
  let grown266 = 0;
  for (let i = 0; i < 12; i++) for (const ry of [4, 5]) {
    const b = tile(cx266 + i, cy266 + ry).bld;
    if (b && b.k === 1 && !b.ref) grown266++;
  }
  assert(grown266 >= 2, 'T266 應長出 ≥2 棟住宅製造真實垃圾，實際 ' + grown266);
  assert(place('doze', wt266x + 1, wt266y + 1), 'T266 應可由 ref 拆除唯一垃圾容量來源');
  window.GV.step(1);
  gi266 = window.GV.garbageInfo();
  assert(gi266.amount > 0 && gi266.capacity === 0 && gi266.ratio === 2,
    'T266 真超載應為 amount>0／capacity0／ratio2，實際 ' + JSON.stringify(gi266));
  assert(gi266.lastWarningDay === window.GV.stats().day, 'T266 發出超載警告後 lastWarningDay 應等於當日');
  const warn266 = window.GV.log().find(l => l.m.includes('垃圾堆積'));
  assert(warn266 && warn266.m.includes('垃圾場／回收中心／焚化發電廠'),
    'T266 超載通知應列出垃圾場／回收中心／焚化發電廠');
  elMap.get('bStats').onclick();
  const adv266 = elMap.get('infoBody').innerHTML;
  assert(adv266.includes('垃圾超載') && adv266.includes('（200%）'),
    'T266 城市顧問應顯示垃圾超載與 200% 比率');
  assert(adv266.includes('垃圾場／回收中心／焚化發電廠'),
    'T266 城市顧問應列出三種垃圾處理方案');

  window.GV.save();
  assert(window.GV.load() === true, 'T266 超載世界 save→load 應成功');
  assert(window.GV.garbageInfo().lastWarningDay === -999, 'T266 讀檔應重置不入存檔的垃圾警告節流');
  const warnCount266BeforeReloadTick = window.GV.log().filter(l => l.m.includes('垃圾堆積')).length;
  window.GV.step(1);
  const warnCount266AfterReloadTick = window.GV.log().filter(l => l.m.includes('垃圾堆積')).length;
  assert(warnCount266AfterReloadTick === warnCount266BeforeReloadTick + 1 &&
    window.GV.garbageInfo().lastWarningDay === window.GV.stats().day,
    'T266 讀取仍超載的存檔後，下一日應重新發出警告並刷新節流日');
  window.GV.newWorldSeeded(268);
  assert(window.GV.garbageInfo().lastWarningDay === -999, 'T266 再開新圖仍應重置垃圾警告節流');
  window.GV.step(1);
  assert(!window.GV.log().some(l => l.m.includes('垃圾堆積')), 'T266 新空城日結仍不得寫入垃圾堆積通知');
}

// ================= (15) T267 AI 垃圾處理決策：k62／k8／同日 fallback／確定性 =================
console.log('\n-- (15) T267 AI 垃圾處理決策 --');
{
  const roots267 = k => {
    const out = [], n = window.GV.N();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const b = tile(x, y).bld;
      if (b && !b.ref && b.k === k) out.push({ x, y, lv: b.lv || 1, sz: b.sz || 1, v: b.v || 0 });
    }
    return out;
  };
  const roadTouch267 = r => {
    const n = window.GV.N(), dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let dy = 0; dy < r.sz; dy++) for (let dx = 0; dx < r.sz; dx++) {
      for (const [ax, ay] of dirs) {
        const x = r.x + dx + ax, y = r.y + dy + ay;
        if (x >= 0 && y >= 0 && x < n && y < n && tile(x, y).road) return true;
      }
    }
    return false;
  };
  const nearRes267 = (x, y) => {
    const n = window.GV.N();
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const t = tile(nx, ny), b = t.bld;
      if (t.zone === 1 || (b && b.k === 1)) return true;
    }
    return false;
  };
  const activity267 = () => {
    let roads = 0, zones = 0, pipes = 0, n = window.GV.N();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const t = tile(x, y);
      if (t.road) roads++;
      if (t.zone) zones++;
      if (t.wp) pipes++;
    }
    return { roads, zones, pipes };
  };
  const prepare267 = (industrialN, cash, block2x2, withTower = false) => {
    window.GV.setMapSize(72);
    window.GV.newWorldSeeded(26701);
    window.GV.weather(0);
    window.GV.ai(false);
    window.GV.save();
    const d = JSON.parse(store[SKEY]), n = d.n || 72, len = n * n;
    const zeroFields = ['tre', 'rd', 'zn', 'dc', 'rn', 'rc', 'rcl', 'wp', 'el', 'bs', 'cm', 'sk', 'dt', 'skd', 'dtd',
      'rl', 'rb', 'dk', 'ow', 'tl', 'pm', 'bln', 'tr', 'of', 'fl', 'le', 'ab', 'ctr'];
    d.ter = '2'.repeat(len); // 決定性平坦草地；其餘稀疏層全部歸零，避免 fixture 受地圖生成細節干擾
    for (const f of zeroFields) d[f] = '0'.repeat(len);
    const rd = d.rd.split(''), rcl = d.rcl.split('');
    d.bl = [[9 * n + 40, 5, 10, 0, 9]]; // Lv10 普通電廠：供電充足且不會搶走 k62 的下一日 AI 升級候選
    if (withTower) d.bl.push([9 * n + 42, 10, 10, 0, 9]); // 水塔令 AI 同日再花 4 次水管動作，製造 action-budget 壓力
    for (let j = 0; j < industrialN; j++) {
      const x = 43 + (j % 6), y = 11 + ((j / 6) | 0);
      d.bl.push([y * n + x, 3, 3, 0, 9]);
    }
    if (block2x2) {
      // AI 質心固定約 (45,11)、半徑12；把整個搜尋區鋪成相連道路，再只挖一個 1×1 空位。
      // 因此區內沒有任何 2×2，電廠／工業卻都由同一電網供電，且 k8 仍有直接貼路的位置。
      for (let y = 0; y <= 24; y++) for (let x = 32; x <= 59; x++) {
        rd[y * n + x] = '1'; rcl[y * n + x] = '2';
      }
      for (const rec of d.bl) { rd[rec[0]] = '0'; rcl[rec[0]] = '0'; }
      rd[1 * n + 33] = '0'; rcl[1 * n + 33] = '0'; // 唯一可供 k8 fallback 的 1×1
    } else {
      for (let x = 40; x <= 57; x++) { rd[10 * n + x] = '1'; rcl[10 * n + x] = '2'; }
    }
    d.rd = rd.join(''); d.rcl = rcl.join('');
    d.money = cash; d.day = 20; d.df = 1; d.aim = 0; d.aiR = 12;
    d.pol = null; d.region = {}; d.hi = null; d.nl = []; d.ln = null; d.ach = []; d.star = 0; d.msIdx = 0;
    d.bus_rt = null; d.riot = null; d.plague = null; d.sc = null; d.sup = 0; d.rdep = null;
    store[SKEY] = JSON.stringify(d);
    assert(window.GV.load() === true, 'T267 fixture 存檔應可載入');
    window.GV.weather(0);
    window.GV.ai(false);
    window.GV.step(1); // 先由真 tick 算出 jobs／garbage／fin，fixture 不直接改運行時垃圾狀態
    const gi = window.GV.garbageInfo(), h = window.GV.hist().slice(-1)[0];
    window.GV.save();
    return { prepared: store[SKEY], gi, net: h && h.net };
  };
  const load267 = prepared => {
    store[SKEY] = prepared;
    assert(window.GV.load() === true, 'T267 prepared save 應可重播');
    window.GV.weather(0);
    window.GV.ai(true);
  };
  const snap267 = () => ({
    dump: roots267(8), wte: roots267(62), money: window.GV.stats().money,
    garbage: window.GV.garbageInfo(), powerCap: window.GV.region().powerCap
  });

  // 空城 ratio 的保守值雖為 2，但 garbage=0 時 AI 不應提前蓋任何垃圾設施。
  window.GV.newWorldSeeded(26700);
  window.GV.weather(0);
  window.GV.addMoney(10000);
  const emptyRoad267 = findSpot('road');
  assert(emptyRoad267 && place('road', emptyRoad267.x, emptyRoad267.y),
    'T267 空城 guard 應先有一格道路，讓 aiStep 不走無路早退');
  window.GV.ai(true);
  window.GV.step(1);
  assert(roots267(8).length === 0 && roots267(62).length === 0,
    'T267 有路但垃圾仍為0的空城，AI 單 tick 不得預蓋 k8/k62');

  // 12×Lv3 工業：jobsI=576、垃圾=46.08；一座垃圾場容量40補不平，富裕正現金流應選 k62。
  const high267 = prepare267(12, 100000, false);
  assert(high267.gi.amount === 46.08 && high267.gi.capacity === 0 && high267.net > 10,
    'T267 大缺口前置應為垃圾46.08／容量0／net>10，實際 ' + JSON.stringify({ gi: high267.gi, net: high267.net }));
  load267(high267.prepared);
  window.GV.step(1);
  let wtes267 = roots267(62), dumps267 = roots267(8);
  assert(wtes267.length === 1 && dumps267.length === 0,
    'T267 大缺口＋健康財務應在單 tick 建恰一座 k62、不建 k8');
  assert(roadTouch267(wtes267[0]), 'T267 AI k62 的 2×2 footprint 應四鄰直接接路');
  assert(!nearRes267(wtes267[0].x, wtes267[0].y) && !nearRes267(wtes267[0].x + 1, wtes267[0].y + 1),
    'T267 AI k62 的 root 與右下角都不得落在住宅／住宅分區三格內');
  let refs267 = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    if (!dx && !dy) continue;
    const b = tile(wtes267[0].x + dx, wtes267[0].y + dy).bld;
    if (b && b.k === 62 && b.ref && b.ref[0] === wtes267[0].x && b.ref[1] === wtes267[0].y) refs267++;
  }
  assert(refs267 === 3, 'T267 AI k62 應建立 1 root＋3 ref');
  assert(window.GV.garbageInfo().sources === 1 && window.GV.garbageInfo().capacity === 0,
    'T267 建造當 tick 來源應立即為1；容量沿既有日結時序仍為0');
  window.GV.step(1); // k62 已入翌日日結；Lv10 電廠不再可升，AI 應直接把新 k62 升到 Lv2
  wtes267 = roots267(62);
  assert(wtes267.length === 1 && wtes267[0].lv === 2, 'T267 次日 AI 應把唯一最低級可升建築 k62 升到 Lv2');
  assert(window.GV.garbageInfo().capacity === 100, 'T267 k62 翌日日結垃圾容量應為100');
  assert(window.GV.region().powerCap === 343,
    'T267 AI 升級 k62 後同日 powerCap 應為 Lv10電廠275＋Lv2焚化68＝343，實際 ' + window.GV.region().powerCap);
  const replayA267 = snap267();
  window.GV.ai(false);
  load267(high267.prepared);
  window.GV.step(2);
  const replayB267 = snap267();
  window.GV.ai(false);
  assert(JSON.stringify(replayB267) === JSON.stringify(replayA267),
    'T267 同一 prepared save 兩次重播的建築座標／money／垃圾／powerCap 應完全一致');

  // 建一個全道路網、五個 2×2 草地洞的 control：道路段不再改圖，分區預算會依 row-major
  // 填壞前三洞，垃圾決策應選第四洞；第五洞保留給加入住宅障礙後的安全改選。
  const roadReadyData267 = JSON.parse(high267.prepared);
  const roadReadyN267 = roadReadyData267.n || 72;
  const roadReadyRd267 = roadReadyData267.rd.split(''), roadReadyRcl267 = roadReadyData267.rcl.split('');
  for (let y = 0; y <= 24; y++) for (let x = 32; x <= 59; x++) {
    roadReadyRd267[y * roadReadyN267 + x] = '1';
    roadReadyRcl267[y * roadReadyN267 + x] = '2';
  }
  for (const rec of roadReadyData267.bl) {
    roadReadyRd267[rec[0]] = '0'; roadReadyRcl267[rec[0]] = '0';
  }
  const roadReadyHoles267 = [[37, 1], [43, 1], [49, 1], [55, 1], [37, 7]];
  for (const [hx, hy] of roadReadyHoles267) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    roadReadyRd267[(hy + dy) * roadReadyN267 + hx + dx] = '0';
    roadReadyRcl267[(hy + dy) * roadReadyN267 + hx + dx] = '0';
  }
  roadReadyRd267[4 * roadReadyN267 + 55] = '0'; // target 下方三格的住宅障礙位；control 先保持純草地
  roadReadyRcl267[4 * roadReadyN267 + 55] = '0';
  roadReadyData267.rd = roadReadyRd267.join(''); roadReadyData267.rcl = roadReadyRcl267.join('');
  const roadReadyPrepared267 = JSON.stringify(roadReadyData267);
  load267(roadReadyPrepared267);
  window.GV.step(1);
  wtes267 = roots267(62); dumps267 = roots267(8);
  const controlWte267 = { x: 55, y: 1, sz: 2 };
  assert(wtes267.length === 1 && dumps267.length === 0 && wtes267[0].x === controlWte267.x &&
    wtes267[0].y === controlWte267.y,
    'T267 道路網 control 應在前三洞被分區預算填壞後，實建第四洞 (55,1)；實際 ' +
    JSON.stringify({ actual: wtes267, dumps: dumps267 }));
  window.GV.ai(false);
  load267(roadReadyPrepared267);
  assert(window.GV.canPlaceTool('wasteIncinerator', controlWte267.x, controlWte267.y) === null &&
    roadTouch267(controlWte267) && !nearRes267(controlWte267.x, controlWte267.y),
    'T267 control 實際首選 (55,1) 應在 tick 前已可建／直接接路／遠離住宅');
  window.GV.ai(false);

  const avoidData267 = JSON.parse(roadReadyPrepared267);
  const avoidZoneX267 = controlWte267.x, avoidZoneY267 = controlWte267.y + 3;
  const avoidZn267 = avoidData267.zn.split('');
  avoidZn267[avoidZoneY267 * (avoidData267.n || 72) + avoidZoneX267] = '1';
  avoidData267.zn = avoidZn267.join('');
  load267(JSON.stringify(avoidData267));
  const avoidProbe267 = {
    canPlace: window.GV.canPlaceTool('wasteIncinerator', controlWte267.x, controlWte267.y),
    road: roadTouch267(controlWte267),
    nearRes: nearRes267(controlWte267.x, controlWte267.y),
    root: controlWte267, zone: [avoidZoneX267, avoidZoneY267]
  };
  assert(avoidProbe267.canPlace === null && avoidProbe267.road && avoidProbe267.nearRes,
    'T267 住宅障礙版只改一格 zone 後，原首選仍可建／貼路，但確實位於住宅三格內；實際 ' +
    JSON.stringify(avoidProbe267));
  window.GV.step(1);
  wtes267 = roots267(62); dumps267 = roots267(8);
  assert(wtes267.length === 1 && dumps267.length === 0 &&
    (wtes267[0].x !== controlWte267.x || wtes267[0].y !== controlWte267.y),
    'T267 只加入住宅障礙後，AI 應跳過原首選地點並改建另一座 k62');
  assert(roadTouch267(wtes267[0]) && !nearRes267(wtes267[0].x, wtes267[0].y) &&
    !nearRes267(wtes267[0].x + 1, wtes267[0].y + 1),
    'T267 改選後 k62 仍須直接接路，且 root／右下角都不得落在住宅三格內');
  window.GV.ai(false);

  // 道路6＋水管4＋分區原可先吃滿14次：危機保留機制應把一般動作停在13，仍讓 k62 成為第14次施工。
  const budget267 = prepare267(12, 100000, false, true);
  assert(budget267.gi.amount === 46.08 && budget267.net > 10,
    'T267 action-budget fixture 應保留大缺口＋健康財務');
  load267(budget267.prepared);
  const activityBefore267 = activity267();
  window.GV.step(1);
  const activityAfter267 = activity267();
  const ordinaryActs267 = (activityAfter267.roads - activityBefore267.roads) +
    (activityAfter267.zones - activityBefore267.zones) +
    (activityAfter267.pipes - activityBefore267.pipes);
  assert(ordinaryActs267 === 13,
    'T267 垃圾危機應把道路／水管／分區一般動作封頂13，實際 ' + ordinaryActs267);
  assert(roots267(62).length === 1 && roots267(8).length === 0,
    'T267 前段本可耗滿 MAXA 時，保留的第14次施工仍應同 tick 建 k62');
  window.GV.ai(false);

  // 10×Lv3 工業：垃圾38.4≤40，即使富裕也只需一座 k8。
  const small267 = prepare267(10, 100000, false);
  assert(small267.gi.amount === 38.4 && small267.net > 10,
    'T267 小缺口前置應為垃圾38.4且 net>10，實際 ' + JSON.stringify({ gi: small267.gi, net: small267.net }));
  load267(small267.prepared);
  window.GV.step(1);
  dumps267 = roots267(8); wtes267 = roots267(62);
  assert(dumps267.length === 1 && wtes267.length === 0,
    'T267 小缺口即使富裕也應建 k8、不建 k62');
  assert(roadTouch267(dumps267[0]), 'T267 AI k8 應四鄰直接接路');
  window.GV.ai(false);
  window.GV.step(1);
  assert(window.GV.garbageInfo().capacity === 40, 'T267 k8 翌日日結容量應為40');

  // 大缺口但現金不足以承擔 k62：仍應用負擔得起的 k8 止血。
  const lean267 = prepare267(12, 1000, false);
  assert(lean267.gi.amount === 46.08 && lean267.net > 10,
    'T267 低現金 fixture 仍應保留大缺口與正現金流');
  load267(lean267.prepared);
  window.GV.step(1);
  assert(roots267(8).length === 1 && roots267(62).length === 0,
    'T267 大缺口但資金不足時應 fallback k8');
  window.GV.ai(false);

  // 財務本可選 k62，但相連道路網堵死所有 2×2；同一 tick 必須 fallback k8。
  const blocked267 = prepare267(12, 100000, true);
  assert(blocked267.gi.amount === 46.08 && blocked267.net > 10,
    'T267 空間 fallback 前置仍應為大缺口＋net>10');
  load267(blocked267.prepared);
  let legal2x2_267 = 0;
  for (let y = 1; y <= 23; y++) for (let x = 33; x <= 57; x++)
    if (window.GV.canPlaceTool('wasteIncinerator', x, y) === null) legal2x2_267++;
  assert(legal2x2_267 === 0, 'T267 道路網 fixture 在 AI 半徑內不得留任何合法 2×2');
  window.GV.step(1);
  dumps267 = roots267(8); wtes267 = roots267(62);
  assert(dumps267.length === 1 && wtes267.length === 0,
    'T267 無合法 2×2 時應在同一 tick fallback k8');
  assert(roadTouch267(dumps267[0]), 'T267 空間 fallback 的 k8 仍須四鄰直接接路');
  window.GV.ai(false);

  // 本卡不得偷偷新增／移動主亂數呼叫；AI 改選固定變體 k62 的既有 ri(3) 差異屬明示策略分岔。
  const pre267Html = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T267.html'), 'utf8');
  const rngLines267 = s => s.split(/\r?\n/).filter(l => /\b(?:R|ri)\s*\(|Math\.random\s*\(/.test(l));
  assert(JSON.stringify(rngLines267(html)) === JSON.stringify(rngLines267(pre267Html)),
    'T267 相對備份的 R()/ri()/Math.random() 呼叫行應逐行零差異');
}

console.log('\nFIX-D/FIX-E 回歸測試全部通過');
process.exit(0);
