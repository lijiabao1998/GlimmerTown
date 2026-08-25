// 波5c：工業城（正確工具名）
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
    let roads=0, zis=0;
    for(let x=28;x<=44;x++){ if(GV.place('road',x,36))roads++; }
    for(let y=30;y<=42;y++){ if(GV.place('road',36,y))roads++; }
    for(let x=30;x<=34;x++)for(let y=32;y<=35;y++){ if(GV.place('zi',x,y))zis++; }
    for(let x=38;x<=42;x++)for(let y=37;y<=40;y++){ if(GV.place('zi',x,y))zis++; }
    let plant=null;
    for(let x=38;x<=44;x++){ if(GV.place('solar',x,35)){plant='solar@'+x+',35';break;} }
    return JSON.stringify({roads,zis,plant});
  }catch(e){return 'ERR '+e.message}
})()`);
out.push('setup: ' + setup);
out.push('after: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({roads:s.roads,zones:s.zones,bld:s.buildings,money:Math.round(s.money)})})()`));
await c.evalJs(`(()=>{for(let i=0;i<300;i++)GV.step(1)})()`);
const s = await c.evalJs(`JSON.stringify(GV.stats())`);
out.push('t300: ' + s);
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
const info = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText:'none';})()`);
const lines = String(info).split('\n');
const idx = lines.findIndex(l => l.includes('工業稅'));
out.push('tax-lines: ' + JSON.stringify(lines.slice(Math.max(0, idx - 4), idx + 2)));
await shot('w5c-industrial.png');
console.log(out.join('\n'));
process.exit(0);
