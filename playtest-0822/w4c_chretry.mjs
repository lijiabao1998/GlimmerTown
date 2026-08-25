import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
// 回主選單
await c.evalJs(`document.querySelector('#bMenu').click()`);
await sleep(700);
try { await c.send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
await sleep(700);
out.push('menu-up: ' + await c.evalJs(`(()=>{const s=document.querySelector('#start');return s&&getComputedStyle(s).display!=='none';})()`));
// DOM 直接 .click()（排除座標命中問題）
out.push('dom-click: ' + await c.evalJs(`(()=>{try{const b=document.querySelector('#bCh1');if(!b)return 'no-btn';b.click();return 'clicked'}catch(e){return 'ERR '+e.message}})()`));
await sleep(2500);
out.push('start-after: ' + await c.evalJs(`(()=>{const s=document.querySelector('#start');return s?getComputedStyle(s).display:'gone';})()`));
out.push('challenge541: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.challenge541&&GV.challenge541())}catch(e){return 'ERR'}})()`));
out.push('stats: ' + await c.evalJs(`(()=>{try{const s=GV.stats();return JSON.stringify({day:s.day,pop:s.pop,money:Math.round(s.money)})}catch(e){return 'ERR'}})()`));
console.log(out.join('\n'));
process.exit(0);
