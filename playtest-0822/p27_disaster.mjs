// 階段27：存讀往返快驗＋災害三連實測
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 0) 開機＋載入翠嶺港
await c.goto('http://localhost:8125/index.html');
await sleep(3000);
out.push('boot-load: ' + await c.evalJs(`(()=>{try{GV.load();return 'ok'}catch(e){return 'ERR '+e.message}})()`));
await sleep(800);

// 0b) 同會話往返
await c.evalJs(`GV.save()`);
const A = await c.evalJs(`JSON.stringify(GV.stats())`);
await c.evalJs(`GV.load()`);
await sleep(400);
const B = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('roundtrip A==B ? ' + (A === B));

// 基準
out.push('base: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({pop:s.pop,bld:s.buildings,money:Math.round(s.money),happy:s.happy})})()`));

// 1) 地震
await c.evalJs(`GV.quake()`);
await sleep(600);
await c.evalJs(`(()=>{for(let i=0;i<8;i++)GV.step(1)})()`);
await c.shot(S + 'p27-quake.png');
out.push('post-quake: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({pop:s.pop,bld:s.buildings,fires:s.fires,ruins:s.ruins,money:Math.round(s.money),happy:s.happy})})()`));

// 2) 龍捲風
await c.evalJs(`GV.tornado()`);
await sleep(600);
await c.evalJs(`(()=>{for(let i=0;i<12;i++)GV.step(1)})()`);
await c.shot(S + 'p27-tornado.png');
out.push('post-tornado: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({pop:s.pop,bld:s.buildings,fires:s.fires,ruins:s.ruins,happy:s.happy})})()`));

// 3) 隕石
await c.evalJs(`GV.meteor()`);
await sleep(800);
await c.shot(S + 'p27-meteor.png');
await c.evalJs(`(()=>{for(let i=0;i<15;i++)GV.step(1)})()`);
out.push('post-meteor: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({pop:s.pop,bld:s.buildings,fires:s.fires,ruins:s.ruins,happy:s.happy})})()`));
console.log(out.join('\n'));
process.exit(0);
