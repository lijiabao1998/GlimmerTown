// T599 真 Chrome 逐位對照檯（施工 session 暫存工具原樣存檔）
// T599 像素忠實度：主線（工作樹副本）33／34 v0–v3＋105／106 v0–v2 對實驗線 d172e97，日夜 CRC32＋尺寸錨點；
// 另跑一次主線 __noCluster599（叢塔第三段回到實驗線懸空原樣）→ v3 也應逐位相同。  node t599_px.js --port=8331
'use strict';
const fs = require('fs'), path = require('path');
const PORT = +(process.argv.find(a => a.startsWith('--port=')) || '--port=8331').split('=')[1];
const KEYS = ['33_1_0', '33_1_1', '33_1_2', '33_1_3', '34_1_0', '34_1_1', '34_1_2', '34_1_3', '105_1_0', '105_1_1', '105_1_2', '106_1_0', '106_1_1', '106_1_2'];
const PROBE = `(()=>{const S=(window.GV&&GV.__SPR)?GV.__SPR():(GV.art574&&GV.art574.SPR?GV.art574.SPR():null);if(!S)return {err:'no SPR'};
  const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
  const crc=cv=>{if(!cv)return null;const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=CT[(c^d[i])&255]^(c>>>8);return ((c^0xFFFFFFFF)>>>0).toString(16);};
  const out={};for(const k of ${JSON.stringify(KEYS)}){const s=S.bld[k];out[k]=s?[s.w,s.h,s.ax,s.ay,s.sc||1,crc(s.img),crc(s.night)]:null;}
  return {out,t599:window.__t599?{ok:window.__t599.ok,err:window.__t599.err,halo:window.__t599.halo}:null,errLog:(window.__errLog||[]).length};})()`;
async function run(dir, port, pre) {
  const H = require(path.join(dir, 'harness_px599.js'));
  H.cleanProfiles(); const profile = path.join(dir, '.smoke-profile-px599-' + process.pid + port);
  const srv = await H.startServer(port); const dev = port + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" + (pre || '') });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev("!!(window.GV&&((window.__boot426&&window.__boot426().ready)||window.__bootDone453))")) break; await H.sleep(500); }
    await H.sleep(1000);
    return await ev(PROBE);
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  const mdir = path.join(__dirname, 'inv_px599_main'); fs.mkdirSync(mdir, { recursive: true });
  for (const f of fs.readdirSync('C:/dev/glimmer-town')) { const p = path.join('C:/dev/glimmer-town', f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(mdir, f)); }
  let h = fs.readFileSync(path.join(mdir, 'index.html'), 'utf8'); if (h.split('window.GV={').length !== 2) throw new Error('GV anchor');
  fs.writeFileSync(path.join(mdir, 'index.html'), h.replace('window.GV={', 'window.GV={__SPR:()=>SPR,'));
  const ldir = path.join(__dirname, 't594', 'lab_src');
  for (const d of [mdir, ldir]) fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(d, 'harness_px599.js'));
  const m = await run(mdir, PORT, ''); console.log('main', JSON.stringify(m.t599), 'errLog', m.errLog);
  const mc = await run(mdir, PORT + 4, ';window.__noCluster599=true;'); console.log('main noCluster', JSON.stringify(mc.t599));
  const l = await run(ldir, PORT + 8, ''); console.log('lab done', l.errLog);
  fs.writeFileSync(path.join(__dirname, 't599_px.json'), JSON.stringify({ m, mc, l }, null, 1));
  for (const k of KEYS) {
    const a = JSON.stringify(m.out[k]), c = JSON.stringify(mc.out[k]), b = JSON.stringify(l.out[k]);
    console.log(k.padEnd(8), a === b ? 'SAME' : 'DIFF', ' noCluster:', c === b ? 'SAME' : 'DIFF', a === b ? '' : ('\n   main=' + a + '\n   lab =' + b));
  }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('PX FAIL', e.message); process.exit(1); });
