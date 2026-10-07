/** Main v11.211 SW load repair, native CDP/Node 22+. No product HTML mutation.
 * node docs/tasks/sw-main603/browser-main.mjs --out=evidence/sw-main --port=8873
 * Instrumentation and delay/failure controls apply only to an in-memory SW copy.
 * This functional load gate is not an art or FPS/performance acceptance result.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const arg = (name, fallback) => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const INDEX_SHA = 'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265';
const SW_SHA = '836d1d867d10d6c63d71c722d3337e5b7119ad36006314f74872583ec029dd3b';
const CACHE = 'glimmerville-shell-v11.211';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function instrumentWorker(original) {
  assert.equal(sha(original), SW_SHA, 'instrument only exact proposed main SW');
  const start = "  if(req.mode==='navigate'){";
  const end = "\n  if(url.pathname===new URL(MANIFEST_URL).pathname){";
  let lo = original.indexOf(start), hi = original.indexOf(end, lo);
  assert.equal(original.split(start).length, 2);
  assert.equal(original.split(end).length, 2);
  let block = original.slice(lo, hi);
  const change = (before, after) => {
    assert.equal(block.split(before).length, 2, `unique instrumentation anchor ${before}`);
    block = block.replace(before, after);
  };
  change(start, start + "\n    const probe={id:++__mainNav,url:url.href};__mainLog(probe,'navigate-enter');");
  change('        const fresh=await fetch(req);', "        __mainLog(probe,'fetch-begin');const fresh=await fetch(req);__mainLog(probe,'fetch-end',{status:fresh.status});");
  change('            const copy=fresh.clone();', "            const copy=fresh.clone();__mainLog(probe,'clone-end');");
  change('              .then(cache=>cache.put(INDEX_URL,copy))', `              .then(async cache=>{
                __mainLog(probe,'cache-open-end');__mainLog(probe,'cache-put-begin');
                const mode=url.searchParams.get('__swmain');
                if(mode==='delay')await new Promise(resolve=>setTimeout(resolve,8000));
                if(mode==='fail')throw new DOMException('Controlled main cache.put rejection','QuotaExceededError');
                await cache.put(INDEX_URL,copy);__mainLog(probe,'cache-put-end');
              })`);
  change('              .catch(()=>{/* 快取額度／寫入失敗不應吞掉已成功的網路導航 */});', "              .catch(error=>{__mainLog(probe,'cache-error',{errorName:error.name});/* 快取額度／寫入失敗不應吞掉已成功的網路導航 */});");
  change('        return fresh;', "        __mainLog(probe,'reply-fresh');return fresh;");
  change('      }catch(err){', "      }catch(err){__mainLog(probe,'fetch-error',{errorName:err.name});");
  change('          const cache=await caches.open(CACHE);\n          const offline=await cache.match(INDEX_URL);\n          if(offline)return offline;', "          const cache=await caches.open(CACHE);__mainLog(probe,'offline-open-end');\n          const offline=await cache.match(INDEX_URL);__mainLog(probe,'offline-match-end',{hit:!!offline});\n          if(offline){__mainLog(probe,'reply-offline');return offline;}");
  change('    e.respondWith(response);', "    e.respondWith(response);__mainLog(probe,'respondWith-registered');");
  change('      e.waitUntil(response.then(()=>cacheWrite).catch(()=>{}));', "      e.waitUntil(response.then(()=>cacheWrite).catch(()=>{}));__mainLog(probe,'waitUntil-registered');");
  const header = `// Test-only observation: no awaited logging and no worker debugger attachment.
const __mainBoot=Date.now();let __mainSequence=0,__mainNav=0;
function __mainLog(nav,stage,detail={}){try{void fetch(new URL('/__swmain_stage',self.location.href),{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({boot:__mainBoot,sequence:++__mainSequence,navigation:nav.id,url:nav.url,time:Date.now(),stage,...detail})}).catch(()=>{});}catch(_){}}
`;
  const instrumented = header + original.slice(0, lo) + block + original.slice(hi);
  new Function(instrumented);
  return instrumented;
}

export async function run() {
  const PORT = Number(arg('port', 8873)), DEV = PORT + 1000;
  assert([PORT, DEV].every(p => Number.isInteger(p) && p >= 8129 && p <= 65535 && p !== 8199), 'isolated non-player ports required');
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'town-sw-main-results')));
  fs.mkdirSync(OUT, { recursive: true });
  const html = fs.readFileSync(path.join(ROOT, 'index.html'));
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.equal(sha(html), INDEX_SHA, 'main product bytes are immutable');
  assert.equal(sha(sw), SW_SHA, 'exact main-only lifetime repair');
  const instrumented = instrumentWorker(sw);
  fs.writeFileSync(path.join(OUT, 'sw-main-instrumented.txt'), instrumented);
  const report = {
    status: 'running', scope: 'Main v11.211 navigation load repair only; no renderer, art, fixture or acceptance threshold changes',
    base: '637c8cc6d09306c1e17535ece6119d3ad78f1382', node: process.version,
    indexSHA256: sha(html), productSwSHA256: sha(sw), instrumentedSwSHA256: sha(instrumented),
    instrumentation: 'In-memory SW copy only. Non-awaited same-origin logging; controlled delayed/rejected cache write. No physical-device FPS claim.',
    checks: [], stages: [], http: [], transport: [], cases: [], exceptions: [], consoleErrors: [], foreground: [], identityObservations: []
  };
  const persist = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2));
  const check = (value, message) => { assert(value, message); report.checks.push(message); persist(); };
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'town-sw-main-profile-'));
  let blockEntry = false, server, browser, ws, chromeLog = '', browserClosed;
  const sockets = new Set(), pending = new Map();
  const assets = new Map([
    ['/index.html', html], ['/sw.js', Buffer.from(instrumented)],
    ...['manifest.json', 'icon.svg', 'icon-v1-192.png', 'icon-v1-512.png', 'icon-v1-maskable-512.png'].map(f => ['/' + f, fs.readFileSync(path.join(ROOT, f))]),
    ['/__swmain_bootstrap.html', Buffer.from('<!doctype html><title>Isolated main SW setup</title>')]
  ]);
  try {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, ORIGIN), route = url.pathname;
      if (route === '/__swmain_stage' && req.method === 'POST') {
        let body = '';
        req.on('data', bytes => { body += bytes; if (body.length > 4096) req.destroy(); });
        req.on('end', () => {
          try {
            const row = JSON.parse(body);
            assert(Number.isInteger(row.sequence) && Number.isInteger(row.navigation) && Number.isFinite(row.time));
            assert(typeof row.url === 'string' && row.url.startsWith(ORIGIN + '/'));
            report.stages.push({ ...row, receivedAt: Date.now() }); persist(); res.writeHead(204).end();
          } catch { res.writeHead(400).end(); }
        }); return;
      }
      const entry = route === '/' || route === '/index.html';
      const row = { url: url.href, startedAt: Date.now() }; report.http.push(row);
      if (entry && blockEntry) {
        row.abortedAt = Date.now(); row.reason = 'Controlled origin entry transport cutoff before response';
        persist(); req.socket.destroy(); return;
      }
      const data = assets.get(entry ? '/index.html' : route);
      if (!data) { row.status = 404; res.writeHead(404).end(); return; }
      const marker = entry ? (url.searchParams.get('__swmain') || 'clean-online') : undefined;
      const type = route.endsWith('.js') ? 'application/javascript' : route.endsWith('.json') ? 'application/json' : route.endsWith('.svg') ? 'image/svg+xml' : route.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8';
      res.once('finish', () => { row.finishedAt = Date.now(); row.status = res.statusCode; if (marker) row.marker = marker; persist(); });
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', ...(marker ? { 'x-sw-main-probe': marker } : {}) });
      res.end(data);
    });
    server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, '127.0.0.1', resolve); });
    const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
    check(chrome, 'installed Chrome/Chromium exists'); report.chromePath = chrome;
    check(process.platform === 'darwin', 'native foreground PWA probe requires the standard macOS desktop runner');
    report.presentation = { platform: process.platform, headless: false, graphics: 'default', purpose: 'Functional rAF-driven startup only; no physical-device FPS claim or display-mode change' };
    browser = spawn(chrome, [ '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--mute-audio', '--window-size=800,600', '--disk-cache-size=1048576', `--user-data-dir=${profile}`, `--remote-debugging-port=${DEV}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    browserClosed = new Promise(resolve => browser.once('close', resolve));
    browser.stderr.on('data', bytes => { chromeLog = (chromeLog + bytes).slice(-12000); });
    browser.on('error', error => { chromeLog += String(error); });
    let debuggerURL;
    for (let i = 0; i < 120 && !debuggerURL; i++) {
      if (browser.exitCode !== null || browser.signalCode !== null) throw Error('Browser exited: ' + chromeLog);
      try { debuggerURL = (await fetch(`http://127.0.0.1:${DEV}/json/list`).then(r => r.json())).find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
      if (!debuggerURL) await sleep(250);
    }
    check(debuggerURL, 'isolated native CDP target available');
    ws = new WebSocket(debuggerURL); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextID = 0;
    ws.onmessage = event => {
      const message = JSON.parse(event.data), p = message.params || {};
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id); clearTimeout(task.timer); pending.delete(message.id);
        message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        report.exceptions.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text);
      } else if (message.method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        report.consoleErrors.push(p.args.map(a => a.value ?? a.description).join(' '));
      } else if (['Page.frameNavigated', 'Network.responseReceived', 'Network.loadingFailed'].includes(message.method)) {
        const url = p.frame?.url || p.response?.url;
        report.transport.push({ method: message.method, time: Date.now(), url, requestId: p.requestId, frameId: p.frame?.id || p.frameId, parentId: p.frame?.parentId, type: p.type, status: p.response?.status, fromServiceWorker: p.response?.fromServiceWorker, marker: p.response?.headers?.['x-sw-main-probe'], errorText: p.errorText });
        persist();
      }
    };
    const send = (method, params = {}, timeoutMs = 150000) => new Promise((resolve, reject) => {
      const id = ++nextID;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, timeoutMs);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    const ev = async (expression, timeoutMs = 150000) => {
      const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeoutMs);
      if (value.exceptionDetails) throw Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);
      return value.result.value;
    };
    const budget = (deadline, cap = 5000) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw Error('Foreground/boot observation deadline reached');
      return Math.min(cap, remaining);
    };
    const readDocument = (timeoutMs = 150000) => ev(`(()=>{const bootState=window.__boot426?.()??null;return {url:location.href,timeOrigin:performance.timeOrigin,readyState:document.readyState,complete:document.readyState==='complete',version:window.GV?.ver?.()??null,boot:bootState?.ready??false,bootState,visibility:document.visibilityState,hidden:document.hidden,focused:document.hasFocus(),viewport:{innerWidth,innerHeight,outerWidth,outerHeight,screenX,screenY,availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight,dpr:devicePixelRatio},slot:localStorage.getItem('glimmerville.v1.slot'),slotBeforeBoot:window.__swMainSlotBeforeBoot??null,otherSlots:[localStorage.getItem('glimmerville.v1.s1'),localStorage.getItem('glimmerville.v1.s2')],controller:navigator.serviceWorker.controller?.scriptURL??null,online:navigator.onLine};})()`, timeoutMs);
    const nativeForeground = deadline => {
      const front = spawnSync('/usr/bin/lsappinfo', ['front'], { encoding: 'utf8', timeout: budget(deadline) });
      const app = front.status === 0 ? spawnSync('/usr/bin/lsappinfo', ['info', '-only', 'bundleid,name', front.stdout.trim()], { encoding: 'utf8', timeout: budget(deadline) }) : { status: null, stdout: '', stderr: '' };
      return { observedAt: Date.now(), frontExit: front.status, front: (front.stdout || '').slice(0, 2048), frontError: String(front.error || front.stderr || '').slice(0, 2048), appExit: app.status, app: (app.stdout || '').slice(0, 4096), appError: String(app.error || app.stderr || '').slice(0, 2048), valid: front.status === 0 && app.status === 0 && /com\.google\.Chrome(?="|\s|$)/.test(app.stdout) };
    };
    const viewportFits = state => {
      const v = state.viewport;
      return v.innerWidth > 0 && v.innerHeight > 0 && v.outerWidth <= v.availWidth && v.outerHeight <= v.availHeight && v.screenX >= v.availLeft && v.screenY >= v.availTop && v.screenX + v.outerWidth <= v.availLeft + v.availWidth && v.screenY + v.outerHeight <= v.availTop + v.availHeight;
    };
    const qualifyForeground = async (label, deadline = Date.now() + 10000) => {
      const audit = { label, startedAt: Date.now(), deadline, observations: [], readErrors: [] };
      report.foreground.push(audit); persist();
      const opened = spawnSync('/usr/bin/open', ['-a', 'Google Chrome'], { encoding: 'utf8', timeout: budget(deadline) });
      audit.open = { exit: opened.status, error: String(opened.error || opened.stderr || '').slice(0, 2048) }; persist();
      assert.equal(opened.status, 0, 'Native Google Chrome activation must succeed');
      await send('Page.bringToFront', {}, budget(deadline));
      // Real OS activation + actual target focus only; no synthetic visibility/rAF.
      for (let i = 0; i < 20 && Date.now() < deadline; i++) {
        try {
          const state = await readDocument(budget(deadline)), native = nativeForeground(deadline);
          audit.observations.push({ observedAt: Date.now(), state, native, viewportFits: viewportFits(state) }); persist();
          if (native.valid && state.visibility === 'visible' && !state.hidden && state.focused && viewportFits(state)) {
            audit.qualifiedAt = Date.now(); persist(); return;
          }
        } catch (error) { audit.readErrors.push({ observedAt: Date.now(), error: String(error).slice(0, 4096) }); persist(); }
        await sleep(Math.max(0, Math.min(50, deadline - Date.now())));
      }
      throw Error('Native and page foreground/viewport qualification failed: ' + label);
    };
    await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
    report.browserVersion = await send('Browser.getVersion');
    check(!/HeadlessChrome/.test(report.browserVersion.userAgent), 'PWA probe uses native headed Chrome');
    const display = await ev('({availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight})');
    check(display.availWidth >= 672 && display.availHeight >= 512, 'existing desktop fits a small functional probe window');
    const window = await send('Browser.getWindowForTarget');
    const bounds = { left: display.availLeft + 16, top: display.availTop + 16, width: Math.min(800, display.availWidth - 32), height: Math.min(600, display.availHeight - 32) };
    await send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'normal' } });
    await send('Browser.setWindowBounds', { windowId: window.windowId, bounds });
    report.presentation.display = display; report.presentation.requestedWindow = bounds;
    report.presentation.actualWindow = await send('Browser.getWindowForTarget'); persist();
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.origin===${JSON.stringify(ORIGIN)}){localStorage.setItem('glimmerville.v1.slot','3');window.__swMainSlotBeforeBoot=localStorage.getItem('glimmerville.v1.slot');}` });
    const bootstrapURL = ORIGIN + '/__swmain_bootstrap.html';
    await send('Page.navigate', { url: bootstrapURL });
    const bootstrapReady = async () => {
      for (let i = 0; i < 100; i++) {
        try {
          if (await ev(`location.href===${JSON.stringify(bootstrapURL)}&&document.readyState==='complete'&&window.__swMainSlotBeforeBoot==='3'`)) return true;
        } catch { /* The execution context can change while navigation commits. */ }
        await sleep(100);
      }
      return false;
    };
    check(await bootstrapReady(), 'exact bootstrap document committed and complete with preboot slot marker');
    await qualifyForeground('bootstrap before first game navigation');
    check(await ev("localStorage.getItem('glimmerville.v1.slot')==='3'&&!window.GV&&!localStorage.getItem('glimmerville.v1.s1')&&!localStorage.getItem('glimmerville.v1.s2')"), 'slot 3 selected before first game boot in fresh isolated profile');
    await ev("(async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));return true;})()");
    check(await ev("navigator.serviceWorker.controller.scriptURL===location.origin+'/sw.js'"), 'real installed service worker controls browser before entry navigation');
    const cacheDigest = () => ev(`(async()=>{const cache=await caches.open(${JSON.stringify(CACHE)}),r=await cache.match(location.origin+'/index.html');if(!r)throw Error('Missing canonical cache');const b=await r.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',b);return {status:r.status,bytes:b.byteLength,marker:r.headers.get('x-sw-main-probe'),sha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};})()`);
    const initial = await cacheDigest(); check(initial.sha256 === INDEX_SHA, 'install precaches byte-exact main index'); report.initialCache = initial;
    const rowsFor = (url, since) => {
      const enter = report.stages.filter(r => r.url === url && r.stage === 'navigate-enter' && r.time >= since).at(-1);
      return enter ? report.stages.filter(r => r.boot === enter.boot && r.navigation === enter.navigation).sort((a, b) => a.sequence - b.sequence) : [];
    };
    const waitStages = async (url, since, required) => {
      for (let i = 0; i < 300; i++) {
        const rows = rowsFor(url, since);
        // HTTP arrival can reorder logs: wait for the entire set, then sequence-sort.
        if (required.every(stage => rows.some(r => r.stage === stage))) return rows;
        await sleep(100);
      }
      throw Error('Incomplete stage set for ' + url + ': ' + required.join(','));
    };
    const identity = async (url, previous) => {
      const audit = { expectedURL: url, previousTimeOrigin: previous, startedAt: Date.now(), pollCount: 0, changes: [], droppedChanges: 0, readErrorCount: 0, readErrors: [], reactivations: [] };
      audit.deadline = audit.startedAt + 240 * 500;
      report.identityObservations.push(audit); persist();
      let lastSignature;
      for (let i = 0; i < 240 && Date.now() < audit.deadline; i++) {
        audit.pollCount = i + 1;
        try {
          const state = await readDocument(budget(audit.deadline, 150000)), native = nativeForeground(audit.deadline);
          const predicates = { exactURL: state.url === url, newTimeOrigin: state.timeOrigin !== previous, complete: state.complete, bootReady: state.boot, mainVersion: state.version === '11.211', visible: state.visibility === 'visible' && !state.hidden, focused: state.focused, nativeForeground: native.valid, viewportFits: viewportFits(state) };
          const rejectedPredicates = Object.keys(predicates).filter(key => !predicates[key]);
          const observation = { observedAt: Date.now(), poll: i + 1, state, native, predicates, rejectedPredicates };
          const signature = JSON.stringify({ state, predicates, nativeApp: native.app });
          audit.last = observation;
          if (signature !== lastSignature) {
            audit.changes.push(observation); lastSignature = signature;
            if (audit.changes.length > 32) { audit.changes.shift(); audit.droppedChanges++; }
          }
          persist();
          if (rejectedPredicates.length === 0) {
            check(state.slot === '3' && state.slotBeforeBoot === '3' && state.otherSlots.every(v => v === null), 'actual main boot preserves slot 3 and leaves slots 1/2 untouched');
            audit.completedAt = Date.now(); persist(); return state;
          }
          if ((!predicates.visible || !predicates.focused || !predicates.nativeForeground) && audit.reactivations.length < 2 && Date.now() < audit.deadline) {
            const recovery = { poll: i + 1, startedAt: Date.now(), before: observation };
            audit.reactivations.push(recovery); persist();
            try {
              await qualifyForeground('boot reactivation ' + audit.reactivations.length + ': ' + url, audit.deadline);
              recovery.qualifiedAt = Date.now();
            } catch (error) { recovery.error = String(error).slice(0, 4096); }
            persist();
          }
        } catch (error) {
          if (/actual main boot/.test(error.message)) throw error;
          audit.readErrorCount++;
          audit.readErrors.push({ observedAt: Date.now(), poll: i + 1, error: String(error).slice(0, 4096) });
          if (audit.readErrors.length > 12) audit.readErrors.shift();
          persist();
        }
        await sleep(Math.max(0, Math.min(500, audit.deadline - Date.now())));
      }
      audit.failedAt = Date.now(); audit.failure = 'Actual main boot predicate did not pass; cause unproven. See exact observations and rejected predicates.'; persist();
      throw Error('Byte-exact main product did not finish boot: ' + url);
    };
    async function navigate(mode, required) {
      const url = ORIGIN + '/index.html' + (mode ? '?__swmain=' + mode : '');
      await qualifyForeground('before ' + (mode || 'restored'));
      const previous = await ev('performance.timeOrigin'), since = Date.now();
      const result = await send('Page.navigate', { url }); assert(!result.errorText, result.errorText);
      await qualifyForeground('committed ' + (mode || 'restored'));
      const document = await identity(url, previous);
      const rows = await waitStages(url, since, ['respondWith-registered', 'waitUntil-registered', ...required]);
      const commit = report.transport.find(r => r.method === 'Page.frameNavigated' && r.url === url && !r.parentId && r.time >= since);
      const response = report.transport.find(r => r.method === 'Network.responseReceived' && r.type === 'Document' && r.url === url && r.time >= since);
      check(commit && response?.status === 200 && response.fromServiceWorker === true, 'committed main document is a successful SW response: ' + (mode || 'restored'));
      const received = await send('Network.getResponseBody', { requestId: response.requestId });
      const bodySHA256 = sha(Buffer.from(received.body, received.base64Encoded ? 'base64' : 'utf8'));
      check(bodySHA256 === INDEX_SHA, 'delivered main document bytes match immutable source: ' + (mode || 'restored'));
      const record = { mode: mode || 'restored', since, document, rows, commit, response, bodySHA256, cache: await cacheDigest(), http: report.http.filter(r => r.url === url && r.startedAt >= since) };
      report.cases.push(record); persist(); return record;
    }
    const delayed = await navigate('delay', ['fetch-end', 'clone-end', 'cache-open-end', 'cache-put-begin', 'cache-put-end', 'reply-fresh']);
    const stage = (row, name) => row.rows.find(r => r.stage === name);
    check(stage(delayed, 'cache-put-end').time - stage(delayed, 'cache-put-begin').time >= 7500, 'cache write is deliberately delayed at least 7.5 seconds');
    check(stage(delayed, 'clone-end').sequence < stage(delayed, 'reply-fresh').sequence && stage(delayed, 'reply-fresh').time < stage(delayed, 'cache-put-end').time && delayed.commit.time < stage(delayed, 'cache-put-end').time, 'fresh response and real document commit precede delayed cache completion');
    check(delayed.cache.sha256 === INDEX_SHA && delayed.cache.marker === 'delay', 'delayed cache write eventually completes with exact main bytes');
    const failed = await navigate('fail', ['fetch-end', 'clone-end', 'cache-put-begin', 'cache-error', 'reply-fresh']);
    check(stage(failed, 'cache-error').errorName === 'QuotaExceededError' && !stage(failed, 'cache-put-end') && failed.response.marker === 'fail', 'controlled cache write rejection preserves fresh network response');
    check(JSON.stringify(failed.cache) === JSON.stringify(delayed.cache), 'failed write preserves prior complete cached response and metadata');
    blockEntry = true;
    let offline;
    try { offline = await navigate('offline', ['fetch-error', 'offline-open-end', 'offline-match-end', 'reply-offline']); }
    finally { blockEntry = false; }
    check(stage(offline, 'fetch-error').sequence < stage(offline, 'offline-match-end').sequence && stage(offline, 'offline-match-end').hit === true && stage(offline, 'offline-match-end').sequence < stage(offline, 'reply-offline').sequence, 'positive origin-outage evidence: fetch-error then cache hit then reply-offline');
    check(offline.http.length > 0 && offline.http.every(r => r.abortedAt && !r.status) && offline.response.marker === 'delay', 'origin document requests were aborted before response and prior cache served');
    check(JSON.stringify(offline.cache) === JSON.stringify(delayed.cache), 'outage retains prior complete exact main cache');
    const restored = await navigate('', ['fetch-end', 'cache-put-end', 'reply-fresh']);
    check(restored.document.online && restored.document.url === ORIGIN + '/index.html' && restored.response.marker === 'clean-online' && restored.cache.marker === 'clean-online', 'clean online main navigation and canonical cache restored');
    check(report.exceptions.length === 0 && report.consoleErrors.length === 0, 'no page JavaScript exceptions or console errors');
    check(sha(fs.readFileSync(path.join(ROOT, 'index.html'))) === INDEX_SHA && sha(fs.readFileSync(path.join(ROOT, 'sw.js'))) === SW_SHA, 'raw product files remain byte-identical after probe');
    report.status = 'passed'; persist(); console.log('MAIN_SW_BROWSER_PASS ' + JSON.stringify({ checks: report.checks.length, out: OUT, cases: report.cases.map(r => r.mode) }));
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || String(error); report.chromeLog = chromeLog; persist(); throw error;
  } finally {
    blockEntry = false;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('Probe closed')); } pending.clear();
    if (ws) ws.close();
    if (browser && browser.exitCode === null && browser.signalCode === null) browser.kill('SIGTERM');
    if (browserClosed) await Promise.race([browserClosed, sleep(5000)]);
    if (browser && browser.exitCode === null && browser.signalCode === null) { browser.kill('SIGKILL'); await browserClosed; }
    for (const socket of sockets) socket.destroy();
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    instrumentWorker(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
    assert.equal(sha(fs.readFileSync(path.join(ROOT, 'index.html'))), INDEX_SHA);
    console.log('MAIN_SW_BROWSER_SOURCE_OK');
  } else { await run(); }
}
