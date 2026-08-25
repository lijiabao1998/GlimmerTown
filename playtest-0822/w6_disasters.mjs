// 波6：災害壓力全套
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
const snap = () => c.evalJs(`JSON.stringify({pop:GV.stats().pop,bld:GV.stats().buildings,ruins:GV.stats().ruins,fires:GV.stats().fires,happy:Math.round(GV.stats().happy*100),money:Math.round(GV.stats().money)})`);

out.push('base: ' + await snap());
const disasters = [
  ['drought', `GV.drought()`],
  ['blizzard', `GV.blizzard()`],
  ['plague', `GV.plague()`],
  ['riot', `GV.riot()`],
  ['leak', `GV.leak()`],
  ['flood', `GV.flood()`],
];
for (const [name, call] of disasters) {
  const r = await c.evalJs(`(()=>{try{${call};return 'ok'}catch(e){return 'ERR '+e.message}})()`);
  await sleep(400);
  await c.evalJs(`(()=>{for(let i=0;i<10;i++)GV.step(1)})()`);
  out.push(`${name}: ${r} -> ` + await snap());
}
await shot('w6-disasters.png');
console.log(out.join('\n'));
process.exit(0);
