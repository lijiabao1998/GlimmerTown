// T554 重現性研究 v2：中心 vs 下半 點擊成功率統計
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

// 0) 開新標準局
await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(600);
await c.evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2200);

// 1) canPlaceTool 找可建區並鋪路
const plan = await c.evalJs(`(()=>{
  const res={cy:null,roads:0,cands:[]};
  for(let y=20;y<52&&res.cy===null;y++){
    let ok=0;for(let x=30;x<42;x++)if(GV.canPlaceTool('road',x,y))ok++;
    if(ok>=12)res.cy=y;
  }
  if(res.cy!==null){
    const cy=res.cy;
    for(let x=30;x<42;x++){if(GV.place('road',x,cy))res.roads++;}
    for(let x=31;x<41;x++){
      if(GV.canPlaceTool('zr',x,cy+1))res.cands.push([x,cy+1]);
      else if(GV.canPlaceTool('zr',x,cy-1))res.cands.push([x,cy-1]);
    }
    res.cands=res.cands.slice(0,10);
  }
  return res;
})()`);
out.push('plan: ' + JSON.stringify(plan));
if (!plan.cands || !plan.cands.length) { console.log(out.join('\n') + '\n無樣本'); process.exit(0); }

// 2) 選住宅工具
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('分區'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('住宅區'); if (p) { await c.click(p.x, p.y); await sleep(300); }

// 3) 統計
let cOk = 0, cFail = 0, lOk = 0, bothFail = 0;
const details = [];
for (const [gx, gy] of plan.cands) {
  const ctr = await c.evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`);
  const [sx, sy] = JSON.parse(ctr);
  const z0 = await c.evalJs(`GV.stats().zones`);
  await c.click(sx, sy);
  await sleep(350);
  const z1 = await c.evalJs(`GV.stats().zones`);
  if (z1 > z0) { cOk++; details.push(`${gx},${gy}:中心✓`); continue; }
  cFail++;
  await c.click(sx, sy + 12);
  await sleep(350);
  const z2 = await c.evalJs(`GV.stats().zones`);
  if (z2 > z1) { lOk++; details.push(`${gx},${gy}:中心✗下半✓`); } else { bothFail++; details.push(`${gx},${gy}:皆✗`); }
}
out.push(`中心成功=${cOk} 失敗=${cFail}｜下半補救=${lOk} 皆敗=${bothFail}`);
out.push(details.join(' | '));
out.push('weather=' + await c.evalJs(`GV.stats().weather`));
await shot('v-t554-repro.png');
console.log(out.join('\n'));
process.exit(0);
