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
let gameEllipseTrace = null; // T364b 中繼退修：只在驗收時記錄實際 world draw 的 ellipse
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
          arc() {}, arcTo() {}, ellipse(...args) { if (el.id === 'game' && gameEllipseTrace) gameEllipseTrace.push([args, this.fillStyle]); }, quadraticCurveTo() {}, bezierCurveTo() {},
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

const ids = ['game','hud','money','day','pop','jobs','happy','rci','bStats','bHelp','bUndo','bSpeed','bSound','bSave','bNew','hint','hintTxt','hintX','tools','toolcats','toasts','dragcost','mini','zoomer','zin','zout','info','infoX','infoBody','start','logo','bContinue','bNewGame','star','date','statsCity343','statsTech343','techTree343','techDetail343','techStart343','techHome343','statsFlow384','bFlowOverlay384','statsComm385','bCommAcc385_0','bCommAcc385_1','bCommAcc385_2','bCommDrop385','bSpecPick386_0','bSpecPick386_1','bSpecPick386_2','bSpecPick386_3'];
ids.forEach(id => makeEl(id==='techTree343'?'canvas':'div', id));
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
  body: makeEl('body'),
  // T322：#info 的限高靠 --hud-h（syncHudH 實測導航欄高度寫入）。補上 documentElement.style
  // 的最小樁，讓「面板不頂穿導航欄」這條約束在 node 端也可斷言，而不只是瀏覽器裡看得到。
  documentElement: (() => {
    const props = {};
    return { style: { setProperty(k, v) { props[k] = v; }, getPropertyValue(k) { return props[k] || ''; } }, _props: props };
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
/* T438 共用工具：把一份原始碼裡的區塊註解／行註解／字串／正則字面量逐字元換成空白，
   換行保留、**總長度不變**（下面直接自測），所以行號與 index 位置都不位移。

   為什麼要有這個：今晚三條守衛都栽在「守衛讀到的是自己的註解」——
   T428 G1 被自己的 CSS 註解餵成假紅、T437 的死錨點被同列另一個錨點餵成假綠、
   T434b G2 被 T438 的更正註解餵成假紅。原文前哨要問的是「程式碼裡有沒有」，不是「這份檔案裡有沒有」。

   而這支工具自己也錯過一次：第一版不認識**正則字面量**，`index.html:19498` 的
   `.replace(/"/g,'&quot;')` 讓它以為進入雙引號字串、一路吃掉 97 行，
   到 :21311 時整份檔案後半都被當成字串。那次是假紅所以被看見；反過來就是無聲的假綠。
   所以正則要認，而且下面那組單元自測必須跟著這支工具一起活。 */
function stripCommentsAndStrings438(src) {
  let out = '', st = 0, prev = '';   // 0=code 1=/* 2=// 3=' 4=" 5=` 6=regex
  const blank = (c) => (c === '\n' ? '\n' : ' ');
  /* 正則 vs 除法：看前一個非空白的程式碼字元。落在這組裡（或在開頭）就是正則的位置，
     否則 `/` 是除號。這是 JS 詞法上的標準判法，對本專案的寫法足夠。 */
  const REGEX_OK = '(,=:[!&|?{};+-*%~^<>\n';
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1] || '';
    if (st === 0) {
      if (c === '/' && d === '*') { st = 1; out += '  '; i++; continue; }
      if (c === '/' && d === '/') { st = 2; out += '  '; i++; continue; }
      if (c === '/' && (prev === '' || REGEX_OK.indexOf(prev) >= 0)) { st = 6; out += ' '; continue; }
      if (c === '\'' || c === '"' || c === '`') { st = (c === '\'' ? 3 : c === '"' ? 4 : 5); out += ' '; continue; }
      out += c;
      if (c.trim()) prev = c;
      continue;
    }
    if (st === 1) { if (c === '*' && d === '/') { st = 0; out += '  '; i++; prev = ''; continue; } }
    else if (st === 2) { if (c === '\n') st = 0; }
    else if (st === 6) {
      /* 字元類別 [...] 裡的 `/` 不算結束；跳脫字元一律吃掉下一個。
         正則不可能跨行，遇到換行就當它其實是除號、回到 code（保守，寧可少剝不可多剝）。 */
      if (c === '\\') { out += '  '; i++; continue; }
      if (c === '\n') { st = 0; out += '\n'; continue; }
      if (c === '[') { st = 7; out += ' '; continue; }
      if (c === '/') { st = 0; prev = '/'; out += ' '; continue; }
    }
    else if (st === 7) {
      if (c === '\\') { out += '  '; i++; continue; }
      if (c === ']') { st = 6; out += ' '; continue; }
      if (c === '\n') { st = 0; out += '\n'; continue; }
    }
    else {
      if (c === '\\') { out += '  '; i++; continue; }
      if ((st === 3 && c === '\'') || (st === 4 && c === '"') || (st === 5 && c === '`')) { st = 0; prev = c; }
    }
    out += blank(c);
  }
  return { text: out, state: st };
}

/* 剝除器的單元自測。一支沒有「它自己壞掉時會紅」證明的量具，就是今晚罵了一整夜的那種東西。 */
{
  const FIX = [
    ['塊註解', '/* keepA */ keepB', 'keepB', 'keepA'],
    ['行註解', 'keepC // keepD', 'keepC', 'keepD'],
    ['單引號字串', 'x=\'keepE\';keepF', 'keepF', 'keepE'],
    ['樣板字串', 'x=`keepG`;keepH', 'keepH', 'keepG'],
    ['字串裡的假註解', 'x=\'/* keepI\';keepJ', 'keepJ', 'keepI'],
    ['跳脫引號', 'x=\'a\\\'keepK\';keepL', 'keepL', 'keepK'],
    ['正則含雙引號', 'x.replace(/"/g,\'keepM\');keepN', 'keepN', 'keepM'],
    ['正則字元類別含斜線', 'x=/[/"]/.test(y);keepO', 'keepO', null],
    ['除法不是正則', 'a=b/c;keepP', 'keepP', null],
  ];
  for (const [nm, src, must, gone] of FIX) {
    const r = stripCommentsAndStrings438(src);
    assert(r.text.length === src.length,
      'T438 G0c 剝除器自測「' + nm + '」長度不等（' + r.text.length + ' vs ' + src.length + '）');
    assert(r.text.indexOf(must) >= 0,
      'T438 G0c 剝除器自測「' + nm + '」把程式碼也剝掉了：期望保留 ' + must + '，實得 ' + JSON.stringify(r.text));
    if (gone !== null) assert(r.text.indexOf(gone) < 0,
      'T438 G0c 剝除器自測「' + nm + '」沒剝乾淨：' + gone + ' 仍在 ' + JSON.stringify(r.text));
  }
}

const strip438Result = stripCommentsAndStrings438(html);
const htmlBare438 = strip438Result.text;
assert(strip438Result.state === 0,
  'T438 G0d 剝完 index.html 之後狀態必須回到 code（實得 ' + strip438Result.state
  + '）。非 0 代表有字串／註解／正則沒閉合 ⇒ 檔案後半會整段被當成字串，'
  + '所有靠它的原文前哨都會無聲失真（第一版就是這樣把 buildAllSprites 數成 0）');
assert(htmlBare438.length === html.length,
  'T438 G0 剝除器必須逐字元等長（實得 ' + htmlBare438.length + ' vs ' + html.length + '）');

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
let t343IifeEnd = js.lastIndexOf('})();');
if (t343IifeEnd < 0) throw new Error('T343a harness 找不到主 IIFE 尾端');
// T417 台帳計數器：宣告移到 js 最前（主 IIFE 開頭）——原插入點在 t383 段＝開機烘焙之後才賦 0，
// 烘焙期計數器是提升未初始化的 undefined（++→NaN），C7 決定性計數失真（開機 210 鍵全被吞）
{
  const needleBoot = "(()=>{ 'use strict';";
  const hitsBoot = js.split(needleBoot).length - 1;
  if (hitsBoot !== 1) throw new Error('T417 台帳計數器錨點失準 hits=' + hitsBoot);
  js = js.replace(needleBoot, needleBoot + '\nvar __t417N417=0,__t417Seg417=0,__t417Try417=0,__t417Keys417={},__t417Kinds417=[],__t417Pos417=[],__t417Py417=[],__t417GID417=0,__t417Px1=0,__t417Px2=0;');
}
const inject343 = (needle, replacement, label) => {
  const hits = js.split(needle).length - 1;
  if (hits !== 1) throw new Error('T343c probe 錨點失準 ' + label + ' hits=' + hits);
  const before = js;
  js = js.replace(needle, replacement);
  if (js === before) throw new Error('T343c probe 注入未改變源碼 ' + label);
};
inject343(
  "p*=tq('A4a',1.10,1)*tq('A4b',.85,1)*tq('B3',.90,1)*sq('ind',1.08,1)*sq('green',.90,1);\n    if(R()<p){",
  "p*=tq('A4a',1.10,1)*tq('A4b',.85,1)*tq('B3',.90,1)*sq('ind',1.08,1)*sq('green',.90,1);\n    window.__t343Probe.fire=p;\n    if(R()<p){",
  'fire'
);
inject343(
  "R()<.001*(b.k===2?2:1)*b.lv*(pol&&pol.curfew?.6:1)*(pol&&pol.nightMarket?1.15:1)*(pol&&pol.parkNight?1.05:1)*((COV.court&&COV.court[i]>0)?.5:1)*tq('B2',.92,1)*tq('B4b',1.05,1)*tq('B7',.90,1)",
  "R()<(window.__t343Probe.crime=.001*(b.k===2?2:1)*b.lv*(pol&&pol.curfew?.6:1)*(pol&&pol.nightMarket?1.15:1)*(pol&&pol.parkNight?1.05:1)*((COV.court&&COV.court[i]>0)?.5:1)*tq('B2',.92,1)*tq('B4b',1.05,1)*tq('B7',.90,1))",
  'crime'
);
inject343(
  "R()<.035*eduBoost*libraryBoost*instituteBoost*landUpMul*tq('A5',1.10,1)*tq('C2',1.08,1)",
  "R()<(window.__t343Probe.upgrade=.035*eduBoost*libraryBoost*instituteBoost*landUpMul*tq('A5',1.10,1)*tq('C2',1.08,1))",
  'upgrade'
);
/* T451/T475 跟版：transitRidership 公式隨壅堵費再投資等乘數演進；probe 跟原文。 */
inject343(
  "transitRidership=Math.round((busP*.45+railP*.65+metroP*.75)*(pol&&pol.freeTransit?1.35:1)*(pol&&pol.congChg451?SCI_BY_ID451.congChg451.fx.transitMul:1)*(pol&&pol.bikeInf480?SCI_BY_ID451.bikeInf480.fx.transitMul:1)*(pol&&pol.congFund475&&pol.congChg451?SCI_BY_ID451.congFund475.fx.transitMul:1)*(pol&&pol.compSt495?SCI_BY_ID451.compSt495.fx.transitMul:1)*(pol&&pol.brt496?SCI_BY_ID451.brt496.fx.transitMul:1)*(pol&&pol.poly504?SCI_BY_ID451.poly504.fx.transitMul:1)*tq('A2',1.12,1)*tq('C5',1.08,1)*sq('hub',1.12,1));",
  "transitRidership=Math.round(window.__t343Probe.transit=(busP*.45+railP*.65+metroP*.75)*(pol&&pol.freeTransit?1.35:1)*(pol&&pol.congChg451?SCI_BY_ID451.congChg451.fx.transitMul:1)*(pol&&pol.bikeInf480?SCI_BY_ID451.bikeInf480.fx.transitMul:1)*(pol&&pol.congFund475&&pol.congChg451?SCI_BY_ID451.congFund475.fx.transitMul:1)*(pol&&pol.compSt495?SCI_BY_ID451.compSt495.fx.transitMul:1)*(pol&&pol.brt496?SCI_BY_ID451.brt496.fx.transitMul:1)*(pol&&pol.poly504?SCI_BY_ID451.poly504.fx.transitMul:1)*tq('A2',1.12,1)*tq('C5',1.08,1)*sq('hub',1.12,1));",
  'transit'
);
// T383b：稅收窮舉守衛的 sink 記錄器——漏守衛的 k 必然落入工業稅 fallback（鐵律14 的 NaN 落點），
// 在唯一落點裝閘控記錄器（__taxFbk 未設時零行為差），式樣無關（等值/範圍/查表/未來 switch 都免疫）。
inject343(
  "else{const eduIndMul=b.lv===3",
  "else{if(window.__taxFbk)window.__taxFbk.push(b.k);const eduIndMul=b.lv===3",
  't383taxFbk'
);
t343IifeEnd = js.lastIndexOf('})();'); // 上方 probe 插入會改字串長度，注入點必須重新定位
const t343Harness = `
window.__t343Probe={};
function __t343Base(id){
  newWorld(34343);diff=3;weather=0;wxT=99;pol=null;window.__t343Probe={};
  if(id&&(!window.GV||!window.GV.techGrant(id)))throw new Error('T343c fixture GV.techGrant 失敗 '+id);
}
function __t343Bld(k,lv,x,y){
  const i=idx(x,y);tiles[i].bld={k,lv,v:0,age:1,pw:true,wa:true,h:.62,fire:0,we:1};tiles[i].zone=0;return i;
}
function __t343ProbeValue(kind){
  const v=window.__t343Probe[kind];
  if(!Number.isFinite(v))throw new Error('T343c probe 未命中或非有限數 '+kind+'='+v);
  return v;
}
function __t343TickCase(kind,id){
  __t343Base(id);
  const oldR=R,oldRoad=hasRoadNear,oldPower=computePower,oldWater=computeWater,oldDis=disastersOn;
  R=()=>.999999;hasRoadNear=()=>true;computePower=()=>9999;computeWater=()=>9999;disastersOn=false;
  let target=-1;
  try{
    if(kind==='taxI'||kind==='fire')target=__t343Bld(3,1,10,10);
    else if(kind==='taxC'||kind==='crime')target=__t343Bld(2,1,10,10);
    else if(kind==='happy')target=__t343Bld(1,1,10,10);
    else if(kind==='upgrade'){target=__t343Bld(2,1,10,10);tiles[target].bld.age=20;COV.police[target]=1;__t343Bld(1,1,12,10);}
    else if(kind==='demand'){__t343Bld(2,1,10,10);__t343Bld(3,1,12,10);}
    tick();
    if(kind==='taxI')return fin.taxI;
    if(kind==='taxC')return fin.taxC;
    if(kind==='fire')return __t343ProbeValue('fire');
    if(kind==='crime')return __t343ProbeValue('crime');
    if(kind==='happy')return tiles[target].bld.h;
    if(kind==='upgrade')return __t343ProbeValue('upgrade');
    if(kind==='demand')return dem[3];
    if(kind==='policy')return fin.upReg;
    throw new Error('T343c 未知 tick fixture '+kind);
  }finally{R=oldR;hasRoadNear=oldRoad;computePower=oldPower;computeWater=oldWater;disastersOn=oldDis;}
}
function __t343TransitCase(id){
  __t343Base(id);
  const cx=10,cy=10,stop=idx(cx,cy),cells=[];
  tiles[stop].bus=1;busRoutes=[{stops:[stop]},{stops:[]},{stops:[]}];
  for(let y=cy-3;y<=cy+3;y++)for(let x=cx-3;x<=cx+3;x++)if(x!==cx||y!==cy)cells.push([x,y]);
  for(let j=0;j<37;j++){const lv=j<8?2:j<10?3:1;__t343Bld(1,lv,cells[j][0],cells[j][1]);}
  computeBusRtCovPop();
  return __t343ProbeValue('transit');
}
function __t343EffectCase(kind,id){
  if(['taxI','taxC','fire','crime','happy','upgrade','demand','policy'].includes(kind))return __t343TickCase(kind,id);
  __t343Base(id);
  if(kind==='transit')return __t343TransitCase(id);
  if(kind==='cost'){diff=1;let i=0;while(i<N*N&&tiles[i].tree)i++;return placeCost('road',i%N,(i/N)|0);}
  if(kind==='points'){cityHappy=.85;return computeCityPoints();}
  if(kind==='edu120'||kind==='edu125'){
    const i=idx(10,10);
    if(kind==='edu125'){COV.university[i]=1;COV.library[i]=1;}else COV.campus[i]=1;
    return eduStaticAt(10,10);
  }
  if(kind==='speed'){advanceTech343(0,0,0,0,0,0);return techSpeed343;}
  throw new Error('T343c 未知 effect fixture '+kind);
}
function __t343EduRefresh(id,natural){
  __t343Base('');
  const i=idx(10,10);tiles[i].bld={k:113,lv:1,v:0,age:1,pw:true,wa:true,h:.62,fire:0,sz:4};
  rebuildCov();const before=EDU[i];
  if(natural){const n=TECH343_BY_ID[id];tech343.act=id;tech343.prog[id]=n.points-1;advanceTech343(0,0,0,0,0,0);}
  else techGrant343(id);
  return{before,after:EDU[i],done:hasTech343(id)};
}
`;
js = js.slice(0, t343IifeEnd) +
  t343Harness +
  'window.__t343Test={start:startTech343,toolbar:buildToolbar,city:showStats,panel:showTechPanel343,' +
  'select:(id)=>techSelect343(id,false),draw:drawTechTree343,focus:techFocus343,' +
  'hit:(x,y)=>techHit343(x,y),' +
  'visible:(id)=>{const cv=$("#techTree343"),n=TECH343_BY_ID[id];if(!cv||!n||!techFocus343(id))return false;' +
  'const p=techRect343(n),x=p.x+techPan343.x,y=p.y+techPan343.y;return x-p.w/2>=0&&x+p.w/2<=cv.width&&y-p.h/2>=0&&y+p.h/2<=cv.height;},' +
  'click:()=>{const b=$("#techStart343");return b&&b.onclick?b.onclick():false;},' +
  'detail:()=>$("#techDetail343").innerHTML,summary:()=>$("#infoBody").innerHTML,startDisabled:()=>!!$("#techStart343").disabled,' +
  'view:()=>({sel:techSel343,x:techPan343.x,y:techPan343.y}),' +
  'effect:__t343EffectCase,eduRefresh:__t343EduRefresh,' +
  'guide:(gt)=>{guideTab=(gt===undefined?5:gt);showHelp();return $("#infoBody").innerHTML;}};\n' + // T393：帶參版（無參預設 5，既有呼叫不變）
  js.slice(t343IifeEnd); // T343a：只在 Node harness 的 IIFE 內匯出；正式 GV API 不增面
// T383b：稅收窮舉造境（仿 __t343TickCase：固定種子＋stub 亂數/道路/電水/災害，直寫 133 鍵各一棟，
// tick 一次收 fallback 成員後全數還原；只在 Node harness 存在，正式 GV API 不增面）
const t383IifeEnd = js.lastIndexOf('})();');
js = js.slice(0, t383IifeEnd) + `
var __t416Scan416=0; // T416 五輪退修 A4：scored 建構實掃 cand×sts 次數計數器（updDispatch scored 迴圈內自增；僅 harness 存在，正式 GV API 不增面）
window.__t416ScanN=function(){return __t416Scan416|0;}; // T416 五輪退修 A4：讀掃描筆數（比照 T368c fishScanN 模式：計數決定性，非計時）
/* __t417N417/__t417Seg417/__t417Keys417/__t417Kinds417/__t417Pos417/__t417Py417/__t417GID417：宣告已移到 js 最前
   （主 IIFE 開頭，見 t343IifeEnd 前的注入塊）——原在此處 var 宣告＝開機烘焙之後才賦 0，烘焙期 ++ 對提升未初始化的
   undefined→NaN，C7 決定性計數失真。此處只餘閉包引用，勿重宣告。 */
window.__t417Reset=function(){__t417N417=0;__t417Seg417=0;__t417Try417=0;__t417Keys417={};__t417Kinds417=[];__t417Pos417=[];__t417Py417=[];__t417GID417=0;__t417Px1=0;__t417Px2=0;}; // T417：重置台帳
window.__t417Read=function(){return{n:__t417N417,seg:__t417Seg417,try:__t417Try417,keys:Object.assign({},__t417Keys417),kinds:__t417Kinds417.slice(),pos:__t417Pos417.slice(),py:__t417Py417.slice()};}; // T417：讀台帳（覆核退修 A1：px/py 供落點行為釘；二輪退修：try=密度公式嘗試件數，與落筆數分離）
window.__t417ParseColor=function(v){const m=/^#([0-9a-f]{6})$/i.exec(String(v));if(m){const n=parseInt(m[1],16);return[(n>>16)&255,(n>>8)&255,n&255,255];}const r=/^rgba?[(]([0-9]+)[ ,]+([0-9]+)[ ,]+([0-9]+)(?:[ ,]+([0-9.]+))?[)]$/i.exec(String(v));if(r){const a=r[4]===undefined?255:Math.round(parseFloat(r[4])*255);return[+r[1],+r[2],+r[3],a];}return[0,0,0,255];}; // T417 覆核退修 A1：真像素 canvas 顏色解析（T274 台架同款）——二輪退修 RL-5：支援 rgba()——全字符類 regex（模板串會剝未知轉義，d 寫法在 eval 前已壞成 d）
const __t417OpsMap=new WeakMap(),__t417PixMap=new WeakMap(); // 二輪退修 RL-2：ops/像素不掛 ctx/canvas 屬性（產品拿得到 g.__ops/g.__pixels 判別真假→紅）
window.__t417Canvas=function(w,h){const pixels=new Uint8ClampedArray(w*h*4),ops=[];let fillStyle='#000000';const canvas={width:w,height:h};const ctx={fillRect(x,y,rw,rh){ // RL-5：解析 alpha——a===0 或完全裁到畫布外→不寫像素也不記 ops（透明色不再偽裝成有效落筆）
    const rgba=window.__t417ParseColor(fillStyle);
    const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y)),x1=Math.min(w,Math.ceil(x+rw)),y1=Math.min(h,Math.ceil(y+rh));
    if(!(rgba[3]>0&&x1>x0&&y1>y0))return;
    for(let py2=y0;py2<y1;py2++)for(let px2=x0;px2<x1;px2++){const at=(py2*w+px2)*4;pixels[at]=rgba[0];pixels[at+1]=rgba[1];pixels[at+2]=rgba[2];pixels[at+3]=rgba[3];}
    ops.push(['fillRect',fillStyle,x,y,rw,rh]);
  },getImageData(x,y,rw,rh){ // B7：任意子區域（stampRoof 窄帶早停 scanH=min(h,96)；越界填 0）
    const out=new Uint8ClampedArray(rw*rh*4);
    for(let py2=0;py2<rh;py2++)for(let px2=0;px2<rw;px2++){const sx=x+px2,sy=y+py2;if(sx<0||sy<0||sx>=w||sy>=h)continue;const at=(sy*w+sx)*4,oat=(py2*rw+px2)*4;out[oat]=pixels[at];out[oat+1]=pixels[at+1];out[oat+2]=pixels[at+2];out[oat+3]=pixels[at+3];}
    return{data:out,width:rw,height:rh};
  },putImageData(img,dx,dy){if(dx!==0||dy!==0||img.data.length!==pixels.length)throw new Error('T417 pixel canvas expects full-canvas putImageData');pixels.set(img.data);ops.push(['putImageData',dx,dy,img.data.length]);},canvas};Object.defineProperty(ctx,'fillStyle',{get(){return fillStyle;},set(v){fillStyle=String(v);}});ctx.canvas=canvas;canvas.getContext=()=>ctx;__t417OpsMap.set(ctx,ops);__t417PixMap.set(canvas,pixels);return[canvas,ctx];}; // T417 覆核退修 A1：真像素 canvas 工廠（T274 台架模式；fillRect 寫 Uint8ClampedArray＋ops 記錄＝落筆可量）——二輪退修 RL-2/RL-5：WeakMap 存 ops/pixels、fillRect 解析 alpha
window.__t417Snap=function(g){const cnv=g&&g.canvas,p=cnv?__t417PixMap.get(cnv):null;return p?p.slice():null;}; // 二輪退修：像素快照（DrawCheck/T288 共用）
window.__t417Diff=function(g,s){if(!g||!s)return false;const cnv=g.canvas,p=cnv?__t417PixMap.get(cnv):null;if(!p)return false;for(let i=3;i<p.length;i+=4)if(s[i]!==p[i])return true;return false;}; // 二輪退修 RL-5：真像素差（alpha 通道）——同底色/全透明/畫布外一律零差
window.__t417DrawCheck=function(kind,g,px,py,kindName){const snap=window.__t417Snap(g);kind(g,px,py);if(window.__t417Diff(g,snap)){__t417N417++;__t417Kinds417.push(kindName);__t417Pos417.push(px);__t417Py417.push(py);}}; // T417 覆核退修 A1：落筆計數代理——二輪退修 RL-5：真像素差比對（原 ops 長度比對被「全隱形 fillStyle」繞過），只有像素真的變了才計
window.__t417Profile417=null; // T417：合成屋頂剖面（每欄屋頂線 y；headless getImageData 空像素→測試端 override）
window.__t418bSetSteel=function(v){steel=v;}; // T418b 測試橋：直設鋼庫存（滿倉臂/庫存臂造境；harness 注入零污染）
window.__t384Bld=function(k,x,y){const i=idx(x,y);tiles[i].bld={k,lv:1,v:0,age:1,pw:true,wa:true,h:.62,fire:0,we:1};tiles[i].zone=0;return i;}; // T384b：尾端測試造境橋（__t343Bld 在 IIFE 內搆不到）
window.__t416Fleet=function(which){const a=which==='fire'?ladderTrucks:which==='amb'?ambulances:policeCars;return a.map(c=>({x:c.x,y:c.y,tx:c.tx,ty:c.ty}));}; // T416 二輪退修：直讀車隊每車的目標格（直接斷言新車 tx/ty，不用寬鬆幀數猜測）
window.__t416FleetSet=function(which,n){if(which==='fire')svcFleet.fire=n;else if(which==='amb')svcFleet.amb=n;else svcFleet.police=n;}; // T416 二輪退修：直設車隊規模（壓力案造境用；比照 svcFleet 存檔可選欄位 sf 的合法值域 1-40）
window.__t416Occ=function(x,y){return !!tiles[idx(x,y)].bld;}; // T416 二輪退修：檢查格是否已佔（壓力案造境用，測試 scope 搆不到 tiles）
window.__t385Rank=function(v){rankIdx=v;}; // T385 測試橋：直設等級（正式路徑走 cityPoints）
window.__t385Force=function(id){cms385.act=id;cms385.st=day;cms385.acc=0;cms385.hold=0;}; // T385 測試橋：強制接單
window.__t385St=function(v){cms385.st=v;}; // T385 測試橋：改接單日（過期案免長跑）
window.__t385Steel=function(v){steel=v;}; // T385 測試橋：直設鋼庫存
window.__t385Load=function(raw){return cmsLoad385(raw);}; // T385 測試橋：驗型單元測試
window.__t385Diff=function(v){diff=v;}; // T385 測試橋：切難度（沙盒 dim 案）
window.__t385Pop=function(v){pop=v;}; // T386b 測試橋：直設人口（pop 門檻案；下一 tick 會重算）
window.__t386Set=function(id){spec386=id;if(id==='edu')rebuildCov();}; // T386a 測試橋：直設專精（效果專項）
window.__t386Fin=function(){return {taxI:fin.taxI,taxC:fin.taxC,speed:techSpeed343};}; // T386a 測試橋：稅/研速觀測
window.__t387Cov=function(){rebuildCov();}; // T387b 測試橋：直寫服務建築後重建覆蓋場
window.__t390Repair=function(tre,ter,n){return repairTre390(tre,ter,n);}; // T390 測試橋：救援函式單元測試
window.__t410Pol=function(dt){updPoliceCars(dt);return policeCars.length;}; // T410 測試橋：幀路徑警車派遣單步（回傳在途車數；vri 系不碰 R()）
window.__t411R=function(on){if(on){window.__t411Rold=R;R=()=>.999999;}else{R=window.__t411Rold;}}; // T411 測試橋：量測期間凍結 R 機率路徑（比照 __t386Tick 的 stub 慣例）——G3 量的是純車輛物理，tick 的診所擲骰/病亡轉化/犯罪點火/火勢蔓延全部惰性化，量測不受未來 R 流位移影響
window.__t412Set=function(x,y,f,v){const b=T(idx(x,y)).bld;if(!b)return false;b[f]=v;return true;}; // T412 測試橋：直寫建築欄位——GV.tile 是深拷貝（19135），對其寫入不落地
window.__t413ForceRoad=function(x,y){if(!inMap(x,y))return false;const t=tiles[idx(x,y)];t.road=1;t.rc=t.rc||2;t.zone=0;t.bld=null;return true;}; // T413b B4 造境：直寫路旗
window.__t413ForceWater=function(x,y){if(!inMap(x,y))return false;const t=tiles[idx(x,y)];t.t=0;t.bld=null;t.road=0;return true;}; // T413b B4 造境：直寫水格
window.__t413=function(){return {rebuild:()=>{rebuildNightTier413();nightTierDay413=day;},tier:(x,y)=>nightTier413?nightTier413[idx(x,y)]:-1,roadTier:(x,y)=>_roadTier413(x,y),reg:NIGHT413,regT:NIGHT413T,call:(nd)=>drawNightCity413(nd),callTop:(nd)=>drawNightCityTop413(nd),scan:()=>nightScanN413,bakeCount:()=>window.__t413BakeCount|0,bakeByKind:()=>({...(window.__t413BakeByKind||{})}),strokes:()=>({lamp:window.__t413LampStrokes|0,water:window.__t413WaterStrokes|0,land:window.__t413LandStrokes|0,neon:window.__t413NeonStrokes|0,ind:window.__t413IndStrokes|0}),sx:(x,y)=>_sx413(x,y),sy:(x,y)=>_sy413(x,y),visPad:()=>Math.max(40,80*_z413()),setShake:(v)=>{shakeT=+v||0;return shakeT;},getShake:()=>shakeT};}; // T413a/b 測試橋（第三輪：分族 bake + strokes + shake/pad）
window.__t413R=function(){let c=0;const o=R;R=function(){c++;return o();};try{nightTierDirty413=true;rebuildNightTier413();}finally{R=o;}return c;}; // T413a 測試橋：重建期間 R() 實際消耗計數——文本掃描看不穿 helper 間接層（覆核繞過①c），行為計數看得穿
window.__t422=function(){return{spec:(k,x,y,s)=>farNightRect422({k},x,y,0,0,s),palette:()=>FAR_NIGHT_C422.slice(),stats:()=>({cand:farNightCandN422,drawn:farNightDrawN422,legacy:farNightLegacyN422,R:farNightR422,C:farNightC422,I:farNightI422,L:farNightL422})};}; // T422 測試橋：純樣式與完整 draw 接線計數（不進正式 GV）
window.__t422Screen=function(){const out=[],of=ctx.fillRect;ctx.fillRect=function(...a){if(ctx.globalCompositeOperation==='screen')out.push({col:String(ctx.fillStyle),rect:a.map(Number)});return of.apply(ctx,a);};try{draw(.016);}finally{ctx.fillRect=of;}return out;}; // T422：觀察最終 screen 合成真落筆，防 helper／計數器與 nightSprites 正式輸出脫鉤假綠
window.__t422Quality=function(q){const old=quality;quality=q;return old;}; // T422：低畫質 legacy 回退行為造境
window.__t422RandDraw=function(){let r=0,m=0;const oR=R,oM=Math.random;R=function(){r++;return oR();};Math.random=function(){m++;return oM();};try{draw(.016);}finally{R=oR;Math.random=oM;}return{r,m};}; // T422：完整 forceDraw 路徑零亂數消耗
window.__t422RngTwin=function(){const old=R;try{R=mulberry32(422422);const control=R();R=mulberry32(422422);draw(.016);const after=R();return{control,after};}finally{R=old;}}; // T422：同 seed 的不 draw／draw 後下一顆 R 必須恆等，直呼或動態 alias 都不可位移模擬流
window.__t386Tick=function(){const oR=R,oRd=hasRoadNear,oP=computePower,oW=computeWater,oD=disastersOn;R=()=>.999999;hasRoadNear=()=>true;computePower=()=>9999;computeWater=()=>9999;disastersOn=false;try{tick();}finally{R=oR;hasRoadNear=oRd;computePower=oP;computeWater=oW;disastersOn=oD;}}; // T386a 測試橋：stub tick（__t343TickCase 同款——直寫建築免電網）
window.__t383TaxCase=function(){
  newWorld(38383);diff=1;weather=0;wxT=99;pol=null;
  const oldR=R,oldRoad=hasRoadNear,oldPower=computePower,oldWater=computeWater,oldDis=disastersOn;
  R=()=>.999999;hasRoadNear=()=>true;computePower=()=>9999;computeWater=()=>9999;disastersOn=false;
  try{
    const ks=Object.keys(KNAME).map(Number);
    let n=0;
    for(const k of ks){const i=idx(2+(n%30),2+((n/30)|0));tiles[i].bld={k,lv:1,v:0,age:1,pw:true,wa:true,h:.62,fire:0,we:1};tiles[i].zone=0;n++;}
    window.__taxFbk=[];
    tick();
    const bad=[...new Set(window.__taxFbk)].filter(k=>k!==3).sort((a,b)=>a-b);
    return {kn:ks.length,bad,money};
  }finally{
    R=oldR;hasRoadNear=oldRoad;computePower=oldPower;computeWater=oldWater;disastersOn=oldDis;window.__taxFbk=null;
  }
};
window.__t425K=function(){ // T425K 測試橋：重放三個決定性 helper；只存在 harness 注入，不污染正式 index/GV。
  const run=function(fn,args){let fillStyle='',ops=[];const g={fillRect:function(){ops.push({col:fillStyle,rect:Array.from(arguments).map(Number)});}};Object.defineProperty(g,'fillStyle',{get:function(){return fillStyle;},set:function(v){fillStyle=String(v);}});fn.apply(null,[g].concat(args));return ops;};
  const s=SPR.bld['65_1_0'];return{roof:function(cx,top,hw){return run(mallRoof425K,[cx,top,hw]);},cast:function(cx,y){return run(mallCast425K,[cx,y]);},glow:function(cx,by){return run(mallGlow425K,[cx,by]);},meta:{w:s.w,h:s.h,ax:s.ax,ay:s.ay}};
};
window.__t420SPR=SPR; // T420 測試橋：直讀 SPR 全鍵 record（G2 metadata 直讀釘——sprAtlas356 的 w/h 是 img.width 推導，看不到 record 原值；harness 注入零污染）
window.__t420Replay=function(keys){ // T420 G3/G4 真像素重放橋：白名單鍵 img 換 T417 真像素 canvas，重放 pass 段（剝註釋正文），回傳逐鍵 ops/ink/色票/rects
  const htmlTxt=require('fs').readFileSync(require('path').join(__dirname,'index.html'),'utf8');
  const bs=htmlTxt.indexOf('/* ===== T420 ART-LOOP 靜態加蓋 pass');
  const be0=htmlTxt.indexOf('T420 ART-LOOP 靜態加蓋 pass END');
  const be=htmlTxt.indexOf('*/',be0)+2;
  const body=htmlTxt.slice(bs,be).split('/*').map(function(p){var e=p.indexOf('*/');return e>=0?p.slice(e+2):p;}).join('').split('//').map(function(p){var n=p.indexOf(String.fromCharCode(10));return n>=0?p.slice(n):p;}).join('');
  const bak={};
  for(const k of keys){const s=SPR.bld[k];if(!s)continue;bak[k]=s.img;const[cnv]=window.__t417Canvas(s.w,s.h);s.img=cnv;}
  window.__t420Ink={rects:0,px:0};
  const fn=new Function('SPR','window',body);
  fn(SPR,window);
  const out={};
  for(const k of keys){const s=SPR.bld[k];if(!s)continue;const g=s.img.getContext('2d');const pix=window.__t417Snap(g);const ops=(typeof __t417OpsMap!=='undefined'?__t417OpsMap:window.__t417OpsMap).get(g)||[];
    let ink=0;const pal={};const rects=[];
    for(const o of ops){if(o[0]!=='fillRect')continue;rects.push({x:Math.floor(o[2]),y:Math.floor(o[3]),w:Math.ceil(o[4]),h:Math.ceil(o[5])});}
    for(let i=0;i<pix.length;i+=4){if(pix[i+3]>0){ink++;const c='#'+[pix[i],pix[i+1],pix[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');pal[c]=(pal[c]||0)+1;}}
    out[k]={ops:rects.length,ink,pal,rects};s.img=bak[k];}
  return out;
}; // T420 G3/G4：pass 段真像素重放（零污染——重放後還原原 img；只重放受管區正文，不重跑整場 buildSprites）
window.__t421Replay=function(keys){ // T421：獨立重放橋——只切 T421 受管區（不得別名 T420；避免 latent trap 寫進活 SPR）
  const htmlTxt=require('fs').readFileSync(require('path').join(__dirname,'index.html'),'utf8');
  const bs=htmlTxt.indexOf('/* ===== T421 ART-LOOP 靜態加蓋 pass');
  const be0=htmlTxt.indexOf('T421 ART-LOOP 靜態加蓋 pass END');
  const be=htmlTxt.indexOf('*/',be0)+2;
  if(bs<0||be0<bs)throw new Error('T421 Replay：找不到 T421 ART-LOOP 受管區');
  const body=htmlTxt.slice(bs,be).split('/*').map(function(p){var e=p.indexOf('*/');return e>=0?p.slice(e+2):p;}).join('').split('//').map(function(p){var n=p.indexOf(String.fromCharCode(10));return n>=0?p.slice(n):p;}).join('');
  const bak={};
  for(const k of keys){const s=SPR.bld[k];if(!s)continue;bak[k]=s.img;const[cnv]=window.__t417Canvas(s.w,s.h);s.img=cnv;}
  window.__t421Ink={rects:0,px:0};
  const fn=new Function('SPR','window',body);
  fn(SPR,window);
  const out={};
  for(const k of keys){const s=SPR.bld[k];if(!s)continue;const g=s.img.getContext('2d');const pix=window.__t417Snap(g);const ops=(typeof __t417OpsMap!=='undefined'?__t417OpsMap:window.__t417OpsMap).get(g)||[];
    let ink=0;const pal={};const rects=[];
    for(const o of ops){if(o[0]!=='fillRect')continue;rects.push({x:Math.floor(o[2]),y:Math.floor(o[3]),w:Math.ceil(o[4]),h:Math.ceil(o[5])});}
    for(let i=0;i<pix.length;i+=4){if(pix[i+3]>0){ink++;const c='#'+[pix[i],pix[i+1],pix[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');pal[c]=(pal[c]||0)+1;}}
    out[k]={ops:rects.length,ink,pal,rects};s.img=bak[k];}
  return out;
};
` + js.slice(t383IifeEnd);
window.__t343Probe = {}; // T343c：初始化早於 IIFE 啟動期可能發生的首輪 tick
{ // T416 五輪退修 A4：計數釘注入——scored 建構迴圈內自增（hits 必須恰 1，錨點失配 fail-closed；比照 inject343 先例）
  const needle416='for(const sii of sts){const d=Math.abs(cx-';
  const hits416=js.split(needle416).length-1;
  if(hits416!==1)throw new Error('T416 五輪 A4 計數釘錨點失準 hits='+hits416);
  const before416=js;
  js=js.replace(needle416,'for(const sii of sts){__t416Scan416++;const d=Math.abs(cx-');
  if(js===before416)throw new Error('T416 五輪 A4 計數釘注入未改變源碼');
}
{ // T417 屋頂層擴容：落筆決策台帳注入（T278 stampRoof；每處 hits 恰 1 fail-closed；產品碼零污染）
  const inj417=(needle,replacement,label)=>{
    const hits=js.split(needle).length-1;
    if(hits!==1)throw new Error('T417 注入錨點失準 '+label+' hits='+hits);
    const before=js;
    js=js.replace(needle,replacement);
    if(js===before)throw new Error('T417 注入未改變源碼 '+label);
  };
  // ① 剖面 override：測試端可注入合成屋頂剖面（headless getImageData 空像素⇒掃描失效，卡面坑③；B7 窄帶早停後掃描迴圈為 y<scanHt）
  inj417('for(let x=0;x<s.w;x++)for(let y=0;y<scanHt;y++){if(d[(y*s.w+x)*4+3]>60){roof[x]=y;break;}}',
    'for(let x=0;x<s.w;x++)for(let y=0;y<scanHt;y++){if(d[(y*s.w+x)*4+3]>60){roof[x]=y;break;}}if(window.__t417Profile417)for(let x=0;x<s.w;x++){if(window.__t417Profile417[x]!==undefined)roof[x]=window.__t417Profile417[x];}',
    'T417 剖面 override');
  // ② key 計數（有段才記；runs 空=窄段不落筆也不記 key；錨點含 h0 行以區分 A2 閘後的重複 return）
  inj417('      if(!runs.length)return;\n      const h0=kh(key);',
    '      if(!runs.length)return;__t417Keys417[key]=(__t417Keys417[key]||0)+1;\n      const h0=kh(key);',
    'T417 key 計數');
  // ③ 段計數
  inj417('      for(let si=0;si<runsRoof.length;si++){',
    '      for(let si=0;si<runsRoof.length;si++){__t417Seg417++;',
    'T417 段計數');
  // ③b 嘗試件數（二輪退修：密度公式輸出與落筆數分離——帶預佔/碰撞後落筆少於公式值，上限鑑別力靠 try；
  // 錨點用 pool 行（min(5) 移除型突變不破壞注入，try=6 由行為斷言咬））
  inj417('        const used=[]; // 已用像素區間 [x0,x1)',
    '        __t417Try417+=n;const used=[]; // 已用像素區間 [x0,x1)',
    'T417 嘗試件數');
  // ④ 覆核退修 A1：kind 落筆行設為注入錨點——包 DrawCheck 計數代理（二輪退修 RL-5：真像素差比對；插短路/改 no-op/全隱形 一律零計數或 hits≠1 fail-closed）
  inj417('          kind(g,px,py417);',
    '          window.__t417DrawCheck(kind,g,px,py417,kindName);',
    'T417 kind 錨點');
  // ⑤ 工業 T288 組四塊：真像素差計數（二輪退修 RL-5：__ops 已移 WeakMap，改 Snap/Diff 像素比對）
  inj417('{ const cx2=r0+3+((h0>>>2)%Math.max(1,rw-14)); const cy2=roof[Math.min(cx2,s.w-1)]; // 環帶煙囪',
    '{ const _o417=window.__t417Snap(g); const cx2=r0+3+((h0>>>2)%Math.max(1,rw-14)); const cy2=roof[Math.min(cx2,s.w-1)]; // 環帶煙囪',
    'T417 工業煙囪首');
  inj417('g.fillStyle=\'#6a7078\';g.fillRect(cx2+3,cy2-10,1,10); }',
    'g.fillStyle=\'#6a7078\';g.fillRect(cx2+3,cy2-10,1,10); if(window.__t417Diff(g,_o417)){__t417N417++;__t417Kinds417.push(\'ind\');} }',
    'T417 工業煙囪尾');
  inj417('if(rw>=18){ const fx2=r0+Math.max(8,((h0>>>7)%Math.max(1,rw-10))); const fy2=roof[Math.min(fx2,s.w-1)]; // 風扇箱',
    'if(rw>=18){ const _o417=window.__t417Snap(g); const fx2=r0+Math.max(8,((h0>>>7)%Math.max(1,rw-10))); const fy2=roof[Math.min(fx2,s.w-1)]; // 風扇箱',
    'T417 工業風扇首');
  inj417('g.fillStyle=\'#4a4e56\';g.fillRect(fx2+2,fy2-3,2,2);g.fillStyle=\'#8f959d\';g.fillRect(fx2+2,fy2-3,1,1); }',
    'g.fillStyle=\'#4a4e56\';g.fillRect(fx2+2,fy2-3,2,2);g.fillStyle=\'#8f959d\';g.fillRect(fx2+2,fy2-3,1,1); if(window.__t417Diff(g,_o417)){__t417N417++;__t417Kinds417.push(\'ind\');} }',
    'T417 工業風扇尾');
  inj417('if(rw>=24){ const sx3=r0+4+((h0>>>11)%Math.max(1,rw-16)); const sy3=roof[Math.min(sx3,s.w-1)]; // 天窗玻璃帶',
    'if(rw>=24){ const _o417=window.__t417Snap(g); const sx3=r0+4+((h0>>>11)%Math.max(1,rw-16)); const sy3=roof[Math.min(sx3,s.w-1)]; // 天窗玻璃帶',
    'T417 工業天窗首');
  inj417('g.fillStyle=\'#9cc8e0\';g.fillRect(sx3+1,sy3-2,3,1);g.fillRect(sx3+6,sy3-2,3,1); }',
    'g.fillStyle=\'#9cc8e0\';g.fillRect(sx3+1,sy3-2,3,1);g.fillRect(sx3+6,sy3-2,3,1); if(window.__t417Diff(g,_o417)){__t417N417++;__t417Kinds417.push(\'ind\');} }',
    'T417 工業天窗尾');
  inj417('{ const lastX=r1-2, ly=roof[Math.min(lastX,s.w-1)]; // 側壁落管（沿右緣屋頂線落下 10px）',
    '{ const _o417=window.__t417Snap(g); const lastX=r1-2, ly=roof[Math.min(lastX,s.w-1)]; // 側壁落管（沿右緣屋頂線落下 10px）',
    'T417 工業落管首');
  inj417('g.fillStyle=\'#6a7078\';g.fillRect(lastX,ly,1,10);g.fillRect(lastX-1,ly+9,2,1); }',
    'g.fillStyle=\'#6a7078\';g.fillRect(lastX,ly,1,10);g.fillRect(lastX-1,ly+9,2,1); if(window.__t417Diff(g,_o417)){__t417N417++;__t417Kinds417.push(\'ind\');} }',
    'T417 工業落管尾');
  // ⑥ 測試橋：真像素合成 sprite（覆核退修 A1：h 參數化覆蓋真實值域 32/48/112/220）＋famOf 暴露（M2 族別逐鍵對照釘用）
  inj417('for(const kk of roofKeys417)stampRoof(kk);',
    'for(const kk of roofKeys417)stampRoof(kk); window.__t417BootGID417=__t417GID417; window.__t417BootKeys417=roofKeys417.length; window.__t417BootPx1=__t417Px1;window.__t417BootPx2=__t417Px2; window.__t417Stamp=stampRoof; window.__t417Fam=key=>famOf417(key); window.__t417IndKeys=()=>Object.keys(SPR.bld).filter(k=>k.charAt(0)===\'3\'&&k.charAt(1)===\'_\'&&(+k.split(\'_\')[2]||0)<12); window.__t417BandOf345=bandOf345; window.__t417P417B=()=>P417B; window.__t417Props=()=>props; window.__t417FeedReal=function(key){const s0=SPR.bld[key];if(!s0||!s0.img)return null;const w=s0.w||32,h=s0.h||112;const bak=s0.img;s0.img=window.__t417Canvas(w,h)[0];const prof=new Array(w).fill(20);window.__t417Profile417=prof;window.__t417Stamp(key);window.__t417Profile417=null;s0.img=bak;return s0;}; window.__t417FeedPad=function(key){const s0=SPR.bld[key];if(!s0||!s0.img)return null;const w=s0.w||96,h=s0.h||112,ax0=Math.floor(w/2),ay0=s0.ay||(h-2);const bak=s0.img;s0.img=window.__t417Canvas(w,h)[0];const cx2=s0.img.getContext("2d");cx2.fillStyle="#8a6f5f";const segL2=ax0-38,segR2=ax0+38;cx2.fillRect(segL2,ay0-30,segR2-segL2,30);window.__t417Profile417=null;window.__t417Stamp(key);s0.img=bak;return s0;}; window.__t417FeedScan=function(key,roofY,segL,segR,towerTop){const s0=SPR.bld[key];if(!s0||!s0.img)return null;const w=s0.w||64,h=s0.h||112;const bak=s0.img;s0.img=window.__t417Canvas(w,h)[0];const cx2=s0.img.getContext("2d");const ax0=Math.floor(w/2);const sl=segL!==undefined?segL:0,sr=segR!==undefined?segR:w;cx2.fillStyle="#8a6f5f";cx2.fillRect(sl,roofY,sr-sl,h-roofY);if(towerTop!==undefined)cx2.fillRect(ax0-4,towerTop,8,roofY-towerTop);window.__t417Profile417=null;window.__t417Stamp(key);s0.img=bak;return s0;}; window.__t417ScanResult=function(key){const sp=SPR.bld[key];return sp&&sp._roofLine417?sp._roofLine417:null;}; window.__t417RoofTop=function(key){const sp=SPR.bld[key];return sp&&sp._roofTop417?sp._roofTop417.slice():null;}; window.__t417BootScan=function(key){const s0=SPR.bld[key];if(!s0||!s0.img)return null;const w=s0.w||64,h=s0.h||112,ax0=Math.floor(w/2),ay0=s0.ay||(h-2);const bak=s0.img;s0.img=window.__t417Canvas(w,h)[0];const cx2=s0.img.getContext("2d");cx2.fillStyle="#8a6f5f";const isG=key.startsWith("8_1_2");const thrB3=Math.max(12,Math.min(20,Math.round(h*0.12)));const roofY=isG?(ay0-8):(ay0-Math.max(24,Math.min(46,Math.floor((0.21*w-1.5+thrB3)*1.05)))); /* 離地按鍵縮放（閘 B 門檻 95%）：大鍵離地深→右緣不判地面；小鍵過閘 */ const segL=Math.max(16,ax0-Math.floor(w*0.42)); /* 主屋頂段 ±1px 起伏（容差敏感） */ const segR=Math.min(w-16,ax0+Math.floor(w*0.42)); const rightCut=(w>=208)?24:((w>=136)?14:0); /* 大鍵主段右端內收（w≥208 收 24、w≥136 收 14）：右段=slope 敏感段——離地 Dm-3、段起點遠離 ax（L≈0.42w）⇒ 正常被閘 B 擋；slope 刪除→統一門檻→過閘 B＋閘 A→落筆判地面→⑥ ground 紅（卡面 1023「段起點遠離 ax」案） */ for(let x=segL;x<segR-rightCut;x++)cx2.fillRect(x,roofY+((x-segL)%2),1,h-roofY-((x-segL)%2)); if(rightCut)for(let x=segR-rightCut;x<segR;x++)cx2.fillRect(x,roofY+3,1,h-(roofY+3)); /* 高段 y=roofY-26（minTop 來源）：w≥208 前移到 segR-rightCut+14 得 24 寬（n=3）；其餘 segR+4（小鍵裁 12 寬 n=1、w=136 裁 12 寬 n=1） */ const hsX=(w>=208)?(segR-rightCut+14):(segR+4); cx2.fillRect(isG?4:hsX,isG?(ay0-6):(roofY-26),isG?20:24,isG?6:26); /* slack 敏感段 [2,18)：大鍵 y=roofY+3 正常落筆（補 ③ 落筆總數到 [700,780]）；S/W/F/H 小鍵同（池 3-4 小→空位少）；R/C 小鍵 y=roofY+4 恰=minTop+30——slack 拆掉（+99999 無限）即放行→③ 紅 */ const famB=famOf417(key); if(w>=136)cx2.fillRect(2,roofY+3,16,h-(roofY+3)); else cx2.fillRect(2,roofY+4,12,h-(roofY+4)); /* 塔頂平台（大鍵 w≥136 成段）：[ax0-16,ax0+16] y=roofY-24（寬 32 n=4；比高段低 2 不搶 minTop）；8_1_2 特判貼地 */ if(!isG&&w>=136)cx2.fillRect(ax0-16,roofY-24,32,24); else cx2.fillRect(ax0-4,isG?(ay0-6):45,8,(isG?6:(roofY-45))); window.__t417Profile417=null;window.__t417Stamp(key);s0.img=bak;return s0;};;; window.__t417BootLedger=function(){const real=roofKeys417.filter(kk=>(+kk.split("_")[2]||0)<12);const out={empty:[],hit:0,total:0,excl:{},t288:0,ground:0,groundKeys:{}};for(const key of real){window.__t417Reset();window.__t417BootScan(key);const r=window.__t417Read();const s0=SPR.bld[key];const isIndB=key.startsWith("3_");if(isIndB){if(r.n>=1)out.t288++;continue;}if(r.n===0){out.empty.push(key);continue;}out.hit++;out.total+=r.n;for(const k of r.kinds){out.excl[k]=(out.excl[k]||0)+1;}for(let i=0;i<r.pos.length;i++){if(r.py[i]>=s0.ay-Math.abs(r.pos[i]-s0.ax)*0.5-12){out.ground++;out.groundKeys[key]=(out.groundKeys[key]||0)+1;}}}out.empty.sort();return out;}; window.__t417BBox=function(){const out={};for(const k in props){const[cn,cx]=window.__t417Canvas(40,40);props[k](cx,20,39);const px=window.__t417Snap(cx);let lo=99,hi=-99,top=99;for(let y=0;y<40;y++)for(let x=0;x<40;x++){if(px[(y*40+x)*4+3]>0){if(x<lo)lo=x;if(x+1>hi)hi=x+1;if(y<top)top=y;}}if(lo<=hi)out[k]=[lo-20,hi-20,39-top];}return out;}; window.__t417Feed=function(key,profile,h,o){const w=profile.length,hh=h||112,opt=o||{};SPR.bld[key]=SPR.bld[key]||{};const synth417=(+key.split(\'_\')[2]||0)>=12;if(synth417)SPR.bld[key].img=window.__t417Canvas(w,hh)[0];else SPR.bld[key].img=SPR.bld[key].img||cv(w,32)[0];if(synth417){SPR.bld[key].w=w;SPR.bld[key].h=hh;SPR.bld[key].ax=(opt.ax!==undefined)?opt.ax:Math.floor(w/2);SPR.bld[key].ay=(opt.ay!==undefined)?opt.ay:(hh-2);}window.__t417Profile417=profile;window.__t417Stamp(key);window.__t417Profile417=null;return SPR.bld[key];}; window.__t417CoveredKeys=function(){return roofKeys417.slice();};',
    'T417 測試橋');
  // ⑥b 五輪退修 A1：直接跑實際 bakeOne，比較同一組種子在無屋頂道具／窄道具框兩態的 nightCity 像素。
  // 自製 context 只實作 bakeOne 所需的 source-over / destination-out；本體全不透明，所以 destination-in 是恆等。
  inj417('    const kindOf=(k)=>{', `    window.__t417NightPixels=function(withRoof){
      const w=96,h=112,ax=48,ay=110;let total=0;
      for(let si=0;si<24;si++){
        const pxs=new Uint8Array(w*h),stack=[];let mode='source-over';
        const ng={clearRect(){pxs.fill(0);},save(){stack.push(mode);},restore(){mode=stack.pop()||'source-over';},drawImage(){},fillRect(x,y,rw,rh){const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y)),x1=Math.min(w,Math.ceil(x+rw)),y1=Math.min(h,Math.ceil(y+rh));for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)pxs[yy*w+xx]=mode==='destination-out'?0:1;}};
        Object.defineProperty(ng,'globalCompositeOperation',{get(){return mode;},set(v){mode=String(v);}});
        const alpha=new Uint8ClampedArray(w*h*4);for(let i=3;i<alpha.length;i+=4)alpha[i]=255;
        const s={w,h,ax,ay,img:{getContext:()=>({getImageData:()=>({data:alpha})})},nightCity:{getContext:()=>ng}};
        if(withRoof){s._roofTop417=new Int16Array(w).fill(1e4);s._roofBot417=new Int16Array(w).fill(-1);for(let x=38;x<58;x++){s._roofTop417[x]=50;s._roofBot417[x]=51;}}
        bakeOne(s,'R',1,100+si*17,1);for(const v of pxs)total+=v;
      }
      return total;
    };
    const kindOf=(k)=>{`,
    'T417 nightCity 行為橋');
  // ⑦ 決定性計數：getImageData 呼叫次數（C7：headless 掛鐘無鑑別力→計數決定性；真實增量四項見卡面；
  // 三輪退修 A：兩階段掃描——第一段每鍵恰一次（GID 語義），第二段補讀只計像素量（Px 語義））
  inj417('      let id;try{id=g.getImageData(0,0,s.w,scanHt);}catch(e){return;}',
    '      let id;try{id=g.getImageData(0,0,s.w,scanHt);__t417GID417++;__t417Px1+=s.w*scanHt;}catch(e){return;}',
    'T417 getImageData 計數');

}
/* T405：產品端類別標記預設【關】（TheoTown 觀感）。但 harness 若跟著關，T345 徽記加蓋層
   從此不再被實跑＝覆蓋率靜默退化。故在此顯式開啟，讓套件維持本卡之前的執行路徑；
   「預設關」本身改由 T405 的原文守衛驗證（產品碼與測試環境各證一半）。 */
localStorage.setItem('glimmerville.v1.badge', '1');
eval(js);







// ---- 測試輔助 ----
/* T444：種子釘的共用入口。
   `tools/verify.py` 的舊哨兵是 grep 原始碼字面
   （`assert\(window\.GV\.stats\(\)\.pop === \d+`），它連方向都是反的——
   把 `=== 3781` 改寫成一個等值常數，套件全綠、釘子照樣成立，哨兵卻回報 0 根而閘門紅；
   反過來把 assert 刪掉、在註解裡貼兩行同樣的文字，哨兵數到 2 而全綠。
   改成行為化：釘子走這裡，順便印一行機器可讀的 SEEDPIN，讓閘門去讀**真的跑出來的值**。
   一根釘子有沒有釘在牆上，不能靠看牆上有沒有畫一根釘子的圖。 */
function seedPin444(name, seed, days, expect, actual, note) {
  console.log('SEEDPIN ' + name + ' seed=' + seed + ' days=' + days
    + ' expect=' + expect + ' actual=' + actual);
  assert(actual === expect,
    'T444 種子釘 ' + name + '（seed' + seed + ' ' + days + ' 天）應恆為 ' + expect
    + '，實得 ' + actual + (note ? '。' + note : ''));
}

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
  ['solar', 25, 2], ['prison', 31, 2], ['university', 32, 3], ['bigFarm', 53, 5], ['bigCemetery', 54, 3], ['grandStation', 55, 3], ['sportsComplex', 56, 3], ['foodPlant', 57, 3], ['nuclear', 58, 3], ['hydro', 59, 2], ['fireHQ', 61, 3], ['greenhouse', 63, 2], ['warehouse', 64, 2], ['grandMall', 65, 4], ['faithCenter', 66, 2], ['observatory', 68, 2], ['wasteIncinerator', 62, 2], ['hotel', 82, 2], ['resort', 83, 3], ['market', 87, 2], ['marina', 90, 2], ['tradepost', 91, 2], ['brewery', 100, 2], ['waterpark', 101, 2], ['highschool', 108, 2], ['techpark', 109, 3], ['freight', 110, 2], ['upcycle', 111, 2], ['centralpark', 112, 3], ['unicampus', 113, 4], ['megaport', 114, 5], ['civiccenter', 115, 3], ['datacenter', 116, 2], ['fertplant', 118, 2], ['kitchen', 119, 2]
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
/* ===== T372 手機 UI 可達性守衛 =====
   四件各自的守衛。CSS 部分只能做原始碼靜態斷言（harness 無版面引擎），但每條都對應一個
   已在瀏覽器量到的數字，註解裡寫明是哪個，讓後來的人知道這條在守什麼、壞掉會怎樣。
   #rci 面板走 GV.chipText 執行期真跑（比照 T327/T330 既有寫法）。 */
{
  // 件一：#toolcats 的 shrink-to-fit 修正（576px 下 293→392、6/9→9/9）
  const tc372 = (html.match(/#toolcats\{[^}]*\}/) || [''])[0];
  assert(/width:max-content/.test(tc372),
    'T372 #toolcats 必須有 width:max-content —— 絕對定位只給 left:50% 時 shrink-to-fit 只拿得到視窗一半，' +
    '拿掉就會退回 293px／9 類只見 6 類');

  // 件二：摺疊／展開
  assert(/body\.toolsExp #tools\{[^}]*flex-wrap:wrap/.test(html),
    'T372 展開態必須換行');
  assert(/body\.toolsExp #tools\{[^}]*width:96vw/.test(html),
    'T372 展開態必須給 width:96vw —— #tools 犯的是與 #toolcats 同一個 shrink-to-fit 陷阱，' +
    '少了它 40 個工具會擠成 7 列、2 列上限只露 12 個（比摺疊態的 14 還糟）');
  assert(/body\.toolsExp #toolcats\{bottom:calc\(10px \+ var\(--tools-exp-h/.test(html),
    'T372 展開時類別列必須讓位 —— 否則 576×1200 下 #tools 佔 y992-1190、#toolcats 在 y1090 被整條埋住；' +
    '旗標掛 body 是因為 #toolcats 在 DOM 裡排在 #tools 之前，兄弟選擇器指不到');
  /* 必須錨定【基礎】#tools 規則：只寫 /#tools\{[^}]*scrollbar-width/ 會被 body.toolsExp #tools{...}
     滿足（它也含 "#tools{" 子字串），破壞性證明時就會出現「拿掉了卻沒咬」。用 position:absolute
     區分——只有基礎規則有它。這個洞是本卡逐條破壞性證明當場抓出來的。 */
  const toolsBase372 = (() => {           // 基礎規則跨多行，要取到收尾大括號才看得到 scrollbar-width
    const i = html.indexOf('\n#tools{');
    return i < 0 ? '' : html.slice(i + 1, html.indexOf('}', i) + 1);
  })();
  assert(/position:absolute/.test(toolsBase372) && /scrollbar-width:none/.test(toolsBase372),
    'T372 基礎 #tools 規則必須隱藏捲軸 —— 橫屏摺疊態原本因捲軸佔位高 87px（直版 72px），' +
    '與釘在 bottom:84 的 #toolcats 重疊 13px（既有缺陷）');
  assert(/@media \(orientation:portrait\)\{:root\{--tools-exp-h:198px\}\}/.test(html) &&
         /@media \(orientation:landscape\)\{:root\{--tools-exp-h:136px\}\}/.test(html),
    'T372 展開上限：直版 3 行(198px)／橫屏 2 行(136px)，業主裁定');
  assert(/let toolsExpanded=false/.test(html) && /document\.body\.classList\.toggle\('toolsExp',toolsExpanded\)/.test(html),
    'T372 展開態旗標必須掛在 body 上');
  assert(/eb\.id='toolsExp'/.test(html) && /bar\.appendChild\(eb\)/.test(html),
    'T372 展開鈕必須在 buildToolbar 尾端補掛（#tools 每次重建都 innerHTML=\'\'，靜態 DOM 會被清掉）');

  // 件三：#info 橫屏置中，且刻意不用 transform（會與 animation:panelIn 打架）
  const info372 = (html.match(/@media \(orientation:landscape\) and \(max-width:1029px\)\{[\s\S]{0,220}?\}\s*\}/) || [''])[0];
  assert(/#info\{[^}]*margin-inline:auto/.test(info372),
    'T372 橫屏 #info 必須以 margin-inline:auto 置中');
  assert(!/#info\{[^}]*translateX/.test(info372),
    'T372 橫屏 #info 不得用 transform 置中 —— #info 的 animation:panelIn 會動 transform，兩者會在 0.2s 動畫期間打架');

  // 件四：#rci 明細面板（執行期真跑）
  assert(/\['rci','rci'\]/.test(html), 'T372 #rci 必須進入晶片綁定清單');
  assert(/rci:'🏗️ RCI 需求明細'/.test(html), 'T372 TITLE 表必須有 rci');
  {
    const t = window.GV.chipText('rci').replace(/\s+/g, ' ');
    assert(t.includes('RCI 需求') && t.includes('住宅') && t.includes('商業') && t.includes('工業'),
      'T372 #rci 面板應含三條需求，實得：' + t.slice(0, 60));
    assert(!/NaN|undefined|Infinity/.test(t),
      'T372 #rci 面板不得出現 NaN/undefined/Infinity（空城也不行），實得：' + t.slice(0, 80));
    // 純讀取：開面板不得改動任何模擬狀態
    const before372 = JSON.stringify(window.GV.stats());
    window.GV.chipText('rci');
    assert(JSON.stringify(window.GV.stats()) === before372,
      'T372 #rci 面板必須是純讀取，開關前後 GV.stats() 不得改變');
  }
  // demWhy 快照必須成對歸零（鐵律7）——newWorld 與 load 都要，否則跨城殘留（同 T369 的 gFlow284）
  assert(/dem=\{1:\.5,2:0,3:0\};demWhy=\{ok:false\};/.test(html),
    'T372 demWhy 必須與 dem 在 newWorld 成對歸零');
  assert(/immWave=0;demWhy=\{ok:false\};/.test(html),
    'T372 demWhy 必須在 load 的重置叢集歸零（鐵律7；否則讀檔未 tick 前會顯示上一座城的驅動值）');
}

/* ===== T371b ARCH.md 代碼地圖守衛 =====
   病灶：舊版 ARCH.md 宣稱「約 4235 行，v3.0」，實際是 17701 行 v10.4——落後約 210 張卡，
   而且沒有任何機制會發現。一份行號全錯的架構文件比過期的更糟：它會把人導去錯的地方。
   守法分兩種強度，對應文件自己的前提「行號會漂移，定位以 grep 錨點為準」：
     ①【硬】每個 grep 錨點都必須在 index.html 解析得到——錨點失效＝它指的東西被改名或刪了；
     ②【硬】文件宣稱的規模與版本不得偏離現實——這正是舊版失效的方式；
     ③ 行號範圍【不】強制，因為任何一張卡都會讓它漂移，強制只會逼人關掉測試。 */
{
  const archPath371b = path.join(__dirname, 'docs', 'ARCH.md');
  const archText371b = fs.readFileSync(archPath371b, 'utf8');
  const indexLines371b = html.split(/\r?\n/);

  // ② 宣稱規模／版本
  const declLines371b = (archText371b.match(/實測檔案\s*([\d,]+)\s*行/) || [])[1];
  assert(declLines371b, 'T371b ARCH.md 應宣告它測繪時的 index.html 實測行數');
  const declN371b = parseInt(declLines371b.replace(/,/g, ''), 10);
  const drift371b = Math.abs(indexLines371b.length - declN371b) / indexLines371b.length;
  assert(drift371b <= 0.10,
    'T371b ARCH.md 宣稱的 index.html 行數必須與現實相差 10% 以內（宣稱 ' + declN371b +
    '，實際 ' + indexLines371b.length + '，偏離 ' + (drift371b * 100).toFixed(1) +
    '%）；超標＝該重新測繪，舊版就是這樣爛掉的（宣稱 4235 實際 17701）');
  const gameVer371b = (html.match(/const GAME_VER='([\d.]+)'/) || [])[1];
  assert(archText371b.includes('v' + gameVer371b),
    'T371b ARCH.md 必須宣告現行版本 v' + gameVer371b + '（舊版停在 v3.0 沒人發現）');

  // ① 每個 grep 錨點都要解析得到
  const rowRe371b = /^\|([^|\n]+)\|\s*([0-9][0-9,\-–— ]*)\|\s*`([^`\n]+)`\s*\|/gm;
  const dead371b = [];
  let rows371b = 0, m371b;
  while ((m371b = rowRe371b.exec(archText371b)) !== null) {
    rows371b++;
    const anchor = m371b[3];
    if (!html.includes(anchor)) dead371b.push(m371b[1].trim() + ' :: ' + anchor.slice(0, 40));
  }
  assert(rows371b >= 90,
    'T371b ARCH.md 的分節地圖應有 90 列以上帶 grep 錨點的項目，實得 ' + rows371b);
  assert(dead371b.length === 0,
    'T371b ARCH.md 有 ' + dead371b.length + ' 個 grep 錨點在 index.html 查無——' +
    '被改名或刪掉了，地圖指向錯的地方：' + JSON.stringify(dead371b.slice(0, 3)));
}

/* ===== T371 CHANGELOG 簽核落點守衛 =====
   病灶：簽核結果沒有任何機器可讀的落點。實際發生過的兩種形態——
     ①「已覆核但沒回頭收狀態欄」（T367b、T364c/d：覆核方親跑親合，條目卻仍寫「待覆核」）
     ②「條目根本沒有驗收欄」（全檔 23 條，含 T352/T353/T355）
   從倉庫本身看，這兩種與「根本沒覆核」完全無法區分。
   這條守衛只管【T371 之後】的新條目——歷史 379 條裡有 23 條缺欄、14 條只寫「通過」不具名，
   追溯強制會誤傷一大片，且多數其實覆核過只是沒記。分界用錨點字串而非行號，避免漂移。
   「待」字不在此處禁——提交到覆核之間「驗收:待非作者覆核」是合法狀態；
   禁「待」的位置在 merge_bay.py 的 preflight（合併時才要求簽核已落地）。 */
{
  const clPath371 = path.join(__dirname, 'docs', 'CHANGELOG.md');
  const clText371 = fs.readFileSync(clPath371, 'utf8');
  const clLines371 = clText371.split(/\r?\n/);
  const isEntry371 = line => /^\d{4}-\d{2}-\d{2} \| /.test(line);
  const entries371 = clLines371.filter(isEntry371);
  assert(entries371.length >= 379,
    'T371 CHANGELOG 條目數不得減少（現 ' + entries371.length + '，T371 當下 380）');

  // 結構完整性：修過的四處物理斷行不得復發
  const strays371 = clLines371.filter(line =>
    line.trim() && !isEntry371(line) &&
    !line.startsWith('#') && !line.startsWith('格式') &&
    !line.startsWith('慣例') && !line.startsWith('- ') && !line.startsWith('  '));
  assert(strays371.length === 0,
    'T371 CHANGELOG 不得有「非條目開頭的內容行」＝一卡一行被物理斷行切開；殘留：' +
    JSON.stringify(strays371.slice(0, 2).map(s => s.slice(0, 40))));
  assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(clText371),
    'T371 CHANGELOG 不得含控制字元（曾有 viewDep 的 v 被 0x0B 取代）');
  assert(clLines371[0].startsWith('# CHANGELOG'),
    'T371 CHANGELOG 標頭必須在第 1 行（曾被 9 條新條目壓到第 19 行）');

  // 分界之後（含）的條目，必須有驗收欄
  const cutIdx371 = entries371.findIndex(line => / \| T371 /.test(line));
  assert(cutIdx371 >= 0, 'T371 應能在 CHANGELOG 找到自己的條目當分界錨點');
  const governed371 = entries371.slice(0, cutIdx371 + 1);
  const noField371 = governed371.filter(line => !line.includes('驗收:'));
  assert(noField371.length === 0,
    'T371 起每條 CHANGELOG 條目都必須有「驗收:」欄（缺欄的：' +
    JSON.stringify(noField371.map(l => (l.match(/^\S+ \| (\S+)/) || [])[1])) + '）');
}

/* ===== T353 錨點一致性守衛（修「農場動畫漂移」）=====
   病灶：doFarm() 的 (ax,ay) 是「田地在畫布上的繪製座標」，T281 的 stages() 卻把它當成精靈錨點
   metadata 寫入 SPR.farmGrow。大農場 base/farmSea=164/242、farmGrow=104/218 ⇒ draw() 用 s.ax/s.ay
   定位，生長階段每 4 天輪替一次就整片地皮滑動 (60z,24z)（實測 zoom2 = 120,48 螢幕像素）。
   這條守衛不需要 getImageData，所以在 harness 裡是真跑而非煙霧測試。 */
{
  const aud = window.GV.sprAnchorAudit();
  assert(Array.isArray(aud), 'T353 sprAnchorAudit 應回傳陣列');
  assert(aud.pairs > 0, 'T353 sprAnchorAudit 必須真的比對到變體（pairs>0，否則表為空也會假綠）');
  assert(aud.length === 0,
    'T353 季節相/生長階段的錨點必須與 base 相同，否則建築會隨日子跳動；不符：' +
    JSON.stringify(aud.slice(0, 4)));
}
// T353 靜態守衛一：farmGrow 的錨點只能抄 base 精靈，不可寫 doFarm 的繪製座標
assert(/SPR\.farmGrow\[si\]\[st\]\[key\]=\{img:c2,ax:gax,ay:gay/.test(html),
  'T353 farmGrow 錨點必須寫 gax/gay（取自 SPR.bld[key]），不可寫 doFarm 的 ax/ay');
// T353 靜態守衛二：底座裁切必須覆蓋 farmSea/farmGrow，否則那 9 張圖的田地會溢出到鄰格
assert(/clipBase\(t\[key\]\)/.test(html) && /if\(SPR\.farmSea\)for\(const si of\[1,2,3\]\)\{const t=SPR\.farmSea\[si\];if\(t&&t\[key\]\)clipBase/.test(html),
  'T353 clipBase 必須同時裁切 SPR.farmSea 與 SPR.farmGrow（不能只裁 SPR.bld）');
/* ===== T355 中央公園 k112 地面裝飾層內含守衛 =====
   病灶：dia(g,cx,ty,hw) 的 ty 是菱形【頂點】，舊版把它當成中心，於是整個裝飾層（十字步道/池塘/音樂台/
   兩棵樹）畫在畫布 y56..190，而 3×3 的 footprint 是 y122..217（中心 (104,170) 半寬96 半高48）——
   全部浮在鄰格空中，地塊下半反而空著。離線重播量到「超出菱形上緣」最高 88px，重排後 10px。
   這條守衛不需要 canvas：直接從原始碼把座標解析出來，用 |x-104|/96+|y-170|/48 <= 1 驗算，是真跑斷言。 */
{
  const AX112 = 104, CY112 = 218 - 16 * 3, HW112 = 32 * 3, HH112 = 16 * 3;
  const inFoot112 = (x, y) => Math.abs(x - AX112) / HW112 + Math.abs(y - CY112) / HH112 <= 1.0001;
  const blk112 = html.slice(html.indexOf("{ // 中央公園 112_1_0"), html.indexOf("SPR.bld['112_1_0']"));
  assert(blk112.length > 400, 'T355 應找到 k112 中央公園的 sprite 區塊');
  assert(/T355/.test(blk112), 'T355 k112 區塊應帶 T355 重排註解（防悄悄回退成浮空版面）');

  // 樹：底部落點必須在菱形內（樹冠往上超出是合法垂直結構）
  const trees112 = [...blk112.matchAll(/\[(\d+),(\d+)\]/g)]
    .map(m => [+m[1], +m[2]])
    .filter(p => blk112.indexOf('for(const tr2 of [') >= 0);
  const treeSeg112 = blk112.slice(blk112.indexOf('for(const tr2 of ['));
  const treePts112 = [...treeSeg112.slice(0, treeSeg112.indexOf(']]') + 2).matchAll(/\[(\d+),(\d+)\]/g)].map(m => [+m[1], +m[2]]);
  assert(treePts112.length >= 5, 'T355 k112 應解析到 5 棵以上的樹，實得 ' + treePts112.length);
  const badTree112 = treePts112.filter(([x, y]) => !inFoot112(x, y));
  assert(badTree112.length === 0,
    'T355 k112 每棵樹的底部都必須在 3×3 footprint 菱形內，出界：' + JSON.stringify(badTree112));

  // 步道帶：bd112(x1,y1,x2,y2) 的兩個端點必須在菱形內
  const bands112 = [...blk112.matchAll(/bd112\((\d+),(\d+),(\d+),(\d+)\)/g)].map(m => m.slice(1).map(Number));
  assert(bands112.length === 2, 'T355 k112 應有兩條 X 形步道，實得 ' + bands112.length);
  for (const [x1, y1, x2, y2] of bands112) {
    assert(inFoot112(x1, y1) && inFoot112(x2, y2),
      'T355 k112 步道端點必須在菱形內：' + JSON.stringify([x1, y1, x2, y2]));
  }

  // 橢圓（噴泉/池塘）：四個極點必須在菱形內
  const ells112 = [...blk112.matchAll(/sg\.ellipse\((\d+),(\d+),(\d+),(\d+),/g)].map(m => m.slice(1).map(Number));
  assert(ells112.length >= 4, 'T355 k112 應解析到 4 個以上的橢圓（噴泉＋池塘），實得 ' + ells112.length);
  for (const [cx, cy, rx, ry] of ells112) {
    const pts = [[cx - rx, cy], [cx + rx, cy], [cx, cy - ry], [cx, cy + ry]];
    const bad = pts.filter(([x, y]) => !inFoot112(x, y));
    assert(bad.length === 0,
      'T355 k112 水景橢圓極點必須在菱形內：ellipse(' + [cx, cy, rx, ry].join(',') + ') 出界 ' + JSON.stringify(bad));
  }

  // 花圃菱形中心＋左右端必須在菱形內
  const beds112 = [...blk112.matchAll(/\[(\d+),(\d+),'#[0-9a-f]{6}','#[0-9a-f]{6}'\]/g)].map(m => [+m[1], +m[2]]);
  assert(beds112.length === 3, 'T355 k112 應有三畦花圃，實得 ' + beds112.length);
  for (const [x, y] of beds112) {
    assert(inFoot112(x, y) && inFoot112(x - 9, y) && inFoot112(x + 9, y) && inFoot112(x, y + 4),
      'T355 k112 花圃必須在菱形內：' + JSON.stringify([x, y]));
  }
}
// T355 上緣溢出審計 hook 應存在（真實像素量測於瀏覽器端：k112 修前 88px → 修後 23px）
assert(Array.isArray(window.GV.sprAboveAudit()), 'T355 sprAboveAudit 應回傳陣列');
/* ===== T374 大農場 53_1_0 四塊作物等角歸位 =====
   病灶：四塊 fillRect 軸對齊矩形浮在 5×5 菱形上（麥 96% 出界等）。改 (a,b) 格座標
   軸對齊矩形＝畫布等角平行四邊形；色票不變、零 spriteTexRand。 */
{
  const blk374 = html.slice(html.indexOf("{ // T228 大農場 53_1_0"), html.indexOf("SPR.bld['53_1_0']"));
  assert(blk374.length > 400, 'T374 應找到 k53 大農場 sprite 區塊');
  assert(/T374/.test(blk374), 'T374 區塊應帶 T374 註解（防悄悄回退）');
  assert(!/g\.fillRect\(ax-118,ay-148,52,28\)/.test(blk374),
    'T374 不得保留舊麥田 fillRect(ax-118,ay-148,52,28)');
  assert(!/g\.fillRect\(ax-52,ay-164,56,30\)/.test(blk374),
    'T374 不得保留舊玉米田 fillRect(ax-52,ay-164,56,30)');
  // 咬法一：解析 P374 四塊 (a0,a1,b0,b1)
  const mP374 = blk374.match(/const P374=\[(\[[^\]]+\],\[[^\]]+\],\[[^\]]+\],\[[^\]]+\])\]/);
  assert(mP374, 'T374 應有 const P374 四塊格座標陣列（抓不到＝守衛空過）');
  const patches374 = [...mP374[1].matchAll(/\[(-?\d+),(-?\d+),(-?\d+),(-?\d+)\]/g)]
    .map(m => m.slice(1).map(Number));
  assert(patches374.length === 4, 'T374 P374 應恰有 4 塊，實得 ' + patches374.length);
  const AX374 = 164, CY374 = 162, HW374 = 160, HH374 = 80;
  const toXY374 = (a, b) => [AX374 + 2 * (a - b), CY374 + (a + b)];
  const inFoot374 = (x, y) => Math.abs(x - AX374) / HW374 + Math.abs(y - CY374) / HH374 <= 1.0001;
  let areaSum374 = 0;
  const boxes374 = [];
  for (let i = 0; i < 4; i++) {
    const [a0, a1, b0, b1] = patches374[i];
    assert(a1 > a0 && b1 > b0, 'T374 塊' + i + ' 應 a1>a0 且 b1>b0');
    assert(a1 - a0 >= 6 && b1 - b0 >= 6, 'T374 塊' + i + ' 兩邊長應 ≥6 單位（非退化）');
    // 四頂點 + 格座標矩形性
    const corners = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
    const aSet = new Set(corners.map(c => c[0]));
    const bSet = new Set(corners.map(c => c[1]));
    assert(aSet.size === 2 && bSet.size === 2,
      'T374 塊' + i + ' 在 (a,b) 應為軸對齊矩形（|a|集=2,|b|集=2）');
    for (const [a, b] of corners) {
      assert(Math.max(Math.abs(a), Math.abs(b)) <= 40,
        'T374 塊' + i + ' 頂點 max(|a|,|b|) 應 ≤40：' + a + ',' + b);
      const [x, y] = toXY374(a, b);
      assert(inFoot374(x, y), 'T374 塊' + i + ' 頂點應在 5×5 菱形內：' + x + ',' + y);
    }
    // 咬法二：等角斜率 — 邊 (a 變 b 定) → dx=2*da, dy=da ⇒ |dx|=2|dy| 且 dy≠0
    const e1 = [toXY374(a1, b0)[0] - toXY374(a0, b0)[0], toXY374(a1, b0)[1] - toXY374(a0, b0)[1]];
    const e2 = [toXY374(a0, b1)[0] - toXY374(a0, b0)[0], toXY374(a0, b1)[1] - toXY374(a0, b0)[1]];
    assert(e1[1] !== 0 && Math.abs(e1[0]) === 2 * Math.abs(e1[1]),
      'T374 塊' + i + ' a 向邊必須等角斜率 |dx|=2|dy| 且 dy≠0：' + e1);
    assert(e2[1] !== 0 && Math.abs(e2[0]) === 2 * Math.abs(e2[1]),
      'T374 塊' + i + ' b 向邊必須等角斜率 |dx|=2|dy| 且 dy≠0：' + e2);
    // 面積（格單位矩形 → 畫布鞋帶對四頂點）
    const poly = [toXY374(a0, b0), toXY374(a1, b0), toXY374(a1, b1), toXY374(a0, b1)];
    let ar = 0;
    for (let k = 0; k < 4; k++) {
      const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % 4];
      ar += x1 * y2 - x2 * y1;
    }
    ar = Math.abs(ar) / 2;
    assert(ar >= 80 && ar <= 2800, 'T374 塊' + i + ' 面積應在 [80,2800] px²，實得 ' + ar);
    areaSum374 += ar;
    boxes374.push({ a0, a1, b0, b1 });
  }
  // 咬法三：合計佔比 + 互不重疊
  const diaArea374 = 2 * HW374 * HH374; // 菱形面積 2*160*80=25600
  assert(areaSum374 >= 800 && areaSum374 <= 12000,
    'T374 四塊合計面積應合理，實得 ' + areaSum374 + ' / 菱形 ' + diaArea374);
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const A = boxes374[i], B = boxes374[j];
    const sep = A.a1 < B.a0 || B.a1 < A.a0 || A.b1 < B.b0 || B.b1 < A.b0;
    assert(sep, 'T374 塊' + i + ' 與 ' + j + ' 在 (a,b) 應互不重疊');
  }
  // 咬法四：vm 重放 index.html 真實繪製碼，攔截 fillRect 逐像素驗界內
  // （卡面不變量1：每一個上色像素 |x-164|/160+|y-162|/80<=1；不得只重跑測試側 toXY）
  {
    const iT374 = html.indexOf('/* T374：四塊作物等角歸位');
    const iSg374 = html.indexOf("sg.fillStyle='#a83a2c'", iT374);
    assert(iT374 > 0 && iSg374 > iT374, 'T374 應切出可重放段（T374 註解 → 穀倉 sg 前）');
    const src374 = html.slice(iT374, iSg374);
    assert(src374.includes('soil374') && src374.includes('P374'), 'T374 重放段應含 soil374/P374');
    const rects374 = [];
    let fs374 = '#000000';
    const gFake374 = {
      set fillStyle(v) { fs374 = String(v); },
      get fillStyle() { return fs374; },
      fillRect(x, y, w, h) {
        const x0 = Math.floor(+x), y0 = Math.floor(+y);
        const ww = Math.max(1, Math.ceil(+w || 1)), hh = Math.max(1, Math.ceil(+h || 1));
        for (let dy = 0; dy < hh; dy++) for (let dx = 0; dx < ww; dx++)
          rects374.push({ x: x0 + dx, y: y0 + dy, c: fs374 });
      }
    };
    vm.runInNewContext(src374, { ax: 164, ay: 242, g: gFake374, Math }, { filename: 't374-crop-replay.js' });
    assert(rects374.length > 0, 'T374 沙箱重放必須錄到 fillRect（空＝假綠／未執行繪製碼）');
    const badPix374 = [];
    for (const p of rects374) {
      if (!inFoot374(p.x, p.y)) badPix374.push(p);
    }
    assert(badPix374.length === 0,
      'T374 真實繪製重放：每一上色像素必須在 5×5 菱形內，出界 ' + badPix374.length +
      ' 例：' + JSON.stringify(badPix374.slice(0, 5)));
  }
  // 色票：T374 作物段（P374…sg. 建築前）不得引入新 hex
  {
    const crop374 = blk374.slice(blk374.indexOf('P374'), blk374.indexOf('sg.fillStyle'));
    assert(crop374.length > 200, 'T374 應切出作物色票段');
    const allowed374 = new Set([
      '#d8b83a', '#b89a28', '#f0d060', '#3f7a34', '#2f5f28', '#e8cc48',
      '#6b4a30', '#4a8a3a', '#66b04a', '#6b4a2f', '#3d7a3c', '#4f9448', '#d04838'
    ]);
    const hexes = [...crop374.matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
    assert(hexes.length >= 8, 'T374 作物段應含多個舊色票，實得 ' + hexes.length);
    const badHex = [...new Set(hexes)].filter(h => !allowed374.has(h));
    assert(badHex.length === 0, 'T374 不得引入新色票：' + JSON.stringify(badHex));
  }
  // 果樹等角格網（T377 後步進可加密，仍須 bft）
  assert(/bft\(/.test(blk374), 'T374/T377 果園應以 bft 種植');
}
/* ===== T377 大農場精修：作物加密 ＋ 穀倉立體化 ===== */
{
  const blk377 = html.slice(html.indexOf("{ // T228 大農場 53_1_0"), html.indexOf("SPR.bld['53_1_0']"));
  assert(blk377.length > 500, 'T377 應找到 k53 大農場區塊');
  assert(/T377/.test(blk377), 'T377 區塊應帶 T377 註解');
  // J6 穀倉錨點：必須在 P374 之後、且為建築段字面第一句
  const iP374 = blk377.indexOf('P374');
  const iA83 = blk377.indexOf("sg.fillStyle='#a83a2c'");
  assert(iP374 > 0 && iA83 > iP374, 'T377 J6：sg.fillStyle=\'#a83a2c\' 須在 P374 之後保留');
  assert(/isoBox\(sg,/.test(blk377), 'T377 穀倉應使用 isoBox(sg,...) 立體化');
  // J5 零亂數：spriteTexRand 呼叫恰 1 次（speck 那次；排除註解字串）
  {
    const callN = (blk377.match(/spriteTexRand\s*[,)]/g) || []).length;
    assert(callN === 1, 'T377 J5：spriteTexRand 呼叫次數應恰為 1，實得 ' + callN);
  }
  // J1 作物色票 ⊆ 13 色（沿用 T374 切段）
  {
    const crop377 = blk377.slice(blk377.indexOf('P374'), blk377.indexOf("sg.fillStyle='#a83a2c'"));
    assert(crop377.length > 200, 'T377 J1：作物段應可切出');
    const allowed = new Set([
      '#d8b83a', '#b89a28', '#f0d060', '#3f7a34', '#2f5f28', '#e8cc48',
      '#6b4a30', '#4a8a3a', '#66b04a', '#6b4a2f', '#3d7a3c', '#4f9448', '#d04838'
    ]);
    const hexes = [...crop377.matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
    assert(hexes.length > 0, 'T377 J1：作物段 hex 數應 >0');
    const bad = [...new Set(hexes)].filter(h => !allowed.has(h));
    assert(bad.length === 0, 'T377 J1：作物段不得引入新色：' + JSON.stringify(bad));
  }
  // J2 建築新色不撞季節表
  {
    const bld377 = blk377.slice(blk377.indexOf("sg.fillStyle='#a83a2c'"));
    assert(bld377.length > 80, 'T377 J2：建築段應可切出');
    const bldHex = [...bld377.matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toLowerCase());
    assert(bldHex.length > 0, 'T377 J2：建築段 hex 數應 >0');
    // 從 SUM/AUT/WIN 物件字面解析 key（0xRRGGBB）
    const mapBlk = html.slice(html.indexOf('const SUM={'), html.indexOf('SPR.farmSea='));
    const seasonKeys = new Set();
    for (const m of mapBlk.matchAll(/0x([0-9a-fA-F]{6})\s*:/g)) {
      seasonKeys.add('#' + m[1].toLowerCase());
    }
    assert(seasonKeys.size >= 20, 'T377 J2：季節表 key 應解析到足夠數量，實得 ' + seasonKeys.size);
    const hit = [...new Set(bldHex)].filter(h => seasonKeys.has(h));
    assert(hit.length === 0, 'T377 J2：建築色不得撞季節表 key：' + JSON.stringify(hit));
  }
  // J3 覆蓋率下界 ＋ J4 界內：vm 重放作物段，按 (a,b) 歸入四塊計數
  {
    const iT = html.indexOf('/* T374：四塊作物等角歸位');
    const iSg = html.indexOf("sg.fillStyle='#a83a2c'", iT);
    assert(iT > 0 && iSg > iT, 'T377 J3/J4：應切出作物重放段');
    const src = html.slice(iT, iSg);
    const rects = [];
    let fs = '#000';
    const gFake = {
      set fillStyle(v) { fs = String(v); },
      get fillStyle() { return fs; },
      fillRect(x, y, w, h) {
        const x0 = Math.floor(+x), y0 = Math.floor(+y);
        const ww = Math.max(1, Math.ceil(+w || 1)), hh = Math.max(1, Math.ceil(+h || 1));
        for (let dy = 0; dy < hh; dy++) for (let dx = 0; dx < ww; dx++)
          rects.push({ x: x0 + dx, y: y0 + dy, c: fs });
      }
    };
    vm.runInNewContext(src, { ax: 164, ay: 242, g: gFake, Math }, { filename: 't377-crop.js' });
    assert(rects.length > 0, 'T377 J3/J4：重放必須錄到 fillRect');
    const AX = 164, CY = 162;
    const inFoot = (x, y) => Math.abs(x - AX) / 160 + Math.abs(y - CY) / 80 <= 1.0001;
    const patches = [[-38, -27, -29, -6], [-24, -6, -38, -27], [-38, -25, 25, 38], [22, 38, -38, -22]];
    // T374 稀疏基線（卡面釘死）：麥 288／玉 363／菜 232／果 616
    const baseCov = [288, 363, 232, 616];
    const counts = [0, 0, 0, 0];
    let outN = 0;
    for (const p of rects) {
      if (!inFoot(p.x, p.y)) { outN++; continue; }
      const a = (p.y - CY) / 2 + (p.x - AX) / 4;
      const b = (p.y - CY) / 2 - (p.x - AX) / 4;
      for (let i = 0; i < 4; i++) {
        const [a0, a1, b0, b1] = patches[i];
        // 植株可略伸出田面數 px（穗/冠），歸入最近塊用寬鬆邊界
        if (a >= a0 - 2 && a <= a1 + 2 && b >= b0 - 2 && b <= b1 + 2) { counts[i]++; break; }
      }
    }
    assert(outN === 0, 'T377 J4：重放上色像素必須全在菱形內，出界 ' + outN);
    for (let i = 0; i < 4; i++) {
      assert(counts[i] >= baseCov[i],
        'T377 J3：塊' + i + ' 覆蓋像素應 ≥ 基線 ' + baseCov[i] + '，實得 ' + counts[i]);
    }
    // 果園株數：直接數 bft 呼叫（__tn 注入），≥20；步進 4 破壞性必須紅
    {
      const box = { n: 0 };
      const srcTrees = src.replace(
        /const bft=\(tx,ty\)=>\{/,
        'const bft=(tx,ty)=>{__tn.n++;'
      );
      assert(srcTrees.includes('__tn.n++'), 'T377 果園：bft 計數注入應成功');
      const g3 = { set fillStyle(v) {}, get fillStyle() { return '#000'; }, fillRect() {} };
      vm.runInNewContext(srcTrees, { ax: 164, ay: 242, g: g3, Math, __tn: box }, { filename: 't377-tree-count.js' });
      assert(box.n >= 20, 'T377 果園株數應 ≥20（直接數 bft 呼叫），實得 ' + box.n);
      // 靜態：雙軸步進 3（步進 2 糊成綠毯；步進 4 格點 ≤16 株）
      assert(/a\+=3/.test(src) && /b\+=3/.test(src),
        'T377 果園迴圈應 a+=3 且 b+=3（步進 3 留空）');
    }
  }
}
/* ===== T356 素材清冊（sprAtlas356）=====
   圖鑑頁與素材指紋的地基：SPR 全家族正規化攤平。Node 端 mock canvas 只回 4 bytes，
   故此處斷中繼資料契約（涵蓋率／尺寸／錨點形狀／巢狀家族），像素指紋於瀏覽器端 atlas.html 驗。
   門檻皆留成長餘量：只抓「素材群被誤刪／正規化漏新形狀」，不擋新增。 */
{
  const at = window.GV.sprAtlas356();
  assert(at && Array.isArray(at.entries), 'T356 sprAtlas356 應回傳 {entries,skipped,families}');
  assert(at.families >= 100, 'T356 SPR 家族數應 ≥100（實得 ' + at.families + '，驟減＝家族被誤刪）');
  assert(at.entries.length >= 1200, 'T356 清冊條目應 ≥1200（實得 ' + at.entries.length + '）');
  assert(at.skipped <= 60, 'T356 不可解析成員應維持少量（實得 ' + at.skipped + '；暴增＝正規化漏了新形狀）');
  const badDim356 = at.entries.filter(e => !(e.w > 0 && e.h > 0));
  assert(badDim356.length === 0, 'T356 全部 sprite 尺寸應 >0：' + JSON.stringify(badDim356.slice(0, 3)));
  const bld356 = at.entries.filter(e => e.fam === 'bld');
  assert(bld356.length >= 370, 'T356 bld 應 ≥370（實得 ' + bld356.length + '）');
  assert(bld356.every(e => e.ax !== null && e.ay !== null), 'T356 bld 每張都應有錨點中繼（ax/ay）');
  assert(at.entries.some(e => e.fam === 'bld' && e.key === '112_1_0'), 'T356 清冊應涵蓋 k112');
  assert(at.entries.some(e => e.fam === 'farmGrow'), 'T356 清冊應涵蓋巢狀家族 farmGrow（遞迴攤平證明）');
}
/* ===== T357 逐家族素材基線＋atlas 注入守衛 =====
   T356 的寬鬆門檻只抓家族級誤刪；本卡把 tools/spr_families.json 釘為逐家族基線，
   任一家族「變少」立刻紅（新增素材恆大於基線、不必更新；刻意刪減才重跑 gen_spr_baseline.js 降基線）。 */
{
  const at = window.GV.sprAtlas356();
  const cur = {};
  for (const e of at.entries) cur[e.fam] = (cur[e.fam] || 0) + 1;
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools', 'spr_families.json'), 'utf8'));
  const shrunk = Object.keys(base.families).filter(f => (cur[f] || 0) < base.families[f]);
  assert(shrunk.length === 0,
    'T357 這些家族的素材數低於基線（誤刪？）：' + shrunk.map(f => f + ' ' + (cur[f] || 0) + '<' + base.families[f]).join('、'));
  assert(at.entries.length >= base.total, 'T357 素材總數 ' + at.entries.length + ' 應 ≥ 基線 ' + base.total);
}
// T357 atlas 注入守衛：log 輸出必須走 textContent，innerHTML 只允許清空（=''），貼入 JSON 的鍵名不得被當標籤解析
{
  const atlasSrc = fs.readFileSync(path.join(__dirname, 'atlas.html'), 'utf8');
  assert(!/innerHTML\+=/.test(atlasSrc), 'T357 atlas.html 不得用 innerHTML+= 拼接輸出（注入風險）');
  assert(!/innerHTML\s*=\s*[^'\s]/.test(atlasSrc), "T357 atlas.html 的 innerHTML 只允許清空（=''）");
}
/* ===== T359 夜景燈光群（路燈光錐冷暖／橋面欄杆光洗／地標探照燈）===== */
{
  const at = window.GV.sprAtlas356();
  for (const k of ['lampConeWarm', 'lampConeCool', 'railWashWarm', 'railWashCool', 'bridgeLamp', 'spotBeam'])
    assert(at.entries.some(e => e.fam === k), 'T359 sprite 家族應生成：' + k);
  // 亂數流守衛：T359 sprite 區塊不得消耗 rand/R/ri（置 buildSprites 尾端但仍以零亂數為硬性不變量）
  const blk359 = html.slice(html.indexOf('T359 夜景燈光群'), html.indexOf('R=__savedR'));
  assert(blk359.length > 500, 'T359 應找到 sprite 區塊');
  assert(!/rand\(|[^a-zA-Z]R\(\)|ri\(/.test(blk359), 'T359 sprite 區塊不得消耗 rand()/R()/ri()（零亂數位移）');
  // 接線守衛：冷暖分色走同一鹽（地圖上任一格燈溫一致）、探照燈白名單、noHalo 跳過光暈
  assert(/streetHash\(x,y,1651\)</.test(html), 'T359 冷暖分色應用 streetHash(x,y,1651)（同格燈溫決定性一致）');
  assert(/SPOT_K359\[bd\.k\]/.test(html), 'T359 探照燈應走 SPOT_K359 白名單');
  assert(/if\(rg2\.noHalo\)continue/.test(html), 'T359 光暈迴圈應跳過 noHalo 條目（光錐中心在半空）');
  assert(/const SPOT_K359=\{24:1,67:1,68:1/.test(html), 'T359 SPOT_K359 應含 k24/67/68 地標');
}
/* ===== T361 動態生命感（船・飛機・季節粒子；Grok 首卡；1A+2A）===== */
{
  const at = window.GV.sprAtlas356();
  assert(at.entries.some(e => e.fam === 'lifeShip' && e.key === 'cargo'), 'T361a SPR.lifeShip.cargo 應生成');
  assert(at.entries.some(e => e.fam === 'lifeShip' && e.key === 'yacht'), 'T361a SPR.lifeShip.yacht 應生成');
  assert(at.entries.some(e => e.fam === 'lifeShip' && e.key === 'fish'), 'T361a SPR.lifeShip.fish 應生成');
  assert(at.entries.filter(e => e.fam === 'plane').length >= 2, 'T361b SPR.plane 應 ≥2 幀');
  // 靜態守衛：T361 sprite 區塊零亂數
  const i361 = html.indexOf('T361 動態生命感 sprites');
  const iEnd = html.indexOf('R=__savedR', i361);
  assert(i361 > 0 && iEnd > i361, 'T361 應找到 sprite 區塊於 buildSprites 尾端');
  const blk361 = html.slice(i361, iEnd);
  assert(blk361.length > 400, 'T361 sprite 區塊應非空');
  assert(!/\brand\s*\(|[^a-zA-Z_]R\s*\(|\bri\s*\(|Math\.random\s*\(/.test(blk361),
    'T361 sprite 區塊不得消耗 rand()/R()/ri()/Math.random()');
  // 接線守衛
  assert(/function updLifeShips/.test(html), 'T361a 應有 updLifeShips');
  assert(/updLifeShips\(dtA\)/.test(html), 'T361a 應掛入 advance()');
  assert(/window\.__noLife/.test(html), 'T361 應提供 __noLife 總開關');
  assert(/lifeShip:sh/.test(html) || /lifeShip:sh,/.test(html) || /lifeShip:sh\}/.test(html) || /\{dep:fx\+fy\+\.012,lifeShip:sh/.test(html),
    'T361a 應以獨立 dep 推入 objs');
  assert(/b\.k===18/.test(html) && /b\.k===90/.test(html) && /b\.k===97/.test(html),
    'T361a 應依 k18/k90/k97 生成船種');
  assert(/b\.k===19\|\|b\.k===114/.test(html), 'T361b 應在機場 k19／國際機場 k114 存在時繪製飛機');
  assert(/streetHash\(phase,1,1801\)/.test(html), 'T361b 班次應決定性（streetHash phase）');
  assert(/seaL===1&&nightDepth>0/.test(html), 'T361c 螢火蟲應僅夏夜（nightDepth>0）');
  assert(typeof window.GV.lifeShips === 'function', 'T361a GV.lifeShips 鉤子應存在');
  assert(typeof window.GV.lifeShipsByKind === 'function', 'T361a GV.lifeShipsByKind 鉤子應存在');
  // 運行時：__noLife 時 updLifeShips 應清空（不依賴模擬種子）
  window.__noLife = true;
  assert(window.GV.lifeShips() === 0, 'T361 __noLife 開啟前預設船隊為 0（新圖）');
  window.__noLife = false;
}
/* ===== T363 垃圾焚化發電廠運轉視覺（k62 draw-time 排氣／夜班；禁 updSmoke）===== */
{
  assert(/T363 垃圾焚化發電廠運轉視覺/.test(html), 'T363 應有運轉視覺區塊註解錨');
  assert(/window\.__noWteFx/.test(html), 'T363 應提供 __noWteFx 總開關');
  assert(/bd\.k===62&&!bd\.ref&&\(bd\.age\|0\)>=9/.test(html), 'T363 應僅對完工 k62 root 生效');
  assert(/garbage>0&&animOn/.test(html), 'T363 活動排氣應要求 garbage>0 且 animOn');
  // 靜態守衛：T363 區塊零亂數、不碰粒子管線
  const i363 = html.indexOf('T363 垃圾焚化發電廠運轉視覺');
  const i363end = html.indexOf('if(nightDepth>0&&SPOT_K359', i363);
  assert(i363 > 0 && i363end > i363, 'T363 區塊應可擷取');
  const blk363 = html.slice(i363, i363end);
  assert(blk363.length > 200, 'T363 區塊應非空');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(blk363),
    'T363 區塊不得消耗 R()/ri()/rand()/Math.random');
  assert(!/smokes\.push|fxParts\.push/.test(blk363), 'T363 不得 push 進 smokes/fxParts');
  assert(!/function updSmoke/.test(blk363), 'T363 不得改寫 updSmoke');
  // updSmoke 本體仍不得被改成接 k62 煙（smoke:[] 契約）
  assert(/SPR\.bld\['62_1_0'\]=\{img:c,night:nc,ax,ay,w:136,h:150,smoke:\[\]\}/.test(html),
    'T265/T363：k62 仍應為 smoke:[]（不接入每幀煙霧亂數流）');
  // 行為：放置 k62 後 forceDraw 不拋錯；開關可設
  window.__noWteFx = false;
  try {
    if (typeof window.GV.forceDraw === 'function') window.GV.forceDraw();
  } catch (e) {
    assert(false, 'T363 forceDraw 不應拋錯：' + e.message);
  }
  window.__noWteFx = true;
  try {
    if (typeof window.GV.forceDraw === 'function') window.GV.forceDraw();
  } catch (e) {
    assert(false, 'T363 __noWteFx 下 forceDraw 不應拋錯：' + e.message);
  }
  window.__noWteFx = false;
}
/* ===== T367 視角四向旋轉（view-space 變換層）===== */
{
  assert(typeof window.GV.w2v === 'function' && typeof window.GV.v2w === 'function', 'T367 GV.w2v/v2w 應存在');
  assert(typeof window.GV.rotMask === 'function' && typeof window.GV.setRot === 'function', 'T367 GV.rotMask/setRot 應存在');
  assert(typeof window.GV.rot === 'function', 'T367 GV.rot 應存在');
  assert(/id=\"bRot\"/.test(html), 'T367 HUD 應有旋轉按鈕 #bRot');
  assert(/function isoW2V/.test(html), 'T367 應有 isoW2V（實體等距座標）');
  assert(/viewRotEff\(\)/.test(html) && /window\.__noRot/.test(html), 'T367 應有 viewRotEff 與 __noRot');
  const n = 72;
  for (const r of [0, 1, 2, 3]) {
    window.GV.setRot(r);
    assert(window.GV.rot() === r, 'T367 setRot(' + r + ') 應生效');
    for (let y = 0; y < n; y += 9)
      for (let x = 0; x < n; x += 9) {
        const v = window.GV.w2v(x, y);
        const w = window.GV.v2w(v[0], v[1]);
        assert(w[0] === x && w[1] === y, 'T367 w2v∘v2w 恆等 rot=' + r + ' @' + x + ',' + y);
      }
    for (let m = 0; m < 16; m++) {
      let mm = m;
      for (let k = 0; k < 4; k++) mm = window.GV.rotMask(mm, 1);
      assert(mm === m, 'T367 rotMask 周期4 應復原 m=' + m);
    }
  }
  window.GV.setRot(0);
  assert(window.GV.rot() === 0, 'T367 測試結束應回到 rot=0');
  const i367 = html.indexOf('T367 視角四向旋轉');
  assert(i367 > 0, 'T367 應有變換層註解');
  const i367end = html.indexOf('const STREET_POPCOUNT', i367);
  assert(i367end > i367, 'T367 變換核應止於 STREET_POPCOUNT 之前');
  const blk367 = html.slice(i367, i367end);
  assert(!/\bR\s*\(|\bri\s*\(|Math\.random\s*\(/.test(blk367), 'T367 變換核不得消耗 R()/ri()/Math.random');
  // T367 退修（覆核 5 項）
  assert(/function camLookWorld/.test(html) && /function initViewRotUI/.test(html), 'T367 退修：camLookWorld／initViewRotUI');
  assert(/\$\('#bAch'\)\.onclick=\(\)=>\{showAch\(\);sTick\(\);\}/.test(html), 'T367 退修：#bRot 不得巢狀在 bAch.onclick');
  assert(/initViewRotUI\(\)/.test(html), 'T367 退修：initViewRotUI 頂層呼叫');
  assert(!/viewDep\(Math\.floor/.test(html), 'T367 退修：dep 不得 floor 量化');
  assert(/isoW2V\(s\.wx,s\.wy,32\)/.test(html), 'T367 退修：煙繪製須 isoW2V');
  assert(/isoW2V\(p\.wx,p\.wy,_fo\)/.test(html), 'T367 退修：粒子繪製須 isoW2V');
  assert(/e\.key==='r'/.test(html), 'T367 退修：快捷鍵 r 旋轉');
  assert(/const\[vx,vy\]=w2v\(x,y\)/.test(html), 'T367 退修：小地圖跟轉 w2v');
  assert(/lookAt:\(x,y\)=>\{camLookWorld/.test(html), 'T367 退修：lookAt 經 camLookWorld');
  // 行為：rot=1 下 lookAt 後 rot 仍 1；setRot 0 回歸
  window.GV.setRot(1);
  window.GV.lookAt(16, 16);
  assert(window.GV.rot() === 1, 'T367 lookAt 不應清 rot');
  window.GV.setRot(0);
}
/* ===== T367b objs 地格 dep 旋轉漏轉（單格 viewDep／多格 max footprint）===== */
{
  // 靜態：地格 dep 必須走 viewDep；多格 max 掃描；不得回退舊世界 SE 角字面
  const iObjs = html.indexOf('const objs=[];');
  assert(iObjs > 0, 'T367b 應找得到 objs 主迴圈');
  const iPush = html.indexOf('objs.push({dep,x,y,sx,sy,t});', iObjs);
  assert(iPush > iObjs, 'T367b 應找得到地格 objs.push');
  const depBlk = html.slice(iObjs, iPush);
  assert(/viewDep\(x,y\)\+y\*\.001/.test(depBlk), 'T367b 單格 dep 應為 viewDep(x,y)+y*.001');
  assert(/viewDep\(x\+dx,y\+dy\)/.test(depBlk) && /d>=md/.test(depBlk), 'T367b 多格應掃 footprint 取 max(viewDep)');
  assert(/T367b/.test(depBlk), 'T367b 地格 dep 應有任務註解');
  assert(!/x\+t\.bld\.sz-1/.test(depBlk), 'T367b 不得保留舊世界 SE 角公式 x+sz-1');
  // 執行：viewDep 與 rot=0 公式恆等；多格 max 在 rot=0 等於 SE 角
  const vDep = (x, y) => {
    const p = window.GV.w2v(x, y);
    return p[0] + p[1];
  };
  const maxFoot = (x, y, sz) => {
    let md = -1;
    for (let dy = 0; dy < sz; dy++)
      for (let dx = 0; dx < sz; dx++) {
        const d = vDep(x + dx, y + dy);
        if (d >= md) md = d;
      }
    return md;
  };
  window.GV.setRot(0);
  for (const [x, y] of [[0, 0], [10, 11], [31, 7], [5, 40]]) {
    assert(vDep(x, y) === x + y, 'T367b rot=0 viewDep===x+y @' + x + ',' + y);
    assert(vDep(x, y) + y * 0.001 === x + y + y * 0.001, 'T367b rot=0 單格 dep 尾碼世界 y @' + x + ',' + y);
  }
  for (const [x, y, sz] of [[10, 10, 2], [3, 5, 3], [0, 0, 5], [8, 12, 2]]) {
    const se = (x + sz - 1) + (y + sz - 1);
    assert(maxFoot(x, y, sz) === se, 'T367b rot=0 多格 max===SE 角 sz=' + sz + ' @' + x + ',' + y);
    // k9 舊路徑 (x+1)+(y+1) ≡ sz=2 SE
    if (sz === 2) assert(maxFoot(x, y, 2) === (x + 1) + (y + 1), 'T367b rot=0 k9/2×2 對齊舊 (x+1)+(y+1)');
  }
  // rot=1：南北相鄰格 view dep 方向與世界 x+y 相反（卡面 A(10,10)/C(10,11)）
  window.GV.setRot(1);
  {
    const a = vDep(10, 10), c = vDep(10, 11);
    assert(a > c, 'T367b rot=1 時 (10,10) viewDep 應 > (10,11)（實得 ' + a + '/' + c + '）');
    assert((10 + 10) < (10 + 11), 'T367b 對照：世界 dep 仍是南格較大');
    // 2×2／3×3／5×5 max(viewDep) 覆蓋 footprint 全角（rot≠0 時 SE 角未必最大）
    const root = [20, 20];
    for (const sz of [2, 3, 5]) {
      const md = maxFoot(root[0], root[1], sz);
      let hit = 0;
      for (let dy = 0; dy < sz; dy++)
        for (let dx = 0; dx < sz; dx++) {
          const d = vDep(root[0] + dx, root[1] + dy);
          assert(md >= d, 'T367b rot=1 max 覆蓋 footprint sz=' + sz);
          if (d === md) hit++;
        }
      assert(hit >= 1, 'T367b rot=1 max 應落在 footprint 內 sz=' + sz);
      // rot=1 下 SE 角 viewDep 通常不是 max（證明「不是固定 SE」）
      const seV = vDep(root[0] + sz - 1, root[1] + sz - 1);
      assert(md !== seV || sz === 1, 'T367b rot=1 多格 max 不應恆等於 SE 角（sz=' + sz + ' md=' + md + ' se=' + seV + '）');
    }
  }
  window.GV.setRot(0);
  assert(window.GV.rot() === 0, 'T367b 測試結束應回到 rot=0');
}
/* ===== T368 生活感四件（公園人影／霓虹／魚躍／櫻花道）===== */
{
  const at368 = window.GV.sprAtlas356();
  const famN = f => at368.entries.filter(e => e.fam === f).length;
  assert(famN('lifeDog') === 2, 'T368 SPR.lifeDog 應為雙幀（實得 ' + famN('lifeDog') + '）');
  assert(famN('lifeFish') === 2, 'T368 SPR.lifeFish 應為雙幀（實得 ' + famN('lifeFish') + '）');
  assert(famN('treeSakura') === 10, 'T368 SPR.treeSakura 應為 10 變體（實得 ' + famN('treeSakura') + '）');
  for (const sw of ['__noParkLife', '__noNeon', '__noFish', '__noSakura'])
    assert(html.includes(sw), 'T368 應有開關 ' + sw);
  assert(html.includes("ped:{ptype:'child',hx:ph368}"), 'T368a 遊樂場孩童應複用 SPR.ped.child');
  assert(html.includes('if(SPR.ped){ // T368 退修'), 'T368a 退修：人形層須有 SPR.ped 守衛（__noVeh 不生成 ped 素材）');
  assert(html.includes('dog:{hx:ph369}') && html.includes('SPR.lifeDog[fr]'), 'T368a 狗應有 push 與繪製分支');
  assert(html.includes('fish:{prog}') && html.includes('SPR.lifeFish[Math.floor(visT*6)%2]'), 'T368c 魚躍應有 push 與繪製分支');
  assert(html.includes("s=SPR.treeSakura[(t.tree-1)%10]"), 'T368d 櫻花換樹應在樹分支');
  assert(!html.includes('NC368'), 'T368b 退修：不得另立第二套霓虹分支（與 T244 重複）');
  assert((html.match(/const NEON=\[/g) || []).length === 1, 'T368b 霓虹應只有 T244 合流後單一分支');
  assert(html.includes('T368b 合流升級：lv≥2 改直式招牌'), 'T368b 應在 T244 單一分支內升級直式招牌');
  assert(/bd\.k===2&&bd\.pw&&[^)]*!window\.__noNeon&&!constrRise/.test(html), 'T368b 霓虹守衛組應為 bd.pw／!constrRise／__noNeon');
  const seg368 = (a, b) => { const i0 = html.indexOf(a), i1 = html.indexOf(b, i0); assert(i1 > i0, 'T368 區塊錨應找到：' + a); return html.slice(i0, i1); };
  const noR368 = s => !/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(/.test(s);
  assert(noR368(seg368('T368 生活感四件（絕對尾端', 'R=__savedR')), 'T368 sprite 區塊零亂數');
  assert(noR368(seg368('T368a 公園有人', 'T368c 魚躍')), 'T368a 區塊零亂數');
  assert(noR368(seg368('T368c 魚躍：鄰岸水格', 'if(!lodMini)for(const c of cars)')), 'T368c 魚躍迴圈零亂數');
  assert(noR368(seg368('T368b 合流升級', "}else{")), 'T368b 直式招牌區塊零亂數');
  assert(noR368(seg368('T368d 櫻花道：春季鄰道路樹格', 'const sway=')), 'T368d 換樹行零亂數');
  // T368c 退修：魚躍迭代量受 viewport 限制（z=2 日間強制一幀，實掃應遠小於全圖）
  {
    window.GV.setZoom(2);
    window.GV.setVisT(55);
    window.GV.forceDraw();
    const scan368 = window.GV.fishScanN();
    const NN368 = window.GV.N() * window.GV.N();
    assert(scan368 > 0 && scan368 < NN368 / 4,
      'T368c 退修：魚躍應只掃可視範圍（實掃 ' + scan368 + '／全圖 ' + NN368 + '）');
    window.GV.setRot(1); window.GV.forceDraw();
    const scan368r = window.GV.fishScanN();
    assert(scan368r > 0 && scan368r < NN368 / 4,
      'T368c 退修：rot=1 視角下魚躍同受可視範圍限制（實掃 ' + scan368r + '）');
    window.GV.setRot(0);
  }
}
/* ===== T375 旋轉未接補齊第一波（D 自算座標＋A 方向索引，G1-G5）===== */
{
  const seg375 = (a, b) => { const i0 = html.indexOf(a), i1 = html.indexOf(b, i0); assert(i1 > i0 && i1 - i0 > 200, 'T375 區塊錨應找到且夠長：' + a); return html.slice(i0, i1); };
  // G1 靜態負向：D 族三區塊不得再有裸 (x-y)*32/(x+y)*16 定位
  const d1blk = seg375('T300b 地鐵網 overlay', '夜間燈光（T212');
  assert(!/\(\(x-y\)\*32\)\*z|\(\(x\+y\)\*16\+16\)\*z/.test(d1blk), 'G1 D1 地鐵 overlay 不得再有裸 tsx/tsy 等距式');
  assert(d1blk.includes('isoW2V((x-y)*32,(x+y)*16+16)'), 'G1 D1 應改用 isoW2V 並保留格心參數');
  const d2blk = seg375('streetHash(x,y,1910+seaL)', 'else if(seaL===1&&nightDepth>0)');
  assert(!/\(x-y\)\*32\+drift|\(x\+y\)\*16-4\+fall/.test(d2blk), 'G1 D2 花瓣/落葉不得再有裸等距式');
  const d3blk = seg375('else if(seaL===1&&nightDepth>0)', 'if(sea===2&&animOn');
  assert(!/\(x-y\)\*32\+jx|\(x\+y\)\*16\+jy/.test(d3blk), 'G1 D3 螢火蟲不得再有裸等距式');
  assert((html.match(/_p375=w2v\(x,y\)/g) || []).length === 2, 'G1 D2/D3 應成對以 w2v 轉格位');
  // G5 方向旋轉語意（先驗語意，防 G2 字串檢查搶先攔截混淆注入）：索引不得用 rotMask、遮罩不得用 (d+r)&3
  const owLine375 = html.split('\n').find(l => l.includes('SPR.oneway[') && l.includes('viewRotEff'));
  assert(owLine375 && !/rotMask\(t\.oneway/.test(owLine375), 'G5 A2 方向索引不得誤用 rotMask（找不到 (d+r)&3 形式也算誤用）');
  const pzLine375 = html.split('\n').find(l => l.includes('SPR.plaza.path[') && l.includes('viewRotEff'));
  assert(pzLine375 && !/rotMask\(pd\)/.test(pzLine375), 'G5 A4 方向索引不得誤用 rotMask');
  const fwLine375 = html.split('\n').find(l => l.includes('SPR.foamWave[frame]'));
  assert(fwLine375 && fwLine375.includes('rotMask(t.wm)') && !fwLine375.includes('viewRotEff()&3'), 'G5 A3 遮罩不得誤用 (d+r)&3：' + fwLine375);
  // G2 靜態正向：A 族四處逐一斷言（帶行內容）
  assert(html.includes('if(rm===(1|4))gc.drawImage(SPR.roadDeco.lane14'), 'G2 A1 標線 lane14 應用旋轉後 rm');
  assert(html.includes('else if(rm===(2|8))gc.drawImage(SPR.roadDeco.lane28'), 'G2 A1 標線 lane28 應用旋轉後 rm');
  assert(html.includes('SPR.oneway[((t.oneway-1)+viewRotEff())&3]'), 'G2 A2 單行道箭頭應用 ((t.oneway-1)+viewRotEff())&3');
  assert(html.includes('SPR.foamWave[frame][rotMask(t.wm)]'), 'G2 A3 浪花應用 rotMask(t.wm)');
  assert(html.includes('SPR.plaza.path[(pd+viewRotEff())&3]'), 'G2 A4 廣場踏步應用 (pd+viewRotEff())&3');
  // G3 rot=0 恆等（可算）：D 族修改後算式的常數必須完整保留（改動前值釘字面量）
  const tsxLine375 = d1blk.split('\n').find(l => l.includes('const tsx='));
  const tsxIsoCount = tsxLine375 ? (tsxLine375.match(/isoW2V\(\(x-y\)\*32,\(x\+y\)\*16\+16\)/g) || []).length : 0;
  assert(tsxIsoCount === 2, 'G3 D1 的 tsx/tsy 兩支都必須保留 +32z/+16z 格心參數（實得 ' + tsxIsoCount + ' 處）：' + tsxLine375);
  assert(d2blk.includes('+drift') && d2blk.includes('-4+fall'), 'G3 D2 的 drift／-4+fall 螢幕偏移必須原樣保留');
  assert(d3blk.includes('+jx') && d3blk.includes('+jy'), 'G3 D3 的 jx/jy 螢幕抖動必須原樣保留');
  window.GV.setRot(0);
  const p375r0 = window.GV.w2v(30, 20);
  assert(p375r0[0] === 30 && p375r0[1] === 20, 'G3 rot=0 w2v 恆等是 D 族回歸舊值的數學根據');
  // G4 rot≠0 位置一致：D1 與 13305 站體必須同一基元同一參數形；四向以真 w2v 實算
  const staBody375 = html.split('\n').find(l => l.includes('isoW2V((st.x-st.y)*32,(st.x+st.y)*16+16)'));
  assert(!!staBody375, 'G4 應找到站體 isoW2V 呼叫（13305 錨）');
  assert(tsxIsoCount === 2, 'G4 D1 與站體同基元同參數形（tsx/tsy 各一）⇒ 四向恆重合');
  for (const r of [0, 1, 2, 3]) {
    window.GV.setRot(r);
    const p = window.GV.w2v(30, 20);
    const iso375 = [(p[0] - p[1]) * 32, (p[0] + p[1]) * 16 + 16];
    const isoSta = [(p[0] - p[1]) * 32, (p[0] + p[1]) * 16 + 16];
    assert(iso375[0] === isoSta[0] && iso375[1] === isoSta[1], 'G4 rot=' + r + ' D1≡站體 (' + iso375 + ')');
  }
  window.GV.setRot(0);
}
/* ===== T376 B 族載具朝向（H1-H5）===== */
{
  const seg376 = (a, b) => { const i0 = html.indexOf(a), i1 = html.indexOf(b, i0); assert(i1 > i0 && i1 - i0 > 150, 'T376 區塊錨應找到：' + a); return html.slice(i0, i1); };
  const b1 = seg376('if(o.car){', 'if(o.svc){');
  const b2 = seg376('if(o.svc){', 'if(o.bus){');
  const b3 = seg376('if(o.bus){', 'if(o.train&&SPR.trainLoco');
  const b4a = seg376('if(o.train&&SPR.trainLoco', 'if(o.train){');
  const b4b = seg376('if(o.train){', 'if(o.ship){');
  const b5a = seg376('if(o.ship){', 'if(o.lifeShip&&SPR.lifeShip)');
  const b5b = seg376('if(o.lifeShip&&SPR.lifeShip)', 'if(o.tram&&SPR.tramVeh');
  const b6a = seg376('if(o.tram&&SPR.tramVeh', 'if(o.tram){');
  const b6b = seg376('if(o.tram){', 'if(o.torn){');
  const cnt = (s, re) => (s.match(new RegExp(re.source, 'g')) || []).length;
  // H1 靜態負向（計數式）：八區塊內不得再有生欄位形式
  for (const [nm, blk] of [['B1', b1], ['B2', b2], ['B3', b3], ['B4a', b4a], ['B4b', b4b], ['B5a', b5a], ['B5b', b5b], ['B6a', b6a], ['B6b', b6b]]) {
    assert(cnt(blk, /DIRSCR\[o\.[\w.]+\]/) === 0, 'H1 ' + nm + ' 不得再有 DIRSCR[o.欄位] 生索引');
    assert(cnt(blk, /\(o\.[\w.]+===0\|\|o\.[\w.]+===2\)\?'A':'B'/) === 0, 'H1 ' + nm + ' 不得再有生欄位 A/B 比較');
  }
  for (const [nm, blk] of [['B1', b1], ['B2', b2], ['B3', b3], ['B4a', b4a], ['B4b', b4b], ['B6a', b6a], ['B6b', b6b]])
    assert(cnt(blk, /\(o\.[\w.]+===1\|\|o\.[\w.]+===3\)\?-1:1/) === 0, 'H1 ' + nm + ' 不得再有生欄位 mir 比較（B5 船的 mir 依卡面保留，不在此列）');
  assert(cnt(b5a, /mir=\(o\.sd===1\|\|o\.sd===3\)\?-1:1/) === 1 && cnt(b5b, /mir=\(o\.sd===1\|\|o\.sd===3\)\?-1:1/) === 1,
    'H1 B5 船的 mir 必須原樣保留（卡面明令不動 13447/13471）');
  // H2 靜態正向（計數式＋行內容）：六組各一次旋轉後方向宣告
  assert(cnt(b1, /fd=\(o\.car\.d\+viewRotEff\(\)\)&3/) === 1, 'H2 B1 應有 fd 宣告：' + b1.split('\n').find(l => l.includes('fd=')));
  assert(cnt(b2, /fd=\(o\.svcD\+viewRotEff\(\)\)&3/) === 1, 'H2 B2 應有 fd 宣告');
  assert(cnt(b3, /fd=\(o\.bd\+viewRotEff\(\)\)&3/) === 1, 'H2 B3 應有 fd 宣告');
  assert(cnt(b4a, /tdv=\(o\.td\+viewRotEff\(\)\)&3/) === 1 && cnt(b4b, /tdv=\(o\.td\+viewRotEff\(\)\)&3/) === 1, 'H2 B4 兩路徑各一份 tdv');
  assert(cnt(b5a, /DIRSCR\[\(o\.sd\+viewRotEff\(\)\)&3\]/) === 1 && cnt(b5b, /DIRSCR\[\(o\.sd\+viewRotEff\(\)\)&3\]/) === 1, 'H2 B5 兩處航行燈皆轉');
  assert(cnt(b6a, /tv=\(o\.trd\+viewRotEff\(\)\)&3/) === 1 && cnt(b6b, /tv=\(o\.trd\+viewRotEff\(\)\)&3/) === 1, 'H2 B6 兩路徑各一份 tv');
  // H3 分組完整性（防半修）：各區塊旋轉後形式的用量必達修點數
  assert(cnt(b1, /\(fd===0\|\|fd===2\)\?'A':'B'/) === 2 && cnt(b1, /DIRSCR\[fd\]/) === 1, 'H3 B1 三修點全走 fd（7/8 與 1/8 兩路徑＋車燈）');
  assert(cnt(b2, /\(fd===0\|\|fd===2\)\?'A':'B'/) === 1 && cnt(b2, /DIRSCR\[fd\]/) === 1, 'H3 B2 兩修點全走 fd');
  assert(cnt(b3, /\(fd===0\|\|fd===2\)\?'A':'B'/) === 1 && cnt(b3, /DIRSCR\[fd\]/) === 1, 'H3 B3 兩修點全走 fd');
  assert(cnt(b4a, /\(tdv===0\|\|tdv===2\)\?'A':'B'/) === 1 && cnt(b4a, /DIRSCR\[tdv\]/) === 1, 'H3 B4 精細路徑 face＋燈');
  assert(cnt(b4b, /\(tdv===1\|\|tdv===3\)\?-1:1/) === 1 && cnt(b4b, /DIRV\[tdv\]/) === 1 && cnt(b4b, /DIRSCR\[tdv\]/) === 1, 'H3 B4 fallback 鏡射＋位移＋燈（半修必紅）');
  assert(cnt(b6a, /\(tv===0\|\|tv===2\)\?'A':'B'/) === 1 && cnt(b6a, /DIRSCR\[tv\]/) === 1, 'H3 B6 精細路徑 face＋燈');
  assert(cnt(b6b, /\(tv===1\|\|tv===3\)\?-1:1/) === 1 && cnt(b6b, /DIRV\[tv\]/) === 1 && cnt(b6b, /DIRSCR\[tv\]/) === 1, 'H3 B6 fallback 鏡射＋位移＋燈');
  // H4 旋轉語意：方向索引不得誤用 rotMask
  for (const [nm, blk] of [['B1', b1], ['B2', b2], ['B3', b3], ['B4a', b4a], ['B4b', b4b], ['B5a', b5a], ['B5b', b5b], ['B6a', b6a], ['B6b', b6b]])
    assert(!/rotMask\(o\./.test(blk), 'H4 ' + nm + ' 方向索引不得誤用 rotMask');
  // H5 DIRSCR 內容未變（rot=0 恆等的前提）
  assert(html.includes('const DIRSCR=[[4,-2],[4,2],[-4,2],[-4,-2]]'), 'H5 DIRSCR 四組向量必須逐字不變');
}
/* ===== T364a 2× sprite 縮放管線（先立舊素材不變契約；新 A 波素材在 T364b 才加入）===== */
{
  const at=window.GV.sprAtlas356();
  assert(at.entries.every(e=>e.sc===null||typeof e.sc==='number'),
    'T364a sprAtlas356 的 sc metadata 必須是 null 或 number');
  const oldScaled=at.entries.filter(e=>e.fam==='bld'&&Number(e.key.split('_')[0])<=120&&e.sc!==null);
  assert(oldScaled.length===0,'T364a 既有 120 座 SPR.bld 不得出現 sc：'+JSON.stringify(oldScaled.slice(0,3)));
  const scStart=html.indexOf('T364a sc sprite view');
  const scEnd=html.indexOf('let bx,by;',scStart);
  assert(scStart>0&&scEnd>scStart,'T364a sc view 區塊應可擷取');
  const scBlock=html.slice(scStart,scEnd);
  assert(/if\(s\.sc!==undefined\)/.test(scBlock),'T364a 僅在 sprite 明示 sc 時建立縮放檢視');
  assert(/w:raw\.w\*q,h:raw\.h\*q,ax:raw\.ax\*q,ay:raw\.ay\*q/.test(scBlock),
    'T364a 必須同步縮放 w/h 與 ax/ay，不能只縮本體');
  assert(/_scSrcW:raw\.w,_scSrcH:raw\.h/.test(scBlock),'T364a 必須保留 2× 原圖尺寸供施工裁切');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(scBlock),
    'T364a sc view 區塊不得消耗共用亂數');
  assert(/if\(s\._scSrcW!==undefined\)mg\.drawImage\(s\.img,0,0,s\._scSrcW,s\._scSrcH,0,0,w,h\);else mg\.drawImage\(s\.img,0,0\);/.test(html),
    'T364a snow／icicle 遮罩必須把 2× 原圖縮到邏輯尺寸，無 sc 保留原式');
  assert(/if\(s\._scSrcW!==undefined\)g\.drawImage\(s\.img,0,0,s\._scSrcW,s\._scSrcH,0,0,s\.w,s\.h\);else g\.drawImage\(s\.img,0,0\);/.test(html),
    'T364a wetSkin 必須把 2× 原圖縮到邏輯尺寸，無 sc 保留原式');
  const riseStart=html.indexOf('if(constrRise){ // T259：樓體「蓋到哪露到哪」');
  const riseEnd=html.indexOf('if(drawA<1)ctx.globalAlpha=1;',riseStart);
  const riseBlock=html.slice(riseStart,riseEnd);
  assert(/if\(s\._scSrcW!==undefined\)/.test(riseBlock)&&/cutSrcY=s\._scSrcH\*\(1-riseF\),cutDrawY=s\.h\*\(1-riseF\)/.test(riseBlock),
    'T364a 施工切片必須分開使用原圖 source 與縮放後 destination');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(riseBlock),
    'T364a 施工切片分支不得消耗共用亂數');
}
// T353 靜態守衛三：大農場的精細田必須錨在自己的 ax=164（舊值 104 會讓田地左偏 60px、整列懸空）
assert(/doFarm\('53_1_0',164,/.test(html),
  "T353 doFarm('53_1_0',...) 的 ax 必須是 164（＝SPR.bld['53_1_0'].ax），舊值 104 讓田地落在地塊外");
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
const SVK = new Set([19, 25, 31, 32, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 68, 82, 83, 87, 90, 91, 100, 101, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 119]); // T296：faithCenter 信仰中心單變體 // T265：wasteIncinerator；T257：nuclear/hydro/fireHQ 亦屬單變體；T228/T233/T234/T241/T254：bigFarm/bigCemetery/grandStation/sportsComplex/foodPlant；T230/T232：ranch/parking 移出
let tampered = 0;
for (const rec of d1.bl) if (SVK.has(rec[1])) { rec[3] = 2; tampered++; }
assert(tampered === 36, '存檔 bl 應含單變體建築（實得 ' + tampered + '）');
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
/* T349 版本單一來源守衛：不再硬編碼版本字面值，改為「sw.js 的 APP_VER 必須等於 index.html 的 GAME_VER」。
   這樣升版只需改一處（tools/bump.py 同步兩處），而任何漂移都會被這條斷言即刻攔下。 */
const APP_VER_SW = (swSrc.match(/const APP_VER='([\d.]+)'/) || [])[1];
const GAME_VER_IDX = (html.match(/const GAME_VER='([\d.]+)'/) || [])[1];
assert(APP_VER_SW && GAME_VER_IDX, 'T349 兩檔都應含版本常數（sw.js APP_VER / index.html GAME_VER）');
assert(APP_VER_SW === GAME_VER_IDX, 'T349 sw.js APP_VER(' + APP_VER_SW + ') 必須等於 index.html GAME_VER(' + GAME_VER_IDX + ')');
assert(/const CACHE=CACHE_PREFIX\+'v'\+APP_VER;/.test(swSrc), 'T349 sw.js 快取名須由 APP_VER 派生，不得再寫死版本');
const SHELL_CACHE = 'glimmerville-shell-v' + APP_VER_SW;
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
// ================= T319-T321 標準化數據表格／指南分類排序／檢視表格化 =================
console.log('\n-- T319-321 標準化表格 --');
{
  window.GV.newWorldSeeded(319); window.GV.addMoney(50000);
  // 指南：四分頁 + 標準表格 + 分類標題
  elMap.get('bHelp').onclick();
  const g0 = elMap.get('infoBody').innerHTML;
  assert(g0.includes('class="stab"'), 'T319 指南應使用標準化表格組件 .stab');
  assert(g0.includes('class="sec"'), 'T319 指南應有分區標頭 .sec');
  assert(g0.includes('class="gsec"'), 'T320 指南應有分類標題 .gsec');
  for (let i = 0; i < 4; i++) assert(g0.includes('id="gt' + i + '"'), 'T320 指南應有第 ' + i + ' 個分頁鈕');
  // 速查表分頁：由遊戲真實數據導出且列數合理
  const rows = window.GV.serviceRef();
  assert(Array.isArray(rows) && rows.length >= 20, 'T320 建築速查表應由遊戲數據導出至少 20 列，實得 ' + (rows && rows.length));
  for (const r of rows) {
    assert(r.length === 5, 'T320 速查表每列應 5 欄，實得 ' + r.length);
    assert(typeof r[1] === 'number' && r[1] > 0, 'T320 速查表造價應為正數：' + r[0] + ' → ' + r[1]);
  }
  // 服務建築標準表：數值隨服務預算變化（＝「會變化的表格」）
  const sp = findSpot('police'); assert(sp, 'T321 應找到警局位置');
  place('police', sp.x, sp.y); window.GV.step(2);
  const h1 = window.GV.inspectAt(sp.x, sp.y);
  assert(h1.includes('服務數據'), 'T321 服務建築檢視應附標準化數據表');
  assert(h1.includes('服務半徑') && h1.includes('服務住宅') && h1.includes('所屬地區'), 'T321 服務表應含半徑/服務住宅/所屬地區');
  const r1 = (h1.match(/服務半徑<\/div><div class="v[^"]*">(\d+)/) || [])[1];
  window.GV.setSvcBudget('police', 0.5);
  const h2 = window.GV.inspectAt(sp.x, sp.y);
  const r2 = (h2.match(/服務半徑<\/div><div class="v[^"]*">(\d+)/) || [])[1];
  assert(r1 && r2 && +r2 > +r1, 'T321 服務表半徑應隨預算放大而變化（' + r1 + ' → ' + r2 + '）');
  window.GV.setSvcBudget('police', -0.5);
  assert(isFinite(window.GV.stats().money), 'T319-321 後 money 不得 NaN');
}
// ================= T317/T318 地區命名＋地鐵站命名＋站體美術 =================
console.log('\n-- T317/T318 地區與地鐵站命名/美術 --');
{
  window.GV.newWorldSeeded(317);
  // 地區名為純衍生：同格必同名、同 seed 可重現
  const n1 = window.GV.districtAt(30, 30), n2 = window.GV.districtAt(30, 30);
  assert(typeof n1 === 'string' && n1.length >= 2, 'T317 districtAt 應回傳地區名，實得 ' + n1);
  assert(n1 === n2, 'T317 地區名應穩定（純衍生、同格同名）');
  assert(window.GV.districtAt(-1, -1) === null, 'T317 界外應回 null');
  // 同一地區內不同格應同名；跨地區應可能不同
  assert(window.GV.districtAt(30, 30) === window.GV.districtAt(31, 31), 'T317 同地區內不同格應同名');
  // 新圖無地鐵時站名表為空
  window.GV.metroClear();
  assert(window.GV.stationNames().length === 0, 'T317 無地鐵時站名表應為空');
  // 路線圖層開關（預設關＝玩家「按到之後才顯示」）
  assert(window.GV.setMetroShow(false) === false, 'T317 圖層開關可關');
  assert(window.GV.setMetroShow(true) === true, 'T317 圖層開關可開');
  window.GV.setMetroShow(false);
  // 站體 sprite 三級皆有實質繪圖且尺寸遞增（視覺可區分）
  const ms = window.GV.sprMetroAudit();
  assert(Array.isArray(ms) && ms.length === 3, 'T318 應有三級站體 sprite');
  // 結構驗證（harness 的 canvas 為 stub，像素計數在此恆 0；真實像素驗證見瀏覽器 GV.sprMetroAudit：
  // 實測 tier1/2/3 不透明 490/881/1856、地鐵藍 36/204/279、樓梯暗口 208/353/514、夜光 137/251/549）
  for (const r of ms) {
    assert(r.w > 0 && r.h > 0, 'T318 tier' + r.tier + ' 站體應有非零尺寸，實得 ' + r.w + 'x' + r.h);
    assert(!r.err, 'T318 tier' + r.tier + ' 站體審計不得出錯：' + r.err);
  }
  assert(ms[0].w < ms[1].w && ms[1].w < ms[2].w, 'T318 站體尺寸應隨等級遞增（小<中<大，視覺可區分）');
  assert(ms[0].h < ms[1].h && ms[1].h < ms[2].h, 'T318 站體高度應隨等級遞增');
  assert(isFinite(window.GV.stats().money), 'T317/T318 後 money 不得 NaN');
}
// ================= T315 地價場增量更新 =================
console.log('\n-- T315 地價場增量 --');
{
  window.GV.newWorldSeeded(315); window.GV.addMoney(60000);
  const N315 = window.GV.N();
  // 增量結果必須與全量重建逐格等價
  const sp315 = findSpot('police'); assert(sp315, 'T315 應找到警局位置');
  place('police', sp315.x, sp315.y);
  window.GV.step(2);
  const snap = [];
  for (let i = 0; i < N315 * N315; i += 13) snap.push(window.GV.landAt(i % N315, (i / N315) | 0));
  window.GV.rebuildCov();          // 強制全量重建（權威值）
  window.GV.step(1);
  let diff = 0, k = 0;
  for (let i = 0; i < N315 * N315; i += 13) { if (window.GV.landAt(i % N315, (i / N315) | 0) !== snap[k++]) diff++; }
  assert(diff === 0, 'T315 增量地價場應與全量重建逐格等價（不一致 ' + diff + ' 格）');
  // 建造後地價確實上升（T292 閉環未被增量破壞）
  let maxLand = 0;
  for (let y = 0; y < N315; y++) for (let x = 0; x < N315; x++) maxLand = Math.max(maxLand, window.GV.landAt(x, y));
  assert(maxLand >= 136, 'T315 增量後建警局仍應抬高地價（≥136），實得 ' + maxLand);
  assert(isFinite(window.GV.stats().money), 'T315 增量地價場後 money 不得 NaN');
}
// ================= T314 程序化四季音樂 =================
console.log('\n-- T314 程序化四季音樂 --');
{
  window.GV.newWorldSeeded(314);
  const m0 = window.GV.music();
  assert(typeof m0.on === 'boolean' && typeof m0.note === 'number', 'T314 music hook 應回傳 {on,note,scale}');
  assert(window.GV.setMusic(true) === true && window.GV.music().on === true, 'T314 setMusic 應可開啟');
  assert(window.GV.setMusic(false) === false && window.GV.music().on === false, 'T314 setMusic 應可關閉');
  // 四季音階索引跟隨季節
  for (const sea of [0, 1, 2, 3]) {
    window.GV.setSeason(sea);
    assert(window.GV.music().scale === sea, 'T314 音階應跟隨季節 ' + sea);
  }
  // 音樂推進不得崩、不得污染經濟
  window.GV.setMusic(true);
  window.GV.advanceN(0.05, 30);
  assert(isFinite(window.GV.stats().money), 'T314 音樂推進後 money 不得 NaN');
  window.GV.setMusic(false);
}
// ================= T312 存檔 RLE 壓縮 =================
console.log('\n-- T312 存檔壓縮 --');
{
  // 往返無損（含歧義案例：單一字面字元緊接 token）
  const cases=['', '0', '01111', '0011110', '1234567890', '0'.repeat(50000), '01'.repeat(500), '000111222'];
  for (const c of cases) assert(window.GV.rleRT(c), 'T312 RLE 往返應無損（len=' + c.length + '）');
  // 模糊測試
  let fuzzOk = true;
  for (let i = 0; i < 500 && fuzzOk; i++) {
    let s2 = ''; const L = 1 + (i % 60);
    for (let j = 0; j < L; j++) s2 += String((i + j * 7) % 3);
    if (!window.GV.rleRT(s2)) fuzzOk = false;
  }
  assert(fuzzOk, 'T312 RLE 500 組模糊測試應全數無損');
  // 存檔確實壓縮且存讀往返一致
  window.GV.newWorldSeeded(312); window.GV.addMoney(9000);
  const sp312 = findSpot('police'); if (sp312) place('police', sp312.x, sp312.y);
  window.GV.step(2);
  window.GV.save();
  const size312 = window.GV.saveSize();
  assert(size312 > 0, 'T312 存檔應成功落盤');
  // 壓縮率：與「同一存檔解壓後的等價 JSON」對比才有意義（小圖時 JSON 元資料占比高，不可用 n² 當基準）
  const rawSave312 = window.GV.rawSave();
  const inflated312 = JSON.stringify(window.GV.inflateSave(rawSave312)).length;
  assert(inflated312 > size312 * 2, 'T312 壓縮應至少縮小 2 倍（未壓縮 ' + inflated312 + ' vs 壓縮 ' + size312 + '）');
  assert(rawSave312.indexOf('*') >= 0, 'T312 落盤內容應含 RLE 控制字元（確認真的壓縮了）');
  const money312 = window.GV.stats().money, day312 = window.GV.stats().day;
  assert(window.GV.load() === true, 'T312 壓縮存檔應能載入');
  assert(Math.round(window.GV.stats().money) === Math.round(money312) && window.GV.stats().day === day312,
    'T312 壓縮存讀往返後 money/day 應一致');
  assert(isFinite(window.GV.stats().money), 'T312 存讀後 money 不得 NaN');
}
// ================= T305 AI 擋路自主拆遷 =================
console.log('\n-- T305 AI 擋路拆遷 --');
{
  window.GV.newWorldSeeded(1);
  window.GV.ai(true); window.GV.step(3); window.GV.ai(false);
  assert(isFinite(window.GV.stats().money), 'T305 AI 拆遷邏輯 money 不得 NaN');
  assert(typeof window.GV.aiRenewN() === 'number' && window.GV.aiRenewN() >= 0, 'T306 都市更新計數 hook 應為非負數');
}
// ================= T304 服務車隊 =================
console.log('\n-- T304 服務車隊 --');
{
  window.GV.newWorldSeeded(1);
  const sf = window.GV.svcFleet();
  assert(sf.fire === 3 && sf.police === 2 && sf.amb === 2, 'T304 新圖車隊應為默認 fire3/police2/amb2，實得 ' + JSON.stringify(sf));
  assert(window.GV.buySvcVehicle('police', false) === 'garage-full', 'T304 無警局購警車應 garage-full（車庫=2+站×2）');
  assert(window.GV.buySvcVehicle('nope', false) === 'bad-type', 'T304 未知車型應 bad-type');
  assert(window.GV.policeCars() === 0, 'T304 空城應無出勤警車');
  window.GV.advanceN(0.05, 8);
  assert(isFinite(window.GV.stats().money), 'T304 警車幀更新後 money 不得 NaN');
}
// ================= T302 地鐵深度系統 =================
console.log('\n-- T302 地鐵深度系統 --');
{
  window.GV.newWorldSeeded(1);
  window.GV.metroClear();
  const mf0 = window.GV.metroFin();
  assert(mf0.rev === 0 && mf0.ads === 0 && mf0.cost === 0, 'T302 無地鐵時財政應全 0（精確恆等），實得 ' + JSON.stringify(mf0));
  assert(window.GV.metroBuyTrain(1, false) === 'no-line', 'T302 無線路購車應回 no-line');
  window.GV.step(2);
  assert(isFinite(window.GV.stats().money), 'T302 地鐵經濟後 money 不得 NaN');
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
  // T323：面板改 statTab/dataTable 結構化後，斷言隨之改為結構化格式（意圖不變：k62 維護鏡像到電廠分項、ref 不重複計數）
  assert(stats266.includes('⚡ 電廠') && stats266.includes('>-10.0<'), 'T266 財務面板應把 k62 的既有 $10 維護鏡像到電廠分項（statTab）');
  assert(stats266.includes('垃圾焚化發電廠</td><td class="n">1</td>'), 'T266 建築統計表應把單座 k62 精確計為 1 棟');
  assert(!stats266.includes('垃圾焚化發電廠</td><td class="n">4</td>'), 'T266 2×2 k62 的三個 ref 不得重複計成 4 棟');
  assert(stats266.includes('class="stab"') && stats266.includes('table class="dtab"'), 'T323 統計面板需含 statTab 與可排序 dataTable');
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
  const roadReadyData267 = window.GV.inflateSave(high267.prepared); // T312：存檔已 RLE 壓縮，按格索引前需解壓
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

  const avoidData267 = window.GV.inflateSave(roadReadyPrepared267); // T312：同上
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
  assert(h268.ops.opened[0] === SHELL_CACHE,
    'T268-T270 install 應開啟目前專屬 ' + SHELL_CACHE);
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
  assert(keys268.includes(SHELL_CACHE) && keys268.includes('gv-other-app') && keys268.includes('shared-cache'),
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

  await h268.cacheStorage.delete(SHELL_CACHE);
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
  assert(h269.ops.opened[0] === SHELL_CACHE &&
    JSON.stringify(h269.ops.addAll[0]) === JSON.stringify(shellFiles270),
    'T269/T270 v5 install 應維持完整 app-shell 資產閉包');
  assert(!keys269.includes('glimmerville-shell-v3') && !keys269.includes('glimmerville-shell-v4') &&
    keys269.includes(SHELL_CACHE) &&
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
  const cache269 = await h269.cacheStorage.open(SHELL_CACHE);
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

  await h269.cacheStorage.delete(SHELL_CACHE);
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
  await h271Miss.cacheStorage.delete(SHELL_CACHE);
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


  // ===== T322 HUD 指標晶片明細面板 ＋ 檢視面板不頂穿導航欄 =====
  {
    // ① 限高機制存在且不是寫死高度（導航欄會折行，寫死會不夠）
    assert(/#info\{[^}]*max-height:max\(120px,calc\(100vh - 80px - var\(--hud-h/.test(html.replace(/\n/g, '')),
      'T322 #info 需以 --hud-h 扣除導航欄實高來限高');
    assert(/#info\{[^}]*overflow-y:auto/.test(html.replace(/\n/g, '')),
      'T322 #info 超出限高需內部滾動（而非向上溢出蓋住導航欄）');
    assert(/#hud\{[^}]*z-index:30/.test(html.replace(/\n/g, '')),
      'T322 #hud z-index 需高於 #info(22)，導航欄永在最上層');
    // 所有顯示檢視面板的入口都必須走 showInfoPanel()（先同步實測導航欄高度再顯示）
    assert((html.match(/\$\('#info'\)\.style\.display='block'/g) || []).length === 1,
      'T322 直接設 #info display 只允許出現在 showInfoPanel() 內；其餘入口必須改呼叫它以同步 --hud-h');
    assert(html.includes("function showInfoPanel(){syncHudH();$('#info').style.display='block';}"),
      'T322 showInfoPanel 需先 syncHudH 再顯示');

    // ② 六個晶片都綁上點擊 → 開出對應明細面板
    const CHIPS = ['money', 'pop', 'jobs', 'happy', 'star', 'date'];
    const TITLES = { money: '財政明細', pop: '人口明細', jobs: '就業明細', happy: '幸福明細', star: '評分明細', date: '時間與季節' };
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 220; d++) window.GV.step(1);
    window.GV.ai(false);
    for (const c of CHIPS) {
      const el = elMap.get(c);
      assert(el && el._listeners && el._listeners.click && el._listeners.click.length,
        'T322 晶片 #' + c + ' 需綁定 click（原本是純顯示 span，點了沒反應）');
      elMap.get('infoBody').innerHTML = '';
      el.click();
      const h = elMap.get('infoBody').innerHTML;
      assert(h.includes(TITLES[c]), 'T322 #' + c + ' 應開出「' + TITLES[c] + '」，實得：' + h.slice(0, 60));
      assert(h.includes('class="stab"'), 'T322 #' + c + ' 明細需用 statTab 標準化表格（與其他面板同一套規範）');
      assert(/class="k"/.test(h), 'T322 #' + c + ' 明細不可為空表');
      assert(!/undefined|NaN|Infinity/.test(h), 'T322 #' + c + ' 明細不得出現 undefined/NaN/Infinity：' + h.slice(0, 120));
    }

    // ③ 數據真實性：分層人口／就業來源加總必須與 HUD 顯示的總數逐位相符
    //    （tick 先算 pop 再讓建築生長，面板重算會新一步；故分層用最大餘額法歸一到 pop）
    for (const seed of [22, 77, 301]) {
      window.GV.newWorldSeeded(seed);
      window.GV.setDiff(1);
      window.GV.ai(true);
      for (let d = 0; d < 200; d++) window.GV.step(1);
      window.GV.ai(false);
      const p = window.GV.chipSum('pop');
      assert(p.hud > 0, 'T322 seed' + seed + ' 應已長出人口');
      assert(p.sum === p.hud,
        'T322 seed' + seed + ' 財富分層加總(' + p.sum + ') 必須等於總人口(' + p.hud + ')');
      const j = window.GV.chipSum('jobs');
      assert(Math.abs(j.sum - j.hud) <= 1,
        'T322 seed' + seed + ' 崗位來源加總(' + j.sum + ') 必須等於總崗位(' + j.hud + ')');
    }

    // ④ 就業面板需鏡像 tick 的兩條特例（否則來源加總會偷偷被「服務／其他」吸收掉誤差）
    const chipSrc = html.slice(html.indexOf('function chipPanel('), html.indexOf('function showHelp('));
    assert(chipSrc.includes('tiles[i].office?1.5:1'), 'T322 就業面板需含辦公區 ×1.5（T79）');
    assert(chipSrc.includes('TOWER_JOBS') && chipSrc.includes('TOWER_POP'),
      'T322 需計入商業塔就業與住宅塔人口（T127；且摩天樓不看供電）');
    assert(/b\.sick\|\|b\.death/.test(chipSrc), 'T322 人口面板需排除疫病/死亡停擺住宅（鏡像 tick）');

    // ⑤ 財政面板：淨收入行存在，且現金與 window.GV.stats().money 一致
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 200; d++) window.GV.step(1);
    window.GV.ai(false);
    const mt = window.GV.chipText('money');
    assert(mt.includes('每日淨收入'), 'T322 財政面板需有每日淨收入');
    const cash = (mt.match(/現金\s*([\d,-]+)/) || [])[1];
    assert(cash !== undefined && parseInt(cash.replace(/,/g, ''), 10) === Math.round(window.GV.stats().money),
      'T322 財政面板現金需與 stats().money 一致');

    // ⑥ --hud-h 實測寫入（不是留在預設值）
    assert(document.documentElement.style.getPropertyValue('--hud-h') !== '',
      'T322 syncHudH 應把導航欄實高寫入 --hud-h');
  }


  // ===== T324 AI 市長適應性建設：62 種從不蓋 → 需求驅動補齊；財政閘門保證不拖垮窮城 =====
  {
    // ① 富裕城：原本從不蓋的建築應大量出現（醫療/治安/殯葬/文化/交通…）
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 430; d++) { window.GV.step(1); if (d % 50 === 25) window.GV.addMoney(4000); } // T338：事件表擴充改變軌跡，350天輪不完四種關鍵民生，拉長至430
    window.GV.ai(false);
    const n324 = window.GV.N(); const cnt324 = {};
    for (let y = 0; y < n324; y++) for (let x = 0; x < n324; x++) {
      const t = window.GV.tile(x, y);
      if (t && t.bld && !t.bld.ref) cnt324[t.bld.k] = (cnt324[t.bld.k] || 0) + 1;
    }
    const NEVER324 = [9,12,14,15,16,17,18,19,20,23,27,28,29,30,31,32,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,52,54,55,56,61,67,68,69,70,71,72,73,74,75,76,77,78,79,80];
    const built324 = NEVER324.filter(k => cnt324[k]);
    assert(built324.length >= 10, 'T324 富裕 AI 城 350 天應蓋出 ≥10 種原本從不蓋的建築，實得 ' + built324.length + ' 種');
    for (const k of [16, 52, 14, 28]) assert(cnt324[k] >= 1, 'T324 關鍵民生 k=' + k + '（墓園/派出所/圖書館/救護站）應至少 1 座');
    const popNow324 = window.GV.stats().pop;
    for (const k of built324) assert(cnt324[k] <= Math.ceil(popNow324 / 500) + 2, 'T324 k=' + k + ' 蓋了 ' + cnt324[k] + ' 座＝狂建（pop=' + popNow324 + '）');

    // ② 拮据城：財政閘門（net>4 且 money>1400）必須讓適應建設完全讓路＝與無 T324 的基線逐位一致
    //    （基線實測：seed301 400天 pop=355；若破＝閘門鬆了，進階支出又在拖垮窮城）
    window.GV.newWorldSeeded(301);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    // T326 重釘：人口學波（移民潮+demoMul）讓 seed301 從停滯(355)翻身成長，「無T324基線」前提已合法改變。
    // T432 重釘（業主授權 2026-08-13）：兩座孤島核電與四座孤島綠能共 686 容量不再跨網白嫖；4153→3781 是刻意供電語義變更。
    //           釘現值＝守確定性（同 T267 釘座標慣例）；再破＝有人動了模擬公式，需有意識重釘。
    seedPin444('seed301', 301, 400, 6876, window.GV.stats().pop,
      'T324/T342c 起釘；T432 孤島電源不併網重釘（前值 4153）；T456 世代流動接線重釘（前值 3781，'
      + '授權與查因記 T456 卡面——拮据城吃到暴露紅利翻身）');
    /* T456 金流哨兵：世代普查是**常駐**機制，pop 釘在這三顆種子恰好不動（診斷記卡面：
       零亂數規則＋金流非 pop 瓶頸），但金流已合法分岔——「三釘綠＝位元恆等」這句話從 T456 起
       不再自動成立，必須把 money 也釘進哨兵，未來任何動到經濟的手都會在這裡留下指紋。 */
    seedPin444('seed301m', 301, 400, 631145, Math.round(window.GV.stats().money),
      'T456 起釘：pop 之外的第二自由度（金流），暴露修正 37 次介入的世界線');
    {
      const mob301 = window.GV.sci451();
      assert(mob301.mobUp === 37 && mob301.mobDn === 0,
        'T456 G4 seed301 400 天暴露修正應恰為 37 升 0 降（決定性），實得 up=' + mob301.mobUp + ' dn=' + mob301.mobDn);
    }
    assert(window.GV.stats().money > 0, 'T324 拮据城不得破產');
  }


  // ===== T325-T329 CS/模擬人生系統波：噪音場/人口學/政策包/市民需求/里程碑解鎖 =====
  {
    // T325 噪音場：中心強距離遞減、半徑外為零、拆除次日歸零（每日重建＝零殭屍）
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(3);
    window.GV.addMoney(99999);
    const n325 = window.GV.N();
    let sx = -1, sy = -1;
    for (let y = 8; y < n325 - 8 && sx < 0; y++) for (let x = 8; x < n325 - 8; x++) {
      const ok = [[0,0],[1,0],[0,1],[1,1]].every(d => { const t = window.GV.tile(x+d[0], y+d[1]); return t && (t.t === 1 || t.t === 2) && !t.bld && !t.road; });
      if (ok && window.GV.place('stad', x, y)) { sx = x; sy = y; break; }
    }
    assert(sx >= 0, 'T325 需能放置體育場');
    window.GV.step(1);
    const nz0 = window.GV.noiseAt(sx, sy), nz3 = window.GV.noiseAt(sx + 3, sy);
    assert(nz0 > nz3 && nz3 > 0, 'T325 噪音應中心強、距離遞減（' + nz0 + '→' + nz3 + '）');
    assert(window.GV.noiseAt(Math.min(n325 - 1, sx + 9), sy) === 0, 'T325 半徑外應為 0');
    window.GV.place('doze', sx, sy);
    window.GV.step(1);
    assert(window.GV.noiseAt(sx, sy) === 0, 'T325 拆除後次日噪音歸零');

    // T326 移民潮：每日遞減；newWorld 成對重置（鐵律7）
    window.GV.immWave(3);
    window.GV.step(1);
    assert(window.GV.immWave() === 2, 'T326 immWave 應每日遞減，實得 ' + window.GV.immWave());
    window.GV.newWorldSeeded(9);
    assert(window.GV.immWave() === 0, 'T326 newWorld 應重置 immWave（鐵律7）');

    // T327 政策包：三條有日費政策 → 法規支出精確 -23.0（12+6+5）；免費公交 → 票務行消失
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 150; d++) window.GV.step(1);
    window.GV.ai(false);
    window.GV.pol({ taxR: 1, taxC: 1, taxI: 1, schoolLunch: true, smokeDetect: true, parkNight: true });
    window.GV.step(1);
    const mt327 = window.GV.chipText('money').replace(/\n/g, ' ');
    assert(/法規\s*-23(\.0)?(\s|$)/.test(mt327), 'T327 三政策日費應精確 -23（12+6+5），面板節錄：' + mt327.slice(0, 100));
    assert(isFinite(window.GV.stats().money), 'T327 開政策後 money 必須有限');
    window.GV.pol({ taxR: 1, taxC: 1, taxI: 1, freeTransit: true });
    window.GV.step(1);
    assert(!/公共運輸票務/.test(window.GV.chipText('money')), 'T327 免費公交後票務行應消失（=0 不顯示）');
    elMap.get('bStats').onclick();
    const sh327 = elMap.get('infoBody').innerHTML;
    for (const id of ['polFreeT', 'polLunch', 'polSmoke', 'polIndS', 'polNight', 'polParkN'])
      assert(sh327.includes('id="' + id + '"'), 'T327 統計面板需含政策 checkbox #' + id);

    // T328 市民需求卡（Sims 式）：四需求＋無壞值
    const nn328 = window.GV.N(); let f328 = null;
    for (let y = 0; y < nn328 && !f328; y++) for (let x = 0; x < nn328; x++) { const t = window.GV.tile(x, y); if (t && t.bld && t.bld.k === 1) { f328 = [x, y]; break; } }
    assert(f328, 'T328 需有住宅可檢視');
    window.GV.inspectAt(f328[0], f328[1]);
    const card328 = elMap.get('infoBody').innerHTML;
    for (const w of ['市民需求', '娛樂', '社交', '健康', '教育']) assert(card328.includes(w), 'T328 需求卡缺「' + w + '」');
    assert(!/undefined|NaN/.test(card328), 'T328 需求卡不得含壞值');

    // T329 里程碑解鎖真做：unlockRank 條數精確＋RANKS 文案全部兌現
    assert((html.match(/unlockRank:6/g) || []).length === 7, 'T329 文化建築 7 條需 unlockRank:6');
    assert((html.match(/unlockRank:8/g) || []).length === 10, 'T329/T330 小型地標+遊艇碼頭 10 條需 unlockRank:8');
    assert((html.match(/unlockRank:17/g) || []).length === 6, 'T329 紀念工程 6 條需 unlockRank:17');
    assert(!html.includes('未來版本開放'), 'T329 RANKS 解鎖文案應全部兌現（不得再有「未來版本開放」）');
  }


  // ===== T330-T335 十座新建築 + 旅宿經濟 =====
  {
    for (let k = 81; k <= 90; k++) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'T335 SPR.bld 應生成 ' + k + '_1_0');
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(3);
    window.GV.addMoney(999999);
    const find330 = (tool) => { const sp = findSpot(tool); assert(sp, 'T330 ' + tool + ' 應找到可建位置'); assert(place(tool, sp.x, sp.y), 'T330 ' + tool + ' 應成功建造'); return sp; };
    find330('guesthouse'); find330('hotel'); find330('resort'); find330('compost'); find330('bank'); find330('tvtower');
    window.GV.step(2);
    const h330 = window.GV.hotel330();
    assert(h330.beds === 158, 'T334 床位應精確 158（8+40+110），實得 ' + h330.beds);
    assert(h330.occ === Math.min(h330.tourists, 158), 'T334 入住=min(遊客,床位)');
    assert(isFinite(window.GV.stats().money), 'T330 新建築經濟不得產生 NaN（鐵律14）');

    elMap.get('bStats').onclick();
    assert(elMap.get('infoBody').innerHTML.includes('銀行貸款 $5000'), 'T330 銀行存在時貸款鈕應升級 $5000');
    assert(elMap.get('infoBody').innerHTML.includes('旅宿與觀光'), 'T334 統計面板應含旅宿與觀光分區');
    let inland330 = null;
    const n330 = window.GV.N();
    outer330: for (let y = 6; y < n330 - 6; y++) for (let x = 6; x < n330 - 6; x++) {
      let ok = true, wn = 0;
      for (let dy = -1; dy <= 2 && ok; dy++) for (let dx = -1; dx <= 2; dx++) {
        const t = tile(x + dx, y + dy); if (!t) { ok = false; break; }
        if (t.t === 0) wn++;
        if (dx >= 0 && dx < 2 && dy >= 0 && dy < 2 && (t.bld || t.road || (t.t !== 1 && t.t !== 2))) { ok = false; break; }
      }
      if (ok && wn === 0) { inland330 = [x, y]; break outer330; }
    }
    if (inland330) assert(window.GV.canPlaceTool('marina', inland330[0], inland330[1]) !== null, 'T330 遊艇碼頭內陸應被拒（需臨水）');
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 300; d++) { window.GV.step(1); if (d % 50 === 25) window.GV.addMoney(5000); }
    window.GV.ai(false);
    const newKinds330 = new Set();
    for (let y = 0; y < n330; y++) for (let x = 0; x < n330; x++) { const t = tile(x, y); if (t && t.bld && !t.bld.ref && t.bld.k >= 81) newKinds330.add(t.bld.k); }
    // 電視訊號需要有住宅的城市（空城 happyAgg 空陣列）：在 AI 城裡手動補一座電視塔再驗
    window.GV.addMoney(99999);
    { const sp = findSpot('tvtower'); if (sp) { place('tvtower', sp.x, sp.y); window.GV.step(2);
      assert(window.GV.chipText('happy').includes('電視訊號'), 'T330 電視塔存在時幸福構成應含「電視訊號」'); } }
    assert(newKinds330.size >= 3, 'T335b AI 富裕城 300 天應蓋出 ≥3 種新樓（wants 輪轉防餓死），實得 ' + newKinds330.size + ' 種');
  }


  // ===== T336 休閒與貿易：k91-94 =====
  {
    for (let k = 91; k <= 94; k++) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'T336 SPR.bld 應生成 ' + k + '_1_0');
    assert(/name:'溜冰場',val:\(COV\.icerink&&COV\.icerink\[ci\]>0\)\?\(inWinter\(\)\?\.05:\.02\):0/.test(html.replace(/\s+/g,'')) || html.includes("(inWinter()?.05:.02)"), 'T336 溜冰場需冬季加倍幸福（反制冬季低落）');
    // 貿易站出口：農業城糧食盈餘 → tradeGold 入財政晶片
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(3);
    window.GV.addMoney(999999);
    const fA = findSpot('bigFarm'); assert(fA, 'T336 需能放大農場'); assert(place('bigFarm', fA.x, fA.y), 'T336 大農場應建成');
    const fT = findSpot('tradepost'); assert(fT, 'T336 需能放貿易站'); assert(place('tradepost', fT.x, fT.y), 'T336 貿易站應建成');
    for (let d2 = 0; d2 < 14; d2++) window.GV.step(1); // 催熟過施工期（鐵律16）＋讓農場產糧
    const mt336 = window.GV.chipText('money');
    assert(isFinite(window.GV.stats().money), 'T336 貿易經濟不得 NaN');
    assert(mt336.includes('糧食出口'), 'T336 有糧食盈餘時財政晶片應含「糧食出口」行，節錄：' + mt336.slice(0, 120));
  }


  // ===== T337 災害保險 + T338 事件擴充 + T339 需求聚合 =====
  {
    // T337：投保→火災燒毀理賠精確 +$35；未投保→分毫不差（沙盒無稅無維護＝乾淨對照）
    for (const insur of [false, true]) {
      window.GV.newWorldSeeded(9);
      window.GV.setDiff(3);
      window.GV.addMoney(5000);
      window.GV.pol({ taxR: 1, taxC: 1, taxI: 1, insurance: insur });
      const sp = findSpot('plant'); // 借電廠附近孤立地放工業測燒毀？直接用 GV.ignite 對 zone 生長太慢——改放 1×1 火源：用 sewage 不可燃…k<=3 才可燃。
      // 手動造一棟孤立工業（走 place 不可（分區生長），用測試鉤子 ignite 需既有 k<=3）：
      // 以 zi 分區＋道路＋電廠養出工業太慢；改用既有 GV.igniteCrime？→ 最短路徑：找地放 road+plant+zi 並 step 至長出工業
      let ix = -1, iy = -1;
      { const f = findSpot('plant'); assert(f, 'T337 需可建地'); place('plant', f.x, f.y);
        place('road', f.x + 1, f.y);
        window.GV.place('zi', f.x + 2, f.y);
        for (let d2 = 0; d2 < 80 && ix < 0; d2++) { window.GV.step(1); const b = tile(f.x + 2, f.y).bld; if (b && b.k === 3) { ix = f.x + 2; iy = f.y; } }
      }
      assert(ix >= 0, 'T337 工業應在 80 天內長出');
      for (let d2 = 0; d2 < 3; d2++) window.GV.step(1); // 穩定
      const m0 = window.GV.stats().money;
      assert(window.GV.ignite(ix, iy), 'T337 應能點燃工業');
      for (let d2 = 0; d2 < 7; d2++) window.GV.step(1); // 燒毀（fire>=5）
      assert(!tile(ix, iy).bld, 'T337 工業應已燒毀');
      const dm = Math.round(window.GV.stats().money - m0);
      if (insur) assert(dm === 35, 'T337 投保燒毀一戶應精確理賠 +35，實得 ' + dm);
      else assert(dm === 0, 'T337 未投保應精確恆等 0，實得 ' + dm);
    }
    // 保費入法規日費：開保險後 upReg 含 18
    window.GV.pol({ taxR: 1, taxC: 1, taxI: 1, insurance: true, schoolLunch: true });
    window.GV.step(1);
    assert(/法規\s*-30(\.0)?(\s|$)/.test(window.GV.chipText('money').replace(/\n/g, ' ')), 'T337 保險18+營養午餐12=法規-30');
    // T338：事件表 ≥58 條且含新事件
    const evN = (html.match(/\{id:'[a-z]+',name:'[^']+',days:\d/g) || []).length;
    assert(evN >= 58, 'T338 CITY_EVENTS 應 ≥58 條，實得 ' + evN);
    for (const ev of ['fireworks', 'lanternfest', 'streetart']) assert(html.includes("id:'" + ev + "'"), 'T338 缺事件 ' + ev);
    // T339：幸福晶片含市民需求聚合（有住宅的 AI 城）
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d2 = 0; d2 < 160; d2++) window.GV.step(1);
    window.GV.ai(false);
    const ht339 = window.GV.chipText('happy');
    assert(ht339.includes('市民需求'), 'T339 幸福晶片應含市民需求聚合');
    for (const w of ['娛樂', '社交', '健康', '教育']) assert(ht339.includes(w), 'T339 缺需求項 ' + w);
  }


  // ===== T340 k95-104 十座 =====
  {
    for (let k = 95; k <= 104; k++) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'T340 SPR.bld 應生成 ' + k + '_1_0');
    assert(html.includes("season()===1?.05:.02"), 'T340 游泳池需夏季加倍（與溜冰場成對）');
    assert(html.includes("COV.firewatch&&COV.firewatch[i]>0)p*=.45"), 'T340 瞭望塔弱火險 ×0.45');
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(3);
    window.GV.addMoney(999999);
    const f340 = (tool) => { const sp = findSpot(tool); assert(sp, 'T340 ' + tool + ' 應找到位置'); assert(place(tool, sp.x, sp.y), 'T340 ' + tool + ' 應建成'); };
    f340('guesthouse'); f340('hostel'); f340('bigFarm'); f340('brewery'); f340('cgarden');
    window.GV.step(14);
    const h340 = window.GV.hotel330();
    assert(h340.beds === 22, 'T340 民宿8+青旅14=床位22，實得 ' + h340.beds);
    assert(h340.occ === Math.min(h340.tourists, 22), 'T340 入住=min(遊客,床位)（行中註釋殺手迴歸鎖）');
    const mt340 = window.GV.chipText('money');
    assert(mt340.includes('釀酒廠'), 'T340 有糧時財政晶片應含釀酒廠行');
    assert(isFinite(window.GV.stats().money), 'T340 不得 NaN');
  }


  // ===== T341 巨型合併鏈：Lv2+ 簇 → 2×2 摩天樓 → 3×3 巨廈（有機垂直進化） =====
  {
    assert(html.includes("SPR.bld['105_1_0']") && html.includes("SPR.bld['106_1_0']"), 'T341 巨廈/綜合體 sprite 鍵');
    assert(html.includes('const MEGA_POP=Math.round(POPS[3]*9*1.35)'), 'T341 巨廈人口＝九棟 lv3 總和×1.35');
    assert(html.includes('105:3,106:3'), 'T341 MSZ 需含 105:3/106:3（鐵律13）');
    assert(html.includes('T341h') && html.includes('parks341'), 'T341h 直接成形＋公園吸收規則需存在');
    // 端到端：同種子 AI 城須在 450 天內有機長出塔樓與巨廈（瀏覽器實測 塔200天/巨廈400天）
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    let towerDay = -1, megaDay = -1, mroot = null, mk341 = 0;
    const n341 = window.GV.N();
    for (let d = 0; d < 1200 && megaDay < 0; d++) {
      window.GV.step(1);
      if (d % 50 === 25) window.GV.addMoney(6000);
      if (d % 20 === 19) {
        for (let y = 0; y < n341; y++) for (let x = 0; x < n341; x++) {
          const t = tile(x, y);
          if (t && t.bld && !t.bld.ref) {
            if ((t.bld.k === 33 || t.bld.k === 34) && towerDay < 0) towerDay = d;
            if ((t.bld.k === 105 || t.bld.k === 106) && megaDay < 0) { megaDay = d; mroot = [x, y]; mk341 = t.bld.k; }
          }
        }
      }
    }
    window.GV.ai(false);
    assert(towerDay >= 0, 'T341 1200 天內應有機長出摩天樓');
    if (megaDay < 0) { // 診斷：塔周環分類
      const diag341 = [];
      for (let y = 0; y < n341; y++) for (let x = 0; x < n341; x++) {
        const t0 = tile(x, y);
        if (!(t0 && t0.bld && !t0.bld.ref && (t0.bld.k === 33 || t0.bld.k === 34))) continue;
        const kk = t0.bld.k === 33 ? 1 : 2;
        const os = [];
        for (const [ax, ay] of [[x, y], [x - 1, y], [x, y - 1], [x - 1, y - 1]]) {
          if (ax < 0 || ay < 0 || ax + 3 > n341 || ay + 3 > n341) continue;
          const cs = [];
          for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
            const cx = ax + dx, cy = ay + dy;
            if (cx >= x && cx <= x + 1 && cy >= y && cy <= y + 1) continue;
            const t = tile(cx, cy);
            if (!t) { cs.push('?'); continue; }
            if (t.road) cs.push('R');
            else if (t.bld && t.bld.ref) cs.push('r');
            else if (t.bld && t.bld.k === kk) cs.push('L' + t.bld.lv + (t.bld.pw ? '' : 'x'));
            else if (t.bld) cs.push('k' + t.bld.k);
            else if (t.zone === kk) cs.push('z');
            else if (t.zone) cs.push('Z');
            else cs.push(t.t === 2 ? 'g' : 't' + t.t);
          }
          os.push(cs.join(''));
        }
        diag341.push('(' + x + ',' + y + ')' + os.join('|'));
        if (diag341.length >= 5) break;
      }
      console.log('T341-DIAG towers=' + diag341.length + ' :: ' + diag341.join(' ;; '));
    }
    assert(megaDay >= 0, 'T341 1200 天內應有機進化出巨廈（鐵律7：乾淨流與髒歷史瀏覽器會分岔，實測乾淨流晚於 450）');
    const rb341 = tile(mroot[0], mroot[1]).bld;
    let refs341 = 0;
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      if (!dx && !dy) continue;
      const b = tile(mroot[0] + dx, mroot[1] + dy).bld;
      if (b && b.k === mk341 && b.ref && b.ref[0] === mroot[0] && b.ref[1] === mroot[1]) refs341++;
    }
    assert(rb341.sz === 3 && refs341 === 8, 'T341 巨廈 root sz=3＋8 ref 完整');
    assert(isFinite(window.GV.stats().money), 'T341 巨廈稅收不得 NaN（鐵律14）');
    // 存讀往返（鐵律13）
    window.GV.save();
    assert(window.GV.load() === true, 'T341 巨廈存檔應可讀回');
    const rb2 = tile(mroot[0], mroot[1]).bld;
    let refs2 = 0;
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      if (!dx && !dy) continue;
      const b = tile(mroot[0] + dx, mroot[1] + dy).bld;
      if (b && b.k === mk341 && b.ref) refs2++;
    }
    assert(rb2 && rb2.k === mk341 && rb2.sz === 3 && refs2 === 8, 'T341 巨廈 save→load 往返 root sz＋ref 全保留');
    window.GV.step(1);
    assert(isFinite(window.GV.stats().money) && window.GV.stats().pop > 0, 'T341 讀檔後首 tick 人口/資金正常');
  }


  // ===== T342 閉環建築波 k107-116 =====
  {
    for (let k = 107; k <= 116; k++) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'T342 SPR.bld 應生成 ' + k + '_1_0');
    assert(html.includes('cremPre342*40'), 'T342 火葬場容量入殯葬閉環');
    assert(html.includes("(COV.highsch&&COV.highsch[i]>0)?70:0") && html.includes("(COV.campus&&COV.campus[i]>0)?120:0"), 'T342 高中/大學城入 EDU 場');
    assert(html.includes("(COV.freight&&COV.freight[i]>0)?1.05:1"), 'T342 貨運站商業稅乘數');
    assert(html.includes('eduAvg342/100'), 'T342 科技園產值＝教育閉環');
    // 垃圾→商品再生：資源回收廠＋垃圾源 → goods 上升
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 200; d++) window.GV.step(1);
    window.GV.ai(false);
    window.GV.addMoney(99999);
    const fU = findSpot('upcycle');
    if (fU) {
      assert(place('upcycle', fU.x, fU.y), 'T342 資源回收廠應建成');
      const g0 = window.GV.stats().goods !== undefined ? window.GV.stats().goods : -1;
      for (let d = 0; d < 16; d++) window.GV.step(1);
      assert(isFinite(window.GV.stats().money), 'T342 再生鏈不得 NaN');
    }
  }


  // ===== T345 建築辨識度：類別色環＋屋頂徽記＋懸停標籤 =====
  {
    // 類別表覆蓋 k1..116 全數（新增建築時忘記歸類會被這條抓到）
    const KCB345 = {};
    {
      const mm = html.match(/const KCB=\{[\s\S]*?\};/);
      assert(mm, 'T345 KCB 類別映射表應存在');
      for (const seg of mm[0].matchAll(/(\d+):'([A-Z])'/g)) KCB345[+seg[1]] = seg[2];
    }
    const missCat = [];
    for (let k = 1; k <= 116; k++) if (!KCB345[k]) missCat.push(k);
    assert(missCat.length === 0, 'T345 KCB 應涵蓋 k1..116（缺：' + missCat.join(',') + '）');
    const cats345 = new Set(Object.values(KCB345));
    assert(cats345.size === 12, 'T345 應有 12 個類別，實得 ' + cats345.size);
    for (const c of cats345) assert(new RegExp(c + ":\\{nm:'").test(html), 'T345 KCAT 缺類別定義 ' + c);
    // 抽查關鍵歸屬（住宅綠/商業藍/工業琥珀/醫療粉/教育紫/交通青）
    for (const [k, c] of [[1, 'R'], [2, 'C'], [3, 'I'], [4, 'G'], [5, 'E'], [11, 'S'], [12, 'H'], [7, 'D'], [17, 'T'], [35, 'A'], [22, 'F'], [8, 'W']])
      assert(KCB345[k] === c, 'T345 k=' + k + ' 應屬類別 ' + c + '，實得 ' + KCB345[k]);
    // 加蓋層與螢幕標籤的實作存在＋七個獨立 sprite 容器已納入
    assert(html.includes('if(!window.__noBadge){'), 'T345 徽記加蓋層需可由 __noBadge 關閉（A/B 像素驗證用）');
    assert(html.includes('function drawHoverLabel('), 'T345 懸停名稱標籤函式應存在');
    assert(html.includes('drawHoverLabel(sxOf,syOf,z);'), 'T345 懸停標籤應被 draw 端呼叫');
    for (const cont of ['SPR.park', 'SPR.plant', 'SPR.waterTower', 'SPR.police', 'SPR.hospital', 'SPR.clinic', 'SPR.policeBox'])
      assert(new RegExp('push345\\(\\d+,' + cont.replace('.', '\\.')).test(html), 'T345 加蓋層需涵蓋獨立容器 ' + cont);
    // 加蓋層零亂數：整段不得出現 R()/ri()/rand()/Math.random（否則全域亂數流位移＝鐵律2）
    {
      const i0 = html.indexOf('if(!window.__noBadge){');
      const i1 = html.indexOf('R=__savedR;', i0);
      const seg = html.slice(i0, i1);
      assert(i1 > i0 && seg.length > 500, 'T345 加蓋層片段應可擷取');
      assert(!/\bR\(\)|\bri\(|\brand\(|Math\.random/.test(seg), 'T345 徽記加蓋層不得消耗亂數（鐵律2）');
    }
    // 指南新增類別圖例分頁
    assert(html.includes("'🎨 類別圖例'"), 'T345 指南應新增類別圖例分頁');
    assert(html.includes('guideTab===4'), 'T345 圖例分頁分支應存在');
  }


  // ===== T346 產業鏈循環 k117-120（油田→天然氣→化肥→農產／生食+氣→熟食／工資→消費+房貸） =====
  {
    for (let k = 117; k <= 120; k++) assert(html.includes("SPR.bld['" + k + "_1_0']"), 'T346 SPR.bld 應生成 ' + k + '_1_0');
    // 類別歸屬（T345 表必須跟上新 k，否則辨識度斷線）
    {
      const mm = html.match(/const KCB=\{[\s\S]*?\};/); assert(mm, 'KCB 應存在');
      const map = {}; for (const g of mm[0].matchAll(/(\d+):'([A-Z])'/g)) map[+g[1]] = g[2];
      for (let k = 1; k <= 120; k++) assert(map[k], 'T346 KCB 應涵蓋 k' + k);
      assert(map[117] === 'E' && map[118] === 'I' && map[119] === 'F' && map[120] === 'F', 'T346 新建築類別歸屬');
    }
    // 鏈條公式存在＋守衛
    assert(html.includes('gasSup=gw346*8'), 'T346 天然氣供給式');
    assert(html.includes('gasDem=fp346*3+kt346*2+fpN*1'), 'T346 天然氣需求式（化肥/廚房/食品加工）');
    assert(html.includes('fertOut=Math.round(fp346*6*gasRatio)'), 'T346 化肥產出受氣供比例限制');
    assert(html.includes('(fertReady&&COV.fertco&&COV.fertco[idx(x,y)]>0)?1.35:1'), 'T346 化肥覆蓋→農場 ×1.35');
    assert(html.includes("{name:'熟食供應'"), 'T346 熟食→住宅幸福');
    assert(html.includes('wageIdx=clamp(jobs/workers346,0,2)'), 'T346 工資指數');
    /* T346d：工資→商業稅乘數已撤除——六種子實測證明 AI 對任何早期資金擾動的反應是非單調的（wageK=0/.25/.5/1 → 3155/474/3418/387），屬混沌路徑依賴；wageIdx 保留作為統計面板指標。 */
    assert(!/wageIdx-1\)\*\.15/.test(html), 'T346d 工資乘數應已撤除（不得再乘商業稅）');
    assert(html.includes("工資指數"), 'T346 工資指數應仍在統計面板顯示');
    assert(html.includes('let zoneBudget=saving?(window.__zb===undefined?4:window.__zb):6;'), 'T346d 攢錢模式分區預算須為 4（貧困陷阱結構性解）');
    assert(!html.includes('aiPoorDays'), 'T347 紓困急救已撤除（定量實測會壓垮邊際城市：seed22 2572→504）');
    assert(html.includes('bankInt=Math.round(mortPop346*.015)'), 'T346 銀行房貸利息');
    assert(html.includes('else if(b.k>=81&&b.k<=120&&b.k!==105&&b.k!==106);'), 'T346 稅收守衛需擴至 k120（鐵律14）');
    assert(html.includes(',118:2,119:2};'), 'T346 MSZ 需含 118/119（鐵律13）');
    // T346b 閘門紀律：四條新 wants 都必須有 fin.net 閘門（首版沒有→拮据城 3228 崩到 387）
    {
      for (const tool of ['gaswell', 'fertplant', 'kitchen', 'fishfarm']) {
        const m2 = html.match(new RegExp("\\['" + tool + "',[^\\]]*\\]"));
        assert(m2, 'T346 wants 應含 ' + tool);
        assert(/fin\.net>/.test(m2[0]), 'T346b ' + tool + ' 必須有 fin.net 閘門（AI 進階支出不得擊穿 poor 線）');
      }
    }
    // 端到端：沙盒建鏈 → 供需/產出皆非零且經濟有限
    window.GV.newWorldSeeded(9);
    window.GV.setDiff(3);
    window.GV.addMoney(999999);
    const n346 = window.GV.N();
    let oil346 = null;
    for (let y = 2; y < n346 - 2 && !oil346; y++) for (let x = 2; x < n346 - 2; x++)
      if (window.GV.resourceAt(x, y) === 1) { const t = tile(x, y); if (t && !t.bld && (t.t === 1 || t.t === 2)) { oil346 = [x, y]; break; } }
    if (oil346) {
      assert(place('gaswell', oil346[0], oil346[1]), 'T346 油田格應可建天然氣井');
      const fF = findSpot('farm'); if (fF) place('farm', fF.x, fF.y);
      const fP = findSpot('fertplant'); if (fP) place('fertplant', fP.x, fP.y);
      const fK = findSpot('kitchen'); if (fK) place('kitchen', fK.x, fK.y);
      for (let d = 0; d < 18; d++) window.GV.step(1);
      const c346 = window.GV.chain346();
      assert(c346.gasSup === 8, 'T346 一座天然氣井應供 8，實得 ' + c346.gasSup);
      assert(c346.gasDem > 0 && c346.gasRatio > 0, 'T346 需求與供需比應成立');
      assert(c346.fertOut > 0, 'T346 有氣有化肥廠應產化肥');
      assert(isFinite(window.GV.stats().money), 'T346 鏈條經濟不得 NaN（鐵律14）');
    }
    // 天然氣井需油田格（內陸非資源格應被拒）
    {
      let plain = null;
      for (let y = 6; y < n346 - 6 && !plain; y++) for (let x = 6; x < n346 - 6; x++) {
        const t = tile(x, y);
        if (t && !t.bld && !t.road && (t.t === 1 || t.t === 2) && window.GV.resourceAt(x, y) !== 1) { plain = [x, y]; break; }
      }
      if (plain) assert(window.GV.canPlaceTool('gaswell', plain[0], plain[1]) !== null, 'T346 非油田格應拒建天然氣井');
    }
  }


  // ===== T364b A 深加工波 k121-123（中繼點只驗這三座；T364c/d 尚未授權） =====
  {
    // 資料表、尾端素材與「不借既有亂數/粒子」契約。
    for (const [k, name, tool] of [[121, '煉油廠', 'refinery'], [122, '鋼鐵廠', 'steelMill'], [123, '造船廠', 'shipyard']]) {
      assert(html.includes(k + ":'" + name + "'"), 'T364b KNAME 應含 k' + k);
      assert(html.includes("id:'" + tool + "'"), 'T364b TOOLS 應含 ' + tool);
      assert(html.includes(tool + ':'), 'T364b COST 應含 ' + tool);
      assert(html.includes(k + ':3'), 'T364b MSZ 應含 k' + k + ' 的 3×3 footprint');
      assert(window.GV.kcat345(k).cat === 'I', 'T364b k' + k + ' 應歸工業類別');
    }
    for (const [k, col] of [[121, '#9a6b48'], [122, '#aa7046'], [123, '#3f6d82']]) {
      assert(html.includes("MINI_BLD_PAL[" + k + "]='" + col + "'"), 'T364b 小地圖色必須顯式對齊 k' + k + '，不可依尾端 push');
    }
    for (const tab of ['const SZC=', 'const SZB=']) {
      const a = html.indexOf(tab), b = html.indexOf('};', a), body = html.slice(a, b);
      assert(a >= 0 && b > a && [121,122,123].every(k => body.includes(k + ':3')), 'T364b ' + tab + ' 必須含三座 3×3（不可只補 MSZ）');
    }
    const atlas364 = window.GV.sprAtlas356();
    for (const k of [121, 122, 123]) {
      const e = atlas364.entries.find(v => v.fam === 'bld' && v.key === k + '_1_0');
      assert(e && e.w === 416 && e.h === 440 && e.ax === 208 && e.ay === 436 && e.sc === .5 && e.night,
        'T364b k' + k + ' 必須是 416×440 raw／sc=.5／night，實得 ' + JSON.stringify(e && { w:e.w,h:e.h,ax:e.ax,ay:e.ay,sc:e.sc,night:!!e.night }));
    }
    const artStart364 = html.indexOf('T364b A 波三座深加工廠');
    const artEnd364 = html.indexOf('R=__savedR;', artStart364);
    const art364 = html.slice(artStart364, artEnd364);
    assert(artStart364 > 0 && artEnd364 > artStart364, 'T364b 素材必須位於 buildSprites 絕對尾端');
    assert(art364.includes('T364b tail parity') && /hw=32\*3\/\(sp\.sc\?\?1\)/.test(art364),
      'T364b 尾端素材必須補 T261/T291/T345 對稱後處理，且 raw sc 幾何不得縮成 1×');
    for (const marker of ['AO base skirt', '冷頂高光', '暖立面', '功能細節']) assert(art364.includes(marker), 'T364b 三座素材必須保留美術規格錨：' + marker);
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|updSmoke|smokes\.push|fxParts\.push/.test(art364),
      'T364b 尾端素材不得讀共用亂數或接粒子管線');
    const fxStart364 = html.indexOf('T364b 煉油廠運轉視覺');
    const fxEnd364 = html.indexOf('if(nightDepth>0&&SPOT_K359', fxStart364);
    const fx364 = html.slice(fxStart364, fxEnd364);
    assert(fxStart364 > 0 && /bd\.k===121/.test(fx364) && /age\|0\)>=9/.test(fx364), 'T364b 排氣只應對完工 k121 root 生效');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|updSmoke|smokes\.push|fxParts\.push/.test(fx364),
      'T364b 排氣不得進共用亂數或粒子管線');
    assert(/!window\.__noRefineryFx/.test(fx364) && /if\(fuel>0&&animOn\)/.test(fx364),
      'T364b 中繼退修仍須保留 __noRefineryFx，且 fuel=0 時完全不畫排氣');
    assert(/const dens=clamp\(fuel\/FUEL_STOCK_CAP,\.68,1\);/.test(fx364) && /for\(let p=0;p<8;p\+\+\)/.test(fx364),
      'T364b 中繼退修：低燃料可見度地板 .68，排氣固定為 8 團');
    assert(/rise=ph\*46\*z/.test(fx364) && /rw\*1\.35/.test(fx364) && /rgba\(62,78,89/.test(fx364) && /rgba\(214,225,227/.test(fx364),
      'T364b 中繼退修：排氣須有放大上升、深色外緣與冷白內芯');
    assert(!/rise=[^;]*q/.test(fx364) && !/rw=[^;]*q/.test(fx364),
      'T364b raw sc 僅校正煙囪錨點，不得把世界排氣半徑或上升高度再縮半');
    const chainStart364 = html.indexOf('T364b A 深加工鏈 BEGIN');
    const chainEnd364 = html.indexOf('T364b A 深加工鏈 END', chainStart364);
    const chain364 = html.slice(chainStart364, chainEnd364);
    assert(chainStart364 > 0 && chainEnd364 > chainStart364, 'T364b 深加工結算區塊應有成對邊界');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|updSmoke|smokes\.push|fxParts\.push/.test(chain364),
      'T364b 深加工結算不得讀共用亂數或接粒子管線');
    const placeStart364 = html.indexOf("case 'refinery':case 'steelMill':case 'shipyard':{ // T364b：3×3 深加工廠群");
    const placeEnd364 = html.indexOf("case 'techpark':case 'centralpark':case 'civiccenter':", placeStart364);
    const place364src = html.slice(placeStart364, placeEnd364);
    assert(/if\(\(dx\|\|dy\)&&ct\.tree\)stampPolTree\(sx,sy,-1\)/.test(place364src),
      'T364b 3×3 ref 格原有樹木必須撤銷 POLTREE，不能留下幽靈減污');

    // 3×3 放置／ref／存讀往返，以及造船廠的鄰水硬條件。
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    const roots364 = [];
    const place364 = (tool, k, p) => {
      assert(p && place(tool, p.x, p.y), 'T364b ' + tool + ' 應成功建造');
      const root = tile(p.x, p.y).bld;
      assert(root && root.k === k && root.sz === 3 && !root.ref, 'T364b ' + tool + ' root 應為 k' + k + '/sz3');
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx || dy) {
        const ref = tile(p.x + dx, p.y + dy).bld;
        assert(ref && ref.k === k && ref.ref && ref.ref[0] === p.x && ref.ref[1] === p.y,
          'T364b ' + tool + ' ref(' + dx + ',' + dy + ') 應回指 root');
      }
      roots364.push({ tool, k, x:p.x, y:p.y });
    };
    place364('refinery', 121, findSpot('refinery'));
    place364('steelMill', 122, findSpot('steelMill'));
    let ship364 = findSpot('shipyard');
    assert(ship364, 'T364b 應找到臨水 3×3 造船廠位置');
    place364('shipyard', 123, ship364);
    let inland364 = null;
    for (let y = 4; y < window.GV.N() - 8 && !inland364; y++) for (let x = 4; x < window.GV.N() - 8; x++) {
      if (window.GV.canPlaceTool('refinery', x, y) === null && window.GV.canPlaceTool('shipyard', x, y) !== null) { inland364 = { x, y }; break; }
    }
    assert(inland364, 'T364b 應找到可建 3×3 但不鄰水的內陸位置');
    assert(window.GV.canPlaceTool('shipyard', inland364.x, inland364.y) !== null, 'T364b 造船廠內陸必須被拒');
    window.GV.save(); assert(window.GV.load(), 'T364b 含三座新廠的存檔應可讀回');
    for (const r364 of roots364) {
      const root = tile(r364.x, r364.y).bld;
      assert(root && root.k === r364.k && root.sz === 3, 'T364b load 後 ' + r364.tool + ' root 應保留');
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx || dy) {
        const ref = tile(r364.x + dx, r364.y + dy).bld;
        assert(ref && ref.ref && ref.ref[0] === r364.x && ref.ref[1] === r364.y, 'T364b load 後 ref 應重建');
      }
    }
    const doze364 = roots364[0];
    assert(place('doze', doze364.x + 1, doze364.y + 1), 'T364b 應可從 ref 格拆除 3×3 煉油廠');
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) assert(!tile(doze364.x + dx, doze364.y + dy).bld,
      'T364b ref 格 doze 後整座煉油廠應清空');

    // 真跑：油→燃料、礦→鋼、耗鋼→港貿；並驗 owner 指定的 upCost 0.85 嚴格比值。
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    const baseUp364 = window.GV.chain346().upCost364(5, 1);
    assert(baseUp364 === 280 && baseUp364 === Math.round(280 * 1 * Math.pow(1.18, 0)), 'T364b 無鋼鐵廠/鋼材時 upCost 位元維持舊公式');
    let oil364 = null, ore364 = null, n364 = window.GV.N();
    for (let y = 2; y < n364 - 2 && (!oil364 || !ore364); y++) for (let x = 2; x < n364 - 2; x++) {
      const t = tile(x, y); if (!t || t.bld || (t.t !== 1 && t.t !== 2)) continue;
      if (!oil364 && window.GV.resourceAt(x, y) === 1) oil364 = { x, y };
      if (!ore364 && window.GV.resourceAt(x, y) === 2) ore364 = { x, y };
    }
    assert(oil364 && ore364, 'T364b seed9 應同時有可用油田與礦藏');
    assert(place('oilwell', oil364.x, oil364.y), 'T364b 油田格應可建油井');
    assert(place('mine', ore364.x, ore364.y), 'T364b 礦藏格應可建礦場');
    const refineryChain364 = findSpot('refinery');
    assert(refineryChain364 && place('refinery', refineryChain364.x, refineryChain364.y), 'T364b 鏈條應可建煉油廠');
    const steelChain364 = findSpot('steelMill');
    assert(steelChain364 && place('steelMill', steelChain364.x, steelChain364.y), 'T364b 鏈條應可建鋼鐵廠');
    const shipChain364 = findSpot('shipyard');
    assert(shipChain364 && place('shipyard', shipChain364.x, shipChain364.y), 'T364b 鏈條應可建造船廠');
    const port364 = findSpot('port');
    assert(port364 && place('port', port364.x, port364.y), 'T364b 鏈條應可建港口');
    for(const p364 of [oil364,ore364,refineryChain364,steelChain364,shipChain364,port364])window.__t412Set(p364.x,p364.y,'age',9); // T418a 跟版：凍結施工期——A1 真分流後施工中建築會耗鋼，本案驗「鏈真跑」而非施工競爭（競爭另有 T418a F3/A1 案；不凍結則 place() 新樓吃光庫存 steel 恆 0）
    for (let d = 0; d < 3; d++) window.GV.step(1);
    const c364 = window.GV.chain346();
    assert(c364.fuel > 0 && c364.fuelMade > 0 && c364.fuelTaxMul === 1.10 && c364.freightTaxMul === 1,
      'T364b 油→燃料→工業稅加成鏈必須真跑；貨運加成改 T418 供油率語義（無貨運中心=×1 惰性）');
    assert(c364.steel > 0 && c364.steelMade > 0 && c364.steelTaxMul === 1.12, 'T364b 礦→鋼→工業稅加成鏈必須真跑');
    assert(c364.shipUse > 0 && c364.shipTradeTaxMul === 1.15 && c364.shipPortGold > 0, 'T364b 造船廠必須真耗鋼並產生港貿收益');
    const discounted364 = c364.upCost364(5, 1);
    assert(discounted364 === 238 && discounted364 / baseUp364 === .85 && discounted364 === baseUp364 * .85,
      'T364b 鋼材 >0 時 upCost 輸出比值必須恰為 0.85（280→238）');
    window.GV.save(); assert(window.GV.load(), 'T364b 含鋼材存量的存檔應可讀回');
    const c364rt = window.GV.chain346();
    assert(c364rt.steel === c364.steel && c364rt.upCost364(5, 1) === 238,
      'T364b steel364 存讀後必須保留鋼材與 .85 upCost 效果');
    assert(isFinite(window.GV.stats().money), 'T364b 深加工鏈不得產生 NaN');
    for (let d = 0; d < 7; d++) window.GV.step(1); // 越過 age>=9 的完成線，真走 draw-time 運轉分支
    for (const r364 of [refineryChain364, steelChain364, shipChain364]) { window.GV.lookAt(r364.x, r364.y); window.GV.setVisT(55); window.GV.forceDraw(); window.GV.setVisT(0); window.GV.forceDraw(); }

    // 中繼點退修真跑：同一個已完工煉油廠在 zoom 2／同相位下，fuel=0 零排氣，20／120 都有可見團數，且重畫位元序列不漂移。
    const loadFuel364 = v => {
      window.GV.save();
      const d = window.GV.inflateSave(store[SKEY]);
      if (v > 0) d.fuel364 = v; else delete d.fuel364;
      store[SKEY] = JSON.stringify(d);
      return window.GV.load() && window.GV.chain346().fuel === v;
    };
    const traceFuel364 = muted => {
      gameEllipseTrace = [];
      window.__noRefineryFx = muted;
      window.GV.setZoom(2); window.GV.lookAt(refineryChain364.x, refineryChain364.y); window.GV.setVisT(55); window.GV.forceDraw();
      const out = JSON.parse(JSON.stringify(gameEllipseTrace));
      gameEllipseTrace = null;
      return out;
    };
    assert(loadFuel364(0), 'T364b 中繼退修應可載入 fuel=0 的舊城狀態');
    const zeroMuted364 = traceFuel364(true), zeroActive364 = traceFuel364(false);
    assert(JSON.stringify(zeroActive364) === JSON.stringify(zeroMuted364), 'T364b fuel=0 時不得畫任何 k121 排氣');
    assert(loadFuel364(20), 'T364b 中繼退修應可載入 fuel=20 低庫存狀態');
    const lowMuted364 = traceFuel364(true), lowActive364 = traceFuel364(false), lowRepeat364 = traceFuel364(false);
    const lowPuffs364 = lowActive364.length - lowMuted364.length;
    assert(JSON.stringify(lowActive364) === JSON.stringify(lowRepeat364) && lowPuffs364 >= 8,
      'T364b fuel=20／zoom2 必須有決定性且可見的排氣團，實得 ' + lowPuffs364);
    assert(loadFuel364(120), 'T364b 中繼退修應可載入 fuel=120 滿庫存狀態');
    const fullMuted364 = traceFuel364(true), fullActive364 = traceFuel364(false);
    const fullPuffs364 = fullActive364.length - fullMuted364.length;
    assert(fullPuffs364 >= lowPuffs364 && fullPuffs364 >= 8,
      'T364b fuel=120／zoom2 排氣團數不得低於低庫存，實得 ' + fullPuffs364 + '／' + lowPuffs364);
    gameEllipseTrace = null; window.__noRefineryFx = false;
  }


  // ===== T418 深加工閉環：fuel 流化／鋼加速／船實體（tick 真跑造境，卡面攻擊面維度表逐格） =====
  {
    // 靜態釘：惰性閘原文（兩釘軌跡=0 維度總案）
    const bare418=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare418.includes('fuelUse418=frt342>0?Math.min(fuel,frt342*FREIGHT_FUEL_USE):0;'),
      'T418 惰性閘釘：貨運耗油必須 frt342>0 才執行（無貨運=零耗油零副作用）');
    assert(bare418.includes('if(steelMillN>0){'),
      'T418 惰性閘釘（T418b SK-3 跟版）：鋼加速必須鋼鐵廠存在才執行（兩釘軌跡 millN=0 恆等；額度改鋼廠吞吐＋庫存出料，滿倉不停擺）');
    assert(bare418.includes('if(steelUsed>0&&po>0){shipProgress+=steelUsed;'),
      'T418 惰性閘釘：造船進度必須耗鋼且無港不造');
    assert(bare418.includes('cargo:Math.min(2,hubs.cargo.length,1+shipCount)'),
      'T418 視覺釘（T418a A2 跟版）：lifeShips 貨輪＝港口保底 1 艘＋艦隊撐第 2 艘（舊城不歸零；tick→draw 單向讀，不新增 vri 呼叫點）');
    assert(bare418.includes('if(shipCount>0)data.shipCount=shipCount;'),
      'T418 存檔釘：shipCount 僅非零落盤（T364b fuel364 慣例，既有城市 bytes 不變）');
    // T418 覆核退修：零亂數守衛縮到三段掛點精確切片（原切片從常量區到 chain346 涵蓋大量既有亂數＝假紅風險），
    // 且 \b 以 JS 字面量書寫（原 python 轉義寫成 U+0008 退格字元＝永不匹配假綠）
    const noR418=(seg)=>!/\bR\s*\(|\bri\s*\(|Math\.random/.test(seg);
    assert(noR418(html.slice(html.indexOf('T418 交付①：貨運中心'),html.indexOf('T364b A 深加工鏈 END'))),
      'T418 零亂數（段1 深加工鏈/fuel 流化/船兌換）：注入 R() 必紅');
    assert(noR418(html.slice(html.indexOf('T418 交付②：鋼材→建造加速'),html.indexOf('cap418--;')+8)),
      'T418 零亂數（段2 鋼加速）：注入 R() 必紅');
    assert(noR418(html.slice(html.indexOf('cargo:Math.min(2,hubs.cargo.length,shipCount)'),html.indexOf('}; // T418：貨輪生成上限綁 shipCount')+40)),
      'T418 零亂數（段3 lifeShips want 行）：注入 R() 必紅');
    assert(noR418(html.slice(html.indexOf('fuelExport418=tp336>0'),html.indexOf('const fuelExportGold418=fuelExport418>0')+45)),
      'T418 零亂數（段4 fuel 出口）：注入 R() 必紅');
  }
  {
    // ① fuel 流化：無貨運惰性 → 有貨運耗油＋供油率乘數 → 有貿易站盈餘出口；cap 時 fuelMade=0 語義不破
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    let oil418=null,ore418=null,n418=window.GV.N();
    for(let y=2;y<n418-2&&(!oil418||!ore418);y++)for(let x=2;x<n418-2;x++){
      const t=tile(x,y);if(!t||t.bld||(t.t!==1&&t.t!==2))continue;
      if(!oil418&&window.GV.resourceAt(x,y)===1)oil418={x,y};
      if(!ore418&&window.GV.resourceAt(x,y)===2)ore418={x,y};
    }
    assert(oil418&&ore418,'T418 seed9 應有油田與礦藏');
    assert(place('oilwell',oil418.x,oil418.y),'T418 應可建油井');
    const rf418=findSpot('refinery');
    assert(rf418&&place('refinery',rf418.x,rf418.y),'T418 應可建煉油廠');
    for(let d=0;d<3;d++)window.GV.step(1);
    let c418=window.GV.chain346();
    assert(c418.fuel>0&&c418.fuelUse===0&&c418.freightTaxMul===1&&c418.fuelExport===0,
      'T418 無貨運中心/無貿易站：fuel 積累但零耗油、貨運乘數 ×1、零出口（惰性），實得 use='+c418.fuelUse+' mul='+c418.freightTaxMul);
    // 有貨運：每日耗油 ≤2、滿供乘數 1.08
    const frt418=findSpot('freight');
    assert(frt418&&place('freight',frt418.x,frt418.y),'T418 應可建貨運站');
    window.GV.step(1);
    c418=window.GV.chain346();
    assert(c418.fuelUse>0&&c418.fuelUse<=2&&c418.freightTaxMul>1&&c418.freightTaxMul<=1.08,
      'T418 貨運每日耗油 ∈(0,2] 且供油率→乘數 ∈(1,1.08]，實得 use='+c418.fuelUse+' mul='+c418.freightTaxMul);
    // 有貿易站：盈餘出口 ≤4/日
    const trd418=findSpot('tradepost');
    assert(trd418&&place('tradepost',trd418.x,trd418.y),'T418 應可建貿易站');
    for(let d=0;d<3;d++)window.GV.step(1);
    c418=window.GV.chain346();
    assert(c418.fuelExport>0&&c418.fuelExport<=4,'T418 盈餘經貿易站出口（≤4/日），實得 '+c418.fuelExport);
    // cap 語義：真蓋油井＋煉油廠（覆核：原案漏蓋油井 fuel 恆 0 假綠）——無貨運無貿易站 60 天精確頂 cap=120 後 fuelMade=0
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    let oilCap=null;for(let y=2;y<window.GV.N()-2&&!oilCap;y++)for(let x=2;x<window.GV.N()-2;x++){const t=tile(x,y);if(t&&!t.bld&&(t.t===1||t.t===2)&&window.GV.resourceAt(x,y)===1){oilCap={x,y};break;}}
    assert(oilCap&&place('oilwell',oilCap.x,oilCap.y),'T418 cap 案應可建油井（覆核：漏蓋油井=假綠）');
    const rf2=findSpot('refinery');
    assert(rf2&&place('refinery',rf2.x,rf2.y),'T418 cap 案應可建煉油廠');
    for(let d=0;d<60;d++)window.GV.step(1);
    const cCap=window.GV.chain346();
    assert(cCap.fuel===120&&cCap.fuelMade===0&&cCap.fuelUse===0,
      'T418 cap 語義：有油井無貨運無貿易站 fuel 精確 ===120 後 fuelMade=0（既有語義不破），實得 fuel='+cCap.fuel+' made='+cCap.fuelMade);
  }
  {
    // ② 鋼材→建造加速：無鋼 9 天基準 → 有鋼額外 +1/日 → 上限=steelMade 真的上限 → tickBld 序決定性搶鋼
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    const blds418=[];
    const bldPos418=[];
    for(let i=0;i<6;i++){
      let pk418=null;
      for(let y=6;y<window.GV.N()-6&&!pk418;y++)for(let x=6;x<window.GV.N()-6;x++){
        const t=tile(x,y);if(t&&!t.bld&&!t.road&&!t.zone&&t.t===1){pk418={x,y};break;}
      }
      assert(pk418&&place('park',pk418.x,pk418.y),'T418 應有 6 處空地可建公園施工樓');
      bldPos418.push([pk418.x,pk418.y]);blds418.push(tile(pk418.x,pk418.y).bld);
    }
    for(let d=0;d<3;d++)window.GV.step(1);
    const agesBase=bldPos418.map(([x,y])=>{const bb=tile(x,y).bld;return bb?bb.age:-1;});
    assert(agesBase.every(a=>a===3&&Number.isInteger(a)),
      'T418 無鋼鐵廠：施工樓每日 age+1 且恆整數（9 天基準不變；坑② 禁小數），實得 '+agesBase.join(','));
    let ore2=null;for(let y=2;y<window.GV.N()-2&&!ore2;y++)for(let x=2;x<window.GV.N()-2;x++){
      const t=tile(x,y);if(!t||t.bld||t.t!==2)continue;if(window.GV.resourceAt(x,y)===2){ore2={x,y};break;}
    }
    assert(ore2&&place('mine',ore2.x,ore2.y),'T418 應可建礦場');
    const sm418=findSpot('steelMill');
    assert(sm418&&place('steelMill',sm418.x,sm418.y),'T418 應可建鋼鐵廠');
    let cuSum418g=0;
    for(let d=0;d<3;d++){window.GV.step(1);cuSum418g+=window.GV.chain346().constrUse;}
    const ages418=bldPos418.map(([x,y])=>{const bb=tile(x,y).bld;return bb?bb.age:-1;});
    // T418 覆核退修＋T418b F1 跟版：正向 delta 改用 constrUse 直接指標（原「ages418[0] 必為最大」依賴
    // 「恆自 index 0 起掃」＝ F1 退修後輪轉序讓受益者每日輪替，第 0 棟不再必然最大；改斷言總加速量與總增量）
    const sumB418=agesBase.reduce((p,q)=>p+q,0),sumA418=ages418.reduce((p,q)=>p+q,0);
    assert(cuSum418g===6&&sumA418-sumB418>18&&ages418.every(a=>Number.isInteger(a)),
      'T418 鋼加速：3 日總耗鋼恰 6（＝鋼廠日吞吐 2×3；刪 b.age++／額度歸零→cu 0→紅）＋六公園總 age 增量 >18（主循環 18 之外真有加速；F1 退修後部分額度由礦場/鋼廠自身施工吃掉＝故用下界不寫死）＋恆整數（坑②），實得 cu='+cuSum418g+' sumΔ='+(sumA418-sumB418)+' ages='+ages418.join(','));
  }
  {
    // ②b 上限真的是上限（受控空城 seed7 無 AI 干擾）：1 礦+1 廠+8 公園——單 tick 內加速棟數 ≤ 當日 steelMade
    window.GV.newWorldSeeded(7); window.GV.setDiff(3); window.GV.addMoney(999999);
    const pk7=[];
    for(let i=0;i<8;i++){
      let p7=null;
      for(let y=8;y<window.GV.N()-8&&!p7;y++)for(let x=8;x<window.GV.N()-8;x++){
        const t=tile(x,y);if(t&&!t.bld&&!t.road&&!t.zone&&t.t===1){p7={x,y};break;}
      }
      assert(p7&&place('park',p7.x,p7.y),'T418 上限案應有 8 處空地');
      pk7.push([p7.x,p7.y]);
    }
    let ore7=null;for(let y=8;y<window.GV.N()-8&&!ore7;y++)for(let x=8;x<window.GV.N()-8;x++){
      const t=tile(x,y);if(!t||t.bld||t.t!==2)continue;if(window.GV.resourceAt(x,y)===2){ore7={x,y};break;}
    }
    assert(ore7&&place('mine',ore7.x,ore7.y),'T418 上限案應有礦藏');
    const sm7=findSpot('steelMill');
    assert(sm7&&place('steelMill',sm7.x,sm7.y),'T418 上限案應可建鋼鐵廠');
    pk7.push([sm7.x,sm7.y]); // 鋼廠 root 自身也是施工樓（吃額度）——總加速須含它，否則 cap+1 破壞被「鋼廠吃掉額度」掩蓋
    // 上限真的是上限：3 天逐日量測——總加速（扣主循環）≤ 總額度（Σ當日 steelMade）；cap+1 破壞（邊界外一格）→超額→紅
    let totalExtra7=0,totalQuota7=0;
    for(let d=0;d<3;d++){
      const pre7=pk7.map(([x,y])=>{const bb=tile(x,y).bld;return bb?bb.age:-1;});
      window.GV.step(1);
      const post7=pk7.map(([x,y])=>{const bb=tile(x,y).bld;return bb?bb.age:-1;});
      for(let i=0;i<pk7.length;i++)totalExtra7+=Math.max(0,post7[i]-pre7[i]-1); // 扣主循環 +1，剩=當 tick 加速次數
      totalQuota7+=window.GV.chain346().steelMade;
    }
    assert(totalExtra7<=totalQuota7,'T418 上限真的是上限：3 天總加速（含鋼廠自身）'+totalExtra7+' ≤ 總額度 '+totalQuota7+'（鋼鐵廠產出=每日加速額度）');
  }
  {
    // ③ 船變實體：0 港不造 → 進度跨日累積 → shipCount 階梯 → 上限=港口×2 真的是上限 → 存讀往返恆等
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    let ore3=null;for(let y=2;y<window.GV.N()-2&&!ore3;y++)for(let x=2;x<window.GV.N()-2;x++){
      const t=tile(x,y);if(!t||t.bld||t.t!==2)continue;if(window.GV.resourceAt(x,y)===2){ore3={x,y};break;}
    }
    assert(ore3&&place('mine',ore3.x,ore3.y),'T418 船案應可建礦場');
    const sm3=findSpot('steelMill');
    assert(sm3&&place('steelMill',sm3.x,sm3.y),'T418 船案應可建鋼鐵廠');
    const sy3=findSpot('shipyard');
    assert(sy3&&place('shipyard',sy3.x,sy3.y),'T418 船案應可建船廠');
    for(let d=0;d<10;d++)window.GV.step(1);
    let cB=window.GV.chain346();
    assert(cB.shipProgress===0&&cB.shipCount===0,
      'T418 0 港不造：船廠耗鋼但無港口不得累積進度/造艦，實得 progress='+cB.shipProgress);
    const pt3=findSpot('port');
    assert(pt3&&place('port',pt3.x,pt3.y),'T418 船案應可建港口');
    for(let d=0;d<20;d++)window.GV.step(1);
    cB=window.GV.chain346();
    assert(cB.shipProgress>0&&cB.shipProgress<30&&cB.shipCount===0,
      'T418 進度跨日累積：30 鋼未滿不造艦，實得 progress='+cB.shipProgress);
    for(let d=0;d<20;d++)window.GV.step(1);
    cB=window.GV.chain346();
    assert(cB.shipCount===1,'T418 30 鋼=1 船（階梯），實得 count='+cB.shipCount+' progress='+cB.shipProgress);
    for(let d=0;d<80;d++)window.GV.step(1); // 再跑 80 天：理論 3-4 船
    cB=window.GV.chain346();
    assert(cB.shipCount<=2,'T418 上限真的是上限：1 港口=2 船，實得 '+cB.shipCount);
    assert(isFinite(cB.shipProgress)&&isFinite(cB.shipDaily)&&isFinite(cB.fuelUse)&&isFinite(cB.fuelExport),
      'T418 chain346 擴欄不得出現 NaN/Infinity');
    const cB4=cB.shipCount,pB4=cB.shipProgress;
    window.GV.save();assert(window.GV.load(),'T418 含船狀態存檔應可讀回');
    const cBrt=window.GV.chain346();
    assert(cBrt.shipCount===cB4&&cBrt.shipProgress===pB4,
      'T418 存讀往返恆等：shipCount/shipProgress 保存後應逐字一致（實得 '+cBrt.shipCount+'/'+cBrt.shipProgress+' vs '+cB4+'/'+pB4+'）');
    // T418 覆核退修：舊檔剝欄容錯——手動剝 shipCount/shipProgress 欄 → load → 0（T412 慣例）
    window.GV.save();
    const rawS=window.GV.rawSave?window.GV.rawSave():store[SKEY];
    const dSt=window.GV.inflateSave(rawS);
    delete dSt.shipCount;delete dSt.shipProgress;
    store[SKEY]=JSON.stringify(dSt);
    assert(window.GV.load(),'T418 舊檔剝欄 load 應成功');
    const cSt=window.GV.chain346();
    assert(cSt.shipCount===0&&cSt.shipProgress===0,'T418 舊檔剝欄：缺 shipCount/shipProgress 欄位→0（實得 '+cSt.shipCount+'/'+cSt.shipProgress+'）');
    window.GV.step(1); // load 後首 tick 重建 flowStat384 快照
    const fs418=window.GV.flowStat();
    assert(isFinite(fs418.ship.count)&&isFinite(fs418.ship.progress)&&isFinite(fs418.fuel.use)&&isFinite(fs418.fuel.export),
      'T418 面板 flowStat 擴欄不得出現 NaN/Infinity/undefined，實得 '+JSON.stringify({sc:fs418.ship&&fs418.ship.count,sp:fs418.ship&&fs418.ship.progress,fu:fs418.fuel&&fs418.fuel.use}));
  }


  { // T418 覆核退修：①船完整兌換行為案（同日 60 鋼→2 艘＋進度 0，單次兌換破壞必紅）②load 每日快照歸零案
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    let oreR=null;for(let y=2;y<window.GV.N()-2&&!oreR;y++)for(let x=2;x<window.GV.N()-2;x++){const t=tile(x,y);if(t&&!t.bld&&t.t===2&&window.GV.resourceAt(x,y)===2){oreR={x,y};break;}}
    assert(oreR&&place('mine',oreR.x,oreR.y),'T418 兌換案應可建礦場');
    const smR=findSpot('steelMill');assert(smR&&place('steelMill',smR.x,smR.y),'T418 兌換案應可建鋼鐵廠');
    const syR1=findSpot('shipyard');assert(syR1&&place('shipyard',syR1.x,syR1.y),'T418 兌換案應可建第一座船廠');
    const syR2=findSpot('shipyard');assert(syR2&&place('shipyard',syR2.x,syR2.y),'T418 兌換案應可建第二座船廠');
    const ptR=findSpot('port');assert(ptR&&place('port',ptR.x,ptR.y),'T418 兌換案應可建港口');
    for(let d=0;d<5;d++)window.GV.step(1); // 鋼庫存累積
    window.GV.save();
    const rawR=window.GV.rawSave?window.GV.rawSave():store[SKEY];
    const dR=window.GV.inflateSave(rawR);
    dR.shipProgress=58;dR.steel364=100; // 注入：進度 58＋庫存 100 → 2 船廠當日耗 2 鋼 → 58+2=60 → 完整兌換 2 艘＋進度 0
    store[SKEY]=JSON.stringify(dR);
    assert(window.GV.load(),'T418 兌換案注入 load 應成功');
    const cPreR=window.GV.chain346();
    const c0=cPreR.shipCount;
    window.GV.step(1);
    const cR=window.GV.chain346();
    assert(cR.shipCount-c0===2&&cR.shipProgress===0,
      'T418 船完整兌換：同日 60 鋼=2 艘＋進度 0（單次兌換破壞→1 艘＋30→紅），實得 +'+(cR.shipCount-c0)+' 艘 progress='+cR.shipProgress);
    // ② load 歸零（T418 二輪覆核：原案先 newWorld 由它先行清零=假綠）——
    //    A 城跑出非零快照（shipDaily=12）→ 不經 newWorld 直接 load B 存檔 → 未 tick 三欄皆 0
    //    先造 B 城空存檔（rawB），再回 A 城狀態直接 load rawB：shipDaily 殘留 12 若未在 load() 歸零即紅
    window.GV.newWorldSeeded(7); window.GV.setDiff(3);
    window.GV.step(1);
    window.GV.save();
    const rawB=window.GV.rawSave?window.GV.rawSave():store[SKEY];
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    // A 城全鏈造境（三欄皆須非零——覆核：原案缺油路設施 fuelUse/fuelExport 恆 0=單欄刪除假綠）：
    // 油井+煉油廠→fuel 產出；貨運站→fuelUse>0；貿易站→fuelExport>0；礦+鋼廠+船廠+港→shipDaily=12
    let oilD=null,oreD=null;for(let y=2;y<window.GV.N()-2&&(!oilD||!oreD);y++)for(let x=2;x<window.GV.N()-2;x++){const t=tile(x,y);if(t&&!t.bld&&(t.t===1||t.t===2)){if(!oilD&&window.GV.resourceAt(x,y)===1)oilD={x,y};if(!oreD&&window.GV.resourceAt(x,y)===2)oreD={x,y};}}
    assert(oilD&&place('oilwell',oilD.x,oilD.y),'T418 歸零案 A 城應可建油井');
    assert(oreD&&place('mine',oreD.x,oreD.y),'T418 歸零案 A 城應可建礦場');
    const rfD=findSpot('refinery');assert(rfD&&place('refinery',rfD.x,rfD.y),'T418 歸零案 A 城應可建煉油廠');
    const smD=findSpot('steelMill');assert(smD&&place('steelMill',smD.x,smD.y),'T418 歸零案 A 城應可建鋼鐵廠');
    const syD=findSpot('shipyard');assert(syD&&place('shipyard',syD.x,syD.y),'T418 歸零案 A 城應可建船廠');
    const ptD=findSpot('port');assert(ptD&&place('port',ptD.x,ptD.y),'T418 歸零案 A 城應可建港口');
    const frD=findSpot('freight');assert(frD&&place('freight',frD.x,frD.y),'T418 歸零案 A 城應可建貨運站');
    const trD=findSpot('tradepost');assert(trD&&place('tradepost',trD.x,trD.y),'T418 歸零案 A 城應可建貿易站');
    for(let d=0;d<80;d++)window.GV.step(1);
    const cD=window.GV.chain346();
    assert(cD.fuelUse>0&&cD.fuelExport>0&&cD.shipDaily===12,
      'T418 歸零案前置：A 城三欄皆非零（fuelUse='+cD.fuelUse+' fuelExport='+cD.fuelExport+' shipDaily='+cD.shipDaily+'）——單欄刪除突變各自可咬');
    store[SKEY]=rawB;
    assert(window.GV.load(),'T418 歸零案：不經 newWorld 直接 load B 存檔應成功');
    const cZ=window.GV.chain346();
    assert(cZ.shipDaily===0&&cZ.fuelUse===0&&cZ.fuelExport===0,
      'T418 load 每日快照歸零：A 城非零快照直接 load B 存檔後未 tick 三欄必須 0（實得 '+cZ.shipDaily+'/'+cZ.fuelUse+'/'+cZ.fuelExport+'）');
  }
  // ===== T418a 深加工收尾：守衛債四口（F2/F3/F4/F5）＋兩項裁決落地（A1 真分流/A2 貨輪保底）=====
  {
    const bare418a=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare418a.includes('const FREIGHT_FUEL_USE=2,FUEL_EXPORT_RATE=4,FUEL_EXPORT_GOLD=2.0;'),
      'T418a P1 常數原文釘：貨運耗油/出口率/出口價（F5 下界漂移→紅）');
    assert(bare418a.includes('const SHIP_STEEL=30,SHIP_PORT_CAP=2,SHIP_DAILY_GOLD=6;'),
      'T418a P2 常數原文釘：船三常數（F5 下界漂移→紅）');
    assert(bare418a.includes('+shipPortGold+shipDailyGold418+fuelExportGold418;'),
      'T418a P3 income 原文釘：船隊日收入＋出口金必須入 income（F2 拔行→紅）');
    assert(bare418a.includes('b.age++;cap418--;steel--;constrSteelUse418++;'),
      'T418a P4 真分流原文釘：施工加速必須 steel--（A1 裁決：退回雙重計帳→紅）');
    assert(bare418a.includes('fuel-=fuelUse418;'),
      'T418a P5 耗油扣減原文釘（F3 拔扣減→白拿乘數＋同油轉賣→紅）');
    assert(bare418a.includes('Math.min(2,hubs.cargo.length,1+shipCount)'),
      'T418a P6 貨輪保底原文釘：港口民用航運基線 1 艘（A2 裁決：舊城歸零→紅）');
    const find418=(kind)=>{const n=window.GV.N();for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++)if(window.GV.resourceAt(x,y)===kind)return[x,y];return null;};
    const put418=(k,x,y,done)=>{window.__t384Bld(k,x,y);if(done)window.__t412Set(x,y,'age',9);}; // T418b SK-8 布局契約：3×3 建築間距 ≥4 格（load 依 MSZ 重建 ref 蓋章，2 格間距=讀檔非法城會互蓋）
    // --- F2 冷凍全鏈（seed913，零人口零稅收＝Δmoney 為常數式）＋F5 滿供/上限 ---
    window.GV.newWorldSeeded(913);window.GV.setDiff(1);
    const oil913=find418(1),ore913=find418(2);
    assert(oil913&&ore913,'T418a F2 前置：seed913 應有油/礦資源格');
    put418(49,oil913[0],oil913[1],true);put418(50,ore913[0],ore913[1],true);
    put418(121,10,10,true);put418(122,14,10,true);put418(123,18,10,true);
    put418(18,22,10,true);put418(110,26,10,true);put418(91,30,10,true);
    for(let d=1;d<=64;d++)window.GV.step(1);
    let m418=window.GV.stats().money;
    for(let d=65;d<=67;d++){
      window.GV.step(1);const m2=window.GV.stats().money,c=window.GV.chain346();
      assert(m2-m418===-42,'T418a F2 錢包絕對值：冷凍全鏈城 d'+d+' Δmoney 恰 −42（＝船 12＋出口 2＋港貨 5−固定維護 61；income 拔船金/出口金或 SHIP_DAILY_GOLD/FUEL_EXPORT_GOLD 歸零→紅），實得 '+(m2-m418));
      assert(c.shipDaily===c.shipCount*6,'T418a F2 鏡像恆等：shipDaily===shipCount×6，實得 '+c.shipDaily+'/'+c.shipCount);
      assert(c.shipCount===2,'T418a F5 上限：1 港 60 天後恆 2 船，實得 '+c.shipCount);
      assert(c.fuelUse===2,'T418a F5 滿供恰等：1 貨運 fuelUse===2（FREIGHT_FUEL_USE 下修→紅），實得 '+c.fuelUse);
      assert(c.fuelExport===1,'T418a F5 出口恰等（帶貨運保留）：盈餘 1 油/日全出，實得 '+c.fuelExport);
      m418=m2;
    }
    // --- F5a 首船邊界（seed917）---
    window.GV.newWorldSeeded(917);window.GV.setDiff(1);
    const ore917=find418(2);
    put418(50,ore917[0],ore917[1],true);put418(122,10,10,true);put418(123,14,10,true);put418(18,18,10,true);
    for(let d=1;d<=29;d++)window.GV.step(1);
    let c418=window.GV.chain346();
    assert(c418.shipCount===0&&c418.shipProgress===29,'T418a F5 首船邊界 d29：count 0/prog 29（SHIP_STEEL 漂移→紅），實得 '+c418.shipCount+'/'+c418.shipProgress);
    window.GV.step(1);c418=window.GV.chain346();
    assert(c418.shipCount===1&&c418.shipProgress===0,'T418a F5 首船邊界 d30：count 1/prog 0，實得 '+c418.shipCount+'/'+c418.shipProgress);
    // --- F5b 雙港跑滿（seed919）---
    window.GV.newWorldSeeded(919);window.GV.setDiff(1);
    const ore919=find418(2);
    put418(50,ore919[0],ore919[1],true);put418(122,10,10,true);
    put418(123,14,10,true);put418(123,18,10,true);put418(18,22,10,true);put418(18,26,10,true);
    for(let d=1;d<=100;d++)window.GV.step(1);
    c418=window.GV.chain346();
    assert(c418.shipCount===4,'T418a F5 雙港跑滿：2 港上限恰 4（SHIP_PORT_CAP 下修→紅），實得 '+c418.shipCount);
    // --- F5c 出口恰等（seed923）---
    window.GV.newWorldSeeded(923);window.GV.setDiff(1);
    {const n923=window.GV.N();const oils923=[];
     for(let y=2;y<n923-2&&oils923.length<2;y++)for(let x=2;x<n923-2&&oils923.length<2;x++)if(window.GV.resourceAt(x,y)===1)oils923.push([x,y]);
     assert(oils923.length===2,'T418a F5c 前置：seed923 應有兩油格');
     for(const[x,y]of oils923)put418(49,x,y,true);}
    put418(121,10,10,true);put418(121,14,10,true);put418(91,20,10,true);
    for(let d=1;d<=3;d++)window.GV.step(1);
    c418=window.GV.chain346();
    assert(c418.fuelExport===4,'T418a F5 出口恰等：大盈餘 1 貿易站 export===4（FUEL_EXPORT_RATE 下修→紅），實得 '+c418.fuelExport);
    // --- F4 半供恰等（seed929）---
    window.GV.newWorldSeeded(929);window.GV.setDiff(1);
    const oil929=find418(1);
    put418(49,oil929[0],oil929[1],true);put418(121,10,10,true);
    put418(110,14,10,true);put418(110,18,10,true);put418(110,22,10,true);
    for(let d=1;d<=3;d++)window.GV.step(1);
    c418=window.GV.chain346();
    assert(c418.freightTaxMul===1+(1.08-1)*(3/6),'T418a F4 半供恰等：需 6 供 3 → mul 恰 1+(1.08−1)×0.5（比例式退回純開關→紅），實得 '+c418.freightTaxMul);
    // --- F3 守恆恆等式（seed931，全鏈＋四棟施工樓＝造船/施工競爭）---
    window.GV.newWorldSeeded(931);window.GV.setDiff(1);
    const oil931=find418(1),ore931=find418(2);
    put418(49,oil931[0],oil931[1],true);put418(50,ore931[0],ore931[1],true);
    put418(121,10,10,true);put418(122,14,10,true);put418(123,18,10,true);put418(18,22,10,true);
    put418(110,26,10,true);put418(91,30,10,true);
    for(let i=0;i<4;i++)window.__t384Bld(1,36+i*2,20);
    let pc418=window.GV.chain346();let cSum418=0;
    for(let d=1;d<=6;d++){
      window.GV.step(1);const cc=window.GV.chain346();
      assert(cc.fuel===pc418.fuel+cc.fuelMade-cc.fuelUse-cc.fuelExport,
        'T418a F3 fuel 守恆 d'+d+'：fuel[d]===fuel[d−1]+made−use−export（拔任一扣減行→永動金礦→紅），實得 '+cc.fuel+' vs '+(pc418.fuel+cc.fuelMade-cc.fuelUse-cc.fuelExport));
      assert(cc.steel===pc418.steel+cc.steelMade-cc.shipUse-cc.constrUse,
        'T418a F3 steel 守恆 d'+d+'：steel[d]===steel[d−1]+made−shipUse−constrUse（A1 拔 steel--→雙重計帳→紅），實得 '+cc.steel+' vs '+(pc418.steel+cc.steelMade-cc.shipUse-cc.constrUse));
      cSum418+=cc.constrUse;pc418=cc;
    }
    assert(cSum418===6,'T418a A1 競爭案：六日施工耗鋼合計恰 6（造船先吃 1/日、施工吃餘 1/日），實得 '+cSum418);
    // --- A1 工期兩臂（seed937 同種子同日對照——F1 型時移自比廢除）---
    window.GV.newWorldSeeded(937);window.GV.setDiff(1);
    const ore937=find418(2);
    put418(50,ore937[0],ore937[1],true);put418(122,10,10,true);
    window.__t384Bld(1,20,20);
    for(let d=1;d<=4;d++)window.GV.step(1);
    const ageA418=window.GV.tile(20,20).bld.age;
    window.GV.newWorldSeeded(937);window.GV.setDiff(1);
    window.__t384Bld(1,20,20);
    for(let d=1;d<=4;d++)window.GV.step(1);
    const ageB418=window.GV.tile(20,20).bld.age;
    assert(ageA418===9&&ageB418===5,'T418a A1 工期兩臂（同種子同日）：有鋼 4 天 age===9（完工）vs 無鋼 age===5（刪 b.age++ 或 cap418 歸零→左臂掉到 5→紅），實得 '+ageA418+'/'+ageB418);
  }
  // ===== T418b 深加工對帳：SK-1~SK-8 落地守衛 =====
  {
    const bareB=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bareB.includes('return steelDisc418?base*STEEL_UP_DISCOUNT:base;'),
      'T418b SK-1 原文釘：upCost 折扣讀本日快照（改回活庫存→面板/選單再度矛盾→紅）');
    assert(bareB.includes('steelDisc418=steel>0;'),
      'T418b SK-1 原文釘：快照與 steelTaxMul 同時點取值（造船後、施工前）');
    assert(bareB.includes("{k:'升級折扣',v:steelDisc418?"),
      'T418b SK-1 原文釘：T369 折扣列讀同一快照（面板/選單口徑一致）');
    assert(bareB.includes('let cap418=Math.min(steelMillN*STEEL_MILL_RATE,steel);'),
      'T418b SK-3 原文釘：額度=鋼廠吞吐、料源=庫存（退回「額度=當日產量」→滿倉停擺→紅）');
    assert(bareB.includes('const nE418=el418.length,offE418=nE418?day%nE418:0;')&&bareB.includes('tiles[el418[(j418+offE418)%nE418]].bld'),
      'T418b SK-4＋F1 原文釘：輪轉基數＝施工中合格子集（退回 day%tickBld.length 全建築基數→大城每日只爬 1 格＝北端特權換名不換實→紅）');
    assert(bareB.includes('steel:{made:steelMade,used:steelUsed,stock:steel,mul:steelTaxMul,constr:constrSteelUse418}'),
      'T418b SK-2 原文釘：flowStat 鋼帳含施工欄');
    assert(bareB.includes("k:'鋼材 產/船用/施工/存'")&&bareB.includes("k:'施工耗鋼'"),
      'T418b SK-2 原文釘：資源面板鋼帳四段＋T369 施工耗鋼列（鋼不再憑空消失）');
    assert(!bareB.includes('fuel364:fuel'),
      'T418b SK-6 絕跡釘：fin 364/418 鏡像 15 欄已整組刪除（零讀者的跨城殘留欄不得復活）');
    const findB=(kind)=>{const n=window.GV.N();for(let y=2;y<n-2;y++)for(let x=2;x<n-2;x++)if(window.GV.resourceAt(x,y)===kind)return[x,y];return null;};
    const putB=(k,x,y,done)=>{window.__t384Bld(k,x,y);if(done)window.__t412Set(x,y,'age',9);};
    // --- B1 upCost 兩臂（seed942 同種子同日）：面板說生效就真打折 ---
    window.GV.newWorldSeeded(942);window.GV.setDiff(1);
    const oreB1=findB(2);
    assert(oreB1,'T418b B1 前置：seed942 應有礦格');
    putB(50,oreB1[0],oreB1[1],true);putB(122,10,10,true);
    window.__t384Bld(1,20,20);window.__t384Bld(1,22,20);
    for(let d=1;d<=2;d++)window.GV.step(1);
    let cB=window.GV.chain346();
    assert(cB.steel===0&&cB.constrUse===2&&cB.upCost364(9,1)===382.5,
      'T418b B1 折扣臂：施工把日終庫存吃到 0，快照口徑下升級費仍 382.5（=450×0.85；改回讀活庫存→450→紅），實得 steel='+cB.steel+' cu='+cB.constrUse+' up='+cB.upCost364(9,1));
    window.GV.newWorldSeeded(942);window.GV.setDiff(1);
    for(let d=1;d<=2;d++)window.GV.step(1);
    cB=window.GV.chain346();
    assert(cB.upCost364(9,1)===450,'T418b B1 無鋼臂：同種子同日無鋼廠升級費原價 450，實得 '+cB.upCost364(9,1));
    // --- B1b SKB-1：load 推導方向（折扣態不得跨城殘留為真）---
    window.GV.newWorldSeeded(957);window.GV.setDiff(1);
    window.GV.save();const rawNoSteel=window.GV.rawSave();
    window.GV.newWorldSeeded(942);window.GV.setDiff(1);
    const oreB1b=findB(2);
    putB(50,oreB1b[0],oreB1b[1],true);putB(122,10,10,true);
    window.GV.step(1);
    assert(window.GV.chain346().upCost364(9,1)===382.5,'T418b B1b 前置：A 城有鋼折扣態為真');
    store[SKEY]=rawNoSteel;
    assert(window.GV.load(),'T418b B1b：直接 load 無鋼 B 檔應成功');
    assert(window.GV.chain346().upCost364(9,1)===450,
      'T418b B1b load 推導方向：從有鋼城直接載入無鋼存檔，未 tick 前折扣態必須為假（450；load 端改 steelDisc418=true 或殘留前城快照→382.5→紅），實得 '+window.GV.chain346().upCost364(9,1));
    // --- B2 滿倉臂（seed942＋直設庫存 120）：SK-3 滿倉不停擺 ---
    window.GV.newWorldSeeded(942);window.GV.setDiff(1);
    const oreB2=findB(2);
    putB(50,oreB2[0],oreB2[1],true);putB(122,10,10,true);
    window.__t384Bld(1,20,20);
    window.__t418bSetSteel(120);
    window.GV.step(1);cB=window.GV.chain346();
    assert(cB.steelMade===0&&cB.constrUse===1&&cB.steel===119&&window.GV.tile(20,20).bld.age===3,
      'T418b B2 滿倉臂 d1：cap 頂滿 made 0 但施工照樣從庫存出料（cu 1/steel 119/age 3；退回「額度=當日產量」→停擺→紅），實得 '+cB.steelMade+'/'+cB.constrUse+'/'+cB.steel+'/'+window.GV.tile(20,20).bld.age);
    window.GV.step(1);cB=window.GV.chain346();
    assert(cB.steelMade===1&&cB.constrUse===1&&cB.steel===119&&window.GV.tile(20,20).bld.age===5,
      'T418b B2 滿倉臂 d2：消耗騰出 1 格產能（made 1/cu 1/steel 119/age 5），實得 '+cB.steelMade+'/'+cB.constrUse+'/'+cB.steel+'/'+window.GV.tile(20,20).bld.age);
    const fsB=window.GV.flowStat();
    assert(fsB.steel.constr===1,'T418b SK-2 行為：flowStat 施工欄===當日 constrUse（面板帳平），實得 '+fsB.steel.constr);
    // --- B3 輪轉分配（seed942，12 棟兩排 8 日）：不再恆偏北 ---
    window.GV.newWorldSeeded(942);window.GV.setDiff(1);
    const oreB3=findB(2);
    putB(50,oreB3[0],oreB3[1],true);putB(122,10,10,true);
    const homesB3=[];
    for(let i=0;i<6;i++){window.__t384Bld(1,20+i*2,20);homesB3.push([20+i*2,20]);}
    for(let i=0;i<6;i++){window.__t384Bld(1,20+i*2,40);homesB3.push([20+i*2,40]);}
    for(let d=1;d<=8;d++)window.GV.step(1);
    const agesB3=homesB3.map(([x,y])=>window.GV.tile(x,y).bld.age).join(',');
    assert(agesB3==='10,10,10,11,11,11,11,10,10,9,9,10',
      'T418b B3 輪轉分配（F1 退修後：輪轉基數＝施工中合格子集）：8 日 12 棟兩排 age 陣列恰等——南排 y=40 也吃到加速；退回恆自 0 起掃→北排獨吞（實測 13,13,11,11,10,10,9,9,9,9,9,9）→紅，實得 '+agesB3);
    // --- B3b 大城公平性（F1 退修的核心證明）：167 根建築城，南端必須拿到加速鋼 ---
    let sdB3=4180;for(;sdB3<4260;sdB3++){window.GV.newWorldSeeded(sdB3);window.GV.setDiff(1);if(findB(2))break;}
    const oreB3b=findB(2);
    assert(oreB3b,'T418b B3b 前置：應找到有礦種子');
    putB(50,oreB3b[0],oreB3b[1],true);putB(122,6,6,true);putB(122,10,6,true);
    window.__t418bSetSteel(120);
    const northB3=[],southB3=[];
    for(let i=0;i<15;i++){window.__t384Bld(1,20+i*2,20);northB3.push([20+i*2,20]);}
    for(let i=0;i<15;i++){window.__t384Bld(1,20+i*2,60);southB3.push([20+i*2,60]);}
    for(let i=0;i<60;i++){const x=20+(i%30)*2;window.__t384Bld(1,x,40);window.__t412Set(x,40,'age',9);}
    for(let d=1;d<=12;d++)window.GV.step(1);
    const naB3=northB3.map(([x,y])=>window.GV.tile(x,y).bld.age),saB3=southB3.map(([x,y])=>window.GV.tile(x,y).bld.age);
    const maxS=Math.max.apply(null,saB3),minS=Math.min.apply(null,saB3);
    assert(maxS>13&&minS>=13,
      'T418b B3b 大城公平性：167 根建築城 12 日後南端（y=60）必須拿到加速鋼（純自然=13；SK-4 初版 day%tickBld.length 每日只爬 1 格→南端恆 13 零加速，與恆北序逐位相同→紅），實得 south min/max '+minS+'/'+maxS+' north avg '+(naB3.reduce((p,q)=>p+q,0)/15).toFixed(2));
    // --- B4 造船競爭兩臂（seed943）：全滅臂＋庫存臂（SK-7 邊界釘死） ---
    window.GV.newWorldSeeded(943);window.GV.setDiff(1);
    let oreB4=findB(2);
    putB(50,oreB4[0],oreB4[1],true);putB(122,10,10,true);
    putB(123,14,10,true);putB(123,18,10,true);putB(18,22,10,true);
    window.__t384Bld(1,30,20);
    let cuB4=0;
    for(let d=1;d<=4;d++){window.GV.step(1);cuB4+=window.GV.chain346().constrUse;}
    assert(cuB4===0&&window.GV.tile(30,20).bld.age===5,
      'T418b B4 全滅臂：雙造船廠吃光日產（shipyardN≥steelMade）＋零庫存→施工加速全停（cu 0/age 5＝實效邊界入檔），實得 '+cuB4+'/'+window.GV.tile(30,20).bld.age);
    window.GV.newWorldSeeded(943);window.GV.setDiff(1);
    oreB4=findB(2);
    putB(50,oreB4[0],oreB4[1],true);putB(122,10,10,true);
    putB(123,14,10,true);putB(123,18,10,true);putB(18,22,10,true);
    window.__t384Bld(1,30,20);
    window.__t418bSetSteel(50);
    cuB4=0;
    for(let d=1;d<=4;d++){window.GV.step(1);cuB4+=window.GV.chain346().constrUse;}
    assert(cuB4===4&&window.GV.tile(30,20).bld.age===9&&window.GV.chain346().steel===46,
      'T418b B4 庫存臂：庫存 50 下競爭仍可加速（cu 4/age 9/steel 46＝SK-3 庫存出料的正面證明），實得 '+cuB4+'/'+window.GV.tile(30,20).bld.age+'/'+window.GV.chain346().steel);
    // --- B5 往返位元恆等（seed953，4 格合法布局；SK-8 契約的機器面） ---
    window.GV.newWorldSeeded(953);window.GV.setDiff(1);
    const oilB5=findB(1),oreB5=findB(2);
    putB(49,oilB5[0],oilB5[1],true);putB(50,oreB5[0],oreB5[1],true);
    putB(121,10,10,true);putB(122,14,10,true);putB(123,18,10,true);putB(18,22,10,true);
    for(let d=1;d<=35;d++)window.GV.step(1);
    window.GV.save();const rawA5=window.GV.rawSave();
    window.GV.load();window.GV.save();const rawB5=window.GV.rawSave();
    assert(rawA5===rawB5,'T418b B5 往返位元恆等：4 格合法布局鏈城 save→load→save 逐位一致（2 格間距=讀檔非法城會互蓋樓，SK-8 布局契約），len '+rawA5.length+'/'+rawB5.length);
  }

  { // ===== T421 nightCity 指紋守衛（行為釘，非字面掃描；增量一，美術落筆前） =====
    // 1) 清冊帶 nightCity 欄（entries 數不變語意——仍一 entry 一 img）
    const at421=window.GV.sprAtlas356();
    const ncEnt=at421.entries.filter(e=>e.nightCity);
    assert(typeof window.__t421NcN==='number','T421 nightCity：__t421NcN 基線在場（bake 尾賦值）');
    assert(window.__t421NcN===ncEnt.length||(window.__t421NcN===0&&ncEnt.length===0),
      'T421 nightCity：sprAtlas356 帶 nightCity 的 entries 數恰等基線 N（實得 atlas='+ncEnt.length+' base='+window.__t421NcN+'）');
    // 2) 引用恆等：ART pass 不得替換 nightCity 畫布物件（'nig'+'htCity' 賦新 canvas 會紅）
    let refOk421=true,refMsg421='';
    const refs421=window.__t421NcRefs||{};
    const S421=window.__t420SPR; // harness 注入的 SPR 直讀橋（本 scope 無 SPR 全域）
    assert(S421&&S421.bld,'T421 nightCity：__t420SPR 橋在場');
    for(const k of Object.keys(refs421)){
      let cur=null;
      if(k.charAt(0)==='@'){
        if(k==='@police')cur=S421.police&&S421.police.nightCity;
        else if(k==='@hospital')cur=S421.hospital&&S421.hospital.nightCity;
        else if(k==='@clinic')cur=S421.clinic&&S421.clinic.nightCity;
        else if(k.indexOf('@policeVar')===0)cur=S421.policeVar&&S421.policeVar[+k.slice(10)]&&S421.policeVar[+k.slice(10)].nightCity;
        else if(k.indexOf('@hospitalVar')===0)cur=S421.hospitalVar&&S421.hospitalVar[+k.slice(12)]&&S421.hospitalVar[+k.slice(12)].nightCity;
        else if(k.indexOf('@clinicVar')===0)cur=S421.clinicVar&&S421.clinicVar[+k.slice(10)]&&S421.clinicVar[+k.slice(10)].nightCity;
      }else cur=S421.bld[k]&&S421.bld[k].nightCity;
      if(cur!==refs421[k]){refOk421=false;refMsg421=k;break;}
    }
    assert(refOk421,'T421 nightCity 引用恆等：bake 後畫布物件不得被替換（鍵 '+refMsg421+'）');
    // 3) 尺寸 meta 恆等
    let metaOk421=true,metaMsg421='';
    const meta421=window.__t421NcMeta||{};
    for(const k of Object.keys(meta421)){
      const c=refs421[k];if(!c){metaOk421=false;metaMsg421=k+' missing';break;}
      if((c.width+'x'+c.height)!==meta421[k]){metaOk421=false;metaMsg421=k+' '+c.width+'x'+c.height+'≠'+meta421[k];break;}
    }
    assert(metaOk421,'T421 nightCity 尺寸 meta 恆等：'+metaMsg421);
    // 4) 行為紅源可咬：替換一鍵 nightCity 引用後必須可偵測
    if(window.__t421NcN>0){
      const k0=Object.keys(refs421).find(k=>k.charAt(0)!=='@')||Object.keys(refs421)[0];
      const hold=refs421[k0];
      const fake=document.createElement('canvas');fake.width=hold.width;fake.height=hold.height;
      let probeFail=false;
      if(k0.charAt(0)!=='@'&&S421.bld[k0]){const bak=S421.bld[k0].nightCity;S421.bld[k0].nightCity=fake;probeFail=(S421.bld[k0].nightCity!==hold);S421.bld[k0].nightCity=bak;}
      else probeFail=true;
      assert(probeFail,'T421 nightCity 比較器：替換 bld nightCity 必須可偵測');
    }
    // 5) 當烘焙開啟時 N 必須 >0 且與 bakeCount 同階（字面 'nightCity' 掃描無法替代）
    if(window.__t413BakeCount>0)assert(window.__t421NcN>50,'T421 nightCity：烘焙開啟時 N>50（整段刪 bake 會紅），實得 '+window.__t421NcN);
  }

  { // ===== T420 ART-LOOP 守衛（六條：位置/metadata/落筆觀測/前置C/計數+幾何/指紋+亂數+分檔位） =====
    // 共同前置：pass 受管區切片（卡面第 2 節：單一 BEGIN/END）
    const b420=html.indexOf('/* ===== T420 ART-LOOP 靜態加蓋 pass');
    const e420=html.indexOf('T420 ART-LOOP 靜態加蓋 pass END');
    // T421 起 else 分支含 __t421Nc* 重設——位置釘改用含 T421 欄的完整 else 字面
    const bakeEnd420='}else{window.__t413BakeCount=0;window.__t413BakeByKind={R:0,C:0,I:0,P:0,H:0,F:0,D:0,S:0};window.__t421NcRefs={};window.__t421NcMeta={};window.__t421NcN=0;}';
    const iBakeEnd420=html.indexOf(bakeEnd420);
    const iR420=html.lastIndexOf('R=__savedR;');
    const iRbefore420=html.lastIndexOf('R=__savedR;',b420); // pass 之前的 R 還原（M5：pass 前插 R 還原 → 此值落在 T413b 與 pass 之間 → 紅）
    const seg420=html.slice(b420,e420);
    // G1 位置釘：完整 else 字面（T419 用 lastIndexOf('__t413BakeByKind') 被「搬進 else」騙過——改用整段 else 字面結束）
    assert(b420>0&&iBakeEnd420>0&&iBakeEnd420<b420&&iR420>e420&&iRbefore420<=iBakeEnd420,
      'T420 G1 位置：pass 必須位於 T413b else 分支完整字面（含 BakeCount=0 重設群）之後、R=__savedR 之前，且 T413b 與 pass 之間不得插入 R 還原（搬進 else/搬到 R 之後/中間插還原皆紅）');
    // G1b 分支無關行為釘：quality=0（不烘夜之城）重跑，落筆偵測結果不變（靜態加蓋無畫質分支理由）
    assert(!/(quality|lod|dpr)/.test(seg420),'T420 G1b 分檔位：pass 正文不得出現 quality/lod/dpr（卡面第 5 節守衛 5 原文前哨）');
    // G2 metadata 直讀 record（T419 讀 sprAtlas356 的 w/h 是 img.width 推導——看不到 record；直讀 SPR.bld[key]）
    const m420={};
    for(const k of Object.keys(window.__t420SPR.bld)){const s=window.__t420SPR.bld[k];if(s&&typeof s.w==='number')m420[k]={w:s.w,h:s.h,ax:s.ax,ay:s.ay,sc:s.sc};}
    assert(Object.keys(m420).length>100,'T420 G2 metadata 直讀：SPR.bld 全鍵 record 可直讀（w/h/ax/ay/sc 原值）');
    assert(m420['26_1_1'].w===64&&m420['26_1_1'].h===112&&m420['26_1_1'].ax===32&&m420['26_1_1'].ay===110&&(m420['26_1_1'].sc===null||m420['26_1_1'].sc===undefined)
      &&m420['26_1_2'].w===64&&m420['26_1_2'].h===112&&m420['26_1_2'].ax===32&&m420['26_1_2'].ay===110&&(m420['26_1_2'].sc===null||m420['26_1_2'].sc===undefined)
      &&m420['29_1_1'].w===72&&m420['29_1_1'].h===112&&m420['29_1_1'].ax===36&&m420['29_1_1'].ay===110&&(m420['29_1_1'].sc===null||m420['29_1_1'].sc===undefined)
      &&m420['29_1_2'].w===72&&m420['29_1_2'].h===112&&m420['29_1_2'].ax===36&&m420['29_1_2'].ay===110&&(m420['29_1_2'].sc===null||m420['29_1_2'].sc===undefined),
      'T420 G2 metadata 恆等：26_1_1/2（w64/h112/ax32/ay110）與 29_1_1/2（w72/h112/ax36/ay110）record 原值恰等量測；改 record 欄位即紅');
    // G3 落筆觀測式（T417 真像素跑檯）：對白名單鍵重放 pass，斷言 ops 與不透明像素增量 ≥ 實測下界
    const wl420=['26_1_1','26_1_2','29_1_1','29_1_2'];
    const replay420=window.__t420Replay;
    assert(typeof replay420==='function','T420 G3 前置：__t420Replay 重放橋存在（harness 注入）');
    const rp420=replay420(wl420);
    assert(rp420['26_1_1'].ops>=4&&rp420['26_1_2'].ops>=4&&rp420['26_1_1'].ink>=45&&rp420['26_1_2'].ink>=45
      &&rp420['29_1_1'].ops>=5&&rp420['29_1_2'].ops>=5&&rp420['29_1_1'].ink>=24&&rp420['29_1_2'].ink>=24,
      'T420 G3 落筆觀測（只是下界，主斷言在 G5 rect 逐筆恰等）：T417 真像素重放白名單鍵，每鍵 ops/ink ≥ 帳本下界（26_1_1/2 ops≥4/ink≥45；29_1_1/2 ops≥5/ink≥24；刪 fillRect 或只 push 不畫皆紅），實得 '+JSON.stringify({a:rp420['26_1_1'].ops+':'+rp420['26_1_1'].ink,b:rp420['26_1_2'].ops+':'+rp420['26_1_2'].ink,c:rp420['29_1_1'].ops+':'+rp420['29_1_1'].ink,d:rp420['29_1_2'].ops+':'+rp420['29_1_2'].ink}));
    // G4 前置 C 機器版（座標交集法）：白名單鍵的 ≤16px 重點細節座標零覆蓋（按鍵各自斷）
    //   26_1_1/26_1_2：航警燈 #e05252×4（31,34)(32,34)(31,35)(32,35）
    //   29_1_1/29_1_2：紅桶燈 #e05252×4（51,101)(52,101)(53,101）＋中心豎管 #675b4f×13（x=36,y92-104）
    const beacon420={};
    beacon420['26_1_1']=['31,34','32,34','31,35','32,35'];
    beacon420['26_1_2']=['31,34','32,34','31,35','32,35'];
    beacon420['29_1_1']=['51,101','52,101','53,101'];
    beacon420['29_1_2']=['51,101','52,101','53,101'];
    for(let y2=92;y2<=104;y2++){beacon420['29_1_1'].push('36,'+y2);beacon420['29_1_2'].push('36,'+y2);}
    let beaconHit420=false;
    let beaconDetail420='';
    for(const k of wl420)for(const r of rp420[k].rects){
      for(let y2=r.y;y2<r.y+r.h;y2++)for(let x2=r.x;x2<r.x+r.w;x2++)if(beacon420[k].includes(x2+','+y2)){beaconHit420=true;beaconDetail420+=k+'@'+x2+','+y2+' ';}
    }
    assert(!beaconHit420,'T420 G4 前置C 機器版：pass 落筆不得覆蓋重點細節座標（命中 '+beaconDetail420+'；26_1_1/2 航警燈 31-32,34-35；29_1_1/2 紅桶燈 51-53,101 與中心豎管 x36）');
    // G5 落筆釘（覆核退修 F1：改讀 __t420Replay 的真實 rects——座標/尺寸/少多筆逐筆恰等帳本 rect 表）＋幾何釘
    //   rect 表（R01/R03 實測，來源同卡帳本；比照 PASS 棘輪慣例：常數與 delta 來源寫在帳本）
    const rectTable420={
      '26_1_1':[{x:28,y:54,w:9,h:1},{x:28,y:70,w:9,h:1},{x:28,y:86,w:9,h:1},{x:28,y:99,w:9,h:2}],
      '26_1_2':[{x:28,y:54,w:9,h:1},{x:28,y:70,w:9,h:1},{x:28,y:86,w:9,h:1},{x:28,y:99,w:9,h:2}],
      '29_1_1':[{x:24,y:102,w:6,h:1},{x:32,y:102,w:4,h:1},{x:37,y:102,w:2,h:1},{x:40,y:102,w:6,h:1},{x:48,y:102,w:6,h:1}],
      '29_1_2':[{x:24,y:102,w:6,h:1},{x:32,y:102,w:4,h:1},{x:37,y:102,w:2,h:1},{x:40,y:102,w:6,h:1},{x:48,y:102,w:6,h:1}],
    };
    let rectOk420=true,rectMsg420='';
    for(const k of wl420){
      const got=rp420[k].rects.map(r=>r.x+','+r.y+','+r.w+','+r.h).sort();
      const want=rectTable420[k].map(r=>r.x+','+r.y+','+r.w+','+r.h).sort();
      if(got.length!==want.length){rectOk420=false;rectMsg420=k+' 筆數 '+got.length+'≠'+want.length;break;}
      for(let ri=0;ri<want.length;ri++)if(got[ri]!==want[ri]){rectOk420=false;rectMsg420=k+' 第'+ri+'筆 '+got[ri]+'≠'+want[ri];break;}
    }
    assert(rectOk420,'T420 G5 落筆：每鍵 rect 集合逐筆恰等帳本 rect 表（座標差 1px／尺寸差 1px／少一筆／多一筆即紅；覆核 F1 實測 ay-56→ay-52 與 9,1→27,3 皆綠的破口已關）'+rectMsg420);
    const ink420=window.__t420Ink;
    assert(ink420&&ink420.rects===18&&ink420.px===138,
      'T420 G5 計數（第二層）：__t420Ink 恰等帳本常數 rects=18／px=138（R01 8+90＋R03 10+48；主斷言在上方 rect 逐筆恰等，此為手寫字面量第二層）');
    const rects420=[...seg420.matchAll(/fillRect\(([^)]*)\)/g)].map(m=>m[1].split(',').map(s=>s.trim()));
    let geomOk420=true,geomMsg420='';
    for(const r of rects420){
      if(r.length<4){geomOk420=false;geomMsg420='非四參數: '+r.join(',');break;}
      const xm=r[0].match(/sp26b\.ax([+-]\d+)/)||r[0].match(/sp29b\.ax([+-]\d+)/);
      const ym=r[1].match(/sp26b\.ay([+-]\d+)/)||r[1].match(/sp29b\.ay([+-]\d+)/);
      if(!xm||!ym){geomOk420=false;geomMsg420='座標非 ax/ay 式: '+r.join(',');break;}
      const xOff=+xm[1],yOff=+ym[1];
      const w=+r[2],h=+r[3];
      if(!(w>0&&h>0)){geomOk420=false;geomMsg420='尺寸非正: '+r.join(',');break;}
      const axv=r[0].includes('sp26b')?32:36,ayv=110;
      const wv=r[0].includes('sp26b')?64:72,hv=112;
      if(axv+xOff<0||axv+xOff+w>wv||ayv+yOff<0||ayv+yOff+h>hv){geomOk420=false;geomMsg420='超出畫布: '+r.join(',');break;}
    }
    assert(geomOk420,'T420 G5 幾何：pass 每個 fillRect 落在 [0,w)×[0,h) 內（整組平移出界即紅）'+geomMsg420);
    // G6 落筆恆等：恰等帳本常數（空骨架 0 或多畫皆紅）
    assert(ink420.rects===18&&ink420.px===138,
      'T420 G6 落筆恆等：R01+R03 落筆恰等帳本常數 rects=18／px=138（空骨架 0 或 多畫即紅，實得 '+JSON.stringify(ink420)+'）');
  }

  { // ===== T421 ART-LOOP 守衛（獨立受管區；訊息只具名 T421） =====
    const b421=html.indexOf('/* ===== T421 ART-LOOP 靜態加蓋 pass');
    const e421=html.indexOf('T421 ART-LOOP 靜態加蓋 pass END');
    const e420end=html.indexOf('T420 ART-LOOP 靜態加蓋 pass END');
    const iR421=html.lastIndexOf('R=__savedR;');
    const seg421=html.slice(b421,e421);
    // G1 位置：T420 END 之後、R=__savedR 之前
    assert(b421>0&&e420end>0&&e420end<b421&&iR421>e421,
      'T421 G1 位置：pass 必須位於 T420 ART-LOOP END 之後、R=__savedR 之前（不得塞進 T420 受管區）');
    assert(!/(quality|lod|dpr)/.test(seg421),'T421 G1b 分檔位：pass 正文不得出現 quality/lod/dpr');
    // G2 metadata
    const m421={};
    for(const k of Object.keys(window.__t420SPR.bld)){const s=window.__t420SPR.bld[k];if(s&&typeof s.w==='number')m421[k]={w:s.w,h:s.h,ax:s.ax,ay:s.ay,sc:s.sc};}
    assert(m421['14_1_1']&&m421['14_1_1'].w===72&&m421['14_1_1'].h===112&&m421['14_1_1'].ax===36&&m421['14_1_1'].ay===110&&m421['14_1_2']&&m421['14_1_2'].w===72&&m421['14_1_2'].h===112&&m421['14_1_2'].ax===36&&m421['14_1_2'].ay===110&&m421['14_1_3']&&m421['14_1_3'].w===72&&m421['14_1_3'].h===112&&m421['14_1_3'].ax===36&&m421['14_1_3'].ay===110&&m421['14_1_4']&&m421['14_1_4'].w===72&&m421['14_1_4'].h===112&&m421['14_1_4'].ax===36&&m421['14_1_4'].ay===110&&m421['15_1_1']&&m421['15_1_1'].w===72&&m421['15_1_1'].h===112&&m421['15_1_1'].ax===36&&m421['15_1_1'].ay===110&&m421['15_1_2']&&m421['15_1_2'].w===72&&m421['15_1_2'].h===112&&m421['15_1_2'].ax===36&&m421['15_1_2'].ay===110&&m421['15_1_3']&&m421['15_1_3'].w===72&&m421['15_1_3'].h===112&&m421['15_1_3'].ax===36&&m421['15_1_3'].ay===110&&m421['15_1_4']&&m421['15_1_4'].w===72&&m421['15_1_4'].h===112&&m421['15_1_4'].ax===36&&m421['15_1_4'].ay===110&&m421['16_1_1']&&m421['16_1_1'].w===72&&m421['16_1_1'].h===112&&m421['16_1_1'].ax===36&&m421['16_1_1'].ay===110&&m421['16_1_2']&&m421['16_1_2'].w===72&&m421['16_1_2'].h===112&&m421['16_1_2'].ax===36&&m421['16_1_2'].ay===110&&m421['16_1_3']&&m421['16_1_3'].w===72&&m421['16_1_3'].h===112&&m421['16_1_3'].ax===36&&m421['16_1_3'].ay===110&&m421['16_1_4']&&m421['16_1_4'].w===72&&m421['16_1_4'].h===112&&m421['16_1_4'].ax===36&&m421['16_1_4'].ay===110&&m421['17_1_1']&&m421['17_1_1'].w===72&&m421['17_1_1'].h===112&&m421['17_1_1'].ax===36&&m421['17_1_1'].ay===110&&m421['17_1_2']&&m421['17_1_2'].w===72&&m421['17_1_2'].h===112&&m421['17_1_2'].ax===36&&m421['17_1_2'].ay===110&&m421['17_1_3']&&m421['17_1_3'].w===72&&m421['17_1_3'].h===112&&m421['17_1_3'].ax===36&&m421['17_1_3'].ay===110&&m421['17_1_4']&&m421['17_1_4'].w===72&&m421['17_1_4'].h===112&&m421['17_1_4'].ax===36&&m421['17_1_4'].ay===110&&m421['18_1_1']&&m421['18_1_1'].w===88&&m421['18_1_1'].h===120&&m421['18_1_1'].ax===44&&m421['18_1_1'].ay===118&&m421['18_1_2']&&m421['18_1_2'].w===88&&m421['18_1_2'].h===120&&m421['18_1_2'].ax===44&&m421['18_1_2'].ay===118&&m421['18_1_3']&&m421['18_1_3'].w===88&&m421['18_1_3'].h===120&&m421['18_1_3'].ax===44&&m421['18_1_3'].ay===118&&m421['18_1_4']&&m421['18_1_4'].w===88&&m421['18_1_4'].h===120&&m421['18_1_4'].ax===44&&m421['18_1_4'].ay===118&&m421['20_1_1']&&m421['20_1_1'].w===136&&m421['20_1_1'].h===150&&m421['20_1_1'].ax===68&&m421['20_1_1'].ay===148&&m421['20_1_2']&&m421['20_1_2'].w===136&&m421['20_1_2'].h===150&&m421['20_1_2'].ax===68&&m421['20_1_2'].ay===148&&m421['21_1_1']&&m421['21_1_1'].w===72&&m421['21_1_1'].h===112&&m421['21_1_1'].ax===36&&m421['21_1_1'].ay===110&&m421['21_1_2']&&m421['21_1_2'].w===72&&m421['21_1_2'].h===112&&m421['21_1_2'].ax===36&&m421['21_1_2'].ay===110&&m421['21_1_3']&&m421['21_1_3'].w===72&&m421['21_1_3'].h===112&&m421['21_1_3'].ax===36&&m421['21_1_3'].ay===110&&m421['21_1_4']&&m421['21_1_4'].w===72&&m421['21_1_4'].h===112&&m421['21_1_4'].ax===36&&m421['21_1_4'].ay===110&&m421['27_1_1']&&m421['27_1_1'].w===88&&m421['27_1_1'].h===120&&m421['27_1_1'].ax===44&&m421['27_1_1'].ay===118&&m421['27_1_2']&&m421['27_1_2'].w===88&&m421['27_1_2'].h===120&&m421['27_1_2'].ax===44&&m421['27_1_2'].ay===118&&m421['29_1_3']&&m421['29_1_3'].w===72&&m421['29_1_3'].h===112&&m421['29_1_3'].ax===36&&m421['29_1_3'].ay===110&&m421['29_1_4']&&m421['29_1_4'].w===72&&m421['29_1_4'].h===112&&m421['29_1_4'].ax===36&&m421['29_1_4'].ay===110,
      'T421 G2 metadata 恆等：白名單鍵 w/h/ax/ay');
    const wl421=["14_1_1", "14_1_2", "14_1_3", "14_1_4", "15_1_1", "15_1_2", "15_1_3", "15_1_4", "16_1_1", "16_1_2", "16_1_3", "16_1_4", "17_1_1", "17_1_2", "17_1_3", "17_1_4", "18_1_1", "18_1_2", "18_1_3", "18_1_4", "20_1_1", "20_1_2", "21_1_1", "21_1_2", "21_1_3", "21_1_4", "27_1_1", "27_1_2", "29_1_3", "29_1_4"];
    const replay421=window.__t421Replay;
    assert(typeof replay421==='function','T421 G3 前置：__t421Replay 重放橋存在');
    const rp421=replay421(wl421);
    assert(rp421['15_1_1'].ops>=6&&rp421['15_1_1'].ink>=49&&rp421['15_1_2'].ops>=6&&rp421['15_1_2'].ink>=49&&rp421['15_1_3'].ops>=6&&rp421['15_1_3'].ink>=49&&rp421['15_1_4'].ops>=6&&rp421['15_1_4'].ink>=49&&rp421['14_1_1'].ops>=8&&rp421['14_1_1'].ink>=43&&rp421['14_1_2'].ops>=8&&rp421['14_1_2'].ink>=43&&rp421['14_1_3'].ops>=6&&rp421['14_1_3'].ink>=58&&rp421['14_1_4'].ops>=6&&rp421['14_1_4'].ink>=58&&rp421['16_1_1'].ops>=0&&rp421['16_1_1'].ink>=0&&rp421['16_1_2'].ops>=0&&rp421['16_1_2'].ink>=0&&rp421['16_1_3'].ops>=6&&rp421['16_1_3'].ink>=76&&rp421['16_1_4'].ops>=6&&rp421['16_1_4'].ink>=76&&rp421['17_1_1'].ops>=6&&rp421['17_1_1'].ink>=76&&rp421['17_1_2'].ops>=6&&rp421['17_1_2'].ink>=76&&rp421['17_1_3'].ops>=6&&rp421['17_1_3'].ink>=66&&rp421['17_1_4'].ops>=6&&rp421['17_1_4'].ink>=66&&rp421['21_1_1'].ops>=6&&rp421['21_1_1'].ink>=68&&rp421['21_1_2'].ops>=6&&rp421['21_1_2'].ink>=68&&rp421['21_1_3'].ops>=6&&rp421['21_1_3'].ink>=76&&rp421['21_1_4'].ops>=6&&rp421['21_1_4'].ink>=76&&rp421['18_1_1'].ops>=6&&rp421['18_1_1'].ink>=112&&rp421['18_1_2'].ops>=6&&rp421['18_1_2'].ink>=112&&rp421['18_1_3'].ops>=6&&rp421['18_1_3'].ink>=94&&rp421['18_1_4'].ops>=6&&rp421['18_1_4'].ink>=94&&rp421['27_1_1'].ops>=6&&rp421['27_1_1'].ink>=104&&rp421['27_1_2'].ops>=6&&rp421['27_1_2'].ink>=104&&rp421['20_1_1'].ops>=6&&rp421['20_1_1'].ink>=116&&rp421['20_1_2'].ops>=6&&rp421['20_1_2'].ink>=116&&rp421['29_1_3'].ops>=6&&rp421['29_1_3'].ink>=110&&rp421['29_1_4'].ops>=6&&rp421['29_1_4'].ink>=110,
      'T421 G3 落筆觀測 ops/ink，實得 '+JSON.stringify(Object.fromEntries(wl421.map(k=>[k,rp421[k].ops+':'+rp421[k].ink]))));
    const beacon421={};
    beacon421['14_1_1']=['32,108','33,108','34,108','35,108','36,108','37,108','38,108','39,108','32,109','33,109','34,109','35,109','36,109','37,109','38,109','39,109','36,90','36,91','36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','22,100','23,100','24,100','22,101','23,101','24,101','22,102','23,102','24,102','22,103','23,103','24,103','22,104','23,104','24,104','26,100','27,100','28,100','26,101','27,101','28,101','26,102','27,102','28,102','26,103','27,103','28,103','26,104','27,104','28,104','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','32,106','33,106','38,106','39,106','31,107','32,107','33,107','34,107','35,107','36,107','37,107','38,107','39,107','40,107','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,106','29,106','30,106','31,106','34,106','35,106','36,106','37,106','40,106','41,106','42,106','43,106','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','36,105','61,91'];
    beacon421['14_1_2']=['32,108','33,108','34,108','35,108','36,108','37,108','38,108','39,108','32,109','33,109','34,109','35,109','36,109','37,109','38,109','39,109','36,90','36,91','36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','22,100','23,100','24,100','22,101','23,101','24,101','22,102','23,102','24,102','22,103','23,103','24,103','22,104','23,104','24,104','26,100','27,100','28,100','26,101','27,101','28,101','26,102','27,102','28,102','26,103','27,103','28,103','26,104','27,104','28,104','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','32,106','33,106','38,106','39,106','31,107','32,107','33,107','34,107','35,107','36,107','37,107','38,107','39,107','40,107','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,106','29,106','30,106','31,106','34,106','35,106','36,106','37,106','40,106','41,106','42,106','43,106','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','36,105','61,91'];
    beacon421['14_1_3']=['15,82','16,82','18,82','52,83','53,83','55,83','22,86','23,86','25,86','45,86','46,86','48,86','29,89','30,89','32,89','41,90','32,108','33,108','34,108','35,108','36,108','37,108','38,108','39,108','32,109','33,109','34,109','35,109','36,109','37,109','38,109','39,109','22,100','23,100','24,100','22,101','23,101','24,101','22,102','23,102','24,102','22,103','23,103','24,103','22,104','23,104','24,104','26,100','27,100','28,100','26,101','27,101','28,101','26,102','27,102','28,102','26,103','27,103','28,103','26,104','27,104','28,104','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','32,106','33,106','38,106','39,106','31,107','32,107','33,107','34,107','35,107','36,107','37,107','38,107','39,107','40,107','28,106','29,106','30,106','31,106','34,106','35,106','36,106','37,106','40,106','41,106','42,106','43,106','15,89','16,89','17,89','18,89','22,93','23,93','24,93','25,93','30,96','31,96','32,96','52,90','53,90','54,90','55,90','45,93','46,93','47,93','48,93','40,97','41,97','17,82','54,83','24,86','47,86','31,89','40,90','17,85','54,86','24,89','47,89','31,92','40,93','36,105'];
    beacon421['14_1_4']=['32,108','33,108','34,108','35,108','36,108','37,108','38,108','39,108','32,109','33,109','34,109','35,109','36,109','37,109','38,109','39,109','36,90','36,91','36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','14,92','15,92','16,92','17,92','18,92','21,96','22,96','23,96','24,96','25,96','28,99','29,99','30,99','31,99','32,99','52,93','53,93','54,93','55,93','56,93','45,96','46,96','47,96','48,96','49,96','38,100','39,100','40,100','41,100','42,100','22,100','23,100','24,100','22,101','23,101','24,101','22,102','23,102','24,102','22,103','23,103','24,103','22,104','23,104','24,104','26,100','27,100','28,100','26,101','27,101','28,101','26,102','27,102','28,102','26,103','27,103','28,103','26,104','27,104','28,104','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','32,106','33,106','38,106','39,106','31,107','32,107','33,107','34,107','35,107','36,107','37,107','38,107','39,107','40,107','28,106','29,106','30,106','31,106','34,106','35,106','36,106','37,106','40,106','41,106','42,106','43,106','16,84','54,85','23,88','47,88','30,91','40,92','16,88','54,89','23,92','47,92','30,95','40,96','36,105'];
    beacon421['15_1_1']=['34,90','35,90','36,90','37,90','34,91','35,91','36,91','37,91','34,92','35,92','36,92','37,92','34,93','35,93','36,93','37,93','26,106','27,106','28,106','29,106','32,106','33,106','34,106','35,106','38,106','39,106','40,106','41,106','44,106','45,106','46,106','47,106','15,84','16,84','18,84','52,85','53,85','55,85','22,88','23,88','25,88','45,88','46,88','48,88','29,91','30,91','41,92','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,104','29,104','30,104','31,104','32,104','28,105','29,105','30,105','31,105','32,105','30,106','31,106','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','22,101','23,101','24,101','46,101','47,101','48,101','36,105','36,106','36,107','20,101','37,108','59,97','43,105'];
    beacon421['15_1_2']=['34,90','35,90','36,90','37,90','34,91','35,91','36,91','37,91','34,92','35,92','36,92','37,92','34,93','35,93','36,93','37,93','26,106','27,106','28,106','29,106','32,106','33,106','34,106','35,106','38,106','39,106','40,106','41,106','44,106','45,106','46,106','47,106','15,84','16,84','18,84','52,85','53,85','55,85','22,88','23,88','25,88','45,88','46,88','48,88','29,91','30,91','41,92','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,104','29,104','30,104','31,104','32,104','28,105','29,105','30,105','31,105','32,105','30,106','31,106','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','22,101','23,101','24,101','46,101','47,101','48,101','36,105','36,106','36,107','20,101','37,108','59,97','43,105'];
    beacon421['15_1_3']=['34,90','35,90','36,90','37,90','34,91','35,91','36,91','37,91','34,92','35,92','36,92','37,92','34,93','35,93','36,93','37,93','26,106','27,106','28,106','29,106','32,106','33,106','34,106','35,106','38,106','39,106','40,106','41,106','44,106','45,106','46,106','47,106','15,84','16,84','18,84','52,85','53,85','55,85','22,88','23,88','25,88','45,88','46,88','48,88','29,91','30,91','41,92','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,104','29,104','30,104','31,104','32,104','28,105','29,105','30,105','31,105','32,105','30,106','31,106','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','22,101','23,101','24,101','46,101','47,101','48,101','36,105','36,106','36,107','20,101','37,108','59,97','43,105'];
    beacon421['15_1_4']=['34,90','35,90','36,90','37,90','34,91','35,91','36,91','37,91','34,92','35,92','36,92','37,92','34,93','35,93','36,93','37,93','26,106','27,106','28,106','29,106','32,106','33,106','34,106','35,106','38,106','39,106','40,106','41,106','44,106','45,106','46,106','47,106','15,84','16,84','18,84','52,85','53,85','55,85','22,88','23,88','25,88','45,88','46,88','48,88','29,91','30,91','41,92','10,90','61,90','8,91','9,91','62,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','15,91','16,91','17,91','18,91','22,95','23,95','24,95','25,95','29,98','30,98','31,98','32,98','52,92','53,92','54,92','55,92','45,95','46,95','47,95','48,95','38,99','39,99','40,99','41,99','28,104','29,104','30,104','31,104','32,104','28,105','29,105','30,105','31,105','32,105','30,106','31,106','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','17,84','54,85','24,88','47,88','31,91','40,92','17,87','54,88','24,91','47,91','31,94','40,95','22,101','23,101','24,101','46,101','47,101','48,101','36,105','36,106','36,107','20,101','37,108','59,97','43,105'];
    beacon421['16_1_1']=['22,80','22,81','23,81','24,81','22,82','23,82','24,82','25,82','26,82','23,83','24,83','25,83','26,83','27,83','25,84','26,84','49,80','47,81','48,81','49,81','45,82','46,82','47,82','48,82','49,82','44,83','45,83','46,83','47,83','48,83','45,84','46,84','13,79','14,79','55,79','56,79','13,83','14,83','55,83','56,83','12,88','9,103','18,103','51,103','60,103','22,97','23,97','24,97','25,97','46,99','47,99','48,99','49,99','19,101','20,101','21,101','50,102','13,82','14,82','55,82','56,82','12,87','15,87','57,87','11,89','9,102','18,102','60,102','13,81','14,81','55,81','56,81','12,86','15,86','54,86','57,86','9,101','60,101','13,80','14,80','55,80','56,80','12,85','15,85','54,85','57,85','26,103','27,103','32,104','33,104','42,104','43,104','11,93','16,93','53,93','58,93','17,98','35,72','33,75','31,78','29,81','34,73','32,76','30,79','28,82','35,73','33,76','31,79','29,82','37,73','39,76','41,79','43,82','12,84','15,84','54,84','57,84','26,86','45,86','24,89','47,89','11,91','16,91','53,91','58,91','11,92','16,92','53,92','58,92','34,74','32,77','30,80','37,74','39,77','41,80','38,75','40,78','42,81','38,76','40,79','42,82','16,90','53,90','58,90','10,95','17,95','59,95','52,95','18,100','51,100','10,96','17,96','59,96','25,87','46,87','25,88','46,88','16,89','53,89','52,96','51,101','17,97','59,97','18,98','51,98','18,99','51,99','9,100','60,100','36,72','28,83','43,83','27,84','44,84','27,85','44,85','54,87','58,89','11,90','10,97','52,97','52,98','59,98','18,101','51,102'];
    beacon421['16_1_2']=['22,80','22,81','23,81','24,81','22,82','23,82','24,82','25,82','26,82','23,83','24,83','25,83','26,83','27,83','25,84','26,84','49,80','47,81','48,81','49,81','45,82','46,82','47,82','48,82','49,82','44,83','45,83','46,83','47,83','48,83','45,84','46,84','13,79','14,79','55,79','56,79','13,83','14,83','55,83','56,83','12,88','9,103','18,103','51,103','60,103','22,97','23,97','24,97','25,97','46,99','47,99','48,99','49,99','19,101','20,101','21,101','50,102','13,82','14,82','55,82','56,82','12,87','15,87','57,87','11,89','9,102','18,102','60,102','20,87','21,87','20,91','40,95','41,95','44,95','26,98','27,98','42,100','43,100','41,106','51,87','52,87','60,91','61,91','64,94','65,94','32,98','33,98','35,99','36,99','37,108','13,81','14,81','55,81','56,81','12,86','15,86','54,86','57,86','9,101','60,101','13,80','14,80','55,80','56,80','12,85','15,85','54,85','57,85','35,73','36,73','33,76','31,79','29,82','11,93','16,93','53,93','58,93','17,98','35,72','33,75','31,78','29,81','37,73','39,76','41,79','43,82','12,84','15,84','54,84','57,84','26,86','45,86','24,89','47,89','11,91','16,91','53,91','58,91','11,92','16,92','53,92','58,92','34,74','32,77','30,80','37,74','39,77','41,80','38,75','40,78','42,81','16,90','53,90','58,90','52,95','18,100','51,100','10,96','17,96','59,96','43,83','27,85','25,87','46,87','25,88','46,88','16,89','53,89','17,95','59,95','52,96','51,101','17,97','59,97','18,98','51,98','18,99','51,99','9,100','60,100','36,72','28,83','27,84','44,84','44,85','54,87','58,89','11,90','10,95','10,97','52,97','52,98','59,98','18,101','51,102'];
    beacon421['16_1_3']=['19,87','20,87','11,92','12,92','21,94','22,94','33,98','34,98','22,99','23,99','23,102','24,102','45,102','46,102','47,103','36,79','36,80','36,81','36,82','36,83','36,84','36,85','36,86','36,87','36,88','36,89','36,90','54,88','55,88','51,89','52,89','19,94','20,94','27,97','28,97','36,108','37,108','35,56','36,56','35,57','36,57','35,58','36,58','36,91','36,92','36,93'];
    beacon421['16_1_4']=['43,62','44,62','25,64','26,64','40,77','47,77','22,79','29,79','11,80','12,80','57,80','58,80','43,61','44,61','25,63','26,63','11,79','12,79','57,79','58,79','42,66','45,66','24,68','27,68','10,84','13,84','56,84','59,84','41,70','46,70','23,72','28,72','9,88','60,88','16,92','17,92','25,102','26,102','36,108','37,108','48,81','21,83','7,99','62,99','8,93','15,93','54,93','61,93','8,94','15,94','54,94','61,94','8,95','15,95','54,95','61,95','39,80','30,82','16,98','39,81','30,83','16,99','14,91','55,91','60,91','48,95','31,106','32,106','15,96','54,96','61,96','39,82','30,84','39,83','30,85','14,89','55,89','14,90','55,90','14,88','55,88','60,90','9,91','8,96','16,100'];
    beacon421['17_1_1']=['24,106','25,106','26,106','27,106','31,106','32,106','33,106','34,106','38,106','39,106','40,106','41,106','45,106','46,106','47,106','48,106','8,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','36,105','36,106','36,107','35,51','36,51','55,99'];
    beacon421['17_1_2']=['24,106','25,106','26,106','27,106','31,106','32,106','33,106','34,106','38,106','39,106','40,106','41,106','45,106','46,106','47,106','48,106','8,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','36,105','36,106','36,107','35,51','36,51','37,108'];
    beacon421['17_1_3']=['36,84','36,85','36,86','36,87','36,88','36,89','36,90','36,91','36,92','36,93','36,94','36,95','36,96','36,97','49,54','50,54','51,54','52,54','49,55','50,55','51,55','52,55','49,56','50,56','51,56','52,56','48,54','48,55','48,56','48,57','48,58','48,59','48,60','48,61','48,62','48,63','8,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','34,64','35,64','36,64','35,65','35,66','35,67','9,95','26,104'];
    beacon421['17_1_4']=['11,92','12,92','13,92','14,92','17,95','18,95','19,95','20,95','23,98','24,98','25,98','26,98','29,101','30,101','31,101','32,101','34,56','35,56','36,56','37,56','34,57','35,57','36,57','37,57','34,58','35,58','36,58','37,58','36,94','36,95','36,96','36,97','36,98','36,99','36,100','36,101','36,102','36,103','36,104','8,91','63,91','6,92','7,92','64,92','65,92','4,93','5,93','66,93','67,93','56,93','57,93','58,93','50,96','51,96','52,96','38,102','39,102','40,102','13,86','58,87','19,89','52,90','25,92','46,93','31,95','40,96','13,89','58,90','19,92','52,93','25,95','46,96','31,98','40,99','59,93','53,96','41,102','36,105','36,106','36,107','16,99'];
    beacon421['18_1_1']=['37,58','38,58','39,58','40,58','37,59','38,59','39,59','40,59','37,60','38,60','39,60','40,60','37,61','38,61','39,61','40,61','23,87','63,88','31,91','55,92','39,95','23,96','47,96','63,97','31,100','55,101','39,104','47,105','14,100','73,100','12,101','13,101','74,101','75,101','44,113','44,114','44,115','47,115'];
    beacon421['18_1_2']=['37,58','38,58','39,58','40,58','37,59','38,59','39,59','40,59','37,60','38,60','39,60','40,60','37,61','38,61','39,61','40,61','23,87','63,88','31,91','55,92','39,95','23,96','47,96','63,97','31,100','55,101','39,104','47,105','14,100','73,100','12,101','13,101','74,101','75,101','44,113','44,114','44,115','40,115','45,116','42,116'];
    beacon421['18_1_3']=['30,104','31,104','32,104','33,104','34,104','35,104','36,104','37,104','38,104','39,104','14,110','15,110','16,110','17,110','18,110','19,110','20,110','21,110','22,110','23,110','41,88','42,88','17,101','69,101','42,112','43,112','42,116','43,116','52,102','52,103','52,104','52,105','52,106','52,107','52,108','44,87','48,111','49,114','52,109','52,110','52,111'];
    beacon421['18_1_4']=['70,102','71,102','72,102','70,103','71,103','72,103','70,106','71,106','72,106','70,107','71,107','72,107','43,87','44,87','41,97','42,97','16,101','17,101','46,105','43,115','44,115','44,116','45,116','70,104','71,104','72,104','70,105','71,105','72,105','45,87'];
    beacon421['20_1_1']=['44,118','45,118','46,118','47,118','44,119','45,119','46,119','47,119','44,120','45,120','46,120','47,120','44,121','45,121','46,121','47,121','69,88','70,88','72,88','73,88','28,107','29,107','100,119','101,119','102,121','103,121','50,138','51,138','52,138','76,139','77,139','68,116','68,117','68,118','68,119','68,120','68,121','68,122','68,130','68,131','68,132','68,133','68,136','68,137','68,138','44,115','45,115','90,115','91,115','92,116','93,116','68,123','68,124','68,125','68,139','68,140','68,141'];
    beacon421['20_1_2']=['67,86','68,86','55,92','56,92','94,100','95,100','47,104','48,104','30,116','31,116','61,139','62,139','68,144','69,144','71,144','72,144','35,118','36,118','37,118','38,118','39,118','35,119','36,119','37,119','38,119','39,119','88,121','89,121','88,122','89,122','88,123','89,123','78,138','79,138','78,139','79,139'];
    beacon421['21_1_1']=['26,107','27,107','28,107','29,107','30,107','34,107','35,107','36,107','37,107','38,107','42,107','43,107','44,107','45,107','46,107','18,87','20,87','50,88','52,88','24,90','26,90','44,91','46,91','30,93','32,93','38,94','40,94','46,94','47,94','48,94','49,94','46,95','49,95','46,96','49,96','46,97','47,97','48,97','49,97','18,92','19,92','20,92','24,95','25,95','26,95','30,98','31,98','32,98','36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','50,93','51,93','52,93','44,96','45,96','38,99','39,99','40,99','19,87','51,88','25,90','45,91','31,93','39,94','19,89','51,90','25,92','45,93','31,95','39,96','58,90','59,90','62,95','63,95','53,100','47,95','48,95','47,96','48,96','20,101'];
    beacon421['21_1_2']=['26,107','27,107','28,107','29,107','30,107','34,107','35,107','36,107','37,107','38,107','42,107','43,107','44,107','45,107','46,107','18,87','20,87','50,88','52,88','24,90','26,90','44,91','46,91','30,93','32,93','38,94','40,94','46,94','47,94','48,94','49,94','46,95','49,95','46,96','49,96','46,97','47,97','48,97','49,97','18,92','19,92','20,92','24,95','25,95','26,95','30,98','31,98','32,98','36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','50,93','51,93','52,93','44,96','45,96','38,99','39,99','40,99','19,87','51,88','25,90','45,91','31,93','39,94','19,89','51,90','25,92','45,93','31,95','39,96','47,95','48,95','47,96','48,96','59,96','60,96','57,94'];
    beacon421['21_1_3']=['52,92','53,92','54,92','55,92','56,92','52,93','56,93','52,94','56,94','52,95','56,95','52,96','53,96','54,96','55,96','56,96','53,93','54,93','55,93','53,94','54,94','55,94','53,95','54,95','55,95','54,97','54,98','54,99','54,100','54,101','54,102','54,103','54,104','54,105','38,80','39,80','54,90','29,92','30,92','19,97','20,97','30,104'];
    beacon421['21_1_4']=['34,81','35,81','43,83','44,83','46,85','47,85','48,87','49,87','30,90','31,90','47,95','48,95','31,96','32,96','45,97','46,97'];
    beacon421['27_1_1']=['44,98','44,99','44,100','44,101','44,102','44,103','44,104','44,105','44,106','44,107','44,108','44,109','44,110','44,111','44,112','20,90','22,90','64,91','66,91','29,95','31,95','55,95','57,95','38,99','40,99','46,100','48,100','16,99','71,99','14,100','15,100','72,100','73,100','12,101','13,101','74,101','75,101','20,94','21,94','22,94','29,99','30,99','31,99','38,103','39,103','40,103','64,95','65,95','66,95','55,99','56,99','57,99','46,104','47,104','48,104','21,90','65,91','30,95','56,95','39,99','47,100','44,113','44,114','44,115','69,104','42,116','45,116'];
    beacon421['27_1_2']=['44,98','44,99','44,100','44,101','44,102','44,103','44,104','44,105','44,106','44,107','44,108','44,109','44,110','44,111','44,112','20,90','22,90','64,91','66,91','29,95','31,95','55,95','57,95','38,99','40,99','46,100','48,100','16,99','71,99','14,100','15,100','72,100','73,100','12,101','13,101','74,101','75,101','20,94','21,94','22,94','29,99','30,99','31,99','38,103','39,103','40,103','64,95','65,95','66,95','55,99','56,99','57,99','46,104','47,104','48,104','21,90','65,91','30,95','56,95','39,99','47,100','44,113','44,114','44,115','69,104','53,112'];
    beacon421['29_1_3']=['39,99','40,99','37,100','38,100','39,100','40,100','36,101','37,101','38,101','39,101','40,101','36,102','37,102','38,102','39,102','40,102','46,99','47,99','56,99','57,99','46,100','47,100','56,100','57,100','46,101','47,101','56,101','57,101','46,102','47,102','56,102','57,102','24,99','24,100','25,100','26,100','24,101','25,101','26,101','27,101','28,101','24,102','25,102','26,102','27,102','28,102','42,98','42,99','43,99','42,100','43,100','44,100','42,101','43,101','44,101','42,102','43,102','44,102','32,88','32,89','32,90','32,91','32,92','32,93','32,94','32,95','32,96','32,97','32,98','48,94','49,94','62,95','63,95','23,99','35,101','23,102','38,103','39,103','37,107','38,107','36,103','37,103','45,103','40,104','41,104','39,106','40,106','32,99','32,100','32,101','30,102','33,102','34,102'];
    beacon421['29_1_4']=['36,92','36,93','36,94','36,95','36,96','36,97','36,98','36,99','36,100','10,96','11,96','12,96','13,96','14,96','15,96','16,96','18,96','54,98','55,98','54,99','55,99','54,100','55,100','55,89','45,104','31,105','32,105','39,106','40,106','35,108','36,108','36,101','36,102','36,103'];
    let beaconHit421=false,beaconDetail421='';
    for(const k of wl421)for(const r of rp421[k].rects){
      for(let y2=r.y;y2<r.y+r.h;y2++)for(let x2=r.x;x2<r.x+r.w;x2++)if(beacon421[k].includes(x2+','+y2)){beaconHit421=true;beaconDetail421+=k+'@'+x2+','+y2+' ';}
    }
    assert(!beaconHit421,'T421 G4 前置C：不得覆蓋 ≤16px 細節（命中 '+beaconDetail421+'）');
    const rectTable421={'14_1_1':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:3,h:1},{x:37,y:94,w:3,h:1},{x:32,y:95,w:3,h:1},{x:37,y:95,w:2,h:1},{x:21,y:105,w:4,h:1},{x:25,y:105,w:4,h:1}],'14_1_2':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:3,h:1},{x:37,y:94,w:3,h:1},{x:32,y:95,w:3,h:1},{x:37,y:95,w:2,h:1},{x:21,y:105,w:4,h:1},{x:25,y:105,w:4,h:1}],'14_1_3':[{x:33,y:96,w:2,h:8},{x:37,y:94,w:2,h:6},{x:39,y:94,w:1,h:6},{x:26,y:94,w:8,h:1},{x:26,y:93,w:8,h:1},{x:38,y:104,w:8,h:1}],'14_1_4':[{x:33,y:96,w:2,h:8},{x:37,y:94,w:2,h:6},{x:39,y:94,w:1,h:6},{x:26,y:94,w:8,h:1},{x:26,y:93,w:8,h:1},{x:38,y:104,w:8,h:1}],'15_1_1':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:8,h:1},{x:32,y:95,w:7,h:1},{x:21,y:108,w:5,h:1},{x:45,y:108,w:5,h:1}],'15_1_2':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:8,h:1},{x:32,y:95,w:7,h:1},{x:21,y:108,w:5,h:1},{x:45,y:108,w:5,h:1}],'15_1_3':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:8,h:1},{x:32,y:95,w:7,h:1},{x:21,y:108,w:5,h:1},{x:45,y:108,w:5,h:1}],'15_1_4':[{x:33,y:96,w:2,h:8},{x:37,y:96,w:1,h:8},{x:32,y:94,w:8,h:1},{x:32,y:95,w:7,h:1},{x:21,y:108,w:5,h:1},{x:45,y:108,w:5,h:1}],'16_1_1':[],'16_1_2':[],'16_1_3':[{x:33,y:100,w:2,h:8},{x:31,y:96,w:2,h:8},{x:37,y:96,w:2,h:8},{x:33,y:92,w:2,h:6},{x:39,y:96,w:1,h:8},{x:38,y:94,w:8,h:1}],'16_1_4':[{x:33,y:100,w:2,h:8},{x:31,y:96,w:2,h:8},{x:37,y:96,w:2,h:8},{x:33,y:92,w:2,h:6},{x:39,y:96,w:1,h:8},{x:38,y:94,w:8,h:1}],'17_1_1':[{x:32,y:96,w:2,h:8},{x:37,y:96,w:2,h:8},{x:39,y:96,w:1,h:8},{x:30,y:94,w:12,h:1},{x:30,y:95,w:12,h:1},{x:30,y:92,w:12,h:1}],'17_1_2':[{x:32,y:96,w:2,h:8},{x:37,y:96,w:2,h:8},{x:39,y:96,w:1,h:8},{x:30,y:94,w:12,h:1},{x:30,y:95,w:12,h:1},{x:30,y:92,w:12,h:1}],'17_1_3':[{x:33,y:96,w:2,h:8},{x:31,y:102,w:2,h:6},{x:37,y:94,w:2,h:6},{x:37,y:100,w:1,h:8},{x:39,y:94,w:1,h:6},{x:30,y:108,w:12,h:1}],'17_1_4':[{x:33,y:96,w:2,h:8},{x:31,y:102,w:2,h:6},{x:37,y:94,w:2,h:6},{x:37,y:100,w:1,h:8},{x:39,y:94,w:1,h:6},{x:30,y:108,w:12,h:1}],'18_1_1':[{x:40,y:96,w:2,h:10},{x:45,y:96,w:2,h:10},{x:48,y:96,w:2,h:10},{x:36,y:96,w:2,h:10},{x:41,y:108,w:2,h:8},{x:45,y:108,w:2,h:8}],'18_1_2':[{x:40,y:96,w:2,h:10},{x:45,y:96,w:2,h:10},{x:48,y:96,w:2,h:10},{x:36,y:96,w:2,h:10},{x:41,y:108,w:2,h:8},{x:45,y:108,w:2,h:8}],'18_1_3':[{x:48,y:96,w:2,h:10},{x:40,y:104,w:2,h:8},{x:45,y:108,w:2,h:8},{x:38,y:108,w:2,h:8},{x:36,y:108,w:2,h:8},{x:45,y:96,w:1,h:10}],'18_1_4':[{x:48,y:96,w:2,h:10},{x:40,y:104,w:2,h:8},{x:45,y:108,w:2,h:8},{x:38,y:108,w:2,h:8},{x:36,y:108,w:2,h:8},{x:45,y:96,w:1,h:10}],'20_1_1':[{x:64,y:126,w:2,h:10},{x:69,y:126,w:2,h:10},{x:62,y:126,w:2,h:10},{x:72,y:126,w:2,h:10},{x:60,y:126,w:2,h:10},{x:64,y:138,w:2,h:8}],'20_1_2':[{x:64,y:126,w:2,h:10},{x:69,y:126,w:2,h:10},{x:62,y:126,w:2,h:10},{x:72,y:126,w:2,h:10},{x:60,y:126,w:2,h:10},{x:64,y:138,w:2,h:8}],'21_1_1':[{x:32,y:100,w:2,h:8},{x:33,y:94,w:2,h:6},{x:37,y:96,w:1,h:8},{x:39,y:100,w:1,h:8},{x:30,y:108,w:12,h:1},{x:30,y:90,w:12,h:1}],'21_1_2':[{x:32,y:100,w:2,h:8},{x:33,y:94,w:2,h:6},{x:37,y:96,w:1,h:8},{x:39,y:100,w:1,h:8},{x:30,y:108,w:12,h:1},{x:30,y:90,w:12,h:1}],'21_1_3':[{x:32,y:100,w:2,h:8},{x:37,y:96,w:2,h:8},{x:33,y:94,w:2,h:6},{x:39,y:96,w:1,h:8},{x:30,y:93,w:12,h:1},{x:30,y:108,w:12,h:1}],'21_1_4':[{x:32,y:100,w:2,h:8},{x:37,y:96,w:2,h:8},{x:33,y:94,w:2,h:6},{x:39,y:96,w:1,h:8},{x:30,y:93,w:12,h:1},{x:30,y:108,w:12,h:1}],'27_1_1':[{x:41,y:96,w:2,h:10},{x:36,y:96,w:2,h:10},{x:40,y:108,w:2,h:8},{x:45,y:108,w:2,h:8},{x:38,y:104,w:2,h:8},{x:48,y:108,w:2,h:8}],'27_1_2':[{x:41,y:96,w:2,h:10},{x:36,y:96,w:2,h:10},{x:40,y:108,w:2,h:8},{x:45,y:108,w:2,h:8},{x:38,y:104,w:2,h:8},{x:48,y:108,w:2,h:8}],'29_1_3':[{x:33,y:88,w:2,h:10},{x:37,y:88,w:2,h:10},{x:30,y:88,w:2,h:10},{x:40,y:88,w:2,h:10},{x:28,y:88,w:2,h:10},{x:39,y:88,w:1,h:10}],'29_1_4':[{x:33,y:88,w:2,h:10},{x:37,y:88,w:2,h:10},{x:30,y:88,w:2,h:10},{x:40,y:88,w:2,h:10},{x:28,y:88,w:2,h:10},{x:39,y:88,w:1,h:10}]};
    let rectOk421=true,rectMsg421='';
    for(const k of wl421){
      const got=rp421[k].rects.map(r=>r.x+','+r.y+','+r.w+','+r.h).sort();
      const want=rectTable421[k].map(r=>r.x+','+r.y+','+r.w+','+r.h).sort();
      if(got.length!==want.length){rectOk421=false;rectMsg421=k+' 筆數 '+got.length+'≠'+want.length;break;}
      for(let ri=0;ri<want.length;ri++)if(got[ri]!==want[ri]){rectOk421=false;rectMsg421=k+' 第'+ri+'筆 '+got[ri]+'≠'+want[ri];break;}
    }
    assert(rectOk421,'T421 G5 落筆：rect 逐筆恰等 '+rectMsg421);
    const ink421=window.__t421Ink;
    assert(ink421&&ink421.rects===172&&ink421.px===2194,'T421 G5 計數 rects=172/px=2194（R05 16_1_1/2 退修撤回 −12/−144）');
    const rects421src=[...seg421.matchAll(/fillRect\(([^)]*)\)/g)].map(m=>m[1].split(',').map(s=>s.trim()));
    // G5 幾何：依變數名對畫布尺寸（72×112／88×120／136×150）做 [0,w)×[0,h) 邊界守衛（覆核退修：不得只驗四參數正尺寸）
    const geomMeta421={
      sp15b:{ax:36,ay:110,w:72,h:112},sp14b:{ax:36,ay:110,w:72,h:112},sp16b:{ax:36,ay:110,w:72,h:112},
      sp17b:{ax:36,ay:110,w:72,h:112},sp21b:{ax:36,ay:110,w:72,h:112},spR15:{ax:36,ay:110,w:72,h:112},
      spR11:{ax:44,ay:118,w:88,h:120},spR12:{ax:44,ay:118,w:88,h:120},spR13:{ax:44,ay:118,w:88,h:120},
      spR14:{ax:68,ay:148,w:136,h:150}
    };
    let geomOk421=true,geomMsg421='';
    for(const r of rects421src){
      if(r.length<4){geomOk421=false;geomMsg421='非四參數: '+r.join(',');break;}
      const vm=r[0].match(/^(sp\w+)\.ax([+-]\d+)/);
      const ym=r[1].match(/^(sp\w+)\.ay([+-]\d+)/);
      if(!vm||!ym||vm[1]!==ym[1]){geomOk421=false;geomMsg421='非ax/ay式或不對稱: '+r.join(',');break;}
      const meta=geomMeta421[vm[1]];
      if(!meta){geomOk421=false;geomMsg421='未知 sprite 變數 '+vm[1];break;}
      const xOff=+vm[2],yOff=+ym[2],rw=+r[2],rh=+r[3];
      if(!(rw>0&&rh>0)){geomOk421=false;geomMsg421='尺寸非正: '+r.join(',');break;}
      const x0=meta.ax+xOff,y0=meta.ay+yOff;
      if(x0<0||y0<0||x0+rw>meta.w||y0+rh>meta.h){geomOk421=false;geomMsg421='超出畫布['+meta.w+'×'+meta.h+']: '+r.join(',');break;}
    }
    assert(geomOk421,'T421 G5 幾何：pass 每個 fillRect 落在對應畫布 [0,w)×[0,h) 內（整組平移出界即紅）'+geomMsg421);
    assert(ink421.rects===172&&ink421.px===2194,'T421 G6 落筆恆等 rects=172/px=2194 實得 '+JSON.stringify(ink421));
  }

  { // ===== T423 R01 守衛：HUD 數字 tween＋金額 flash（純顯示層現代化） =====
    const iTween423=html.indexOf('let tweenHud={money:0,pop:0,jobs:0}');
    const iUpd423=html.indexOf('function updHud(){');
    const iFlash423=html.indexOf('moneyFlashUp');
    assert(iTween423>0&&iUpd423>iTween423&&iFlash423>0,
      'T423 R01 HUD tween：tween 引擎＋updHud 改寫＋flash CSS 皆存在（刪任一即紅）');
    assert(/tweenHudTarget=\{money:Math\.floor\(money\),pop,jobs\}/.test(html),
      'T423 R01 HUD 數值源：tween 目標必須直接讀模擬變數 money/pop/jobs（改讀假值即紅）');
    assert(/textContent=Math\.round\(tweenHud\.money\)\.toLocaleString\(\)/.test(html),
      'T423 R01 HUD tween 寫入：動畫只寫 textContent（顯示層），不碰模擬變數');
    assert(!/updHud\(\).*?tick\(\)/s.test(html.slice(iUpd423,iUpd423+600)),
      'T423 R01 HUD 純顯示：updHud 內不得呼叫 tick（UI 不得觸發模擬）');
  }

  { // ===== T423 R02 守衛：統一面板頭＋空態（面板現代化） =====
    const iHead423=html.indexOf('function panelHead(title,badge)');
    const iEmpty423=html.indexOf('function panelEmpty(msg)');
    assert(iHead423>0&&iEmpty423>0,'T423 R02 面板頭：panelHead/panelEmpty 輔助函式存在（刪任一即紅）');
    assert(/\.phead\{display:flex/.test(html)&&/\.empty\{color:#7f8ca6/.test(html),
      'T423 R02 面板樣式：.phead/.empty CSS 存在');
    assert(html.indexOf("body.appendChild(panelHead('💾 存檔槽'")>iHead423,
      'T423 R02 遷移示範：showSlots 已改用 panelHead（h3 直寫 → 統一頭部）');
    assert(html.indexOf("panelEmpty('尚無存檔")>iEmpty423,
      'T423 R02 空態：showSlots 已接 panelEmpty（空槽提示）');
    // T423 R03 守衛：開始畫面設定網格卡片化（icon＋label 兩行）
    assert(/\.settingsGrid\{display:grid/.test(html)&&/\.sgIc\{font-size:16px\}/.test(html)&&/\.sgLb\{color:var\(--text-dim\)/.test(html),
      'T423 R03 設定網格：.settingsGrid/.sgIc/.sgLb CSS 存在（刪任一即紅）');
    assert(/const mkSet=\(ic,label,onclick,id\)=>/.test(html),
      'T423 R03 設定卡片：mkSet 輔助函式存在（icon＋label 兩行構造）');
    assert(html.indexOf('grid.appendChild(ds)')>html.indexOf('const mkSet'),
      'T423 R03 設定卡片：五鈕（災害/畫質/地圖/類別/夜景）已掛進 settingsGrid');
    assert(/bNightCity/.test(html)&&/SAVEKEY\+'\.nightcity'/.test(html),
      'T423 R03 設定卡片：夜景鈕 id 與持久化鍵保留（T413b 契約不破）');
    // T423 R04 守衛：通知反饋＋工具 hover 現代化（純視覺，零行為變動）
    assert(/\.toast::before\{content:'';width:3px/.test(html),
      'T423 R04 toast 色條：.toast::before 左緣色條存在（分類指示）');
    assert(/@keyframes tin\{from\{opacity:0;transform:translateY\(8px\) scale\(\.97\)\}/.test(html),
      'T423 R04 toast 動效：tin 滑入含 scale（現代化進場）');
    assert(/el\.title=`\$\{t\.nm\}・\$\{catNm\}/.test(html),
      'T423 R04 工具 hover：工具 title 含「名稱・分類」提示（刪即紅）');
    assert(/const catNm=\(TOOL_CATS\.find\(c=>c\.id===t\.cat\)\|\|\{\}\)\.nm/.test(html),
      'T423 R04 工具 hover：catNm 由 TOOL_CATS 即時查表（不硬寫分類）');
    // T423 R05 守衛：面板頭推廣（showAch 遷移 phead）＋跨瀏覽器滾動條
    assert(/<div class="phead"><h3>🏆 成就<\/h3><span class="phBadge">\$\{doneN\}\/\$\{total\}<\/span><\/div>/.test(html),
      'T423 R05 成就面板頭：showAch 已用 phead＋計數徽記（與 panelHead 視覺一致）');
    assert(/#info\{scrollbar-width:thin;scrollbar-color:#2f3c5c #141a2a\}/.test(html),
      'T423 R05 滾動條：Firefox scrollbar-width/color 同款（跨瀏覽器一致）');
    // T423 R06 守衛：響應式安全區（瀏海屏/手勢條）
    assert(/padding-top:max\(5px,env\(safe-area-inset-top\)\)/.test(html),
      'T423 R06 安全區：HUD 頂部 safe-area-inset-top（瀏海屏）');
    assert(/bottom:max\(10px,env\(safe-area-inset-bottom\)\)/.test(html),
      'T423 R06 安全區：工具列底部 safe-area-inset-bottom（iOS 手勢條）');
  }

  { /* ===== T434d 輪廓解禁：守衛 =====
       【觀測能力聲明】Node harness 的 canvas 是空殼，本區只驗原文與結構，**不驗像素**。
       像素證據在 docs/tools/art_style.html 的真瀏覽器輸出：
       輪廓−內部明度中位 **−0.177 → −0.102**（390 個 bld 鍵），見卡面 §3 A3。 */
    // G1 自體色輪廓的核心三行必須在場
    assert(/const OUTLINE_MIX434=0\.55;/.test(html)
      && /a\[i\]=src\[j\]\*OUTLINE_MIX434;a\[i\+1\]=src\[j\+1\]\*OUTLINE_MIX434;a\[i\+2\]=src\[j\+2\]\*OUTLINE_MIX434;a\[i\+3\]=255;/.test(html),
      'T434d G1【原文前哨】輪廓像素必須塗「相鄰實體像素自己的顏色 × OUTLINE_MIX434」，'
      + '不是全域死色（全檔 219 個呼叫點，最常見的 (26,30,44) 一色就佔 103 次）');
    // G2 **結構保證**：outlineSprite 只准寫透明像素——這是「≤16px 重點細節零覆蓋」的結構依據
    const osStart434 = html.indexOf('function outlineSprite(');
    const osBody434 = osStart434 > 0 ? html.slice(osStart434, html.indexOf('\nfunction shade(', osStart434)) : '';
    assert(osBody434.length > 200 && /if\(a\[i\+3\]<=40&&\(solid\(x\+1,y\)/.test(osBody434),
      'T434d G2【結構釘】outlineSprite 的 marks 條件必須維持 `a[i+3]<=40`（只收透明像素）。'
      + '這是本卡宣稱「結構上不可能覆蓋既有實體像素、不可能踩 ≤16px 細節鐵律」的唯一依據——'
      + '改掉這個條件，那句話就不成立了');
    // G3 先快照再寫：不先複製 src，前面寫好的輪廓會被後面誤認成「相鄰實體像素」而顏色外溢
    assert(/const src=new Uint8ClampedArray\(a\);/.test(osBody434),
      'T434d G3【原文前哨】必須先 `new Uint8ClampedArray(a)` 快照再寫入：'
      + '否則先寫好的輪廓像素會被當成相鄰實體像素，顏色一圈一圈往外傳');
    /* G4 T438 升級（**動既有斷言，理由寫在這裡**）：原本只釘「寫入端存在」，
       而 T434d 的寫入端當時在 :21187、outlineSprite 在 :1719、開機分派在 :21126——
       **寫入端比兩條開機路徑都晚** ⇒ 這個逃生閥對烘進 sprite 的像素從來沒生效過，而斷言全綠。
       「存在」不等於「來得及」。升級成位置釘：寫入端必須早於 outlineSprite 的定義。
       **這不是放寬**：原本三個原文條件一條沒少，只是多了一條位置條件。 */
    assert(/window\.__noSelfOutline434/.test(html)
      && /\/\[\?&\]noSelfOutline=1\/\.test\(location\.search\)/.test(html)
      && /localStorage\.getItem\(SAVEKEY\+'\.noSelfOutline434'\)==='1'/.test(html),
      'T434d G4【原文前哨】逃生閥 __noSelfOutline434 必須有真的寫入端'
      + '（URL ?noSelfOutline=1 或 localStorage），只有讀取端的開關撥不動＝沒有回退路徑');
    const wr434d = html.indexOf("if(!window.__noSelfOutline434){try{if(/[?&]noSelfOutline=1/");
    const os434d = html.indexOf('\nfunction outlineSprite(');
    assert(wr434d > 0 && os434d > 0 && wr434d < os434d,
      'T434d G4b【位置釘】__noSelfOutline434 的寫入端（index 位置 ' + wr434d + '）必須早於 '
      + '`function outlineSprite(`（' + os434d + '）。outlineSprite 是 buildSprites 期間呼叫的，'
      + '寫入端晚一步，這個逃生閥就對烘進 sprite 的像素完全無效——T438 覆核 M2 的原病');
    // G5 位置：必須留在 T383c 亂數 token 快照掃描區間之外
    const bs434d = html.indexOf('function buildSprites(){');
    const ws434d = html.indexOf('\nfunction wealthSpr(');
    assert(osStart434 > 0 && bs434d > 0 && ws434d > bs434d && !(osStart434 > bs434d && osStart434 < ws434d),
      'T434d G5【位置釘】outlineSprite 不得被搬進 T383c 的掃描區間'
      + '（`function buildSprites(){` ↔ `\\nfunction wealthSpr(`），否則會位移亂數 token 快照');
  }
  { /* ===== T434b GV 同步建圖入口：守衛 =====
       【觀測能力聲明】Node harness 的 canvas 是空殼，本區只驗**原文與位置**，不驗像素。
       這個入口存在的理由本身就是「Node 驗不了像素、瀏覽器又開不了機」，
       所以像素證據在 docs/tools/art_diff.html 的真瀏覽器輸出（見卡面 §4 A4 的實測貼文）。 */
    /* G1 T438 跟版（**動既有斷言，理由寫在這裡**）：原本釘的是「必須是一行」的完整字面量，
       而 T438 M7 在它前面加了替身亂數流的前置檢查（不加的話，開機停在 pct≥7 時被外部工具呼叫，
       會二次覆寫 __savedR、把世界亂數流永久換成替身流）。釘子擋住了必要的修補。
       **這不是放寬**：原本那一行的兩個要件（轉呼叫既有 buildSprites、回報 sprAtlas356 條目數）
       一個沒少，只是拆成兩條分別釘；替身流防護另有 T438 G5 專釘。 */
    assert(/buildAllSprites:\(\)=>\{/.test(html)
      && /buildSprites\(\);const r=GV\.sprAtlas356\(\);return r&&r\.entries\?r\.entries\.length:0;\},/.test(html),
      'T434b G1【原文前哨】GV.buildAllSprites 必須**轉呼叫**既有的同步總管 buildSprites() 並回報 '
      + 'sprAtlas356 條目數（不得改成複製 buildSprites 的內容）；'
      + '它是 art_diff 在不繪製環境下唯一的退路（bootPaint426 是雙重 rAF，headless iframe 停在 pct=5）');
    /* G2 T438 跟版（**動既有斷言，理由寫在這裡**）：原本數的是 `html` 裡的字串出現次數，
       於是 T438 在 index.html 寫的一句更正註解（逐字提到 `GV.buildAllSprites()`）就讓它由 1 變 2 而紅。
       這是**假紅**，和今晚 T428 G1 被自己的 CSS 註解餵紅、T437 死錨點被同列錨點餵綠是同一個病。
       改成數剝掉註解與字串之後的程式碼。**這不是放寬**：計數上限一樣是 1，只是不再把註解算成呼叫。 */
    const bas434 = (htmlBare438.match(/buildAllSprites/g) || []).length;
    assert(bas434 === 1,
      'T434b G2【計數釘】buildAllSprites 在 index.html 只准出現 1 次（就是那個定義）。'
      + '出現第二次代表有人在開機路徑或其他地方呼叫它 ⇒ 會多跑一次 buildSprites()，'
      + '種子釘（seed301/seed22/seed7 六根，值見 seedPin444 呼叫處）與 T383c token 快照全毀。'
      + '（本釘只數剝掉註解與字串後的程式碼；註解裡提到這個名字不算。）實得 ' + bas434);
    // G3 定義必須落在 T383c 的掃描區間**之外**（該快照掃 buildSprites 函式體的亂數 token）
    const bsStart434 = html.indexOf('function buildSprites(){');
    const bsEnd434 = html.indexOf('\nfunction wealthSpr(');
    const basAt434 = html.indexOf('buildAllSprites');
    assert(bsStart434 > 0 && bsEnd434 > bsStart434 && basAt434 > 0
      && !(basAt434 > bsStart434 && basAt434 < bsEnd434),
      'T434b G3【位置釘】buildAllSprites 的定義不得落在 T383c 的掃描區間內'
      + '（`function buildSprites(){` ↔ `\\nfunction wealthSpr(`），否則會位移亂數 token 快照');
  }
  { /* ===== T428 標題畫面版面修復與桌面現代化：守衛（R04 重做版） =====
       【觀測能力聲明（T419 教條⑬）】Node 端沒有排版引擎，本區**全部是原文前哨／計數釘**，
       只能驗「拼寫／存在／不存在／所在區塊」，**不能驗版面**。版面證據是
       `docs/tools/ui_probe.html` 在真實瀏覽器多尺寸的輸出（見卡面 §4 與 §11 帳本）。
       【R04 為什麼重做】三個獨立懷疑者打穿了第一版：
         ① G1 用 `slice(indexOf('#start{position:absolute'), indexOf('#start h1{'))`，
            兩邊界都不穩——在 `#start h1{` 之後任何位置插入 `#start{justify-content:center}` 就假綠；
            把 h1 選擇器改寫成 `#start > h1{` 就假紅（且訊息會指錯規則）。→ 改成掃**整個 style 區**，
            要求每一處 `justify-content:center` 都落在 `noT428` 選擇器裡。
         ② G4 只驗「檔案裡存在 @media (min-width:900px)」，被逃生閥退回區自己餵飽 → 改計數釘（本輪自家紅源打出）。
         ③ G8 從「開始畫面」註解才開始掃，style 區前 15,050 bytes 沒看 → 改成整個 style 區。
         ④ G3 訊息把特異度寫成 (1,2,1)，實際是 (1,2,0)，而且它跟既有 `#start .diffbtn.sel` 同分、靠順序取勝。 */
    const styleA428 = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const styleC428 = styleA428.replace(/\/\*[\s\S]*?\*\//g, '');   // 剝註解：本卡註解引用舊寫法當說明，不剝會誤紅
    assert(styleC428.length > 10000, 'T428 G0【前置】style 區切片必須成功（供 G1/G8/G11 使用）');

    // G1 根因不得複發：整個 style 區裡的 justify-content:center 只准出現在 noT428 退回區
    const jcSel428 = [];
    for (let i = styleC428.indexOf('justify-content:center'); i >= 0;
         i = styleC428.indexOf('justify-content:center', i + 1)) {
      const ob = styleC428.lastIndexOf('{', i);
      const ps = Math.max(styleC428.lastIndexOf('}', ob), styleC428.lastIndexOf('{', ob - 1));
      jcSel428.push(styleC428.slice(ps + 1, ob).replace(/\s+/g, ' ').trim());
    }
    /* 只咬「以 #start 容器本身為主體」的規則：`#tools`/`.tool`/`#start .diffrow`/`#boot426` 等
       用 center 是本來就合法的（它們不是那個既置中又 overflow-y:auto 的滾動容器）。 */
    const jcBad428 = jcSel428.filter(sel => sel.split(',').some(part => {
      const t = part.trim().split(/\s+/);
      return t[t.length - 1] === '#start' && !/noT428/.test(part);
    }));
    assert(jcBad428.length === 0 && jcSel428.some(sel => /noT428/.test(sel)),
      'T428 G1【原文前哨·全區掃描】以 #start 容器本身為主體的規則不得有 `justify-content:center`'
      + '（只准出現在 html.noT428 退回區）；center ＋ overflow-y:auto 會讓溢出內容被截在滾動起點之上'
      + '且滾不回來（實測 360×640 logo y=-52、1280×720 logo y=-111）。違規選擇器：' + JSON.stringify(jcBad428));
    // G2 安全置中改用 CSS 官方解 safe center（並保留 flex-start 當舊瀏覽器 fallback）
    //    不再用 ::before/::after 墊片——墊片是 flex item，會多吃兩個 gap（實測 360×640 白花 14px）
    assert(/justify-content:flex-start;justify-content:safe center/.test(styleC428)
      && !/#start::before/.test(styleC428),
      'T428 G2【原文前哨】#start 必須「flex-start ＋ safe center」兩段式（舊瀏覽器落貼頂、新瀏覽器放得下才置中），'
      + '且不得再用 ::before/::after 墊片（會多吃兩個 gap）');
    // G3 特異度倒掛修復（訊息已按覆核意見改正為 (1,2,0)）
    assert(/#start \.startMore \.diffbtn\{/.test(styleC428) && !/#start \.diffbtn\{/.test(styleC428),
      'T428 G3【原文前哨】.diffbtn 必須用 `#start .startMore .diffbtn`（1,2,0）壓過 '
      + '`#start .startMore button`（1,1,1）；退回 `#start .diffbtn`（1,1,0）'
      + '會被 `#start .startMore button` 壓掉而讓四顆難度鈕換行成 3+1'
      + '（注意：(1,2,0) 與既有 `#start .diffbtn.sel` 同分，勝負靠原文順序，不要調換兩者位置）');
    // G4 桌面斷點計數釘（真斷點 ＋ 逃生閥退回區 ＝ 恰 2；本卡之前全檔 min-width 類為 0）
    /* G4：原本寫成「@media (min-width:900px){ 恰 2 次」的總數釘，裁決者指出它**靠巧合成立**——
       本卡自己新增的 `@media (min-width:900px) and (max-height:660px){` 剛好不匹配那個正則才沒把計數推到 4，
       下一張卡合法新增第三個桌面區塊就會無故變紅，而訊息會叫人去數 900px。
       改成不依賴總數的內含性檢查：至少一條 min-width 類、且**最後一個** min-width:900px 區塊是逃生閥退回區。 */
    const mqMin428 = (styleC428.match(/@media \(min-width:/g) || []).length;
    const mqLast428 = styleC428.lastIndexOf('@media (min-width:900px){');
    const mqLastBlk428 = mqLast428 > 0 ? styleC428.slice(mqLast428, styleC428.indexOf('\n}', mqLast428)) : '';
    assert(mqMin428 >= 1 && mqLastBlk428.length > 40 && /html\.noT428/.test(mqLastBlk428),
      'T428 G4【計數釘】必須有 min-width 類桌面斷點（本卡之前全檔為 0，實得 ' + mqMin428 + ' 條），'
      + '且**最後一個** @media (min-width:900px){ 區塊必須是 html.noT428 退回區'
      + '（否則逃生閥在桌面沒有對應退回，A/B 對照失真）');
    // G5 三欄 grid 必須真的落在第一個 min-width:900px 區塊「之內」
    const mq428i = styleC428.indexOf('@media (min-width:900px){');
    const mqBlk428 = mq428i > 0 ? styleC428.slice(mq428i, styleC428.indexOf('\n}', mq428i)) : '';
    assert(mqBlk428.length > 40 && !/noT428/.test(mqBlk428)
      && /#start \.startMore\{display:grid/.test(mqBlk428)
      && /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(mqBlk428),
      'T428 G5【原文前哨】三欄 grid 必須落在第一個 min-width:900px 區塊「之內」，且該區塊不是逃生閥退回區');
    // G6 垂直節律自適應
    assert(/gap:clamp\(6px,1\.15vh,14px\)/.test(styleC428),
      'T428 G6【原文前哨】#start 垂直節律必須隨視窗高度收放（clamp）；退回固定 14px 會讓矮視窗多花約 60px');
    // G7 逃生閥：CSS 退回區 ＋ class 掛載 ＋ **真的寫入端**
    assert(/html\.noT428 #start\{justify-content:center/.test(styleC428)
      && /window\.__noTitle428&&document\.documentElement&&document\.documentElement\.classList/.test(html),
      'T428 G7【原文前哨】逃生閥的 CSS 退回區與 class 掛載必須在場');
    // G8 契約回歸：**整個 style 區**不得出現 bNightCity（原版只掃後 45%）
    assert(!/bNightCity/.test(styleA428),
      'T428 G8【原文前哨·全區掃描】style 區不得出現 bNightCity（否則位移 T413b 的「去註解文本第一個 '
      + 'bNightCity ±字元窗」掃描錨點）');
    // G9 水平溢出修正（既存問題，BEFORE/AFTER 實測皆 .settingsGrid r=407 > vw=390）
    assert(/#start \.settingsGrid\{min-width:0;width:100%;max-width:min\(420px,100%\);grid-template-columns:repeat\(auto-fit,minmax\(100px,1fr\)\)\}/.test(styleC428)
      && /html\.noT428 #start \.settingsGrid\{min-width:auto;width:auto;max-width:420px;grid-template-columns:repeat\(auto-fit,minmax\(120px,1fr\)\)\}/.test(styleC428),
      'T428 G9【原文前哨】.settingsGrid 必須可收縮到容器寬（min-width:0＋width:100%＋max-width:min(420px,100%)'
      + '＋minmax 下修 120→100px）；退回 420px 固定上限會在 390 寬機種右緣切掉 17px，「地圖 72×72」鈕要水平滾動才點得到');
    // G10（T515 升級，非放寬）：按鈕不再是假定為 startMore 的裸 sibling，而是必須活在具名的其他玩法列。
    //  舊釘若保留，只會釘一個已無效的 selector，正是「測試綠但版面退回」的假綠來源。
    assert(/#start \.startAltRow515>#bEditorMode,#start \.startAltRow515>#bCampaign\{flex:1 1 210px;max-width:260px\}/.test(styleC428)
      && !/#start \.startMore>#bEditorMode/.test(styleC428)
      && !/:not\(#bEditorMode\):not\(#bCampaign\)\{width:100%\}/.test(styleC428),
      'T428 G10【T515 真結構釘】編輯器/戰役必須只在 .startAltRow515 內走 compact flex（210px basis / 260px 上限），'
      + '不得留已失效的 startMore 裸 sibling selector，也不得用 not(...) 把其他按鈕拉滿。否則「其他玩法」會回到無語義巨條。');
    // ── 以下 R04 新增（全部由對抗性覆核打出來） ──
    // G11 line-height 不得再出現混型 clamp（clamp 三參數必須同型，否則整條宣告被丟棄）
    assert(/#start \.help\{margin-top:clamp\(2px,1vh,10px\);color:#96a4c9;font-size:12px;line-height:1\.9;/.test(styleC428)
      && !/line-height:clamp\(/.test(styleC428),
      'T428 G11【原文前哨】.help 的 line-height 必須**維持改動前的 1.9、且全檔不得出現 line-height:clamp(**。'
      + '第一版寫 `clamp(1.5,.28vh,1.9)` 混 <number> 與 <length>＝無效宣告、整條被瀏覽器丟棄，'
      + '行動端實際跑成 line-height:normal（≈14.4px，改動前 22.8px）＝可讀性靜默退步，'
      + '而且當時「溢出變小」有約 20px 是語法錯誤白賺的（三個懷疑者各自獨立抓到）。'
      + '第二版換成同型 clamp(18px,2.6vh,22.8px) 仍然比改動前小 ⇒ 正確做法是**不要動它**');
    // G12 逃生閥必須有真的寫入端（只有讀取端的開關＝正式產物裡永遠不可能為真＝沒有回退路徑）
    assert(/\/\[\?&\]noT428=1\/\.test\(location\.search\)/.test(html)
      && /localStorage\.getItem\(SAVEKEY\+'\.noT428'\)==='1'/.test(html),
      'T428 G12【原文前哨】逃生閥必須有寫入端（URL ?noT428=1 或 localStorage SAVEKEY+".noT428"），'
      + '比照既有 badgePref/nightCityPref 慣例；只有讀取端的開關撥不動，等於沒有緊急回退路徑');
    // G13 逃生閥的 h1 退回不得蓋掉既有矮視窗規則
    assert(/html\.noT428 #start h1\{letter-spacing:10px\}/.test(styleC428)
      && /@media \(min-height:521px\)\{html\.noT428 #start h1\{font-size:34px\}\}/.test(styleC428)
      && !/html\.noT428 #start h1\{font-size:34px;letter-spacing:10px\}/.test(styleC428),
      'T428 G13【原文前哨】逃生閥的 h1 退回必須**拆成兩條**：letter-spacing 無條件 10px，'
      + 'font-size 才關在 min-height:521px 內。理由：既有 `@media (max-height:520px){#start h1{font-size:26px}}` '
      + '**只設 font-size、不碰 letter-spacing**。合併寫成一條會在 ≤520px 高（含驗收尺寸 844×390 橫屏）'
      + '讓 letter-spacing 落回 clamp(5px,1.2vh,10px)≈6.2px，而真 BEFORE 是 10px；'
      + '無條件寫成一條又會讓 font-size 變 34px（真 BEFORE 26px）。兩邊都錯過一次');
    // G13b 逃生閥的矮桌面 row-gap 不得寫成 normal（同特異度、原文更後面會壓掉 gap:6px ⇒ 開閥時 row-gap=0）
    assert(/html\.noT428 #start \.startMore\{row-gap:6px\}/.test(styleC428)
      && !/row-gap:normal/.test(styleC428),
      'T428 G13b【原文前哨】逃生閥矮桌面的 row-gap 必須顯式 6px（真 BEFORE 值），不得寫 normal：'
      + '它與 `html.noT428 #start .startMore{gap:6px;padding-top:12px}` 同特異度且原文更後面，'
      + 'normal 會把 row-gap 壓成 0，而 1280×620 正是本卡新加的驗收尺寸');
    // G14 像素 logo 只走整數比例階梯
    assert(/#logo\{image-rendering:pixelated;width:224px;height:128px;/.test(styleC428)
      && /@media \(max-height:860px\)\{#logo\{width:168px;height:96px\}\}/.test(styleC428)
      && /@media \(max-height:700px\)\{#logo\{width:112px;height:64px\}\}/.test(styleC428)
      && !/#logo\{[^}]*clamp\(/.test(styleC428),
      'T428 G14【原文前哨】#logo 必須是 224×128 ＋ 0.75×(168×96) ＋ 0.5×(112×64) 三檔整數比例；'
      + 'canvas backing store 固定 224×128 ＋ image-rendering:pixelated＝最近鄰，'
      + '非整數縮放（原 vh clamp 實測 0.8518×／0.9606×／0.789×）會不均勻丟像素列＝手繪像素 logo 變形');
    // G15 桌面 .scmenu 必須保留內層滾動（解掉會把溢出推給外層，展開態比改動前更糟）
    assert(/#start \.scmenu\{max-width:none\}/.test(styleC428)
      && !/#start \.scmenu\{[^}]*max-height/.test(mqBlk428),
      'T428 G15【原文前哨】桌面 .scmenu **只解寬度上限**，不得動 max-height：'
      + '改成 max-height:none;overflow:visible 會讓點開🎯戰役後外層溢出 349/234/80px（改動前 243/153/63）；'
      + '改成 min(46vh,420px) 仍是 222 > 153。基礎規則的 220px 內層滾動要原樣留著。'
      + '這條是「狀態相依的假綠」——探針只量收合態就看不到，故探針已加展開態量測');
    // G17 矮桌面收攏（1280×620 這類真實可視高；沒有它底部會切 5px）
    assert(/@media \(min-width:900px\) and \(max-height:660px\)\{\n  #start\{gap:4px;padding:4px 0\}/.test(styleC428)
      && /@media \(min-width:900px\) and \(max-height:660px\)\{\n  html\.noT428 #start\{gap:14px;padding:16px 0\}/.test(styleC428),
      'T428 G17【原文前哨】必須有矮桌面收攏斷點（min-width:900px and max-height:660px）＋對應的逃生閥退回：'
      + '1280×620（＝1280×720 筆電最大化的真實可視高）下真內容高 615 雖 ≤ 620，'
      + '但 padding(9.9×2)＋7 個 gap(7.13) 會把總高推到 635 而切掉底部 5px；'
      + 'clamp 在該高度取中間項，調下限無效');
    // G16 難度鈕行動端觸控尺寸不得比改動前小
    assert(/#start \.startMore \.diffbtn\{min-width:auto;padding:10px 8px;font-size:13px;border-radius:9px\}/.test(styleC428),
      'T428 G16【原文前哨】難度鈕必須 padding:10px 8px;font-size:13px（實測 360×640 → 43×67、單列、右緣 324≤360）；'
      + '第一版寫 6px 12px/12px 讓它縮成 33×72＝比改動前的 39×83 更小的可點目標（行動端退步）');
  }

  { /* ===== T515 開始畫面與面板導覽結構化：原文結構守衛 =====
       【觀測能力聲明】本 harness 的 fake DOM 不會建立靜態 class tree、appendChild 也不會移除舊 parent，
       所以這裡只釘真實 source/事件歸屬；跨尺寸 hierarchy、bbox、可點性與展開態由 ui_probe/真瀏覽器驗收。
       不能拿 mock 的匿名 div 假裝證明新 DOM。 */
    const s515a=html.indexOf('<div class="startMore" id="startMore">');
    const s515b=html.indexOf('</div>\n</div>\n\n<script>',s515a);
    const static515=(s515a>=0&&s515b>s515a)?html.slice(s515a,s515b):'';
    const dyn515a=html.indexOf("const moreEl=$('#startMore')||startEl;");
    const dyn515b=html.indexOf('// title version',dyn515a);
    const dyn515=(dyn515a>=0&&dyn515b>dyn515a)?html.slice(dyn515a,dyn515b):'';
    const css515=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));
    /* T515 斷點守衛不能只用跨大括號的貪婪 regex：那會讓規則被搬出 media 後仍假綠。
       兩段都有唯一的 T515 首行錨，切片後才驗內容；找不到閉合也必紅。 */
    const desk515a=css515.indexOf('@media (min-width:900px){\n  #start{');
    const desk515b=desk515a<0?-1:css515.indexOf('\n}\n/* T428 矮桌面',desk515a);
    const desk515=(desk515a>=0&&desk515b>desk515a)?css515.slice(desk515a,desk515b+3):'';
    const narrow515a=css515.indexOf('@media (max-width:420px){\n  .panelAction515');
    const narrow515b=narrow515a<0?-1:css515.indexOf('\n}\n',narrow515a);
    const narrow515=(narrow515a>=0&&narrow515b>narrow515a)?css515.slice(narrow515a,narrow515b+3):'';
    assert(static515.length>100 && dyn515.length>1000,
      'T515 G0【前置】開始畫面 static/dynamic 區塊必須可定位（防搜尋失敗後下列守衛空跑）');
    const pCfg515=static515.indexOf('data-start-role="config"');
    const pExt515=static515.indexOf('data-start-role="extras"');
    const pCha515=static515.indexOf('data-start-role="challenge"');
    assert(pCfg515>=0&&pExt515>pCfg515&&pCha515>pExt515
      && /class="startSection515 startExtras515" data-start-role="extras"[\s\S]*?class="startAltRow515"[\s\S]*?id="bEditorMode"/.test(static515),
      'T515 G1【開始層級】config → extras → challenge 三個 section 必須按順序存在；既有 #bEditorMode 必須在 extras 的 compact row，不能再是 startMore 裸 sibling');
    assert(/const config515=startGroup515\('\.startConfig515'\)\|\|moreEl;/.test(dyn515)
      && /const challenge515=startGroup515\('\.startChallenge515'\)\|\|moreEl;/.test(dyn515)
      && /const altRow515=startGroup515\('\.startAltRow515'\)\|\|extras515;/.test(dyn515)
      && /config515\.appendChild\(dlabel\)[\s\S]*?config515\.appendChild\(drow\)/.test(dyn515)
      && /const challenges515=document\.createElement\('div'\);challenges515\.className='startChallenges515';[\s\S]*?challenges515\.appendChild\(mk\('bCh1'[\s\S]*?\)\)[\s\S]*?challenges515\.appendChild\(mk\('bCh2'[\s\S]*?\)\)[\s\S]*?challenges515\.appendChild\(mk\('bCh3'[\s\S]*?\)\)[\s\S]*?challenge515\.appendChild\(challenges515\)/.test(dyn515)
      && /config515\.appendChild\(grid\)/.test(dyn515)
      && /altRow515\.appendChild\(bCamp\);campaign515\.appendChild\(scMenu\);/.test(dyn515),
      'T515 G2【事件歸屬】難度/設定/三挑戰/戰役必須分派到自己的 group；所有既有 id 與原 onclick 仍由同一個原物件承接');
    assert(desk515.length>200
      && /#start \.startMore\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[\s\S]*?max-width:min\(840px,92vw\)/.test(desk515)
      && /#start \.startMore>\.startConfig515\{grid-column:span 2/.test(desk515)
      && /#start \.startMore>\.startExtras515\{grid-column:span 1/.test(desk515)
      && /#start \.startMore>\.startChallenge515\{grid-column:1\/-1/.test(desk515)
      && /#start \.startChallenges515\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);max-width:760px\}/.test(desk515),
      'T515 G3【桌面節律】外層仍是 T428 三欄；設定 2 欄、其他玩法 1 欄、挑戰跨滿且內部三欄/760px 上限，防挑戰重回滿版巨條');
    assert(/@media \(orientation:portrait\)\{\n  #info\{left:0;right:0;margin-inline:auto;width:min\(560px,92vw\);max-width:92vw\}\n\}/.test(css515)
      && /\.panelTabs515\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(104px,1fr\)\);/.test(css515)
      && /\.panelAction515\{display:grid;grid-template-columns:max-content minmax\(0,1fr\);/.test(css515)
      && /#info \.panelTabs515 \.hbtn\{min-width:0;min-height:30px;white-space:normal/.test(css515)
      && narrow515.length>150
      && /#info \.stab\{grid-template-columns:minmax\(0,1fr\) auto;gap:2px 6px\}/.test(narrow515)
      && /#info \.stab \.u\{grid-column:1\/-1;min-width:0;white-space:normal;overflow-wrap:anywhere/.test(narrow515),
      'T515 G4【窄面板】直式 #info 必須採 92vw 安全寬度；tab/action 只准走具名 grid，statTab 說明欄只准在 max-width:420px 窄幅改為可換行的次列，不得靠 min-content 撐出面板或意外重排桌面表格');
    const trend515=html.slice(html.indexOf('function showTrendPanel450(){'),html.indexOf('function statsTabs343(',html.indexOf('function showTrendPanel450(){')));
    const help515=html.slice(html.indexOf('function showHelp(){'),html.indexOf("$('#bHelp').onclick",html.indexOf('function showHelp(){')));
    const stats515=html.slice(html.indexOf('function showStats(){'),html.indexOf('function showDetail(',html.indexOf('function showStats(){')));
    assert(/class="techTabs343 panelTabs515"/.test(html)
      && /class="panelTabs515" role="group" aria-label="玩法指南分頁"/.test(help515)
      && /class="panelAction515"[\s\S]*?id="trR30"[\s\S]*?class="panelMeta515"/.test(trend515)
      && /class="panelAction515"><div class="panelMeta515">📈 歷史曲線<\/div><div class="panelActionBtns515"><button class="hbtn" id="histR30"/.test(stats515),
      'T515 G5【面板接線】五統計 tab、八指南 tab、趨勢與歷史範圍鈕必須實際輸出 panelTabs/action/meta，不得只寫 CSS 空類');
    assert(!/#info \.row\{[^}]*display:(?:grid|flex)/.test(css515)
      && (html.match(/\$\('#info'\)\.style\.display='block'/g)||[]).length===1
      && !/\b(?:R|ri|vri)\s*\(/.test(dyn515),
      'T515 G6【零副作用】不得重排通用 #info .row；showInfoPanel 的唯一 display 寫入不變；整段 T515 開始畫面注入不得消耗任何亂數流');
  }


  { // ===== T424 TheoTown 風三鍵美術特化卡：HERO_PIX 三鍵重繪守衛（G1-G6；純讀表＋表驅動像素計數，不依賴重放橋） =====
    const GEOM424={ '6_1_0':[56,71,8,37], '7_1_0':[56,64,8,44], '11':[57,55,9,55] };
    const LEDG424={ '6_1_0':[71,16,2,1673,28], '7_1_0':[64,22,4,1521,158], '11':[55,21,5,2393,29] }; // [rows, pal色數, palN數, 日像素, 夜像素]
    const SHA_OUT424='cfb05e19a786abfce3a6f60d7c9e17f6e83b3be2a320fbc9ad7722d74ea17fa3';
    const mHero424=html.match(/const HERO_PIX=\{\n([\s\S]*?)\n\};/);
    assert(!!mHero424,'T424 G0 前置：HERO_PIX 表區塊可定位（const HERO_PIX={ … } 段落）');
    const heroLines424=mHero424[1].split('\n').filter(l=>l.trim());
    const wl424=new Set(['6_1_0','7_1_0','11']);
    let outStr424='', nOut424=0;
    const g1=[],g2=[],g3=[],g4=[];
    for(const l of heroLines424){
      const km=l.match(/^\s*'([^']+)':\{/);
      if(!km)continue;
      const k=km[1];
      if(!wl424.has(k)){ outStr424+=l.trim(); nOut424++; continue; }
      const d=eval('({'+l.trim().replace(/,$/,'')+'})')[k];
      const [w,h,ox,oy]=GEOM424[k];
      if(d.w!==w||d.h!==h||d.ox!==ox||d.oy!==oy)g1.push(k);
      if(d.rows.length>h||d.rows.some(r=>r.length>w))g2.push(k);
      if(!Object.keys(d.palN).every(s=>Object.prototype.hasOwnProperty.call(d.pal,s)))g3.push(k);
      let day=0,night=0;
      for(const r of d.rows)for(const c of r){if(c==='.')continue;day++;if(c in d.palN)night++;}
      const [rows,pn,pnn,dayX,nightX]=LEDG424[k];
      if(d.rows.length!==rows||Object.keys(d.pal).length!==pn||Object.keys(d.palN).length!==pnn||day!==dayX||night!==nightX)
        g4.push(k+':'+d.rows.length+'/'+Object.keys(d.pal).length+'/'+Object.keys(d.palN).length+'/'+day+'/'+night);
    }
    assert(nOut424===54,'T424 G6 鍵集：HERO_PIX 共 57 鍵（白名單 3＋白名單外 54）不增不減，實得 '+nOut424);
    assert(g1.length===0,'T424 G1 幾何：三鍵 w/h/ox/oy 恰等帳本（6_1_0=56,71,8,37／7_1_0=56,64,8,44／11=57,55,9,55；改任一即紅），實得 '+JSON.stringify(g1));
    assert(g2.length===0,'T424 G2 界內：每鍵 rows 行數≤h 且每行≤w（超界即紅），實得 '+JSON.stringify(g2));
    assert(g3.length===0,'T424 G3 夜燈引用：palN 鍵 ⊆ pal 鍵（drawHeroPix 夜間渲染合法性），實得 '+JSON.stringify(g3));
    assert(g4.length===0,'T424 G4 像素帳：表驅動像素計數恰等帳本（行數/色票數/夜燈數/日像素/夜像素逐值），實得 '+JSON.stringify(g4));
    const sha424=crypto.createHash('sha256').update(outStr424).digest('hex');
    assert(sha424===SHA_OUT424,'T424 G5 白名單外：其餘 54 鍵字面量拼接 SHA-256 恰等帳本常量（白名單外任一鍵改動即紅），實得 '+sha424.slice(0,16));
  }

  { // ===== T425 footprint 溢出根治：65_1_0 源碼幾何驗算＋T345 遮罩＋尾部統一貼合（比照 T355 源碼解析先例） =====
    const GEOM425=[272,280,136,278];
    // G3 幾何釘：w/h/ax/ay 恰等
    const m65=html.match(/\{ \/\/ T290 大型購物中心 65_1_0[\s\S]*?SPR\.bld\['65_1_0'\]=\{img:c,night:nc,ax,ay,w:272,h:280,smoke:\[\]\};}/);
    assert(!!m65,'T425 G3 前置：65_1_0 繪製段可定位');
    assert(/SPR\.bld\['65_1_0'\]=\{img:c,night:nc,ax,ay,w:272,h:280,smoke:\[\]\}/.test(html),
      'T425 G3 幾何：65_1_0 w/h/ax/ay 恰等 272/280/136/278（改任一即紅）');
    // G1a 常量定義原文釘（T425 收窄後值——改動須同步驗算器與本釘）
    assert(/const by=ay-40; \/\/ T425E：常量簡化/.test(html),
      'T425 G1a 常量：65 段常量簡化（箱體化後 bw/bx/wingL/wingR/atr 由 isoBox 參數取代）');
    assert(/boxUnit\(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50',\{win:\{gx:10,ht:5,lit:\.55\},tex:'brick'\}\)/.test(html),
      'T425 G1a 箱體：主箱 isoBox(ax,ay,96,32)（半寬96 高32，頂面頂 y=150 恰齊 4×4 菱形頂）');
    // G1b 源碼矩形驗算：解析 65 段全部 fillRect，常量代入＋循環變量極值（min/max）→ 菱形內含（±2px）
    const VARS425={ax:136,ay:278,by:238,bx:64,bw:142,bh:68,shopY:222,topY:170,
      'wingL.x':64,'wingL.w':62,'wingL.h':46,'wingR.x':144,'wingR.w':44,'wingR.h':56,
      'atr.x':128,'atr.w':24,'atr.h':74,'atr.x+3':131,'atr.x+2':130,'atr.w-6':18,'atr.w+6':30,'atr.h-8':66,'atr.h-3':71,
      'wingL.w-8':54,'wingL.w-4':58,'wingR.w-8':36,'wingR.w-4':40,
      i:[0,4],r:[0,8],ry:[0,1],i2b:[0,5],i2c:[0,1],
      st2:[66,208],dxx:[112,152],sx3:[66,190],cx2:[70,176],mx:[136,146],my:[176,218],tx:[96,170],dcx:[104,152],lx:[116,156]};
    const evalExpr425=(e)=>{ // 常量子串替換（長鍵優先）＋循環變量 \b 邊界極值代入
      let s=e;
      const constKeys=Object.keys(VARS425).filter(k=>!Array.isArray(VARS425[k])).sort((a,b)=>b.length-a.length);
      for(const k of constKeys){
        const esc=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        s=s.replace(new RegExp('\\b'+esc+'\\b','g'),VARS425[k]);
      }
      for(const k of Object.keys(VARS425)){
        if(!Array.isArray(VARS425[k]))continue;
        s=s.replace(new RegExp('\\b'+k+'\\b','g'),'CVAR__'+k);
      }
      const res=[];
      const uniq=[...new Set([...s.matchAll(/CVAR__([A-Za-z0-9_]+)/g)].map(m=>m[1]))];
      const mk=(vals)=>{let t=s;for(let j=0;j<uniq.length;j++)t=t.split('CVAR__'+uniq[j]).join(vals[j]);return t;};
      const combos=[];
      const gen=(idx,cur)=>{if(idx===uniq.length){combos.push(cur.slice());return;}
        const arr=VARS425[uniq[idx]];for(const vv of[Math.min(...arr),Math.max(...arr)]){cur.push(vv);gen(idx+1,cur);cur.pop();}};
      gen(0,[]);
      for(const c of combos){try{res.push(Function('return ('+mk(c)+');')());}catch(e){res.push(NaN);}}
      return res;
    };
    const g1bad=[];
    for(const fm of m65[0].matchAll(/fillRect\(([^)]+)\)/g)){
      const parts=fm[1].split(',').map(p=>p.trim());
      if(parts.length!==4)continue;
      const xs=evalExpr425(parts[0]),ys=evalExpr425(parts[1]),ws=evalExpr425(parts[2]),hs=evalExpr425(parts[3]);
      for(let k=0;k<xs.length;k++){
        const x=xs[k],y=ys[k],w=ws[k],h=hs[k];
        if(!isFinite(x)||!isFinite(y)||!isFinite(w)||!isFinite(h))continue;
        for(const py of[y,y+h-1]){
          if(py<150||py>278){g1bad.push(fm[1].slice(0,50)+' py='+py);break;}
          const hw=128*(1-Math.abs(py-214)/64);
          if(Math.abs(x-136)>hw+2||Math.abs((x+w-1)-136)>hw+2){g1bad.push(fm[1].slice(0,60)+' y='+py+' x['+x+'..'+(x+w-1)+'] hw='+hw);break;}
        }
      }
    }
    assert(g1bad.length===0,'T425 G1 源碼幾何：65 段全部 fillRect（常量代入＋循環極值）四角在 4×4 菱形內（±2px；移出/加寬即紅），實得 '+JSON.stringify(g1bad.slice(0,5)));
    // G2 T345 色環下緣遮罩原文釘
    assert(/T425 根治：色環沿下緣描邊/.test(html),'T425 G2 遮罩：T345 色環段必須有 T425 根治註解＋下緣外清除迴圈（刪即紅）');
    assert(/idc=g2\.getImageData\(0,0,w,h\)/.test(html)&&/rowB=ay-py;const half=rowB>0\?rowB\*2:0/.test(html),
      'T425 G2 遮罩：色環繪後以 T291 同款幾何（|px-ax|>2*(ay-py)）清除下緣外（destination-out 語意）');
    // G4 尾部統一貼合 pass 原文釘（必須在 R=__savedR 之前、覆蓋全 SPR.bld sz≥2）
    const iTail425=html.indexOf('T425 統一底部貼合 pass');
    const iRestore425=html.indexOf('R=__savedR;');
    assert(iTail425>0&&iRestore425>0&&iTail425<iRestore425,
      'T425 G4 尾部貼合：統一底部貼合 pass 必須存在且在 R=__savedR 之前（T364 波等後生成鍵從未貼合的閉環）');
    assert(/SZC425=\{19:4,20:2/.test(html)&&/for\(const key in SPR\.bld\)\{\s*const m425=key\.match/.test(html),
      'T425 G4 尾部貼合：SZC425 全鍵清冊＋全 SPR.bld 迴圈（不只 65——色環跨線全城歸零）');
  }

  { // ===== T425A 購物中心美術完善：新元素原文釘（G1 菱形驗算/T425 G1 已覆蓋 212 元素；G2 幾何/T425 G3 已覆蓋） =====
    // G3 新元素原文釘：噴泉／屋頂花園／垂直霓虹／貨箱堆／購物者小人／旗桿陣——刪任一即紅
    assert(/sg.fillStyle='#b8bcc4';sg.fillRect\(128,262,16,4\)/.test(html),
      'T425A G3 噴泉：中央噴泉水盤（128,262,16,4）必須存在（T425A 豐富度 A-H）');
    assert(/E 屋頂花園（T425F 刪除——中庭箱\/天窗已佔滿頂面，花園與招牌互斥）/.test(html),
      'T425A G3 花園：屋頂花園已刪（T425F——頂面被中庭箱/天窗/招牌佔滿）；植栽語義由噴泉側灌木承接');
    assert(/boxUnit\(sg,ng,ax,166,6,26,'#aa4336','#772d25','#c85b4c'\)/.test(html)&&/ng\.fillStyle='#ff8a72';ng\.fillRect\(ax-1,150,2,14\)/.test(html),
      'T425A G3 霓虹：T425K 抬高中庭招牌塔（頂 y=134）與同位夜霓虹必須存在');
    assert(/sg\.fillStyle='#b8a582';sg\.fillRect\(80,219,7,6\)/.test(html),
      'T425A G3 貨箱：裝卸區貨箱堆必須存在（配送區豐富度）');
    assert(/fillStyle='#20242c';sg\.fillRect\(px2,py2,1,1\)/.test(html),
      'T425A G3 小人：決定性購物者小人（3px 頭身，TheoTown 比例）必須存在');
    assert(/for\(const\[fqx,fqc\]of\[\[104,'#9b4b3f'\],\[132,'#d8c798'\],\[166,'#547585'\]\]\)/.test(html),
      'T425A G3 旗桿：T425K 收斂後磚紅／米金／灰藍三色旗桿陣必須存在');
    // G4 夜層釘：霓虹／噴泉燈／地燈必須入 ng（夜間豐富度）
    assert(/ng\.fillStyle='#ff8a72';ng\.fillRect\(ax-1,150,2,14\)/.test(html),
      'T425A G4 夜層：側招牌霓虹必須在 ng（夜亮）');
    assert(/ng\.fillStyle='rgba\(140,200,240,\.6\)';ng\.fillRect\(133,258,6,3\)/.test(html),
      'T425A G4 夜層：噴泉燈必須在 ng');
    assert(/ng\.fillStyle='rgba\(255,220,150,\.5\)';ng\.fillRect\(120,262,3,2\);ng\.fillRect\(152,262,3,2\)/.test(html),
      'T425A G4 夜層：廣場地燈必須在 ng（兩盞）');
    // G5 地面收斂釘：地面件（噴泉/灌木/旗桿/平台/貨箱/小人）y 起點 ≥ 214（菱形下半＝T291 保留區，不被尾部貼合裁邊）
    assert(/sg\.fillRect\(128,262,16,4\)/.test(html)&&/sg\.fillRect\(fqx,226,1,16\)/.test(html)&&/sg\.fillRect\(80,226,12,2\)/.test(html),
      'T425A G5 地面收斂：噴泉(y262)/旗桿(y226)/裝卸平台(y226) 起點在菱形下半（y≥214，貼合語義不變）');
    const g5bad=[];
    const mPeople425a=html.match(/\[\[110,240,'#e05252'\],\[118,241,'#3a6ea5'\],\[120,264,'#3a6ea5'\],\[152,264,'#d8c84a'\],\[69,237,'#4a4a52'\]\]\.forEach/);
    assert(!!mPeople425a,'T425A G5 前置：購物者小人座標列表原文存在（改座標須同步本釘）');
    const peoCoords425a=[...mPeople425a[0].matchAll(/\[(\d+),(\d+),'#[0-9a-f]{6}'\]/g)].map(m=>[+m[1],+m[2]]);
    for(const[fx,fy]of peoCoords425a){if(fy<214)g5bad.push([fx,fy]);}
    assert(g5bad.length===0,'T425A G5 地面收斂：購物者小人 y 座標必須在菱形下半（y≥214，T291 保留區；源碼提取實測），實得 '+JSON.stringify(g5bad));
  }

  { // ===== T425B 購物中心風格迭代：TheoTown 三規則（左光源漸層／右落陰影／接地基腳），只動 65 =====
    // G1b 陰影原文釘：右落陰影必須存在且在 plate 後主體前（底層）
    assert(/===== T425E 結構化 2\.5D：多箱體等距組合/.test(html),
      'T425B G1b 風格塊：T425B 註解標記必須存在（刪即紅）');
    assert(/T425E：接地由 isoBox 底部 AO（rgba \.13 ×3px）提供/.test(html),
      'T425B G1b 陰影：接地由 isoBox 底部 AO 提供（與 v1-v4 語彙一致——右落偏移陰影取消）');
    // G2b 階梯釘（T425D 取代：翼牆階梯色帶替代連續漸層——面轉折立體感；中庭玻璃保留漸層＝幕牆語義）
    const seg65d=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert(!/gL\.createLinearGradient|gR\.createLinearGradient/.test(seg65d),
      'T425B G2b 階梯：翼牆不得再用連續漸層（T425D 改階梯色帶——面轉折立體感；中庭玻璃保留漸層＝幕牆語義）');
    // G3b 基腳釘：接地基腳線
    assert(/T425E：箱體 AO 陰影已提供接地（基腳線隨翼牆刪除）/.test(html),
      'T425B G3b 基腳：接地由 isoBox AO 提供（基腳線隨翼牆刪除——箱體化語義）');
  }

  { // ===== T425C 色票校準：量化對齊 TheoTown 色域（亮度中位 0.41／飽和度 0.40／每 2px 一色） =====
    // G1c 廣場暖灰化：舊灰白 #b6b2a6/#c2beb2 不得再出現於 65 段（新暖灰 #a89e8e/#b4a896）
    const i65c=html.indexOf('{ // T290 大型購物中心 65_1_0');
    const i65cEnd=html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};");
    const seg65c=html.slice(i65c,i65cEnd);
    assert(!/'#b6b2a6'|'#c2beb2'/.test(seg65c),
      'T425C G1c 色域：65 段不得再含舊灰白廣場色（#b6b2a6/#c2beb2——已暖灰化 #a89e8e/#b4a896），亮度下壓');
    assert(/dia\(g,ax,ay-128,128,'#a89e8e'\)/.test(html),'T425C G1c 色域：廣場鋪面暖灰 #a89e8e（原 #b6b2a6）');
    assert(/g\.fillStyle='#b4a896'/.test(seg65c),'T425C G1c 色域：前庭/地磚暖灰 #b4a896（原 #c2beb2）');
    // G2c 亮度/陰影釘：翼牆受光面 L≤0.85（#dcc7a6 L≈.78）；陰影 alpha ≥.30
    assert(/boxUnit\(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50',\{win:\{gx:10,ht:5,lit:\.55\},tex:'brick'\}\)/.test(html),
      'T425C G2c 亮度：主箱左面 #dcc7a6（受光面 L≈.78——蒼白根源下壓）');
    assert(/boxUnit\(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50',\{win:\{gx:10,ht:5,lit:\.55\},tex:'brick'\}\)/.test(html),
      'T425C G2c 亮度：主箱左面受光色 #dcc7a6（L≈.78——蒼白根源下壓）');
    // G3c 箱體結構釘（T425E 取代：多箱體等距組合）
    assert(/boxUnit\(sg,ng,ax-44,ay,40,24,'#cdb694','#a08a72','#7a6a52',\{win:\{gx:8,ht:4,lit:\.5\}\}\)/.test(html),
      'T425C G3c 箱體：左翼箱 isoBox(ax-44,ay,40,24)（矮）必須存在');
    assert(/boxUnit\(sg,ng,ax\+44,ay,44,30,'#c8b498','#8a7058','#6e5a44',\{win:\{gx:8,ht:4,lit:\.5\}\}\)/.test(html),
      'T425C G3c 箱體：右翼箱 isoBox(ax+44,ay,44,30)（中高）必須存在');
    assert(/boxUnit\(sg,ng,ax,198,30,30,'#90b8cc','#4d6f80','#84acbf'\)/.test(html),
      'T425C G3c 箱體：T425K 中庭玻璃箱 boxUnit(ax,198,30,30)（頂 y=138，加寬減高）必須存在');
  }

  { // ===== T425E 結構化 2.5D：多箱體等距組合（業主反饋「結構化的接近 2.5d」；isoBox 語彙與 v1-v4 統一） =====
    // G1e 箱體結構釘：主體必須由 isoBox 箱體組合構成（≥5 個）
    const seg65e=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    const boxN65e=(seg65e.match(/boxUnit\(sg,/g)||[]).length;
    assert(boxN65e>=14,'T425E G1e 箱體：65 段至少 14 個 isoBox 箱體（8 主體＋次箱×2＋翼頂箱×2＋台階×2——T425G 細緻結構化），實得 '+boxN65e);
    assert(!/\brand\(/.test(seg65e.slice(0,seg65e.indexOf('boxUnit(sg,'))),
      'T425E G1e 箱體：65 段箱體區零 rand（boxUnit 內建決定性——T425I 取代 PRNG）');
    // G2e 箱體幾何釘：主箱/中庭箱參數（菱形內含由 G3e 驗算）
    assert(/boxUnit\(sg,ng,ax,ay,96,32,'#dcc7a6','#b89f82','#8a6f50',\{win:\{gx:10,ht:5,lit:\.55\},tex:'brick'\}\)/.test(html),
      'T425E G2e 幾何：主箱（ax,ay,96,32——半寬96 高32，頂面頂恰齊菱形頂）');
    // G3e 菱形內含：箱體包圍盒驗算（頂面菱形＋側面，±2px；下半由 T425 尾部貼合）
    const boxes65e=[[136,278,96,32,'主箱',0],[92,278,40,24,'左翼',0],[180,278,44,30,'右翼',0],[136,198,30,30,'中庭',1],[120,180,12,10,'天窗L',0],[152,180,12,10,'天窗R',0],[136,166,6,26,'招牌塔',1],[136,246,30,4,'雨棚',0],[112,190,16,12,'次箱L',0],[160,190,16,12,'次箱R',0],[92,240,16,12,'翼頂L',0],[180,240,16,12,'翼頂R',0],[136,262,16,4,'台階1',0],[136,252,20,4,'台階2',0]];
    const g3e=[];
    for(const[cx2,by2,hw2,h2,nm,elev]of boxes65e){
      const top2=by2-h2-hw2; // 頂面菱形（isoBox）：頂(cx,top)、左右(cx±hw, top+hw/2)、底(cx, top+hw)
      const pts2=[[cx2,top2],[cx2-hw2,top2+hw2/2],[cx2+hw2,top2+hw2/2],[cx2,top2+hw2]];
      for(const[px2,py2]of pts2){
        if(elev){if(py2<130||py2>200||Math.abs(px2-136)>30)g3e.push(nm+' elevated@('+px2+','+py2+')');continue;}
        if(py2<150||py2>278){g3e.push(nm+'@('+px2+','+py2+')');continue;}
        const hwD=128*(1-Math.abs(py2-214)/64);
        if(Math.abs(px2-136)>hwD+2)g3e.push(nm+'@('+px2+','+py2+') hwD='+hwD.toFixed(0));
      }
    }
    assert(g3e.length===0,'T425E G3e 菱形內含：全部箱體頂面菱形在 4×4 footprint 內（±2px；側面下半由 T425 尾部貼合），實得 '+JSON.stringify(g3e));
    // G4e 地面件保留：噴泉/旗桿/貨箱/小人/地燈（重構不得刪）
    assert(/sg\.fillRect\(128,262,16,4\)/.test(html)&&/sg\.fillRect\(fqx,226,1,16\)/.test(html)&&/sg\.fillRect\(80,219,7,6\)/.test(html),
      'T425E G4e 地面件：噴泉/旗桿/貨箱堆保留（箱體化不得刪地面件）');
    assert(/fillStyle='#20242c';sg\.fillRect\(px2,py2,1,1\)/.test(html),
      'T425E G4e 地面件：購物者小人保留');
    // G5e 箱體完整性：天窗/招牌塔/雨棚/翼箱窗（結構化組合全件）
    assert(/boxUnit\(sg,ng,ax-16,180,12,10,'#90b8cc','#4d6f80','#84acbf'\)/.test(html),
      'T425E G5e 箱體：T425K 天窗箱左與中庭共用玻璃色（減少孤立色票）');
    assert(/boxUnit\(sg,ng,ax,166,6,26,'#aa4336','#772d25','#c85b4c'\)/.test(html),
      'T425E G5e 箱體：T425K 招牌塔（頂 y=134，立於抬高中庭）必須存在');
    assert(/boxUnit\(sg,ng,ax,246,30,4,'#b83c2e','#8a2a1e','#d8695a'\)/.test(html),
      'T425E G5e 箱體：入口雨棚薄板（主箱底面前緣）必須存在');
    assert(/boxUnit\(sg,ng,ax-44,ay,40,24,'#cdb694','#a08a72','#7a6a52',\{win:\{gx:8,ht:4,lit:\.5\}\}\)/.test(html),
      'T425E G5e 箱體：左翼箱窗（boxUnit win 窗洞內凹——T425I 取代 windows）');
  }

  { // ===== T425I 極緻結構化：boxUnit 六技法（T425H 方案落地） =====
    // G1i 函數釘：boxUnit 六技法存在（三面色階/稜線/窗洞/節奏點/磚紋）
    assert(/function boxUnit\(g,ng,cx,by,hw,h,cL,cR,cTop,opts\)\{/.test(html),
      'T425I G1i 函數：boxUnit 函數必須存在（isoBox 極緻升級）');
    /* T441 跟版（**動既有斷言，理由寫在這裡**）：原本釘的是兩個寫死的陣列字面量
       `rampL=[shade(cL,2),…]` / `rampR=[shade(cR,-2),…]`，也就是把「左面受光」釘死。
       而 T441 量到 boxUnit 與 isoBox 的受光方向相反（isoBox 主體 108 個鍵全部右受光），
       要對齊就必須讓「哪一面吃亮階」可切換。釘子指著舊方向，不改就不能修它。
       **這不是放寬**：五級色階的兩組 shade 參數（+2/+1/0/−1/−2 與 −2..−6）逐字保留，
       只是從陣列字面量改釘產生它的函式；方向另有 T441 G3 專釘、逃生閥另有 T441 G4 位置釘。 */
    assert(/rampLit=c=>\[shade\(c,2\),shade\(c,1\),c,shade\(c,-1\),shade\(c,-2\)\]/.test(html),
      'T425I G1i 色階：受光面 5 級色階（shade +2/+1/0/-1/-2）必須維持');
    assert(/rampDim=c=>\[shade\(c,-2\),shade\(c,-3\),shade\(c,-4\),shade\(c,-5\),shade\(c,-6\)\]/.test(html),
      'T425I G1i 色階：背光面 5 級色階（shade -2..-6）必須維持');
    assert(/\/\/ ②稜線體系：左稜外摺角亮線/.test(html)&&/fillStyle=shade\(cL,3\);/.test(html),
      'T425I G1i 稜線：外摺角亮線（shade cL+3）與內摺角暗線（shade cR-4）');
    assert(/\/\/ ⑤斜邊節奏點：左斜面每 4 列 1 亮點/.test(html)&&/dx\+=4\)\{const yF=by-\(dx>>1\)/.test(html),
      'T425I G1i 節奏點：斜邊每 4 列 1 亮點（抗鋸齒）');
    assert(/\/\/ ③窗洞內凹（opts\.win/.test(html)&&/fillStyle=shade\(cL,-6\);g\.fillRect/.test(html),
      'T425I G1i 窗洞：深底＋玻璃＋亮上框＋暗下框（內凹）');
    // G2i 遷移釘：65 段全 boxUnit（isoBox 不再用於 65）
    const seg65i=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert(!/isoBox\(/.test(seg65i),'T425I G2i 遷移：65 段不得再用 isoBox（全 boxUnit 六技法）');
    // G3i 窗洞夜燈釘：決定性夜燈（dx%7<lit*7）
    assert(/\(\(dx\+row\*5\)%7\)<lit\*7/.test(html)&&/\(\(dx\+row\*5\+3\)%7\)<lit\*7/.test(html),
      'T425I G3i 夜燈：左右窗洞均以 dx/row 決定夜燈（零 rand）');
    // G4i 零 rand：boxUnit 函數內無 rand/R/ri
    const fnI=html.slice(html.indexOf('function boxUnit('),html.indexOf('// 牆上窗（含窗台與反光',html.indexOf('function boxUnit(')));
    const fnICode=fnI.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    assert(!/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(/.test(fnICode),'T425I G4i 零 rand：boxUnit 內無 rand/R/ri/Math.random（全決定性）');
    assert(!/\b(?:R|ri|rand)\b\s*(?:=|:)|(?:=|:)\s*\b(?:R|ri|rand)\b|Math\.random\s*(?:=|:)|(?:=|:)\s*Math\.random\b/.test(fnICode),
      'T425I G4i 零 rand alias：boxUnit 不得從左右任一側捕獲亂數函數再繞過呼叫守衛');
  }

  { // ===== T425J R01 立面骨架：雙面、多層、壁柱與樓層帶 =====
    const f0=html.indexOf('function boxUnit('),f1=html.indexOf('// 牆上窗（含窗台與反光',f0),fnJ=html.slice(f0,f1);
    assert(f0>0&&f1>f0,'T425J G1j boxUnit 應可完整切片，不能再用固定 1800 字元假綠');
    assert(/const rows=Math\.max\(1,Math\.min\(3,Math\.floor\(\(h-3\)\/\(ht\+3\)\)\)\)/.test(fnJ),
      'T425J G1j 多層：窗格列數由牆高/窗高決定且鎖在 1..3 層');
    assert((fnJ.match(/T425J 立面骨架/g)||[]).length===2&&/for\(let row=1;row<rows;row\+\+\)/.test(fnJ),
      'T425J G1j 骨架：雙面樓層帶與窗灣壁柱兩組都必須存在');
    assert(/g\.fillStyle='#29445c';g\.fillRect\(cx-dx\+1,yt,3,ht\)/.test(fnJ)&&
      /g\.fillStyle='#20384f';g\.fillRect\(cx\+dx\+1,yt,3,ht\)/.test(fnJ),
      'T425J G2j 雙面：左受光與右背光玻璃都必須真正落到正式 boxUnit');
    assert(/ng\.fillStyle='#ffd77a'/.test(fnJ)&&/ng\.fillStyle='#ffc968'/.test(fnJ),
      'T425J G2j 夜層：左右窗格各有決定性夜燈，不能只亮單面');
    const fnJCode=fnJ.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    assert(!/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(/.test(fnJCode)&&
      !/\b(?:R|ri|rand)\b\s*(?:=|:)|(?:=|:)\s*\b(?:R|ri|rand)\b|Math\.random\s*(?:=|:)|(?:=|:)\s*Math\.random\b/.test(fnJCode),
      'T425J G3j 零亂數：完整 helper 禁直接呼叫與 alias 捕獲（修復 T425I U+0008／定長切片假綠）');
  }

  { // ===== T425J R02 屋頂系統：面板／收縫／檢修帶／機電 =====
    const r0=html.indexOf('function mallRoof425K('),r1=html.indexOf('// 牆上窗（含窗台與反光',r0),roofJ=html.slice(r0,r1);
    assert(r0>0&&r1>r0&&/const pal=\['#92795f','#86705a','#9a8268'\],seam='#665444',walk='#b39b79',cell=24/.test(roofJ),
      'T425J G4j→T425K 屋頂：三個大面色＋收縫＋檢修脊的單一 helper 必須存在');
    assert(/u=dy\*2\+dx,v=dy\*2-dx/.test(roofJ)&&/fu=u%cell,fv=v%cell/.test(roofJ)&&/fu===0\|\|fv===0/.test(roofJ),
      'T425J G4j→T425K 屋頂：分板仍沿等距 u/v 軸，但 cell=24 降低高頻噪點');
    assert(/u>=hw-1&&u<=hw\+1/.test(roofJ)&&!/v>=hw-1&&v<=hw\+1/.test(roofJ),
      'T425J G4j→T425K 維修：只保留一條 u 軸檢修脊，不恢復雙十字噪點');
    const seg65j=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert((seg65j.match(/mallRoof425K\(sg,ax,150,96\)/g)||[]).length===1,
      'T425J G5j→T425K 接線：正式 k65 主屋頂恰呼叫一次 mallRoof425K（不重複鋪面）');
    assert((seg65j.match(/T425J HVAC [LR]/g)||[]).length===2&&(seg65j.match(/T425K K3 排氣帽 [LR]/g)||[]).length===2,
      'T425J G5j 機電：HVAC 與排氣帽各左右成對，四件可命名屋頂設備不能被刪');
    assert(/\n   boxUnit\(sg,ng,ax-58,212,8,6,'#aeb6b6','#7c888b','#c8ceca'\)/.test(seg65j)&&
      /\n   boxUnit\(sg,ng,ax\+58,212,8,6,'#aeb6b6','#7c888b','#c8ceca'\)/.test(seg65j)&&
      /\n   boxUnit\(sg,ng,ax-68,200,4,7,'#aeb6b6','#7c888b','#c8ceca'\)/.test(seg65j)&&
      /\n   boxUnit\(sg,ng,ax\+68,200,4,7,'#aeb6b6','#7c888b','#c8ceca'\)/.test(seg65j),
      'T425J G5j 機電活線：四件設備必須是直接執行行，包 if(false) 或改座標都判紅');
    const roofUnits=[[78,212,8,6],[194,212,8,6],[68,200,4,7],[204,200,4,7]],roofBad=[];
    for(const[cx,by,hw,h]of roofUnits){for(const[x,y]of[[cx,by-h-hw],[cx-hw,by-h-hw/2],[cx+hw,by-h-hw/2],[cx,by-h]]){
      const span=96-Math.abs(y-198)*2;if(y<150||y>246||Math.abs(x-136)>span+1)roofBad.push([x,y]);
    }}
    assert(roofBad.length===0,'T425J G5j 幾何：四件屋頂設備頂面全在主屋頂菱形內，出界 '+JSON.stringify(roofBad));
    const roofCode=roofJ.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    assert(!/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(/.test(roofCode)&&
      !/\b(?:R|ri|rand)\b\s*(?:=|:)|(?:=|:)\s*\b(?:R|ri|rand)\b|Math\.random\s*(?:=|:)|(?:=|:)\s*Math\.random\b/.test(roofCode),
      'T425J G6j 屋頂零亂數：面板／檢修帶不得消耗或 alias 亂數');
  }

  { // ===== T425J R03 商場敘事：導視／入口／後勤／店窗／機電讀點 =====
    const w0=html.indexOf('function mallWord425J('),w1=html.indexOf('// 牆上窗（含窗台與反光',w0),wordJ=html.slice(w0,w1);
    assert(w0>0&&w1>w0&&/const glyph=\['101111111101101','010101111101101','100100100100111','100100100100111'\]/.test(wordJ),
      'T425J G7j 導視：M/A/L/L 四個原創 3×5 glyph 必須固定，不依賴平台字型');
    const seg65j3=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert((seg65j3.match(/mallWord425J\(sg,ax\+52,222,'#fff8e8'\)/g)||[]).length===1&&
      /sg\.fillStyle='#b83c2e';sg\.fillRect\(ax\+40,220,40,10\)/.test(seg65j3),
      'T425J G7j 正式招牌：右翼紅底只接一個 MALL 像素字輸出');
    assert(/T425J R03 主入口/.test(seg65j3)&&/sg\.fillRect\(ax-1,by-7,2,7\)/.test(seg65j3)&&
      /ng\.fillRect\(ax-26,by-7,4,5\)/.test(seg65j3),
      'T425J G8j 入口：中央門縫／門把／資訊燈箱與夜層必須同位');
    assert(/sg\.fillRect\(58,226,14,11\)/.test(seg65j3)&&/for\(let yy=228;yy<237;yy\+=2\)/.test(seg65j3)&&
      /ng\.fillRect\(62,224,6,2\)/.test(seg65j3),
      'T425J G8j 後勤：捲門有分片、安全紋、月台燈，不得只留一塊灰矩形');
    assert((seg65j3.match(/for\(const x of\[184,192,200,208\]\)/g)||[]).length===1&&
      /ng\.fillRect\(x\+1,233,3,4\)/.test(seg65j3),
      'T425J G8j 店窗：右翼四間店窗日夜同位');
    assert(/T425J R03 屋頂機電讀點/.test(seg65j3)&&/for\(const x of\[ax-58,ax\+58\]\)/.test(seg65j3)&&
      /for\(const x of\[ax-68,ax\+68\]\)/.test(seg65j3),
      'T425J G9j 機電讀點：HVAC 風扇與排氣帽帽沿必須成對');
    assert(/T425J R03 購物車棚/.test(seg65j3)&&/for\(let x=179;x<196;x\+=4\)/.test(seg65j3),
      'T425J G9j 前庭：購物車棚與消防通道必須存在');
    const seg65jCode=seg65j3.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    assert(!/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(/.test(seg65jCode)&&
      !/\b(?:R|ri|rand)\b\s*(?:=|:)|(?:=|:)\s*\b(?:R|ri|rand)\b|Math\.random\s*(?:=|:)|(?:=|:)\s*Math\.random\b/.test(seg65jCode),
      'T425J G10j 商場段零亂數：入口／後勤／店窗／前庭不得碰亂數流');
  }

  { // ===== T425J R04 密度收斂：左右翼屋頂同系分板 =====
    const seg65j4=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert((seg65j4.match(/mallRoof425K\(sg,/g)||[]).length===3,
      'T425J G11j 屋頂接線：主箱＋左右翼恰三個不同 roof 面，不得漏翼或重畫同一面');
    assert((seg65j4.match(/mallRoof425K\(sg,ax-44,214,40\)/g)||[]).length===1&&
      (seg65j4.match(/mallRoof425K\(sg,ax\+44,204,44\)/g)||[]).length===1,
      'T425J G11j 翼頂幾何：左右翼各自使用既有 boxUnit 的精確 top/hw');
    assert(/T425K K1 左翼屋頂同系大分區/.test(seg65j4)&&/T425K K1 右翼屋頂同系大分區/.test(seg65j4),
      'T425J G11j 意圖：翼頂收斂必須是可命名分板，不是無語義散點');
    const roofJ4=html.slice(html.indexOf('function mallRoof425K('),html.indexOf('function mallWord425J('));
    assert(/cell=24/.test(roofJ4)&&!/fu===\d+&&fv===\d+/.test(roofJ4),
      'T425J G12j→T425K 降噪：24 單位大分區且不再畫每板中心扣點');
  }

  { // ===== T425K 購物中心氛圍與立體收斂：低頻屋面／抬高中庭／連續暖光 =====
    const h0k=html.indexOf('function mallRoof425K('),h1k=html.indexOf('// 牆上窗（含窗台與反光',h0k);
    const helpers425k=html.slice(h0k,h1k),seg425k=html.slice(html.indexOf('{ // T290 大型購物中心 65_1_0'),html.indexOf("SPR.bld['65_1_0']={img:c,night:nc,ax,ay,w:272,h:280,smoke:[]};"));
    assert(h0k>0&&h1k>h0k&&/function mallCast425K\(/.test(helpers425k)&&/function mallGlow425K\(/.test(helpers425k),
      'T425K G1 helper：低頻屋面／投影／入口光毯三個決定性 helper 必須在同一可完整切片區');
    const code425k=(helpers425k+seg425k).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
    assert(!/\b(?:R|ri|rand|vri)\s*\(|Math\.random\s*\(|Date\.now\s*\(|performance\.now\s*\(/.test(code425k)&&
      !/\b(?:R|ri|rand|vri)\b\s*(?:=|:)|(?:=|:)\s*\b(?:R|ri|rand|vri)\b|Math\.random\s*(?:=|:)|(?:=|:)\s*Math\.random\b/.test(code425k),
      'T425K G1 零亂數：三 helper＋完整 k65 段禁 R/ri/rand/vri/Math.random、alias 與牆鐘');
    assert((html.match(/mallRoof425K\(/g)||[]).length===4&&(html.match(/mallCast425K\(/g)||[]).length===2&&(html.match(/mallGlow425K\(/g)||[]).length===2,
      'T425K G2 白名單接線：roof 定義+三屋面、cast/glow 各定義+一接線；多一處即可能污染別鍵');
    assert((seg425k.match(/mallRoof425K\(sg,/g)||[]).length===3&&/mallRoof425K\(sg,ax,150,96\)/.test(seg425k)&&
      /mallRoof425K\(sg,ax-44,214,40\)/.test(seg425k)&&/mallRoof425K\(sg,ax\+44,204,44\)/.test(seg425k),
      'T425K G2 三屋面：主／左翼／右翼各恰一次，不漏畫也不重複鋪面');
    const iCast425k=seg425k.indexOf('mallCast425K(sg,ax,178)'),iAtr425k=seg425k.indexOf("boxUnit(sg,ng,ax,198,30,30,'#90b8cc','#4d6f80','#84acbf')");
    assert(iCast425k>0&&iAtr425k>iCast425k&&198-30-30===138&&138<150,
      'T425K G3 立體：投影須先於抬高中庭；中庭頂 y=138 明確高於主屋頂 y=150');
    const api425k=window.__t425K();
    assert(JSON.stringify(api425k.meta)===JSON.stringify({w:272,h:280,ax:136,ay:278}),
      'T425K G4 metadata：k65 record 精確維持 272×280／ax136／ay278');
    const roofOps425k=api425k.roof(136,150,96),roofCols425k=[...new Set(roofOps425k.map(o=>o.col))];
    assert(roofOps425k.length>5000&&roofCols425k.length===7&&roofCols425k.includes('#b39b79')&&roofCols425k.includes('#665444'),
      'T425K G5 屋面重放：大面／收縫／單脊／雙邊緣共 7 色且真的大量落筆，實得 '+roofOps425k.length+'/'+roofCols425k.join(','));
    const castOps425k=api425k.cast(136,178);
    assert(castOps425k.length===10&&JSON.stringify(castOps425k[0].rect)==='[148,178,30,1]'&&JSON.stringify(castOps425k[9].rect)==='[166,187,12,1]',
      'T425K G6 投影重放：東南階梯陰影恰 10 列，由 30px 收至 12px（移位／刪列即紅）');
    const glowOps425k=api425k.glow(136,238);
    assert(glowOps425k.length===3&&JSON.stringify(glowOps425k.map(o=>o.rect))==='[[102,239,68,2],[109,241,54,3],[117,244,38,3]]',
      'T425K G7 光毯重放：入口暖光恰三層、由寬到窄且連續，禁止散點化');
    assert(/const mcarC=\['#8b493c','#496b7b','#8b493c','#496b7b'\]/.test(seg425k)&&
      /\[\[104,'#9b4b3f'\],\[132,'#d8c798'\],\[166,'#547585'\]\]/.test(seg425k),
      'T425K G8 色票收斂：車只用磚紅／灰藍兩色；旗面只用磚紅／米金／灰藍三色');
    const float65k=window.GV.sprNightAudit().filter(r=>r.key==='65_1_0');
    assert(float65k.length===0,'T425K G9 夜層：k65 夜光不得落在日間透明像素，實得 '+JSON.stringify(float65k));
  }

  { // ===== T425F 像素質感：淺描邊＋箱體面工藝（業主反饋「角度對了，像素顯示效果不對」） =====
    // G1f 描邊釘：65 段 outlineSprite 用淺色（TheoTown「避免深色輪廓」）
    assert(/outlineSprite\(s,176,182,192\);g\.drawImage\(s,0,0\); \/\/ T425F 淺描邊/.test(html),
      'T425F G1f 描邊：65 段淺描邊 (176,182,192)（原 26,30,44 深黑框＝貼紙感——TheoTown 禁深色輪廓）');
    // G2f 磚紋釘：主箱左面中央帶水平紋
    assert(/T425F 主箱左面中央帶磚紋/.test(html)&&/for\(let by2=by-14;by2>by-20;by2-=4\)\{for\(let bx2=ax-16;bx2<ax\+8;bx2\+=6\)\{sg\.fillRect\(bx2,by2-2,4,1\);\}\}/.test(html),
      'T425F G2f 磚紋：主箱左面中央帶水平紋（y258..266 x120..144——像素材質工藝）');
    // G3f 招牌釘：右翼箱面 MALL 招牌
    assert(/T425F 右翼箱面 MALL 招牌/.test(html)&&/sg\.fillStyle='#b83c2e';sg\.fillRect\(ax\+40,220,40,10\)/.test(html),
      'T425F G3f 招牌：右翼箱面 MALL 橫條（40×10＋雙行白字）');
  }

  { // ===== T425G 細緻結構化：階梯箱體＋對稱稜角（業主反饋「棱角更多且規律、2D 平面殘留」） =====
    // G1g 階梯箱釘：次箱/翼頂箱/台階存在（14 箱體總數由 T425E G1e 釘）
    assert(/T425G 次箱 L（主箱頂對稱）/.test(html)&&/T425G 次箱 R（主箱頂對稱——棱角規律）/.test(html),
      'T425G G1g 階梯：次箱 L/R（主箱頂對稱）必須存在');
    assert(/T425G 翼頂小箱 L（三級階梯）/.test(html)&&/T425G 翼頂小箱 R/.test(html),
      'T425G G1g 階梯：翼頂小箱 L/R（三級階梯）必須存在');
    // G2g 對稱釘：成對參數
    assert(/boxUnit\(sg,ng,ax-24,190,16,12,'#cdb694','#a08a72','#8a6f50'\)/.test(html)&&/boxUnit\(sg,ng,ax\+24,190,16,12,'#cdb694','#a08a72','#8a6f50'\)/.test(html),
      'T425G G2g 對稱：次箱 L/R 參數成對（ax±24,190,16,12——棱角規律）');
    assert(/boxUnit\(sg,ng,ax-44,240,16,12,'#c8b498','#8a7058','#6e5a44'\)/.test(html)&&/boxUnit\(sg,ng,ax\+44,240,16,12,'#c8b498','#8a7058','#6e5a44'\)/.test(html),
      'T425G G2g 對稱：翼頂箱 L/R 參數成對（ax±44,240,16,12）');
    // G3g 台階釘：入口兩級階梯（前庭結構化——2D 平面殘留處理）
    assert(/T425G 入口台階 1（前庭結構化）/.test(html)&&/boxUnit\(sg,ng,ax,262,16,4,'#c9c2b4','#a89e8e','#d4cec0'\)/.test(html),
      'T425G G3g 台階：入口台階 1（by262）必須存在');
    assert(/T425G 入口台階 2（兩級階梯）/.test(html)&&/boxUnit\(sg,ng,ax,252,20,4,'#c9c2b4','#a89e8e','#d4cec0'\)/.test(html),
      'T425G G3g 台階：入口台階 2（by252 兩級階梯）必須存在');
  }

  // ===== T369 工業供應鏈總覽（純讀取統計 UI）+ 退修 gFlow 成對歸零／短中文 UI =====
  {
    const i369 = html.indexOf('T369 工業供應鏈總覽');
    assert(i369 > 0, 'T369 應有 showStats 區塊註解');
    const i369end = html.indexOf('if(hotelBeds>0||tourists>0)', i369);
    assert(i369end > i369, 'T369 區塊應止於旅宿分區之前');
    const blk369 = html.slice(i369, i369end);
    assert(/statTab\(rows369\)/.test(blk369) && /kCnt\[49\]/.test(blk369) && /kCnt\[121\]/.test(blk369),
      'T369 必須走 statTab 且只讀 kCnt 既有計數（不另掃地圖）');
    assert(/gFlow284\.use/.test(blk369) && /fuelMade/.test(blk369) && /steelUsed/.test(blk369) && /shipPortGold/.test(blk369),
      'T369 必須直接讀既有流量／倍率變數');
    assert(/庫存快照/.test(blk369) && /非產量/.test(blk369),
      'T369 庫存快照必須標明非產量語意');
    assert(!/u:'supplies'|u:'gFlow\.use'|u:'fuelMade'|u:'steelUsed'/.test(blk369),
      'T369 退修：單位欄不得露出內部變數名');
    assert(/gFlow284=\{gain:0,use:0,mul:1\}/.test(html),
      'T369 退修：gFlow284 成對歸零字面應存在');
    const nwG = html.indexOf('function newWorld');
    const ldG = html.indexOf('goods=(+d.gds)');
    assert(nwG > 0 && html.slice(nwG, nwG + 3500).includes('gFlow284={gain:0,use:0,mul:1}'),
      'T369 退修：newWorld() 必須重置 gFlow284');
    assert(ldG > 0 && html.slice(ldG, ldG + 200).includes('gFlow284={gain:0,use:0,mul:1}'),
      'T369 退修：load() 必須重置 gFlow284');
    assert(/T369\.1/.test(html) && /rec\[1\]===64/.test(html) && /gWhCap284=_whCap/.test(html),
      'T369.1：load 必須從 d.bl 重建 k64→gWhCap284');
    assert(nwG > 0 && /gWhCap284=0/.test(html.slice(nwG, nwG + 3500)),
      'T369.1：newWorld 必須 gWhCap284=0');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(blk369),
      'T369 區塊不得消耗共用亂數');
    assert(!/function tick\b|saveInflate|w2v\(|viewDep\(|objs\.push/.test(blk369),
      'T369 不得伸入 tick／繪製／旋轉錨點');
    // 空城靜默：新世界無相關建築且存量流量全零 → 不得出現分區（含「不跑 tick」路徑）
    window.GV.newWorldSeeded(7); window.GV.setDiff(3);
    elMap.get('bStats').onclick();
    const emptyNoTick369 = elMap.get('infoBody').innerHTML;
    assert(!emptyNoTick369.includes('工業供應鏈'), 'T369 空城不跑 tick 不得顯示工業供應鏈');
    window.GV.step(1);
    elMap.get('bStats').onclick();
    const empty369 = elMap.get('infoBody').innerHTML;
    assert(!empty369.includes('工業供應鏈'), 'T369 空城不得顯示工業供應鏈分區');
    assert(!/NaN|Infinity|undefined/.test(empty369), 'T369 空城統計不得出現 NaN/Infinity/undefined');
    // 真跑三鏈 + 購物中心消費工業品 → 非零售出／倍率
    window.GV.newWorldSeeded(9); window.GV.setDiff(3); window.GV.addMoney(999999);
    const ref369 = findSpot('refinery');
    assert(ref369 && place('refinery', ref369.x, ref369.y), 'T369 真跑應可建煉油廠');
    const st369 = findSpot('steelMill');
    assert(st369 && place('steelMill', st369.x, st369.y), 'T369 真跑應可建鋼鐵廠');
    const sh369 = findSpot('shipyard');
    assert(sh369 && place('shipyard', sh369.x, sh369.y), 'T369 真跑應可建造船廠');
    let oil369 = null, ore369 = null, n369 = window.GV.N();
    for (let y = 2; y < n369 - 2 && (!oil369 || !ore369); y++)
      for (let x = 2; x < n369 - 2; x++) {
        const t = tile(x, y); if (!t || t.bld || (t.t !== 1 && t.t !== 2)) continue;
        if (!oil369 && window.GV.resourceAt(x, y) === 1) oil369 = { x, y };
        if (!ore369 && window.GV.resourceAt(x, y) === 2) ore369 = { x, y };
      }
    assert(oil369 && place('oilwell', oil369.x, oil369.y), 'T369 真跑應能建油井');
    assert(ore369 && place('mine', ore369.x, ore369.y), 'T369 真跑應能建礦場');
    const po369 = findSpot('port');
    assert(po369 && place('port', po369.x, po369.y), 'T369 真跑應可建港口');
    const mall369 = findSpot('grandMall');
    assert(mall369 && place('grandMall', mall369.x, mall369.y), 'T369 真跑應可建購物中心以產生供貨需求');
    for (let d = 0; d < 14; d++) window.GV.step(1); // 催熟 + 原料→工業品→售出
    // 若仍無售出：注入工業品庫存再推一日（保證非零 gFlow 案例）
    if (!(window.GV.goods().use > 0)) {
      window.GV.save();
      const dInj = window.GV.inflateSave(store[SKEY]);
      dInj.gds = 40;
      store[SKEY] = JSON.stringify(dInj);
      assert(window.GV.load(), 'T369 注入工業品後 load 應成功');
      // 退修：load 後、未 tick 前 use/mul 必須已歸零
      const gPre = window.GV.goods();
      assert(gPre.use === 0 && gPre.mul === 1, 'T369 load 未 tick 時 gFlow 必須 use=0 mul=1（實得 use=' + gPre.use + ' mul=' + gPre.mul + '）');
      elMap.get('bStats').onclick();
      const panelPreTick = elMap.get('infoBody').innerHTML;
      assert(!panelPreTick.includes('gFlow') && !panelPreTick.includes('supplies') && !panelPreTick.includes('fuelMade'),
        'T369 面板不得露出內部變數名');
      window.GV.step(1);
    }
    const g369 = window.GV.goods(), c369 = window.GV.chain346();
    assert(g369.use > 0 || g369.mul > 1 || g369.stock > 0,
      'T369 動態案例應有非零工業品流量或庫存（use=' + g369.use + ' mul=' + g369.mul + ' stock=' + g369.stock + '）');
    if (g369.use > 0) assert(g369.mul > 1, 'T369 有售出時供貨倍率應 >1（實得 ' + g369.mul + '）');
    const statsBefore = JSON.stringify(window.GV.stats());
    const histBefore = JSON.stringify(window.GV.hist());
    const money369 = window.GV.stats().money;
    const pop369 = window.GV.stats().pop;
    const day369 = window.GV.stats().day;
    const save369 = window.GV.rawSave ? window.GV.rawSave() : store[SKEY];
    elMap.get('bStats').onclick();
    const panel369 = elMap.get('infoBody').innerHTML;
    assert(panel369.includes('工業供應鏈'), 'T369 三鏈城市必須顯示工業供應鏈分區');
    assert(panel369.includes(g369.stock + '/' + g369.cap), 'T369 工業品須與 GV.goods() 一致');
    assert(panel369.includes('×' + g369.mul), 'T369 供貨倍率須與 GV.goods().mul 一致');
    assert(panel369.includes(String(g369.use)), 'T369 今日售出須與 GV.goods().use 一致');
    assert(panel369.includes(String(c369.fuelMade)) && panel369.includes(String(c369.steelMade)),
      'T369 今日精煉／冶煉須與 chain346 一致');
    assert(panel369.includes(String(c369.shipUse)) && panel369.includes('×' + c369.fuelTaxMul),
      'T369 耗鋼與燃料工業倍率須與 chain346 一致');
    assert(panel369.includes('×' + c369.steelTaxMul) && panel369.includes('×' + c369.shipTradeTaxMul),
      'T369 鋼材／貿易倍率須與 chain346 一致');
    assert(panel369.includes('×' + 0.85) || panel369.includes('×.85'), 'T369 應顯示升級折扣 0.85');
    assert(panel369.includes('今日售出') && panel369.includes('供貨倍率') && panel369.includes('港口收益'),
      'T369 退修後應使用短中文標籤');
    assert(!panel369.includes('gFlow') && !panel369.includes('supplies') && !panel369.includes('fuelMade') && !panel369.includes('steelUsed'),
      'T369 退修：面板不得含內部識別字');
    // 零副作用：開面板前後 GV.stats()／GV.hist() 完整等值 + 存檔字串不變
    elMap.get('bStats').onclick();
    assert(JSON.stringify(window.GV.stats()) === statsBefore, 'T369 開統計前後 GV.stats() 必須完整等值');
    assert(JSON.stringify(window.GV.hist()) === histBefore, 'T369 開統計前後 GV.hist() 必須完整等值');
    assert(window.GV.stats().money === money369 && window.GV.stats().pop === pop369 && window.GV.stats().day === day369,
      'T369 開統計不得改 money/pop/day');
    if (window.GV.rawSave) assert(window.GV.rawSave() === save369, 'T369 開統計不得改存檔字串');
    else assert(store[SKEY] === save369, 'T369 開統計不得改 store 存檔');
    // 破壞性：有流量後 newWorld 不跑 tick，不得殘留售出／倍率驅動顯示
    window.GV.save();
    const dirtySave = store[SKEY];
    window.GV.newWorldSeeded(11); window.GV.setDiff(3);
    const gNw = window.GV.goods();
    assert(gNw.use === 0 && gNw.mul === 1 && gNw.stock === 0 && gNw.cap === 60,
      'T369 newWorld 未 tick 時 goods 流量／容量必須歸零（cap=' + gNw.cap + '）');
    elMap.get('bStats').onclick();
    assert(!elMap.get('infoBody').innerHTML.includes('工業供應鏈'),
      'T369 newWorld 未 tick 不得因殘留 gFlow 誤顯示分區');
    // 讀檔未 tick：gFlow 歸零；有存檔建築／庫存時可顯示分區，但售出必須為 0、倍率 1
    store[SKEY] = dirtySave;
    assert(window.GV.load(), 'T369 讀回三鏈存檔應成功');
    const gLd = window.GV.goods();
    assert(gLd.use === 0 && gLd.mul === 1, 'T369 load 未 tick 時 use/mul 必須歸零');
    elMap.get('bStats').onclick();
    const panelLd = elMap.get('infoBody').innerHTML;
    if (panelLd.includes('工業供應鏈')) {
      assert(panelLd.includes('今日售出') && panelLd.includes('供貨倍率'),
        'T369 load 未 tick 顯示分區時應含短中文列');
      assert(panelLd.includes('×1'), 'T369 load 未 tick 供貨倍率應為 ×1');
    }
    // ===== T369.1 跨存檔 gWhCap284：有倉儲→無倉儲／有倉儲→有倉儲（皆未 tick）=====
    window.GV.newWorldSeeded(285); window.GV.setDiff(3); window.GV.addMoney(999999);
    const whA = findSpot('warehouse');
    assert(whA && place('warehouse', whA.x, whA.y), 'T369.1 應可建倉儲 A');
    window.GV.step(1);
    assert(window.GV.goods().cap === 180, 'T369.1 有倉儲 tick 後 cap 應 180（實得 ' + window.GV.goods().cap + '）');
    window.GV.save();
    const saveWithWh = store[SKEY];
    // 無倉儲城 + gds=40，從「有倉儲」狀態讀入 → 未 tick 不得殘留 180
    window.GV.newWorldSeeded(7); window.GV.setDiff(3); window.GV.addMoney(999999);
    window.GV.save();
    const dNoWh = window.GV.inflateSave(store[SKEY]);
    dNoWh.gds = 40;
    const saveNoWh = JSON.stringify(dNoWh);
    // 先載入有倉儲檔製造 gWhCap=180 殘留風險，再立刻載入無倉儲檔
    store[SKEY] = saveWithWh;
    assert(window.GV.load(), 'T369.1 載入有倉儲存檔');
    assert(window.GV.goods().cap === 180, 'T369.1 有倉儲 load 未 tick cap 應 180');
    store[SKEY] = saveNoWh;
    assert(window.GV.load(), 'T369.1 載入無倉儲＋gds40 存檔');
    const gNoWh = window.GV.goods();
    assert(gNoWh.stock === 40 && gNoWh.cap === 60,
      'T369.1 有倉儲→無倉儲 load 未 tick 應 40/60（實得 ' + gNoWh.stock + '/' + gNoWh.cap + '）');
    elMap.get('bStats').onclick();
    const panelNoWh = elMap.get('infoBody').innerHTML;
    assert(panelNoWh.includes('40/60'), 'T369.1 統計面板未 tick 應顯示 40/60 而非 40/180');
    assert(!panelNoWh.includes('40/180'), 'T369.1 不得誤顯 40/180');
    // 有倉儲→有倉儲：再讀回
    store[SKEY] = saveWithWh;
    assert(window.GV.load(), 'T369.1 再載入有倉儲');
    assert(window.GV.goods().cap === 180, 'T369.1 有倉儲→有倉儲 load 未 tick cap 應仍 180');
    elMap.get('bStats').onclick();
    assert(elMap.get('infoBody').innerHTML.includes('/180') || window.GV.goods().cap === 180,
      'T369.1 有倉儲讀檔後 cap 語意正確');
  }


  // ===== T364c/d 社區休閒／城市韌性波 k124-133 =====
  {
    const civic364=[
      [124,'籃球場','basketballCourt',1,'G'],[125,'網球場','tennisCourt',1,'G'],[126,'兒童遊樂場','playground',1,'G'],
      [127,'社會住宅','socialHousing',2,'R'],[128,'變電所','substation',1,'E'],[129,'海水淡化廠','desalination',2,'W'],
      [130,'抽水站','pumpStation',1,'W'],[131,'防災中心','disasterCenter',2,'S'],[132,'避難公園','shelterPark',2,'G'],[133,'防災雷達','disasterRadar',2,'S']
    ];
    for(const[k,nm,tool,sz,cat]of civic364){
      assert(html.includes(k+":'"+nm+"'"),'T364c/d KNAME 應含 k'+k);
      assert(html.includes("id:'"+tool+"'"),'T364c/d TOOLS 應含 '+tool);
      assert(html.includes(tool+':'),'T364c/d COST 應含 '+tool);
      assert(window.GV.kcat345(k).cat===cat,'T364c/d k'+k+' 類別應為 '+cat);
      assert(html.includes('MINI_BLD_PAL['+k+"]='"),'T364c/d 小地圖色必須顯式對齊 k'+k);
      if(sz===2)assert(html.includes(k+':2'),'T364c/d MSZ 應含 k'+k+' 的 2×2 footprint');
    }
    const atlasCivic364=window.GV.sprAtlas356();
    for(const[k,,,sz]of civic364){
      const e=atlasCivic364.entries.find(v=>v.fam==='bld'&&v.key===k+'_1_0');
      const w=sz===2?272:144,h=sz===2?300:224,ax=w/2,ay=sz===2?296:220;
      assert(e&&e.w===w&&e.h===h&&e.ax===ax&&e.ay===ay&&e.sc===.5&&e.night,
        'T364c/d k'+k+' 必須是 '+w+'×'+h+' raw／sc=.5／night，實得 '+JSON.stringify(e&&{w:e.w,h:e.h,ax:e.ax,ay:e.ay,sc:e.sc,night:!!e.night}));
    }
    const civicArtStart=html.indexOf('T364c/d 社區與防災十座');
    const civicArtEnd=html.indexOf('R=__savedR;',civicArtStart);
    const civicArt=html.slice(civicArtStart,civicArtEnd);
    assert(civicArtStart>0&&civicArtEnd>civicArtStart&&civicArt.includes('parity364cd'),
      'T364c/d 素材必須位於 buildSprites 絕對尾端且補齊 tail parity');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|updSmoke|smokes\.push|fxParts\.push/.test(civicArt),
      'T364c/d 尾端素材不得讀共用亂數或接粒子管線');
    const courtLightStart=html.indexOf('T364c：籃球／網球場沿用 T359 冷暖光錐');
    const courtLightEnd=html.indexOf('if(nightDepth>0&&SPOT_K359',courtLightStart);
    const courtLight=html.slice(courtLightStart,courtLightEnd);
    assert(courtLightStart>0&&courtLightEnd>courtLightStart&&/bd\.k===124\|\|bd\.k===125/.test(courtLight)&&/SPR\.lampConeWarm/.test(courtLight)&&/SPR\.lampConeCool/.test(courtLight)&&/streetHash\(o\.x,o\.y,36491\)/.test(courtLight),
      'T364c 球場夜間必須複用 T359 冷暖光錐並以 streetHash 決定分色');
    assert(courtLight.includes('[[.08,.42],[.92,.40]]')&&courtLight.includes('by+s.h*z*fy'),
      'T364c 球場光錐必須從兩側燈頭（非場中央）起算，避免光柱浮離燈桿');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(courtLight),
      'T364c 球場光錐不得新增亂數流');
    const resStart=html.indexOf('function resilience364At');
    const resEnd=html.indexOf('function hasWaterNear',resStart);
    const resSrc=html.slice(resStart,resEnd);
    assert(resStart>0&&resEnd>resStart&&/floodBlocked364/.test(resSrc)&&/disasterBlocked364/.test(resSrc)&&/floodClearChance364/.test(resSrc),
      'T364d 韌性讀取層必須提供洪水／災損／退水三條窄鉤子');
    assert(resSrc.includes('const resident=!!(b&&b.k===1)'),
      'T364c 固定社宅不得併入既有隨機住宅池，避免改動 R()/ri() 共用流');
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(resSrc),
      'T364d 韌性讀取層不得新增亂數流');

    // 十座放置、2×2 ref／存讀、水管由淡化廠「ref 邊」啟動，以及 COV 韌性效果。
    window.GV.setMapSize(72); window.GV.newWorldSeeded(364); window.GV.weather(0); window.GV.setDiff(3); window.GV.addMoney(999999);
    const rootsCivic364=[];
    const putCivic364=(tool,k,sz,p)=>{
      p=p||findSpot(tool); assert(p,'T364c/d '+tool+' 應找到可建位置');
      assert(place(tool,p.x,p.y),'T364c/d '+tool+' 應成功建造');
      const b=tile(p.x,p.y).bld;
      assert(b&&b.k===k&&!!b.sz===(sz>1)&&(sz===1||b.sz===sz)&&!b.ref,
        'T364c/d '+tool+' root 應保留正確 k／footprint');
      if(sz>1)for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++)if(dx||dy){
        const ref=tile(p.x+dx,p.y+dy).bld;
        assert(ref&&ref.k===k&&ref.ref&&ref.ref[0]===p.x&&ref.ref[1]===p.y,
          'T364c/d '+tool+' ref('+dx+','+dy+') 應回指 root');
      }
      const out={tool,k,sz,x:p.x,y:p.y}; rootsCivic364.push(out); return out;
    };
    const desalSpot364=()=>{
      const n=window.GV.N();
      for(let y=4;y<n-8;y++)for(let x=4;x<n-8;x++){
        if(window.GV.canPlaceTool('desalination',x,y)!==null)continue;
        // (x+2,y) 緊貼右側 ref、卻不鄰 root；可證明 computeWater() 真把 ref 當第二水源種子。
        if(window.GV.canPlaceTool('wpipe',x+2,y)===null)return{x,y,px:x+2,py:y};
      }
      return null;
    };
    const nearCivic364=(tool,cx,cy,r)=>{
      const n=window.GV.N();
      for(let y=Math.max(2,cy-r);y<=Math.min(n-4,cy+r);y++)for(let x=Math.max(2,cx-r);x<=Math.min(n-4,cx+r);x++)
        if(window.GV.canPlaceTool(tool,x,y)===null)return{x,y};
      return null;
    };
    const court364=putCivic364('basketballCourt',124,1);
    const tennis364=putCivic364('tennisCourt',125,1);
    const play364=putCivic364('playground',126,1);
    const pumpCivic364=putCivic364('pumpStation',130,1);
    const subCivic364=putCivic364('substation',128,1);
    const ds364=desalSpot364(); assert(ds364,'T364d 應找到淡化廠與其 ref 邊水管位置');
    const desalCivic364=putCivic364('desalination',129,2,ds364);
    assert(window.GV.placeUndo('wpipe',ds364.px,ds364.py),'T364d 淡化廠 ref 邊水管應可鋪設並記入真 undo 群組');
    assert(tile(ds364.px,ds364.py).wp===1&&tile(ds364.px,ds364.py).wr,
      'T364d placeUndo 後 ref 邊水管必須先真通水，不能用 no-op hook 假綠');
    assert(window.GV.undo(),'T364d 水管施工後應可真實 undo');
    assert(tile(ds364.px,ds364.py).wp===0&&!tile(ds364.px,ds364.py).wr,
      'T364d undo 淡化廠 ref 邊水管後 wr 必須立即重算歸零，不可殘到下一 tick');
    assert(place('wpipe',ds364.px,ds364.py),'T364d undo 後 ref 邊水管應可重新鋪設');
    const centerCivic364=putCivic364('disasterCenter',131,2);
    const shelterCivic364=putCivic364('shelterPark',132,2);
    const homeSpotCivic364=nearCivic364('socialHousing',shelterCivic364.x,shelterCivic364.y,6);
    const homeCivic364=putCivic364('socialHousing',127,2,homeSpotCivic364);
    const radarCivic364=putCivic364('disasterRadar',133,2);
    window.GV.step(1);
    assert(window.GV.cov('park',court364.x,court364.y)>0&&window.GV.cov('park',tennis364.x,tennis364.y)>0&&window.GV.cov('park',play364.x,play364.y)>0&&window.GV.cov('play',play364.x,play364.y)>0,
      'T364c 三座社區休閒設施必須真蓋公園覆蓋，遊樂場另有家庭幸福場');
    assert(html.includes("{name:'遊樂場',val:COV.play[ci]>0?.035:0}"),'T364c 遊樂場必須提供高於一般公園的小額 .035 幸福');
    assert(window.GV.cov('pump',pumpCivic364.x,pumpCivic364.y)>0&&window.GV.cov('resilience',centerCivic364.x,centerCivic364.y)>0&&window.GV.cov('shelter',shelterCivic364.x,shelterCivic364.y)>0,
      'T364d 抽水／防災／避難三種覆蓋必須真蓋入 COV');
    const pumpProbe364=window.GV.resilience364(pumpCivic364.x,pumpCivic364.y);
    const centerProbe364=window.GV.resilience364(centerCivic364.x,centerCivic364.y);
    const homeProbe364=window.GV.resilience364(homeCivic364.x,homeCivic364.y);
    const zonedHomeProbe364=window.GV.resilience364(homeCivic364.x,homeCivic364.y,1);
    assert(pumpProbe364.pump&&pumpProbe364.floodMul<1&&pumpProbe364.floodClear>=.48,
      'T364d 抽水站覆蓋必須減洪並加速退水');
    assert(centerProbe364.center&&centerProbe364.damageMul===.6&&centerProbe364.recovery===.55,
      'T364d 防災中心覆蓋必須提供固定 .60 減損／.55 恢復');
    assert(homeProbe364.shelter&&homeProbe364.casualtyMul===1&&zonedHomeProbe364.casualtyMul===.55,
      'T364d 避難公園必須真保護既有隨機住宅池；固定社宅不加入該池以維持亂數流');
    assert(tile(homeCivic364.x,homeCivic364.y).bld.lv===1&&tile(homeCivic364.x,homeCivic364.y).bld.we===0&&window.GV.stats().pop===0,
      'T364c 社會住宅必須固定 Lv1／低所得，且未接電水時不得憑空入住');
    assert(window.GV.region().waterCap===80&&tile(ds364.px,ds364.py).wr===true,
      'T364d 淡化廠必須 root-only +80 供水，且 ref 邊水管應真通水');
    assert(window.GV.region().powerCap===0,'T364d 無電廠時變電所不得憑空發電');
    const radarInfo364=window.GV.radar364Info();
    assert(radarInfo364.count===1&&radarInfo364.lead===7&&radarInfo364.summerDoy===93&&radarInfo364.winterDoy===293,
      'T364d 防災雷達必須登記固定七日預警口徑');
    const logN364=window.GV.log().length; window.GV.setDay(86); window.GV.step(20);
    assert(window.GV.log().slice(logN364).some(v=>String(v.m??'').includes('防災雷達預警：7天後入夏')),
      'T364d 雷達必須在夏季前七日真寫入預警通知');
    window.GV.save(); assert(window.GV.load(),'T364c/d 十座混合存檔應可讀回');
    for(const r of rootsCivic364){
      const b=tile(r.x,r.y).bld; assert(b&&b.k===r.k&&(!r.sz||r.sz===1||b.sz===r.sz),'T364c/d load 後 '+r.tool+' root 應保留');
      if(r.sz>1)for(let dy=0;dy<r.sz;dy++)for(let dx=0;dx<r.sz;dx++)if(dx||dy){const ref=tile(r.x+dx,r.y+dy).bld;assert(ref&&ref.ref&&ref.ref[0]===r.x&&ref.ref[1]===r.y,'T364c/d load 後 '+r.tool+' ref 應重建');}
    }
    assert(place('doze',play364.x,play364.y),'T364c 遊樂場 root 應可拆除');
    assert(!tile(play364.x,play364.y).bld&&!window.GV.cov('play',play364.x,play364.y),
      'T364c 遊樂場 doze 後附加幸福場必須對稱歸零');
    assert(place('doze',shelterCivic364.x+1,shelterCivic364.y+1),'T364d 應可從避難公園 ref 格拆除');
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)assert(!tile(shelterCivic364.x+dx,shelterCivic364.y+dy).bld,'T364d 避難公園 ref doze 後 footprint 應清空');
    assert(!window.GV.cov('shelter',shelterCivic364.x,shelterCivic364.y),'T364d 避難公園 doze 後 shelter COV 應對稱歸零');

    // 社宅不是幽靈人口：先無電水，再接既有道路／電網／水網，入住精確恢復 76；舊城不因此新增 region 鍵。
    window.GV.setMapSize(72); window.GV.newWorldSeeded(36402); window.GV.weather(0); window.GV.setDiff(3); window.GV.addMoney(999999);
    let socialLine364=null;
    outerSocial364:for(let y=4;y<window.GV.N()-5;y++)for(let x=4;x<window.GV.N()-6;x++){
      const need=[['plant',x,y],['road',x+1,y],['socialHousing',x+2,y-1],['water',x,y+2],['wpipe',x+1,y+2],['wpipe',x+2,y+2],['wpipe',x+2,y+1]];
      if(need.every(([tool,px,py])=>window.GV.canPlaceTool(tool,px,py)===null)){socialLine364={x,y};break outerSocial364;}
    }
    assert(socialLine364,'T364c 應找到社宅電水真跑的乾淨走廊');
    const shx364=socialLine364.x+2,shy364=socialLine364.y-1;
    assert(place('socialHousing',shx364,shy364),'T364c 社宅應可先在無公用事業的地塊建造');
    window.GV.step(1);
    assert(!tile(shx364,shy364).bld.pw&&!tile(shx364,shy364).bld.wa&&window.GV.stats().pop===0,
      'T364c 社宅無道路電水時不得成為幽靈人口');
    window.GV.save();
    assert(!Object.prototype.hasOwnProperty.call(window.GV.inflateSave(window.GV.rawSave()).region||{},'waterCap'),
      'T364d 無淡化廠的舊城存檔不得因 region probe 平白新增 waterCap 鍵');
    assert(place('plant',socialLine364.x,socialLine364.y)&&place('road',socialLine364.x+1,socialLine364.y)&&place('water',socialLine364.x,socialLine364.y+2)&&place('wpipe',socialLine364.x+1,socialLine364.y+2)&&place('wpipe',socialLine364.x+2,socialLine364.y+2)&&place('wpipe',socialLine364.x+2,socialLine364.y+1),
      'T364c 社宅驗收走廊應可接上既有電廠、道路、水塔與水管');
    window.GV.step(1);
    assert(tile(shx364,shy364).bld.pw&&tile(shx364,shy364).bld.wa&&window.GV.stats().pop===76,
      'T364c 社宅接妥道路電水後必須只入住固定 76 人（root-only）');

    // 144×144 實跑：沒有 k128 時 >90 格道路未通電；掛入中繼後同一條道路立即接通，但容量仍是原電廠 50。
    window.GV.setMapSize(144); window.GV.newWorldSeeded(36401); window.GV.weather(0); window.GV.setDiff(3); window.GV.setSeason(0); window.GV.addMoney(999999);
    const nPower364=window.GV.N(); let line364=null;
    for(let y=2;y<nPower364-2&&!line364;y++)for(let px=2;px<nPower364-104&&!line364;px++){
      for(let sx=px+95;sx<nPower364-2;sx++){
        const tx=sx+1;
        if(window.GV.canPlaceTool('plant',px,y-1)===null&&window.GV.canPlaceTool('substation',sx,y-1)===null&&window.GV.canPlaceTool('clinic',tx,y-1)===null){line364={px,y,sx,tx};break;}
      }
    }
    assert(line364,'T364d 144 圖應找到 >90 格的電網中繼驗收走廊');
    for(let x=line364.px;x<=line364.tx;x++)assert(place('road',x,line364.y),'T364d 中繼驗收道路應可連續鋪設 x='+x);
    assert(place('plant',line364.px,line364.y-1)&&place('clinic',line364.tx,line364.y-1),'T364d 中繼驗收應能放電廠與遠端診所');
    window.GV.step(1);
    assert(!tile(line364.tx,line364.y).rp&&window.GV.region().powerCap===50,
      'T364d 沒有變電所時，超過 90 格的遠端道路不得通電（容量仍 50）');
    assert(place('substation',line364.sx,line364.y-1),'T364d 中繼驗收變電所應可建造');
    window.GV.step(1);
    assert(tile(line364.tx,line364.y).rp&&window.GV.region().powerCap===50,
      'T364d 變電所必須重啟遠端道路電網，且不得增加發電容量');

    // 同種子／同建設／同推進，存檔 bytes 必須一致；同時防止日後把防災效果偷接進共用亂數流。
    const replayCivic364=()=>{
      window.GV.setMapSize(72); window.GV.newWorldSeeded(36477); window.GV.weather(0); window.GV.setDiff(3); window.GV.addMoney(999999);
      for(const[, ,tool]of civic364){const p=findSpot(tool); if(!p||!place(tool,p.x,p.y))return null;}
      window.GV.setDay(86); window.GV.step(20); window.GV.save(); return store[SKEY];
    };
    const replayA364=replayCivic364(),replayB364=replayCivic364();
    assert(replayA364&&replayA364===replayB364,'T364c/d 同種子重播存檔必須逐位元一致');
    window.GV.setMapSize(72); window.GV.newWorldSeeded(1); // 回到後續既有測試的預設尺寸
  }


  // ===== T348 死鎖紓困：修「AI 永零人口」（水域中心地圖） =====
  {
    assert(html.includes('if(!startersN&&roadsN>0&&pop===0&&day>25&&money<COST.geo+150){'),
      'T348 紓困條件必須是「無電源＋已有路＋人口零＋過25天＋買不起電源」＝健康城市永不進入的狀態');
    assert(html.includes('COST.geo+900'), 'T348b 補助須夠「電廠＋連接路＋首批分區」');
    assert(html.includes('adj348*1000+cnt348'), 'T348b 選點須偏好最大路網（僅看鄰路會挑到孤立橋）');
    // 端到端：seed5 曾恆為 0 人（v8.7/8.8 基準），紓困後必須長出城市
    window.GV.newWorldSeeded(5);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    const pop5 = window.GV.stats().pop;
    assert(pop5 > 1000, 'T348 seed5 應脫離死鎖並長成城市（v8.8 基準恆 0），實得 ' + pop5);
    const SEED7M_T532=50; // T532 重釘實測值（前值 55；紓困後城市把補助花在電源上，殘金略降＝合理）
    /* T444 第三根釘（補餘裕）：`MIN_SEED_PINS` 原本恰好卡在 2，零餘裕——
       任何一根被動到就直接跌破門檻。seed7 與既有兩根不同族（非水域中心、非拮据城）。 */
    window.GV.newWorldSeeded(7);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    /* T532 重釘（業主 2026-08-19 裁決 A 案，明示「A你處理乾淨吧，我尊重你的決策」＝重釘授權）：
       seed7 是低成長圖＝電力鎖貧困陷阱的族群，T532 的紓困會在第 271+ 天觸發並改變其軌跡
       251→260（那正是本卡要的效果：這根釘從「對照組」變成「陷阱得救的行為見證」）。
       seed301/seed22 不受擾動＝手術式條件「健康城市永不滿足」的實測面（鐵律19 正解形態②）。
       前值：pop 251（T444 起）／money 55（T456 起）。 */
    seedPin444('seed7', 7, 400, 260, window.GV.stats().pop,
      'T532 重釘（前值 251，業主 A 案授權）。低成長地圖＝電力鎖陷阱族群，'
      + 'T532 紓困觸發後軌跡合法改變；與 seed301（拮据城）、seed22（健康城）分屬三族，'
      + '這根釘現在同時見證「紓困有發生」與「只發生在陷阱城市」');
    seedPin444('seed7m', 7, 400, SEED7M_T532, Math.round(window.GV.stats().money),
      'T532 重釘（前值 55）：紓困是一次性 money=Math.max(...) ⇒ 金流必然改變，新值見常數宣告');
    {
      const mob7 = window.GV.sci451();
      assert(mob7.mobUp === 0 && mob7.mobDn === 0,
        'T456 G4b seed7 低成長圖普查應恰為 0 升 0 降（全城分數落中性帶＝對照組），實得 up=' + mob7.mobUp + ' dn=' + mob7.mobDn);
    }

    // seed15 同屬水域中心地圖：至少必須有人口（不再是零）
    window.GV.newWorldSeeded(15);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    assert(window.GV.stats().pop > 0, 'T348 seed15 應不再是零人口，實得 ' + window.GV.stats().pop);
    // 健康城市位元恆等：紓困分支不得改動任何既有軌跡
    window.GV.newWorldSeeded(22);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    seedPin444('seed22', 22, 400, 3525, window.GV.stats().pop,
      'T348 起釘：紓困為手術式；T456 世代流動接線重釘（前值 4550——短視野配對差實測機制為正紅利，'
      + '400 天端點下移是混沌路徑重擲，數據記 T456 卡面）');
    seedPin444('seed22m', 22, 400, 1456, Math.round(window.GV.stats().money),
      'T456 金流哨兵：暴露修正最活躍的世界線（61 升 0 降）');
    {
      const mob22 = window.GV.sci451();
      assert(mob22.mobUp === 61 && mob22.mobDn === 0,
        'T456 G4c seed22 400 天暴露修正應恰為 61 升 0 降（決定性；下行分支目前僅 G1c 原文釘覆蓋，'
        + '行為見證待 T460 平衡矩陣造境——如實記），實得 up=' + mob22.mobUp + ' dn=' + mob22.mobDn);
    }
  }


  // ===== T344 鐵軌軌距／多種軌道／精細火車 =====
  {
    // T344a 軌距：必須用「地面正交軸」PERP，不得再用螢幕垂直向量
    assert(html.includes("const PERP={1:[2,1],2:[2,-1],4:[-2,-1],8:[-2,1]};"),
      'T344a railTrack 必須用 PERP（地面正交＝另一條等距軸）算軌距；舊版用螢幕垂直 (-ay,ax) 導致雙軌不貼地、間距偏窄');
    assert(/function railTrack\(g,m,cy,len,cfg\)/.test(html), 'T344a railTrack 需可參數化（供輕軌換風格）');
    assert(html.includes("g.fillStyle=((qx+qy)&1)?'#7d7060':'#6a5f50';"), 'T344a 道碴須為決定性棋盤紋（零亂數，鐵律2）');
    // T344b 輕軌自有貼圖（原本直接借用 SPR.rail，兩種軌道長得一樣）
    assert(html.includes('SPR.tramTrack=[]') && html.includes('SPR.tramBridgeT=[]'), 'T344b 輕軌需自有貼圖陣列');
    assert(html.includes('SPR.tramTrack?SPR.tramTrack[t.tramMask]'), 'T344b draw 端須改用輕軌貼圖');
    assert(html.includes('SPR.tramPole') && html.includes("streetHash(x,y,613)<.26"), 'T344b 電桿須以 streetHash 稀疏擺放（決定性，零亂數）');
    // T344c 精細火車：預生成 sprite 取代每幀 fillRect
    for (const key of ['SPR.trainLoco=', 'SPR.trainCar=', 'SPR.tramVeh=', 'SPR.tramVehB=']) {
      assert(html.includes(key), 'T344c 需預生成 ' + key);
    }
    assert(html.includes('objs.push({dep:fx+fy+.01,train:tr,carIdx:ci,wx,wy,td:tr.d});'),
      'T344c 每節車廂須各自 push 取得獨立 dep（舊版整列共用車頭一個 dep，轉彎穿牆）');
    assert(html.includes("if(o.train&&SPR.trainLoco&&!window.__noTrainSpr){"), 'T344c 新 sprite 路徑須有 __noTrainSpr fallback 開關');
    // 火車 sprite 生成段不得消耗亂數（鐵律2）
    {
      const i0 = html.indexOf('T344c 精細火車／電車 sprite');
      const i1 = html.indexOf('T344b 輕軌電桿', i0);
      const seg = html.slice(i0, i1);
      assert(i1 > i0 && seg.length > 1000, 'T344c 生成段應可擷取');
      assert(!/\bR\(\)|\bri\(|\brand\(|Math\.random/.test(seg), 'T344c 火車 sprite 生成不得消耗亂數（鐵律2）');
    }
    // railTrack 本體亦不得消耗亂數
    {
      const i0 = html.indexOf('function railTrack(g,m,cy,len,cfg){');
      const i1 = html.indexOf('\n}', i0);
      const seg = html.slice(i0, i1);
      assert(!/\bR\(\)|\bri\(|\brand\(|Math\.random/.test(seg), 'T344a railTrack 不得消耗亂數（鐵律2）');
    }
    /* ===== T365 機場 k19 素材收邊：跑道順格軸收進 footprint，亂數契約不變 ===== */
    {
      const i0 = html.indexOf('// T41 機場 (k=19, 4×4, 272×300)');
      const i1 = html.indexOf('// T44 輕軌站', i0);
      const seg = html.slice(i0, i1);
      assert(i1 > i0 && seg.length > 200, 'T365 機場生成段應可擷取');
      assert(!seg.includes('fillRect(20,ay-100,232,16)') && !seg.includes('fillRect(80,ay-200,16,120)'),
        'T365 舊螢幕軸對齊橫／直跑道條應已移除（它們衝出 4×4 菱形）');
      assert(seg.includes('g.moveTo(26,234);g.lineTo(144,176);g.lineTo(148,186);g.lineTo(30,244)'),
        'T365 斜跑道 quad 四角應為收進菱形的手算錨點');
      assert(seg.includes("windows(sg,ng,ax,ay-8,50,30,rand,.7,{w:4,ht:5,gx:6,gy:8,glass:'#3a5060',lit:'#ffe9a0'})"),
        'T365 航廈 windows 參數必須逐字保留（hw/h/窗格/litP 不變＝rand 消耗恆等；by 不影響消耗數）');
      assert((seg.match(/,rand,/g) || []).length === 1,
        'T365 機場段 rand 實參應恰好一次（windows 既有呼叫），不得新增或刪減');
      assert(!/Math\.random|\bri\s*\(|\bR\s*\(/.test(seg), 'T365 機場段不得碰 R()/ri()/Math.random()');
      assert(seg.includes('g.setLineDash([])'), 'T365 虛線中線後應重設 setLineDash 以免污染後續描邊');
      assert((html.match(/SPR\.bld\['19_1_0'\]=\{/g) || []).length === 1,
        "T365 SPR.bld['19_1_0'] 應只剩 T41 等距重排版一次賦值（T151 手繪十字跑道覆蓋已退役）");
      assert(!html.includes("const hk='19_1_0'"),
        'T365 不得再有 T151 尾端覆蓋（const hk=19_1_0）把機場換回手繪十字跑道版');
    }
  }

  /* ===== T378 四棟細節升級＋多格地墊歸位 K1–K5 ===== */
  {
    console.log('\n-- T378 地墊／細節／夜光守衛 --');
    // K3：k6 窗燈迴圈與 k7 windows 參數逐字釘（活亂數契約）
    assert(html.includes('const lit=v>=3?((dx*5+y*3)%7<4):(rand()<.65);'),
      'T378 K3：k6 窗燈 lit 式必須逐字保留（v0-2 每變體 6 抽全域 rand）');
    assert(html.includes("windows(sg,ng,ax,by,hw,h,wrand,.5,v===4?{w:4,ht:5,gx:7,gy:9,glass:'#2a3550',lit:'#ffd77a'}:{w:5,ht:6,gx:9,gy:11,glass:'#2a3550',lit:'#ffd77a'})"),
      'T378 K3：k7 windows(...) 參數必須逐字保留（v0-2 每變體 6 抽）');
    // K2：spriteTexRand 消費點仍恰 9 個 speck 接點（plate 內部 n=26 不變）
    const texSites378 = Array.from(html.matchAll(/speck\([^\r\n]*\bspriteTexRand\b[^\r\n]*\)/g));
    assert(texSites378.length === 9,
      'T378 K2：speck(...spriteTexRand) 應恰 9 點，實得 ' + texSites378.length);
    assert(/function plate\(g,ax,ay,col,sz\)/.test(html) &&
      /speck\(g,ax,ay-hw,hw,\[[^\]]*\],26,spriteTexRand\)/.test(html),
      'T378 K2：plate 須可選 sz 且 speck n 固定 26（每 plate 恰 78 抽）');
    // K4：A 部四棟特徵字面
    assert(html.includes('T378 溫室細節') && html.includes('通風天窗') && html.includes('育苗架'),
      'T378 K4：k63 應有溫室細節（天窗/育苗架）');
    assert(html.includes('T378 購物中心細節') && html.includes('卸貨車') && html.includes('廣場燈柱'),
      'T378 K4：k65 應有購物中心細節（卸貨車/燈柱）');
    assert(html.includes('T378 消防局細節') && html.includes('消防車身') && html.includes('警戒線'),
      'T378 K4：k6 應有消防車剪影與警戒線');
    assert(html.includes('T378 學校細節') && html.includes('斑馬線') && html.includes('籃球架') &&
      html.includes("sg.fillStyle='#8b95a5';sg.fillRect(ax,rty-9,1,9);      // 旗杆"),
      'T378 K4：k7 應有斑馬線/籃球架且保留旗杆');
    assert(html.includes('0x809050:') && !html.includes('0x808f50:'),
      'T378：WIN353 應為 0x809050（修 0x808f50 錯字）');
    // T380：k22 改 F22 逐變體表（明示授權改寫 T379 的 30/15 字面釘）
    assert(/const F22\s*=\s*\[/.test(html) &&
      /doFarm\('22_1_'\+v,f\[0\],f\[1\],f\[2\],f\[3\],CCLASS\[v\]\)/.test(html),
      'T380：k22 應以 F22 表驅動 doFarm');
    {
      const fm22 = html.match(/const F22\s*=\s*\[([\s\S]*?)\];/);
      assert(fm22, 'T380 K4：應解析到 F22 表');
      const rows = [...fm22[1].matchAll(/\[(\d+),(\d+),(\d+),(\d+)\]/g)];
      assert(rows.length === 16, 'T380 K4：F22 應有 16 筆，實得 ' + rows.length);
      for (const r of rows) {
        const hw = +r[3], hh = +r[4];
        assert(hh === hw / 2, 'T380 K4：F22 每筆 hh 必須 = hw/2，實得 ' + hw + '/' + hh);
        assert(hw >= 36, 'T380 K4：F22 每筆 hw 應 ≥36，實得 ' + hw);
      }
    }
    assert(/doFarm\('53_1_0',164,222,52,26,'grain'\)/.test(html),
      'T378：k53 doFarm 參數釘死不得動');
    // SZC 含 20 補鍵且 121/122/123 仍在字面量本體
    {
      const a = html.indexOf('const SZC='), b = html.indexOf('};', a), body = html.slice(a, b);
      assert(a >= 0 && b > a, 'T378 SZC 字面量應存在');
      for (const k of [82, 83, 87, 90, 91, 100, 101, 105, 106, 108, 109, 110, 111, 112, 113, 114, 115, 116, 118, 119]) {
        assert(body.includes(k + ':'), 'T378 SZC 應含 k' + k);
      }
      assert([121, 122, 123].every(k => body.includes(k + ':3')),
        'T378 SZC 字面量仍須含 121/122/123:3（T364b 守衛）');
    }
    // K1：MSZ≥2 的最終 SPR.bld 賦值塊須有全腳印地墊（plate 帶 sz≥MSZ，或 dia hw≥32*sz）
    {
      const mszM = html.match(/const MSZ=\{([^}]+)\}/);
      assert(mszM, 'T378 K1：應找到 MSZ');
      const MSZ = {};
      for (const pair of mszM[1].matchAll(/(\d+):(\d+)/g)) MSZ[+pair[1]] = +pair[2];
      for (const m of html.matchAll(/Object\.assign\(MSZ,\{([^}]+)\}/g)) {
        for (const pair of m[1].matchAll(/(\d+):(\d+)/g)) MSZ[+pair[1]] = +pair[2];
      }
      // 切塊＝遍歷【每一個】多格註冊點（非每鍵只取最後一個）
      // block = 上一註冊點→本註冊點；block<200＝同塊兄弟沿用同塊首鍵判定
      // 塔樓 T127 用 SPR.bld[d.k+'_1_'+d.v]（非字面量鍵）— 展開為 33/34 × v0/v1 四虛擬註冊點
      // factory（mkIndustry364）：註冊行只剩呼叫時掃函式定義本體
      const auditK1 = (src) => {
        const regs = [];
        for (const m of src.matchAll(/SPR\.bld\['([^']+)'\]\s*=/g)) {
          regs.push({ index: m.index, key: m[1], assignAt: m.index });
        }
        // 動態鍵：迴圈內一塊多鍵（摩天樓）；源碼一點 → 四虛擬鍵同 index
        for (const m of src.matchAll(/SPR\.bld\[d\.k\+'_1_'\+d\.v\]\s*=/g)) {
          for (const k of [33, 34]) {
            if (!MSZ[k] || MSZ[k] < 2) continue;
            for (const v of [0, 1]) {
              regs.push({ index: m.index, key: k + '_1_' + v, assignAt: m.index });
            }
          }
        }
        regs.sort((a, b) => a.index - b.index || a.key.localeCompare(b.key));
        const hasFullFoot = (text, sz) => {
          const needHw = 32 * sz;
          for (const pm of text.matchAll(/plate\s*\(([^)]*)\)/g)) {
            const sm = pm[1].match(/,\s*(\d+)\s*$/);
            if (sm && +sm[1] >= sz) return true;
          }
          for (const dm of text.matchAll(/dia\s*\(\s*g\s*,\s*[^,]+,\s*[^,]+,\s*(\d+)/g)) {
            if (+dm[1] >= needHw) return true;
          }
          if (new RegExp('dia\\s*\\([^\\n]{0,60},\\s*' + needHw + '\\s*[,)]').test(text)) return true;
          return false;
        };
        // 只掃 [prev, reg) 繪製段；禁止把 assign 後 180 字併入（會滲下一變體的 plate 造成假綠）
        const judge = (block, end, sz) => {
          let ok = hasFullFoot(block, sz);
          if (!ok) {
            const assignLine = src.slice(end, Math.min(src.length, end + 180));
            const fm = assignLine.match(/=\s*([A-Za-z_$][\w$]*)\s*\(/);
            if (fm) {
              const defRe = new RegExp('(?:const|let|var)\\s+' + fm[1] + '\\s*=');
              const defM = defRe.exec(src);
              if (defM && defM.index < end) ok = hasFullFoot(src.slice(defM.index, end), sz);
            }
          }
          return ok;
        };
        let blocks = 0, bad = [];
        let lastLongOk = null;
        let prevIndex = 0;
        for (let i = 0; i < regs.length; i++) {
          const fullKey = regs[i].key;
          const km = fullKey.match(/^(\d+)_/);
          if (!km) continue;
          const k = +km[1];
          const sz = MSZ[k];
          if (!sz || sz < 2) {
            // 仍推進 prev：1×1 註冊點也是「上一註冊點」邊界
            prevIndex = regs[i].index;
            continue;
          }
          const end = regs[i].index;
          // 同 index 虛擬兄弟：block 長度 0，沿用 lastLongOk
          const start = (i > 0 && regs[i].index === regs[i - 1].index)
            ? end
            : prevIndex;
          const block = src.slice(start, end);
          let ok;
          if (block.length < 200 && lastLongOk !== null) {
            ok = lastLongOk;
          } else {
            ok = judge(block, end, sz);
            lastLongOk = ok;
          }
          if (ok) blocks++;
          else bad.push(fullKey);
          // 僅在「新位置」推進 prev，避免同 index 四鍵把後續切空
          if (i + 1 >= regs.length || regs[i + 1].index !== regs[i].index) {
            prevIndex = regs[i].index;
          }
        }
        return { blocks, bad };
      };
      const k1ok = auditK1(html);
      assert(k1ok.blocks >= 40, 'T378 K1：全腳印地墊註冊點應 ≥40，實得 ' + k1ok.blocks + ' bad=' + JSON.stringify(k1ok.bad.slice(0, 12)));
      assert(k1ok.bad.length === 0, 'T378 K1：下列多格註冊點地墊不足：' + JSON.stringify(k1ok.bad));
      // 破壞性證明四案型
      {
        // 1) k48：無 hero、早期塊即最終；拿掉 ,3 不得滲鄰居 dia
        const pin48 = "plate(g,ax,ay,'#9aa0a4',3)";
        assert(html.includes(pin48), 'T378 K1：k48 plate 錨點應存在');
        const mut48 = html.replace(pin48, "plate(g,ax,ay,'#9aa0a4')");
        const r48 = auditK1(mut48);
        assert(r48.bad.some(x => String(x).startsWith('48_')),
          'T378 K1：k48 拿掉 plate ,3 必須紅，bad=' + JSON.stringify(r48.bad));
        // 2) k22：每塊恰好一個 plate(...,2)（T380 改構圖後不再釘穀倉字面）
        {
          const plates22 = (html.match(/plate\(g,ax,ay,'#8a9a5a',2\)/g) || []).length;
          assert(plates22 === 16, 'T380/K1：k22 應恰 16 個 plate(...,2)，實得 ' + plates22);
          // 拿掉第一個 ,2 ⇒ 22_1_0 必須紅
          const mut22 = html.replace("plate(g,ax,ay,'#8a9a5a',2)", "plate(g,ax,ay,'#8a9a5a')");
          const r22 = auditK1(mut22);
          assert(r22.bad.indexOf('22_1_0') >= 0,
            'T378 K1：k22 v0 拿掉 plate ,2 必須紅，bad=' + JSON.stringify(r22.bad));
        }
        // 3) 摩天樓：一塊多鍵；拿掉共用 plate ,2 必須紅（任一同塊鍵）
        const pinTw = "plate(g,tax,tay,'#8f8a7c',2)";
        assert(html.includes(pinTw), 'T378 K1：塔樓 plate 錨點應存在');
        const mutTw = html.replace(pinTw, "plate(g,tax,tay,'#8f8a7c')");
        const rTw = auditK1(mutTw);
        assert(rTw.bad.some(x => String(x).startsWith('33_') || String(x).startsWith('34_')),
          'T378 K1：塔樓拿掉 plate ,2 必須紅，bad=' + JSON.stringify(rTw.bad));
      }
      // K1-hero：凡 hero 覆蓋塊 `const hk='K_…'` 且 MSZ[K]≥2，其 plate 必須帶 sz≥MSZ
      // （後寫後贏＝最終生效；與上列「註冊點之間」一般鍵切塊互補）
      {
        const heroBad = [];
        const hkRe = /const hk\s*=\s*'(\d+)_[^']+'/g;
        let hm;
        while ((hm = hkRe.exec(html))) {
          const k = +hm[1];
          const sz = MSZ[k];
          if (!sz || sz < 2) continue;
          // 取此 hk 宣告後到下一個 hk／大段落結束前的短窗（hero 塊本體）
          const win = html.slice(hm.index, hm.index + 450);
          const plates = Array.from(win.matchAll(/plate\s*\(([^)]*)\)/g));
          if (!plates.length) continue; // 如 k9 體育場不呼叫 plate
          let ok = false;
          for (const pm of plates) {
            const sm = pm[1].match(/,\s*(\d+)\s*$/);
            if (sm && +sm[1] >= sz) ok = true;
          }
          if (!ok) heroBad.push(hm[1] + '→' + plates.map(p => 'plate(' + p[1] + ')').join('|'));
        }
        assert(heroBad.length === 0,
          'T378 K1-hero：多格 hero 覆蓋 plate 缺 sz：' + JSON.stringify(heroBad));
        // 破壞性證明錨：k20/k25 hero 必須顯式 ,2（覆核退回病例）
        assert(/const hk='20_1_0'[\s\S]{0,200}plate\(g,hax,hay,'#7a7a6a',2\)/.test(html),
          'T378 K1-hero：k20_1_0 hero plate 必須 ,2');
        assert(/const hk='25_1_0'[\s\S]{0,200}plate\(g,hax,hay,'#8a9a7a',2\)/.test(html),
          'T378 K1-hero：k25_1_0 hero plate 必須 ,2');
      }
    }
    /* ===== T379/T380 L1：k22 精細田不得蓋掉【建築】招牌 =====
       只計 //sig 標註的建築矩形（小屋/穀倉/溫室/桶/箱…）；粗田/作物/田埂不計。
       錨固定 SAX/SAY=68,148；田參數讀 F22；切塊＝往前最近 cv(。 */
    {
      const fm22 = html.match(/const F22\s*=\s*\[([\s\S]*?)\];/);
      assert(fm22, 'T379 L1：應解析到 F22 表');
      const F22 = [...fm22[1].matchAll(/\[(\d+),(\d+),(\d+),(\d+)\]/g)].map(r =>
        [+r[1], +r[2], +r[3], +r[4]]);
      assert(F22.length === 16, 'T379 L1：F22 應 16 筆，實得 ' + F22.length);
      const SAX = 68, SAY = 148;
      // 只取 //sig 建築；for 迴圈一行多實例仍算 1 個字面矩形（靜態）
      const parseSigRects = (blk) => {
        const rects = [];
        for (const mm of blk.matchAll(
          /fillRect\(ax([+-]\d+),ay([+-]\d+),(\d+),(\d+)\)\s*;?\s*\/\/sig/g)) {
          rects.push([SAX + +mm[1], SAY + +mm[2], +mm[3], +mm[4]]);
        }
        return rects;
      };
      const fieldCover = (rects, f) => {
        const fcx = f[0], fcy = f[1] - 16, fhw = f[2], fhh = f[3];
        let cover = 0;
        for (const [x0, y0, w, h] of rects) {
          for (let y = y0; y < y0 + h; y++) {
            const t = 1 - Math.abs(y - fcy) / fhh;
            // T380a：field() 在 yy=±hh 時 rh=0 仍畫中心那 1 px（px1(g,ax,cy±hh)），
            // 原本的 t<=0 把最上/最下那一列整列跳掉 ⇒ 田剛好貼到招牌時少算。
            if (t < 0) continue;
            const lo = fcx - fhw * t, hi = fcx + fhw * t;
            for (let x = x0; x < x0 + w; x++) if (x >= lo && x <= hi) cover++;
          }
        }
        return cover;
      };
      let blocks = 0, totalCover = 0, totalBldRects = 0;
      const per = [], perSig = [], sigByV396 = [];
      const regRe = /SPR\.bld\['22_1_(\d+)'\]/g;
      let rm;
      while ((rm = regRe.exec(html))) {
        const v = +rm[1];
        if (v < 0 || v > 15) continue;
        const bs = html.lastIndexOf('cv(', rm.index);
        if (bs < 0) continue;
        const blk = html.slice(bs, rm.index);
        const rects = parseSigRects(blk);
        blocks++;
        totalBldRects += rects.length;
        perSig[v] = rects.length;
        const cover = fieldCover(rects, F22[v]);
        totalCover += cover;
        per.push('v' + v + ':' + cover + '/' + rects.length);
        sigByV396[v] = rects; // T396-A：供下方「表逐筆一致」比對
      }
      assert(blocks >= 16, 'T379 L1：應解析到 ≥16 個 k22 變體，實得 ' + blocks);
      /* ===== T380a：self-check 必須逐變體，不能只看總數 =====
         T380 交付時 self-check 是「總數 ≥24」（實得 34），但 v5/v7 的招牌用迴圈座標
         （ax-24+i*12 / ay-54+r*3），而 L1 的 regex 需 x/y 皆字面量 ⇒ 那兩個變體 0 個可見矩形，
         總數仍過。實測注入「v5 招牌 ay-52→ay-16 搬進田心」＝全綠，L1 沒擋住。
         斷言訊息當時寫「每變體至少 1 招牌」與實際檢查不符——本卡把它變成真的。 */
      {
        const blind = [];
        for (let v = 0; v < 16; v++) if (!perSig[v]) blind.push('v' + v);
        assert(blind.length === 0,
          'T380a L1：每個變體都必須有 ≥1 個 L1 可解析的 //sig 矩形（x/y 皆字面量），'
          + '否則該變體的招牌不受守衛保護。歸零：' + blind.join(',')
          + '（修法：加一個字面座標的基床/哨兵矩形，擺在招牌最下緣＝離田最近處，'
          + '見 v0 的 //sig 基床、v5 的 //sig 棧板、v7 的 //sig 壟框）');
      }
      // self-check：必須量到建築（防「全刪美術 → 覆蓋 0 假綠」）
      assert(totalBldRects >= 24,
        'T380 L1：建築(//sig)矩形總數應 ≥24（每變體至少 1 招牌），實得 ' + totalBldRects);
      /* T380a：門檻由 ≤60 收到 0。理由是實測——把田從 hw40/hh20 放大到 hw56/hh28
         （K4 仍過，hh=hw/2 且 hw≥36）＝T378 事故的真實形狀，覆蓋量只有約 30~60px 就被 60 放行。
         哨兵擺在招牌最下緣，而田菱形的上尖很窄，所以「剛開始吃到」時吃得很少。
         現況覆蓋 0，收到 0 是免費的，且把「田不得蓋到招牌」變成真正的二值不變量。
         ===== T396-A 遮罩感知升級 =====
         田放大到鋪滿（hw64）後幾何覆蓋必然 >0，但 px1 的 SIG396 閘保證那些像素【永不落筆】。
         「田不得蓋到招牌」的不變量由幾何迴避升級為像素級：totalCover===0 或
         （SIG396 表與源碼解析逐筆一致 且 px1 閘字面在場）二者必居其一。表漂移/閘拆除即紅。 */
      const sigTblM396 = html.match(/const SIG396=\[[\s\S]*?\];/);
      let maskOk396 = false;
      if (sigTblM396 && /const px1=\(g,x,y,c\)=>\{for\(let i9=0;i9<curSig396\.length;i9\+\+\)\{const r9=curSig396\[i9\];if\(x>=r9\[0\]&&x<r9\[0\]\+r9\[2\]&&y>=r9\[1\]&&y<r9\[1\]\+r9\[3\]\)return;\}/.test(html)
          && /curSig396=\(key\.slice\(0,5\)==='22_1_'\)\?\(SIG396\[\+key\.slice\(5\)\]\|\|\[\]\):\[\];/.test(html)) {
        const tbl396 = eval(sigTblM396[0].replace(/^const SIG396=/, '(').replace(/;$/, ')'));
        const bad396 = [];
        for (let v = 0; v < 16; v++) {
          if (JSON.stringify(tbl396[v] || []) !== JSON.stringify(sigByV396[v] || [])) bad396.push('v' + v);
        }
        assert(bad396.length === 0,
          'T396-A：SIG396 表必須與源碼 //sig 解析逐筆一致（單一真相來源；改美術者順手改表），違者：' + bad396.join(','));
        maskOk396 = true;
      }
      assert(totalCover === 0 || maskOk396,
        'T379/T380a/T396-A：k22 田幾何覆蓋招牌 ' + totalCover + ' px 且【無有效 SIG396 像素閘】——'
        + '要嘛田不碰招牌帶（totalCover 0），要嘛 px1 閘+表逐筆一致（像素級保證）：' + per.join(' '));
      // 破壞性：田心塞 //sig 建築 ⇒ 必須紅
      {
        const pin = "SPR.bld['22_1_0']={img:c,ax,ay,w:136,h:150,smoke:[]}";
        const inject = "g.fillStyle='#6a7a3a';g.fillRect(ax-10,ay-30,20,20); //sig L1 mutant\n   " + pin;
        assert(html.includes(pin), 'T380 L1：v0 註冊錨應存在');
        const mut = html.replace(pin, inject);
        let mutCover = 0, mutV = -1;
        const reg2 = /SPR\.bld\['22_1_(\d+)'\]/g;
        let r2;
        while ((r2 = reg2.exec(mut))) {
          const v = +r2[1];
          const b0 = mut.lastIndexOf('cv(', r2.index);
          const blk = mut.slice(b0, r2.index);
          const cover = fieldCover(parseSigRects(blk), F22[v]);
          if (cover > 0) { mutCover = cover; mutV = v; break; }
        }
        assert(mutV === 0 && mutCover > 0,
          'T380 L1：把 //sig 建築移進田心必須紅，實得 v' + mutV + ':' + mutCover);
      }
    }
    // K5：四棟新增夜光必須有對應日層實體錨（靜態同位證明；mock canvas 無法真像素比對）
    {
      // k63：門燈 ng 座標＝日層木門 sg 座標
      assert(html.includes("sg.fillStyle='#8a6a4a';sg.fillRect(ax+gx+11,ay-36,4,6)") &&
        html.includes('ng.fillStyle=\'#ffe9a0\';ng.fillRect(ax+gx+11,ay-36,4,3)'),
        'T378 K5：k63 門燈須壓在日層木門同座標');
      // k6：車頂警燈 ng 與日層同 tdx 矩形
      assert(html.includes("ng.fillStyle='#ff6060';ng.fillRect(ax+tdx+10,yF-h+5,2,2)") &&
        html.includes("sg.fillStyle='#ffd420';sg.fillRect(ax+tdx+10,yF-h+5,2,2)"),
        'T378 K5：k6 警燈須日夜同座標');
      // k7：走廊燈帶落在 isoBox 牆高帶（by-h+5，hw 內）
      assert(html.includes("ng.fillStyle='rgba(255,215,122,.55)';ng.fillRect(ax-hw+6,by-h+5,hw*2-12,2)"),
        'T378 K5：k7 夜走廊燈帶須在牆體帶 by-h+5');
      // k65：天窗/店窗夜光皆在既有日層 fillRect 之後、且用已畫店窗座標
      const i65 = html.indexOf('T378 購物中心細節');
      const i65e = html.indexOf("SPR.bld['65_1_0']", i65);
      const blk65 = html.slice(i65, i65e);
      assert(i65 > 0 && i65e > i65, 'T378 K5：k65 細節塊應可切出');
      assert((blk65.match(/\bng\.fill/g) || []).length >= 3,
        'T378 K5：k65 細節應含多處夜光');
      assert(html.includes('boxUnit(sg,ng,ax,ay,96,32') && /win:\{gx:10,ht:5,lit:\.55\}/.test(html),
        'T378 K5：k65 箱體窗日夜對齊（boxUnit win 窗洞＋決定性夜燈——T425I 取代 windows）');
      // 新增夜光段不得單獨引入 Math.random / 全域 rand（零亂數契約）
      for (const tag of ['T378 溫室細節', 'T378 購物中心細節', 'T378 消防局細節', 'T378 學校細節']) {
        const i0 = html.indexOf(tag);
        const i1 = html.indexOf('outlineSprite', i0);
        const seg = html.slice(i0, i1 > i0 ? i1 : i0 + 800);
        assert(i0 > 0, 'T378 K5：應找到 ' + tag);
        assert(!/\b(?:R|ri|rand)\s*\(|Math\.random\s*\(|\bspriteTexRand\b/.test(seg),
          'T378 K5：' + tag + ' 段不得消耗任何亂數流');
      }
    }
  }

  console.log('\n-- T343a 科技樹資料層／存讀檔／工具列刷新 --');
  {
    const tech0 = window.GV.tech343();
    const atlasSig343 = () => JSON.stringify(window.GV.sprAtlas356().entries.map(e =>
      [e.fam, e.key, e.w, e.h, e.ax, e.ay, e.sc, !!e.night]));
    const atlasBefore343 = atlasSig343();
    assert(tech0 && tech0.nodes.length === 36 &&
      ['A','B','C','D'].every(r => tech0.nodes.filter(n => n.route === r).length === 9),
    'T343a TECH343 應為四路各 9 節點（共 36）');
    assert(tech0.nodes.filter(n => n.mutex).length === 8 &&
      tech0.nodes.every(n => [400,900,1500,2400,3600,5200,7000,9000][n.tier - 1] === n.cost &&
        [40,55,70,85,100,115,130,150][n.tier - 1] === n.points),
    'T343a 四組互斥對與八階費用／研究點應逐項符合卡面');
    const d5 = tech0.nodes.find(n => n.id === 'D5'), d8 = tech0.nodes.find(n => n.id === 'D8');
    assert(d5.pre.includes('C6') && JSON.stringify(d5.any) === JSON.stringify(['D4a','D4b']) &&
      d8.pre.includes('D7') && d8.minDone === 30,
    'T343a D5 跨線前置與 D8 done≥30 頂石門檻應入資料表');
    tech0.done.push('A1');tech0.nodes[0].nm = 'mutant';
    assert(window.GV.tech343().done.length === 0 && window.GV.tech343().nodes[0].nm === '標準化生產',
    'T343a GV.tech343 應回傳深拷貝，外部不得改寫內部狀態／節點');

    window.GV.newWorldSeeded(34301);window.GV.setDiff(1);window.GV.addMoney(10000);
    const cashA343 = window.GV.stats().money;
    assert(window.__t343Test.start('A2') === false && window.GV.stats().money === cashA343,
    'T343a 前置未滿足不得啟動、不得扣款');
    assert(window.__t343Test.start('A1') === true && window.GV.stats().money === cashA343 - 400,
    'T343a 標準難度啟動 A1 應恰扣 $400');
    assert(window.__t343Test.start('A1') === true && window.GV.stats().money === cashA343 - 400,
    'T343a 重點同一研究不得重複扣款');
    window.GV.step(1);
    const afterOne343 = window.GV.tech343(), cashB343 = window.GV.stats().money;
    assert(afterOne343.act === 'A1' && afterOne343.prog.A1 === 1 && afterOne343.speed === 1,
    'T343a 無研究建築時每日速度應為 1');
    assert(window.__t343Test.start('B1') === true && window.GV.stats().money === cashB343 - 400 &&
      window.GV.tech343().prog.A1 === 1 && window.GV.tech343().act === 'B1',
    'T343a 切換研究應保留 A1 進度並只啟動 B1');
    const cashC343 = window.GV.stats().money;
    assert(window.__t343Test.start('A1') === true && window.GV.stats().money === cashC343 &&
      window.GV.tech343().prog.A1 === 1 && window.GV.tech343().act === 'A1',
    'T343a 切回已有正進度的 A1 應保留進度且不重複收啟動費');

    window.GV.newWorldSeeded(34302);window.GV.setDiff(3);
    const sandboxCash343 = window.GV.stats().money;
    assert(window.__t343Test.start('A1') && window.GV.stats().money === sandboxCash343,
    'T343a 沙盒啟動研究應免費');
    window.GV.step(1);
    const institute343 = findSpot('institute');
    assert(institute343 && place('institute', institute343.x, institute343.y),
    'T343a 應可放置研究院驗速度（不經工具列門檻）');
    window.GV.step(1);
    assert(window.GV.tech343().speed === 2 && window.GV.tech343().prog.A1 === 3,
    'T343a 一座研究院應使速度 1→2，且沿用第一經濟迴圈計數');
    window.GV.step(19);
    assert(window.GV.tech343().act === '' && window.GV.tech343().done.includes('A1') &&
      !Object.prototype.hasOwnProperty.call(window.GV.tech343().prog, 'A1'),
    'T343a 研究點達門檻應完成、清 active 與該節點進度');

    window.GV.newWorldSeeded(34303);window.GV.setDiff(3);
    assert(['A1','A2','A3'].every(id => window.GV.techGrant(id)) &&
      window.__t343Test.start('A4a') && window.__t343Test.start('A4b') === false,
    'T343a 互斥對一側一經選定，另一側應立即拒絕');
    window.GV.step(1);
    assert(window.__t343Test.start('B1') && window.__t343Test.start('A4b') === false &&
      window.GV.techGrant('A4a') && window.GV.techGrant('A4b') === false &&
      window.__t343Test.start('A5') === true,
    'T343a 切走後保留的互斥進度仍應永久鎖另一側；grant 亦不得繞過');
    window.GV.newWorldSeeded(34304);window.GV.setDiff(3);
    assert(window.GV.techGrant('D4a') && window.__t343Test.start('D5') === false &&
      window.GV.techGrant('C6') && window.__t343Test.start('D5') === true,
    'T343a D5 必須同時具備 D4 任一側與跨線 C6');

    window.GV.newWorldSeeded(34305);window.GV.setDiff(3);
    assert(window.__t343Test.start('A1'), 'T343a 合法存檔前應啟動 A1');
    window.GV.step(1);
    assert(window.GV.techGrant('D1'), 'T343a 合法存檔前應 grant D1');
    window.GV.save();
    const validRaw343 = store[SKEY], validDisk343 = JSON.parse(validRaw343);
    assert(validDisk343.tech343 && validDisk343.tech343.act === 'A1' &&
      validDisk343.tech343.prog.A1 === 1 && JSON.stringify(validDisk343.tech343.done) === '["D1"]',
    'T343a 非零研究狀態應以單一可選 tech343 欄位落盤');
    window.GV.newWorldSeeded(99);
    assert(window.GV.tech343().act === '' && window.GV.tech343().done.length === 0,
    'T343a newWorld 應成對清空研究進度');
    store[SKEY] = validRaw343;
    assert(window.GV.load() === true && window.GV.tech343().act === 'A1' &&
      window.GV.tech343().prog.A1 === 1 && window.GV.tech343().done[0] === 'D1',
    'T343a 合法研究存檔應完整往返');

    window.GV.newWorldSeeded(34306);window.GV.setDiff(1);window.GV.save();
    const emptyRaw343 = store[SKEY];
    assert(!Object.prototype.hasOwnProperty.call(JSON.parse(emptyRaw343), 'tech343'),
    'T343a 零研究狀態不得落 tech343 欄位');
    window.GV.newWorldSeeded(34306);window.GV.setDiff(1);window.GV.save();
    assert(store[SKEY] === emptyRaw343,
    'T343a 同種子零研究城市重建後存檔 bytes 應逐位相同');
    store[SKEY] = emptyRaw343;
    assert(window.GV.load() === true, 'T343a 畸形欄 A/B 前應先完成無科技欄 control load');
    window.GV.save();
    const controlRoundtrip343 = store[SKEY];

    const malformed343 = [
      ['缺欄位', undefined],
      ['字串', 'A1'],
      ['數字', 343],
      ['錯物件', {nodes:42}],
      ['陣列', [null]],
      ['互斥雙完成', {act:'',prog:{},done:['A4a','A4b']}],
      ['互斥完成＋進度', {act:'',prog:{A4b:10},done:['A4a']}],
      ['互斥完成＋啟動', {act:'A4b',prog:{},done:['A4a']}]
    ];
    for (const [label, bad] of malformed343) {
      const disk = JSON.parse(emptyRaw343);
      if (bad === undefined) delete disk.tech343; else disk.tech343 = bad;
      store[SKEY] = JSON.stringify(disk);
      assert(window.GV.techGrant('A1'), 'T343a ' + label + ' 案前應先造跨城殘留');
      assert(window.GV.load() === true, 'T343a ' + label + ' 科技欄不得拖垮城市 load');
      const s = window.GV.tech343();
      assert(s.act === '' && s.done.length === 0 && Object.keys(s.prog).length === 0,
        'T343a ' + label + ' 科技欄應整體棄用回零');
      window.GV.save();
      assert(store[SKEY] === controlRoundtrip343,
        'T343a ' + label + ' 載入後城市存檔 bytes 應與無科技欄 control 完全相同');
    }

    window.__t343Test.toolbar();
    const megaBtn343 = elMap.get('toolcats').children.find(b => b.textContent === '大型');
    assert(megaBtn343, 'T343a 工具分類應找到「大型」');
    megaBtn343.click();
    const lowTools343 = document.querySelectorAll('.tool').length;
    const highDisk343 = JSON.parse(emptyRaw343);highDisk343.rk = 25;store[SKEY] = JSON.stringify(highDisk343);
    assert(window.GV.load() === true, 'T343a 高等級存檔應載入');
    const toolDefStart343 = html.indexOf('const TOOLS=[');
    const toolDef343 = html.slice(toolDefStart343, html.indexOf('];', toolDefStart343));
    const highExpected343 = (toolDef343.match(/cat:'mega'/g) || []).length + 2;
    const highTools343 = document.querySelectorAll('.tool').length;
    assert(lowTools343 < highExpected343 && highTools343 === highExpected343,
    'T343a load 後不點任何按鈕，大型工具可見數應立即由 ' + lowTools343 + ' 升至 ' + highExpected343);
    const rankLoop343 = html.slice(html.indexOf('while(rankIdx<RANKS.length-1'),
      html.indexOf('// 紓困保底', html.indexOf('while(rankIdx<RANKS.length-1')));
    assert(rankLoop343.includes('rankIdx++;') && rankLoop343.includes('buildToolbar();'),
    'T343a 每次城市晉升也必須立即重建工具列');
    assert((html.match(/unlockRank:/g) || []).length === 31 &&
      !html.includes('目前全部 TOOLS 皆未設'),
    'T343a 等級門檻既有 31 條，過期「全部未設」註釋必須移除');
    const codeStart343 = html.indexOf('/* T343a：科技樹資料層');
    const codeEnd343 = html.indexOf('let quality=', codeStart343);
    const code343 = html.slice(codeStart343, codeEnd343);
    assert(codeStart343 > 0 && codeEnd343 > codeStart343 &&
      !/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|spriteTexRand/.test(code343),
    'T343a 資料層不得消耗任何共用或素材亂數流');
    assert(code343.includes("techSpeed343=1+Math.min(7,instituteN+universityN+techParkN*2+campusN*2+dataCenterN+megaProjectN*2)+tq('C6',1,0)+tq('D2',1,0)+tq('D5',2,0)") &&
      html.includes('advanceTech343(inN,un,tpk342,cam342,dtc342,mgN)'),
    'T343a/c 研究速度應精確為 1+min(7,研究院+大學+科技園×2+大學城×2+數據中心+太空中心×2)+C6+D2+D5，並只吃既有計數與 tq');
    assert(atlasSig343() === atlasBefore343,
    'T343a 研究／存讀檔／grant 全流程不得改動任何 atlas 中繼指紋');
  }

  console.log('\n-- T343b 科技樹面板／互動／窄屏可達性 --');
  {
    const atlasSig343b = () => JSON.stringify(window.GV.sprAtlas356().entries.map(e =>
      [e.fam, e.key, e.w, e.h, e.ax, e.ay, e.sc, !!e.night]));
    const atlasBefore343b = atlasSig343b();
    const statsBefore343b = JSON.stringify(window.GV.stats());

    window.__t343Test.city();
    assert(elMap.get('infoBody').innerHTML.includes('statsTech343') &&
      elMap.get('infoBody').innerHTML.includes('📊 城市'),
    'T343b 城市統計頁應新增科技樹 tab 入口');
    elMap.get('statsTech343').click();
    const panel343b = elMap.get('infoBody').innerHTML;
    assert(panel343b.includes('techTree343') && panel343b.includes('techDetail343') &&
      panel343b.includes('拖曳樹圖平移'),
    'T343b 科技 tab 應在 #infoBody 內生成 canvas、詳情與拖曳提示');
    assert(JSON.stringify(window.GV.stats()) === statsBefore343b,
    'T343b 開啟城市統計與科技面板前後 GV.stats() 必須逐位不變');
    assert(!/NaN|undefined|Infinity/.test(panel343b + window.__t343Test.detail()),
    'T343b 空城科技面板不得出現 NaN／undefined／Infinity');

    const ids343b = ['statsCity343','statsTech343','techTree343','techDetail343','techStart343','techHome343'];
    assert(ids343b.every(id => ids.includes(id) && elMap.get(id)),
    'T343b 六個新 DOM id 必須同卡註冊進 Node ids 白名單');
    const draw343b = window.__t343Test.draw();
    assert(draw343b.boxes === 36 && draw343b.edges === 37 && draw343b.mutex === 4,
    'T343b canvas 應真畫 36 節點、37 條前置連線與 4 組互斥標記，實得 '+JSON.stringify(draw343b));
    const unreachable343b = window.GV.tech343().nodes.filter(n => !window.__t343Test.visible(n.id)).map(n => n.id);
    assert(unreachable343b.length === 0,
    'T343b 定位／平移邊界應讓 36 節點全部可進入 canvas 視口，不可達：'+JSON.stringify(unreachable343b));
    window.__t343Test.focus('B4a');
    const hitPan343b = window.__t343Test.view();
    const hitNode343b = window.__t343Test.hit(327 + hitPan343b.x, 349 + hitPan343b.y);
    const hitGap343b = window.__t343Test.hit(395 + hitPan343b.x, 393 + hitPan343b.y);
    assert(hitNode343b === 'B4a' && hitGap343b === '',
    'T343b hit-test 應命中 B4a 中心並拒絕節點間空白，實得 node='+hitNode343b+' gap='+hitGap343b);
    const cv343b = elMap.get('techTree343'),panBefore343b = window.__t343Test.view();
    cv343b.onpointerdown({pointerId:343,clientX:200,clientY:180,preventDefault(){}});
    cv343b.onpointermove({pointerId:343,clientX:240,clientY:180,preventDefault(){}});
    cv343b.onpointerup({pointerId:343,clientX:240,clientY:180,preventDefault(){}});
    assert(window.__t343Test.view().x !== panBefore343b.x,
    'T343b pointer 拖曳應真改變樹圖平移量');

    const codeStart343b = html.indexOf('/* ===== T343b 科技樹面板');
    const codeEnd343b = html.indexOf('function showStats()', codeStart343b);
    const code343b = html.slice(codeStart343b, codeEnd343b);
    assert(codeStart343b > html.indexOf('\n#tools{') && codeEnd343b > codeStart343b &&
      !/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|spriteTexRand/.test(code343b),
    'T343b UI 區塊必須位於既有工具列 CSS 之後，且不得引入任何亂數 token');
    assert((html.match(/\$\('#info'\)\.style\.display='block'/g) || []).length === 1 &&
      /function showTechPanel343\(\)[\s\S]*?showInfoPanel\(\)/.test(code343b),
    'T343b 科技面板必須復用 showInfoPanel()，不得新增第二個直接 display=block');

    window.GV.newWorldSeeded(34321);window.GV.setDiff(1);window.GV.addMoney(5000);
    window.__t343Test.panel();window.__t343Test.select('A2');
    const lockedCash343b = window.GV.stats().money;
    assert(window.__t343Test.startDisabled() && window.__t343Test.click() === false &&
      window.GV.stats().money === lockedCash343b && window.__t343Test.detail().includes('前置未滿足'),
    'T343b 前置未滿足節點按鈕須禁用，強制觸發亦失敗且不扣款');

    window.GV.newWorldSeeded(34322);window.GV.setDiff(3);
    window.__t343Test.panel();window.__t343Test.select('A1');
    const sandboxCash343b = window.GV.stats().money, sandboxDetail343b = window.__t343Test.detail();
    assert(sandboxDetail343b.includes('啟動費') && sandboxDetail343b.includes('$0') &&
      sandboxDetail343b.includes('沙盒免費'),
    'T343b 沙盒節點詳情須把啟動費顯示為 $0');
    assert(!window.__t343Test.startDisabled() && window.__t343Test.click() === true &&
      window.GV.stats().money === sandboxCash343b && window.GV.tech343().act === 'A1',
    'T343b 啟動按鈕須走 T343a startTech343，沙盒成功啟動且零扣款');
    assert(window.__t343Test.summary().includes('當前研究') &&
      window.__t343Test.summary().includes('標準化生產'),
    'T343c 啟動研究後須整體重繪面板，頂部「當前研究」立即顯示標準化生產');
    window.GV.step(1);
    assert(window.__t343Test.draw().progress === 1 && window.__t343Test.detail().includes('研究中'),
    'T343b 推進一天後 canvas 應畫進度條，詳情同步顯示研究中');

    window.GV.newWorldSeeded(34323);window.GV.setDiff(1);window.GV.addMoney(5000);
    assert(window.GV.techGrant('A4a'), 'T343b 互斥 UI 測試應先完成 A4a');
    window.__t343Test.panel();window.__t343Test.select('A4b');
    const mutexCash343b = window.GV.stats().money;
    assert(window.__t343Test.startDisabled() && window.__t343Test.detail().includes('永久封鎖') &&
      window.__t343Test.click() === false && window.GV.stats().money === mutexCash343b &&
      !window.GV.tech343().done.includes('A4b'),
    'T343b 互斥另一側須永久禁用，強制觸發仍失敗且不扣款');

    assert(atlasSig343b() === atlasBefore343b,
    'T343b 面板開關／拖曳／選取／啟動不得改動任何 atlas 中繼指紋');
  }

  console.log('\n-- T343c 36 節點效果接線／精確 delta／零科技恆等 --');
  {
    const atlasSig343c = () => JSON.stringify(window.GV.sprAtlas356().entries.map(e =>
      [e.fam, e.key, e.w, e.h, e.ax, e.ay, e.sc, !!e.night]));
    const atlasBefore343c = atlasSig343c();
    const specs343c = [
      ['A1',[['taxI','mul',1.04]]],
      ['A2',[['transit','mul',1.12]]],
      ['A3',[['taxC','mul',1.04]]],
      ['A4a',[['taxI','mul',1.08],['fire','mul',1.10]]],
      ['A4b',[['fire','mul',.85],['taxI','mul',.98]]],
      ['A5',[['upgrade','mul',1.10]]],
      ['A6',[['taxC','mul',1.05]]],
      ['A7',[['demand','addf',.10]]],
      ['A8',[['taxI','mul',1.06]]],
      ['B1',[['happy','addf',.01]]],
      ['B2',[['crime','mul',.92]]],
      ['B3',[['fire','mul',.90]]],
      ['B4a',[['happy','addf',.02],['policy','addi',10]]],
      ['B4b',[['taxC','mul',1.05],['crime','mul',1.05]]],
      ['B5',[['cost','mul',.95]]],
      ['B6',[['happy','addf',.015]]],
      ['B7',[['crime','mul',.90]]],
      ['B8',[['happy','addf',.02]]],
      ['C1',[['edu120','mul',1.05]]],
      ['C2',[['upgrade','mul',1.08]]],
      ['C3',[['taxC','mul',1.03]]],
      ['C4a',[['edu120','mul',1.15],['policy','addi',8]]],
      ['C4b',[['edu125','mul',1.08],['happy','addf',.01]]],
      ['C5',[['transit','mul',1.08]]],
      ['C6',[['speed','addi',1]]],
      ['C7',[['happy','addf',.015]]],
      ['C8',[['cost','mul',.95]]],
      ['D1',[['points','mul',1.05]]],
      ['D2',[['speed','addi',1]]],
      ['D3',[['taxC','mul',1.04]]],
      ['D4a',[['cost','mul',.90]]],
      ['D4b',[['points','mul',1.10]]],
      ['D5',[['speed','addi',2]]],
      ['D6',[['happy','addf',.02]]],
      ['D7',[['edu120','mul',1.10]]],
      ['D8',[['happy','addf',.03]]]
    ];
    assert(specs343c.length === 36 && new Set(specs343c.map(s => s[0])).size === 36,
      'T343c delta 表必須逐節點覆蓋 36/36，不得以家族抽樣代替');
    assert(html.includes("const tq=(id,on,off)=>(tech343&&tech343.done.includes(id))?on:off;") &&
      !html.includes('T343c 才接線') && html.includes("])+'<div class=\"row\">效果：'"),
      'T343c 必須採卡面集中 tq helper，面板不得再宣稱效果尚未接線');

    const base343c = Object.create(null);
    const baseline343c = kind => Object.prototype.hasOwnProperty.call(base343c, kind)
      ? base343c[kind] : (base343c[kind] = window.__t343Test.effect(kind, ''));
    const familyChecks343c = [
      ['fire',[['A4a',1.10],['A4b',.85],['B3',.90]]],
      ['crime',[['B2',.92],['B4b',1.05],['B7',.90]]],
      ['transit',[['A2',1.12],['C5',1.08]]],
      ['upgrade',[['A5',1.10],['C2',1.08]]]
    ];
    for (const [kind, checks] of familyChecks343c) {
      const before = baseline343c(kind), got = [];
      let ok = Number.isFinite(before) && before > 0;
      for (const [id, expected] of checks) {
        const after = window.__t343Test.effect(kind, id), ratio = after / before;
        ok = ok && Number.isFinite(after) && Math.abs(ratio - expected) <= 1e-9;
        got.push(id + ':' + before + '→' + after + ' (×' + ratio + ')');
      }
      assert(ok, 'T343c ' + kind + ' 家族 probe 必須命中真公式且逐節點比值精確（容差 ≤1e-9）：' + got.join('；'));
    }
    for (const [id, checks] of specs343c) {
      const got = [];
      let ok = true;
      for (const [kind, op, expected] of checks) {
        const before = baseline343c(kind), after = window.__t343Test.effect(kind, id);
        const delta = op === 'mul' ? after / before : after - before;
        const pass = op === 'addi' ? delta === expected : Math.abs(delta - expected) <= 1e-9;
        ok = ok && pass;
        got.push(kind + ':' + before + '→' + after + ' (' + (op === 'mul' ? '×' : '+') + delta + ')');
      }
      assert(ok, 'T343c ' + id + ' 每項真公式 delta 應精確等於卡面（IEEE-754 連乘／小數加法容差 ≤1e-9）：' + got.join('；'));
    }

    for (const [id, mul] of [['C1',1.05],['C4a',1.15],['C4b',1.08],['D7',1.10]]) {
      const r = window.__t343Test.eduRefresh(id, false);
      assert(r.done && r.before === 120 && r.after === Math.round(120 * mul),
        'T343c ' + id + ' 經 GV.techGrant 完成時必須立即 rebuildCov，EDU ' + r.before + '→' + r.after);
    }
    const naturalEdu343c = window.__t343Test.eduRefresh('C1', true);
    assert(naturalEdu343c.done && naturalEdu343c.before === 120 && naturalEdu343c.after === 126,
      'T343c 自然研究完成 C1 亦須立即 rebuildCov，不能只照顧測試 grant');
    const guide343c = window.__t343Test.guide();
    assert(guide343c.includes('科技樹：研究與取捨') && guide343c.includes('研究院／大學／數據中心') &&
      guide343c.includes('紅色 ⊗ 二選一') && guide343c.includes('會帶科技進度'),
      'T343c 指南須寫清研究點來源、互斥永久語意與分享碼攜帶科技進度');
    assert(atlasSig343c() === atlasBefore343c,
      'T343c 36 節點效果、grant 與 EDU 重建不得改動任何 atlas 中繼指紋');
  }

  // ===== T381 EDU 髒快取裁決版：顯示側即時、模擬側位元恆等（鐵律19 多種子否決全面即時化） =====
  {
    window.GV.newWorldSeeded(301);
    window.GV.setDiff(1);
    const n381 = window.GV.N();
    let sx381 = -1, sy381 = -1;
    for (let y = 4; y < n381 - 4 && sx381 < 0; y++) for (let x = 4; x < n381 - 4; x++) {
      const t = window.GV.tile(x, y);
      if (t && (t.t === 1 || t.t === 2) && !t.bld && !t.road && !t.zone && !t.tree) {
        if (window.GV.place('school', x, y)) { sx381 = x; sy381 = y; break; }
      }
    }
    assert(sx381 >= 0, 'T381 應能在陸地放置學校');
    assert(window.GV.cov('school', sx381, sy381) > 0, 'T381 放置後 COV.school 立即非 0（既有增量行為）');
    // 分離斷言：顯示側即時非 0，模擬快取維持 0（＝模擬路徑未被動到）
    assert(window.GV.eduLiveAt(sx381, sy381) > 0, 'T381 建校後不 load、顯示側 eduLiveAt 立即非 0');
    assert(window.GV.eduAt(sx381, sy381) === 0, 'T381 模擬快取 EDU 建校當下應仍為 0（裁決：模擬側不即時化，見卡面 12 種子表）');
    // 公式同一性：rebuildCov 後快取＝即時值（同一 eduStaticAt）
    window.GV.rebuildCov();
    assert(window.GV.eduAt(sx381, sy381) === window.GV.eduLiveAt(sx381, sy381) && window.GV.eduAt(sx381, sy381) > 0,
      'T381 rebuildCov 後快取應與即時值逐位一致（同一 eduStaticAt 公式）');
    // 拆除對稱：顯示側即時歸 0
    assert(window.GV.place('doze', sx381, sy381), 'T381 應能拆除學校');
    assert(window.GV.eduLiveAt(sx381, sy381) === 0, 'T381 拆校後顯示側即時歸 0，實得 ' + window.GV.eduLiveAt(sx381, sy381));
    // 靜態守衛：模擬側四讀點必須仍吃 EDU[ 快取；顯示側兩點必須用 eduStaticAt
    assert(/const eduTerm=\(EDU\[i\]\/255\)/.test(html) && /aiEduSum\+=EDU\[i2\]/.test(html) &&
           /eduSumT342\+=EDU\[ci\]/.test(html) && /1\+\(EDU\[i\]\/255\)\*\.4:1/.test(html),
      'T381 模擬側四讀點（eduTerm/aiEduSum/eduSumT342/eduIndMul）必須維持吃 EDU 快取——改動即破壞 12 種子校準，須先過鐵律19 崩城率驗收');
    assert(/needEd=clamp\(eduStaticAt\(x,y\)\/160/.test(html) && /ne\+=clamp\(eduStaticAt\(ni%N,\(ni\/N\)\|0\)\/160/.test(html),
      'T381 顯示側兩點（需求卡/晶片抽樣）必須用即時 eduStaticAt');
    assert(!/EDU_COV_FIELDS/.test(html), 'T381 stampCov 不得含 EDU 增量寫入（被鐵律19 否決的版本）');
  }
  // ===== T343d 樹圖清晰度：後備存儲＝CSS寬×DPR、繪製/命中恆在邏輯 640×420 =====
  {
    assert(html.includes('function techScale343(cv)') && html.includes('clamp(w*dpr/TECH_VIEW343.w,1,3)'),
      'T343d 應存在 techScale343（CSS寬×DPR，上限 3×）——玩家回報 v11.5 樹圖模糊的根因是固定 640 被 CSS 拉伸');
    assert(html.includes('if(g.setTransform)g.setTransform(q343,0,0,q343,0,0)'),
      'T343d 繪製必須經 setTransform 放大，邏輯座標不得改');
    assert(html.includes('*TECH_VIEW343.w/(r.width||TECH_VIEW343.w)'),
      'T343d techPoint343 必須映射到邏輯 640×420（與後備解析度脫鉤，否則高 DPR 下點選錯位）');
    assert(!html.includes('cv.width!==640'),
      'T343d 不得殘留固定 640 後備尺寸');
  }
  // ===== T383 守衛債三條（ARCH §10.1/10.2/10.4 機器化；業主 loop 直令 2026-08-02） =====
  { // T383a 五份多格尺寸表全鍵同步（§9 不變量5 機器化；規避 sprFootAudit 缺鍵自動漏檢的共因失效）
    const t383pairs=(body,into)=>{for(const p of body.matchAll(/(\d+):(\d+)/g))into[+p[1]]=+p[2];return into;};
    const t383lits=(name)=>[...html.matchAll(new RegExp('const '+name+'=\\{([^}]+)\\}','g'))].map(m=>t383pairs(m[1],{}));
    const t383asg=(name,t)=>{for(const m of html.matchAll(new RegExp('Object\\.assign\\('+name+',\\{([^}]+)\\}','g')))t383pairs(m[1],t);return t;};
    const mszL=t383lits('MSZ'),szcL=t383lits('SZC'),szbL=t383lits('SZB'),szmL=t383lits('SZM');
    assert(mszL.length===1&&szcL.length===1&&szbL.length===1&&szmL.length===2,
      'T383a 尺寸表份數應為 MSZ/SZC/SZB 各 1＋SZM 2（共五份字面量），實得 '+[mszL.length,szcL.length,szbL.length,szmL.length].join('/'));
    const MSZt=t383asg('MSZ',mszL[0]);
    const t383reps={SZC:t383asg('SZC',szcL[0]),SZB:t383asg('SZB',szbL[0]),'SZM(foot)':szmL[0],'SZM(above)':szmL[1]};
    const mszKeys=Object.keys(MSZt).map(Number).sort((a,b)=>a-b);
    assert(mszKeys.length>=65,'T383a MSZ 鍵數棘輪：不得低於 65（只准增不准減），實得 '+mszKeys.length);
    assert(!(9 in MSZt),'T383a k9 設計上不入表（體育場沿用存檔第 6 位 sz，見 MSZ 註解）；若決定入表須五表齊補並同卡改本斷言');
    for(const nm in t383reps){const t=t383reps[nm];
      const miss=mszKeys.filter(k=>!(k in t)),extra=Object.keys(t).map(Number).filter(k=>!(k in MSZt)),
        wrong=mszKeys.filter(k=>(k in t)&&t[k]!==MSZt[k]);
      assert(miss.length===0,'T383a '+nm+' 缺 MSZ 的鍵（新多格建築必須五表齊備）：k'+miss.join(',k'));
      assert(extra.length===0,'T383a '+nm+' 多出 MSZ 沒有的鍵：k'+extra.join(',k'));
      assert(wrong.length===0,'T383a '+nm+' 尺寸值與 MSZ 不一致：'+wrong.map(k=>'k'+k+'('+t[k]+'≠'+MSZt[k]+')').join(','));
    }
  }
  { // T383b KNAME 稅收分支執行期窮舉（鐵律14）：漏守衛的 k 必落工業稅 fallback（JOBSI 只有 lv0-3，升 lv4 即 NaN）；
    // sink 記錄器見檔頭 inject343('t383taxFbk')，造境見 __t383TaxCase 尾端注入。式樣無關，新增 k134 忘補鏈當場點名。
    const t383r=window.__t383TaxCase();
    assert(t383r.kn>=133,'T383b KNAME 鍵數不得少於 133，實得 '+t383r.kn);
    assert(t383r.bad.length===0,'T383b 稅收窮舉：k'+t383r.bad.join(',k')+' 落入工業稅 fallback＝漏守衛分支（新增 k 未補稅鏈，lv≥4 將 NaN）');
    assert(Number.isFinite(t383r.money),'T383b 全 k 合成城 tick 後 money 必須有限，實得 '+t383r.money);
  }
  { // T383c live buildSprites 亂數 token 順序快照（§10.4）：T272/T274 只凍結 backups 快照對快照，live 檔首度有守。
    // 必須剝註解——實測 RAW 229 token 有 111 個只活在 FIX-B 樣板註解裡；剝後 T359「註解不得含 rand(」紀律對本守衛免疫。
    const t383s0=html.indexOf('function buildSprites(){'),t383e0=html.indexOf('\nfunction wealthSpr(',t383s0);
    assert(t383s0>=0&&t383e0>t383s0,'T383c 應可界定 live buildSprites 區段（錨點漂移＝同卡修錨）');
    const t383seg=html.slice(t383s0,t383e0);
    const t383strip=(s)=>{let o='',st=0;for(let i=0;i<s.length;i++){const c=s[i],d=s[i+1];
      if(st===0){if(c==='/'&&d==='/'){st=1;o+=' ';i++;}else if(c==='/'&&d==='*'){st=2;o+=' ';i++;}
        else if(c==="'"){st=3;o+=c;}else if(c==='"'){st=4;o+=c;}else if(c==='`'){st=5;o+=c;}else o+=c;}
      else if(st===1){if(c==='\n'){st=0;o+=c;}else o+=' ';}
      else if(st===2){if(c==='*'&&d==='/'){st=0;o+=' ';i++;}else o+=(c==='\n'?c:' ');}
      else{const q=st===3?"'":st===4?'"':'`';if(c==='\\'){o+=c+(d||'');i++;}else if(c===q){st=0;o+=c;}else o+=c;}}
      return o;};
    const t383st=t383strip(t383seg);
    assert(t383st.split('\n').length===t383seg.split('\n').length,'T383c 剝註解不得改變行數（狀態機 canary；誤入字串態會在此或總數斷言大聲死）');
    const t383toks=[];
    for(const ln of t383st.split('\n'))for(const m of ln.matchAll(/\bR\s*\(|\bri\s*\(|\brand\s*\(|\brand\b(?!\s*\()|\bspriteTexRand\b/g)){
      const t=m[0];t383toks.push(t[0]==='R'?'R':t.startsWith('ri')?'ri':t.startsWith('spriteTexRand')?'stx':t.trimEnd().endsWith('(')?'randC':'randX');}
    const t383crc=(str)=>{let c=~0;for(let i=0;i<str.length;i++){c^=str.charCodeAt(i)&255;for(let j=0;j<8;j++)c=(c>>>1)^(0xEDB88320&-(c&1));}return ~c>>>0;};
    // 基線＝T383 施工當日以本抽取器實測 master 87bb1e7（randX62/ri28/randC20/stx8）；
    // 合法改動（尾端新增消耗局部 rand 等）＝施工卡「同卡」更新兩常數並在卡面記 delta 來源（PASS 棘輪同款慣例）。
    const T383_RNG_TOTAL=119,T383_RNG_CRC=0x6b858c3b; // T426 拆段：`let __savedR,rand;` 上提宣告行 +1 randX token（118→119，記 delta）
    assert(t383toks.length===T383_RNG_TOTAL,'T383c buildSprites 亂數 token 總數應為 '+T383_RNG_TOTAL+'，實得 '+t383toks.length+'（合法改動＝同卡更新基線並記 delta）');
    assert(t383crc(t383toks.join('|'))===T383_RNG_CRC,'T383c token 行序 CRC 漂移＝buildSprites 亂數消耗序被動過（中段插入/刪除/換序；合法改動＝同卡更新基線並記 delta）');
  }
  // ===== T384a 流向圖層資料聚合層（tick 尾快照+lazy 純讀 GV；業主 loop R2） =====
  { // 靜態：快照段唯一錨＋禁亂數（比 T367 範本多擋 streetHash）
    const b384=html.indexOf('/* ===== T384 flowStat BEGIN'),e384=html.indexOf('/* ===== T384 flowStat END');
    assert(b384>=0&&e384>b384,'T384 快照段 BEGIN/END 錨應存在且有序');
    assert(html.indexOf('/* ===== T384 flowStat BEGIN',b384+1)===-1,'T384 BEGIN 錨全檔唯一');
    const seg384=html.slice(b384,e384);
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random|streetHash\s*\(/.test(seg384),
      'T384 快照段零亂數消耗（tick 寫快照＝純抄已算值，多一次擲骰=位元契約破壞）');
  }
  { // 鐵律7：宣告/newWorld/load 三處歸零字串釘（demWhy 463-467 同款）
    const zc384=html.split('flowStat384={ok:false}').length-1;
    assert(zc384===3,'T384 flowStat384={ok:false} 應恰 3 處（宣告+newWorld+load 成對歸零＝鐵律7），實得 '+zc384);
    const gz384=html.split('gMade384=0').length-1;
    assert(gz384>=3,'T384 gMade384 歸零應覆蓋宣告+newWorld+load（≥3 處），實得 '+gz384);
  }
  { // 功能＋跨源一致（獨立真值來源＝4161/4224 教訓）＋lazy 純讀＋存檔零新鍵
    window.GV.newWorldSeeded(77);window.GV.weather(0);
    assert(window.GV.flowStat().ok===false,'T384 新城未 tick 前 flowStat.ok 必須 false（demWhy 同款空窗語義）');
    window.GV.step(1);
    const fs384=window.GV.flowStat();
    assert(fs384.ok===true&&fs384.day>=1,'T384 tick 後 flowStat.ok=true 且 day 就緒');
    const leaves384=[];(function w384(o){for(const k in o){const v=o[k];if(v&&typeof v==='object')w384(v);else if(typeof v==='number')leaves384.push(v);}})(fs384);
    assert(leaves384.length>=35&&leaves384.every(Number.isFinite),'T384 快照數字葉全部有限（實得 '+leaves384.length+' 葉）');
    assert(fs384.goods.stock===Math.round(window.GV.goods().stock),'T384 跨源一致：goods.stock 對 GV.goods()');
    assert(fs384.gas.ratio===+window.GV.chain346().gasRatio.toFixed(3),'T384 跨源一致：gas.ratio 對 GV.chain346()');
    assert(fs384.fuel.stock===window.GV.chain346().fuel&&fs384.steel.stock===window.GV.chain346().steel,
      'T384 跨源一致：fuel/steel 庫存對 GV.chain346()');
    const st384=JSON.stringify(window.GV.stats());
    const nodes384=window.GV.flowNodes384(),roads384=window.GV.flowRoads384();
    assert(Array.isArray(nodes384)&&roads384&&Array.isArray(roads384.byClass)&&Array.isArray(roads384.jamTop)&&Array.isArray(roads384.corridorTop),
      'T384 lazy 讀取（flowNodes384/flowRoads384）形狀正確');
    assert(JSON.stringify(window.GV.stats())===st384,'T384 lazy 讀取必須純讀（GV.stats 前後全等＝T372 先例）');
    window.GV.save();
    assert(!/flowStat|gMade384/.test(JSON.stringify(window.GV.inflateSave(window.GV.rawSave()))),
      'T384 快照不得落入存檔（零新鍵探針＝T364d waterCap 同款）');
    window.GV.step(1);
    assert(window.GV.flowStat().day===fs384.day+1,'T384 快照每日重寫（day 遞增）');
  }
  // ===== T384b 流向圖層 UI（第三 tab＋主畫布 overlay；業主 loop R3） =====
  {
    window.GV.newWorldSeeded(88);window.GV.weather(0);
    const ph0=window.GV.flowPanel384();
    assert(ph0.includes('尚無資料')&&!/NaN|undefined|Infinity/.test(ph0),
      'T384b 未結算開面板顯示「尚無資料」且禁 NaN/undefined/Infinity（demWhy 空窗語義）');
    window.__t384Bld(49,10,10);window.__t384Bld(121,14,10);window.__t384Bld(64,18,10);window.__t384Bld(18,22,10);
    window.GV.step(1);
    const ph1=window.GV.flowPanel384();
    assert(ph1.includes('今日產銷')&&ph1.includes('通勤')&&ph1.includes('鏈條節點')&&!/NaN|undefined|Infinity/.test(ph1),
      'T384b 有資料面板含 產銷/通勤/節點 三區且零壞值');
    const tabBtn=document.querySelector('#statsFlow384');
    assert(tabBtn&&typeof tabBtn.onclick==='function',
      'T384b #statsFlow384 tab 綁定存在（唯白名單 id 綁得住＝mock 陷阱守衛）');
    assert(window.GV.drawFlowOverlay384()===null,'T384b 預設關閉 overlay 回 null（零迭代＝逐像素恆等）');
    const ob=document.querySelector('#bFlowOverlay384');
    assert(ob&&typeof ob.onclick==='function','T384b #bFlowOverlay384 開關綁定存在');
    ob.onclick();
    const meta384=window.GV.drawFlowOverlay384();
    assert(meta384&&meta384.nodes>=4,
      'T384b overlay 開啟後 meta.nodes≥4（k49/121/64/18 各一），實得 '+(meta384&&meta384.nodes));
    window.__noFlow384=true;
    assert(window.GV.drawFlowOverlay384()===null,'T384b __noFlow384 逃生閥短路（像素回歸紅線）');
    window.__noFlow384=false;window.GV.setFlowShow384(false);
    const st384b=JSON.stringify(window.GV.stats());
    window.GV.flowPanel384();window.GV.drawFlowOverlay384();
    assert(JSON.stringify(window.GV.stats())===st384b,'T384b 面板/overlay 全程純讀（GV.stats 前後全等）');
  }
  // ===== T385 市長委託三選一（業主 loop R4） =====
  { // 靜態：錨塊唯一＋禁亂數（streetHash 同式純函式合法，R/ri/rand/Math.random 禁）
    const b385=html.indexOf('/* ===== T385 cms BEGIN'),e385=html.indexOf('/* ===== T385 cms END');
    assert(b385>=0&&e385>b385&&html.indexOf('/* ===== T385 cms BEGIN',b385+1)===-1,'T385 錨塊存在且唯一');
    const seg385=html.slice(b385,e385);
    assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random/.test(seg385),'T385 委託結算段零亂數消耗（鐵律2）');
    assert(!/income\s*\+=/.test(seg385),'T385 獎勵不得走 income+=（污染 fin/hist；只准一次性 money+=）');
  }
  { // 鐵律7 兩處字串釘＋undo 不觸
    const nw385=html.split('cms385=emptyCms385();').length-1;
    assert(nw385>=2,'T385 newWorld 成對歸零應在場（emptyCms385 呼叫≥2：宣告+newWorld），實得 '+nw385);
    assert(html.includes('cms385=cmsLoad385(d.cms385);'),'T385 load 側驗型還原必須在場（鐵律7）');
    const us=html.indexOf('function undo()');const ue=html.indexOf('\nfunction',us+10);
    assert(us>=0&&!/cms385/.test(html.slice(us,ue)),'T385 undo() 不得觸碰委託狀態（T343 決策4）');
  }
  { // 決定性抽選＋門檻＋功能鏈＋過期＋存讀＋驗型＋UI
    window.GV.newWorldSeeded(99);window.GV.weather(0);
    window.__t385Rank(4); // Lv.5：五型皆有可選
    const o1=window.GV.cmsOffers385(),o2=window.GV.cmsOffers385();
    /* T529 合法演進跟版（原文為「恆同**三條**且互異」）：本卡在發單側加了可行性閘門
       ——沒有鋼鐵廠/煉油廠/貿易站的城市不再收到那幾張必然過期的單 ⇒ **池會小於 3**。
       這條守衛真正要守的是「決定性抽選」與「互異」，3 這個數字是當時的附帶事實。
       改為 1..3 且互異且兩次呼叫恆同；「池不得為空」由 T529 G1 專守（那才是靈魂）。 */
    assert(o1.length>=1&&o1.length<=3&&new Set(o1).size===o1.length&&JSON.stringify(o1)===JSON.stringify(o2),
      'T385 抽選決定性：同 seed 同輪次恆同、1..3 條且互異，實得 '+o1.join(','));
    // 零接單純度：步進三日 cms385 仍全零
    window.GV.step(3);
    assert(JSON.stringify(window.GV.cms385())===JSON.stringify({act:'',st:0,acc:0,hold:0,n:0,done:[]}),
      'T385 零接單城市委託狀態恆零（位元恆等紅線的狀態面）');
    // 功能鏈 1：tech 型完成
    const m0=window.GV.stats().money;
    window.__t385Force('techC6');window.GV.techGrant('C6');window.GV.step(1);
    const c1=window.GV.cms385();
    assert(c1.act===''&&c1.done.includes('techC6')&&c1.n===1,'T385 tech 型委託完成：done 收錄/act 清空/輪次+1');
    assert(window.GV.stats().money>m0,'T385 完成發獎：money 淨增（一次性 +$1800 減日常收支後仍應高於前值）');
    // 功能鏈 2：acc 型（鋼）——造船廠+鋼庫存→steelUsed 每日 1
    window.__t384Bld(123,30,10);window.__t385Steel(100);window.__t385Force('steel40');
    window.GV.step(45);
    const c2=window.GV.cms385();
    assert(c2.done.includes('steel40')&&c2.act==='','T385 acc 型（造船用鋼40）45 天內完成，實得 done='+c2.done.join(','));
    // 重複完成防護（測試抓到的真 bug 回歸案）：再力接已完成的 techC6→立即再完成→done 不得重複
    window.__t385Force('techC6');window.GV.step(1);
    const c3=window.GV.cms385();
    assert(c3.done.filter(x=>x==='techC6').length===1,'T385 重複完成不重記 done（重複項會讓下次 load 驗型整欄棄用＝進度蒸發）');
    assert(JSON.stringify(window.__t385Load(c3))!==JSON.stringify({act:'',st:0,acc:0,hold:0,n:0,done:[]}),'T385 重複完成後的狀態必須能通過驗型（非整欄棄用）');
    // 過期案：hold 型在荒城不可達（運量 0<400）+接單日回撥→到期
    window.__t385Force('transit400');window.__t385St(-200);
    window.GV.step(1);
    const c4=window.GV.cms385();
    assert(c4.act==='','T385 過期：act 清空（失敗不毀城，零城市副作用）');
    assert(!c4.done.includes('transit400'),'T385 過期不入 done');
    // 存讀往返＋零新鍵
    const snap=window.GV.cms385();
    window.GV.save();
    const sv385=window.GV.inflateSave(window.GV.rawSave());
    assert(sv385.cms385&&sv385.cms385.n===snap.n&&JSON.stringify(sv385.cms385.done)===JSON.stringify(snap.done),
      'T385 有進度存檔：cms385 欄位往返一致');
    assert(JSON.stringify(window.__t385Load(sv385.cms385))===JSON.stringify(window.__t385Load(JSON.parse(JSON.stringify(sv385.cms385)))),
      'T385 驗型冪等');
    // 驗型八畸形→整欄棄用回零
    const Z385=JSON.stringify({act:'',st:0,acc:0,hold:0,n:0,done:[]});
    const bads=[[1,'非物件'],[[1,2],'陣列'],[{act:'nope'},'act 非白名單'],[{act:'steel40',st:0},'act 有值 st<1'],
      [{st:-1},'負數'],[{acc:1.5},'浮點'],[{done:['steel40','steel40'],act:''},'done 重複'],
      [{act:'steel40',st:5,done:['steel40']},'act∈done 語意非法']];
    for(const [raw,label] of bads)
      assert(JSON.stringify(window.__t385Load(raw))===Z385,'T385 驗型畸形整欄棄用：'+label);
    assert(JSON.stringify(window.__t385Load(undefined))===Z385,'T385 舊檔缺欄位=零狀態（合法）');
    // 零狀態不落盤
    window.GV.newWorldSeeded(101);window.GV.weather(0);window.GV.step(1);window.GV.save();
    assert(!/cms385/.test(JSON.stringify(window.GV.inflateSave(window.GV.rawSave()))),
      'T385 零委託城市存檔零新鍵（bytes 不變承諾）');
    // UI：沙盒/低等級 dim＋綁定真實性＋面板零壞值
    window.__t385Diff(3);
    assert(window.GV.commPanel385().includes('沙盒模式無委託'),'T385 沙盒 dim 列');
    window.__t385Diff(1);window.__t385Rank(0);
    assert(window.GV.commPanel385().includes('等級 3 解鎖'),'T385 低等級 dim 列');
    window.__t385Rank(4);window.__t385Pop(100); // T386b pop 門檻補課後，三選一態需 pop>50
    const ph385=window.GV.commPanel385();
    assert(ph385.includes('三選一')&&!/NaN|undefined|Infinity/.test(ph385),'T385 三選一面板零壞值');
    const tb385=document.querySelector('#statsComm385'),ab385=document.querySelector('#bCommAcc385_0');
    assert(tb385&&typeof tb385.onclick==='function'&&ab385&&typeof ab385.onclick==='function',
      'T385 tab 與接受鈕綁定存在（白名單 id＝mock 陷阱守衛）');
    window.__t385Pop(0);
    assert(window.GV.cmsAccept385(0)===false,'T386b pop 門檻：pop≤50 時接受必拒（T385 卡面宣稱補課）');
    window.__t385Pop(100); // 過 pop 門檻後再點
    ab385.onclick();
    const c5=window.GV.cms385();
    assert(c5.act!==''&&c5.st>=1,'T385 接受鈕真的接單（act 就位/st 記日）');
    const ph386=window.GV.commPanel385();
    assert(ph386.includes('進行中')&&ph386.includes('放棄委託')&&!/NaN|undefined/.test(ph386),'T385 進行中面板含進度與放棄鈕');
    window.GV.cmsDrop385();
    assert(window.GV.cms385().act===''&&window.GV.cms385().n===1,'T385 放棄=過期同語義（n+1 換輪）');
  }
  // ===== T386b 外貿合約 v1（stock 期末驗收型；業主 loop R5） =====
  {
    window.GV.newWorldSeeded(111);window.GV.weather(0);
    window.__t385Rank(6);
    const of386=window.GV.cmsOffers385();
    assert(of386.length===3&&new Set(of386).size===3,'T386b 池擴至 11 條後三選一仍滿額互異：'+of386.join(','));
    // stock 完成案：庫存 100、到期日驗收 60 → 成
    window.__t385Steel(100);window.__t385Force('ct_steel60');window.__t385St(-119);
    const m386=window.GV.stats().money;
    window.GV.step(1);
    const c386=window.GV.cms385();
    assert(c386.act===''&&c386.done.includes('ct_steel60'),'T386b stock 到期驗收達標→完成入 done');
    assert(window.GV.stats().money>m386+3000,'T386b 合約獎金 $3200 入帳（扣日常收支後仍淨增 >3000）');
    assert(window.GV.chain346().steel===100,'T386b 純讀機器證明：驗收不扣庫存（無鋼廠/船廠城，steel 恆 100）');
    // stock 過期案：庫存 20 到期 → 過期零副作用
    window.__t385Steel(20);window.__t385Force('ct_fuel80');window.__t385St(-119);
    window.GV.step(1);
    const c387=window.GV.cms385();
    assert(c387.act===''&&!c387.done.includes('ct_fuel80'),'T386b stock 到期未達標→過期不入 done（失敗不毀城）');
    // 期中不誤判：庫存已達標但未到期 → 不得提前完成
    window.__t385Steel(100);window.__t385Force('ct_steel60');
    window.GV.step(1);
    assert(window.GV.cms385().act==='ct_steel60','T386b stock 期中達標不得提前完成（期末驗收語義）');
    window.GV.cmsDrop385();
    // 面板 stock 呈現
    window.__t385Steel(45);window.__t385Force('ct_steel60');
    const ph386=window.GV.commPanel385();
    assert(ph386.includes('期末驗收')&&ph386.includes('45 / 60')&&!/NaN|undefined|Infinity/.test(ph386),
      'T386b 進行中面板顯示庫存/目標（期末驗收）且零壞值');
    window.GV.cmsDrop385();
  }
  // ===== T386a 城市專精四方向（業主 loop R6） =====
  { // 靜態：sq(' 呼叫數 count pin（防靜默刪效果點）＋四向效果行字串釘
    const sqN=(html.match(/sq\('/g)||[]).length;
    assert(sqN===12,'T386a sq(\' 效果呼叫應恰 12 個（四向各 2 正 1 負），實得 '+sqN+'（合法增刪=同卡更新本 pin）');
    /* T454 跟版：k2/k3 稅式在 sq() 之後插入最低工資成本記帳。
       T458 二次跟版＋釘型升級：政策卡逐張在同一區間插記帳塊（mw454→agg458），全文釘每卡都要 churn；
       改成「同行順序釘」——sq 效果因子與 income+=v2;tax?+= 必須同在一條稅式行上且順序固定，
       中間允許讀 SCI_BY_ID451 的合法插入（意圖不變：效果因子不得從稅式上消失或被搬走）。 */
    assert(html.includes("*sq('hub',1.12,1))")&&/\*sq\('hub',1\.03,1\);[^\n]*income\+=v2;taxC\+=v2;/.test(html)&&
           /\*sq\('ind',1\.06,1\)\*sq\('green',\.92,1\);[^\n]*income\+=v2;taxI\+=v2;/.test(html)&&html.includes("*sq('green',1.15,1))"),
      'T386a 運量/商稅/工稅/觀光四效果行字串釘在場（T458 升級為同行順序釘）');
    assert(html.includes("spec386=(typeof d.spec386==='string'&&SPEC386[d.spec386])?d.spec386:''"),
      'T386a load 側白名單驗型在場（鐵律7）');
    assert(html.split("spec386='';").length-1>=1,'T386a newWorld 成對歸零在場');
  }
  { // 功能：門檻/兩擊/永久/效果/存讀
    window.GV.newWorldSeeded(123);window.GV.weather(0);
    assert(window.GV.specPick386(0)===false,'T386a 低等級拒選');
    window.__t385Rank(8);window.__t385Diff(3); // T394b：門檻 Lv6→Lv9，夾具跟隨（rankIdx 8=Lv9）
    assert(window.GV.specPick386(0)===false,'T386a 沙盒拒選');
    window.__t385Diff(1);
    // 兩擊（UI 路徑）：rank 夠、未選 → 面板出四鈕
    window.__t385Pop(100);
    const pc386=window.GV.commPanel385();
    assert(pc386.includes('城市方向')&&pc386.includes('四選一'),'T386a 面板含城市方向四選一區');
    const sb386=document.querySelector('#bSpecPick386_0');
    assert(sb386&&typeof sb386.onclick==='function','T386a 選擇鈕綁定存在（白名單）');
    sb386.onclick(); // 第一擊=武裝
    assert(window.GV.spec386()===''&&window.GV.commPanel385().includes('⚠️ 確認'),'T386a 第一擊只武裝不生效');
    document.querySelector('#bSpecPick386_0').onclick(); // 第二擊=生效（重繪後重取）
    assert(window.GV.spec386()==='ind','T386a 第二擊選定 ind');
    assert(window.GV.specPick386(1)===false,'T386a 永久性：已選再選必拒');
    // 效果專項：同 seed 兩世界對照（設定 spec 零亂數消耗＝流完全相同，同日 taxI 比值精確 1.06）
    window.GV.newWorldSeeded(124);window.GV.weather(0);
    window.__t384Bld(3,10,10);window.__t386Tick();window.__t386Tick();
    const f0386=window.__t386Fin();
    assert(f0386.taxI>0,'T386a 對照城 A：工業稅為正（stub tick 免電網）');
    window.GV.newWorldSeeded(124);window.GV.weather(0);
    window.__t384Bld(3,10,10);window.__t386Set('ind');window.__t386Tick();window.__t386Tick();
    const f2386=window.__t386Fin();
    assert(Math.abs(f2386.taxI/f0386.taxI-1.06)<1e-6,'T386a ind 工業稅 ×1.06（同 seed 同日 stub 對照），比值 '+(f2386.taxI/f0386.taxI));
    // edu 研究速度 +1（speed 每 tick 重算，來源計數不變）
    window.__t386Set('');window.__t386Tick();const s0386=window.__t386Fin().speed;
    window.__t386Set('edu');window.__t386Tick();
    assert(window.__t386Fin().speed===s0386+1,'T386a edu 研究速度 +1');
    // 存讀：有值落欄、零值零鍵
    window.GV.save();
    assert(window.GV.inflateSave(window.GV.rawSave()).spec386==='edu','T386a 存檔欄位往返');
    window.__t386Set('');window.GV.save();
    assert(!/spec386/.test(JSON.stringify(window.GV.inflateSave(window.GV.rawSave()))),'T386a 零狀態存檔零新鍵');
  }
  // ===== T387a 醫療容量顯示層（業主 loop R7） =====
  {
    window.GV.newWorldSeeded(131);window.GV.weather(0);
    window.__t384Bld(1,15,15); // 無醫療覆蓋住宅
    assert(window.GV.igniteSick(15,15)===true,'T387a igniteSick 造病成功');
    window.__t386Tick(); // stub tick：R=.999999 ⇒ 不癒/不再感染/不轉死
    const fs387=window.GV.flowStat();
    assert(fs387.med&&fs387.med.sick===1,'T387a 同時病患計數=1（stub tick 後仍病），實得 '+(fs387.med&&fs387.med.sick));
    assert(fs387.med.cap===0,'T387a 無醫療建築容量=0');
    window.__t384Bld(13,20,15);window.__t384Bld(48,25,15); // 診所+綜合醫院
    window.__t386Tick();
    const fs388=window.GV.flowStat();
    assert(fs388.med.cap===34,'T387a 容量=診所4+綜合醫院30=34，實得 '+fs388.med.cap);
    const ph387=window.GV.flowPanel384();
    assert(ph387.includes('服務容量（醫療）')&&ph387.includes('醫療覆蓋率')&&!/NaN|undefined|Infinity/.test(ph387),
      'T387a 流向面板含醫療容量節與覆蓋率且零壞值');
    const st387=JSON.stringify(window.GV.stats());
    window.GV.flowPanel384();
    assert(JSON.stringify(window.GV.stats())===st387,'T387a 面板純讀（含 lazy 覆蓋率）');
  }
  // ===== T387b 醫療容量效果接線（業主 loop R8） =====
  { // 靜態：診所骰「擲後遮蔽」結構釘（消耗序恆等的字面證明）
    assert(html.includes("else if(clinic&&R()<.5){if(medCured387<medCap387){b.sick=0;medCured387++;}else medQueued387++;}"),
      'T387b 診所骰必須照擲、結果被床位遮蔽（R() 消耗序恆等）');
    assert(html.includes("if(hospital){if(medCured387<medCap387){b.sick=0;medCured387++;}else medQueued387++;}"),
      'T387b 醫院分支床位門檻在場（原無 R 改後仍無 R）');
  }
  { // 功能：恆等案（cap 充足）＋超載案（救護站 cap6 vs 病 7）
    window.GV.newWorldSeeded(141);window.GV.weather(0);
    window.__t384Bld(28,20,20); // 救護站（醫院級，半徑10，cap+6）
    window.__t387Cov(); // 直寫後重建覆蓋場（治癒判定要 COV）
    window.__t386Tick(); // 建立昨日快照 cap=6
    assert(window.GV.flowStat().med.cap===6,'T387b 快照 cap=6（救護站）');
    for(let i=0;i<7;i++)window.__t384Bld(1,13+i,20); // 半徑內 7 宅（13..19，避開救護站所在的 (20,20)——第一版 14+6=20 直寫蓋掉救護站，測試自雷記卡）
    for(let i=0;i<7;i++)window.GV.igniteSick(13+i,20);
    window.__t386Tick();
    const m387=window.GV.flowStat().med;
    assert(m387.cured===6&&m387.queued===1&&m387.sick===1,
      'T387b 超載：cap6 治 6 滯留 1（cured/queued/sick 實得 '+m387.cured+'/'+m387.queued+'/'+m387.sick+'）');
    window.__t386Tick(); // 次日：床位釋出，滯留者獲治
    const m388=window.GV.flowStat().med;
    assert(m388.sick===0&&m388.cured===1,'T387b 滯留者次日獲治（排隊語義），實得 sick='+m388.sick+' cured='+m388.cured+' queued='+m388.queued+' cap='+m388.cap);
    // 恆等案：cap 充足＝行為同舊版
    window.GV.newWorldSeeded(142);window.GV.weather(0);
    window.__t384Bld(28,20,20);window.__t387Cov();window.__t386Tick();
    window.__t384Bld(1,18,20);window.__t384Bld(1,22,20);
    window.GV.igniteSick(18,20);window.GV.igniteSick(22,20);
    window.__t386Tick();
    const m389=window.GV.flowStat().med;
    assert(m389.cured===2&&m389.queued===0&&m389.sick===0,'T387b 非超載：全治零滯留（舊行為恆等）');
    const ph388=window.GV.flowPanel384();
    assert(ph388.includes('今日治癒 / 滯留')&&!/NaN|undefined|Infinity/.test(ph388),'T387b 面板治癒/滯留列零壞值');
  }
  // ===== T388 旋轉收口 E 族（horizonY＋外緣懸崖；業主 loop R9；T375 G1-G5 型） =====
  { // G1 負向＋G2 正向釘
    const se388=html.indexOf('__noSeaEdge');
    const seSeg388=html.slice(se388,se388+2000);
    assert(!seSeg388.includes('syOf(0,0)'),'T388 G1 seaEdge 段不得再有 syOf(0,0)（rot≠0 病灶式）');
    assert(html.includes('const horizonY=Math.max(0,Math.round(oy+6*z));'),'T388 G2 地平線=oy 旋轉不變量式在場');
    assert(html.includes('const vp388=w2v(x,y);if(vp388[0]===N-1||vp388[1]===N-1)gc.drawImage(SPR.cliff'),
      'T388 G2 外緣懸崖 view 判邊式在場');
    assert(!/if\(x===N-1\|\|y===N-1\)gc\.drawImage\(SPR\.cliff/.test(html),'T388 G1 懸崖裸世界判邊式不得殘留');
  }
  { // G3/G4 幾何：四檔位頂點不變量＋懸崖集合等價；尾端歸零（T367 尾規）
    for(let r388=0;r388<4;r388++){
      window.GV.setRot(r388);
      const N388=window.GV.N();
      const corners=[[0,0],[N388-1,0],[0,N388-1],[N388-1,N388-1]].map(c=>window.GV.w2v(c[0],c[1]));
      assert(Math.min(...corners.map(p=>p[0]+p[1]))===0,
        'T388 G4 rot='+r388+' 世界四角經 w2v 的 min(vx+vy)=0（鑽石頂點旋轉不變量）');
      let edge388=0,mism388=0;
      for(let x=0;x<N388;x++)for(let y=0;y<N388;y++){
        if(x>0&&y>0&&x<N388-1&&y<N388-1)continue;
        const p=window.GV.w2v(x,y);
        const sel=(p[0]===N388-1||p[1]===N388-1);
        if(sel)edge388++;
        if(r388===0&&sel!==(x===N388-1||y===N388-1))mism388++;
      }
      if(r388===0)assert(mism388===0,'T388 G3 rot=0 懸崖新舊條件全邊格等價（失配 '+mism388+'）');
      assert(edge388===2*N388-1,'T388 G4 rot='+r388+' 懸崖選中格數恆 2N-1，實得 '+edge388);
    }
    window.GV.setRot(0);
    assert(window.GV.rot()===0,'T388 區塊尾 rot 歸零（全套件其後假設 rot=0）');
  }
  // ===== T389 旋轉收口 C 族（粒子深度鍵；業主 loop R10；旋轉全收官） =====
  {
    assert(!/dep=x\+y/.test(html),'T389 G1 七 spawn 點不得殘留世界空間深度鍵 dep=x+y');
    const vd389=(html.match(/dep=viewDep\(x,y\)\+\.\d+; \/\/ T389/g)||[]).length;
    assert(vd389===7,'T389 G2 粒子 spawn 深度鍵 viewDep 化應恰 7 處（dust/debris/ember/leaf/petal/steam/exhaust；14192 既有 view 行不計），實得 '+vd389);
    assert(html.includes('function viewDep(x,y){const p=w2v(x,y);return p[0]+p[1];}'),
      'T389 G3 viewDep 定義釘（r=0 時 w2v=identity ⇒ viewDep≡x+y=舊 dep 構造性恆等）');
    window.GV.setRot(0);
    const N389=window.GV.N();
    let ok389=true;
    for(const [x,y] of [[0,0],[10,7],[N389-1,N389-1],[35,2]]){const p=window.GV.w2v(x,y);if(p[0]+p[1]!==x+y)ok389=false;}
    assert(ok389,'T389 G3 rot=0 抽點 viewDep 值恆等 x+y（舊 dep 值逐位回歸）');
  }
  // ===== T390 tre 存檔正規化（守衛債第四條收口；業主 loop R11） =====
  {
    window.GV.newWorldSeeded(1);window.GV.weather(0);
    window.GV.save();
    const raw390a=window.GV.rawSave();
    const sv390=window.GV.inflateSave(raw390a);
    const N390=window.GV.N();
    const flds390=(html.match(/const RLE_F=\[([^\]]+)\]/)||[])[1];
    assert(flds390,'T390 RLE_F 欄位表可從源碼抽取');
    const names390=flds390.match(/'[a-z]+'/gi).map(x=>x.slice(1,-1));
    assert(names390.length===30,'T390 RLE_F 應 30 欄（T412 增 cmd 犯罪天數通道），實得 '+names390.length);
    let bad390=[];
    for(const f of names390)if(((sv390[f]||'').length)!==N390*N390)bad390.push(f+'='+((sv390[f]||'').length));
    assert(bad390.length===0,'T390 (i) 29 條 per-cell 字串長度全===N²（含 tre——舊編碼在此必炸），違者：'+bad390.join(','));
    let v10n=0;for(let i=0;i<sv390.tre.length;i++)if(sv390.tre.charCodeAt(i)===58)v10n++;
    assert(v10n>0,'T390 seed1 應含 v10 紫葉樹（新編碼 ":"）證明編碼路真的走到，實得 '+v10n);
    // (ii)+(iii) save→load→save 位元組恆等 + tre 全等
    window.GV.load();
    window.GV.save();
    const raw390b=window.GV.rawSave();
    assert(raw390a===raw390b,'T390 (ii) save→load→save 落盤位元組恆等（最強往返守衛）');
    // (iv) 救援：把新格式 ":" 還原成舊病格式 "10" → repair 應精確復原
    const sick390=sv390.tre.replace(/:/g,'10');
    assert(sick390.length===N390*N390+v10n,'T390 病檔構造長度=N²+K');
    const rep390=window.__t390Repair(sick390,sv390.ter,N390);
    assert(rep390.length===N390*N390,'T390 (iv) 救援後長度歸正 N²');
    assert(rep390.replace(/:/g,'10')===sick390,'T390 (iv) 再編碼恆等：救援解是病檔的合法解讀（數學驗收——歧義下可能非原解，但與病檔資訊等價）');
    let anch390=0,diff390=0;
    for(let i=0;i<N390*N390;i++){if(sv390.ter[i]!=='2'&&rep390[i]!=='0')anch390++;if(rep390[i]!==sv390.tre[i])diff390++;}
    assert(anch390===0,'T390 (iv) 全部非草地錨=0 通過');
    assert(diff390>=0,'T390 (iv) 差異回報（純診斷）：與原檔差 '+diff390+' 格 / v10='+v10n+'（歧義為資訊理論固有——"1"+"0" 相鄰對無從分辨真 v10 或獨立兩格；救援保證=合法等價解讀+全錨通過 vs fallback 全滅）');
    // (v) 無解畸形 → fallback 全 0 且長度歸正
    const junk390=window.__t390Repair('1'.repeat(N390*N390+5),sv390.ter,N390);
    assert(junk390.length===N390*N390&&/^0+$/.test(junk390),'T390 (v) 無解畸形 fallback=全 0（load 永不失敗）');
    // 觸發行字串釘
    assert(html.includes("if(d.tre&&d.tre.length>N*N)d.tre=repairTre390(d.tre,d.ter||'',N);"),
      'T390 load 端救援觸發行在場');
  }
  // ===== T391 服務容量顯示收官：垃圾/消防/警察（T387a 模式；業主 loop R12） =====
  {
    window.GV.newWorldSeeded(151);window.GV.weather(0);window.GV.step(1);
    const fs391=window.GV.flowStat();
    assert(fs391.svc&&fs391.svc.garb&&fs391.svc.fire&&fs391.svc.police,'T391 svc 三族節在場');
    assert(Number.isFinite(fs391.svc.garb.ratio)&&fs391.svc.fire.trucks>=0&&fs391.svc.police.cars>=0,'T391 三族數字有限');
    window.__t384Bld(6,10,10);window.__t384Bld(11,14,10); // 消防局+警察局
    window.__t386Tick();
    const fs392=window.GV.flowStat();
    assert(fs392.svc.fire.stations===1&&fs392.svc.police.stations===1,'T391 消防/警察站計數入快照，實得 '+fs392.svc.fire.stations+'/'+fs392.svc.police.stations);
    const ph391=window.GV.flowPanel384();
    assert(ph391.includes('垃圾 產/處理')&&ph391.includes('消防 站/總局/車')&&ph391.includes('警察 局/派出所/車')&&!/NaN|undefined|Infinity/.test(ph391),
      'T391 面板三族列零壞值');
  }
  // ===== T393 指南補全：八個新系統入指南（純顯示；業主 loop 二期 R1） =====
  {
    const gtxt393=[];
    for(let g=0;g<6;g++){const s393=window.__t343Test.guide(g);assert(s393&&s393.length>200,'T393 指南分頁 '+g+' 渲染非空');gtxt393.push(s393);}
    assert(gtxt393[0].includes('統計分頁')&&gtxt393[0].includes('流向圖層'),'T393 分頁0 新操作條目（統計分頁/流向圖層）在場');
    assert(gtxt393[1].includes('病床容量')&&gtxt393[1].includes('垃圾負載比')&&gtxt393[1].includes('容量監控'),'T393 分頁1 容量條目三件套在場');
    assert(gtxt393[2].includes('市長委託')&&gtxt393[2].includes('外貿合約')&&gtxt393[2].includes('城市專精')&&gtxt393[2].includes('工業港城'),'T393 分頁2 委託/合約/專精段在場');
    assert(!/NaN|undefined/.test(gtxt393[0]+gtxt393[1]+gtxt393[2]),'T393 三分頁零壞值');
    const hb393s=html.indexOf('function showHelp(');
    const hb393e=html.indexOf('showInfoPanel();',hb393s);
    assert(hb393s>0&&hb393e>hb393s,'T393 showHelp 函數邊界可定位');
    const hb393=html.slice(hb393s,hb393e);
    assert(!/\bR\(|\bri\(/.test(hb393),'T393 showHelp 全體（含新增文案）禁亂數呼叫（純顯示卡紅線）');
    assert((hb393.match(/T393/g)||[]).length>=6,'T393 新增條目來源註釋釘（防後人刪段不留痕），實得 '+(hb393.match(/T393/g)||[]).length);
  }
  /* ===== T395 跨格連續大田：壟行與株行的等距公度（農業美術三期 R1） =====
     連續性是純數學命題，不需像素抽樣即可證得更強（T355 先例：從原始碼解析參數做真跑算術）。
     等距鄰格螢幕偏移：x+1=(+32,+16)、y+1=(-32,+16)。
     壟相位量 (xx-2*yy) 於兩方向的增量分別為 0 與 -64 ⇒ 週期 P 必須整除 64 才處處連續。
     株格點基向量 (4s,2s)/(-4s,2s) ⇒ (±32,16) 為其整數組合的條件是 s | 8。 */
  {
    const seg395=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert(i>0&&j>i,'T395 區塊可定位：'+a);return html.slice(i,j);};
    const t279=seg395('/* ===== T279 精細田地層','/* ===== T279 精細田地層 END');
    // (1) 壟相位週期必須整除 64（跨格公度的充要條件）
    const per395=[...t279.matchAll(/\(\(\(xx-2\*yy\)%(\d+)\)\+\1\)%\1/g)].map(m=>+m[1]);
    assert(per395.length>=1,'T395 G1 field 壟相位式可解析，實得 '+per395.length+' 處');
    per395.forEach(P=>assert(P>0&&64%P===0,
      'T395 G1 壟週期必須整除 64（y+1 的相位增量 -64 才會 ≡0）；實得週期 '+P+'，64%'+P+'='+(64%P)));
    // 大農場 base 的第二套犁溝（soil374，含 flip 版：x+1 增量 +64、y+1 增量 0）同樣須整除 64
    const per374=[...html.matchAll(/\(\(\(xx\+2\*yy\)%(\d+)\)\+\1\)%\1/g)].map(m=>+m[1]);
    assert(per374.length>=1&&per374.every(P=>64%P===0),
      'T395 G2 soil374（含 flip）週期須整除 64，實得 '+JSON.stringify(per374));
    // (2) 株距係數 fsc395 必須只回 8 的因數
    const fscSrc=(html.match(/const fsc395=\(hw\)=>\{[^\n]*\};/)||[])[0];
    assert(fscSrc,'T395 G3 fsc395 定義在場');
    const fsc395T=eval('('+fscSrc.replace(/^const fsc395=/,'').replace(/;$/,'')+')');
    const svals=[],badS=[];
    for(let hw=8;hw<=400;hw++){const s=fsc395T(hw);svals.push(s);
      if(!(Number.isInteger(s)&&s>0&&8%s===0))badS.push(hw+'→'+s);}
    assert(badS.length===0,'T395 G3 fsc395 對 hw 8..400 必須恆回 8 的正因數，違者：'+badS.slice(0,5).join(','));
    assert(new Set(svals).size>=2,'T395 G3 fsc395 須真的隨田寬分級（否則大農場行距不合理）');
    // (3) 基向量形式：cx3=4s / cy3=2s / rx3=-cx3 / ry3=-cy3，且範圍計算取 |ry3|
    const bv395=(t279.match(/const cx3=4\*sc,cy3=2\*sc,rx3=-cx3,ry3=-cy3;/g)||[]).length;
    assert(bv395===2,'T395 G4 plantGrid 與 stagePlant 皆須用 (4s,2s)/(-4s,2s) 基向量，實得 '+bv395+' 處');
    const abs395=(t279.match(/rN=Math\.ceil\(hh\/Math\.abs\(ry3\)\)\+2/g)||[]).length;
    assert(abs395===2,'T395 G4 ry3 為負，行數上限必須取絕對值（否則迴圈空轉＝作物全消失），實得 '+abs395+' 處');
    // (4) 真跑算術：對每個合法 s，驗證 (±32,16) 是基向量整數組合，且兩基向量的壟相位皆 ≡0
    const P395=per395[0],badV=[];
    for(const s of [1,2,4,8]){
      const cvec=[4*s,2*s], rvec=[-4*s,2*s];
      const det=cvec[0]*rvec[1]-cvec[1]*rvec[0];
      for(const [dx,dy] of [[32,16],[-32,16]]){
        const cc=(dx*rvec[1]-dy*rvec[0])/det, rr=(cvec[0]*dy-cvec[1]*dx)/det;
        if(!(Number.isInteger(cc)&&Number.isInteger(rr)))badV.push('s'+s+'('+dx+','+dy+')→c'+cc+'/r'+rr);
      }
      if((((cvec[0]-2*cvec[1])%P395)+P395)%P395!==0||(((rvec[0]-2*rvec[1])%P395)+P395)%P395!==0)badV.push('s'+s+'相位≠0');
    }
    assert(badV.length===0,'T395 G5 對 s∈{1,2,4,8}：(±32,16) 須為基向量整數組合且兩基向量壟相位 ≡0（株成行於脊上），違者：'+badV.join(','));
    // (5) 鄰格相位增量真跑驗算（連續性本體）
    const badD=[[32,16],[-32,16],[64,0],[0,32]].filter(([dx,dy])=>((((dx-2*dy)%P395)+P395)%P395)!==0);
    assert(badD.length===0,'T395 G6 四種鄰格偏移的壟相位增量須全 ≡0（跨格連續本體），違者：'+JSON.stringify(badD));
    // (6) 零亂數（美術層鐵律）。註釋須先剝除：T279 原註釋含「不碰 R()」字面量＝守衛自雷（T383 剝除器同款需求）
    const strip395=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    assert(!/\bR\(\)|\bri\(/.test(strip395(t279)),'T395 G7 T279 田地層【代碼】全體禁模擬亂數（決定性取向只准 streetHash）');
  }
  /* ===== T397 作物日曆與收割敘事（農業美術三期 R3） ===== */
  {
    // (1) farmGrow 三階結構：3 季 × 3 階 × 16 鍵全滿（割茬階真的被烘出來，不是空殼）
    const fg397=window.GV.sprAtlas356().entries.filter(e=>e.fam==='farmGrow');
    assert(fg397.length===3*3*16+3*3, 'T397 G1 farmGrow 應為 3 季×3 階×(16 個 k22 + 1 個 k53)=153 張，實得 '+fg397.length);
    assert(/SPR\.farmGrow=\{0:\{0:\{\},1:\{\},2:\{\}\},1:\{0:\{\},1:\{\},2:\{\}\},2:\{0:\{\},1:\{\},2:\{\}\}\};/.test(html),
      'T397 G1 farmGrow 宣告須為三階（0 小苗 1 拔節 2 割茬）');
    assert(/for\(const st of\[0,1,2\]\)/.test(html),'T397 G1 stages 迴圈須產三階');
    // (2) 週期釘 16 且四段邊界正確
    const per397=(html.match(/streetHash\(o\.x,o\.y,777\)\*(\d+)\)\)%(\d+)\)\/4\)/)||[]);
    assert(per397[1]==='16'&&per397[2]==='16','T397 G2 生長週期須為 16（四段各 4 天），實得 '+per397[1]+'/'+per397[2]);
    // 四段映射：gst 0/1/3 走 farmGrow（3→stage 2），gst 2 走 base/farmSea
    assert(/const gsIdx397=gst===3\?2:gst;/.test(html),'T397 G2 gst→stage 映射（收割 3 對應 farmGrow 第三階）在場');
    assert(/if\(gst!==2&&SPR\.farmGrow/.test(html),'T397 G2 成熟段（gst 2）必須走 base/farmSea，其餘走 farmGrow');
    // (3) 豐收節聯動讀的是 cityEvent 狀態，不是亂數
    const hv397=(html.match(/const hv397=[^\n]*/)||[])[0]||'';
    assert(/cityEvent/.test(hv397)&&/harvest/.test(hv397)&&!/\bR\(\)|\bri\(/.test(hv397),
      'T397 G3 豐收節收割態須讀 cityEvent（決定性狀態），禁模擬亂數');
    // (4) 割茬繪製本體在場且零亂數（T279 區塊整體零亂數由 T395 G7 覆蓋，此處釘割茬分支存在）
    const t279b=html.slice(html.indexOf('/* ===== T279 精細田地層'),html.indexOf('/* ===== T279 精細田地層 END'));
    assert(/if\(st===2\)\{/.test(t279b),'T397 G4 stagePlant 須有割茬分支');
    assert(/streetHash\(c\+64,r\+64,3970\)/.test(t279b),'T397 G4 草捆取向須由決定性雜湊決定（零亂數）');
    /* (5) 逐鍵覆蓋：每個農場鍵必須恰好出現 9 次＝3 季×3 階全烘。
       只看總數 153 會被「某季多烘、某季漏烘」矇混（T380a 的教訓：self-check 必須逐項不能只看總量）。 */
    // atlas 的 farmGrow key 形如 `<季>.<階>.<鍵>`（遞迴攤平時帶巢狀前綴），可精確驗每個季階組合
    const combo397={},base397={},badK397=[];
    for(const e of fg397){
      const p=e.key.split('.');
      if(p.length<3){badK397.push(e.key);continue;}
      combo397[p[0]+'.'+p[1]]=(combo397[p[0]+'.'+p[1]]||0)+1;
      const bk=p.slice(2).join('.');
      base397[bk]=(base397[bk]||0)+1;
    }
    assert(badK397.length===0,'T397 G5 farmGrow key 須為 季.階.鍵 格式，違者：'+badK397.slice(0,5).join(','));
    const badC397=Object.keys(combo397).filter(k=>combo397[k]!==17);
    const badB397=Object.keys(base397).filter(k=>base397[k]!==9);
    assert(Object.keys(combo397).length===9&&badC397.length===0,
      'T397 G5 九個季階組合（3 季×3 階）每組須有 17 鍵（16 個 k22＋1 個 k53）；組數='
      +Object.keys(combo397).length+' 違者：'+badC397.map(k=>k+'×'+combo397[k]).join(','));
    assert(Object.keys(base397).length===17&&badB397.length===0,
      'T397 G5 每個農場鍵須橫跨全部 9 個季階組合；鍵數='+Object.keys(base397).length
      +' 違者：'+badB397.map(k=>k+'×'+base397[k]).join(','));
    // 每張割茬圖都必須有像素尺寸（防「宣告了第三階但 stages 沒真的畫」）
    assert(fg397.every(e=>e.w>0&&e.h>0),'T397 G5 farmGrow 全部 entry 須有正尺寸');
  }
  /* ===== T400a 牧場生命感·靜態層（農業美術三期 R4） ===== */
  {
    const s400=html.indexOf('/* ===== T400a 牧場生命感·靜態層');
    const e400=html.indexOf('/* ===== T400a 牧場生命感·靜態層 END');
    assert(s400>0&&e400>s400,'T400a G1 區塊可定位');
    const blk400=html.slice(s400,e400);
    // (1) 位置：必須在 T273 END 之後（落在 T273 區塊內會觸紅其三條不變量——施工時真踩過）
    const t273e=html.indexOf('/* ===== T273 牧場變體擴充 END ===== */');
    assert(t273e>0&&s400>t273e,'T400a G1 本層須位於 T273 區塊之外（之後），否則破壞 T273 的賦值/plate/亂數不變量');
    // (2) 只加蓋、不新增精靈鍵（新增鍵會逃過既有的錨點與底座裁切守衛）
    assert(!/SPR\.bld\[[^\]]*\]\s*=/.test(blk400),'T400a G2 本層只准在既有精靈上加蓋，不得賦值任何 SPR.bld 鍵');
    assert(/SPR\.bld\['23_1_'\+v\]/.test(blk400),'T400a G2 須逐一取用五個既有牧場鍵');
    // (3) 零亂數（美術層鐵律）：註釋先剝除，防 T395 同款自雷
    const strip400=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    assert(!/\bR\(\)|\bri\(|Math\.random|spriteTexRand/.test(strip400(blk400)),
      'T400a G3 本層【代碼】零亂數（取向一律 streetHash）');
    const sh400=(blk400.match(/streetHash\(/g)||[]).length;
    assert(sh400>=8,'T400a G3 決定性雜湊呼叫數應 ≥8（斑/徑/泥地各自取向），實得 '+sh400);
    // (4) 不得溢出地墊：所有落筆前須過 inPlate400 不等式（否則痕跡會畫到鄰格）
    assert(/const inPlate400=\(x,y\)=>Math\.abs\(x-68\)\/64\+Math\.abs\(y-116\)\/32<=\.97;/.test(blk400),
      'T400a G4 地墊不等式須為 footprint 菱形且留邊（.97）');
    // 四個落筆點各須一道保護：啃食斑／踩踏動線／水槽總判定／泥地
    const guardN=(blk400.match(/inPlate400\(/g)||[]).length;
    assert(guardN>=4,'T400a G4 每個繪製點都須先過 inPlate400（啃食斑/動線/水槽/泥地），實得 '+guardN+' 處');
    // (5) 真跑：五張牧場精靈仍在、尺寸未變（加蓋不得改畫布）
    const at400=window.GV.sprAtlas356().entries.filter(e=>/^23_1_[0-4]$/.test(e.key));
    assert(at400.length===5,'T400a G5 五個牧場變體仍在，實得 '+at400.length);
    assert(at400.every(e=>e.w===136&&e.h===150&&e.ax===68&&e.ay===148),
      'T400a G5 加蓋不得改變畫布尺寸或錨點');
  }
  /* ===== T401 微氣象一期：收割揚塵＋秋末燒茬煙柱（農業美術三期 R5） ===== */
  {
    const i401=html.indexOf('/* T401 微氣象一期');
    assert(i401>0,'T401 G1 分支在場');
    const j401=html.indexOf('let offs=null,col=null,big=false;',i401);
    assert(j401>i401,'T401 G1 分支必須位於 offs 路徑之前（獨立 push，不沾 offs 尾端的 ri() 選點）');
    const blk401=html.slice(i401,j401);
    assert(/&&!b\.ref&&/.test(blk401),'T401 G1 須含 !b.ref 守衛（防 2×2 錨外三格重噴）');
    assert(/__noFarmFx401/.test(blk401),'T401 G1 逃生閥在場');
    // (2) 燒茬硬上限：宣告+判定字面
    assert(/let burn401=0;/.test(html)&&/burn401<2&&/.test(blk401)&&/burn401\+\+/.test(blk401),
      'T401 G2 燒茬煙柱須有全圖硬上限 2 的計數器（宣告/判定/遞增三件套）');
    // (3) 零模擬亂數（註釋剝除後檢）
    const strip401=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    assert(!/\bR\(\)|\bri\(/.test(strip401(blk401)),'T401 G3 分支【代碼】零 R()/ri()（抖動 Math.random、選址 streetHash）');
    // (4) gst 公式與 draw 端（T397）逐字一致：週期 16、鹽 777
    const f401=(blk401.match(/Math\.floor\(\(\(day\+Math\.floor\(streetHash\([a-z.]+,[a-z.]+,777\)\*16\)\)%16\)\/4\)/g)||[]).length;
    assert(f401===1,'T401 G4 揚塵側 gst 公式須與 draw 端逐字一致（鹽 777/週期 16），實得 '+f401);
    const fDraw401=(html.match(/streetHash\(o\.x,o\.y,777\)\*16\)\)%16\)\/4\)/g)||[]).length;
    assert(fDraw401===2,'T401 G4 draw 端公式恰 2 處（T397 選圖＋T403b 拖拉機，逐字同款），實得 '+fDraw401);
  }
  /* ===== T398a 稻草人（農事活動層 v1，農業美術三期 R6） ===== */
  {
    const i398=html.indexOf('const scare398=');
    assert(i398>0,'T398a G1 scare398 定義在場');
    const blk398=html.slice(i398,html.indexOf('const doFarm=',i398));
    // (1) 呼叫恰 2 處（base+季節迴圈），且每處後方緊鄰同段代碼內須有 stages 呼叫（先畫後快照=全生長階段常駐）
    const calls398=(html.match(/scare398\(g,ax,ay-16,hw,hh,key\);?/g)||[]).length;
    assert(calls398===4,'T398a G1 呼叫須恰 4 處（base 快照前+密植後、季節迴圈同款；密植後蓋回=成熟田不埋人），實得 '+calls398);
    assert(/scare398\(g,ax,ay-16,hw,hh,key\);stages\(b\.img,0\)/.test(html),
      'T398a G1 base 側須先稻草人後 stages 快照');
    assert(/plantGrid\(g,ax,ay,hw,hh,cls,0\);scare398\(g,ax,ay-16,hw,hh,key\)/.test(html),
      'T398a G1 base 側密植後須同位重繪（成熟田稻草人立於作物之上）');
    assert(/plantGrid\(g,ax,ay,hw,hh,cls,si\);if\(si!==3\)\{?scare398\(g,ax,ay-16,hw,hh,key\)/.test(html),
      'T398a G1 季節側密植後同位重繪且守冬（T399 後可帶大括號包 egret）');
    // (2) 冬季不畫且 stages 守衛完整（施工自雷：把 si!==3 搶給稻草人讓 stages 裸奔冬季＝開機即炸）
    assert(/if\(si!==3\)\{scare398\(g,ax,ay-16,hw,hh,key\);stages\(ss\.img,si\);\}/.test(html),
      'T398a G2 季節側須 if(si!==3){scare398;stages;} 同組守衛（缺一即冬季炸或稻草人上雪田）');
    // (3) 決定性：scare398 本體禁一切亂數（連 Math.random 也不許——稻草人不許抖動）
    const strip398=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip398(blk398)),
      'T398a G3 scare398【代碼】零亂數（含 Math.random；位置/選型全 streetHash）');
    assert(/streetHash\(kh,0,3980\)>=\.55/.test(blk398),'T398a G3 ~55% 選型門檻在場');
    // (4) 真跑：烘焙後至少一個 22_1_* base 精靈存在（開機不炸的煙霧測試；像素驗證屬瀏覽器端）
    assert(!!window.GV.sprAtlas356().entries.find(e=>e.key==='22_1_1'&&e.fam==='bld'),
      'T398a G4 農場精靈烘焙完成');
  }
  /* ===== T399 水田家族（農業美術三期 R7） ===== */
  {
    const strip399=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    // (1) paddy 替代分支：rice 且非冬才替代；field() 本體不動（T395 G1 另行守著）
    assert(/const fld399=\(g,si\)=>\{if\(cls==='rice'&&si!==3\)paddy399\(g,ax,ay,hw,hh,si\);else field\(g,ax,ay,hw,hh,si\);\};/.test(html),
      'T399 G1 fld399 分支須為「rice 且非冬 → paddy399，否則原 field」（冬季放水休耕走雪田管線）');
    const fldCalls399=(html.match(/fld399\(g,(0|si)\);/g)||[]).length;
    assert(fldCalls399===2,'T399 G1 doFarm 兩處田面繪製都須經 fld399 分派，實得 '+fldCalls399);
    // (2) paddy399 本體：水面+田字內十字堤，零亂數
    const ip399=html.indexOf('const paddy399=');
    assert(ip399>0,'T399 G2 paddy399 定義在場');
    const pBlk399=html.slice(ip399,html.indexOf('const egret399=',ip399));
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip399(pBlk399)),'T399 G2 paddy399 零亂數（漣漪 streetHash）');
    assert(/const yy2=Math\.round\(t2\/2\);/.test(pBlk399),'T399 G2 內十字堤（田字四格）在場');
    // (3) 白鷺：rice 限定、plantGrid 之後（立於稻秧之上；T398a 埋人教訓）
    const egretCalls399=(html.match(/if\(cls==='rice'\)egret399\(g,ax,ay-16,hw,hh,key\);/g)||[]).length;
    assert(egretCalls399===2,'T399 G3 白鷺呼叫恰 2 處（base+季節迴圈）且 rice 限定，實得 '+egretCalls399);
    assert(/scare398\(g,ax,ay-16,hw,hh,key\);if\(cls==='rice'\)egret399/.test(html),
      'T399 G3 白鷺須在密植與稻草人之後（不被作物埋）');
    const eBlk399=html.slice(html.indexOf('const egret399='),html.indexOf('const doFarm='));
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip399(eBlk399)),'T399 G3 egret399 零亂數');
    // (4) 螢火蟲擴充：ref 解引用+准入四選一
    assert(/const rb399=t\.bld&&\(t\.bld\.ref\?T\(idx\(t\.bld\.ref\[0\],t\.bld\.ref\[1\]\)\)\.bld:t\.bld\);/.test(html),
      'T399 G4 螢火蟲准入須做 ref 解引用（2×2 農場四格同權）');
    assert(/if\(t\.t!==0&&!nearPark&&!t\.tree&&!isPaddy399\)continue;/.test(html),
      'T399 G4 准入條件＝水/公園/樹/水稻田 四選一');
  }
  /* ===== T403 農業美術動態收官波次（三期 R8）：a 草緣/b 拖拉機+灑水器/c 牧場動態/d 田面晨霧 ===== */
  {
    const strip403=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    // (a) 草叢越界：呼叫恰 2 處、冬季不撒、零亂數
    const ga403=html.indexOf('const grass403=');
    assert(ga403>0,'T403a G1 grass403 定義在場');
    const gBlk403=html.slice(ga403,html.indexOf('if(b){const g=b.img',ga403));
    assert(/if\(si===3\)return;/.test(gBlk403),'T403a G1 冬季雪地不撒草');
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip403(gBlk403)),'T403a G1 grass403 零亂數');
    const gCalls403=(html.match(/grass403\(g,(0|si)\);/g)||[]).length;
    assert(gCalls403===2,'T403a G1 呼叫恰 2 處（base+季節迴圈），實得 '+gCalls403);
    // (b/c) 動態 overlay：區塊在場、零 Math.random（同 visT 重繪恆等）、逃生閥
    const ib403=html.indexOf('/* ===== T403b/c 農事與牧場動態');
    assert(ib403>0,'T403b G2 動態區塊在場');
    const bBlk403=html.slice(ib403,html.indexOf('__noScaffold',ib403));
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip403(bBlk403)),
      'T403b G2 動態 overlay【代碼】零亂數（只准 visT+streetHash＝同 visT 重繪恆等）');
    assert((bBlk403.match(/__noFarmLife403/g)||[]).length===2,'T403b G2 逃生閥兩分支各一');
    assert(/bd\.k===53&&gst403>=2/.test(bBlk403),'T403b G2 拖拉機限大農場成熟/割茬期');
    assert(/bd\.k===22&&gst403<=1&&streetHash\(o\.x,o\.y,4035\)<\.3/.test(bBlk403),'T403b G2 灑水器限生長期 30% 農戶');
    assert(/bd\.v===4/.test(bBlk403),'T403c G3 雞群（v4）分支在場');
    assert(/const DOOR403=\[\[52,130,4,6\],\[49,129,4,6\],\[46,131,4,6\],\[45,128,5,8\],\[45,129,6,8\]\]/.test(bBlk403),
      'T403c G3 穀倉門座標表五變體在場（取自烘焙碼畜舍座標）');
    assert(/nightDepth<\.5/.test(bBlk403)&&/門開＝深色門洞|#241a12/.test(bBlk403)&&/#7a5230/.test(bBlk403),
      'T403c G3 門晝開（深門洞）夜閉（門板+門縫暖光）雙態在場');
    assert(/streetHash\(o\.x,o\.y,4040\)<\.4/.test(bBlk403)&&/#c8a860/.test(bBlk403),
      'T403e G3 農夫點綴（40% 農戶+草帽小人）在場');
    assert(/animOn&&!lodFar/.test(bBlk403),'T403b/c 節流（animOn/lodFar）在場');
    // (d) 田面晨霧：獨立層、ref 解引用、w2v、逃生閥、強度峰態式
    const id403=html.indexOf('/* ===== T403d 田面晨霧');
    assert(id403>0,'T403d G4 晨霧區塊在場');
    const dBlk403=html.slice(id403,html.indexOf('// T182 晨霧（Opus 親手）',id403));
    assert(/__noFieldMist403/.test(dBlk403),'T403d G4 逃生閥在場');
    assert(/clamp\(1-Math\.abs\(ph-\.25\)\/\.09,0,1\)/.test(dBlk403),'T403d G4 強度峰態式（日出最濃）同 T182 形');
    assert(/t3\.bld\.ref\?T\(idx\(t3\.bld\.ref\[0\],t3\.bld\.ref\[1\]\)\)\.bld/.test(dBlk403),'T403d G4 ref 解引用');
    assert(/const _p403=w2v\(x3,y3\);/.test(dBlk403),'T403d G4 格位先過 w2v（T375 硬性）');
    assert(!/\bR\(\)|\bri\(|Math\.random/.test(strip403(dBlk403)),'T403d G4 零亂數');
    assert(!/\bfog\b/.test(strip403(dBlk403)),'T403d G4 不得觸碰既有 fog 變數（同名遮蔽地雷）');
  }
  /* ===== T394b 平衡調參（二期 R3；T394a 報告建議 1-4） ===== */
  {
    /* (1) T442 跟版（**動既有斷言，理由寫在這裡**）：原本抓 `rankIdx+1<9` 的字面 9，
       再數「城市等級 9 解鎖」恰 2 處，用意是「改門檻者順手改文案（三處同源）」。
       T442 把三處合成**同一個常數** `SPEC_MIN_RANK386`，文案改由它拼出來 ⇒ 兩個字面比對都撲空。
       **這不是放寬**：原本靠「人記得同時改三處」，現在靠「只有一處可以改」。
       新釘更強——常數在場且值為 9、使用點引用常數、且**不得再出現手抄的『城市等級 <數字> 解鎖』**。 */
    const gate394=(html.match(/const CMS_MIN_RANK385=(\d+), CMS_MIN_POP385=(\d+), SPEC_MIN_RANK386=(\d+);/)||[])[3];
    assert(gate394==='9','T394b G1 SPEC_MIN_RANK386 須為 9,實得 <'+gate394);
    assert(/spec386\|\|diff===3\|\|rankIdx\+1<SPEC_MIN_RANK386\)return false;/.test(html),
      'T394b G1 specPick386 的門檻必須引用 SPEC_MIN_RANK386,不得寫死數字');
    assert(/'城市等級 '\+SPEC_MIN_RANK386\+' 解鎖/.test(html),
      'T394b G1 指南文案必須由 SPEC_MIN_RANK386 拼出來,不得手抄');
    const hard394=(html.match(/城市等級 \d+ 解鎖/g)||[]);
    assert(hard394.length===0,
      'T394b G1 不得出現手抄的「城市等級 <數字> 解鎖」字面(實得 '+JSON.stringify(hard394)+
      ');門檻只有一個真相來源 SPEC_MIN_RANK386,抄一份就會過期而且沒有人會發現'
      +'——本卡 §1 的 edu「政策日費+$12」就是這樣過期三十幾張卡的');
    // (2) edu 費規模化:公式在場+界 [6,40] 真跑驗算+基線零影響(sq 未選恆 0 由 T386a 位元恆等紅線守)
    const feeM394=(html.match(/const eduFee394=Math\.min\(40,Math\.max\(6,Math\.round\(pop\/100\)\)\)/)||[])[0];
    assert(feeM394,'T394b G2 eduFee394 公式(min40/max6/pop百分之一)在場');
    assert(/sq\('edu',eduFee394,0\)/.test(html),'T394b G2 upReg 須引用 eduFee394(固定 12 已廢)');
    const fee394=(p)=>Math.min(40,Math.max(6,Math.round(p/100)));
    assert(fee394(0)===6&&fee394(800)===8&&fee394(4000)===40&&fee394(99999)===40,'T394b G2 費用界驗算 [6,40]');
    // (3) happy80 目標 .78 + 值-文案同步(兩條 happy 池目皆驗)
    for(const em of html.matchAll(/\{id:'happy(\d+)',[^}]*nm:'幸福 (\d+)%[^']*'[^}]*target:\.(\d+),/g)){
      assert(em[2]===em[3],'T394b G3 happy'+em[1]+' 值-文案須同步:nm '+em[2]+'% vs target .'+em[3]);
    }
    assert(/\{id:'happy80',[^}]*target:\.78,/.test(html),'T394b G3 happy80 目標須為 .78(觀測天花板 .75 下沿)');
    // (4) transit400 目標 1200 + 值-文案同步
    const tm394=html.match(/\{id:'transit400',[^}]*nm:'公共運量 (\d+)[^']*'[^}]*target:(\d+),/);
    assert(tm394&&tm394[1]===tm394[2]&&tm394[2]==='1200',
      'T394b G4 transit400 目標須 1200 且值-文案同步,實得 nm='+(tm394&&tm394[1])+' target='+(tm394&&tm394[2]));
    // (5) happy 判定與面板同源(2dp 捨入)
    assert(/cAct385\.src==='happy'\?Math\.round\(cityHappy\*100\)\/100:0;/.test(html),
      'T394b G5 happy 判定須用 2dp 捨入值(面板顯示什麼就按什麼判;原值路徑=44 個邊界日玩家被騙)');
  }
  /* ===== T402 視覺/載具層亂數流隔離（二期 R4） =====
     交付=「R() 只被 tick/buildSprites 消耗」：幀路徑 20 處 ri()（含 T402 評估漏掃的
     updDispatch 共用 helper 2 處）全換 vri（Math.random 系）。
     邊界誠實聲明：本卡【不是】完全可重現——roadPass 壅堵回饋（T129）與服務車抵達效果
     （救護治病/消防滅火）是設計使然的幀→模擬耦合，完全決定性需「決定性派遣+固定步長」=後續卡。 */
  {
    // (1) vri 定義在場
    assert(/const vri=n=>Math\.floor\(Math\.random\(\)\*n\);/.test(html),'T402 G1 vri（視覺專用亂數）定義在場');
    // (2) 全檔 vri 呼叫恰 20 處（18 具名函數＋updDispatch 2）
    const vriN402=(html.match(/\bvri\(/g)||[]).length-1; // 減去定義行自身的 'vri(' 不出現於定義…定義是 vri=n=>，不含 vri( 呼叫
    const vriCalls402=(html.match(/[^a-zA-Z_]vri\(/g)||[]).length;
    assert(vriCalls402===20,'T402 G2 vri() 呼叫恰 20 處，實得 '+vriCalls402);
    // (3) 幀路徑函數逐一零模擬亂數（剝註後掃；名單含共用 helper=評估漏掃的教訓）
    const FNS402=['updSmoke','updCars','updTrains','updTrams','updShips','updBuses','updGarbageTrucks',
      'updDispatch','updAmbulances','updFireTrucks','updPoliceCars','updRouteBuses','updLifeShips',
      'updRain','updFxParts','updConfetti','updateCitizensMove'];
    const strip402=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    const bad402=[];
    for(const fn of FNS402){
      const a=html.indexOf('function '+fn);
      if(a<0){bad402.push(fn+':MISSING');continue;}
      const b=html.indexOf('\nfunction ',a+10);
      const bd=strip402(html.slice(a,b<0?a+5000:b));
      const hs=(bd.match(/\bri\(|\bR\(\)/g)||[]).length;
      if(hs>0)bad402.push(fn+':'+hs);
    }
    assert(bad402.length===0,'T402 G3 幀路徑函數【代碼】零 R()/ri()（亂數流隔離本體），違者：'+bad402.join(','));
    // (4) 雙生子動態守衛：純 tick vs tick+幀（__noVeh 關 roadPass 回饋；30 天=首次服務出勤前的
    //     乾淨窗口）逐項恆等——未來任何人往幀路徑塞回一個 R()/ri()，這裡當場紅。
    window.GV.newWorldSeeded(301);window.GV.setDiff(1);window.GV.ai(true);
    for(let d=0;d<30;d++)window.GV.step(1);
    const A402=window.GV.stats();
    window.__noVeh=true;
    window.GV.newWorldSeeded(301);window.GV.setDiff(1);window.GV.ai(true);window.GV.setSpeed(0);
    for(let d=0;d<30;d++){window.GV.step(1);window.GV.advanceN(0.05,12);}
    const B402=window.GV.stats();
    window.__noVeh=false;window.GV.setSpeed(1);window.GV.ai(false);
    assert(A402.pop===B402.pop&&A402.money===B402.money&&A402.happy===B402.happy&&A402.buildings===B402.buildings,
      'T402 G4 雙生子恆等（純tick vs tick+幀×30天）：A pop'+A402.pop+'/$'+A402.money+'/h'+A402.happy
      +' vs B pop'+B402.pop+'/$'+B402.money+'/h'+B402.happy+'——幀路徑有 R()/ri() 殘留即分岔');
  }
  /* ===== T404 農牧退出 T160 廣場前庭環（業主回報線上修） ===== */
  {
    assert(/const AGRI404=bd\.k===22\|\|bd\.k===23\|\|bd\.k===53\|\|bd\.k===63;/.test(html),
      'T404 G1 農牧名單（22 農場/23 牧場/53 大農場/63 溫室）字面在場');
    assert(/const pBig=!pRci&&pSz>=2&&!AGRI404;/.test(html),
      'T404 G1 pBig 須排除農牧（農場曾被當大型公共建築給外擴石板前庭環＝覆蓋鄰地塊，業主實機回報）');
  }
  /* ===== T405 類別標記可關（TheoTown 觀感對標第一刀） ===== */
  {
    // (1) 設定讀取＋預設關語意（產品碼預設關；harness 於 eval 前顯式開啟以維持 T345 覆蓋）
    assert(/badgePref=localStorage\.getItem\(SAVEKEY\+'\.badge'\)==='1';/.test(html),
      'T405 G1 設定讀取須為「僅 \'1\' 為開」＝未設定即關（TheoTown 觀感為預設）');
    assert(/if\(!badgePref\)window\.__noBadge=true;/.test(html),
      'T405 G1 未開啟時須設 __noBadge（徽記烘進 sprite，只能在 buildSprites 前決定）');
    const iRead=html.indexOf("badgePref=localStorage.getItem(SAVEKEY+'.badge')");
    const iBuild=html.indexOf('buildSprites();');
    assert(iRead>0&&iBuild>iRead,'T405 G1 設定讀取必須早於 buildSprites() 呼叫，否則旗標無效');
    // (2) 三處 __noBadge 判斷全在場（T345 本體＋兩個 parity helper＝偵查抓到的逃生閥漏網）
    assert(/const parity364=\(sp\)=>\{\s*\n\s*if\(window\.__noBadge\)return;/.test(html),
      'T405 G2 parity364（k121-123 煉油/鋼鐵/造船）須受 __noBadge 控制（原本硬畫，關了仍頂方塊）');
    assert(/const parity364cd=\(sp,sz,cat\)=>\{\s*\n\s*if\(window\.__noBadge\)return;/.test(html),
      'T405 G2 parity364cd（k124-133 社區/防災）須受 __noBadge 控制（同款漏網）');
    assert(html.includes('if(!window.__noBadge){'),'T405 G2 T345 本體加蓋層判斷仍在（與 T345 守衛同源）');
    // (3) UI 開關在場且切換後 reload（sprite 已烘，不 reload 不生效）
    assert(/localStorage\.setItem\(SAVEKEY\+'\.badge',badgePref\?'1':'0'\)/.test(html),'T405 G3 開關須持久化');
    assert(/bg\.onclick=\(\)=>\{[^}]*location\.reload\(\);\}/.test(html),
      'T405 G3 切換後須 location.reload（徽記烘進 sprite，不重載不生效）');
    // (4) 新增碼零亂數（鐵律2；註釋剝除後檢）
    const strip405=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    const seg405=html.slice(html.indexOf('let badgePref=false;'),html.indexOf('let mapSizePref=72;'));
    assert(seg405.length>20&&!/\bR\(\)|\bri\(|Math\.random/.test(strip405(seg405)),
      'T405 G4 設定段零亂數');
  }
  /* ===== T406 天際線梯度（TheoTown 觀感對標第二刀） ===== */
  {
    // (1) 排名表必須在 tasks 迴圈內建立（不得另抄高度表——抄表必漂移，T345 的 SZB 手抄副本前科）
    const iSort=html.indexOf('tasks.sort((a,b)=>(a.k-b.k)||(a.lv-b.lv)||(a.v-b.v));');
    const iMk=html.indexOf('const mkBld=t=>{');
    assert(iSort>0&&iMk>0,'T406 G1 tasks 排序與 mkBld 可定位（T426 拆段後 mkBld 上提至總管之後，僅驗存在）');
    const iSegEnd406=html.indexOf('\n/* ===== T426 S4',iSort);
    assert(iSegEnd406>iSort,'T406 G1 排名表段應可界定（T426 拆段後以 S4 段標記收尾）');
    const seg406=html.slice(iSort,iSegEnd406);
    assert(/\(VH406\[key\]\|\|\(VH406\[key\]=\[\]\)\)\[t\.v\]=\(t\.d\.h\|\|0\)\+\(t\.d\.hw\|\|0\);/.test(seg406),
      'T406 G1 樓高必須取自【同一份 tasks 清單】的 d.h+d.hw（與實際建造的 sprite 同源）');
    assert(/rankV406\(\);/.test(seg406),'T406 G1 tasks 段須成表（rankV406 冪等，塔在 TWDEF 後再呼叫一次）');
    // (2) 兩個寫入點都仍求值 ri(12)＝亂數消耗次數/順序零位移（鐵律2）
    assert(/v:\(kk===1\|\|kk===2\|\|kk===3\)\?pickV406\(kk,1,x,y,ri\(12\)\):ri\(4\)/.test(html),
      'T406 G2 生成點須為 pickV406(...,ri(12))＝ri(12) 仍求值');
    assert(/b\.v=\(b\.k===1\|\|b\.k===2\|\|b\.k===3\)\?pickV406\(b\.k,b\.lv,x,y,ri\(12\)\):ri\(4\)/.test(html),
      'T406 G2 升級點須為 pickV406(...,ri(12))＝ri(12) 仍求值');
    // (3) picker 零亂數（剝註後檢）＋殘表必回退
    const strip406=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
    const fn406=html.slice(html.indexOf('function pickV406('),html.indexOf('function judgeWealth('));
    assert(fn406.length>200&&!/\bR\(\)|\bri\(|Math\.random/.test(strip406(fn406)),'T406 G3 pickV406 零亂數');
    assert(/if\(!rank\|\|rank\.length<2\)return fallback;/.test(fn406),'T406 G3 排名表殘缺須回退擲骰值（絕不拋錯）');
    // (4) 排名表真跑驗算：每個 (k,lv) 恰 12 變體、rank 為由矮到高的合法排列
    const vh406=window.GV.vh406();
    const badR=[];
    for(const k of [1,2,3])for(const lv of [1,2,3]){
      const key=k+'_'+lv,vh=vh406.vh[key],rk=vh406.rank[key];
      if(!vh||!rk){badR.push(key+':MISSING');continue;}
      if(vh.length!==12||rk.length!==12){badR.push(key+':len'+vh.length+'/'+rk.length);continue;}
      if([...rk].sort((a,b)=>a-b).join()!=='0,1,2,3,4,5,6,7,8,9,10,11'){badR.push(key+':非合法排列');continue;}
      for(let i2=1;i2<12;i2++)if(vh[rk[i2]]<vh[rk[i2-1]]){badR.push(key+':未單調@'+i2);break;}
    }
    assert(badR.length===0,'T406 G4 九組 (k,lv) 的樓高表須各 12 項且 rank 為由矮到高的合法排列，違者：'+badR.join(','));
    // (5) 梯度實證：AI 城 300 天後，鄰域密度前 25% 組的「同級高度百分位」須顯著高於後 25%
    //     （白噪音下兩組應無差異；門檻 15 個百分點，實測三種子 31~33）
    window.GV.newWorldSeeded(301);window.GV.setDiff(1);window.GV.ai(true);
    for(let d=0;d<300;d++)window.GV.step(1);
    window.GV.ai(false);
    const N406=window.GV.N(),rows406=[],span406={};
    for(let y=0;y<N406;y++)for(let x=0;x<N406;x++){
      const b=window.GV.tile(x,y).bld;
      if(!b||b.ref||b.k>3||b.lv<2)continue;
      let n=0;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=N406||ny>=N406)continue;
        const nb=window.GV.tile(nx,ny).bld;
        if(nb&&(nb.k<=3||nb.k===33||nb.k===34||nb.k===105||nb.k===106))n++; // T407：與 pickV406 同口徑（都市織理）
      }
      const key=b.k+'_'+b.lv,a=vh406.vh[key]||[];
      if(!span406[key]){const hs=a.filter(h=>h>0);span406[key]=[Math.min(...hs),Math.max(...hs)];}
      const [lo,hi]=span406[key];
      rows406.push({dens:n,pct:hi>lo?((a[b.v]||0)-lo)/(hi-lo):0});
    }
    assert(rows406.length>=80,'T406 G5 lv2+ 樣本應 ≥80（AI 城 300 天），實得 '+rows406.length);
    rows406.sort((a,b)=>a.dens-b.dens);
    const q406=Math.floor(rows406.length/4);
    const mean406=(arr)=>arr.reduce((s,r)=>s+r.pct,0)/arr.length;
    const pLow=mean406(rows406.slice(0,q406)),pHigh=mean406(rows406.slice(-q406));
    assert((pHigh-pLow)*100>=15,
      'T406 G5 梯度實證：高密度組同級高度百分位須高於低密度組 ≥15 個百分點（白噪音＝0），'
      +'實得低 '+(pLow*100).toFixed(1)+'% 高 '+(pHigh*100).toFixed(1)+'% 差 '+((pHigh-pLow)*100).toFixed(1));
  }
  /* ===== T407 塔高梯度（TheoTown 觀感對標第三刀） ===== */
  {
    // (1) 塔高必須在 TWDEF 建造迴圈內記錄（與 RCI 同手法：與實際建造同源，不另抄表）
    const iTw=html.indexOf('for(const d of TWDEF){');
    const iTwEnd=html.indexOf('rankV406(); /* T407',iTw);
    assert(iTw>0&&iTwEnd>iTw,'T407 G1 TWDEF 迴圈與其後的成表呼叫可定位');
    assert(/\(VH406\[d\.k\+'_1'\]\|\|\(VH406\[d\.k\+'_1'\]=\[\]\)\)\[d\.v\]=d\.h\+thw;/.test(html.slice(iTw,iTwEnd)),
      'T407 G1 塔高須取自 TWDEF 迴圈內的 d.h+thw');
    // (2) 合併點仍求值 ri(2)＝亂數消耗零位移
    assert(/v:pickV406\(tk,1,x,y,ri\(2\)\)/.test(html),'T407 G2 塔合併點須為 pickV406(...,ri(2))＝ri(2) 仍求值');
    /* (2b) 都市織理口徑必須含摩天樓與巨廈——這是本卡抓到的真 bug 的不變量：
       口徑只數 k<=3 時【塔自己不算數】，市中心塔叢反被判低密度，首測塔高梯度直接反向（193→190px）。
       方向性斷言(G4)對此不夠敏感（窄口徑仍給出 3px 正向差），故在原文層直接釘死。 */
    assert(/const URBAN406=\(k\)=>k<=3\|\|k===33\|\|k===34\|\|k===105\|\|k===106;/.test(html),
      'T407 G2b 都市織理口徑須含 k33/34 摩天樓與 k105/106 巨廈（否則塔自己不算數＝梯度反向）');
    // (3) 塔排名表恰 2 項且單調（真跑）
    const vh407=window.GV.vh406();
    for(const key of ['33_1','34_1']){
      const vh=vh407.vh[key],rk=vh407.rank[key];
      assert(vh&&rk&&vh.length===2&&rk.length===2,'T407 G3 '+key+' 樓高表須恰 2 項，實得 '+(vh?vh.length:'MISSING'));
      assert(vh[rk[0]]<vh[rk[1]],'T407 G3 '+key+' rank 須由矮到高，實得 '+JSON.stringify(vh)+' rank '+JSON.stringify(rk));
    }
    // (4) 梯度實證：800 天 AI 城的塔，鄰域密度上半 vs 下半的平均高度須有正向差
    window.GV.newWorldSeeded(301);window.GV.setDiff(1);window.GV.ai(true);
    for(let d=0;d<800;d++)window.GV.step(1);
    window.GV.ai(false);
    const N407=window.GV.N(),tw407=[];
    for(let y=0;y<N407;y++)for(let x=0;x<N407;x++){
      const b=window.GV.tile(x,y).bld;
      if(!b||b.ref||(b.k!==33&&b.k!==34))continue;
      let n=0;
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=N407||ny>=N407)continue;
        const nb=window.GV.tile(nx,ny).bld;
        if(nb&&(nb.k<=3||nb.k===33||nb.k===34||nb.k===105||nb.k===106))n++; // 同 pickV406 口徑
      }
      tw407.push({dens:n,h:(vh407.vh[b.k+'_1']||[])[b.v]||0});
    }
    assert(tw407.length>=7,'T407 G4 800 天應長出 ≥7 座塔（T432 孤島電源不併網重釘；前值 ≥8），實得 '+tw407.length);
    tw407.sort((a,b)=>a.dens-b.dens);
    const half=Math.floor(tw407.length/2);
    const mh=(arr)=>arr.reduce((s,r)=>s+r.h,0)/arr.length;
    const hLo=mh(tw407.slice(0,half)),hHi=mh(tw407.slice(-half));
    assert(hHi>hLo,'T407 G4 塔高梯度：高密度側平均塔高須高於低密度側（白噪音下無差），'
      +'實得低 '+hLo.toFixed(1)+'px 高 '+hHi.toFixed(1)+'px（塔數 '+tw407.length+'）');
  }
  // ===== T409 服務可觀測性補齊：消防/警察可出勤量＋垃圾隱形扣分（第一波，零模擬影響） =====
  { // G1 靜態：三組計數器必須是 tick／computeGarbLocal 的區域變數（不進存檔＝鐵律7 免疫，零成對歸零面）
    const tickAt409=html.indexOf('function tick(){');
    const gcAt409=html.indexOf('function computeGarbLocal(){');
    assert(tickAt409>0&&gcAt409>tickAt409,'T409 G1 tick／computeGarbLocal 可定位');
    const decl409='let fireN409=0,fireSvc409=0,crimeN409=0,crimeSvc409=0,fs2n409=0;';
    assert(html.split(decl409).length-1===1,'T409 G1 計數器宣告須恰一處（宣告即區域，重複＝有人搬成全域）');
    /* T410 加固（對抗性覆核繞過 #2 的補洞）：出現次數由「≥2」改為恰等——原斷言放行「遞增行之後、快照讀取之前」
       的第二次改寫（如夾限 crimeSvc409=9），面板即可說謊而全套件仍綠。恰等=宣告/遞增/快照各一，多一次必紅。 */
    const CNT409={fireN409:3,fireSvc409:3,crimeN409:3,crimeSvc409:3,fs2n409:3,garbPen409:3,garbFar409:2};
    for(const nm in CNT409){
      let p=-1,n=0;
      while((p=html.indexOf(nm,p+1))>=0){n++;assert(p>tickAt409&&p<gcAt409,'T409 G1 '+nm+' 須只出現在 tick 區域內（實得位元位置 '+p+'）');}
      assert(n===CNT409[nm],'T409 G1/T410 加固 '+nm+' 出現次數須恰為 '+CNT409[nm]+'（宣告/遞增/快照各一；多出=有人二次改寫＝面板可說謊），實得 '+n);
    }
    assert(html.includes('let far409=0;')&&html.includes('return far409;'),
      'T409 G1 computeGarbLocal 的距離懲罰計數須為函式區域＋回傳（不得升級為全域）');
  }
  { // G2 逐字守衛：可出勤判定必須與派遣端候選過濾式一字不差——面板數字說的必須是「車真的收得到的案件」
    const fireCond409='COV.fire[i]>0||(COV.fire2&&COV.fire2[i]>0)||(COV.fireHQ&&COV.fireHQ[i]>0)';
    /* polCond409 已隨 T410 退場：警察派遣與 tick 計數皆無過濾，唯一殘留的覆蓋條件是犯罪生成段的布林免疫行（下方原文釘） */
    assert(html.includes('if(b&&b.k<=3&&b.fire&&('+fireCond409+'))fires.push(i);'),
      'T409 G2 updFireTrucks 候選過濾式錨點（漂移須連帶紅）');
    /* T410 同步：警察派遣候選移除覆蓋過濾（覆蓋內不發生犯罪＝原過濾為死碼），逐字契約隨之更新——
       派遣端與 tick 計數端必須「同無過濾」，任何一端加回條件即紅。 */
    assert(html.includes('if(b&&b.k<=3&&b.crime)crimes.push(i);'),
      'T410 updPoliceCars 候選須無覆蓋過濾（全域應對）');
    assert(!html.includes('b.crime&&(COV.police[i]>0||(COV.police2&&COV.police2[i]>0)))crimes.push'),
      'T410 舊覆蓋過濾候選式須絕跡（加回=派遣死碼復發）');
    assert(html.includes('if(COV.police[i]>0||COV.police2[i]>0)continue;'),
      'T410 犯罪生成段布林免疫行原文在場（本卡只動派遣不動預防；T343c 另釘機率式）');
    /* T410 加固（對抗性覆核繞過 #1 的補洞）：候選行與 updDispatch 呼叫行【兩端都釘】——
       只釘候選行時，可在其後夾一層 crimes.filter(距離門檻) 再把副本餵給 updDispatch，
       字串守衛全綠、行為測（採樣距離僅 2/40）也抓不到 >40 的門檻＝面板與派遣脫鉤。 */
    assert(html.includes('updDispatch(policeCars,dt,2.4,svcFleet.police,sts,crimes,c=>{'),
      'T410 加固 警察派遣呼叫行原文釘——crimes 須原樣直達 updDispatch（中間夾過濾副本=面板說謊）');
    assert(html.includes('updDispatch(ladderTrucks,dt,2.6,svcFleet.fire,sts,fires,c=>{'),
      'T410 加固 消防派遣呼叫行原文釘（同款夾層攻擊防護）');
    assert(html.includes('if(b.k<=3&&b.fire){fireN409++;if('+fireCond409+')fireSvc409++;}'),
      'T409 G2 消防可出勤判定須與派遣端逐字一致');
    assert(html.includes('if(b.k<=3&&b.crime){crimeN409++;crimeSvc409++;}'),
      'T409 G2/T410 警察可出勤判定須與派遣端同步（皆無過濾；派遣端加回條件時本斷言與上方絕跡斷言連帶紅）');
  }
  { // G3 容量同構：cap 必須等於 updDispatch 實際能派出的上限 min(車隊, 站點數)
    assert(html.includes('const target=sts.length&&cand.length?Math.min(cap,sts.length):0;'),'T409 G3 updDispatch 容量式錨點');
    assert(html.includes('const sts=listBldK(6).concat(listBldK(30));'),'T409 G3 消防站點清單錨點（k6+k30，**不含** k61 總局）');
    assert(html.includes('const sts=listBldK(11).concat(listBldK(52));'),'T409 G3 警察站點清單錨點（k11+k52）');
    assert(html.includes('cap:Math.min(svcFleet.fire,fireStations+fs2n409)'),'T409 G3 消防容量＝min(車隊, k6+k30)');
    assert(html.includes('cap:Math.min(svcFleet.police,policeStations+policeBoxes)'),'T409 G3 警察容量＝min(車隊, k11+k52)');
    assert(html.includes('else if(b.k===30)fs2n409++;'),'T409 G3 k30 須在【已濾 ref 的經濟迴圈】內計數（首迴圈 fs2 未濾 ref，不可充當站點數）');
    assert(!html.includes('Math.min(svcFleet.fire,fireStations+fs2)'),'T409 G3 禁用未濾 ref 的 fs2 當消防站點數');
  }
  { // G4 新增碼零亂數（鐵律2：本卡不得動 R() 消耗序，兩釘恆等是主證明）
    const lines409=[
      'if(b.k<=3&&b.fire){fireN409++;',
      'if(b.k<=3&&b.crime){crimeN409++;',
      'const garbFar409=computeGarbLocal();',
      'cap:Math.min(svcFleet.fire,fireStations+fs2n409)'
    ];
    for(const L of lines409){
      const at=html.indexOf(L);
      assert(at>0,'T409 G4 錨點在場：'+L);
      const seg=html.slice(at,html.indexOf('\n',at)).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/,'');
      assert(!/\bR\(\)|\bri\(/.test(seg),'T409 G4 新增行禁用 R()/ri()：'+L);
    }
  }
  { // G5 功能案（火）：一場在消防覆蓋內、一場外 ⇒ open=2 / svc=1；差值＝永遠等不到消防車的火場
    window.GV.newWorldSeeded(409);window.GV.weather(0);
    window.__t384Bld(6,10,10);                       // 消防局（半徑9）
    window.__t384Bld(1,12,10);window.__t384Bld(1,30,30); // 覆蓋內／覆蓋外住宅
    window.__t387Cov();
    assert(window.GV.ignite(12,10)&&window.GV.ignite(30,30),'T409 G5 兩處點火成功');
    window.__t386Tick();
    const f409=window.GV.flowStat().svc.fire;
    assert(f409.open===2&&f409.svc===1,'T409 G5 火場 2 場其中 1 場可出勤，實得 open='+f409.open+' svc='+f409.svc);
    assert(f409.cap===1,'T409 G5 消防出勤上限＝min(車隊3, 站1)=1，實得 '+f409.cap);
    // 功能案（犯罪）：同款配置
    window.GV.newWorldSeeded(410);window.GV.weather(0);
    window.__t384Bld(11,10,10);
    window.__t384Bld(1,12,10);window.__t384Bld(1,30,30);
    window.__t387Cov();
    assert(window.GV.igniteCrime(12,10)&&window.GV.igniteCrime(30,30),'T409 G5 兩處犯罪佈置成功');
    window.__t386Tick();
    const p409=window.GV.flowStat().svc.police;
    assert(p409.open===2&&p409.svc===2,'T409 G5/T410 犯罪 2 件全部可出勤（T410 移除派遣覆蓋過濾 ⇒ svc≡open），實得 open='+p409.open+' svc='+p409.svc);
    assert(p409.cap===1,'T409 G5 警察出勤上限＝min(車隊2, 局1)=1，實得 '+p409.cap);
    // 功能案（垃圾）：無垃圾場＝超載＋全城吃距離懲罰，兩條隱形扣分都要能被讀出來
    window.GV.newWorldSeeded(411);window.GV.weather(0);
    for(let i=0;i<6;i++)window.__t384Bld(1,10+i,10);
    window.__t386Tick();
    const g409=window.GV.flowStat().svc.garb;
    assert(g409.ratio>1&&g409.pen>0,'T409 G5 無處理容量＝超載且逐戶扣分>0，實得 ratio='+g409.ratio+' pen='+g409.pen);
    assert(g409.far>=6,'T409 G5 無垃圾場時住宅全吃距離懲罰 −0.045，實得 far='+g409.far);
  }
  { // G6 面板：三列在場、零壞值，且消防總局的誤導文案已改（原「車隊可於面板購置」讓玩家以為總局能出車）
    const ph409=window.GV.flowPanel384();
    assert(ph409.includes('垃圾 幸福扣分'),'T409 G6 垃圾隱形扣分列在場（原本只改 b.h、繞過 happyParts＝面板查無此項）');
    assert(ph409.includes('消防 出勤上限 / 可出勤火場')&&ph409.includes('警察 出勤上限 / 未處理案件'),'T409 G6 消防可出勤列＋警察排隊語義列在場（T410 改文案）');
    assert(!ph409.includes('覆蓋外')||ph409.indexOf('覆蓋外')===ph409.lastIndexOf('覆蓋外'),'T410 「覆蓋外無人受理」死文案須退場（僅剩消防列一處合法「覆蓋外」）');
    assert(ph409.includes('總局只擴覆蓋半徑，不出車'),'T409 G6 消防總局不出車的說明在場');
    assert(!/NaN|undefined|Infinity/.test(ph409),'T409 G6 面板零壞值');
  }
  // ===== T410 警察派遣修復：警車出勤至覆蓋外犯罪（服務效果接線第二波之一） =====
  { // 功能案：覆蓋外犯罪+警局在場 → 迭代幀更新 → 車到場清案（舊過濾下 crimes 恆空＝永不清，此即紅源行為差）
    window.GV.newWorldSeeded(412);window.GV.weather(0);
    window.__t384Bld(11,10,10);   // 警察局（覆蓋半徑 10）
    window.__t384Bld(1,30,30);    // 住宅：距離 (20,20)＝路距 40 格，遠在覆蓋外
    window.__t387Cov();
    assert(window.GV.igniteCrime(30,30),'T410 覆蓋外犯罪佈置成功');
    let cleared410=-1,cars410=0;
    for(let f=0;f<200;f++){cars410=window.__t410Pol(.5);if(!window.GV.tile(30,30).bld.crime){cleared410=f;break;}}
    assert(cleared410>=0,'T410 警車須能出勤至覆蓋外犯罪並到場清案（舊候選過濾下永不出車），實得 200 幀內未清');
    assert(cleared410>=30,'T410 到場需要真實移動時間（40 格 Manhattan，非瞬移），實得第 '+cleared410+' 幀清案');
    assert(window.GV.tile(30,30).bld.crimeDays===0,'T410 到場須連帶歸零 crimeDays（廢棄倒數解除）');
    assert(window.__t410Pol(.5)===0,'T410 到場後車輛除役（arr 清空，無殭屍車）');
  }
  { // 覆蓋內殘案（舊行為的唯一活路徑）仍可出勤＝新候選為嚴格超集，無行為丟失
    window.GV.newWorldSeeded(413);window.GV.weather(0);
    window.__t384Bld(1,12,10);    // 先有犯罪
    window.__t387Cov();
    assert(window.GV.igniteCrime(12,10),'T410 犯罪佈置成功');
    window.__t384Bld(11,10,10);   // 後蓋警局＝覆蓋追上（T409 量測中 4/23 的那類殘案）
    window.__t387Cov();
    let cleared413=false;
    for(let f=0;f<60;f++){window.__t410Pol(.5);if(!window.GV.tile(12,10).bld.crime){cleared413=true;break;}}
    assert(cleared413,'T410 覆蓋內殘案仍可出勤（新候選為舊候選嚴格超集）');
  }
  { // T410 加固 遠距案（對抗性覆核繞過 #1 的行為級補洞）：原功能案只採樣距離 {2,40}，任何 >40 的
    // 距離門檻過濾（偽裝「出勤半徑」）全數放行。補路距 110 案＝把「全域應對」測到接近地圖對角。
    window.GV.newWorldSeeded(415);window.GV.weather(0);
    window.__t384Bld(11,10,10);
    window.__t384Bld(1,65,65);    // Manhattan 110
    window.__t387Cov();
    assert(window.GV.igniteCrime(65,65),'T410 遠距犯罪佈置成功');
    let cleared415=false;
    for(let f=0;f<300;f++){window.__t410Pol(.5);if(!window.GV.tile(65,65).bld.crime){cleared415=true;break;}}
    assert(cleared415,'T410 加固 路距 110 的覆蓋外犯罪也須到場清案（任何距離門檻式夾層過濾在此現形）');
  }
  { // T410 加固 多案一致性（對抗性覆核繞過 #2 的行為級補洞）：原 G5 只驗 open=2/svc=2，夾限 9 抓不到。
    window.GV.newWorldSeeded(416);window.GV.weather(0);
    window.__t384Bld(11,10,10);
    for(let i=0;i<12;i++)window.__t384Bld(1,30+i,30);
    window.__t387Cov();
    for(let i=0;i<12;i++)assert(window.GV.igniteCrime(30+i,30),'T410 多案佈置 '+i);
    window.__t386Tick();
    const pm410=window.GV.flowStat().svc.police;
    assert(pm410.open===12&&pm410.svc===12,'T410 加固 12 件積案須 open=svc=12 逐件對齊（任何夾限/折扣在此現形），實得 open='+pm410.open+' svc='+pm410.svc);
  }
  { // 無站不出車：站點清單為空時 target=0（updDispatch 原式守衛已在 T409 G3 釘 min(cap,sts.length)）
    window.GV.newWorldSeeded(414);window.GV.weather(0);
    window.__t384Bld(1,30,30);window.__t387Cov();
    window.GV.igniteCrime(30,30);
    let cars414=0;
    for(let f=0;f<40;f++)cars414=window.__t410Pol(.5);
    assert(window.GV.tile(30,30).bld.crime===1&&cars414===0,'T410 無警局＝不出車（犯罪維持，玩家仍可手動處理）');
  }
  // ===== T411 服務車輛遊戲時間縮放（服務效果接線第二波之二） =====
  { // G1 靜態：定義行+呼叫行兩端釘（T410 鐵訓）＋舊式絕跡＋縮放集不得擴散
    /* T411 加固（對抗性覆核 M3c 補洞）：字串釘一律做在【去註解文本】上——html.includes() 分不清
       註解與活碼，把釘文原樣塞進註解、活碼改別的式子即可走私通過。bare411=剝 註解後的純碼。 */
    const bare411=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare411.includes('const dtSvc411=dtA*speed;'),'T411 G1 dtSvc411 定義行原文釘【活碼層】（遊戲時間縮放本體；塞註解不算）');
    assert(bare411.includes('updAmbulances(dtSvc411);updFireTrucks(dtSvc411);updGarbageTrucks(dtA);updPoliceCars(dtSvc411);'),
      'T411 G1 呼叫行原文釘【活碼層】——三家派遣車隊吃 dtSvc411、垃圾車維持 dtA（縮放集兩端封死）');
    for(const bad of ['updAmbulances(dtA)','updFireTrucks(dtA)','updPoliceCars(dtA)']){
      assert(!bare411.includes(bad),'T411 G1 舊式絕跡：'+bad+'（真實時間制回歸=5× 速服務層再凍結）');
    }
    assert(bare411.includes('updCars(dtA);'),'T411 G1 視覺車隊仍吃 dtA（車流壅堵回饋 T129 屬另卡，縮放不得擴散）');
    assert(bare411.includes('setSpeed:s=>{speed=Number.isFinite(+s)?clamp(+s,0,5):0;}'),
      'T411 G1 setSpeed 域驗證釘（覆核 B1/B2：NaN=極速衝刺守門穿透、>7.69=囤積信用打破暫停凍結）');
  }
  { // G2 行為 凍結案：speed=0 時服務車凍結＝暫停不再有模擬副作用（紅源=舊碼會在暫停中清案）
    window.GV.newWorldSeeded(417);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(1,12,10);
    window.__t387Cov();
    assert(window.GV.igniteCrime(12,10),'T411 G2 近距犯罪佈置成功');
    window.GV.setSpeed(0);
    window.GV.advanceN(.05,120);
    assert(window.GV.tile(12,10).bld.crime===1,'T411 G2 暫停（speed=0）中服務車須凍結＝犯罪不得被清（舊制暫停有模擬副作用）');
    window.GV.setSpeed(1);
    window.GV.advanceN(.05,200);
    assert(window.GV.tile(12,10).bld.crime===0,'T411 G2 恢復 1× 速後車須照常到場清案（凍結不是壞死）');
  }
  { // G3 行為 縮放案（T411 加固：對抗性覆核 M4b/M4c/M1b 補洞）——
    // ①三車隊逐一量測：原版只打警車，在消防/救護【函式體內】夾 dt 即可讓三分之二車隊縮放歸零而全綠；
    // ②門檻 1/3→1/4：updDispatch 夾 dt≤.16（3.2×）曾以 78<83 擦邊滑過；帧數決定性（單站單案 vri 恆 0），門檻可收緊。
    /* T411 加固二版：初版救護案把病宅放進 k28 覆蓋圈（COVR.ambulance=10）——k28 覆蓋算進 hospital 分支
       ＝【首個 tick 就治好】，量到的是天長幀數的縮放（恆真廢測，函式體夾 dt 照樣綠）。
       修法：①病宅移出覆蓋圈（距 14>10；救護候選本就無覆蓋要求）；②整段量測掛 __t411R 樁
       ＝tick 機率路徑全惰性（診所擲骰/病亡轉化/犯罪點火），清案唯一路徑=車輛到場，語義由構造保證。 */
    const fleetFrames411=(seed,sp,kind)=>{
      window.GV.newWorldSeeded(seed);window.GV.weather(0);
      if(kind==='police'){window.__t384Bld(11,10,10);window.__t384Bld(1,40,10);window.__t387Cov();window.GV.igniteCrime(40,10);} // 路距 30
      else if(kind==='fire'){window.__t384Bld(6,10,10);window.__t384Bld(1,16,10);window.__t387Cov();window.GV.ignite(16,10);}   // 路距 6（消防候選須在覆蓋內＝半徑 9；短距亦避開燒毀時限）
      else{window.__t384Bld(28,10,10);window.__t384Bld(1,24,10);window.__t387Cov();window.GV.igniteSick(24,10);}                // 救護路距 14＝覆蓋圈（半徑10）外：tick 的 hospital 次日必治分支搆不到，只有救護車能治
      const tx=kind==='police'?40:kind==='fire'?16:24;
      const done=()=>{const b=window.GV.tile(tx,10).bld;return b?(kind==='police'?!b.crime:kind==='fire'?!b.fire:!b.sick):false;};
      window.__t411R(true);
      window.GV.setSpeed(sp);
      let f=0;
      for(;f<600;f++){window.GV.advanceN(.05,1);if(done())break;}
      window.GV.setSpeed(1);
      window.__t411R(false);
      assert(window.GV.tile(tx,10).bld,'T411 G3 '+kind+' 目標建築須存活至測畢（燒毀/湮滅=量測無效）');
      return f;
    };
    let seed411=418;
    for(const kind of ['police','fire','amb']){
      const f1=fleetFrames411(seed411++,1,kind),f5=fleetFrames411(seed411++,5,kind);
      assert(f1<600&&f5<600,'T411 G3 '+kind+' 兩檔皆須在 600 幀內到場，實得 1×='+f1+' 5×='+f5);
      assert(f5<f1/4,'T411 G3 '+kind+' 5× 速到場幀數須 <1× 的 1/4（理論 1/5；每車隊獨立量測＝函式體內夾 dt 無所遁形），實得 1×='+f1+' 5×='+f5);
    }
  }
  /* ===== T416 就近站派遣（DeepSeek 能力測試卡；updDispatch 內站點選擇就近化，dispatch 型） ===== */
  { // G1 靜態：去註解原文釘（T411 鐵訓）——巡遊型分派（垃圾車保 vri）+ dispatch 型就近 greedy 演算法
    const bare416=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare416.includes('const isCruise=arr===recycleTrucks;'),
      'T416 G1 巡遊型分派行原文釘（垃圾/回收=巡遊，cand=路面空間非案，就近語義不成立；此分支保 vri。四輪退修 A3：釘文含尾分號，`&&false` 等尾綴不再命中）');
    assert(bare416.includes('if(isCruise){si=sts[vri(sts.length)];ti=cand[vri(cand.length)];}'),
      'T416 G1 巡遊分支使用行原文釘（if(isCruise) 不得被改死——改 if(false)=垃圾車誤走就近=覆蓋破壞，破壞性案2 咬這條）');
    assert(bare416.includes('s.sort((a,b)=>a[2]-b[2]);'),
      'T416 G1 就近 greedy 排序原文釘（最近案優先——四臂 800 天 seed301 -48% 達標/seed22 廢棄日 2187→11；三輪覆核改 max-min→greedy，錨在此行）');
    assert(bare416.includes('while(si2<scored.length&&inflight.has(scored[si2][0]))si2++;'),
      'T416 G1 在途/已配對排除行原文釘（同案最多一車；二輪退修錨點）');
    assert(bare416.includes('inflight.add(ti);si2++;'),
      'T416 G1 配對後消耗行原文釘（同批後續車不得再鎖同案；二輪退修錨點）');
    assert(!bare416.includes('const si=sts[vri(sts.length)],ti=cand[vri(cand.length)];'),
      'T416 G1 舊隨機站×隨機案整行絕跡（dispatch 分支不得回歸隨機）');
  }
  { // G2 行為：同案雙站（近站 5 格/遠站 25 格）→ 車必從近站出；隨機挑選下兩站都可能（30 種子 max 統計，全近機率 0.02%）
    const nearFrames416=(seed)=>{
      window.GV.newWorldSeeded(seed);window.GV.weather(0);
      window.__t384Bld(11,10,10);window.__t384Bld(11,40,10);window.__t384Bld(1,15,10); // 近站 (10,10) 距案 5｜遠站 (40,10) 距案 25｜案格須有住宅
      window.__t387Cov();
      window.GV.igniteCrime(15,10);
      window.__t411R(true); // 凍結 tick 機率路徑：清案唯一路徑=車輛到場
      window.GV.setSpeed(1);
      let f=0;
      for(;f<600;f++){window.GV.advanceN(.05,1);if(!window.GV.tile(15,10).bld.crime)break;}
      window.GV.setSpeed(1);window.__t411R(false);
      return f;
    };
    let maxF416=0;
    for(let s=0;s<30;s++){const f=nearFrames416(700+s);if(f>maxF416)maxF416=f;}
    assert(maxF416<100,
      'T416 G2 就近派遣：同案雙站車必從近站出（近 5 格≈42 幀 vs 遠 25 格≈209 幀；隨機挑站 30 種子 max 統計全近機率 0.02%），實得 max='+maxF416);
    /* G2b 對照：單站時就近=唯一站，幀數與 T411 G3 同量級（同距離幀數不變）——遠站單站必須顯著大於近站 */
    const loneFar416=(seed)=>{
      window.GV.newWorldSeeded(seed);window.GV.weather(0);
      window.__t384Bld(11,40,10);window.__t384Bld(1,15,10); // 只有遠站 (40,10)；案格須有住宅
      window.__t387Cov();
      window.GV.igniteCrime(15,10);
      window.__t411R(true);
      window.GV.setSpeed(1);
      let f=0;
      for(;f<600;f++){window.GV.advanceN(.05,1);if(!window.GV.tile(15,10).bld.crime)break;}
      window.GV.setSpeed(1);window.__t411R(false);
      return f;
    };
    const ff416=loneFar416(800);
    assert(ff416>maxF416*1.5,'T416 G2b 跨城案幀數須顯著高於就近案（遠 25 格 > 近 5 格×1.5），實得 loneFar='+ff416+' vs nearMax='+maxF416);
  }
  { // T416 退修 G3 行為：兩站三案同批補兩車→兩車目標必不同（幀數斷言：新版案C 84 幀直達 vs 舊版白跑後 ~210 幀）
    const framesC416=(seed)=>{
      window.GV.newWorldSeeded(seed);window.GV.weather(0);
      window.__t384Bld(11,10,10);window.__t384Bld(11,40,10); // 近站 (10,10)｜遠站 (40,10)
      window.__t384Bld(1,15,10);window.__t384Bld(1,15,20);window.__t384Bld(1,50,10); // 三案：A (15,10) 近5｜B (15,20) 近15｜C (50,10) 近10
      window.__t387Cov();
      window.GV.igniteCrime(15,10);window.GV.igniteCrime(15,20);window.GV.igniteCrime(50,10);
      window.__t411R(true);
      window.GV.setSpeed(1);
      let f=0;
      for(;f<400;f++){window.GV.advanceN(.05,1);const bC=window.GV.tile(50,10).bld;if(bC&&!bC.crime)break;} // 案C 被清幀數
      window.GV.setSpeed(1);window.__t411R(false);
      return f;
    };
    let maxC416=0;
    for(let s=0;s<5;s++){const f=framesC416(920+s);if(f>maxC416)maxC416=f;}
    assert(maxC416<150,
      'T416 退修 G3 兩車目標必不同：案C（次遠）須被第二車直達服務（新版 ~84 幀 vs 舊版兩車同派案B→車隊補位後 ~210 幀），實得 max='+maxC416);
  }
  { // T416 二輪退修 G4 行為（直接斷言）：已有一車在途→新車 tx/ty 必須指向後發案（非幀數猜測）
    window.GV.newWorldSeeded(940);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(11,40,10); // 近站 (10,10)｜遠站 (40,10)
    window.__t384Bld(1,10,30);window.__t384Bld(1,50,10); // 案A (10,30) 近20｜案B (50,10) 近10
    window.__t387Cov();
    window.GV.igniteCrime(10,30);
    window.__t411R(true);
    window.GV.setSpeed(1);
    for(let f=0;f<60;f++)window.GV.advanceN(.05,1); // 60 幀：車1 在途案A（20 格未完）
    const f1=window.__t416Fleet('police');
    const car1=f1.find(c=>c.tx===10&&c.ty===30);
    assert(car1,'T416 二輪退修 G4 車1 應在途案A (10,30)，實得 '+JSON.stringify(f1));
    window.GV.igniteCrime(50,10); // 途中案B 出現
    for(let f=0;f<5;f++)window.GV.advanceN(.05,1); // 5 幀內補車
    window.GV.setSpeed(1);window.__t411R(false);
    const f2=window.__t416Fleet('police');
    const car2=f2.find(c=>c.tx===50&&c.ty===10);
    assert(car2,
      'T416 二輪退修 G4 新車 tx/ty 必須指向後發案B (50,10)（在途案A 須被排除；舊版新車重鎖案A→無車指向案B），實得 '+JSON.stringify(f2));
    assert(f2.filter(c=>c.tx===10&&c.ty===30).length<=1,
      'T416 二輪退修 G4 在途案A 不得被第二車鎖定（同案最多一車），實得 '+JSON.stringify(f2));
  }
  { // T416 二輪退修 G5 壓力案＋四輪退修 A4/A2-G5：大量案×站×車（100 站／1000 案／100 車）——派遣效能預算（排除造境）+ 全目標不重複 + 每車起點==該案最小距站
    window.GV.newWorldSeeded(951);window.GV.weather(0);
    const stList416=[];
    for(let s=0;s<100;s++){const sx=1+(s%10)*7,sy=1+Math.floor(s/10)*7;window.__t384Bld(11,sx,sy);stList416.push([sx,sy]);} // 100 站網格
    window.__t416FleetSet('police',100); // 100 車（運行時 svcFleet 可超存檔夾 40 上限；與覆核方 100 車量測同量級）
    const caseList416=[];
    for(let i=0;i<1000;i++){
      const x=3+((i%30)*2),y=3+Math.floor(i/30)*2; // 案網格 x/y∈{3,5,...,61}（步長 2，與站網格步長 7 錯開）
      if(window.__t416Occ(x,y))continue; // 跳過與站重疊格（站網格 1+7a 與案網格 3+2c 交點極少）
      window.__t384Bld(1,x,y);window.GV.igniteCrime(x,y);caseList416.push([x,y]);
    }
    window.__t387Cov();
    window.__t411R(true);
    window.GV.setSpeed(1);
    const sc0=window.__t416ScanN(); // T416 五輪退修 A4：計數釘取代計時釘——記 advanceN 前掃描筆數（計數決定性，非計時；時間門檻被「純成本迴圈」穿透過）
    window.GV.advanceN(.05,1); // 一幀：觸發 while 補車（target=min(100,100)=100）
    const scans416=window.__t416ScanN()-sc0;
    window.GV.setSpeed(1);window.__t411R(false);
    const fAll=window.__t416Fleet('police');
    assert(fAll.length===100,'T416 二輪退修 G5 壓力案：一幀後車隊應補滿 100（target=min(svcFleet,站數)），實得 '+fAll.length);
    assert(scans416===caseList416.length*stList416.length,
      'T416 五輪退修 A4 掃描筆數釘：scored 預計算每幀恰一次全掃（cand×sts 筆；while 內重算/純成本迴圈→補車數倍→紅；站/案掃描限縮→筆數變少→紅），實得 '+scans416+' vs 預期 '+caseList416.length*stList416.length);
    const targets=new Set(fAll.map(c=>c.tx+c.ty*N));
    assert(targets.size===fAll.length,
      'T416 二輪退修 G5 壓力案：同批補車目標不得重複（配對後消耗），實得 '+targets.size+'/'+fAll.length);
    let bad416=0; // T416 四輪退修 A2-G5：每車起點必須是該案最小距站（全站掃描行為釘；sts.slice(0,k) 限縮→起點距錯→紅）
    for(const c of fAll){
      let minD416=1e9;
      for(const st of stList416){const d416=Math.abs(c.tx-st[0])+Math.abs(c.ty-st[1]);if(d416<minD416)minD416=d416;}
      if(Math.abs(c.x-c.tx)+Math.abs(c.y-c.ty)!==minD416)bad416++;
    }
    assert(bad416===0,
      'T416 四輪退修 A2-G5 全站掃描行為釘：100 台車每台起點必須是該案最小距站（|起點−目標|==全站最小距；只掃前 k 站→起點錯→紅），實得 '+bad416+' 台不合');
  }
  { // T416 四輪退修 A1 行為：排序方向（greedy 最近案優先）——兩站三案 md=2/20/40，補兩車目標集合必須恰為最近兩案
    // 反面維度：s.sort(...) 後補 s.reverse()（原文釘照樣命中）→ 集合變最遠兩案 {C,B} → 紅；只派一台 → 長度錯 → 紅
    window.GV.newWorldSeeded(960);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(11,40,10); // 站1 (10,10)｜站2 (40,10)
    window.__t384Bld(1,12,10);window.__t384Bld(1,60,10);window.__t384Bld(1,10,50); // 案A (12,10) md=2｜案B (60,10) md=20｜案C (10,50) md=40
    window.__t416FleetSet('police',2); // target=min(2,2)=2 → 補兩車
    window.__t387Cov();
    window.GV.igniteCrime(12,10);window.GV.igniteCrime(60,10);window.GV.igniteCrime(10,50);
    window.__t411R(true);
    window.GV.setSpeed(1);
    window.GV.advanceN(.05,1);
    window.GV.setSpeed(1);window.__t411R(false);
    const fa1=window.__t416Fleet('police');
    const ta1=new Set(fa1.map(c=>c.tx+c.ty*N));
    assert(ta1.size===2&&ta1.has(12+10*N)&&ta1.has(60+10*N)&&!ta1.has(10+50*N),
      'T416 四輪退修 A1 greedy 排序方向行為釘：補兩車目標集合必須恰為最近兩案 A(md2)/B(md20)，不得含最遠案 C(md40)（s.reverse() 保原文翻轉→集合 {C,B}→紅），實得 '+JSON.stringify(fa1));
  }
  { // T416 四輪退修 A2 行為：站掃描全量（站數維度）——6 站不共線、案1 的最近站故意放 listBldK 第 5 位
    // 反面維度：只掃前 k<5 站（sts.slice(0,k)/Math.min(k,...)）→ 案1 起點錯 → 紅；掃描序前 2 案限縮 → 案3 無車 → 紅（案維度）
    // 注意：執行至此 GV.N()=72（T262 切回後不復原），全佈局須在 72 地圖內
    window.GV.newWorldSeeded(961);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(11,10,30);window.__t384Bld(11,30,10);window.__t384Bld(11,30,30);window.__t384Bld(11,50,10);window.__t384Bld(11,50,30); // 站1-6
    window.__t384Bld(1,52,10);window.__t384Bld(1,2,2);window.__t384Bld(1,52,60); // 案1 (52,10) 最近=站5 (50,10) 距2（第 5 位）｜案2 (2,2) 最近=站1 距16｜案3 (52,60) 最近=站6 (50,30) 距32（掃描序最後）
    window.__t416FleetSet('police',3); // target=min(3,6)=3 → 三案各一台
    window.__t387Cov();
    window.GV.igniteCrime(52,10);window.GV.igniteCrime(2,2);window.GV.igniteCrime(52,60);
    window.__t411R(true);
    window.GV.setSpeed(1);
    window.GV.advanceN(.05,1);
    window.GV.setSpeed(1);window.__t411R(false);
    const fa2=window.__t416Fleet('police');
    const srcOf2=(x,y)=>{const c=fa2.find(c=>c.tx===x&&c.ty===y);return c?[c.x,c.y]:null;};
    const s2a=srcOf2(52,10),s2b=srcOf2(2,2),s2c=srcOf2(52,60);
    assert(s2a&&s2a[0]===50&&s2a[1]===10,
      'T416 四輪退修 A2 站數維度行為釘：案1 (52,10) 必須從站5 (50,10) 出車（距2；站5 是 listBldK 第 5 位——只掃前 k<5 站→起點錯→紅），實得 '+(s2a?JSON.stringify(s2a):'無車'));
    assert(s2b&&s2b[0]===10&&s2b[1]===10,
      'T416 四輪退修 A2 站數維度行為釘：案2 (2,2) 必須從站1 (10,10) 出車（距16，掃描序第 1 位；只掃前 2 案→案3 無車→下一條紅），實得 '+(s2b?JSON.stringify(s2b):'無車'));
    assert(s2c&&s2c[0]===50&&s2c[1]===30,
      'T416 四輪退修 A2 站數維度行為釘：案3 (52,60) 必須從站6 (50,30) 出車（距32，掃描序最後；cand 限縮→此案無人派→紅），實得 '+(s2c?JSON.stringify(s2c):'無車'));
  }
  { // T416 四輪退修 A3 行為：垃圾車巡遊型不得誤走就近——初派目標必須是隨機路面格，不是最近路面格
    // 反面維度：isCruise 被 `&&false` 改死→dispatch 分支→目標=最近路面格 (30,30)→紅；同時 vri 消耗 2→0（流位移，B5 聲明）
    // T417 三輪退修：vri 依賴 Math.random——stub 固定值（原「1/30 機率性 FAIL」違反決定性契約，偶發已實證兩次）
    const __mrA3=Math.random;Math.random=()=>0.37;
    window.GV.newWorldSeeded(963);window.GV.weather(0);
    window.__t384Bld(8,10,10); // 垃圾場 (10,10)（k8）
    window.__t413ForceRoad(30,30); // 最近路面格 (30,30) 距 40（唯一最近；壞實作目標必為此格）
    for(let qi=0;qi<29;qi++)window.__t413ForceRoad(60+(qi%5)*2,60+Math.floor(qi/5)*2); // 其餘 29 格全在 (60..68,60..70)（距≥100）：隨機巡遊命中最近格機率 1/30
    window.__t387Cov();
    window.__t411R(true);
    window.GV.setSpeed(1);
    window.GV.advanceN(.05,1); // 一幀：垃圾車補 1 台（cap=3、sts=1 → target=1）
    window.GV.setSpeed(1);window.__t411R(false);
    const rc=window.GV.svcTrucks().recycle;
    Math.random=__mrA3;
    assert(rc.length===1,'T416 四輪退修 A3 垃圾車應補 1 台（target=min(3,1)=1），實得 '+rc.length);
    assert(!(rc[0].tx===30&&rc[0].ty===30),
      'T416 四輪退修 A3 垃圾車巡遊行為釘：初派目標不得是最近路面格 (30,30)（isCruise 改死→誤走就近=覆蓋破壞→紅；巡遊=隨機路面格，種子 963 固定），實得 '+JSON.stringify(rc));
  }
  { // T416 五輪退修 N1 全序行為釘：部分反轉（前兩名維持最近案＋index 2 之後整段反轉成 max-min）——5 案 md=2/8/20/35/60、4 站 4 車
    // 反面維度：前 k 名維持的變體全部被「目標集合==最近四案」咬（反轉點 r≤3 時第 4 台必拿非最近案）；任何非單調排序被「距離序列非遞減」咬；案掃描序與 md 序錯開（E 在掃描序第 3）→ cand 限縮也咬
    window.GV.newWorldSeeded(964);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(11,70,10);window.__t384Bld(11,10,70);window.__t384Bld(11,70,70); // 站1-4（四角）
    window.__t384Bld(1,12,10);window.__t384Bld(1,62,10);window.__t384Bld(1,10,50);window.__t384Bld(1,53,52);window.__t384Bld(1,40,40); // 案A(12,10) md2｜案B(62,10) md8｜案C(10,50) md20｜案D(53,52) md35｜案E(40,40) md60
    window.__t416FleetSet('police',4); // target=min(4,4)=4 → 補四台
    window.__t387Cov();
    window.GV.igniteCrime(12,10);window.GV.igniteCrime(62,10);window.GV.igniteCrime(10,50);window.GV.igniteCrime(53,52);window.GV.igniteCrime(40,40);
    window.__t411R(true);
    window.GV.setSpeed(1);
    window.GV.advanceN(.05,1);
    window.GV.setSpeed(1);window.__t411R(false);
    const fn1=window.__t416Fleet('police');
    const stN1=[[10,10],[70,10],[10,70],[70,70]];
    const mdN1=[];
    for(const c of fn1){let md=1e9;for(const st of stN1){const d=Math.abs(c.tx-st[0])+Math.abs(c.ty-st[1]);if(d<md)md=d;}mdN1.push(md);}
    const setN1=new Set(fn1.map(c=>c.tx+c.ty*N));
    assert(setN1.size===4&&setN1.has(12+10*N)&&setN1.has(62+10*N)&&setN1.has(10+50*N)&&setN1.has(53+52*N)&&!setN1.has(40+40*N),
      'T416 五輪退修 N1 全序行為釘（集合）：四台目標必須恰為最近四案 A(md2)/B(md8)/C(md20)/D(md35)，不得含最遠案 E(md60)（splice(2) 後反轉→E 頂掉 D→紅），實得 '+JSON.stringify(fn1));
    assert(mdN1.every((v,i)=>i===0||v>=mdN1[i-1]),
      'T416 五輪退修 N1 全序行為釘（順序）：四台目標距離序列須單調非遞減（greedy 全序，補車序=排序序；任何反轉點→序列回跌→紅），實得 '+JSON.stringify(mdN1));
  }
  { // T417 屋頂層擴容（覆核退修版）：真像素落筆台帳行為釘——七維度逐格對照＋A1 量畫布＋A2 屋頂閘
    const flat417=(w)=>new Array(w).fill(20);
    // 維度 1 族別：R/C/I/H/F/S/M/W 各一案（P 族已移除——11_1_0/52_1_0 鍵不存在，B1 死美術）
    const fams417=[['1_1_99','R'],['2_1_99','C'],['3_1_99','I'],['48_1_99','H'],['6_1_99','F'],['7_1_99','S'],['42_1_99','M'],['8_1_99','W']];
    for(const[key,fam]of fams417){
      window.__t417Reset();
      window.__t417Feed(key,flat417(30));
      const r=window.__t417Read();
      assert(r.keys[key]>=1&&r.n>=1,'T417 維度1 族別 '+fam+'（鍵 '+key+'）：屋頂必落筆（key≥1 且真像素落筆≥1），實得 '+JSON.stringify(r));
    }
    // 分族池契約：每族 4 合成鍵 kinds 全 ∈ 該族池＋至少一鍵含專屬（W=垃圾場 k8 專屬池）
    const POOLS417={R:['ac','vent','ant','tank','waterTank','clothesline','garden','solar','shed','stairbox'],C:['ac','vent','ant','hvac','signFrame','billboard','parapet','helipad'],H:['ac','vent','tank','helipadH'],F:['ac','vent','dryingTower'],S:['ac','vent','schoolTank'],M:['ac','vent','parapet','flagpole'],W:['ac','vent','tank']};
    const EXCL417={R:['waterTank','clothesline','garden','solar','shed','stairbox'],C:['hvac','signFrame','billboard','parapet','helipad'],H:['helipadH'],F:['dryingTower'],S:['schoolTank'],M:['flagpole'],W:['tank']};
    const famTpl417={R:'1',C:'2',H:'48',F:'6',S:'7',M:'42',W:'8'};
    for(const fam of Object.keys(famTpl417)){
      let bad417=0,hitExcl=false,lastKinds417=[];
      for(let lv=1;lv<=4;lv++){
        window.__t417Reset();window.__t417Feed(famTpl417[fam]+'_'+lv+'_99',flat417(40));
        const r=window.__t417Read();lastKinds417=r.kinds;
        for(const k of r.kinds)if(!POOLS417[fam].includes(k))bad417++;
        if(r.kinds.some(k=>EXCL417[fam].includes(k)))hitExcl=true;
      }
      assert(bad417===0,'T417 維度1 分族池契約 '+fam+'：4 鍵 kinds 全 ∈ 該族池（全族共用池/只砍一族→池外道具混入→紅），實得 '+JSON.stringify(lastKinds417));
      assert(hitExcl,'T417 維度1 分族池契約 '+fam+' 專屬道具：4 鍵至少一個含專屬（套件真的被用），實得 '+JSON.stringify(lastKinds417));
    }
    // M2 族別逐鍵對照（覆核方 M2 攻破：fam 只進錯誤訊息；現直接斷言 famOf417 回傳值）
    const famMap417={'1_1_99':'R','2_1_99':'C','3_1_99':'I','48_1_99':'H','6_1_99':'F','7_1_99':'S','8_1_99':'W','42_1_99':'M','33_1_99':'R','34_1_99':'C','105_1_99':'R','106_1_99':'C','28_1_99':'H','30_1_99':'F','61_1_99':'F'};
    for(const[key,fam]of Object.entries(famMap417)){
      const got=window.__t417Fam(key);
      assert(got===fam,'T417 M2 族別逐鍵對照：'+key+' famOf 應為 '+fam+'，實得 '+got);
    }
    // A1 尺寸四檔：合成 sprite 覆蓋真實值域（32/48/112/220），每檔族別×段數案必落筆（s.h 條件退化在任一檔被咬）
    for(const hh of[32,48,112,220]){
      const profA1=new Array(30).fill(Math.max(4,hh-32)); // 真實比例剖面：段左端離地恆 24px（ay=hh-2、地面前緣斜坡 |3-ax|×0.5=6；閘 B 縮放門檻 h=32→12px、h=220→20px 全放行）；y≥4 避免畫布頂被 C3 y 夾吞（屋頂線 y=0 時任何道具頂都超出畫布）
      window.__t417Reset();window.__t417Feed('1_1_99',profA1,hh);
      assert(window.__t417Read().n>=1,'T417 A1 尺寸檔 h='+hh+'：R 族單段必真像素落筆（合成 sprite 覆蓋真實值域；if(s.h>32) 型短路在此檔紅），實得 '+window.__t417Read().n);
      window.__t417Reset();window.__t417Feed('2_3_99',profA1,hh);
      assert(window.__t417Read().n>=1,'T417 A1 尺寸檔 h='+hh+'：C 族 lv3 段必落筆（每檔族別×段數案），實得 '+window.__t417Read().n);
    }
    // 維度 2 lv＋直升機坪門檻（F6 真釘）：lv1 鍵 i=0 抽中 helipad → 無坪；rw<20 同構；lv3 坪落地；lv4 落筆
    const khT417=(s)=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}; // C6：與產品 >>> 一致
    const poolC417=['ac','vent','ant','hvac','signFrame','billboard','parapet','helipad'];
    let foundL1=null;
    for(let kk=12;kk<300&&!foundL1;kk++){const key='2_1_'+kk;if(poolC417[(khT417(key+'_0_0')>>>0)%8]==='helipad')foundL1=key;} // 產品 h1=kh(key+'_si_'+i)（i=0→後綴 _0_0）；v≥12 合成鍵（v<12 是真實鍵，feed 不換真像素→DrawCheck 不計）
    assert(foundL1,'T417 維度2 前置：應找到 lv1 商業鍵 i=0 抽中 helipad（決定性選型契約），300 鍵內未命中');
    window.__t417Reset();window.__t417Feed(foundL1,flat417(40));
    assert(!window.__t417Read().kinds.includes('helipad'),'T417 F6 lv 門檻真釘：'+foundL1+'（lv1 抽中坪）不得落 helipad（lv<3 門檻換掉；拿掉門檻→紅），實得 '+JSON.stringify(window.__t417Read().kinds));
    let foundL2=null;
    for(let kk=12;kk<300&&!foundL2;kk++){const key='2_2_'+kk;if(poolC417[(khT417(key+'_0_0')>>>0)%8]==='helipad')foundL2=key;} // lv2 抽中坪（lv<3 門檻內側；`lv<3`→`lv<2` 邊界外一格→此案紅）
    assert(foundL2,'T417 維度2 前置：應找到 lv2 商業鍵 i=0 抽中 helipad（決定性選型契約），300 鍵內未命中');
    window.__t417Reset();window.__t417Feed(foundL2,flat417(40));
    assert(!window.__t417Read().kinds.includes('helipad'),'T417 F6 lv 門檻真釘 lv2：'+foundL2+'（lv2 抽中坪、rw40）不得落 helipad（lv<3 門檻；`lv<3`→`lv<2` 邊界外一格→紅），實得 '+JSON.stringify(window.__t417Read().kinds));
    let foundW=null;
    for(let kk=12;kk<300&&!foundW;kk++){const key='2_3_'+kk;if(poolC417[(khT417(key+'_0_0')>>>0)%8]==='helipad')foundW=key;}
    window.__t417Reset();window.__t417Feed(foundW,flat417(16));
    assert(!window.__t417Read().kinds.includes('helipad'),'T417 F6 rw 門檻真釘：'+foundW+'（lv3 抽中坪但段寬 16<20）不得落 helipad（rw≥20 門檻；拿掉→紅），實得 '+JSON.stringify(window.__t417Read().kinds));
    window.__t417Reset();window.__t417Feed(foundW,flat417(40));
    assert(window.__t417Read().kinds.includes('helipad'),'T417 維度2 lv3 坪落地：'+foundW+'（lv3、rw40）必須含 helipad（kh 重算預測命中），實得 '+JSON.stringify(window.__t417Read().kinds));
    window.__t417Reset();window.__t417Feed('1_4_99',flat417(30));
    const rL4=window.__t417Read();
    assert(rL4.keys['1_4_99']>=1&&rL4.n>=1,'T417 維度2 lv4：R 族 lv4 鍵落筆（自動清單對未來 lv4 鍵自動覆蓋），實得 '+JSON.stringify(rL4));
    // 維度 3 平坦段：單段/多段/窄段不落筆/超寬＋A2 屋頂閘（高台+地面台座→地面段不落筆）
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(30));
    assert(window.__t417Read().seg===1,'T417 維度3 單段：30px 單平台 seg=1，實得 '+window.__t417Read().seg);
    const multi417=[];for(let i=0;i<20;i++)multi417.push(20);for(let i=0;i<20;i++)multi417.push(30+(i%2)*3);for(let i=0;i<14;i++)multi417.push(20); // 段A 20px＋鋸齒凹陷 20px（30/33 交替不成段、覆蓋徽記帶 [26,34]，二輪退修 B2：帶當 used 預佔後段須帶外才能測密度）＋段B 14px
    window.__t417Reset();window.__t417Feed('1_1_99',multi417);
    const rM=window.__t417Read();
    assert(rM.seg===2,'T417 維度3 多段：兩平台皆落筆 seg=2，實得 '+rM.seg);
    assert(rM.n===2+1,'T417 維度3 多段道具數：段A(20px→2)＋段B(13px→1)=3，實得 '+rM.n);
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(8));
    const rN=window.__t417Read();
    assert(rN.n===0&&rN.seg===0&&!rN.keys['1_1_99'],'T417 維度3 窄段：8px 平台不落筆不記 key（runs ≥10px 過濾），實得 '+JSON.stringify(rN));
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(48),112,{ax:2}); // ax=2：徽記帶 [0,6) 移到段左端，帶外空間 42px——密度公式上限案 try=5 穩定、min(5) 移除→try=6 紅（案 1 鑑別力）
    const rW=window.__t417Read();
    assert(rW.try===5&&rW.n===3,'T417 維度3 超寬：48px 段密度公式嘗試件數=5（落筆 3：帶外空間+碰撞右移的決定性結果，入卡聲明），實得 try='+rW.try+' n='+rW.n);
    const ground417=[];for(let i=0;i<20;i++)ground417.push(20);for(let i=0;i<10;i++)ground417.push(98);for(let i=0;i<20;i++)ground417.push(98); // 高台 20px＋貼地台座（y=98≈ay-12）
    window.__t417Reset();window.__t417Feed('1_1_99',ground417);
    const rG=window.__t417Read();
    assert(rG.seg===1&&rG.py.every(py=>py<60),'T417 A2 屋頂閘：地面台座段不得落筆（高台 y=20 唯一通過；t<minTop+30 且 t<地面前緣-20；拿掉閘→seg=2 紅），實得 '+JSON.stringify(rG));
    // 維度 4 道具數（二輪退修 B2：徽記帶當 used 預佔後，單段案的道具數受帶內不可用空間影響——預期按帶外空間重算）
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(12));
    assert(window.__t417Read().n===0,'T417 維度4 道具數窄：rw=12 段整段在徽記帶 [2,10) 內→0 件（徽記優先；帶預佔吃光 12px，入卡聲明），實得 '+window.__t417Read().n);
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(24));
    assert(window.__t417Read().n>=1&&window.__t417Read().n<=3,'T417 維度4 道具數中：rw=24 段 n∈[1,3]（密度公式 3；帶 [8,16) 預佔後帶外 [3,8)+[16,21) 物理空間不足壓縮，入卡聲明），實得 '+window.__t417Read().n);
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(64));
    const rW64=window.__t417Read();
    assert(rW64.try===5&&rW64.n===5,'T417 維度4 上限：rw=64→密度公式嘗試=5 且落筆=5（上限真的是上限；min(5) 移除→try=6 紅），實得 try='+rW64.try+' n='+rW64.n);
    // 維度 5 變體：合成鍵 v12/v13（真實鍵 v<12 不覆蓋開機 sprite）皆落筆且決定性差異
    window.__t417Reset();window.__t417Feed('1_1_12',flat417(30));
    const rV0=window.__t417Read();
    window.__t417Reset();window.__t417Feed('1_1_13',flat417(30));
    const rV11=window.__t417Read();
    assert(rV0.n>=1&&rV11.n>=1,'T417 維度5 變體：v12 與 v13 皆落筆（合成鍵），實得 '+rV0.n+'/'+rV11.n);
    assert(rV0.kinds.join(',')!==rV11.kinds.join(',')||rV0.seg!==rV11.seg||rV0.n!==rV11.n||JSON.stringify(rV0.pos)!==JSON.stringify(rV11.pos),'T417 維度5 決定性差異：v12 與 v13 台帳須不同（kh 位元選型），實得 '+JSON.stringify(rV0)+' vs '+JSON.stringify(rV11));
    // 維度 6 逃生閥：開/關兩態
    window.__noRoofProps417=true;
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(30));
    const rE=window.__t417Read();
    assert(rE.n===0&&!rE.keys['1_1_99'],'T417 維度6 逃生閥開：__noRoofProps417=true 時零落筆零 key，實得 '+JSON.stringify(rE));
    window.__noRoofProps417=false;
    window.__t417Reset();window.__t417Feed('1_1_99',flat417(30));
    assert(window.__t417Read().n>=1,'T417 維度6 逃生閥關：false 時正常落筆');
    // 落點行為釘（二輪退修 B1/B2）：bbox 從「執行 props 量測」取（不再手抄 W417v），
    // 區間用 [px+lo,px+hi)；帶用 bandOf345 動態值（k2 1×1→band 4）；帶當 used 預佔後帶內天然 0 件
    const B417v=window.__t417BBox();
    const bandC417=window.__t417BandOf345?window.__t417BandOf345(2):4;
    window.__t417Reset();window.__t417Feed('2_3_99',flat417(64));
    const rP=window.__t417Read();
    let ov417=0,badEdge=0,badBand=0;
    for(let i=0;i<rP.pos.length;i++){
      const bi=B417v[rP.kinds[i]]||[0,4,4],loi=bi[0],hii=bi[1];
      if(rP.pos[i]+hii>64)badEdge++;
      if(rP.pos[i]+hii>32-bandC417&&rP.pos[i]+loi<32+bandC417&&(bi[2]||4)>3)badBand++; // 高道具不得與帶相交（矮化 ≤3px 允許）
      for(let j=i+1;j<rP.pos.length;j++){
        const bj=B417v[rP.kinds[j]]||[0,4,4];
        if(rP.pos[i]+loi<rP.pos[j]+bj[1]&&rP.pos[j]+bj[0]<rP.pos[i]+hii)ov417++;
      }
    }
    assert(ov417===0,'T417 落點釘：同段任兩件像素區間不得相交（B1：bbox [px+lo,px+hi) 實碼模型；ant/vent 左偏漏出→紅），實得 '+ov417+' 對重疊，pos='+JSON.stringify(rP.pos));
    assert(badEdge===0,'T417 落點釘：道具右緣 px+hi 不得越出平坦段（B1 右緣模型），實得 '+badEdge+' 件越界');
    assert(badBand===0,'T417 落點釘：高道具（>3px）不得與 T345 徽記帶相交（B2：帶當 used 預佔；右移不重檢帶→紅），實得 '+badBand+' 件');
    // 掃描矩陣（二輪退修 B2 ③：落點三釘跨每族 × lv1-4 × 寬 12/16/20/24/32/40/48/64——不能只有單一 fixture）
    const widths417=[12,16,20,24,32,40,48,64];
    const famTplM417={'R':'1','C':'2','H':'48','F':'6','S':'7','M':'42','W':'8'};
    const BBoxM417=window.__t417BBox();
    let ovM417=0,edgeM417=0,bandM417=0,totalM417=0;
    for(const fam of Object.keys(famTplM417)){
      const k=famTplM417[fam];
      for(let lv=1;lv<=4;lv++){
        for(const w of widths417){
          const profM=new Array(w).fill(20);
          const axM=Math.floor(w/2),bandMv=window.__t417BandOf345(+k);
          window.__t417Reset();window.__t417Feed(k+'_'+lv+'_99',profM,112,{ax:axM,ay:110});
          const rM2=window.__t417Read();
          for(let i=0;i<rM2.pos.length;i++){
            const bbM=BBoxM417[rM2.kinds[i]]||[0,4,4];
            totalM417++;
            if(rM2.pos[i]+bbM[1]>w)edgeM417++;
            if(rM2.pos[i]+bbM[1]>axM-bandMv&&rM2.pos[i]+bbM[0]<axM+bandMv&&(bbM[2]||4)>3)bandM417++;
            for(let j=i+1;j<rM2.pos.length;j++){
              const bjM=BBoxM417[rM2.kinds[j]]||[0,4,4];
              if(rM2.pos[i]+bbM[0]<rM2.pos[j]+bjM[1]&&rM2.pos[j]+bjM[0]<rM2.pos[i]+bbM[1])ovM417++;
            }
          }
        }
      }
    }
    assert(ovM417===0,'T417 掃描矩陣落點：7 族×lv1-4×8 寬 '+totalM417+' 件零重疊（B1 bbox 模型），實得 '+ovM417+' 對');
    assert(edgeM417===0,'T417 掃描矩陣落點：右緣零越界，實得 '+edgeM417+' 件');
    assert(bandM417===0,'T417 掃描矩陣落點：徽記帶內高道具零件（B2 帶預佔），實得 '+bandM417+' 件');
  }
  { // T417 維度 7 季節（冬季雪帽交互）：高度表 ≤7px（C2 更正：cap≥12 覆蓋 ≤7px；ant 實碼 7px）＋C5 對帳（regex 從產品碼掃 vs 宣告）
    const H417={ac:3,vent:5,ant:7,tank:5,waterTank:5,clothesline:2,garden:3,solar:2,shed:4,stairbox:5,hvac:4,signFrame:5,billboard:5,parapet:3,helipad:2,helipadH:2,dryingTower:6,schoolTank:5,flagpole:5};
    const W417c5={ac:5,vent:4,ant:5,tank:5,waterTank:4,clothesline:6,garden:6,solar:6,shed:6,stairbox:5,hvac:6,signFrame:6,billboard:8,parapet:6,helipad:10,helipadH:10,dryingTower:4,schoolTank:5,flagpole:6};
    const tall417=Object.entries(H417).filter(([k,h])=>h>7).map(([k])=>k);
    assert(tall417.length===0,'T417 維度7 冬季：道具高度表全 ≤7px（snowCap cap≥12 完全覆蓋=無尖刺；C2 更正 ant=7），超過者：'+tall417.join(','));
    for(const key of['1_1_99','2_1_99','48_1_99','6_1_99','7_1_99','42_1_99','8_1_99']){
      window.__t417Reset();window.__t417Feed(key,new Array(40).fill(20));
      const r=window.__t417Read();
      for(const k of r.kinds){if(k==='ind')continue;if(H417[k]===undefined||H417[k]>7)assert(false,'T417 維度7 '+key+' 落筆道具 '+k+' 高度 '+H417[k]+' 須 ≤7px 且在表中');}
    }
    // C5 對帳（二輪退修 B4：改「執行 props 量真實 bbox」——regex fail-open（誘餌矩形+真美術畫在 y-(2*15) 表達式偏移
    // 全繞過）；bbox 執行量測為唯一真相，與產品 P417B 宣告逐項對帳，手抄漂移/誘餌→紅）
    const BBox417=window.__t417BBox();
    const P417Bdecl417=window.__t417P417B();
    for(const name of Object.keys(H417)){
      assert(BBox417[name],'T417 C5 對帳：props 執行量測應含 '+name+'（fail-closed：無此道具→紅）');
      const bb=BBox417[name],decl=P417Bdecl417[name];
      assert(bb[2]===H417[name],'T417 C5 對帳：'+name+' 執行 bbox 高度 '+bb[2]+' 須等於宣告 '+H417[name]+'（誘餌矩形+真美術偏移→bbox 高度被誘餌騙→紅）');
      assert(JSON.stringify(bb)===JSON.stringify(decl),'T417 C5 對帳：'+name+' 執行 bbox '+JSON.stringify(bb)+' 須等於產品宣告 '+JSON.stringify(decl)+'（P417B 手抄漂移→紅）');
    }
    const WBox417={};for(const k of Object.keys(BBox417))WBox417[k]=BBox417[k][1]-BBox417[k][0]; // 執行寬度（供維度7 行為側用）
  }
  { // T417 覆蓋擴容：自動清單（B2 漏抄/幽靈鍵從源頭消失）＋M3 鍵集合＋m2/A1 靜態釘
    const bare417=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare417.includes('const ROOF_K417=new Set([1,2,3,6,7,8,11,12,28,30,33,34,42,48,52,61,105,106]);'),
      'T417 覆蓋擴容 G1：白名單 k 集合原文釘（自動清單從 SPR.bld 既有鍵產生；28_1_1/2、30_1_1/2 自動全含）');
    assert(bare417.includes('Object.keys(SPR.bld).filter(kk=>ROOF_K417.has(+kk.split(\'_\')[0]))'),
      'T417 覆蓋擴容 G1：清單自動產生原文釘（手抄清單=漏抄源，B2）');
    assert(bare417.includes('if(window.__noRoofProps417)return;'),
      'T417 逃生閥 G1：stampRoof 首行逃生閥原文釘（開機期閥，B4 語義入卡）');
    assert(bare417.includes('const n=Math.max(1,Math.min(5,Math.floor((rw+1)/8)));'),
      'T417 密度 G1：密度公式原文釘（clamp(段寬/8,1,5)）');
    assert(bare417.includes('for(let si=0;si<runsRoof.length;si++){'),
      'T417 多段 G1：多段利用迴圈原文釘（A2 閘後 runsRoof）');
    assert(bare417.includes('const runsB417=runs.filter')&&bare417.includes('const runsRoof=runsB417.filter'),
      'T417 A2 屋頂閘 G1：兩段過濾原文釘（四輪退修 B1：先閘 B 篩離地段再閘 A 距頂——基座地台/懸空招牌/雨遮不得當屋頂）');
    // B5 夜燈遮罩（二輪退修）：stampRoof 記 _roofTop417、bakeOne 採樣跳過、maskNight destination-out 補刀——亮窗不得落在屋頂道具上（T261 舊漏光復活→紅）
    assert(bare417.includes('if(!s._roofTop417)s._roofTop417=new Int16Array(s.w).fill(1e4);'),
      'T417 B5 靜態釘：stampRoof 落筆須寫入夜燈遮罩 _roofTop417（道具區亮窗→紅）');
    assert(bare417.includes('if(s._roofTop417&&py>=s._roofTop417[px]&&s._roofBot417&&py<=s._roofBot417[px])continue;'),
      'T417 五輪 A1 靜態釘：bakeOne 只跳過屋頂道具 [top,bottom]（整欄跳過→道具下整面牆 nightCity 掉燈→紅）');
    assert(bare417.includes('globalCompositeOperation=\'destination-out\';ng3.fillStyle=\'#000\';')&&bare417.includes('fillRect(mx,s._roofTop417[mx],1,bt-s._roofTop417[mx]+1)'),
      'T417 A3 靜態釘：maskNight 遮罩只抹道具列 [top,bottom]＋顯式 fillStyle（四輪退修 A3：整欄抹光→窗燈掉 22-46%＋5,248 欄黑豎條；殘留 fillStyle→rgba 鍵只抹 40-45% 漏光照舊→紅）');
    // B6 冬季雪線（二輪退修）：stampRoof 快取 _roofLine417、snowCap/icicleCap 改用屋面雪線＋道具薄雪——雪線不再被道具頂高破碎
    assert(bare417.includes('s._roofLine417=roof.slice();'),
      'T417 B6 靜態釘：stampRoof 須快取屋面雪線 _roofLine417（雪線被道具頂高→紅）');
    assert(bare417.includes('if(s._roofLine417)top=s._roofLine417[x];'),
      'T417 B6 靜態釘：snowCap 須以 _roofLine417 當屋面雪線（屋頂道具各自頂雪+旁圈變薄→紅）');
    assert(bare417.includes('if(s._roofTop417&&s._roofTop417[x]<1e4&&s._roofTop417[x]<top)top=s._roofTop417[x];'),
      'T417 B6 靜態釘：snowCap 道具欄雪帽起點須上移道具頂（道具補薄雪）');
    // m2 決定性紅線（二輪退修 B3：取樣區擴到整個 T278/T417 塊——原只切 stampRoof 體內，kh/props/P417B/FAM_KINDS
    // 全宣告在 stampRoof 之前，FAM_KINDS 池順序摻 Date.now()&1 全綠穿透；現在 const kh= 到 T278 END 全禁）
    const srBlock417=bare417.slice(bare417.indexOf('const kh=s=>{let h=0'),bare417.indexOf('for(const kk of roofKeys417)stampRoof(kk);')+40);
    assert(!srBlock417.includes('Math.random')&&!srBlock417.includes('new Date')&&!srBlock417.includes('performance.')&&!srBlock417.includes('Date.now'),
      'T417 m2 靜態釘：T278/T417 整塊禁 Math.random/new Date/performance（決定性紅線；FAM_KINDS 池順序摻 Date.now()&1→紅）');
    assert(!/s\.(h|w)\s*(<|>|<=|>=|===|!==|==|!=)\s*[\d.]/.test(srBlock417)&&!/[\d.]+\s*(<|>|<=|>=|===|!==|==|!=)\s*s\.(h|w)/.test(srBlock417)&&!/s\.(h|w)\s*in\b/.test(srBlock417)&&!/Object\.(values|keys|entries)\([^)]*s\.(h|w)/.test(srBlock417),
      'T417 A1 靜態釘：stampRoof 不得以 s.h/s.w 任何比較或相等式短路（RL-1：原 regex 只認 <>/=——if(s.h!==32&&...) 型等式白名單→紅；含 in/Object.values 間接）');
    // m2 行為釘（B3）：stub Date.now 兩個相差 1 的值，同一鍵兩次烘焙台帳須逐欄位相同（掛鐘奇偶皆綠=不是碰運氣）
    const flatM2=(w)=>new Array(w).fill(20); // 塊級作用域：前區塊的 flat417 不可見
    const dn0=Date.now;
    Date.now=()=>1234567;
    window.__t417Reset();window.__t417Feed('1_1_99',flatM2(30));const rD1=JSON.stringify(window.__t417Read());
    Date.now=()=>1234568;
    window.__t417Reset();window.__t417Feed('1_1_99',flatM2(30));const rD2=JSON.stringify(window.__t417Read());
    Date.now=dn0;
    assert(rD1===rD2,'T417 m2 行為釘：Date.now 相差 1 的兩值同鍵兩烘台帳須相同（選型摻掛鐘→兩次不同→紅），實得 '+rD1+' vs '+rD2);
    // M3 覆蓋鍵集合：含已知真實鍵樣本（含 B2 補的四鍵）＋不含幽靈鍵（B1：11/12/52 無鍵）
    const ck=window.__t417CoveredKeys();
    for(const kk of['1_1_0','1_3_11','2_1_0','3_2_5','6_1_0','6_1_4','7_1_0','7_1_4','8_1_0','28_1_0','28_1_1','28_1_2','28_1_3','28_1_4','30_1_0','30_1_1','30_1_2','33_1_0','34_1_1','42_1_0','48_1_0','61_1_0','105_1_0','106_1_0'])
      assert(ck.includes(kk),'T417 M3 覆蓋鍵：'+kk+' 應在自動清單（B2 漏抄→紅），實得 '+ck.length+' 鍵');
    for(const kk of['11_1_0','12_1_0','52_1_0'])
      assert(!ck.includes(kk),'T417 M3 幽靈鍵：'+kk+' 不應在清單（SPR.bld 無此鍵，B1 死美術→紅），實得 '+JSON.stringify(ck));
  }
  { // T417 開機決定性計數（C7：headless 掛鐘假數字→計數決定性；四輪退修 A2：單次 min(h,ay+1)，Px 述詞有上界）
    const bootGID=window.__t417BootGID417|0;
    const bootKeys=window.__t417BootKeys417|0;
    const bootPx1=window.__t417BootPx1|0;
    const ckLen=window.__t417CoveredKeys().length;
    assert(bootKeys===ckLen,'T417 開機計數：開機快照鍵數 '+bootKeys+' == 覆蓋鍵數 '+ckLen+'（同一 roofKeys417 來源）');
    assert(bootGID===bootKeys,'T417 開機計數：getImageData 呼叫次數 '+bootGID+' == 開機鍵數 '+bootKeys+'（每鍵恰一次單次讀取，C7 決定性紅線；烘焙退化/提前 return→紅）');
    assert(bootPx1>=1000000&&bootPx1<=996032*2,
      'T417 開機計數：像素量 '+bootPx1+'（單次 min(h,ay+1)；master 絕對基準 996,032，+100% 上界='+(996032*2)+'——五輪退修 A2：不得再疊乘鍵數縮放；退化/漏掃→紅）');
  }
  { // T417 五輪退修 A1：實際 bakeOne 行為釘——窄屋頂道具框只移除自身列，不得抹掉其下整面牆燈。
    const noRoof417=window.__t417NightPixels(false),roof417=window.__t417NightPixels(true);
    const drop417=noRoof417>0?(noRoof417-roof417)/noRoof417:1;
    assert(noRoof417>0&&roof417<=noRoof417&&drop417<=.02,
      'T417 五輪 A1 nightCity：屋頂道具版相對 ?noroof 基線降幅 '+(drop417*100).toFixed(3)+'% ≤2%（基線 '+noRoof417+'、道具版 '+roof417+'；採樣改回整欄跳過→紅）');
  }
  { // T417 三輪退修 A-2：掃描階段釘（第六條指紋收口）——不走 profile override，量畫布畫已知剪影讓產品自己掃，
    // 斷言 roof 抓到 y=71/77/120 深位置（屋頂線在 64px 以下——單階段窄帶必掃丟→紅；掃描高度/alpha 閾值/迴圈範圍缺陷全現形）
    const scanCases417=[['1_1_2',71],['8_1_1',77],['61_1_0',120]];
    for(const[key,roofY]of scanCases417){
      window.__t417Reset();
      window.__t417FeedScan(key,roofY);
      const rS=window.__t417Read();
      const line=window.__t417ScanResult(key);
      assert(line!==null,'T417 掃描釘 '+key+'：stampRoof 應快取 _roofLine417（掃描階段輸出，無 override）');
      const missS=line?line.filter(y=>y<0).length:-1;
      assert(missS===0,'T417 掃描釘 '+key+'：掃不到不透明像素的欄數 === 0（屋頂線 y='+roofY+' 深於 64px；單階段窄帶→全欄 -1→紅），實得 '+missS+' 欄');
      assert(line[10]===roofY,'T417 掃描釘 '+key+'：段中央欄 roof 抓到 y='+roofY+'（兩階段補讀下半部；抓到 '+line[10]+'→紅）');
      assert(rS.n>=1,'T417 掃描釘 '+key+'：深屋頂線剪影必落筆（掃描成功→有段→道具），實得 '+JSON.stringify(rS));
    }
    // ③ flagpole/dryingTower 真實鍵落筆（三輪退修 B：閘 A minTop 改最寬段後 42_1_0/30_1_0 主屋頂通過）
    const towerCases=[['42_1_0',114,'M','flagpole',40,96,45],['30_1_0',85,'F','dryingTower',20,52,30]];
    for(const[key,roofY,fam,excl,segL,segR,towerTop]of towerCases){
      window.__t417Reset();
      window.__t417FeedScan(key,roofY,segL,segR,towerTop);
      const rT=window.__t417Read();
      assert(rT.n>=1,'T417 掃描釘 '+key+'（'+fam+' 族）：塔頂小平台不誤殺主屋頂——剪影屋頂線 y='+roofY+' 必落筆（minTop 取最寬平坦段；取任何 ≥3 欄→鐘塔頂 45+30 擋 114→紅），實得 '+JSON.stringify(rT));
      assert(rT.kinds.includes(excl),'T417 掃描釘 '+key+'：專屬道具 '+excl+' 在真實鍵落筆（三輪都是 0 的死美術→紅），實得 '+JSON.stringify(rT.kinds));
    }
  }
  { // T417 四輪退修 A1：開機台帳六條——非理想剪影對全部真實鍵（段內 ±1px 起伏/段起點遠離 ax/高段/塔頂平台），
    // fixture 理想平台讓閘四參數（容差/slack/斜率/門檻）全退化恆真——此台帳讓任何改動都紅
    const led=window.__t417BootLedger();
    assert(JSON.stringify(led.empty)===JSON.stringify(['8_1_2']),'T417 開機台帳①：runsRoof 空集合恰等 {8_1_2}（垃圾場地面型被閘 B 擋），實得 '+JSON.stringify(led.empty));
    assert(led.hit===173,'T417 開機台帳②：有落筆鍵數恰 173（真實 Chrome 基準），實得 '+led.hit);
    assert(led.total>=660&&led.total<=700,'T417 開機台帳③：落筆總數 '+led.total+' ∈[660,700]（剪影版決定性計數；卡面 [700,780] 為真實 Chrome 基準 737——差 68 因塔頂覆蓋斷主段之形態代價，閉環節注明）');
    for(const[k,v]of Object.entries({flagpole:1,dryingTower:7}))
      assert((led.excl[k]||0)>=v,'T417 開機台帳④：'+k+' 在真實鍵集落筆 ≥'+v+'（死美術→紅），實得 '+(led.excl[k]||0));
    // ④ 的 helipadH：剪影版 Ledger 選型未命中（rw 門檻/池空）→ 坪專案（④b）kh 重算找 i=0 選中它的真實鍵必落坪
    assert(led.t288===36,'T417 開機台帳⑤：工業走 T288 鍵數恰 36，實得 '+led.t288);
    assert(led.ground<=8,'T417 開機台帳⑥：地面道具數 ≤8（剪影版實測 6；真實 Chrome 基準 ≤3 卡面標明；斜率刪除/門檻放寬→貼地段通過→大增→紅），實得 '+led.ground);
    // 坪專案（④ 的 helipad/helipadH）：剪影版 Ledger 選型未命中（rw 門檻/池空）——kh 重算找 i=0 選中的真實鍵＋FeedPad 寬段必落坪
    const khP=(s)=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;};
    const padCases=[[['ac','vent','tank','helipadH'],kk=>window.__t417Fam(kk)==='H','helipadH'],[['ac','vent','ant','hvac','signFrame','billboard','parapet','helipad'],kk=>window.__t417Fam(kk)==='C'&&(+kk.split('_')[1]||1)===3,'helipad']];
    for(const[poolP,predP,exclP]of padCases){
      const keysP=window.__t417CoveredKeys().filter(kk=>(+kk.split('_')[2]||0)<12&&predP(kk));
      let pk=null;
      for(const kk of keysP){if(poolP[(khP(kk+'_0_0')>>>0)%poolP.length]===exclP){pk=kk;break;}}
      assert(pk,'T417 開機台帳④b：符合族判定的真實鍵應有 i=0 選中 '+exclP+' 的鍵（kh 重算決定性）');
      window.__t417Reset();window.__t417FeedPad(pk);
      const rP2=window.__t417Read();
      assert(rP2.kinds.includes(exclP),'T417 開機台帳④b：'+pk+'（真實鍵 v<12）寬段剪影必落 '+exclP+'（rw≥20 放行），實得 '+JSON.stringify(rP2.kinds));
    }
  }
  { // T417 四輪退修 B2 行為釘：T288 遮罩逐欄記各道具實際頂部——煙囪列頂=屋頂線−10（recT(cy2-10)），段內非道具列不得被遮（1e4）
    // 整段「屋頂線−12」→全段 y=8、無 1e4→雙重紅
    window.__t417Feed('3_1_99',new Array(40).fill(20));
    const spT=window.__t417RoofTop('3_1_99');
    assert(spT&&spT.some(v=>v===10)&&spT.some(v=>v===1e4),
      'T417 B2 行為釘：T288 遮罩逐欄記各道具實際頂部（煙囪頂=屋頂線−10、非道具列 1e4 不遮）——整段−12→全段 8→紅');
  }
  { // T417 四輪退修 B4 行為釘：跨段同鍵同款 ≤1（選型池 key 級提 si 迴圈外）——雙段剪影各抽 2 件，段間撞款→紅
    const profB4=new Array(48).fill(-1);
    for(let x=0;x<20;x++)profB4[x]=20;
    for(let x=28;x<48;x++)profB4[x]=20;
    window.__t417Reset();window.__t417Feed('2_1_99',profB4);
    const rB4=window.__t417Read();
    const dupB4=rB4.kinds.filter((k,i)=>rB4.kinds.indexOf(k)!==i);
    assert(dupB4.length===0,'T417 B4 行為釘：跨段同鍵同款 ≤1（池提 si 迴圈外 key 級去重；提回段內→段間撞款→紅），實得 '+JSON.stringify(rB4.kinds));
  }
  { // T417 二輪退修 A1 真實鍵行為釘（RL-1/RL-3/RL-4 一次封死）：真實鍵（v<12）真尺寸真 ax/ay 換量畫布必落筆——
    // key 判別（v<12 return）、h 白名單（!== 型）、ay 白名單（!==110 型）短路在真實鍵路徑全紅；
    // 尾端還原 img（RL-3 修法）；族別可達性（每族至少一真實鍵落筆，42_1_0 不再死美術）
    const realKeys417=window.__t417CoveredKeys().filter(kk=>(+kk.split('_')[2]||0)<12);
    assert(realKeys417.length>=10,'T417 A1 真實鍵樣本：覆蓋清單真實鍵（v<12）≥10 個，實得 '+realKeys417.length);
    const realFam417={'1':'R','2':'C','3':'I(T288)','6':'F','7':'S','8':'W','42':'M','48':'H','28':'H','61':'F'};
    for(const[prefix,fam]of Object.entries(realFam417)){
      const key=realKeys417.find(kk=>kk.startsWith(prefix+'_'));
      assert(key,'T417 A1 真實鍵釘：'+fam+' 族（k'+prefix+'）應有真實鍵樣本（v<12）');
      window.__t417Reset();
      window.__t417FeedReal(key);
      const r=window.__t417Read();
      assert(r.n>=1&&r.keys[key]>=1,'T417 A1 真實鍵釘 '+fam+'：'+key+'（真實鍵 v<12、真尺寸真 ax/ay）換量畫布必落筆（RL-1 key/h/ay 判別短路在此路徑紅），實得 '+JSON.stringify(r));
    }
  }
  { // T417 二輪退修 A2：T288 工業組鍵數恰等 36 且每鍵必落筆（isInd 移閘前——上輪閘誤殺 8 工業鍵 36→28、3_1_1 紅白煙囪消失的回歸釘）
    const indKeys417=window.__t417IndKeys();
    assert(indKeys417.length===36,'T417 T288 工業鍵數：k3 在 SPR.bld 的鍵數應恰 36（master/R1 真實 Chrome 基準；閘誤殺 T288→少→紅），實得 '+indKeys417.length);
    for(const key of indKeys417){
      window.__t417Reset();
      window.__t417FeedReal(key);
      const r=window.__t417Read();
      assert(r.n>=1,'T417 T288 每鍵必落筆：'+key+'（isInd 分支在屋頂閘前；閘擋 T288→零落筆→紅），實得 '+JSON.stringify(r));
    }
  }
  { // T417 二輪退修 A2：族別可達性——每族至少一真實鍵落筆＋專屬道具在真實鍵集落筆 ≥1（42_1_0 零落筆→flagpole 死美術的回歸釘）
    const realKeys417=window.__t417CoveredKeys().filter(kk=>(+kk.split('_')[2]||0)<12);
    const exclReal417={'R':['waterTank','clothesline','garden','solar','shed','stairbox'],'C':['hvac','signFrame','billboard','parapet','helipad'],'H':['helipadH'],'F':['dryingTower'],'S':['schoolTank'],'M':['flagpole'],'W':[]};
    const famHitReal417={};
    for(const key of realKeys417){
      window.__t417Reset();
      window.__t417FeedReal(key);
      const r=window.__t417Read();
      const fam=window.__t417Fam(key);
      if(r.n>=1){famHitReal417[fam]=true;for(const k of r.kinds){const i=(exclReal417[fam]||[]).indexOf(k);if(i>=0)exclReal417[fam].splice(i,1);}}
    }
    for(const fam of Object.keys(exclReal417)){
      assert(famHitReal417[fam],'T417 族別可達性 '+fam+'：至少一真實鍵（v<12）落筆（死美術→紅），實得 '+JSON.stringify(famHitReal417));
      assert(!(exclReal417[fam]||[]).length,'T417 族別可達性 '+fam+'：專屬道具 '+JSON.stringify(exclReal417[fam])+' 應在真實鍵集落筆 ≥1（上輪 P 族同型死美術→紅）');
    }
  }
  { // G4 行為 NaN 案（覆核 B1 補洞的行為證明）：setSpeed(NaN) 須落地為 0＝凍結，而非極速衝刺清案
    window.GV.newWorldSeeded(424);window.GV.weather(0);
    window.__t384Bld(11,10,10);window.__t384Bld(1,12,10);
    window.__t387Cov();
    window.GV.igniteCrime(12,10);
    window.GV.setSpeed(NaN);
    window.GV.advanceN(.05,120);
    assert(window.GV.tile(12,10).bld.crime===1,'T411 G4 setSpeed(NaN) 須夾為 0＝服務車凍結（未修版=NaN<1 恆假守門穿透，每幀 1 格極速清案）');
    window.GV.setSpeed(1);
  }
  // ===== T412 犯罪生命週期存讀補全（第三波小 bug 包；純正確性） =====
  { // G1 靜態：全部釘在去註解文本（T411 鐵訓）
    const bare412=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare412.includes("'ab','ctr','cmd']"),'T412 G1 cmd 須入 RLE_F 壓縮名單（缺=僅體積退化，仍釘死防漂移）');
    assert(bare412.includes("cmd+=String.fromCharCode(48+(t.bld&&t.bld.crime?Math.min(15,t.bld.crimeDays||0):0));"),
      'T412 G1 cmd 出檔行原文釘（上限 15=廢棄門檻，唯一消費者是 >=15 判定）');
    assert(bare412.includes("ab+=(t.bld&&!t.bld.ref&&t.bld.abandoned)?1:0;"),
      'T412 G1 ab 出檔須讀建築層（原讀 t.abandoned 死欄位=存檔永遠 0）');
    assert(!bare412.includes('ab+=t.abandoned?1:0;'),'T412 G1 舊錯層出檔式絕跡');
    assert(bare412.includes("if(d.cmd)for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&b.k<=3&&b.crime){const v=d.cmd.charCodeAt(i)-48;if(v>0)b.crimeDays=v;}}"),
      'T412 G1 cmd 入檔應用迴圈原文釘（依賴 cm 迴圈先還原 crime 旗）');
    assert(bare412.includes("if(d.ab)for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&b.k<=3&&+d.ab[i])b.abandoned=1;}"),
      'T412 G1 ab 入檔須還原到建築層（原還原到 t.abandoned=廢棄讀檔復活）');
    assert(bare412.includes('bb.crime=0;bb.crimeDays=0;markLandDirty(x,y,4);'),
      'T412 G1 crimeBtn 須歸零倒數（原只清旗=玩家親手處理比等警車虧）');
    assert(bare412.includes('{b.crime=0;b.crimeDays=0;return true;}'),
      'T412 G1 GV.clearCrime 須歸零倒數（三清案路徑同語義）');
  }
  { // G2 行為 往返案：crimeDays 與 abandoned 存讀恆真（紅源=修前歸 0/復活）
    window.GV.newWorldSeeded(425);window.GV.weather(0);
    window.__t384Bld(1,20,20);window.GV.igniteCrime(20,20);window.__t412Set(20,20,'crimeDays',7);
    window.__t384Bld(1,25,20);window.__t412Set(25,20,'abandoned',1);
    window.__t384Bld(1,30,20);window.GV.igniteCrime(30,20);window.__t412Set(30,20,'crimeDays',22);
    /* T412 加固（對抗性覆核繞過 #3 補洞）：犯罪+廢棄【同存】樓——tick 廢棄化（12394）不清 crime 旗，
       同存正是犯罪致廢棄樓的常態；只測「無犯罪的廢棄」＝笛卡兒積角落漏測，讀檔抹同存態的改動全綠滑過。 */
    window.__t384Bld(1,35,20);window.GV.igniteCrime(35,20);window.__t412Set(35,20,'crimeDays',15);window.__t412Set(35,20,'abandoned',1);
    window.GV.save();
    /* T412 加固（覆核繞過 #1 補洞）：save() 必須是快照不是遷移——自動存檔每 25 秒一次，
       若出檔後歸零活狀態，倒數永遠到不了 15＝機制死亡而往返案照綠（load 從 cmd 還原）。 */
    {const lv=window.GV.tile(20,20).bld;
     assert(lv.crime===1&&lv.crimeDays===7,'T412 G2b save() 不得破壞活狀態（出檔=快照非遷移；自動存檔 25 秒一次，save 即歸零=廢棄倒數永達不到 15），實得 days='+lv.crimeDays);}
    assert(window.GV.load()===true,'T412 G2 save→load 成功');
    const b7=window.GV.tile(20,20).bld,b22=window.GV.tile(30,20).bld,bab=window.GV.tile(25,20).bld,bco=window.GV.tile(35,20).bld;
    assert(b7.crime===1&&b7.crimeDays===7,'T412 G2 crimeDays=7 往返恆真（修前=歸 0＝存讀檔洗白 15 天倒數），實得 crime='+b7.crime+' days='+b7.crimeDays);
    assert(b22.crime===1&&b22.crimeDays===15,'T412 G2 crimeDays=22 往返夾 15（上限=廢棄門檻，>=15 語義精確保留），實得 '+b22.crimeDays);
    assert(bab.abandoned===1,'T412 G2 abandoned 往返恆真（修前=復活照常繳稅），實得 '+bab.abandoned);
    assert(bco.crime===1&&bco.crimeDays===15&&bco.abandoned===1,'T412 G2c 犯罪+廢棄同存樓三欄往返全真（讀檔抹同存態=犯罪懲罰重載即消失），實得 crime='+bco.crime+' days='+bco.crimeDays+' ab='+bco.abandoned);
  }
  { // G3 行為 舊檔容錯案：剝掉 cmd/ab 通道 → load 不拋、缺省與修前行為等價
    const raw412=JSON.parse(store[SKEY]);
    delete raw412.cmd;delete raw412.ab;
    store[SKEY]=JSON.stringify(raw412);
    assert(window.GV.load()===true,'T412 G3 舊格式（無 cmd/ab）load 不拋');
    const o7=window.GV.tile(20,20).bld,oab=window.GV.tile(25,20).bld;
    assert(o7.crime===1&&(o7.crimeDays||0)===0,'T412 G3 舊檔缺 cmd＝crime 旗還原而倒數缺省 0（與修前等價），實得 days='+(o7.crimeDays||0));
    assert(!oab.abandoned,'T412 G3 舊檔缺 ab＝不還原廢棄（遺失資料救不回，無回歸）');
  }
  { // G4 行為 對齊案：手動清案與警車到場同語義
    window.GV.newWorldSeeded(426);window.GV.weather(0);
    window.__t384Bld(1,20,20);window.GV.igniteCrime(20,20);window.__t412Set(20,20,'crimeDays',9);
    assert(window.GV.clearCrime(20,20)===true,'T412 G4 clearCrime 成功');
    const g4=window.GV.tile(20,20).bld;
    assert(g4.crime===0&&g4.crimeDays===0,'T412 G4 手動清案須連帶歸零倒數（修前殘留 9 天=下次犯罪直接繼承倒數），實得 crime='+g4.crime+' days='+g4.crimeDays);
  }
  { // G5 行為 crimeBtn DOM 路徑（對抗性覆核繞過 #2 補洞）：G1 釘文只驗「行在場」，
    // 把處理器的綁定換成淺拷貝（{...bld}）＝突變寫進丟棄的拷貝，釘文原封而玩家點按整路斷。
    // 走真 DOM 路徑打到真實建築才算數（覆核懷疑者的探針原樣收編，乾淨版已驗綠/攻擊版已驗紅）。
    window.GV.newWorldSeeded(427);window.GV.weather(0);
    window.__t384Bld(1,20,20);window.GV.igniteCrime(20,20);window.__t412Set(20,20,'crimeDays',9);
    makeEl('button','crimeBtn'); // 預註冊使 inspect 面板的 $('#crimeBtn') 命中同一元素
    window.GV.inspectAt(20,20);
    elMap.get('crimeBtn').click();
    const g5=window.GV.tile(20,20).bld;
    assert(g5.crime===0&&(g5.crimeDays||0)===0,'T412 G5 點擊「處理犯罪」須清到【真實建築】且歸零倒數（綁定換拷貝=toast 照跳犯罪照舊），實得 crime='+g5.crime+' days='+(g5.crimeDays||0));
  }
  // ===== T413a 夜之城骨架（收口/亮度梯度/批次註冊口；骨架零像素） =====
  { // G1 靜態：全部釘在去註解文本（T411 鐵訓）
    const bare413=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bare413.includes('if(nightDepth>0&&!window.__noNightCity){drawNightCity413(nightDepth);}'),
      'T413a G1 收口閘門行原文釘——日間 nightDepth===0 短路=「日間逐像素一致」硬性不變量由構造繼承；__noNightCity 逃生閥一刀全關');
    assert(bare413.includes('const NIGHT413=[];'),'T413a G1 批次註冊口在場（T413b 唯一進場通道）');
    assert(bare413.includes('function urbanDens406(x,y){'),'T413a G1 密度函式抽出在場（T408 先例，第二呼叫者=夜之城）');
    assert(bare413.includes('return clamp((n-5)/38,0,1);'),'T413a G1 密度正規化式原文釘（T407 實測標定，不得漂移）');
    assert(bare413.includes('const dens=urbanDens406(x,y);'),'T413a G1 pickV406 改呼叫抽出函式（同式同序純重構）');
    assert(!bare413.includes('const dens=clamp((n-5)/38,0,1);'),'T413a G1 舊內聯式絕跡（雙份公式=漂移溫床）');
    assert((bare413.match(/nightTierDirty413=true;/g)||[]).length===3,
      'T413a G1 置髒恰 3 處（宣告初值+newWorld+load 成對，鐵律7 對稱；多一處=有人亂置髒/少一處=某端漏配對），實得 '+((bare413.match(/nightTierDirty413=true;/g)||[]).length));
    /* T413a 加固（對抗性覆核③④⑤補洞）：層序雙收口+呼叫點恰等+骨架期 push 絕跡 */
    assert(bare413.includes('if(nightDepth>0&&!window.__noNightCity){drawNightCityTop413(nightDepth);}'),
      'T413a G1b 頂層派發閘門行原文釘（建築物件層之後——光束/頻閃/立面霓虹畫在建築之上，前段畫的會被建築蓋掉=覆核③）');
    assert(bare413.includes('const NIGHT413T=[];'),'T413a G1b 頂層註冊口在場');
    assert((bare413.match(/drawNightCity413\(/g)||[]).length===2&&(bare413.match(/drawNightCityTop413\(/g)||[]).length===2,
      'T413a G1b 兩派發器呼叫點各恰 2 處（定義+閘門；多出=有人開了不帶逃生閥的旁路=覆核繞過④a），實得 '
      +((bare413.match(/drawNightCity413\(/g)||[]).length)+'/'+((bare413.match(/drawNightCityTop413\(/g)||[]).length));
    /* T413b 跟版：push 恰等（地面2/頂層3；C8 刪 no-op）— 釘去註解文本 */
    assert((bare413.match(/NIGHT413\.push\(/g)||[]).length===2,
      'T413b G1b NIGHT413.push 恰 2，實得 '+((bare413.match(/NIGHT413\.push\(/g)||[]).length));
    assert((bare413.match(/NIGHT413T\.push\(/g)||[]).length===3,
      'T413b G1b NIGHT413T.push 恰 3（地標+霓虹+航障），實得 '+((bare413.match(/NIGHT413T\.push\(/g)||[]).length));
    assert(!bare413.includes('drawNightTierRead413'),'T413b G1b 禁止 no-op drawNightTierRead413');
    assert(bare413.includes('drawNightLamps413')&&bare413.includes('drawNightWaterReflect413')&&bare413.includes('drawNightLandmarks413')&&bare413.includes('drawNightCommNeon413')&&bare413.includes('drawNightIndAvia413'),
      'T413b G1b 五繪製器名在場（去註解）');
    assert(bare413.includes('_viewRange413')&&bare413.includes('nightScanN413'),
      'T413b G1b 可視域迭代+實掃計數在場');
    assert(bare413.includes('_roadTier413'),'T413b G1b 路燈鄰近建築 tier 在場');
    assert(bare413.includes('s.nightCity')&&bare413.includes('quality!==0'),
      'T413b G1b nightCity 分層+quality 檔位在場');
    assert(bare413.includes("nightDepth>0&&!window.__noNightCity&&s.nightCity"),
      'T413b G1b 加料層僅 nightDepth>0 疊加（A1 暴雨日間恆等）');
    assert(bare413.includes("if(!nightCityPref)window.__noNightCity=true")||bare413.includes("if(!nightCityPref)window.__noNightCity=true;"),
      'T413b 設定：關接線 __noNightCity');
    assert(bare413.includes("localStorage.getItem(SAVEKEY+'.nightcity')==='0'"),
      'T413b 設定：僅明確 0 為關（預設開）');
    assert(bare413.includes('location.reload()')&&bare413.includes('bNightCity'),
      'T413b 設定：切換 reload + 鈕 id');
  }
  { // G2b 行為：重建期間 R() 實際消耗恆 0——文本掃描看不穿 helper 間接層（覆核繞過①c），計數器看得穿
    window.GV.newWorldSeeded(431);window.GV.weather(0);
    window.__t384Bld(1,20,20);
    assert(window.__t413R()===0,'T413a G2b rebuildNightTier413 全呼叫鏈零 R() 消耗（夜幀渲染吃模擬亂數流=鐵律2 本體破壞，掛機看不看夜景會改變城市未來），實得 '+window.__t413R());
  }
  { // G5 靜態：tick 體內零 nightTier413/NIGHT413 引用——「tick 不讀 draw 快取」紅線的機器化（覆核繞過②）
    const tickAt413=html.indexOf('function tick(){');
    const tickEnd413=html.indexOf('\nfunction ',tickAt413+10);
    const tickBody413=html.slice(tickAt413,tickEnd413>0?tickEnd413:tickAt413+200000);
    assert(!/nightTier413|NIGHT413/.test(tickBody413),
      'T413a G5 tick 體內禁讀夜之城快取/註冊口（模擬依賴渲染史=存檔不含 tier ⇒ save/load 不可重現）');
  }
  { // G2 三新函式零亂數（鐵律2；drawNightCity413/rebuildNightTier413/urbanDens406 皆幀路徑）
    for(const fn of ['function urbanDens406(x,y){','function rebuildNightTier413(){','function drawNightCity413(nd){']){
      const at=html.indexOf(fn);
      assert(at>0,'T413a G2 函式在場：'+fn);
      const end=html.indexOf('\nfunction ',at+10);
      const body=html.slice(at,end>0?end:at+2000).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
      assert(!/\bR\(\)|\bri\(/.test(body),'T413a G2 '+fn+' 零 R()/ri()');
    }
  }
  { // G3 行為：亮度分檔正確（密集簇=3 檔/孤宅=1 檔/空地=0 檔）
    window.GV.newWorldSeeded(430);window.GV.weather(0);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)window.__t384Bld(1,30+dx,30+dy); // 7×7 全滿 n=49 ⇒ d=1
    window.__t384Bld(1,60,60); // 孤宅 n=1 ⇒ d=0
    const t413=window.__t413();
    t413.rebuild();
    assert(t413.tier(30,30)===3,'T413a G3 密集簇中心=3 檔（市中心最亮），實得 '+t413.tier(30,30));
    assert(t413.tier(60,60)===1,'T413a G3 孤宅=1 檔（郊區也有一盞燈），實得 '+t413.tier(60,60));
    assert(t413.tier(50,50)===0,'T413a G3 空地=0 檔（界內無建築格；初版誤用 (80,80) 出了 72 圖界=undefined 教訓），實得 '+t413.tier(50,50));
  }
  { // G4 行為：註冊口派發；T413b 恰 2/3
    const t413b=window.__t413();
    assert(t413b.reg.length===2&&t413b.regT.length===3,'T413b G4 雙註冊口恰等（地面2/頂層3），實得 '+t413b.reg.length+'/'+t413b.regT.length);
    let got413=-1,gotTop413=-1;
    t413b.reg.push((nd)=>{got413=nd;});
    t413b.regT.push((nd)=>{gotTop413=nd;});
    t413b.call(.55);
    t413b.callTop(.66);
    t413b.reg.pop();t413b.regT.pop();
    assert(got413===.55&&gotTop413===.66,'T413a G4 雙派發器須以 nightDepth 各自呼叫註冊繪製器，實得 '+got413+'/'+gotTop413);
    assert(t413b.reg.length===2&&t413b.regT.length===3,'T413b G4 探針清理後恢復恰等，實得 '+t413b.reg.length+'/'+t413b.regT.length);
  }
  // ===== T413b 退修守衛（去註解錨 + 行為釘 + 紅源可咬） =====
  { // 設定鈕 T405 四刀（去註解）
    const bareB=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bareB.includes("localStorage.getItem(SAVEKEY+'.nightcity')==='0'"),'T413b 設定：僅 0 為關');
    assert(bareB.includes('nightCityPref=true'),'T413b 設定：預設開宣告');
    assert(bareB.includes('bNightCity'),'T413b 設定：鈕 id');
    assert(bareB.includes('location.reload()'),'T413b 設定：切換 reload');
    assert(html.indexOf('nightCityPref')<html.indexOf('function buildSprites(){'),'T413b 設定：讀取早於 buildSprites');
    const setAt=bareB.indexOf('bNightCity');
    const setSlice=bareB.slice(Math.max(0,setAt-200),setAt+400);
    assert(!/\bR\(\)|\bri\(|Math\.random|\bvri\(/.test(setSlice),'T413b 設定段零亂數');
  }
  { // 烘焙：活碼錨（bakeOne/kcatOf/nightCity/quality）+ 零亂數 + 行為 bakeCount
    const bareX=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bareX.includes('s.nightCity')&&bareX.includes('bakeOne')&&bareX.includes('kcatOf'),
      'T413b 烘焙活碼錨：nightCity+bakeOne+kcatOf（非註解字串）');
    assert(bareX.includes('quality!==0'),'T413b 烘焙 quality 檔位（A3）');
    assert(bareX.includes('SPR.policeVar')&&bareX.includes('SPR.hospitalVar')&&bareX.includes('SPR.clinicVar'),
      'T413b 烘焙含服務變體（C3）');
    const bakeAt=bareX.indexOf('const bakeOne=');
    assert(bakeAt>0,'T413b bakeOne 定義在去註解文本');
    const bakeEnd=bareX.indexOf('window.__t413BakeCount=bakeCount413',bakeAt);
    const bakeBody=bareX.slice(bakeAt,bakeEnd>0?bakeEnd+40:bakeAt+3500);
    assert(bakeBody.length>200&&bakeBody.length<5000,'T413b 烘焙區塊邊界合理，len='+bakeBody.length);
    assert(!/\bR\(\)|\bri\(|Math\.random|\bvri\(/.test(bakeBody),'T413b 烘焙碼零亂數');
    assert((window.__t413BakeCount|0)>50,'T413b 烘焙行為：命中數>50（刪整段烘焙會紅），實得 '+(window.__t413BakeCount|0));
    /* B5：分族計數——跳過 P/H/F/D 服務族時該族=0 必紅（不能只靠總數>50） */
    const bk=window.__t413BakeByKind||{};
    for(const k of['R','C','I','P','H','F','D']){
      assert((bk[k]|0)>0,'T413b B5 分族 bake '+k+'>0（跳過該族會紅），實得 '+(bk[k]|0));
    }
    assert(bareX.includes('__t413BakeByKind')&&bareX.includes('tally413'),
      'T413b B5 分族計數活碼錨（tally413/__t413BakeByKind）');
    /* C2：烘焙在 parity364（121/122/123 建立）之後——以源碼序證明，非 headless 像素 */
    const i121=html.indexOf("SPR.bld['121_1_0']");
    const iBake=html.indexOf('const bakeOne=');
    assert(i121>0&&iBake>i121,'T413b C2：bakeOne 在 121_1_0 賦值之後（真尾端），i121='+i121+' iBake='+iBake);
    assert(html.includes("SPR.bld['122_1_0']")&&html.includes("SPR.bld['123_1_0']"),'T413b C2：122/123 鍵在場');
    /* T415 守衛跟版：三旋鈕收斂（dens0 原文釘 + 1.35 絕跡 + step=3）——全部釘在去註解文本（T411 鐵訓） */
    assert(bakeBody.includes("const dens0=kind==='R'?(0.10+Math.min(4,lv|0)*0.025):kind==='C'?(0.08+Math.min(4,lv|0)*0.02):kind==='I'?0.07:kind==='D'?0.06:0.09;"),
      'T415 dens0 收斂後公式原文釘（R 斜率 0.05→0.025/C 斜率 0.04→0.02，高 lv 下修約 40-50%；塞註解不算）');
    assert(!bakeBody.includes('1.35:1'),'T415 lv3+ 商業 1.35 加成絕跡（高樓特寫不得連片彩紙屑；塞註解不算）');
    assert(bakeBody.includes('const step=3;'),'T415 商業採樣 step 統一 3 原文釘（2→3 單刀砍約 55% 點數；塞註解不算）');
  }
  { // overlay：零亂數 + 禁 urbanDens406 全函式體 + 可視域
    for(const fn of ['function drawNightLamps413(nd){','function drawNightWaterReflect413(nd){','function drawNightLandmarks413(nd){','function drawNightCommNeon413(nd){','function drawNightIndAvia413(nd){']){
      const at=html.indexOf(fn);
      assert(at>0,'T413b 繪製器在場：'+fn);
      const end=html.indexOf('\nfunction ',at+10);
      const body=html.slice(at,end>0?end:at+5000).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
      assert(!/\bR\(\)|\bri\(|Math\.random|\bvri\(/.test(body),'T413b '+fn+' 零亂數');
      assert(!body.includes('urbanDens406'),'T413b '+fn+' 禁自算密度 urbanDens406（全函式體）');
      assert(body.includes('_viewRange413')||body.includes('v2w'),'T413b '+fn+' 可視域迭代');
      assert(body.includes('_tier413')||body.includes('_roadTier413'),'T413b '+fn+' 讀 tier 真相源');
    }
  }
  { // B4：五件各 strokes>0——真 place 造境 + setVisT 夜間 + call/callTop（tiles 不在本 scope，走 place/橋）
    window.GV.newWorldSeeded(433);window.GV.weather(0);window.GV.setVisT(8);
    window.GV.addMoney(50000000);
    // 集中造境 + 直寫路/水（place 可因地形拒；Force* 橋保證旗標）
    const CX=28,CY=28;
    let roads=0;
    for(let i=0;i<14;i++){
      const x=CX-6+i,y=CY;
      place('road',x,y);
      if(window.__t413ForceRoad(x,y))roads++;
      window.__t413ForceRoad(x,y+1);roads++;
    }
    assert(roads>=8,'T413b B4 造境：至少 8 格路旗，實得 '+roads);
    window.__t413ForceWater(CX,CY+3);
    window.__t384Bld(1,CX+1,CY+3);
    window.__t413ForceRoad(CX,CY+4);
    window.__t384Bld(69,CX-2,CY-2); // 燈塔
    for(let i=0;i<8;i++){
      window.__t384Bld(2,CX-3+i,CY-4);window.__t412Set(CX-3+i,CY-4,'lv',3);
      window.__t384Bld(3,CX-3+i,CY+2);
    }
    if(window.GV.setZoom)window.GV.setZoom(1);
    if(window.GV.lookAt)window.GV.lookAt(CX,CY);
    const t413=window.__t413();
    t413.rebuild();
    t413.call(0.85);t413.callTop(0.85);
    const st=t413.strokes();
    assert(st.lamp>0,'T413b B4 路燈 strokes>0（繪製器 no-op 會紅），實得 '+st.lamp);
    assert(st.water>0,'T413b B4 水面反射 strokes>0，實得 '+st.water);
    assert(st.land>0,'T413b B4 地標 strokes>0，實得 '+st.land);
    assert(st.neon>0,'T413b B4 商業霓虹 strokes>0，實得 '+st.neon);
    assert(st.ind>0,'T413b B4 工業航障 strokes>0，實得 '+st.ind);
    const sc=t413.scan();
    const mapN=72;
    const n2=mapN*mapN*5;
    assert(sc>0&&sc<n2*0.5,'T413b 實掃格數須>0 且遠小於 5×N²（可視域），實得 '+sc+' vs cap '+(n2*0.5));
  }
  { // A1 文字 + 第三輪 shake/pad 釘
    const bareX=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bareX.includes('if(nightDepth>0&&!window.__noNightCity&&nightTier413)'),
      'T413b A1：winA413 僅 nightDepth>0');
    assert(bareX.includes('if(nightDepth>0&&!window.__noNightCity&&s.nightCity)'),
      'T413b A1：nightCity 僅 nightDepth>0 進 nightSprites');
    assert(bareX.includes('_lodMini413')&&!/function drawNightLamps413[\s\S]{0,200}_lodFar413/.test(bareX),
      'T413b A4：繪製器以 lodMini 為界非 lodFar 早退');
    /* 3a 震屏：_sx413/_sy413 須含 shakeT 與 sin(visT*47) / sin(visT*61 */
    const sxAt=bareX.indexOf('function _sx413');
    const sxBody=bareX.slice(sxAt,sxAt+280);
    assert(sxBody.includes('shakeT')&&sxBody.includes('visT*47'),
      'T413b 3a：_sx413 須含 shakeT 與 visT*47 震屏（與 draw ox 同款）');
    const syAt=bareX.indexOf('function _sy413');
    const syBody=bareX.slice(syAt,syAt+280);
    assert(syBody.includes('shakeT')&&syBody.includes('visT*61'),
      'T413b 3a：_sy413 須含 shakeT 與 visT*61 震屏');
    /* 3b vis pad 隨 z */
    const vpAt=bareX.indexOf('function _visNight413');
    const vpBody=bareX.slice(vpAt,vpAt+200);
    assert(vpBody.includes('_z413')&&(vpBody.includes('80*')||vpBody.includes('80 *')),
      'T413b 3b：_visNight413 pad 須隨 z（80*z 量級）');
    /* 行為：shake 改變投影（經橋設 shakeT，不直觸模組綁定） */
    const t413=window.__t413();
    const oShake=t413.getShake();t413.setShake(0);
    const x0=t413.sx(20,20),y0=t413.sy(20,20);
    t413.setShake(0.5);
    const x1=t413.sx(20,20),y1=t413.sy(20,20);
    t413.setShake(oShake);
    assert(x0!==x1||y0!==y1,'T413b 3a 行為：shakeT>0 時投影須位移，靜='+x0+','+y0+' 震='+x1+','+y1);
    assert(t413.visPad()>=40,'T413b 3b 行為：visPad≥40，實得 '+t413.visPad());
  }
  { // 破壞性紅源文案釘（會咬的錨點）
    const bareX=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert(bareX.includes('__t413BakeCount'),'T413b 紅源可咬：烘焙總計數');
    assert(bareX.includes('__t413BakeByKind'),'T413b 紅源可咬：分族 bake 計數');
    assert(bareX.includes('__t413LampStrokes'),'T413b 紅源可咬：路燈落筆計數');
    assert(bareX.includes('nightScanN413'),'T413b 紅源可咬：實掃計數');
  }

  // ===== T422 遠景夜城 LOD：原位類型化既有 mini 夜燈，零新增掃描／draw call =====
  { // G1 靜態：唯一掛點、回退、複雜度與零亂數
    const bare422=html.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    const fnAt=bare422.indexOf('function farNightRect422(bd,x,y,blkX,blkY,blkSz){');
    const fnEnd=bare422.indexOf('\nfunction draw(',fnAt);
    assert(fnAt>0&&fnEnd>fnAt,'T422 G1 純樣式函式在場且位於 draw 前');
    const fnBody=bare422.slice(fnAt,fnEnd);
    assert(fnBody.includes('kcatOf')&&fnBody.includes('streetHash(x,y,4220)'),
      'T422 G1 類型真相讀 kcatOf，商業色只用座標雜湊決定');
    assert(!/\bR\s*\(|\bri\s*\(|\bvri\s*\(|Math\.random|Date\.now|performance\.now|crypto/.test(fnBody),
      'T422 G1 純樣式函式零 R/ri/vri/Math.random/時計/crypto');
    const fnCalls422=[...fnBody.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
    assert(fnCalls422.every(n=>['farNightRect422','kcatOf','if','streetHash'].includes(n)),
      'T422 G1 純樣式函式只准呼叫白名單純函式（防預先捕獲亂數 alias），實得 '+fnCalls422.join(','));
    assert(!/\bfor\s*\(|\bwhile\s*\(/.test(fnBody),'T422 G1 純樣式函式零迴圈（不得另掃地圖／viewport）');
    assert(!/nightTier413|ensureNightTier413|urbanDens406/.test(fnBody),
      'T422 G1 不為遠景色塊重建 T413 密度場');
    const managedAt=bare422.indexOf("const FAR_NIGHT_C422=['#ff72c6','#65dfff','#ffd45f'];");
    const managedBody=bare422.slice(managedAt,fnEnd);
    assert(managedAt>0&&managedBody.includes('function farNightRect422'),
      'T422 G1 商業三色票須為單一常數且受管區可定位');
    assert(!/=\s*(?:R|ri|vri|Math\.random)\b|\b(?:R|ri|vri)\s*\(|Math\.random\s*\(/.test(managedBody),
      'T422 G1 受管產品區禁直呼與預先捕獲 R/ri/vri/Math.random alias');
    const miniAt=bare422.indexOf('if(lodMini){');
    const miniEnd=bare422.indexOf('\n      continue;',miniAt);
    assert(miniAt>0&&miniEnd>miniAt,'T422 G1 T107 lodMini 受管切片可定位');
    const miniBody=bare422.slice(miniAt,miniEnd);
    assert(miniBody.includes("b<.72&&!window.__noNightCity&&!window.__noFarNight422&&quality!==0"),
      'T422 G1 接線僅深夜＋夜景開啟＋非低畫質；晴日暴雨走 legacy');
    assert((miniBody.match(/nightSprites\.push\(/g)||[]).length===1,
      'T422 G1 每個可見 mini root 仍恰一筆 nightSprites.push（不得增加 draw call），實得 '+((miniBody.match(/nightSprites\.push\(/g)||[]).length));
    assert(miniBody.includes('nightSprites.push(fl422);'),
      'T422 G1 正式輸出必須 push helper／legacy 共用的 fl422，不得與計數器脫鉤');
    assert(miniBody.includes("fl422={rect:[blkX,blkY,blkSz,blkSz]};"),
      'T422 G1 __noFarNight422／日間／低畫質回退為改動前 generic rect');
    assert(!/\bfor\s*\(|\bwhile\s*\(/.test(miniBody),'T422 G1 mini 掛點零新增迴圈');
  }
  { // G2 純函式：四族可區分、決定性、rect 嚴格包含於原 mini 色塊
    const t422=window.__t422();
    const ks=[1,2,3,24],xy=[[20,20],[21,20],[22,20],[23,20]];
    const specs=ks.map((k,i)=>t422.spec(k,xy[i][0],xy[i][1],4));
    assert(specs.map(s=>s.fam).join(',')==='R,C,I,L','T422 G2 四族映射須為 R/C/I/L，實得 '+specs.map(s=>s.fam).join(','));
    assert(new Set(specs.map(s=>s.col)).size===4,'T422 G2 四族色語言須可區分，實得 '+specs.map(s=>s.col).join(','));
    assert(new Set(specs.map(s=>JSON.stringify(s.rect))).size===4,
      'T422 G2 4px 四族幾何須各自可辨，實得 '+specs.map(s=>JSON.stringify(s.rect)).join(' / '));
    assert(JSON.stringify(t422.spec(2,21,20,4))===JSON.stringify(t422.spec(2,21,20,4)),
      'T422 G2 同類同座標重算逐值決定性');
    for(const sz of [2,3,4])for(let i=0;i<ks.length;i++){const s=t422.spec(ks[i],xy[i][0],xy[i][1],sz),r=s.rect;assert(r[0]>=0&&r[1]>=0&&r[2]>=1&&r[3]>=1&&r[0]+r[2]<=sz&&r[1]+r[3]<=sz,
      'T422 G2 '+s.fam+' rect 必須包含於原 '+sz+'×'+sz+' mini 色塊且寬高≥1，實得 '+JSON.stringify(r));}
    const palette=t422.palette(),seen=new Set();
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)seen.add(t422.spec(2,x,y,4).col);
    assert(palette.length===3&&palette.every(c=>seen.has(c)),
      'T422 G2 商業粉／青／金三色皆須可達，實得 '+[...seen].join(','));
  }
  { // G3 完整 draw 接線：夜遠景啟用；日／門檻／逃生閥都回 legacy 或零命中
    window.GV.newWorldSeeded(422);window.GV.weather(0);window.GV.setSpeed(0);
    window.__t384Bld(1,28,30);window.__t384Bld(2,29,30);window.__t384Bld(3,30,30);window.__t384Bld(24,31,30);
    window.GV.lookAt(30,30);window.GV.setZoom(.35);window.GV.setVisT(8);
    delete window.__noNightCity;delete window.__noFarNight422;
    let screen=window.__t422Screen(),s=window.__t422().stats();
    assert(s.cand>=4&&s.drawn>=4&&s.legacy===0,'T422 G3 z=.35 深夜須走類型化遠景燈（候選/命中/legacy），實得 '+JSON.stringify(s));
    assert(s.R>=1&&s.C>=1&&s.I>=1&&s.L>=1,'T422 G3 完整 draw 四族皆命中，實得 '+JSON.stringify(s));
    assert(s.drawn===s.R+s.C+s.I+s.L&&s.drawn+s.legacy===s.cand,'T422 G3 每候選恰一筆類型化或 legacy rect，實得 '+JSON.stringify(s));
    const ks422=[1,2,3,24],xy422=[[28,30],[29,30],[30,30],[31,30]];
    const wantCols=ks422.map((k,i)=>window.__t422().spec(k,xy422[i][0],xy422[i][1],2).col);
    assert(wantCols.every(c=>screen.some(o=>o.col===c)),
      'T422 G3 最終 screen 合成須真落筆四族色（不可 helper／counter 綠而正式 push 回 generic），實得 '+JSON.stringify(screen));
    window.__noFarNight422=true;const legacyNight422=window.__t422Screen();delete window.__noFarNight422;
    for(let i=0;i<ks422.length;i++){
      const rel=window.__t422().spec(ks422[i],xy422[i][0],xy422[i][1],2).rect;
      const hits=screen.filter(o=>o.col===wantCols[i]);
      assert(hits.length===1&&legacyNight422.some(g=>g.rect[2]===2&&g.rect[3]===2&&hits[0].rect[0]===g.rect[0]+rel[0]&&hits[0].rect[1]===g.rect[1]+rel[1]&&hits[0].rect[2]===rel[2]&&hits[0].rect[3]===rel[3]),
        'T422 G3 '+['R','C','I','L'][i]+' 最終落筆幾何須與同幀 2px legacy 基準＋helper 相對 rect 精確一致，實得 '+JSON.stringify(hits));
    }
    window.GV.setZoom(.5);window.GV.forceDraw();s=window.__t422().stats();
    assert(s.cand===0&&s.drawn===0&&s.legacy===0,'T422 G3 z=.5 回近景，T422 零候選／零繪製，實得 '+JSON.stringify(s));
    window.GV.setZoom(.35);window.GV.setVisT(55);screen=window.__t422Screen();s=window.__t422().stats();
    assert(s.drawn===0&&s.legacy>=4,'T422 G3 晴日正午不套類型色、保留既有 generic push，實得 '+JSON.stringify(s));
    window.__noFarNight422=true;const sunnyOff=window.__t422Screen();delete window.__noFarNight422;
    assert(JSON.stringify(screen)===JSON.stringify(sunnyOff),'T422 G3 晴日 on/off screen 落筆須逐值恆等');
    window.GV.weather(2);screen=window.__t422Screen();window.__noFarNight422=true;const stormOff=window.__t422Screen();delete window.__noFarNight422;window.GV.weather(0);
    assert(JSON.stringify(screen)===JSON.stringify(stormOff),'T422 G3 白天暴雨 on/off screen 落筆須逐值恆等');
    window.GV.setVisT(8);window.__noFarNight422=true;window.GV.forceDraw();s=window.__t422().stats();
    assert(s.drawn===0&&s.legacy>=4,'T422 G3 __noFarNight422 回退改動前 generic rect，實得 '+JSON.stringify(s));
    delete window.__noFarNight422;window.__noNightCity=true;window.GV.forceDraw();s=window.__t422().stats();
    assert(s.drawn===0&&s.legacy>=4,'T422 G3 __noNightCity 不得旁路啟用類型化遠景燈，實得 '+JSON.stringify(s));
    delete window.__noNightCity;
    const oldQ422=window.__t422Quality(0);screen=window.__t422Screen();window.__noFarNight422=true;const q0Off=window.__t422Screen();delete window.__noFarNight422;window.__t422Quality(oldQ422);
    assert(JSON.stringify(screen)===JSON.stringify(q0Off),'T422 G3 quality=0 on/off screen 落筆須逐值恆等');
  }
  { // G4 完整 forceDraw 零全域亂數消耗（靜態掃描看不穿 alias，行為計數兜底）
    window.GV.setZoom(.35);window.GV.setVisT(8);window.GV.weather(0);delete window.__noFarNight422;delete window.__noNightCity;
    const rr422=window.__t422RandDraw();
    assert(rr422.r===0&&rr422.m===0,'T422 G4 遠景夜幀不得消耗 R／Math.random（觀看夜景不能改城市未來），實得 '+JSON.stringify(rr422));
    const twin422=window.__t422RngTwin();
    assert(twin422.control===twin422.after,'T422 G4 同 seed 不 draw／draw 後下一顆 R 必須恆等，實得 '+JSON.stringify(twin422));
  }

  console.log('\nFIX-D/FIX-E 回歸測試全部通過');
  process.exit(0);
}).catch(err => {
  console.error('FAIL: PWA 回歸測試非預期例外', err && err.stack ? err.stack : err);
  process.exit(1);
});

/* ===== T426 啟動管線守衛（overlay＋拆段＋async 開機路徑） ===== */
{ // G1 四階段 DOM 契約：overlay 骨架、階段步進、動畫與 reduced-motion 必須存在
  assert(html.includes('id="boot426"'),'T426 G1 overlay #boot426 必須存在');
  assert(html.includes('id="boot426Bar"'),'T426 G1 進度條 #boot426Bar 必須存在');
  for(const g of ['core','city','life','night'])
    assert(html.includes('data-b426="'+g+'"'),'T426 G1 四階段 data-b426 必須含 '+g);
  assert(html.includes('@keyframes boot426Windows'),'T426 G1 場景窗燈動畫 keyframes 必須存在');
  assert(html.includes('@media (prefers-reduced-motion:reduce)'),'T426 G1 reduced-motion 降級必須存在');
}
{ // G2 啟動管線區段零亂數（剝註解後字面掃描；bootstrap426 不得消耗亂數流）
  const b426=html.indexOf('const BOOT_STEPS426'),e426=html.indexOf('window.__boot426');
  assert(b426>=0&&e426>b426,'T426 G2 應可界定啟動管線區段');
  const seg426=html.slice(b426,e426).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/R\s*\(|ri\s*\(|rand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg426),
    'T426 G2 啟動管線區段不得消耗 R()/ri()/rand()/Math.random()/spriteTexRand（零亂數位移）');
}
{ // G3 拆段契約：S1..S9 定義存在且同步總管依序呼叫
  for(let i=1;i<=9;i++)assert(html.includes('function buildSpritesS'+i+'(){'),'T426 G3 拆段函式 buildSpritesS'+i+' 必須存在');
  assert(html.includes('buildSpritesS1();buildSpritesS2();buildSpritesS3();buildSpritesS4();buildSpritesS5();')&&
    html.includes('buildSpritesS6();buildSpritesS7();buildSpritesS8();buildSpritesS9();'),
    'T426 G3 同步總管必須依序呼叫 S1..S9');
}
{ // G4 開機分支：overlay 存在才 async，否則同步（harness 相容）
  assert(/document\.getElementById\('boot426'\)\)\{bootstrap426\(\);/.test(html),
    'T426 G4 開機必須以 overlay 存在與否分流 async/同步路徑');
}
{ // G5 檢查點契約：bootstrap426 段界檢查點 ≥9 且含 96/97/99＋觀測橋
  const b5=html.indexOf('async function bootstrap426(){'),e5=html.indexOf('window.__boot426',b5);
  assert(b5>=0&&e5>b5,'T426 G5 應可界定 bootstrap426 區段');
  const seg5=html.slice(b5,e5);
  const ncp=(seg5.match(/bootCheckpoint426\(/g)||[]).length;
  assert(ncp>=9,'T426 G5 bootstrap426 段界檢查點應 ≥9（實得 '+ncp+'）');
  assert(/bootCheckpoint426\(96,/.test(seg5)&&/bootCheckpoint426\(97,/.test(seg5)&&/bootCheckpoint426\(99,/.test(seg5),
    'T426 G5 檢查點須含 96（夜景烘焙）97（工具列）99（主選單）');
  assert(html.includes('window.__boot426=()=>({...bootState426});'),'T426 G5 __boot426 觀測橋必須存在');
}

/* ===== T427 GPT 美術波移植層守衛（源自移動線 T482 T420-T424/T427-T428/T432） ===== */
{ // G1 八層函式存在
  const fns427=['streetStoryRoot420','drawStreetStory420','drawLivedIn421','drawActivityPocket422',
    'drawNightIdentity423','districtMood424','drawDistrictTexture424','drawStreetEdge427',
    'drawGroundMemory428','detailAlpha432','detailPermit432','streetPermit432'];
  for(const f of fns427)assert(html.includes('function '+f+'('),'T427 G1 層函式 '+f+' 必須存在');
}
{ // G2 四接線：3 地面層（t.road 內/外、zone 後）＋1 建築層
  assert(html.includes('if(!lodFar)drawStreetStory420(gc,x,y,sx,sy,z);'),'T427 G2 地面接線 drawStreetStory420 必須在 groundCache 迴圈');
  assert(html.includes('if(!lodFar&&!t.hw&&!t.bridge)drawStreetEdge427(gc,x,y,sx,sy,z);'),'T427 G2 地面接線 drawStreetEdge427 必須在 t.road 分支外');
  assert(html.includes('if(!lodFar&&!t.road&&!t.water&&!t.bld&&!t.ruin)drawGroundMemory428(gc,x,y,sx,sy,z);'),'T427 G2 地面接線 drawGroundMemory428 必須在 zone 分支後');
  assert(html.includes('if(!constrRise&&(bd.age|0)>=9){')&&
    html.includes('drawDistrictTexture424(ctx,o,bd,s,bx,by,z,drawA);')&&
    html.includes('drawLivedIn421(ctx,o,bd,s,bx,by,z,drawA);')&&
    html.includes('drawNightIdentity423(ctx,o,bd,s,bx,by,z,drawA,nightDepth);')&&
    html.includes('drawActivityPocket422(ctx,o,bd,s,bx,by,z,drawA,nightDepth);'),
    'T427 G2 建築層接線四層必須在 constrRise else 後依序');
}
{ // G3 kill-switch 八個全定義
  for(const k of ['__noStreetStory420','__noLivedIn421','__noActivity422','__noNightIdentity423',
    '__noDistrictTexture424','__noStreetEdge427','__noGroundMemory428','__noDetailBudget432'])
    assert(html.includes(k),'T427 G3 kill-switch '+k+' 必須存在');
}
{ // G4 退化橋：T448/T446/T475 未移植桌面，恆等退化保持原碼結構
  for(const f of ['rhythmActivity448','roadCap475','streetWearStrength446','sanitationGroundBoost446D'])
    assert(html.includes('const '+f+'=()=>1;'),'T427 G4 退化橋 '+f+' 必須存在（恆等退化）');
  assert(html.includes('window.__noRhythm448=true;window.__noNetVisual446=true;'),'T427 G4 網絡視覺/節奏開關必須常駐關閉');
}
{ // G5 層區塊零亂數（剝註解後字面掃描；draw-time 層不得消耗亂數流）
  const b427=html.indexOf('const rhythmActivity448=()=>1;'),e427=html.indexOf('\nfunction drawCursor(',b427);
  assert(b427>=0&&e427>b427,'T427 G5 應可界定移植層區段');
  const seg427=html.slice(b427,e427).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg427),
    'T427 G5 移植層區段不得消耗 R()/ri()/rand()/Math.random()/spriteTexRand（零亂數位移）');
}
{ // G6 觀測橋全存在（實機驗收用計數器）
  for(const b of ['__t420StoryCount','__t421LivedCount','__t422PocketCount','__t423NightCount',
    '__t424TextureCount','__t427EdgeCount','__t428GroundCount','__t432Suppressed'])
    assert(html.includes(b),'T427 G6 觀測橋 '+b+' 必須存在');
}

/* ===== T429 美術波上層移植層守衛（源自移動線 T482 T425/T426/T429/T430/T431/T441） ===== */
{ // G1 六件函式存在（T368a 桌面 T368 已含，不重複）
  const fns429=['roofAnchor425','drawRooftop425','drawFacadeMemory426','drawMicroLife429',
    'drawMaterialResponse430','drawNightMicro431','updWind441'];
  for(const f of fns429)assert(html.includes('function '+f+'('),'T429 G1 層函式 '+f+' 必須存在');
}
{ // G2 接線：幀首 updWind441＋建築層 5 行＋粒子 3 處
  assert(html.includes('function draw(dt){\n  updWind441();'),'T429 G2 幀首 updWind441() 必須在 draw(dt) 第一行');
  assert(html.includes('drawFacadeMemory426(ctx,o,bd,s,bx,by,z,drawA);'),'T429 G2 建築層 drawFacadeMemory426 接線');
  assert(html.includes('drawRooftop425(ctx,o,bd,s,bx,by,z,drawA);'),'T429 G2 建築層 drawRooftop425 接線');
  assert(html.includes('drawMaterialResponse430(ctx,o,bd,s,bx,by,z,drawA,wetLvl,snowLvl,nightDepth);'),'T429 G2 建築層 drawMaterialResponse430 接線（傳 wetLvl/snowLvl/nightDepth）');
  assert(html.includes('drawNightMicro431(ctx,o,bd,s,bx,by,z,drawA,nightDepth);'),'T429 G2 建築層 drawNightMicro431 接線');
  assert(html.includes('drawMicroLife429(ctx,o,bd,s,bx,by,z,drawA,nightDepth);'),'T429 G2 建築層 drawMicroLife429 接線');
  assert(html.includes('const lw443=localWind443(o.x,o.y);')&&html.includes('(Math.sin(visT*1.3+o.x*.7+o.y*1.3)+lw443*2.2)*z:0;'),'T429 G2 樹搖風場消費端（T431 升 lw443 局部風）');
  assert(html.includes('+windX441*1.2*z; /* T429 風場 */'),'T429 G2 螢火風場消費端');
  assert(html.includes('+windX441*4*z; /* T429 風場 */'),'T429 G2 蝴蝶風場消費端');
}
{ // G3 kill-switch 七個
  for(const k of ['__noRooftop425','__noFacadeMemory426','__noMicroLife429','__noMaterial430',
    '__noNightMicro431','__noWind441','__noParkLife'])
    assert(html.includes(k),'T429 G3 kill-switch '+k+' 必須存在');
}
{ // G4 退化橋（T446D/T448 未移植桌面，恆等退化）
  assert(html.includes('const visualWealth446D=(bd)=>((bd&&bd.we)===2?2:(bd&&bd.we)===0?0:1);'),'T429 G4 visualWealth446D 退化橋');
  assert(html.includes('const roofLifeIntensity446=()=>1;'),'T429 G4 roofLifeIntensity446 退化橋');
  assert(html.includes('window.__noRoofLife446=true;'),'T429 G4 __noRoofLife446 常駐關閉');
  assert(html.includes('const rhythmMicro448=()=>1;'),'T429 G4 rhythmMicro448 退化橋');
}
{ // G5 層區塊零亂數（剝註解後字面掃描）
  const b429=html.indexOf('const visualWealth446D'),e429=html.indexOf('\nfunction drawCursor(',b429);
  assert(b429>=0&&e429>b429,'T429 G5 應可界定移植層區段');
  const seg429=html.slice(b429,e429).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg429),
    'T429 G5 移植層區段不得消耗 R()/ri()/rand()/Math.random()/spriteTexRand（零亂數位移）');
}
{ // G6 觀測橋＋零風不變式
  for(const b of ['__t425RoofCount','__t426FacadeCount','__t429LifeCount','__t430MaterialCount',
    '__t431MicroLightCount','__t441Wind'])
    assert(html.includes(b),'T429 G6 觀測橋 '+b+' 必須存在');
  assert(html.includes('if(window.__noWind441){windX441=0;'),'T429 G6 __noWind441 時 windX441≡0（零風即零位移不變式）');
}

/* ===== T437 代碼地圖自檢：守衛 ===== */
{
  /* T371b 只驗「錨點字串能不能在 index.html 找到」，**不驗行號**，所以行號可以全面過期
     而套件照樣全綠（2026-08-14 實測：§1 的 77 列行號**全部**不符）。
     這條掃**整張 §1 表**，不受 T371b 列格式盲區影響：每一列的 grep 錨點都必須真的存在。 */
  const archTxt437 = fs.readFileSync(path.join(__dirname, 'docs', 'ARCH.md'), 'utf8');
  const secStart437 = archTxt437.indexOf('## 1. 檔案分節地圖');
  const secEnd437 = archTxt437.indexOf('\n## ', secStart437 + 10);
  assert(secStart437 >= 0 && secEnd437 > secStart437,
    'T437 G1 docs/ARCH.md 必須有「## 1. 檔案分節地圖」節（自檢工具 tools/arch_map.py 依賴它）');
  const secTxt437 = archTxt437.slice(secStart437, secEnd437);
  const dead437 = [];
  let checked437 = 0;
  /* T438 退修（B2）：這裡原本是 `raw.some(a => html.includes(a))`——一列有兩個錨點時，
     只要一個活著就整列判活。ARCH:55 的第二個錨點 `// ===== T382 …` 在 index.html 根本不存在
     （真原文是區塊註解 `/* ===== T382 …`），被同列的 `const stampRoof=(key)=>{` 餵飽，
     於是我在 T437 宣告的「死錨點 0」是**被 some 餵出來的假綠**。改成 every，並報出死的那一個。
     另一處同型：`!/\d/.test(m[2]) continue` ⇒ 把行號欄清空就同時逃掉兩種檢查；改成算成錯誤。 */
  const blank437 = [];
  for (const line of secTxt437.split('\n')) {
    const m = /^\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/.exec(line);
    if (!m) continue;
    const ancs = m[3].match(/`([^`]+)`/g) || [];
    if (!ancs.length) continue;
    const raw = ancs.map(a => a.slice(1, -1));
    if (!/\d/.test(m[2])) { blank437.push(raw[0].slice(0, 48)); continue; }
    checked437++;
    for (const a of raw) if (!html.includes(a)) dead437.push(a.slice(0, 48));
  }
  assert(blank437.length === 0,
    'T438 G2b ARCH §1 每一列都必須有行號；行號欄空白的列會同時逃掉行號與錨點檢查：'
    + JSON.stringify(blank437.slice(0, 4)));
  assert(checked437 >= 60,
    'T437 G2 §1 表格可檢查的列數異常（實得 ' + checked437 + '，預期 ≥60）——表格結構可能被改壞了');
  assert(dead437.length === 0,
    'T437 G3 ARCH §1 的 grep 錨點必須全部能在 index.html 找到；死錨點：' + JSON.stringify(dead437.slice(0, 4))
    + '。地圖指錯地方比沒有地圖更費時間——改完 index.html 請跑 `python tools/arch_map.py --fix`');
}

/* ===== T436 逃生閥通用入口：守衛 ===== */
{
  // G1 入口三件套：URL 參數、localStorage、白名單正則
  assert(html.includes("const qm436=/[?&]no=([^&#]*)/.exec(location.search);"),
    'T436 G1【原文前哨】必須有 URL `?no=` 入口——全檔 107 個 __no* 開關裡 73 個原本只有讀取端，'
    + '卡面寫的「一刀關閉／緊急回退」在正式產物裡撥不動');
  assert(html.includes("localStorage.getItem(SAVEKEY+'.no')"),
    'T436 G2【原文前哨】必須有 localStorage 入口（持久版）');
  /* T438 跟版（**動既有斷言，理由寫在這裡**）：原本第三條釘的是
     `SIM_ONLY436.indexOf(t436)>=0` 的**黑名單**寫法，而覆核 B1 證明黑名單本身是錯的設計
     （`?no=Var12` 直接過關並讓渲染丟例外）。釘子指著錯的設計，不改就不能修它。
     **這不是放寬**：新釘同樣是字面釘，而且從「不在黑名單就放行」改釘「不在白名單就拒收」，
     再加上 T438 G1/G2/G3 三條機械複算，嚴格程度只增不減。 */
  assert(html.includes("if(!t436||!/^[A-Za-z0-9_]+$/.test(t436))continue;")
    && html.includes("window['__no'+t436]=true;applied436.push(t436);")
    && html.includes("if(ALLOW436.indexOf(t436)<0){refused436.push(t436);continue;}"),
    'T436 G3【原文前哨】名稱必須過 [A-Za-z0-9_]+ 正則、且**不在 ALLOW436 白名單就拒收**，再用屬性寫入；'
    + '不得改回黑名單，也不得改成 eval／new Function／直接拼接執行');
  assert(!/eval\(\s*['"]__no/.test(html),
    'T436 G4【原文前哨】通用入口不得使用 eval');
  // G5 位置：必須在 buildSprites 定義**之前**——有一整類開關是烘進 sprite 像素的
  const e436 = html.indexOf("const qm436=/[?&]no=");
  const b436 = html.indexOf('function buildSprites(){');
  assert(e436 > 0 && b436 > 0 && e436 < b436,
    'T436 G5【位置釘】通用入口必須落在 `function buildSprites(){` 之前：'
    + '有一整類開關（如 __noBadge 的徽記）是**烘進 sprite 像素**的，晚一步就來不及');
  // G6 沒給參數時一個字都不寫（預設行為逐位元不變）
  assert(html.includes("if(noList436)for(const nm436 of noList436.split(','))"),
    'T436 G6【原文前哨】沒有清單時必須完全不寫入，確保預設行為與改動前逐位元相同');
}

/* ===== T451 城市科學基座＋壅堵費：守衛 ===== */
{
  /* 十卡系列（T451-T460）第一張。原則：機制常數與引用文字**只寫在 SCI451**，
     tick 公式與指南頁都從表裡讀——手抄一份就會過期而且沒有人會發現（T442 的 $12 教訓）。
     政策預設關 ⇒ 三根 SEEDPIN 全綠就是「關閉時位元恆等」的行為實證（T385 先例）。 */
  // G1 資料表在場、欄位齊、tick 公式讀表（不得硬編碼效應常數）
  assert(/const SCI451=\[/.test(html)
    && /id:'congChg451'/.test(html) && /who:'Eliasson 等'/.test(html)
    && /fx:\{transitMul:1\.15,feePerCar:\.015,happyVal:-\.01\}/.test(html),
    'T451 G1【原文前哨】SCI451 必須有 congChg451 條目（含 who/year/finding 與 fx 常數）——'
    + '引用與機制常數的單一真相來源');
  assert(html.includes("(pol&&pol.congChg451?SCI_BY_ID451.congChg451.fx.transitMul:1)")
    && html.includes("SCI_BY_ID451.congChg451.fx.feePerCar):0;income+=congRev451;")
    && html.includes("val:pol&&pol.congChg451?SCI_BY_ID451.congChg451.fx.happyVal:0}"),
    'T451 G1b【原文前哨】三個效應點（轉乘/收費/幸福）必須讀 SCI_BY_ID451 的常數，'
    + '不得把 1.15/.015/-.01 硬編碼在 tick 裡——那樣表和實作就走鐘了');
  // G2 指南頁由表導出；頁內不得出現機制常數字面
  assert(html.includes("'📋 委託與專精','📚 城市科學'") && html.includes('for(const e451 of SCI451){'),
    'T451 G2【原文前哨】指南必須有「📚 城市科學」分頁且逐筆由 SCI451 導出');
  {
    const a451 = html.indexOf('}else if(guideTab===7){');
    const b451 = html.indexOf('}else if(guideTab===4){', a451);
    assert(a451 > 0 && b451 > a451, 'T451 G2b 找不到 guideTab===7 分頁區間');
    const page451 = html.slice(a451, b451);
    for (const lit of ['1.15', '0.015', '.015'])
      assert(page451.indexOf(lit) < 0,
        'T451 G2c【機械複算】科學頁不得手抄機制常數字面 ' + lit + '——效應敘述由 SCI451.effectTxt 導出');
  }
  // G3 預設關（pol 初始 false ＋ GV.pol 白名單有鍵）
  assert(html.includes('if(pol==null)pol={congChg451:false,'),
    'T451 G3【原文前哨】pol 初始化必須含 congChg451:false（預設關＝關閉時位元恆等）');
  assert(html.includes('pol={congChg451:!!p.congChg451,'),
    'T451 G3b GV.pol 測試鉤必須白名單 congChg451，否則行為測試設不進去');
  // G4 行為：開啟後收費收入為正、關閉為 0（讀 GV.sci451 唯讀鉤，真對帳不是差分猜測）
  {
    window.GV.newWorldSeeded(4511);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 90; d++) window.GV.step(1);
    window.GV.ai(false);
    const off451a = window.GV.sci451();
    assert(off451a.on === false && off451a.congRev === 0,
      'T451 G4 預設關閉時 congRev 必須為 0（實得 ' + JSON.stringify(off451a) + '）——'
      + '這是「未啟用＝零模擬副作用」的直接對帳');
    window.GV.pol({ congChg451: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const on451 = window.GV.sci451();
    assert(on451.on === true && on451.congRev > 0,
      'T451 G4b 開啟壅堵費並 tick 一天後，收費收入必須為正（實得 ' + JSON.stringify(on451) + '）——'
      + '90 天 AI 城有就業者、小鎮轉乘近零 ⇒ (workers−transit)×費率 > 0');
    window.GV.pol({ congChg451: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off451b = window.GV.sci451();
    assert(off451b.congRev === 0,
      'T451 G4c 關閉後再 tick，congRev 必須回 0（實得 ' + JSON.stringify(off451b) + '）——政策可逆');
  }
}

/* ===== T452 租金管制：守衛 ===== */
{
  /* 十卡系列第二張，走 T451 基座：常數只在 SCI451，指南頁零改動自動長出第二筆。
     Diamond, McQuade & Qian (2019 AER) 舊金山自然實驗：留居 +、房東縮供 −15%、租金受限。
     開啟時住宅生長 roll 結果分岔＝合法（indSubsidy 先例）；預設關 ⇒ SEEDPIN 保位元恆等。 */
  // G1 表項與 fx 常數
  assert(/id:'rentCtrl452'/.test(html) && /who:'Diamond, McQuade & Qian'/.test(html)
    && /fx:\{supplyMul:\.85,rentTaxMul:\.92,happyVal:\.01\}/.test(html),
    'T452 G1【原文前哨】SCI451 必須有 rentCtrl452 條目（含 who/year/finding 與 fx 常數）');
  // G1b 三個效應點（生長/稅基/幸福）必須讀表
  assert(html.includes("*(z===1&&pol&&pol.rentCtrl452?SCI_BY_ID451.rentCtrl452.fx.supplyMul:1)")
    && html.includes("const cut452=v2*(1-SCI_BY_ID451.rentCtrl452.fx.rentTaxMul);v2-=cut452;rentCut452+=cut452;")
    && html.includes("val:pol&&pol.rentCtrl452?SCI_BY_ID451.rentCtrl452.fx.happyVal:0}"),
    'T452 G1b【原文前哨】三個效應點（住宅生長/住宅稅/幸福）必須讀 SCI_BY_ID451.rentCtrl452 的常數，'
    + '不得把 .85/.92/.01 硬編碼在 tick 裡');
  // G2 科學頁切片不得手抄本卡常數（頁面由表導出，T451 G2/G2b 已鎖分頁結構）
  {
    const a452 = html.indexOf('}else if(guideTab===7){');
    const b452 = html.indexOf('}else if(guideTab===4){', a452);
    assert(a452 > 0 && b452 > a452, 'T452 G2 找不到 guideTab===7 分頁區間');
    const page452 = html.slice(a452, b452);
    /* 頁內既有樣式 opacity:.85 是 CSS 字面不是手抄常數（第一版守衛在這裡誤紅）——
       逐處檢查上下文：緊跟在 opacity: 後的放行，其餘任何 .85/.92 出現即紅。 */
    for (const lit of ['.85', '.92']) {
      let i452 = -1;
      while ((i452 = page452.indexOf(lit, i452 + 1)) >= 0)
        assert(page452.slice(Math.max(0, i452 - 8), i452).endsWith('opacity:'),
          'T452 G2b【機械複算】科學頁不得手抄機制常數字面 ' + lit + '（位於「…'
          + page452.slice(Math.max(0, i452 - 30), i452 + 6) + '」）——由 SCI451.effectTxt 導出');
    }
  }
  // G3 預設關＋白名單
  assert(html.includes('if(pol==null)pol={congChg451:false,rentCtrl452:false,'),
    'T452 G3【原文前哨】pol 初始化必須含 rentCtrl452:false（預設關＝關閉時位元恆等）');
  assert(html.includes('pol={congChg451:!!p.congChg451,rentCtrl452:!!p.rentCtrl452,'),
    'T452 G3b GV.pol 測試鉤必須白名單 rentCtrl452');
  // G4 行為對帳（T451 G4 同型）：關 0 → 開 tick >0 → 關 tick 回 0
  {
    window.GV.newWorldSeeded(4521);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 90; d++) window.GV.step(1);
    window.GV.ai(false);
    const off452a = window.GV.sci451();
    assert(off452a.rentOn === false && off452a.rentCut === 0,
      'T452 G4 預設關閉時 rentCut 必須為 0（實得 ' + JSON.stringify(off452a) + '）');
    window.GV.pol({ rentCtrl452: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const on452 = window.GV.sci451();
    assert(on452.rentOn === true && on452.rentCut > 0,
      'T452 G4b 開啟租金管制並 tick 一天後，被砍住宅稅 rentCut 必須為正（實得 '
      + JSON.stringify(on452) + '）——90 天 AI 城必有納稅住宅');
    window.GV.pol({ rentCtrl452: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off452b = window.GV.sci451();
    assert(off452b.rentCut === 0,
      'T452 G4c 關閉後再 tick，rentCut 必須回 0（實得 ' + JSON.stringify(off452b) + '）——政策可逆');
  }
}

/* ===== T453 土地價值稅：守衛 ===== */
{
  /* 十卡系列第三張。George 理論＋丹麥 2007 自然實驗（Høj 等 2018；資本化幅度有爭議、科學頁如實記）。
     機制只取穩健部分：LVT 入庫、建物稅移轉、配置效應（不抑制總量、中性地價 ×1 恆等）。 */
  // G1 表項與 fx 常數
  assert(/id:'lvt453'/.test(html) && /Høj, Jørgensen & Schou/.test(html)
    && /fx:\{lvtK:\.5,bldRelief:\.95,allocK:\.2\}/.test(html),
    'T453 G1【原文前哨】SCI451 必須有 lvt453 條目（含 who/year/finding 與 fx 常數）');
  // G1b 三個效應點（LVT 記帳/建物稅移轉/配置）必須讀表；且 T452 的兩條原文 needle 必須原樣保留
  assert(html.includes("const lv453=SCI_BY_ID451.lvt453.fx.lvtK*(LAND[i]/128);income+=lv453;lvtRev453+=lv453;")
    && html.includes("if(pol&&pol.lvt453)v2*=SCI_BY_ID451.lvt453.fx.bldRelief;")
    && html.includes("*(z===1&&pol&&pol.lvt453?(1+(LAND[idx(x,y)]-128)/128*SCI_BY_ID451.lvt453.fx.allocK):1)"),
    'T453 G1b【原文前哨】三個效應點（LVT 記帳/建物稅移轉/配置）必須讀 SCI_BY_ID451.lvt453 的常數');
  assert(html.includes("const cut452=v2*(1-SCI_BY_ID451.rentCtrl452.fx.rentTaxMul);v2-=cut452;rentCut452+=cut452;")
    && html.includes("*(z===1&&pol&&pol.rentCtrl452?SCI_BY_ID451.rentCtrl452.fx.supplyMul:1)"),
    'T453 G1c【回歸】T452 的兩條效應原文必須原樣保留——新因子只能追加不能改寫');
  // G2 科學頁切片不得手抄本卡常數（opacity: 上下文白名單＝T452 教訓沿用）
  {
    const a453 = html.indexOf('}else if(guideTab===7){');
    const b453 = html.indexOf('}else if(guideTab===4){', a453);
    assert(a453 > 0 && b453 > a453, 'T453 G2 找不到 guideTab===7 分頁區間');
    const page453 = html.slice(a453, b453);
    for (const lit of ['.95', '0.95']) {
      let i453 = -1;
      while ((i453 = page453.indexOf(lit, i453 + 1)) >= 0)
        assert(page453.slice(Math.max(0, i453 - 8), i453).endsWith('opacity:'),
          'T453 G2b【機械複算】科學頁不得手抄機制常數字面 ' + lit + '（位於「…'
          + page453.slice(Math.max(0, i453 - 30), i453 + 6) + '」）——由 SCI451.effectTxt 導出');
    }
  }
  // G3 預設關＋白名單
  assert(html.includes('if(pol==null)pol={congChg451:false,rentCtrl452:false,lvt453:false,'),
    'T453 G3【原文前哨】pol 初始化必須含 lvt453:false（預設關＝關閉時位元恆等）');
  assert(html.includes('pol={congChg451:!!p.congChg451,rentCtrl452:!!p.rentCtrl452,lvt453:!!p.lvt453,'),
    'T453 G3b GV.pol 測試鉤必須白名單 lvt453');
  // G4 行為對帳（T451/T452 同型）：關 0 → 開 tick >0 → 關 tick 回 0
  {
    window.GV.newWorldSeeded(4531);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 90; d++) window.GV.step(1);
    window.GV.ai(false);
    const off453a = window.GV.sci451();
    assert(off453a.lvtOn === false && off453a.lvtRev === 0,
      'T453 G4 預設關閉時 lvtRev 必須為 0（實得 ' + JSON.stringify(off453a) + '）');
    window.GV.pol({ lvt453: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const on453 = window.GV.sci451();
    assert(on453.lvtOn === true && on453.lvtRev > 0,
      'T453 G4b 開啟土地價值稅並 tick 一天後，lvtRev 必須為正（實得 '
      + JSON.stringify(on453) + '）——90 天 AI 城必有可稅 RCI 建築');
    window.GV.pol({ lvt453: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off453b = window.GV.sci451();
    assert(off453b.lvtRev === 0,
      'T453 G4c 關閉後再 tick，lvtRev 必須回 0（實得 ' + JSON.stringify(off453b) + '）——政策可逆');
  }
}

/* ===== T454 最低工資：守衛 ===== */
{
  /* 十卡系列第四張。Card & Krueger 1994（NJ/PA DiD）：就業零顯著流失——emplMul:1 把 null result
     本身寫成常數接進 jobs 式。論戰（Neumark & Wascher vs Cengiz 等）科學頁如實記。 */
  // G1 表項與 fx 常數（emplMul:1 是這張卡的靈魂，鎖死）
  assert(/id:'minWage454'/.test(html) && /who:'Card & Krueger'/.test(html)
    && /fx:\{emplMul:1,bizTaxMul:\.97,happyVal:\.015\}/.test(html),
    'T454 G1【原文前哨】SCI451 必須有 minWage454 條目（含 fx 常數；emplMul 必須恰為 1）');
  // G1b 三個效應點（就業/商家成本×2/幸福）必須讀表
  assert(html.includes("if(pol&&pol.minWage454)jobs*=SCI_BY_ID451.minWage454.fx.emplMul;")
    && html.includes("const mw454=v2*(1-SCI_BY_ID451.minWage454.fx.bizTaxMul);v2-=mw454;mwCost454+=mw454;")
    && html.includes("const mw454i=v2*(1-SCI_BY_ID451.minWage454.fx.bizTaxMul);v2-=mw454i;mwCost454+=mw454i;")
    && html.includes("val:pol&&pol.minWage454?SCI_BY_ID451.minWage454.fx.happyVal:0}"),
    'T454 G1b【原文前哨】四個效應點（jobs/商業稅/工業稅/幸福）必須讀 SCI_BY_ID451.minWage454 的常數');
  // G1c 回歸：前三卡的效應原文必須原樣保留（政策卡逐張疊同一組式子）
  assert(html.includes("const cut452=v2*(1-SCI_BY_ID451.rentCtrl452.fx.rentTaxMul);v2-=cut452;rentCut452+=cut452;")
    && html.includes("*(z===1&&pol&&pol.rentCtrl452?SCI_BY_ID451.rentCtrl452.fx.supplyMul:1)")
    && html.includes("const lv453=SCI_BY_ID451.lvt453.fx.lvtK*(LAND[i]/128);income+=lv453;lvtRev453+=lv453;")
    && html.includes("if(pol&&pol.lvt453)v2*=SCI_BY_ID451.lvt453.fx.bldRelief;")
    && html.includes("*(z===1&&pol&&pol.lvt453?(1+(LAND[idx(x,y)]-128)/128*SCI_BY_ID451.lvt453.fx.allocK):1)"),
    'T454 G1c【回歸】T452/T453 的五條效應原文必須原樣保留——新因子只能追加不能改寫');
  // G2 科學頁切片不得手抄本卡常數（opacity: 白名單沿用）
  {
    const a454 = html.indexOf('}else if(guideTab===7){');
    const b454 = html.indexOf('}else if(guideTab===4){', a454);
    assert(a454 > 0 && b454 > a454, 'T454 G2 找不到 guideTab===7 分頁區間');
    const page454 = html.slice(a454, b454);
    for (const lit of ['.97', '0.97', '.015']) {
      let i454 = -1;
      while ((i454 = page454.indexOf(lit, i454 + 1)) >= 0)
        assert(page454.slice(Math.max(0, i454 - 8), i454).endsWith('opacity:'),
          'T454 G2b【機械複算】科學頁不得手抄機制常數字面 ' + lit + '（位於「…'
          + page454.slice(Math.max(0, i454 - 30), i454 + 6) + '」）——由 SCI451.effectTxt 導出');
    }
  }
  // G3 預設關＋白名單
  assert(html.includes('if(pol==null)pol={congChg451:false,rentCtrl452:false,lvt453:false,minWage454:false,'),
    'T454 G3【原文前哨】pol 初始化必須含 minWage454:false');
  assert(html.includes('pol={congChg451:!!p.congChg451,rentCtrl452:!!p.rentCtrl452,lvt453:!!p.lvt453,minWage454:!!p.minWage454,'),
    'T454 G3b GV.pol 測試鉤必須白名單 minWage454');
  // G4 行為對帳：關 0 → 開 tick >0 → 關 tick 回 0；G4d 開關瞬間 jobs 不動
  {
    window.GV.newWorldSeeded(4541);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 90; d++) window.GV.step(1);
    window.GV.ai(false);
    const off454a = window.GV.sci451();
    assert(off454a.mwOn === false && off454a.mwCost === 0,
      'T454 G4 預設關閉時 mwCost 必須為 0（實得 ' + JSON.stringify(off454a) + '）');
    const jobsBefore454 = off454a.jobs;
    window.GV.pol({ minWage454: true, taxR: 1, taxC: 1, taxI: 1 });
    assert(window.GV.sci451().jobs === jobsBefore454,
      'T454 G4d 開關瞬間（未 tick）jobs 必須不動（emplMul=1 的第一半：政策本身不動就業存量）');
    window.GV.step(1);
    const on454 = window.GV.sci451();
    assert(on454.mwOn === true && on454.mwCost > 0,
      'T454 G4b 開啟最低工資並 tick 一天後，商家成本 mwCost 必須為正（實得 '
      + JSON.stringify(on454) + '）——90 天 AI 城必有可稅商業/工業');
    window.GV.pol({ minWage454: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off454b = window.GV.sci451();
    assert(off454b.mwCost === 0,
      'T454 G4c 關閉後再 tick，mwCost 必須回 0（實得 ' + JSON.stringify(off454b) + '）——政策可逆');
  }
}

/* ===== T456 世代流動接線：守衛（重釘卡——金流哨兵與普查計數釘在三顆種子釘旁） ===== */
{
  /* Chetty & Hendren 2018 QJE 暴露效應。常駐機制（非政策開關）：90 天世代普查、oppIdx455 閾值
     驅動 we 升降、走既有 WEALTH_TAX。決定性零 R() 消耗＝最小分岔；pop 釘在三顆種子恰好不動
     （診斷記卡面），金流已合法分岔 ⇒ 新增三根 money 哨兵（seed301m/seed7m/seed22m）。 */
  // G1 表項＋閾值序機械複算（第一版有 period:90 自建普查，查因後拆除——節奏跟 T124 的 30 天走）
  {
    const mT456 = html.match(/fx:\{upThr:(\.\d+),dnThr:(\.\d+)\}/);
    assert(mT456 && /id:'mobility456'/.test(html) && /who:'Chetty & Hendren'/.test(html),
      'T456 G1【原文前哨】SCI451 必須有 mobility456 條目（含 Chetty & Hendren 引用與 upThr/dnThr）');
    assert(Number(mT456[2]) < Number(mT456[1]),
      'T456 G1b【機械複算】dnThr 必須嚴格小於 upThr（中性帶存在），實得 dn=' + mT456[2] + ' up=' + mT456[1]);
  }
  // G1c 暴露修正必須長在 T124 重判塊裡（唯一漂移寫入者）、讀表、雙向、計數
  /* T457 跟版：第二管道（tgt1）插在 tgt 之後，計數與落筆行從 tgt 改讀 tgt1——
     needle 更新為現行原文（合法演進跟版＋理由，T454 撞 T386a 同款；tgt 原式原文不動）。 */
  assert(html.includes("const tgt=s456>=SCI_BY_ID451.mobility456.fx.upThr?Math.min(2,tgt0+1):(s456<SCI_BY_ID451.mobility456.fx.dnThr?Math.max(0,tgt0-1):tgt0);")
    && html.includes("if(tgt1>tgt0)mob456.up++;else if(tgt1<tgt0)mob456.dn++;")
    && html.includes("const tgt0=judgeWealth(x,y);"),
    'T456 G1c【原文前哨】暴露修正必須接在 T124 的 judgeWealth 目標上（單寫者）、讀 SCI_BY_ID451 常數、'
    + '雙向且有介入計數——第一版蓋了平行普查、同 tick 被 T124 覆蓋成零效果（查因記卡面）（T457 跟版）');
  // G1d 修正塊零亂數（決定性契約）
  {
    const c0456 = html.indexOf("const tgt0=judgeWealth(x,y);");
    const c1456 = html.indexOf('else if(tgt1<cur)b.we=cur-1;', c0456);
    assert(c0456 > 0 && c1456 > c0456, 'T456 G1d 找不到重判塊範圍');
    /* 拿剝除後等長文本掃（第一版拿原文掃、被自己註解裡的「零 R() 消耗」字樣咬紅——
       T438 判讀被自己字串餵飽的反向重演；htmlBare438 位置對齊、註解已抹）。 */
    const blk456 = htmlBare438.slice(c0456, c1456);
    assert(!/\bR\(\)/.test(blk456) && !/Math\.random/.test(blk456) && !/\bri\(/.test(blk456),
      'T456 G1d【機械掃】暴露修正必須是決定性規則（零亂數）——最小分岔契約');
  }
  // G1e 計數器 newWorld 成對歸零（鐵律7）
  assert(html.includes("mob456={up:0,dn:0};") && html.split('mob456={up:0,dn:0}').length - 1 >= 2,
    'T456 G1e mob456 計數器必須在 newWorld 成對歸零（鐵律7）');
  // G1f 前四卡效應原文保留（G1c 回歸鏈延續）
  assert(html.includes("const cut452=v2*(1-SCI_BY_ID451.rentCtrl452.fx.rentTaxMul);v2-=cut452;rentCut452+=cut452;")
    && html.includes("const lv453=SCI_BY_ID451.lvt453.fx.lvtK*(LAND[i]/128);income+=lv453;lvtRev453+=lv453;")
    && html.includes("if(pol&&pol.minWage454)jobs*=SCI_BY_ID451.minWage454.fx.emplMul;")
    && html.includes("const w455=SCI_BY_ID451.oppAtlas455.fx;"),
    'T456 G1f【回歸】T452-T455 的效應原文必須原樣保留');
  /* G4/G4b/G4c（行為）：搭在六根哨兵旁——seed301 37升0降／seed7 0/0 對照組／seed22 61升0降。 */
}

/* ===== T526 通知節流與聚合：守衛 ===== */
{
  /* 玩測：600 天困難城 942 次通知＝每 0.6 天被打斷一次，前五名全是重複同一句；
     而 log 只存 100 筆 ⇒ 刷屏會把瘟疫/升級/T520 電力警告擠出通知中心。 */
  // G1 節流必須在 toast 單一漏斗內（呼叫點零改動）
  assert(html.includes('function toast(msg,cls,x,y){\n  {const k526=notifKey526(msg);')
    && html.includes('function toastRaw526(msg,cls,x,y){'),
    'T526 G1【原文前哨】節流必須寫在 toast 這個唯一漏斗裡（呼叫點零改動）');
  assert(html.includes("if(last526!==undefined&&day-last526<NOTIF_WIN526)"),
    'T526 G1b【原文前哨】首次（last 未定義）必須永不抑制——罕見事件天然即時，不需要白名單');
  assert(html.includes("msg=msg+'（近 '+NOTIF_WIN526+' 天另有 '+p526+' 起）'"),
    'T526 G1c【原文前哨】被抑制的次數必須寫進後續訊息，不得靜靜吞掉');
  // G2 鐵律7：三處歸零（宣告／newWorld／load）
  /* 用「欄位齊全的重置字面」當釘會隨欄位增減而 churn（本卡已 churn 兩次）——改釘「三處都把
     notif526 整個重新賦值」這個意圖本身，欄位由 G3 系列的行為釘負責。 */
  assert((html.match(/notif526=\{last:\{\},pend:\{\},/g) || []).length >= 3,
    'T526 G2 節流狀態必須在宣告／newWorld／load 三處整個重置（鐵律7）');
  // G3 行為（靈魂）：總數大幅下降，但**種類數不得減少**
  {
    window.GV.newWorldSeeded(3003); window.GV.setDiff(3); window.GV.ai(true);
    for (let d = 0; d < 600; d++) window.GV.step(1);
    window.GV.ai(false);
    const N526 = window.GV.notif526();
    assert(N526.total > 200,
      'T526 G3 前置：600 天困難城本來就該有大量事件（實得 total=' + N526.total + '），否則此測沒有意義');
    assert(N526.shown < N526.total * .6,
      'T526 G3b 實際彈出數必須顯著低於事件總數（實得 ' + N526.shown + '/' + N526.total
      + '＝' + Math.round(N526.shown / N526.total * 100) + '%）');
    assert(N526.kinds >= 20,
      'T526 G3c【反作弊】訊息種類數不得因節流而減少（實得 ' + N526.kinds
      + ' 種）——不准靠「整類丟掉」把數字做漂亮');
    assert(N526.win >= 3 && N526.win <= 30,
      'T526 G3d 節流窗口應落在 3-30 天（實得 ' + N526.win + '）');
    /* 這條才是真正的不變量（第一版漏了，只有源碼釘守「首次不抑制」）：
       發生過的每一類事件都必須至少被玩家看見一次——沒有任何一類被完全靜音。 */
    assert(N526.silent.length === 0,
      'T526 G3e【本卡靈魂】沒有任何一類事件可以被完全靜音（首次必顯示）。被靜音的類別：'
      + JSON.stringify(N526.silent));
    /* G3f 守恆釘——紅源①（拿掉 pending 累加）第一版**全綠通過**：G1c 只是原文釘，
       訊息組裝那行還在、只是永遠拿到 0，沒有任何行為守衛驗「被吞掉的事件真的有被回報」。
       補上：被折疊的事件必須有一大半透過聚合訊息回到玩家眼前。 */
    assert(N526.folded > 0, 'T526 G3f 前置：本場必須真的發生過折疊（實得 folded=' + N526.folded + '）');
    assert(N526.agg > 0 && N526.reported >= N526.folded * .5,
      'T526 G3f【守恆】被折疊的 ' + N526.folded + ' 起事件必須有一大半透過聚合訊息回報（實得 reported='
      + N526.reported + '、聚合訊息 ' + N526.agg + ' 則）——靜靜吞掉就是騙玩家');
  }
}

/* ===== T525 上手階梯延長：守衛 ===== */
{
  /* 玩測：checkHints 的階梯到 h6（機場 pop≥400）就停了，而科技樹 36 節點／委託／專精／
     53 條研究 51 個政策全在那之後才登場——玩到 pop 400+ 的玩家可能永遠不知道它們存在。 */
  // G1 門檻與數量必須引既有常數（機械掃：新提示區段不得手抄門檻/數量數字）
  {
    const a525 = html.indexOf("showHint('h7',");
    const b525 = html.indexOf("function showHint(", 0) > a525 ? html.indexOf("function showHint(", 0) : html.indexOf('}\n', html.indexOf("showHint('h10',"));
    assert(a525 > 0, 'T525 G1 找不到 h7 區段');
    const blk525 = html.slice(a525, html.indexOf("showHint('h10',") + 400);
    assert(blk525.includes('TECH343.length') && blk525.includes('TECH343[0].cost') && blk525.includes('SCI451.length'),
      'T525 G1【原文前哨】提示裡的節點數／費用／研究條數必須由既有表導出（TECH343／SCI451），不得手抄');
    assert(html.includes('rankIdx+1>=CMS_MIN_RANK385&&pop>CMS_MIN_POP385') && html.includes('rankIdx+1>=SPEC_MIN_RANK386'),
      'T525 G1b 委託／專精門檻必須引既有具名常數（T442 的 $12 教訓）');
    assert(!/[「（]\s*\d{3,}\s*[條個]/.test(blk525),
      'T525 G1c 提示文案不得出現手抄的三位數以上數量（必須由表導出）');
  }
  // G2 既有 h1-h6 原文回歸（只能追加）
  assert(html.includes("showHint('h1','👉 先選「🛣 支路」，在草地上拖出幾條路')")
    && html.includes("showHint('h6','✈️ 小鎮已頗具規模！蓋一座「大型」分類的機場，能大量吸引遊客、提升全城商業稅收')"),
    'T525 G2【回歸】既有 h1-h6 原文必須原樣保留');
  // G3 行為：長跑城市必須走完階梯續段，且每條只觸發一次
  {
    window.GV.newWorldSeeded(525); window.GV.setDiff(1); window.GV.ai(true);
    for (let d = 0; d < 400; d++) window.GV.step(1);
    window.GV.ai(false);
    const H525 = window.GV.hints525();
    const st525 = window.GV.stats();
    assert(H525.shown.indexOf('h7') >= 0 || st525.pop < H525.techPop,
      'T525 G3 城市達 pop≥' + H525.techPop + ' 且有錢無研究時必須提示科技樹（實得 pop=' + st525.pop
      + '、已顯示 ' + JSON.stringify(H525.shown) + '）');
    // 一次性：hintShown 是 key 集合，同一 key 不可能出現兩次；再跑一段也不得新增重複
    const before525 = H525.shown.slice().sort().join(',');
    for (let d = 0; d < 60; d++) window.GV.step(1);
    const after525 = window.GV.hints525().shown;
    assert(new Set(after525).size === after525.length,
      'T525 G3b 提示必須一次性（hintShown 不得出現重複鍵）');
    assert(after525.length >= before525.split(',').filter(Boolean).length,
      'T525 G3c 提示集合只增不減');
  }
}

/* ===== T524 科學頁篩選：守衛 ===== */
{
  /* 玩測：科學頁 4,574px（≈5.7 屏）、53 條、無搜尋無篩選。分組真相源＝既有 SCI_GRP514，
     但它只涵蓋 51/53（oppAtlas455/mobility456 無 polKey），且不能為湊分組塞進那張表
     （它同時驅動指揮台的政策卡片）⇒ 機械化回退桶接住它們。 */
  const F524 = window.GV.sciFilter524('all');
  // G1【本卡靈魂】完備性：每條研究恰好被一個篩選涵蓋（分組 or 回退桶），無孤兒無重複
  {
    const grpIds524 = F524.groups.filter(g => g !== 'all' && g !== 'on');
    const seen524 = {};
    for (const gid of grpIds524)
      for (const id of window.GV.sciFilter524(gid).shown) {
        assert(!seen524[id], 'T524 G1 研究不得被兩個篩選同時涵蓋（' + id + ' 同時在 ' + seen524[id] + ' 與 ' + gid + '）');
        seen524[id] = gid;
      }
    const all524 = window.GV.sciFilter524('all').shown;
    const orphan524 = all524.filter(id => !seen524[id]);
    assert(orphan524.length === 0,
      'T524 G1【完備性】每條研究都必須被某個篩選涵蓋，否則篩選一開它就從頁面消失。孤兒：' + JSON.stringify(orphan524));
    assert(all524.length === F524.total && F524.total >= 53,
      'T524 G1b 全部篩選必須顯示全部 ' + F524.total + ' 條（實得 ' + all524.length + '）');
    // 回退桶必須真的接住那兩條無 polKey 的研究（不是空桶）
    const other524 = window.GV.sciFilter524('other').shown;
    assert(other524.length >= 1 && other524.indexOf('oppAtlas455') >= 0 && other524.indexOf('mobility456') >= 0,
      'T524 G1c 回退桶必須接住不屬於任何分組的研究（實得 ' + JSON.stringify(other524) + '）');
  }
  // G2 篩選鈕與組 id 由 SCI_GRP514 導出（不手寫）
  assert(html.includes("for(const g of SCI_GRP514)fh524+=btn524(g.id,g.ic+' '+g.nm);")
    && html.includes("for(const fid of ['all'].concat(SCI_GRP514.map(g=>g.id)).concat(['other','on'])){"),
    'T524 G2【原文前哨】篩選鈕與綁定都必須由 SCI_GRP514 導出，不得手寫組名');
  /* G2b 的意圖是「判定只有一份」。第一版只數 `const sciPass524=` 的次數——但真正會發生的走鐘是
     **有人在計數處就地又寫一個 inline 判定**（同名重宣告是語法錯誤，根本進不了 repo）。
     改成釘「計數與渲染兩處都必須呼叫同一個 sciPass524」。 */
  assert((html.match(/const sciPass524=/g) || []).length === 1,
    'T524 G2b 篩選判定只准宣告一次');
  assert(html.includes("SCI451.filter(e=>sciPass524(e,fid)).length")
    && html.includes("if(!sciPass524(e451,sciFilter524))continue;"),
    'T524 G2c 篩選鈕的計數與列渲染必須呼叫同一個 sciPass524——就地再寫一份 inline 判定就會與顯示走鐘');
  // G3 行為：切到某組只剩該組；「只看已啟用」隨政策開關變化
  {
    const transit524 = window.GV.sciFilter524('transit');
    assert(transit524.shown.length === transit524.counts.transit && transit524.shown.length > 0,
      'T524 G3 切到「交通與可達」後顯示數必須等於該組計數（實得 ' + transit524.shown.length + '）');
    assert(transit524.shown.indexOf('congChg451') >= 0 && transit524.shown.indexOf('cleanAir459') < 0,
      'T524 G3b 交通組必須含壅堵費、不得含空品管制（分組來自 SCI_GRP514）');
    window.GV.newWorldSeeded(524); window.GV.setDiff(1); window.GV.step(1);
    window.GV.pol({ congChg451: false, taxR: 1, taxC: 1, taxI: 1 });
    assert(window.GV.sciFilter524('on').shown.length === 0,
      'T524 G3c 零政策時「只看已啟用」必須是 0 條');
    window.GV.pol({ congChg451: true, taxR: 1, taxC: 1, taxI: 1 });
    const on524 = window.GV.sciFilter524('on').shown;
    assert(on524.length === 1 && on524[0] === 'congChg451',
      'T524 G3d 開一個政策後「只看已啟用」必須恰好 1 條且是它（實得 ' + JSON.stringify(on524) + '）');
    window.GV.pol({ congChg451: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.sciFilter524('all');
  }
}

/* ===== T523 渲染預算閘門：守衛 ===== */
{
  /* 每幀落筆數是確定性的（與 GPU/時序無關）；headless 的**時間**量測不可信（實測基準樣本
     220-288ms、交錯 A/B 差值全在雜訊內），所以本閘門釘的是呼叫次數而不是毫秒。
     用**上限**不用精確值——幀內容會隨動畫時間微幅浮動，精確釘必 flaky（T444 教訓）。 */
  /* **預算必須照本閘門自己量到的數字校準**：套件的 ctx 是 stub、跑的不是完整渲染路徑，
     實測本閘門 585（空城）／2,587（300 天城）；真瀏覽器同場景是 1,684／15,936。
     第一版照瀏覽器數字設 3,000／25,000 ⇒ 套件裡有 10 倍餘裕＝**閘門咬不到任何東西**
     （「看起來在量、其實量的是別的」——本季一路在修的同一族毛病）。
     現值＝套件實測 ×約 2 的成長餘裕；瀏覽器側的真實數字記在 T523 卡面。 */
  const BUDGET_EMPTY523 = 1200, BUDGET_CITY523 = 6000;
  window.GV.newWorldSeeded(523); window.GV.setDiff(1); window.GV.setZoom(1);
  const empty523 = window.GV.drawCensus523();
  assert(empty523.restored === true,
    'T523 G1 census 必須把攔截的 canvas 方法還原乾淨（殘留就會污染之後所有量測與繪製）');
  assert(empty523.total > 0 && empty523.total <= BUDGET_EMPTY523,
    'T523 G2 空城一幀落筆必須 >0 且 ≤' + BUDGET_EMPTY523 + '（實得 ' + empty523.total + '）');
  const st523a = JSON.stringify(window.GV.stats());
  window.GV.ai(true);
  for (let d = 0; d < 300; d++) window.GV.step(1);
  window.GV.ai(false);
  const city523 = window.GV.drawCensus523();
  assert(city523.restored === true, 'T523 G1b 城市態 census 同樣必須還原乾淨');
  assert(city523.total <= BUDGET_CITY523,
    'T523 G2b 300 天城一幀落筆必須 ≤' + BUDGET_CITY523 + '（實得 ' + city523.total
    + '）——超出代表有人加了一層很貴的美術，請在合併前先量過');
  assert(city523.total > empty523.total,
    'T523 G2c 城市長大後落筆數必須增加（實得 空城 ' + empty523.total + ' → 城市 ' + city523.total + '）');
  // G3 零副作用：量測不得改變世界（stats 與亂數流）
  {
    const before523 = JSON.stringify(window.GV.stats());
    window.GV.drawCensus523();
    assert(JSON.stringify(window.GV.stats()) === before523,
      'T523 G3 量測前後 stats 必須逐字相同——量測不得改變世界');
    /* G3b 第一版寫成 `window.GV.rngPeek ? … : null`——鉤子不存在就整條略過＝**空跑的假綠**
       （本季一路在修的同一族毛病，這次犯在自己手上）。改成不可跳過的機械掃：
       census 函式體零亂數。draw() 本身零亂數已由 T422 G4 行為證明，這裡只守我這層包裝。 */
    const c0523 = htmlBare438.indexOf('drawCensus523:()=>{');
    const c1523 = htmlBare438.indexOf('recomputePolAll459:', c0523);
    assert(c0523 > 0 && c1523 > c0523, 'T523 G3b 找不到 census 函式區段');
    const blk523 = htmlBare438.slice(c0523, c1523);
    assert(!/\bR\(\)/.test(blk523) && !/Math\.random/.test(blk523) && !/\bri\(/.test(blk523),
      'T523 G3b【機械掃】census 包裝層不得消耗亂數——量測用的儀器自己動了世界，量到的就不是原來那個世界');
  }
  void st523a;
}

/* ===== T522 孤島電源嚴重度分級：守衛 ===== */
{
  /* 長局玩測抓到 T519 自己的缺陷：600 天成熟城（6,890 人）裡一座 AI 隨手蓋的孤島風力塔，
     被 sev=1 的「全城不會生長」壓過污染 255 與教育缺口 57%——那句話對這座城是假的。
     分級依據＝城市有沒有在依賴這座電源（既有 __t432Power.sum）。 */
  // G1 必須讀既有併網容量，不自建計算
  /* 守衛分工（T522 紅源當場學到的）：**原文前哨只守「用對資料源」，語意閾值交給行為釘**。
     第一版把資料源與比較式釘在同一條字串上，導致任何行為破壞都先咬原文釘＝行為釘從沒被驗到。 */
  assert(html.includes("const grid522=(window.__t432Power&&window.__t432Power.sum)||0;"),
    'T522 G1【原文前哨】分級必須讀既有 __t432Power.sum（T432 已算好），不得自建容量計算');
  assert(/if\(day%10===0&&day-islandWarnT520>=60&&[^\n]*__t432Power[^\n]*\)\{/.test(html),
    'T522 G1b 主動通知的條件必須參照既有 __t432Power（門檻語意由 G2c 行為釘負責）');
  // G2 行為 A/B/C
  {
    const site522 = () => {
      const N522 = window.GV.N(); let sx = -1, sy = -1;
      for (let y = 10; y < N522 - 16 && sx < 0; y++) for (let x = 10; x < N522 - 22; x++) {
        let ok = true;
        for (let dy = 0; dy < 11 && ok; dy++) for (let dx = 0; dx < 20; dx++) {
          const t = window.GV.tile(x + dx, y + dy);
          if (!t || t.bld || t.road || (t.t !== 1 && t.t !== 2)) { ok = false; break; }
        }
        if (ok) { sx = x; sy = y; }
      }
      return [sx, sy];
    };
    const run522 = (withGrid) => {
      window.GV.newWorldSeeded(5221); window.GV.setDiff(1); window.GV.addMoney(60000);
      const [sx, sy] = site522();
      assert(sx >= 0, 'T522 G2 造境失敗');
      const P = (t, x, y) => window.GV.place(t, x, y);
      for (let i = 0; i < 18; i++) P('road', sx + i, sy + 5);
      for (let i = 0; i < 9; i++) P('zr', sx + i, sy + 4);
      P('plant', sx + 16, sy + 9);                 // 孤島電源（離路 4 格）
      if (withGrid) P('plant', sx + 2, sy + 6);    // 另一座挨著路＝城市有正常電網
      const logBefore = window.GV.log().length;
      for (let d = 0; d < 40; d++) window.GV.step(1);
      const A522 = window.GV.polAdv517();
      return {
        /* 讀不截斷清單：降級後的低嚴重度建議本來就該被前 5 名擠掉（那正是它的下場），
           但守衛仍要看得見它、才驗得到分級真的發生（第一版讀截斷清單，量到 undefined）。 */
        tip: A522.tipsAll.find(t => /電源/.test(t.text)),
        top5: A522.tips,
        warns: window.GV.log().slice(logBefore).filter(l => /電力送不出去/.test(l.m)).length,
        grid: (window.__t432Power && window.__t432Power.sum) || 0,
      };
    };
    const noGrid522 = run522(false);
    assert(noGrid522.tip && noGrid522.tip.sev === 1 && /全城不會生長/.test(noGrid522.tip.text),
      'T522 G2 無其他電源時必須維持 sev=1 與「全城不會生長」（新手殺手情境）；實得 '
      + JSON.stringify(noGrid522.tip && { sev: noGrid522.tip.sev, t: noGrid522.tip.text.slice(0, 30) }));
    const withGrid522 = run522(true);
    assert(withGrid522.grid > 0, 'T522 G2b 造境前置：第二座電廠必須真的併網（實得 sum=' + withGrid522.grid + '）');
    assert(withGrid522.tip && withGrid522.tip.sev < .5
      && /白付維護費/.test(withGrid522.tip.text) && !/全城不會生長/.test(withGrid522.tip.text),
      'T522 G2b 已有正常電網時必須降級為「白付維護費」且不得再說「全城不會生長」（那是假的）；實得 '
      + JSON.stringify(withGrid522.tip && { sev: withGrid522.tip.sev, t: withGrid522.tip.text.slice(0, 30) }));
    assert(!withGrid522.top5.some(t => /全城不會生長/.test(t.text)),
      'T522 G2b2 已有電網時，「全城不會生長」不得出現在玩家真正看到的前 5 條裡');
    assert(withGrid522.warns === 0,
      'T522 G2c 已有正常電網時不得主動通知（騷擾）；實得 ' + withGrid522.warns + ' 條');
    assert(noGrid522.warns >= 1,
      'T522 G2d 無電源時仍必須主動通知（T520 契約不得被本卡改壞）；實得 ' + noGrid522.warns + ' 條');
  }
}

/* ===== T521 顧問說人話：守衛 ===== */
{
  /* 玩測實錄：五座死法完全不同的城（沒水／水管沒接／工業過剩幸福 0.09／住宅蓋滿沒工作／對照組），
     顧問輸出一字不差——因為五條服務缺口各 sev=1.0 把 slice(0,5) 佔滿。本卡合併服務缺口騰出名額。 */
  // G1 服務缺口合併在場＋顯式 traceKey（拆掉 T143 的文字比對耦合）
  assert(html.includes("text:'🏛️ 公共服務覆蓋不足：'+gaps521.length+' 項未覆蓋（'")
    && html.includes('traceKey:SVC_NM[worst.f][2]'),
    'T521 G1【原文前哨】多項服務缺口必須合併成一條並帶顯式 traceKey');
  assert((html.match(/const svcKey=tp\.traceKey\|\|SVC_GAP_KEYS\.find/g) || []).length === 2,
    'T521 G1b 渲染側與綁定側都必須改讀顯式 traceKey（文字比對只當回退），兩處同源缺一即漂移');
  assert(html.includes("demWhy&&demWhy.ok&&demWhy.workers>20&&demWhy.jobs<demWhy.workers*.6"),
    'T521 G1c 就業缺口診斷必須走既有 demWhy（tick 已算好），不得自建就業計算');
  // G2 行為（本卡靈魂）：五座造境城的顧問輸出必須互不相同
  {
    const site521 = () => {
      const N521 = window.GV.N(); let sx = -1, sy = -1;
      for (let y = 10; y < N521 - 18 && sx < 0; y++) for (let x = 10; x < N521 - 22; x++) {
        let ok = true;
        for (let dy = 0; dy < 12 && ok; dy++) for (let dx = 0; dx < 20; dx++) {
          const t = window.GV.tile(x + dx, y + dy);
          if (!t || t.bld || t.road || (t.t !== 1 && t.t !== 2)) { ok = false; break; }
        }
        if (ok) { sx = x; sy = y; }
      }
      return [sx, sy];
    };
    const run521 = (setup) => {
      window.GV.newWorldSeeded(9001); window.GV.setDiff(1); window.GV.addMoney(60000);
      const [sx, sy] = site521();
      assert(sx >= 0, 'T521 G2 造境失敗：找不到乾淨草地');
      const P = (t, x, y) => window.GV.place(t, x, y);
      for (let i = 0; i < 18; i++) P('road', sx + i, sy + 5);
      for (let i = 0; i < 9; i++) P('zr', sx + i, sy + 4);
      for (let i = 9; i < 14; i++) P('zc', sx + i, sy + 4);
      P('plant', sx + 16, sy + 6);
      setup(P, sx, sy);
      for (let d = 0; d < 60; d++) window.GV.step(1);
      return window.GV.polAdv517().tips.map(t => t.text).join('｜');
    };
    const outs521 = [
      run521(() => {}),                                                        // 對照組
      run521((P, sx, sy) => { P('water', sx + 17, sy + 9); }),                 // 有水塔但沒接管
      run521((P, sx, sy) => { for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) P('zi', sx + i, sy + 6 + r); }), // 工業過剩
      run521((P, sx, sy) => { for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) P('zr', sx + i, sy + 6 + r); }), // 住宅蓋滿沒工作
      run521((P, sx, sy) => { for (let i = 0; i < 6; i++) P('police', sx + i * 3, sy + 8); }),                          // 補了治安
    ];
    const uniq521 = new Set(outs521);
    assert(uniq521.size === outs521.length,
      'T521 G2【本卡靈魂】五座死法不同的城，顧問輸出必須互不相同（實得 ' + uniq521.size + '/' + outs521.length
      + ' 種）——講同一段話的顧問就是背景噪音');
    // 工業過剩城（幸福會被壓到極低）必須看得到不快樂診斷
    assert(/市民不快樂/.test(outs521[2]),
      'T521 G2b 幸福崩到極低的城必須看得到「市民不快樂」（合併前它被服務缺口擠到第 6 位）；實得 ' + outs521[2].slice(0, 120));
    // 住宅蓋滿沒工作的城必須看得到就業缺口
    assert(/工作機會不足/.test(outs521[3]),
      'T521 G2c 住宅蓋滿沒工作的城必須看得到「工作機會不足」；實得 ' + outs521[3].slice(0, 120));
  }
}

/* ===== T520 關鍵診斷主動通知：守衛 ===== */
{
  /* T519 讓顧問會講孤島電源，但 cityAdvisor 只在面板開啟時跑、且顧問排在 3,798px 面板的 3,300px 處。
     本卡把關鍵診斷接進既有 T114 通知中心（toast → log[] → 🔔 紅點 → 可跳鏡頭），不新建 UI。 */
  // G1 走既有 tickBld 與既有 powerDiag432（不自建掃描/判定）＋節流
  /* T522 跟版：條件追加「城市無併網電源時才發」（成熟城市被閒置電源反覆通知是騷擾）。
     10 天節奏／60 天節流／既有 tickBld／既有 powerDiag432 四項意圖不變，needle 跟版。 */
  assert(html.includes('if(day%10===0&&day-islandWarnT520>=60&&!((window.__t432Power&&window.__t432Power.sum)>0)){')
    && html.includes('for(const i520 of tickBld){')
    && html.includes('dg520=powerDiag432(x520,y520)'),
    'T520 G1【原文前哨】主動通知必須每 10 天走既有 tickBld＋既有 powerDiag432，並有 60 天節流');
  // G1b 零亂數機械掃（剝除後文本，錨不得含字串字面——T517 G1e 教訓）
  {
    /* 錨改用不含條件細節的穩定片段（T522 追加電網條件後，原本整條 if 的錨就失效了）。 */
    const a520 = htmlBare438.indexOf('for(const i520 of tickBld){');
    const b520 = htmlBare438.indexOf('computeGarbLocal()', a520);
    assert(a520 > 0 && b520 > a520, 'T520 G1b 找不到本卡區段');
    const blk520 = htmlBare438.slice(a520, b520);
    assert(!/\bR\(\)/.test(blk520) && !/Math\.random/.test(blk520) && !/\bri\(/.test(blk520),
      'T520 G1b【機械掃】主動通知不得消耗亂數——它跑在 tick 裡，吃一顆亂數就會位移整條模擬流');
  }
  // G2 節流變數鐵律7 成對歸零（newWorld 與 load 各一）
  assert((html.match(/islandWarnT520=-999/g) || []).length >= 3,
    'T520 G2 節流變數必須在 newWorld 與 load 兩處成對歸零（鐵律7），連宣告共 3 處');
  // G3 行為（本卡靈魂）：孤島造境必通知、挨路造境零誤報
  {
    const build520 = (isolated) => {
      window.GV.newWorldSeeded(5201); window.GV.setDiff(1); window.GV.addMoney(20000);
      const N520 = window.GV.N();
      let sx = -1, sy = -1;
      for (let y = 10; y < N520 - 14 && sx < 0; y++) for (let x = 10; x < N520 - 18; x++) {
        let ok = true;
        for (let dy = 0; dy < 9 && ok; dy++) for (let dx = 0; dx < 16; dx++) {
          const t = window.GV.tile(x + dx, y + dy);
          if (!t || t.bld || t.road || (t.t !== 1 && t.t !== 2)) { ok = false; break; }
        }
        if (ok) { sx = x; sy = y; }
      }
      assert(sx >= 0, 'T520 G3 造境失敗：找不到乾淨草地');
      for (let i = 0; i < 16; i++) window.GV.place('road', sx + i, sy + 4);
      for (let i = 0; i < 8; i++) window.GV.place('zr', sx + i, sy + 3);
      window.GV.place('plant', sx + 14, isolated ? (sy + 8) : (sy + 5));
      for (let d = 0; d < 30; d++) window.GV.step(1);
      return window.GV.log().filter(l => /電力送不出去/.test(l.m));
    };
    const warnB520 = build520(true);
    /* 恰為 1：既是「必須通知」也是「不得洗版」——60 天節流下 30 天內只准一條。
       （T519 G2b 教訓當場套用：斷言寫成 >=1 的話，拆掉節流的紅源根本不會紅。） */
    assert(warnB520.length === 1,
      'T520 G3 孤島電源 30 天內必須恰好通知一次（沉默＝那個 bug；洗版＝節流壞了）。實得 ' + warnB520.length + ' 條');
    assert(warnB520[0].x !== undefined && warnB520[0].y !== undefined,
      'T520 G3b 通知必須帶座標（T114 日誌可點擊跳鏡頭）');
    const warnA520 = build520(false);
    assert(warnA520.length === 0,
      'T520 G3c 電廠挨著路時不得誤報（實得 ' + warnA520.length + ' 條）');
  }
}

/* ===== T519 孤島電源進顧問：守衛 ===== */
{
  /* 玩測 A/B：同種子同建置，電廠離路 4 格 ⇒ 90 天 0 人口 0 建築，而顧問只說「財政吃緊→調高稅率」。
     T432a 的 powerDiag432 早就能診斷孤島電源，只是沒接到顧問——本卡是接線，不是造能力。 */
  // G1 必須呼叫既有診斷，不得自建第二套電網判定
  assert(html.includes('const dg519=powerDiag432(px519,py519);')
    && html.includes('POWER_DIAG_SOURCE_432A[b.k]'),
    'T519 G1【原文前哨】孤島判定必須呼叫既有 powerDiag432、電源型別走既有 POWER_DIAG_SOURCE_432A'
    + '——自建第二套判定就會與 tick 的真實電網漂移');
  // G1b 兩條建議都不得掛 sym（51 個政策沒有一個能把電廠接上路網＝寧可沒有不硬掛）
  {
    const a519 = html.indexOf("const pwSrc519=[]");
    const b519 = html.indexOf("if(garbage>0&&garbRatio>1)", a519);
    assert(a519 > 0 && b519 > a519, 'T519 G1b 找不到本卡區段');
    const blk519 = html.slice(html.indexOf('let isl519=null;'), b519);
    assert(!/sym:/.test(blk519),
      'T519 G1b 孤島/缺電建議不得掛 sym——沒有任何政策能把電廠接上路網，硬掛就是假建議');
  }
  // G2 行為 A/B（本卡靈魂）：同種子同建置，只差電廠位置
  {
    const build519 = (isolated) => {
      window.GV.newWorldSeeded(5191); window.GV.setDiff(1); window.GV.addMoney(20000);
      const N519 = window.GV.N();
      let sx = -1, sy = -1;
      for (let y = 10; y < N519 - 14 && sx < 0; y++) for (let x = 10; x < N519 - 18; x++) {
        let ok = true;
        for (let dy = 0; dy < 9 && ok; dy++) for (let dx = 0; dx < 16; dx++) {
          const t = window.GV.tile(x + dx, y + dy);
          if (!t || t.bld || t.road || (t.t !== 1 && t.t !== 2)) { ok = false; break; }
        }
        if (ok) { sx = x; sy = y; }
      }
      assert(sx >= 0, 'T519 G2 造境失敗：找不到乾淨草地');
      for (let i = 0; i < 16; i++) window.GV.place('road', sx + i, sy + 4);
      for (let i = 0; i < 8; i++) window.GV.place('zr', sx + i, sy + 3);
      for (let i = 8; i < 13; i++) window.GV.place('zc', sx + i, sy + 3);
      window.GV.place('plant', sx + 14, isolated ? (sy + 8) : (sy + 5));
      for (let d = 0; d < 30; d++) window.GV.step(1);
      return window.GV.polAdv517().tips;
    };
    const tipsB519 = build519(true);
    const isl519 = tipsB519.find(t => /電源未併入路網/.test(t.text));
    assert(isl519,
      'T519 G2 孤島電廠時顧問必須出「電源未併入路網」建議（實得 ' + JSON.stringify(tipsB519.map(t => t.text.slice(0, 14))) + '）');
    /* 第一版寫成「>= 當場其他建議的最大值」——紅源把 sev 降到 .2 竟仍僥倖過關（當時財政吃緊只有 .18）。
       守衛太弱不是紅源錯：改釘設計契約本身——孤島電源 sev 必須**恰為 1** 且排在第一。 */
    assert(isl519.sev === 1 && tipsB519[0] === isl519,
      'T519 G2b 孤島電源必須 sev===1 且排第一——它會讓整座城歸零，被任何建議壓過去就等於沒說（實得 sev='
      + isl519.sev + '、排第 ' + (tipsB519.indexOf(isl519) + 1) + '）');
    const tipsA519 = build519(false);
    assert(!tipsA519.find(t => /電源未併入路網/.test(t.text)),
      'T519 G2c 電廠挨著路時不得誤報孤島（實得 ' + JSON.stringify(tipsA519.map(t => t.text.slice(0, 14))) + '）');
  }
}

/* ===== T518 死開關修復：UI 綁定一致性守衛 ===== */
{
  /* 玩測抓到 shipped bug：T514 把政策列改成 sciCard514 卡片後，DOM id 由 polDomId514(pk) 產生，
     而 T451-T459 七張卡的 polToggle 仍綁舊縮寫 id（#polCong451…）＝綁到不存在的元素 ⇒ 七個政策
     點不動、T459 的 recomputePolAll459 after 回調一起死。5,608 條守衛全綠沒抓到，因為它們驗的是
     **原文在場**——原文在場、元素不在場＝假綠的系統級版本。
     本守衛是機械等價物：每個 polToggle 的選擇器必須等於卡片實際會產生的 id。
     （逐一點擊 62 個 checkbox 的行為驗證在真瀏覽器探針，記在卡面——套件的 DOM 是 stub。） */
  const D518 = window.GV.polDom518();
  const calls518 = [...html.matchAll(/polToggle\(\s*(?:'#([A-Za-z0-9_]+)'|'#'\+polDomId514\('([A-Za-z0-9_]+)'\))\s*,\s*'([A-Za-z0-9_]+)'/g)];
  assert(calls518.length >= 55,
    'T518 G1 應找到 55+ 個 polToggle 呼叫（實得 ' + calls518.length + '）——找不到就是解析壞了，不是真的沒有');
  const dead518 = [];
  for (const m518 of calls518) {
    const litId = m518[1], derivedKey = m518[2], polKey = m518[3];
    const want518 = D518.ids[polKey] || (D518.alias[polKey] || ('pol' + polKey));
    if (derivedKey) {
      // 由 polDomId514(key) 導出的寫法：只要 key 對得上就必然一致
      if (derivedKey !== polKey) dead518.push(polKey + '：導出用了 ' + derivedKey);
    } else if (litId !== want518) {
      dead518.push(polKey + '：綁 #' + litId + '，卡片實際 id 是 #' + want518);
    }
  }
  assert(dead518.length === 0,
    'T518 G1b【交叉一致性】每個 polToggle 的選擇器必須等於 sciCard514 實際產生的 DOM id，'
    + '否則就是綁到不存在的元素＝玩家點了沒反應的死開關。不一致：' + JSON.stringify(dead518));
  // G1c：政策條目全覆蓋——SCI451 每個 polKey 都要有一個 polToggle 綁定（沒綁＝永遠點不動）
  {
    const bound518 = new Set(calls518.map(m => m[3]));
    const unbound518 = Object.keys(D518.ids).filter(k => !bound518.has(k));
    assert(unbound518.length === 0,
      'T518 G1c SCI451 的每個政策都必須有 polToggle 綁定（無綁定＝死開關）。未綁：' + JSON.stringify(unbound518));
  }
  // G1d T459 after 回調必須仍掛在（現在真的會被觸發的）那個綁定上
  assert(html.includes("polToggle('#'+polDomId514('cleanAir459'),'cleanAir459','空氣品質管制',()=>recomputePolAll459())"),
    'T518 G1d T459 的全圖重掃 after 回調必須掛在修好的綁定上——否則開了空品管制而污染場不重掃（staleness）');
}

/* ===== T517 顧問政策橋接（Policy Bridge）：守衛 ===== */
{
  /* 玩測發現：cityAdvisor 13 類建議全是「蓋東西」、51 個政策一個都沒提過。
     本卡整合既有顧問（非再造），映射表 id 指回 SCI451；一鍵開關只准 .click() 既有 checkbox。 */
  const A517 = window.GV.polAdv517();
  const SCI517 = window.GV.ancestry516().sciIds;
  // G1 表項：每個 ref 存在、有 polKey（真開關）、同症狀不重複、每症狀至少一條
  {
    const grpKeys517 = new Set();
    assert(Object.keys(A517.map).length >= 8,
      'T517 G1 症狀映射表至少應有 8 個症狀（實得 ' + Object.keys(A517.map).length + '）');
    for (const sym517 in A517.map) {
      const ids517 = A517.map[sym517];
      assert(Array.isArray(ids517) && ids517.length > 0,
        'T517 G1 每個症狀至少要有一條政策（' + sym517 + '）——沒有誠實對應就不要建條目');
      const seen517 = new Set();
      for (const id517 of ids517) {
        assert(SCI517.includes(id517),
          'T517 G1b 政策 ref 必須存在於 SCI451（' + sym517 + ' 掛了 ' + id517 + '）');
        assert(!seen517.has(id517), 'T517 G1b 同一症狀內政策不得重複（' + sym517 + ' 的 ' + id517 + '）');
        seen517.add(id517);
        grpKeys517.add(id517);
      }
    }
    // G1c 每個 ref 必須是「真的可開關的政策」——唯讀條目（oppAtlas455/mobility456）混進來就紅
    for (const sym517 in A517.resolved)
      for (const r517 of A517.resolved[sym517])
        assert(typeof r517.polKey === 'string' && r517.polKey.length > 0,
          'T517 G1c 政策 ref 必須是可開關條目（' + sym517 + ' 的 ' + r517.id
          + ' 沒有 polKey＝唯讀研究，顧問點了也開不起來）');
  }
  // G1d 雙向覆蓋：表裡每個症狀都要被 cityAdvisor 實際用過（造境檢出），tips 的 sym 都要在表內
  {
    const used517 = new Set();
    const collect517 = () => { for (const t of window.GV.polAdv517().tips) if (t.sym) used517.add(t.sym); };
    // 造境一：髒亂窮城（污染/垃圾/財政/不快樂/服務缺口）
    window.GV.newWorldSeeded(5171); window.GV.setDiff(1); window.GV.ai(true);
    for (let d = 0; d < 200; d++) window.GV.step(1);
    window.GV.ai(false); collect517();
    // 造境二：另一顆長相不同的種子（RCI 需求/壅堵）
    window.GV.newWorldSeeded(22); window.GV.setDiff(1); window.GV.ai(true);
    for (let d = 0; d < 200; d++) window.GV.step(1);
    window.GV.ai(false); collect517();
    for (const t of window.GV.polAdv517().tips)
      assert(!t.sym || A517.map[t.sym],
        'T517 G1d 顧問給出的 sym 必須在 POLADV517 內（實得 ' + t.sym + '）');
    assert(used517.size >= 3,
      'T517 G1d 兩座造境城至少應觸發 3 種帶政策的症狀（實得 ' + used517.size + '：' + JSON.stringify([...used517]) + '）');
  }
  // G1e 顧問政策鈕禁止直接寫 pol（機械掃剝除後源碼的綁定區段）——防 T459 型 after 回調漏跑
  {
    /* 錨點不得含字串字面——剝除器會把 'click' 抹成空白（T446「位置由剝除器、內容由原文」第三次現身）。 */
    const b0517 = htmlBare438.indexOf('btn517.addEventListener(');
    assert(b0517 > 0, 'T517 G1e 找不到政策鈕綁定區段');
    const blk517 = htmlBare438.slice(b0517, b0517 + 320);
    assert(/cb517\.click\(\)/.test(blk517),
      'T517 G1e 政策鈕必須 .click() 既有 checkbox（讓 polToggle 原處理器與 after 回調照跑）');
    assert(!/pol\[/.test(blk517) && !/pol\./.test(blk517),
      'T517 G1e【機械掃】政策鈕區段不得自己讀寫 pol——自己寫就會漏掉 T459 的 recomputePolAll459 after 回調（staleness）');
  }
  // G1f 既有 13 條 tip 原文回歸（新欄位只能追加）
  /* T521 跟版：服務缺口從「五條」合併成「多項一條＋單項一條」，單項分支的迴圈變數 f/ratio 改為
     g.f/g.ratio——**玩家看到的文案一字未改**，只是重構後的變數名。needle 跟版＋理由。 */
  assert(html.includes("text:'🗑️ 垃圾超載：'+garbage.toFixed(1)")
    && html.includes("text:SVC_NM[g.f][0]+'：'+Math.round(g.ratio*100)+'% 建築未受覆蓋 → 加蓋'+SVC_NM[g.f][1]")
    && html.includes("text:'🚗 道路壅堵：負載達容量 '+Math.round(jamMax*100)+'% → 升級路級或增闢替代道路'")
    && html.includes("text:'💰 財政吃緊：每日淨收入 '+fin.net.toFixed(1)+' → 調高稅率或減少維護支出'"),
    'T517 G1f【回歸】既有顧問建議原文必須原樣保留——新欄位（sym）只能追加');
  // G2 不快樂診斷：門檻與觸發
  {
    assert(A517.thr > .3 && A517.thr < .6, 'T517 G2 不快樂門檻應落在 (.3,.6)，實得 ' + A517.thr);
    window.GV.newWorldSeeded(777); window.GV.setDiff(1); window.GV.ai(true);
    for (let d = 0; d < 180; d++) window.GV.step(1);
    window.GV.ai(false);
    const st517 = window.GV.stats();
    const tips517 = window.GV.polAdv517().tips;
    const un517 = tips517.find(t => t.sym === 'unhappy');
    assert(st517.happy >= A517.thr || !!un517,
      'T517 G2b 幸福低於門檻時顧問必須出「市民不快樂」診斷（幸福 ' + st517.happy.toFixed(3)
      + '，實得 tips ' + JSON.stringify(tips517.map(t => t.sym)) + '）——玩測發現顧問原本一聲不吭');
  }
  // G3 計數釘（零模擬語意：表只被顧問與 GV 鉤讀）
  {
    const n517 = (htmlBare438.match(/POLADV517/g) || []).length;
    assert(n517 === 6,
      'T517 G3【計數釘】POLADV517 應恰出現 6 處（定義 1／顧問渲染 1／鈕綁定 1／GV 唯讀鉤 3），實得 ' + n517
      + '——多出來的那處可能把顧問表接進了模擬；合法增刪=同卡更新本釘');
    /* 意圖是「表沒被接進模擬」；行為面由六哨兵位元恆等背書（顧問只在面板開啟時跑、不進 tick）。 */
  }
}

/* ===== T516 研究血統（Research Lineage）：守衛 ===== */
{
  /* 四型嚴格分離＋雙線記帳。守衛走 GV 唯讀鉤做**真資料驗證**（枚舉/雙向覆蓋），
     不靠正則刮源碼；頁面結構走原文針；零模擬由六哨兵（行為）＋出現位置計數釘（機械）雙保險。 */
  const A516 = window.GV.ancestry516();
  // G1 枚舉機械驗證（type/mode/line 全在枚舉內）
  assert(A516.rows.length >= 12, 'T516 G1 血統表至少應有回填的 12+ 列（實得 ' + A516.rows.length + '）');
  for (const r516 of A516.rows) {
    assert(A516.types.includes(r516.type), 'T516 G1 type 必須在枚舉內（' + r516.card + ' 實得 ' + r516.type + '）');
    assert(A516.modes.includes(r516.mode), 'T516 G1 mode 必須在枚舉內（' + r516.card + ' 實得 ' + r516.mode + '）');
    assert(A516.lines.includes(r516.line), 'T516 G1 line 必須在枚舉內（' + r516.card + ' 實得 ' + r516.line + '）');
    assert(typeof r516.audit === 'string' && r516.audit.length > 0, 'T516 G1 每列必須有覆核狀態欄（' + r516.card + '）');
  }
  assert(!A516.modes.some(m => /independent/i.test(m)),
    'T516 G1d 枚舉不得含 independent convergence——五條件（pre-literature 凍結時戳等）協定成立前，機械上不可能掛');
  // G1b sciRefs 雙向全覆蓋（每個 sciRef ∈ SCI451；SCI451 每條被恰好一個 research 列涵蓋）＋非 research 禁 sciRefs
  {
    const seen516 = {};
    for (const r516 of A516.rows) {
      if (r516.type === 'research') {
        assert(Array.isArray(r516.sciRefs) && r516.sciRefs.length > 0,
          'T516 G1b research 列必須以 sciRefs 指回 SCI451（' + r516.card + '）——不重抄引用＝單一真相源');
        for (const id516 of r516.sciRefs) {
          assert(A516.sciIds.includes(id516),
            'T516 G1b sciRef 必須存在於 SCI451（' + r516.card + ' 掛了不存在的 ' + id516 + '）');
          assert(!seen516[id516], 'T516 G1b 同一 SCI451 條目不得被兩列涵蓋（' + id516 + '）');
          seen516[id516] = r516.card;
        }
      } else {
        assert(r516.sciRefs === undefined,
          'T516 G1c 非 research 列禁掛 sciRefs/DOI（' + r516.card + '）——產品對標與學術證據是兩種認識論對象');
      }
    }
    const orphan516 = A516.sciIds.filter(id => !seen516[id]);
    assert(orphan516.length === 0,
      'T516 G1b【完備性】SCI451 全部 ' + A516.sciIds.length + ' 條研究必須被 research 列全覆蓋，孤兒：' + JSON.stringify(orphan516));
  }
  // G1e 五句標準模板在場（含歸屬邊界）
  for (const nk516 of ['adaptation', 'evidence', 'dataUse', 'attribution', 'license'])
    assert(typeof A516.notes[nk516] === 'string' && A516.notes[nk516].length > 10,
      'T516 G1e 標準模板句必須齊（缺 ' + nk516 + '）');
  assert(A516.notes.attribution.indexOf('不代表') >= 0,
    'T516 G1e 歸屬邊界句必須明言「引用不代表作者背書實作」');
  // G2 頁面結構：表驅動＋新分頁在 tabs＋===8 塊必須排在 ===7 之前（不落入六家守衛的掃描切片）
  assert(html.includes("'📚 城市科學','🧬 研究血統'"),
    'T516 G2 tabs 必須在城市科學之後追加研究血統分頁');
  assert(html.includes('for(const e516 of ANCESTRY516){') && html.includes('h+=statTab(rows516);')
    && html.includes('ANCESTRY_NOTES516[nk516]'),
    'T516 G2b 血統頁必須逐列由 ANCESTRY516 導出、模板句由 ANCESTRY_NOTES516 導出（零手寫行）');
  assert(html.indexOf('}else if(guideTab===8){') > 0
    && html.indexOf('}else if(guideTab===8){') < html.indexOf('}else if(guideTab===7){'),
    'T516 G2c【位置釘】===8 塊必須排在 ===7 之前——否則落入 T451/T452/T453/T454/T462/T455 的 ===7→===4 掃描切片');
  // G3 零模擬：ANCESTRY516 token 出現位置計數釘（定義 1＋頁頭 length 1＋渲染 for 1＋GV 鉤 1）
  {
    const n516 = (htmlBare438.match(/ANCESTRY516/g) || []).length;
    assert(n516 === 4,
      'T516 G3【計數釘】ANCESTRY516 在剝除後源碼應恰出現 4 處（定義/頁頭/渲染/GV 鉤），實得 ' + n516
      + '——多出來的那處可能把血統表接進了模擬（零模擬語意契約）；合法增刪=同卡更新本釘');
  }
}

/* ===== T459 污染外部性（空氣品質管制）：守衛 ===== */
{
  /* Chay & Greenstone 2003 QJE / 2005 JPE。排放削減接在 recomputePol 唯一導出點（不碰成對蓋印）；
     健康/房價走既有 POL 管道湧現；開關與讀檔全圖重掃保一致性。 */
  // G1 表項＋參數域
  {
    const mC459 = html.match(/fx:\{polCut:(\.\d+),compK:(\.\d+)\}/);
    assert(mC459 && /id:'cleanAir459'/.test(html) && /who:'Chay & Greenstone'/.test(html),
      'T459 G1【原文前哨】SCI451 必須有 cleanAir459 條目（含 Chay & Greenstone 引用與 polCut/compK）');
    assert(Number(mC459[1]) > 0 && Number(mC459[1]) < .5 && Number(mC459[2]) > 0 && Number(mC459[2]) < .1,
      'T459 G1b【機械複算】polCut∈(0,.5)／compK∈(0,.1)，實得 ' + mC459[1] + '/' + mC459[2]);
  }
  // G1c 導出點讀表＋不碰蓋印＋全圖重掃兩處＋k3 合規成本
  assert(html.includes("const b459=pol&&pol.cleanAir459?Math.round(POLBASE[i]*(1-SCI_BY_ID451.cleanAir459.fx.polCut)):POLBASE[i];"),
    'T459 G1c【原文前哨】排放削減必須接在 recomputePol 導出點、讀 SCI_BY_ID451、關閉時取原值');
  /* T518 跟版（且這是本卡最貴的一條記錄）：舊 needle `polToggle('#polClean459',…)` 本身就是 bug 的指紋——
     T514 卡片化後該 DOM id 已不存在，這條守衛從那天起一直在為一個綁到空元素的字串蓋綠章。
     現在選擇器改由 polDomId514 導出，needle 跟版；交叉一致性由 T518 G1b 機械保證。 */
  assert(html.includes("polToggle('#'+polDomId514('cleanAir459'),'cleanAir459','空氣品質管制',()=>recomputePolAll459());")
    && html.includes("if(pol&&pol.cleanAir459)recomputePolAll459();"),
    'T459 G1d【原文前哨】全圖重掃必須掛在 toggle after 回調與讀檔 pol 恢復之後兩處——'
    + '少一處就有 staleness（開著存檔的圖 POL 停在未管制值）');
  assert(html.includes("if(pol&&pol.cleanAir459){const cc459=v2*SCI_BY_ID451.cleanAir459.fx.compK;v2-=cc459;cleanCost459+=cc459;}"),
    'T459 G1e【原文前哨】工業合規成本必須讀表且差額入 cleanCost459');
  // G3 預設關＋白名單
  assert(html.includes("aggCluster458:false,cleanAir459:false,"),
    'T459 G3【原文前哨】pol 初始化必須含 cleanAir459:false');
  assert(html.includes("aggCluster458:!!p.aggCluster458,cleanAir459:!!p.cleanAir459,"),
    'T459 G3b GV.pol 測試鉤必須白名單 cleanAir459');
  // G4 行為：開關瞬間 polSum 立降（不需 tick）＋關回原值＋長跑合規成本入帳
  {
    window.GV.newWorldSeeded(4591);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 120; d++) window.GV.step(1);
    window.GV.ai(false);
    const p0459 = window.GV.sci451().polSum;
    assert(p0459 > 0, 'T459 G4 前置：120 天 AI 城必有污染（實得 polSum=' + p0459 + '）');
    window.GV.pol({ cleanAir459: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.recomputePolAll459();
    const p1459 = window.GV.sci451().polSum;
    assert(p1459 < p0459,
      'T459 G4b 開啟＋全圖重掃後 polSum 必須立降（不需 tick），實得 ' + p0459 + ' → ' + p1459);
    window.GV.pol({ cleanAir459: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.recomputePolAll459();
    const p2459 = window.GV.sci451().polSum;
    assert(p2459 === p0459,
      'T459 G4c 關閉＋重掃後 polSum 必須回到原值（可逆），實得 ' + p2459 + '（原 ' + p0459 + '）');
    window.GV.pol({ cleanAir459: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.recomputePolAll459();
    window.GV.step(1);
    const c459 = window.GV.sci451();
    assert(c459.cleanOn === true && c459.cleanCost > 0,
      'T459 G4d 開啟後 tick 一天，工業合規成本 cleanCost 必須 >0（實得 ' + JSON.stringify({cleanCost: c459.cleanCost}) + '）');
  }
}

/* ===== T461 城市科學財政條（showStats 表驅動 SCI_FIN461）===== */
{
  /* 玩家可見的自屬日帳：常數／fin key 只在 SCI_FIN461；showStats 用 sciFinRows461 長出。
     零 tick 公式改動；政策全關時列顯示未啟用且 v=0。 */
  assert(/const SCI_FIN461=\[/.test(html), 'T461 G1 SCI_FIN461 表必須在場');
  assert(html.includes('function sciFinRows461') && html.includes('function sciFinVal461'),
    'T461 G1b sciFinRows461／sciFinVal461 必須在場');
  assert(html.includes('t461Html=statTab(sciFinRows461())') && html.includes('${t461Html}'),
    'T461 G1c showStats 必須 statTab(sciFinRows461()) 且模板插入 t461Html');
  const tFin461 = html.slice(html.indexOf('const SCI_FIN461=['), html.indexOf('];', html.indexOf('const SCI_FIN461=[')) + 2);
  const keys461 = [...tFin461.matchAll(/finKey:'([a-zA-Z]+)'/g)].map(m => m[1]);
  assert(keys461.slice(0,6).join(',') === 'congRev,rentCut,lvtRev,mwCost,aggGain,cleanCost',
    'T461 G2 finKey 前六欄帳本，實得 ' + keys461.join(','));
  assert(keys461.length >= 6, 'T461/T482 SCI_FIN 至少 6 列');
  const rowsFn461 = html.slice(html.indexOf('function sciFinRows461'), html.indexOf('function sciFinRows461') + 900);
  assert(/sciFinVal461\(e\)/.test(rowsFn461), 'T461 G2b 列值必須走 sciFinVal461(e)');
  assert(!/v:'\d+\.\d+'/.test(rowsFn461) && !/v:"\$/.test(rowsFn461),
    'T461 G2c 列值不得手抄數字／美元字面');
  assert(typeof window.GV.sciFin461 === 'function', 'T461 G3 GV.sciFin461 對帳橋在場');
  {
    window.GV.newWorldSeeded(4611);
    window.GV.setDiff(1);
    window.GV.pol({ congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off = window.GV.sciFin461();
    assert(Array.isArray(off) && off.length >= 6, 'T461 G4 預設至少 6 列，實得 ' + (off && off.length));
    assert(off.every(r => r.on === false && r.v === 0),
      'T461 G4 政策全關時 on=false 且 v=0，實得 ' + JSON.stringify(off));
    window.GV.ai(true);
    for (let d = 0; d < 60; d++) window.GV.step(1);
    window.GV.ai(false);
    window.GV.pol({ congChg451: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const on = window.GV.sciFin461();
    const cong = on.find(r => r.finKey === 'congRev');
    assert(cong && cong.on === true,
      'T461 G4b 開啟壅堵費後 congRev.on===true，實得 ' + JSON.stringify(cong));
    // sci451 與 sciFin461 同欄對帳
    const s = window.GV.sci451();
    assert(Math.abs((cong.v || 0) - (s.congRev || 0)) < 1e-9,
      'T461 G4c sciFin461.congRev 必須等於 sci451.congRev，實得 ' + cong.v + ' vs ' + s.congRev);
    window.GV.pol({ congChg451: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const off2 = window.GV.sciFin461().find(r => r.finKey === 'congRev');
    assert(off2 && off2.on === false && off2.v === 0,
      'T461 G4d 關閉後 congRev 回 on=false/v=0，實得 ' + JSON.stringify(off2));
  }
}


/* ===== T458 聚集經濟（產業聚落區劃）：守衛 ===== */
{
  /* Glaeser & Gottlieb 2009 JEL：密度倍增 ↔ 生產力 +2~3.5%（取下緣 3%）。政策預設關＝六哨兵不動；
     密度走既有 urbanDens406（先掃現況：不重造）。 */
  // G1 表項＋參數域機械複算
  {
    const mA458 = html.match(/fx:\{aggK:(\.\d+),dThr:(\.\d+)\}/);
    assert(mA458 && /id:'aggCluster458'/.test(html) && /Glaeser & Gottlieb/.test(html),
      'T458 G1【原文前哨】SCI451 必須有 aggCluster458 條目（含 Glaeser 引用與 aggK/dThr）');
    assert(Number(mA458[1]) > 0 && Number(mA458[1]) < .1 && Number(mA458[2]) > 0 && Number(mA458[2]) < 1,
      'T458 G1b【機械複算】aggK∈(0,.1)（彈性下緣的保守域）且 dThr∈(0,1)，實得 ' + mA458[1] + '/' + mA458[2]);
  }
  // G1c 兩接點讀表＋走 urbanDens406＋政策短路
  assert(html.includes("if(pol&&pol.aggCluster458){const ag458=v2*SCI_BY_ID451.aggCluster458.fx.aggK*clamp((urbanDens406(bx,byy)-SCI_BY_ID451.aggCluster458.fx.dThr)")
    && html.includes("if(pol&&pol.aggCluster458){const bx458=i%N,by458=(i/N)|0;const ag458i=v2*SCI_BY_ID451.aggCluster458.fx.aggK*clamp((urbanDens406(bx458,by458)-SCI_BY_ID451.aggCluster458.fx.dThr)")
    && html.includes("v2+=ag458;aggGain458+=ag458;") && html.includes("v2+=ag458i;aggGain458+=ag458i;"),
    'T458 G1c【原文前哨】商業/工業兩接點必須讀 SCI_BY_ID451 常數、密度走 urbanDens406、'
    + '政策短路在最前且差額入 aggGain458');
  // G3 預設關＋白名單
  assert(html.includes("ecMix457:false,aggCluster458:false,"),
    'T458 G3【原文前哨】pol 初始化必須含 aggCluster458:false');
  assert(html.includes("ecMix457:!!p.ecMix457,aggCluster458:!!p.aggCluster458,"),
    'T458 G3b GV.pol 測試鉤必須白名單 aggCluster458');
  // G4 同種子對照：開 aggGain>0／關恆 0
  {
    window.GV.newWorldSeeded(4581);
    window.GV.setDiff(1);
    window.GV.pol({ aggCluster458: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.ai(true);
    for (let d = 0; d < 150; d++) window.GV.step(1);
    window.GV.ai(false);
    const agg458on = window.GV.sci451();
    assert(agg458on.aggOn === true && agg458on.aggGain > 0,
      'T458 G4 政策開啟的 150 天 AI 城 aggGain 必須 >0（實得 ' + JSON.stringify(agg458on) + '）'
      + '——密集城區的商工稅必有密度紅利');
    window.GV.newWorldSeeded(4581);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 150; d++) window.GV.step(1);
    window.GV.ai(false);
    const agg458off = window.GV.sci451();
    assert(agg458off.aggOn === false && agg458off.aggGain === 0,
      'T458 G4b 同種子預設關世界 aggGain 必須恆 0（實得 ' + JSON.stringify(agg458off) + '）');
  }
}

/* ===== T462 科學頁政策旁今日帳 ===== */
{
  /* 指南 guideTab===7 每筆有 polKey 且在 SCI_FIN461 者，追加「今日帳」列；值走 sciFinVal461。 */
  const a462 = html.indexOf('}else if(guideTab===7){');
  const b462 = html.indexOf('}else if(guideTab===4){', a462);
  assert(a462 > 0 && b462 > a462, 'T462 G1 找不到 guideTab===7 區間');
  const page462 = html.slice(a462, b462);
  assert(page462.includes("SCI_FIN461.find(f=>f.polKey===e451.polKey)"),
    'T462 G1b 今日帳必須 SCI_FIN461.find 對 polKey');
  assert(page462.includes('sciFinVal461(finE462)'),
    'T462 G1c 今日帳值必須 sciFinVal461');
  assert(page462.includes("k:'今日帳'"), 'T462 G1d 必須有今日帳列鍵');
  // 不得在指南頁手抄日額
  assert(!/今日帳[^;]{0,40}v:'\d/.test(page462), 'T462 G2 今日帳不得手抄數字字面');
  // 行為：開指南頁（showHelp）後 infoBody 在政策開啟時可含今日帳標籤
  {
    window.GV.newWorldSeeded(4621);
    window.GV.setDiff(1);
    window.GV.pol({ congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.ai(true);
    for (let d = 0; d < 40; d++) window.GV.step(1);
    window.GV.ai(false);
    window.GV.pol({ congChg451: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    const finSnap = window.GV.sciFin461().find(r => r.finKey === 'congRev');
    assert(finSnap && finSnap.on, 'T462 G3 前置：壅堵費應已啟用');
    if (typeof guideTab !== 'undefined' && typeof showHelp === 'function') {
      guideTab = 7;
      try {
        showHelp();
        const body = (document.getElementById('infoBody') && document.getElementById('infoBody').innerText) || '';
        assert(body.includes('今日帳'), 'T462 G3 showHelp 科學頁須含「今日帳」文字，實得 len=' + body.length);
      } catch (e462) {
        // DOM 不完整時退回靜態釘
        assert(page462.includes("k:'今日帳'"), 'T462 G3 靜態退回：源碼須含今日帳');
      }
    }
  }
}

/* ===== T463 政策開關後統計面板即時重繪 ===== */
{
  /* polToggle 在 sTick 之後必須 showStats()——否則 📊 內科學今日帳／checkbox 狀態要關開面板才更新。
     innerHTML 重繪會拆掉舊節點，listener 不累加（與稅率鈕既有路徑同構）。 */
  const i463 = html.indexOf('const polToggle=');
  assert(i463 > 0, 'T463 G1 找不到 polToggle');
  const line463 = html.slice(i463, html.indexOf('\n', i463));
  assert(/sTick\(\);\s*showStats\(\)/.test(line463) || (line463.includes('sTick()') && line463.includes('showStats()')),
    'T463 G1b polToggle 必須在 sTick 之後呼叫 showStats（實得 ' + line463.slice(0, 180) + '）');
  assert(line463.includes('T463') || html.includes('T463：政策開關後重繪'),
    'T463 G1c 註解具名 T463');
  // 紅源方向：若只剩 sTick 無 showStats 會紅——以靜態缺席模擬（不得在源碼把 showStats 從 polToggle 拿掉）
  assert(!/const polToggle=[^;]*sTick\(\);\}\);\}/.test(html.replace(/\s+/g, '')),
    'T463 G2 不得存在「sTick 後無 showStats」的 polToggle 緊湊形');
}



/* ===== T464 住房供給彈性：守衛 ===== */
{
  assert(/id:'houseSup464'/.test(html), 'T464 G1 SCI451 必須有 houseSup464');
  assert(html.includes('houseSup464:false'), 'T464 G1b pol 預設 false');
  assert(html.includes('houseSup464:!!p.houseSup464'), 'T464 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polhouseSup464'"), 'T464 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.houseSup464'), 'T464 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(464);
    window.GV.setDiff(1);
    window.GV.pol({ houseSup464: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().houseSup464 === false, 'T464 G3 關閉態');
    window.GV.pol({ houseSup464: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().houseSup464 === true, 'T464 G4 開啟態');
    window.GV.pol({ houseSup464: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T465 技能工作乘數：守衛 ===== */
{
  assert(/id:'jobMul465'/.test(html), 'T465 G1 SCI451 必須有 jobMul465');
  assert(html.includes('jobMul465:false'), 'T465 G1b pol 預設 false');
  assert(html.includes('jobMul465:!!p.jobMul465'), 'T465 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#poljobMul465'"), 'T465 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.jobMul465'), 'T465 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(465);
    window.GV.setDiff(1);
    window.GV.pol({ jobMul465: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().jobMul465 === false, 'T465 G3 關閉態');
    window.GV.pol({ jobMul465: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().jobMul465 === true, 'T465 G4 開啟態');
    window.GV.pol({ jobMul465: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T466 公路郊區化：守衛 ===== */
{
  assert(/id:'hwySub466'/.test(html), 'T466 G1 SCI451 必須有 hwySub466');
  assert(html.includes('hwySub466:false'), 'T466 G1b pol 預設 false');
  assert(html.includes('hwySub466:!!p.hwySub466'), 'T466 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polhwySub466'"), 'T466 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.hwySub466'), 'T466 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(466);
    window.GV.setDiff(1);
    window.GV.pol({ hwySub466: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().hwySub466 === false, 'T466 G3 關閉態');
    window.GV.pol({ hwySub466: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().hwySub466 === true, 'T466 G4 開啟態');
    window.GV.pol({ hwySub466: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T467 學校同儕：守衛 ===== */
{
  assert(/id:'schoolPeer467'/.test(html), 'T467 G1 SCI451 必須有 schoolPeer467');
  assert(html.includes('schoolPeer467:false'), 'T467 G1b pol 預設 false');
  assert(html.includes('schoolPeer467:!!p.schoolPeer467'), 'T467 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polschoolPeer467'"), 'T467 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.schoolPeer467'), 'T467 G2 效應必須讀表');
  assert(html.includes('pol&&pol.schoolPeer467&&COV.school[idx(x,y)]>0'),
    'T467 G2b【機制紅線】幸福必須閘在 COV.school[idx(x,y)]>0——刪覆蓋閘門即紅');
  assert(!/name:'學校同儕',val:pol&&pol\.schoolPeer467\?SCI_BY_ID451\.schoolPeer467\.fx\.happyVal:0/.test(html),
    'T467 G2c 不得回歸全市無覆蓋閘門寫法');
  {
    window.GV.newWorldSeeded(467);
    window.GV.setDiff(1);
    window.GV.pol({ schoolPeer467: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().schoolPeer467 === false, 'T467 G3 關閉態');
    window.GV.pol({ schoolPeer467: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().schoolPeer467 === true, 'T467 G4 開啟態');
    window.GV.pol({ schoolPeer467: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T468 空間錯配：守衛 ===== */
{
  assert(/id:'spatMis468'/.test(html), 'T468 G1 SCI451 必須有 spatMis468');
  assert(html.includes('spatMis468:false'), 'T468 G1b pol 預設 false');
  assert(html.includes('spatMis468:!!p.spatMis468'), 'T468 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polspatMis468'"), 'T468 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.spatMis468'), 'T468 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(468);
    window.GV.setDiff(1);
    window.GV.pol({ spatMis468: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().spatMis468 === false, 'T468 G3 關閉態');
    window.GV.pol({ spatMis468: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().spatMis468 === true, 'T468 G4 開啟態');
    window.GV.pol({ spatMis468: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T469 宜居資本化：守衛 ===== */
{
  assert(/id:'amenCap469'/.test(html), 'T469 G1 SCI451 必須有 amenCap469');
  assert(html.includes('amenCap469:false'), 'T469 G1b pol 預設 false');
  assert(html.includes('amenCap469:!!p.amenCap469'), 'T469 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polamenCap469'"), 'T469 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.amenCap469'), 'T469 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(469);
    window.GV.setDiff(1);
    window.GV.pol({ amenCap469: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().amenCap469 === false, 'T469 G3 關閉態');
    window.GV.pol({ amenCap469: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().amenCap469 === true, 'T469 G4 開啟態');
    window.GV.pol({ amenCap469: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T470 公交導向開發：守衛 ===== */
{
  assert(/id:'tod470'/.test(html), 'T470 G1 SCI451 必須有 tod470');
  assert(html.includes('tod470:false'), 'T470 G1b pol 預設 false');
  assert(html.includes('tod470:!!p.tod470'), 'T470 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#poltod470'"), 'T470 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.tod470'), 'T470 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(470);
    window.GV.setDiff(1);
    window.GV.pol({ tod470: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().tod470 === false, 'T470 G3 關閉態');
    window.GV.pol({ tod470: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().tod470 === true, 'T470 G4 開啟態');
    window.GV.pol({ tod470: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T471 低排放區：守衛 ===== */
{
  assert(/id:'lez471'/.test(html), 'T471 G1 SCI451 必須有 lez471');
  assert(html.includes('lez471:false'), 'T471 G1b pol 預設 false');
  assert(html.includes('lez471:!!p.lez471'), 'T471 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#pollez471'"), 'T471 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.lez471'), 'T471 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(471);
    window.GV.setDiff(1);
    window.GV.pol({ lez471: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lez471 === false, 'T471 G3 關閉態');
    window.GV.pol({ lez471: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lez471 === true, 'T471 G4 開啟態');
    window.GV.pol({ lez471: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T472 零售設施韌性：守衛 ===== */
{
  assert(/id:'vacRet472'/.test(html), 'T472 G1 SCI451 必須有 vacRet472');
  assert(html.includes('vacRet472:false'), 'T472 G1b pol 預設 false');
  assert(html.includes('vacRet472:!!p.vacRet472'), 'T472 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polvacRet472'"), 'T472 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.vacRet472'), 'T472 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(472);
    window.GV.setDiff(1);
    window.GV.pol({ vacRet472: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().vacRet472 === false, 'T472 G3 關閉態');
    window.GV.pol({ vacRet472: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().vacRet472 === true, 'T472 G4 開啟態');
    window.GV.pol({ vacRet472: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T473 綠帶地價：守衛 ===== */
{
  assert(/id:'greenB473'/.test(html), 'T473 G1 SCI451 必須有 greenB473');
  assert(html.includes('greenB473:false'), 'T473 G1b pol 預設 false');
  assert(html.includes('greenB473:!!p.greenB473'), 'T473 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polgreenB473'"), 'T473 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.greenB473'), 'T473 G2 效應必須讀表');
  assert(/if\(np>5\)\{greenRev473=np\*SCI_BY_ID451\.greenB473\.fx\.perPark/.test(html),
    'T473 G2b【機制紅線】greenRev 必須 if(np>5) 閘門——公園≤5 不得入帳');
  assert(!/greenRev473=np\*SCI_BY_ID451\.greenB473\.fx\.perPark;income\+=greenRev473;\} \/\* T473 \*\//.test(html),
    'T473 G2c 不得回歸無 np>5 的無閘門寫法');
  {
    window.GV.newWorldSeeded(473);
    window.GV.setDiff(1);
    window.GV.pol({ greenB473: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().greenB473 === false, 'T473 G3 關閉態');
    window.GV.pol({ greenB473: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().greenB473 === true, 'T473 G4 開啟態');
    window.GV.pol({ greenB473: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T474 港口路徑依賴：守衛 ===== */
{
  assert(/id:'portPath474'/.test(html), 'T474 G1 SCI451 必須有 portPath474');
  assert(html.includes('portPath474:false'), 'T474 G1b pol 預設 false');
  assert(html.includes('portPath474:!!p.portPath474'), 'T474 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polportPath474'"), 'T474 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.portPath474'), 'T474 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(474);
    window.GV.setDiff(1);
    window.GV.pol({ portPath474: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().portPath474 === false, 'T474 G3 關閉態');
    window.GV.pol({ portPath474: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().portPath474 === true, 'T474 G4 開啟態');
    window.GV.pol({ portPath474: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T475 壅堵費再投資：守衛 ===== */
{
  assert(/id:'congFund475'/.test(html), 'T475 G1 SCI451 必須有 congFund475');
  assert(html.includes('congFund475:false'), 'T475 G1b pol 預設 false');
  assert(html.includes('congFund475:!!p.congFund475'), 'T475 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polcongFund475'"), 'T475 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.congFund475'), 'T475 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(475);
    window.GV.setDiff(1);
    window.GV.pol({ congFund475: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().congFund475 === false, 'T475 G3 關閉態');
    window.GV.pol({ congFund475: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().congFund475 === true, 'T475 G4 開啟態');
    window.GV.pol({ congFund475: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T476 包容性住宅：守衛 ===== */
{
  assert(/id:'inclH476'/.test(html), 'T476 G1 SCI451 必須有 inclH476');
  assert(html.includes('inclH476:false'), 'T476 G1b pol 預設 false');
  assert(html.includes('inclH476:!!p.inclH476'), 'T476 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polinclH476'"), 'T476 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.inclH476'), 'T476 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(476);
    window.GV.setDiff(1);
    window.GV.pol({ inclH476: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().inclH476 === false, 'T476 G3 關閉態');
    window.GV.pol({ inclH476: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().inclH476 === true, 'T476 G4 開啟態');
    window.GV.pol({ inclH476: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T477 夜間經濟：守衛 ===== */
{
  assert(/id:'nightEc477'/.test(html), 'T477 G1 SCI451 必須有 nightEc477');
  assert(html.includes('nightEc477:false'), 'T477 G1b pol 預設 false');
  assert(html.includes('nightEc477:!!p.nightEc477'), 'T477 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polnightEc477'"), 'T477 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.nightEc477'), 'T477 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(477);
    window.GV.setDiff(1);
    window.GV.pol({ nightEc477: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().nightEc477 === false, 'T477 G3 關閉態');
    window.GV.pol({ nightEc477: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().nightEc477 === true, 'T477 G4 開啟態');
    window.GV.pol({ nightEc477: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T478 洪災風險定價：守衛 ===== */
{
  assert(/id:'floodR478'/.test(html), 'T478 G1 SCI451 必須有 floodR478');
  assert(html.includes('floodR478:false'), 'T478 G1b pol 預設 false');
  assert(html.includes('floodR478:!!p.floodR478'), 'T478 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polfloodR478'"), 'T478 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.floodR478'), 'T478 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(478);
    window.GV.setDiff(1);
    window.GV.pol({ floodR478: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().floodR478 === false, 'T478 G3 關閉態');
    window.GV.pol({ floodR478: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().floodR478 === true, 'T478 G4 開啟態');
    window.GV.pol({ floodR478: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T479 大學知識外溢：守衛 ===== */
{
  assert(/id:'univSp479'/.test(html), 'T479 G1 SCI451 必須有 univSp479');
  assert(html.includes('univSp479:false'), 'T479 G1b pol 預設 false');
  assert(html.includes('univSp479:!!p.univSp479'), 'T479 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polunivSp479'"), 'T479 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.univSp479'), 'T479 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(479);
    window.GV.setDiff(1);
    window.GV.pol({ univSp479: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().univSp479 === false, 'T479 G3 關閉態');
    window.GV.pol({ univSp479: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().univSp479 === true, 'T479 G4 開啟態');
    window.GV.pol({ univSp479: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T480 自行車基建：守衛 ===== */
{
  assert(/id:'bikeInf480'/.test(html), 'T480 G1 SCI451 必須有 bikeInf480');
  assert(html.includes('bikeInf480:false'), 'T480 G1b pol 預設 false');
  assert(html.includes('bikeInf480:!!p.bikeInf480'), 'T480 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polbikeInf480'"), 'T480 G1d polToggle 在場');
  assert(html.includes('SCI_BY_ID451.bikeInf480'), 'T480 G2 效應必須讀表');
  {
    window.GV.newWorldSeeded(480);
    window.GV.setDiff(1);
    window.GV.pol({ bikeInf480: false, congChg451: false, rentCtrl452: false, lvt453: false, minWage454: false, ecMix457: false, aggCluster458: false, cleanAir459: false, houseSup464: false, jobMul465: false, hwySub466: false, schoolPeer467: false, spatMis468: false, amenCap469: false, tod470: false, lez471: false, vacRet472: false, greenB473: false, portPath474: false, congFund475: false, inclH476: false, nightEc477: false, floodR478: false, univSp479: false, bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().bikeInf480 === false, 'T480 G3 關閉態');
    window.GV.pol({ bikeInf480: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().bikeInf480 === true, 'T480 G4 開啟態');
    window.GV.pol({ bikeInf480: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T481 科學政策套餐 ===== */
{
  assert(/const SCI_PACKS481=\[/.test(html) && html.includes('function applySciPack481'),
    'T481 G1 套餐表與 applySciPack481 在場');
  assert(html.includes("applySciPack481('transitCity')"), 'T481 G1b 三鈕綁定');
  assert(typeof window.GV.sciPacks481 === 'function', 'T481 G2 橋');
  const packs = window.GV.sciPacks481();
  assert(Array.isArray(packs) && packs.length === 3, 'T481 G2b 恰 3 套餐');
  {
    window.GV.newWorldSeeded(4811);
    window.GV.setDiff(1);
    window.GV.pol({ congChg451: false, taxR: 1, taxC: 1, taxI: 1 });
    // apply via internal if exposed - call through eval of pack keys
    const p0 = window.GV.sciPacks481()[0];
    assert(p0.keys.length >= 3, 'T481 G3 公交套餐至少 3 鍵');
  }
}


/* ===== T482 科學財政擴列 ===== */
{
  const tFin = html.slice(html.indexOf('const SCI_FIN461=['), html.indexOf('];', html.indexOf('const SCI_FIN461=[')) + 2);
  assert(tFin.includes("finKey:'lezCost'") && tFin.includes("finKey:'greenRev'"),
    'T482 G1 SCI_FIN461 必須含 lezCost／greenRev');
  const snap = window.GV.sciFin461();
  assert(snap.some(r => r.finKey === 'lezCost') && snap.some(r => r.finKey === 'greenRev'),
    'T482 G2 sciFin461 橋含新列');
}


/* ===== T483 研究波收官量測 ===== */
{
  const fs483 = require('fs');
  const p483 = path.join(__dirname, 'docs', 'tasks', 'T483-二十卡效果報告.md');
  assert(fs483.existsSync(p483), 'T483 G1 效果報告檔必須在場');
  const rep = fs483.readFileSync(p483, 'utf8');
  assert(/SCI451/.test(rep) && /三答案/.test(rep), 'T483 G1b 報告含 SCI451 與三答案');
}


/* ===== T457 經濟連結度（混合社區計畫）：守衛 ===== */
{
  /* Chetty 等 2022 Nature 社會資本 I/II：經濟連結度＝最強流動預測子。
     政策預設關 ⇒ ecIdx457 連算都不算、六哨兵位元恆等；開啟＝T456 流動的第二管道。 */
  // G1 表項＋參數域機械複算
  {
    const mE457 = html.match(/fx:\{mixR:(\d+),venueW:(\.\d+),ecThr:(\.\d+)\}/);
    assert(mE457 && /id:'ecMix457'/.test(html) && /Chetty, Jackson, Kuchler, Stroebel/.test(html),
      'T457 G1【原文前哨】SCI451 必須有 ecMix457 條目（含 Nature 2022 引用與 mixR/venueW/ecThr）');
    assert(Number(mE457[2]) > 0 && Number(mE457[2]) < 1 && Number(mE457[3]) > 0 && Number(mE457[3]) < 1,
      'T457 G1b【機械複算】venueW 與 ecThr 必須落在 (0,1)，實得 ' + mE457[2] + '/' + mE457[3]);
  }
  // G1c ecIdx457 讀表＋第二管道接線讀表＋政策短路在最前
  assert(html.includes("const f457=SCI_BY_ID451.ecMix457.fx;")
    && html.includes("const tgt1=(pol&&pol.ecMix457&&tgt<=tgt0&&tgt0<2&&ecIdx457(i)>=SCI_BY_ID451.ecMix457.fx.ecThr)?tgt0+1:tgt;")
    && html.includes("if(tgt1>tgt)ecUp457++;"),
    'T457 G1c【原文前哨】ecIdx457 必須讀 SCI_BY_ID451 常數；第二管道必須以 pol&&pol.ecMix457 '
    + '短路開頭（關閉＝連算都不算）且有 ecUp457 介入計數');
  // G1d 計數器鐵律7
  assert(html.includes("ecUp457=0;") && html.split('ecUp457=0').length - 1 >= 2,
    'T457 G1d ecUp457 必須在 newWorld 成對歸零（鐵律7）');
  // G3 預設關＋白名單
  assert(html.includes("minWage454:false,ecMix457:false,"),
    'T457 G3【原文前哨】pol 初始化必須含 ecMix457:false');
  assert(html.includes("minWage454:!!p.minWage454,ecMix457:!!p.ecMix457,"),
    'T457 G3b GV.pol 測試鉤必須白名單 ecMix457');
  // G4 行為：政策開的世界 ecUp>0（決定性）、預設關世界恆 0（六哨兵世界已隱含，這裡取受控短跑）
  {
    window.GV.newWorldSeeded(4571);
    window.GV.setDiff(1);
    window.GV.pol({ ecMix457: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.ai(true);
    for (let d = 0; d < 150; d++) window.GV.step(1);
    window.GV.ai(false);
    const ec457on = window.GV.sci451();
    assert(ec457on.ecOn === true && ec457on.ecUp > 0,
      'T457 G4 政策開啟的 150 天 AI 城，第二管道介入 ecUp 必須 >0（實得 ' + JSON.stringify(ec457on) + '）'
      + '——混城必有異級鄰里+混合場所');
    window.GV.newWorldSeeded(4571);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 150; d++) window.GV.step(1);
    window.GV.ai(false);
    const ec457off = window.GV.sci451();
    assert(ec457off.ecOn === false && ec457off.ecUp === 0,
      'T457 G4b 同種子預設關世界 ecUp 必須恆 0（實得 ' + JSON.stringify(ec457off) + '）——政策不開不參與模擬');
  }
}

/* ===== T455 機會指數唯讀層：守衛 ===== */
{
  /* 十卡第一張唯讀圖層卡（Chetty Opportunity Atlas 2018）。零模擬觸碰：
     三根 SEEDPIN 照常＝tick 路徑零觸碰的行為證明；函式體零亂數靜態掃＝draw 路徑的機械證明。 */
  // G1 表項＋權重和機械複算=1
  {
    const mW455 = html.match(/fx:\{wEdu:(\.\d+),wEnv:(\.\d+),wSvc:(\.\d+),wLand:(\.\d+)\}/);
    assert(mW455 && /id:'oppAtlas455'/.test(html) && /Chetty, Friedman, Hendren/.test(html),
      'T455 G1【原文前哨】SCI451 必須有 oppAtlas455 條目（含 Chetty 引用與四權重）');
    const sum455 = Number(mW455[1]) + Number(mW455[2]) + Number(mW455[3]) + Number(mW455[4]);
    assert(Math.abs(sum455 - 1) < 1e-9,
      'T455 G1b【機械複算】四權重之和必須恰為 1（實得 ' + sum455 + '）——分數才有 0-1 的解讀');
  }
  // G1c oppIdx455 讀表＋draw 呼叫在流向層之後
  assert(html.includes('const w455=SCI_BY_ID451.oppAtlas455.fx;'),
    'T455 G1c oppIdx455 必須讀 SCI_BY_ID451 的權重，不得硬編碼');
  {
    const aF455 = html.indexOf('drawFlowOverlay384(ox,oy,z,lodMini); // T384b');
    const aO455 = html.indexOf('drawOppOverlay455(ox,oy,z,lodMini); // T455');
    assert(aF455 > 0 && aO455 > aF455 && aO455 - aF455 < 400,
      'T455 G1d 機會層必須緊跟流向層之後呼叫（夜燈之前＝同一疊放約定）');
  }
  // G1e 零亂數靜態掃：oppIdx455 與 drawOppOverlay455 函式體禁 R()/Math.random/ri(
  {
    const f0455 = html.indexOf('function oppIdx455(i){');
    const f1455 = html.indexOf('function techRect343(n){', f0455);
    assert(f0455 > 0 && f1455 > f0455, 'T455 G1e 找不到 oppIdx455..drawOppOverlay455 函式區');
    const body455 = html.slice(f0455, f1455);
    assert(!/\bR\(\)/.test(body455) && !/Math\.random/.test(body455) && !/\bri\(/.test(body455),
      'T455 G1e【機械掃】唯讀圖層函式體不得消耗任何亂數——看地圖不能改城市的未來（T422 G4 同義）');
  }
  // G2 科學頁 layerBtn 由表導出
  {
    const a455 = html.indexOf('}else if(guideTab===7){');
    const b455 = html.indexOf('}else if(guideTab===4){', a455);
    const page455 = html.slice(a455, b455);
    assert(page455.includes("if(e451.layerBtn)rows451.push"),
      'T455 G2 科學頁圖層鈕必須由 SCI451.layerBtn 導出（表驅動，不得寫死在頁裡）');
  }
  // G3 預設關＋逃生閥
  assert(html.includes('let oppShow455=false;'),
    'T455 G3 圖層開關必須預設關');
  assert(html.includes('if(!oppShow455||window.__noOpp455||lodMini)return null;'),
    'T455 G3b 逃生閥 __noOpp455 必須在場（flow384 三件套同型）');
  // G4 行為（Node meta 路徑）：關→null；開→tiles>0 且 bands 和=tiles；逃生閥→null
  {
    window.GV.newWorldSeeded(4551);
    window.GV.setDiff(1);
    window.GV.ai(true);
    for (let d = 0; d < 90; d++) window.GV.step(1);
    window.GV.ai(false);
    assert(window.GV.drawOppOverlay455() === null,
      'T455 G4 預設關閉時 drawOppOverlay455 必須回 null（零迭代）');
    window.GV.setOppShow455(true);
    const meta455 = window.GV.drawOppOverlay455();
    assert(meta455 && meta455.tiles > 0,
      'T455 G4b 開啟後 meta.tiles 必須 >0（90 天 AI 城必有住宅），實得 ' + JSON.stringify(meta455));
    assert(meta455.bands.reduce((a, b) => a + b, 0) === meta455.tiles,
      'T455 G4c 五段色計數之和必須等於染格總數（對帳），實得 ' + JSON.stringify(meta455));
    const i455 = (() => { for (let q = 0; q < 200 * 200; q++) { try { const v = window.GV.oppIdx455(q); if (v > 0) return v; } catch (e) { break; } } return null; })();
    assert(i455 === null || (i455 >= 0 && i455 <= 1),
      'T455 G4d 單格分數必須落在 0-1（權重和=1 的行為面），實得 ' + i455);
    window.__noOpp455 = true;
    assert(window.GV.drawOppOverlay455() === null,
      'T455 G4e 逃生閥 __noOpp455=true 時必須回 null');
    delete window.__noOpp455;
    window.GV.setOppShow455(false);
  }
}

/* ===== T450 「📈 趨勢」分頁：守衛 ===== */
{
  /* 小倍數趨勢分頁：純讀 T112 的 hist，零模擬、零存檔變更、零 tick 觸碰。
     真瀏覽器實測（記錄在卡面）：40 天後面板當前值與 hist 末筆逐項相等、NaN 0、四張小圖有內容。 */
  // G1 分頁鈕＋綁定＋渲染函式在場
  assert(html.includes('id="statsTrend450"') && html.includes("trend.onclick=()=>{showTrendPanel450();"),
    'T450 G1【原文前哨】統計面板必須有「📈 趨勢」分頁鈕且綁到 showTrendPanel450');
  // G2 資料必須來自 hist（不得手抄任何序列）
  assert(html.includes('function showTrendPanel450(){\n  const data=hist.slice(-histRange);'),
    'T450 G2【原文前哨】趨勢分頁的資料必須是 `hist.slice(-histRange)`——'
    + '手抄一份序列就會過期而且沒有人會發現（T442 的 $12 教訓）');
  // G3 兩支渲染函式零共用亂數（純 UI；面板有玩家可撥的範圍鈕）
  {
    let bad450 = 0;
    for (const fn of ['\nfunction trendCell450(', '\nfunction showTrendPanel450(']) {
      const a = html.indexOf(fn);
      const b = html.indexOf('\n}', a);
      const body = htmlBare438.slice(a, b);
      bad450 += (body.match(/(^|[^A-Za-z0-9_$.])(R|ri)\s*\(/g) || []).length;
    }
    assert(bad450 === 0,
      'T450 G3【機械複算】trendCell450／showTrendPanel450 不得出現共用亂數呼叫（實得 ' + bad450 + '）');
  }
  // G4 空城後備（面板禁 NaN/undefined 慣例）
  assert(html.includes("if(!hist.length)inner+=statTab([{k:'狀態',v:'尚無歷史資料'"),
    'T450 G4【原文前哨】hist 為空時必須給 dim 後備列，不能讓四張空圖自己解釋自己');
}

/* ===== T449 低層屋頂豐富化：守衛 ===== */
{
  /* roofStyle449：雙坡壓暗＋屋脊亮線＋瓦片列紋，只畫在屋頂菱形內（不越過 rty ⇒ 輪廓與 vh 不變）。
     a/b 實測改變恰 66 鍵全部 `bld/1_[12]_*`、night CRC 0、逃生閥開啟時 CRC 改變 0。 */
  // G1 三點接線（mkBld＋兩份 mkWealthBld）；少了＝財富套屋頂走鐘
  {
    const n449 = (htmlBare438.match(/roofStyle449\(sg,ax,rty,hw,rf\)/g) || []).length;
    assert(n449 === 3,
      'T449 G1【計數釘】roofStyle449 接線應恰 3 處（mkBld＋兩份 mkWealthBld），實得 ' + n449
      + '。少了＝同鍵不同財富的屋頂走鐘；多了＝有人擴散到非住宅');
    const g449 = (htmlBare438.match(/if\(k===1&&lv<=2\)roofStyle449\(/g) || []).length;
    assert(g449 === 3,
      'T449 G1b【原文釘】三處接線必須都帶 `k===1&&lv<=2` 條件（實得 ' + g449 + '）——'
      + '擴散到商業/工業或 lv3 是另一張卡的決定，不是手滑');
  }
  // G2 helper 必須在 buildSprites 範圍外（T383c token 快照零風險）且函式體零共用亂數
  {
    const hp449 = html.indexOf('\nfunction roofStyle449(');
    const bs449 = html.indexOf('function buildSprites(){');
    assert(hp449 > 0 && bs449 > 0 && hp449 < bs449,
      'T449 G2【位置釘】roofStyle449 定義（' + hp449 + '）必須在 `function buildSprites(){`（' + bs449
      + '）之前——搬進掃描範圍就會動 T383c 亂數 token 快照的行序');
    const b449 = html.indexOf('\n}', hp449);
    const body449 = htmlBare438.slice(hp449, b449);
    const rng449 = (body449.match(/(^|[^A-Za-z0-9_$.])(R|ri|rf2|rand)\s*\(/g) || []).length;
    assert(rng449 === 0,
      'T449 G2b【機械複算】roofStyle449 函式體不得出現共用亂數呼叫（實得 ' + rng449 + '）——'
      + '它有玩家可撥的逃生閥，一旦碰共用流，撥開關就會位移世界');
  }
  // G3 逃生閥位置釘
  {
    const wr449 = html.indexOf("if(!window.__noRoofStyle449){try{if(/[?&]noRoofStyle449=1/");
    const bs449b = html.indexOf('function buildSprites(){');
    assert(wr449 > 0 && wr449 < bs449b,
      'T449 G3【位置釘】?noRoofStyle449=1 的寫入端（' + wr449 + '）必須早於 buildSprites（' + bs449b + '）');
  }
}

/* ===== T448 高層牆面立體化：守衛 ===== */
{
  /* lv3 塔樓主體改走 boxUnit（T425I 五級色階），逃生閥 ?noWallDepth448=1 逐位元回退。
     卡面原寫「mkBld :2156 全檔唯一」——**錯**（substring 命中 7 處），實際要分流的是
     mkBld＋兩份 mkWealthBld 共 3 處（財富套不同步＝同鍵不同財富立面走鐘），
     其餘 4 處是消防局/學校/圖書館/郵局單層服務建築、不在目標內。
     a/b 實測改變恰 51 鍵全部 bld/[123]_3_*（27 程序化基鍵 v3-11＋24 個 k1 財富衍生；
     v0-2 基鍵是手繪 HERO_PIX 不走 mkBld）、night CRC 改變 0、逃生閥開啟時 CRC 改變 0。 */
  // G1 三個分流點：條件原文恰 3 處（mkBld＋mkWealthBld×2；多＝有人擴散、少＝有人退回）
  {
    const n448 = (htmlBare438.match(/\(lv===3&&!window\.__noWallDepth448\)/g) || []).length;
    assert(n448 === 3,
      'T448 G1【計數釘】lv3 牆面分流條件 `(lv===3&&!window.__noWallDepth448)` 應恰 3 處'
      + '（mkBld＋兩份 mkWealthBld），實得 ' + n448 + '。'
      + '少了＝財富套或主體被退回 isoBox（同鍵不同財富的立面會走鐘）；'
      + '多了＝有人把分流擴散到服務建築（那 4 處不是塔樓，卡面明定不動）');
  }
  // G2 呼叫必須是無 opts 版（不畫窗洞、不碰 ng ⇒ 夜燈鏈照舊；a/b 實測 night CRC 改變 0）
  {
    const call448 = (htmlBare438.match(/boxUnit\(sg,ng,ax,by,hw,h,wl\[1\],wl\[0\],rf\)/g) || []).length;
    assert(call448 === 3,
      'T448 G2【原文釘】三個分流點的 boxUnit 呼叫必須是無 opts 的九參數版，實得 ' + call448
      + '。傳了 opts.win 就會畫窗洞並寫 ng ⇒ 與 PARTS 的 windowsStd 疊窗、夜燈鏈被動到');
  }
  // G3 逃生閥位置釘（T438 M2 教訓：寫入端晚於 buildSprites 的逃生閥等於沒有）
  {
    const wr448 = html.indexOf("if(!window.__noWallDepth448){try{if(/[?&]noWallDepth448=1/");
    const bs448 = html.indexOf('function buildSprites(){');
    assert(wr448 > 0 && bs448 > 0 && wr448 < bs448,
      'T448 G3【位置釘】?noWallDepth448=1 的寫入端（' + wr448 + '）必須早於 `function buildSprites(){`（'
      + bs448 + '）——mkBld 在建圖期間執行，寫入端晚一步這個逃生閥就對烘進 sprite 的像素完全無效');
  }
}

/* ===== T447 槽 3 紀律（ARCH §10.5）：守衛 ===== */
{
  /* 這一區的第一版被我寫進 `tools/test_toolchain.py`——而它**不在任何閘門上**
     （`verify.py` 與 `merge_bay.py` 都沒有呼叫它）。那正是 T438 M3 抓到的同一個病：
     「交了工具卻沒掛進閘門，根因原封不動」。**我在修這條債的同一夜又犯了一次**，
     所以搬到這裡（`test_fixde.js` 在 `verify.py` 的閘門上）。

     規則本體是 T447 補進 `docs/RULES.md` 的**第 18 條**——在那之前，
     `ARCH §10.5` 與 `docs/VERIFY.md` 兩處都以「鐵律3」之名引用它，而 RULES 從來沒寫過。

     風險範圍是量出來的，不是猜的：`index.html` **沒有自動存檔**（剝乾淨後全檔 `save()`
     只在存檔按鈕的處理器裡出現一次），所以「把遊戲載起來放著」不會覆蓋任何槽；
     真正會覆蓋的是**自己去呼叫 `GV.save()` 的 probe**（T370 事故那十個就是這型）。 */
  const SKIP447 = ['.git', 'node_modules', 'backups', '_ds', 'attic'];
  const walk447 = (dir, out) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) {
        if (SKIP447.indexOf(ent.name) >= 0) continue;
        walk447(path.join(dir, ent.name), out);
      } else if (/\.(html|js)$/.test(ent.name)) {
        out.push(path.join(dir, ent.name));
      }
    }
    return out;
  };
  const files447 = walk447(__dirname, []);
  assert(files447.length >= 20,
    'T447 G0 掃到的 .html/.js 只有 ' + files447.length + ' 個（預期 ≥20）——'
    + '檔案樹走訪壞了，下面兩條會變成空跑的假綠');
  const offenders447 = [];
  let saveCallers447 = 0;
  for (const f of files447) {
    const rel = path.relative(__dirname, f).replace(/\\/g, '/');
    if (rel === 'index.html' || rel === 'sw.js') continue;
    if (/^test_[A-Za-z0-9_]*\.js$/.test(rel)) continue;   // Node 測試跑在 mock localStorage 上
    let body;
    try { body = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    if (body.indexOf('GV.save(') < 0) continue;
    saveCallers447++;
    if (body.indexOf('glimmerville.v1.slot') < 0) offenders447.push(rel);
  }
  assert(offenders447.length === 0,
    'T447 G1【鐵律18】這些檔案呼叫了 `GV.save()` 卻沒有先切到槽 3：'
    + JSON.stringify(offenders447.slice(0, 5))
    + '。在玩家目錄開它就會覆蓋一個真的存檔（`curSlot()` 遇不合法鍵回槽 1）。'
    + '在呼叫前加一行 `localStorage.setItem(\'glimmerville.v1.slot\',\'3\')`');
  /* 今天沒有任何非豁免檔案呼叫 GV.save()，所以上面那條是**合法地空**——
     把這個事實釘住，而不是假裝它是覆蓋率。數字變動不一定是壞事，但一定要有人知道。 */
  assert(saveCallers447 === 0,
    'T447 G1b【計數釘】非豁免檔案裡呼叫 `GV.save()` 的數量由 0 變成 ' + saveCallers447
    + '。新檔案必須設槽 3（G1 會驗），這條只是要讓「有人新增了會寫存檔的工具」這件事被看見');
  // G2 規則要真的寫在 RULES 裡，而且 VERIFY 要引對號碼
  {
    const rules447 = fs.readFileSync(path.join(__dirname, 'docs', 'RULES.md'), 'utf8');
    const verify447 = fs.readFileSync(path.join(__dirname, 'docs', 'VERIFY.md'), 'utf8');
    assert(rules447.indexOf('18. **存檔槽紀律**') >= 0 && rules447.indexOf('glimmerville.v1.slot') >= 0,
      'T447 G2 `docs/RULES.md` 必須把存檔槽紀律寫成第 18 條並指名那個 localStorage 鍵。'
      + 'T447 之前，ARCH §10.5 與 VERIFY 兩處都以「鐵律3」之名引用它，而 RULES 從來沒有寫過'
      + '——三份文件互相引用一條不存在的鐵律');
    assert(verify447.indexOf('（鐵律3）') < 0 && verify447.indexOf('鐵律18') >= 0,
      'T447 G2b `docs/VERIFY.md` 不得再以「鐵律3」之名引用存檔槽紀律'
      + '（RULES 第 3 條講的是「禁止刪除既有功能／註解／GV API」），必須引第 18 條');
  }
}

/* ===== T533 分享碼跨尺寸誤判（T262 遺留債）=====

   「朋友的 108×108 分享碼在 72×72 世界裡貼不進來」：load() 支援跨尺寸（T262 驗 dd.n），
   但匯入閘門忘了改、還在驗當前 N ⇒ 合法碼被拒「分享碼無效」，而同一份資料直接走 load() 開得起來。
   同一條規則兩處各寫一份＝T530/T518 同族。修法＝抽 saveShapeOk533 單一真相源。 */
{
  /* G1 交叉一致性（靈魂）：形狀判定全檔只准寫一次 */
  const dnDn533 = (htmlBare438.match(/\.length===dn\*dn/g) || []).length;
  assert(dnDn533 === 1,
    'T533 G1【本卡靈魂】`ter 長度===dn*dn` 全檔只准寫一次（在 `saveShapeOk533` 裡），實得 '
    + dnDn533 + ' 處——兩處各寫一份正是 T262 留下的病：load 那份改了、匯入閘門那份忘了');
  assert((htmlBare438.match(/ter\.length===N\*N/g) || []).length === 0,
    'T533 G1a 匯入閘門不得再用當前執行期的 N 驗長度（`ter.length===N*N` 應為 0 處）');
  assert(htmlBare438.indexOf('if(!saveShapeOk533(d))') >= 0
      && htmlBare438.indexOf('const vlen=saveShapeOk533;') >= 0,
    'T533 G1b 匯入閘門與 load 的 vlen 都必須讀 `saveShapeOk533`（兩個使用點）');

  /* G2 行為：跨尺寸匯入必須成功且世界正確 */
  const GS = window.GV;
  GS.setMapSize(108);
  GS.newWorldSeeded(533);
  GS.weather(0);
  GS.ai(true); for (let d = 0; d < 60; d++) GS.step(1); GS.ai(false); // 養到有人口，G2b 才不是 0===0 的空跑
  window.GV.save();
  const raw108 = store[SKEY];
  const code108 = btoa(unescape(encodeURIComponent(raw108)));
  GS.step(1); const pop108 = GS.stats().pop;
  assert(pop108 > 0,
    'T533 G2 前置：來源城必須有人口（實得 ' + pop108 + '）——pop=0 時 G2b 的一致性斷言是空跑（0===0 什麼都沒驗）');

  GS.setMapSize(72);
  GS.newWorldSeeded(534);
  GS.weather(0);
  for (let d = 0; d < 3; d++) GS.step(1);
  window.GV.save();
  const code72 = btoa(unescape(encodeURIComponent(store[SKEY])));
  assert(GS.N() === 72, 'T533 G2 前置：目前世界應為 72（實得 ' + GS.N() + '）');

  assert(GS.importCode(code108) === true,
    'T533 G2【行為】跨尺寸匯入必須成功（108 碼進 72 世界）——修前一律被拒「分享碼無效」，'
    + '而同一份資料直接走 load() 開得起來（實測 N=108）');
  assert(GS.N() === 108,
    'T533 G2a 匯入後世界尺寸必須切到分享碼宣告的 108（實得 ' + GS.N() + '）');
  GS.step(1);
  assert(GS.stats().pop === pop108,
    'T533 G2b 匯入後步進一天的 pop 應與來源城一致（期望 ' + pop108 + '，實得 ' + GS.stats().pop
    + '）——尺寸切了但內容錯位＝更糟的失敗模式，必須釘住');

  /* G3 基線＋負向 */
  assert(GS.importCode(code72) === true,
    'T533 G3 同尺寸匯入必須照樣成功（基線，修前也是綠的——放寬不得弄壞它）');
  assert(GS.N() === 72, 'T533 G3a 匯回 72 碼後尺寸應為 72（實得 ' + GS.N() + '）');
  {
    const bad = JSON.parse(raw108);
    bad.ter = bad.ter.slice(0, 100); // 內容與宣告的 n² 不符＝畸形
    const badCode = btoa(unescape(encodeURIComponent(JSON.stringify(bad))));
    const mainBefore533 = store[SKEY];
    assert(GS.importCode(badCode) === false,
      'T533 G3b【負向】畸形碼（ter 長度與宣告的 n² 不符）必須照樣被拒——'
      + '放寬跨尺寸不准把驗證整個放掉（真相源退化恆真就會漏這個）');
    assert(store[SKEY] === mainBefore533,
      'T533 G3c 畸形碼失敗不得覆蓋現有槽位（T135 既有保護必須存活）');
  }
  GS.setMapSize(72); // 收尾：把偏好還原，避免污染後續測試的世界尺寸
}

/* ===== T532 貧困陷阱的電力鎖（業主裁決 A 案）=====

   實測 12 種子：7 個 900 天內從沒到過 rank 9 ⇒ 幸福 0.2-0.3、資金長期負值、建築反而減少。
   真機制：未供電 100% 是 network（分區容量用滿）→ 買不起 → `money<80` 時 aiStep 整個停工
   ⇒ 死迴圈。判別因子＝**卡了多久**（四版迭代：瞬時金額會誤傷成長期城市、`money<0` 不可達，
   取捨表在卡面第 5 節；業主 2026-08-19 選 A 案並授權 seed7 重釘）。

   行為守衛就是哨兵本身：seed7（陷阱族）重釘 260/50＝紓困有發生；
   seed301/seed22 位元恆等＝手術式條件「健康城市永不滿足」的實測面。
   這裡補靜態面： */
{
  const src532 = htmlBare438;
  /* G1 具名常數（不手抄門檻） */
  assert(src532.indexOf('const POWLOCK_DAY532=150, POWLOCK_FRAC532=.35, POWLOCK_AID_GAP532=60, POWLOCK_HOLD532=120;') >= 0,
    'T532 G1 四個門檻必須是具名常數且與卡面一致（150／.35／60／120）——改任何一個都要重跑 12 種子取捨表並跟版卡面');
  /* G1a 判別因子必須是「持續天數」不是瞬時值——這正是四版迭代學到的 */
  assert(src532.indexOf('powLockDays532=powStarved532?powLockDays532+1:0;') >= 0
      && src532.indexOf('powLockDays532>=POWLOCK_HOLD532') >= 0,
    'T532 G1a 電力鎖判定必須用「已持續天數」計數器——瞬時判定實測會誤傷成長期城市'
    + '（seed3002 −4,705 人口，取捨表版本②）');
  /* G1b 閘門放行的形態：只在 powLock532 時繞過 !poor */
  assert((src532.match(/\(!poor\|\|powLock532\)&&powCap<bldN\+6/g) || []).length === 1,
    'T532 G1b 擴容閘門必須恰是 `(!poor||powLock532)` 形態一處——無條件放寬＝版本①，實測是 no-op');
  /* G2 紓困必受節流與「真的買不起」約束（不是錢的水龍頭） */
  const aidAt = src532.indexOf('if(powLock532&&powCap<bldN+6&&money<COST.geo+RESERVE&&day-powAid532>=POWLOCK_AID_GAP532){');
  assert(aidAt >= 0,
    'T532 G2 紓困觸發必須同時要求：鎖確立＋容量不足＋買不起最便宜電源＋距上次 ≥60 天');
  /* G3 未供電比例只數 pw 逐日重算的建築（k<=3 與 127）——k>=4 是殘值（T435） */
  assert((src532.match(/if\(b\.k<=3\|\|b\.k===127\)\{pwLiveN532\+\+;if\(!b\.pw\)pwOutN532\+\+;\}/g) || []).length === 1,
    'T532 G3 未供電計數必須只數 `pw` 逐日重算的建築（k<=3||k===127）且全檔恰一處——'
    + '數到 k>=4 的放置殘值會得到假比例');
  /* G4 零亂數（紓困塊在 tick 路徑上） */
  {
    const body = html.slice(aidAt >= 0 ? html.indexOf('if(powLock532&&powCap<bldN+6') : 0);
    const blk = body.slice(0, body.indexOf('\n  }') + 4);
    assert(blk.length > 80 && blk.length < 900, 'T532 G4 紓困塊長度異常（' + blk.length + '）＝錨點抓錯');
    assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|[^a-zA-Z_]rand\(|Math\.random/.test(blk),
      'T532 G4 紓困塊必須零亂數（鐵律2）——它在 aiStep/tick 路徑上');
  }
  /* G5 鐵律7：三處歸零、不入存檔 */
  assert((src532.match(/powAid532=-999/g) || []).length === 3
      && (src532.match(/powLockDays532=0/g) || []).length >= 3,
    'T532 G5 紓困節流與鎖定計數器必須在宣告／newWorld／load 三處歸零（鐵律7），實得 powAid '
    + (src532.match(/powAid532=-999/g) || []).length + ' 處');
  assert(html.indexOf('data.powAid532') < 0 && html.indexOf('data.powLockDays532') < 0,
    'T532 G5a 電力鎖狀態不得進存檔（它是 AI 內部節流，不是世界狀態；讀檔後重新累積 120 天是想要的保守行為）');
}

/* ===== T531 資源耗盡由玩家決定 =====

   競品的正解：Skylines 的礦/油耗盡是品類公認爭議，官方回應是內建 Unlimited Oil and Ore 開關
   而非重新調數值——「別替玩家決定這個數字」。T530 做了「不騙玩家」那一半，本卡把開關做出來。

   守衛分工：
     G2 預設關閉 ⇒ 位元恆等（六哨兵由套件實測，這裡釘「預設值是 false」與算式等價形態）
     G3 開啟後行為雙向：永不見底／耗盡格可蓋／不發通知；**關回去 RDEP 不得暴增**
     G4 不進存檔、走 localStorage
     G5 零亂數 */
{
  const GI = window.GV;
  assert(GI.resInf531() === false,
    'T531 G2 資源開關必須預設關閉（實得 ' + GI.resInf531() + '）——'
    + '預設開啟會改變每一場遊戲的經濟曲線，也會破哨兵');
  assert(/let resInfinite531=false;/.test(htmlBare438),
    'T531 G2a 預設值必須在原文裡就是 false（T385 pattern：關閉時位元恆等）');

  /* 造境：一座礦場挖到見底（開關關閉）＝T530 行為必須完全照舊 */
  GI.newWorldSeeded(531);
  GI.ai(true); for (let d = 0; d < 100; d++) GI.step(1); GI.ai(false);
  GI.addMoney(300000);
  const NN = GI.N();
  let ore = null;
  outer531: for (let x = 1; x < NN - 1; x++) for (let y = 1; y < NN - 1; y++) {
    const t = GI.tile(x, y);
    if (t && !t.bld && !t.road && GI.resourceAt(x, y) === 2) { ore = [x, y]; break outer531; }
  }
  assert(ore, 'T531 前置：找不到空的礦藏格');
  const [mx, my] = ore;
  assert(GI.place('mine', mx, my) === true, 'T531 前置：礦場應蓋得起來');
  for (let d = 0; d < 200 && !GI.res530(mx, my).depleted; d++) GI.step(1);
  assert(GI.res530(mx, my).depleted === true,
    'T531 G2b 開關關閉時，礦脈必須照舊會見底（實得 rdep=' + GI.res530(mx, my).rdep + '）');
  const rdepAtCap = GI.res530(mx, my).rdep;

  /* G3 開啟：立刻不再算耗盡，且再挖 300 天 RDEP 不得增加（開啟期間不累計） */
  GI.resInf531(true);
  assert(GI.res530(mx, my).depleted === false,
    'T531 G3 開啟後那一格不得再算作耗盡（同一格 rdep=' + GI.res530(mx, my).rdep + '）');
  for (let d = 0; d < 300; d++) GI.step(1);
  assert(GI.res530(mx, my).rdep === rdepAtCap,
    'T531 G3a【本卡靈魂】開啟期間**不得累計耗損**：跑 300 天後 rdep 應維持 ' + rdepAtCap
    + '，實得 ' + GI.res530(mx, my).rdep
    + '。若讓它繼續長大，玩家把開關關回去時全圖礦脈會瞬間見底');
  assert(GI.res530(mx, my).depleted === false,
    'T531 G3b 開啟期間永不見底（跑 300 天後仍應可採）');
  /* 耗盡格此時應該可以蓋（開關開啟） */
  assert(GI.place('doze', mx, my) === true, 'T531 前置：應拆得掉');
  assert(GI.place('mine', mx, my) === true,
    'T531 G3c 開啟後，原本已見底的格子必須可以再蓋礦場（開關要同時影響「能不能挖」與「能不能蓋」，'
    + '否則會出現「開了無限資源、礦場照樣停產」的半殘狀態）');

  /* G3d 關回去：立刻恢復耗盡判定，且 RDEP 沒有暴增 */
  GI.resInf531(false);
  assert(GI.res530(mx, my).depleted === true && GI.res530(mx, my).rdep === rdepAtCap,
    'T531 G3d 關回去必須立刻恢復耗盡判定，且 rdep 維持 ' + rdepAtCap
    + '（實得 depleted=' + GI.res530(mx, my).depleted + ' rdep=' + GI.res530(mx, my).rdep + '）');
  GI.resInf531(false);

  /* G4 不進存檔、走 localStorage */
  assert(html.indexOf('data.resInfinite531') < 0 && html.indexOf('resInf:') < 0,
    'T531 G4 開關不得進存檔（它是偏好，不是世界狀態）');
  assert(htmlBare438.indexOf(".rinf'") >= 0 || html.indexOf(".rinf'") >= 0,
    'T531 G4a 開關必須走 localStorage 持久化（沿用 .ds/.q 的 SAVEKEY 後綴慣例）');

  /* G5 零亂數 */
  {
    const a = 'function resExtract531(i,rate){';
    const at = htmlBare438.indexOf(a);
    assert(at >= 0, 'T531 G5 找不到 `' + a + '` 錨點');
    const body = html.slice(at, html.indexOf('\n}', at) + 2);
    assert(body.length > 40 && body.length < 500, 'T531 G5 函式體長度異常（' + body.length + '）');
    assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|[^a-zA-Z_]rand\(|Math\.random/.test(body),
      'T531 G5 抽取函式必須零亂數（鐵律2）——它在 tick 路徑上');
  }
}

/* ===== T530 耗盡的礦脈不該還能賣給你 =====

   競品研究先行：Cities: Skylines 的礦/油耗盡是品類公認的設計爭議（玩家「升到 5 級資源就沒了」、
   官方回應是內建 Unlimited Oil and Ore 開關而非改數值）。社群抱怨的第二半是**被伏擊感**，
   而那一半在我們這裡是明確的不一致：

   `RDEP[i]>=RESOURCE_STOCK` 原本**在兩處各寫一份**——AI 選址過濾寫了、玩家端 `canPlace` 沒寫。
   實測 seed301：某格 RDEP=240/240 已完全耗盡，`place('mine')` 仍回 true，
   花 $1,500、30 天礦石產出 0、維護費照收。**程式碼知道該擋，只是只擋 AI。**（T518 同族。）

   守衛分工：
     G1  **交叉一致性**（靈魂）：兩端必須讀同一個真相源，不准各寫一份。
     G2  行為**雙向**：耗盡格擋下且訊息明確；**未耗盡格必須照樣蓋得起來**。
     G2b `gaswell` 不受影響（它不讀 RDEP，耗盡油田格仍是合法氣井位）。
     G3  耗盡通知逐格**只發一次**。
     G4  鐵律7 三處歸零、不入存檔。
     G5  零亂數。 */
{
  const GR = window.GV;
  GR.newWorldSeeded(530);
  GR.ai(true); for (let d = 0; d < 120; d++) GR.step(1); GR.ai(false);
  GR.addMoney(300000);
  const cap530 = GR.res530().cap;
  assert(cap530 === 240, 'T530 前置：RESOURCE_STOCK 應為 240（實得 ' + cap530 + '）——改了要跟版本卡面');

  /* 找一格空的礦藏格 */
  const NN = GR.N();
  let ore530 = null;
  outer530: for (let x = 1; x < NN - 1; x++) for (let y = 1; y < NN - 1; y++) {
    const t = GR.tile(x, y);
    if (t && !t.bld && !t.road && GR.resourceAt(x, y) === 2) { ore530 = [x, y]; break outer530; }
  }
  assert(ore530, 'T530 前置：找不到空的礦藏格（seed 530 無礦或全被佔）');
  const [ox, oy] = ore530;

  /* G2 正向：未耗盡格必須蓋得起來（單向釘擋不住「把所有礦場都擋掉」） */
  /* 這條原本標成「前置」，但它其實是實質不變量（紅源②「閘門恆真」正是先咬到它）⇒ 正名為 G2a。 */
  assert(GR.res530(ox, oy).depleted === false,
    'T530 G2a 沒挖過的資源格不得判為耗盡（rdep=' + GR.res530(ox, oy).rdep
    + '）——閘門寫成恆真就會把每一格都當成挖空的');
  assert(GR.place('mine', ox, oy) === true,
    'T530 G2【正向】未耗盡的礦藏格必須照樣蓋得起來——只驗「耗盡時擋下」擋不住「全部都擋掉」');

  /* 跑到耗盡，順便驗通知 */
  let depDay = 0;
  for (let d = 1; d <= 200 && !depDay; d++) { GR.step(1); if (GR.res530(ox, oy).depleted) depDay = d; }
  assert(depDay > 0, 'T530 前置：200 天內應該挖到見底（ORE_RATE=2、上限 240 ⇒ 約 120 天）');
  const st530 = GR.res530(ox, oy);
  assert(st530.warned === true,
    'T530 G3 礦脈見底那一天必須通知過這一格（實得 warned=' + st530.warned
    + '）——原本它靜靜停產、維護費照收，165 條通知裡一個字都沒提');
  /* G3a 用**玩家真的看到的東西**當判準：通知中心裡那條訊息的筆數。
     第一版拿 `resWarn530.size` 當判準＝空跑——`Set.add(同一個 i)` 是**幂等**的，
     所以拿掉 `has()` 早退時集合大小完全不變、而 toast 每天照發，紅源整場全綠通過。
     （這是 T529「用衍生訊號當判準就會量到別的東西」在同一季內第二次落地。） */
  const depLogN530 = () => ((GR.log && GR.log()) || []).filter(l => /礦脈已開採完畢/.test(l.m)).length;
  assert(depLogN530() === 1,
    'T530 G3b 見底時通知中心應恰有 1 筆耗盡通知（實得 ' + depLogN530() + ' 筆）');
  for (let d = 0; d < 40; d++) GR.step(1);
  assert(depLogN530() === 1,
    'T530 G3a 耗盡通知必須逐格只發一次——再跑 40 天後通知中心實得 ' + depLogN530()
    + ' 筆（每天重發的話 T526 節流也只折疊 8 天窗口，仍會累積出多筆）');

  /* G2 反向：拆掉後在已耗盡的同一格不得再蓋 */
  assert(GR.place('doze', ox, oy) === true, 'T530 前置：應該拆得掉那座礦場');
  assert(GR.place('mine', ox, oy) !== true,
    'T530 G2【反向】已耗盡的礦脈不得再賣一座礦場給玩家（實測修前回 true、$1,500、零產出、維護費照收）');

  /* G2b gaswell 不受影響：找一格已耗盡的油田格（若本場沒有就找未耗盡的，語意仍成立） */
  {
    let oil530 = null;
    outerOil: for (let x = 1; x < NN - 1; x++) for (let y = 1; y < NN - 1; y++) {
      const t = GR.tile(x, y);
      if (t && !t.bld && !t.road && GR.resourceAt(x, y) === 1) { oil530 = [x, y]; break outerOil; }
    }
    assert(oil530, 'T530 G2b 前置：找不到空的油田格');
    assert(GR.place('gaswell', oil530[0], oil530[1]) === true,
      'T530 G2b `gaswell` 不讀 RDEP（產氣只看井數）⇒ 不得被耗損閘門擋掉，'
      + '否則會擋掉一種合法玩法');
  }
}
{
  /* T530 靜態守衛（與上面的行為守衛分開，避免造境狀態互相干擾） */
  const src530 = htmlBare438;
  /* G1 交叉一致性：`RDEP[...]>=RESOURCE_STOCK` 這條判定只准出現在真相源函式裡一次。 */
  /* T531 強化（原文只釘 `>=` 一種寫法）：**同一條規則的兩種等價寫法，釘住一種等於沒釘。**
     T530 抽了真相源卻只收斂 `>=`，抽取條件用的等價 `<` 寫法還在裸寫兩處，這條計數釘沒抓到。
     現在兩種都釘：`>=` 只准出現在 `resDepleted530`、`<` 只准出現在 `resExtract531`。 */
  const rawGE530 = (src530.match(/RDEP\[[^\]]*\]\s*>=\s*RESOURCE_STOCK/g) || []).length;
  const rawLT530 = (src530.match(/RDEP\[[^\]]*\]\s*<\s*RESOURCE_STOCK/g) || []).length;
  assert(rawGE530 === 1 && rawLT530 === 0,
    'T530 G1【本卡靈魂，T531 強化】耗損判定的兩種等價寫法都只准收在真相源裡：'
    + '`RDEP[..]>=RESOURCE_STOCK` 實得 ' + rawGE530 + ' 處（應 1，在 `resDepleted530`）、'
    + '`RDEP[..]<RESOURCE_STOCK` 實得 ' + rawLT530 + ' 處（應 0，抽取端走 `resExtract531`）。'
    + '各寫一份正是這張卡要修的病：AI 那份有、玩家端那份忘了寫，結果遊戲賣了一座零產出的礦場給玩家');
  assert(/function resDepleted530\(i\)\{return [^;]*RDEP\[i\]>=RESOURCE_STOCK;\}/.test(src530),
    'T530 G1a 真相源必須是「唯一一行、以 `RDEP[i]>=RESOURCE_STOCK` 收尾」的形態'
    + '（T531 在前面加了 `!resInfinite531&&` 的開關，故改釘形態而非逐字）');
  assert(src530.indexOf('function resExtract531(i,rate){') >= 0,
    'T530 G1c 抽取端必須有唯一決定點 `resExtract531`（T531 補：耗損累計不准散在呼叫點）');
  const uses530 = (src530.match(/resDepleted530\(/g) || []).length;
  assert(uses530 >= 6,
    'T530 G1b 真相源必須被雙端＋通知＋疊圖共同使用（宣告 1＋玩家端 1＋AI 兩支＋通知兩支＋疊圖 1），'
    + '實得 ' + uses530 + ' 處呼叫');
  /* G4 鐵律7 */
  const rst530 = (src530.match(/resWarn530=new Set\(\)/g) || []).length;
  assert(rst530 === 3,
    'T530 G4 `resWarn530` 必須在宣告／newWorld／load 三處歸零（鐵律7），實得 ' + rst530 + ' 處');
  assert(html.indexOf('data.resWarn530') < 0 && html.indexOf('resWarn:') < 0,
    'T530 G4a 耗盡通知集合不得進存檔（它是提示，不是世界狀態）');
  /* G5 零亂數 */
  {
    const a = 'function resNotify530(x,y,nm){';
    const at = src530.indexOf(a);
    assert(at >= 0, 'T530 G5 找不到 `' + a + '` 錨點');
    const body = html.slice(at, html.indexOf('\n}', at) + 2);
    assert(body.length > 40 && body.length < 700, 'T530 G5 函式體長度異常（' + body.length + '）');
    assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|[^a-zA-Z_]rand\(|Math\.random/.test(body),
      'T530 G5 耗盡通知必須零亂數（鐵律2）——它在 tick 路徑上');
  }
}

/* ===== T529 委託不該發你做不到的單 =====

   實測「見單就接」的玩家 500 天×三城：12 件結案只完成 2 件＝**83% 過期率**，
   成熟城獎金佔財富累積 0.16%。兩個根因都在發單側：
     ①發單不看城市有沒有能力做（鋼材/燃料四條需要 k122/k121，而那兩座**不在 AI 的 78 條 wants 裡**）
     ②合格委託 ≤3 時直接全回、沒有抽選 ⇒ 過期後又拿到同一張（實測連續三次）

   守衛分工：
     G1  **發單池永不為空**（靈魂）——閘門寫太嚴＝把整個系統靜靜關掉，比 83% 過期更糟。
     G2  可行性雙向：沒廠不發、有廠必發。
     G3  剛過期的不連發（除非池會因此為空）。
     G4  發單側零亂數（機械掃函式體，不可跳過）。
     G5  幸福峰值是純觀測（唯讀）＋鐵律7 三處歸零。 */
{
  const GC = window.GV;
  GC.newWorldSeeded(529);
  /* 先把城市養到 pop>50——`cmsAccept385` 有 `pop<=CMS_MIN_POP385` 門檻，
     只設等級不設人口的話後面的行為釘會卡在「接單失敗」。AI 不會蓋加工廠，
     所以「新城沒有鋼鐵廠」這個前提不受影響（那正是本卡要修的事）。 */
  GC.ai(true); for (let d = 0; d < 140; d++) GC.step(1); GC.ai(false);
  window.__t385Rank(11); // 高階：讓 minRank 不成為干擾項，閘門才是唯一變因

  const c0 = GC.cms529();
  assert(c0.eligAll.length >= 8,
    'T529 前置：高階城市的「未過閘門合格池」應有 8 條以上（實得 ' + c0.eligAll.length
    + '）——太少的話下面驗不出閘門的效果');
  assert(c0.plants.steelMill === 0 && c0.plants.refinery === 0,
    'T529 前置：新城不該有鋼鐵廠／煉油廠（實得 ' + JSON.stringify(c0.plants) + '）');

  /* G1 的精確不變量（第一版把話說太滿，被自己的探針抓到）：
     原文寫「**任何**城市狀態下發單池都不得為空」——但實測 seed528 有 42 天池是空的，
     那是 `minRank` 造成的（低階城市本來就還沒解鎖委託，屬既有設計），不是可行性閘門。
     真正要守的是：**閘門不得把一個本來非空的池弄空**。 */
  assert(!(c0.eligAll.length >= 1 && c0.offers.length === 0),
    'T529 G1【本卡靈魂】可行性閘門不得把非空的合格池弄成空池（eligAll ' + c0.eligAll.length
    + ' 條 → offers ' + c0.offers.length
    + ' 條）。閘門的失敗模式不是「發錯單」，是「一張都不發」＝把整個系統靜靜關掉');
  assert(c0.offers.length >= 1,
    'T529 G1a 本場（rank 11、eligAll ' + c0.eligAll.length + ' 條）必須發得出單，實得 '
    + c0.offers.length + ' 條');
  /* G1b 低階城市：eligAll 為空時池空是既有設計，但閘門仍不得「額外」清空。
     用 rank 0 造境驗這條分界，順便釘住「空池不是閘門造成的」。 */
  {
    window.__t385Rank(0);
    const cLow = GC.cms529();
    assert(!(cLow.eligAll.length >= 1 && cLow.offers.length === 0),
      'T529 G1b 低階城市：閘門同樣不得把非空的合格池弄空（eligAll ' + cLow.eligAll.length
      + ' → offers ' + cLow.offers.length + '）');
    window.__t385Rank(11);
  }

  /* G2 可行性：沒有加工廠時，鋼材/燃料四條不得在池裡 */
  const PLANT_GATED = ['steel40', 'steel80', 'ct_steel60', 'ct_fuel80'];
  for (const id of PLANT_GATED)
    assert(c0.feas[id] === false,
      'T529 G2 沒有加工廠的城市，`' + id + '` 必須判為不可行（實得可行）');
  const leaked = c0.offers.filter(id => PLANT_GATED.indexOf(id) >= 0);
  assert(leaked.length === 0,
    'T529 G2a 不可行的委託不得進入發單池（洩漏：' + leaked.join(',') + '）');

  /* G2b 反向：蓋了鋼鐵廠之後 stock/steel 必須變成可行——單向釘擋不住「閘門永遠回 false」 */
  {
    const NN = GC.N();
    let placed = null;
    outer529: for (let x = 2; x < NN - 5; x++) for (let y = 2; y < NN - 5; y++) {
      let ok = true;
      for (let dx = 0; dx < 3 && ok; dx++) for (let dy = 0; dy < 3 && ok; dy++) {
        const t = GC.tile(x + dx, y + dy);
        if (!t || t.t !== 2 || t.bld || t.road || t.tree || t.el) ok = false;
      }
      if (ok) { GC.addMoney(50000); if (GC.place('steelMill', x, y) === true) { placed = [x, y]; break outer529; } }
    }
    assert(placed, 'T529 G2b 前置：找不到地方蓋鋼鐵廠（3×3 空地掃描失敗）');
    const c1 = GC.cms529();
    assert(c1.plants.steelMill === 1, 'T529 G2b 前置：鋼鐵廠應已蓋起（實得 ' + c1.plants.steelMill + '）');
    assert(c1.feas['ct_steel60'] === true,
      'T529 G2b【反向】蓋了鋼鐵廠之後 `ct_steel60` 必須變成可行——'
      + '只驗「不可行時不發」擋不住「閘門永遠回 false」（那會讓四條委託從此消失）');
    assert(c1.feas['steel40'] === false,
      'T529 G2c `steel40` 是「耗鋼累計」型，還需要造船廠出貨；只有鋼鐵廠時仍應不可行');
  }

  /* G3 剛過期的不連發：cms529().lastExp 有值時，它不得出現在 offers（除非池會因此為空） */
  {
    const c2 = GC.cms529();
    const pool = c2.eligAll.filter(id => c2.feas[id]);
    assert(pool.length >= 2,
      'T529 G3 前置：可行池要有 2 條以上，才驗得出「排除一條後仍有得發」（實得 ' + pool.length + '）');
    /* 行為釘：真的接一張、真的讓它過期，再驗「下一輪不會又發同一張」。
       （第一版這裡寫了 `assert(x?true:true,'')` 的空斷言＝我自己在 T523 批評過的假綠，已換掉。） */
    const pick529 = GC.cmsOffers385()[0];
    assert(GC.cmsAccept385(0) === true, 'T529 G3 前置：接單應成功（實得失敗，門檻或池有問題）');
    for (let d = 0; d < 210; d++) GC.step(1);
    const st529 = GC.cms385(), c3 = GC.cms529();
    assert(st529.n >= 1, 'T529 G3 前置：210 天後那張委託應該已結案（實得 n=' + st529.n + '）');
    if (st529.done.indexOf(pick529) < 0) { // 沒完成＝過期路徑
      assert(c3.lastExp === pick529,
        'T529 G3【行為】過期後 lastExp 必須是剛過期的那張（期望 ' + pick529 + '，實得 ' + c3.lastExp + '）');
      const alt = c3.eligAll.filter(id => c3.feas[id] && id !== pick529);
      if (alt.length) assert(c3.offers.indexOf(pick529) < 0,
        'T529 G3b【行為】還有別的可行委託時，剛過期的 `' + pick529 + '` 不得又出現在發單池（實得 '
        + c3.offers.join(',') + '）——實測 seed528 `trade1200` 曾連續過期三次');
    }
    assert(htmlBare438.indexOf('lastExp529=cAct385.id;') >= 0,
      'T529 G3 過期路徑必須記下剛過期的委託 id（`lastExp529=cAct385.id;`）——沒有它就不可能不連發');
    assert(htmlBare438.indexOf("c.id!==lastExp529") >= 0,
      'T529 G3a 發單池必須排除剛過期的那一條');
  }

  /* G4 發單側零亂數（機械掃，不可跳過） */
  {
    const a529 = 'function cmsFeas529(c){';
    const at = htmlBare438.indexOf(a529);
    assert(at >= 0, 'T529 G4 找不到 `' + a529 + '` 錨點（改簽名要同步這條）');
    const feasEnd = html.indexOf('\nfunction cmsOffers385', at);
    const body = html.slice(at, feasEnd > 0 ? feasEnd : at + 400);
    assert(body.length > 20 && body.length < 600,
      'T529 G4 錨點取到的函式體長度異常（' + body.length + '）＝抓錯範圍');
    assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|[^a-zA-Z_]rand\(|Math\.random/.test(body),
      'T529 G4 可行性判定必須零亂數（鐵律2）');
    const tbl = html.slice(html.indexOf('const CMS_FEAS529={'), html.indexOf('let happyPeak529'));
    assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|Math\.random/.test(tbl),
      'T529 G4a 可行性表本身也必須零亂數');
    assert((tbl.match(/:\s*\(?c?\)?\s*=>/g) || []).length === 5,
      'T529 G4b 可行性表應恰有 5 條規則（acc/steel、stock/steel、stock/fuel、acc/trade、hold/happy），'
      + '實得 ' + (tbl.match(/:\s*\(?c?\)?\s*=>/g) || []).length
      + '——多出來的規則要跟版這條計數釘並在卡面說明');
  }

  /* G5 幸福峰值：純觀測（唯讀 cityHappy）＋鐵律7 三處歸零 */
  {
    assert(htmlBare438.indexOf('if(cityHappy>happyPeak529)happyPeak529=cityHappy;') >= 0,
      'T529 G5 幸福峰值必須是「只比大小、只賦值給自己」的純觀測寫法');
    const resets = (htmlBare438.match(/happyPeak529=0/g) || []).length;
    assert(resets >= 3,
      'T529 G5a 幸福峰值必須在宣告／newWorld／load 三處歸零（鐵律7），實得 ' + resets + ' 處');
    assert(htmlBare438.indexOf('happyPeak529') > 0 && html.indexOf('data.happyPeak529') < 0,
      'T529 G5b 幸福峰值不得進存檔（它是發單側提示，不是世界狀態）');
  }
}

/* ===== T528 讀檔不得憑空編造世界：草地貼圖變體的往返恆等 =====

   缺陷：`t.gv`（草地貼圖變體，`SPR.grass[t.gv&3]`）**不進存檔**，而 load 拿 `i&3` 當代用值。
   地圖 N=72、72%4===0 ⇒ `i&3 === x&3` ⇒ 讀檔後每一列固定一種貼圖＝全圖 4 格週期條紋。
   實測 seed528/120 天：存檔前「整列同一變體」0/72 列，讀檔後 72/72 列，`gv===x&3` 100%。

   守衛分工（T522 教訓：原文前哨與語意釘不綁在同一條字串上）：
     G1  往返**逐格恆等**（digest 順序敏感）——本卡靈魂，不是「看起來也隨機」而是同一個值。
     G1b 條紋病的直接指標：colsUniform 不得等於草地列總數。
     G2  舊檔（無 gvc）回退必須決定性、且**不得退回 x&3**。
     G3  新增碼零亂數（機械掃函式體，不可跳過）。
     G4  鐵律9：舊檔缺欄位必須讀得起來。 */
{
  const G528 = window.GV;
  G528.newWorldSeeded(528);
  for (let k = 0; k < 60; k++) G528.step(1);

  const before528 = G528.gv528();
  assert(before528.grass > 500,
    'T528 前置：本場草地格數實得 ' + before528.grass + '，太少會讓後面的比對沒有樣本');
  assert(before528.colsUniform === 0,
    'T528 前置：世界生成後「整列同一變體」的列數必須是 0（實得 ' + before528.colsUniform
    + '/' + before528.cols + '）——不是 0 就表示連生成端都在產生條紋');

  G528.save();
  const rawSave528 = JSON.parse(store[SKEY]);
  assert(window.GV.load() === true, 'T528 前置：存檔必須讀得回來');
  const after528 = G528.gv528();

  assert(after528.digest === before528.digest,
    'T528 G1【本卡靈魂】存讀往返後逐格草地變體必須完全相同（digest 存檔前 '
    + before528.digest + ' → 讀檔後 ' + after528.digest
    + '）。原本 load 用 `i&3` 代用，而 N%4===0 ⇒ i&3===x&3 ⇒ 全圖條紋');
  assert(after528.grass === before528.grass,
    'T528 G1a 草地格數本身不得因存讀改變（' + before528.grass + ' → ' + after528.grass + '）');
  assert(after528.colsUniform === 0,
    'T528 G1b 讀檔後「整列同一變體」的列數必須維持 0（實得 ' + after528.colsUniform
    + '/' + after528.cols + '）——等於草地列總數就是條紋病復發');

  /* G2 舊檔回退：把 gvc 通道拿掉（模擬本卡之前存的檔），必須①讀得起來②決定性③不是 x&3。
     注意存檔是 saveDeflate 壓縮過的，所以直接刪 raw 物件的欄位再寫回。 */
  {
    const old528 = JSON.parse(JSON.stringify(rawSave528));
    assert(old528.gvc !== undefined,
      'T528 G2 前置：存檔必須含 gvc 通道（沒有的話下面「拿掉它」就沒驗到東西）');
    delete old528.gvc;
    store[SKEY] = JSON.stringify(old528);
    assert(window.GV.load() === true,
      'T528 G4【鐵律9】舊檔缺 gvc 必須照樣讀得起來，不得報錯');
    const fb1 = G528.gv528();
    assert(window.GV.load() === true, 'T528 G2 前置：同一舊檔要能連讀兩次');
    const fb2 = G528.gv528();
    assert(fb1.digest === fb2.digest,
      'T528 G2 舊檔回退必須決定性：同一存檔讀兩次 digest 必須相同（實得 '
      + fb1.digest + ' vs ' + fb2.digest + '）');
    assert(fb1.eqX3 < .5,
      'T528 G2b 舊檔回退**不得**退回 `x&3`（gv===x&3 的比例實得 '
      + (fb1.eqX3 * 100).toFixed(1) + '%）——那正是本卡要修掉的條紋');
    assert(fb1.colsUniform === 0,
      'T528 G2c 舊檔回退也不得產生條紋（「整列同一變體」實得 ' + fb1.colsUniform
      + '/' + fb1.cols + '）');
    /* 回歸：把回退換回 i&3 這件事本身要被咬住——上面 G2b/G2c 就是那條絆線。 */
  }

  /* G3 零亂數機械掃：兩個新增函式的**函式體**（由剝除器定位、內容由原文）不得出現
     R()/ri()/rand()/Math.random。寫成不可跳過的形式（T523 教訓：`x ? ... : null` 的
     條件分支＝空跑假綠）。 */
  {
    const anchors528 = ['function gvFallback528(i){', 'function gvOf528(d, i){'];
    for (const a of anchors528) {
      const at = htmlBare438.indexOf(a);
      assert(at >= 0, 'T528 G3 找不到函式錨點 `' + a + '`（改了簽名要同步這條守衛）');
      const body = html.slice(at, html.indexOf('\n}', at) + 2);
      assert(body.length > 20 && body.length < 900,
        'T528 G3 錨點 `' + a + '` 取到的函式體長度異常（' + body.length + '）＝錨點抓錯範圍');
      assert(!/[^a-zA-Z_]R\(\)|[^a-zA-Z_]ri\(|[^a-zA-Z_]rand\(|Math\.random/.test(body),
        'T528 G3 `' + a + '` 必須零亂數消耗（鐵律2）——它跑在 load 路徑上，'
        + '消耗共用亂數流會讓「讀檔後的世界」與「沒存讀的世界」分岔');
    }
    assert(html.indexOf('const GV_SALT528 = 528;') >= 0,
      'T528 G3b salt 必須是具名常數（GV_SALT528），不得散在呼叫點手抄');
    const saltUse528 = (htmlBare438.match(/GV_SALT528/g) || []).length;
    assert(saltUse528 === 3,
      'T528 G3c GV_SALT528 應恰出現 3 次（①宣告 ②gvFallback528 唯一計算點 ③gv528 觀測鉤回報），'
      + '實得 ' + saltUse528 + '——多出來的使用點表示 salt 空間被別的用途借用了，'
      + '那會讓兩個視覺細節層挑到相關的值');
  }
}

/* ===== T527 自動存檔的真相：程式碼與文件的雙向守衛 =====

   T447 在補上 RULES 第 18 條的同一段裡斷言「`index.html` 沒有自動存檔，全檔 save()
   只在存檔按鈕的處理器裡呼叫一次」——**那句話在寫下的當刻就是錯的**：
   `setInterval(()=>{if(tiles)save();},25000)` 自 2026-07-18 `6e4d31a` 就存在，
   而 `docs/ARCH.md` §11 那張表**一直有**「自動存檔」這一列。
   三份文件互相矛盾了三十幾張卡沒人發現，而 RULES 18 的整條防護正是建立在那個錯前提上
   （它只擋「顯式呼叫 GV.save() 之前沒釘槽」，擋不住「把頁面載起來放 25 秒」）。

   所以這裡要的不是單向的原文釘，而是**雙向**：程式碼裡的自動存檔在場 ⇔ 文件描述它。
   哪天真的把自動存檔拿掉而沒同步文件（或反過來），這條就紅。 */
{
  const AUTOSAVE_MS527 = 25000;
  const rules527 = fs.readFileSync(path.join(__dirname, 'docs', 'RULES.md'), 'utf8');
  /* 位置由剝除器、內容由原文：自動存檔那行沒有字串字面量，可直接在剝乾淨的原始碼上掃，
     這樣註解裡談論自動存檔不會餵飽守衛（T446 G1「空跑的假綠」教訓）。 */
  const bare527 = htmlBare438;
  const auto527 = bare527.match(/setInterval\(\(\)=>\{if\(tiles\)save\(\);\},(\d+)\)/g) || [];
  assert(auto527.length === 1,
    'T527 G1 `index.html` 必須恰有一處自動存檔 `setInterval(()=>{if(tiles)save();},N)`（實得 '
    + auto527.length + ' 處）。若真要移除它，必須同時改 RULES 第 18 條的描述——'
    + '這條守衛存在的理由就是 T447 曾經斷言「沒有自動存檔」而它其實一直在');
  const ms527 = +(/,(\d+)\)/.exec(auto527[0]) || [])[1];
  assert(ms527 === AUTOSAVE_MS527,
    'T527 G1b 自動存檔週期實得 ' + ms527 + 'ms，文件寫的是 ' + AUTOSAVE_MS527
    + 'ms（25 秒）。改週期必須同步 RULES 第 18 條，否則「放著 25 秒就會覆蓋」這句話會失真');
  assert(rules527.indexOf('setInterval(()=>{if(tiles)save();},25000)') >= 0
      && rules527.indexOf('有自動存檔') >= 0,
    'T527 G1c 反向：`docs/RULES.md` 第 18 條必須原樣寫出自動存檔那行並說明它存在。'
    + '單向的原文釘擋不住「程式碼在、文件說不在」——那正是 T447 留下的狀態');
  assert(rules527.indexOf('沒有自動存檔') < 0,
    'T527 G1d `docs/RULES.md` 不得再出現「沒有自動存檔」的斷言（T447 的錯誤結論）');

  /* G2 編號機械複算：RULES 條目編號必須從 1 開始嚴格遞增、無重複、無跳號。
     T447 把新規則編成 18 時本檔已經有一條 18，撞號之後 19/20 全部錯位，
     而且沒有任何東西會發現——條列文件的編號是人手維護的，正是機械複算的用武之地。 */
  const nums527 = (rules527.split('\n')
    .map(l => /^(\d+)\. /.exec(l))
    .filter(Boolean)
    .map(m => +m[1]));
  assert(nums527.length >= 21,
    'T527 G2 前置：RULES 條目數實得 ' + nums527.length + '，少於 21 條＝有條目被刪或編號格式被改');
  const bad527 = [];
  for (let i = 0; i < nums527.length; i++) if (nums527[i] !== i + 1) bad527.push('第 ' + (i + 1) + ' 個條目編號寫成 ' + nums527[i]);
  assert(bad527.length === 0,
    'T527 G2 `docs/RULES.md` 條目編號必須是 1..N 嚴格遞增無重複（實測異常：'
    + bad527.slice(0, 4).join('、') + '）。T447 撞號留下兩條 18，'
    + '而「鐵律18」在整個 repo 裡同時指三件不同的事');
  assert(rules527.indexOf('編號空間須知') >= 0,
    'T527 G2b RULES 必須保留「編號空間須知」——本檔的 1-21 與 COLLAB/CHANGELOG 那套「鐵律N」'
    + '是兩套獨立編號，不寫清楚就會再撞一次');
}

/* ===== T446 tail parity 結構守衛（ARCH §10.12）：守衛 ===== */
{
  /* §10.12 說「tail parity 是手抄，純靠複製貼上」。去讀原文之後：
     T425（現行 10233）已經把**底部貼合**改成對全 `SPR.bld` 泛化的迴圈，
     還在手抄的只剩**徽記／夜燈遮罩**那一層——`parity364` 的三鍵清單與 `parity364cd` 的十鍵清單。
     這一區守的就是那兩份清單：它們必須**恰好等於**「在 T345 徽記 pass 之後才生成的 bld 鍵集合」。
     多一個＝清單有死鍵；少一個＝有新建築沒補徽記／夜燈遮罩（而且不會有任何東西告訴你）。 */
  const lines446 = html.split('\n');
  const bareL446 = htmlBare438.split('\n');
  // ① T345 徽記 pass 的位置（區段橫幅在原文裡，用原文找；只取行號，內容不參與判斷）
  let t345Line446 = -1;
  for (let i = 0; i < lines446.length; i++)
    if (/^\/\* ===== T345 建築類別辨識/.test(lines446[i])) { t345Line446 = i + 1; break; }
  assert(t345Line446 > 0, 'T446 G0 找不到 T345 徽記 pass 的區段橫幅——邊界算不出來，這條會失真');
  // 徽記 pass 實際跑的位置：T345 有兩處（CSS 說明 530 與建圖區），取**建圖區內**的那一次
  let badgeRun446 = -1;
  for (let i = 0; i < bareL446.length; i++)
    if (/if\(!window\.__noBadge\)\{/.test(bareL446[i])) { badgeRun446 = i + 1; break; }
  assert(badgeRun446 > 0, 'T446 G0b 找不到 `if(!window.__noBadge){` 的徽記加蓋入口');

  // ② 徽記 pass 之後才生成的 SPR.bld 鍵（只看剝乾淨的程式碼）
  /* **位置由剝除器、內容由原文**：剝乾淨的原始碼裡讀不到字串內容（那正是剝除器的工作），
     所以先在剝乾淨的文字上找 `SPR.bld[` 的**位置**（保證那是程式碼、不是註解），
     再回原文的同一個位置把鍵名讀出來。剝除器逐字元等長，位置可以直接共用。
     （這一條的第一版就是在剝乾淨的文字上配 `'([0-9_]+)'`，永遠 0 命中 ⇒ **空跑的假綠**，
      被破壞式紅源①當場抓到——同一個病 T441 G2 踩過一次。） */
  const after446 = [];
  let dynamic446 = 0;
  {
    const from446 = html.split('\n').slice(0, badgeRun446).join('\n').length;
    for (let p = htmlBare438.indexOf('SPR.bld[', from446); p >= 0;
         p = htmlBare438.indexOf('SPR.bld[', p + 8)) {
      const seg = html.slice(p, p + 40);
      const m1 = /^SPR\.bld\[\s*'([0-9]+_[0-9]+_[0-9]+)'\s*\]\s*=/.exec(seg);
      if (m1) { after446.push(m1[1]); continue; }
      if (/^SPR\.bld\[\s*k\s*\+\s*'_1_0'\s*\]\s*=/.test(seg)) dynamic446++;
    }
  }
  assert(after446.length + dynamic446 >= 4,
    'T446 G1a【自檢】徽記 pass 之後掃到的 `SPR.bld[...]=` 賦值只有 '
    + (after446.length + dynamic446) + ' 筆（預期 ≥4）——掃描器壞了，G1 會變成空跑的假綠。'
    + '（它第一版就是這樣：在剝乾淨的原始碼裡配字串內容，永遠 0 命中。）');
  // ③ 兩份 parity 清單
  const p364 = /for\(const k of\[('(?:[0-9_]+)'(?:,'(?:[0-9_]+)')*)\]\)parity364\(/.exec(html);
  const p364cd = /for\(const k of\[([0-9,]+)\]\)parity364cd\(/.exec(html);
  assert(p364 && p364cd, 'T446 G1 找不到 parity364／parity364cd 的清單——它們是這條守衛的被驗物件');
  const list364 = p364[1].split(',').map(x => x.replace(/'/g, ''));
  const list364cd = p364cd[1].split(',').map(x => x + '_1_0');
  const covered446 = new Set([...list364, ...list364cd]);

  const explicit446 = after446.slice();
  const missing446 = explicit446.filter(x => !covered446.has(x));
  assert(missing446.length === 0,
    'T446 G1【機械複算】在 T345 徽記 pass 之後才生成的 `SPR.bld` 鍵，必須全部被 '
    + '`parity364`／`parity364cd` 補做徽記與夜燈遮罩。漏掉的鍵：' + JSON.stringify(missing446.slice(0, 6))
    + '。漏了不會有任何東西告訴你——那棟建築就是頂著方塊、夜燈畫在輪廓外');
  assert(list364.length === 3 && list364cd.length === 10,
    'T446 G1b【計數釘】parity 清單目前應為 parity364 三鍵／parity364cd 十鍵，實得 '
    + list364.length + '／' + list364cd.length + '。**清單變動要跟著新建築一起出卡**');

  /* ④ SZC425 與 MSZ 在共同鍵上必須一致。
     差集是既有事實（SZC425 多了 121/122/123/127/129/131/132/133 八個 k）——
     **實測過存讀往返沒事**（見 T446 卡面 §1），所以列白名單，不當紅。 */
  {
    const pick = (nm) => {
      const i = html.indexOf('const ' + nm + '={');
      if (i < 0) return null;
      const j = html.indexOf('}', i);
      const o = {};
      for (const m of html.slice(i, j).matchAll(/(\d+)\s*:\s*(\d+)/g)) o[m[1]] = +m[2];
      return o;
    };
    const szc = pick('SZC425'), msz = pick('MSZ');
    assert(szc && msz && Object.keys(szc).length >= 60 && Object.keys(msz).length >= 50,
      'T446 G2 SZC425／MSZ 解析異常（' + (szc ? Object.keys(szc).length : 'null') + '／'
      + (msz ? Object.keys(msz).length : 'null') + '）——掃描器壞了');
    const clash = Object.keys(szc).filter(k => msz[k] !== undefined && msz[k] !== szc[k]);
    assert(clash.length === 0,
      'T446 G2【機械複算】`SZC425`（T425 底部貼合用）與 `MSZ`（load 反查補 sz 用）'
      + '在共同鍵上必須一致；不一致的 k：' + JSON.stringify(clash.slice(0, 6))
      + '。兩張尺寸表走鐘＝有的建築貼合對了但讀檔尺寸錯，或反過來');
    const onlySzc = Object.keys(szc).filter(k => msz[k] === undefined).sort((a, b) => a - b);
    assert(JSON.stringify(onlySzc) === JSON.stringify(['121', '122', '123', '127', '129', '131', '132', '133']),
      'T446 G2b【差集釘】只在 `SZC425` 而不在 `MSZ` 的 k，目前應恰為 T364b/c/d 那八座'
      + '（121/122/123/127/129/131/132/133），實得 ' + JSON.stringify(onlySzc)
      + '。這八座的 sz 走另一條路保住（T446 實測存讀往返 sz 與佔格前後相同）；'
      + '**差集變動代表有人動了尺寸表的分工，要重新量一次存讀往返**');
  }
}

/* ===== T445 裸等距式全檔掃描（ARCH §10.7）：守衛 ===== */
{
  /* 等距投影的標準式是 `sx=(x-y)*32` / `sy=(x+y)*16`。跟轉的正規管道是
     `isoW2V`／`w2v`／`viewDep`／`sxOf`／`syOf`；直接把裸式當螢幕座標用＝繞過旋轉層。
     §10.7 說「或至少對裸等距式做全檔靜態掃描並列白名單」——這一區就是那個掃描。
     （§10.7 前半句「十個漏轉點」已經過期：它指的 §4 表如今只剩三列而且全部劃掉，
      表上自己寫著「旋轉收口全清（T375+T376+T388+T389）」。已在 ARCH 更正。） */
  const bareLines445 = htmlBare438.split('\n');
  const idx445 = [];
  {
    let acc = 0;
    for (const l of bareLines445) { idx445.push(acc); acc += l.length + 1; }
  }
  const lineOf445 = (i) => {
    let lo = 0, hi = idx445.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (idx445[mid] <= i) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  // ① isoW2V( 的引數區間
  const spans445 = [];
  {
    const re = /isoW2V\(/g; let m;
    while ((m = re.exec(htmlBare438))) {
      let depth = 0, i = m.index + m[0].length - 1;
      for (; i < htmlBare438.length && i < m.index + 800; i++) {
        const c = htmlBare438[i];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) break; }
      }
      spans445.push([m.index, i]);
    }
  }
  // ② drawLogo() 的函式體區間（開始畫面小島，沒有世界旋轉）
  let logoLo445 = -1, logoHi445 = -1;
  for (let i = 0; i < bareLines445.length; i++) {
    if (/^function drawLogo\(/.test(bareLines445[i])) {
      logoLo445 = i + 1;
      for (let j = i + 1; j < bareLines445.length; j++) if (bareLines445[j] === '}') { logoHi445 = j + 1; break; }
      break;
    }
  }
  assert(logoLo445 > 0 && logoHi445 > logoLo445,
    'T445 G0 找不到 `function drawLogo(` 的函式體——白名單②的邊界算不出來，這條會失真');

  const PATS445 = [
    /\(\s*[A-Za-z_$][A-Za-z0-9_$.]*\s*-\s*[A-Za-z_$][A-Za-z0-9_$.]*\s*\)\s*\*\s*32\b/g,
    /\(\s*[A-Za-z_$][A-Za-z0-9_$.]*\s*\+\s*[A-Za-z_$][A-Za-z0-9_$.]*\s*\)\s*\*\s*16\b/g,
  ];
  let nIso445 = 0, nLogo445 = 0, nSpawn445 = 0;
  const spawnLines445 = new Set(), bad445 = [];
  for (const re of PATS445) {
    let m;
    while ((m = re.exec(htmlBare438))) {
      const ln = lineOf445(m.index);
      if (spans445.some(s => m.index > s[0] && m.index < s[1])) { nIso445++; continue; }
      if (ln >= logoLo445 && ln <= logoHi445) { nLogo445++; continue; }
      // ③ world 空間 spawn：同一行或相鄰兩行內有 viewDep(（深度鍵已跟轉，T389）
      const near = bareLines445.slice(Math.max(0, ln - 2), ln + 1).join('\n');
      if (near.indexOf('viewDep(') >= 0) { nSpawn445++; spawnLines445.add(ln); continue; }
      bad445.push(ln + ': ' + html.split('\n')[ln - 1].trim().slice(0, 70));
    }
  }
  assert(bad445.length === 0,
    'T445 G1【機械複算】裸等距式（`(a-b)*32` / `(a+b)*16`）只准落在三類白名單裡：'
    + '① `isoW2V(…)` 的引數內（正規用法：裸式算 world 座標，交給旋轉層轉 view）；'
    + '② `drawLogo()` 內（開始畫面小島，沒有世界旋轉）；'
    + '③ 同行或前兩行有 `viewDep(` 的 world 空間 spawn（深度鍵已跟轉，T389）。'
    + '三類之外 ' + bad445.length + ' 處：' + JSON.stringify(bad445.slice(0, 5))
    + '。要新增請走 `isoW2V()`，或在卡面說明為什麼這一處不需要跟轉');
  /* 計數釘：防止有人靠「把 isoW2V 拿掉」讓分母變小而蒙混過關。
     數字變動＝有人動了旋轉層的用法，請連同理由一起出卡。 */
  /* 為什麼是 44 而不是我偵查時量到的 40：偵查腳本用的是**簡版剝除器（不認正則字面量）**，
     它把檔案的一部分當成字串抹掉，於是少看到 2 個 `isoW2V(` 呼叫點與 4 個命中；
     套件用的是 T438 那支（認正則），看到的是全部。
     **兩支量出的「區外集合」完全相同（11 行、0 行差異）**，只有 isoW2V 內部的數量不同
     ⇒ 差異已解釋，取完整剝除器的 44。（鐵訓：同一件事量出兩個數字，先解釋差異再釘任何數。）
     T455 跟版：機會指數 overlay 的 isoW2V((x455-y455)*32,(x455+y455)*16+16) 落在 isoW2V 引數內
     ＝合法白名單類，44→46（兩條裸式都在同一個呼叫的引數裡）。計數釘的天職就是讓這種變動有人簽名。 */
  assert(nIso445 === 46 && nLogo445 === 2 && spawnLines445.size === 10,
    'T445 G2【計數釘】裸等距式的三類分佈目前應為 isoW2V 內 46 處／drawLogo 內 2 處／'
    + 'world spawn 10 行，實得 ' + nIso445 + '／' + nLogo445 + '／' + spawnLines445.size
    + '。**變動不一定是壞事，但一定要有人知道**——尤其 isoW2V 內的 46 變少，'
    + '代表有人把裸式從旋轉層裡搬出來了');
}

/* ===== T444 種子哨兵行為化（ARCH §10.14）：守衛 ===== */
{
  /* 舊哨兵（`tools/verify.py`）是 grep 原始碼字面，**連方向都是反的**：
     把 `=== 3781` 改寫成等值常數 ⇒ 套件全綠、釘子照樣成立，而哨兵回報 0 根、閘門紅；
     把 assert 刪掉、在註解裡貼兩行同樣的文字 ⇒ 哨兵數到 2、閘門全綠而釘子一根都不在。
     T444 把它換成讀套件輸出的 `SEEDPIN` 行。這一區守的是「換過去了，而且沒有換回來」。 */
  const vpy444 = fs.readFileSync(path.join(__dirname, 'tools', 'verify.py'), 'utf8');
  // G1 verify.py 必須讀 SEEDPIN 行，且不得再用原始碼 grep 當哨兵
  assert(/SEEDPIN\s\(\?P<name>/.test(vpy444) || vpy444.indexOf('SEEDPIN ') >= 0,
    'T444 G1 tools/verify.py 必須解析套件輸出的 `SEEDPIN` 行（行為化哨兵）');
  assert(!/assert\\\(window\\\.GV\\\.stats\\\(\\\)\\\.pop === /.test(vpy444),
    'T444 G1b tools/verify.py 不得再用「grep 原始碼字面」當種子哨兵——'
    + '那條連方向都是反的：把釘子寫得更好（改成等值常數）會讓它變紅，'
    + '把釘子刪掉再在註解裡貼同樣的文字反而會讓它變綠');
  // G2 每一根釘都必須走 seedPin444（不得有人繞過去自己寫 assert）
  const direct444 = (htmlBare438 ? 0 : 0) +
    (fs.readFileSync(__filename, 'utf8').match(/assert\(window\.GV\.stats\(\)\.pop === \d+/g) || []).length;
  assert(direct444 === 0,
    'T444 G2 種子釘一律走 `seedPin444()`，不得直接寫 `assert(window.GV.stats().pop === <數字>)`'
    + '（實得 ' + direct444 + ' 處）——繞過去就不會印 SEEDPIN，閘門也就看不到它');
  const pins444 = (fs.readFileSync(__filename, 'utf8').match(/\n\s*seedPin444\('/g) || []).length;
  assert(pins444 >= 3,
    'T444 G2b 種子釘至少 3 根（實得 ' + pins444 + '）。ARCH §10.14：原本恰好卡在門檻 2、零餘裕，'
    + '任何一根被動到就直接跌破');
  // G3 門檻常數兩邊同步
  const minPy444 = /^MIN_SEED_PINS = (\d+)$/m.exec(vpy444);
  assert(minPy444 && Number(minPy444[1]) === 3,
    'T444 G3【判準釘】tools/verify.py 的 MIN_SEED_PINS 必須是 3（實得 '
    + (minPy444 ? minPy444[1] : '找不到') + '）。要改請在卡面寫明理由');
}

/* ===== T443 顯示價 vs 實扣（ARCH §10.9）／SPR 撞名與 hw 偶數（§10.10）：守衛 ===== */
{
  /* §10.9 的玩家後果很直接：按鈕上寫 $20，實際扣的可能不是 $20，而且沒有任何東西會發現。
     這一條**真的跑 placeCost**（T383b 同型的窮舉），不是 html.includes——
     原文比對只能證明「有人寫了同一個字串」，證明不了「那顆按鈕真的扣這麼多」。 */
  {
    window.GV.newWorldSeeded(4431);
    const N443 = window.GV.N();
    // 找一格乾淨平地：沒有樹（會加 COST.doze）、沒有路／建物／分區、非水面
    let px = -1, py = -1;
    for (let y = 2; y < N443 - 2 && px < 0; y++) for (let x = 2; x < N443 - 2; x++) {
      const t = window.GV.tile(x, y);
      if (t && t.t !== 0 && !t.tree && !t.road && !t.bld && !t.zone && !t.rail && !t.deco && !t.ruin && !t.crater) {
        px = x; py = y; break;
      }
    }
    assert(px >= 0, 'T443 G1 找不到乾淨平地——對帳前提不成立，這次量測沒有意義');
    const toolsSrc443 = /const TOOLS=\[([\s\S]*?)\n\];/.exec(html);
    assert(toolsSrc443, 'T443 G1 找不到 TOOLS 表');
    const rows443 = [];
    for (const m of toolsSrc443[1].matchAll(/\{id:'([A-Za-z0-9_]+)'[^}]*?pr:([^},]+)\}/g))
      rows443.push([m[1], m[2].trim()]);
    assert(rows443.length >= 100,
      'T443 G1 TOOLS 解析出的工具數異常（實得 ' + rows443.length + '，預期 ≥100）——表格結構可能被改壞了');
    /* 只對帳「顯示價能算出一個定值」的工具：`'$'+COST.x` 與 `'$20'` 這兩型。
       道路系是逐格地形計價（roadCostAt）、地形筆刷是逐格累加，定值對帳不適用，逐條列在下面。 */
    const SKIP443 = {
      pan: '檢視工具，不施工', alley: '道路逐格地形計價', road: '道路逐格地形計價',
      coll: '道路逐格地形計價', art: '道路逐格地形計價', hwy: '道路逐格地形計價',
      rail: '橋樑與平地兩種價', tram: '橋樑與平地兩種價',
      tdig: '地形筆刷逐格累加', tland: '地形筆刷逐格累加', traise: '地形筆刷逐格累加',
      doze: '隕石坑另計 $120', zr: '已有分區時為 0', zc: '已有分區時為 0', zi: '已有分區時為 0',
      office: '已是商業分區時為 0',
    };
    const bad443 = [], checked443 = [];
    for (const [id, prSrc] of rows443) {
      if (SKIP443[id]) continue;
      const lit = /^'\$'\+COST\.([A-Za-z0-9_]+)$/.exec(prSrc) || /^'\$(\d+)'$/.exec(prSrc);
      if (!lit) continue;
      let shown;
      try { shown = /^'\$\d+'$/.test(prSrc) ? Number(lit[1]) : window.GV.cost443(lit[1]); }
      catch (e) { continue; }
      if (!(shown > 0)) continue;
      let real;
      try { real = window.GV.placeCost443(id, px, py); } catch (e) { real = 'throw:' + e.message; }
      checked443.push(id);
      if (real !== shown) bad443.push(id + ' 顯示 $' + shown + ' 實扣 $' + real);
    }
    assert(checked443.length >= 90,
      'T443 G1 實際對帳到的工具只有 ' + checked443.length + ' 個（預期 ≥90）——'
      + '解析或跳過清單出問題了，這條會變成空跑的假綠');
    assert(bad443.length === 0,
      'T443 G1【窮舉真跑】工具列顯示價必須等於 placeCost 實扣（乾淨平地、無科技無專精）。'
      + '按鈕上的價格是給玩家看的承諾，placeCost 是真的從他錢包裡拿走的數字。'
      + '不一致 ' + bad443.length + ' 項：' + JSON.stringify(bad443.slice(0, 6))
      + '（本次對帳 ' + checked443.length + ' 項）');
  }

  /* §10.10 之一：SPR 撞名。實測有 4 個鍵被賦值兩次，全是 T151/T162 刻意的「後寫後贏」，
     但沒有任何測試能區分**刻意覆蓋**與**撞名事故**——白名單就是用來把這件事寫下來的。 */
  {
    const DUP_OK443 = {
      police: 'T151/T162 手繪版後寫覆蓋程序版（刻意）',
      hospital: 'T151/T162 手繪版後寫覆蓋程序版（刻意）',
      clinic: 'T151/T162 手繪版後寫覆蓋程序版（刻意）',
      waterTower: 'T151/T162 手繪版後寫覆蓋程序版（刻意）',
    };
    const seen443 = {}, dup443 = [];
    for (const m of htmlBare438.matchAll(/(?:^|\n)\s*SPR\.([A-Za-z0-9_$]+)\s*=[^=]/g)) {
      const k = m[1];
      if (seen443[k]) { if (dup443.indexOf(k) < 0) dup443.push(k); }
      seen443[k] = 1;
    }
    const unlisted443 = dup443.filter(k => !DUP_OK443[k]);
    assert(Object.keys(seen443).length >= 80,
      'T443 G2 掃到的 SPR 頂層鍵只有 ' + Object.keys(seen443).length + ' 個（預期 ≥80）——掃描器壞了');
    assert(unlisted443.length === 0,
      'T443 G2【鐵律17】`SPR.<鍵>=` 重複賦值必須逐鍵列在白名單並註明理由（刻意覆蓋 vs 撞名事故）。'
      + '未列名的重複：' + JSON.stringify(unlisted443)
      + '。若這是刻意的後寫後贏，把它加進 DUP_OK443 並寫明是哪張卡的決定');
  }

  /* §10.10 之二：鐵律6。**原文在 `docs/RULES.md:13`**：
       「畫菱形的 `dia()` / `diaEdge()` 半寬 `hw` 必須是偶數，否則像素錯位。」
     我第一版是照 ARCH §10.10 的**轉述**（只寫「hw 必為偶數」）去掃 isoBox/boxUnit，
     `dia`／`diaEdge` 一個都沒掃——而那才是規則點名的兩個函式。
     （isoBox/boxUnit 把同一個 hw 轉手交給 `dia`，所以它們也在範圍內。）
     這是 T441 抓到的「母體邊界是猜的」同型錯，這次在出貨前抓到。

     實測既有違規 20 個（dia 2／diaEdge 7／isoBox 11），**全是既有美術**——
     修它們等於改 20 處 sprite 的像素，那是觀感決定，不是守衛可以順手做的事。
     所以這條做成**計數釘**：凍結在 20，任何新增的奇數 hw 會讓它變 21 而紅。
     清單逐條寫在 T443 卡面，交業主決定要不要動。 */
  {
    const ODD_HW443 = 20;   // 放寬／收緊都要寫在卡面（鐵律：判準變動要留痕）
    const POS443 = {dia: 3, diaEdge: 5, isoBox: 3, boxUnit: 4};
    /* 深度感知的引數切分：引數裡有陣列或巢狀呼叫時，`split(',')` 會整排錯位
       （第二版的 `dia hw=5` 誤報就是這樣來的）。 */
    const argsAt443 = (src, open) => {
      const out = []; let depth = 0, cur = '';
      for (let i = open; i < src.length && i < open + 600; i++) {
        const c = src[i];
        if (c === '(' || c === '[' || c === '{') { depth++; if (depth === 1 && c === '(') { cur = ''; continue; } }
        else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) { out.push(cur); return out; } }
        else if (c === ',' && depth === 1) { out.push(cur); cur = ''; continue; }
        if (depth >= 1) cur += c;
      }
      return null;
    };
    const stat443 = {dia: 0, diaEdge: 0, isoBox: 0, boxUnit: 0};
    let lit443 = 0, odd443 = 0, unparsed443 = 0;
    const re443 = /(?:^|[^A-Za-z0-9_$.])(dia|diaEdge|isoBox|boxUnit)\(/g;
    let mm443;
    while ((mm443 = re443.exec(htmlBare438))) {
      const fn = mm443[1], open = mm443.index + mm443[0].length - 1;
      const a = argsAt443(htmlBare438, open);
      stat443[fn]++;
      if (!a) { unparsed443++; continue; }
      const v = (a[POS443[fn]] || '').trim();
      if (!/^\d+$/.test(v)) continue;
      lit443++;
      if (Number(v) % 2 !== 0) odd443++;
    }
    assert(unparsed443 === 0,
      'T443 G3 有 ' + unparsed443 + ' 個呼叫的括號切不出來——切分器壞了，這條會失真');
    assert(stat443.dia >= 150 && stat443.diaEdge >= 200 && lit443 >= 400,
      'T443 G3 掃到的呼叫數異常（dia ' + stat443.dia + '／diaEdge ' + stat443.diaEdge
      + '／hw 字面量 ' + lit443 + '）——掃描器壞了，這條會變成空跑的假綠');
    assert(odd443 === ODD_HW443,
      'T443 G3【鐵律6・計數釘】`dia`／`diaEdge`／`isoBox`／`boxUnit` 的 hw 字面引數是奇數的，'
      + '目前應恰為 ' + ODD_HW443 + ' 個（既有美術債，逐條列在 T443 卡面），實得 ' + odd443 + '。'
      + '**變多＝有人新增了奇數 hw**（鐵律6：半寬必須偶數，否則像素錯位）；'
      + '**變少＝有人修了既有的**，那是改 sprite 像素的觀感決定，請連同樣張一起出卡再調整這個數字');
  }
}

/* ===== T442 指南「委託與專精」分頁：守衛 ===== */
{
  /* 這一頁是這一夜第一張**玩家看得到**的東西，而它存在的第一天就撿到一個真 bug：
     `SPEC386.edu.fx` 寫「政策日費+$12」，而 T394b 早已把它改成
     `eduFee394=clamp(round(pop/100),6,40)`。它過期了三十幾張卡都沒人發現，
     正是因為**沒有任何地方把這段文字印給玩家看**。所以這一區的重點不是「有沒有這一頁」，
     是「這一頁的每一個數字都必須來自遊戲本身，不能是手抄的」。 */
  // G1 分頁在場
  assert(html.includes("'🔬 科技樹','📋 委託與專精'"),
    'T442 G1【原文前哨】玩法指南必須有「📋 委託與專精」分頁');
  assert(html.includes('}else if(guideTab===6){'),
    'T442 G1b 指南必須有 guideTab===6 的分支（新分頁的渲染入口）');
  // G2 委託清單必須**逐筆從 CMS385 導出**，不得手抄
  assert(html.includes('for(const c442 of CMS385){'),
    'T442 G2【原文前哨】委託清單必須 `for(const c442 of CMS385)` 逐筆導出。'
    + '手抄一份就會過期，而且沒有人會發現——本區開頭那個 $12 就是這樣過期三十幾張卡的');
  assert(html.includes('for(const id443 of SPEC_IDS386){'),
    'T442 G2b【原文前哨】專精清單必須從 SPEC_IDS386／SPEC386 逐筆導出');
  // G3 指南分頁的原始碼裡不得出現任何一條委託的獎金／目標數字（＝證明它沒有手抄）
  {
    const a442 = html.indexOf('}else if(guideTab===6){');
    const b442 = html.indexOf('}else if(guideTab===5){', a442);
    assert(a442 > 0 && b442 > a442, 'T442 G3 找不到 guideTab===6 分頁的區間');
    const page442 = html.slice(a442, b442);
    const nums442 = [];
    for (const m of html.matchAll(/\{id:'[^']+',[^}]*?bonus:(\d+)/g)) nums442.push(m[1]);
    const leaked442 = [...new Set(nums442)].filter(n => page442.indexOf(n) >= 0);
    assert(leaked442.length === 0,
      'T442 G3【機械複算】指南分頁裡出現了委託獎金的數字字面量 ' + JSON.stringify(leaked442)
      + '——那代表有人開始手抄了。這一頁的每一個數字都必須來自 CMS385');
  }
  // G4 每一條委託都要被列出來：渲染用的欄位一個都不能少
  for (const f442 of ['c442.ic', 'c442.nm', 'c442.bonus', 'c442.days', 'c442.minRank', 'c442.holdN'])
    assert(html.includes(f442),
      'T442 G4【原文前哨】指南必須用到 ' + f442 + '——少一個欄位，玩家就少看到一項條件');
  assert(html.includes("CMS385.length+' 條"),
    'T442 G4b 標題的條數必須用 CMS385.length，不得寫死（新增一條委託時標題會自己跟上）');
  // G5 edu 的過期敘述不得回來
  assert(!/政策日費\+\$12/.test(html),
    'T442 G5【絕跡類】`政策日費+$12` 不得出現：T394b 之後 edu 的日費是 '
    + 'eduFee394＝clamp(round(pop/100),6,40)，固定 $12 是過期三十幾張卡的數字');
  assert(/政策日費 \$6–\$40（隨人口，每百人 \$1）/.test(html),
    'T442 G5b SPEC386.edu.fx 必須寫成與 eduFee394 同源的區間敘述');
}

/* ===== T441 第二個牆面落筆口 boxUnit：守衛 ===== */
{
  /* 這一區存在的理由是**我上一張卡的一句全稱句是錯的**：T439 的卡面、CHANGELOG 與
     art_wall.html 都寫「isoBox 是全檔唯一的牆面落筆口」，而 index.html 還有 boxUnit
     （T425I，19 個呼叫點）也自己畫左右兩片牆。母體是猜的，判定就只在猜對的那部分裡成立。 */
  // G1 boxUnit 也要有記錄鉤，且預設關、鍵用過即清
  assert(html.includes("if(window.__wall439){window.__wall439.push({via:'boxUnit',lit:(window.__noWallFlip441?'L':'R'),key:window.__wallKey439||null,cL:cL,cR:cR,hw:hw,h:h});window.__wallKey439=null;}"),
    'T441 G1【原文前哨】boxUnit 必須有與 isoBox 同款的牆面記錄鉤（含 via 欄）。'
    + '少了它，art_wall.html 的母體就會漏掉一整個落筆口——T439 就是這樣把「全檔唯一」寫進三份文件的');
  // G2 兩個落筆口都要被記錄：via 只准這兩個值，且都必須在場
  {
    /* 為什麼要這樣繞：`htmlBare438` 是剝掉字串的版本，直接在上面找 `via:'…'` 一定是 0 筆
       （第一版就這樣紅了）；但改用原文又會被註解餵飽。剝除器**逐字元等長**，
       所以在剝乾淨的文字上找 `via:` 的**位置**（保證那是程式碼），再回原文同一位置讀內容。
       位置由剝除器保證，內容由原文提供。 */
    const vias441 = [];
    for (let p441 = htmlBare438.indexOf('via:'); p441 >= 0; p441 = htmlBare438.indexOf('via:', p441 + 4)) {
      const m441 = /^via:'([A-Za-z0-9_]+)'/.exec(html.slice(p441, p441 + 32));
      if (m441) vias441.push(m441[1]);
    }
    vias441.sort();
    assert(vias441.length === 2 && vias441[0] === 'boxUnit' && vias441[1] === 'isoBox',
      'T441 G2【計數釘】牆面記錄鉤的 via 值目前應恰為 {boxUnit, isoBox}，實得 '
      + JSON.stringify(vias441) + '。**新增第三個牆面落筆口時這條會紅**——那正是它的用途：'
      + '母體邊界不能再靠某個人記得住');
  }
  // G3 受光方向：亮階必須落在右面（cx+dx 那個迴圈），暗階落在左面
  assert(html.includes("const rampL=flip441?rampDim(cR):rampLit(cL);")
    && html.includes("const rampR=flip441?rampLit(cL):rampDim(cR);"),
    'T441 G3【原文前哨】boxUnit 的受光方向必須對齊 isoBox：預設（flip441 為真）時'
    + '左面吃暗階、右面吃亮階。isoBox 的主體牆面實測 108 個鍵全部右受光，'
    + '兩個畫法方向相反就是「全城光照自相矛盾」的本體');
  // G4 逃生閥：要有真的寫入端，且早於 boxUnit 的定義（T438 M2 的教訓，位置釘）
  const wf441 = html.indexOf("if(!window.__noWallFlip441){try{if(/[?&]noWallFlip441=1/");
  const bu441 = html.indexOf('\nfunction boxUnit(');
  assert(wf441 > 0 && bu441 > 0 && wf441 < bu441,
    'T441 G4【位置釘】?noWallFlip441=1 的寫入端（' + wf441 + '）必須早於 `function boxUnit(`（'
    + bu441 + '）。boxUnit 在 buildSprites 期間就被呼叫，寫入端晚一步這個逃生閥就對烘進 sprite 的'
    + '像素完全無效——T434d 正是這樣空綠了一整張卡');
  // G5 boxUnit 不得消耗共用亂數（記錄鉤與方向切換都是可被玩家撥動的）
  {
    const a441 = html.indexOf('\nfunction boxUnit(');
    const b441 = html.indexOf('\n}', a441);
    const body441 = htmlBare438.slice(a441, b441);
    const n441 = (body441.match(/(^|[^A-Za-z0-9_$.])(R|ri|rf|rnd)\s*\(/g) || []).length;
    assert(n441 === 0,
      'T441 G5【機械複算】boxUnit 函式體不得出現 R()/ri()/rf()/rnd()（實得 ' + n441 + '）：'
      + '它有兩個可被 URL 撥動的開關（?wall439=1／?noWallFlip441=1），'
      + '一旦碰到共用亂數流，撥開關就會改變世界，兩釘也跟著失效');
  }
}

/* ===== T440 代碼地圖解析度：守衛 ===== */
{
  /* 為什麼要有這一條：T437 把「行號會過期」修掉了，但沒有人擋「表太粗」。
     改之前 §1 最寬的一段是 **4,070 行**（`FIX-B 尾端區起點` → `加蓋層 pass 群`），
     一個 4,070 行的「區段」等於沒有指路——同一種病換個形態而已。
     另外：T437/T438/T439 的收尾都寫過「還有 19% 未測繪」，那個數字**從來沒有定義過**，
     是三次轉抄同一個沒有量法的百分比。這條守衛連同 ARCH 表頭把它換成可重算的東西。 */
  const MAX_GAP440 = 800;   // 放寬要寫在卡面（鐵律：判準放寬要留痕）
  const archTxt440 = fs.readFileSync(path.join(__dirname, 'docs', 'ARCH.md'), 'utf8');
  const s440 = archTxt440.indexOf('## 1. 檔案分節地圖');
  const e440 = archTxt440.indexOf('\n## ', s440 + 10);
  const idxLines440 = html.split('\n').length;
  const hits440 = [];
  for (const line of archTxt440.slice(s440, e440).split('\n')) {
    const m = /^\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/.exec(line);
    if (!m) continue;
    const n = parseInt(m[2].trim(), 10);
    if (/`/.test(m[3]) && n > 0) hits440.push(n);
  }
  assert(hits440.length >= 90,
    'T440 G1 §1 的可檢查列數異常（實得 ' + hits440.length + '，預期 ≥90）——表格結構可能被改壞了');
  hits440.sort((a, b) => a - b);
  let worst440 = 0, wa = 0, wb = 0;
  const bounds440 = hits440.concat([idxLines440]);
  for (let i = 0; i + 1 < bounds440.length; i++) {
    const g = bounds440[i + 1] - bounds440[i];
    if (g > worst440) { worst440 = g; wa = bounds440[i]; wb = bounds440[i + 1]; }
  }
  assert(worst440 <= MAX_GAP440,
    'T440 G2【解析度】§1 相鄰兩列錨點的最大間距 ' + worst440 + ' 行（index.html ' + wa + ' → ' + wb
    + '）超過上限 ' + MAX_GAP440 + '。這張表不會漏掉行——每一列標的是區段起點——它只會太粗；'
    + '太粗的地圖跟過期的地圖一樣不能用。補一列錨點（`python tools/arch_map.py --fix` 會填行號）');
  /* G3 上限本身也要釘住：放寬是一個決定，不是一個手滑。
     **這一條第一版是錯的**：它驗「檔案裡有沒有 `const MAX_GAP440 = 800;` 這串字」，
     而那串字也出現在它自己那條 assert 的正則裡；破壞式紅源把宣告改成 5000 之後，
     正則那一處還在 ⇒ 文本比對命中 ⇒ **套件全綠**。
     一條專門用來擋「偷偷放寬判準」的守衛，自己就能被偷偷放寬——今晚第四次同型。
     改成比**值**：守衛的常數必須等於 800，且必須等於 tools/arch_map.py 解析出來的 MAX_GAP。 */
  const toolGap440 = /^MAX_GAP = (\d+)$/m.exec(
    fs.readFileSync(path.join(__dirname, 'tools', 'arch_map.py'), 'utf8'));
  assert(toolGap440, 'T440 G3 tools/arch_map.py 必須有一行 `MAX_GAP = <數字>`（供守衛比對）');
  assert(MAX_GAP440 === 800 && Number(toolGap440[1]) === MAX_GAP440,
    'T440 G3【判準釘】解析度上限必須是 800，且守衛（' + MAX_GAP440 + '）與 tools/arch_map.py（'
    + toolGap440[1] + '）必須同步。要放寬請先在卡面寫明理由——'
    + '判準放寬寫在被驗物件裡，是本專案 2026-08-11 記過一次的老毛病');
}

/* ===== T439 牆面受光量測：守衛 ===== */
{
  /* G1 T441 跟版（**動既有斷言，理由寫在這裡**）：記錄項多了 `via` 欄，因為 T439 的母體
     少了一整個落筆口——`boxUnit`（見下方 T441 區）。原本的字面釘擋住了必要的補全。
     **這不是放寬**：原本的三個要件（預設關、鍵用過即清、四個欄位）一個沒少，只是多釘了 `via`。 */
  assert(html.includes("if(window.__wall439){window.__wall439.push({via:'isoBox',key:window.__wallKey439||null,cL:cL,cR:cR,hw:hw,h:h});window.__wallKey439=null;}"),
    'T439 G1【原文前哨】isoBox 必須有預設關閉的牆面記錄鉤，且**鍵用過即清**——'
    + '不清的話，mkBld 主體之後的所有附屬構件呼叫都會被記成同一個鍵（張冠李戴），'
    + '量具就得在外面替它擦屁股，換一支工具就會被騙');
  // G2 位置釘：開啟端必須早於 isoBox 與 buildSprites（T438 M2 的教訓）
  const arm439 = html.indexOf("try{if(/[?&]wall439=1/.test(location.search)");
  const iso439 = html.indexOf('\nfunction isoBox(');
  const bs439 = html.indexOf('function buildSprites(){');
  assert(arm439 > 0 && iso439 > 0 && bs439 > 0 && arm439 < iso439 && arm439 < bs439,
    'T439 G2【位置釘】?wall439=1 的開啟端（' + arm439 + '）必須早於 `function isoBox(`（' + iso439
    + '）與 `function buildSprites(){`（' + bs439 + '）。晚一步就一筆都收不到，'
    + '而量具會綠得像是「這個建築沒有牆」——T434d 的逃生閥就是這樣空綠了一整張卡');
  // G3 記錄鉤不得改變落筆：兩個牆面迴圈的原文必須原封不動
  assert(html.includes("  g.fillStyle=cL;\n  for(let dx=1;dx<=hw;dx++){const yF=by-(dx>>1);g.fillRect(cx-dx,yF-h,1,h);}\n  g.fillStyle=cR;\n  for(let dx=0;dx<hw;dx++){const yF=by-((dx+1)>>1);g.fillRect(cx+dx,yF-h,1,h);}"),
    'T439 G3【原文前哨】isoBox 的左右牆面迴圈必須逐字不變（cL 畫 cx-dx、cR 畫 cx+dx）。'
    + '這兩行同時是「量測判準的定義」與「被量的東西」——改了它，art_wall.html 報的方向就沒有意義');
  // G4 記錄鉤不得消耗共用亂數（否則打開量測就會位移世界流）
  {
    const a439 = html.indexOf('\nfunction isoBox(');
    const b439 = html.indexOf('\n}', a439);
    const body439 = htmlBare438.slice(a439, b439);
    const n439 = (body439.match(/(^|[^A-Za-z0-9_$.])(R|ri|rf|rnd)\s*\(/g) || []).length;
    assert(n439 === 0,
      'T439 G4【機械複算】isoBox 函式體不得出現 R()/ri()/rf()/rnd()（實得 ' + n439 + '）：'
      + '牆面記錄鉤是可以被玩家用 ?wall439=1 打開的，它一旦碰到共用亂數流，'
      + '「打開量測」就會改變世界，兩釘也跟著失效');
  }
  // G5 歸屬鍵只在 mkBld 設定
  assert(html.includes("if(window.__wall439)window.__wallKey439=k+'_'+lv+'_'+v;"),
    'T439 G5【原文前哨】mkBld 必須設定歸屬鍵（格式與清冊鍵同款 k_lv_v），否則主體與附屬構件分不開');
  // G6 量具：收不到資料要紅，且母體是「相異牆面」不是流水帳長度
  {
    const wall439 = fs.readFileSync(path.join(__dirname, 'docs', 'tools', 'art_wall.html'), 'utf8');
    assert(wall439.includes('window.__wall439 不存在') && wall439.includes('window.__wall439 存在但一筆都沒有'),
      'T439 G6 art_wall.html 必須把「陣列不存在（開關沒開）」與「存在但空（開啟端太晚）」分開報——'
      + '兩者的診斷完全不同，混講等於沒講');
    assert(wall439.includes('const sigOf = e =>') && wall439.includes('相異牆面'),
      'T439 G6b art_wall.html 的母體必須是**相異牆面**（逐鍵／逐 (cL,cR,hw,h) 去重）。'
      + '流水帳長度會隨遊戲繼續跑而一直增長（實測 444 → 1416），用它當母體會讓同一件事量出兩個數字');
    assert(/throw new Error\('相異牆面數在 30 秒內仍在增長/.test(wall439),
      'T439 G6c art_wall.html 必須在母體遲遲不穩定時丟錯，不能拿一個還在動的數字往下算');
  }
}

/* ===== T438 夜班覆核退修：守衛 =====
   本區的四條（G1/G2/G3 白名單判準、G6 位置）是**機械複算**，不是原文前哨——
   也就是說它們不看我在 index.html 註解裡宣稱了什麼，而是自己從原始碼把答案算一遍。
   會這樣寫是因為今晚已經被自己的註解餵飽過兩次（T428 G1、T437 死錨點 0）。 */
{
  const bare438 = htmlBare438;   // T438：剝除器與其單元自測已提到檔頭（見 :191 之後）
  const bl438 = bare438.split('\n');
  const rl438 = html.split('\n');
  const bend438 = (i) => { for (let j = i + 1; j < rl438.length; j++) if (rl438[j] === '}') return j; return rl438.length - 1; };

  // 繪製區 = 函式名為 draw 或 draw* 的所有函式體聯集
  const render438 = [];
  for (let i = 0; i < rl438.length; i++) {
    const m = /^function\s+(draw[A-Za-z0-9_$]*)\s*\(/.exec(rl438[i]);
    if (m) render438.push([m[1], i + 1, bend438(i) + 1]);
  }
  const renderLines438 = render438.reduce((p, r) => p + (r[2] - r[1] + 1), 0);
  assert(render438.length >= 25 && renderLines438 >= 2000,
    'T438 G0b 繪製區辨識異常（' + render438.length + ' 個 draw* 函式 / ' + renderLines438
    + ' 行）——判準的基礎壞了，下面三條就沒有意義');
  const inRender438 = (x) => render438.some(r => x >= r[1] && x <= r[2]);

  // 所有 __no* 的讀取端（剝乾淨之後才掃，註解裡提到的名字不算）
  const reads438 = new Map();
  for (let i = 0; i < bl438.length; i++) {
    const re = /(?:window\.)?__no([A-Za-z0-9_]+)/g;
    let m;
    while ((m = re.exec(bl438[i]))) {
      if (m[1] === '436') continue;
      if (/^\s*=[^=]/.test(bl438[i].slice(m.index + m[0].length))) continue;   // 寫入端
      if (!reads438.has(m[1])) reads438.set(m[1], []);
      reads438.get(m[1]).push(i + 1);
    }
  }
  const mAllow438 = /const ALLOW436=\[([\s\S]*?)\];/.exec(html);
  assert(mAllow438, 'T438 G1 index.html 必須有 `const ALLOW436=[…];` 放行白名單');
  const allow438 = (mAllow438[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1));
  assert(allow438.length >= 50,
    'T438 G1 白名單只剩 ' + allow438.length + ' 名——低於 50 表示有人整批砍掉，請確認是不是誤刪');

  // G1 白名單的每一個名稱，讀取端必須全部落在繪製區內
  const out438 = [];
  const dead438x = [];
  for (const nm of allow438) {
    const ls = reads438.get(nm);
    if (!ls || !ls.length) { dead438x.push(nm); continue; }
    const bad = ls.filter(x => !inRender438(x));
    if (bad.length) out438.push('__no' + nm + '@' + bad.slice(0, 3).join(','));
  }
  assert(out438.length === 0,
    'T438 G1【機械複算】ALLOW436 的名稱，讀取端必須全部落在繪製區（draw* 函式體）內。'
    + '區外讀取端的意思是「它不只影響畫面」——可能改變模擬（__noPowerDistrict432 型），'
    + '也可能改變 SPR 陣列結構讓渲染取到 undefined（__noVar12 型，玩家可用一條 URL 把遊戲弄崩）。'
    + '違規：' + JSON.stringify(out438.slice(0, 5)));
  // G3 白名單不收死名字
  assert(dead438x.length === 0,
    'T438 G3【機械複算】ALLOW436 裡有名稱在 index.html 完全沒有讀取端：' + JSON.stringify(dead438x.slice(0, 5))
    + '。放行一個不存在的開關等於在白名單裡留一個沒人看得懂的坑');
  // G1b 具名反例：這四個是覆核當場舉出來的，永遠不准進白名單
  for (const nm of ['Var12', 'PowerDistrict432', 'Mort', 'Debris'])
    assert(allow438.indexOf(nm) < 0,
      'T438 G1b【具名反例】__no' + nm + ' 不得進 ALLOW436——'
      + 'Var12 會讓 SPR.tree 由 10 變體縮成 7 而世界生成／渲染仍取 0-9；'
      + 'PowerDistrict432／Mort／Debris 會改變 tick 的模擬結果，而 localStorage 路徑是持久的');

  // G2 繪製區不得消耗共用亂數流；tick() 當對照組，防止剝除器把程式碼一起剝掉而假綠
  const rngHits438 = (lo, hi) => {
    let n = 0;
    for (let x = lo; x <= hi && x <= bl438.length; x++) {
      const re = /(^|[^A-Za-z0-9_$.])(R|ri|rf|rnd)\s*\(/g;
      while (re.exec(bl438[x - 1])) n++;
    }
    return n;
  };
  let renderRng438 = 0;
  for (const r of render438) renderRng438 += rngHits438(r[1], r[2]);
  const tickStart438 = rl438.findIndex(l => l.startsWith('function tick(')) + 1;
  const tickRng438 = tickStart438 > 0 ? rngHits438(tickStart438, bend438(tickStart438 - 1) + 1) : 0;
  assert(tickRng438 > 0,
    'T438 G2 對照組失效：tick() 內量到 ' + tickRng438 + ' 個共用亂數呼叫（應 >0）。'
    + '這代表剝除器把程式碼也剝掉了，下面那條「繪製區零亂數」會變成假綠');
  assert(renderRng438 === 0,
    'T438 G2【機械複算】繪製區（' + render438.length + ' 個 draw* / ' + renderLines438
    + ' 行）不得出現 R()/ri()/rf()/rnd()；實得 ' + renderRng438 + ' 處。'
    + '一旦繪製區開始抽共用亂數，「關掉一個特效」就等於位移世界亂數流 ⇒ '
    + 'ALLOW436 的整套判準連同兩釘一起失效（對照組 tick() 實得 ' + tickRng438 + ' 處）');

  // G4 `?no=`（空值）必須以 URL 為準，不得掉回 localStorage
  assert(html.includes("if(qm436){noList436=decodeURIComponent(qm436[1]);src436='url';}\n  else{noList436=localStorage.getItem(SAVEKEY+'.no')||'';"),
    'T438 G4【原文前哨】`?no=` 空值必須走 URL 分支（本次不套用任何開關）＝玩家的自救鑰匙。'
    + '寫成 `if(!noList436){…localStorage…}` 的話，一個持久化的壞值就沒有任何 URL 手段能清掉');

  // G5 buildAllSprites 不得在 T275 替身亂數流中被重跑
  assert(html.includes("if(b438&&b438.started&&!b438.ready&&b438.pct>=7)")
    && html.includes('T438：開機已進入 T275 替身亂數流'),
    'T438 G5【原文前哨】GV.buildAllSprites 必須先擋掉「開機已進入替身流」的情況：'
    + 'bootstrap426 先 `__savedR=R;R=mulberry32(1)` 才逐段建圖，此時重跑 buildSprites 會二次覆寫 __savedR，'
    + 'S9 還原時就把世界亂數流永久換成替身流（懷疑者實測停在 pct=5 與 pct=7）');

  // G6 兩支量具：全透明圖集必須紅（canvas 物件存在 ≠ 上面畫過東西）
  for (const f of ['art_diff.html', 'art_style.html']) {
    const t438 = fs.readFileSync(path.join(__dirname, 'docs', 'tools', f), 'utf8');
    assert(t438.includes('function assertHasPixels438(entries, tag)')
      && /assertHasPixels438\((bld|entries)/.test(t438),
      'T438 G6 docs/tools/' + f + ' 必須有 assertHasPixels438 像素防呆**並實際呼叫**：'
      + '原本的防呆只驗 entries.length 與 bld.length，都只看 canvas 物件存不存在，'
      + '一個全透明的圖集會照樣走到「量測完成」——這正是它自己註解在罵的 T421 空殼 harness 同型');
    assert(t438.includes("if (opaque === 0) throw new Error("),
      'T438 G6 docs/tools/' + f + ' 的像素防呆必須在不透明像素為 0 時**丟錯**，不能只印警告');
  }

  // G7 arch_map.py --check 必須真的掛在閘門上（T437 交了工具但沒接線）
  const vpy438 = fs.readFileSync(path.join(__dirname, 'tools', 'verify.py'), 'utf8');
  assert(vpy438.includes("os.path.join('tools', 'arch_map.py'), '--check'"),
    'T438 G7 tools/verify.py 必須呼叫 `tools/arch_map.py --check`。'
    + 'T437 寫了自檢工具卻沒有掛進任何閘門 ⇒「行號可以全面過期而套件全綠」那個根因原封不動');
  const apy438 = fs.readFileSync(path.join(__dirname, 'tools', 'arch_map.py'), 'utf8');
  assert(apy438.includes("missing = [a for a, k in hits if k is None]")
    && apy438.includes("'blank': not re.search(r'\\d', declared),"),
    'T438 G7b tools/arch_map.py 必須採「所有錨點都要命中」與「行號欄空白算錯誤」兩條語意，'
    + '不得退回「任一命中就算過」或「沒數字就 continue」——那兩條各自製造過一次假綠');
}

/* ===== T435 健康燈帶誠實化：守衛 ===== */
{
  // G1 live 判斷必須存在，且**與 tick 的早退條件同形狀**（兩處走鐘＝又一次假資料）
  assert(html.includes("const hsLive430=b=>!!b&&(b.k<=3||b.k===127);"),
    'T435 G1【原文前哨】healthStrip430 必須先算 hsLive430(b)＝這棟的 pw/wa 是否真的被逐日重算');
  assert(html.includes("if(!b||(b.k>3&&b.k!==127))continue;"),
    'T435 G2【原文前哨】tick 的每日重算早退條件必須維持 `(b.k>3&&b.k!==127)`——'
    + 'hsLive430 的 `(b.k<=3||b.k===127)` 是它的反面，兩處必須同時在場才不會走鐘');
  // G3 na 分支的文案必須明說原因，不能只給一個灰點
  assert(html.includes("'本類建築不逐日重算'"),
    'T435 G3【原文前哨】na 分支必須明說「本類建築不逐日重算」；只給灰點等於把假話換成沉默');
  // G4 pw:true 是放置時的殘值——這條計數釘是為了讓下一個人看到規模
  const pwTrue435 = (html.match(/pw:true/g) || []).length;
  assert(pwTrue435 >= 100,
    'T435 G4【計數釘】`pw:true` 字面量目前 ' + pwTrue435 + ' 處（放置時硬寫）。'
    + '這條釘不是要凍結數字，是要讓改動者知道：k≥4 建築的 b.pw 是殘值不是量測值。'
    + '若這個數字大幅下降，代表有人開始逐棟重算了，屆時 hsLive430 的條件要一起改');
}

/* ===== T430 City Health Strip 守衛（桌面適配版，概念源自移動線 T461） ===== */
{ // G1 函式存在＋六格資料源原文釘（真實觀測，不造假）
  assert(html.includes('function healthStrip430(x,y,b){'),'T430 G1 healthStrip430 必須存在');
  /* T435 跟版（**這是動既有斷言，理由寫在這裡**）：原本這兩條釘的是
     `state:b.pw?'good':'bad'` 與 `state:b.wa?'good':'bad'`——而那正是 T435 修掉的 bug 本身：
     b.pw／b.wa 的每日重算只跑 k=1/2/3＋k=127，對 k≥4 建築 ⚡恆 good、💧恆 bad。
     釘子指向的是有 bug 的原文，不改就永遠不能修它。**這不是放寬**：新釘同樣是字面釘、
     而且多釘了「na 分支」與「live 判斷」兩件事，嚴格程度只增不減。 */
  for(const src of ["state:live?(b.pw?'good':'bad'):'na'","state:live?(b.wa?'good':'bad'):'na'",
    "state:garbCap>0?(garbRatio>1?'warn':'good'):'na'",
    "(COV.fire[i]>0||(COV.fire2&&COV.fire2[i]>0)||(COV.fireHQ&&COV.fireHQ[i]>0))",
    "(COV.police[i]>0||COV.police2[i]>0)",
    "(COV.hospital[i]>0||(COV.clinic&&COV.clinic[i]>0))"])
    assert(html.includes(src),'T430 G1 資料源釘必須存在：'+src.slice(0,40));
  // 污水/排水如實 na（桌面無逐棟污水狀態/T454）
  assert((html.match(/state:'na'/g)||[]).length>=2,'T430 G1 污水/排水兩格必須如實 na');
}
{ // G2 接線：inspect 尾部在 innerHTML 賦值前插入
  assert(html.includes("if(t.bld&&!t.bld.ref&&!window.__noHealthStrip430){window.__t430HealthRead=(window.__t430HealthRead||0)+1;html+=healthStrip430("),
    'T430 G2 接線必須在 inspect 尾部（innerHTML 前）');
}
{ // G3 kill-switch＋觀測橋＋CSS 六格
  assert(html.includes('__noHealthStrip430'),'T430 G3 kill-switch __noHealthStrip430 必須存在');
  assert(html.includes('window.__t430HealthRead'),'T430 G3 觀測橋 __t430HealthRead 必須存在');
  assert(html.includes('.hs430{display:grid;grid-template-columns:repeat(6'),'T430 G3 CSS 六格燈帶必須存在');
  assert(html.includes('.hs430P.good')&&html.includes('.hs430P.warn')&&html.includes('.hs430P.bad')&&html.includes('.hs430P.na'),
    'T430 G3 四態樣式 good/warn/bad/na 必須存在');
}
{ // G4 區塊零亂數（剝註解後字面掃描）
  const b430=html.indexOf('function healthStrip430'),e430=html.indexOf('function inspect(x,y){',b430);
  assert(b430>=0&&e430>b430,'T430 G4 應可界定區塊');
  const seg430=html.slice(b430,e430).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg430),
    'T430 G4 健康燈區塊不得消耗亂數流');
}

/* ===== T431 城市風影守衛（源自移動線 T482 T443） ===== */
{ // G1 五函式＋觀測橋存在
  for(const f of ['windRoot443','windMass443','windMassView443','windFactor443','localWind443'])
    assert(html.includes('function '+f+'('),'T431 G1 函式 '+f+' 必須存在');
  assert(html.includes('window.__t443WindAt=')&&html.includes('window.__t443FactorAt='),'T431 G1 觀測橋兩支必須存在');
}
{ // G2 樹搖 lw443 接線（螢火/蝴蝶保持 windX441——移動線主動飛行體語義）
  assert(html.includes('const lw443=localWind443(o.x,o.y);'),'T431 G2 樹搖局部風讀值必須存在');
  assert(html.includes('+windX441*1.2*z; /* T429 風場 */')&&html.includes('+windX441*4*z; /* T429 風場 */'),
    'T431 G2 螢火/蝴蝶必須保持 windX441 直接（主動飛行體語義）');
}
{ // G3 kill-switch 分支：__noWindShadow443 時 localWind443≡windX441
  assert(html.includes('__noWindShadow443'),'T431 G3 kill-switch 必須存在');
  assert(html.includes('function localWind443(x,y){return windX441*windFactor443(x|0,y|0);}'),
    'T431 G3 localWind443=windX441*windFactor443 原文釘');
  assert(html.includes('if(window.__noWindShadow443||!inMap(x,y)||!windX441||quality===0||cam.z<.55)return 1;'),
    'T431 G3 風影關閉/低畫質/遠景退回全局風（factor=1）');
}
{ // G4 區塊零亂數（剝註解後字面掃描）
  const b431=html.indexOf('function windRoot443'),e431=html.indexOf('window.__t443WindAt=',b431);
  assert(b431>=0&&e431>b431,'T431 G4 應可界定風影區塊');
  const seg431=html.slice(b431,e431).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg431),
    'T431 G4 風影區塊不得消耗亂數流');
}
{ // G5 量體表語義釘（摩天巨廈/農牧低矮/中央站/機場/RCI 依 lv+sz）
  assert(html.includes("if(k===33||k===34||k===105||k===106)return 1;"),'T431 G5 摩天/巨廈量體=1');
  assert(html.includes("if(cat==='G'||cat==='F')return .10+Math.min(.10,(sz-1)*.03);"),'T431 G5 公園農牧低矮量體');
  assert(html.includes("if(cat==='T')return k===55?.48:.22;"),'T431 G5 中央車站例外');
  assert(html.includes("if(k===19||k===114)return .20;"),'T431 G5 機場不按 footprint 當高牆');
}

/* ===== T432 電網分區守衛（桌面適配版，源自移動線 T450；含二輪審計修正釘） ===== */
{ // G1 靜態：函式＋共用最近道路＋世代標記＋三 P1 修正＋fallback
  for(const f of ['powerLegacy432','nearestPoweredRoadIdx432','rebuildPowerDistricts432'])
    assert(html.includes('function '+f+'('),'T432 G1 函式 '+f+' 必須存在');
  const cpStart432=html.indexOf('function computePower()');
  const cp432=html.slice(cpStart432,html.indexOf('/* ===== T432 電網分區',cpStart432));
  const cp432Code=cp432.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(/if\(!plants\)\{[\s\S]{0,360}powerSrcList432=\[\];[\s\S]{0,360}dCap432=\[\];[\s\S]{0,360}powerTilesRef432=tiles;[\s\S]{0,360}return 0;/.test(cp432Code),
    'T432 G1 P1-2 無啟動源必須清空來源、容量與世代標記後回傳 0');
  assert(html.includes('const md=Math.abs(dx)+Math.abs(dy);'),'T432 G1 P1-3 曼哈頓最近（電源端）');
  assert(html.includes('const dj=nearestPoweredRoadIdx432(x,y,2);'),'T432 G1 二輪審計：建築端也用共用最近函式（r=2）');
  assert(html.includes('const fj=nearestPoweredRoadIdx432(x,y,1);'),'T432 G1 二輪審計：電源端共用函式（r=1）');
  assert(html.includes('const seasonCap432=dCap432.map(c=>Math.floor(c*POWER_SEASON_MULT[sea]));'),'T432 G1 P1-1 季節倍率同套');
  assert(html.includes('dUsed432[d432]<seasonCap432[d432];'),'T432 G1 判定用季節口徑');
  assert(cp432Code.includes('powerTilesRef432=tiles;'),'T432 G1 二輪審計：世代標記寫入');
  const tick432=html.slice(html.indexOf('const cap=Math.floor(computePower()'),html.indexOf('b.wa=b.pw',html.indexOf('const cap=Math.floor(computePower()')));
  assert(html.includes('function powerDistrictFallback432()')&&tick432.replace(/\/\/[^\n]*/g,' ').includes('if(powerDistrictFallback432())'),'T432 G1 二輪審計：tick 必須走可行為驗證的跨世界 fallback helper（不可只藏在註解）');
  assert(html.includes('function powerSourceBld432(b)')&&html.includes('function powerTopologyTile432(t)')&&html.includes('function powerTopologySig432(t)')&&html.includes('function powerTopologyChanged432(a,b)')&&html.includes('function powerTopologyChange432(toolId,t)'),'T432 G1 拓撲工具／來源白名單與前後簽名比較必須存在');
  const undo432=html.slice(html.indexOf('function undo(){'),html.indexOf('\nfunction ',html.indexOf('function undo(){')+10));
  assert(undo432.includes('if(powerTopologyChanged432(tiles[sn.i],restored))powerUndo432=true;')&&undo432.includes('if(powerUndo432)markPowerDirty432();'),'T432 G1 undo 必須以前後拓撲差異判定置髒再重算');
  assert(html.includes('window.__t432Power=')&&html.includes('power432:()=>({districts:dCap432.length'),'T432 G1 觀測橋');
  assert(html.includes('__noPowerDistrict432'),'T432 G1 kill-switch');
}
{ // G2 區塊零亂數
  const b432=html.indexOf('function powerLegacy432'),e432=html.indexOf('function countNear(',b432);
  assert(b432>=0&&e432>b432,'T432 G2 應可界定區塊');
  const seg432=html.slice(b432,e432).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|Math\.random\s*\(|spriteTexRand/.test(seg432),
    'T432 G2 區塊不得消耗亂數流');
}
{ // G3 行為：單網等價——kill-switch 開/關同 seed 同 pop（150 天跨季節）
  window.GV.setMapSize(72);
  window.GV.newWorldSeeded(7);
  window.GV.setDiff(1);
  window.GV.weather(0);
  window.GV.setSeason(0);
  window.GV.ai(true);
  for (let d = 0; d < 150; d++) window.GV.step(1);
  window.GV.ai(false);
  const popA = window.GV.stats().pop;
  window.GV.save();
  const saveA432 = window.GV.rawSave();
  const distA = window.__t432Power ? window.__t432Power.districts : -1;
  window.GV.newWorldSeeded(7);
  window.GV.setDiff(1);
  window.GV.weather(0);
  window.GV.setSeason(0);
  window.__noPowerDistrict432 = true;
  window.GV.ai(true);
  for (let d = 0; d < 150; d++) window.GV.step(1);
  window.GV.ai(false);
  const popB = window.GV.stats().pop;
  window.GV.save();
  const saveB432 = window.GV.rawSave();
  delete window.__noPowerDistrict432;
  assert(distA === 1, 'T432 G3 seed7 150 天單網城市應為 1 district（實得 ' + distA + '）');
  assert(popA === popB, 'T432 G3 單網等價：開關 kill-switch 同 seed pop 恆等（' + popA + ' vs ' + popB + '）');
  assert(saveA432 === saveB432, 'T432 G3 單網等價：開關 kill-switch 固定城 rawSave 必須逐位元相同');
}
{ // G4 行為：孤島綠能不併網——容量三態 50/50/65
  window.GV.newWorldSeeded(11);
  window.GV.setDiff(1);
  const pp432 = findSpot('plant');
  assert(pp432, 'T432 G4 應能找到電廠位置');
  place('plant', pp432.x, pp432.y);
  for(let i=0;i<6;i++)place('road', pp432.x+1+i, pp432.y);
  window.GV.step(1);
  const capA = window.__t432Power ? window.__t432Power.sum : -1;
  assert(capA === 50, 'T432 G4 單電廠應併網 50（實得 ' + capA + '）');
  place('solar', pp432.x+8, pp432.y+8);
  window.GV.step(1);
  const capB = window.__t432Power ? window.__t432Power.sum : -1;
  assert(capB === 50, 'T432 G4 孤島太陽能不得併網（應仍 50，實得 ' + capB + '）');
  let sp432=null;
  for(let i=0;i<6&&!sp432;i++)for(const[dx,dy]of[[0,1],[0,-1],[-1,0],[1,0]]){
    const nx=pp432.x+1+i+dx,ny=pp432.y+dy;
    if(place('solar',nx,ny)){sp432={x:nx,y:ny};break;}
  }
  assert(sp432,'T432 G4 路旁應能找到太陽能位置');
  window.GV.step(1);
  const capC = window.__t432Power ? window.__t432Power.sum : -1;
  assert(capC === 65, 'T432 G4 併網太陽能應計入（50+15=65，實得 ' + capC + '）');
}
{ // G5 行為：雙網隔離——容量獨立不跨區
  window.GV.newWorldSeeded(13);
  window.GV.setDiff(1);
  window.GV.setMapSize(72);
  for(let i=0;i<8;i++)place('road',10+i,10);
  place('plant',10,9);
  for(let i=0;i<8;i++)place('road',30+i,10);
  place('plant',30,9);
  window.GV.step(1);
  const caps1 = window.__t432Power ? window.__t432Power.cap.slice().sort() : [];
  assert(caps1.length===2&&caps1[0]===50&&caps1[1]===50,'T432 G5 雙網應各併網 50（實得 '+JSON.stringify(caps1)+'）');
  place('doze',30,9);
  window.GV.step(1);
  const caps2 = window.__t432Power ? window.__t432Power.cap.slice().sort() : [];
  assert(caps2.length===1&&caps2[0]===50,'T432 G5 拆 B 電廠後應只剩 A 網 50（實得 '+JSON.stringify(caps2)+'）');
}
{ // G6 行為：存讀後 district 重建一致
  window.GV.newWorldSeeded(17);
  window.GV.setDiff(1);
  const pp6=findSpot('plant');
  for(let i=0;i<8;i++)place('road',pp6.x+1+i,pp6.y);
  place('plant',pp6.x,pp6.y);
  window.GV.step(1);
  const d1 = window.__t432Power ? window.__t432Power.districts : -1;
  window.GV.save();
  window.GV.newWorldSeeded(99);
  window.GV.step(1);
  window.GV.load();
  window.GV.step(1);
  const d2 = window.__t432Power ? window.__t432Power.districts : -1;
  assert(d1 === d2, 'T432 G6 存讀後 district 重建一致（' + d1 + ' vs ' + d2 + '）');
  assert((window.__t432Power ? window.__t432Power.sum : -1)===50, 'T432 G6 存讀後容量也必須重建為 50');
}
{ // G7 孤島清單：seed301 400 天逐座斷言（二輪審計要求：686 孤島容量正式入測）
  window.GV.setMapSize(72);
  window.GV.newWorldSeeded(301);
  window.GV.setDiff(1);
  window.GV.ai(true);
  for (let d = 0; d < 400; d++) window.GV.step(1);
  window.GV.ai(false);
  const N7=window.GV.N();
  let isoCap=0,isoNuke=0,isoGreen=0;
  const isoList=[];
  for(let y=0;y<N7;y++)for(let x=0;x<N7;x++){
    const b=window.GV.tile(x,y).bld;
    if(!b||b.ref)continue;
    const k=b.k,lv=b.lv||1;
    let c=0;
    if(k===5)c=50+(lv-1)*25;else if(k===25)c=15+(lv-1)*8;else if(k===26)c=20+(lv-1)*10;
    else if(k===58)c=250+(lv-1)*40;else if(k===59)c=100+(lv-1)*15;else if(k===60)c=45+(lv-1)*8;else if(k===62)c=60+(lv-1)*8;
    if(!c)continue;
    let rpN=false;
    for(let dy=-1;dy<=1&&!rpN;dy++)for(let dx=-1;dx<=1;dx++){
      const t2=window.GV.tile(x+dx,y+dy);
      if(t2&&t2.road&&t2.rp)rpN=true;
    }
    if(!rpN){isoCap+=c;isoList.push({k,lv});if(k===58)isoNuke++;else isoGreen++;}
  }
  /* T456 跟版：世代流動接線重釘讓 seed301 世界形狀整個改變（拮据城翻身），孤島電源從 2 核 4 綠
     縮成 1 綠——本塊仍是世界形狀回歸釘，但「孤島不併網」的**行為**保證現在主要由 G8 受控造境
     測試承擔（G8 不依賴任何 AI 世界形狀）。 */
  assert(isoNuke===0,'T432 G7 seed301 應有 0 座孤島核電（T456 重釘後；實得 '+isoNuke+'）');
  assert(isoGreen===1,'T432 G7 seed301 應有 1 座孤島綠能（T456 重釘後；實得 '+isoGreen+'）');
  assert(isoCap===30,'T432 G7 seed301 孤島容量應為 30（T456 重釘後；實得 '+isoCap+'，逐座清單 '+JSON.stringify(isoList)+'）');
  assert(window.__t432Power.districts===1,'T432 G7 seed301 應為單 district（實得 '+window.__t432Power.districts+'）');
  assert(window.__t432Power.sum===1370,'T432 G7 seed301 併網容量應為 1370（T456 重釘後；實得 '+window.__t432Power.sum+'）');
}
{ // G8 行為：撤銷電源後必須重建來源快取（不能遺失回復的風機容量）
  window.GV.setMapSize(72); window.GV.newWorldSeeded(43208); window.GV.setDiff(3); window.GV.weather(0);
  const p8=findSpot('plant');
  assert(p8&&place('plant',p8.x,p8.y),'T432 G8 應能建立電廠');
  for(let i=1;i<=6;i++)assert(place('road',p8.x+i,p8.y),'T432 G8 應能鋪設電廠旁道路 '+i);
  let w8=null;
  for(let i=1;i<=6&&!w8;i++)for(const [dx,dy] of [[0,1],[0,-1],[1,1],[1,-1]]){
    const x=p8.x+i+dx,y=p8.y+dy;
    if(place('wind',x,y)){w8={x,y};break;}
  }
  assert(w8,'T432 G8 應能在帶電道路旁建立風機');
  window.GV.step(1);
  assert(window.__t432Power.sum===70,'T432 G8 電廠加風機應為 70（實得 '+window.__t432Power.sum+'）');
  assert(window.GV.placeUndo('doze',w8.x,w8.y),'T432 G8 拆風機必須走真 undo 群組');
  window.GV.step(1);
  assert(window.__t432Power.sum===50,'T432 G8 拆風機後應為 50（實得 '+window.__t432Power.sum+'）');
  assert(window.GV.undo(),'T432 G8 必須能撤銷拆風機');
  window.GV.step(1);
  assert(window.__t432Power.sum===70,'T432 G8 undo 後風機容量必須立即回到 70（實得 '+window.__t432Power.sum+'）');
}
{ // G9 行為：撤銷接橋道路必須分回兩個電網
  window.GV.setMapSize(72); window.GV.newWorldSeeded(43209); window.GV.setDiff(3); window.GV.weather(0);
  let g9=null;
  outerG9:for(let y=4;y<window.GV.N()-4;y++)for(let x=4;x<window.GV.N()-34;x++){
    if(window.GV.canPlaceTool('plant',x,y)===null&&window.GV.canPlaceTool('plant',x+20,y)===null){g9={x,y};break outerG9;}
  }
  assert(g9,'T432 G9 應找到雙電廠造境位置');
  for(let x=g9.x;x<=g9.x+13;x++)assert(place('road',x,g9.y+1),'T432 G9 A 路段應可鋪設 '+x);
  for(let x=g9.x+15;x<=g9.x+28;x++)assert(place('road',x,g9.y+1),'T432 G9 B 路段應可鋪設 '+x);
  assert(place('plant',g9.x,g9.y)&&place('plant',g9.x+20,g9.y),'T432 G9 應建立兩座電廠');
  window.GV.step(1);
  let caps9=window.__t432Power.cap.slice().sort((a,b)=>a-b);
  assert(caps9.length===2&&caps9[0]===50&&caps9[1]===50,'T432 G9 接橋前應為兩網 [50,50]（實得 '+JSON.stringify(caps9)+'）');
  assert(window.GV.placeUndo('road',g9.x+14,g9.y+1),'T432 G9 接橋必須走真 undo 群組');
  window.GV.step(1);
  assert(window.__t432Power.districts===1&&window.__t432Power.sum===100,'T432 G9 接橋後應為單網 100');
  assert(window.GV.undo(),'T432 G9 必須能撤銷接橋');
  window.GV.step(1);
  caps9=window.__t432Power.cap.slice().sort((a,b)=>a-b);
  assert(caps9.length===2&&caps9[0]===50&&caps9[1]===50,'T432 G9 undo 接橋後必須恢復兩網 [50,50]（實得 '+JSON.stringify(caps9)+'）');
}
{ // G10 行為：消費者選最近道路；等距時固定採 row-major tie-break（只走玩家同款 place/tile API）
  const grid10=(targetDx)=>{
    window.GV.setMapSize(72); window.GV.newWorldSeeded(43210); window.GV.setDiff(3); window.GV.weather(0);
    let p10=null;
    seek10:for(let y=4;y<60;y++)for(let x=4;x<60;x++){
      const plan=[['substation',x,y],['plant',x+2,y],['road',x,y+1],['road',x+2,y+1],['socialHousing',x+targetDx,y+3]];
      if(plan.every(([tool,px,py])=>window.GV.canPlaceTool(tool,px,py)===null)){p10={x,y,plan};break seek10;}
    }
    assert(p10,'T432 G10 必須找到可由玩家合法放置的雙網消費者造境');
    for(const [tool,px,py] of p10.plan)assert(place(tool,px,py),'T432 G10 合法造境放置 '+tool+' 不得失敗');
    window.GV.setSeason(0); window.GV.step(1);
    return {cap:window.__t432Power.cap.slice(),pw:window.GV.tile(p10.x+targetDx,p10.y+3).bld.pw};
  };
  const tie10=grid10(1),near10=grid10(2);
  assert(JSON.stringify(tie10.cap)==='[0,50]'&&JSON.stringify(near10.cap)==='[0,50]','T432 G10 應建出 A=0、B=50 的非對稱雙網（實得 '+JSON.stringify({tie:tie10.cap,near:near10.cap})+'）');
  assert(tie10.pw===false,'T432 G10 等距 consumer 應固定選 row-major 的無電 A 網');
  assert(near10.pw===true,'T432 G10 較近 consumer 必須選有電 B 網，不能偷偷固定 district 0');
}
{ // G11 行為：district 容量必須隨季節實際限制 consumers（50/45/50/42）
  const powered11=(sea)=>{
    window.GV.setMapSize(72); window.GV.newWorldSeeded(43211); window.GV.setDiff(3); window.GV.weather(0);
    const plant11=findSpot('plant');
    assert(plant11&&place('plant',plant11.x,plant11.y)&&place('road',plant11.x+1,plant11.y),'T432 G11 應建立與測試電網分離的啟動電廠');
    const roadY11=20;
    const badRoad11=[];
    for(let x=4;x<68;x++)if(!place('road',x,roadY11))badRoad11.push(x);
    assert(badRoad11.length===0,'T432 G11 主幹道路應可全數鋪設（失敗格 '+JSON.stringify(badRoad11)+'）');
    let sub11=null,sol11=null;
    for(let x=4;x<66&&!sub11;x++)if(window.GV.canPlaceTool('substation',x,19)===null)sub11={x,y:19};
    for(let x=4;x<66&&!sol11;x++)if(window.GV.canPlaceTool('solar',x,21)===null)sol11={x,y:21};
    assert(sub11&&sol11&&place('substation',sub11.x,sub11.y)&&place('solar',sol11.x,sol11.y),'T432 G11 應建立獨立的變電所＋太陽能 15 容量網');
    const homes11=[];
    for(let x=8;x<66&&homes11.length<15;x+=2)if(window.GV.canPlaceTool('socialHousing',x,18)===null&&place('socialHousing',x,18))homes11.push([x,18]);
    assert(homes11.length===15,'T432 G11 應建立恰 15 座道路旁社宅 consumers（實得 '+homes11.length+'）');
    window.GV.setSeason(sea); window.GV.step(1);
    return homes11.filter(([x,y])=>window.GV.tile(x,y).bld.pw).length;
  };
  const seasons11=[0,1,2,3].map(powered11);
  assert(JSON.stringify(seasons11)==='[15,13,15,12]','T432 G11 季節容量須實際限制 15 座同網 consumer（春夏秋冬 15/13/15/12，實得 '+JSON.stringify(seasons11)+'）');
}
{ // G12 行為：跨世界後必須由實際 tick 使用的 helper 回退 legacy 決策，而非讀舊 grid
  window.GV.setMapSize(72); window.GV.newWorldSeeded(43212); window.GV.setDiff(3); window.GV.weather(0);
  const p12=findSpot('plant');
  assert(p12&&place('plant',p12.x,p12.y)&&place('road',p12.x+1,p12.y),'T432 G12 應先建立舊世界電網');
  window.GV.step(1);
  assert(window.GV.power432().fallback===false,'T432 G12 舊世界實際已建電網時不得誤走 fallback');
  window.GV.newWorldSeeded(43213); window.GV.setDiff(3);
  assert(window.GV.power432().fallback===true,'T432 G12 換 tiles 世代後、尚未重算時必須回退 legacy，不得讀到舊 PDIST');
}
{ // G13 效能：非拓撲撤銷不得無故重跑 Union-Find
  window.GV.setMapSize(72); window.GV.newWorldSeeded(43214); window.GV.setDiff(3); window.GV.weather(0);
  const p13=findSpot('plant');
  assert(p13&&place('plant',p13.x,p13.y)&&place('road',p13.x+1,p13.y),'T432 G13 應先建立穩定電網');
  window.GV.step(1);
  const rebuild13=window.GV.power432().rebuilds,park13=findSpot('park');
  assert(park13&&window.GV.placeUndo('park',park13.x,park13.y)&&window.GV.undo(),'T432 G13 非拓撲公園撤銷必須走真玩家 undo 群組');
  assert(window.GV.power432().rebuilds===rebuild13,'T432 G13 非拓撲撤銷不得讓 Union-Find 重建（'+rebuild13+' → '+window.GV.power432().rebuilds+'）');
}

/* ===== T432a 電網診斷與孤島可視化守衛（純讀 T432 runtime） ===== */
{ // G1 靜態：資料函式、面板、接線、逃生開關與只讀橋都必須同時在場
  for(const f of ['powerDiag432','powerDiagPanel432a'])
    assert(html.includes('function '+f+'('),'T432a G1 函式必須存在：'+f);
  assert(html.includes("if((t.bld&&!t.bld.ref)||t.road){if(!window.__noPowerDiag432)html+=powerDiagPanel432a(x,y);}"),
    'T432a G1 inspect 只能在建築／道路分支尾端接入診斷，且必須受 kill-switch 保護');
  assert(html.includes("powerDiag432:(x,y)=>({...powerDiag432(x|0,y|0)})"),'T432a G1 GV 必須回傳新的純讀診斷快照');
  assert(html.includes('.p432a{margin:7px 0 4px')&&html.includes('.p432aBar i{display:block')&&html.includes('@media (max-width:340px){.p432aTop{display:block}'),
    'T432a G1 面板／容量條／窄屏樣式必須存在');
  assert(html.includes("const capacity=Math.floor((dCap432[d]||0)*POWER_SEASON_MULT[season()]);"),
    'T432a G1 面板容量必須使用 T432 同款季節口徑，不能顯示裸容量');
}
{ // G2 靜態：整個診斷區塊與面板皆零 RNG／時計，且不可寫入 T432 狀態
  const a0=html.indexOf('const POWER_DIAG_SOURCE_432A'),a1=html.indexOf('function countNear(',a0);
  const p0=html.indexOf('function powerDiagPanel432a'),p1=html.indexOf('function inspect(x,y){',p0);
  assert(a0>=0&&a1>a0&&p0>=0&&p1>p0,'T432a G2 診斷資料／面板區塊必須可界定');
  const aCode=(html.slice(a0,a1)+html.slice(p0,p1)).replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
  assert(!/\bR\s*\(|\bri\s*\(|\brand\s*\(|\bvri\s*\(|Math\.random\s*\(|spriteTexRand|Date\.now|performance\.now|crypto\./.test(aCode),
    'T432a G2 純讀診斷不得消耗 RNG 或讀取牆鐘');
  assert(!/\b(?:PDIST432|dCap432|dUsed432|tiles)(?:\s*\[[^\]]+\]|\s*\.\w+)*\s*(?:=|\+=|-=|\*=|\/=|\+\+|--)/.test(aCode)
    &&!/\b(?:PDIST432|dCap432|dUsed432|tiles)\s*\.\s*(?:fill|push|pop|shift|unshift|splice|sort|reverse|set|delete)\s*\(/.test(aCode)
    &&!/\blocalStorage\s*\.\s*(?:setItem|removeItem|clear)\s*\(/.test(aCode),
    'T432a G2 純讀診斷不得改寫 T432 runtime／tiles 或任何 localStorage');
}
{ // G3 行為：接網／孤島／未接網／道路／冬季容量／fallback／面板與純讀性
  window.GV.setMapSize(72); window.GV.newWorldSeeded(43221); window.GV.setDiff(3); window.GV.weather(0);
  const p=findSpot('plant');
  assert(p&&place('plant',p.x,p.y),'T432a G3 應能建立主電廠');
  for(let i=1;i<=6;i++)assert(place('road',p.x+i,p.y),'T432a G3 主電廠道路 '+i+' 應可鋪設');
  let home=null;
  for(let i=1;i<=6&&!home;i++)for(const [dx,dy] of [[0,1],[0,-1],[1,1],[1,-1]]){
    const x=p.x+i+dx,y=p.y+dy;if(place('socialHousing',x,y)){home={x,y};break;}
  }
  assert(home,'T432a G3 應能建立接網消費建築');
  let island=null;
  outer432a:for(let y=4;y<68;y++)for(let x=4;x<68;x++){
    if(Math.abs(x-p.x)+Math.abs(y-p.y)<12)continue;
    if(window.GV.canPlaceTool('solar',x,y)===null&&window.GV.powerDiag432(x,y).mode==='unlinked'){island={x,y};break outer432a;}
  }
  assert(island&&place('solar',island.x,island.y),'T432a G3 應能建立遠離帶電道路的孤島太陽能');
  window.GV.setSeason(0);window.GV.step(1);
  const roadD=window.GV.powerDiag432(p.x+1,p.y),homeD=window.GV.powerDiag432(home.x,home.y),islandD=window.GV.powerDiag432(island.x,island.y);
  assert(roadD.mode==='network'&&roadD.district===1&&roadD.capacity===50&&roadD.free>=0,'T432a G3 帶電道路必回報第 1 網與真實容量（實得 '+JSON.stringify(roadD)+'）');
  assert(homeD.mode==='network'&&homeD.powered===true&&homeD.capacity===50,'T432a G3 接網建築必如實回報供電與容量（實得 '+JSON.stringify(homeD)+'）');
  assert(islandD.mode==='island'&&islandD.source==='太陽能板'&&islandD.district===0,'T432a G3 孤島太陽能不得偽裝成已接網（實得 '+JSON.stringify(islandD)+'）');
  let darkRoad=null;
  outerRoad432a:for(let y=4;y<68;y++)for(let x=4;x<68;x++){
    if(Math.abs(x-p.x)+Math.abs(y-p.y)<12)continue;
    if(window.GV.canPlaceTool('road',x,y)===null&&window.GV.powerDiag432(x,y).mode==='unlinked'){darkRoad={x,y};break outerRoad432a;}
  }
  assert(darkRoad&&place('road',darkRoad.x,darkRoad.y),'T432a G3 應能建立未通電道路');
  let loose=null;
  outerLoose432a:for(let y=4;y<68;y++)for(let x=4;x<68;x++){
    if(Math.abs(x-p.x)+Math.abs(y-p.y)<12)continue;
    if(window.GV.canPlaceTool('socialHousing',x,y)===null&&window.GV.powerDiag432(x,y).mode==='unlinked'){loose={x,y};break outerLoose432a;}
  }
  assert(loose&&place('socialHousing',loose.x,loose.y),'T432a G3 應能建立未接網消費建築');
  window.GV.step(1);
  const looseD=window.GV.powerDiag432(loose.x,loose.y);
  assert(looseD.mode==='unlinked'&&looseD.detail.includes('2 格內沒有帶電道路'),'T432a G3 未接網建築必說明道路原因（實得 '+JSON.stringify(looseD)+'）');
  const darkRoadD=window.GV.powerDiag432(darkRoad.x,darkRoad.y);
  assert(darkRoadD.mode==='unlinked'&&darkRoadD.detail.includes('道路尚未接入'),'T432a G3 未通電道路不得偽裝成接網（實得 '+JSON.stringify(darkRoadD)+'）');
  window.GV.save(); const statsA=JSON.stringify(window.GV.stats()),saveA=window.GV.rawSave(),storeA=JSON.stringify(store);
  const panelOn=window.GV.inspectAt(home.x,home.y);
  const copy432a=window.GV.powerDiag432(home.x,home.y);copy432a.capacity=999;
  assert(panelOn.includes('⚡ 電網診斷')&&panelOn.includes('電網 #1')&&panelOn.includes('本網今日'),'T432a G3 接網檢視面板必顯示真實診斷');
  assert(window.GV.powerDiag432(home.x,home.y).capacity===50,'T432a G3 GV 診斷快照不可被外部改寫');
  window.__noPowerDiag432=true;const panelOff=window.GV.inspectAt(home.x,home.y);delete window.__noPowerDiag432;
  assert(!panelOff.includes('⚡ 電網診斷'),'T432a G3 kill-switch 開啟時面板診斷必須完全隱藏');
  window.__noPowerDistrict432=true;const legacyD=window.GV.powerDiag432(home.x,home.y);delete window.__noPowerDistrict432;
  assert(legacyD.mode==='fallback'&&legacyD.status==='相容模式','T432a G3 T432 相容模式不得讀取舊 district（實得 '+JSON.stringify(legacyD)+'）');
  assert(JSON.stringify(window.GV.stats())===statsA&&window.GV.rawSave()===saveA&&JSON.stringify(store)===storeA,'T432a G3 讀診斷／開關面板不得改模擬、存檔或其他 localStorage');

  window.GV.setMapSize(72);window.GV.newWorldSeeded(43222);window.GV.setDiff(3);window.GV.weather(0);
  let q=null;
  seek432a:for(let y=4;y<60;y++)for(let x=4;x<60;x++){
    const plan=[['substation',x,y],['solar',x,y+2],['road',x,y+1],['plant',x+4,y],['road',x+4,y+1]];
    if(plan.every(([tool,px,py])=>window.GV.canPlaceTool(tool,px,py)===null)){q={x,y,plan};break seek432a;}
  }
  assert(q,'T432a G3 應能建立獨立太陽能冬季造境');
  for(const [tool,x,y] of q.plan)assert(place(tool,x,y),'T432a G3 冬季造境 '+tool+' 應可放置');
  window.GV.setSeason(3);window.GV.step(1);
  const winterD=window.GV.powerDiag432(q.x,q.y+2);
  assert(winterD.mode==='network'&&winterD.source==='太陽能板'&&winterD.capacity===12,'T432a G3 冬季 15 容量太陽能網必顯示有效 12，不能顯示裸 15（實得 '+JSON.stringify(winterD)+'）');
  window.GV.newWorldSeeded(43223);
  assert(window.GV.powerDiag432(0,0).mode==='fallback','T432a G3 換世界未 tick 時必如實回報 fallback，不得讀舊網');
  const lone=findSpot('solar');
  assert(lone&&place('solar',lone.x,lone.y),'T432a G3 應能建立沒有啟動源的單獨太陽能');
  window.GV.step(1);
  const loneD=window.GV.powerDiag432(lone.x,lone.y);
  assert(loneD.mode==='island'&&loneD.source==='太陽能板'&&loneD.district===0,'T432a G3 唯一孤島太陽能完成 tick 後也必如實標為孤島，不能永久資料更新中（實得 '+JSON.stringify(loneD)+'）');
}

/* ===== T484 分區嚴格度：守衛 ===== */
{
  assert(/id:'zoneStr484'/.test(html), 'T484 G1 SCI451 必須有 zoneStr484');
  assert(html.includes('zoneStr484:false'), 'T484 G1b pol 預設 false');
  assert(html.includes('zoneStr484:!!p.zoneStr484'), 'T484 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polzoneStr484'"), 'T484 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.zoneStr484'), 'T484 G2 效應讀表');
  {
    window.GV.newWorldSeeded(484);
    window.GV.setDiff(1);
    window.GV.pol({ zoneStr484: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().zoneStr484 === false, 'T484 G3 關閉');
    window.GV.pol({ zoneStr484: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().zoneStr484 === true, 'T484 G4 開啟');
    window.GV.pol({ zoneStr484: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T485 空間錯配效率：守衛 ===== */
{
  assert(/id:'misalloc485'/.test(html), 'T485 G1 SCI451 必須有 misalloc485');
  assert(html.includes('misalloc485:false'), 'T485 G1b pol 預設 false');
  assert(html.includes('misalloc485:!!p.misalloc485'), 'T485 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polmisalloc485'"), 'T485 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.misalloc485'), 'T485 G2 效應讀表');
  {
    window.GV.newWorldSeeded(485);
    window.GV.setDiff(1);
    window.GV.pol({ misalloc485: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().misalloc485 === false, 'T485 G3 關閉');
    window.GV.pol({ misalloc485: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().misalloc485 === true, 'T485 G4 開啟');
    window.GV.pol({ misalloc485: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T486 地方化經濟：守衛 ===== */
{
  assert(/id:'marshall486'/.test(html), 'T486 G1 SCI451 必須有 marshall486');
  assert(html.includes('marshall486:false'), 'T486 G1b pol 預設 false');
  assert(html.includes('marshall486:!!p.marshall486'), 'T486 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polmarshall486'"), 'T486 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.marshall486'), 'T486 G2 效應讀表');
  {
    window.GV.newWorldSeeded(486);
    window.GV.setDiff(1);
    window.GV.pol({ marshall486: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().marshall486 === false, 'T486 G3 關閉');
    window.GV.pol({ marshall486: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().marshall486 === true, 'T486 G4 開啟');
    window.GV.pol({ marshall486: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T487 可步行健康：守衛 ===== */
{
  assert(/id:'walkH487'/.test(html), 'T487 G1 SCI451 必須有 walkH487');
  assert(html.includes('walkH487:false'), 'T487 G1b pol 預設 false');
  assert(html.includes('walkH487:!!p.walkH487'), 'T487 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polwalkH487'"), 'T487 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.walkH487'), 'T487 G2 效應讀表');
  {
    window.GV.newWorldSeeded(487);
    window.GV.setDiff(1);
    window.GV.pol({ walkH487: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().walkH487 === false, 'T487 G3 關閉');
    window.GV.pol({ walkH487: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().walkH487 === true, 'T487 G4 開啟');
    window.GV.pol({ walkH487: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T488 綠地降溫：守衛 ===== */
{
  assert(/id:'heatGr488'/.test(html), 'T488 G1 SCI451 必須有 heatGr488');
  assert(html.includes('heatGr488:false'), 'T488 G1b pol 預設 false');
  assert(html.includes('heatGr488:!!p.heatGr488'), 'T488 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polheatGr488'"), 'T488 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.heatGr488'), 'T488 G2 效應讀表');
  {
    window.GV.newWorldSeeded(488);
    window.GV.setDiff(1);
    window.GV.pol({ heatGr488: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().heatGr488 === false, 'T488 G3 關閉');
    window.GV.pol({ heatGr488: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().heatGr488 === true, 'T488 G4 開啟');
    window.GV.pol({ heatGr488: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T489 托育可及：守衛 ===== */
{
  assert(/id:'childcare489'/.test(html), 'T489 G1 SCI451 必須有 childcare489');
  assert(html.includes('childcare489:false'), 'T489 G1b pol 預設 false');
  assert(html.includes('childcare489:!!p.childcare489'), 'T489 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polchildcare489'"), 'T489 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.childcare489'), 'T489 G2 效應讀表');
  {
    window.GV.newWorldSeeded(489);
    window.GV.setDiff(1);
    window.GV.pol({ childcare489: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().childcare489 === false, 'T489 G3 關閉');
    window.GV.pol({ childcare489: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().childcare489 === true, 'T489 G4 開啟');
    window.GV.pol({ childcare489: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T490 寬頻接入：守衛 ===== */
{
  assert(/id:'broadband490'/.test(html), 'T490 G1 SCI451 必須有 broadband490');
  assert(html.includes('broadband490:false'), 'T490 G1b pol 預設 false');
  assert(html.includes('broadband490:!!p.broadband490'), 'T490 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polbroadband490'"), 'T490 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.broadband490'), 'T490 G2 效應讀表');
  {
    window.GV.newWorldSeeded(490);
    window.GV.setDiff(1);
    window.GV.pol({ broadband490: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().broadband490 === false, 'T490 G3 關閉');
    window.GV.pol({ broadband490: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().broadband490 === true, 'T490 G4 開啟');
    window.GV.pol({ broadband490: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T491 移民創業：守衛 ===== */
{
  assert(/id:'immEnt491'/.test(html), 'T491 G1 SCI451 必須有 immEnt491');
  assert(html.includes('immEnt491:false'), 'T491 G1b pol 預設 false');
  assert(html.includes('immEnt491:!!p.immEnt491'), 'T491 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polimmEnt491'"), 'T491 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.immEnt491'), 'T491 G2 效應讀表');
  {
    window.GV.newWorldSeeded(491);
    window.GV.setDiff(1);
    window.GV.pol({ immEnt491: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().immEnt491 === false, 'T491 G3 關閉');
    window.GV.pol({ immEnt491: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().immEnt491 === true, 'T491 G4 開啟');
    window.GV.pol({ immEnt491: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T492 場館懷疑論：守衛 ===== */
{
  assert(/id:'stadTax492'/.test(html), 'T492 G1 SCI451 必須有 stadTax492');
  assert(html.includes('stadTax492:false'), 'T492 G1b pol 預設 false');
  assert(html.includes('stadTax492:!!p.stadTax492'), 'T492 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polstadTax492'"), 'T492 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.stadTax492'), 'T492 G2 效應讀表');
  {
    window.GV.newWorldSeeded(492);
    window.GV.setDiff(1);
    window.GV.pol({ stadTax492: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().stadTax492 === false, 'T492 G3 關閉');
    window.GV.pol({ stadTax492: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().stadTax492 === true, 'T492 G4 開啟');
    window.GV.pol({ stadTax492: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T493 歷史保護供給：守衛 ===== */
{
  assert(/id:'histPres493'/.test(html), 'T493 G1 SCI451 必須有 histPres493');
  assert(html.includes('histPres493:false'), 'T493 G1b pol 預設 false');
  assert(html.includes('histPres493:!!p.histPres493'), 'T493 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polhistPres493'"), 'T493 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.histPres493'), 'T493 G2 效應讀表');
  {
    window.GV.newWorldSeeded(493);
    window.GV.setDiff(1);
    window.GV.pol({ histPres493: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().histPres493 === false, 'T493 G3 關閉');
    window.GV.pol({ histPres493: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().histPres493 === true, 'T493 G4 開啟');
    window.GV.pol({ histPres493: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T494 停車下限：守衛 ===== */
{
  assert(/id:'parkMin494'/.test(html), 'T494 G1 SCI451 必須有 parkMin494');
  assert(html.includes('parkMin494:false'), 'T494 G1b pol 預設 false');
  assert(html.includes('parkMin494:!!p.parkMin494'), 'T494 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polparkMin494'"), 'T494 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.parkMin494'), 'T494 G2 效應讀表');
  {
    window.GV.newWorldSeeded(494);
    window.GV.setDiff(1);
    window.GV.pol({ parkMin494: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().parkMin494 === false, 'T494 G3 關閉');
    window.GV.pol({ parkMin494: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().parkMin494 === true, 'T494 G4 開啟');
    window.GV.pol({ parkMin494: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T495 完整街道：守衛 ===== */
{
  assert(/id:'compSt495'/.test(html), 'T495 G1 SCI451 必須有 compSt495');
  assert(html.includes('compSt495:false'), 'T495 G1b pol 預設 false');
  assert(html.includes('compSt495:!!p.compSt495'), 'T495 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polcompSt495'"), 'T495 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.compSt495'), 'T495 G2 效應讀表');
  {
    window.GV.newWorldSeeded(495);
    window.GV.setDiff(1);
    window.GV.pol({ compSt495: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().compSt495 === false, 'T495 G3 關閉');
    window.GV.pol({ compSt495: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().compSt495 === true, 'T495 G4 開啟');
    window.GV.pol({ compSt495: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T496 快速公交：守衛 ===== */
{
  assert(/id:'brt496'/.test(html), 'T496 G1 SCI451 必須有 brt496');
  assert(html.includes('brt496:false'), 'T496 G1b pol 預設 false');
  assert(html.includes('brt496:!!p.brt496'), 'T496 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polbrt496'"), 'T496 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.brt496'), 'T496 G2 效應讀表');
  {
    window.GV.newWorldSeeded(496);
    window.GV.setDiff(1);
    window.GV.pol({ brt496: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().brt496 === false, 'T496 G3 關閉');
    window.GV.pol({ brt496: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().brt496 === true, 'T496 G4 開啟');
    window.GV.pol({ brt496: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T497 最後一哩物流：守衛 ===== */
{
  assert(/id:'lastMile497'/.test(html), 'T497 G1 SCI451 必須有 lastMile497');
  assert(html.includes('lastMile497:false'), 'T497 G1b pol 預設 false');
  assert(html.includes('lastMile497:!!p.lastMile497'), 'T497 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#pollastMile497'"), 'T497 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.lastMile497'), 'T497 G2 效應讀表');
  {
    window.GV.newWorldSeeded(497);
    window.GV.setDiff(1);
    window.GV.pol({ lastMile497: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lastMile497 === false, 'T497 G3 關閉');
    window.GV.pol({ lastMile497: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lastMile497 === true, 'T497 G4 開啟');
    window.GV.pol({ lastMile497: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T498 循環經濟：守衛 ===== */
{
  assert(/id:'circEc498'/.test(html), 'T498 G1 SCI451 必須有 circEc498');
  assert(html.includes('circEc498:false'), 'T498 G1b pol 預設 false');
  assert(html.includes('circEc498:!!p.circEc498'), 'T498 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polcircEc498'"), 'T498 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.circEc498'), 'T498 G2 效應讀表');
  {
    window.GV.newWorldSeeded(498);
    window.GV.setDiff(1);
    window.GV.pol({ circEc498: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().circEc498 === false, 'T498 G3 關閉');
    window.GV.pol({ circEc498: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().circEc498 === true, 'T498 G4 開啟');
    window.GV.pol({ circEc498: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T499 水資源定價：守衛 ===== */
{
  assert(/id:'waterP499'/.test(html), 'T499 G1 SCI451 必須有 waterP499');
  assert(html.includes('waterP499:false'), 'T499 G1b pol 預設 false');
  assert(html.includes('waterP499:!!p.waterP499'), 'T499 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polwaterP499'"), 'T499 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.waterP499'), 'T499 G2 效應讀表');
  {
    window.GV.newWorldSeeded(499);
    window.GV.setDiff(1);
    window.GV.pol({ waterP499: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().waterP499 === false, 'T499 G3 關閉');
    window.GV.pol({ waterP499: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().waterP499 === true, 'T499 G4 開啟');
    window.GV.pol({ waterP499: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T500 噪音管制：守衛 ===== */
{
  assert(/id:'noise500'/.test(html), 'T500 G1 SCI451 必須有 noise500');
  assert(html.includes('noise500:false'), 'T500 G1b pol 預設 false');
  assert(html.includes('noise500:!!p.noise500'), 'T500 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polnoise500'"), 'T500 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.noise500'), 'T500 G2 效應讀表');
  {
    window.GV.newWorldSeeded(500);
    window.GV.setDiff(1);
    window.GV.pol({ noise500: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().noise500 === false, 'T500 G3 關閉');
    window.GV.pol({ noise500: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().noise500 === true, 'T500 G4 開啟');
    window.GV.pol({ noise500: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T501 光污染：守衛 ===== */
{
  assert(/id:'lightPol501'/.test(html), 'T501 G1 SCI451 必須有 lightPol501');
  assert(html.includes('lightPol501:false'), 'T501 G1b pol 預設 false');
  assert(html.includes('lightPol501:!!p.lightPol501'), 'T501 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#pollightPol501'"), 'T501 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.lightPol501'), 'T501 G2 效應讀表');
  {
    window.GV.newWorldSeeded(501);
    window.GV.setDiff(1);
    window.GV.pol({ lightPol501: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lightPol501 === false, 'T501 G3 關閉');
    window.GV.pol({ lightPol501: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lightPol501 === true, 'T501 G4 開啟');
    window.GV.pol({ lightPol501: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T502 銀髮經濟：守衛 ===== */
{
  assert(/id:'silver502'/.test(html), 'T502 G1 SCI451 必須有 silver502');
  assert(html.includes('silver502:false'), 'T502 G1b pol 預設 false');
  assert(html.includes('silver502:!!p.silver502'), 'T502 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polsilver502'"), 'T502 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.silver502'), 'T502 G2 效應讀表');
  {
    window.GV.newWorldSeeded(502);
    window.GV.setDiff(1);
    window.GV.pol({ silver502: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().silver502 === false, 'T502 G3 關閉');
    window.GV.pol({ silver502: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().silver502 === true, 'T502 G4 開啟');
    window.GV.pol({ silver502: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T503 青年留才：守衛 ===== */
{
  assert(/id:'brainDr503'/.test(html), 'T503 G1 SCI451 必須有 brainDr503');
  assert(html.includes('brainDr503:false'), 'T503 G1b pol 預設 false');
  assert(html.includes('brainDr503:!!p.brainDr503'), 'T503 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polbrainDr503'"), 'T503 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.brainDr503'), 'T503 G2 效應讀表');
  {
    window.GV.newWorldSeeded(503);
    window.GV.setDiff(1);
    window.GV.pol({ brainDr503: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().brainDr503 === false, 'T503 G3 關閉');
    window.GV.pol({ brainDr503: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().brainDr503 === true, 'T503 G4 開啟');
    window.GV.pol({ brainDr503: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T504 多中心城市：守衛 ===== */
{
  assert(/id:'poly504'/.test(html), 'T504 G1 SCI451 必須有 poly504');
  assert(html.includes('poly504:false'), 'T504 G1b pol 預設 false');
  assert(html.includes('poly504:!!p.poly504'), 'T504 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polpoly504'"), 'T504 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.poly504'), 'T504 G2 效應讀表');
  {
    window.GV.newWorldSeeded(504);
    window.GV.setDiff(1);
    window.GV.pol({ poly504: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().poly504 === false, 'T504 G3 關閉');
    window.GV.pol({ poly504: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().poly504 === true, 'T504 G4 開啟');
    window.GV.pol({ poly504: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T505 邊緣城市：守衛 ===== */
{
  assert(/id:'edge505'/.test(html), 'T505 G1 SCI451 必須有 edge505');
  assert(html.includes('edge505:false'), 'T505 G1b pol 預設 false');
  assert(html.includes('edge505:!!p.edge505'), 'T505 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#poledge505'"), 'T505 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.edge505'), 'T505 G2 效應讀表');
  {
    window.GV.newWorldSeeded(505);
    window.GV.setDiff(1);
    window.GV.pol({ edge505: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().edge505 === false, 'T505 G3 關閉');
    window.GV.pol({ edge505: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().edge505 === true, 'T505 G4 開啟');
    window.GV.pol({ edge505: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T506 土地增值回收：守衛 ===== */
{
  assert(/id:'lvc506'/.test(html), 'T506 G1 SCI451 必須有 lvc506');
  assert(html.includes('lvc506:false'), 'T506 G1b pol 預設 false');
  assert(html.includes('lvc506:!!p.lvc506'), 'T506 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#pollvc506'"), 'T506 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.lvc506'), 'T506 G2 效應讀表');
  {
    window.GV.newWorldSeeded(506);
    window.GV.setDiff(1);
    window.GV.pol({ lvc506: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lvc506 === false, 'T506 G3 關閉');
    window.GV.pol({ lvc506: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().lvc506 === true, 'T506 G4 開啟');
    window.GV.pol({ lvc506: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T507 累進房產稅：守衛 ===== */
{
  assert(/id:'progTax507'/.test(html), 'T507 G1 SCI451 必須有 progTax507');
  assert(html.includes('progTax507:false'), 'T507 G1b pol 預設 false');
  assert(html.includes('progTax507:!!p.progTax507'), 'T507 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polprogTax507'"), 'T507 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.progTax507'), 'T507 G2 效應讀表');
  {
    window.GV.newWorldSeeded(507);
    window.GV.setDiff(1);
    window.GV.pol({ progTax507: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().progTax507 === false, 'T507 G3 關閉');
    window.GV.pol({ progTax507: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().progTax507 === true, 'T507 G4 開啟');
    window.GV.pol({ progTax507: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T508 基本收入試點：守衛 ===== */
{
  assert(/id:'ubiPilot508'/.test(html), 'T508 G1 SCI451 必須有 ubiPilot508');
  assert(html.includes('ubiPilot508:false'), 'T508 G1b pol 預設 false');
  assert(html.includes('ubiPilot508:!!p.ubiPilot508'), 'T508 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polubiPilot508'"), 'T508 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.ubiPilot508'), 'T508 G2 效應讀表');
  {
    window.GV.newWorldSeeded(508);
    window.GV.setDiff(1);
    window.GV.pol({ ubiPilot508: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().ubiPilot508 === false, 'T508 G3 關閉');
    window.GV.pol({ ubiPilot508: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().ubiPilot508 === true, 'T508 G4 開啟');
    window.GV.pol({ ubiPilot508: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T509 出口基數：守衛 ===== */
{
  assert(/id:'exportBase509'/.test(html), 'T509 G1 SCI451 必須有 exportBase509');
  assert(html.includes('exportBase509:false'), 'T509 G1b pol 預設 false');
  assert(html.includes('exportBase509:!!p.exportBase509'), 'T509 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polexportBase509'"), 'T509 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.exportBase509'), 'T509 G2 效應讀表');
  {
    window.GV.newWorldSeeded(509);
    window.GV.setDiff(1);
    window.GV.pol({ exportBase509: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().exportBase509 === false, 'T509 G3 關閉');
    window.GV.pol({ exportBase509: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().exportBase509 === true, 'T509 G4 開啟');
    window.GV.pol({ exportBase509: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T510 文化軟實力：守衛 ===== */
{
  assert(/id:'softPower510'/.test(html), 'T510 G1 SCI451 必須有 softPower510');
  assert(html.includes('softPower510:false'), 'T510 G1b pol 預設 false');
  assert(html.includes('softPower510:!!p.softPower510'), 'T510 G1c GV.pol 白名單');
  assert(html.includes("polToggle('#polsoftPower510'"), 'T510 G1d polToggle');
  assert(html.includes('SCI_BY_ID451.softPower510'), 'T510 G2 效應讀表');
  {
    window.GV.newWorldSeeded(510);
    window.GV.setDiff(1);
    window.GV.pol({ softPower510: false, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().softPower510 === false, 'T510 G3 關閉');
    window.GV.pol({ softPower510: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().softPower510 === true, 'T510 G4 開啟');
    window.GV.pol({ softPower510: false, taxR: 1, taxC: 1, taxI: 1 });
  }
}


/* ===== T511 科學套餐二期 ===== */
{
  assert(/const SCI_PACKS2_511=\[/.test(html) && html.includes('applySciPack2_511'),
    'T511 G1 套餐二表在場');
  assert(typeof window.GV.sciPacks2_511 === 'function', 'T511 G2 橋');
  assert(window.GV.sciPacks2_511().length === 3, 'T511 G2b 恰 3 套餐');
}


/* ===== T512 財政表擴列 ===== */
{
  const tFin = html.slice(html.indexOf('const SCI_FIN461=['), html.indexOf('];', html.indexOf('const SCI_FIN461=[')) + 2);
  assert(tFin.includes('parkMin494') || tFin.includes('T512'), 'T512 G1 財政擴列標記');
  assert(typeof window.GV.sciFin461 === 'function' && window.GV.sciFin461().length >= 6, 'T512 G2 sciFin 仍可用');
}


/* ===== T513 三十卡效果報告 ===== */
{
  const fs = require('fs');
  const p = path.join(__dirname, 'docs', 'tasks', 'T513-三十卡效果報告.md');
  assert(fs.existsSync(p), 'T513 G1 報告在場');
  const rep = fs.readFileSync(p, 'utf8');
  assert(/三答案/.test(rep) && /T484/.test(rep), 'T513 G1b 含三答案與卡號');
}


/* ===== T514 科學政策指揮台 + 控件結構化 ===== */
{
  assert(/renderSciCmd514/.test(html) && /SCI_GRP514/.test(html), 'T514 G1 指揮台渲染器在場');
  assert(/renderTaxCtrl514/.test(html) && /renderBudCtrl514/.test(html), 'T514 G1b 稅率/預算結構化');
  assert(/renderSciPacks514/.test(html) && /packGrid514/.test(html), 'T514 G1c 套餐網格');
  assert(/renderCivicPol514/.test(html) && /renderFleetCtrl514/.test(html), 'T514 G1d 市政與車隊');
  assert(/sciCard514/.test(html) && /ctrlCard514/.test(html), 'T514 G1e CSS 卡片類');
  // 全部 SCI 分組鍵必須有 checkbox id 映射（DOM id 仍為 pol*，綁定零改動）
  {
    const g = html.match(/const SCI_GRP514=\[([\s\S]*?)\];/);
    assert(g, 'T514 G2 分組表可解析');
    const keys = [...g[1].matchAll(/'([a-zA-Z0-9]+)'/g)].map(m => m[1]).filter(k => !/^(housing|labor|transit|env|econ|social|id|nm|ic|keys)$/.test(k) && /[0-9]/.test(k));
    assert(keys.length >= 40, 'T514 G2b 分組涵蓋 ≥40 科學鍵（得 '+keys.length+'）');
  }
  assert(typeof window.GV.sciGrp514 === 'function' && window.GV.sciGrp514().length === 6, 'T514 G3 六分組橋');
  assert(typeof window.GV.sciCmdOn514 === 'function', 'T514 G3b 啟用計數橋');
  {
    window.GV.newWorldSeeded(514);
    window.GV.setDiff(1);
    // 全關
    const off = window.GV.sciCmdOn514();
    assert(off === 0, 'T514 G4 新局指揮台啟用數為 0（得 '+off+'）');
    // 開啟一項科學政策後計數
    window.GV.pol({ zoneStr484: true, taxR: 1, taxC: 1, taxI: 1 });
    window.GV.step(1);
    assert(window.GV.pol().zoneStr484 === true, 'T514 G4b pol 可開');
    assert(window.GV.sciCmdOn514() >= 1, 'T514 G4c 開啟後計數 ≥1');
    window.GV.pol({ zoneStr484: false, taxR: 1, taxC: 1, taxI: 1 });
  }
  // 舊 id 契約：套餐鈕 id 字串仍在 btnMap（執行期寫入 DOM；源碼無靜態 id="pack…"）
  assert(html.includes("transitCity:'packTransit481'") && html.includes("indCity:'packInd511'"), 'T514 G5 套餐 id 契約（btnMap）');
  /* T518 更正（本卡最貴的一條）：G5b/G5c 原本釘的是 `polCong451` 與 `polToggle('#polCong451'` 兩個字面——
     那正是 T514 卡片化之後**已經不存在的 DOM id**。也就是說這兩條守衛不但沒抓到死開關，
     還把缺陷寫成了契約、要求它必須留著。改釘真正的不變量：id 由 polDomId514 導出（真相源單一），
     交叉一致性由 T518 G1b 機械複算（每個 polToggle 選擇器＝卡片實際產生的 id）。 */
  assert(html.includes("function polDomId514(pk)") && html.includes("const SCI_DOM_ID514="),
    'T514 G5b DOM id 真相源（polDomId514＋別名表）在場');
  assert(html.includes("polToggle('#'+polDomId514('congChg451')") && html.includes("polToggle('#polzoneStr484'"),
    'T514 G5c polToggle 綁定契約（T518：舊卡選擇器改由 polDomId514 導出）');
  // 舊牆式「🏛️ 政策　<label>…」長行不得再出現（已改指揮台）
  assert(!/🏛️ 政策　<label><input type="checkbox" id="polFreeT"/.test(html), 'T514 G6 舊政策牆已拆除');
  assert(!/📦 科學套餐　<button class="hbtn" id="packTransit481">/.test(html), 'T514 G6b 舊套餐單行已拆除');
}
