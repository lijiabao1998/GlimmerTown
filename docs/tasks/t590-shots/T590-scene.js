// T590 城中實景（真 Chrome、scratch 副本、載入前設槽 3）：舊路徑（不帶 lot574＝舊存檔建築）與單格類的換圖前後
// node t590_scene.js --port=8139 --out=<dir>
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8139), OUT = arg('out', path.join(__dirname, 'scene590'));
const DIR = path.join(__dirname, 'inv_scene590'); fs.mkdirSync(DIR, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(DIR, 'harness.js'));
const BRIDGE = `window.__t590Snow=()=>{rainDays=SNOW_ACC_DAYS;return rainDays;};window.__t590Scene=(G,group)=>{
  G.setMapSize(72);G.newWorldSeeded(590);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}
  const G1=[6,7,10,11,12,13,14,15,17,18,21,28,30,40,52,84,95,102,130],G2=[20,23,35,36,37,41,42,43,87,108],G3=[5,32,38,39,44,47,48,55,56,61],G4=[19,65,113,114];
  const list=group===1?G1.map(k=>[k,1]):group===2?G2.map(k=>[k,2]):group===3?G3.map(k=>[k,k===5?1:3]):G4.map(k=>[k,k===114?5:4]);
  const put=(k,sz,x,y,v)=>{for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){const t=T(idx(x+dx,y+dy));t.bld=(dx||dy)?{k,ref:[x,y]}:{k,lv:1,v,age:40,pw:true,h:.6,sz:sz>1?sz:undefined};}};
  const road=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}};
  const cols=group===1?5:group===2?4:group===3?4:2,step=group===1?3:group===2?4:group===3?5:7;
  let i=0;const x0=14,y0=14;
  for(const [k,sz] of list){const c=i%cols,r=(i/cols)|0;const x=x0+c*step,y=y0+r*step;road(x-1,y-1,x+sz,y-1);road(x-1,y-1,x-1,y+sz);put(k,sz,x,y,0);i++;}
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){if(typeof recalcMask==='function')recalcMask(x,y);}
  const rows=Math.ceil(list.length/cols),cx=x0+(cols*step)/2-1,cy=y0+(rows*step)/2-1;
  G.setDay(10);G.setVisT(55);G.setRot(0);G.setZoom(group===4?0.75:1);G.lookAt(cx,cy);G.forceDraw();
  return {n:list.length,cx,cy};
};`;
let html = fs.readFileSync('C:/dev/glimmer-town/index.html', 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV anchor drift');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const H = require(path.join(DIR, 'harness.js'));
async function shoot(q, tag) {
  H.cleanProfiles(); const profile = path.join(DIR, '.smoke-profile-sc-' + process.pid + tag);
  const srv = await H.startServer(PORT); const dev = PORT + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1350, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 240; i++) { if (await ev('!!(window.__boot426&&window.__boot426().ready&&window.GV)')) break; await H.sleep(500); }
    await ev(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();return !!b;})()`); await H.sleep(1500);
    const WINTER = arg('winter','') === '1';
    for (const g of [1, 2, 3, 4]) {
      await ev(`(()=>{const r=window.__t590Scene(window.GV,${g});return r;})()`); await H.sleep(700);
      if (WINTER) { await ev('GV.setSeason(3);window.__t590Snow();GV.setDay(310);GV.setVisT(55);GV.forceDraw()'); await H.sleep(400); }
      await ev('GV.forceDraw()'); await H.sleep(300);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `T590-g${g}-${tag}-${WINTER?'winter':'day'}.png`), Buffer.from(shot.data, 'base64'));
      if (WINTER) continue;
      await ev('GV.setVisT(100);GV.forceDraw()'); await H.sleep(300);
      const shotN = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `T590-g${g}-${tag}-night.png`), Buffer.from(shotN.data, 'base64'));
    }
    const errs = await ev('(window.__errLog||[]).length'); return errs;
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  const only=arg('only','');
  if(only!=='after')await shoot('?noT590=1', 'before');
  if(only!=='before')await shoot('', 'after');
  console.log('saved to', OUT);
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('SCENE FAIL', e.message); process.exit(1); });
