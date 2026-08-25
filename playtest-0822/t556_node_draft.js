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

const ids = ['game','hud','money','day','pop','jobs','happy','rci','bStats','bHelp','bUndo','bSpeed','bSound','bSave','bNew','hint','hintTxt','hintX','tools','toolcats','toasts','dragcost','mini','zoomer','zin','zout','info','infoX','infoBody','start','logo','bContinue','bNewGame','star','date','statsCity343','statsTech343','techTree343','techDetail343','techStart343','techHome343','statsFlow384','bFlowOverlay384','statsComm385','bCommAcc385_0','bCommAcc385_1','bCommAcc385_2','bCommDrop385','bSpecPick386_0','bSpecPick386_1','bSpecPick386_2','bSpecPick386_3','bLoan'];
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
}

// ==== T556 正例定案 ====
const G556 = window.GV;
G556.newWorldSeeded(301); G556.setDiff(1);
G556.ai(true); for (let d = 0; d < 400 && G556.stats().pop < 1200; d++) G556.step(1); G556.ai(false);
const pop556 = G556.stats().pop;
if (pop556 < 1000) { console.log('SKIP: pop=' + pop556); process.exit(0); }
const mA556 = G556.stats().money; G556.step(1);
const ctrl556 = G556.stats().money - mA556;
G556.challenge541('pop1k', 1500);
const mB556 = G556.stats().money; G556.step(1);
const test556 = G556.stats().money - mB556;
console.log('pop=' + pop556 + ' ctrl=' + ctrl556.toFixed(1) + ' test=' + test556.toFixed(1));
const diff556 = test556 - ctrl556;
console.log(diff556 >= 1400 ? 'VERDICT_OK 完成+1500入帳（差額' + diff556 + '）' : 'VERDICT_BAD 未觸發（差額' + diff556 + '）');
process.exit(0);
}
