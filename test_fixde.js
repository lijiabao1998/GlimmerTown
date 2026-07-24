// FIX-D/FIX-E 回歸測試（DOM mock）
// 覆蓋：單變體建築 v=0、多格 doze 從 ref 解析、wp 拆除白名單、軌道遮罩 recalc、
//       存檔 _bak 備份還原、COV 蓋撤印對稱（防 Uint8 下溢）、undo 軌道遮罩、
//       快捷鍵 dataset.tid 反查、doze 鈕去重、showStats 逸出、sw.js 版號、inspect 文案
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const zlib = require('zlib');
const childProcess = require('child_process');

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
  ['solar', 25, 2], ['prison', 31, 2], ['university', 32, 3], ['bigFarm', 53, 5], ['bigCemetery', 54, 3], ['grandStation', 55, 3], ['sportsComplex', 56, 3], ['foodPlant', 57, 3], ['nuclear', 58, 3], ['hydro', 59, 2], ['fireHQ', 61, 3], ['greenhouse', 63, 2], ['warehouse', 64, 2], ['grandMall', 65, 4], ['faithCenter', 66, 2], ['wasteIncinerator', 62, 2]
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
// T291 底部貼合格子：sprFootAudit hook 應存在且回陣列（真實像素溢出驗證於瀏覽器端＝總溢出 0px；harness getImageData 為 stub 故此處為煙霧測試）
assert(Array.isArray(window.GV.sprFootAudit()), 'T291 sprFootAudit 應回傳陣列（底部貼合格子審計 hook）');
// 竄改存檔 v=2 → load 應正規化回 0
// T226/T274：農場座標決定性選型＋SPR 鍵存在＋load 保留變體（新設計正面斷言）
{
  const sp = findSpot('farm');
  assert(sp, 'farm 應找到可建位置');
  assert(place('farm', sp.x, sp.y), 'farm 應成功建造');
  const fb = tile(sp.x, sp.y).bld;
  const expV = (sp.x * 5 + sp.y * 11) % 16; // T274：16 作物
  assert(fb && fb.k === 22 && fb.v === expV && fb.sz === 2, 'farm root v 應為座標決定性 (x*5+y*11)%16=' + expV + '、sz=2');
  assert(html.includes("SPR.bld['22_1_1']") && html.includes("SPR.bld['22_1_15']"), 'SPR.bld 應生成 22_1_1..22_1_15（T226/227/235/T274 農場 16 作物）');
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
// T230/T273：牧場座標決定性選型＋SPR 鍵存在＋load 保留變體
{
  const sp = findSpot('ranch');
  assert(sp, 'ranch 應找到可建位置');
  assert(place('ranch', sp.x, sp.y), 'ranch 應成功建造');
  const rb2 = tile(sp.x, sp.y).bld;
  const expV = (sp.x * 7 + sp.y * 5) % 5;
  assert(rb2 && rb2.k === 23 && rb2.v === expV && rb2.sz === 2, 'ranch root v 應為座標決定性 (x*7+y*5)%5=' + expV + '、sz=2');
  assert(html.includes("SPR.bld['23_1_1']") && html.includes("SPR.bld['23_1_2']") &&
    html.includes("SPR.bld['23_1_3']") && html.includes("SPR.bld['23_1_4']"),
  'SPR.bld 應生成 23_1_1..23_1_4（T230/T273 牧場 5 變體）');
  svRoots.push({ k: 23, x: sp.x, y: sp.y, keepV: expV });
}
window.GV.save();
const d1 = JSON.parse(store[SKEY]);
const SVK = new Set([19, 25, 31, 32, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66]); // T296：faithCenter 信仰中心單變體 // T265：wasteIncinerator；T257：nuclear/hydro/fireHQ 亦屬單變體；T228/T233/T234/T241/T254：bigFarm/bigCemetery/grandStation/sportsComplex/foodPlant；T230/T232：ranch/parking 移出
let tampered = 0;
for (const rec of d1.bl) if (SVK.has(rec[1])) { rec[3] = 2; tampered++; }
assert(tampered === 17, '存檔 bl 應含單變體建築（實得 ' + tampered + '）');
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
assert(/const CACHE=CACHE_PREFIX\+'v14';/.test(swSrc), 'sw.js CACHE 應由專屬前綴組成 v14');
assert(!/const CACHE\s*=\s*['"]gv-v2['"]/.test(swSrc), 'sw.js 不得再把 gv-v2 當目前快取');
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
  { // T283 起：期望值依當日農產市價動態計算（farmGold=round(36×價)+procGold=round(min(60,40)×1.5×價)−upkeep32）
    const n1 = net(), fp1 = window.GV.foodPrice();
    const exp1 = Math.round(36 * fp1) + Math.round(60 * fp1) - 32;
    assert(n1 === exp1, 'foodPlant lv1+3大農場 net 應 = ' + exp1 + '（市價×' + fp1.toFixed(2) + '），實際 ' + n1);
  }
  // 升級 foodPlant 到 lv5（加工容量 120）：procGold min(60,120)*1.5=90 → net = 36+90-32 = 94
  let b = tile(fp.x, fp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 15) { window.GV.upgrade(fp.x, fp.y); b = tile(fp.x, fp.y).bld; window.GV.addMoney(8000000); }
  { // T283 起：市價動態期望（procGold=round(min(60,120)×1.5×價)=round(90×價)）
    const n5 = net(), fp5 = window.GV.foodPrice();
    const exp5 = Math.round(36 * fp5) + Math.round(90 * fp5) - 32;
    assert(n5 === exp5, 'foodPlant lv5 net 應 = ' + exp5 + '（市價×' + fp5.toFixed(2) + '），實際 ' + n5);
  }
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

// ================= T283/T284 市價與貨物鏈 =================
console.log('\n-- T283 市價 / T284 貨物鏈 --');
{
  // T283：界限/決定性/搶購潮/秋賤冬貴
  window.GV.newWorldSeeded(283);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  let mn283 = 9, mx283 = 0, demSeen = false;
  const series283 = [];
  for (let d = 0; d < 120; d++) {
    window.GV.step(1);
    const fp = window.GV.foodPrice();
    series283.push(+fp.toFixed(4));
    if (fp < mn283) mn283 = fp; if (fp > mx283) mx283 = fp;
    if (fp > 1.3) demSeen = true;
  }
  assert(mn283 >= 0.6 && mx283 <= 1.8, 'T283 市價應在 [0.6,1.8] 界限內（' + mn283.toFixed(2) + '~' + mx283.toFixed(2) + '）');
  assert(mx283 - mn283 > 0.3, 'T283 市價應有可觀波動（幅度 ' + (mx283 - mn283).toFixed(2) + '）');
  assert(demSeen, 'T283 120 天內應出現搶購潮高價（>1.3）');
  // 決定性：同日重放同價
  const fpNow = window.GV.foodPrice();
  window.GV.save();
  assert(window.GV.load() === true, 'T283 存讀應成功');
  assert(Math.abs(window.GV.foodPrice() - fpNow) < 1e-9, 'T283 市價為純 day 函數＝存讀後同日同價');
  // T284：油井原料→工業品→商業稅（沙盤：手動小鏈）
  window.GV.newWorldSeeded(284);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(80000);
  const g0 = window.GV.goods();
  assert(g0.stock === 0 && g0.cap === 60, 'T284 初始工業品 0/60，實際 ' + g0.stock + '/' + g0.cap);
  const wsp = findSpot('warehouse');
  assert(wsp && place('warehouse', wsp.x, wsp.y), 'T284 倉儲應成功建造');
  window.GV.step(1);
  assert(window.GV.goods().cap === 180, 'T284 倉儲後容量應 180（60+120），實際 ' + window.GV.goods().cap);
  assert(isFinite(window.GV.stats().money), 'T284/285 money 不得 NaN');
}
// ================= T290 大型購物中心 k65 4×4 =================
console.log('\n-- T290 大型購物中心 --');
{
  window.GV.newWorldSeeded(290);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(60000);
  const sp = findSpot('grandMall');
  assert(sp, 'T290 購物中心應找到 4×4 可建位置');
  const jobs0 = window.GV.stats().jobs || 0;
  assert(place('grandMall', sp.x, sp.y), 'T290 購物中心應成功建造');
  // 16 格佔用：root sz=4 + 15 ref
  let rootN = 0, refN = 0;
  for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
    const b = tile(sp.x + dx, sp.y + dy).bld;
    assert(b && b.k === 65, 'T290 4×4 每格應為 k65');
    if (b.ref) refN++; else { rootN++; assert(b.sz === 4, 'T290 root sz 應=4'); }
  }
  assert(rootN === 1 && refN === 15, 'T290 應 1 root + 15 ref（實得 ' + rootN + '/' + refN + '）');
  window.GV.step(12); // 催熟完工
  const jobs1 = window.GV.stats().jobs || 0;
  assert(jobs1 > jobs0, 'T290 購物中心應增就業（' + jobs0 + '→' + jobs1 + '）');
  for (let d = 0; d < 40; d++) window.GV.step(1);
  assert(isFinite(window.GV.stats().money), 'T290 money 不得 NaN（鐵律14 稅收守衛）');
  // 升級不崩（純擴店）
  if (window.GV.upgrade) { window.GV.upgrade(sp.x, sp.y); window.GV.step(3); assert(isFinite(window.GV.stats().money), 'T290 升級後 money 不得 NaN'); }
}
// ================= T292 地價系統修復（修僵屍 LANDBASE）=================
console.log('\n-- T292 地價系統修復 --');
{
  window.GV.newWorldSeeded(1);
  window.GV.addMoney(80000);
  const N292 = window.GV.N();
  let maxB = 0; for (let y = 0; y < N292; y++) for (let x = 0; x < N292; x++) maxB = Math.max(maxB, window.GV.landAt(x, y));
  assert(maxB <= 130, 'T292 新圖無服務時地價應接近中性 128，實得 max=' + maxB);
  const sp292 = findSpot('police'); assert(sp292, 'T292 應找到警局可建位置');
  place('police', sp292.x, sp292.y);
  window.GV.step(2);
  let maxA = 0; for (let y = 0; y < N292; y++) for (let x = 0; x < N292; x++) maxA = Math.max(maxA, window.GV.landAt(x, y));
  assert(maxA > maxB, 'T292 建警局後地價應上升（landDirty 修僵屍：原 LANDBASE 僅 newWorld/load/undo 重建，建服務走增量 stampCov 不碰 LANDBASE），實得 ' + maxB + '→' + maxA);
  assert(maxA >= 136, 'T292 警局覆蓋格地價應≥136（128+服務×8），實得 ' + maxA);
}
// ================= T293 公共運輸乘客流 =================
console.log('\n-- T293 公共運輸乘客流 --');
{
  window.GV.newWorldSeeded(1);
  const tr = window.GV.transit();
  assert(tr && typeof tr.ridership === 'number' && typeof tr.rev === 'number', 'T293 transit hook 應回傳 {ridership,busPop,railPop,rev}');
  assert(tr.ridership === 0 && tr.busPop === 0 && tr.railPop === 0, 'T293 新圖無公交/軌道時客運量/票務應為 0（基線），實得 ridership=' + tr.ridership + ' busPop=' + tr.busPop + ' railPop=' + tr.railPop);
}
// ================= T294 服務預算滑塊 =================
console.log('\n-- T294 服務預算滑塊 --');
{
  window.GV.newWorldSeeded(1);
  const sb0 = window.GV.svcBudget();
  assert(sb0.police === 1 && sb0.fire === 1 && sb0.health === 1 && sb0.edu === 1, 'T294 新圖服務預算應全 1.0×');
  window.GV.addMoney(50000);
  const sp294 = findSpot('police'); assert(sp294, 'T294 應找到警局位置');
  place('police', sp294.x, sp294.y); window.GV.step(1);
  const N294 = window.GV.N();
  const cntCov = () => { let c = 0; for (let y = 0; y < N294; y++) for (let x = 0; x < N294; x++) if (window.GV.cov('police', x, y) > 0) c++; return c; };
  const c1 = cntCov(); assert(c1 > 0, 'T294 警局應產生覆蓋，實得 ' + c1);
  window.GV.setSvcBudget('police', 0.5); const c15 = cntCov();  // →1.5×
  window.GV.setSvcBudget('police', -1.0); const c05 = cntCov(); // →0.5×
  assert(c15 > c1, 'T294 預算 1.5× 覆蓋應比 1.0× 廣（' + c15 + '>' + c1 + '）');
  assert(c05 < c1, 'T294 預算 0.5× 覆蓋應比 1.0× 窄（' + c05 + '<' + c1 + '）');
  window.GV.setSvcBudget('police', 0.5); // 回 1.0
  // 存讀保留
  window.GV.setSvcBudget('fire', 0.4);
  window.GV.save(); assert(window.GV.load() === true, 'T294 存讀應成功');
  assert(Math.abs(window.GV.svcBudget().fire - 1.4) < 1e-6, 'T294 服務預算應存讀保留，實得 fire=' + window.GV.svcBudget().fire);
}
// ================= T295 抽樣市民 agent =================
console.log('\n-- T295 抽樣市民 agent --');
{
  window.GV.newWorldSeeded(1);
  assert(window.GV.citizenCount() === 0, 'T295 新圖應無抽樣市民，實得 ' + window.GV.citizenCount());
  const cz = window.GV.citizens();
  assert(Array.isArray(cz), 'T295 citizens hook 應回傳陣列');
  window.GV.advanceN(0.04, 8); // T295b：市民步行更新（空城）不崩
  assert(isFinite(window.GV.stats().money), 'T295b advanceN（市民步行更新）後 money 不得 NaN');
}
// ================= T300 AI 地鐵規劃 =================
console.log('\n-- T300 AI 地鐵規劃 --');
{
  window.GV.newWorldSeeded(1);
  window.GV.metroClear();
  assert(window.GV.metro().length === 0, 'T300 清空後應無地鐵');
  assert(Array.isArray(window.GV.metro()), 'T300 metro hook 應回傳陣列');
  assert(typeof window.GV.metroPlan() === 'boolean', 'T300 metroPlan 應回傳布林（空城高客流塊不足＝false）');
  assert(isFinite(window.GV.stats().money), 'T300 地鐵規劃後 money 不得 NaN');
}
// ================= T299 城市事件系統 =================
console.log('\n-- T299 城市事件系統 --');
{
  window.GV.newWorldSeeded(1);
  assert(window.GV.cityEvent() === null, 'T299 新圖應無城市事件');
  const ev = window.GV.setCityEvent('boom');
  assert(ev === 'boom' && window.GV.cityEvent() && window.GV.cityEvent().id === 'boom', 'T299 setCityEvent 應觸發指定事件');
  assert(window.GV.cityEvent().tax === 1.3, 'T299 經濟繁榮稅收乘數應為 1.3');
  window.GV.setCityEvent('harvest');
  assert(window.GV.cityEvent().food === 1.5, 'T299 豐收節食物乘數應為 1.5');
  window.GV.setCityEvent(null);
  assert(window.GV.cityEvent() === null, 'T299 清除事件後應為 null');
  window.GV.step(2); assert(isFinite(window.GV.stats().money), 'T299 事件系統 money 不得 NaN');
}
// ================= T280 溫室：全年恆溫食物/金幣＋NaN 守衛 =================
console.log('\n-- T280 溫室恆溫 --');
{
  window.GV.newWorldSeeded(280);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(50000);
  const sp = findSpot('greenhouse');
  assert(sp, 'greenhouse 應找到可建位置');
  assert(place('greenhouse', sp.x, sp.y), 'greenhouse 應成功建造');
  window.GV.setSeason(0); window.GV.step(1);
  const gf1 = window.GV.food();
  window.GV.setSeason(3); window.GV.step(1);
  const gf3 = window.GV.food();
  assert(gf1 === 6 && gf3 === 6, '溫室 lv1 食物應恆 6 且冬季不減（春' + gf1 + '/冬' + gf3 + '）');
  let b = tile(sp.x, sp.y).bld, guard = 0;
  while ((b.lv || 1) < 5 && guard++ < 12) { window.GV.upgrade(sp.x, sp.y); b = tile(sp.x, sp.y).bld; window.GV.addMoney(50000); }
  window.GV.step(1);
  assert(window.GV.food() === 30, '溫室 lv5 冬季食物應 30（lv×6 恆溫），實際 ' + window.GV.food());
  assert(isFinite(window.GV.stats().money), '溫室 lv5 money 不得 NaN（鐵律14 守衛）');
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
  const post267Html = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T268.html'), 'utf8');
  const rngLines267 = s => s.split(/\r?\n/).filter(l => /\b(?:R|ri)\s*\(|Math\.random\s*\(/.test(l));
  assert(JSON.stringify(rngLines267(post267Html)) === JSON.stringify(rngLines267(pre267Html)),
    'T267 當卡相對 pre-T267 的 R()/ri()/Math.random() 呼叫行應逐行零差異');
}

// ================= (16) T268 PWA 快取生命週期／離線入口 =================
async function runPwaTests() {
  console.log('\n-- (16) T268 PWA 快取生命週期／離線入口 --');
  const sw268 = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  const base268 = 'https://example.test/glimmer-town/';
  const shellFiles270 = [
    './index.html',
    './manifest.json',
    './icon.svg',
    './icon-v1-192.png',
    './icon-v1-512.png',
    './icon-v1-maskable-512.png'
  ];

  function makeSwHarness268(source) {
    const handlers = Object.create(null);
    const buckets = new Map();
    const ops = {
      opened: [], addAll: [], deleted: [], puts: [], putFailures: 0, openFailures: 0,
      matchFailures: 0, networkCalls: 0, skipWaiting: 0, claim: 0, order: []
    };
    let fetchImpl = async () => { throw new TypeError('offline'); };
    let rejectPut = false;
    let rejectOpen = false;
    let rejectMatch = false;
    const toUrl = request => new URL(typeof request === 'string' ? request : request.url, base268).href;
    const sameKey = (a, b, ignoreSearch) => {
      if (!ignoreSearch) return a === b;
      const ua = new URL(a), ub = new URL(b);
      return ua.origin === ub.origin && ua.pathname === ub.pathname;
    };
    const cacheFor = name => {
      if (!buckets.has(name)) buckets.set(name, new Map());
      const entries = buckets.get(name);
      return {
        async addAll(files) {
          ops.addAll.push(files.slice());
          for (const file of files) entries.set(toUrl(file), new Response('cached:' + file, { status: 200 }));
        },
        async put(request, response) {
          ops.puts.push(toUrl(request));
          if (rejectPut) { ops.putFailures++; throw new Error('quota'); }
          entries.set(toUrl(request), response.clone());
        },
        async match(request, options = {}) {
          if (rejectMatch) { ops.matchFailures++; throw new Error('cache match unavailable'); }
          const wanted = toUrl(request);
          for (const [key, response] of entries) {
            if (sameKey(key, wanted, !!options.ignoreSearch)) return response.clone();
          }
          return undefined;
        }
      };
    };
    const cacheStorage = {
      async open(name) {
        ops.opened.push(name);
        if (rejectOpen) { ops.openFailures++; throw new Error('cache storage unavailable'); }
        return cacheFor(name);
      },
      async keys() { return Array.from(buckets.keys()); },
      async delete(name) {
        ops.deleted.push(name); ops.order.push('delete:' + name);
        return buckets.delete(name);
      }
    };
    const self268 = {
      location: { href: base268 + 'sw.js', origin: new URL(base268).origin },
      registration: { scope: base268 },
      clients: {
        claim: () => new Promise(resolve => setTimeout(() => {
          ops.claim++; ops.order.push('claim'); resolve();
        }, 5))
      },
      skipWaiting: () => new Promise(resolve => setTimeout(() => {
        ops.skipWaiting++; ops.order.push('skipWaiting'); resolve();
      }, 5)),
      addEventListener(type, handler) { handlers[type] = handler; }
    };
    vm.runInNewContext(source, {
      self: self268,
      caches: cacheStorage,
      fetch: request => { ops.networkCalls++; return fetchImpl(request); },
      URL, Response, Promise, Set, TypeError, Error, setTimeout, clearTimeout
    }, { filename: 'sw.js' });

    return {
      ops,
      cacheStorage,
      seed(name) { if (!buckets.has(name)) buckets.set(name, new Map()); },
      setFetch(fn) { fetchImpl = fn; },
      failPut(on) { rejectPut = !!on; },
      failOpen(on) { rejectOpen = !!on; },
      failMatch(on) { rejectMatch = !!on; },
      async fireLife(type) {
        let lifetime = null;
        handlers[type]({ waitUntil(promise) { lifetime = Promise.resolve(promise); } });
        if (!lifetime) throw new Error(type + ' did not call waitUntil');
        await lifetime;
      },
      async fireFetch(request) {
        let responsePromise = null, calls = 0;
        handlers.fetch({
          request,
          respondWith(value) { calls++; responsePromise = Promise.resolve(value); }
        });
        if (!calls) return { intercepted: false, response: null };
        return { intercepted: true, response: await responsePromise };
      }
    };
  }

  const h268 = makeSwHarness268(sw268);
  for (const name of ['gv-v1', 'gv-v2', 'glimmerville-shell-v2', 'glimmerville-shell-v3',
    'glimmerville-shell-v4',
    'gv-other-app', 'shared-cache']) h268.seed(name);
  await h268.fireLife('install');
  assert(h268.ops.opened[0] === 'glimmerville-shell-v14',
    'T268-T270 install 應開啟目前專屬 glimmerville-shell-v14 cache');
  assert(JSON.stringify(h268.ops.addAll[0]) === JSON.stringify(shellFiles270),
    'T270 precache 應抓 canonical index／manifest／SVG 與三張 PNG，不重複下載 scope root 或 sw.js');
  assert(h268.ops.skipWaiting === 1 && h268.ops.order.includes('skipWaiting'),
    'T268 install.waitUntil 應等待 skipWaiting 完成');

  await h268.fireLife('activate');
  assert(JSON.stringify(h268.ops.deleted.slice().sort()) ===
    JSON.stringify(['glimmerville-shell-v2', 'glimmerville-shell-v3', 'glimmerville-shell-v4',
      'gv-v1', 'gv-v2'].sort()),
    'T268-T270 activate 應只刪本專屬舊版與精確 legacy gv-v1/v2');
  const keys268 = await h268.cacheStorage.keys();
  assert(keys268.includes('glimmerville-shell-v14') && keys268.includes('gv-other-app') && keys268.includes('shared-cache'),
    'T268 activate 必須保留目前 cache、其他 gv-* 與無關同源 cache');
  assert(h268.ops.claim === 1 && h268.ops.order[h268.ops.order.length - 1] === 'claim',
    'T268 activate.waitUntil 應在舊 cache 清理後等待 clients.claim');

  let result268 = await h268.fireFetch({ method: 'POST', url: base268 + 'save', mode: 'same-origin' });
  assert(!result268.intercepted, 'T268 POST 不得由 Service Worker respondWith 接管');
  result268 = await h268.fireFetch({ method: 'GET', url: 'https://cdn.example/icon.svg', mode: 'cors' });
  assert(!result268.intercepted, 'T268 跨源 GET 不得由 Service Worker 接管');
  result268 = await h268.fireFetch({ method: 'GET', url: 'https://example.test/other/app.js', mode: 'same-origin' });
  assert(!result268.intercepted, 'T268 同源但 scope 外 GET 不得由 Service Worker 接管');
  result268 = await h268.fireFetch({ method: 'GET', url: base268 + 'api.json?v=2', mode: 'same-origin' });
  assert(!result268.intercepted, 'T268 scope 內非 app-shell GET 不得被廣域 cache-first 攔截');

  h268.setFetch(async () => new Response('fresh-online', {
    status: 200, headers: { 'Content-Type': 'text/html;charset=utf-8' }
  }));
  result268 = await h268.fireFetch({ method: 'GET', url: base268 + 'index.html?cb=268', mode: 'navigate' });
  assert(result268.intercepted && await result268.response.text() === 'fresh-online',
    'T268 在線帶 query 導航應回傳 network response');
  assert(h268.ops.puts.includes(base268 + 'index.html'),
    'T268 成功的 root/index 導航應回寫 canonical index cache key');

  h268.setFetch(async () => { throw new TypeError('offline'); });
  result268 = await h268.fireFetch({ method: 'GET', url: base268, mode: 'navigate' });
  assert(result268.intercepted && await result268.response.text() === 'fresh-online',
    'T268 離線 scope root 應回退 canonical index');
  result268 = await h268.fireFetch({ method: 'GET', url: base268 + 'index.html?slot=3', mode: 'navigate' });
  assert(await result268.response.text() === 'fresh-online',
    'T268 離線 index.html?query 應忽略 query 回退 canonical index');
  const manifest268 = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  result268 = await h268.fireFetch({
    method: 'GET', url: new URL(manifest268.start_url, base268).href, mode: 'navigate'
  });
  assert(await result268.response.text() === 'fresh-online',
    'T268 manifest start_url 離線時應由同一 canonical index 承接');

  h268.failPut(true);
  h268.setFetch(async () => new Response('fresh-despite-quota', { status: 200 }));
  result268 = await h268.fireFetch({ method: 'GET', url: base268 + 'index.html', mode: 'navigate' });
  assert(await result268.response.text() === 'fresh-despite-quota' && h268.ops.putFailures === 1,
    'T268 cache.put 拒絕時仍須回傳已成功取得的 network response');
  h268.failPut(false);

  h268.setFetch(async () => { throw new TypeError('offline'); });
  result268 = await h268.fireFetch({ method: 'GET', url: base268 + 'icon.svg?v=268', mode: 'same-origin' });
  assert(result268.intercepted && await result268.response.text() === 'cached:./icon.svg',
    'T268 已知 app-shell 靜態資產可在命名 cache 內忽略 query 命中');

  const putCountBefore503 = h268.ops.puts.length;
  h268.setFetch(async () => new Response('maintenance', { status: 503 }));
  result268 = await h268.fireFetch({ method: 'GET', url: base268, mode: 'navigate' });
  assert(result268.response.status === 503 && await result268.response.text() === 'maintenance' &&
    h268.ops.puts.length === putCountBefore503,
    'T268 HTTP 503 應照實回傳且不得污染 canonical app-shell');

  await h268.cacheStorage.delete('glimmerville-shell-v14');
  h268.setFetch(async () => { throw new TypeError('offline'); });
  result268 = await h268.fireFetch({ method: 'GET', url: base268, mode: 'navigate' });
  assert(result268.response.status === 503 && (await result268.response.text()).includes('尚未完成首次快取'),
    'T268 app-shell 遭清除且離線時應回 503 說明，不得裸 Promise rejection');

  const index268 = fs.readFileSync(path.join(__dirname, 'index.html'));
  const preIndex268 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T268.html'));
  const postIndex268 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T269.html'));
  const indexText268 = index268.toString('utf8');
  const rngLines268 = source => source.toString('utf8').split(/\r?\n/)
    .filter(line => /\b(?:R|ri)\s*\(|Math\.random\s*\(/.test(line));
  assert(JSON.stringify(rngLines268(postIndex268)) === JSON.stringify(rngLines268(preIndex268)),
    'T268 當卡 index 註冊提示改動不得新增／移除主亂數呼叫');
  assert(indexText268.includes("updateViaCache:'none'") && indexText268.includes('Service Worker 註冊失敗'),
    'T268 頁面應明示 SW 更新繞過 HTTP cache，且註冊失敗不再靜默吞掉');
  const readme268 = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  assert(readme268.includes('並不等於 localhost') && readme268.includes('固定的 HTTPS 網址'),
    'T268 README 應明確區分 LAN HTTP 可玩與 HTTPS PWA 離線安裝');

  console.log('\n-- (17) T269 PWA Manifest 更新閉環 --');
  const manifestText269 = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
  const manifest269 = JSON.parse(manifestText269);
  const preManifestText269 = fs.readFileSync(
    path.join(__dirname, 'backups', 'manifest.pre-T269.json'), 'utf8');
  const preManifest269 = JSON.parse(preManifestText269);
  assert(crypto.createHash('sha256').update(preManifestText269).digest('hex').toUpperCase() ===
    '5D1FCF63592918A894222B3FCD79923311397ACD30ACC7328F3C770D168EF35A',
    'T269 manifest 回退備份 SHA-256 應維持開工記錄，不得與現行檔一起漂移');
  assert(manifest269.start_url === './index.html',
    'T269 manifest start_url 應硬鎖既有 ./index.html 身分入口');
  assert(manifest269.scope === './', 'T269 manifest scope 應顯式為可攜子目錄的 ./');
  assert(!Object.prototype.hasOwnProperty.call(manifest269, 'id'),
    'T269 可攜子目錄部署不得猜測 origin-root manifest id');
  for (const manifestUrl269 of [
    'https://example.test/glimmer-town/manifest.json',
    'https://example.test/games/glimmer-town/manifest.json'
  ]) {
    const scopeUrl269 = new URL(manifest269.scope, manifestUrl269);
    const startUrl269 = new URL(manifest269.start_url, manifestUrl269);
    const oldFallbackId269 = new URL(preManifest269.start_url, manifestUrl269);
    assert(scopeUrl269.pathname.endsWith('/glimmer-town/') &&
      startUrl269.href.startsWith(scopeUrl269.href),
    'T269 scope/start_url 在任意深度部署都應留在 manifest 所在應用目錄：' + manifestUrl269);
    assert(startUrl269.href === oldFallbackId269.href,
      'T269 缺省 identity 應維持改卡前 resolved start_url：' + manifestUrl269);
  }
  const { scope: addedScope269, icons: icons270, ...manifestRest269 } = manifest269;
  const { icons: preIcons269, ...preManifestRest269 } = preManifest269;
  assert(addedScope269 === './' && icons270.length >= preIcons269.length &&
    JSON.stringify(manifestRest269) === JSON.stringify(preManifestRest269),
    'T269 manifest 除 scope 與 T270 icon 陣列外，start_url／名稱／顯示／顏色應逐值不變');
  const preIndex269 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T269.html'));
  const postIndex269 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T270.html'));
  assert(postIndex269.equals(preIndex269),
    'T269 當卡 index.html 應與 pre-T269 備份位元組完全一致');

  const h269 = makeSwHarness268(sw268);
  for (const name of ['gv-v1', 'gv-v2', 'glimmerville-shell-v3', 'glimmerville-shell-v4',
    'gv-other-app', 'shared-cache']) h269.seed(name);
  await h269.fireLife('install');
  await h269.fireLife('activate');
  const keys269 = await h269.cacheStorage.keys();
  assert(h269.ops.opened[0] === 'glimmerville-shell-v14' &&
    JSON.stringify(h269.ops.addAll[0]) === JSON.stringify(shellFiles270),
    'T269/T270 v5 install 應維持完整 app-shell 資產閉包');
  assert(!keys269.includes('glimmerville-shell-v3') && !keys269.includes('glimmerville-shell-v4') &&
    keys269.includes('glimmerville-shell-v14') &&
    keys269.includes('gv-other-app') && keys269.includes('shared-cache'),
    'T270 activate 應刪專屬 v3/v4，並保留目前版與 foreign cache');

  const freshManifest269 = JSON.stringify({ ...manifest269, description: 'fresh-network-269' });
  h269.setFetch(async () => new Response(freshManifest269, {
    status: 201, headers: { 'Content-Type': 'application/manifest+json' }
  }));
  let result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?cb=269', mode: 'same-origin'
  });
  assert(result269.intercepted && result269.response.status === 201 &&
    await result269.response.text() === freshManifest269,
    'T269 在線 manifest query 應接受任意成功 2xx 並回傳 fresh network response');
  const cache269 = await h269.cacheStorage.open('glimmerville-shell-v14');
  let cachedManifest269 = await cache269.match(base268 + 'manifest.json');
  assert(cachedManifest269 && await cachedManifest269.text() === freshManifest269 &&
    h269.ops.puts.includes(base268 + 'manifest.json'),
    'T269 在線成功 manifest 應回寫 canonical manifest cache key');

  h269.setFetch(async () => { throw new TypeError('offline'); });
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?offline=269', mode: 'same-origin'
  });
  assert(await result269.response.text() === freshManifest269,
    'T269 fetch reject 時 manifest query 應回退 canonical manifest');

  h269.failPut(true);
  const quotaManifest269 = JSON.stringify({ ...manifest269, description: 'fresh-despite-quota-269' });
  h269.setFetch(async () => new Response(quotaManifest269, { status: 200 }));
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?quota=269', mode: 'same-origin'
  });
  assert(await result269.response.text() === quotaManifest269 && h269.ops.putFailures === 1,
    'T269 manifest cache.put 拒絕時仍須回傳成功 network response');
  h269.failPut(false);

  h269.failOpen(true);
  const openFailureManifest269 = JSON.stringify({ ...manifest269, description: 'fresh-despite-cache-open-269' });
  h269.setFetch(async () => new Response(openFailureManifest269, { status: 200 }));
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?openFailure=269', mode: 'same-origin'
  });
  assert(await result269.response.text() === openFailureManifest269 && h269.ops.openFailures === 1,
    'T269 Cache Storage open 拒絕時仍須回傳成功 network manifest');
  h269.setFetch(async () => { throw new TypeError('offline'); });
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?openFailureOffline=269', mode: 'same-origin'
  });
  const openFailureOfflineText269 = await result269.response.text();
  assert(result269.response.status === 503 &&
    JSON.parse(openFailureOfflineText269).error === 'offline-manifest-not-cached',
    'T269 離線且 Cache Storage open 拒絕時應回 valid JSON 503，不得裸 rejection');
  h269.failOpen(false);
  h269.failMatch(true);
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?matchFailureOffline=271', mode: 'same-origin'
  });
  const matchFailureOfflineText271 = await result269.response.text();
  assert(result269.response.status === 503 &&
    JSON.parse(matchFailureOfflineText271).error === 'offline-manifest-not-cached' &&
    h269.ops.matchFailures === 1,
    'T271 manifest 離線 cache.match 拒絕仍應維持 T269 valid JSON 503 語意');
  h269.failMatch(false);

  const manifestPutsBefore503269 = h269.ops.puts.length;
  h269.setFetch(async () => new Response('manifest-maintenance', { status: 503 }));
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?maintenance=269', mode: 'same-origin'
  });
  assert(result269.response.status === 503 && await result269.response.text() === 'manifest-maintenance' &&
    h269.ops.puts.length === manifestPutsBefore503269,
    'T269 manifest HTTP 503 應照實返回且不得污染 canonical cache');
  h269.setFetch(async () => { throw new TypeError('offline'); });
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?after503=269', mode: 'same-origin'
  });
  assert(await result269.response.text() === freshManifest269,
    'T269 HTTP 503 後再離線仍應得到先前成功快取的 manifest');

  await h269.cacheStorage.delete('glimmerville-shell-v14');
  result269 = await h269.fireFetch({
    method: 'GET', url: base268 + 'manifest.json?empty=269', mode: 'same-origin'
  });
  const missingManifestText269 = await result269.response.text();
  assert(result269.response.status === 503 &&
    result269.response.headers.get('Content-Type').includes('application/manifest+json') &&
    JSON.parse(missingManifestText269).error === 'offline-manifest-not-cached',
    'T269 manifest cache 缺失且離線時應回 valid JSON 503 說明');

  console.log('\n-- (18) T270 Android PWA 圖示資產 --');

  function crc32_270(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function paeth270(a, b, c) {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  function parsePng270(data, filename) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!data.subarray(0, 8).equals(signature)) throw new Error(filename + ' PNG signature invalid');
    let offset = 8, ihdr = null, sawIend = false, firstIdatOffset = -1;
    const idat = [];
    const chunks = [];
    while (offset + 12 <= data.length) {
      const chunkOffset = offset;
      const length = data.readUInt32BE(offset);
      if (offset + 12 + length > data.length)
        throw new Error(filename + ' truncated PNG chunk');
      const typeBytes = data.subarray(offset + 4, offset + 8);
      const type = typeBytes.toString('ascii');
      const payload = data.subarray(offset + 8, offset + 8 + length);
      const expectedCrc = data.readUInt32BE(offset + 8 + length);
      const actualCrc = crc32_270(Buffer.concat([typeBytes, payload]));
      if (actualCrc !== expectedCrc) throw new Error(filename + ' ' + type + ' CRC mismatch');
      if (type === 'IHDR') {
        if (chunks.length || length !== 13) throw new Error(filename + ' invalid IHDR position/length');
        ihdr = {
          width: payload.readUInt32BE(0),
          height: payload.readUInt32BE(4),
          bitDepth: payload[8],
          colorType: payload[9],
          compression: payload[10],
          filter: payload[11],
          interlace: payload[12]
        };
      } else if (type === 'IDAT') {
        if (firstIdatOffset < 0) firstIdatOffset = chunkOffset;
        idat.push(payload);
      } else if (type === 'tRNS') {
        throw new Error(filename + ' tRNS transparency is forbidden');
      } else if (type === 'IEND') {
        if (length !== 0) throw new Error(filename + ' invalid IEND length');
        sawIend = true;
      }
      chunks.push(type);
      offset += 12 + length;
      if (sawIend) break;
    }
    if (!ihdr || !idat.length || !sawIend) throw new Error(filename + ' missing IHDR/IDAT/IEND');
    if (offset !== data.length) throw new Error(filename + ' trailing bytes after IEND');
    if (ihdr.bitDepth !== 8 || ihdr.colorType !== 2 || ihdr.compression ||
      ihdr.filter || ihdr.interlace)
      throw new Error(filename + ' must be non-interlaced 8-bit RGB');

    const bytesPerPixel = 3, stride = ihdr.width * bytesPerPixel;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    if (raw.length !== (stride + 1) * ihdr.height)
      throw new Error(filename + ' inflated byte length mismatch');
    const pixels = Buffer.alloc(stride * ihdr.height);
    let source = 0;
    for (let y = 0; y < ihdr.height; y++) {
      const filterType = raw[source++];
      if (filterType > 4) throw new Error(filename + ' invalid PNG filter ' + filterType);
      for (let x = 0; x < stride; x++) {
        const destination = y * stride + x;
        const left = x >= bytesPerPixel ? pixels[destination - bytesPerPixel] : 0;
        const up = y ? pixels[destination - stride] : 0;
        const upLeft = y && x >= bytesPerPixel ? pixels[destination - stride - bytesPerPixel] : 0;
        let predictor = 0;
        if (filterType === 1) predictor = left;
        else if (filterType === 2) predictor = up;
        else if (filterType === 3) predictor = Math.floor((left + up) / 2);
        else if (filterType === 4) predictor = paeth270(left, up, upLeft);
        pixels[destination] = (raw[source++] + predictor) & 255;
      }
    }
    return { ...ihdr, pixels, data, chunks, firstIdatOffset };
  }

  function readPng270(filename) {
    return parsePng270(fs.readFileSync(path.join(__dirname, filename)), filename);
  }

  function pngChunk270(type, payload) {
    const typeBytes = Buffer.from(type, 'ascii');
    const chunk = Buffer.alloc(12 + payload.length);
    chunk.writeUInt32BE(payload.length, 0);
    typeBytes.copy(chunk, 4);
    payload.copy(chunk, 8);
    chunk.writeUInt32BE(crc32_270(Buffer.concat([typeBytes, payload])), 8 + payload.length);
    return chunk;
  }

  const expectedIcons270 = [
    ['icon-v1-192.png', '192x192', 'image/png', 'any'],
    ['icon-v1-512.png', '512x512', 'image/png', 'any'],
    ['icon-v1-maskable-512.png', '512x512', 'image/png', 'maskable'],
    ['icon.svg', 'any', 'image/svg+xml', 'any']
  ];
  assert(JSON.stringify(manifest269.icons.map(icon =>
    [icon.src, icon.sizes, icon.type, icon.purpose])) === JSON.stringify(expectedIcons270),
  'T270 manifest 應精確列出 192/512 any、獨立 512 maskable 與 SVG any');
  assert(manifest269.icons.every(icon => icon.purpose === 'any' || icon.purpose === 'maskable') &&
    manifest269.icons.filter(icon => icon.purpose === 'maskable').length === 1,
  'T270 不得再讓同一圖示合併宣告 any maskable');
  assert(manifest269.icons.filter(icon => icon.type === 'image/png').every(icon =>
    /^icon-v\d+-(?:192|512|maskable-512)\.png$/.test(icon.src) &&
      !/[?#]/.test(icon.src)),
  'T270 PNG icon URL 應為無 query 的版本化實體檔名');

  const manifestUrl270 = new URL('https://example.test/games/glimmer-town/manifest.json');
  const scopeUrl270 = new URL(manifest269.scope, manifestUrl270);
  assert(manifest269.icons.every(icon => {
    const resolved = new URL(icon.src, manifestUrl270);
    return resolved.origin === manifestUrl270.origin && resolved.href.startsWith(scopeUrl270.href) &&
      fs.existsSync(path.join(__dirname, icon.src));
  }), 'T270 manifest 每個 icon 都應為 scope 內存在的同源本地資產');

  const pngFiles270 = expectedIcons270.filter(icon => icon[2] === 'image/png');
  const pngInfo270 = new Map(pngFiles270.map(([filename]) => [filename, readPng270(filename)]));
  for (const [filename, declared] of pngFiles270) {
    const info = pngInfo270.get(filename);
    const [declaredWidth, declaredHeight] = declared.split('x').map(Number);
    assert(info.width === declaredWidth && info.height === declaredHeight &&
      info.width === info.height && info.bitDepth === 8 && info.colorType === 2 &&
      !info.chunks.includes('tRNS'),
    `T270 ${filename} 的真 IHDR 應等於 ${declared}／8-bit RGB 且無 tRNS 透明`);
  }

  const parserBase270 = pngInfo270.get('icon-v1-192.png');
  const trnsChunk270 = pngChunk270('tRNS', Buffer.from([0, 13, 0, 18, 0, 38]));
  const trnsMutant270 = Buffer.concat([
    parserBase270.data.subarray(0, parserBase270.firstIdatOffset),
    trnsChunk270,
    parserBase270.data.subarray(parserBase270.firstIdatOffset)
  ]);
  let rejectsTrns270 = false, rejectsTrailing270 = false;
  try { parsePng270(trnsMutant270, 'tRNS-mutant'); }
  catch (err) { rejectsTrns270 = /\btRNS\b/.test(String(err && err.message)); }
  try { parsePng270(Buffer.concat([parserBase270.data, Buffer.from([0])]), 'trailing-mutant'); }
  catch (err) { rejectsTrailing270 = /trailing bytes/.test(String(err && err.message)); }
  assert(rejectsTrns270 && rejectsTrailing270,
    'T270 PNG parser 應實際攔截合法 tRNS 透明與 IEND 後尾隨資料');

  const svg270 = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
  const palette270 = new Set(Array.from(svg270.matchAll(/fill="(#[0-9a-f]{6})"/gi),
    match => match[1].toLowerCase()));
  const background270 = [0x0d, 0x12, 0x26];
  for (const [filename, info] of pngInfo270) {
    const colors = new Set();
    for (let offset270 = 0; offset270 < info.pixels.length; offset270 += 3)
      colors.add('#' + info.pixels.subarray(offset270, offset270 + 3).toString('hex'));
    assert(colors.size === palette270.size && Array.from(colors).every(color => palette270.has(color)),
      `T270 ${filename} 不得產生 SVG 調色盤外的抗鋸齒／插值色`);
  }

  const mask270 = pngInfo270.get('icon-v1-maskable-512.png');
  let foreground270 = 0, escaped270 = 0;
  const center270 = mask270.width / 2, radius270 = mask270.width * 0.4;
  for (let y270 = 0; y270 < mask270.height; y270++) for (let x270 = 0; x270 < mask270.width; x270++) {
    const pixelOffset270 = (y270 * mask270.width + x270) * 3;
    if (mask270.pixels[pixelOffset270] === background270[0] &&
      mask270.pixels[pixelOffset270 + 1] === background270[1] &&
      mask270.pixels[pixelOffset270 + 2] === background270[2]) continue;
    foreground270++;
    const dx270 = x270 + 0.5 - center270, dy270 = y270 + 0.5 - center270;
    if (dx270 * dx270 + dy270 * dy270 > radius270 * radius270) escaped270++;
  }
  assert(foreground270 > 0 && escaped270 === 0,
    `T270 maskable 非背景前景應全在中心40%安全圈，foreground=${foreground270} escaped=${escaped270}`);

  const expectedHashes270 = {
    'icon-v1-192.png': 'A7252477296CC7704BD3D485C8A3A25BCFB6C36BCB5DF2B0DCA666BAB4537951',
    'icon-v1-512.png': '42D58A67CC90BAC9F965DBE8497AA5913AA5907623D2F278C2BA6CCC45566D4D',
    'icon-v1-maskable-512.png': '56FFC2B39731BACF19E121770FDCE612C0CC915BB663C1A781D6E1E213005950'
  };
  assert(Object.entries(expectedHashes270).every(([filename, expected]) =>
    crypto.createHash('sha256').update(pngInfo270.get(filename).data).digest('hex').toUpperCase() === expected),
  'T270 三張 PNG SHA-256 應與可重現生成記錄一致；改圖時須換 icon 版本化檔名');

  const manifestIconFiles270 = manifest269.icons.map(icon => './' + icon.src);
  const expectedClosure270 = Array.from(new Set([
    './index.html', './manifest.json', './icon.svg', ...manifestIconFiles270
  ])).sort();
  assert(JSON.stringify(Array.from(new Set(h269.ops.addAll[0])).sort()) === JSON.stringify(expectedClosure270),
    'T270 Service Worker install FILES 應閉包 index／manifest／favicon 與全部 manifest icon');

  const preIcon270 = fs.readFileSync(path.join(__dirname, 'backups', 'icon.pre-T270.svg'));
  const preIndex270 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T270.html'));
  const postIndex270 = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T271.html'));
  assert(Buffer.from(svg270).equals(preIcon270), 'T270 icon.svg 母版應與 pre-T270 備份位元組完全一致');
  assert(postIndex270.equals(preIndex270),
    'T270 當卡 index.html 應與 pre-T270 備份位元組完全一致');

  const generator270 = fs.readFileSync(path.join(__dirname, 'generate_pwa_icons.py'), 'utf8');
  assert(Object.keys(expectedHashes270).every(filename => generator270.includes(filename)) &&
    generator270.includes('Image.new("RGB"') && generator270.includes('foreground_scale=Fraction(3, 2)'),
  'T270 生成器應固定輸出三個版本化 RGB 資產，maskable 前景縮至75%');
  const pngStateBefore270 = Object.keys(expectedHashes270).map(filename => {
    const fullPath = path.join(__dirname, filename);
    const stat = fs.statSync(fullPath);
    return [filename, crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex'),
      stat.size, stat.mtimeMs];
  });
  function runGeneratorCheck270() {
    const candidates = [];
    if (process.platform === 'win32') candidates.push(['py', ['-3']]);
    if (process.env.PYTHON) candidates.push([process.env.PYTHON, []]);
    candidates.push(process.platform === 'win32' ? ['python', []] : ['python3', []]);
    candidates.push(['python3', []], ['python', []]);
    const seen = new Set();
    let firstFailure = null;
    for (const [executable, prefixArgs] of candidates) {
      const candidateKey = executable + '\0' + prefixArgs.join('\0');
      if (seen.has(candidateKey)) continue;
      seen.add(candidateKey);
      const result = childProcess.spawnSync(
        executable, [...prefixArgs, '-B', 'generate_pwa_icons.py', '--check'],
        { cwd: __dirname, encoding: 'utf8', windowsHide: true }
      );
      if (result.error && result.error.code === 'ENOENT') continue;
      if (result.status === 0) return result;
      if (!firstFailure) firstFailure = result;
    }
    return firstFailure || { status: -1, stdout: '', stderr: 'Python interpreter not found' };
  }
  const generatorChecks270 = [runGeneratorCheck270(), runGeneratorCheck270()];
  const pngStateAfter270 = Object.keys(expectedHashes270).map(filename => {
    const fullPath = path.join(__dirname, filename);
    const stat = fs.statSync(fullPath);
    return [filename, crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex'),
      stat.size, stat.mtimeMs];
  });
  assert(generatorChecks270.every(result =>
    result.status === 0 && Object.keys(expectedHashes270).every(filename =>
      result.stdout.includes(filename) && result.stdout.includes(expectedHashes270[filename]))) &&
    JSON.stringify(pngStateAfter270) === JSON.stringify(pngStateBefore270),
  'T270 生成器 --check 應連跑兩次逐 bytes 重建成功，且不寫入／改時戳');

  console.log('\n-- (19) T271 PWA 快取讀取故障降級 --');

  const h271Hit = makeSwHarness268(sw268);
  await h271Hit.fireLife('install');
  h271Hit.setFetch(async () => { throw new Error('cache hit must not use network'); });
  let networkBefore271 = h271Hit.ops.networkCalls;
  let result271 = await h271Hit.fireFetch({
    method: 'GET', url: base268 + 'icon-v1-512.png?hit=271', mode: 'same-origin'
  });
  assert(await result271.response.text() === 'cached:./icon-v1-512.png' &&
    h271Hit.ops.networkCalls === networkBefore271,
  'T271 app-shell cache 命中應直接回 cached response，network calls 維持0增量');

  const h271Miss = makeSwHarness268(sw268);
  await h271Miss.fireLife('install');
  await h271Miss.cacheStorage.delete('glimmerville-shell-v14');
  h271Miss.setFetch(async () => new Response('fresh-cache-miss-271', { status: 200 }));
  networkBefore271 = h271Miss.ops.networkCalls;
  result271 = await h271Miss.fireFetch({
    method: 'GET', url: base268 + 'icon-v1-192.png?miss=271', mode: 'same-origin'
  });
  assert(await result271.response.text() === 'fresh-cache-miss-271' &&
    h271Miss.ops.networkCalls === networkBefore271 + 1,
  'T271 app-shell cache miss 應只回退一次真 network fetch');

  const h271Open = makeSwHarness268(sw268);
  await h271Open.fireLife('install');
  h271Open.failOpen(true);
  h271Open.setFetch(async () => new Response('fresh-open-failure-271', { status: 200 }));
  networkBefore271 = h271Open.ops.networkCalls;
  result271 = await h271Open.fireFetch({
    method: 'GET', url: base268 + 'icon-v1-maskable-512.png?open=271', mode: 'same-origin'
  });
  assert(await result271.response.text() === 'fresh-open-failure-271' &&
    h271Open.ops.openFailures === 1 && h271Open.ops.networkCalls === networkBefore271 + 1,
  'T271 app-shell caches.open 拒絕時仍應只呼叫一次 network 並回成功 response');

  const h271Match = makeSwHarness268(sw268);
  await h271Match.fireLife('install');
  h271Match.failMatch(true);
  h271Match.setFetch(async () => new Response('fresh-match-failure-271', { status: 200 }));
  networkBefore271 = h271Match.ops.networkCalls;
  result271 = await h271Match.fireFetch({
    method: 'GET', url: base268 + 'icon.svg?match=271', mode: 'same-origin'
  });
  assert(await result271.response.text() === 'fresh-match-failure-271' &&
    h271Match.ops.matchFailures === 1 && h271Match.ops.networkCalls === networkBefore271 + 1,
  'T271 app-shell cache.match 拒絕時仍應只呼叫一次 network 並回成功 response');

  const h271Both = makeSwHarness268(sw268);
  await h271Both.fireLife('install');
  h271Both.failOpen(true);
  h271Both.setFetch(async () => { throw new TypeError('network-offline-271'); });
  let staticReject271 = '';
  try {
    await h271Both.fireFetch({
      method: 'GET', url: base268 + 'icon-v1-192.png?both=271', mode: 'same-origin'
    });
  } catch (err) {
    staticReject271 = String(err && err.message);
  }
  assert(staticReject271 === 'network-offline-271' && h271Both.ops.networkCalls === 1,
    'T271 靜態 cache 與 network 同時失敗時應保留真 fetch rejection，不偽造文字圖片');

  const h271NavOpen = makeSwHarness268(sw268);
  await h271NavOpen.fireLife('install');
  h271NavOpen.failOpen(true);
  h271NavOpen.setFetch(async () => { throw new TypeError('offline'); });
  result271 = await h271NavOpen.fireFetch({
    method: 'GET', url: base268 + 'index.html?navOpen=271', mode: 'navigate'
  });
  assert(result271.response.status === 503 &&
    (await result271.response.text()).includes('尚未完成首次快取') &&
    result271.response.headers.get('Content-Type').includes('text/plain'),
  'T271 離線導航遇 caches.open 拒絕應回既定文字 503，不得裸 rejection');

  const h271NavMatch = makeSwHarness268(sw268);
  await h271NavMatch.fireLife('install');
  h271NavMatch.failMatch(true);
  h271NavMatch.setFetch(async () => { throw new TypeError('offline'); });
  result271 = await h271NavMatch.fireFetch({
    method: 'GET', url: base268 + 'index.html?navMatch=271', mode: 'navigate'
  });
  assert(result271.response.status === 503 &&
    (await result271.response.text()).includes('尚未完成首次快取') &&
    h271NavMatch.ops.matchFailures === 1,
  'T271 離線導航遇 cache.match 拒絕應回既定文字 503，不得裸 rejection');

  const h271NavOnline = makeSwHarness268(sw268);
  await h271NavOnline.fireLife('install');
  h271NavOnline.failOpen(true);
  h271NavOnline.setFetch(async () => new Response('fresh-nav-cache-failure-271', { status: 200 }));
  networkBefore271 = h271NavOnline.ops.networkCalls;
  result271 = await h271NavOnline.fireFetch({
    method: 'GET', url: base268 + 'index.html?navOnline=271', mode: 'navigate'
  });
  assert(await result271.response.text() === 'fresh-nav-cache-failure-271' &&
    h271NavOnline.ops.networkCalls === networkBefore271 + 1 && h271NavOnline.ops.openFailures === 1,
  'T271 在線導航遇 canonical cache open 拒絕仍應回 network 200');

  const shellTailMarker271 = '  if(!SHELL_PATHS.has(url.pathname))return;\n';
  const shellTailAt271 = sw268.indexOf(shellTailMarker271);
  assert(shellTailAt271 >= 0, 'T271 mutant 前置應能精確定位靜態 app-shell 分支');
  const oldStaticBranch271 =
    "  e.respondWith(\n" +
    "    caches.open(CACHE).then(cache=>cache.match(url.href,{ignoreSearch:true})).then(hit=>hit||fetch(req))\n" +
    "  );\n});\n";
  const mutant271 = sw268.slice(0, shellTailAt271 + shellTailMarker271.length) + oldStaticBranch271;
  const h271Mutant = makeSwHarness268(mutant271);
  await h271Mutant.fireLife('install');
  h271Mutant.failOpen(true);
  h271Mutant.setFetch(async () => new Response('mutant-network-should-be-reached', { status: 200 }));
  let mutantReject271 = '';
  try {
    await h271Mutant.fireFetch({
      method: 'GET', url: base268 + 'icon-v1-512.png?mutant=271', mode: 'same-origin'
    });
  } catch (err) {
    mutantReject271 = String(err && err.message);
  }
  assert(mutantReject271 === 'cache storage unavailable' && h271Mutant.ops.networkCalls === 0,
    'T271 修改前 promise-chain mutant 應被故障注入證明會攔死可用 network');

  console.log('\n-- (20) T272 Sprite 紋理確定化 --');

  const pre272Html = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T272.html'), 'utf8');
  const post272Html = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T273.html'), 'utf8');
  assert(
    crypto.createHash('sha256').update(pre272Html).digest('hex').toUpperCase() ===
      '3CCEEADC10563DEDF35EADFFB86D240D19719D20911EEE26F79143387A7D5097',
    'T272 pre-index 備份 SHA-256 應維持開工記錄，不得隨 current 漂移'
  );
  assert(
    crypto.createHash('sha256').update(post272Html).digest('hex').toUpperCase() ===
      '3C1E1A900457AA1365CB88B80907A9DF8CA9FC6A4F315667D1CB049C43BFD6F6',
    'T272 完成邊界應由 pre-T273（post-T272）SHA-256 封存'
  );
  const functionSlice272 = (source, name) => {
    const start = source.indexOf('function ' + name + '(');
    assert(start >= 0, `T272 應可定位正式 ${name}()`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    for (let at = bodyStart; at < source.length; at++) {
      if (source[at] === '{') depth++;
      else if (source[at] === '}' && --depth === 0) return source.slice(start, at + 1);
    }
    throw new Error(`T272 無法完整抽取 ${name}()`);
  };
  const textureInitPattern272 =
    /const SPRITE_TEX_SEED=0x54455832;\s*let spriteTexRand=mulberry32\(SPRITE_TEX_SEED\);\s*function resetSpriteTexRand\(\)\{[^}]*\}/;
  const textureInitMatch272 = js.match(textureInitPattern272);
  assert(textureInitMatch272,
    'T272 應可抽取正式 seed/state/reset 鏈，且 seed 必須維持 0x54455832');
  const buildStart272 = js.indexOf('function buildSprites(){');
  const buildEnd272 = js.indexOf('\nfunction wealthSpr(', buildStart272);
  assert(buildStart272 >= 0 && buildEnd272 > buildStart272,
    'T272 應可界定完整 buildSprites() 區段');
  const buildSource272 = js.slice(buildStart272, buildEnd272);

  const makeRand272 = seed => {
    let a = seed | 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const plateFingerprint272 = (source, ambientSeed) => {
    const trace = [];
    const sandbox = {
      ambientRandom272: makeRand272(ambientSeed),
      g: {},
      dia(_g, ...args) { trace.push(['dia', ...args]); },
      diaEdge(_g, ...args) { trace.push(['edge', ...args]); },
      shade(col, amount) { return `${col}:${amount}`; },
      speck(_g, cx, ty, hw, cols, count, rand) {
        const samples = [];
        for (let n = 0; n < count * 3; n++) samples.push(rand());
        trace.push(['speck', cx, ty, hw, cols, count, samples]);
      }
    };
    const formalMulberry272 = functionSlice272(source, 'mulberry32');
    const formalPlate272 = functionSlice272(source, 'plate');
    const formalTextureInit272 = source.match(textureInitPattern272);
    assert(formalTextureInit272,
      'T272 fresh VM 應執行正式 seed/state/reset 鏈，不得由 sandbox 注入替身');
    vm.runInNewContext(
      'Math.random=ambientRandom272;\n' + formalMulberry272 + '\n' +
      formalTextureInit272[0] + '\n' + formalPlate272 +
      "\nresetSpriteTexRand();plate(g,36,110,'#9a9484');", sandbox
    );
    return crypto.createHash('sha256').update(JSON.stringify(trace)).digest('hex');
  };
  const plateA272 = plateFingerprint272(js, 0x11111111);
  const plateB272 = plateFingerprint272(js, 0x77777777);
  assert(plateA272 === plateB272,
    'T272 正式 seed→reset→plate 鏈在兩個不同 ambient Math.random 的 fresh VM 中應產生相同 fingerprint');

  const resetMutant272 = js.replace(
    'function resetSpriteTexRand(){spriteTexRand=mulberry32(SPRITE_TEX_SEED);}',
    'function resetSpriteTexRand(){spriteTexRand=()=>Math.random();}'
  );
  assert(resetMutant272 !== js,
    'T272 reset 負向 mutant 應能精確替換正式重設函式');
  assert(
    plateFingerprint272(resetMutant272, 0x11111111) !==
      plateFingerprint272(resetMutant272, 0x77777777),
    'T272 reset 若退回 ambient Math.random，fresh VM 行為測試必須殺死 mutant'
  );

  const ambientSites272 = source => {
    const textureInit = source.match(textureInitPattern272);
    const platePart = functionSlice272(source, 'plate');
    const buildStart = source.indexOf('function buildSprites(){');
    const buildEnd = source.indexOf('\nfunction wealthSpr(', buildStart);
    return ((textureInit ? textureInit[0] : '') + '\n' + platePart + '\n' +
      source.slice(buildStart, buildEnd))
      .match(/Math\.random\s*\(/g) || [];
  };
  assert(ambientSites272(js).length === 0,
    'T272 seed/reset/plate/buildSprites 載入期 ambient Math.random 來源應由9歸零');
  assert(/function buildSprites\(\)\{\s*resetSpriteTexRand\(\);/.test(buildSource272),
    'T272 每次 buildSprites() 起手必須重設專屬紋理 PRNG');

  const textureSpeckLines272 = source => source.split(/\r?\n/)
    .filter(line => line.includes('speck(') &&
      (line.includes('Math.random') || line.includes('spriteTexRand')))
    .map(line => line.trim()
      .replace(/\(\)=>Math\.random\(\)|spriteTexRand/g, '<TEXTURE_RNG>'));
  const preTextureLines272 = textureSpeckLines272(pre272Html);
  const postTextureLines272 = textureSpeckLines272(post272Html);
  assert(preTextureLines272.length === 9 &&
    JSON.stringify(postTextureLines272) === JSON.stringify(preTextureLines272),
  'T272 9 個 speck 的顏色／數量／座標／尺寸應逐行不變，只可替換亂數來源');

  const rngLines272 = source => source.split(/\r?\n/)
    .filter(line => /\b(?:R|ri)\s*\(/.test(line));
  const sharedSpriteRandLines272 = source => source.split(/\r?\n/)
    .filter(line => /\brand\s*\(/.test(line));
  assert(JSON.stringify(rngLines272(post272Html)) === JSON.stringify(rngLines272(pre272Html)),
    'T272 相對備份的 R()/ri() 呼叫行應逐行零差異');
  assert(JSON.stringify(sharedSpriteRandLines272(post272Html)) ===
    JSON.stringify(sharedSpriteRandLines272(pre272Html)),
  'T272 相對備份的既有共用 rand() 消耗行應逐行零差異');

  const textureHeader272 =
    '// T272：載入期紋理使用隔離的固定種子流；每次重建 sprite 都從同一狀態開始。\n' +
    'const SPRITE_TEX_SEED=0x54455832;\n' +
    'let spriteTexRand=mulberry32(SPRITE_TEX_SEED);\n' +
    'function resetSpriteTexRand(){spriteTexRand=mulberry32(SPRITE_TEX_SEED);}\n';
  assert(post272Html.split(textureHeader272).length === 2,
    'T272 專屬 seed/state/reset 宣告應精確出現一次');
  let restoredHtml272 = post272Html.replace(textureHeader272, '');
  const buildResetMarker272 = 'function buildSprites(){\n  resetSpriteTexRand();';
  assert(restoredHtml272.split(buildResetMarker272).length === 2,
    'T272 buildSprites 起手 reset 差異應精確出現一次');
  restoredHtml272 = restoredHtml272.replace(
    buildResetMarker272, 'function buildSprites(){'
  );
  let restoredTextureSites272 = 0;
  restoredHtml272 = restoredHtml272.replace(
    /,spriteTexRand\)/g,
    () => { restoredTextureSites272++; return ',()=>Math.random())'; }
  );
  assert(restoredTextureSites272 === 9,
    'T272 精確反向正規化時應只還原9個紋理 RNG 接點');
  assert(restoredHtml272 === pre272Html,
    'T272 post-T272 邊界反向移除允許差異後，必須逐 byte 等於 pre-T272');

  const textureSiteMatches272 = Array.from(
    html.matchAll(/speck\([^\r\n]*\bspriteTexRand\b[^\r\n]*\)/g)
  );
  assert(textureSiteMatches272.length === 9,
    'T272 應精確有9個 speck 改接專屬 spriteTexRand');
  for (const site of textureSiteMatches272) {
    const replacement = site[0].replace(/\bspriteTexRand\b/, '()=>Math.random()');
    const mutant = html.slice(0, site.index) + replacement +
      html.slice(site.index + site[0].length);
    assert(ambientSites272(mutant).length === 1,
      'T272 任一紋理來源退回 ambient Math.random 的 mutant 都必須被攔截');
  }

  console.log('\n-- (21) T273 牧場變體擴充 3→5 --');

  const pre273Html = post272Html;
  const post273Html = fs.readFileSync(
    path.join(__dirname, 'backups', 'index.pre-T274.html'), 'utf8');
  assert(
    crypto.createHash('sha256').update(pre273Html).digest('hex').toUpperCase() ===
      '3C1E1A900457AA1365CB88B80907A9DF8CA9FC6A4F315667D1CB049C43BFD6F6',
    'T273 pre-index 備份 SHA-256 應維持開工記錄'
  );
  assert(
    crypto.createHash('sha256').update(post273Html).digest('hex').toUpperCase() ===
      '2CEA035171C0B3B5220A0FFD681C6758BE9F9DF43E897B6AB039FA5C0BCC0C22',
    'T273 完成邊界應由 pre-T274（post-T273）SHA-256 封存'
  );
  const ranchOldLine273 =
    "        ct.bld=(dx===0&&dy===0)?{k:23,lv:1,v:(x*7+y*5)%3,age:0,pw:true,h:1,sz:2}:{k:23,ref:[x,y]}; // T230：牧場 3 變體（牛/羊/馬場），座標決定性選型（零 R）";
  const ranchNewLine273 =
    "        ct.bld=(dx===0&&dy===0)?{k:23,lv:1,v:(x*7+y*5)%5,age:0,pw:true,h:1,sz:2}:{k:23,ref:[x,y]}; // T273：牧場 5 變體（牛/羊/馬/豬/家禽），座標決定性選型（零 R）";
  const ranchStart273 =
    '  /* ===== T273 牧場變體擴充 START（buildSprites 絕對尾端；豬場／家禽場，零模擬亂數） ===== */';
  const ranchEnd273 = '  /* ===== T273 牧場變體擴充 END ===== */';
  const ranchAudit273 = source => {
    const errors = [];
    const start = source.indexOf(ranchStart273);
    const end = source.indexOf(ranchEnd273);
    if (source.split(ranchNewLine273).length !== 2) errors.push('modulo-line');
    if (source.split(ranchStart273).length !== 2 ||
        source.split(ranchEnd273).length !== 2 || start < 0 || end <= start) {
      errors.push('markers');
      return errors;
    }
    const block = source.slice(start, end + ranchEnd273.length);
    const k62 = source.indexOf("SPR.bld['62_1_0']");
    const mask = source.indexOf('/* ===== T261 夜燈通用遮罩', k62);
    if (!(k62 >= 0 && start > k62 && mask > start)) errors.push('tail-order');
    for (const v of [3, 4]) {
      const key = `SPR.bld['23_1_${v}']={img:c,ax,ay,w:136,h:150,smoke:[]};`;
      if (block.split(key).length !== 2) errors.push('key-' + v);
    }
    const assignedKeys = Array.from(
      block.matchAll(/SPR\.bld\['([^']+)'\]\s*=/g), m => m[1]
    );
    if (JSON.stringify(assignedKeys) !==
        JSON.stringify(['23_1_3', '23_1_4'])) errors.push('assignment-whitelist');
    if ((block.match(/\bplate\s*\(/g) || []).length !== 2) errors.push('plate-count');
    if (/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(|\bspriteTexRand\b/.test(block)) {
      errors.push('forbidden-rng');
    }
    return errors;
  };
  assert(ranchAudit273(html).length === 0,
    'T273 正式碼應精確為尾端兩張牧場 sprite＋%5 選型，且不得新增主／ambient 亂數');

  const ranchStartAt273 = html.indexOf(ranchStart273);
  const ranchEndAt273 = html.indexOf(ranchEnd273, ranchStartAt273);
  const ranchBlockEnd273 = ranchEndAt273 + ranchEnd273.length;
  const ranchBlockSource273 = html.slice(ranchStartAt273, ranchBlockEnd273);
  const traceRanchBlock273 = source => {
    const sandbox = {
      SPR: { bld: {} },
      cv(w, h) {
        const ops = [];
        const canvas = { width: w, height: h, __ops: ops };
        let fillStyle = '';
        const ctx = {
          __ops: ops,
          fillRect(...args) { ops.push(['fillRect', fillStyle, ...args]); }
        };
        Object.defineProperty(ctx, 'fillStyle', {
          get() { return fillStyle; },
          set(value) { fillStyle = String(value); }
        });
        return [canvas, ctx];
      },
      plate(g, ...args) { g.__ops.push(['plate', ...args]); }
    };
    vm.runInNewContext(source, sandbox);
    const out = {};
    for (const key of Object.keys(sandbox.SPR.bld)) {
      const spr = sandbox.SPR.bld[key];
      out[key] = {
        w: spr.w, h: spr.h, ax: spr.ax, ay: spr.ay,
        ops: spr.img.__ops,
        hash: crypto.createHash('sha256')
          .update(JSON.stringify(spr.img.__ops)).digest('hex')
      };
    }
    return out;
  };
  const ranchTraceErrors273 = trace => {
    const errors = [];
    const keys = Object.keys(trace);
    if (JSON.stringify(keys) !== JSON.stringify(['23_1_3', '23_1_4'])) {
      errors.push('trace-keys');
      return errors;
    }
    for (const key of keys) {
      const spr = trace[key];
      if (spr.w !== 136 || spr.h !== 150 || spr.ax !== 68 || spr.ay !== 148) {
        errors.push(key + '-geometry');
      }
      if (spr.ops.length < 30) errors.push(key + '-too-simple');
    }
    if (trace['23_1_3'].hash === trace['23_1_4'].hash) {
      errors.push('indistinguishable');
    }
    return errors;
  };
  const ranchTrace273 = traceRanchBlock273(ranchBlockSource273);
  assert(ranchTraceErrors273(ranchTrace273).length === 0,
    'T273 v3/v4 應有足量繪圖操作、固定136×150/68,148 幾何且 fingerprint 互異');
  const ranchBoundaryStart273 = post273Html.indexOf(ranchStart273);
  const ranchBoundaryEndMarker273 = post273Html.indexOf(ranchEnd273, ranchBoundaryStart273);
  const ranchBoundaryEnd273 = ranchBoundaryEndMarker273 + ranchEnd273.length;
  assert(ranchBoundaryStart273 >= 0 && ranchBoundaryEndMarker273 > ranchBoundaryStart273,
    'T273 post-T273 完成邊界應保留唯一正式 marker 區塊');
  assert(post273Html.slice(ranchBoundaryEnd273, ranchBoundaryEnd273 + 1) === '\n',
    'T273 尾端 sprite 區塊後應有單一 LF，供 exact rollback');
  let restoredHtml273 = post273Html.slice(0, ranchBoundaryStart273) +
    post273Html.slice(ranchBoundaryEnd273 + 1);
  assert(restoredHtml273.split(ranchNewLine273).length === 2,
    'T273 exact rollback 應精確定位唯一牧場 %5 行');
  restoredHtml273 = restoredHtml273.replace(ranchNewLine273, ranchOldLine273);
  assert(restoredHtml273 === pre273Html,
    'T273 反向移除兩張新 sprite 並還原牧場單行後，必須逐 byte 等於 pre-T273');
  assert(JSON.stringify(rngLines272(post273Html)) === JSON.stringify(rngLines272(pre273Html)),
    'T273 相對 pre-T273 的 R()/ri() 呼叫行應逐行零差異');
  assert(JSON.stringify(sharedSpriteRandLines272(post273Html)) ===
    JSON.stringify(sharedSpriteRandLines272(pre273Html)),
  'T273 相對 pre-T273 的既有共用 rand() 呼叫行應逐行零差異');

  const moduloMutant273 = html.replace(ranchNewLine273, ranchOldLine273);
  assert(moduloMutant273 !== html && ranchAudit273(moduloMutant273).length > 0,
    'T273 %5 若退回 %3，source audit 必須殺死 mutant');
  for (const v of [3, 4]) {
    const assignment =
      `SPR.bld['23_1_${v}']={img:c,ax,ay,w:136,h:150,smoke:[]};`;
    const missingKeyMutant = html.replace(assignment, '');
    assert(missingKeyMutant !== html && ranchAudit273(missingKeyMutant).length > 0,
      `T273 若遺失牧場 v${v} sprite 鍵，source audit 必須殺死 mutant`);
  }
  const flatPlateMutant273 = ranchStart273 + '\n' +
    "  {const[c,g]=cv(136,150);const ax=68,ay=148;plate(g,ax,ay,'#7a9a4a');" +
    "SPR.bld['23_1_3']={img:c,ax,ay,w:136,h:150,smoke:[]};}\n" +
    "  {const[c,g]=cv(136,150);const ax=68,ay=148;plate(g,ax,ay,'#7a9a4a');" +
    "SPR.bld['23_1_4']={img:c,ax,ay,w:136,h:150,smoke:[]};}\n" +
    ranchEnd273;
  assert(ranchTraceErrors273(traceRanchBlock273(flatPlateMutant273)).length > 0,
    'T273 v3/v4 若退化成兩張相同空底板，繪圖 trace 必須殺死 mutant');
  const ranchBlockWithLf273 = html.slice(ranchStartAt273, ranchBlockEnd273 + 1);
  const withoutRanchBlock273 = html.slice(0, ranchStartAt273) +
    html.slice(ranchBlockEnd273 + 1);
  const k62At273 = withoutRanchBlock273.indexOf("SPR.bld['62_1_0']");
  const movedEarlyMutant273 = withoutRanchBlock273.slice(0, k62At273) +
    ranchBlockWithLf273 + withoutRanchBlock273.slice(k62At273);
  assert(ranchAudit273(movedEarlyMutant273).includes('tail-order'),
    'T273 新 sprite 若被移到 k62 之前，尾端順序 audit 必須殺死 mutant');

  window.GV.newWorldSeeded(273);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(5000000);
  const ranchRoots273 = [];
  for (let wanted = 0; wanted < 5; wanted++) {
    let spot = null;
    for (let y = 2; y < window.GV.N() - 3 && !spot; y++) {
      for (let x = 2; x < window.GV.N() - 3; x++) {
        if ((x * 7 + y * 5) % 5 === wanted &&
            window.GV.canPlaceTool('ranch', x, y) === null) {
          spot = { x, y }; break;
        }
      }
    }
    assert(spot, `T273 應找到 residue ${wanted} 的合法 2×2 牧場位置`);
    assert(place('ranch', spot.x, spot.y),
      `T273 residue ${wanted} 牧場應真實建造成功`);
    const root = tile(spot.x, spot.y).bld;
    assert(root && root.k === 23 && root.v === wanted && root.lv === 1 &&
      root.sz === 2,
    `T273 residue ${wanted} root 應精確為 k23/v${wanted}/lv1/sz2`);
    let refs = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      if (!dx && !dy) continue;
      const ref = tile(spot.x + dx, spot.y + dy).bld;
      if (ref && ref.k === 23 && ref.ref &&
          ref.ref[0] === spot.x && ref.ref[1] === spot.y) refs++;
    }
    assert(refs === 3,
      `T273 residue ${wanted} 應建立精確3個 ref 格，實際 ${refs}`);
    ranchRoots273.push({ ...spot, v: wanted });
  }
  window.GV.save();
  assert(window.GV.load() === true,
    'T273 五種牧場同存檔 save→load 應成功');
  for (const root of ranchRoots273) {
    const loaded = tile(root.x, root.y).bld;
    assert(loaded && loaded.k === 23 && loaded.v === root.v &&
      loaded.lv === 1 && loaded.sz === 2,
    `T273 load 後牧場 v${root.v} 應逐值保留`);
  }

  console.log('\n-- (22) T274 農場作物變體擴充 12→16 --');

  const pre274Html = post273Html;
  assert(
    crypto.createHash('sha256').update(pre274Html).digest('hex').toUpperCase() ===
      '2CEA035171C0B3B5220A0FFD681C6758BE9F9DF43E897B6AB039FA5C0BCC0C22',
    'T274 pre-index 備份 SHA-256 應維持開工記錄'
  );
  const farmOldLine274 =
    "        ct.bld=(dx===0&&dy===0)?{k:22,lv:1,v:(x*5+y*11)%12,age:0,pw:true,h:1,sz:2}:{k:22,ref:[x,y]}; // T226/T227/T235：農場 12 作物（綠田/麥/菜畦/玉米/南瓜/果園/番茄/草莓/葡萄/向日葵/稻田/高麗菜），座標決定性選型（零 R）";
  const farmNewLine274 =
    "        ct.bld=(dx===0&&dy===0)?{k:22,lv:1,v:(x*5+y*11)%16,age:0,pw:true,h:1,sz:2}:{k:22,ref:[x,y]}; // T274：農場 16 作物（綠田/麥/菜畦/玉米/南瓜/果園/番茄/草莓/葡萄/向日葵/稻田/高麗菜/胡蘿蔔/西瓜/棉花/薰衣草），座標決定性選型（零 R）";
  const farmStart274 =
    '  /* ===== T274 農場作物變體擴充 START（buildSprites 絕對尾端；胡蘿蔔／西瓜／棉花／薰衣草＋四季局部 remap） ===== */';
  const farmEnd274 = '  /* ===== T274 農場作物變體擴充 END ===== */';
  const farmKeys274 = ['22_1_12', '22_1_13', '22_1_14', '22_1_15'];
  const farmKeysLiteral274 =
    "const FKEYS274=['22_1_12','22_1_13','22_1_14','22_1_15'];";
  const farmMapsLiteral274 = 'const MAPS274=[SUM274,AUT274,WIN274];';
  const farmAudit274 = source => {
    const errors = [];
    const start = source.indexOf(farmStart274);
    const end = source.indexOf(farmEnd274);
    if (source.split(farmNewLine274).length !== 2) errors.push('modulo-line');
    if (source.split(farmStart274).length !== 2 ||
        source.split(farmEnd274).length !== 2 || start < 0 || end <= start) {
      errors.push('markers');
      return errors;
    }
    const block = source.slice(start, end + farmEnd274.length);
    const k62 = source.indexOf("SPR.bld['62_1_0']");
    const ranchEnd = source.indexOf(ranchEnd273, k62);
    const mask = source.indexOf('/* ===== T261 夜燈通用遮罩', ranchEnd);
    if (!(k62 >= 0 && ranchEnd > k62 && start > ranchEnd &&
        end > start && mask > end)) errors.push('tail-order');
    const assignedBaseKeys = Array.from(
      block.matchAll(/SPR\.bld\['([^']+)'\]\s*=/g), m => m[1]
    );
    if (JSON.stringify(assignedBaseKeys) !== JSON.stringify(farmKeys274)) {
      errors.push('assignment-whitelist');
    }
    for (const key of farmKeys274) {
      const assignment =
        `SPR.bld['${key}']={img:c,ax,ay,w:136,h:150,smoke:[]};`;
      if (block.split(assignment).length !== 2) errors.push('base-' + key);
    }
    if (block.split(farmKeysLiteral274).length !== 2) errors.push('fkeys');
    if (block.split(farmMapsLiteral274).length !== 2) errors.push('maps');
    if ((block.match(/\bplate\s*\(/g) || []).length !== 4) errors.push('plate-count');
    if ((block.match(/SPR\.farmSea\[sea\]\[fk\]\s*=/g) || []).length !== 1) {
      errors.push('season-assignment');
    }
    if (block.includes('SPR.farmSea={') || block.includes('if(!b0)continue')) {
      errors.push('season-reset-or-skip');
    }
    if (/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(|\bspriteTexRand\b/.test(block)) {
      errors.push('forbidden-rng');
    }
    return errors;
  };
  assert(farmAudit274(html).length === 0,
    'T274 正式碼應精確為尾端四張 base＋十二張季節圖＋%16，且不得碰主／ambient 亂數');

  const farmStartAt274 = html.indexOf(farmStart274);
  const farmEndAt274 = html.indexOf(farmEnd274, farmStartAt274);
  const farmBlockEnd274 = farmEndAt274 + farmEnd274.length;
  const farmBlockSource274 = html.slice(farmStartAt274, farmBlockEnd274);
  const traceFarmBlock274 = source => {
    const parseColor = value => {
      const match = /^#([0-9a-f]{6})$/i.exec(String(value));
      if (!match) throw new Error('T274 pixel harness unsupported color: ' + value);
      const n = parseInt(match[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
    };
    const makeCanvas = (w, h) => {
      const pixels = new Uint8ClampedArray(w * h * 4);
      const ops = [];
      let fillStyle = '#000000';
      const canvas = { width: w, height: h, __pixels: pixels, __ops: ops };
      const ctx = {
        __ops: ops,
        fillRect(x, y, rw, rh) {
          ops.push(['fillRect', fillStyle, x, y, rw, rh]);
          const rgba = parseColor(fillStyle);
          const x0 = Math.max(0, Math.floor(x));
          const y0 = Math.max(0, Math.floor(y));
          const x1 = Math.min(w, Math.ceil(x + rw));
          const y1 = Math.min(h, Math.ceil(y + rh));
          for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
            const at = (py * w + px) * 4;
            pixels[at] = rgba[0]; pixels[at + 1] = rgba[1];
            pixels[at + 2] = rgba[2]; pixels[at + 3] = rgba[3];
          }
        },
        drawImage(src, dx = 0, dy = 0) {
          ops.push(['drawImage', dx, dy, src.width, src.height]);
          for (let sy = 0; sy < src.height; sy++) for (let sx = 0; sx < src.width; sx++) {
            const tx = sx + dx, ty = sy + dy;
            if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
            const from = (sy * src.width + sx) * 4;
            const to = (ty * w + tx) * 4;
            pixels[to] = src.__pixels[from]; pixels[to + 1] = src.__pixels[from + 1];
            pixels[to + 2] = src.__pixels[from + 2]; pixels[to + 3] = src.__pixels[from + 3];
          }
        },
        getImageData(x, y, rw, rh) {
          if (x !== 0 || y !== 0 || rw !== w || rh !== h) {
            throw new Error('T274 pixel harness expects full-canvas getImageData');
          }
          return { data: new Uint8ClampedArray(pixels), width: w, height: h };
        },
        putImageData(image, dx, dy) {
          if (dx !== 0 || dy !== 0 || image.data.length !== pixels.length) {
            throw new Error('T274 pixel harness expects full-canvas putImageData');
          }
          pixels.set(image.data);
          ops.push(['putImageData', dx, dy, image.data.length]);
        }
      };
      Object.defineProperty(ctx, 'fillStyle', {
        get() { return fillStyle; },
        set(value) { fillStyle = String(value); }
      });
      canvas.getContext = () => ctx;
      return [canvas, ctx];
    };
    const sandbox = {
      SPR: { bld: {}, farmSea: { 1: {}, 2: {}, 3: {} } },
      cv: makeCanvas,
      plate(g, ax, ay, color) {
        g.__ops.push(['plate', ax, ay, color]);
        g.fillStyle = color;
        g.fillRect(ax - 34, ay - 50, 68, 36);
      },
      Uint8ClampedArray
    };
    vm.runInNewContext(source, sandbox);
    const hashCanvas = canvas => crypto.createHash('sha256')
      .update(Buffer.from(canvas.__pixels)).digest('hex');
    const out = { base: {}, seasons: { 1: {}, 2: {}, 3: {} } };
    for (const key of Object.keys(sandbox.SPR.bld)) {
      const spr = sandbox.SPR.bld[key];
      out.base[key] = {
        w: spr.w, h: spr.h, ax: spr.ax, ay: spr.ay,
        ops: spr.img.__ops, hash: hashCanvas(spr.img), canvas: spr.img
      };
    }
    for (const sea of [1, 2, 3]) for (const key of Object.keys(sandbox.SPR.farmSea[sea])) {
      const spr = sandbox.SPR.farmSea[sea][key];
      out.seasons[sea][key] = {
        w: spr.w, h: spr.h, ax: spr.ax, ay: spr.ay,
        hash: hashCanvas(spr.img), canvas: spr.img
      };
    }
    return out;
  };
  const pixelAt274 = (canvas, x, y) => {
    const at = (y * canvas.width + x) * 4;
    return '#' + [0, 1, 2].map(offset =>
      canvas.__pixels[at + offset].toString(16).padStart(2, '0')).join('');
  };
  const farmTraceErrors274 = trace => {
    const errors = [];
    if (JSON.stringify(Object.keys(trace.base)) !== JSON.stringify(farmKeys274)) {
      errors.push('base-keys');
      return errors;
    }
    const baseHashes = [];
    for (const key of farmKeys274) {
      const spr = trace.base[key];
      if (spr.w !== 136 || spr.h !== 150 || spr.ax !== 68 || spr.ay !== 148) {
        errors.push(key + '-geometry');
      }
      if (spr.ops.length < 30) errors.push(key + '-too-simple');
      baseHashes.push(spr.hash);
    }
    if (new Set(baseHashes).size !== 4) errors.push('base-indistinguishable');
    for (const sea of [1, 2, 3]) {
      if (JSON.stringify(Object.keys(trace.seasons[sea])) !== JSON.stringify(farmKeys274)) {
        errors.push('season-' + sea + '-keys');
        continue;
      }
      for (const key of farmKeys274) {
        const spr = trace.seasons[sea][key];
        if (spr.w !== 136 || spr.h !== 150 || spr.ax !== 68 || spr.ay !== 148) {
          errors.push(`season-${sea}-${key}-geometry`);
        }
      }
    }
    const probes = {
      '22_1_12': { x: 52, y: 105, colors: ['#e36f24', '#ea7a28', '#d78322', '#d4dce6'] },
      '22_1_13': { x: 52, y: 105, colors: ['#27613c', '#247342', '#556238', '#c8d4e0'] },
      '22_1_14': { x: 52, y: 104, colors: ['#f5f0e3', '#fff7e8', '#f0dfc4', '#f5f8fb'] },
      '22_1_15': { x: 50, y: 104, colors: ['#6d54a6', '#765fbb', '#8d5a7c', '#d4dce6'] }
    };
    for (const key of farmKeys274) {
      const probe = probes[key];
      const canvases = [trace.base[key] && trace.base[key].canvas]
        .concat([1, 2, 3].map(sea =>
          trace.seasons[sea][key] && trace.seasons[sea][key].canvas));
      if (canvases.some(canvas => !canvas)) continue;
      const colors = canvases.map(canvas => pixelAt274(canvas, probe.x, probe.y));
      if (JSON.stringify(colors) !== JSON.stringify(probe.colors)) {
        errors.push(key + '-season-colors:' + colors.join(','));
      }
      const hashes = [trace.base[key].hash]
        .concat([1, 2, 3].map(sea => trace.seasons[sea][key].hash));
      if (new Set(hashes).size !== 4) errors.push(key + '-season-indistinguishable');
    }
    // 不以 production map 自我推導 expected：硬編 13 個正式來源色的三季完整契約，
    // 逐像素驗「表內精確換色、表外完全不動」，並要求 13 色都由最終 base 真正命中。
    const expectedMaps274 = [
      new Map([
        [0x65452f, 0x5d4934], [0x3e7339, 0x34843a], [0xe36f24, 0xea7a28],
        [0xf39a38, 0xf4a648], [0x315f39, 0x286f38], [0x27613c, 0x247342],
        [0x6d9a49, 0x60ad48], [0x536f35, 0x477f32], [0xd8d2c1, 0xe2dece],
        [0xf5f0e3, 0xfff7e8], [0x496842, 0x3f7840], [0x6d54a6, 0x765fbb],
        [0x9b7acb, 0xa58ad8]
      ]),
      new Map([
        [0x65452f, 0x76533a], [0x3e7339, 0x8f7830], [0xe36f24, 0xd78322],
        [0xf39a38, 0xe2a03a], [0x315f39, 0x7b6830], [0x27613c, 0x556238],
        [0x6d9a49, 0xa28736], [0x536f35, 0x92743a], [0xd8d2c1, 0xd8c6aa],
        [0xf5f0e3, 0xf0dfc4], [0x496842, 0x806440], [0x6d54a6, 0x8d5a7c],
        [0x9b7acb, 0xb07988]
      ]),
      new Map([
        [0x65452f, 0xdee6ee], [0x3e7339, 0xd4dce6], [0xe36f24, 0xd4dce6],
        [0xf39a38, 0xf2f6fa], [0x315f39, 0xd4dce6], [0x27613c, 0xc8d4e0],
        [0x6d9a49, 0xe8eef2], [0x536f35, 0xcbd7e2], [0xd8d2c1, 0xdce5ed],
        [0xf5f0e3, 0xf5f8fb], [0x496842, 0xcbd7e2], [0x6d54a6, 0xd4dce6],
        [0x9b7acb, 0xf2f6fa]
      ])
    ];
    const hitSources274 = new Set();
    const pixelMismatches274 = new Set();
    for (const key of farmKeys274) {
      const base = trace.base[key] && trace.base[key].canvas;
      if (!base || [1, 2, 3].some(sea => !trace.seasons[sea][key])) continue;
      const bd = base.__pixels;
      for (let at = 0; at < bd.length; at += 4) {
        if (bd[at + 3] < 10) continue;
        const sourceColor = (bd[at] << 16) | (bd[at + 1] << 8) | bd[at + 2];
        if (expectedMaps274[0].has(sourceColor)) hitSources274.add(sourceColor);
        for (let sea = 1; sea <= 3; sea++) {
          const sd = trace.seasons[sea][key].canvas.__pixels;
          const actual = (sd[at] << 16) | (sd[at + 1] << 8) | sd[at + 2];
          const expected = expectedMaps274[sea - 1].has(sourceColor) ?
            expectedMaps274[sea - 1].get(sourceColor) : sourceColor;
          if (actual !== expected || sd[at + 3] !== bd[at + 3]) {
            pixelMismatches274.add(
              `${key}:s${sea}:${sourceColor.toString(16)}>${actual.toString(16)}`
            );
          }
        }
      }
    }
    const expectedSources274 = Array.from(expectedMaps274[0].keys()).sort((a, b) => a - b);
    const actualSources274 = Array.from(hitSources274).sort((a, b) => a - b);
    if (JSON.stringify(actualSources274) !== JSON.stringify(expectedSources274)) {
      errors.push('season-source-coverage:' +
        actualSources274.map(value => value.toString(16)).join(','));
    }
    if (pixelMismatches274.size) {
      errors.push('season-full-map:' + Array.from(pixelMismatches274).slice(0, 8).join(','));
    }
    return errors;
  };
  const farmTrace274 = traceFarmBlock274(farmBlockSource274);
  assert(farmTraceErrors274(farmTrace274).length === 0,
    'T274 四張 base 應有實質繪圖、固定幾何、互異 fingerprint，且十二張季節圖應真 remap');

  const oldSeasonStart274 = source =>
    source.indexOf('  /* ---------- T229 農場四季');
  const oldSeasonEnd274 = (source, start) =>
    source.indexOf('  // T46 牧場 (k=23', start);
  const preOldSeasonStart274 = oldSeasonStart274(pre274Html);
  const preOldSeasonEnd274 = oldSeasonEnd274(pre274Html, preOldSeasonStart274);
  const curOldSeasonStart274 = oldSeasonStart274(html);
  const curOldSeasonEnd274 = oldSeasonEnd274(html, curOldSeasonStart274);
  assert(preOldSeasonStart274 >= 0 && preOldSeasonEnd274 > preOldSeasonStart274 &&
    curOldSeasonStart274 >= 0 && curOldSeasonEnd274 > curOldSeasonStart274 &&
    html.slice(curOldSeasonStart274, curOldSeasonEnd274) ===
      pre274Html.slice(preOldSeasonStart274, preOldSeasonEnd274),
  'T274 不得修改既有 T229 SUM/AUT/WIN/FKEYS 與 12 作物＋大農場季節管線');

  // T275 起：exact rollback 改跑「凍結快照 pre-T275（＝post-T274 封存態）」——沿用 T273 對 post273Html
  // 的同款慣例（卡完成後由下一卡的 pre 快照承接 byte 比對，live 檔繼續演進不受釘選）；
  // GPT 寫本測試時 pre-T275 尚不存在只能用 live html，T275 收尾時依慣例切換。
  const post274Html = fs.readFileSync(path.join(__dirname, 'backups', 'index.pre-T275.html'), 'utf8');
  const farmStartAt274s = post274Html.indexOf(farmStart274);
  const farmEndAt274s = post274Html.indexOf(farmEnd274, farmStartAt274s);
  const farmBlockEnd274s = farmEndAt274s + farmEnd274.length;
  assert(farmStartAt274s >= 0 && farmEndAt274s > farmStartAt274s,
    'T274 rollback 快照（pre-T275）內應含完整 T274 區塊');
  assert(post274Html.slice(farmBlockEnd274s, farmBlockEnd274s + 1) === '\n',
    'T274 尾端區塊後應有單一 LF，供 exact rollback');
  let restoredHtml274 = post274Html.slice(0, farmStartAt274s) +
    post274Html.slice(farmBlockEnd274s + 1);
  assert(restoredHtml274.split(farmNewLine274).length === 2,
    'T274 exact rollback 應精確定位唯一農場 %16 行');
  restoredHtml274 = restoredHtml274.replace(farmNewLine274, farmOldLine274);
  assert(restoredHtml274 === pre274Html,
    'T274 反向移除四 base＋十二季節圖並還原農場單行後，必須逐 byte 等於 pre-T274');
  assert(JSON.stringify(rngLines272(post274Html)) === JSON.stringify(rngLines272(pre274Html)),
    'T274 相對 pre-T274 的 R()/ri() 呼叫行應逐行零差異'); // T275 起改比快照（同 rollback 慣例；live 檔的亂數紀律由後續各卡自行驗證）
  assert(JSON.stringify(sharedSpriteRandLines272(post274Html)) ===
    JSON.stringify(sharedSpriteRandLines272(pre274Html)),
  'T274 相對 pre-T274 的既有共用 rand() 呼叫行應逐行零差異');

  const moduloMutant274 = html.replace(farmNewLine274, farmOldLine274);
  assert(moduloMutant274 !== html && farmAudit274(moduloMutant274).length > 0,
    'T274 %16 若退回 %12，source audit 必須殺死 mutant');
  for (const key of farmKeys274) {
    const assignment = `SPR.bld['${key}']={img:c,ax,ay,w:136,h:150,smoke:[]};`;
    const missingBaseMutant = html.replace(assignment, '');
    assert(missingBaseMutant !== html && farmAudit274(missingBaseMutant).length > 0,
      `T274 若遺失 ${key} base，source audit 必須殺死 mutant`);
    const withoutKey = farmKeys274.filter(item => item !== key);
    const missingSeasonMutant = html.replace(
      farmKeysLiteral274,
      `const FKEYS274=['${withoutKey.join("','")}'];`
    );
    assert(missingSeasonMutant !== html && farmAudit274(missingSeasonMutant).length > 0,
      `T274 若遺失 ${key} 的三季生成入口，source audit 必須殺死 mutant`);
  }
  const oldOverwriteMutant274 = html.replace(
    "SPR.bld['22_1_12']={img:c,ax,ay,w:136,h:150,smoke:[]};",
    "SPR.bld['22_1_0']={img:c,ax,ay,w:136,h:150,smoke:[]};"
  );
  assert(oldOverwriteMutant274 !== html &&
    farmAudit274(oldOverwriteMutant274).includes('assignment-whitelist'),
  'T274 若覆寫既有 22_1_0，assignment whitelist 必須殺死 mutant');

  const identitySummerMutant274 = farmBlockSource274.replace(
    /const SUM274=\{[^;\r\n]*\};/,
    'const SUM274={};'
  );
  assert(identitySummerMutant274 !== farmBlockSource274 &&
    farmTraceErrors274(traceFarmBlock274(identitySummerMutant274)).length > 0,
  'T274 夏季 map 若退化為 identity，獨立像素期望必須殺死 mutant');
  const singleColorMutant274 = farmBlockSource274.replace(
    '0x65452f:0x5d4934', '0x65452f:0x65452f'
  );
  assert(singleColorMutant274 !== farmBlockSource274 &&
    farmTraceErrors274(traceFarmBlock274(singleColorMutant274)).length > 0,
  'T274 任一未抽樣單色若錯映射（夏季土色 identity），完整逐像素契約必須殺死 mutant');
  const swappedSeasonMutant274 = farmBlockSource274.replace(
    farmMapsLiteral274, 'const MAPS274=[AUT274,SUM274,WIN274];'
  );
  assert(swappedSeasonMutant274 !== farmBlockSource274 &&
    farmTraceErrors274(traceFarmBlock274(swappedSeasonMutant274)).length > 0,
  'T274 夏／秋 bucket 若對調，獨立像素期望必須殺死 mutant');

  const flatBaseLines274 = farmKeys274.map(key =>
    `  {const[c,g]=cv(136,150);const ax=68,ay=148;plate(g,ax,ay,'#8a9a5a');` +
    `SPR.bld['${key}']={img:c,ax,ay,w:136,h:150,smoke:[]};}`).join('\n');
  const flatFarmMutant274 = farmStart274 + '\n' + flatBaseLines274 + '\n' +
    `  {${farmKeysLiteral274}for(const fk of FKEYS274){const b0=SPR.bld[fk];` +
    `for(let sea=1;sea<=3;sea++)SPR.farmSea[sea][fk]=` +
    `{img:b0.img,ax:b0.ax,ay:b0.ay,w:b0.w,h:b0.h,smoke:[]};}}\n` +
    farmEnd274;
  assert(farmTraceErrors274(traceFarmBlock274(flatFarmMutant274)).length > 0,
    'T274 四張圖若退化成空底板且三季共用春圖，pixel trace 必須殺死 mutant');

  const farmBlockWithLf274 = html.slice(farmStartAt274, farmBlockEnd274 + 1);
  const withoutFarmBlock274 = html.slice(0, farmStartAt274) +
    html.slice(farmBlockEnd274 + 1);
  const k62At274 = withoutFarmBlock274.indexOf("SPR.bld['62_1_0']");
  const movedEarlyMutant274 = withoutFarmBlock274.slice(0, k62At274) +
    farmBlockWithLf274 + withoutFarmBlock274.slice(k62At274);
  assert(farmAudit274(movedEarlyMutant274).includes('tail-order'),
    'T274 新 sprite 若被移到 k62／T273 之前，尾端順序 audit 必須殺死 mutant');

  window.GV.newWorldSeeded(274);
  window.GV.weather(0);
  if (window.GV.setDiff) window.GV.setDiff(1);
  window.GV.addMoney(9000000);
  const farmRoots274 = [];
  for (let wanted = 0; wanted < 16; wanted++) {
    let spot = null;
    for (let y = 2; y < window.GV.N() - 3 && !spot; y++) {
      for (let x = 2; x < window.GV.N() - 3; x++) {
        if ((x * 5 + y * 11) % 16 === wanted &&
            window.GV.canPlaceTool('farm', x, y) === null) {
          spot = { x, y }; break;
        }
      }
    }
    assert(spot, `T274 應找到 residue ${wanted} 的合法 2×2 農場位置`);
    assert(place('farm', spot.x, spot.y),
      `T274 residue ${wanted} 農場應真實建造成功`);
    const root = tile(spot.x, spot.y).bld;
    assert(root && root.k === 22 && root.v === wanted && root.lv === 1 &&
      root.sz === 2,
    `T274 residue ${wanted} root 應精確為 k22/v${wanted}/lv1/sz2`);
    let refs = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      if (!dx && !dy) continue;
      const ref = tile(spot.x + dx, spot.y + dy).bld;
      if (ref && ref.k === 22 && ref.ref &&
          ref.ref[0] === spot.x && ref.ref[1] === spot.y) refs++;
    }
    assert(refs === 3,
      `T274 residue ${wanted} 應建立精確3個 ref 格，實際 ${refs}`);
    farmRoots274.push({ ...spot, v: wanted });
  }
  window.GV.save();
  const rawFarmSave274 = JSON.parse(store[SKEY]);
  const rawFarmVariants274 = rawFarmSave274.bl.filter(rec => rec[1] === 22)
    .map(rec => rec[3]).sort((a, b) => a - b);
  assert(JSON.stringify(rawFarmVariants274) ===
    JSON.stringify(Array.from({ length: 16 }, (_, v) => v)),
  'T274 原始存檔 bl 應逐值包含農場 v0..15');
  assert(window.GV.load() === true,
    'T274 十六種農場同存檔 save→load 應成功');
  for (const root of farmRoots274) {
    const loaded = tile(root.x, root.y).bld;
    assert(loaded && loaded.k === 22 && loaded.v === root.v &&
      loaded.lv === 1 && loaded.sz === 2,
    `T274 load 後農場 v${root.v} root 應逐值保留`);
    let refs = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      if (!dx && !dy) continue;
      const ref = tile(root.x + dx, root.y + dy).bld;
      if (ref && ref.k === 22 && ref.ref &&
          ref.ref[0] === root.x && ref.ref[1] === root.y) refs++;
    }
    assert(refs === 3,
      `T274 load 後農場 v${root.v} 應重建精確3個 ref，實際 ${refs}`);
  }
}

runPwaTests().then(() => {
  // ================= (13) T276 農莊套件覆蓋層 =================
  console.log('\n-- (13) T276 農莊套件覆蓋層 --');
  {
    const t276Start = html.indexOf('T276 農莊套件覆蓋層（');
    const t276End = html.indexOf('/* ===== T276 農莊套件覆蓋層 END ===== */');
    const t274EndAt = html.indexOf('/* ===== T274 農場作物變體擴充 END ===== */');
    const t261At = html.indexOf('T261 夜燈通用遮罩');
    assert(t276Start > 0 && t276End > t276Start, 'T276 區塊應存在且有 END 標記');
    assert(t274EndAt < t276Start && t276End < t261At,
      'T276 應位於 T274 END 之後、T261 遮罩之前（不動既有生成行＝快照回退零影響）');
    const block276 = html.slice(t276Start, t276End);
    const code276 = block276.replace(/^[\s\S]*?\*\//, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); // 剝註解（起點標記在區塊頭註解內＝先斬無頭段到首個 */，再剝完整塊註解與行註解；註解可提及亂數詞彙，程式碼不可用）
    assert(!/\bR\(\)|\bri\(|Math\.random|spriteTexRand|\brand\(/.test(code276),
      'T276 區塊應零亂數（純 fillRect 決定性）');
    assert(block276.includes('for(let v=0;v<16;v++)') && block276.includes("'22_1_'+v") &&
      block276.includes("'53_1_0'"),
      'T276 應覆蓋 16 作物全變體＋大農場');
    assert(/for\(const si of\[1,2,3\]\)/.test(block276) && block276.includes('si===3'),
      'T276 應覆蓋三季節圖且冬季走積雪分支');
    assert(block276.includes('#b5442e') && block276.includes('#c6ccd4') && block276.includes('#d8a838'),
      'T276 應含穀倉紅/筒倉銀/乾草金三件套色票');
  }

  console.log('\nFIX-D/FIX-E 回歸測試全部通過');
  process.exit(0);
}).catch(err => {
  console.error('FAIL: PWA 回歸測試非預期例外', err && err.stack ? err.stack : err);
  process.exit(1);
});
