// 波3c+波4：import 往返＋挑戰「人口1000」AI 試跑
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(S + n, Buffer.from(r.data, 'base64')); };
const esc = async () => { for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };

// 1) export → import 往返
const full = await c.evalJs(`GV.editorExportCode()`);
out.push('code-len: ' + (full ? full.length : 'null'));
const imp = await c.evalJs(`(()=>{try{GV.importCode(${JSON.stringify(full)});return 'ok'}catch(e){return 'ERR '+e.message}})()`);
await sleep(1000);
out.push('import: ' + imp);
out.push('world-after-import: ' + await c.evalJs(`(()=>{try{const s=GV.stats();return JSON.stringify({day:s.day,money:Math.round(s.money),bld:s.buildings})}catch(e){return 'ERR'}})()`));

// 2) 回選單 → 挑戰1（人口1000）
for (let i = 0; i < 2; i++) { await esc(); await sleep(300); }
const menuBtn = await c.evalJs(`(()=>{const b=document.querySelector('#bMenu');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
if (menuBtn) {
  await c.click(menuBtn.x, menuBtn.y);
  await sleep(700);
  try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
  await sleep(700);
}
const ch1 = await c.evalJs(`(()=>{const b=document.querySelector('#bCh1');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
if (!ch1) throw new Error('no bCh1');
await c.click(ch1.x, ch1.y);
await sleep(2000);
out.push('challenge-start: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.challenge541?GV.challenge541():'n/a').slice(0,250)}catch(e){return 'ERR '+e.message}})()`));

// 3) AI 跑向 1000 人口（最多 600 天）
await c.evalJs(`GV.ai(true); GV.setSpeed(3);`);
let done = false;
for (let seg = 0; seg < 12 && !done; seg++) {
  await c.evalJs(`(()=>{for(let i=0;i<50;i++)GV.step(1)})()`);
  const s = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
  const cd = await c.evalJs(`(()=>{try{return JSON.stringify(GV.scDone?GV.scDone():'n/a')}catch(e){return '?';}})()`);
  out.push(`seg${seg}: day=${s.day} pop=${s.pop} money=${Math.round(s.money)} scDone=${String(cd).slice(0,80)}`);
  if (s.pop >= 1000) done = true;
}
out.push('challenge-done? ' + done);
await shot('w4-challenge.png');
console.log(out.join('\n'));
process.exit(0);
