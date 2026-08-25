// T554 取證：插樁後重現，收集 console
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
// 重載頁面套用插樁
send('Runtime.evaluate', { expression: 'location.reload()' }).catch(() => {});
await sleep(4500);
await send('Runtime.enable');
// 開新局＋鋪路
await evalJs(`(()=>{localStorage.setItem('glimmerville.v1.slot','3');})()`);
await evalJs(`(()=>{const b=document.querySelector('#bNewGame');if(b)b.click();})()`);
await sleep(2200);
await evalJs(`GV.newWorldSeeded(101); GV.setDiff(1);`);
const plan = await evalJs(`(()=>{
  const okList=[];
  for(let x=2;x<70;x++){if(GV.place('road',x,6))okList.push(x);}
  return JSON.stringify({n:okList.length,cands:okList.slice(0,10).map(x=>[x,7])});
})()`);
out.push('plan: ' + plan);
const p0 = JSON.parse(plan);
// 開錄
await evalJs(`window.__dbg554={on:true};window.__log=[];`);
// 選工具
const findBtn = async (txt) => {
  const r = await evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`);
  if (r) await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }),
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await sleep(300);
};
await findBtn('分區');
await findBtn('住宅區');
// 逐候選：中心與下半都點，記錄前後 zones 與 log 增量
for (const [gx, gy] of p0.cands.slice(0, 6)) {
  const ctr = JSON.parse(await evalJs(`JSON.stringify(GV.w2v((${gx}-${gy})*32,(${gx}+${gy})*16+16))`));
  const mark = events.length;
  const z0 = await evalJs(`GV.stats().zones`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ctr[0], y: ctr[1], button: 'left', clickCount: 1 });
  await sleep(60);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ctr[0], y: ctr[1], button: 'left', clickCount: 1 });
  await sleep(350);
  const z1 = await evalJs(`GV.stats().zones`);
  // 收 console（自 mark 起）
  const logs = [];
  for (let j = mark; j < events.length; j++) {
    const e = events[j];
    if (e.method === 'Runtime.consoleAPICalled') {
      const txts = (e.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
      if (txts.includes('[554]')) logs.push(txts);
    }
  }
  out.push(`${gx},${gy}: z ${z0}->${z1} | ` + logs.join(' § '));
}
console.log(out.join('\n'));
process.exit(0);
