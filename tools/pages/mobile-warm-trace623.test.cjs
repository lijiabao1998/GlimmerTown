'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const trace = require('./mobile-warm-trace623.cjs'), mac = require('./native-mac-diagnostic.cjs');
const portability = require('./native-portability-diagnostic.cjs'), canonical = require('./native-correctness.cjs');
const base = portability.build(), built = trace.build(), clone = value => JSON.parse(JSON.stringify(value));
const loopEdit = trace.transformations().find(e => e.label.startsWith('trace original'));

test('six reversible host edits compose exactly the pinned base and preserve every original assertion and RAF guard', () => {
  assert.equal(base.sha256, 'c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b');
  assert.equal(built.traceBaseEmittedSHA256, base.sha256); assert.equal(built.traceChanges.length, 6);
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
  assert.doesNotMatch(trace.createTrace623.toString(), /Page\.bringToFront|Browser\.setWindowBounds|Emulation\.|collectGarbage|requestAnimationFrame|setInterval/);
  assert(trace.CATEGORIES.includes('cc') && trace.CATEGORIES.includes('gpu') && trace.CATEGORIES.includes('blink'));
});

function latchFixture() {
  const handlers = {}, doc = { visibilityState: 'visible', focused: true, hasFocus() { return this.focused; },
    addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  const window = { addEventListener(k, f, o) { assert.equal(o.passive, true); handlers[k] = f; } };
  vm.runInNewContext('(' + trace.installWarmLatch623.toString() + ')()', { window, document: doc });
  return { doc, handlers, latch: window.__mobileWarmLoss623 };
}

async function fixture(options = {}) {
  const files = new Map(), calls = [], evaluations = [], records = [], latch = latchFixture();
  const report = { nativeMac619: { host: { window: { bounds: { left: 0, top: 0, width: 1600, height: 1000, windowState: 'fullscreen' } },
    viewport: { width: 1600, height: 1000 } } } };
  const limits = { ...trace.LIMITS, captureMs: 2000, operationMs: 40, closeMs: 40, readMs: 80, ...options.limits };
  let tick = 1000, fakeNow = 1000, recording = false, active, warmIndex = 0, control;
  const realNow = options.fakeClock ? () => fakeNow : Date.now;
  const ev = async expression => {
    calls.push(['ev', expression]);
    if (expression.startsWith('({visibility:')) return { visibility: latch.doc.visibilityState, focus: latch.doc.focused,
      width: options.wrongViewport ? 1400 : 390, height: 844, dpr: 1, timeOrigin: 50,
      viewport: { cssWidth: 390, cssHeight: 844, width: 390, height: 844, dpr: 1, devicePixelRatio: 1 } };
    if (expression === '__mobileWarmLoss623.begin()') return latch.latch.begin();
    if (expression === '__mobileWarmLoss623.end()') return latch.latch.end();
    if (expression.startsWith('console.timeStamp(')) {
      const label = JSON.parse(expression.slice('console.timeStamp('.length, -');true'.length)); tick += 1000;
      if (recording && !(options.missingMarker && label.includes(':warm:end'))) active.events.push({ name: 'TimeStamp', cat: 'devtools.timeline', pid: 10, tid: 20, ts: tick, args: { data: { message: label } } });
      return true;
    }
    const [raw, url] = expression.split('\n//# sourceURL='); evaluations.push({ raw, url, callIndex: calls.length - 1 });
    if (raw === '__s603.cacheStats()') return { bakes: 1 };
    const cold = raw.startsWith('(()=>{window.__noT603=');
    if (cold) warmIndex = 0; else assert.equal(raw, '__s603.drawMs()');
    if (options.failDraw && !cold && warmIndex === 2) throw Error('original draw failed');
    if (options.stallDraw && !cold && warmIndex === 2) return new Promise(() => {});
    const duration = cold ? 30 : 10 + warmIndex++;
    if (recording) {
      const start = tick + 1000; tick += 3000;
      const evalId = active.nextNode++, drawId = active.nextNode++, profile = active.profile;
      profile.nodes[0].children.push(evalId);
      profile.nodes.push({ id: evalId, callFrame: { functionName: '', url }, children: [drawId] },
        { id: drawId, callFrame: { functionName: 'draw', url: 'http://127.0.0.1:8763/index.html', lineNumber: 20, columnNumber: 2 } });
      profile.samples.push(drawId); profile.timeDeltas.push(start + 500 - active.previousCpu); active.previousCpu = start + 500;
      active.events.push({ name: 'EvaluateScript', cat: 'devtools.timeline', pid: 10, tid: 20, ts: start, dur: 1000, args: { data: { url } } },
        { name: 'CanvasRenderingContext2D::FinalizeFrame', cat: 'blink', pid: 10, tid: 20, ts: start, dur: 1200 },
        { name: 'LayerTreeHost::DoUpdateLayers', cat: 'cc', pid: 10, tid: 20, ts: start, dur: 800 });
      if (!options.missingGPU) active.events.push({ name: 'GpuCommandBuffer::Flush', cat: 'gpu', pid: 11, tid: 21, ts: start, dur: 700 });
      if (options.lostFocus && !cold && warmIndex === 3) { latch.doc.focused = false; latch.handlers.blur(); latch.doc.focused = true; }
      if (options.lostVisibility && !cold && warmIndex === 3) { latch.doc.visibilityState = 'hidden'; latch.handlers.visibilitychange(); latch.doc.visibilityState = 'visible'; }
    }
    return cold ? { light: 100, first: duration, before: { bakes: 1 } } : duration;
  };
  const send = async (method, params) => {
    calls.push([method, params]);
    if (method === 'Browser.getWindowForTarget') return clone(report.nativeMac619.host.window);
    if (method === 'Tracing.getCategories') return { categories: options.malformedGC ? 'disabled-by-default-v8.gc' : trace.CATEGORIES.filter(c => !options.noGC || c !== 'disabled-by-default-v8.gc') };
    if (method === 'Profiler.start') {
      active = { mode: ['baseline', 'candidate'][records.length], ordinal: records.length + 1, nextNode: 2, previousCpu: tick, events: [], readOffset: 0,
        profile: { startTime: tick, endTime: tick + 1, nodes: [{ id: 1, callFrame: { functionName: '(root)', url: '' }, children: [] }], samples: [], timeDeltas: [] } };
      records.push(active);
    }
    if (method === 'Tracing.start') {
      recording = true; assert.equal(params.traceConfig.recordMode, 'recordUntilFull'); assert.equal(params.traceConfig.traceBufferSizeInKb, limits.traceBufferKiB);
      if (options.earlyComplete) control.routeTraceComplete({ stream: 'early-stream', dataLossOccurred: false }, false);
    }
    if (method === 'Profiler.stop') {
      if (options.stopFailure) throw Error('Profiler.stop failed');
      active.profile.endTime = tick + 1000;
      return { profile: options.emptyProfile ? {} : options.crossArmProfile && active.ordinal === 2 ? records[0].profile : active.profile };
    }
    if (method === 'Tracing.end') {
      recording = false; if (options.fakeClock) fakeNow += options.advanceOnStop || 0;
      if (!options.missingComplete) {
        const event = { stream: options.staleComplete && active.ordinal === 2 ? 'trace-1' : 'trace-' + active.ordinal, dataLossOccurred: !!options.dataLoss };
        control.routeTraceComplete(event, false);
        if (options.duplicateComplete) control.routeTraceComplete(event, false);
      }
    }
    if (method === 'IO.read') {
      assert(params.size > 0 && params.size <= limits.readChunkBytes);
      if (options.readStall) return new Promise(() => {});
      if (options.lostDuringRead) latch.handlers.blur();
      if (options.fakeClock) fakeNow += options.advanceOnRead || 0;
      const record = records[Number(params.handle.split('-')[1]) - 1];
      const events = options.crossArmTrace && record.ordinal === 2 ? records[0].events : record.events;
      const bytes = Buffer.from(JSON.stringify({ traceEvents: events }));
      const chunk = bytes.subarray(record.readOffset, record.readOffset + params.size); record.readOffset += chunk.length;
      return { data: chunk.toString('base64'), base64Encoded: true, eof: !options.neverEOF && record.readOffset >= bytes.length };
    }
    return {};
  };
  const run = (command, args, opts) => {
    calls.push(['native', args]); assert(opts.timeout > 0 && opts.timeout <= limits.operationMs);
    return { status: 0, stdout: args[0] === 'front' ? 'ASN:0x0-0x3003:' : '"pid"=4271\n"CFBundleIdentifier"="com.google.Chrome"\n' };
  };
  const create = new Function('return (' + trace.createTrace623.toString() + ');')();
  control = await create({ send, ev, browser: { pid: 4271 }, report, persist() {}, errors: [], consoleErrors: [],
    boundaryValid: mac.boundaryValid, installLatch: trace.installWarmLatch623, analyze: trace.analyzeEvidence623,
    limits, categories: trace.CATEGORIES, limitation: trace.LIMITATION, now: realNow,
    save: (name, value) => { if (options.saveTraceFailure && name.endsWith('-trace.json')) throw Error('trace evidence write failed'); files.set(name, Buffer.from(value)); }, run });
  const pair = {}, rafs = [];
  const raf = async ms => {
    rafs.push(ms); calls.push(['originalRAF', ms]); tick += 5000000;
    assert.equal(recording, false, 'trace is stopped before each original RAF');
    if (options.lostDuringRAF) latch.handlers.blur();
    if (options.fakeClock && rafs.length === 1) fakeNow += options.advanceOnBaselineRAF || 0;
    return { elapsed: 5000, frames: 300, mean: 5000 / 300, p95: 17, max: 20, visibility: 'visible' };
  };
  const pct = values => [...values].sort((a, b) => a - b).at(-1);
  const execute = phase => new Function('mobileWarmTrace623', 'ev', 'raf', 'pct', 'pair', 'phase', 'time',
    'return (async()=>{' + loopEdit.to + '})();')(control, ev, raf, pct, pair, phase, 100);
  return { control, execute, files, calls, evaluations, report, records, latch, pair, rafs, limits };
}

test('the emitted loop captures exactly two cold/warm bursts and drains after cacheStats before each original RAF', async () => {
  const f = await fixture(); await f.execute('night'); f.control.complete(); await f.control.cleanup();
  const state = f.report.mobileWarmTrace623;
  assert.equal(state.captureComplete, true); assert.deepEqual(f.rafs, [5000, 5000]);
  for (const method of ['Tracing.start', 'Tracing.end', 'Profiler.start', 'Profiler.stop', 'Profiler.disable', 'IO.close', 'IO.read']) assert.equal(f.calls.filter(c => c[0] === method).length, 2, method);
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.getCategories').length, 1);
  const indexed = f.evaluations.filter(e => e.url); assert.equal(indexed.length, 22);
  const indices = method => f.calls.map((c, i) => c[0] === method ? i : -1).filter(i => i >= 0);
  for (let arm = 0; arm < 2; arm++) {
    const rows = indexed.slice(arm * 11, arm * 11 + 11), mode = ['baseline', 'candidate'][arm];
    assert(rows[0].raw.includes('const first=__s603.drawMs();'));
    for (let i = 1; i < 11; i++) {
      assert.equal(rows[i].raw, '__s603.drawMs()'); assert.equal(rows[i].url, 't623://mobile-night/' + mode + '/warm/' + (i - 1) + '.js');
      assert.equal(rows[i].callIndex, rows[i - 1].callIndex + 1, 'no marker, polling, native query or other CDP task inside the original draw burst');
    }
    const cacheIndex = rows.at(-1).callIndex + 1;
    assert.deepEqual(f.calls[cacheIndex], ['ev', '__s603.cacheStats()'], 'original post-warm cache read directly follows warm draw 9');
    assert(cacheIndex < indices('Tracing.end')[arm]);
    assert(indices('Tracing.end')[arm] < indices('IO.close')[arm]);
    assert(indices('IO.close')[arm] < indices('originalRAF')[arm], 'trace-stream download finishes before original RAF');
    assert.deepEqual(f.pair[mode].warm, Array.from({ length: 10 }, (_, i) => 10 + i)); assert.equal(f.pair[mode].first, 30);
    assert.equal(state.arms[arm].capture.correlation.samples.length, 11);
    assert.equal(state.arms[arm].capture.correlation.markerCount, 2);
    assert(state.arms[arm].capture.correlation.graphics.every(g => g.ccEvents && g.gpuEvents && g.rendererCanvasEvents));
    assert.equal(state.arms[arm].capture.correlation.gcEventCount, 0, 'zero observed GC is allowed when category capability exists');
  }
  assert(indices('originalRAF')[0] < indices('Profiler.start')[1]);
  assert.equal(state.gcCapability.available, true);
  assert.equal(state.totals.events, f.records.reduce((sum, r) => sum + r.events.length, 0));
  assert.equal(state.totals.profileSamples, 22); assert.equal(state.totals.readCalls, 2);
  assert.equal(state.totals.traceBytes, [...f.files].filter(([name]) => name.endsWith('-trace.json')).reduce((sum, [, bytes]) => sum + bytes.length, 0));
  assert.equal(state.instrumentationDeadline - state.instrumentationStartedAt, f.limits.captureMs);
  assert.doesNotThrow(() => JSON.stringify(f.report), 'receipt excludes Promise/resolver and cyclic state');
});

test('day arms retain original evaluations and add no instrumentation or native tasks', async () => {
  const f = await fixture(), before = f.calls.length; await f.execute('day');
  assert.deepEqual(f.rafs, [5000, 5000]); assert.equal(f.evaluations.length, 26); assert(f.evaluations.every(e => !e.url));
  assert(f.calls.slice(before).every(c => ['ev', 'originalRAF'].includes(c[0]))); await f.control.cleanup();
});

for (const [label, option, expected, count] of [
  ['warm blur recovered before RAF', 'lostFocus', /latch\/runtime control/, 1],
  ['warm hidden recovered before RAF', 'lostVisibility', /latch\/runtime control/, 1],
  ['focus loss during trace stream read', 'lostDuringRead', /latch\/runtime control/, 1],
  ['focus loss during original RAF', 'lostDuringRAF', /latch\/runtime control/, 1],
  ['wrong mobile viewport', 'wrongViewport', /foreground\/viewport/, 0],
  ['GC category unavailable', 'noGC', /GC trace category capability/, 0],
  ['malformed GC capability response', 'malformedGC', /GC trace category capability/, 0],
  ['missing GPU events', 'missingGPU', /compositor\/GPU/, 1],
  ['missing indexed marker', 'missingMarker', /cross-arm capture markers/, 1],
  ['missing CPU profile', 'emptyProfile', /CPU profile/, 1],
  ['Chrome trace data loss', 'dataLoss', /data-loss/, 1],
  ['missing tracingComplete', 'missingComplete', /tracingComplete baseline timeout/, 1],
  ['Profiler.stop failure', 'stopFailure', /Profiler.stop failed/, 1],
  ['trace evidence write failure', 'saveTraceFailure', /trace evidence write failed/, 1],
  ['trace stream read timeout', 'readStall', /IO.read timeout/, 1],
  ['early completion', 'earlyComplete', /shared deadline\/arm order\/control/, 1],
  ['duplicate completion', 'duplicateComplete', /shared deadline\/arm order\/control/, 1],
  ['stale prior-arm stream', 'staleComplete', /stale\/reused trace completion/, 2],
  ['prior-arm trace body', 'crossArmTrace', /cross-arm capture markers/, 2],
  ['prior-arm CPU profile', 'crossArmProfile', /clocks or coverage/, 2]
]) test('fails closed for ' + label + ', stops both facilities and never adds a retry', async () => {
  const f = await fixture({ [option]: true });
  await assert.rejects(f.execute('night'), expected); await f.control.cleanup().catch(() => {});
  assert.equal(f.report.mobileWarmTrace623.captureComplete, false); assert(f.report.mobileWarmTrace623.failures.length);
  for (const method of ['Tracing.start', 'Tracing.end', 'Profiler.start', 'Profiler.stop']) assert.equal(f.calls.filter(c => c[0] === method).length, count, method);
  assert.deepEqual(f.records.map(r => r.mode), ['baseline', 'candidate'].slice(0, count));
  if (['dataLoss', 'readStall', 'saveTraceFailure'].includes(option)) assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 1);
});

test('all byte/count/sample/event budgets are cumulative across the two captures', async () => {
  const good = await fixture(); await good.execute('night'); await good.control.cleanup();
  const first = good.report.mobileWarmTrace623.arms[0].capture;
  for (const [budget, value] of [
    ['traceBytes', Math.floor(first.traceBytes * 1.5)], ['profileBytes', Math.floor(first.profileBytes * 1.5)],
    ['readCalls', 1], ['events', Math.floor(first.correlation.eventCount * 1.5)], ['profileSamples', 15]
  ]) {
    const f = await fixture({ limits: { [budget]: value } }); await assert.rejects(f.execute('night'), /cumulative .*limit exceeded/, budget);
    await f.control.cleanup().catch(() => {});
    assert.equal(f.records.length, 2, 'first arm fits its individual share but second exceeds shared ' + budget);
    assert.equal(f.report.mobileWarmTrace623.captureComplete, false);
    assert.equal(f.calls.filter(c => c[0] === 'Tracing.start').length, 2);
    assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 2);
  }
});

test('cumulative read time rejects even final EOF and read counts only include issued commands', async () => {
  const f = await fixture({ fakeClock: true, advanceOnRead: 45, limits: { readMs: 80 } });
  await assert.rejects(f.execute('night'), /cumulative trace read-time limit/); await f.control.cleanup().catch(() => {});
  assert.equal(f.records.length, 2); assert.equal(f.report.mobileWarmTrace623.totals.readElapsedMs, 90);
  assert.equal(f.calls.filter(c => c[0] === 'IO.close').length, 2);
  const expired = await fixture({ fakeClock: true, advanceOnStop: 90001, limits: { captureMs: 90000 } });
  await assert.rejects(expired.execute('night'), /IO.read deadline/); await expired.control.cleanup().catch(() => {});
  assert.equal(expired.report.mobileWarmTrace623.totals.readCalls, 0);
  assert.equal(expired.calls.filter(c => c[0] === 'IO.read').length, 0);
  assert.equal(expired.calls.filter(c => c[0] === 'IO.close').length, 1);
});

test('one wall deadline remains charged across baseline RAF and cannot reset for candidate', async () => {
  const f = await fixture({ fakeClock: true, advanceOnBaselineRAF: 90001, limits: { captureMs: 90000 } });
  await assert.rejects(f.execute('night'), /shared deadline\/arm order\/control/); await f.control.cleanup().catch(() => {});
  assert.equal(f.records.length, 1); assert.equal(f.report.mobileWarmTrace623.instrumentationDeadline, 91000);
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.start').length, 1);
});

test('one-shot watchdog stops both facilities during a stuck original evaluation', async () => {
  // Hold the injected clock steady so the earlier, absolute watchdog wins the
  // timer race deterministically instead of the per-evaluation deadline.
  const f = await fixture({ stallDraw: true, fakeClock: true, limits: { captureMs: 40 } });
  await assert.rejects(f.execute('night'), /deadline|timeout|capture/); await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1);
  assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
  assert.equal(f.report.mobileWarmTrace623.captureComplete, false);
  assert(f.report.mobileWarmTrace623.failures.some(e => /watchdog/.test(e)));
});

test('original draw error is preserved while both tracing facilities stop', async () => {
  const f = await fixture({ failDraw: true }); await assert.rejects(f.execute('night'), /^Error: original draw failed$/);
  await f.control.cleanup().catch(() => {});
  assert.equal(f.calls.filter(c => c[0] === 'Tracing.end').length, 1); assert.equal(f.calls.filter(c => c[0] === 'Profiler.stop').length, 1);
});

test('per-arm ancestry, ordering, clocks, markers and graphics have independent negative controls', async () => {
  const f = await fixture(); await f.execute('night'); await f.control.cleanup();
  const arm = f.report.mobileWarmTrace623.arms[0], text = f.files.get('T623-mobile-night-baseline-trace.json').toString(), record = f.records[0];
  for (const [name, mutate, expected] of [
    ['lost indexed URL', p => { p.nodes[1].callFrame.url = 'unrelated://script'; }, /no CPU samples resolve/],
    ['reordered warm ancestry', p => { const a = p.nodes[3].callFrame.url; p.nodes[3].callFrame.url = p.nodes[5].callFrame.url; p.nodes[5].callFrame.url = a; }, /cold\/ten-warm order/],
    ['cross-arm sampled ancestry', p => { p.nodes[1].callFrame.url = p.nodes[1].callFrame.url.replace('baseline', 'candidate'); }, /cross-arm indexed CPU/],
    ['unaligned clocks', p => { p.startTime += 90000000; p.endTime += 90000000; }, /clocks or coverage/],
    ['profile without samples', p => { p.samples = []; p.timeDeltas = []; }, /CPU profile/]
  ]) {
    const p = clone(record.profile); mutate(p); assert.throws(() => trace.analyzeEvidence623(text, p, arm, trace.LIMITS), expected, name);
  }
  assert.throws(() => trace.analyzeEvidence623(JSON.stringify({ traceEvents: record.events.filter(e => e.cat !== 'gpu') }), record.profile, arm, trace.LIMITS), /compositor\/GPU/);
  assert.throws(() => trace.analyzeEvidence623(JSON.stringify({ traceEvents: [...record.events, record.events.find(e => e.name === 'TimeStamp')] }), record.profile, arm, trace.LIMITS), /duplicate/);
  assert.equal(f.control.routeTraceComplete({ stream: 'original-desktop-stream' }, true), false, 'later original desktop trace handling is preserved');
  assert.equal(f.control.routeTraceComplete({ stream: 'trace-1' }, true), true, 'a reused T623 stream is rejected even when a later legacy trace is pending');
  assert(f.report.mobileWarmTrace623.failures.some(message => /stale\/reused/.test(message)));
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

test('T623 reuses the unchanged supervisor bounds, restores after failure, and does not relax original status', async t => {
  const f = await fixture(); await f.execute('night');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'trace623-test-')); t.after(() => fs.rmSync(out, { recursive: true, force: true }));
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
