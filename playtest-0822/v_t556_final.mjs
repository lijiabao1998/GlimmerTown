// T556 終審：單步觸發完成判定，密集掃描
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const m0 = await c.evalJs(`Math.round(GV.stats().money)`);
const p0 = await c.evalJs(`GV.stats().pop`);
out.push(`before: money=${m0} pop=${p0}`);
await c.evalJs(`GV.step(1)`);
for (let i = 0; i < 8; i++) {
  const hits = await c.evalJs(`(()=>{
    const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&/挑戰完成/.test(e.innerText)&&e.innerText.length<60);
    return JSON.stringify([...new Set(hits.map(e=>e.innerText.trim()))]);
  })()`);
  if (hits !== '[]') { out.push(`t+${i * 400}ms toast: ${hits}`); break; }
  await sleep(400);
}
const m1 = await c.evalJs(`Math.round(GV.stats().money)`);
out.push(`after: money=${m1} (差額 ${m1 - m0}${m1 - m0 === 1500 ? ' ＝ 獎金入帳 ✓' : ''})`);
console.log(out.join('\n'));
process.exit(0);
