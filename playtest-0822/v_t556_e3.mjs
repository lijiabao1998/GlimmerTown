// T556 動態取證 E3：強化版斷點讀取
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
const evalFull = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return 'EXC:' + (r.exceptionDetails.exception?.description || '').slice(0, 120);
  return r.result?.result?.value;
};
try {
  // 現況
  out.push('pre-day: ' + await evalFull(`GV.stats().day`));
  await send('Debugger.enable');
  await evalJs_menu();
  async function evalJs_menu() {
    await send('Runtime.evaluate', { expression: `document.querySelector('#bMenu').click()` });
    await sleep(700);
    try { await send('Page.handleJavaScriptDialog', { accept: true }); } catch (e) {}
    await sleep(500);
    const st = await evalFull(`(()=>{const s=document.querySelector('#start');return s&&getComputedStyle(s).display!=='none';})()`);
    out.push('menu-up: ' + st);
    await send('Runtime.evaluate', { expression: `(()=>{const b=document.querySelector('#bCh1');if(!b)throw new Error('no bCh1');b.click();})()` });
    await sleep(500);
    out.push('new-day: ' + await evalFull(`GV.stats().day`));
  }
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
    for (const expr of ['typeof challenge', 'String(challenge)', 'String(diff)', 'String(day)']) {
      const r = await send('Debugger.evaluateOnCallFrame', { callFrameId: cf.callFrameId, expression: expr });
      out.push(expr + ' => ' + (r.result?.result?.value ?? (r.exceptionDetails ? 'EXC:' + r.exceptionDetails.text : 'undef')));
    }
    await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
    await send('Debugger.resume');
  } else {
    out.push('未命中斷點');
    try { await send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId }); } catch (e) {}
    try { await send('Debugger.resume'); } catch (e2) {}
  }
} catch (e) {
  out.push('ERR ' + e.message);
  try { await send('Debugger.resume'); } catch (e2) {}
}
console.log(out.join('\n'));
process.exit(0);
