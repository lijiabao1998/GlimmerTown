import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
// 全頁可見文本中找挑戰/目標/進度相關短句
out.push('goal-texts: ' + await c.evalJs(`(()=>{
  const hits=[...document.querySelectorAll('div,span,p,b')].filter(e=>e.offsetParent!==null&&e.children.length===0&&e.innerText&&e.innerText.trim().length>0&&e.innerText.trim().length<50&&/挑戰|目標|進度|人口.{0,6}1000/.test(e.innerText));
  return JSON.stringify([...new Set(hits.map(e=>e.innerText.trim()))].slice(0,10));
})()`));
const r = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('shots/w4d-banner.png', Buffer.from(r.data, 'base64'));
console.log(out.join('\n'));
process.exit(0);
