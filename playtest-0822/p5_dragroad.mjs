// 階段5：支路拖曳三格 → 對帳 roads/money
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

const findBtn = (txt) => c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
  const b=els.find(e=>e.innerText.replace(/\\s/g,'').includes('${txt}'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);

// 1) 選支路
const road = await findBtn('支路$15');
if (!road) throw new Error('支路鈕沒找到');
await c.click(road.x, road.y);
await sleep(300);

const s0 = await c.evalJs(`JSON.stringify(GV.stats())`);
// 2) 在中央草地沿等軸方向拖曳（+64,+32 為一格）
await c.drag(650, 420, 778, 484, 10);
await sleep(800);
await c.shot(S + 'p5-road-drawn.png');
const s1 = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('before: ' + s0);
out.push('after : ' + s1);
console.log(out.join('\n'));
process.exit(0);
