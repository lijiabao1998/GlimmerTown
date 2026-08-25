// 階段14：決定性實驗——遠處乾燥草地畫區＋power432 網格取樣
import { connect, sleep } from './cdp.mjs';
const c = await connect();
const S = 'shots/';
const out = [];

const z0 = await c.evalJs(`GV.stats().zones`);
await c.click(1000, 300);
await sleep(300);
await c.click(1032, 316);
await sleep(500);
const z1 = await c.evalJs(`GV.stats().zones`);
out.push(`far-zone-click (${z0}->${z1})`);

// 路旁再試一次（用遊戲自己的 w2v 求精確中心）
out.push('w2v(23,3): ' + JSON.stringify(await c.evalJs(`(()=>{try{return GV.w2v((23-3)*32,(23+3)*16+16)}catch(e){return 'ERR '+e.message}})()`)));
const wv = JSON.parse(await c.evalJs(`JSON.stringify(GV.w2v((24-3)*32,(24+3)*16+16))`));
await c.click(wv[0], wv[1]);
await sleep(400);
const z2 = await c.evalJs(`GV.stats().zones`);
out.push(`roadside-via-w2v (${z1}->${z2})`);

// power432 網格取樣（太陽能周邊與路）
out.push('power432: ' + await c.evalJs(`(()=>{
  const g=GV.power432();
  if(!g) return 'null';
  const pick=(x,y)=>{const i=y*72+x; const v=g[i!==undefined?i:0]; return v;};
  return JSON.stringify({type:Array.isArray(g)?'array':typeof g,
    road:[pick(22,2),pick(24,2),pick(26,2)],
    plant:[pick(28,2),pick(28,1),pick(29,1),pick(27,3)],
    zone:[pick(24,4),pick(26,4)],far:[pick(10,10),pick(60,40)]});
})()`));

console.log(out.join('\n'));
process.exit(0);
