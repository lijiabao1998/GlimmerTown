// 波4f：乾淨重測挑戰——先退編輯器，再 bCh1
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

// 1) 退編輯器（面板裡的 🚪 離開編輯器）
const exitBtn = await c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
  const b=els.find(e=>String(e.innerText).includes('離開編輯器'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);
out.push('exit-editor-btn: ' + JSON.stringify(!!exitBtn));
if (exitBtn) { await c.click(exitBtn.x, exitBtn.y); await sleep(1200); }
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
out.push('editorOn-after: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.editorOn?GV.editorOn():'n/a')}catch(e){return 'ERR'}})()`));

// 2) 主選單 → bCh1
await c.evalJs(`(()=>{const b=document.querySelector('#bMenu');if(b&&b.offsetParent!==null)b.click();})()`);
await sleep(800);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(500);
out.push('menu-up: ' + await c.evalJs(`(()=>{const s=document.querySelector('#start');return s&&getComputedStyle(s).display!=='none';})()`));
out.push('ch1-click: ' + await c.evalJs(`(()=>{try{const b=document.querySelector('#bCh1');if(!b)return 'no-btn';b.click();return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(2500);
out.push('world: ' + await c.evalJs(`JSON.stringify({day:GV.stats().day,money:Math.round(GV.stats().money),pop:GV.stats().pop})`));
out.push('challenge541: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.challenge541&&GV.challenge541())}catch(e){return 'ERR'}})()`));
// 目標鈕還在嗎（挑戰應有自己的目標 UI）
out.push('goal-btn-exists: ' + await c.evalJs(`[...document.querySelectorAll('button')].some(b=>b.offsetParent!==null&&String(b.innerText).includes('目標'))`));
await shot('w4f-challenge.png');
console.log(out.join('\n'));
process.exit(0);
