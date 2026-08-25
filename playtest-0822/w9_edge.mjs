// 波9：邊角案例——undo 深度/旋轉/縮放邊界/存檔體積
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

// 0) 基準
const base = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
out.push('base roads=' + base.roads);

// 1) undo 深度：鋪 20 路 → undo 25 次
const placed = await c.evalJs(`(()=>{let n=0;for(let x=50;x<70;x++){if(GV.place('road',x,20))n++;}return n;})()`);
out.push('placed=' + placed);
let undone = 0, err = null;
for (let i = 0; i < 25; i++) {
  const r = await c.evalJs(`(()=>{try{return GV.undo()?1:0}catch(e){return -1}})()`);
  if (r === -1) { err = 'undo threw at ' + i; break; }
  undone += r;
}
const afterUndo = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
out.push(`undone=${undone} err=${err} roads ${base.roads}->${afterUndo.roads} (期望回到基準)`);

// 2) 旋轉四向
for (const r of [0, 1, 2, 3]) {
  const ok = await c.evalJs(`(()=>{try{GV.setRot(${r});return 'ok'}catch(e){return 'ERR'}})()`);
  await c.evalJs(`GV.forceDraw()`);
  await sleep(250);
  out.push(`rot${r}: ${ok} sample-w2v=` + await c.evalJs(`JSON.stringify(GV.w2v?GV.w2v(100,100):null)`));
}
await c.evalJs(`GV.setRot(0)`);

// 3) 縮放邊界
for (let i = 0; i < 12; i++) await c.evalJs(`document.querySelector('#zout').click()`);
await c.evalJs(`GV.forceDraw()`); await sleep(300);
const zoomedOut = await c.evalJs(`JSON.stringify({z:typeof zoom!=='undefined'?zoom:null})`);
await shot('w9-zoomout.png');
for (let i = 0; i < 20; i++) await c.evalJs(`document.querySelector('#zin').click()`);
await c.evalJs(`GV.forceDraw()`); await sleep(300);
await shot('w9-zoomin.png');
out.push('zoomOut=' + zoomedOut);

// 4) 存檔體積
out.push('saveSize: ' + await c.evalJs(`(()=>{try{return JSON.stringify({size:GV.saveSize?GV.saveSize():'n/a'})}catch(e){return 'ERR'}})()`));
console.log(out.join('\n'));
process.exit(0);
