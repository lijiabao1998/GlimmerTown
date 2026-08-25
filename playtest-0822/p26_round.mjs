// 階段26：整頁重載＋存讀往返逐位元對帳
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) 重載頁面
await c.evalJs(`location.reload()`);
await sleep(4000);
out.push('slot: ' + await c.evalJs(`localStorage.getItem('glimmerville.v1.slot')`));
out.push('load(): ' + await c.evalJs(`(()=>{try{GV.load();return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(800);
const A = await c.evalJs(`JSON.stringify(GV.stats())`);

// 2) 存→讀 往返
await c.evalJs(`GV.save()`);
await c.evalJs(`GV.load()`);
await sleep(500);
const B = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('A==B ? ' + (A === B));
if (A !== B) {
  const a = JSON.parse(A), b = JSON.parse(B);
  const diffs = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs[k] = [a[k], b[k]];
  out.push('diffs: ' + JSON.stringify(diffs).slice(0, 600));
}
await c.shot(S + 'p26-roundtrip.png');
console.log(out.join('\n'));
process.exit(0);
