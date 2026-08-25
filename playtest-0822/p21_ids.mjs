// 階段21：Esc 清面板＋powerDiag 建築編號假說＋inspectAt 變體
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];

// 1) Escape 三連＋DOM 驗證指南是否關閉
for (let i = 0; i < 3; i++) {
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(250);
}
out.push('guide-open? ' + await c.evalJs(`[...document.querySelectorAll('div')].some(e=>e.offsetParent!==null&&e.innerText.includes('玩法指南'))`));

// 2) powerDiag 建築編號假說
for (const i of [0, 1, 2, 3]) {
  out.push(`diag(${i}): ` + await c.evalJs(`(()=>{try{return JSON.stringify(GV.powerDiag432(${i})).slice(0,200)}catch(e){return 'ERR'}})()`));
}
// 3) inspectAt 兩參數變體
out.push('inspectXY: ' + await c.evalJs(`(()=>{try{return JSON.stringify([GV.inspectAt(24,3),GV.inspectAt(28,2)]).slice(0,200)}catch(e){return 'ERR '+e.message}})()`));
// 4) 目前 stats
out.push('stats: ' + await c.evalJs(`JSON.stringify(GV.stats())`));
console.log(out.join('\n'));
process.exit(0);
