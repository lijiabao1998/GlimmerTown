// 階段17：開遊戲內指南找成長條件
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

await c.evalJs(`document.querySelector('#bHelp').click()`);
await sleep(800);
await c.shot(S + 'p17-help.png');
// 指南頁籤與內容
out.push('guide-tabs: ' + JSON.stringify(await c.evalJs(`[...document.querySelectorAll('#help button,#help .hbtn,[id*=guide] button')].filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()).slice(0,30)`)));
out.push('guide-text: ' + await c.evalJs(`(()=>{const el=document.querySelector('#help');return el?el.innerText.replace(/\\n+/g,'|').slice(0,1500):'no #help';})()`));
console.log(out.join('\n'));
process.exit(0);
