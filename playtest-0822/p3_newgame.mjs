// 階段3：真實輸入開新局 → HUD 對帳 → 嘗試真拖曳鋪路
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

const clickEl = async (sel) => {
  const r = await c.evalJs(`(()=>{const b=document.querySelector('${sel}');if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (!r) throw new Error('no el ' + sel);
  await c.click(r.x, r.y);
  return r;
};

// 0) 開局前狀態
out.push('pre: ' + await c.evalJs(`JSON.stringify({day:window.day,money:window.money,pop:window.pop})`));

// 1) 點「🌱 開拓新地圖」
await clickEl('#bNewGame');
await sleep(3000);
await c.shot(S + 'p3-newgame.png');
out.push('post-new: ' + await c.evalJs(`JSON.stringify({day:window.day,money:window.money,pop:window.pop,mapN:(typeof N!=='undefined')?N:null,startHidden:getComputedStyle(document.querySelector('#start')).display})`));

// 2) 工具列狀態（目前選中工具）
out.push('tool: ' + await c.evalJs(`JSON.stringify({tool:(typeof tool!=='undefined')?tool:null,spd:(typeof spd!=='undefined')?spd:null})`));

console.log(out.join('\n'));
process.exit(0);
