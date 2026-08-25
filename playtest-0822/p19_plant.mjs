// 階段19：powerDiag(x,y) 重驗＋點擊電廠開數據表
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

for (const [tag, x, y] of [['road(24,2)', 24, 2], ['zone(24,3)', 24, 3], ['plant(28,2)', 28, 2], ['plant(29,1)', 29, 1]]) {
  out.push(`diag(${tag}): ` + await c.evalJs(`(()=>{try{return JSON.stringify(GV.powerDiag432(${x},${y})).slice(0,240)}catch(e){return 'ERR '+e.message}})()`));
}

// 點電廠本體開數據表
await c.click(830, 512);
await sleep(700);
await c.shot(S + 'p19-plant-panel.png');
out.push('panel: ' + await c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('div,section')].filter(e=>e.offsetParent!==null&&/太陽能|發電|電力|功率/.test(e.innerText));
  const el=els.sort((a,b)=>a.innerText.length-b.innerText.length)[0];
  return el?el.innerText.replace(/\\n+/g,'|').slice(0,500):'no panel';
})()`));
console.log(out.join('\n'));
process.exit(0);
