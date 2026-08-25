// 階段18：逐格電網診斷＋指南經濟頁全文
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) 指南面板真身與全文
out.push('gid: ' + await c.evalJs(`(()=>{const els=[...document.querySelectorAll('div,section,aside')].filter(e=>e.offsetParent!==null&&e.innerText.includes('玩法指南'));const el=els.sort((a,b)=>a.innerText.length-b.innerText.length)[0];return el?('id='+el.id+' cls='+el.className):'notfound';})()`));
const gtxt = await c.evalJs(`(()=>{const els=[...document.querySelectorAll('div,section,aside')].filter(e=>e.offsetParent!==null&&e.innerText.includes('玩法指南'));const el=els.sort((a,b)=>a.innerText.length-b.innerText.length)[0];return el?el.innerText:'x';})()`);
out.push('guide-full: ' + JSON.stringify(gtxt).slice(0, 2200));

// 2) 逐格 powerDiag（路/區/廠）
for (const [tag, i] of [['road(24,2)', 216], ['zone(24,3)', 240], ['plant?(28,2)', 172]]) {
  out.push(`diag@${tag}: ` + await c.evalJs(`(()=>{try{return JSON.stringify(GV.powerDiag432(${i})).slice(0,220)}catch(e){return 'ERR '+e.message}})()`));
}
console.log(out.join('\n'));
process.exit(0);
