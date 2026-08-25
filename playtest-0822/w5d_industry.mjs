// 波5d：工業城完整版——plant+zr+zc+zi
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

const setup = await c.evalJs(`(()=>{
  try{
    GV.newWorldSeeded(7777); GV.setDiff(1);
    let roads=0,zis=0,zrs=0,zcs=0,plant=null;
    for(let x=28;x<=46;x++){ if(GV.place('road',x,36))roads++; }
    for(let y=30;y<=42;y++){ if(GV.place('road',36,y))roads++; }
    for(let x=30;x<=34;x++)for(let y=32;y<=35;y++){ if(GV.place('zi',x,y))zis++; }
    for(let x=38;x<=42;x++)for(let y=37;y<=40;y++){ if(GV.place('zi',x,y))zis++; }
    for(let x=29;x<=33;x++)for(let y=38;y<=40;y++){ if(GV.place('zr',x,y))zrs++; }
    for(let x=39;x<=43;x++)for(let y=32;y<=34;y++){ if(GV.place('zc',x,y))zcs++; }
    for(let x=37;x<=44;x++){ if(GV.place('plant',x,35)){plant='plant@'+x; break;} }
    if(!plant){ for(let x=26;x<=30;x++){ if(GV.place('solar',x,36)){plant='solar@'+x; break;} } }
    return JSON.stringify({roads,zis,zrs,zcs,plant});
  }catch(e){return 'ERR '+e.message}
})()`);
out.push('setup: ' + setup);
out.push('after: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({roads:s.roads,zones:s.zones,bld:s.buildings,money:Math.round(s.money)})})()`));
await c.evalJs(`GV.ai(true)`);
await c.evalJs(`(()=>{for(let i=0;i<400;i++)GV.step(1)})()`);
await c.evalJs(`GV.ai(false)`);
out.push('t400: ' + await c.evalJs(`JSON.stringify(GV.stats())`));
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
const info = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText:'none';})()`);
const lines = String(info).split('\n');
const idx = lines.findIndex(l => l.includes('工業稅'));
out.push('tax-lines: ' + JSON.stringify(lines.slice(Math.max(0, idx - 4), idx + 2)));
await shot('w5d-industrial.png');
console.log(out.join('\n'));
process.exit(0);
