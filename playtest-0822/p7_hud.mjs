// 階段7：HUD 文字對帳＋分區實況檢查
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];

// 1) HUD 頂欄原始文字（找日期與金錢的 DOM 節點）
out.push('hud: ' + JSON.stringify(await c.evalJs(`[...document.querySelectorAll('#hud,#topbar,#bar,[id*=hud],[class*=hud]')].map(e=>e.id+'|'+e.className+'|'+e.innerText.replace(/\\n/g,'/').slice(0,80)).slice(0,10)`)));

// 2) stats
out.push('stats: ' + JSON.stringify(await c.evalJs(`GV.stats()`)));

// 3) 檢查白色菱形位置的地塊（世界座標換算）
out.push('probe-tile: ' + await c.evalJs(`(()=>{
  // 螢幕(843,530) 反算世界格
  try { const w=(GV.v2w&&GV.v2w(843,530))||null; return JSON.stringify({v2w:w, tile:(w&&GV.tile)?GV.tile(w[0],w[1]):null}); }
  catch(e){ return 'ERR '+e.message; }
})()`));
console.log(out.join('\n'));
process.exit(0);
