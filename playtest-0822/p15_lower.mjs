// 階段15：菱形下半點擊驗證＋power432 形狀
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) power432 形狀
out.push('p432keys: ' + await c.evalJs(`(()=>{const g=GV.power432();return JSON.stringify({keys:Object.keys(g).slice(0,8),sample:g[Object.keys(g)[0]]});})()`));

// 2) (24,3) 菱形下半（中心+12px y）
const zA = await c.evalJs(`GV.stats().zones`);
await c.click(672, 460);
await sleep(400);
const zB = await c.evalJs(`GV.stats().zones`);
out.push(`lower-half (24,3): ${zA}->${zB}`);

// 3) 路另一側上方 (25,1)
await c.click(768, 434);
await sleep(400);
const zC = await c.evalJs(`GV.stats().zones`);
out.push(`upper-side (25,1): ${zB}->${zC}`);

// 4) 再遠一排 (24,5)：確認 y=4/5 都能畫
await c.click(704, 492);
await sleep(400);
const zD = await c.evalJs(`GV.stats().zones`);
out.push(`row5 (24,5): ${zC}->${zD}`);
console.log(out.join('\n'));
process.exit(0);
