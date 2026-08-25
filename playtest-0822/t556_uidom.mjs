// T556 純 UI/DOM 定案：零 GV 鉤子。遊戲用自己的循環跑，我們只讀 DOM。
import { connect, sleep } from './cdp.mjs';
  for (let i = 0; i < 20; i++) {
    try { await fetch('http://localhost:9333/json/version'); break; } catch (e) { await sleep(1000); }
  }
const c = await connect();
const { appendFileSync, writeFileSync } = await import('node:fs');
writeFileSync('t556-watch.log', `# start ${new Date().toISOString()}\n`);
const out = (s) => { appendFileSync('t556-watch.log', s + '\n'); console.log(s); };

const evalDom = async (expr, ms = 6000) => {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<T>>';
  if (r.exceptionDetails) return 'EXC';
  return r.result?.result?.value;
};
const clickSel = async (sel) => {
  await c.evalJs(`(()=>{const b=document.querySelector('${sel}');if(!b||b.offsetParent===null)return false;b.click();return true;})()`);
};

// 開機：先查現況，已開機就直接用；沒有才導航（等 120 秒）
let booted = false;
for (let i = 0; i < 60; i++) {
  const s = await evalDom(`typeof GV!=='undefined'&&!!document.querySelector('#bCh1')`);
  if (s === true) { booted = true; break; }
  if (i === 5) { c.send('Page.navigate', { url: 'http://localhost:8125/index.html' }).catch(() => {}); }
  await sleep(2000);
}
out('booted=' + booted);
if (!booted) process.exit(1);

// 1) 純 UI 點挑戰（DOM click 觸發原 handler）
await sleep(500);
out('ch1-click: ' + await clickSel('#bCh1'));
await sleep(1500);
out('start-toast: ' + await evalDom(`(()=>{
  const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&/挑戰/.test(e.innerText||''));
  return JSON.stringify(hits.slice(0,2).map(e=>e.innerText.trim()));
})()`));
// 2) AI 市長 + 速度 3x（真按鈕）
out('ai: ' + await clickSel('#bAI'));
for (let i = 0; i < 2; i++) { await clickSel('#bSpeed'); await sleep(400); }
out('speed: ' + await evalDom(`document.querySelector('#bSpeed')?document.querySelector('#bSpeed').innerText:'?'`));

// 3) 觀察：每 5 秒讀 👥（DOM）＋找 🏁
const readPop = `(()=>{
  const hud=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0);
  for(const e of hud){if((e.getAttribute('title')||'').includes('人口')&&/^\\d+$/.test(e.innerText.trim()))return parseInt(e.innerText.trim());}
  return -1;
})()`;
const t0 = Date.now();
let verdict = null, popMax = 0, crossedAt = null;
while (Date.now() - t0 < 540000) {
  await sleep(5000);
  const pop = await evalDom(readPop);
  if (pop > popMax) popMax = pop;
  const toast = await evalDom(`(()=>{
    const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&/挑戰完成/.test(e.innerText||''));
    return hits.length?hits[0].innerText.trim():'';
  })()`);
  if (pop >= 1000 && crossedAt === null) { crossedAt = Date.now() - t0; out('** POP CROSSED 1000 at t+' + crossedAt + 'ms, pop=' + pop); }
  if (toast) { verdict = toast; break; }
  if (pop >= 1000 && Date.now() - t0 - crossedAt > 45000) { verdict = '(45秒內無完成toast)'; break; }
}
out('popMax=' + popMax + ' verdict=' + verdict);
process.exit(0);
