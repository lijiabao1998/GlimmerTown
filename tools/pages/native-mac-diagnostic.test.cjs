'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const mac = require('./native-mac-diagnostic.cjs'), canonical = require('./native-correctness.cjs');
const original = fs.readFileSync(path.resolve(__dirname, '../../docs/tasks/t603-shots/scene603.js'), 'utf8');
const built = mac.build(original);
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-mac-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir;
}

test('native overlay preserves complete original timing, readbacks, assertions and browser sampling expression', () => {
  assert.equal(built.changes.length, 12);
  assert(built.changes.every(c => c.occurrences === 1));
  for (const span of Object.values(canonical.TIMING)) {
    const start = original.indexOf(span.start), block = original.slice(start, original.indexOf(span.end, start));
    assert.equal(mac.sha256(block), span.sha256); assert.equal(built.source.split(block).length, 2);
  }
  const browserExpression = original.match(/const raf=async ms=>\{const r=await ev\(([\s\S]*?)\);return \{elapsed:r\.elapsed/)[1];
  assert.equal(built.source.split(browserExpression).length, 2, 'native browser sampling expression remains byte-identical');
  for (const assertion of original.match(/(?:check|perfCheck)\([^\n]*?\);/g)) assert(built.source.includes(assertion), assertion);
  for (const block of [
    original.slice(original.indexOf('    // Baseline fixture is immutable'), original.indexOf("    report.cityStats=await growCity('desktop-before');")),
    original.slice(original.indexOf('    const traceFrameWork603='), original.indexOf('    const testUI='))
  ]) assert(built.source.includes(block), 'all earlier pin/pixel/old-save reads and original trace helper stay intact');
  assert.match(built.source, /const PHASE='core'/); assert.match(built.source, /nativeMacQualifier619\.complete\(\)/);
  assert.match(built.source, /all unchanged performance gates must pass/);
  assert.doesNotMatch(built.source, /'--headless=new'|'--disable-gpu'/);
  assert(built.source.includes(canonical.CHROME_LAUNCH.replace("'--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),", '')));
  assert.match(built.source, /slots1\/2\/backups\/legacy bytes unchanged/);
});

test('source drift, timing edits and missing qualifier anchors fail closed', () => {
  for (const span of Object.values(canonical.TIMING)) assert.throws(() => mac.build(original.replace(span.start, span.start + '\nthrow Error("drift");')), /timing byte drift/);
  assert.throws(() => mac.build(original.replace('--disable-gpu', '--other-gpu')), /Chrome launch drift/);
  assert.throws(() => mac.build(original.replace('const raf=async ms=>', 'const raf = async ms=>')), /exact anchor drift/);
  assert.throws(() => mac.build(original.replace("const PHASE=arg('phase','full');", "const PHASE='full';")), /exact anchor drift/);
});

test('only the approved enumerated session display helper is embedded', () => {
  assert.equal(mac.sha256(mac.DISPLAY_SWIFT), '66174d9d77d2ba9528645209a9ec83dc21e07d33c90936037c9d535621525c1d');
  assert.match(mac.DISPLAY_SWIFT, /CGDisplayCopyAllDisplayModes/);
  assert.match(mac.DISPLAY_SWIFT, /CGCompleteDisplayConfiguration\(config, \.forSession\)/);
  assert.doesNotMatch(mac.DISPLAY_SWIFT, /\.permanently/);
});

function latchFixture() {
  const documentListeners = {}, windowListeners = {}, options = [];
  const document = { visibilityState: 'visible', focused: true, hasFocus() { return this.focused; },
    addEventListener(k, f, o) { documentListeners[k] = f; options.push(o); } };
  const window = { addEventListener(k, f, o) { windowListeners[k] = f; options.push(o); } };
  vm.runInNewContext('(' + mac.installLossLatch.toString() + ')()', { document, window });
  return { document, window, documentListeners, windowListeners, options, latch: window.__nativeMacLoss619 };
}
test('passive loss latch catches hidden/focus/resize loss even after recovery and never changes native APIs', () => {
  const f = latchFixture();
  assert(f.options.every(o => o.passive === true));
  assert.throws(() => f.latch.end(), /not armed/);
  f.windowListeners.blur(); assert.equal(f.latch.begin().count, 0, 'events outside the window do not pollute samples');
  assert.throws(() => f.latch.begin(), /already active/);
  f.document.visibilityState = 'hidden'; f.documentListeners.visibilitychange();
  f.document.visibilityState = 'visible'; f.documentListeners.visibilitychange();
  f.document.focused = false; f.windowListeners.blur(); f.document.focused = true;
  f.windowListeners.resize();
  const ended = f.latch.end(); assert.equal(ended.count, 3);
  assert.deepEqual([...ended.losses], ['visibilitychange:hidden', 'blur', 'resize']);
  assert.equal(f.latch.begin().count, 0); assert.equal(f.latch.end().count, 0);
  f.document.focused = false; assert.equal(f.latch.begin().count, 1); f.latch.end();
  assert.deepEqual(Object.keys(f.window).sort(), ['__nativeMacLoss619', 'addEventListener']);
});

async function qualifierFixture() {
  const latch = latchFixture(), calls = [], browser = { pid: 4271 };
  const bounds = { left: 0, top: 0, width: 1600, height: 1000, windowState: 'fullscreen' };
  const state = { width: 390, height: 844, pid: browser.pid, bundle: 'com.google.Chrome', timeOrigin: 1 };
  const report = { browserVersion: { product: 'Chrome/test' }, gpuInfo: { devices: [{ vendorString: 'test' }] } };
  let hostRead = true;
  const send = async (method, params) => {
    calls.push({ method, params });
    if (method === 'Browser.getWindowForTarget') return { windowId: 1, bounds: { ...bounds } };
    return {};
  };
  const ev = async expression => {
    calls.push({ expression });
    if (expression === '__nativeMacLoss619.begin()') return latch.latch.begin();
    if (expression === '__nativeMacLoss619.end()') return latch.latch.end();
    if (hostRead) { hostRead = false; return { width: 1600, height: 1000, dpr: 2, screenWidth: 1600, screenHeight: 1000 }; }
    return { visibility: latch.document.visibilityState, focus: latch.document.focused, width: state.width,
      height: state.height, dpr: 1, timeOrigin: state.timeOrigin, viewport: { cssWidth: state.width, cssHeight: state.height,
        width: state.width, height: state.height, dpr: 1, devicePixelRatio: 1 } };
  };
  const run = (bin, args, options) => {
    assert.equal(options.timeout, 10000); calls.push({ bin, args });
    if (args[0] === 'info') return { status: 0, stdout: '"pid"=' + state.pid + '\n"CFBundleIdentifier"="' + state.bundle + '"\n' };
    return { status: 0, stdout: 'ASN:0x0-0x3003:' };
  };
  const qualifier = await mac.createQualifier({ send, ev, browser, report, persist() {}, errors: [], consoleErrors: [], run, pause: async () => {} });
  return { qualifier, state, bounds, report, latch, calls };
}

test('all nine original windows qualify their phase-specific viewport without recovery or host polling inside sampling', async () => {
  const f = await qualifierFixture();
  for (let i = 0; i < 9; i++) {
    f.state.width = i < 5 ? 390 : 1400; f.state.height = i < 5 ? 844 : 900;
    await f.qualifier.before(i === 4 ? 60000 : 5000);
    const callsDuringSample = f.calls.length;
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(f.calls.length, callsDuringSample, 'no host polling or activation during the original sample');
    await f.qualifier.after({ frames: 317, elapsed: 5004, intervals: [16, 17] });
  }
  f.qualifier.complete(); assert.equal(f.report.nativeMac619.complete, true);
  assert.equal(f.report.nativeMac619.windows.length, 9);
  assert(f.report.nativeMac619.windows.slice(0, 5).every(w => w.width === 390 && w.height === 844));
  assert(f.report.nativeMac619.windows.slice(5).every(w => w.width === 1400 && w.height === 900));
  assert.equal(f.calls.filter(c => c.bin === '/usr/bin/open').length, 1, 'activation only in initial host setup');
  assert.equal(f.calls.filter(c => c.method === 'Page.bringToFront').length, 1);
});

for (const failure of ['other Chrome PID', 'viewport', 'host window', 'lost then recovered focus', 'lost then recovered resize', 'new document']) {
  test('window qualification rejects ' + failure, async () => {
    const f = await qualifierFixture(); await f.qualifier.before(5000);
    if (failure === 'other Chrome PID') f.state.pid++;
    if (failure === 'viewport') f.state.width = 1400;
    if (failure === 'host window') f.bounds.width--;
    if (failure === 'lost then recovered focus') f.latch.windowListeners.blur();
    if (failure === 'lost then recovered resize') f.latch.windowListeners.resize();
    if (failure === 'new document') f.state.timeOrigin++;
    await assert.rejects(f.qualifier.after({ frames: 300, elapsed: 5000 }), /qualification failed after/);
    assert.equal(f.report.nativeMac619.windows[0].qualified, false);
    await assert.rejects(f.qualifier.before(5000), /order\/duration drift/, 'no timed-window recovery');
  });
}

test('wrong sampling order and incomplete window/device identity fail closed', async () => {
  const f = await qualifierFixture();
  await assert.rejects(f.qualifier.before(60000), /order\/duration drift/);
  assert.throws(() => f.qualifier.complete(), /Not all nine/);
});

test('supervisor compiles once with explicit 120+2 second bound and validates invocation identity', async t => {
  const dir = temporary(t); let compileCalls = 0;
  const compiled = await mac.compileDisplay(path.join(dir, 'helper'), async (command, args, options) => {
    compileCalls++; assert.equal(command, '/usr/bin/xcrun'); assert.equal(args[0], 'swiftc');
    assert.equal(options.timeoutMs, 120000); assert.equal(options.terminationGraceMs, 2000);
    assert.equal(fs.readFileSync(args[1], 'utf8'), mac.DISPLAY_SWIFT);
    fs.writeFileSync(args[3], 'test binary'); return { status: 0, cleanupVerified: true };
  });
  assert.equal(compileCalls, 1);
  let invokeCalls = 0;
  const run = (binary, args, options) => {
    invokeCalls++; assert.equal(binary, compiled.binaryPath); assert.equal(options.timeout, 60000);
    assert.equal(options.killSignal, 'SIGKILL'); return { status: 0, stdout: JSON.stringify({ ok: true }) };
  };
  assert.equal(mac.invokeDisplay(compiled, 'inspect', undefined, run).ok, true);
  assert.throws(() => mac.invokeDisplay(compiled, 'restore', undefined, run), /Original display/);
  fs.appendFileSync(compiled.binaryPath, 'tampered');
  assert.throws(() => mac.invokeDisplay(compiled, 'prepare', undefined, run), /identity mismatch/);
  assert.equal(invokeCalls, 1);
});

test('missing compiler and an aborted launch report failure without success', async t => {
  const result = await mac.runBounded(path.join(temporary(t), 'missing'), [], { timeoutMs: 300 });
  assert(result.error); assert.notEqual(result.status, 0); assert.equal(result.cleanupVerified, true);
  const controller = new AbortController(); controller.abort();
  const skipped = await mac.runBounded(process.execPath, ['-e', 'process.exit(0)'], { timeoutMs: 300, signal: controller.signal });
  assert.equal(skipped.launched, false); assert.equal(skipped.aborted, true);
});

for (const mode of ['driver exits on SIGTERM', 'driver ignores SIGTERM', 'normal driver exit']) {
  test('process-group cleanup stops stubborn descendants after ' + mode, { skip: process.platform === 'win32' }, async t => {
    const dir = temporary(t), heartbeat = path.join(dir, 'heartbeat');
    const childCode = 'const fs=require("node:fs");process.on("SIGTERM",()=>{});fs.writeFileSync(' + JSON.stringify(heartbeat) + ',"ready");console.log(process.pid);setInterval(()=>fs.appendFileSync(' + JSON.stringify(heartbeat) + ',"."),10);';
    const driver = (mode === 'driver ignores SIGTERM' ? 'process.on("SIGTERM",()=>{});' : '') +
      'const c=require("node:child_process").spawn(process.execPath,["-e",' + JSON.stringify(childCode) + '],{stdio:["ignore","pipe","ignore"]});console.log(process.pid);c.stdout.on("data",d=>process.stdout.write(d));' +
      (mode === 'normal driver exit' ? 'setTimeout(()=>process.exit(0),300);' : 'setInterval(()=>{},1000);');
    const result = await mac.runBounded(process.execPath, ['-e', driver], { timeoutMs: 600, terminationGraceMs: 600 });
    assert.equal(result.timedOut, mode !== 'normal driver exit'); assert.equal(result.cleanupVerified, true);
    const pids = result.stdout.trim().split(/\s+/).map(Number); assert.equal(pids.length, 2);
    t.after(() => { for (const pid of pids) try { process.kill(pid, 'SIGKILL'); } catch {} });
    const stopped = fs.readFileSync(heartbeat, 'utf8'); await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(fs.readFileSync(heartbeat, 'utf8'), stopped);
    assert.deepEqual(mac.liveGroup(result.pid), []);
  });
}

function supervisorFixture(t, change = {}) {
  const out = temporary(t), actions = [], jobStart = 1000000;
  let clock = jobStart + 1000;
  const compile = async () => { actions.push('compile'); return { testCompiled: true }; };
  const invoke = (compiled, action, id) => {
    actions.push(action);
    if (action === 'inspect') return { ok: true, exitCode: 0, displayID: 7, restoreID: 91, before: { id: 91 } };
    if (action === 'prepare') {
      if (change.prepareFailure) throw Error('prepare changed display but failed to emit JSON');
      if (change.insufficientBudget) clock = jobStart + mac.BOUNDS.job - mac.REQUIRED_REMAINING_MS + 1;
      return { ok: true, exitCode: 0, displayID: 7, after: { id: 92, width: 1600, height: 1000 } };
    }
    assert.equal(id, 91); return { ok: true, exitCode: 0, displayID: 7, after: { id: change.wrongRestore ? 92 : 91 } };
  };
  const run = async (command, args, options) => {
    actions.push('inner'); assert.equal(options.timeoutMs, 38 * 60000); assert.equal(options.terminationGraceMs, 2000);
    assert(options.env.T619_INNER_TOKEN); assert(fs.existsSync(options.env.T619_INNER_DIR));
    t.after(() => fs.rmSync(options.env.T619_INNER_DIR, { recursive: true, force: true }));
    fs.writeFileSync(path.join(out, 'native-mac-inner-summary.json'), JSON.stringify({ status: change.originalFailure ? 'failed' : 'passed',
      performanceFailures: change.originalFailure ? ['unchanged RAF floor'] : [], nativeMac619: { complete: true } }));
    return { status: change.originalFailure ? 2 : 0, cleanupVerified: !change.badCleanup, timedOut: !!change.timeout };
  };
  return { out, actions, options: { out, jobStart, platform: 'darwin', now: () => clock, compile, invoke, run, built, env: {} } };
}

test('one complete run requires independent outer cleanup and exact original restoration', async t => {
  const f = supervisorFixture(t), report = await mac.supervise(f.options);
  assert.equal(report.status, 'passed'); assert.equal(report.completed, true); assert.equal(report.restored, true);
  assert.equal(report.profileRemoved, true); assert.equal(report.attempts, 1);
  assert.deepEqual(f.actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
  await assert.rejects(mac.supervise(f.options), /EEXIST/, 'same evidence output cannot be used for a lucky retry');
  assert.equal(f.actions.filter(x => x === 'inner').length, 1);
});

for (const [label, change, status, attempts] of [
  ['original performance failure', { originalFailure: true }, 'failed', 1],
  ['killed inner', { timeout: true }, 'incomplete', 1],
  ['unverified child cleanup', { badCleanup: true }, 'incomplete', 1],
  ['wrong restored mode', { wrongRestore: true }, 'incomplete', 1],
  ['partially failed display prepare', { prepareFailure: true }, 'incomplete', 0],
  ['insufficient 38m+2s+60s+30s reserve', { insufficientBudget: true }, 'incomplete', 0]
]) test('outer restoration runs after ' + label + ' and does not turn it into success', async t => {
  const f = supervisorFixture(t, change), report = await mac.supervise(f.options);
  assert.equal(report.status, status); assert.equal(report.attempts, attempts);
  assert.equal(f.actions.at(-1), 'restore'); assert.equal(f.actions.filter(x => x === 'restore').length, 1);
  assert.equal(f.actions.filter(x => x === 'inner').length, attempts);
  if (change.timeout || change.badCleanup || change.wrongRestore) assert.equal(report.completed, false);
  if (change.badCleanup) assert.equal(fs.existsSync(report.profileRetained), true, 'retain profile until cleanup is verified');
});

test('real inner timeout and group kill finish before outer restoration; timeout is incomplete evidence', { skip: process.platform === 'win32' }, async t => {
  const f = supervisorFixture(t), baseInvoke = f.options.invoke;
  let cleanupFinished = false, pid;
  f.options.run = async (command, args, options) => {
    f.actions.push('inner');
    const actual = await mac.runBounded(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});console.log(process.pid);setInterval(()=>{},1000);'],
      { timeoutMs: 300, terminationGraceMs: 500 });
    pid = actual.pid; cleanupFinished = actual.cleanupVerified;
    return actual;
  };
  f.options.invoke = (compiled, action, id) => {
    if (action === 'restore') {
      assert.equal(cleanupFinished, true); assert.deepEqual(mac.liveGroup(pid), []);
    }
    return baseInvoke(compiled, action, id);
  };
  const report = await mac.supervise(f.options);
  assert.equal(report.inner.timedOut, true); assert.equal(report.restored, true);
  assert.equal(report.cleanupVerified, true); assert.equal(report.status, 'incomplete');
  assert.equal(report.completed, false); assert.equal(report.attempts, 1);
  assert.deepEqual(f.actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
});

test('darwin, job-start and one-attempt rules fail before external work', async t => {
  const f = supervisorFixture(t);
  await assert.rejects(mac.supervise({ ...f.options, platform: 'linux' }), /darwin-only/);
  for (const jobStart of [NaN, 0, -1, Infinity, 2000000]) await assert.rejects(mac.supervise({ ...f.options, jobStart }), /T619_JOB_START_MS/);
  await assert.rejects(mac.supervise({ ...f.options, env: { GITHUB_RUN_ATTEMPT: '2' } }), /reruns prohibited/);
  assert.deepEqual(f.actions, []);
  assert.equal(mac.REQUIRED_REMAINING_MS, 2372000);
});
