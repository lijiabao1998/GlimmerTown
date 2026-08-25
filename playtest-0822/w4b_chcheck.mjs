import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
out.push('challenge541: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.challenge541&&GV.challenge541())}catch(e){return 'ERR '+e.message}})()`));
out.push('scDone: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.scDone&&GV.scDone())}catch(e){return 'ERR'}})()`));
// HUD 上有無挑戰橫幅
out.push('hud-challenge-text: ' + await c.evalJs(`(()=>{
  const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&/挑戰/.test(e.innerText)&&e.innerText.length<60);
  return JSON.stringify(hits.slice(0,5).map(e=>e.innerText.trim()));
})()`));
// 回選單看挑戰按鈕周邊文本（是否本來就要求確認）
console.log(out.join('\n'));
process.exit(0);
