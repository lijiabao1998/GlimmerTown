// 波2：統計面板四分頁＋城市科學頁＋成就
import { ensureChrome, enterCity } from './helpers.mjs';
import { sleep } from './cdp.mjs';
await ensureChrome();
const c = await enterCity();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(S + n, Buffer.from(r.data, 'base64')); };
const esc = async () => { for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };

// 1) 統計分頁巡禮
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
for (const tab of ['科技樹', '委託', '趨勢']) {
  const ok = await c.evalJs(`(()=>{
    const btns=[...document.querySelectorAll('#infoBody button,#infoBody .hbtn,[role=tab]')].filter(b=>b.offsetParent!==null);
    const b=btns.find(e=>e.innerText.includes('${tab}'));
    if(!b) return 'no-tab';
    b.click(); return 'ok';
  })()`);
  await sleep(700);
  const txt = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText.replace(/\\n+/g,'|').slice(0,420):'none';})()`);
  out.push(`[${tab}] ${ok}: ${txt}`);
  await shot(`w2-${tab}.png`);
}

// 2) 成就
for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(400);
await c.evalJs(`document.querySelector('#bAch').click()`);
await sleep(700);
out.push('[成就] ' + await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText.replace(/\\n+/g,'|').slice(0,350):'none';})()`));
await shot('w2-ach.png');
for (const t of ['keyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type: t, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });

// 3) 指南→城市科學
await c.evalJs(`document.querySelector('#bHelp').click()`);
await sleep(700);
const sci = await c.evalJs(`(()=>{
  const btns=[...document.querySelectorAll('#infoBody button')].filter(b=>b.offsetParent!==null);
  const b=btns.find(e=>e.innerText.includes('城市科學'));
  if(!b) return 'no-sci-btn:'+btns.map(x=>x.innerText.trim()).join(',');
  b.click(); return 'ok';
})()`);
await sleep(800);
out.push('[城市科學] ' + sci);
out.push(await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText.replace(/\\n+/g,'|').slice(0,500):'none';})()`));
await shot('w2-science.png');
console.log(out.join('\n'));
process.exit(0);
