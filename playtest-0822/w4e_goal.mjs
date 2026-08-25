// 波4e：強制重繪驗日期＋開「目標」面板
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
await c.evalJs(`(()=>{try{GV.forceDraw()}catch(e){}})()`);
await sleep(500);
out.push('stats-now: ' + await c.evalJs(`JSON.stringify({day:GV.stats().day,money:Math.round(GV.stats().money)})`));
const g = await c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
  const b=els.find(e=>String(e.innerText).includes('目標'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);
out.push('goal-btn: ' + JSON.stringify(g));
if (g) {
  await c.click(g.x, g.y);
  await sleep(900);
  const t = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el&&el.offsetParent!==null?el.innerText:'hidden';})()`);
  out.push('goal-panel: ' + String(t).split('\n').join('|').slice(0, 450));
  await shot('w4e-goalpanel.png');
}
console.log(out.join('\n'));
process.exit(0);
