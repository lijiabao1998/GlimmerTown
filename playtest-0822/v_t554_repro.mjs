// T554 重現性研究：路緣鄰格中心 vs 下半 點擊成功率統計
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

// 1) 用 canPlaceTool 找一塊可建區：主幹道東西向 12 格＋南側候選鄰格
const plan = JSON.parse(await c.evalJs(`(()=>{
  const res={roads:[],cands:[]};
  let cy=null;
  for(let y=20;y<52&&!cy;y++){
    let ok=0;for(let x=30;x<42;x++)if(GV.canPlaceTool('road',x,y))ok++;
    if(ok>=12){cy=y;}
  }
  if(cy===null)return JSON.stringify(res);
  for(let x=30;x<42;x++){if(GV.place('road',x,cy))res.roads.push([x,cy]);}
  for(let x=31;x<41;x++){
    const ny=cy+1;
    if(GV.canPlaceTool('zr',x,ny))res.cands.push([x,ny]);
    else if(GV.canPlaceTool('zr',x,cy-1))res.cands.push([x,cy-1]);
  }
  return JSON.stringify({cy,roads:res.roads.length,cands:res.cands.slice(0,10)});
})()`));
out.push("plan-raw: " + planRaw); let plan=null; try{plan=JSON.parse(planRaw);}catch(e){console.log(out.join("
"));process.exit(0);}
if (!JSON.parse(plan).cands?.length) { console.log(out.join('\n') + '\n找不到可建樣本'); process.exit(0); }

// 2) 選住宅工具
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('分區'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('住宅區'); if (p) { await c.click(p.x, p.y); await sleep(300); }

// 3) 逐候選格：中心點擊 → 記成功？失敗則下半點擊 → 記成功？（每格只計一次成功）
const cands = JSON.parse(plan).cands;
let cOk = 0, cFail = 0, lOk = 0, lFailAfterCenterFail = 0;
const details = [];
for (const [gx, gy] of cands) {
  const ctr = JSON.parse(await c.evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`));
  const z0 = await c.evalJs(`GV.stats().zones`);
  await c.click(ctr[0], ctr[1]);
  await sleep(350);
  const z1 = await c.evalJs(`GV.stats().zones`);
  if (z1 > z0) { cOk++; details.push(`${gx},${gy}:中心✓`); continue; }
  cFail++;
  await c.click(ctr[0], ctr[1] + 12);
  await sleep(350);
  const z2 = await c.evalJs(`GV.stats().zones`);
  if (z2 > z1) { lOk++; details.push(`${gx},${gy}:中心✗下半✓`); } else { lFailAfterCenterFail++; details.push(`${gx},${gy}:皆✗(可能地形)`); }
}
out.push(`中心成功=${cOk} 失敗=${cFail}; 下半補救成功=${lOk} 仍失敗=${lFailAfterCenterFail}`);
out.push(details.join(' | '));
const wx = await c.evalJs(`GV.stats().weather`);
out.push('weather: ' + wx);
await shot('v-t554-repro.png');
console.log(out.join('\n'));
process.exit(0);
