'use strict';
// One diagnostic invocation, two planned captures. Never invoke a release wrapper.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const mac = require('./native-mac-diagnostic.cjs'), portability = require('./native-portability-diagnostic.cjs');
const BASE_EMITTED_SHA256 = 'c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b';
const LIMITS = Object.freeze({ captureMs: 90000, operationMs: 10000, readMs: 30000, closeMs: 5000,
  traceBufferKiB: 32768, traceBytes: 64 * 1024 * 1024, profileBytes: 16 * 1024 * 1024,
  readChunkBytes: 1024 * 1024, readCalls: 256, events: 500000, profileSamples: 120000, samplingIntervalUs: 1000 });
const CATEGORIES = Object.freeze(['devtools.timeline', 'cc', 'gpu', 'blink', 'v8', 'blink.console', 'disabled-by-default-v8.gc']);
const LIMITATION = 'T623 instrumented diagnostic only. Two planned captures cover each original mobile-night cold/ten-warm burst, stopping after its original post-warm cache read and draining before its original RAF. Baseline drain changes later candidate state and scheduling. Budgets and the 90-second instrumentation deadline are shared. Unique sourceURL comments name existing evaluations without extra tasks inside either burst. Complete JSON does not establish full GPU completion; asynchronous work crossing capture boundaries remains unattributed. CPU samples cover observed execution, not exact draw boundaries or self time. Overlapping trace durations are not additive. GC category capability is required, but zero GC events is allowed and does not establish absence of allocation pressure. No result is release eligible.';

function installWarmLatch623() {
  let active = false, serial = 0, count = 0, losses = [];
  const loss = kind => { if (active) { count++; if (losses.length < 32) losses.push(kind); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') loss('visibilitychange:' + document.visibilityState); }, { passive: true });
  window.addEventListener('blur', () => loss('blur'), { passive: true });
  window.addEventListener('resize', () => loss('resize'), { passive: true });
  window.__mobileWarmLoss623 = Object.freeze({
    begin() { if (active) throw Error('T623 latch already armed'); active = true; serial++; count = 0; losses = [];
      if (document.visibilityState !== 'visible') loss('initial-hidden'); if (!document.hasFocus()) loss('initial-blur');
      return { active, serial, count, losses: [...losses] }; },
    end() { if (!active) throw Error('T623 latch not armed');
      if (document.visibilityState !== 'visible') loss('final-hidden'); if (!document.hasFocus()) loss('final-blur');
      active = false; return { active, serial, count, losses: [...losses] }; }
  });
}

function analyzeEvidence623(text, profile, arm, limits, totals = { events: 0, profileSamples: 0 }) {
  const fail = message => { throw Error('T623 measurement limit: ' + message); };
  let parsed; try { parsed = JSON.parse(text); } catch { fail('trace is not complete JSON'); }
  const events = Array.isArray(parsed) ? parsed : parsed.traceEvents;
  if (!Array.isArray(events) || !events.length) fail('missing trace events');
  totals.events += events.length;
  if (totals.events > limits.events) fail('cumulative trace event limit exceeded');
  if (Array.isArray(profile?.samples)) totals.profileSamples += profile.samples.length;
  if (totals.profileSamples > limits.profileSamples) fail('cumulative CPU sample limit exceeded');
  if (!profile || !Array.isArray(profile.nodes) || !profile.nodes.length || !Array.isArray(profile.samples) ||
      !profile.samples.length || profile.samples.length > limits.profileSamples || !Array.isArray(profile.timeDeltas) ||
      profile.samples.length !== profile.timeDeltas.length || !Number.isFinite(profile.startTime) ||
      !Number.isFinite(profile.endTime) || profile.endTime <= profile.startTime ||
      !profile.timeDeltas.every(Number.isFinite) ||
      !profile.nodes.every(node => node && Number.isSafeInteger(node.id) && node.id >= 0 &&
        node.callFrame && typeof node.callFrame.url === 'string' &&
        (node.children === undefined || Array.isArray(node.children))) ||
      !profile.samples.every(id => Number.isSafeInteger(id) && id >= 0)) fail('missing/malformed CPU profile');
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  if (nodes.size !== profile.nodes.length || profile.samples.some(id => !nodes.has(id)) ||
      !profile.nodes.some(node => /^http:\/\/127\.0\.0\.1:\d+\/index\.html/.test(node.callFrame?.url || ''))) fail('CPU profile does not identify the candidate document');
  const parents = new Map(), ancestors = new Map();
  for (const node of profile.nodes) for (const child of node.children || []) {
    if (!nodes.has(child) || parents.has(child)) fail('CPU profile tree is malformed');
    parents.set(child, node.id);
  }
  if (profile.nodes.filter(node => !parents.has(node.id)).length !== 1) fail('CPU profile tree must have one root');
  const urlsFor = id => {
    if (ancestors.has(id)) return ancestors.get(id);
    const seen = new Set(), urls = new Set(); let cursor = id;
    while (cursor !== undefined) {
      if (seen.has(cursor) || seen.size > 128) fail('CPU profile ancestry is cyclic or too deep');
      seen.add(cursor); const url = nodes.get(cursor).callFrame?.url;
      if (url) urls.add(url); cursor = parents.get(cursor);
    }
    ancestors.set(id, urls); return urls;
  };
  // Validate the complete supplied tree, including nodes not hit by the sampler.
  for (const node of profile.nodes) urlsFor(node.id);
  let time = profile.startTime;
  // Chrome DevTools CPUProfileDataModel.convertTimeDeltas()/sortSamples() keeps
  // signed cumulative timestamps paired with their sample IDs. Do not apply its
  // missing-sample heuristics, inferred bounds, clamping or timestamp extension.
  const cpu = profile.samples.map((id, originalIndex) => {
    time += profile.timeDeltas[originalIndex];
    if (!Number.isFinite(time) || time < profile.startTime || time > profile.endTime) fail('CPU timestamp outside original profile bounds');
    return { id, ts: time, originalIndex };
  }).sort((a, b) => a.ts - b.ts || a.originalIndex - b.originalIndex);
  const normalization = { method: 'signed-cumulative-microseconds; stable-sort(timestamp,originalIndex); sample-ID pairing preserved',
    negativeDeltaCount: profile.timeDeltas.filter(delta => delta < 0).length,
    reorderedCount: cpu.filter((sample, index) => sample.originalIndex !== index).length,
    originalIndices: cpu.map(sample => sample.originalIndex),
    originalProfileStartTimeUs: profile.startTime, originalProfileEndTimeUs: profile.endTime };
  const markers = new Map();
  for (const event of events) {
    const label = event.name === 'TimeStamp' ? event.args?.data?.message : null;
    if (typeof label !== 'string' || !label.startsWith('T623:')) continue;
    if (markers.has(label) || !Number.isFinite(event.ts) || !Number.isInteger(event.pid) || !Number.isInteger(event.tid)) fail('duplicate/malformed indexed trace marker');
    markers.set(label, event);
  }
  const expectedLabels = [], rows = [], graphics = [];
  if (!arm || !['baseline', 'candidate'].includes(arm.mode) || arm.samples.length !== 11 || !arm.postWarmCacheRead) fail('one original cold/ten-warm burst and cache read required');
  {
    expectedLabels.push(arm.startMarker);
    for (let i = 0; i < arm.samples.length; i++) {
      const row = arm.samples[i];
      if (row.kind !== (i ? 'warm' : 'cold') || row.index !== (i ? i - 1 : 0) || !Number.isFinite(row.durationMs) || row.durationMs < 0) fail('original cold/ten-warm sample order missing');
      if (row.sourceURL !== 't623://mobile-night/' + arm.mode + '/' + row.kind + '/' + row.index + '.js') fail('indexed sourceURL changed');
    }
    expectedLabels.push(arm.warmEndMarker);
  }
  if (markers.size !== 2 || expectedLabels.some(label => !markers.has(label))) fail('missing or cross-arm capture markers');
  const first = markers.get(expectedLabels[0]); let previous = -Infinity;
  for (const label of expectedLabels) {
    const event = markers.get(label);
    if (event.pid !== first.pid || event.tid !== first.tid || event.ts < previous) fail('marker thread/order changed');
    previous = event.ts;
  }
  if (profile.startTime > first.ts || profile.endTime < previous) fail('trace/profile clocks or coverage do not align');
  const js = events.filter(e => e.pid === first.pid && e.tid === first.tid && Number.isFinite(e.ts) && /^(FunctionCall|EvaluateScript|V8\.Execute|RunMicrotasks)$/.test(e.name));
  const gc = events.filter(e => e.pid === first.pid && Number.isFinite(e.ts) && /(?:^|[. ])(?:MinorGC|MajorGC|GC|Scavenge|MarkCompact)/i.test(e.name || ''));
  const allowedURLs = new Set(arm.samples.map(sample => sample.sourceURL));
  for (const sample of cpu) for (const url of urlsFor(sample.id)) {
    if (url.startsWith('t623://mobile-night/') && !allowedURLs.has(url)) fail('cross-arm indexed CPU evidence');
  }
  {
    const start = markers.get(arm.startMarker).ts, end = markers.get(arm.warmEndMarker).ts;
    if (!js.some(e => e.ts >= start && e.ts <= end) || !cpu.some(e => e.ts >= start && e.ts <= end)) fail('missing JavaScript/profile events for ' + arm.mode);
    const within = e => Number.isFinite(e.ts) && e.ts <= end && e.ts + Math.max(0, e.dur || 0) >= start;
    const count = category => events.filter(e => within(e) && String(e.cat || '').split(',').includes(category)).length;
    const observed = { mode: arm.mode, ccEvents: count('cc'), gpuEvents: count('gpu'),
      rendererCanvasEvents: events.filter(e => within(e) && e.pid === first.pid && /Canvas|Paint|LayerTreeHost/.test(e.name || '')).length };
    graphics.push(observed);
    if (!observed.ccEvents || !observed.gpuEvents || !observed.rendererCanvasEvents) fail('missing compositor/GPU/renderer-canvas evidence: ' + JSON.stringify(observed));
    let previousSampleEnd = start;
    const warmEnd = markers.get(arm.warmEndMarker).ts;
    for (const sample of arm.samples) {
      const selected = cpu.filter(s => urlsFor(s.id).has(sample.sourceURL)), counts = new Map();
      if (!selected.length) fail('no CPU samples resolve indexed evaluation ' + sample.sourceURL);
      const a = selected[0].ts, b = selected.at(-1).ts;
      if (a < previousSampleEnd || b >= warmEnd) fail('indexed CPU samples violate cold/ten-warm order or capture boundary');
      previousSampleEnd = b;
      for (const s of selected) counts.set(s.id, (counts.get(s.id) || 0) + 1);
      rows.push({ mode: arm.mode, kind: sample.kind, index: sample.index, originalDurationMs: sample.durationMs,
        sourceURL: sample.sourceURL, firstCpuSampleUs: a, lastCpuSampleUs: b, sampledSpanUs: b - a, cpuSampleCount: selected.length,
        cpuOriginalIndices: selected.map(sample => sample.originalIndex),
        sampledLeafNodes: [...counts].map(([id, samples]) => ({ id, samples, callFrame: nodes.get(id).callFrame })),
        matchingTraceURLRecords: events.filter(e => e.args?.data?.url === sample.sourceURL).length,
        javascriptEvents: js.filter(e => e.ts <= b && e.ts + Math.max(0, e.dur || 0) >= a).length,
        gcEvents: gc.filter(e => e.ts <= b && e.ts + Math.max(0, e.dur || 0) >= a).map(e => ({ name: e.name, ts: e.ts, dur: e.dur ?? null, tid: e.tid })) });
    }
  }
  return { mode: arm.mode, markerCount: markers.size, eventCount: events.length, profileSamples: cpu.length, normalization, rendererPid: first.pid,
    rendererTid: first.tid, cpuClockCoverageChecked: true, gcEventCount: gc.length, graphics, samples: rows,
    interpretation: 'SourceURL ancestry identifies statistical CPU samples from each existing evaluation. First/last samples bound only observed execution, not exact evaluation boundaries or draw self time. Overlapping spans are not additive.' };
}

// Embedded in emitted host code. No product function, Canvas API, clock or RAF is replaced.
async function createTrace623({ send, ev, browser, report, persist, errors, consoleErrors,
  boundaryValid, installLatch, analyze, limits, categories, limitation, save,
  run = require('node:child_process').spawnSync, now = Date.now }) {
  const state = report.mobileWarmTrace623 = { protocol: 'T623-mobile-night-two-bursts', instrumented: true,
    releaseEligible: false, limitation, limits, categories, arms: [], captureComplete: false, failures: [],
    totals: { traceBytes: 0, profileBytes: 0, readCalls: 0, readElapsedMs: 0, events: 0, profileSamples: 0 } };
  let current = null, deadline = Infinity, watchdog, expired = false, budgetFinished = false;
  const captures = [], usedStreams = new Set();
  const remember = message => { const text = 'T623 measurement limit: ' + message; state.failures.push(text); persist(); return Error(text); };
  const fail = message => { throw remember(message); };
  const bounded = (operation, ms, label) => new Promise((resolve, reject) => {
    if (!(ms > 0)) { reject(Error('T623 measurement limit: ' + label + ' deadline')); return; }
    const timer = setTimeout(() => reject(Error('T623 measurement limit: ' + label + ' timeout')), ms);
    Promise.resolve().then(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
  const remaining = () => budgetFinished ? Infinity : deadline - now();
  const call = (method, params = {}, ms = limits.operationMs, cleanup = false) =>
    bounded(() => send(method, params), cleanup ? ms : Math.min(ms, remaining()), method);
  const evaluated = expression => bounded(() => ev(expression), Math.min(limits.operationMs, remaining()), 'evaluation');
  const marker = label => evaluated('console.timeStamp(' + JSON.stringify(label) + ');true');
  const requireArm = mode => {
    if (expired || remaining() <= 0 || state.failures.length || !current || current.mode !== mode) fail('shared deadline/arm order/control lost');
  };
  async function boundary() {
    const command = args => run('/usr/bin/lsappinfo', args, { encoding: 'utf8',
      timeout: Math.min(limits.operationMs, Math.max(1, remaining())), killSignal: 'SIGKILL' });
    const front = command(['front']), appResult = front.status === 0 ? command(['info', '-only', 'pid,bundleid,name', front.stdout.trim()]) : { status: -1, stdout: '' };
    const app = String(appResult.stdout || ''), result = { frontExit: front.status, appExit: appResult.status, app,
      pid: Number(app.match(/"(?:pid|LSApplicationProcessIdentifier)"\s*=\s*(\d+)/i)?.[1]),
      bundle: app.match(/"CFBundleIdentifier"\s*=\s*"([^"]+)"/)?.[1] || null,
      window: await call('Browser.getWindowForTarget'),
      page: await evaluated('({visibility:document.visibilityState,focus:document.hasFocus(),width:innerWidth,height:innerHeight,dpr:devicePixelRatio,timeOrigin:performance.timeOrigin,viewport:__s603.viewport()})') };
    result.valid = boundaryValid(result, { width: 390, height: 844 }, report.nativeMac619.host, browser.pid);
    return result;
  }
  async function collect(capture, done) {
    if (!done?.stream) fail('missing trace stream for ' + capture.mode);
    const started = now(), chunks = []; let eof = false;
    try {
      if (done.dataLossOccurred !== false) fail('trace data-loss status missing or true');
      for (;;) {
        if (state.totals.readCalls >= limits.readCalls) fail('cumulative trace read-count limit exceeded');
        const remainingBytes = limits.traceBytes - state.totals.traceBytes;
        if (remainingBytes <= 0) fail('cumulative trace byte limit exceeded');
        const readTime = limits.readMs - state.totals.readElapsedMs - (now() - started);
        const size = Math.min(limits.readChunkBytes, remainingBytes);
        const row = await bounded(() => {
          state.totals.readCalls++; capture.readCalls++;
          return send('IO.read', { handle: done.stream, size });
        }, Math.min(limits.operationMs, readTime, remaining()), 'IO.read');
        const chunk = Buffer.from(row.data || '', row.base64Encoded ? 'base64' : 'utf8');
        state.totals.traceBytes += chunk.length; capture.traceBytes += chunk.length;
        if (chunk.length > size || state.totals.traceBytes > limits.traceBytes) fail('cumulative trace byte limit exceeded');
        chunks.push(chunk);
        if (state.totals.readElapsedMs + now() - started > limits.readMs) fail('cumulative trace read-time limit exceeded');
        if (row.eof) { eof = true; break; }
      }
      return Buffer.concat(chunks).toString('utf8');
    } finally {
      state.totals.readElapsedMs += Math.max(0, now() - started);
      capture.traceFile = 'T623-mobile-night-' + capture.mode + '-trace.' + (eof ? 'json' : 'partial');
      try { save(capture.traceFile, Buffer.concat(chunks)); }
      finally { await call('IO.close', { handle: done.stream }, limits.closeMs, true); }
      if (state.totals.readElapsedMs > limits.readMs) fail('cumulative trace read-time limit exceeded');
    }
  }
  function finishCapture(capture) {
    if (capture.finishPromise) return capture.finishPromise;
    capture.stopRequested = true;
    capture.finishPromise = (async () => {
      let profile, text, firstError = null;
      const stopped = await Promise.allSettled([
        capture.profileAttempt ? call('Profiler.stop', {}, limits.operationMs, true).then(result => { profile = result.profile; }) : Promise.resolve(),
        capture.traceAttempt ? call('Tracing.end', {}, limits.operationMs, true)
          .then(() => bounded(() => capture.done, limits.operationMs, 'tracingComplete ' + capture.mode))
          .then(done => collect(capture, done)).then(value => { text = value; }) : Promise.resolve()
      ]);
      for (const result of stopped) if (result.status === 'rejected') { state.failures.push(String(result.reason)); firstError ||= result.reason; }
      if (capture.profilerEnabled) {
        try { await call('Profiler.disable', {}, limits.closeMs, true); } catch (error) { state.failures.push(String(error)); firstError ||= error; }
      }
      if (profile) {
        const bytes = Buffer.from(JSON.stringify(profile));
        capture.profileBytes = bytes.length; state.totals.profileBytes += bytes.length;
        if (state.totals.profileBytes > limits.profileBytes) firstError ||= remember('cumulative CPU profile byte limit exceeded');
        else {
          capture.profileFile = 'T623-mobile-night-' + capture.mode + '-profile.json';
          try { save(capture.profileFile, bytes); } catch (error) { firstError ||= error; }
        }
      }
      if (firstError) throw firstError;
      if (expired || now() >= deadline) fail('shared instrumentation deadline exceeded');
      capture.correlation = analyze(text, profile, capture.arm, limits, state.totals);
      capture.correlationFile = 'T623-mobile-night-' + capture.mode + '-correlation.json';
      save(capture.correlationFile, JSON.stringify(capture.correlation, null, 2));
      capture.complete = true; capture.finishedAt = now();
      if (capture.finishedAt >= deadline) fail('shared instrumentation deadline exceeded');
      if (captures.length === 2 && captures.every(item => item.complete)) {
        budgetFinished = true; clearTimeout(watchdog); state.instrumentationFinishedAt = capture.finishedAt;
      }
      persist();
    })().catch(error => { capture.complete = false; state.captureComplete = false; state.failures.push(String(error)); persist(); throw error; });
    capture.finishPromise.catch(() => {}); return capture.finishPromise;
  }
  function makeCapture(arm) {
    const record = arm.capture = { mode: arm.mode, ordinal: captures.length + 1, traceBytes: 0, profileBytes: 0,
      readCalls: 0, complete: false, stopRequested: false, completeReceived: false };
    // Promise/resolver state stays out of persisted evidence.
    const capture = { ...record, arm, record };
    capture.done = new Promise((resolve, reject) => { capture.resolve = resolve; capture.reject = reject; });
    capture.done.catch(() => {});
    // Mutations to ordinary capture fields are reflected in the serializable receipt.
    for (const key of ['traceBytes', 'profileBytes', 'readCalls', 'complete', 'stopRequested', 'completeReceived',
      'traceFile', 'profileFile', 'correlation', 'correlationFile', 'finishedAt', 'stream']) {
      Object.defineProperty(capture, key, { get: () => record[key], set: value => { record[key] = value; }, configurable: true });
    }
    captures.push(capture); return capture;
  }
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installLatch.toString() + ')();' });
  return {
    routeTraceComplete(params, legacyPending) {
      const capture = captures.at(-1);
      if (params?.stream && usedStreams.has(params.stream)) {
        const error = remember('stale/reused trace completion stream'); capture?.reject(error); return true;
      }
      if (budgetFinished && legacyPending) return false; // Preserve later original desktop traces.
      if (!capture || !capture.stopRequested || capture.completeReceived) {
        const error = remember('early/duplicate/unowned trace completion'); capture?.reject(error); return true;
      }
      capture.completeReceived = true;
      if (!params?.stream) capture.reject(remember('missing trace completion stream'));
      else { usedStreams.add(params.stream); capture.stream = params.stream; capture.resolve(params); }
      return true;
    },
    async begin(phase, mode) {
      if (phase !== 'night') return;
      if (current || state.failures.length || mode !== ['baseline', 'candidate'][state.arms.length] ||
          (captures.length && !captures.at(-1).complete)) fail('exactly two planned ordered captures; no retry');
      current = { mode, width: 390, height: 844, dpr: 1, samples: [], qualified: false, postWarmCacheRead: false,
        startMarker: 'T623:' + mode + ':capture:start', warmEndMarker: 'T623:' + mode + ':warm:end' };
      state.arms.push(current);
      if (mode === 'baseline') {
        state.instrumentationStartedAt = now(); deadline = state.instrumentationDeadline = state.instrumentationStartedAt + limits.captureMs;
        watchdog = setTimeout(() => {
          expired = true; remember('shared capture watchdog expired');
          const active = captures.at(-1); if (active && !active.complete) void finishCapture(active);
        }, limits.captureMs);
        const available = await call('Tracing.getCategories');
        const availableCategories = Array.isArray(available.categories) ? available.categories : [];
        state.gcCapability = { requested: 'disabled-by-default-v8.gc', available: availableCategories.includes('disabled-by-default-v8.gc') };
        state.availableRequestedCategories = categories.filter(category => availableCategories.includes(category));
        if (!state.gcCapability.available) fail('GC trace category capability unavailable');
      }
      if (remaining() <= 0 || expired) fail('shared instrumentation deadline exhausted before ' + mode);
      current.before = await boundary(); persist();
      if (!current.before.valid || errors.length || consoleErrors.length) fail('foreground/viewport/runtime control before ' + mode);
      const capture = makeCapture(current);
      capture.profilerEnabled = true; await call('Profiler.enable');
      await call('Profiler.setSamplingInterval', { interval: limits.samplingIntervalUs });
      capture.profileAttempt = true; await call('Profiler.start');
      capture.traceAttempt = true; await call('Tracing.start', { transferMode: 'ReturnAsStream', streamFormat: 'json', streamCompression: 'none',
        traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: limits.traceBufferKiB, includedCategories: categories } });
      current.latchBefore = await evaluated('__mobileWarmLoss623.begin()');
      if (current.latchBefore.active !== true || current.latchBefore.count !== 0) fail('full arm latch not clean');
      await marker(current.startMarker); persist();
    },
    async sample(phase, mode, kind, index, expression) {
      if (phase !== 'night') return ev(expression);
      requireArm(mode);
      if (current.postWarmCacheRead || captures.at(-1).stopRequested) fail('sample after capture stop');
      const next = current.samples.length;
      if (kind !== (next ? 'warm' : 'cold') || index !== (next ? next - 1 : 0) || next > 10) fail('original cold/ten-warm order changed');
      const row = { kind, index, sourceURL: 't623://mobile-night/' + mode + '/' + kind + '/' + index + '.js' };
      const result = await bounded(() => ev(expression + '\n//# sourceURL=' + row.sourceURL), remaining(), 'original ' + kind + ' evaluation');
      row.durationMs = kind === 'cold' ? result.first : result; current.samples.push(row); return result;
    },
    async afterWarm(phase, mode, after) {
      if (phase !== 'night') return;
      requireArm(mode);
      if (current.samples.length !== 11 || current.postWarmCacheRead) fail('one post-warm cache read after eleven original evaluations required');
      current.postWarmCacheRead = true; current.postWarmCacheStats = after;
      await marker(current.warmEndMarker);
      await finishCapture(captures.at(-1));
      requireArm(mode);
    },
    rafResult(phase, mode, sample) {
      if (phase !== 'night') return;
      requireArm(mode);
      if (!captures.at(-1).complete || current.raf) fail('original RAF must follow completed trace-stream collection once');
      current.raf = sample;
    },
    async end(phase, mode, originalError) {
      if (phase !== 'night') return;
      let failure = originalError;
      try {
        requireArm(mode); current.after = await boundary(); current.latchAfter = await evaluated('__mobileWarmLoss623.end()');
        current.qualified = current.after.valid && current.after.page.timeOrigin === current.before.page.timeOrigin &&
          current.latchAfter.serial === current.latchBefore.serial && current.latchAfter.active === false &&
          current.latchAfter.count === 0 && current.samples.length === 11 && !!current.raf && captures.at(-1).complete &&
          !errors.length && !consoleErrors.length;
        persist();
        if (!current.qualified) fail('foreground/viewport/latch/runtime control over complete ' + mode + ' arm');
      } catch (error) { failure ||= error; state.failures.push(String(error)); }
      if (failure) {
        const capture = captures.at(-1);
        if (capture && !capture.complete) try { await finishCapture(capture); } catch (error) { failure ||= error; }
      }
      current = null;
      if (mode === 'candidate' && !failure) {
        state.captureComplete = state.arms.length === 2 && state.arms.every(arm => arm.qualified && arm.capture.complete) &&
          budgetFinished && !expired && !state.failures.length;
        persist();
      }
      if (failure && !originalError) throw failure;
    },
    complete() {
      if (!state.captureComplete || state.failures.length || current || captures.length !== 2 || !state.gcCapability?.available) fail('instrumented two-capture evidence incomplete');
    },
    async cleanup() {
      clearTimeout(watchdog);
      const results = await Promise.allSettled(captures.map(capture => finishCapture(capture)));
      const failed = results.find(result => result.status === 'rejected'); if (failed) throw failed.reason;
      if (state.arms.length && (!state.captureComplete || state.failures.length)) fail('two-capture cleanup has incomplete evidence');
    }
  };
}

function transformations() {
  const loop = "      for(const off of [true,false]){const mode=off?'baseline':'candidate',initial=await ev('(()=>{window.__noT603='+off+';const light=__s603.freezeVis('+time+');__s603.clear();const first=__s603.drawMs();return {light,first,before:__s603.cacheStats()};})()'),{light,first,before}=initial,warm=[];for(let i=0;i<10;i++)warm.push(await ev('__s603.drawMs()'));const after=await ev('__s603.cacheStats()'),frames=await raf(5000),last=await ev('__s603.cacheStats()');pair[mode]={light,first,warm,warmP95:pct(warm,.95),before,after,last,warmBakeDelta:after.bakes-before.bakes,rafBakeDelta:last.bakes-after.bakes,raf:frames};}";
  let instrumented = loop.replace("const mode=off?'baseline':'candidate',initial=await ev(",
    "const mode=off?'baseline':'candidate';let originalError623=null;try{await mobileWarmTrace623.begin(phase,mode);const initial=await mobileWarmTrace623.sample(phase,mode,'cold',0,")
    .replace("warm.push(await ev('__s603.drawMs()'))", "warm.push(await mobileWarmTrace623.sample(phase,mode,'warm',i,'__s603.drawMs()'))")
    .replace(",frames=await raf(5000),last=await ev('__s603.cacheStats()');", ";await mobileWarmTrace623.afterWarm(phase,mode,after);const frames=await raf(5000);mobileWarmTrace623.rafResult(phase,mode,frames);const last=await ev('__s603.cacheStats()');");
  instrumented = instrumented.slice(0, -1) + '}catch(error){originalError623=error;throw error;}finally{await mobileWarmTrace623.end(phase,mode,originalError623);}}';
  const init = "    const nativeMacQualifier619=await require(path.join(ROOT,'tools/pages/native-mac-diagnostic.cjs')).createQualifier({send,ev,browser,report,persist,errors,consoleErrors});";
  return [
    { label: 'outer-scoped diagnostic cleanup handle', from: 'let browser,ws,exitCode=2,server,captureFailure=null;',
      to: 'let browser,ws,exitCode=2,server,captureFailure=null,mobileWarmTrace623=null;' },
    { label: 'route planned capture completions without replacing original desktop trace handling', from: "}else if(m.method==='Tracing.tracingComplete'&&traceResolve603){",
      to: "}else if(m.method==='Tracing.tracingComplete'&&mobileWarmTrace623?.routeTraceComplete(m.params,!!traceResolve603)){}else if(m.method==='Tracing.tracingComplete'&&traceResolve603){" },
    { label: 'install independent full arm latch and cumulative bounded collector', from: init, to: init + '\n    mobileWarmTrace623=await (' + createTrace623.toString() + ')({send,ev,browser,report,persist,errors,consoleErrors,boundaryValid:require(path.join(ROOT,"tools/pages/native-mac-diagnostic.cjs")).boundaryValid,installLatch:(' + installWarmLatch623.toString() + '),analyze:(' + analyzeEvidence623.toString() + '),limits:' + JSON.stringify(LIMITS) + ',categories:' + JSON.stringify(CATEGORIES) + ',limitation:' + JSON.stringify(LIMITATION) + ',save:(name,bytes)=>fs.writeFileSync(path.join(OUT,name),bytes)});' },
    { label: 'trace original mobile-night cold ten-warm bursts and collect before original RAF', from: loop, to: instrumented },
    { label: 'require complete instrumented evidence before unchanged final gates', from: '    nativeMacQualifier619.complete();',
      to: '    mobileWarmTrace623.complete();nativeMacQualifier619.complete();' },
    { label: 'always stop diagnostic tracing and profiling in original finally', from: 'finally{report.exceptions=errors;',
      to: "finally{if(mobileWarmTrace623){try{await mobileWarmTrace623.cleanup();}catch(error){report.status='failed';report.mobileWarmTrace623.cleanupError=String(error);exitCode=2;}}report.exceptions=errors;" }
  ];
}

function build(input) {
  const base = portability.build(input);
  if (base.sha256 !== BASE_EMITTED_SHA256) throw Error('T623 exact T620 emitted base identity drift');
  let source = base.source; const edits = transformations(), changes = [];
  for (const edit of edits) {
    if (source.split(edit.from).length !== 2) throw Error('T623 exact source anchor drift: ' + edit.label);
    source = source.replace(edit.from, edit.to); changes.push({ label: edit.label, occurrences: 1, beforeSHA256: mac.sha256(edit.from), afterSHA256: mac.sha256(edit.to) });
  }
  let reversed = source;
  for (const edit of [...edits].reverse()) {
    if (reversed.split(edit.to).length !== 2) throw Error('T623 inverse anchor drift: ' + edit.label);
    reversed = reversed.replace(edit.to, edit.from);
  }
  if (reversed !== base.source) throw Error('T623 edit outside reversible allowlist');
  const raf = base.source.match(/    const raf=async ms=>\{[^\n]+/)[0];
  if (source.split(raf).length !== 2) throw Error('T623 changed original nine-window RAF helper');
  for (const assertion of base.source.match(/(?:check|perfCheck)\([^\n]*?\);/g)) if (!source.includes(assertion)) throw Error('T623 changed original assertion: ' + assertion);
  new Function('require', '__filename', '__dirname', source);
  return { ...base, source, sha256: mac.sha256(source), traceBaseEmittedSHA256: base.sha256,
    traceAdapterSHA256: mac.sha256(fs.readFileSync(__filename)), traceChanges: changes, limitation623: LIMITATION,
    originalTimingIsInstrumented: { mobile: true, desktop: false }, traceLimits: LIMITS };
}

function diagnosticComplete(report) {
  const inner = report.innerSummary, trace = inner?.mobileWarmTrace623, windows = inner?.nativeMac619?.windows;
  return Boolean(report.completed && report.cleanupVerified && report.profileRemoved && report.restored &&
    !report.inner?.timedOut && !report.inner?.aborted && !report.inner?.error &&
    inner?.coverage?.core === true && inner.nativeMac619?.complete === true && windows?.length === 9 && windows.every(w => w.qualified) &&
    trace?.captureComplete === true && trace.failures?.length === 0 && !trace.cleanupError && trace.gcCapability?.available === true &&
    trace.instrumentationFinishedAt < trace.instrumentationDeadline &&
    trace.totals?.traceBytes <= LIMITS.traceBytes && trace.totals?.profileBytes <= LIMITS.profileBytes &&
    trace.totals?.readCalls <= LIMITS.readCalls && trace.totals?.readElapsedMs <= LIMITS.readMs &&
    trace.totals?.events <= LIMITS.events && trace.totals?.profileSamples <= LIMITS.profileSamples &&
    trace.arms?.length === 2 && trace.arms.every((a, i) => a.mode === ['baseline', 'candidate'][i] && a.qualified && a.samples.length === 11 &&
      a.capture?.complete === true && a.capture.correlation?.samples?.length === 11 &&
      a.samples[0].durationMs === inner.mobilePerformance?.night?.[a.mode]?.first &&
      JSON.stringify(a.samples.slice(1).map(s => s.durationMs)) === JSON.stringify(inner.mobilePerformance?.night?.[a.mode]?.warm) &&
      JSON.stringify(a.raf) === JSON.stringify(inner.mobilePerformance?.night?.[a.mode]?.raf)));
}

async function supervise(options = {}) {
  const built = build();
  if (options.built && (options.built.sha256 !== built.sha256 || options.built.source !== built.source)) throw Error('T623 supplied adapter differs from pinned composition');
  const raw = await mac.supervise({ ...options, built });
  const result = { ...raw, instrumentedDiagnostic: true, diagnosticTraceCompleted: diagnosticComplete(raw),
    collectionCompleted: false, releaseGatePassed: false, releaseEligible: false, limitation623: LIMITATION,
    traceAdapterSHA256: built.traceAdapterSHA256, traceBaseEmittedSHA256: BASE_EMITTED_SHA256 };
  fs.writeFileSync(path.join(path.resolve(options.out), 'mobile-warm-trace623-supervisor.json'), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('MOBILE_WARM_TRACE623_OVERLAY_OK ' + build().sha256); return; }
  if (process.argv.includes('--self-test')) { const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'mobile-warm-trace623.test.cjs')], { stdio: 'inherit' }); process.exitCode = r.status === 0 ? 0 : 2; return; }
  if (process.argv.some(a => a.startsWith('--inner='))) throw Error('Only the unchanged T619 supervisor launches instrumented source');
  if (process.argv.some(a => a.startsWith('--phase=') && a !== '--phase=core')) throw Error('Only the full original core flow is permitted');
  const out = process.argv.find(a => a.startsWith('--out=')); if (!out) throw Error('Explicit --out= is required');
  const controller = new AbortController(), stop = () => controller.abort(); process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const r = await supervise({ out: out.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('MOBILE_WARM_TRACE623_DIAGNOSTIC ' + JSON.stringify({ status: r.status, diagnosticTraceCompleted: r.diagnosticTraceCompleted, releaseEligible: false }));
    process.exitCode = r.status === 'passed' && r.diagnosticTraceCompleted ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}
module.exports = { BASE_EMITTED_SHA256, LIMITS, CATEGORIES, LIMITATION, installWarmLatch623, analyzeEvidence623,
  createTrace623, transformations, build, diagnosticComplete, supervise };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 2; });
