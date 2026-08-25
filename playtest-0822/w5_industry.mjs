// 波5：工業城對照——P2-2 工業稅覆核
// 配方：新世界（標準）→ AI 關 → 手動鋪路+大塊工業區+電廠 → 跑 300 天 → 讀工業稅/供應鏈
import { ensureChrome } from './helpers.mjs';
import { connect, sleep } from './cdp.mjs';
await ensureChrome();
const c = await connect();
const out = [];
const { writeFileSync } = await import('node:fs');
const shot = async (n) => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync('shots/' + n, Buffer.from(r.data, 'base64')); };

// 用 GV 快速建工業城模板：路網＋工業區塊＋火電（若無火電鉤子則用 place）
const setup = await c.evalJs(`(()=>{
  try{
    GV.newWorldSeeded(7777); GV.setDiff(1);
    // 中央十字路
    for(let x=30;x<=42;x++) GV.place(x,36,0);   // k0=路?
    for(let y=30;y<=42;y++) GV.place(36,y,0);
    // 工業區塊（k3?）兩大片
    for(let x=31;x<=35;x++)for(let y=32;y<=35;y++) GV.place(x,y,3);
    for(let x=37;x<=41;x++)for(let y=37;y<=40;y++) GV.place(x,y,3);
    // 電廠：核電太大、太陽能便宜——放路邊
    GV.place(38,34,58);
    return 'ok';
  }catch(e){return 'ERR '+e.message}
})()`);
out.push('setup: ' + setup);
if (String(setup).startsWith('ERR')) {
  // place 簽名可能不同，探測
  out.push('place-probe: ' + await c.evalJs(`(()=>{try{GV.place(36,36);return 'place(x,y) ok'}catch(e){return 'place(x,y) ERR: '+e.message}})()`));
}
await sleep(400);
out.push('t0: ' + await c.evalJs(`JSON.stringify(GV.stats())`));
await c.evalJs(`(()=>{for(let i=0;i<300;i++)GV.step(1)})()`);
const s = JSON.parse(await c.evalJs(`JSON.stringify(GV.stats())`));
out.push('t300: ' + JSON.stringify(s));
// 打開統計頁讀工業稅行
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
const info = await c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText:'none';})()`);
const lines = String(info).split('\n');
const idx = lines.findIndex(l => l.includes('工業稅'));
out.push('tax-lines: ' + JSON.stringify(lines.slice(Math.max(0, idx - 4), idx + 2)));
await shot('w5-industrial.png');
console.log(out.join('\n'));
process.exit(0);
