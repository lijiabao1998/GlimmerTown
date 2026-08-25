// playtest-0822 CDP 驅動（零依賴，Node 24 內建 WebSocket）
// 用法：import { boot } from './cdp.mjs' → const c = await boot(); ...
const PORT = 9333;
const BASE = `http://localhost:${PORT}`;

async function json(path, opts) {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export async function connect() {
  // 找或建一個 page target
  let tabs = await json('/json/list');
  let t = tabs.find(x => x.type === 'page');
  if (!t) t = await json('/json/new?about:blank');
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
  // 自動應答 beforeunload/confirm 對話框（否則模態框堵死渲染主執行緒）
  await send('Page.enable').catch(() => {});
  ws.addEventListener('message', (ev) => {
    try {
      const m = JSON.parse(ev.data);
      if (m.method === 'Page.javascriptDialogOpening') {
        ws.send(JSON.stringify({ id: ++mid, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
      }
    } catch (e) {}
  });
  return {
    tab: t, ws,
    send,
    async evalJs(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
      return r.result?.value;
    },
    async goto(url) { await send('Page.enable'); await send('Page.navigate', { url }); await sleep(600); },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async click(x, y) {
      for (const type of ['mousePressed', 'mouseReleased'])
        await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    },
    async drag(x1, y1, x2, y2, steps = 8) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
      for (let i = 1; i <= steps; i++) {
        await send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps, button: 'left',
        });
        await sleep(30);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
    },
    async wheel(x, y, dy) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); },
    async key(text) {
      for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, text: type === 'keyDown' ? text : undefined });
    },
  };
}
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export async function boot() {
  const c = await connect();
  await sendViewport(c);
  return c;
}
async function sendViewport(c) {
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}
