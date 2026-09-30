// T601 真 Chrome 實拍：(1) 真城——seed22 沙盒（難度 3）長到第 420 天，這 8 類本來就長在城裡；同一鏡頭各拍一次改前（window.__noT601=true，即時退回舊圖）
// 與改後，另拍夜景、冬天、旋轉 90°、遠景 z0.6；(2) 並排——新城用遊戲的放置把每類三款各蓋一座，日／夜／冬；
// 覆核後補：(3) 單格三類近拍四季（春、秋、乾冬、雪冬，z2）；(4) 岸邊碼頭（右前／左前／兩側／背後臨水，視角 0 與 90°）；(5) 民宿與碼頭施工第 4–8 天；
// (6) 園區烘焙耗時（單張、清快取後第一幀）。回報例外、console 錯誤、S21 烘焙耗時。
// 用法：node docs/tasks/t601-shots/scene601.js [--port=8641] [--out=輸出目錄]
// 邊界：只載倉庫的暫存副本；載入前設 glimmerville.v1.slot='3'；不碰玩家目錄、不用 8123／8199。零依賴（Node 22+ 內建 WebSocket）。
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8641), DEV = PORT + 1000, OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'scene601')));
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
fs.mkdirSync(OUT, { recursive: true });
const REPO = path.resolve(__dirname, '..', '..', '..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'scene601-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
const BRIDGE = `window.__s601={
  roots:k=>{const out=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++){const b=tiles[idx(x,y)].bld;if(b&&!b.ref&&b.k===k)out.push([x,y,b.v|0,b.sz||1]);}return out;},
  v:(k,x,y,v)=>v601(k,x,y,{k,v}),s21:()=>{const t0=performance.now();buildSpritesS21();return +(performance.now()-t0).toFixed(1);},rep:()=>window.__t601,
  rich:()=>{money=1e9;return money;},snow:on=>{rainDays=on?SNOW_ACC_DAYS+3:0;return rainDays;},
  clear:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}},
  road:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}},
  mask:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(typeof recalcMask==='function')recalcMask(x,y);},
  root:(x,y)=>{let b=T(idx(x,y)).bld;if(b&&b.ref)return b.ref;return b?[x,y]:null;},
  setV:(x,y,v)=>{let b=T(idx(x,y)).bld;if(b&&b.ref)b=T(idx(b.ref[0],b.ref[1])).bld;if(b){b.v=v;return true;}return false;},
  single:(k,x,y,v)=>{const t=T(idx(x,y));t.tree=0;t.bld={k,lv:1,v,age:60,pw:true,wa:true,h:.6};return true;},
  bakeMs:(k,v)=>{const t0=performance.now();bakeArt601(k,v,2,false);return +(performance.now()-t0).toFixed(1);},clearLots:()=>{lotCache574.clear();lotCachePixels574=0;return true;},
  drawMs:()=>{const t0=performance.now();GV.forceDraw();return +(performance.now()-t0).toFixed(1);},age:(x,y,a)=>{const b=T(idx(x,y)).bld;if(b)b.age=a;return !!b;},
  shore:()=>{const W=(x,y)=>inMap(x,y)&&T(idx(x,y)).t===0,F=(x,y)=>{const t=T(idx(x,y));return t.t!==0&&!t.road&&!t.bld&&!t.bridge&&!t.rail&&!t.tram;},out={};
    for(let y=2;y<N-2;y++)for(let x=2;x<N-2;x++){if(!F(x,y))continue;const e=W(x+1,y),s=W(x,y+1),c=e&&!s?'E':!e&&s?'S':e&&s?'ES':!W(x+1,y+1)&&(W(x-1,y)||W(x,y-1))?'back':null;
      if(c&&!out[c]&&!Object.values(out).some(p=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<4))out[c]=[x,y];}return out;},
  finish:()=>{let n=0;for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref){b.age=Math.max(b.age|0,60);b.pw=true;b.wa=true;n++;}}lotCache574.clear();return n;}};`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chromePath = () => { const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean); const p = c.find(x => fs.existsSync(x)); if (!p) throw new Error('找不到 Chrome'); return p; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(DIR)) { r.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise((res, rej) => { srv.on('error', rej); srv.listen(PORT, '127.0.0.1', res); });
  const chrome = spawn(chromePath(), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--hide-scrollbars', '--window-size=1400,900', `--user-data-dir=${path.join(DIR, '.profile')}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1; const exc = [], cerr = [];
  try {
    let url = null; for (let i = 0; i < 180 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
      else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n').slice(0, 2).join(' | '));
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') cerr.push((m.params.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200)); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__s601&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成');
    if (await ev("localStorage.getItem('glimmerville.v1.slot')") !== '3') throw new Error('slot 不是 3');
    const sum = { rep: await ev('__s601.rep()'), s21ms: [await ev('__s601.s21()'), await ev('__s601.s21()'), await ev('__s601.s21()')] };
    const hide = `(()=>{const st=document.getElementById('start');if(st)st.style.display='none';const ov=document.getElementById('startOverlay456');if(ov){ov.classList.remove('show');ov.style.display='none';}return true;})()`;
    const shot = async name => { await ev('GV.forceDraw();true'); await sleep(600); await ev('GV.forceDraw();true'); await sleep(300); const s = await send('Page.captureScreenshot', { format: 'webp', quality: 84 }); fs.writeFileSync(path.join(OUT, 'T601-' + name + '.webp'), Buffer.from(s.data, 'base64')); };
    // ---- (1) 真城 ----
    await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return !!e;})()`); await sleep(1500);
    await ev('GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.ai(true);GV.setSpeed(0);true');
    for (let i = 0; i < 21; i++) await ev('GV.step(20)');
    await ev('GV.ai(false);true'); await ev(hide);
    const K = [4, 5, 8, 60, 63, 66, 81, 97], census = {};
    for (const k of K) census[k] = await ev(`__s601.roots(${k})`);
    sum.census = Object.fromEntries(K.map(k => [k, census[k].length]));
    // 鏡頭：每類挑「周圍 5 格內這 8 類最多」的一座
    const all = K.flatMap(k => census[k].map(r => ({ k, x: r[0], y: r[1] })));
    const score = p => all.filter(q => Math.abs(q.x - p.x) <= 5 && Math.abs(q.y - p.y) <= 5).length;
    const cams = []; for (const k of [66, 5, 63, 4]) { const c = census[k].map(r => ({ k, x: r[0], y: r[1] })).sort((a, b) => score(b) - score(a))[0]; if (c && !cams.some(q => Math.abs(q.x - c.x) + Math.abs(q.y - c.y) < 6)) cams.push(c); }
    sum.cams = cams;
    for (const [mode, off] of [['before', true], ['after', false]]) {
      await ev(off ? 'window.__noT601=true;true' : 'delete window.__noT601;true');
      for (const c of cams) { await ev(`GV.setSeason(1);GV.weather(0);__s601.snow(false);GV.setVisT(55);GV.setRot(0);GV.setZoom(1.5);GV.lookAt(${c.x},${c.y});true`); await shot(`city-k${c.k}-${mode}`); }
    }
    await ev('delete window.__noT601;true');
    const c0 = cams[0];
    await ev(`GV.setVisT(100);GV.setZoom(1.5);GV.lookAt(${c0.x},${c0.y});true`); await shot('city-night-after');
    await ev(`GV.setVisT(55);GV.setSeason(3);__s601.snow(true);true`); await sleep(1500); await shot('city-winter-after');
    await ev(`GV.setSeason(1);__s601.snow(false);GV.setRot(1);true`); await shot('city-rot1-after');
    await ev(`GV.setRot(0);GV.setZoom(.6);true`); await shot('city-far-after');
    await ev('window.__noT601=true;true'); await shot('city-far-before'); await ev('delete window.__noT601;true');
    // ---- (2) 並排：每類三款各一座 ----
    const row = await ev(`(()=>{const S=__s601,G=GV;G.setMapSize(72);G.newWorldSeeded(601);G.setDiff(3);G.ai(false);G.setSpeed(0);S.rich();S.clear(3,3,68,68);
      const tools={5:'plant',8:'dump',60:'geo',63:'greenhouse',66:'faithCenter'},placed=[];let y=6;
      for(const k of [5,8,60,63,66]){let x=6,got=new Set();
        for(let tries=0;tries<40&&got.size<3&&x<60;tries++){
          const want=[0,1,2].find(v=>!got.has(v));
          if(k===5||k===8){S.road(x-1,y-1,x+3,y-1);S.road(x-1,y-1,x-1,y+3);S.road(x-1,y+3,x+3,y+3);S.road(x+3,y-1,x+3,y+3);if(G.place(tools[k],x,y)){const r=S.root(x,y);S.setV(r[0],r[1],want);got.add(want);placed.push([k,want,r]);}x+=4;continue;}
          if(got.has(S.v(k,x,y,0))){x++;continue;}
          S.road(x-1,y-1,x+3,y-1);S.road(x-1,y-1,x-1,y+3);S.road(x-1,y+3,x+3,y+3);S.road(x+3,y-1,x+3,y+3);
          if(G.place(tools[k],x,y)){const r=S.root(x,y);const vv=S.v(k,r[0],r[1],0);if(!got.has(vv)){got.add(vv);placed.push([k,vv,r]);}}x+=4;}
        y+=4;}
      let x=6;for(const k of [4,81,97]){let got=new Set();for(let xx=6;xx<60&&got.size<3;xx++){const vv=k===4?got.size:S.v(k,xx,y,0);if(got.has(vv))continue;S.single(k,xx,y,k===4?vv:0);got.add(vv);placed.push([k,vv,[xx,y]]);xx++;}y+=2;}
      S.mask(3,3,68,68);S.finish();G.setDay(10);return {placed,y};})()`);
    sum.row = row.placed;
    await ev(hide);
    await ev(`GV.setSeason(1);GV.weather(0);__s601.snow(false);GV.setVisT(55);GV.setRot(0);GV.setZoom(.9);GV.lookAt(13,${Math.round(row.y / 2) + 2});true`); await shot('row-day');
    await ev(`GV.setVisT(100);true`); await shot('row-night');
    await ev(`GV.setVisT(55);GV.setSeason(3);__s601.snow(true);true`); await sleep(1500); await shot('row-winter');
    await ev(`GV.setSeason(1);__s601.snow(false);true`);
    // ---- (3) 單格三類近拍四季（z2）：春原圖、秋季節色、乾冬（沒積雪也換冬天版）、雪冬（不疊雪帽冰柱） ----
    const sg = row.placed.filter(p => [4, 81, 97].includes(p[0])), sx0 = Math.min(...sg.map(p => p[2][0])), sy0 = Math.min(...sg.map(p => p[2][1]));
    for (const [nm, sea, sn] of [['spring', 0, false], ['autumn', 2, false], ['winter-dry', 3, false], ['winter-snow', 3, true]]) {
      await ev(`GV.setSeason(${sea});__s601.snow(${sn});GV.setVisT(55);GV.setZoom(2);GV.lookAt(${sx0 + 2},${sy0 + 2});true`); if (sn) await sleep(1200); await shot('singles-' + nm);
      if (nm === 'autumn' || nm === 'winter-snow') { await ev('window.__noT601=true;true'); await shot('singles-' + nm + '-before'); await ev('delete window.__noT601;true'); } }
    await ev(`GV.setSeason(1);__s601.snow(false);true`);
    // ---- (4) 岸邊碼頭：找右前、左前、兩側、只有背後臨水的岸格各一座 ----
    const sh = await ev(`(()=>{const G=GV;G.setMapSize(72);G.newWorldSeeded(601);G.setDiff(3);G.ai(false);G.setSpeed(0);const S=__s601,o=S.shore();for(const c in o)S.single(97,o[c][0],o[c][1],0);S.finish();return o;})()`);
    sum.shore = sh; await ev(hide);
    for (const c of Object.keys(sh)) for (const r of [0, 1]) { await ev(`GV.setSeason(1);GV.setVisT(55);GV.setRot(${r});GV.setZoom(2.5);GV.lookAt(${sh[c][0]},${sh[c][1]});true`); await shot(`pier-${c}-r${r}`); }
    await ev('GV.setRot(0);true');
    // ---- (5) 民宿與碼頭施工第 4–8 天（鷹架、樓板線要落在房子上，不飄在空中） ----
    const cons = await ev(`(()=>{const S=__s601,out=[];let x=8;for(const k of [81,97])for(let a=4;a<=8;a++){S.clear(x,30,x,30);S.single(k,x,30,0);S.age(x,30,a);out.push([k,a,x]);x+=2;}return out;})()`);
    sum.construction = cons;
    for (const [mode, off] of [['after', false], ['before', true]]) { await ev(off ? 'window.__noT601=true;true' : 'delete window.__noT601;true'); await ev(`GV.setSeason(1);GV.setVisT(55);GV.setZoom(1.6);GV.lookAt(17,30);true`); await shot('construction-' + mode); }
    await ev('delete window.__noT601;true');
    // ---- (6) 園區烘焙耗時：單張（k8／60／63／66 各三款），與真城清快取後第一幀 ----
    sum.bakeMs = {}; for (const k of [8, 60, 63, 66]) sum.bakeMs[k] = [await ev(`__s601.bakeMs(${k},0)`), await ev(`__s601.bakeMs(${k},1)`), await ev(`__s601.bakeMs(${k},2)`)];
    await ev('GV.setMapSize(72);GV.newWorldSeeded(22);GV.setDiff(3);GV.ai(true);GV.setSpeed(0);true'); for (let i = 0; i < 21; i++) await ev('GV.step(20)'); await ev('GV.ai(false);true');
    await ev(`GV.setSeason(1);__s601.snow(false);GV.setZoom(1);GV.lookAt(${c0.x},${c0.y});GV.forceDraw();true`);
    sum.firstFrame = {}; for (const [mode, off] of [['recipe', true], ['t601', false]]) { await ev(off ? 'window.__noT601=true;true' : 'delete window.__noT601;true'); await ev('__s601.clearLots()'); sum.firstFrame[mode] = [await ev('__s601.drawMs()'), await ev('__s601.drawMs()')]; }
    await ev('delete window.__noT601;true');
    sum.exceptions = exc; sum.consoleErrors = cerr;
    fs.writeFileSync(path.join(OUT, 'scene601-summary.json'), JSON.stringify(sum, null, 1));
    console.log('SCENE601 ' + JSON.stringify({ census: sum.census, cams: sum.cams.length, row: sum.row.length, s21ms: sum.s21ms, rep: sum.rep && sum.rep.ok, shore: Object.keys(sum.shore || {}), bakeMs: sum.bakeMs, firstFrame: sum.firstFrame, exceptions: exc.length, consoleErrors: cerr.length }));
    code = exc.length || cerr.length || !(sum.rep && sum.rep.ok === 1) ? 1 : 0;
  } catch (e) { console.error('SCENE601 失敗：' + e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
