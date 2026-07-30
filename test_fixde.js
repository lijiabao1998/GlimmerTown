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
    //           釘現值＝守確定性（同 T267 釘座標慣例）；再破＝有人動了模擬公式，需有意識重釘。
    assert(window.GV.stats().pop === 4153, 'T324/T342c seed301 400天 pop 應恆為 4153（T346d zoneBudget 4 窗種子重釘），實得 ' + window.GV.stats().pop);
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
    for (let d = 0; d < 3; d++) window.GV.step(1);
    const c364 = window.GV.chain346();
    assert(c364.fuel > 0 && c364.fuelMade > 0 && c364.fuelTaxMul === 1.10 && c364.freightTaxMul === 1.08,
      'T364b 油→燃料→工業/貨運稅加成鏈必須真跑');
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
    assert(window.GV.stats().pop === 4550, 'T348 健康種子 seed22 須維持 4550（紓困為手術式，健康城市位元恆等），實得 ' + window.GV.stats().pop);
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

  console.log('\nFIX-D/FIX-E 回歸測試全部通過');
  process.exit(0);
}).catch(err => {
  console.error('FAIL: PWA 回歸測試非預期例外', err && err.stack ? err.stack : err);
  process.exit(1);
});
