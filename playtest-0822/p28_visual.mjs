// 階段28：視覺巡檢——夜城/地鐵/流向/T455機會層/統計面板
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const clipShot = async (name, clip) => {
  const r = await c.send('Page.captureScreenshot', clip ? { format: 'png', clip } : { format: 'png' });
  writeFileSync(S + name, Buffer.from(r.data, 'base64'));
};

// 0) 開機＋走真 UI 進城（選單會蓋住畫布，GV.load 不會關掉它）
await c.goto('http://localhost:8125/index.html');
await sleep(3000);
const cont = await c.evalJs(`(()=>{const b=document.querySelector('#bContinue');if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2,vis:b.offsetParent!==null};})()`);
if (cont && cont.vis) { await c.click(cont.x, cont.y); await sleep(1500); }
else { await c.evalJs(`GV.load()`); await sleep(800); }
out.push('start-hidden: ' + await c.evalJs(`getComputedStyle(document.querySelector('#start')).display`));

// 1) 夜城（亮度調到夜）
out.push('night-set: ' + await c.evalJs(`(()=>{try{GV.daylightDbg(0.15);return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(700);
await clipShot('p28-night.png');
out.push('night-meta: ' + await c.evalJs(`(()=>{try{return JSON.stringify({spr:GV.sprNightAudit?sprNightAudit():null})}catch(e){return 'skip'}})()`));

// 2) 地鐵層
out.push('metro: ' + await c.evalJs(`(()=>{try{GV.setMetroShow(true);return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(600);
await clipShot('p28-metro.png');

// 3) 流向層
out.push('flow: ' + await c.evalJs(`(()=>{try{GV.setFlowShow384(true);return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(600);
await clipShot('p28-flow.png');

// 4) T455 機會指數層
out.push('opp: ' + await c.evalJs(`(()=>{try{GV.setOppShow455(true);const m=GV.drawOppOverlay455();return JSON.stringify(m)}catch(e){return 'ERR '+e.message}})()`));
await sleep(600);
await clipShot('p28-opp.png');

// 5) 關閉圖層、恢復白天
await c.evalJs(`(()=>{try{GV.setMetroShow(false);GV.setFlowShow384(false);GV.setOppShow455(false);GV.daylightDbg(null);}catch(e){}})()`);
console.log(out.join('\n'));
process.exit(0);
