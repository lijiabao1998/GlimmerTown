// 波9b：UI 路徑的 undo 驗證
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
const roadsNow = () => c.evalJs(`GV.stats().roads`);
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);

const base = await roadsNow();
// 選支路工具
let p = await findBtn('道路'); if (p) { await c.click(p.x, p.y); await sleep(350); }
p = await findBtn('支路'); if (p) { await c.click(p.x, p.y); await sleep(300); }
// 在畫面中下方草地拖曳一條路（此城已開發，找相對空地：畫面中心偏下）
await c.drag(600, 600, 728, 664, 8);
await sleep(500);
const afterPlace = await roadsNow();
out.push(`UI-drag: roads ${base}->${afterPlace}`);
// 點 ↩️ 一次
const undoBtn = await findBtn('↩️');
if (!undoBtn) throw new Error('no undo btn');
await c.click(undoBtn.x, undoBtn.y);
await sleep(500);
const afterUndo = await roadsNow();
out.push(`UI-undo: roads ${afterPlace}->${afterUndo} (${afterPlace > afterUndo ? 'OK 有退' : '沒退!'})`);
await shot('w9b-undo.png');
console.log(out.join('\n'));
process.exit(0);
