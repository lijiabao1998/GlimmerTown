// 階段20：關指南→點電廠真數據表→世界像素參數重試診斷
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');

// 0) 關指南（再按一次 ❓ 或找 ✕）
const closed = await c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
  const x=els.find(b=>b.innerText.trim()==='✕');
  const h=els.find(b=>b.id==='bHelp');
  (x||h)?.click(); return !!x||!!h;})()`);
out.push('guide-closed: ' + closed);
await sleep(600);

// 1) 點電廠中心（世界像素 832,496）
await c.click(832, 496);
await sleep(700);
const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 400, y: 60, width: 700, height: 420, scale: 2 } });
writeFileSync(S + 'p20-panel.png', Buffer.from(shot.data, 'base64'));
out.push('panel: ' + await c.evalJs(`(()=>{
  const els=[...document.querySelectorAll('div,section')].filter(e=>e.offsetParent!==null&&/(發電|電廠|功率|狀態|運轉)/.test(e.innerText)&&e.innerText.length<300);
  const el=els.sort((a,b)=>a.innerText.length-b.innerText.length)[0];
  return el?('['+el.id+'|'+el.className+'] '+el.innerText.replace(/\\n+/g,'|')):'no panel';
})()`));

// 2) powerDiag 世界像素參數
out.push('diagWpx: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.powerDiag432((28-2)*32,(28+2)*16+16)).slice(0,240)}catch(e){return 'ERR '+e.message}})()`));
console.log(out.join('\n'));
process.exit(0);
