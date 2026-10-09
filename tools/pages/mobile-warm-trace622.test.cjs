'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const trace = require('./mobile-warm-trace622.cjs'), mac = require('./native-mac-diagnostic.cjs');
const portability = require('./native-portability-diagnostic.cjs'), canonical = require('./native-correctness.cjs');
const base = portability.build(), built = trace.build(), clone = value => JSON.parse(JSON.stringify(value));
const loopEdit = trace.transformations().find(e => e.label.startsWith('trace original'));

test('five reversible host edits compose exactly the pinned base and preserve every original assertion and RAF guard', () => {
  assert.equal(base.sha256, 'c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b');
  assert.equal(built.traceBaseEmittedSHA256, base.sha256); assert.equal(built.traceChanges.length, 5);
  assert(built.traceChanges.every(c => c.occurrences === 1));
  let reversed = built.source;
  for (const edit of trace.transformations().reverse()) { assert.equal(reversed.split(edit.to).length, 2); reversed = reversed.replace(edit.to, edit.from); }
  assert.equal(reversed, base.source);
  for (const assertion of base.source.match(/(?:check|perfCheck)\([^\n]*?\);/g)) assert(built.source.includes(assertion), assertion);
  const raf = base.source.match(/    const raf=async ms=>\{[^\n]+/)[0];
  assert.equal(built.source.split(raf).length, 2, 'original browser RAF and all nine native qualifications are unchanged');
  const raw = fs.readFileSync(path.resolve(__dirname, '../../docs/tasks/t603-shots/scene603.js'), 'utf8');
  const span = canonical.TIMING.desktop, a = raw.indexOf(span.start), desktop = raw.slice(a, raw.indexOf(span.end, a));
  assert.equal(mac.sha256(desktop), span.sha256); assert.equal(built.source.split(desktop).length, 2);
  assert.equal(built.adapterSHA256, base.adapterSHA256, 'existing outer/inner supervisor identity is unchanged');
  assert(built.source.includes('portability620.finishOriginal();'));
  assert(built.source.includes("check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '"));
  assert.throws(() => trace.build(raw + '\n// source drift'), /identity drift/);
  assert.doesNotMatch(trace.createTrace622.toString(), /Page\.bringToFront|Browser\.setWindowBounds|Emulation\.|collectGarbage|requestAnimationFrame|setInterval/);
  assert(trace.CATEGORIES.includes('cc') && trace.CATEGORIES.includes('gpu') && trace.CATEGORIES.includes('blink'));
});

function latchFixture() {
  const handlers = {}, doc = { visibilityState: 'visible', focused: true, hasFocus() { return this.focused; },
    addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  const window = { addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  vm.runInNewContext('(' + trace.installWarmLatch622.toString() + ')()', { window, document: doc });
  return { doc, handlers, latch: window.__mobileWarmLoss622 };
}

async function fixture(options = {}) {
  const files = new Map(), calls = [], evaluations = [], events = [], latch = latchFixture();
  const report = { nativeMac619: { host: { window: { bounds: { left: 0, top: 0, width: 1600, height: 1000, windowState: 'fullscreen' } },
    viewport: { width: 1600, height: 1000 } } } };
  let tick = 1000, previousCpu = 1000, nextNode = 2, resolveTrace, recording = false, mode = 'baseline', warmIndex = 0;
  const profile = { startTime: 1000, endTime: 1001, nodes: [{ id: 1, callFrame: { functionName: '(root)', url: '' }, children: [] }], samples: [], timeDeltas: [] };
  const limits = { ...trace.LIMITS, operationMs: 40, closeMs: 40, readMs: 80, ...options.limits };
  const ev = async expression => {
    calls.push(['ev', expression]);
    if (expression.startsWith('({visibility:')) return { visibility: latch.doc.visibilityState, focus: latch.doc.focused,
      width: options.wrongViewport ? 1400 : 390, height: 844, dpr: 1, timeOrigin: 50,
      viewport: { cssWidth: 390, cssHeight: 844, width: 390, height: 844, dpr: 1, devicePixelRatio: 1 } };
    if (expression === '__mobileWarmLoss622.begin()') return latch.latch.begin();
    if (expression === '__mobileWarmLoss622.end()') return latch.latch.end();
    if (expression.startsWith('console.timeStamp(')) {
      const label = JSON.parse(expression.slice('console.timeStamp('.length, -');true'.length)); tick += 1000;
      if (recording && !(options.missingMarker && label.endsWith('candidate:arm:end'))) events.push({ name: 'TimeStamp', cat: 'devtools.timeline', pid: 10, tid: 20, ts: tick, args: { data: { message: label } } });
      return true;
    }
    const parts = expression.split('\n//# sourceURL=');
    const raw = parts[0], url = parts[1]; evaluations.push({ raw, url, callIndex: calls.length - 1 });
    if (raw === '__s603.cacheStats()') return { bakes: 1 };
    const cold = raw.startsWith('(()=>{window.__noT603=');
    if (cold) { mode = raw.includes('window.__noT603=true;') ? 'baseline' : 'candidate'; warmIndex = 0; }
    else assert.equal(raw, '__s603.drawMs()');
    if (options.failDraw && !cold && warmIndex === 2) throw Error('original draw failed');
    if (options.stallDraw && !cold && warmIndex === 2) return new Promise(() => {});
    const duration = cold ? 30 : 10 + warmIndex++;
    if (recording) {
      const start = tick + 1000; tick += 3000;
      const evalId = nextNode++, drawId = nextNode++;
      profile.nodes[0].children.push(evalId);
      profile.nodes.push({ id: evalId, callFrame: { functionName: '', url }, children: [drawId] },
        { id: drawId, callFrame: { functionName: 'draw', url: 'http://127.0.0.1:8763/index.html', lineNumber: 20, columnNumber: 2 } });
      profile.samples.push(drawId); profile.timeDeltas.push(start + 500 - previousCpu); previousCpu = start + 500;
      events.push({ name: 'EvaluateScript', cat: 'devtools.timeline', pid: 10, tid: 20, ts: start, dur: 1000, args: { data: { url } } },
        { name: 'CanvasRenderingContext2D::FinalizeFrame', cat: 'blink', pid: 10, tid: 20, ts: start, dur: 1200 },
        { name: 'LayerTreeHost::DoUpdateLayers', cat: 'cc', pid: 10, tid: 20, ts: start, dur: 800 });
      if (!options.missingGPU) events.push({ name: 'GpuCommandBuffer::Flush', cat: 'gpu', pid: 11, tid: 21, ts: start, dur: 700 });
      if (options.lostFocus && !cold && warmIndex === 3) { latch.doc.focused = false; latch.handlers.blur(); latch.doc.focused = true; }
      if (options.lostVisibility && !cold && warmIndex === 3) { latch.doc.visibilityState = 'hidden'; latch.handlers.visibilitychange(); latch.doc.visibilityState = 'visible'; }
    }
    return cold ? { light: 100, first: duration, before: { bakes: 1 } } : duration;
  };
  const send = async (method, params) => {
    calls.push([method, params]);
    if (method === 'Browser.getWindowForTarget') return clone(report.nativeMac619.host.window);
    if (method === 'Profiler.start') profile.startTime = tick;
    if (method === 'Tracing.start') { recording = true; assert.equal(params.traceConfig.recordMode, 'recordUntilFull'); assert.equal(params.traceConfig.traceBufferSizeInKb, limits.traceBufferKiB); }
    if (method === 'Profiler.stop') {
      if (options.stopFailure) throw Error('Profiler.stop failed');
      profile.endTime = tick + 1000; return { profile: options.emptyProfile ? {} : profile };
    }
    if (method === 'Tracing.end') { recording = false; if (!options.missingComplete) resolveTrace({ stream: 'trace-stream', dataLossOccurred: !!options.dataLoss }); }
    if (method === 'IO.read') {
      assert.equal(params.size, limits.readChunkBytes);
      if (options.readStall) return new Promise(() => {});
      return { data: JSON.stringify({ traceEvents: events }), eof: !options.neverEOF };
    }
    return {};
  };
  const run = (command, args, opts) => {
    calls.push(['native', args]); assert(opts.timeout > 0 && opts.timeout <= limits.operationMs);
    return { status: 0, stdout: args[0] === 'front' ? 'ASN:0x0-0x3003:' : '"pid"=4271\n"CFBundleIdentifier"="com.google.Chrome"\n' };
  };
  const create = new Function('return (' + trace.createTrace622.toString() + ');')();
  const control = await create({ send, ev, browser: { pid: 4271 }, report, persist() {}, errors: [], consoleErrors: [],
    waitTrace: () => new Promise(resolve => { resolveTrace = resolve; }), clearTrace() {},
    boundaryValid: mac.boundaryValid, installLatch: trace.installWarmLatch622, analyze: trace.analyzeEvidence622,
    limits, categories: trace.CATEGORIES, limitation: trace.LIMITATION, save: (name, value) => {
      if (options.saveTraceFailure && name === 'T622-mobile-night-trace.json') throw Error('trace evidence write failed');
      files.set(name, Buffer.from(value));
    }, run });
  const pair = {}, rafs = [];
  const raf = async ms => { rafs.push(ms); calls.push(['originalRAF', ms]); tick += 5000000;
    return { elapsed: 5000, frames: 300, mean: 5000 / 300, p95: 17, max: 20, visibility: 'visible' }; };
  const pct = values => [...values].sort((a, b) => a - b).at(-1);
  const execute = phase => new Function('mobileWarmTrace622', 'ev', 'raf', 'pct', 'pair', 'phase', 'time',
    'return (async()=>{' + loopEdit.to + '})();')(control, ev, raf, pct, pair, phase, 100);
  return { control, execute, files, calls, evaluations, report, profile, events, latch, pair, rafs, limits };
}

test('the emitted loop keeps one cold and ten consecutive warm evaluations and preserves all returned samples', async () => {
  const f = await fixture(); await f.execute('night'); f.control.complete(); await f.control.cleanup();
  assert.equal(f.report.mobileWarmTrace622.captureComplete, true);
  assert.deepEqual(f.rafs, [5000, 5000]);
  for (const method of ['Tracing.start', 'Tracing.end', 'Profiler.start', 'Profiler.stop', 'Profiler.disable', 'IO.close']) assert.equal(f.calls.filter(c => c[0] === method).length, 1, method);
  assert.equal(f.calls.filter(c => c[0] === 'IO.read').length, 1);
  const lastArm = f.calls.findIndex(c => c[0] === 'ev' && c[1].includes('T622:candidate:arm:end'));
  assert(f.calls.findIndex(c => c[0] === 'Tracing.end') > lastArm, 'no flush or profiler reset between arms');
  const indexed = f.evaluations.filter(e => e.url); assert.equal(indexed.length, 22);
  for (let arm = 0; arm < 2; arm++) {
    const rows = indexed.slice(arm * 11, arm * 11 + 11), mode = ['baseline', 'candidate'][arm];
    assert(rows[0].raw.includes('const first=__s603.drawMs();'));
    for (let i = 1; i < 11; i++) {
      assert.equal(rows[i].raw, '__s603.drawMs()'); assert.equal(rows[i].url, 't622://mobile-night/' + mode + '/warm/' + (i - 1) + '.js');
      assert.equal(rows[i].callIndex, rows[i - 1].callIndex + 1, 'no marker, polling, native query, sleep, or other CDP task between draws');
    }
    assert.deepEqual(f.pair[mode].warm, Array.from({ length: 10 }, (_, i) => 10 + i)); assert.equal(f.pair[mode].first, 30);
  }
  assert.equal(f.report.mobileWarmTrace622.correlation.samples.length, 22);
  assert.equal(f.report.mobileWarmTrace622.correlation.markerCount, 8);
  assert(f.report.mobileWarmTrace622.correlation.graphics.every(g => g.ccEvents && g.gpuEvents && g.rendererCanvasEvents));
});

test('day arms retain their original evaluation count and add no trace/profile/native tasks', async () => {
  const f = await fixture(); const before = f.calls.length; await f.execute('day');
  assert.deepEqual(f.rafs, [5000, 5000]); assert.equal(f.evaluations.length, 26);
  assert(f.evaluations.every(e => !e.url));
  assert(f.calls.slice(before).every(c => ['ev', 'originalRAF'].includes(c[0])));
  await f.control.cleanup();
});

for (const [label, option, expected] of [
  ['warm blur recovered before RAF', 'lostFocus', /latch\/runtime control/],
  ['warm hidden recovered before RAF', 'lostVisibility', /latch\/runtime control/],
  ['wrong mobile viewport', 'wrongViewport', /foreground\/viewport/],
  ['missing GPU events', 'missingGPU', /compositor\/GPU/],
  ['missing indexed marker', 'missingMarker', /indexed sample\/RAF\/arm markers/],
  ['missing CPU profile', 'emptyProfile', /CPU profile/],
  ['Chrome trace data loss', 'dataLoss', /trace data loss/],
  ['missing tracingComplete', 'missingComplete', /tracingComplete timeout/],
  ['Profiler.stop failure', 'stopFailure', /Profiler.stop failed/],
  ['trace evidence write failure', 'saveTraceFailure', /trace evidence write failed/],
  ['trace stream read timeout', 'readStall', /IO.read timeout/]
]) test('capture fails closed for ' + label + ' and cleanup never restarts instrumentation', async () => {
  const f = await fixture({ [option]: true });
  await assert.rejects(f.execute('night'), expected); await f.control.cleanup().catch(() => {});
  assert.equal(f.report.mobileWarmTrace622.captureComplete, false);
  assert(f.report.mobileWarmTrace622.failures.length > 0);
  assert(f.calls.filter(c => c[0] === 'Tracing.start').length <= 1);
  assert(f.calls.filter(c => c[0] === 'Profiler.start').length <= 1);
  if (option !== 'wrongViewport') {
    assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1);
    assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
  }
  if (['dataLoss', 'readStall', 'saveTraceFailure'].includes(option)) assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 1);
});

test('trace bytes, CPU-profile bytes and read count are bounded', async () => {
  for (const options of [{ limits: { traceBytes: 10 } }, { limits: { profileBytes: 10 } }, { neverEOF: true, limits: { readCalls: 2 } }]) {
    const f = await fixture(options); await assert.rejects(f.execute('night'), /limit exceeded/);
    await f.control.cleanup().catch(() => {}); assert.equal(f.report.mobileWarmTrace622.captureComplete, false);
    assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 1);
    if (options.neverEOF) assert.equal(f.report.mobileWarmTrace622.traceReadCalls, 2);
  }
});

test('the one-shot capture deadline stops tracing/profile during a stuck original evaluation', async () => {
  const f = await fixture({ stallDraw: true, limits: { captureMs: 40 } });
  await assert.rejects(f.execute('night'), /deadline|timeout|capture/); await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
  assert.equal(f.report.mobileWarmTrace622.captureComplete, false);
  assert(f.report.mobileWarmTrace622.failures.some(e => /watchdog/.test(e)));
});

test('original draw error is preserved while both tracing facilities stop', async () => {
  const f = await fixture({ failDraw: true });
  await assert.rejects(f.execute('night'), /^Error: original draw failed$/); await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1); assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
});

test('indexed CPU ancestry, sampling order, trace clocks and graphics absence have independent negative controls', async () => {
  const f = await fixture(); await f.execute('night');
  const arms = f.report.mobileWarmTrace622.arms, text = f.files.get('T622-mobile-night-trace.json').toString();
  for (const [name, mutate, expected] of [
    ['lost indexed URL', p => { p.nodes[1].callFrame.url = 'unrelated://script'; }, /no CPU samples resolve/],
    ['reordered warm ancestry', p => { const a = p.nodes[3].callFrame.url; p.nodes[3].callFrame.url = p.nodes[5].callFrame.url; p.nodes[5].callFrame.url = a; }, /cold\/ten-warm order/],
    ['unaligned clocks', p => { p.startTime += 90000000; p.endTime += 90000000; }, /clocks or coverage/],
    ['profile without samples', p => { p.samples = []; p.timeDeltas = []; }, /CPU profile/]
  ]) {
    const p = clone(f.profile); mutate(p); assert.throws(() => trace.analyzeEvidence622(text, p, arms, trace.LIMITS), expected, name);
  }
  const noGPU = JSON.stringify({ traceEvents: f.events.filter(e => e.cat !== 'gpu') });
  assert.throws(() => trace.analyzeEvidence622(noGPU, f.profile, arms, trace.LIMITS), /compositor\/GPU/);
  const duplicate = JSON.stringify({ traceEvents: [...f.events, f.events.find(e => e.name === 'TimeStamp')] });
  assert.throws(() => trace.analyzeEvidence622(duplicate, f.profile, arms, trace.LIMITS), /duplicate/);
});

test('new warm latch catches recovered loss independently of the unchanged RAF latch', () => {
  const f = latchFixture(); f.latch.begin(); f.handlers.blur(); f.handlers.resize();
  f.doc.visibilityState = 'hidden'; f.handlers.visibilitychange(); f.doc.visibilityState = 'visible';
  const end = f.latch.end(); assert.equal(end.count, 3); assert.equal(end.active, false);
  assert.equal(f.latch.begin().count, 0); f.latch.end();
});

test('existing release acceptance rejects instrumentation even when every other acceptance condition is valid', () => {
  // Reuse the existing synthetic, otherwise-accepted controller fixture; no
  // browser, supervisor, release CLI, deployment or external action is invoked.
  const native = require('./release-native-acceptance.cjs');
  const fixtureSource = fs.readFileSync(path.join(__dirname, 'release-acceptance.test.mjs'), 'utf8');
  const start = fixtureSource.indexOf('function fixture() {'), end = fixtureSource.indexOf("\ntest('policy acceptance", start);
  assert(start > 0 && end > start);
  const report = new Function('clone', 'portability', 'native', 'mac', 'canonical', fixtureSource.slice(start, end) + '\nreturn fixture();')(clone, portability, native, mac, canonical);
  assert.equal(native.acceptance(report).nativeLaneAccepted, true);
  const diagnostic = { ...report, collectionCompleted: false, releaseGatePassed: false, releaseEligible: false,
    instrumentedDiagnostic: true, diagnosticTraceCompleted: true };
  const result = native.acceptance(diagnostic);
  assert.equal(result.nativeLaneAccepted, false);
  assert.deepEqual(result.failures, ['complete unchanged T620 collection']);
});

test('T622 reuses the unchanged supervisor bounds, restores after failure, and does not relax original status', async t => {
  const f = await fixture(); await f.execute('night');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'trace622-test-')); t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const actions = [], inner = { ...f.report, status: 'failed', error: 'Error: original warm p95 failure',
    performanceFailures: ['original warm p95 failure'], mobilePerformance: { night: f.pair }, coverage: { core: true } };
  inner.nativeMac619.complete = true; inner.nativeMac619.windows = Array.from({ length: 9 }, () => ({ qualified: true }));
  const result = await trace.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {},
    compile: async () => { actions.push('compile'); return {}; },
    invoke: (compiled, action, id) => { actions.push(action); return action === 'inspect' ?
      { ok: true, exitCode: 0, displayID: 1, restoreID: 2, before: { id: 2 } } :
      { ok: true, exitCode: 0, displayID: 1, after: { id: action === 'restore' ? id : 3, width: 1600, height: 1000 } }; },
    run: async (command, args, options) => {
      actions.push('inner'); assert.equal(options.timeoutMs, 38 * 60000); assert.equal(options.terminationGraceMs, 2000);
      fs.writeFileSync(path.join(out, 'native-mac-inner-summary.json'), JSON.stringify(inner));
      return { status: 2, cleanupVerified: true };
    }
  });
  assert.deepEqual(actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
  assert.equal(result.status, 'failed'); assert.equal(result.inner.status, 2); assert.equal(result.diagnosticTraceCompleted, true);
  assert.equal(result.collectionCompleted, false); assert.equal(result.releaseEligible, false); assert.equal(result.releaseGatePassed, false);
  assert.deepEqual(result.boundsMs, mac.BOUNDS); assert.equal(result.requiredRemainingMs, 2372000);
  assert.equal(fs.existsSync(path.join(out, 'release-native-acceptance.json')), false);
  assert.equal(fs.existsSync(path.join(out, 'native-portability-supervisor.json')), false);
  await assert.rejects(trace.supervise({ out, jobStart: 1000, platform: 'darwin', now: () => 1001, env: {} }), /EEXIST/);
});
