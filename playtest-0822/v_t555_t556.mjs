// T555/T556 前提重驗（乾淨法：不碰 challenge541/setChallenge/diffDesc547 變異面）
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
const visTexts = () => c.evalJs(`(()=>{
  const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&e.innerText.trim()&&/挑戰|免費建造/.test(e.innerText)&&e.innerText.length<60);
  return JSON.stringify([...new Set(hits.map(e=>e.innerText.trim()))].slice(0,6));
})()`);

// ===== A) 沙盒驗證 =====
await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(600);
await c.evalJs(`(()=>{const b=document.querySelector('#bDiff3');if(b)b.click();})()`);
await sleep(400);
out.push('A1 沙盒說明行: ' + await c.evalJs(`(()=>{const el=document.querySelector('#diffDesc547');return el?el.textContent:'(無元素)';})()`));
// 開局
await c.evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2000);
out.push('A2 開局可見文本: ' + await visTexts());
// UI 免費建造實測：選道路→拖曳→錢不動？
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('道路'); if (p) { await c.click(p.x, p.y); await sleep(300); }
p = await findBtn('支路'); if (p) { await c.click(p.x, p.y); await sleep(300); }
const m0 = await c.evalJs(`Math.round(GV.stats().money)`);
await c.drag(650, 430, 778, 494, 8);
await sleep(500);
const m1 = await c.evalJs(`JSON.stringify({money:Math.round(GV.stats().money),roads:GV.stats().roads})`);
out.push(`A3 免費建造: 前=${m0} 後=${m1}`);
await shot('v-sandbox.png');

// ===== B) 挑戰驗證（全程不碰鉤子）=====
await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(600);
out.push('B1 點擊前文本: ' + await visTexts());
await c.evalJs(`(()=>{const b=document.querySelector('#bCh1');if(b)b.click();})()`);
await sleep(1500);
out.push('B2 點擊後文本(含toast): ' + await visTexts());
out.push('B3 world: ' + await c.evalJs(`JSON.stringify({day:GV.stats().day,money:Math.round(GV.stats().money)})`));
// AI 衝人口，全程只旁觀
await c.evalJs(`GV.ai(true); (()=>{})()`);
for (let seg = 0; seg < 12; seg++) {
  await c.evalJs(`(()=>{for(let i=0;i<50;i++)GV.step(1)})()`);
  const st = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
  if (st.pop >= 1000) { out.push(`B4 第${seg}段 pop=${st.pop} —— 觀察完成信號`); break; }
  if (seg === 11) out.push(`B4 十二段後 pop=${st.pop}（未達標）`);
}
await sleep(800);
out.push('B5 完成文本: ' + await visTexts());
await shot('v-challenge.png');
console.log(out.join('\n'));
process.exit(0);
