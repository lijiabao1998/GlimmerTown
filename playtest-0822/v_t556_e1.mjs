// T556 終審 E1：MutationObserver 全程監聽
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');

// 裝觀察器（挑戰開局前）
await c.evalJs(`(()=>{
  window.__seen=[];
  const scan=()=>{
    try{
      const hits=[...document.querySelectorAll('div,span')].filter(e=>e.innerText&&/挑戰完成/.test(e.innerText));
      for(const h of hits){const t=h.innerText.trim();if(!window.__seen.includes(t))window.__seen.push(t);}
    }catch(e){}
  };
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,characterData:true});
  setInterval(scan,200);
  return 'observer-on';
})()`);

await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send("Page.handleJavaScriptDialog", { accept: true }); } catch (e) {}
await sleep(600);
await c.evalJs(`(()=>{const b=document.querySelector('#bCh1');if(b)b.click();})()`);
await sleep(1200);
await c.evalJs(`GV.ai(true)`);
for (let seg = 0; seg < 24; seg++) {
  await c.evalJs(`(()=>{for(let i=0;i<25;i++)GV.step(1)})()`);
  const s = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
  out.push(`seg${seg}: pop=${s.pop} money=${Math.round(s.money)}`);
  if (s.pop >= 1200) break;
}
out.push('seen: ' + JSON.stringify(await c.evalJs(`window.__seen`)));
console.log(out.join('\n'));
process.exit(0);
