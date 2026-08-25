// 除錯2：掛錯誤捕捉器後真點 bContinue
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];

await c.evalJs(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));window.__clicks=0;const b=document.querySelector('#bContinue');b.addEventListener('click',()=>{window.__clicks++;});})()`);
await c.click(707, 302);
await sleep(1200);
out.push('clicks: ' + await c.evalJs(`window.__clicks`));
out.push('errs: ' + JSON.stringify(await c.evalJs(`window.__errs`)));
out.push('startDisp: ' + await c.evalJs(`getComputedStyle(document.querySelector('#start')).display`));
out.push('hasWorld: ' + await c.evalJs(`(()=>{try{return JSON.stringify({day:GV.stats().day,pop:GV.stats().pop,bld:GV.stats().buildings}).slice(0,150)}catch(e){return 'ERR '+e.message}})()`));
console.log(out.join('\n'));
process.exit(0);
