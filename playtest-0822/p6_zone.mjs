// 階段6：住宅分區＋電廠
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
const clickTxt = async (txt) => { const p = await findBtn(txt); if (!p) throw new Error('no ' + txt); await c.click(p.x, p.y); await sleep(350); return p; };

// 1) 分區類別 → 工具表
await clickTxt('分區');
out.push('zone-tools: ' + JSON.stringify(await c.evalJs(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()).filter(t=>t&&t.length<12).slice(20,45)`)));

// 2) 選住宅區、在路旁畫一塊
await clickTxt('住宅');
await c.drag(790, 500, 854, 536, 6);
await sleep(600);
await c.shot(S + 'p6-zone.png');

// 3) 大型類別 → 找電廠
await clickTxt('大型');
out.push('big-tools: ' + JSON.stringify(await c.evalJs(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()).filter(t=>t&&t.length<14).slice(20,48)`)));
console.log(out.join('\n'));
process.exit(0);
