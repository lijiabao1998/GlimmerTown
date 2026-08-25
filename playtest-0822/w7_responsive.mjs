import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };
for (const [w, h, name] of [[375, 667, 'mobile'], [768, 1024, 'tablet'], [1920, 1080, 'desktop-xl']]) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 500 });
  await sleep(1200);
  // 檢查工具列是否溢出視窗
  const chk = await c.evalJs(`(()=>{
    const tb=[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null);
    const last=tb[tb.length-1];
    const r=last?last.getBoundingClientRect():null;
    return JSON.stringify({vw:innerWidth,vh:innerHeight,lastBtnRight:r?Math.round(r.right):null,overflowX:document.documentElement.scrollWidth>innerWidth});
  })()`);
  out.push(name + ': ' + chk);
  await shot('w7-' + name + '.png');
}
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
console.log(out.join('\n'));
process.exit(0);
