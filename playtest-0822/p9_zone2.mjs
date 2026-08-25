// 階段9：季節顯示驗證＋正確位置重畫住宅＋幸福組成
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const findBtn = async (txt) => c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
  const b=els.find(e=>e.innerText.replace(/\\s/g,'').includes('${txt}'));
  if(!b) return null;
  const q=b.getBoundingClientRect(); return {x:q.x+q.width/2,y:q.y+q.height/2};
})()`);

// 1) 權威季節/天數
out.push('clock: ' + JSON.stringify(await c.evalJs(`({day:GV.stats().day, season:typeof season!=='undefined'?season:(GV.season?GV.season():'n/a'), weather:GV.stats().weather})`)));

// 2) 放大截圖頂欄日期區（clip 原生解析度）
const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 300, y: 0, width: 240, height: 40, scale: 3 } });
const { writeFileSync } = await import('node:fs');
writeFileSync(S + 'p9-date-zoom.png', Buffer.from(shot.data, 'base64'));

// 3) 幸福組成
out.push('happy: ' + JSON.stringify(await c.evalJs(`GV.happyBreakdown?GV.happyBreakdown():'n/a'`)).slice(0, 300));

// 4) 路另一側畫住宅（不壓電廠）：先切回分區類別
const catZone = await findBtn('分區');
if (!catZone) throw new Error('no cat 分區');
await c.click(catZone.x, catZone.y); await sleep(350);
const zBtn = await findBtn('住宅區');
if (!zBtn) throw new Error('no 住宅區');
await c.click(zBtn.x, zBtn.y); await sleep(300);
for (const [x, y] of [[650, 548], [714, 516], [714, 452], [650, 484]]) await c.click(x, y);
for (const [x, y] of [[650, 548], [714, 516], [714, 452], [650, 484]]) await c.click(x, y);
await sleep(500);
await c.shot(S + 'p9-zone2.png');
out.push('stats: ' + JSON.stringify(await c.evalJs(`GV.stats()`)));
console.log(out.join('\n'));
process.exit(0);
