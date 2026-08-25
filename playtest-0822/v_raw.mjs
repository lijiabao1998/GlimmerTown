const PORT = 9333;
async function json(path) { const r = await fetch('http://localhost:' + PORT + path); return r.json(); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tabs = await json('/json/list');
console.log('targets:', tabs.filter(x => x.type === 'page').map(x => x.url));
const t = tabs.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let mid = 0;
const pend = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
const sendRaw = (method, params = {}) => new Promise((res, rej) => {
  const id = ++mid;
  pend.set(id, (m) => m.error ? res({ ERROR: m.error }) : res(m));
  ws.send(JSON.stringify({ id, method, params }));
});
await sleep(500);
const r = await sendRaw('Runtime.evaluate', { expression: '1+1', returnByValue: true });
console.log('RAW 1+1:', JSON.stringify(r).slice(0, 400));
const v = await sendRaw('Runtime.evaluate', { expression: 'location.href' });
console.log('RAW href:', JSON.stringify(v).slice(0, 300));
process.exit(0);
