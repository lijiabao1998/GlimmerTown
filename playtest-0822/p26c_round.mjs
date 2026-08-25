// 階段26c：reload＋處理 beforeunload 對話框＋往返驗證
import { connect, sleep } from './cdp.mjs';
const c0 = await connect();
await c0.send('Page.enable');
c0.send('Page.reload').catch(() => {});
await sleep(1200);
// 吃掉 beforeunload/確認對話框
let dlg = 'none';
try { const r = await c0.send('Page.handleJavaScriptDialog', { accept: true }); dlg = r ? 'handled' : 'no-dialog'; }
catch (e) { dlg = 'ERR ' + e.message; }
await sleep(4000);
const c = await connect();
const out = ['dialog: ' + dlg];
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
