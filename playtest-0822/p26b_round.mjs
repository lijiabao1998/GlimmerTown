// 階段26b：存讀往返（reload 後重連版）
import { connect, sleep } from './cdp.mjs';
const c0 = await connect();
await c0.send('Page.enable');
c0.send('Page.reload').catch(() => {});
await sleep(4500);
// 重連同一分頁
const c = await connect();
const out = [];
out.push('title: ' + await c.evalJs(`document.title`));
out.push('load(): ' + await c.evalJs(`(()=>{try{GV.load();return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(800);
const A = await c.evalJs(`JSON.stringify(GV.stats())`);
await c.evalJs(`GV.save()`);
await c.evalJs(`GV.load()`);
await sleep(600);
const B = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('A==B ? ' + (A === B));
if (A !== B) {
  const a = JSON.parse(A), b = JSON.parse(B);
  const diffs = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs[k] = [a[k], b[k]];
  out.push('diffs: ' + JSON.stringify(diffs).slice(0, 500));
}
console.log(out.join('\n'));
process.exit(0);
