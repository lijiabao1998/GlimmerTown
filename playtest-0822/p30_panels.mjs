// 階段30：面板巡檢——統計分頁/通知中心/科學頁
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const clipShot = async (name) => {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(S + name, Buffer.from(r.data, 'base64'));
};

// 1) 📊 統計面板
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(900);
await clipShot('p30-stats.png');
out.push('stats-tabs: ' + await c.evalJs(`(()=>{const els=[...document.querySelectorAll('button,.hbtn,[role=tab]')].filter(b=>b.offsetParent!==null);return JSON.stringify(els.map(b=>b.innerText.trim()).filter(t=>t&&t.length<10).slice(0,25));})()`));

// 2) 關閉後開 🔔 通知
await c.evalJs(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='✕');if(b)b.click();})()`);
await sleep(400);
await c.evalJs(`document.querySelector('#bBell').click()`);
await sleep(700);
await clipShot('p30-bell.png');
out.push('bell-text: ' + await c.evalJs(`(()=>{const els=[...document.querySelectorAll('div,section')].filter(e=>e.offsetParent!==null&&e.innerText.length>40&&e.innerText.length<800&&/通知|消息|log|事件/.test(e.innerText));const el=els.sort((a,b)=>a.innerText.length-b.innerText.length)[0];return el?el.innerText.replace(/\\n+/g,'|').slice(0,300):'n/a';})()`));
console.log(out.join('\n'));
process.exit(0);
