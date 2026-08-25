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
const evalJs = async (expr, ms = 6000) => {
  const r = await Promise.race([
    send('Runtime.evaluate', { expression: expr, returnByValue: true }),
    sleep(ms).then(() => null)
  ]);
  if (!r) return '<<TIMEOUT>>';
  if (r.exceptionDetails) return 'EXC:' + String(r.exceptionDetails.exception?.description || '').slice(0, 150);
  return r.result?.result?.value;
};
// 導航
send('Page.navigate', { url: 'http://localhost:8131/index.html' }).catch(() => {});
let ready = false;
for (let i = 0; i < 45; i++) {
    if(i===20)await evalJs(`(navigator.serviceWorker.getRegistrations().then(rs=>{rs.forEach(r=>r.unregister());return rs.length})).toString()`,5000);
    if(i===21)continue;
  await sleep(1000);
  const st = await evalJs(`typeof GV!=='undefined'&&!!document.querySelector('#bNewGame')`, 2500);
  if (st === true) { ready = true; break; }
}
out.push('ready=' + ready);
if (!ready) { console.log(out.join('\n')); process.exit(1); }
// 開局＋最小鋪路（只鋪候選區）
console.log('boot:', await evalJs(`(()=>{GV.newWorldSeeded(101);GV.setDiff(1);const n=[];for(let x=6;x<12;x++){if(GV.place('road',x,6))n.push(x);}return JSON.stringify({roads:n});})()`, 8000));
await evalJs(`window.__dbg554={on:true};`);
// 選工具
for (const txt of ['分區', '住宅區']) {
  const r = await evalJs(`(()=>{const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);const b=els.find(e=>String(e.innerText).replace(/\\s/g,'').includes('${txt}'));if(!b)return null;const q=b.getBoundingClientRect();return {x:q.x+q.width/2,y:q.y+q.height/2};})()`, 5000);
  if (r && r.x !== undefined) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await sleep(50);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  }
  await sleep(250);
}
// 單擊 (8,7)
const ctr = await evalJs(`JSON.stringify((()=>{const v=GV.w2v((8-7)*32,(8+7)*16+16);return {x:v[0],y:v[1]};})())`, 5000);
out.push('ctr=' + ctr);
const mark = events.length;
const cc = JSON.parse(ctr);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
await sleep(80);
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cc.x, y: cc.y, button: 'left', clickCount: 1 });
await sleep(500);
const z = await evalJs(`GV.stats().zones`, 4000);
out.push('zones-after=' + z);
for (let j = mark; j < events.length; j++) {
  const e = events[j];
  if (e.method === 'Runtime.consoleAPICalled') {
    const txts = (e.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
    if (txts.includes('[554]')) out.push('LOG: ' + txts.replace('[554] ', ''));
  }
}
console.log(out.join('\n'));
process.exit(0);
