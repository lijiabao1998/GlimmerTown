// 波3a：沙盒難度開局
import { ensureChrome, enterCity } from './helpers.mjs';
import { sleep } from './cdp.mjs';
await ensureChrome();
const c = await enterCity();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(S + n, Buffer.from(r.data, 'base64')); };
const esc = async () => { for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };

// 0) 存檔 checkpoint
out.push('checkpoint save: ' + await c.evalJs(`(()=>{try{GV.save();return 'ok'}catch(e){return 'ERR'}})()`));

// 1) 回主選單（🏠）
for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
const menuBtn = await c.evalJs(`(()=>{const b=document.querySelector('#bMenu');if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
if (!menuBtn) throw new Error('no bMenu');
await c.click(menuBtn.x, menuBtn.y);
await sleep(800);
// 可能有確認對話框——吃掉
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(800);
const menuUp = await c.evalJs(`(()=>{const s=document.querySelector('#start');return s&&getComputedStyle(s).display!=='none';})()`);
out.push('menu-up: ' + menuUp);

// 2) 選沙盒
if (menuUp) {
  await c.evalJs(`(()=>{const b=document.querySelector('#bDiff3');if(b)b.click();})()`);
  await sleep(400);
  out.push('diff3-sel: ' + await c.evalJs(`(()=>{const b=document.querySelector('#bDiff3');return b?(b.className.includes('sel')?'selected':'not-selected'):'none';})()`) );
  // 3) 開拓新地圖
  const ng = await c.evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (!ng) throw new Error('no bNewGame');
  await c.click(ng.x, ng.y);
  await sleep(2500);
  const st = await c.evalJs(`JSON.stringify(GV.stats())`);
  out.push('sandbox-start: ' + st);
  out.push('diff-desc: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.diffDesc547?GV.diffDesc547():GV.diff())}catch(e){return JSON.stringify(GV.diff())}})()`));
  await shot('w3-sandbox.png');
}
console.log(out.join('\n'));
process.exit(0);
