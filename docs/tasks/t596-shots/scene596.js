// T596 真 Chrome 實拍腳本（施工 session 的暫存工具原樣存檔；回報 errLog 與 STAT596 失敗計數）
// T596 真 Chrome 實拍：造一片住商工街區（k1–3 × lv1–3、各款、施工中、不供電），同一個場景各拍一次「開關關（現況）」與「?T596=1（預覽）」
// 晝／夜／冬雪／近景／旋轉 90°／施工近景，並回報 errLog、預覽統計。  node t596_scene.js --port=8311
'use strict';
const fs = require('fs'), path = require('path');
const arg = (n, d) => { const h = process.argv.find(a => a.startsWith('--' + n + '=')); return h ? h.split('=').slice(1).join('=') : d; };
const PORT = +arg('port', 8311), OUT = path.join(__dirname, 't596', 'scene'); fs.mkdirSync(OUT, { recursive: true });
const DIR = path.join(__dirname, 'inv_scene596'); fs.mkdirSync(DIR, { recursive: true });
for (const f of fs.readdirSync('C:/dev/glimmer-town')) { const p = path.join('C:/dev/glimmer-town', f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(DIR, f)); }
fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(DIR, 'harness.js'));
// 場景：72 圖，道路格網 4 格一街廓；每個街廓 3×3 塊擺單格住商工（同街廓同類，等級、款式輪替），最後一排是施工中（age 1／3／5／7）
const BRIDGE = `window.__t596Scene=(G)=>{
  G.setMapSize(72);G.newWorldSeeded(596);G.setDiff(3);G.ai(false);G.setSpeed(0);
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){const t=T(idx(x,y));t.t=2;t.tree=0;t.gv=0;t.road=0;t.rc=0;t.mask=0;t.bridge=0;t.zone=0;t.bld=null;t.deco=0;t.rail=0;t.tram=0;t.dock=0;t.el=0;}
  const put=(k,x,y,v,lv,age,pw)=>{const t=T(idx(x,y));t.bld={k,lv:lv||1,v,age:age==null?60:age,pw:pw!==false,wa:true,h:.6,we:1,den:1};};
  const road=(x0,y0,x1,y1)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=T(idx(x,y));t.road=1;t.rc=1;t.bld=null;}};
  for(const y of [10,14,18,22,26])road(10,y,42,y);
  for(const x of [10,14,18,22,26,30,34,38,42])road(x,10,x,26);
  let n=0;
  for(let by=0;by<4;by++)for(let bx=0;bx<8;bx++){const x0=11+bx*4,y0=11+by*4,k=1+((bx+by)%3);
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const lv=by===3?1+((dx+dy)%3):1+((bx+dx)%3),v=(bx*5+by*3+dx*7+dy*11)%12,age=by===3?[1,3,5,7,60,60,2,6,60][dy*3+dx]:60,pw=!((bx*7+dx*3+dy)%13===5);put(k,x0+dx,y0+dy,v,lv,age,pw);n++;}}
  for(let y=4;y<=67;y++)for(let x=4;x<=67;x++){if(typeof recalcMask==='function')recalcMask(x,y);}
  G.setDay(120);G.setVisT(55);G.setRot(0);return n;};window.__t596SceneStat=()=>({fail:STAT596.fail,views:STAT596.views,calls:STAT596.calls});`;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
if (html.split('window.GV={').length !== 2) throw new Error('GV anchor');
fs.writeFileSync(path.join(DIR, 'index.html'), html.replace('window.GV={', BRIDGE + 'window.GV={'));
const H = require(path.join(DIR, 'harness.js'));
async function shoot(q, tag) {
  H.cleanProfiles(); const profile = path.join(DIR, '.smoke-profile-596-' + process.pid + tag);
  const srv = await H.startServer(PORT); const dev = PORT + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html${q}` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev('!!(window.__boot426&&window.__boot426().ready&&window.GV)')) break; await H.sleep(500); }
    await ev(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();return !!b;})()`); await H.sleep(1200);
    const n = await ev('window.__t596Scene(window.GV)');
    const shot = async name => { await ev('GV.forceDraw()'); await H.sleep(350); await ev('GV.forceDraw()'); await H.sleep(250); const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `T596-${tag}-${name}.png`), Buffer.from(s.data, 'base64')); };
    await ev('GV.setSeason(1);GV.weather(0);GV.setVisT(55);GV.setZoom(1);GV.lookAt(26,17)'); await shot('day');
    await ev('GV.setVisT(100)'); await shot('night'); await ev('GV.setVisT(55)');
    await ev('GV.setSeason(3);GV.weather(2)'); await H.sleep(300); await shot('winter'); await ev('GV.setSeason(1);GV.weather(0)');
    await ev('GV.setZoom(2);GV.lookAt(20,13)'); await shot('close');
    await ev('GV.setZoom(2);GV.setVisT(100);GV.lookAt(20,13)'); await shot('close-night'); await ev('GV.setVisT(55)');
    await ev('GV.setZoom(2);GV.lookAt(24,24)'); await shot('construction');
    await ev('GV.setRot(1);GV.setZoom(1);GV.lookAt(26,17)'); await shot('rot1'); await ev('GV.setRot(0)');
    await ev('GV.setSeason(3);GV.weather(0);GV.setRot(0);GV.setZoom(2);GV.lookAt(20,13)'); for (let i = 0; i < 6; i++) { await ev('GV.step(0)||true').catch(()=>{}); } await H.sleep(1500); await shot('winter-smoke-r0');
    await ev('GV.setRot(1);GV.setZoom(2);GV.lookAt(20,13)'); await H.sleep(1500); await shot('winter-smoke-r1'); await ev('GV.setRot(0);GV.setSeason(1)');
    const errs = await ev('(window.__errLog||[]).length');
    const st = await ev('window.__t596SceneStat()');
    return { n, errs, st };
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  const only = arg('only', '');
  if (only !== 'on') console.log('off', JSON.stringify(await shoot('', 'off')));
  if (only !== 'off') console.log('on', JSON.stringify(await shoot('?T596=1', 'on')));
  console.log('saved', OUT); setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('SCENE FAIL', e.message); process.exit(1); });
