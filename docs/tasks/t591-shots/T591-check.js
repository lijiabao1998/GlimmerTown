// T591 真 Chrome 檢查（scratch 副本、載入前設槽 3）：
//   audit：36 類 × 各變體 × 日／冬 直接烘園區，驗 t591 標記、cycles、掛點、夜光遮擋（逐像素）
//   scene：真放置（GV.place）新園區，日／夜／冬／四方向實拍；?noT591=1 對照
// node t591_check.js --port=8211 --mode=audit|scene [--only=after|before]
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8211), MODE = arg('mode', 'audit');
const DIR = path.join(__dirname, 'inv_t591'); fs.mkdirSync(DIR, { recursive: true });
const OUT = path.join(__dirname, 'scene591'); fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(DIR, 'harness.js'));
const KINDS = [6, 7, 11, 12, 14, 15, 17, 18, 19, 21, 23, 28, 30, 32, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 47, 48, 55, 56, 61, 65, 84, 87, 108, 113, 114, 130];
const BRIDGE = `window.__t591X={bake:(k,v,w)=>bakeLot574(k,v,2,w),SPR:()=>SPR,LP:()=>LOT_PLAN574,ported:portedLot591,
  rich:()=>{money=1e9;return money;},snow:()=>{rainDays=SNOW_ACC_DAYS;return rainDays;},
  clear:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}},
  water:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.t=0;t.road=0;t.rc=0;t.bld=null;t.tree=0;}},
  road:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}},
  mask:(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(typeof recalcMask==='function')recalcMask(x,y);},
  finish:()=>{let n=0;for(let i=0;i<N*N;i++){const b=tiles[i].bld;if(b&&!b.ref){b.age=60;b.pw=true;b.wa=true;n++;}}return n;}};`;
let html = fs.readFileSync('C:/dev/glimmer-town/index.html', 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV anchor');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
for (const f of fs.readdirSync('C:/dev/glimmer-town')) { const p = path.join('C:/dev/glimmer-town', f); if (fs.statSync(p).isFile() && /\.(js|json|webmanifest|png|svg|css)$/.test(f) && f !== 'harness.js') fs.copyFileSync(p, path.join(DIR, f)); }
const H = require(path.join(DIR, 'harness.js'));
const AUDIT = `(()=>{const X=window.__t591X,S=X.SPR(),LP=X.LP(),K=${JSON.stringify(KINDS)};const rows=[];let errs=0;
  const px=c=>c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
  for(const k of K){
    const vs=k===11||k===12?[0]:[0,1,2].filter(v=>S.bld[k+'_1_'+v]);
    for(const v of vs)for(const w of [false,true]){
      const t0=performance.now();let s;try{s=X.bake(k,v,w);}catch(e){errs++;rows.push({k,v,w,err:String(e&&e.message||e)});continue;}
      const ms=Math.round(performance.now()-t0);
      const S0=k===11?S.police:k===12?S.hospital:(S.bld[k+'_1_'+v]||S.bld[k+'_1_0']),SS=w&&S0.win563?S0.win563:S0;
      const m=s.lotMeta574,b=m.hooks.body591;
      const D=px(s.img),Nn=px(s.night),Sp=px(SS.img),W=s.w;
      let inBody=0,leakCovered=0,outLamp=0,leakOut=0,halo=0;const LP2=(m.hooks.lamps||[]);const nearLamp=(x,y)=>LP2.some(p=>x>=p[0]-3&&x<=p[0]+5&&y>=p[1]-3&&y<=p[1]+3);
      for(let i=0;i<Nn.length;i+=4){if(Nn[i+3]<=40)continue;const x=(i>>2)%W,y=(i>>2)/W|0;
        const sx=x-b[0],sy=y-b[1];
        if(b&&sx>=0&&sy>=0&&sx<SS.w&&sy<SS.h){const j=(sy*SS.w+sx)*4;
          if(Sp[j+3]>0&&D[i]===Sp[j]&&D[i+1]===Sp[j+1]&&D[i+2]===Sp[j+2])inBody++;
          else if((D[i]===0xdd&&D[i+1]===0xd5&&D[i+2]===0xad)||nearLamp(x,y))outLamp++;else if(Sp[j+3]===0)halo=(halo||0)+1;else leakCovered++;}
        else{if((D[i]===0xdd&&D[i+1]===0xd5&&D[i+2]===0xad)||nearLamp(x,y))outLamp++;else leakOut++;}}
      rows.push({k,v,w,n:LP[k][1],t591:m.t591,t590:s.__t590,cyc:m.cycles574,flag:!!m.hooks.flag,flagAt:!!SS.flagAt,radar:!!m.hooks.radar,door:!!m.hooks.door,winImg:w?(SS!==S0):null,inBody,outLamp,leakCovered,leakOut,halo,ms});
    }}
  return {errs,rows};})()`;
async function boot(q, tag) {
  H.cleanProfiles(); const profile = path.join(DIR, '.smoke-profile-591-' + process.pid + tag);
  const srv = await H.startServer(PORT); const dev = PORT + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile);
  const cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1350, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
  const errors = []; cdp.on && cdp.on('Runtime.exceptionThrown', e => errors.push(e));
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
  for (let i = 0; i < 240; i++) { if (await ev('!!(window.__boot426&&window.__boot426().ready&&window.GV)')) break; await H.sleep(500); }
  const close = () => { try { cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); };
  return { cdp, ev, close };
}
const GROUPS = { 1: [6, 11, 14, 15, 21, 28, 40, 84, 130], 2: [7, 12, 17, 18, 23, 30, 35, 36, 37, 41, 42, 43, 87], 3: [32, 38, 39, 44, 47, 48, 55, 61, 65, 108], 4: [19, 56, 113, 114] };
const SCENE = g => `(()=>{const X=window.__t591X,G=window.GV,LP=X.LP();G.setMapSize(72);G.newWorldSeeded(591);G.setDiff(3);G.ai(false);G.setSpeed(0);X.rich();
  X.clear(3,3,68,68);const K=${JSON.stringify(GROUPS[g])};const tool=k=>LP[k][0];
  const cols=${g === 4 ? 2 : g === 3 ? 4 : g === 2 ? 5 : 5};let x=6,y=6,rowH=0,i=0;const placed=[];const maxN=Math.max(...K.map(k=>LP[k][1]));
  for(const k of K){const n=LP[k][1];if(i&&i%cols===0){x=6;y+=rowH+1;rowH=0;}
    X.road(x-1,y-1,x+n,y-1);X.road(x-1,y-1,x-1,y+n);X.road(x-1,y+n,x+n,y+n);X.road(x+n,y-1,x+n,y+n);
    if(k===18)X.water(x-1,y-2,x+n,y-1); // 港口園區外緣要鄰水（≥2 格）：後側兩排改成水面
    const ok=G.place(tool(k),x,y);placed.push([k,ok]);x+=n+1;rowH=Math.max(rowH,n);i++;}
  X.mask(3,3,68,68);X.finish();
  const cx=6+(cols*(maxN+1))/2-1,cy=6+(Math.ceil(K.length/cols)*(maxN+1))/2-1;
  G.setDay(10);G.setVisT(55);G.setRot(0);G.setZoom(${g === 4 ? 0.6 : g === 3 ? 0.75 : 1});G.lookAt(cx,cy);G.forceDraw();return placed;})()`;
(async () => {
  if (MODE === 'audit') {
    const b = await boot('', 'a');
    try { const r = await b.ev(AUDIT); fs.writeFileSync(path.join(__dirname, 'audit591.json'), JSON.stringify(r, null, 1));
      const bad = r.rows.filter(x => x.err || !x.t591 || x.t590 !== 1 || x.cyc !== 0 || x.flag !== x.flagAt || x.leakCovered || x.leakOut || (x.k === 19 && !x.radar) || (x.k === 23 && !x.door) || (x.w && x.winImg === false && false));
      console.log('bakes', r.rows.length, 'errs', r.errs, 'bad', bad.length); for (const x of bad.slice(0, 20)) console.log(JSON.stringify(x));
      const ms = r.rows.map(x => x.ms || 0); console.log('bake ms max', Math.max(...ms), 'sum', ms.reduce((a, c) => a + c, 0));
      console.log('night px in body', r.rows.reduce((a, x) => a + (x.inBody || 0), 0), 'lamp', r.rows.reduce((a, x) => a + (x.outLamp || 0), 0));
    } finally { b.close(); }
  } else {
    for (const [q, tag] of (arg('back','')?[['', 'back']]:[['?noT591=1', 'before'], ['', 'after']])) {
      if (arg('only', '') && arg('only', '') !== tag) continue;
      const b = await boot(q, tag);
      try {
        await b.ev(`(()=>{const e=document.querySelector('#bNewGame');if(e)e.click();return !!e;})()`); await H.sleep(1500);
        if (tag === 'back') await b.ev("window.__t591Mode='back'");
        for (const g of [1, 2, 3, 4]) {
          const placed = await b.ev(SCENE(g)); const fails = placed.filter(p => !p[1]); if (fails.length) console.log('place fail g' + g, JSON.stringify(fails));
          await H.sleep(600); await b.ev('GV.forceDraw()'); await H.sleep(300);
          const shot = async name => { const s = await b.cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `T591-g${g}-${tag}-${name}.png`), Buffer.from(s.data, 'base64')); };
          await shot('day');
          await b.ev('GV.setVisT(100);GV.forceDraw()'); await H.sleep(300); await shot('night');
          await b.ev('GV.setSeason(3);window.__t591X.snow();GV.setDay(310);GV.setVisT(55);GV.forceDraw()'); await H.sleep(400); await shot('winter');
          await b.ev('GV.setSeason(0);GV.setDay(10);GV.setRot(1);GV.forceDraw()'); await H.sleep(300); await shot('rot1');
          await b.ev('GV.setRot(0);GV.forceDraw()');
        }
        const errs = await b.ev('(window.__errLog||[]).length'); console.log(tag, 'errLog', errs);
      } finally { b.close(); }
    }
    console.log('saved to', OUT);
  }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('T591 CHECK FAIL', e.message); process.exit(1); });
