// T556 終極定案：監視式重跑，每段即時掃完成 toast
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
const scanToast = () => c.evalJs(`(()=>{
  const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&/挑戰/.test(e.innerText)&&e.innerText.length<60);
  return JSON.stringify([...new Set(hits.map(e=>e.innerText.trim()))]);
})()`);

await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(600);
await c.evalJs(`(()=>{const b=document.querySelector('#bCh1');if(b)b.click();})()`);
await sleep(1200);
out.push('start-toast: ' + await scanToast());
await c.evalJs(`GV.ai(true)`);
let caught = null;
for (let seg = 0; seg < 24 && !caught; seg++) {
  await c.evalJs(`(()=>{for(let i=0;i<25;i++)GV.step(1)})()`);
  const t = await scanToast();
  const s = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
  out.push(`seg${seg}: day=${s.day} pop=${s.pop} toast=${t}`);
  if (t !== '[]' && t.includes('挑戰完成')) { caught = t; await shot('v-t556-caught.png'); }
}
out.push('CAUGHT: ' + caught);
console.log(out.join('\n'));
process.exit(0);
