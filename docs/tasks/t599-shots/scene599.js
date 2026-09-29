// T599 真城實拍腳本（改自規劃代理人的 g5_scene.js；施工 session 暫存工具原樣存檔；含施工 age 4–8 近景）
// g5 城中實拍：33／34 新塔（v0/v1 × 格雜湊＝四款）夾 105／106 與住商；日／夜／冬／近景／旋轉／底座出畫面；before＝?noT599=1
'use strict';
const fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8341), OUT = path.join(__dirname, 't599', 'scene'); fs.mkdirSync(OUT, { recursive: true });
const DIR = path.join(__dirname, 'inv_scene599'); fs.mkdirSync(DIR, { recursive: true });
const SRC = 'C:/dev/glimmer-town';
for (const f of fs.readdirSync(SRC)) { const p = path.join(SRC, f); if (fs.statSync(p).isFile() && /\.(html|js|json|png|svg)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(DIR, 'harness.js'));
const BRIDGE = `window.__g5Scene=(G)=>{
  G.setMapSize(72);G.newWorldSeeded(599);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}
  const put=(k,sz,x,y,v,lv)=>{for(let dy=0;dy<sz;dy++)for(let dx=0;dx<sz;dx++){const t=T(idx(x+dx,y+dy));t.bld=(dx||dy)?{k,ref:[x,y]}:{k,lv:lv||1,v,age:60,pw:true,wa:true,h:.6,sz:sz>1?sz:undefined};}};
  const road=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}};
  road(10,10,52,10);road(10,13,52,13);road(10,17,52,17);road(10,20,52,20);
  for(const x of [10,13,16,19,22,25,28,31,34,37,40,43,46,49,52])road(x,10,x,20);
  const shp=[];let i=0;
  for(const x of [11,14,17,20,23,26,29,32,35,38,41,44,47,50]){const k=i%2?34:33,v=(i>>1)%2;put(k,2,x,11,v);shp.push([k,v,x,11,typeof vtower599==='function'?vtower599({x,y:11},{k,v}):null]);i++;}
  i=0;for(const x of [11,17,23,29,35,41,47]){put(i%2?106:105,3,x,14,0);i++;}
  i=0;for(const x of [14,20,26,32,38,44,50]){put(i%2?2:1,1,x,14,i%12,3);put(i%2?1:2,1,x+1,14,(i+3)%12,3);put(1,1,x,15,(i+5)%12,2);put(2,1,x+1,15,(i+7)%12,2);i++;}
  i=0;for(const x of [11,14,17,20,23,26,29,32,35,38,41,44,47,50]){const k=i%2?33:34,v=((i>>1)+1)%2;put(k,2,x,18,v);shp.push([k,v,x,18,typeof vtower599==='function'?vtower599({x,y:18},{k,v}):null]);i++;}
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){if(typeof recalcMask==='function')recalcMask(x,y);}
  G.setDay(10);G.setVisT(55);G.setRot(0);return shp;};
window.__t599Age=(xs)=>{for(const [x,y,a] of xs){const b=T(idx(x,y)).bld;if(b)b.age=a;}return true;};window.__g5Winter=(on)=>{if(on){window.GV.setSeason(3);rainDays=99;}else{window.GV.setDay(10);rainDays=0;}return rainDays;};`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV anchor');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const H = require(path.join(DIR, 'harness.js'));
async function shoot(q, tag) {
  H.cleanProfiles(); const profile = path.join(DIR, '.smoke-profile-g5s-' + tag + '-' + process.pid);
  const srv = await H.startServer(PORT); const dev = PORT + 900 + (process.pid % 50) + (tag === 'before' ? 0 : 60); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome, 40000)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev('!!(window.__boot426&&window.__boot426().ready&&window.GV)')) break; await H.sleep(500); }
    await ev(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();return !!b;})()`); await H.sleep(1200);
    const shp = await ev('window.__g5Scene(window.GV)'); console.log(tag, 'shapes', JSON.stringify(shp.map(s => s[0] + 'v' + s[1] + '@' + s[2] + ',' + s[3] + '→' + s[4])));
    const shot = async name => { await ev('GV.forceDraw()'); await H.sleep(400); const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `g5-${tag}-${name}.png`), Buffer.from(s.data, 'base64')); };
    await ev('GV.setZoom(0.75);GV.lookAt(31,15)'); await shot('day');
    await ev('GV.setVisT(100)'); await shot('night'); await ev('GV.setVisT(55)');
    await ev('window.__g5Winter(true)'); await shot('winter'); await ev('window.__g5Winter(false)');
    await ev('GV.setZoom(1.5);GV.lookAt(20,12)'); await shot('close');
    await ev('GV.setVisT(100)'); await shot('closenight'); await ev('GV.setVisT(55)');
    await ev('GV.setRot(1);GV.setZoom(0.75);GV.lookAt(31,15)'); await shot('rot1');
    await ev('GV.setRot(2);GV.setZoom(1);GV.lookAt(31,4)'); await shot('edge-rot2'); await ev('GV.setRot(0)');
    await ev('GV.setZoom(1);GV.lookAt(31,4)'); await shot('edge');
    await ev('GV.setRot(3);GV.setZoom(0.75);GV.lookAt(31,15)'); await shot('rot3'); await ev('GV.setRot(0)');
    await ev('window.__t599Age([[11,11,4],[14,11,5],[17,11,6],[20,11,7],[23,11,8],[35,11,6],[29,11,5]]);GV.setZoom(1.5);GV.lookAt(18,13)'); await shot('constr'); await ev('GV.setVisT(100)'); await shot('constrnight'); await ev('GV.setVisT(55)'); await ev('GV.setZoom(1.5);GV.lookAt(32,13)'); await shot('constr2');
    await ev('window.__g5Winter(true);GV.setZoom(1.5);GV.lookAt(20,12)'); await shot('winterclose'); await ev('window.__g5Winter(false)');
    return await ev('(window.__errLog||[]).length');
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  console.log('before errLog', await shoot('?noT599=1', 'before'));
  console.log('after errLog', await shoot('', 'after'));
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('SCENE FAIL', e.message); process.exit(1); });
