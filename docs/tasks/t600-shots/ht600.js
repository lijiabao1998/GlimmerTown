// T600 防漂移量尺：真 Chrome 量 getBlockSprite594(k,lv,1,1,v) 108 款的實高（錨點到最高不透明像素），和 index.html 裡的 HT600 逐值比對。
// 生成器、arche594 或相關閥改動後重跑；不一致就 exit 1，照印出來的新表重寫 HT600（RANK600 會跟著變，T600 G6 原文釘要一起改）。
// 用法：node docs/tasks/t600-shots/ht600.js [--port=8611] [--json=輸出檔]
// 邊界：只載倉庫的暫存副本（系統暫存目錄）；載入前設 glimmerville.v1.slot='3'；不碰玩家目錄、不用 8123／8199。零依賴（Node 22+ 內建 WebSocket）。
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8611), DEV = PORT + 1000, OUTJ = arg('json', '');
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
const REPO = path.resolve(__dirname, '..', '..', '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ht600-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
const PROBE = `__HT600:()=>{const ht={},cv=document.createElement('canvas');
  for(const k of [1,2,3])for(let lv=1;lv<=3;lv++){const a=[];for(let v=0;v<12;v++){const s=getBlockSprite594(k,lv,1,1,v),W=s.img.width,H=s.img.height;
    cv.width=W;cv.height=H;const g=cv.getContext('2d',{willReadFrequently:true});g.clearRect(0,0,W,H);g.drawImage(s.img,0,0);const d=g.getImageData(0,0,W,H).data;
    let top=-1;for(let y=0;y<H&&top<0;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>8){top=y;break;}
    a.push(top<0?0:s.ay-top);}ht[k+'_'+lv]=a;}
  return {ht,code:(typeof HT600==='object'&&HT600)?JSON.parse(JSON.stringify(HT600)):null,errLog:(window.__errLog||[]).length};},`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', 'window.GV={' + PROBE));
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
  const prof = path.join(DIR, '.profile');
  const chrome = spawn(findChrome(), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=1280,800',
    ...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--user-data-dir=${prof}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1;
  try {
    let url = null; for (let i = 0; i < 180 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.GV.__HT600&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成');
    if (await ev("localStorage.getItem('glimmerville.v1.slot')") !== '3') throw new Error('slot 不是 3');
    const r = await ev('GV.__HT600()');
    if (OUTJ) fs.writeFileSync(OUTJ, JSON.stringify(r, null, 1));
    const bad = [];
    for (const key of Object.keys(r.ht)) for (let v = 0; v < 12; v++) if (!r.code || !r.code[key] || r.code[key][v] !== r.ht[key][v]) bad.push(key + '_' + v + ' 量到 ' + r.ht[key][v] + '／HT600 ' + (r.code && r.code[key] ? r.code[key][v] : '（無）'));
    console.log('量到 HT600＝' + JSON.stringify(r.ht));
    console.log('errLog ' + r.errLog + '；108 款中不一致 ' + bad.length + (bad.length ? '：\n  ' + bad.join('\n  ') : ''));
    code = bad.length || r.errLog ? 1 : 0;
  } catch (e) { console.error('HT600 量尺失敗：' + e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
