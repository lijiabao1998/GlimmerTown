// T633 Mac A/B 探針（2026-10-10 在一次性分支 claude/probe-macab 上跑，工作流見卡面）：同一份 index.html，W＝原樣（T628 willReadFrequently），N＝只拿掉 T628 那兩處。
// 每輪開一個新的有畫面 Chrome（Mac GPU），長 seed22 難度 3 420 天，手機 390×844／桌面 1400×900 × 白天／夜：
// 清快取→冷畫→3 次熱身→30 次暖重畫（GV.forceDraw）→3 秒 rAF 間隔。W／N 輪流先後。
// 用法：node macab.js <repoDir> --reps=5 --out=DIR --port=8701   （CHROME_PATH 指 Chrome）
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const REPO = path.resolve(process.argv[2] || '.');
const PORT = +arg('port', 8701), DEV = PORT + 1000, OUT = path.resolve(arg('out', 'macab-out')), REPS = +arg('reps', 5), N = 30;
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
const BRIDGE = `window.__ab={
  grow:()=>{GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let s=0;s<420;s++)GV.step(1);GV.ai(false);GV.setSpeed(0);return GV.stats();},
  freeze:t=>{window.__frozenAB=t;visT=t;return visT;},
  clear:()=>{lotCache574.clear();lotHookCache574.clear();lotCachePixels574=0;return true;},
  bakes:()=>lotBakeN574,
  drawMs:()=>{if(window.__frozenAB!=null)visT=window.__frozenAB;const t=performance.now();GV.forceDraw();return performance.now()-t;},
  raf:ms=>new Promise(res=>{const iv=[];let last=null;const t0=performance.now();const f=t=>{if(last!=null)iv.push(t-last);last=t;if(performance.now()-t0<ms)requestAnimationFrame(f);else res(iv);};requestAnimationFrame(f);})
};`;
// 兩個變體的暫存目錄
const WRF = [
  ["const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return { c, x, T, lit: [] }; }",
   "const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c, x, T, lit: [] }; }"],
  ["C = c.getContext('2d', { willReadFrequently: true }); return c; }", "C = c.getContext('2d'); return c; }"]];
function makeDir(variant) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'macab-' + variant + '-'));
  for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(dir, f)); }
  let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
  for (const [a, b] of WRF) { if (html.split(a).length !== 2) throw new Error('T628 錨點不唯一'); if (variant === 'N') html = html.replace(a, b); }
  fs.writeFileSync(path.join(dir, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
  return dir;
}
const DIRS = { W: makeDir('W'), N: makeDir('N') };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
let current = 'W';
async function session(variant, rep) {
  current = variant;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'macab-prof-'));
  const cargs = ['--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=1400,900', `--user-data-dir=${profile}`, `--remote-debugging-port=${DEV}`,
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'];
  if (process.argv.includes('--headless')) cargs.unshift('--headless=new'); // 只給本機冒煙測試用；Mac 跑機用有畫面
  const chrome = spawn(process.env.CHROME_PATH, cargs, { stdio: 'ignore' });
  let ws; const exc = [];
  try {
    let url = null; for (let i = 0; i < 240 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.bringToFront');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__ab&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成');
    const gpu = await ev("(()=>{try{const g=document.createElement('canvas').getContext('webgl');const d=g&&g.getExtension('WEBGL_debug_renderer_info');return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):'no-webgl';}catch(e){return String(e).slice(0,80);}})()");
    await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return true;})()`); await sleep(1000);
    const tg = Date.now(); const stats = await ev('__ab.grow()'); const growMs = Date.now() - tg;
    await ev(`(()=>{const st=document.getElementById('start');if(st)st.style.display='none';const ov=document.getElementById('startOverlay456');if(ov){ov.classList.remove('show');ov.style.display='none';}return true;})()`);
    const rows = [];
    for (const [vp, w, h, mobile, zoom] of [['mobile', 390, 844, true, .7], ['desktop', 1400, 900, false, 1]]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400);
      await ev(`GV.setSpeed(0);GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(${zoom});GV.lookAt(36,36);true`);
      for (const [light, t] of [['day', 55], ['night', 100]]) {
        await ev(`__ab.clear();__ab.freeze(${t});true`);
        const b0 = await ev('__ab.bakes()'); const cold = await ev('__ab.drawMs()'); const coldBakes = (await ev('__ab.bakes()')) - b0;
        for (let i = 0; i < 3; i++) await ev('__ab.drawMs()');
        const b1 = await ev('__ab.bakes()'); const warm = []; for (let i = 0; i < N; i++) warm.push(await ev('__ab.drawMs()'));
        const warmBakes = (await ev('__ab.bakes()')) - b1;
        const raf = await ev('__ab.raf(3000)');
        const row = { variant, rep, vp, light, cold: +cold.toFixed(1), coldBakes, warmBakes, warm: warm.map(x => +x.toFixed(2)), raf: raf.map(x => +x.toFixed(2)),
          med: +pct(warm, .5).toFixed(2), p95: +pct(warm, .95).toFixed(2), max: +Math.max(...warm).toFixed(1), rafP95: +pct(raf, .95).toFixed(1), rafFrames: raf.length };
        rows.push(row);
        console.log(`AB ${variant} rep${rep} ${vp} ${light} cold ${row.cold} (${coldBakes} bakes) med ${row.med} p95 ${row.p95} max ${row.max} warmBakes ${warmBakes} rafP95 ${row.rafP95} frames ${row.rafFrames}`);
      }
    }
    await ev('__ab.freeze(null);true');
    return { variant, rep, gpu, stats, growMs, rows, exceptions: exc };
  } finally {
    try { ws && ws.close(); } catch {}
    try { chrome.kill(); } catch {}
    await sleep(1500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
(async () => {
  const srv = http.createServer((q, r) => { const dir = DIRS[current]; const f = path.join(dir, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(dir)) { r.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise((res, rej) => { srv.on('error', rej); srv.listen(PORT, '127.0.0.1', res); });
  const sessions = []; let code = 0;
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const v of (rep % 2 ? ['W', 'N'] : ['N', 'W'])) {
      try { sessions.push(await session(v, rep)); } catch (e) { console.error(`AB ${v} rep${rep} 失敗：` + e.message); sessions.push({ variant: v, rep, error: e.message }); code = 2; }
      fs.writeFileSync(path.join(OUT, 'macab.json'), JSON.stringify(sessions, null, 1));
    }
    // 彙整：同一變體同一情境的所有暖畫樣本合在一起
    const groups = {};
    for (const s of sessions) for (const r of (s.rows || [])) { const k = r.vp + ' ' + r.light; (groups[k] = groups[k] || { W: { warm: [], raf: [], p95s: [], meds: [] }, N: { warm: [], raf: [], p95s: [], meds: [] } })[r.variant].warm.push(...r.warm); const g = groups[k][r.variant]; g.raf.push(...r.raf); g.p95s.push(r.p95); g.meds.push(r.med); }
    for (const [k, g] of Object.entries(groups)) for (const v of ['W', 'N']) { const x = g[v]; if (!x.warm.length) continue; const m = pct(x.warm, .5);
      console.log(`SUMMARY ${k} ${v} n=${x.warm.length} med ${m.toFixed(2)} p90 ${pct(x.warm, .9).toFixed(2)} p95 ${pct(x.warm, .95).toFixed(2)} p99 ${pct(x.warm, .99).toFixed(2)} max ${Math.max(...x.warm).toFixed(1)} spikes>3xmed ${x.warm.filter(t => t > 3 * m).length} sessionP95s ${x.p95s.map(t => t.toFixed(1)).join('/')} sessionMeds ${x.meds.map(t => t.toFixed(1)).join('/')} rafP95 ${pct(x.raf, .95).toFixed(1)} rafMed ${pct(x.raf, .5).toFixed(1)}`); }
    console.log('GPU ' + JSON.stringify(sessions.find(s => s.gpu) && sessions.find(s => s.gpu).gpu) + ' exceptions ' + sessions.reduce((a, s) => a + ((s.exceptions || []).length), 0));
  } finally { srv.close(); setTimeout(() => process.exit(code), 500); }
})();
