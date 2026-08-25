// 階段8：太陽能＋提速＋成長觀察
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const findBtn = async (txt) => c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
  const b=els.find(e=>e.innerText.replace(/\\s/g,'').includes('${txt}'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);
const clickTxt = async (txt) => { const p = await findBtn(txt); if (!p) throw new Error('no ' + txt); await c.click(p.x, p.y); await sleep(350); };

// 1) 通知紀錄
out.push('log: ' + JSON.stringify(await c.evalJs(`(GV.log?GV.log():[]).slice?GV.log().slice(-6):(GV.log&&GV.log())||'n/a'`)).slice(0, 600));

// 2) 放太陽能（路尾旁）
await clickTxt('大型');
await clickTxt('太陽能');
await c.click(830, 512);
await sleep(900);
await c.shot(S + 'p8-solar.png');
out.push('after-solar: ' + JSON.stringify(await c.evalJs(`GV.stats()`)));

// 3) 提速到 4x（點兩下 bSpeed）並等待成長
await c.evalJs(`(()=>{const b=document.querySelector('#bSpeed');const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
const sp = await findBtn('▶');
for (let i = 0; i < 2 && sp; i++) { await c.click(sp.x, sp.y); await sleep(200); }
out.push('speed-label: ' + await c.evalJs(`(document.querySelector('#bSpeed')||{}).innerText||'n/a'`));
await sleep(25000);
await c.shot(S + 'p8-growth.png');
out.push('after-grow: ' + JSON.stringify(await c.evalJs(`GV.stats()`)));
console.log(out.join('\n'));
process.exit(0);
