// 階段10：紅格特寫＋教學提示狀態＋等待成長
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) 太陽能紅格特寫
const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 640, y: 380, width: 340, height: 260, scale: 3 } });
const { writeFileSync } = await import('node:fs');
writeFileSync(S + 'p10-solar-zoom.png', Buffer.from(shot.data, 'base64'));

// 2) 提示系統內部狀態
out.push('hints: ' + JSON.stringify(await c.evalJs(`(()=>{try{return JSON.stringify(GV.hints525()).slice(0,400)}catch(e){return 'ERR '+e.message}})()`)));

// 3) 等成長（3x 下 20 秒 ≈ 60 天）
await sleep(20000);
out.push('stats+60d: ' + JSON.stringify(await c.evalJs(`GV.stats()`)));
await c.shot(S + 'p10-after.png');
console.log(out.join('\n'));
process.exit(0);
