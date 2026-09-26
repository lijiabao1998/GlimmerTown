// T594 真 Chrome 對照檯（施工 session 的暫存工具原樣存檔；路徑指向施工當時的暫存區，重跑時改成自己的目錄）
// T594 像素忠實度：主線（工作樹副本）makeBlockSprite594 與實驗線 d172e97 GV.block559.make
// 在 k1–3 × lv1–3 × v0–11 × bw,bh∈1..4（1,728 張）上逐張比：日圖／夜圖 CRC32、尺寸、錨點、冒煙點、立面名與牆框。
// node t594_px.js --port=8291
'use strict';
const fs = require('fs'), path = require('path');
const PORT = +(process.argv.find(a => a.startsWith('--port=')) || '--port=8291').split('=')[1];
const probe = (fnExpr, k, lv) => `(()=>{const mk=${fnExpr};if(typeof mk!=='function')return {err:'no maker'};
  const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let q=0;q<8;q++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
  const crc=cv=>{if(!cv)return null;const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=CT[(c^d[i])&255]^(c>>>8);return ((c^0xFFFFFFFF)>>>0).toString(16);};
  const out={};let err=0;const ce=console.error;console.error=function(){err++;return ce.apply(console,arguments);};
  try{for(let v=0;v<12;v++)for(let bw=1;bw<=4;bw++)for(let bh=1;bh<=4;bh++){const key=${k}+'_'+${lv}+'_'+bw+'x'+bh+'_'+v;
    try{const s=mk(${k},${lv},bw,bh,v);const t=s.__t547||{};
      out[key]=[s.w,s.h,s.ax,s.ay,crc(s.img),crc(s.night),JSON.stringify(s.smoke608||[]),String(t.sty),!!t.pitch,JSON.stringify(t.wall||null),JSON.stringify(t.occ||null)];}
    catch(e){out[key]=['EXC',String(e&&e.message)];}}}
  finally{console.error=ce;}
  return {out,err};})()`;
async function run(dir, port, fnExpr) {
  const H = require(path.join(dir, 'harness_px594.js'));
  H.cleanProfiles(); const profile = path.join(dir, '.smoke-profile-px594-' + process.pid);
  const srv = await H.startServer(port); const dev = port + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev("!!(window.GV&&((window.__boot426&&window.__boot426().ready)||window.__bootDone453))")) break; await H.sleep(500); }
    await H.sleep(1000);
    const all = {}; let err = 0;
    for (let k = 1; k <= 3; k++) for (let lv = 1; lv <= 3; lv++) { const r = await ev(probe(fnExpr, k, lv)); if (r.err && typeof r.err === 'string') throw new Error(r.err); Object.assign(all, r.out); err += r.err; process.stdout.write('.'); }
    const flags = await ev("Object.keys(window).filter(k=>/^__(no|facadeForce)/.test(k)&&window[k]).join(',')");
    return { out: all, err, flags };
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
}
(async () => {
  const mdir = path.join(__dirname, 'inv_px594_main'); fs.mkdirSync(mdir, { recursive: true });
  for (const f of fs.readdirSync('C:/dev/glimmer-town')) { const p = path.join('C:/dev/glimmer-town', f); if (fs.statSync(p).isFile() && /\.(html|js|json|webmanifest|png|svg|css)$/.test(f)) fs.copyFileSync(p, path.join(mdir, f)); }
  let h = fs.readFileSync(path.join(mdir, 'index.html'), 'utf8'); if (h.split('window.GV={').length !== 2) throw new Error('GV anchor');
  fs.writeFileSync(path.join(mdir, 'index.html'), h.replace('window.GV={', 'window.GV={__B594:(k,lv,bw,bh,v)=>makeBlockSprite594(k,lv,bw,bh,v),'));
  const ldir = path.join(__dirname, 't594', 'lab_src');
  for (const d of [mdir, ldir]) fs.copyFileSync(path.join(__dirname, 'inv_main', 'harness.js'), path.join(d, 'harness_px594.js'));
  const which = process.argv.find(a => a.startsWith('--only=')); const only = which ? which.split('=')[1] : '';
  const m = only === 'lab' ? null : await run(mdir, PORT, 'window.GV.__B594');
  console.log(' main done', m && Object.keys(m.out).length, 'err', m && m.err, 'flags', m && m.flags);
  const l = only === 'main' ? null : await run(ldir, PORT + 4, 'window.GV.block559&&window.GV.block559.make');
  console.log(' lab done', l && Object.keys(l.out).length, 'err', l && l.err, 'flags', l && l.flags);
  fs.writeFileSync(path.join(__dirname, 't594', 'px594.json'), JSON.stringify({ m, l }));
  if (m && l) {
    let same = 0; const diff = [], sty = {};
    for (const key of Object.keys(l.out)) { const a = JSON.stringify(m.out[key]), b = JSON.stringify(l.out[key]); if (a === b) same++; else diff.push(key + '\n   main=' + a + '\n   lab =' + b);
      const s = l.out[key][7]; sty[s] = (sty[s] || 0) + 1; }
    console.log('same', same, '/', Object.keys(l.out).length, 'diff', diff.length); console.log(diff.slice(0, 8).join('\n'));
    console.log('styles', JSON.stringify(sty));
  }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('PX FAIL', e.message); process.exit(1); });
