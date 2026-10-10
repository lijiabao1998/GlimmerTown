// T626 本機效能探針：真 Chrome（可選 GPU），seed22 難度 3 長 420 天，手機 390×844／桌面 1400×900、白天／夜，T602 開／關，
// 量 30 次暖重畫（GV.forceDraw）＋可選 CPU 剖析（各函式 self time 前 25）。只載倉庫暫存副本；載入前 slot=3；不碰玩家目錄、不用 8123／8199。
// 用法：node perf626.js <repoDir> [--port=8651] [--gpu] [--headed] [--profile] [--out=DIR] [--interleave]
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const flag = n => process.argv.includes('--' + n);
const REPO = path.resolve(process.argv[2] || 'C:/dev/glimmer-town');
const PORT = +arg('port', 8651), DEV = PORT + 1000, OUT = path.resolve(arg('out', path.join(__dirname, 'out-' + PORT)));
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
fs.mkdirSync(OUT, { recursive: true });
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'perf626-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
const BRIDGE = `{const _bl=bakeLot574;window.__bk626={n:0,ms:0,by:{}};bakeLot574=function(k,v,st,w){const t=performance.now();const r=_bl.apply(this,arguments);const d=performance.now()-t;const B=window.__bk626;B.n++;B.ms+=d;B.by[k]=(B.by[k]||0)+d;return r;};}
window.__p626={
  pix:()=>{const h=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let x=0x811c9dc5;for(let i=0;i<d.length;i++){x^=d[i];x=Math.imul(x,16777619)>>>0;}return x.toString(16);};const out={};for(const k of [8,81])for(let v=0;v<3;v++)for(const w of [false,true]){const t=performance.now();const s=bakeArt601(k,v,2,w);const ms=performance.now()-t;out[k+'_'+v+(w?'w':'d')]={img:h(s.img),night:h(s.night),ms:+ms.toFixed(1)};}return out;},
  grow:()=>{GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let s=0;s<420;s++)GV.step(1);GV.ai(false);GV.setSpeed(0);return GV.stats();},
  freeze:t=>{window.__frozen626=t;visT=t;return visT;},
  clear:()=>{lotCache574.clear();lotHookCache574.clear();lotCachePixels574=0;return true;},
  stats:()=>({bakes:lotBakeN574,entries:lotCache574.size,pixels:lotCachePixels574}),
  bk:()=>{const B=window.__bk626,o={n:B.n,ms:+B.ms.toFixed(1),top:Object.entries(B.by).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+':'+v.toFixed(0))};B.n=0;B.ms=0;B.by={};return o;},
  drawMs:()=>{if(window.__frozen626!=null)visT=window.__frozen626;const t=performance.now();GV.forceDraw();return performance.now()-t;},
  root:k=>{for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref&&b.k===k)return [i%N,(i/N)|0,b.sz||1];}return null;},
  census:k=>{let n=0;for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref&&b.k===k)n++;}return n;}};`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chromePath = () => { const c = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean); const p = c.find(x => fs.existsSync(x)); if (!p) throw new Error('找不到 Chrome'); return p; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(DIR)) { r.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise((res, rej) => { srv.on('error', rej); srv.listen(PORT, '127.0.0.1', res); });
  const cargs = ['--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars', '--window-size=1400,900', `--user-data-dir=${path.join(DIR, '.profile')}`, `--remote-debugging-port=${DEV}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  if (!flag('headed')) cargs.unshift('--headless=new');
  if (flag('gpu')) cargs.push('--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader=false', '--ignore-gpu-blocklist'); else cargs.push('--disable-gpu');
  const chrome = spawn(chromePath(), [...cargs, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1; const exc = [];
  try {
    let url = null; for (let i = 0; i < 180 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__p626&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成');
    let gpu = null; try { const si = await send('SystemInfo.getInfo'); gpu = { dev: (si.gpu.devices || []).map(d => d.deviceString).join('|'), feat: si.gpu.featureStatus && { canvas: si.gpu.featureStatus['2d_canvas'], gpu_comp: si.gpu.featureStatus.gpu_compositing } }; } catch (e) { gpu = String(e.message).slice(0, 100); }
    await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return true;})()`); await sleep(1000);
    if(flag('pix')){const p1=await ev('__p626.pix()'),p2=await ev('__p626.pix()');fs.writeFileSync(path.join(OUT,'pix.json'),JSON.stringify({p1,p2},null,1));console.log('PIX '+JSON.stringify(Object.fromEntries(Object.entries(p2).map(([k,v])=>[k,v.img+'.'+v.night+' '+p1[k].ms+'/'+v.ms+'ms']))));code=0;return;}
    const stats = await ev('__p626.grow()');
    await ev(`(()=>{const st=document.getElementById('start');if(st)st.style.display='none';const ov=document.getElementById('startOverlay456');if(ov){ov.classList.remove('show');ov.style.display='none';}return true;})()`);
    const census = { k53: await ev('__p626.census(53)'), k104: await ev('__p626.census(104)'), k117: await ev('__p626.census(117)') };
    const res = { gpu, stats, census, runs: [] };
    const N = +arg('n', 30);
    for (const [vp, w, h, mobile, zoom] of [['mobile', 390, 844, true, .7], ['desktop', 1400, 900, false, 1]]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(400);
      await ev(`GV.setSpeed(0);GV.setRot(0);GV.setSeason(1);GV.weather(0);GV.setZoom(${zoom});true`);const camK=arg('cam','');if(camK){const r=await ev('__p626.root('+camK+')');await ev('GV.lookAt('+(r[0]+r[2]/2)+','+(r[1]+r[2]/2)+');true');}else await ev('GV.lookAt(36,36);true');
      for (const [light, t] of [['day', 55], ['night', 100]]) {
        const modes = flag('interleave') ? ['baseline', 'candidate', 'baseline', 'candidate'] : ['baseline', 'candidate'];
        for (const mode of modes) {
          await ev(`window.__noT602=${mode === 'baseline'};__p626.clear();__p626.freeze(${t});true`);
          await ev('__p626.bk()');const cold = await ev('__p626.drawMs()');const bk=await ev('__p626.bk()'); for (let i = 0; i < 3; i++) await ev('__p626.drawMs()');
          const b0 = await ev('__p626.stats()');
          if (flag('profile')) { await send('Profiler.enable'); await send('Profiler.setSamplingInterval', { interval: 200 }); await send('Profiler.start'); }
          const warm = []; for (let i = 0; i < N; i++) warm.push(await ev('__p626.drawMs()'));
          let top = null;
          if (flag('profile')) { const { profile } = await send('Profiler.stop'); const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n])); const dt = profile.timeDeltas; for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const k = n.callFrame.functionName + ':' + n.callFrame.lineNumber; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); } top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, us]) => k + ' ' + (us / 1000).toFixed(1) + 'ms'); }
          const b1 = await ev('__p626.stats()');
          const r = { vp, light, mode, cold: +cold.toFixed(1), med: +pct(warm, .5).toFixed(2), p95: +pct(warm, .95).toFixed(2), max: +Math.max(...warm).toFixed(1), bakesDuringWarm: b1.bakes - b0.bakes, warm: warm.map(x => +x.toFixed(1)), top };
          r.bk=bk;res.runs.push(r); console.log(vp, light, mode, 'cold', r.cold, 'bakes', bk.n, bk.ms+'ms', bk.top.join(' '), 'med', r.med, 'p95', r.p95, 'max', r.max, 'warmBakes', r.bakesDuringWarm);
        }
      }
    }
    await ev('window.__noT602=false;__p626.freeze(null);true');
    res.exceptions = exc;
    fs.writeFileSync(path.join(OUT, 'perf626.json'), JSON.stringify(res, null, 1));
    console.log('PERF626 gpu=' + JSON.stringify(gpu) + ' census=' + JSON.stringify(census) + ' exceptions=' + exc.length);
    code = 0;
  } catch (e) { console.error('PERF626 失敗：' + e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
