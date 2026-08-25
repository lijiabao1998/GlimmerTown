const PORT = 9333;
async function json(path) { const r = await fetch('http://localhost:' + PORT + path); return r.json(); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tabs = await json('/json/list');
const t = tabs.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let mid = 0;
const pend = new Map();
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  else if (m.method) events.push(m);
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++mid;
  pend.set(id, (m) => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result));
  ws.send(JSON.stringify({ id, method, params }));
});
const out = [];
await send('Runtime.enable');
await send('Page.enable');
send('Page.navigate', { url: 'http://localhost:8141/index.html' }).catch(() => {});
let ready = false;
for (let i = 0; i < 45; i++) {
  await sleep(2000);
  let st;
  try { st = await send('Runtime.evaluate', { expression: `typeof GV!=='undefined'&&!!document.querySelector('#bNewGame')`, returnByValue: true }); } catch (e) { continue; }
  if (st.result?.result?.value === true) { ready = true; break; }
}
out.push('ready=' + ready);
if (!ready) { console.log(out.join('\n')); process.exit(1); }
const evalJs = async (expr, ms = 8000) => {
  const r = await Promise.race([
    send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<TIMEOUT>>';
  if (r.exceptionDetails) return 'EXC:' + String(r.exceptionDetails.exception?.description || '').slice(0, 150);
  return r.result?.result?.value;
};
console.log(await evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();return 'clicked';})()`));
await sleep(2000);
console.log('boot:', await evalJs(`(()=>{GV.newWorldSeeded(101);GV.setDiff(1);const n=[];for(let x=6;x<12;x++){if(GV.place('road',x,6))n.push(x);}return JSON.stringify({roads:n});})()`));
await evalJs(`window.__dbg554={on:true};`);
for (const txt of ['分區', '住宅區']) {
  const r = await evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (r && r.x !== undefined) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await sleep(60);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  }
  await sleep(300);
}
for (const [gx, gy] of [[8, 7], [9, 7], [10, 7], [11, 7]]) {
  const ctr = await evalJs(`JSON.stringify((()=>{const v=GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16);return {x:v[0],y:v[1]};})())`);
  const mark = events.length;
  const z0 = await evalJs(`GV.stats().zones`);
  const cc = JSON.parse(ctr);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
  await sleep(80);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
  await sleep(500);
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
