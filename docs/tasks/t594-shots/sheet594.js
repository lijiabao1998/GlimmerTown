// T594 接觸表產生器（施工 session 的暫存工具原樣存檔）
// T594 接觸表：主線 makeBlockSprite594（工作樹副本，GV.__B594 注入）在 2×2 街廓上 k1–3 × lv1–3 × v0–11 的日圖／夜圖，
// 另加十個立面各一張代表（取 1,728 張裡第一次出現的那個尺寸）。輸出 PNG 到 t594/shots/。
// node t594_sheet.js --port=8301   （需先跑過 t594_px.js 產生 inv_px594_main 與 px594.json）
'use strict';
const fs = require('fs'), path = require('path');
const PORT = +(process.argv.find(a => a.startsWith('--port=')) || '--port=8301').split('=')[1];
const OUT = path.join(__dirname, 't594', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const px = JSON.parse(fs.readFileSync(path.join(__dirname, 't594', 'px594.json'), 'utf8'));
const firstOf = {}; for (const [key, r] of Object.entries(px.m.out)) { const s = r[7]; if (/^f577:/.test(s) && !firstOf[s]) firstOf[s] = key; }
const PROBE = (mode) => `(()=>{const mk=window.GV.__B594;const pad=10,lab=26;
  const cell=(k,lv,bw,bh,v)=>mk(k,lv,bw,bh,v);
  const draw=(rows,cols,get,title)=>{let cw=0,ch=[];for(let r=0;r<rows;r++){ch[r]=0;for(let c=0;c<cols;c++){const s=get(r,c);if(!s)continue;cw=Math.max(cw,s.w);ch[r]=Math.max(ch[r],s.h);}}
    const W=pad+cols*(cw+pad)+60,H=pad+lab+ch.reduce((a,b)=>a+b+pad+lab,0);const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');
    g.fillStyle='${mode === 'night' ? '#10141c' : '#7f9a6e'}';g.fillRect(0,0,W,H);g.imageSmoothingEnabled=false;g.font='12px monospace';g.fillStyle='${mode === 'night' ? '#cfd8e8' : '#15201a'}';g.fillText(title,pad,12);
    let y=pad+lab;for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){const s=get(r,c);if(!s)continue;const x=60+pad+c*(cw+pad);
      ${mode === 'night' ? "g.globalAlpha=.35;g.drawImage(s.img,x,y+ch[r]-s.h);g.globalAlpha=1;g.drawImage(s.night,x,y+ch[r]-s.h);" : "g.drawImage(s.img,x,y+ch[r]-s.h);"}
      {const L=String(s.lbl||'').split(' ');g.fillText(L[0]||'',x,y+ch[r]+11);g.fillText(L.slice(1).join(' '),x,y+ch[r]+23);}}
      g.fillText(get.rowLabel(r),4,y+ch[r]/2);y+=ch[r]+pad+lab;}
    return cv.toDataURL('image/png');};
  const out={};
  const g1=(r,c)=>{const k=1+((r/3)|0),lv=1+r%3,s=cell(k,lv,2,2,c);s.lbl='v'+c+' '+String(s.__t547.sty).replace('f577:','');return s;};g1.rowLabel=r=>'k'+(1+((r/3)|0))+' lv'+(1+r%3);
  out.grid=draw(9,12,g1,'T594 main makeBlockSprite594 2x2  k1-3 x lv1-3 x v0-11  (${mode})');
  const F=${JSON.stringify(Object.entries(firstOf))};
  const g2=(r,c)=>{const i=r*5+c;if(i>=F.length)return null;const[k,lv,wh,v]=F[i][1].split('_');const[bw,bh]=wh.split('x').map(Number);const s=cell(+k,+lv,bw,bh,+v);s.lbl=F[i][0].replace('f577:','')+' '+F[i][1];return s;};g2.rowLabel=r=>'';
  out.fac=draw(2,5,g2,'T594 ten facades (first occurrence in the 1,728 grid)  (${mode})');
  return out;})()`;
(async () => {
  const dir = path.join(__dirname, 'inv_px594_main');
  const H = require(path.join(dir, 'harness_px594.js'));
  H.cleanProfiles(); const profile = path.join(dir, '.smoke-profile-sheet594-' + process.pid);
  const srv = await H.startServer(PORT); const dev = PORT + 1000 + (process.pid % 300); const chrome = H.launchChrome(dev, profile); let cdp;
  try {
    cdp = await H.cdpConnect(await H.pageWsUrl(dev, chrome)); await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('glimmerville.v1.slot','3')}catch(e){}" });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    for (let i = 0; i < 300; i++) { if (await ev("!!(window.GV&&((window.__boot426&&window.__boot426().ready)||window.__bootDone453))")) break; await H.sleep(500); }
    await H.sleep(800);
    for (const mode of ['day', 'night']) {
      const o = await ev(PROBE(mode));
      for (const [n, d] of Object.entries(o)) { const f = path.join(OUT, 'T594-' + n + '-' + mode + '.png'); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); console.log(f, fs.statSync(f).size); }
    }
  } finally { try { cdp && cdp.close(); } catch {} try { chrome.kill(); } catch {} srv.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 1200); }
  setTimeout(() => process.exit(0), 1500);
})().catch(e => { console.error('SHEET FAIL', e.message); process.exit(1); });
