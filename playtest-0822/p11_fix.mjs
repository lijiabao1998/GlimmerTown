// 階段11：貼路重畫住宅＋inspectAt 查紅格與地塊
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const findBtn = async (txt) => c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
  const b=els.find(e=>e.innerText.replace(/\\s/g,'').includes('${txt}'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);

// 1) 切分區→選住宅→貼路三格 (23,3)(24,3)(25,3)
let p = await findBtn('分區'); await c.click(p.x, p.y); await sleep(300);
p = await findBtn('住宅區'); await c.click(p.x, p.y); await sleep(250);
for (const [x, y] of [[640, 432], [672, 448], [704, 464]]) await c.click(x, y);
await sleep(400);

// 2) inspectAt：太陽能錨格(28,2)=i172、新住宅(24,3)=i180、紅格疑似(29,1)? 先看錨格
for (const i of [172, 171, 173, 180]) {
  out.push(`inspect(${i}): ` + JSON.stringify(await c.evalJs(`(()=>{try{return GV.inspectAt(${i})}catch(e){return 'ERR '+e.message}})()`))).slice?.call?.(null);
}
console.log(out.join('\n').slice(0, 2000));
process.exit(0);
