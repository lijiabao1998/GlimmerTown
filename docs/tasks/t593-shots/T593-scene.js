// T593 城中實拍：一排 105／106（不同格＝不同款）夾在舊摩天樓與住商街區之間；日／夜／旋轉；另拍「底座在畫面下緣外」驗剔除
// node t593_scene.js --port=8301 [--only=before|after]
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8301), OUT = path.join(__dirname, 'scene593'); fs.mkdirSync(OUT, { recursive: true });
const DIR = path.join(__dirname, 'inv_scene593'); fs.mkdirSync(DIR, { recursive: true });
for (const f of fs.readdirSync('C:/dev/glimmer-town')) { const p = path.join('C:/dev/glimmer-town', f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(DIR, 'harness.js'));
const BRIDGE = `window.__t593Scene=(G)=>{
  G.setMapSize(72);G.newWorldSeeded(593);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}
  const put=(k,sz,x,y,v,lv)=>{for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){const t=T(idx(x+dx,y+dy));t.bld=(dx||dy)?{k,ref:[x,y]}:{k,lv:lv||1,v,age:60,pw:true,wa:true,h:.6,sz:sz>1?sz:undefined};}};
  const road=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}};
  road(10,10,52,10);road(10,14,52,14);road(10,18,52,18);road(10,22,52,22);
  for(const x of [10,14,18,22,26,30,34,38,42,46,50])road(x,10,x,22);
  let i=0;for(const x of [11,15,19,23,27,31,35,39,43,47]){put(i%2?106:105,3,x,11,0);i++;}
  i=0;for(const x of [11,15,19,23,27,31,35,39,43,47]){if(i%3===0)put(i%2?34:33,2,x,15,0);else{put(1,1,x,15,i%12,3);put(2,1,x+1,15,(i+3)%12,3);put(1,1,x,16,(i+5)%12,2);put(2,1,x+1,16,(i+7)%12,2);}i++;}
  i=0;for(const x of [11,15,19,23,27,31,35,39,43,47]){put(i%2?105:106,3,x,19,0);i++;}
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){if(typeof recalcMask==='function')recalcMask(x,y);}
  G.setDay(10);G.setVisT(55);G.setRot(0);return true;};`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV anchor');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const H = require(path.join(DIR, 'harness.js'));
async function shoot(q, tag) {
  H.cleanProfiles(); const profile = path.join(DIR, '.smoke-profile-593-' + process.pid + tag);
  const srv = await H.startServer(PORT); const dev = PORT + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev('!!(window.__boot426&&window.__boot426().ready&&window.GV)')) break; await H.sleep(500); }
    await ev(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();return !!b;})()`); await H.sleep(1200);
    await ev('window.__t593Scene(window.GV)');
    const shot = async name => { await ev('GV.forceDraw()'); await H.sleep(400); const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `T593-${tag}-${name}.png`), Buffer.from(s.data, 'base64')); };
    await ev('GV.setZoom(0.75);GV.lookAt(31,16)'); await shot('day');
    await ev('GV.setVisT(100)'); await shot('night'); await ev('GV.setVisT(55)');
    await ev('GV.setZoom(1.4);GV.lookAt(24,13)'); await shot('close');
    await ev('GV.setRot(1);GV.setZoom(0.75);GV.lookAt(31,16)'); await shot('rot1'); await ev('GV.setRot(0)');
    await ev('GV.setZoom(1);GV.lookAt(31,7)'); await shot('edge'); // 底座在畫面下緣外：塔身仍要畫
    return await ev('(window.__errLog||[]).length');
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  const only = arg('only', '');
  if (only !== 'after') console.log('before errLog', await shoot('?noT593=1', 'before'));
  if (only !== 'before') console.log('after errLog', await shoot('', 'after'));
  console.log('saved', OUT); setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('SCENE FAIL', e.message); process.exit(1); });
