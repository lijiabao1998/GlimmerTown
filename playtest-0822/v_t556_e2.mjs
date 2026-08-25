// T556 動態取證 E2：bCh1 點擊後立即斷點讀 challenge
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
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
try {
  await send('Debugger.enable');
  // 回主選單 → 點 bCh1（真 UI）
  await evalJs(`document.querySelector('#bMenu').click()`);
  await sleep(700);
  try { await send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
  await sleep(500);
  await evalJs(`(()=>{const b=document.querySelector('#bCh1');if(b)b.click();})()`);
  await sleep(400);
  // 裝斷點（腳本已解析過）
  const bp = await send('Debugger.setBreakpointByUrl', { lineNumber: 14668, columnNumber: 0, urlRegex: 'index\\.html$' });
  out.push('bp-loc: ' + JSON.stringify((bp.locations || []).map(l => l.lineNumber)));
  const p = events.length;
  send('Runtime.evaluate', { expression: 'GV.step(1)' }).catch(() => {});
  let pausedEv = null;
  for (let i = 0; i < 40 && !pausedEv; i++) {
    await sleep(100);
    for (let j = p; j < events.length; j++) if (events[j].method === 'Debugger.paused') pausedEv = events[j];
  }
  if (pausedEv) {
    const cf = pausedEv.params.callFrames[0];
    const r = await send('Debugger.evaluateOnCallFrame', { callFrameId: cf.callFrameId, expression: 'JSON.stringify({challenge:challenge,diff:diff,day:day})' });
    out.push('FIRST-TICK SCOPE: ' + (r.result?.result?.value));
    await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
    await send('Debugger.resume');
  } else {
    out.push('未命中斷點');
    await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
    try { await send('Debugger.resume'); } catch (e) {}
  }
} catch (e) {
  out.push('ERR ' + e.message);
  try { await send('Debugger.resume'); } catch (e2) {}
}
console.log(out.join('\n'));
process.exit(0);
