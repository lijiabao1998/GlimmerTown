// 波1：tornado 參數驗證＋政策矩陣＋infoBody 面板文本
import { ensureChrome, enterCity } from './helpers.mjs';
import { sleep } from './cdp.mjs';
await ensureChrome();
const c = await enterCity();
const S = 'shots/';
const out = [];
const { writeFileSync, appendFileSync } = await import('node:fs');

const snap = () => c.evalJs(`(()=>{const s=GV.stats();return JSON.stringify({pop:s.pop,bld:s.buildings,ruins:s.ruins,fires:s.fires,money:Math.round(s.money),happy:Math.round(s.happy*100)})})()`);

// 1) tornado 帶座標參數
out.push('t0: ' + await snap());
for (const args of ['60,60', '36,36', '10,10']) {
  const r = await c.evalJs(`(()=>{try{GV.tornado(${args});return 'ok'}catch(e){return 'ERR '+e.message}})()`);
  await sleep(500);
  await c.evalJs(`(()=>{for(let i=0;i<6;i++)GV.step(1)})()`);
  out.push(`tornado(${args}): ${r} -> ` + await snap());
}
await c.shot(S + 'w1-tornado.png');

// 2) 政策矩陣現況
out.push('pol: ' + await c.evalJs(`(()=>{try{return JSON.stringify(GV.pol()).slice(0,600)}catch(e){return 'ERR '+e.message}})()`));

// 3) infoBody 三面板文本（📊 已知可用；✕ 用 Escape）
const grabInfo = async () => c.evalJs(`(()=>{const el=document.querySelector('#infoBody');return el?el.innerText.replace(/\\n+/g,'|').slice(0,700):'no #infoBody';})()`);
await c.evalJs(`document.querySelector('#bStats').click()`);
await sleep(800);
out.push('STATS: ' + await grabInfo());
writeFileSync(S + 'w1-stats.png', Buffer.from(await (await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(400);

// 4) 🔔 通知中心全文
await c.evalJs(`document.querySelector('#bBell').click()`);
await sleep(700);
out.push('BELL: ' + await grabInfo());
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });

console.log(out.join('\n'));
process.exit(0);
