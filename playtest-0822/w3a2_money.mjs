// 波3a2：沙盒起始資金 描述 vs 實發 對帳
import { ensureChrome, enterCity } from './helpers.mjs';
import { sleep } from './cdp.mjs';
await ensureChrome();
const c = await enterCity();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(S + n, Buffer.from(r.data, 'base64')); };

// 回主選單
const menuBtn = await c.evalJs(`(()=>{const b=document.querySelector('#bMenu');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
if (!menuBtn) throw new Error('no bMenu');
await c.click(menuBtn.x, menuBtn.y);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(800);

// 選沙盒並讀描述行
await c.evalJs(`(()=>{const b=document.querySelector('#bDiff3');if(b)b.click();})()`);
await sleep(500);
out.push('caption: ' + await c.evalJs(`(()=>{
  const s=document.querySelector('#start');
  const m=s?s.innerText.match(/起始資金[^\\n]*/):null;
  return m?m[0]:'not-found';
})()`));
// 四難度的描述各讀一次（點選後）
for (const [id, name] of [['#bDiff0', '簡單'], ['#bDiff1', '標準'], ['#bDiff2', '困難'], ['#B_DIFF3X', '沙盒']]) {
  if (id === '#B_DIFF3X') continue;
  await c.evalJs(`(()=>{const b=document.querySelector('${id}');if(b)b.click();})()`);
  await sleep(350);
  out.push(`${name}: ` + await c.evalJs(`(()=>{const s=document.querySelector('#start');const m=s?s.innerText.match(/起始資金[^\\n]*/):null;return m?m[0].trim():'?';})()`));
}
// 沙盒再點回來
await c.evalJs(`(()=>{const b=document.querySelector('#bDiff3');if(b)b.click();})()`);
await sleep(400);
out.push('沙盒: ' + await c.evalJs(`(()=>{const s=document.querySelector('#start');const m=s?s.innerText.match(/起始資金[^\\n]*/):null;return m?m[0].trim():'?';})()`));
// 開新地圖並立即讀錢
const ng = await c.evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(!b||b.offsetParent===null)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
await c.click(ng.x, ng.y);
await sleep(1200);
out.push('實發: ' + await c.evalJs(`JSON.stringify({money:GV.stats().money,day:GV.stats().day})`));
console.log(out.join('\n'));
process.exit(0);
