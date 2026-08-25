// 階段28b：四層視覺巡檢（已在城中）
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];
const { writeFileSync } = await import('node:fs');
const clipShot = async (name) => {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(S + name, Buffer.from(r.data, 'base64'));
};

// 1) 夜城
await c.evalJs(`GV.daylightDbg(0.15)`);
await sleep(800);
await clipShot('p28b-night.png');
// 2) 夜城＋地鐵層
await c.evalJs(`GV.setMetroShow(true)`);
await sleep(700);
await clipShot('p28b-night-metro.png');
// 3) 白天＋流向層
await c.evalJs(`GV.daylightDbg(null); GV.setMetroShow(false); GV.setFlowShow384(true)`);
await sleep(800);
await clipShot('p28b-flow.png');
// 4) T455 機會指數層
const meta = await c.evalJs(`(()=>{try{GV.setFlowShow384(false);GV.setOppShow455(true);return JSON.stringify(GV.drawOppOverlay455())}catch(e){return 'ERR '+e.message}})()`);
await sleep(700);
await clipShot('p28b-opp.png');
out.push('opp-meta: ' + meta);
// 收尾復原
await c.evalJs(`GV.setOppShow455(false)`);
console.log(out.join('\n'));
process.exit(0);
