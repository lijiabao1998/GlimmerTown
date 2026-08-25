// 階段16：貼路住宅成長觀察（3x 等 30 秒 ≈ 90 天）
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const s0 = await c.evalJs(`JSON.stringify(GV.stats())`);
await sleep(30000);
const s1 = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('before: ' + s0);
out.push('after : ' + s1);
await c.shot(S + 'p16-growth.png');
console.log(out.join('\n'));
process.exit(0);
