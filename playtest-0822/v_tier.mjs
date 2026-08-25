const PORT = 9333;
async function json(path) { const r = await fetch('http://localhost:' + PORT + path); return r.json(); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tabs = await json('/json/list');
const t = tabs.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let mid = 0;
const pend = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++mid;
  pend.set(id, (m) => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result));
  ws.send(JSON.stringify({ id, method, params }));
});
const evalT = async (expr, ms = 4000) => {
  const r = await Promise.race([send('Runtime.evaluate', { expression: expr, returnByValue: true }), sleep(ms).then(() => null)]);
  if (!r) return '<<TIMEOUT>>';
  return JSON.stringify(r.result?.result?.value);
};
// 1) about:blank
await send('Page.navigate', { url: 'about:blank' });
await sleep(1500);
console.log('blank 1+1:', await evalT('1+1'));
// 2) npu_bench（獨立小頁）
await send('Page.navigate', { url: 'http://localhost:8131/npu_bench.html' });
await sleep(3000);
console.log('bench title:', await evalT('document.title'));
// 3) 遊戲頁
await send('Page.navigate', { url: 'http://localhost:8131/index.html' });
for (let i = 0; i < 20; i++) {
  await sleep(1000);
  const st = await evalT('typeof GV');
  console.log('game GV poll', i, ':', st);
  if (st !== '"undefined"' && !st.startsWith('"<<')) { if (st !== '"undefined"') break; }
}
process.exit(0);
