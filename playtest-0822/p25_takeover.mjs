// 階段25：接管大城（關AI/降速）＋性能實測＋存讀往返
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) 關 AI、降速
out.push('ai-off: ' + await c.evalJs(`GV.ai(false)`));
out.push('setSpeed: ' + await c.evalJs(`(()=>{try{GV.setSpeed(1);return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(300);
out.push('speed-label: ' + await c.evalJs(`(document.querySelector('#bSpeed')||{innerText:'?'}).innerText`));

// 2) 性能：大城 step(1) ×100 計時
const perf = await c.evalJs(`(()=>{const t0=performance.now();for(let i=0;i<100;i++)GV.step(1);return Math.round((performance.now()-t0)*10)/10;})()`);
out.push('step×100ms: ' + perf + ' (平均 ' + Math.round(perf) / 10 + 'ms/tick)');

// 3) 存讀往返：存→記 stats→重載頁→load→比對
out.push('save: ' + await c.evalJs(`(()=>{GV.save();return 'ok'})()`));
const before = await c.evalJs(`JSON.stringify(GV.stats())`);
console.log(out.join('\n'));
process.exit(0);
