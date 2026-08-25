import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

let plan = null;
for (const seed of [101, 202, 303, 404]) {
  await c.evalJs(`GV.newWorldSeeded(${seed}); GV.setDiff(1);`);
  plan = await c.evalJs(`(()=>{
    let best=null;
    for(let y=6;y<66;y++){
      const okList=[];
      for(let x=2;x<70;x++){if(GV.place('road',x,y))okList.push(x);}
      // 連續段
      let run=1,start=okList[0];
      for(let i=1;i<=okList.length;i++){
        if(i<okList.length&&okList[i]===okList[i-1]+1)run++;
        else{
          if(!best||run>best.len){if(run>=6)best={y,len:run,xs:okList.slice(i-run,i)};}
          run=1;start=okList[i];
        }
      }
      if(best&&best.y===y){}
    }
    if(!best)return {len:0,cands:[]};
    const cands=[];
    for(const x of best.xs.slice(0,9)){
      if(x!==best.xs[0])cands.push([x,best.y+1]);
    }
    return {len:best.len,roadN:best.xs.length,cands};
  })()`);
  out.push(`seed${seed}: ` + JSON.stringify({ len: plan.len, roadN: plan.roadN, cands: plan.cands.length }));
  if (plan.cands.length >= 5) break;
}
if (!plan.cands || plan.cands.length < 3) { console.log(out.join('\n') + '\n樣本不足'); process.exit(0); }

const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('分區'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('住宅區'); if (p) { await c.click(p.x, p.y); await sleep(300); }

let cOk = 0, cFail = 0, lOk = 0, bothFail = 0;
const details = [];
for (const [gx, gy] of plan.cands) {
  await c.evalJs(`(()=>{try{GV.center(${gx},${gy})}catch(e){}})()`);
  await sleep(400);
  const ctr = JSON.parse(await c.evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`));
  const z0 = await c.evalJs(`GV.stats().zones`);
  await c.click(ctr[0], ctr[1]);
  await sleep(300);
  const z1 = await c.evalJs(`GV.stats().zones`);
  if (z1 > z0) { cOk++; details.push(`${gx},${gy}:中心✓`); continue; }
  cFail++;
  await c.click(ctr[0], ctr[1] + 12);
  await sleep(300);
  const z2 = await c.evalJs(`GV.stats().zones`);
  if (z2 > z1) { lOk++; details.push(`${gx},${gy}:中心✗下半✓`); } else { bothFail++; details.push(`${gx},${gy}:皆✗`); }
}
out.push(`中心✓=${cOk} 中心✗=${cFail}｜下半補救✓=${lOk} 皆敗=${bothFail}`);
out.push(details.join(' | '));
await shot('v-t554-r4.png');
console.log(out.join('\n'));
process.exit(0);
