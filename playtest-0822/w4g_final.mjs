// 波4g：挑戰狀態終審
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
for (const a of ['0', '1', '2', "'ch1'"]) {
  out.push(`challenge541(${a}): ` + await c.evalJs(`(()=>{try{return JSON.stringify(GV.challenge541&&GV.challenge541(${a}))}catch(e){return 'ERR'}})()`));
}
out.push('diff: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.diff())}catch(e){return 'ERR'}})()`));
out.push('texts: ' + await c.evalJs(`(()=>{
  const hits=[...document.querySelectorAll('div,span,p,b')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&e.innerText.trim().length>0&&e.innerText.trim().length<60&&(e.innerText.includes('1000')||e.innerText.includes('挑戰')||e.innerText.includes('期限')));
  return JSON.stringify([...new Set(hits.map(e=>e.innerText.trim()))].slice(0,8));
})()`));
console.log(out.join('\n'));
process.exit(0);
