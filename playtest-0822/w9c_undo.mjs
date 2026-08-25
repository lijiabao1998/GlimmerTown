// 波9c：對準可建地帶的 UI 拖曳＋undo
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
const roadsNow = () => c.evalJs(`GV.stats().roads`);
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);

await c.evalJs(`(()=>{try{GV.center&&GV.center(57,20)}catch(e){}})()`);
await sleep(600);
let p = await findBtn('道路'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('支路'); if (p) { await c.click(p.x, p.y); await sleep(300); }
const base = await roadsNow();
// 螢幕中心=(720,450)=格(57,20)；沿 +x 方向拖兩格：(784,482)->(848,514)
await c.drag(720, 450, 848, 514, 8);
await sleep(500);
const afterPlace = await roadsNow();
out.push(`drag: ${base}->${afterPlace}`);
p = await findBtn('↩️');
if (!p) throw new Error('no undo');
await c.click(p.x, p.y);
await sleep(500);
const afterUndo = await roadsNow();
out.push(`undo: ${afterPlace}->${afterUndo} ${afterPlace > afterUndo ? 'OK' : 'NO-EFFECT'}`);
await shot('w9c.png');
console.log(out.join('\n'));
process.exit(0);
