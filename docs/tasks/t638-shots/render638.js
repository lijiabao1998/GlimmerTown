// T638 消防局補變體工作台（scratchpad，不入庫）。
// 用法：
//   node render638.js <repoDir> --mode=census [--port=8721]
//   node render638.js <repoDir> --mode=sheet --variants=<fire638.js> --out=<png> [--ks=6,30,61] [--vis=0,1,2] [--sizes=6:1,2|30:1,2|61:3] [--scale=2]
// 只載倉庫暫存副本；載入前 slot=3；不碰玩家目錄、不用 8123／8199。
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn } = require('child_process');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const REPO = path.resolve(process.argv[2]);
const MODE = arg('mode', 'sheet'), PORT = +arg('port', 8721), DEV = PORT + 1000;
if ([8123, 8199].includes(PORT) || [8123, 8199].includes(DEV)) throw new Error('8123／8199 不准用');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fire638-'));
for (const f of fs.readdirSync(REPO)) { const p = path.join(REPO, f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }

// 把 bakeFire635 複製成 bakeFire638(k,n,winter,vi)：vi>0 且有 fire638_k<k> 就交給它畫，否則走原本那款（vi=0 原封不動）。
const HELPERS = ['P', 'Q', 'F', 'L', 'E', 'pixel635', 'faceV', 'faceU', 'box', 'course', 'windowV', 'windowU', 'light', 'pitched', 'door', 'arch', 'pave', 'tree', 'truck', 'pal', 'edge', 'stone', 'glass', 'lit', 'slate', 'slateD', 'occlude635'];
function patch(html, variantsSrc) {
  const a = html.indexOf('function bakeFire635('), b = html.indexOf('/* ===== T635 FIRE CANDIDATE END', a);
  if (a < 0 || b < 0) throw new Error('找不到 bakeFire635');
  let fn = html.slice(a, b);
  if (fn.split('function bakeFire635(k,n,winter=false){').length !== 2) throw new Error('簽名變了');
  fn = fn.replace('function bakeFire635(k,n,winter=false){', 'function bakeFire638(k,n,winter=false,vi=0){');
  const anchor = '  if(k===6){\n';
  if (fn.split(anchor).length !== 2) throw new Error('k===6 錨點不唯一');
  const H = '{' + HELPERS.join(',') + ',n,winter,k,w,h,ax,ay,top,g,ng}';
  fn = fn.replace(anchor, '  const H638=' + H + ';\n  if(vi>0&&typeof window["fire638_k"+k]==="function"){window["fire638_k"+k](H638,vi);}else if(k===6){\n');
  const bridge = `
${variantsSrc || ''}
window.__f638={
  census:(seeds)=>{const out={plan:{},cities:[]};for(const k of [6,30,61])out.plan[k]=(typeof LOT_PLAN574!=='undefined'&&LOT_PLAN574[k])?JSON.stringify(LOT_PLAN574[k]).slice(0,200):null;
    for(const sd of seeds){GV.setMapSize(72);GV.newWorldSeeded(sd);GV.setDiff(3);GV.setSpeed(0);GV.ai(true);for(let s=0;s<420;s++)GV.step(1);GV.ai(false);
      const tally={};for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(!b||b.ref||![6,30,61].includes(b.k))continue;const key=b.k+'_sz'+(b.sz||1)+'_v'+(b.v||0)+(b.lot574?'_lot':'');tally[key]=(tally[key]||0)+1;}
      out.cities.push({seed:sd,tally});}
    return out;},
  ref:(ks,scale)=>{const sp=[];for(const k of ks)for(const v of [0,1,2]){let s=null;try{s=lotSprite574(k,v,2,false,false);}catch(e){}if(s&&s.img)sp.push({k,v,s});}
    const colW=Math.max(...sp.map(c=>c.s.w))*scale+12,rowH=Math.max(...sp.map(c=>c.s.h))*scale+24;const cv=document.createElement('canvas');cv.width=3*colW+80;cv.height=ks.length*rowH+10;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#9fb4a3';x.fillRect(0,0,cv.width,cv.height);x.font='bold 13px sans-serif';
    ks.forEach((k,r)=>{x.fillStyle='#1d2b2f';x.fillText('k'+k,8,r*rowH+rowH/2);for(const c of sp.filter(q=>q.k===k)){const s=c.s;x.drawImage(s.img,0,0,s.w,s.h,80+c.v*colW,r*rowH+rowH-20-s.h*scale,s.w*scale,s.h*scale);x.fillText('v'+c.v,80+c.v*colW,r*rowH+rowH-6);}});
    return cv.toDataURL('image/png');},
  sheet:(ks,vis,sizes,scale)=>{
    const cells=[];for(const k of ks)for(const vi of vis)for(const n of sizes[k])for(const mode of ['day','night','winter']){const s=bakeFire638(k,n,mode==='winter',vi);cells.push({k,vi,n,mode,s});}
    const colW=Math.max(...cells.map(c=>c.s.w))*scale+12,rowH=Math.max(...cells.map(c=>c.s.h))*scale+26;
    const perRow=Math.max(...ks.map(k=>sizes[k].length))*3,rows=ks.length*vis.length;
    const cv=document.createElement('canvas');cv.width=perRow*colW+120;cv.height=rows*rowH+10;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#9fb4a3';x.fillRect(0,0,cv.width,cv.height);x.font='bold 14px sans-serif';
    let r=0;for(const k of ks)for(const vi of vis){x.fillStyle='#1d2b2f';x.fillText('k'+k+' v'+vi,8,r*rowH+rowH/2);let col=0;
      for(const n of sizes[k])for(const mode of ['day','night','winter']){const c=cells.find(q=>q.k===k&&q.vi===vi&&q.n===n&&q.mode===mode),s=c.s;
        const ox=120+col*colW,oy=r*rowH+6;const t=document.createElement('canvas');t.width=s.w;t.height=s.h;const tg=t.getContext('2d');
        tg.drawImage(s.img,0,0);if(mode==='night'){tg.globalCompositeOperation='source-atop';tg.fillStyle='rgba(12,20,44,0.74)';tg.fillRect(0,0,s.w,s.h);tg.globalCompositeOperation='source-over';tg.drawImage(s.night,0,0);}
        if(mode==='night'){x.fillStyle='#22283a';x.fillRect(ox-4,oy-2,colW-4,rowH-6);}
        x.drawImage(t,0,0,s.w,s.h,ox,oy+rowH-26-s.h*scale,s.w*scale,s.h*scale);
        x.fillStyle=mode==='night'?'#e6e6e6':'#1d2b2f';x.font='12px sans-serif';x.fillText('n'+n+' '+mode,ox,oy+rowH-12);col++;}
      r++;}
    return cv.toDataURL('image/png');}
};`;
  return html.slice(0, b) + fn + html.slice(b).replace('window.GV={', bridge + '\nwindow.GV={');
}
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV 錨點不唯一');
const variantsSrc = arg('variants') ? fs.readFileSync(path.resolve(arg('variants')), 'utf8') : '';
// --integrated：倉庫已含正式 T638 區塊；工作台自己複製的 bakeFire638 在前、正式的在後（後宣告者勝），v0 改走 bakeFire635。
if (process.argv.includes('--integrated')) { const base = patch(html, ''), out = base.replace("const s=bakeFire638(k,n,mode==='winter',vi);", "const s=(vi?bakeFire638:bakeFire635)(k,n,mode==='winter',vi);"); if (out === base || !/T638 FIRE VARIANTS BEGIN/.test(out) || out.indexOf('T638 FIRE VARIANTS BEGIN') < out.indexOf('function bakeFire638(k,n,winter=false,vi=0)')) throw new Error('integrated 錨點不對'); fs.writeFileSync(path.join(DIR, 'index.html'), out); }
else fs.writeFileSync(path.join(DIR, 'index.html'), patch(html, variantsSrc));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
const chromePath = () => { const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean); const p = c.find(x => fs.existsSync(x)); if (!p) throw new Error('找不到 Chrome'); return p; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(DIR, decodeURIComponent((q.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(DIR)) { r.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(b); }); });
  await new Promise((res, rej) => { srv.on('error', rej); srv.listen(PORT, '127.0.0.1', res); });
  const chrome = spawn(chromePath(), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--window-size=1400,900', `--user-data-dir=${path.join(DIR, '.profile')}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: 'ignore' });
  let ws, code = 1; const exc = [];
  try {
    let url = null; for (let i = 0; i < 180 && !url; i++) { try { const l = await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json()); const p = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); if (p) url = p.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
    if (!url) throw new Error('等不到 Chrome');
    ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP 連線失敗')); });
    let id = 0; const pend = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') exc.push(((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text || '').split('\n')[0]); };
    const send = (method, params) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    let ok = false; for (let i = 0; i < 240 && !ok; i++) { try { ok = await ev("!!(window.GV&&window.__f638&&window.__boot426&&window.__boot426().ready)"); } catch {} if (!ok) await sleep(500); }
    if (!ok) throw new Error('開機沒完成：' + exc.slice(0, 3).join(' | '));
    if (MODE === 'census') {
      await ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return true;})()`); await sleep(800);
      const r = await ev('__f638.census([22,301,7])');
      console.log(JSON.stringify(r, null, 1));
    } else if (MODE === 'ref') {
      const ks = arg('refks', '11,12,14,15').split(',').map(Number);
      const data = await ev(`__f638.ref(${JSON.stringify(ks)},${+arg('scale', 2)})`);
      const out = path.resolve(arg('out', 'ref638.png')); fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); console.log('REF ' + out);
    } else {
      const ks = arg('ks', '6,30,61').split(',').map(Number), vis = arg('vis', '0,1,2').split(',').map(Number), scale = +arg('scale', 2);
      const sizes = {}; for (const part of arg('sizes', '6:1,2|30:1,2|61:3').split('|')) { const [k, l] = part.split(':'); sizes[+k] = l.split(',').map(Number); }
      const data = await ev(`__f638.sheet(${JSON.stringify(ks)},${JSON.stringify(vis)},${JSON.stringify(sizes)},${scale})`);
      const out = path.resolve(arg('out', 'sheet638.png'));
      fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
      console.log('SHEET ' + out);
    }
    if (exc.length) console.log('EXCEPTIONS ' + exc.length + ': ' + exc.slice(0, 5).join(' | '));
    code = exc.length ? 3 : 0;
  } catch (e) { console.error('F638 失敗：' + e.message); code = 2; }
  finally { try { ws && ws.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(DIR, { recursive: true, force: true }); } catch {} process.exit(code); }, 1500); }
})();
