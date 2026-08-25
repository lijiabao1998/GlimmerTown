import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');

// 新局
await c.evalJs(`GV.newWorldSeeded(101); GV.setDiff(1);`);
const plan = await c.evalJs(`(()=>{
  const okList=[];
  for(let x=2;x<70;x++){if(GV.place('road',x,6))okList.push(x);}
  const cands=okList.slice(0,10).map(x=>[x,7]);
  return {n:okList.length,cands};
})()`);
out.push('roads=' + plan.n + ' cands=' + JSON.stringify(plan.cands));

const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('分區'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('住宅區'); if (p) { await c.click(p.x, p.y); await sleep(300); }

let uiOk = 0, uiFailValid = 0, uiFailTerrain = 0;
const details = [];
for (const [gx, gy] of plan.cands) {
  await c.evalJs(`(()=>{try{GV.center(${gx},${gy})}catch(e){}})()`);
  await sleep(350);
  const ctr = JSON.parse(await c.evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`));
  const z0 = await c.evalJs(`GV.stats().zones`);
  await c.click(ctr[0], ctr[1]);
  await sleep(280);
  const z1 = await c.evalJs(`GV.stats().zones`);
  if (z1 > z0) { uiOk++; details.push(`${gx},${gy}:UI中心✓`); continue; }
  // 驗屍：同格程式化放置
  const oracle = await c.evalJs(`(()=>{try{return GV.place('zr',${gx},${gy})?'VALID':'TERRAIN';}catch(e){return 'TERRAIN';}})()`);
  if (oracle === 'VALID') { uiFailValid++; details.push(`${gx},${gy}:UI✗但地可建⇒命中bug`); }
  else { uiFailTerrain++; details.push(`${gx},${gy}:地形不可建`); }
}
out.push(`UI中心✓=${uiOk}｜UI✗+地可建(命中bug)=${uiFailValid}｜地形不可建=${uiFailTerrain}`);
out.push(details.join(' | '));
writeFileSync('shots/v-t554-r5.json', out.join('\n'));
console.log(out.join('\n'));
process.exit(0);
