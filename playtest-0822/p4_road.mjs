// 階段4：核心建設迴路——選道路工具→真拖曳鋪路→錢與地圖對帳
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

const clickElText = async (txt, scopeSel) => {
  // 用可見文字找按鈕（工具列按鈕多無 id）
  const r = await c.evalJs(`(()=>{
    const scope=${scopeSel ? `document.querySelector('${scopeSel}')` : 'document'};
    if(!scope) return null;
    const els=[...scope.querySelectorAll('button,.tbtn,.hbtn,[class*=btn]')];
    const b=els.find(e=>e.innerText.replace(/\\s/g,'').includes('${txt}') && e.offsetParent!==null);
    if(!b) return null;
    const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2,txt:b.innerText.trim()};
  })()`);
  if (!r) throw new Error('no btn ' + txt);
  await c.click(r.x, r.y);
  return r;
};

// 0) stats 形狀
out.push('stats0: ' + JSON.stringify(await c.evalJs(`GV.stats()`)).slice(0, 500));

// 1) 開「道路」分類
await clickElText('道路');
await sleep(400);
const tools = await c.evalJs(`JSON.stringify([...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()).filter(t=>t&&t.length<14).slice(0,60))`);
out.push('after-road-cat: ' + tools);
await c.shot(S + 'p4-road-tools.png');
console.log(out.join('\n'));
process.exit(0);
