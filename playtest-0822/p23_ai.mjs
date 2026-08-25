// 階段23：四種子 AI 城長跑——成長系統行為實證
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 0) 保住手動城
out.push('save(): ' + await c.evalJs(`(()=>{try{GV.save();return 'ok'}catch(e){return 'ERR '+e.message}})()`));

for (const seed of [301, 22, 7, 4551]) {
  await c.evalJs(`GV.newWorldSeeded(${seed}); GV.setDiff(1); GV.ai(true);`);
  // 分段推進，取成長曲線
  const curve = [];
  for (const seg of [100, 100, 100, 100]) {
    await c.evalJs(`(()=>{for(let i=0;i<${seg};i++)GV.step(1)})()`);
    curve.push(await c.evalJs(`(()=>{const s=GV.stats();return [s.day,s.pop,s.buildings,s.zones,s.roads,s.jobs,s.money!==undefined?Math.round(s.money):'nan',Math.round(s.happy*100)].join('/')})()`));
  }
  out.push(`seed${seed}: ` + JSON.stringify(curve));
  // 異常哨兵
  out.push(`seed${seed} tail: ` + await c.evalJs(`JSON.stringify({money:GV.stats().money,happy:GV.stats().happy,fires:GV.stats().fires,ruins:GV.stats().ruins,cars:GV.stats().cars})`));
}
console.log(out.join('\n'));
process.exit(0);
