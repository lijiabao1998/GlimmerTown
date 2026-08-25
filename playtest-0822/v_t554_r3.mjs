import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(600);
await c.evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2200);

// 換種子直到找到夠長的可建帶（最多試 8 個種子）
let plan = null;
for (const seed of [101, 202, 303, 404, 505, 606, 707, 808]) {
  await c.evalJs(`GV.newWorldSeeded(${seed}); GV.setDiff(1);`);
  plan = await c.evalJs(`(()=>{
    let best=null;
    for(let y=6;y<66;y++){
      let run=0,start=0;
      for(let x=0;x<=71;x++){
        const ok=x<72&&GV.canPlaceTool('road',x,y)&&GV.canPlaceTool('road',x,y+1)!==undefined;
        if(ok){if(run===0)start=x;run++;}
        else{if(run>=(best?.len||0)&&run>=6)best={y,len:run,start};run=0;}
        if(x===71&&ok&&run>=(best?.len||0)&&run>=6)best={y,len:run,start};
      }
    }
    if(!best)return {len:0,cands:[]};
    const cy=best.y,cands=[];
    for(let x=best.start+1;x<best.start+best.len-1&&cands.length<8;x++){
      if(GV.canPlaceTool('zr',x,cy+1))cands.push([x,cy+1]);
      else if(GV.canPlaceTool('zr',x,cy-1))cands.push([x,cy-1]);
    }
    let roads=0;
    for(let x=best.start;x<best.start+best.len;x++){if(GV.place('road',x,cy))roads++;}
    return {seed,len:best.len,roads,cands};
  })()`);
  out.push(`seed${seed}: ` + JSON.stringify({ len: plan.len, roads: plan.roads, cands: plan.cands.length }));
  if (plan.cands.length >= 4) break;
}
if (!plan.cands.length) { console.log(out.join('\n') + '\n8 種子皆無樣本'); process.exit(0); }

const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('分區'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('住宅區'); if (p) { await c.click(p.x, p.y); await sleep(300); }

let cOk = 0, cFail = 0, lOk = 0, bothFail = 0;
const details = [];
for (const [gx, gy] of plan.cands) {
  // 鏡頭置中該格
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
await shot('v-t554-r3.png');
console.log(out.join('\n'));
process.exit(0);
