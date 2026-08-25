// T556 動態取證：Debugger 斷點直讀閉包變數 challenge
const PORT = 9333;
async function json(path, opts) { const r = await fetch('http://localhost:' + PORT + path, opts); return r.json(); }
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
try {
  await send('Runtime.enable');
  await send('Debugger.enable');
  // 先讓頁面跑一個 step 確保腳本已解析
  await send('Runtime.evaluate', { expression: 'GV.step(1)' });
  await sleep(300);
  const bp = await send('Debugger.setBreakpointByUrl', { lineNumber: 14668, columnNumber: 0, urlRegex: 'index\\.html$' });
  out.push('bp: ' + JSON.stringify(bp.locations?.map(l => l.lineNumber) || 'none') + ' id=' + (bp.breakpointId || '').slice(0, 20));
  if (bp.locations && bp.locations.length) {
    const p = events.length; // 標記事件起點
    send('Runtime.evaluate', { expression: 'GV.step(1)' }).catch(() => {});
    // 等 paused
    let pausedEv = null;
    for (let i = 0; i < 40 && !pausedEv; i++) {
      await sleep(100);
      for (let j = p; j < events.length; j++) if (events[j].method === 'Debugger.paused') pausedEv = events[j];
    }
    if (pausedEv) {
      const cf = pausedEv.params.callFrames[0];
      out.push('paused-at: ' + cf.location.lineNumber + ':' + cf.location.columnNumber);
      const r = await send('Debugger.evaluateOnCallFrame', { callFrameId: cf.callFrameId, expression: 'JSON.stringify({challenge:challenge,diff:diff,pop:pop,day:day})' });
      out.push('SCOPE: ' + (r.result?.result?.value ?? JSON.stringify(r.result)));
      await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
      await send('Debugger.resume');
    } else {
      out.push('斷點沒被命中（該行未執行！）——清掉斷點');
      await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
      try { await send('Debugger.resume'); } catch (e) {}
    }
  }
} catch (e) {
  out.push('ERR ' + e.message);
  try { await send('Debugger.resume'); } catch (e2) {}
}
console.log(out.join('\n'));
process.exit(0);
