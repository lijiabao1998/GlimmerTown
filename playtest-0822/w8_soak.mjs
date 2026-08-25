// 波8：浸泡監測——9 分鐘每 60 秒取樣
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
import { appendFileSync, writeFileSync } from 'node:fs';
await ensureChrome();
const c = await connect();
writeFileSync('soak.log', `# soak start ${new Date().toISOString()}\n`);
// 先把速度調回可控：關 AI（若開）
await c.evalJs(`try{GV.ai(false)}catch(e){}`);
for (let i = 0; i < 9; i++) {
  try {
    const s = await c.evalJs(`(()=>{const t0=performance.now();for(let k=0;k<5;k++)GV.step(1);const dt=(performance.now()-t0)/5;const st=GV.stats();return JSON.stringify({t:new Date().toISOString().slice(11,19),day:st.day,pop:st.pop,bld:st.buildings,money:Math.round(st.money),happy:Math.round(st.happy*100),ruins:st.ruins,fires:st.fires,msPerTick:Math.round(dt*100)/100});})()`);
    appendFileSync('soak.log', s + '\n');
    console.log(s);
  } catch (e) {
    appendFileSync('soak.log', 'ERR ' + e.message + '\n');
  }
  await sleep(55000);
}
console.log('soak done');
process.exit(0);
