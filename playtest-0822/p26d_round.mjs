// 階段26d：連環清理對話框＋硬超時往返驗證
import { connect, sleep } from './cdp.mjs';
const withT = (p, ms) => Promise.race([p, sleep(ms).then(() => 'TIMEOUT')]);
const out = [];

let c = await connect();
// 1) 清掉歷史殘留對話框（可能有多個）
for (let i = 0; i < 10; i++) {
  const r = await withT(c.send('Page.handleJavaScriptDialog', { accept: true }).catch(e => 'ERR:' + e.message), 1500);
  if (r === 'TIMEOUT') { out.push('dialog-loop broke at ' + i); break; }
  await sleep(300);
}
out.push('dialogs cleaned');

// 2) reload＋持續吃對話框
await c.send('Page.enable');
c.send('Page.reload').catch(() => {});
for (let i = 0; i < 8; i++) {
  await sleep(900);
  await c.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
}
// 3) 重連驗證
c = await connect();
out.push('title: ' + await withT(c.evalJs(`document.title`), 4000));
out.push('load(): ' + await withT(c.evalJs(`(()=>{try{GV.load();return 'ok'}catch(e){return 'ERR'}})()`), 5000));
await sleep(600);
const A = await withT(c.evalJs(`JSON.stringify(GV.stats())`), 5000);
await c.evalJs(`GV.save()`);
await c.evalJs(`GV.load()`);
await sleep(500);
const B = await withT(c.evalJs(`JSON.stringify(GV.stats())`), 5000);
out.push('A==B ? ' + (A === B));
if (A !== B && A !== 'TIMEOUT' && B !== 'TIMEOUT') {
  const a = JSON.parse(A), b = JSON.parse(B);
  const d = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d[k] = [a[k], b[k]];
  out.push('diffs: ' + JSON.stringify(d).slice(0, 400));
}
console.log(out.join('\n'));
process.exit(0);
