// T600 真 Chrome 實拍：seed22 沙盒（難度 3）長到第 420 天，預覽開關打開（?T596=1），同一座城、同一個鏡頭各拍一次
// 改前（window.__noGrad600=true＝款式照 bd.v，T596 原樣）與改後（v600）：全城 z0.6、市中心 z1／z2、郊區 z1、夜景、冬煙、岸邊倒影、旋轉 90°；
// 另拍第 400 天的市中心 z1（縮時對照用），並回報 errLog、預覽統計。
// 用法：node docs/tasks/t600-shots/scene600.js [--port=8621] [--out=輸出目錄]
// 邊界：只載倉庫的暫存副本；載入前設 glimmerville.v1.slot='3'；不碰玩家目錄、不用 8123／8199。零依賴（Node 22+ 內建 WebSocket）。
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8621), DEV = PORT + 1000, OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'scene600')));
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
fs.mkdirSync(OUT, { recursive: true });
const REPO = path.resolve(__dirname, '..', '..', '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scene600-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
const BRIDGE = `window.__s600={rci:()=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(!b||b.ref||b.k<1||b.k>3)continue;out.push({x,y,k:b.k,lv:b.lv||1,v:b.v|0,d:urbanDens406(x,y),w:v600(b,x,y)});}return out;},
  shore:()=>{const out=[];for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const t=tiles[idx(x,y)];if(t.t!==0||!t.wm)continue;let rb=null,rx=x,ry=y;
    if(t.wm&1){rb=T(idx(x,y-1)).bld;rx=x;ry=y-1;}if(!rb&&t.wm&2){rb=T(idx(x+1,y)).bld;rx=x+1;ry=y;}if(!rb&&t.wm&4){rb=T(idx(x,y+1)).bld;rx=x;ry=y+1;}if(!rb&&t.wm&8){rb=T(idx(x-1,y)).bld;rx=x-1;ry=y;}
    if(rb&&!rb.ref&&rb.k>=1&&rb.k<=3&&!(rb.sz>=2)&&!rb.lot574&&v600(rb,rx,ry)!==(((rb.v|0)%12+12)%12))out.push({x:rx,y:ry,wx:x,wy:y});}return out;},
  stat:()=>({fail:STAT596.fail,views:STAT596.views,calls:STAT596.calls}),snow:on=>{rainDays=on?99:0;return rainDays;},
  sim:()=>{let h=0x811c9dc5;const f=s=>{for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}};for(let i=0;i<N*N;i++){const b=tiles[i].bld;f(b?[b.k,b.lv|0,b.v|0,b.age|0,b.ref?1:0].join(','):'.');}const s=window.GV.stats();return [s.day,s.pop,Math.round(s.money),(h>>>0).toString(16)].join('/');}};`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function findChrome() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const p = c.find(x => fs.existsSync(x)); if (!p) throw new Error('找不到 Chrome／Edge，可設 CHROME_PATH'); return p;
}
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!f.startsWith(DIR)) { r.writeHead(403).end(); return; }
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise((res, rej) => { srv.on('error', rej); srv.listen(PORT, '127.0.0.1', res); });
  const chrome = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars', '--window-size=1400,900',
    ...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${path.join(DIR, '.profile')}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1;
  try {
    let url = null; for (let i = 0; i < 180 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map(), exc = []; ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html?T596=1` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__s600&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成');
    if (await ev("localStorage.getItem('glimmerville.v1.slot')") !== '3') throw new Error('slot 不是 3');
    await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return !!e;})()`); await sleep(1500);
    await ev('GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.ai(true);GV.setSpeed(0);true');
    for (let i = 0; i < 20; i++) await ev('GV.step(20)');
    await ev(`(()=>{const st=document.getElementById('start');if(st)st.style.display='none';const ov=document.getElementById('startOverlay456');if(ov){ov.classList.remove('show');ov.style.display='none';}return true;})()`);
    const shot = async name => { await ev('GV.forceDraw();true'); await sleep(600); await ev('GV.forceDraw();true'); await sleep(300); const s = await send('Page.captureScreenshot', { format: 'webp', quality: 82 }); fs.writeFileSync(path.join(OUT, 'T600-' + name + '.webp'), Buffer.from(s.data, 'base64')); };
    const rci400 = await ev('__s600.rci()'), dense = rci400.slice().sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x)[0];
    await ev(`GV.setSeason(1);GV.weather(0);GV.setVisT(55);GV.setRot(0);GV.setZoom(1);GV.lookAt(${dense.x},${dense.y});true`); await shot('d400-core-z1-after');
    await ev('GV.step(20);GV.ai(false);true');
    const st = await ev('(()=>{const s=GV.stats();return {day:s.day,pop:s.pop};})()');
    const rci = await ev('__s600.rci()'), shore = await ev('__s600.shore()');
    const sw = rci.reduce((s, t) => s + t.d, 0), cx = Math.round(rci.reduce((s, t) => s + t.x * t.d, 0) / sw), cy = Math.round(rci.reduce((s, t) => s + t.y * t.d, 0) / sw);
    const subs = rci.filter(t => t.d > 0 && t.d < .25).sort((a, b) => Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy)), sub = subs[Math.floor(subs.length / 4)] || rci[0];
    const sh = shore.slice().sort((a, b) => Math.hypot(a.x - dense.x, a.y - dense.y) - Math.hypot(b.x - dense.x, b.y - dense.y))[0] || null;
    const cams = [['all-z06', cx, cy, .6, 55, 1, 0], ['core-z1', dense.x, dense.y, 1, 55, 1, 0], ['core-z2', dense.x, dense.y, 2, 55, 1, 0], ['suburb-z1', sub.x, sub.y, 1, 55, 1, 0],
      ['core-night-z1', dense.x, dense.y, 1, 100, 1, 0], ['core-winter-z2', dense.x, dense.y, 2, 55, 3, 0], ['core-rot1-z1', dense.x, dense.y, 1, 55, 1, 1]];
    if (sh) cams.push(['shore-z2', sh.x, sh.y, 2, 55, 1, 0]);
    const sim0 = await ev('GV.setSeason(1);__s600.sim()'); // 切季節會改日期：先統一到夏季再比，比的是日期、人口、金錢、全城建築雜湊
    for (const [mode, off] of [['before', true], ['after', false]]) {
      await ev(off ? 'window.__noGrad600=true;true' : 'delete window.__noGrad600;true');
      for (const [tag, x, y, z, vt, sea, rot] of cams) {
        await ev(`GV.setSeason(${sea});GV.weather(0);__s600.snow(${sea === 3});GV.setVisT(${vt});GV.setRot(${rot});GV.setZoom(${z});GV.lookAt(${x},${y});true`);
        if (sea === 3) await sleep(4000);
        await shot(tag + '-' + mode);
      }
      await ev('GV.setSeason(1);__s600.snow(false);GV.setRot(0);true');
    }
    const sim1 = await ev('__s600.sim()');
    const stat = await ev('__s600.stat()'), errs = await ev('(window.__errLog||[]).length');
    const same = rci.filter(t => t.w === (((t.v % 12) + 12) % 12)).length;
    const sum = { day: st.day, pop: st.pop, rci: rci.length, changed: rci.length - same, dense, centroid: [cx, cy], suburb: sub, shore: sh, shoreCandidates: shore.length, simBefore: sim0, simAfter: sim1, simSame: sim0 === sim1, stat, errLog: errs, exceptions: exc.slice(0, 5) };
    fs.writeFileSync(path.join(OUT, 'scene600-summary.json'), JSON.stringify(sum, null, 1));
    console.log('SCENE600 ' + JSON.stringify(sum));
    code = errs || exc.length || stat.fail || sim0 !== sim1 ? 1 : 0;
  } catch (e) { console.error('SCENE600 失敗：' + e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
