// 波5b：工業城（place 正確簽名 t,x,y）
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
    for(let x=30;x<=42;x++) GV.place(0,x,36);
    for(let y=30;y<=42;y++) GV.place(0,36,y);
    for(let x=31;x<=35;x++)for(let y=32;y<=35;y++) GV.place(3,x,y);
    for(let x=37;x<=41;x++)for(let y=37;y<=40;y++) GV.place(3,x,y);
    return 'ok';
  }catch(e){return 'ERR '+e.message}
})()`);
out.push('setup: ' + setup);
out.push('after-place: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({roads:s.roads,zones:s.zones,money:Math.round(s.money)})})()`));

// 電廠走真 UI（太陽能 $450，放路端點 (42,36) 旁）
const findBtn = async (txt) => c.evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
let p = await findBtn('大型'); if (p) { await c.click(p.x, p.y); await sleep(350); }
p = await findBtn('太陽能'); if (p) { await c.click(p.x, p.y); await sleep(300); }
// 世界→螢幕：(42,36) 鄰格 (43,36) 中心 = ((43-36)*32,(43+36)*16+16) = (224,1280)?? 超出畫面——需先置中
await c.evalJs(`(()=>{try{GV.lookAt&&GV.lookAt(36,36)}catch(e){}})()`);
await sleep(500);
// 置中後中心即 (36,36)；太陽能放 (37,36) 鄰格：螢幕偏移 +32,+16
const s0 = await c.evalJs(`JSON.stringify(GV.stats())`);
await c.click(720 + 32, 430 + 16);
await sleep(600);
out.push('after-plant: ' + await c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({bld:s.buildings,money:Math.round(s.money)})})()`));

out.push('t0: ' + s0);
await c.evalJs(`(()=>{for(let i=0;i<300;i++)GV.step(1)})()`);
const s = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
out.push('t300: ' + s);
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
const info = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText:'none';})()`);
const lines = String(info).split('\n');
const idx = lines.findIndex(l => l.includes('工業稅'));
out.push('tax-lines: ' + JSON.stringify(lines.slice(Math.max(0, idx - 4), idx + 2)));
await shot('w5b-industrial.png');
console.log(out.join('\n'));
process.exit(0);
