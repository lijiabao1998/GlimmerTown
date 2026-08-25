// 探測 GV.place 正確簽名
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
out.push('place-src: ' + await c.evalJs(`(()=>{try{return String(GV.place).slice(0,500)}catch(e){return 'ERR'}})()`));
out.push('canPlace-src: ' + await c.evalJs(`(()=>{try{return String(GV.canPlaceTool).slice(0,300)}catch(e){return 'ERR'}})()`));
console.log(out.join('\n'));
process.exit(0);
