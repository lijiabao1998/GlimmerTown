// T554 視覺定案：開局→鋪路→UI 選工具→鄰格中心點擊→截圖＋DOM 對帳
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => {
  const r = await Promise.race([
    c.send('Page.captureScreenshot', { format: 'png' }),
    sleep(4000).then(() => null)
  ]);
  if (r) writeFileSync('shots/' + n, Buffer.from(r.data, 'base64'));
  else out.push('(shot timeout ' + n + ')');
};
const ev = async (expr, ms = 6000) => {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<T>>';
  if (r.exceptionDetails) return 'EXC:' + String(r.exceptionDetails.exception?.description || '').slice(0, 120);
  return r.result?.result?.value;
};
// 開機
await c.send('Page.enable');
c.send('Page.navigate', { url: 'http://localhost:8125/index.html' }).catch(() => {});
let ready = false;
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  if (await ev(`typeof GV!=='undefined'&&!!document.querySelector('#bNewGame')`) === true) { ready = true; break; }
}
out.push('ready=' + ready);
if (!ready) { console.log(out.join('\n')); process.exit(1); }
await ev(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2500);
// 鋪路：找草地——用 place 嘗試多行，取成功最多的一行
const plan = await ev(`(()=>{
  let best=null;
  for(let y=10;y<62;y++){
    const ok=[];
    for(let x=20;x<52;x++){if(GV.place('road',x,y))ok.push(x);}
    if(ok.length>=10&&(!best||ok.length>best.n))best={y,n:ok.length,xs:ok};
  }
  return best?JSON.stringify(best):'null';
})()`);
out.push('plan=' + plan);
const P = JSON.parse(plan);
// 鏡頭置中此路排中點（用 zoom 後拖曳不可行——直接讀 w2v 座標即可，相機沒動過）
await sleep(500);
// UI 選住宅區
const clickTxt = async (txt) => {
  const r = await ev(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (r && r.x !== undefined) { await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(50); await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
  await sleep(300);
  return r;
};
await clickTxt('分區');
await clickTxt('住宅區');
// 對每個南側鄰格：中心點擊 → zones 變化？失敗則記 toast 文本！
for (const gx of P.xs.slice(2, 10)) {
  const gy = P.y + 1;
  const ctr = await ev(`JSON.stringify((()=>{const v=GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16);return {x:v[0],y:v[1]};})())`);
  const cc = JSON.parse(ctr);
  const z0 = await ev(`GV.stats().zones`);
  // 點擊前清 toast 快照
  const mark = Date.now();
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
  await sleep(70);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
  await sleep(300);
  const z1 = await ev(`GV.stats().zones`);
  // 立刻抓 toast（doPlace 失敗會 toast）
  const toast = await ev(`(()=>{
    const hits=[...document.querySelectorAll('div,span')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&e.innerText.trim().length>1&&e.innerText.trim().length<30&&!/^[📊❓🏆🔔▶🤖🔄🚇↩️💾🆕🏠🔊＋－]$/.test(e.innerText.trim()));
    return JSON.stringify(hits.slice(0,3).map(e=>e.innerText.trim()));
  })()`);
  out.push(`${gx},${gy}: z ${z0}->${z1} ${z1 > z0 ? '✓放置' : '✗未放'} toast=${toast}`);
}
await shot('t554-visual.png');
console.log(out.join('\n'));
process.exit(0);
