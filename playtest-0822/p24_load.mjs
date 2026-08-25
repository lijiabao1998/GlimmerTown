// 階段24：load 回手動城＋小地圖圖層巡檢
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

out.push('load(): ' + await c.evalJs(`(()=>{try{GV.load();return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(1500);
const s0 = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('after-load: ' + s0);
await c.shot(S + 'p24-loaded.png');

// 小地圖 🏭 圖層循環三次各截一張
for (let i = 0; i < 3; i++) {
  const r = await c.evalJs(`(()=>{
    const els=[...document.querySelectorAll('button,[role=button],.mmbtn,[id*=mm],[id*=map] button')].filter(b=>b.offsetParent!==null);
    const b=els.find(e=>(e.innerText||'').includes('🏭')||(e.title||'').includes('圖層'));
    if(!b) return null;
    const q=b.getBoundingClientRect();
    return {x:q.x+q.width/2,y:q.y+q.height/2};
  })()`);
  if (!r) { out.push('no mm btn round ' + i); break; }
  await c.click(r.x, r.y);
  await sleep(500);
  await c.shot(S + `p24-layer-${i}.png`);
}
console.log(out.join('\n'));
process.exit(0);
