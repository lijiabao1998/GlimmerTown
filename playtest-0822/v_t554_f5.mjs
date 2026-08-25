import { connect, sleep } from './cdp.mjs';
const c = await connect();
const out = [];
const events = [];
c.ws.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data); if (m.method) events.push(m); } catch (e) {}
});
const evalJs = async (expr, ms = 5000) => {
  const r = await Promise.race([
    c.send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) throw new Error('timeout');
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.slice(0, 150));
  return r.result?.result?.value;
};
const day1 = await evalJs(`(()=>{GV.newWorldSeeded(101);GV.setDiff(1);return GV.stats().day;})()`);
out.push('day=' + day1);
const plan = await evalJs(`(()=>{
  const ok=[];
  for(let x=2;x<70;x++){if(GV.place('road',x,6))ok.push(x);}
  return {n:ok.length,cands:ok.slice(0,10).map(x=>[x,7])};
})()`);
out.push('n=' + plan.n + ' cands=' + JSON.stringify(plan.cands));
await evalJs(`window.__dbg554={on:true};`);
const findBtn = async (txt) => {
  const r = await evalJs(`(()=>{
    const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
    const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));
    if(!b)return null;
    const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};
  })()`);
  if (r && r.x !== undefined) {
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await sleep(60);
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  }
  await sleep(300);
};
await findBtn('分區');
await findBtn('住宅區');
for (const [gx, gy] of plan.cands) {
  const ctr = await evalJs(`(()=>{
    const v=GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16);
    return {x:v[0],y:v[1]};
  })()`);
  const mark = events.length;
  const z0 = await evalJs(`GV.stats().zones`);
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ctr.x, y: ctr.y, button: 'left', clickCount: 1 });
  await sleep(80);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ctr.x, y: ctr.y, button: 'left', clickCount: 1 });
  await sleep(400);
  const z1 = await evalJs(`GV.stats().zones`);
  const logs = [];
  for (let j = mark; j < events.length; j++) {
    const e = events[j];
    if (e.method === 'Runtime.consoleAPICalled') {
      const txts = (e.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
      if (txts.includes('[554]')) logs.push(txts.replace('[554] ', ''));
    }
  }
  out.push(`${gx},${gy}: z ${z0}->${z1} | ` + (logs.join(' § ') || '(無log)'));
}
console.log(out.join('\n'));
process.exit(0);
