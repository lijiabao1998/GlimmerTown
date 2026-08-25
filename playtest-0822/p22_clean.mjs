// 階段22：乾淨狀態下 inspectAt＋點電廠讀真面板
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

out.push('insp(28,2): ' + await c.evalJs(`(()=>{try{const s=GV.inspectAt(28,2)||'';return String(s).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,260)}catch(e){return 'ERR '+e.message}})()`));
out.push('insp(24,3): ' + await c.evalJs(`(()=>{try{const s=GV.inspectAt(24,3)||'';return String(s).replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').slice(0,260)}catch(e){return 'ERR '+e.message}})()`));

// 點電廠
await c.click(832, 496);
await sleep(800);
const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 560, y: 300, width: 880, height: 600, scale: 1.6 } });
const { writeFileSync } = await import('node:fs');
writeFileSync(S + 'p22-plant.png', Buffer.from(shot.data, 'base64'));
console.log(out.join('\n'));
process.exit(0);
