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
  ['solar', 25, 2], ['prison', 31, 2], ['university', 32, 3], ['bigFarm', 53, 5], ['bigCemetery', 54, 3], ['grandStation', 55, 3], ['sportsComplex', 56, 3]
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
const SVK = new Set([19, 25, 31, 32, 53, 54, 55, 56]); // T228/T233/T234/T241：bigFarm/bigCemetery/grandStation/sportsComplex 亦屬單變體；T230/T232：ranch/parking 移出
let tampered = 0;
for (const rec of d1.bl) if (SVK.has(rec[1])) { rec[3] = 2; tampered++; }
assert(tampered === 8, '存檔 bl 應含 8 棟單變體建築（實得 ' + tampered + '）');
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

console.log('\nFIX-D/FIX-E 回歸測試全部通過');
process.exit(0);
