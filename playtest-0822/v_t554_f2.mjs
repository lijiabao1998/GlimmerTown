// T554 取證 v2：全新 Chrome＋就緒等待
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
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.slice(0, 150));
  return r.result?.result?.value;
};
// 導航到遊戲
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:8125/index.html' });
// 等 GV 就緒
let ready = false;
for (let i = 0; i < 30; i++) {
  await sleep(1000);
  try {
    const st = await evalJs(`(()=>{try{return typeof GV!=='undefined'&&!!document.querySelector('#bNewGame')}catch(e){return false}})()`);
    if (st === true) { ready = true; break; }
  } catch (e) {}
}
out.push('ready=' + ready);
if (!ready) { console.log(out.join('\n')); process.exit(1); }
await send('Runtime.enable');
await evalJs(`localStorage.setItem('glimmerville.v1.slot','3');`);
await evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2000);
await evalJs(`GV.newWorldSeeded(101); GV.setDiff(1);`);
const planStr = await evalJs(`JSON.stringify((()=>{
  const okList=[];
  for(let x=2;x<70;x++){if(GV.place('road',x,6))okList.push(x);}
  return {n:okList.length,cands:okList.slice(0,6).map(x=>[x,7])};
})())`);
out.push('plan: ' + planStr);
const p0 = JSON.parse(planStr);
await evalJs(`window.__dbg554={on:true};`);
const findBtn = async (txt) => {
  const r = await evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (r) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  }
  await sleep(300);
};
await findBtn('分區');
await findBtn('住宅區');
for (const [gx, gy] of p0.cands) {
  const ctr = JSON.parse(await evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`));
  const mark = events.length;
  const z0 = await evalJs(`GV.stats().zones`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ctr[0], y: ctr[1], button: 'left', clickCount: 1 });
  await sleep(80);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ctr[0], y: ctr[1], button: 'left', clickCount: 1 });
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
  out.push(`${gx},${gy}: z ${z0}->${z1} | ` + (logs.join(' § ') || '(無log=沒進paintTo/canPlace)'));
}
console.log(out.join('\n'));
process.exit(0);
