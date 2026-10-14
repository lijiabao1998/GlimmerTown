// T638 真遊戲證據：長三座城，找出所有消防局（根格），算各自選到哪一款；鏡頭對準每一座畫一幀，
// 記錄 spr638 快取有沒有被真的繪製路徑用到；T638 開／?noT638=1 各一次，各存截圖。
// 用法：node ingame638.js <repoDir> <outDir> [--port=8791]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const REPO = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]);
const PORT = +((process.argv.find(a => a.startsWith('--port=')) || '--port=8791').split('=')[1]), DEV = PORT + 1000;
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ingame638-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
{ const ip = path.join(DIR, 'index.html'); const h = fs.readFileSync(ip, 'utf8'); if (h.split('window.GV={').length !== 2) throw new Error('GV anchor');
  fs.writeFileSync(ip, h.replace('window.GV={', "window.__ig638={fires:()=>{const out=[];for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref&&[6,30,61].includes(b.k))out.push({k:b.k,x:i%N,y:(i/N)|0,sz:b.sz||1,vi:vi638(b,i%N,(i/N)|0),age:b.age});}return out;},on:()=>[t638On(),t635On()],keys:()=>spr638.cache?[...spr638.cache.keys()]:[],clear:()=>{if(spr638.cache)spr638.cache.clear();spr638.pixels=0;}};window.GV={")); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const chromePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(x => fs.existsSync(x));
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(DIR)) { r.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise(res => srv.listen(PORT, '127.0.0.1', res));
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=1400,900', `--user-data-dir=${path.join(DIR, '.profile')}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1; const exc = [];
  try {
    let url = null; for (let i = 0; i < 480 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP')); });
    let id = 0; const pend = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    const report = { runs: [] };
    for (const [label, q] of [['on', ''], ['off', '?noT638=1']]) {
      await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
      let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
      if (!ok) throw new Error('boot');
      await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return true;})()`); await sleep(800);
      for (const seed of [22, 301, 7]) {
        const st = await ev(`(()=>{GV.setMapSize(72);GV.newWorldSeeded(${seed});GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let s=0;s<420;s++)GV.step(1);GV.ai(false);GV.setSpeed(0);
          const st=document.getElementById('start');if(st)st.style.display='none';const ov=document.getElementById('startOverlay456');if(ov){ov.classList.remove('show');ov.style.display='none';}
          return {t638:__ig638.on()[0],t635:__ig638.on()[1],fires:__ig638.fires()};})()`);
        for (const f of st.fires) {
          await ev(`GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(1.6);GV.lookAt(${f.x + f.sz / 2},${f.y + f.sz / 2});__ig638.clear();GV.forceDraw();true`);
          const used = await ev(`__ig638.keys()`);
          const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 450, y: 200, width: 500, height: 420, scale: 1 } });
          const file = `${label}-seed${seed}-k${f.k}-${f.x}_${f.y}-vi${f.vi}.png`;
          fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.data, 'base64'));
          report.runs.push({ label, seed, ...f, t638: st.t638, t635: st.t635, spr638Keys: used, file });
          console.log(label, 'seed' + seed, 'k' + f.k, f.x + ',' + f.y, 'sz' + f.sz, 'vi' + f.vi, 'spr638:', JSON.stringify(used));
        }
      }
    }
    report.exceptions = exc;
    fs.writeFileSync(path.join(OUT, 'ingame638.json'), JSON.stringify(report, null, 1));
    console.log('EXCEPTIONS', exc.length);
    code = 0;
  } catch (e) { console.error('FAIL', e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
