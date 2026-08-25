// 階段13：深度診斷——工具狀態／全掃 inspectAt／單格驗證／電網診斷
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

// 1) 目前選中的工具（有 sel class 的鈕）
out.push('seltool: ' + JSON.stringify(await c.evalJs(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null&&/sel/.test(b.className)).map(b=>b.innerText.replace(/\\n/g,'').trim())`)));

// 2) 全掃 inspectAt
out.push('allscan: ' + await c.evalJs(`(()=>{
  const res=[];
  for(let i=0;i<72*72;i++){
    let r='';try{r=GV.inspectAt(i)||''}catch(e){}
    if(r) res.push(i+':'+String(r).slice(0,40));
  }
  return JSON.stringify(res.slice(0,30))+' total='+res.length;
})()`));

// 3) 單格畫住宅＋立即對帳
const z0 = (await c.evalJs(`GV.stats().zones`));
await c.click(640, 432);
await sleep(500);
const z1 = (await c.evalJs(`GV.stats().zones`));
out.push(`zoneclick (${z0}->${z1})`);

// 4) 電網診斷
out.push('powerDiag: ' + await c.evalJs(`(()=>{try{return String(JSON.stringify(GV.powerDiag432())).slice(0,300)}catch(e){return 'ERR '+e.message}})()`));

// 5) 太陽能紅格再特寫一張
const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 560, y: 360, width: 420, height: 300, scale: 2 } });
const { writeFileSync } = await import('node:fs');
writeFileSync(S + 'p13-solar.png', Buffer.from(shot.data, 'base64'));
console.log(out.join('\n'));
process.exit(0);
