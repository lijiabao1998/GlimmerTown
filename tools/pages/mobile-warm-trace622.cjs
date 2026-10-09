'use strict';
// One instrumented causal capture. Never invoke a release or deployment wrapper.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const mac = require('./native-mac-diagnostic.cjs'), portability = require('./native-portability-diagnostic.cjs');
const BASE_EMITTED_SHA256 = 'c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b';
const LIMITS = Object.freeze({ captureMs: 90000, operationMs: 10000, readMs: 30000, closeMs: 5000,
  traceBufferKiB: 32768, traceBytes: 64 * 1024 * 1024, profileBytes: 16 * 1024 * 1024,
  readChunkBytes: 1024 * 1024, readCalls: 256, events: 500000, profileSamples: 120000, samplingIntervalUs: 1000 });
const CATEGORIES = Object.freeze(['devtools.timeline', 'cc', 'gpu', 'blink', 'v8', 'blink.console', 'disabled-by-default-v8.gc']);
const LIMITATION = 'T622 instrumented diagnostic only. A single continuous trace and CPU profile span the original baseline then candidate mobile-night arms. Unique sourceURL comments identify existing evaluations; no extra browser task is inserted between the ten warm evaluations. Profiling, tracing and arm/RAF boundary markers may perturb scheduling, GC and timing. Indexed CPU samples identify only sampled portions of an evaluation, not exact start/end or draw CPU self time. Overlapping trace durations must not be summed. Zero observed GC events does not establish absence of allocation pressure. Native OS activation is checked only at boundaries. No result is eligible for release acceptance or deployment.';

function installWarmLatch622() {
  let active = false, serial = 0, count = 0, losses = [];
  const loss = kind => { if (active) { count++; if (losses.length < 32) losses.push(kind); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') loss('visibilitychange:' + document.visibilityState); }, { passive: true });
  window.addEventListener('blur', () => loss('blur'), { passive: true });
  window.addEventListener('resize', () => loss('resize'), { passive: true });
  window.__mobileWarmLoss622 = Object.freeze({
    begin() { if (active) throw Error('T622 latch already armed'); active = true; serial++; count = 0; losses = [];
      if (document.visibilityState !== 'visible') loss('initial-hidden'); if (!document.hasFocus()) loss('initial-blur');
      return { active, serial, count, losses: [...losses] }; },
    end() { if (!active) throw Error('T622 latch not armed');
      if (document.visibilityState !== 'visible') loss('final-hidden'); if (!document.hasFocus()) loss('final-blur');
      active = false; return { active, serial, count, losses: [...losses] }; }
  });
}

function analyzeEvidence622(text, profile, arms, limits) {
  const fail = message => { throw Error('T622 measurement limit: ' + message); };
  let parsed; try { parsed = JSON.parse(text); } catch { fail('trace is not complete JSON'); }
  const events = Array.isArray(parsed) ? parsed : parsed.traceEvents;
  if (!Array.isArray(events) || !events.length || events.length > limits.events) fail('missing/oversized trace events');
  if (!profile || !Array.isArray(profile.nodes) || !profile.nodes.length || !Array.isArray(profile.samples) ||
      !profile.samples.length || profile.samples.length > limits.profileSamples || !Array.isArray(profile.timeDeltas) ||
      profile.samples.length !== profile.timeDeltas.length || !Number.isFinite(profile.startTime) ||
      !Number.isFinite(profile.endTime) || profile.endTime <= profile.startTime ||
      !profile.timeDeltas.every(t => Number.isFinite(t) && t >= 0)) fail('missing/malformed CPU profile');
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  if (nodes.size !== profile.nodes.length || profile.samples.some(id => !nodes.has(id)) ||
      !profile.nodes.some(node => /^http:\/\/127\.0\.0\.1:\d+\/index\.html/.test(node.callFrame?.url || ''))) fail('CPU profile does not identify the candidate document');
  const parents = new Map(), ancestors = new Map();
  for (const node of profile.nodes) for (const child of node.children || []) {
    if (!nodes.has(child) || parents.has(child)) fail('CPU profile tree is malformed');
    parents.set(child, node.id);
  }
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
  let time = profile.startTime;
  const cpu = profile.samples.map((id, index) => ({ id, ts: time += profile.timeDeltas[index] }));
  const markers = new Map();
  for (const event of events) {
    const label = event.name === 'TimeStamp' ? event.args?.data?.message : null;
    if (typeof label !== 'string' || !label.startsWith('T622:')) continue;
    if (markers.has(label) || !Number.isFinite(event.ts) || !Number.isInteger(event.pid) || !Number.isInteger(event.tid)) fail('duplicate/malformed indexed trace marker');
    markers.set(label, event);
  }
  const expectedLabels = [], rows = [], graphics = [];
  if (arms.length !== 2 || arms.some((arm, i) => arm.mode !== ['baseline', 'candidate'][i] || !arm.qualified || arm.samples.length !== 11)) fail('both complete qualified original arms are required');
  for (const arm of arms) {
    expectedLabels.push(arm.startMarker);
    for (let i = 0; i < arm.samples.length; i++) {
      const row = arm.samples[i];
      if (row.kind !== (i ? 'warm' : 'cold') || row.index !== (i ? i - 1 : 0) || !Number.isFinite(row.durationMs) || row.durationMs < 0) fail('original cold/ten-warm sample order missing');
      if (row.sourceURL !== 't622://mobile-night/' + arm.mode + '/' + row.kind + '/' + row.index + '.js') fail('indexed sourceURL changed');
    }
    expectedLabels.push(arm.rafStartMarker, arm.rafEndMarker, arm.endMarker);
  }
  if (markers.size !== expectedLabels.length || expectedLabels.some(label => !markers.has(label))) fail('missing indexed sample/RAF/arm markers');
  const first = markers.get(expectedLabels[0]); let previous = -Infinity;
  for (const label of expectedLabels) {
    const event = markers.get(label);
    if (event.pid !== first.pid || event.tid !== first.tid || event.ts < previous) fail('marker thread/order changed');
    previous = event.ts;
  }
  if (profile.startTime > first.ts || profile.endTime < previous || cpu.at(-1).ts > profile.endTime + 2 * limits.samplingIntervalUs) fail('trace/profile clocks or coverage do not align');
  const js = events.filter(e => e.pid === first.pid && e.tid === first.tid && Number.isFinite(e.ts) && /^(FunctionCall|EvaluateScript|V8\.Execute|RunMicrotasks)$/.test(e.name));
  const gc = events.filter(e => e.pid === first.pid && Number.isFinite(e.ts) && /(?:^|[. ])(?:MinorGC|MajorGC|GC|Scavenge|MarkCompact)/i.test(e.name || ''));
  for (const arm of arms) {
    const start = markers.get(arm.startMarker).ts, end = markers.get(arm.endMarker).ts;
    if (!js.some(e => e.ts >= start && e.ts <= end) || !cpu.some(e => e.ts >= start && e.ts <= end)) fail('missing JavaScript/profile events for ' + arm.mode);
    const within = e => Number.isFinite(e.ts) && e.ts <= end && e.ts + Math.max(0, e.dur || 0) >= start;
    const count = category => events.filter(e => within(e) && String(e.cat || '').split(',').includes(category)).length;
    const observed = { mode: arm.mode, ccEvents: count('cc'), gpuEvents: count('gpu'),
      rendererCanvasEvents: events.filter(e => within(e) && e.pid === first.pid && /Canvas|Paint|LayerTreeHost/.test(e.name || '')).length };
    graphics.push(observed);
    if (!observed.ccEvents || !observed.gpuEvents || !observed.rendererCanvasEvents) fail('missing compositor/GPU/renderer-canvas evidence: ' + JSON.stringify(observed));
    let previousSampleEnd = start;
    const rafStart = markers.get(arm.rafStartMarker).ts;
    for (const sample of arm.samples) {
      const selected = cpu.filter(s => urlsFor(s.id).has(sample.sourceURL)), counts = new Map();
      if (!selected.length) fail('no CPU samples resolve indexed evaluation ' + sample.sourceURL);
      const a = selected[0].ts, b = selected.at(-1).ts;
      if (a < previousSampleEnd || b >= rafStart) fail('indexed CPU samples violate cold/ten-warm order or extend into RAF');
      previousSampleEnd = b;
      for (const s of selected) counts.set(s.id, (counts.get(s.id) || 0) + 1);
      rows.push({ mode: arm.mode, kind: sample.kind, index: sample.index, originalDurationMs: sample.durationMs,
        sourceURL: sample.sourceURL, firstCpuSampleUs: a, lastCpuSampleUs: b, sampledSpanUs: b - a, cpuSampleCount: selected.length,
        sampledLeafNodes: [...counts].map(([id, samples]) => ({ id, samples, callFrame: nodes.get(id).callFrame })),
        matchingTraceURLRecords: events.filter(e => e.args?.data?.url === sample.sourceURL).length,
        javascriptEvents: js.filter(e => e.ts <= b && e.ts + Math.max(0, e.dur || 0) >= a).length,
        gcEvents: gc.filter(e => e.ts <= b && e.ts + Math.max(0, e.dur || 0) >= a).map(e => ({ name: e.name, ts: e.ts, dur: e.dur ?? null, tid: e.tid })) });
    }
  }
  return { markerCount: markers.size, eventCount: events.length, profileSamples: cpu.length, rendererPid: first.pid,
    rendererTid: first.tid, cpuClockCoverageChecked: true, gcEventCount: gc.length, graphics, samples: rows,
    interpretation: 'SourceURL ancestry identifies statistical CPU samples from each existing evaluation. First/last samples bound only observed execution, not exact evaluation boundaries or draw self time. Overlapping spans are not additive.' };
}

// Embedded in emitted host code. No product function, Canvas API, clock or RAF is replaced.
async function createTrace622({ send, ev, browser, report, persist, errors, consoleErrors, waitTrace, clearTrace,
  boundaryValid, installLatch, analyze, limits, categories, limitation, save,
  run = require('node:child_process').spawnSync, now = Date.now }) {
  const state = report.mobileWarmTrace622 = { protocol: 'T622-mobile-night-warm-causal', instrumented: true,
    releaseEligible: false, limitation, limits, categories, arms: [], captureComplete: false, failures: [] };
  let current = null, deadline = Infinity, watchdog, tracePromise, traceAttempt = false, profileAttempt = false;
  let finishPromise = null, expired = false;
  const fail = message => { const text = 'T622 measurement limit: ' + message; state.failures.push(text); persist(); throw Error(text); };
  const bounded = (operation, milliseconds, label) => new Promise((resolve, reject) => {
    if (!(milliseconds > 0)) { reject(Error('T622 measurement limit: ' + label + ' deadline')); return; }
    const timer = setTimeout(() => reject(Error('T622 measurement limit: ' + label + ' timeout')), milliseconds);
    Promise.resolve().then(operation).then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
  const call = (method, params = {}, ms = limits.operationMs) => bounded(() => send(method, params), ms, method);
  const evaluated = expression => bounded(() => ev(expression), Math.min(limits.operationMs, deadline - now()), 'indexed evaluation');
  const requireActive = mode => { if (expired || !current || current.mode !== mode || finishPromise) fail('capture deadline/order lost'); };
  const marker = async label => { await evaluated('console.timeStamp(' + JSON.stringify(label) + ');true'); };
  async function boundary() {
    const options = { encoding: 'utf8', timeout: Math.min(limits.operationMs, Math.max(1, deadline - now())), killSignal: 'SIGKILL' };
    const f = run('/usr/bin/lsappinfo', ['front'], options);
    const a = f.status === 0 ? run('/usr/bin/lsappinfo', ['info', '-only', 'pid,bundleid,name', f.stdout.trim()], options) : { status: -1, stdout: '' };
    const app = String(a.stdout || ''), b = { frontExit: f.status, appExit: a.status, app,
      pid: Number(app.match(/"(?:pid|LSApplicationProcessIdentifier)"\s*=\s*(\d+)/i)?.[1]),
      bundle: app.match(/"CFBundleIdentifier"\s*=\s*"([^"]+)"/)?.[1] || null,
      window: await call('Browser.getWindowForTarget'),
      page: await evaluated('({visibility:document.visibilityState,focus:document.hasFocus(),width:innerWidth,height:innerHeight,dpr:devicePixelRatio,timeOrigin:performance.timeOrigin,viewport:__s603.viewport()})') };
    b.valid = boundaryValid(b, { width: 390, height: 844 }, report.nativeMac619.host, browser.pid);
    return b;
  }
  async function collect(done) {
    if (!done?.stream) fail('missing trace stream');
    const end = now() + limits.readMs, chunks = []; let bytes = 0, complete = false, calls = 0;
    try {
      if (done.dataLossOccurred === true) fail('Chrome trace data loss');
      for (; calls < limits.readCalls;) {
        calls++;
        const row = await call('IO.read', { handle: done.stream, size: limits.readChunkBytes }, Math.min(limits.operationMs, end - now()));
        const chunk = Buffer.from(row.data || '', row.base64Encoded ? 'base64' : 'utf8');
        if (bytes + chunk.length > limits.traceBytes) fail('trace byte limit exceeded');
        bytes += chunk.length; chunks.push(chunk);
        if (row.eof) { complete = true; break; }
      }
      if (!complete) fail('trace read-count limit exceeded');
      return Buffer.concat(chunks).toString('utf8');
    } finally {
      state.traceBytes = bytes; state.traceReadCalls = calls;
      state.traceFile = complete ? 'T622-mobile-night-trace.json' : 'T622-mobile-night-trace.partial';
      try { save(state.traceFile, Buffer.concat(chunks)); }
      finally { await call('IO.close', { handle: done.stream }, limits.closeMs); }
    }
  }
  function finishCapture() {
    if (finishPromise) return finishPromise;
    clearTimeout(watchdog);
    finishPromise = (async () => {
      let profile, text, stopError = null;
      // Stop both facilities even if one fails. Never restart either one.
      const results = await Promise.allSettled([
        profileAttempt ? call('Profiler.stop').then(r => { profile = r.profile; }) : Promise.resolve(),
        traceAttempt ? call('Tracing.end').then(() => bounded(() => tracePromise, limits.operationMs, 'tracingComplete')).then(collect).then(value => { text = value; }) : Promise.resolve()
      ]);
      for (const r of results) if (r.status === 'rejected') { state.failures.push(String(r.reason)); stopError ||= r.reason; }
      clearTrace();
      if (profileAttempt) {
        try { await call('Profiler.disable', {}, limits.closeMs); } catch (e) { state.failures.push(String(e)); stopError ||= e; }
      }
      if (profile) {
        const bytes = Buffer.from(JSON.stringify(profile));
        if (bytes.length > limits.profileBytes) { state.failures.push('T622 measurement limit: CPU profile byte limit exceeded'); stopError ||= Error(state.failures.at(-1)); }
        else { state.profileFile = 'T622-mobile-night-profile.json'; state.profileBytes = bytes.length; save(state.profileFile, bytes); }
      }
      if (stopError) throw stopError;
      if (expired) fail('capture exceeded its one-shot deadline');
      state.correlation = analyze(text, profile, state.arms, limits);
      state.correlationFile = 'T622-mobile-night-correlation.json'; save(state.correlationFile, JSON.stringify(state.correlation, null, 2));
      state.captureComplete = true; persist();
    })().catch(error => { state.captureComplete = false; state.failures.push(String(error)); persist(); throw error; });
    // The one-shot watchdog may initiate cleanup while original CDP work is pending.
    // Keep its failure observed; the original arm/finally will await it and fail.
    finishPromise.catch(() => {}); return finishPromise;
  }
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installLatch.toString() + ')();' });
  return {
    async begin(phase, mode) {
      if (phase !== 'night') return;
      if (current || mode !== ['baseline', 'candidate'][state.arms.length] || finishPromise) fail('one baseline then one candidate arm only');
      current = { mode, width: 390, height: 844, dpr: 1, samples: [], qualified: false,
        startMarker: 'T622:' + mode + ':arm:start', endMarker: 'T622:' + mode + ':arm:end',
        rafStartMarker: 'T622:' + mode + ':raf:start', rafEndMarker: 'T622:' + mode + ':raf:end' };
      state.arms.push(current); current.before = await boundary(); persist();
      if (!current.before.valid || errors.length || consoleErrors.length) fail('foreground/viewport/runtime control before ' + mode);
      if (mode === 'baseline') {
        await call('Profiler.enable'); await call('Profiler.setSamplingInterval', { interval: limits.samplingIntervalUs });
        deadline = now() + limits.captureMs;
        watchdog = setTimeout(() => { expired = true; state.failures.push('T622 measurement limit: capture watchdog expired'); persist(); void finishCapture(); }, limits.captureMs);
        profileAttempt = true; await call('Profiler.start');
        tracePromise = waitTrace(); traceAttempt = true;
        await call('Tracing.start', { transferMode: 'ReturnAsStream', streamFormat: 'json', streamCompression: 'none',
          traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: limits.traceBufferKiB, includedCategories: categories } });
      }
      current.latchBefore = await evaluated('__mobileWarmLoss622.begin()');
      if (current.latchBefore.active !== true || current.latchBefore.count !== 0) fail('warm interval latch not clean');
      await marker(current.startMarker); persist();
    },
    async sample(phase, mode, kind, index, expression) {
      if (phase !== 'night') return ev(expression);
      requireActive(mode);
      const next = current.samples.length;
      if (kind !== (next ? 'warm' : 'cold') || index !== (next ? next - 1 : 0) || next > 10) fail('original cold/ten-warm order changed');
      const row = { kind, index, sourceURL: 't622://mobile-night/' + mode + '/' + kind + '/' + index + '.js' };
      // One original evaluation only; no intervening marker/CDP tasks. The added
      // comment names the script without changing its measured expression.
      const result = await bounded(() => ev(expression + '\n//# sourceURL=' + row.sourceURL), deadline - now(), 'original ' + kind + ' evaluation');
      row.durationMs = kind === 'cold' ? result.first : result; current.samples.push(row);
      return result;
    },
    async rafMark(phase, mode, end, sample) {
      if (phase !== 'night') return;
      requireActive(mode); if (current.samples.length !== 11) fail('RAF must follow original eleven draws');
      await marker(end ? current.rafEndMarker : current.rafStartMarker);
      if (end) current.raf = sample;
    },
    async end(phase, mode, originalError) {
      if (phase !== 'night') return;
      let failure = originalError;
      try {
        requireActive(mode); current.after = await boundary(); current.latchAfter = await evaluated('__mobileWarmLoss622.end()');
        current.qualified = current.after.valid && current.after.page.timeOrigin === current.before.page.timeOrigin &&
          current.latchAfter.serial === current.latchBefore.serial && current.latchAfter.active === false &&
          current.latchAfter.count === 0 && current.samples.length === 11 && !!current.raf && !errors.length && !consoleErrors.length;
        await marker(current.endMarker); persist();
        if (!current.qualified) fail('foreground/viewport/latch/runtime control over complete ' + mode + ' arm');
      } catch (e) { failure ||= e; state.failures.push(String(e)); }
      current = null;
      if (failure || mode === 'candidate') {
        try { await finishCapture(); } catch (e) { failure ||= e; }
      }
      if (failure && !originalError) throw failure;
    },
    complete() { if (!state.captureComplete || state.failures.length || current || state.arms.length !== 2) fail('instrumented capture incomplete'); },
    async cleanup() {
      if (traceAttempt || profileAttempt) await finishCapture();
      else if (state.arms.length) fail('capture never started');
    }
  };
}

function transformations() {
  const loop = "      for(const off of [true,false]){const mode=off?'baseline':'candidate',initial=await ev('(()=>{window.__noT603='+off+';const light=__s603.freezeVis('+time+');__s603.clear();const first=__s603.drawMs();return {light,first,before:__s603.cacheStats()};})()'),{light,first,before}=initial,warm=[];for(let i=0;i<10;i++)warm.push(await ev('__s603.drawMs()'));const after=await ev('__s603.cacheStats()'),frames=await raf(5000),last=await ev('__s603.cacheStats()');pair[mode]={light,first,warm,warmP95:pct(warm,.95),before,after,last,warmBakeDelta:after.bakes-before.bakes,rafBakeDelta:last.bakes-after.bakes,raf:frames};}";
  let instrumented = loop.replace("const mode=off?'baseline':'candidate',initial=await ev(",
    "const mode=off?'baseline':'candidate';let originalError622=null;try{await mobileWarmTrace622.begin(phase,mode);const initial=await mobileWarmTrace622.sample(phase,mode,'cold',0,")
    .replace("warm.push(await ev('__s603.drawMs()'))", "warm.push(await mobileWarmTrace622.sample(phase,mode,'warm',i,'__s603.drawMs()'))")
    .replace(",frames=await raf(5000),last=await ev('__s603.cacheStats()');", ";await mobileWarmTrace622.rafMark(phase,mode,false);const frames=await raf(5000);await mobileWarmTrace622.rafMark(phase,mode,true,frames);const last=await ev('__s603.cacheStats()');");
  instrumented = instrumented.slice(0, -1) + '}catch(error){originalError622=error;throw error;}finally{await mobileWarmTrace622.end(phase,mode,originalError622);}}';
  const init = "    const nativeMacQualifier619=await require(path.join(ROOT,'tools/pages/native-mac-diagnostic.cjs')).createQualifier({send,ev,browser,report,persist,errors,consoleErrors});";
  return [
    { label: 'outer-scoped diagnostic cleanup handle', from: 'let browser,ws,exitCode=2,server,captureFailure=null;',
      to: 'let browser,ws,exitCode=2,server,captureFailure=null,mobileWarmTrace622=null;' },
    { label: 'install independent warm latch and bounded collector', from: init, to: init + '\n    mobileWarmTrace622=await (' + createTrace622.toString() + ')({send,ev,browser,report,persist,errors,consoleErrors,waitTrace:()=>{if(traceResolve603)throw Error("T622 overlapping trace");return new Promise(resolve=>{traceResolve603=resolve;});},clearTrace:()=>{traceResolve603=null;},boundaryValid:require(path.join(ROOT,"tools/pages/native-mac-diagnostic.cjs")).boundaryValid,installLatch:(' + installWarmLatch622.toString() + '),analyze:(' + analyzeEvidence622.toString() + '),limits:' + JSON.stringify(LIMITS) + ',categories:' + JSON.stringify(CATEGORIES) + ',limitation:' + JSON.stringify(LIMITATION) + ',save:(name,bytes)=>fs.writeFileSync(path.join(OUT,name),bytes)});' },
    { label: 'trace original mobile-night cold ten-warm and RAF sequence only', from: loop, to: instrumented },
    { label: 'require complete instrumented evidence before unchanged final gates', from: '    nativeMacQualifier619.complete();',
      to: '    mobileWarmTrace622.complete();nativeMacQualifier619.complete();' },
    { label: 'always stop diagnostic tracing and profiling in original finally', from: 'finally{report.exceptions=errors;',
      to: "finally{if(mobileWarmTrace622){try{await mobileWarmTrace622.cleanup();}catch(error){report.status='failed';report.mobileWarmTrace622.cleanupError=String(error);exitCode=2;}}report.exceptions=errors;" }
  ];
}

function build(input) {
  const base = portability.build(input);
  if (base.sha256 !== BASE_EMITTED_SHA256) throw Error('T622 exact T620 emitted base identity drift');
  let source = base.source; const edits = transformations(), changes = [];
  for (const edit of edits) {
    if (source.split(edit.from).length !== 2) throw Error('T622 exact source anchor drift: ' + edit.label);
    source = source.replace(edit.from, edit.to); changes.push({ label: edit.label, occurrences: 1, beforeSHA256: mac.sha256(edit.from), afterSHA256: mac.sha256(edit.to) });
  }
  let reversed = source;
  for (const edit of [...edits].reverse()) {
    if (reversed.split(edit.to).length !== 2) throw Error('T622 inverse anchor drift: ' + edit.label);
    reversed = reversed.replace(edit.to, edit.from);
  }
  if (reversed !== base.source) throw Error('T622 edit outside reversible allowlist');
  const raf = base.source.match(/    const raf=async ms=>\{[^\n]+/)[0];
  if (source.split(raf).length !== 2) throw Error('T622 changed original nine-window RAF helper');
  for (const assertion of base.source.match(/(?:check|perfCheck)\([^\n]*?\);/g)) if (!source.includes(assertion)) throw Error('T622 changed original assertion: ' + assertion);
  new Function('require', '__filename', '__dirname', source);
  return { ...base, source, sha256: mac.sha256(source), traceBaseEmittedSHA256: base.sha256,
    traceAdapterSHA256: mac.sha256(fs.readFileSync(__filename)), traceChanges: changes, limitation622: LIMITATION,
    originalTimingIsInstrumented: { mobile: true, desktop: false }, traceLimits: LIMITS };
}

function diagnosticComplete(report) {
  const inner = report.innerSummary, trace = inner?.mobileWarmTrace622, windows = inner?.nativeMac619?.windows;
  return Boolean(report.completed && report.cleanupVerified && report.profileRemoved && report.restored &&
    !report.inner?.timedOut && !report.inner?.aborted && !report.inner?.error &&
    inner?.coverage?.core === true && inner.nativeMac619?.complete === true && windows?.length === 9 && windows.every(w => w.qualified) &&
    trace?.captureComplete === true && trace.failures?.length === 0 && !trace.cleanupError && trace.correlation?.samples?.length === 22 &&
    trace.arms?.length === 2 && trace.arms.every((a, i) => a.mode === ['baseline', 'candidate'][i] && a.qualified && a.samples.length === 11 &&
      a.samples[0].durationMs === inner.mobilePerformance?.night?.[a.mode]?.first &&
      JSON.stringify(a.samples.slice(1).map(s => s.durationMs)) === JSON.stringify(inner.mobilePerformance?.night?.[a.mode]?.warm) &&
      JSON.stringify(a.raf) === JSON.stringify(inner.mobilePerformance?.night?.[a.mode]?.raf)));
}

async function supervise(options = {}) {
  const built = build();
  if (options.built && (options.built.sha256 !== built.sha256 || options.built.source !== built.source)) throw Error('T622 supplied adapter differs from pinned composition');
  const raw = await mac.supervise({ ...options, built });
  const result = { ...raw, instrumentedDiagnostic: true, diagnosticTraceCompleted: diagnosticComplete(raw),
    collectionCompleted: false, releaseGatePassed: false, releaseEligible: false, limitation622: LIMITATION,
    traceAdapterSHA256: built.traceAdapterSHA256, traceBaseEmittedSHA256: BASE_EMITTED_SHA256 };
  fs.writeFileSync(path.join(path.resolve(options.out), 'mobile-warm-trace622-supervisor.json'), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('MOBILE_WARM_TRACE622_OVERLAY_OK ' + build().sha256); return; }
  if (process.argv.includes('--self-test')) { const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'mobile-warm-trace622.test.cjs')], { stdio: 'inherit' }); process.exitCode = r.status === 0 ? 0 : 2; return; }
  if (process.argv.some(a => a.startsWith('--inner='))) throw Error('Only the unchanged T619 supervisor launches instrumented source');
  if (process.argv.some(a => a.startsWith('--phase=') && a !== '--phase=core')) throw Error('Only the full original core flow is permitted');
  const out = process.argv.find(a => a.startsWith('--out=')); if (!out) throw Error('Explicit --out= is required');
  const controller = new AbortController(), stop = () => controller.abort(); process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const r = await supervise({ out: out.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('MOBILE_WARM_TRACE622_DIAGNOSTIC ' + JSON.stringify({ status: r.status, diagnosticTraceCompleted: r.diagnosticTraceCompleted, releaseEligible: false }));
    process.exitCode = r.status === 'passed' && r.diagnosticTraceCompleted ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}
module.exports = { BASE_EMITTED_SHA256, LIMITS, CATEGORIES, LIMITATION, installWarmLatch622, analyzeEvidence622,
  createTrace622, transformations, build, diagnosticComplete, supervise };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 2; });
