'use strict';
// Startup-only readiness adapter. The original qualifier owns all nine RAF windows.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const mac = require('./native-mac-diagnostic.cjs'), trace = require('./mobile-warm-trace623.cjs');
const BASE_EMITTED_SHA256 = '58ab0084accbccf0e12cb21fd974c8a2401390a8450ca7de08cb98e21ab73d6a';
const QUALIFIER_SHA256 = 'ed92cb5d3004b22e4fd904a1673f86b0621277e4e72efe56b95ddf8d734b2ef5';
const LIMITS = Object.freeze({ preparationMs: 15000, observations: 15, spacingMs: 1000,
  minimumMs: 5000, matchingReadings: 3, matchingSpanMs: 2000, nativeOutputBytes: 65536 });
const HOST_EXPRESSION = '({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height})';
const FOCUS_EXPRESSION = '({visibility:document.visibilityState,focus:document.hasFocus()})';
const OBSERVATION_EXPRESSION = '({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height,visibility:document.visibilityState,focus:document.hasFocus()})';
const LIMITATION = 'T625 read-only startup readiness is prospective and cannot guarantee later stability. One frozen canonical host reference is used; later geometry or identity drift remains fatal. Preparation consumes the original job/inner budget. T623 instrumentation and its scheduling/GPU limitations remain; no result is release eligible.';

function assertQualifier() {
  if (mac.sha256(mac.createQualifier.toString()) !== QUALIFIER_SHA256) throw Error('T625 original qualifier seam identity drift');
}
function snapshot(window, viewport, foreground, focus) {
  return { windowId: window?.windowId,
    bounds: Object.fromEntries(['left', 'top', 'width', 'height', 'windowState'].map(k => [k, window?.bounds?.[k]])),
    viewport: Object.fromEntries(['width', 'height', 'dpr', 'screenWidth', 'screenHeight'].map(k => [k, viewport?.[k]])),
    foreground: Object.fromEntries(['frontExit', 'appExit', 'pid', 'bundle', 'front', 'app'].map(k => [k, foreground?.[k]])),
    visibility: focus?.visibility, focus: focus?.focus };
}
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}

async function createQualifier({ send, ev, browser, report, persist, errors, consoleErrors,
  run = spawnSync, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => performance.now(),
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  assertQualifier();
  const startedAt = now();
  if (!Number.isFinite(startedAt)) throw Error('T625 invalid preparation clock');
  const state = report.nativeHostReady625 = { protocol: 'T625-startup-host-readiness', limitation: LIMITATION,
    limits: LIMITS, startedAt, deadline: startedAt + LIMITS.preparationMs, status: 'preparing',
    setup: [], attempts: [], ready: false };
  let phase = 'setup', previousTime = startedAt, expectedWindowId, activeAttempt, stable, streak = [], pauseCalls = 0;
  const fail = message => { throw Error('T625 environment limitation: ' + message); };
  const time = () => {
    const value = now();
    if (!Number.isFinite(value) || value < previousTime) fail('preparation clock is invalid or moved backward');
    previousTime = value; return value;
  };
  const remaining = () => {
    if (errors.length || consoleErrors.length) fail('runtime error during host preparation');
    const left = state.deadline - time();
    if (left <= 0) fail('single preparation deadline exhausted');
    return left;
  };
  const operations = () => activeAttempt ? activeAttempt.operations : state.setup;
  async function bounded(label, operation) {
    remaining(); const row = { label, startedAt: time(), complete: false };
    operations().push(row); persist();
    let timer;
    try {
      const left = remaining();
      const result = await Promise.race([Promise.resolve().then(() => { remaining(); row.issuedAt = time(); return operation(); }),
        new Promise((_, reject) => { timer = setTimer(() => reject(Error('T625 environment limitation: deadline during ' + label)), left); })]);
      remaining(); row.completedAt = time(); row.complete = true; return result;
    } catch (error) { row.error = String(error); throw error; }
    finally { clearTimer(timer); persist(); }
  }
  function boundedRun(bin, args, options) {
    remaining(); const row = { label: bin + ' ' + args[0], startedAt: time(), complete: false };
    operations().push(row); persist();
    try {
      const left = Math.floor(remaining()); if (left < 1) fail('less than one millisecond remains for native command');
      row.issuedAt = time();
      const result = run(bin, args, { ...options, timeout: Math.min(options.timeout, left), maxBuffer: LIMITS.nativeOutputBytes });
      row.status = result.status; row.signal = result.signal || null;
      row.stdout = Buffer.from(String(result.stdout || '')).subarray(0, LIMITS.nativeOutputBytes).toString();
      row.stderr = Buffer.from(String(result.stderr || '')).subarray(0, LIMITS.nativeOutputBytes).toString();
      remaining();
      if (result.status !== 0 || result.error || Buffer.byteLength(String(result.stdout || '')) > LIMITS.nativeOutputBytes ||
          Buffer.byteLength(String(result.stderr || '')) > LIMITS.nativeOutputBytes) fail('native command failed or exceeded its bound: ' + row.label);
      row.complete = true; row.completedAt = time(); return result;
    } catch (error) { row.error = String(error); throw error; }
    finally { persist(); }
  }
  function valid(observed) {
    const b = observed.bounds, v = observed.viewport, f = observed.foreground;
    if (!Number.isSafeInteger(observed.windowId) || observed.windowId !== expectedWindowId) fail('Chrome window identity changed');
    if (f.frontExit !== 0 || f.appExit !== 0 || f.pid !== browser.pid || f.bundle !== 'com.google.Chrome') fail('native foreground PID/bundle changed');
    if (observed.visibility !== 'visible' || observed.focus !== true) fail('page visibility/focus lost');
    if (b.windowState !== 'fullscreen' || !['left', 'top', 'width', 'height'].every(k => Number.isFinite(b[k])) ||
        b.width < 1400 || b.height < 900 || !Object.values(v).every(Number.isFinite) || v.dpr <= 0 ||
        v.width < 1400 || v.height < 900 || v.width > b.width || v.height > b.height ||
        b.width > v.screenWidth || b.height > v.screenHeight) fail('fullscreen geometry or unchanged desktop viewport does not fit');
    remaining();
  }
  const nativeOptions = { encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL' };
  function foreground() {
    const f = boundedRun('/usr/bin/lsappinfo', ['front'], nativeOptions);
    activeAttempt.front = f.stdout; persist();
    const a = boundedRun('/usr/bin/lsappinfo', ['info', '-only', 'pid,bundleid,name', f.stdout.trim()], nativeOptions);
    const app = String(a.stdout || '');
    return { frontExit: f.status, appExit: a.status, front: f.stdout, app,
      pid: Number(app.match(/"(?:pid|LSApplicationProcessIdentifier)"\s*=\s*(\d+)/i)?.[1]),
      bundle: app.match(/"CFBundleIdentifier"\s*=\s*"([^"]+)"/)?.[1] || null };
  }
  function attempt(kind) {
    remaining(); if (state.attempts.length >= LIMITS.observations) fail('attempted observation limit exhausted');
    activeAttempt = { index: state.attempts.length, kind, startedAt: time(), complete: false, operations: [] };
    state.attempts.push(activeAttempt); persist(); return activeAttempt;
  }
  async function prepare(ms) {
    if (ms !== 1000 || ++pauseCalls !== 1 || phase !== 'setup') fail('original preparation pause seam changed');
    phase = 'observing'; state.observationsStartedAt = time(); persist();
    // Reserve one of the 15 attempts for the original canonical host read.
    while (state.attempts.length < LIMITS.observations - 1) {
      const row = attempt('observation');
      row.window = await bounded('read window', () => send('Browser.getWindowForTarget')); persist();
      row.page = await bounded('read unemulated page', () => ev(OBSERVATION_EXPRESSION)); persist();
      row.foreground = foreground();
      row.snapshot = snapshot(row.window, row.page, row.foreground, row.page); valid(row.snapshot);
      row.complete = true; row.completedAt = time();
      if (!streak.length || JSON.stringify(row.snapshot) !== JSON.stringify(streak.at(-1).snapshot)) streak = [];
      streak.push(row); if (streak.length > LIMITS.matchingReadings) streak.shift();
      row.matchingStreak = streak.length; persist();
      if (row.completedAt - state.observationsStartedAt >= LIMITS.minimumMs && streak.length === LIMITS.matchingReadings &&
          row.completedAt - streak[0].completedAt >= LIMITS.matchingSpanMs) {
        stable = row.snapshot; state.stableIndices = streak.map(r => r.index); state.stableSnapshot = stable;
        phase = 'final'; attempt('canonical'); return;
      }
      // Spacing starts after each complete observation; delays never cause catch-up.
      await bounded('observation spacing', () => pause(LIMITS.spacingMs));
    }
    fail('matching observation limit exhausted before canonical snapshot');
  }
  const checkedSend = async (method, params) => {
    if (phase === 'frozen') {
      const result = await send(method, params);
      if (method === 'Browser.getWindowForTarget' && result.windowId !== expectedWindowId) {
        state.laterIdentityFailure = { expectedWindowId, window: result }; persist(); fail('frozen Chrome window identity changed');
      }
      return result;
    }
    const result = await bounded(method, () => send(method, params));
    if (method === 'Browser.getWindowForTarget') {
      if (phase === 'setup') {
        if (expectedWindowId !== undefined || !Number.isSafeInteger(result.windowId)) fail('initial Chrome window identity missing');
        expectedWindowId = result.windowId; state.windowId = expectedWindowId;
      } else { activeAttempt.window = result; persist(); }
    }
    return result;
  };
  const checkedEv = async expression => {
    if (phase === 'frozen') return ev(expression);
    if (phase !== 'final' || expression !== HOST_EXPRESSION) fail('canonical host evaluation seam changed');
    const viewport = await bounded('canonical host viewport', () => ev(expression));
    activeAttempt.viewport = viewport; persist();
    activeAttempt.focus = await bounded('canonical focus/visibility', () => ev(FOCUS_EXPRESSION)); persist();
    return viewport;
  };
  const checkedPersist = () => {
    if (phase === 'final' && report.nativeMac619?.host) {
      const host = report.nativeMac619.host;
      activeAttempt.foreground = host.foreground;
      activeAttempt.snapshot = snapshot(host.window, host.viewport, host.foreground, activeAttempt.focus);
      valid(activeAttempt.snapshot);
      if (host.activationExit !== 0 || JSON.stringify(activeAttempt.snapshot) !== JSON.stringify(stable)) fail('canonical final host differs from stable observation');
      activeAttempt.complete = true; activeAttempt.completedAt = time();
      state.hostFrozenAt = time(); freeze(host); phase = 'host-frozen';
    }
    persist();
  };
  try {
    // Return the original closures directly. No function cloning, replacement RAF,
    // host rebasing, navigation, resizing or extra activation is introduced.
    const qualifier = await mac.createQualifier({ send: checkedSend, ev: checkedEv, browser, report,
      persist: checkedPersist, errors, consoleErrors, run: (bin, args, options) => phase === 'frozen' ? run(bin, args, options) : boundedRun(bin, args, options), pause: prepare });
    remaining();
    if (pauseCalls !== 1 || phase !== 'host-frozen') fail('canonical host was not frozen exactly once');
    state.initializationCompletedAt = time(); state.readyAt = time(); state.ready = true; state.status = 'ready';
    phase = 'frozen'; persist(); remaining();
    return qualifier;
  } catch (error) {
    state.ready = false; state.status = 'failed'; state.error = String(error);
    if (activeAttempt && !activeAttempt.complete) activeAttempt.error = String(error);
    persist(); throw error;
  }
}

const IMPORT_FROM = "require(path.join(ROOT,'tools/pages/native-mac-diagnostic.cjs')).createQualifier";
const IMPORT_TO = "require(path.join(ROOT,'tools/pages/native-host-ready625.cjs')).createQualifier";
function build(input) {
  assertQualifier(); const base = trace.build(input);
  if (base.sha256 !== BASE_EMITTED_SHA256) throw Error('T625 repaired T624 emitted base identity drift');
  if (base.source.split(IMPORT_FROM).length !== 2) throw Error('T625 exact qualifier import drift');
  const source = base.source.replace(IMPORT_FROM, IMPORT_TO);
  if (source.split(IMPORT_TO).length !== 2 || source.replace(IMPORT_TO, IMPORT_FROM) !== base.source) throw Error('T625 inverse qualifier import proof failed');
  new Function('require', '__filename', '__dirname', source);
  return { ...base, source, sha256: mac.sha256(source), readinessBaseEmittedSHA256: base.sha256,
    readinessAdapterSHA256: mac.sha256(fs.readFileSync(__filename)), readinessQualifierSHA256: QUALIFIER_SHA256,
    readinessChanges: [{ label: 'startup readiness qualifier import', occurrences: 1, beforeSHA256: mac.sha256(IMPORT_FROM), afterSHA256: mac.sha256(IMPORT_TO) }] };
}
function readinessComplete(report) {
  const state = report.innerSummary?.nativeHostReady625;
  if (!state || !Array.isArray(state.attempts) || !Array.isArray(state.stableIndices)) return false;
  const rows = state.attempts, final = rows.at(-1), stable = rows.slice(-4, -1);
  return Boolean(state.ready === true && state.status === 'ready' && !state.laterIdentityFailure &&
    [state.startedAt, state.deadline, state.observationsStartedAt, state.hostFrozenAt, state.readyAt, state.initializationCompletedAt].every(Number.isFinite) &&
    state.deadline - state.startedAt === LIMITS.preparationMs && state.readyAt < state.deadline && state.initializationCompletedAt < state.deadline &&
    rows.length >= 4 && rows.length <= LIMITS.observations && rows.every((r, i) => r.index === i && r.complete &&
      Number.isFinite(r.completedAt) && r.completedAt < state.deadline && r.kind === (i === rows.length - 1 ? 'canonical' : 'observation')) &&
    state.stableIndices.length === LIMITS.matchingReadings && stable.every((r, i) => r.index === state.stableIndices[i] &&
      JSON.stringify(r.snapshot) === JSON.stringify(state.stableSnapshot)) &&
    stable.at(-1).completedAt - stable[0].completedAt >= LIMITS.matchingSpanMs &&
    stable.at(-1).completedAt - state.observationsStartedAt >= LIMITS.minimumMs &&
    JSON.stringify(final.snapshot) === JSON.stringify(state.stableSnapshot));
}
async function supervise(options = {}) {
  const built = build();
  if (options.built && (options.built.sha256 !== built.sha256 || options.built.source !== built.source)) throw Error('T625 supplied adapter differs from pinned composition');
  const raw = await mac.supervise({ ...options, built });
  const result = { ...raw, instrumentedDiagnostic: true, startupHostReady: readinessComplete(raw),
    diagnosticTraceCompleted: readinessComplete(raw) && trace.diagnosticComplete(raw),
    collectionCompleted: false, releaseGatePassed: false, releaseEligible: false, limitation625: LIMITATION,
    readinessAdapterSHA256: built.readinessAdapterSHA256, readinessBaseEmittedSHA256: BASE_EMITTED_SHA256 };
  fs.writeFileSync(path.join(path.resolve(options.out), 'native-host-ready625-supervisor.json'), JSON.stringify(result, null, 2));
  return result;
}
async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('NATIVE_HOST_READY625_OVERLAY_OK ' + build().sha256); return; }
  if (process.argv.includes('--self-test')) { const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'native-host-ready625.test.cjs')], { stdio: 'inherit' }); process.exitCode = r.status === 0 ? 0 : 2; return; }
  if (process.argv.some(a => a.startsWith('--inner='))) throw Error('Only the unchanged T619 supervisor launches instrumented source');
  if (process.argv.some(a => a.startsWith('--phase=') && a !== '--phase=core')) throw Error('Only the full original core flow is permitted');
  const out = process.argv.find(a => a.startsWith('--out=')); if (!out) throw Error('Explicit --out= is required');
  const controller = new AbortController(), stop = () => controller.abort(); process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const r = await supervise({ out: out.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('NATIVE_HOST_READY625_DIAGNOSTIC ' + JSON.stringify({ status: r.status, startupHostReady: r.startupHostReady, diagnosticTraceCompleted: r.diagnosticTraceCompleted, releaseEligible: false }));
    process.exitCode = r.status === 'passed' && r.diagnosticTraceCompleted ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}
module.exports = { BASE_EMITTED_SHA256, QUALIFIER_SHA256, LIMITS, HOST_EXPRESSION, FOCUS_EXPRESSION, OBSERVATION_EXPRESSION,
  LIMITATION, IMPORT_FROM, IMPORT_TO, createQualifier, build, readinessComplete, supervise };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 2; });
