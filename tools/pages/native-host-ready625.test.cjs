'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const ready = require('./native-host-ready625.cjs'), mac = require('./native-mac-diagnostic.cjs');
const trace = require('./mobile-warm-trace623.cjs'), release = require('./release-native-acceptance.cjs');
const copy = value => JSON.parse(JSON.stringify(value));

function fixture(options = {}) {
  let clock = 1000, observations = 0, latchSerial = 0, latchActive = false;
  const calls = [], timers = new Set(), errors = [], consoleErrors = [];
  const report = { browserVersion: { product: 'Chrome/test' }, gpuInfo: { devices: [{}] } };
  const state = { windowId: 7, bounds: { left: 0, top: 88, width: 1920, height: 1112, windowState: 'fullscreen' },
    viewport: { width: 1920, height: 1112, dpr: 2, screenWidth: 1920, screenHeight: 1200 },
    visibility: 'visible', focus: true, pid: 625, bundle: 'com.google.Chrome', width: 390, height: 844 };
  const current = () => report.nativeHostReady625?.attempts.at(-1);
  const operation = (kind, detail) => {
    const row = { kind, detail, clock, attempt: current()?.index, attemptKind: current()?.kind }; calls.push(row);
    if (options.operation) options.operation(row, api);
    return row;
  };
  const send = async (method, params) => {
    operation('send', method);
    if (options.pending?.(method, api)) return new Promise(resolve => { api.resolvePending = resolve; });
    if (method === 'Browser.getWindowForTarget') {
      if (current()?.kind === 'observation') { if (options.observation) options.observation(observations, api); observations++; }
      if (current()?.kind === 'canonical' && !report.nativeHostReady625.ready && options.canonical) options.canonical(api);
      return { windowId: state.windowId, bounds: { ...state.bounds } };
    }
    return {};
  };
  const ev = async expression => {
    operation('ev', expression);
    if (options.pending?.(expression, api)) return new Promise(resolve => { api.resolvePending = resolve; });
    if (expression === ready.OBSERVATION_EXPRESSION) return { ...state.viewport, visibility: state.visibility, focus: state.focus };
    if (expression === ready.HOST_EXPRESSION) return { ...state.viewport };
    if (expression === ready.FOCUS_EXPRESSION) return { visibility: state.visibility, focus: state.focus };
    if (expression === '__nativeMacLoss619.begin()') { latchActive = true; return { active: true, count: 0, serial: ++latchSerial }; }
    if (expression === '__nativeMacLoss619.end()') { latchActive = false; return { active: false, count: 0, serial: latchSerial }; }
    return { visibility: state.visibility, focus: state.focus, width: state.width, height: state.height, dpr: 1, timeOrigin: 1,
      viewport: { cssWidth: state.width, cssHeight: state.height, width: state.width, height: state.height, dpr: 1, devicePixelRatio: 1 } };
  };
  const run = (bin, args, config) => {
    const row = operation('run', bin + ' ' + args[0]); row.config = config;
    if (options.run) { const result = options.run(bin, args, config, api); if (result) return result; }
    return { status: 0, stdout: args[0] === 'info' ? '"pid"=' + state.pid + '\n"CFBundleIdentifier"="' + state.bundle + '"\n' : 'ASN:625' };
  };
  const pause = async ms => { operation('pause', ms); clock += options.spacingMs ?? ms; };
  const args = { send, ev, run, pause, now: () => clock, browser: { pid: 625 }, report, errors, consoleErrors,
    persist() { if (options.persist) options.persist(api); },
    setTimer(callback, ms) { const token = { callback, ms }; timers.add(token); return token; },
    clearTimer(token) { timers.delete(token); } };
  const api = { args, state, report, calls, errors, consoleErrors, timers,
    get clock() { return clock; }, set clock(value) { clock = value; },
    get observations() { return observations; }, get latchActive() { return latchActive; },
    expire() { clock = report.nativeHostReady625.deadline; for (const t of timers) t.callback(); },
    start: () => ready.createQualifier(args) };
  return api;
}

test('one reversible import edit composes the exact repaired T624 source with the original qualifier seam', () => {
  const base = trace.build(), built = ready.build();
  assert.equal(base.sha256, ready.BASE_EMITTED_SHA256);
  assert.equal(mac.sha256(mac.createQualifier.toString()), ready.QUALIFIER_SHA256);
  assert.equal(built.readinessChanges.length, 1);
  assert.equal(built.source.replace(ready.IMPORT_TO, ready.IMPORT_FROM), base.source);
  assert.equal(built.source.split(ready.IMPORT_TO).length, 2);
  assert.deepEqual(built.traceLimits, trace.LIMITS); assert.deepEqual(built.traceChanges, base.traceChanges);
  const source = fs.readFileSync(require.resolve('./native-host-ready625.cjs'), 'utf8');
  assert.doesNotMatch(source, /eval\(|new Function[^\n]*createQualifier|setInterval|\.setWindowBounds/);
  assert.match(source, /now = \(\) => performance\.now\(\)/);
  const original = fs.readFileSync(path.resolve(__dirname, '../../docs/tasks/t603-shots/scene603.js'), 'utf8');
  assert.throws(() => ready.build(original.replace('__s603.drawMs()', '__s603.drawMs(1)')), /drift/);
});

test('valid startup geometry changes reset the streak, then the canonical original host is frozen once', async () => {
  const f = fixture({ observation(i, f) {
    f.state.bounds.top = i < 3 ? 0 : 88; f.state.bounds.height = i < 3 ? 1200 : 1112;
    f.state.viewport.height = f.state.bounds.height;
  } });
  const qualifier = await f.start(), s = f.report.nativeHostReady625;
  assert.equal(s.ready, true); assert.equal(s.attempts.length, 7); assert.deepEqual(s.stableIndices, [3, 4, 5]);
  assert.deepEqual(s.attempts.slice(0, 6).map(r => r.matchingStreak), [1, 2, 3, 1, 2, 3]);
  assert.equal(s.attempts[0].snapshot.bounds.top, 0); assert.equal(s.stableSnapshot.bounds.top, 88);
  assert.equal(s.readyAt - s.observationsStartedAt, 5000); assert.equal(s.deadline - s.startedAt, 15000);
  assert(s.attempts.every(r => r.complete)); assert(Object.isFrozen(f.report.nativeMac619.host.window.bounds));
  assert.throws(() => { f.report.nativeMac619.host.window.bounds.top = 0; }, TypeError);
  const original = fixture(); original.args.pause = async () => {};
  const canonicalQualifier = await mac.createQualifier(original.args);
  for (const name of ['before', 'after', 'complete']) assert.equal(qualifier[name].toString(), canonicalQualifier[name].toString());
  assert.equal(ready.readinessComplete({ innerSummary: f.report }), true);
  assert.equal(f.calls.filter(c => c.kind === 'run' && c.detail.startsWith('/usr/bin/open')).length, 1);
  assert.equal(f.calls.filter(c => c.detail === 'Page.bringToFront').length, 1);
  assert.equal(f.calls.filter(c => c.detail === 'Browser.setWindowBounds').length, 1);
  assert.equal(f.calls.filter(c => c.kind === 'ev' && c.detail === ready.HOST_EXPRESSION).length, 1);
  assert.equal(f.timers.size, 0);
});

test('slow observations receive one second spacing after completion without catch-up bursts', async () => {
  const f = fixture({ operation(row, f) { if (row.attemptKind === 'observation' && row.kind !== 'pause') f.clock += 200; } });
  await f.start(); const rows = f.report.nativeHostReady625.attempts.filter(a => a.kind === 'observation');
  assert(rows.length >= 3);
  for (let i = 1; i < rows.length; i++) assert.equal(rows[i].startedAt - rows[i - 1].completedAt, 1000);
  assert(rows.at(-1).completedAt - rows[0].completedAt >= 2000);
  assert(f.report.nativeHostReady625.readyAt - f.report.nativeHostReady625.observationsStartedAt >= 5000);
});

test('five seconds elapsed cannot substitute for three matching readings spanning two seconds', async () => {
  const f = fixture({ spacingMs: 0, observation(i, f) { if (!i) f.clock += 5000; } });
  await assert.rejects(f.start(), /observation limit/);
  assert.equal(f.report.nativeHostReady625.ready, false);
  assert.equal(f.report.nativeHostReady625.attempts.at(-1).matchingStreak, 3);
});

test('nonfinite or backward preparation clocks fail closed', async () => {
  const f = fixture(); f.args.now = () => NaN; await assert.rejects(f.start(), /invalid preparation clock/);
  const g = fixture({ operation(row, f) { if (row.detail === 'Page.enable') f.clock--; } });
  await assert.rejects(g.start(), /moved backward/); assert.equal(g.report.nativeHostReady625.ready, false);
});

test('oscillation exhausts bounded observations without selecting an earlier stable host', async () => {
  const f = fixture({ observation(i, f) { f.state.bounds.top = i % 2 ? 88 : 0; f.state.bounds.height = i % 2 ? 1112 : 1200; } });
  await assert.rejects(f.start(), /observation limit/);
  const s = f.report.nativeHostReady625; assert.equal(s.status, 'failed'); assert.equal(s.ready, false);
  assert.equal(s.attempts.length, 14); assert(s.attempts.every(a => a.kind === 'observation'));
  assert.equal(f.report.nativeMac619.host, undefined); assert(f.clock - s.startedAt <= 15000);
});

for (const [name, mutate, expected] of [
  ['wrong PID', f => { f.state.pid++; }, /PID\/bundle/],
  ['wrong bundle', f => { f.state.bundle = 'other'; }, /PID\/bundle/],
  ['different window ID', f => { f.state.windowId++; }, /window identity/],
  ['lost focus', f => { f.state.focus = false; }, /visibility\/focus/],
  ['hidden page', f => { f.state.visibility = 'hidden'; }, /visibility\/focus/],
  ['not fullscreen', f => { f.state.bounds.windowState = 'normal'; }, /fullscreen/],
  ['small viewport', f => { f.state.viewport.height = 899; }, /viewport/],
  ['small native window', f => { f.state.bounds.width = 1399; }, /viewport/],
  ['viewport outside native window', f => { f.state.viewport.width++; }, /viewport/],
  ['nonfinite viewport', f => { f.state.viewport.dpr = NaN; }, /viewport/],
  ['oversized window', f => { f.state.bounds.width = 3000; }, /viewport/],
  ['runtime exception', f => { f.errors.push('exception'); }, /runtime error/],
  ['console error', f => { f.consoleErrors.push('error'); }, /runtime error/]
]) test('invalid observation stops immediately: ' + name, async () => {
  const f = fixture({ observation(i, f) { if (i === 1) mutate(f); } });
  await assert.rejects(f.start(), expected);
  const s = f.report.nativeHostReady625; assert.equal(s.ready, false); assert.equal(s.attempts.length, 2);
  assert.equal(s.attempts[1].complete, false); assert.match(s.attempts[1].error, expected);
  assert.equal(f.report.nativeMac619.host, undefined); assert.equal(f.timers.size, 0);
});

test('the single deadline includes setup, observations and the final canonical snapshot', async () => {
  for (const detail of ['Page.enable', ready.OBSERVATION_EXPRESSION, ready.FOCUS_EXPRESSION, 'Page.addScriptToEvaluateOnNewDocument']) {
    const f = fixture({ operation(row, f) { if (row.detail === detail) f.clock = f.report.nativeHostReady625.deadline; } });
    await assert.rejects(f.start(), /deadline/);
    assert.equal(f.report.nativeHostReady625.ready, false); assert.equal(f.report.nativeHostReady625.status, 'failed');
    if (detail === ready.FOCUS_EXPRESSION) assert.equal(f.report.nativeHostReady625.attempts.at(-1).complete, false);
    if (detail === 'Page.addScriptToEvaluateOnNewDocument') assert.equal(f.report.nativeHostReady625.initializationCompletedAt, undefined);
    assert.equal(f.timers.size, 0);
  }
});

test('a pending final CDP call times out with partial evidence and cannot later produce readiness', async () => {
  const f = fixture({ pending(detail) { return detail === ready.FOCUS_EXPRESSION; } });
  const pending = f.start();
  while (!f.resolvePending) await new Promise(resolve => setImmediate(resolve));
  f.expire(); await assert.rejects(pending, /deadline/);
  const before = copy(f.report.nativeHostReady625), last = before.attempts.at(-1);
  assert(last.window); assert(last.viewport); assert.equal(last.complete, false); assert.equal(last.foreground, undefined);
  f.resolvePending({ visibility: 'visible', focus: true }); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.report.nativeHostReady625, before); assert.equal(f.report.nativeMac619.host, undefined);
  assert.equal(f.timers.size, 0);
});

test('final readiness evidence persistence cannot consume the deadline and still succeed', async () => {
  const f = fixture({ persist(f) { if (f.report.nativeHostReady625?.ready) f.clock = f.report.nativeHostReady625.deadline; } });
  await assert.rejects(f.start(), /deadline/);
  assert.equal(f.report.nativeHostReady625.ready, false); assert.equal(f.report.nativeHostReady625.status, 'failed');
  assert.equal(ready.readinessComplete({ innerSummary: f.report }), false);
});

test('native startup commands use the remaining shared deadline and record partial failures', async () => {
  const f = fixture({ operation(row, f) { if (row.detail === 'Browser.setWindowBounds') f.clock += 12000; },
    run(bin, args, config) { if (bin === '/usr/bin/open') { assert.equal(config.timeout, 3000); return { status: null, signal: 'SIGKILL', stdout: '', error: Error('timeout') }; } } });
  await assert.rejects(f.start(), /native command failed/);
  const s = f.report.nativeHostReady625; assert.equal(s.attempts.length, 0); assert.equal(s.setup.at(-1).signal, 'SIGKILL');
  assert.equal(s.ready, false); assert.equal(s.setup.at(-1).complete, false);
});

test('native command output is bounded and retained as failed partial evidence', async () => {
  const f = fixture({ run(bin) { if (bin === '/usr/bin/open') return { status: 0, stdout: 'x'.repeat(ready.LIMITS.nativeOutputBytes + 1) }; } });
  await assert.rejects(f.start(), /exceeded its bound/);
  assert.equal(f.report.nativeHostReady625.setup.at(-1).stdout.length, ready.LIMITS.nativeOutputBytes);
  assert.equal(f.report.nativeHostReady625.setup.at(-1).complete, false);
});

test('persistence and native time count toward the deadline before another command can issue', async () => {
  let advanced = false;
  const f = fixture({ persist(f) {
    if (!advanced && f.report.nativeHostReady625?.setup.some(row => row.label === 'Page.enable')) { advanced = true; f.clock += 15000; }
  } });
  await assert.rejects(f.start(), /deadline/); assert.equal(f.calls.length, 0);
  const g = fixture({ run(bin, args, config, f) { if (args[0] === 'front') f.clock += 15000; } });
  await assert.rejects(g.start(), /deadline/);
  assert.equal(g.calls.filter(c => c.detail === '/usr/bin/lsappinfo info').length, 0);
});

test('final canonical geometry, focus and PID changes reject rather than rebase', async () => {
  for (const mutate of [f => { f.state.bounds.top = 0; }, f => { f.state.viewport.dpr = 1; }, f => { f.state.focus = false; }, f => { f.state.pid++; }]) {
    const f = fixture({ canonical: mutate }); await assert.rejects(f.start(), /canonical final host|visibility\/focus|PID\/bundle/);
    const s = f.report.nativeHostReady625; assert.equal(s.ready, false); assert.equal(s.attempts.at(-1).complete, false);
    assert.equal(s.stableSnapshot.bounds.top, 88); assert.equal(s.attempts.length, 7);
  }
});

test('post-freeze geometry and window identity failures are fatal and preserve the observed evidence', async () => {
  const f = fixture(); const q = await f.start(), host = copy(f.report.nativeMac619.host), count = f.calls.length;
  f.state.bounds.top = 0;
  await assert.rejects(q.before(5000), /qualification failed before/);
  assert.equal(f.report.nativeMac619.windows[0].before.window.bounds.top, 0);
  assert.deepEqual(f.report.nativeMac619.host, host); assert.equal(f.report.nativeHostReady625.attempts.length, 7);
  assert.equal(f.calls.slice(count).filter(c => c.kind === 'pause' || c.detail === ready.OBSERVATION_EXPRESSION).length, 0);
  const g = fixture(), other = await g.start(); g.state.windowId++;
  await assert.rejects(other.before(5000), /frozen Chrome window identity/);
  assert.equal(g.report.nativeHostReady625.laterIdentityFailure.window.windowId, 8);
  assert.equal(ready.readinessComplete({ innerSummary: g.report }), false);
});

test('all original nine RAF closures run without new waits, polling, activation or resize after readiness', async () => {
  const f = fixture(), q = await f.start(), afterPreparation = f.calls.length, frozen = copy(f.report.nativeMac619.host);
  for (let i = 0; i < 9; i++) {
    f.state.width = i < 5 ? 390 : 1400; f.state.height = i < 5 ? 844 : 900;
    await q.before(i === 4 ? 60000 : 5000); const count = f.calls.length;
    await new Promise(resolve => setImmediate(resolve)); assert.equal(f.calls.length, count);
    await q.after({ frames: 300, elapsed: i === 4 ? 60000 : 5000 });
  }
  q.complete(); assert.equal(f.report.nativeMac619.windows.length, 9); assert.equal(f.report.nativeMac619.complete, true);
  assert.deepEqual(f.report.nativeMac619.host, frozen);
  const later = f.calls.slice(afterPreparation);
  assert(later.every(c => c.kind !== 'pause' && !['Page.bringToFront', 'Browser.setWindowBounds', ready.OBSERVATION_EXPRESSION, ready.FOCUS_EXPRESSION].includes(c.detail)));
  assert.equal(later.filter(c => c.detail === 'Browser.getWindowForTarget').length, 18);
  assert.equal(later.filter(c => c.kind === 'ev').length, 36);
  assert(later.filter(c => c.kind === 'run').every(c => c.config.timeout === 10000 && !('maxBuffer' in c.config)));
});

test('the readiness receipt rejects missing, incomplete, mismatching or premature evidence', async () => {
  const f = fixture(); await f.start();
  for (const mutate of [
    s => { s.attempts = {}; }, s => { s.attempts.pop(); }, s => { s.attempts[0].complete = false; },
    s => { s.attempts.at(-1).snapshot.bounds.top = 0; }, s => { s.stableIndices = [0, 1, 2]; },
    s => { s.observationsStartedAt = s.readyAt - 4999; }, s => { s.initializationCompletedAt = s.deadline; },
    s => { s.deadline++; }
  ]) {
    const report = copy(f.report); mutate(report.nativeHostReady625);
    assert.equal(ready.readinessComplete({ innerSummary: report }), false);
  }
  assert.equal(ready.readinessComplete({}), false);
});

test('supervision retains hard bounds/restoration and never turns failed startup into release acceptance', async t => {
  const f = fixture({ observation(i, f) { f.state.focus = false; } }); await assert.rejects(f.start());
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ready625-test-')); t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const actions = [], inner = { ...f.report, status: 'failed', error: 'startup focus lost' };
  const result = await ready.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {},
    compile: async () => { actions.push('compile'); return {}; },
    invoke: (compiled, action, id) => { actions.push(action); return action === 'inspect' ?
      { ok: true, exitCode: 0, displayID: 1, restoreID: 2, before: { id: 2 } } :
      { ok: true, exitCode: 0, displayID: 1, after: { id: action === 'restore' ? id : 3, width: 1920, height: 1200 } }; },
    run: async (command, args, config) => {
      actions.push('inner'); assert.equal(config.timeoutMs, 38 * 60000); assert.equal(config.terminationGraceMs, 2000);
      fs.writeFileSync(path.join(out, 'native-mac-inner-summary.json'), JSON.stringify(inner)); return { status: 2, cleanupVerified: true };
    }
  });
  assert.deepEqual(actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
  assert.equal(result.status, 'failed'); assert.equal(result.startupHostReady, false); assert.equal(result.diagnosticTraceCompleted, false);
  assert.equal(result.collectionCompleted, false); assert.equal(result.releaseEligible, false); assert.equal(result.releaseGatePassed, false);
  assert.deepEqual(result.boundsMs, mac.BOUNDS); assert.equal(result.requiredRemainingMs, 2372000);
  assert.equal(release.acceptance(result).nativeLaneAccepted, false);
  assert.equal(fs.existsSync(path.join(out, 'native-host-ready625-supervisor.json')), true);
  assert.equal(fs.existsSync(path.join(out, 'release-native-acceptance.json')), false);
  await assert.rejects(ready.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {} }), /EEXIST/);
});
