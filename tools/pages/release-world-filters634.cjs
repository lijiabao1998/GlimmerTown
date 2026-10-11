'use strict';
// Test-only dual-lane coverage. The canonical normal-world records stay untouched.
// This module is not a runtime asset and never changes the renderer or seed city.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const PROTOCOL = 'T634-normal-world-and-explicit-T591-filter-fixture-v1';
function sourceIdentity() { return { file: 'tools/pages/release-world-filters634.cjs', protocol: PROTOCOL,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex') }; }
const GROUPS = Object.freeze(['nativeZoomMatrix', 'nativeMobileAligned']);
const COUNTS = Object.freeze({ nativeZoomMatrix: 32, nativeMobileAligned: 4 });
const COVERAGE_BLOCK = [
  "    check(nativeRows603.some(r=>r.art.state.counts.reflectionCalls>0)&&nativeRows603.some(r=>r.art.state.counts.shadowCalls>0),'world matrix exercises both actual native filter sites');",
  "    check(report.nativeZoomMatrix.some(r=>r.art.state.counts.fractionalCalls>0)&&report.nativeZoomMatrix.some(r=>r.art.state.counts.fractionalScaleCalls>0),'fractional matrix exercises real noninteger native bounds and source scale');",
  "    check(report.nativeMobileAligned.some(r=>r.art.state.counts.reflectionCalls>0)&&report.nativeMobileAligned.some(r=>r.art.state.counts.shadowCalls>0),'aligned mobile matrix exercises both actual native filter sites');"
].join('\n');

// Called in the SAME growCity evaluate task, immediately after freezing the
// freshly grown city. It reads only the real clock and immutable document ID.
function captureRainbow634() {
  if (running || measureWork603) throw Error('T634 rainbow origin requires a frozen snapshot');
  const origin = { value: rainbowT, document: __s603.documentIdentity(), phase: 'same-task-after-grow22-before-matrix-draw' };
  __s603.rainbowOrigin634 = () => ({ ...origin, document: { ...origin.document } });
  return origin;
}

// Embedded inside the disposable game's existing test bridge. All three draws
// remain the canonical nativeFrame implementation, including its stability read.
function filterFrame634(time, mode = 'native', onlyNewEscape = false, newFlags = [], clockInput, clockMode = 'shared') {
  if (running || measureWork603) throw Error('T634 filter fixture requires a frozen snapshot');
  if (!['native', 'wrong-edge'].includes(mode) || typeof onlyNewEscape !== 'boolean' ||
    !Array.isArray(newFlags) || newFlags.some(k => typeof k !== 'string' || !/^__no[A-Za-z0-9]+$/.test(k))) throw Error('Invalid T634 filter fixture request');
  if (!Number.isFinite(clockInput) || clockInput <= 0 || !['shared', 'original-drift'].includes(clockMode)) throw Error('T634 rainbow input must be an observed positive finite PREV clock');
  const callerClock = rainbowT, compositorDescriptor = Object.getOwnPropertyDescriptor(__s603, 'compositorFrame');
  const originalCompositor = __s603.compositorFrame, clockCalls = [];
  const names = [...new Set(['__noT591', '__noT603', '__newEscapeOff603', ...newFlags])];
  const saved = names.map(name => ({ name, own: Object.hasOwn(window, name), value: window[name] }));
  const snapshot = () => Object.fromEntries(names.map(name => [name, {
    own: Object.hasOwn(window, name), type: typeof window[name],
    ...(window[name] === undefined ? {} : { value: window[name] })
  }]));
  const before = snapshot(), sceneBefore = __s603.scene();
  // Retain the TWO existing nativeFrame readbacks, without adding a read or draw.
  // The host requests their bytes only after a failed verdict; the closure is
  // replaced at the next capture, so successful captures retain at most one pair.
  const readbacks = [], descriptor = Object.getOwnPropertyDescriptor(ctx, 'getImageData');
  const originalRead = ctx.getImageData;
  const metadata = () => ({
    viewport: __s603.viewport ? __s603.viewport() : null,
    ground: { dirty: typeof groundDirty === 'undefined' ? null : groundDirty,
      key: typeof groundCacheKey === 'undefined' ? null : groundCacheKey,
      width: typeof groundCache === 'undefined' || !groundCache ? null : groundCache.width,
      height: typeof groundCache === 'undefined' || !groundCache ? null : groundCache.height },
    lotCache: __s603.cacheStats ? __s603.cacheStats() : null,
    artworkCache: typeof STAT634 === 'undefined' ? null : { ...STAT634,
      entries: typeof CACHE634 === 'undefined' ? null : CACHE634.size },
    context: { alpha: ctx.globalAlpha, composite: ctx.globalCompositeOperation,
      filter: ctx.filter, smoothing: ctx.imageSmoothingEnabled }
  });
  const encode = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(binary);
  };
  const serializeReadbacks = () => {
    const out = { expectedReadCount: 2, readCount: readbacks.length,
      reads: readbacks.map(({ image, ...rest }) => ({ ...rest, width: image.width, height: image.height,
        byteLength: image.data.byteLength, rgbaBase64: encode(image.data) })) };
    const a = readbacks[0]?.image, b = readbacks[1]?.image;
    if (a && b && a.width === b.width && a.height === b.height && a.data.length === b.data.length) {
      let changedPixels = 0, minX = a.width, minY = a.height, maxX = -1, maxY = -1;
      const firstDifferences = [];
      for (let i = 0; i < a.data.length; i += 4) {
        if (a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2] && a.data[i + 3] === b.data[i + 3]) continue;
        const x = (i / 4) % a.width, y = Math.floor(i / 4 / a.width); changedPixels++;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        if (firstDifferences.length < 32) firstDifferences.push({ x, y, a: Array.from(a.data.subarray(i, i + 4)), b: Array.from(b.data.subarray(i, i + 4)) });
      }
      out.delta = { changedPixels, bbox: changedPixels ? { minX, minY, maxX, maxY } : null, firstDifferences };
    } else out.delta = { error: 'The original two readbacks are missing or have different dimensions' };
    return out;
  };
  __s603.filterReadbacks634 = serializeReadbacks;
  let result, thrown, spyInstalled = false, compositorInstalled = false;
  try {
    Object.defineProperty(__s603, 'compositorFrame', { configurable: compositorDescriptor?.configurable ?? true, writable: true, enumerable: compositorDescriptor?.enumerable ?? false, value: function (...args) {
      const before = rainbowT, ordinal = clockCalls.length;
      if (clockMode === 'shared' || ordinal === 0) rainbowT = clockInput;
      const pre = rainbowT;
      try { return Reflect.apply(originalCompositor, this, args); }
      finally {
        const post = rainbowT; if (clockMode === 'shared') rainbowT = before;
        clockCalls.push({ before, pre, post, restored: rainbowT });
      }
    } });
    compositorInstalled = true;
    Object.defineProperty(ctx, 'getImageData', { configurable: descriptor?.configurable ?? true, writable: true,
      enumerable: descriptor?.enumerable ?? false, value: function (...args) {
        const image = Reflect.apply(originalRead, this, args);
        if (this === ctx) {
          let state; try { state = metadata(); } catch (error) { state = { error: String(error) }; }
          readbacks.push({ image, args: args.slice(), metadata: state });
        }
        return image;
      } });
    spyInstalled = true;
    window.__noT591 = true;
    window.__newEscapeOff603 = onlyNewEscape;
    result = __s603.nativeFrame(false, time, mode);
    result.clock634 = { input: clockInput, mode: clockMode, callerBefore: callerClock, calls: clockCalls, compositorOwnBefore: !!compositorDescriptor };
    result.diagnostic634 = { expectedReadCount: 2, readCount: readbacks.length, reads: readbacks.map(({ image, ...rest }) => ({ ...rest, width: image.width, height: image.height, byteLength: image.data.byteLength })) };
    result.fixture634 = { protocol: 'T634-normal-world-and-explicit-T591-filter-fixture-v1',
      onlyNewEscape, newEscapeFlags: newFlags.slice(), before, during: snapshot(),
      effective: { T591: t591On(), T603: t603On(), T634: typeof t634On === 'function' ? t634On() : null },
      sceneUnchanged: __s603.scene() === sceneBefore };
    if (result.fixture634.effective.T591 !== false || result.fixture634.effective.T603 !== true ||
      !result.fixture634.sceneUnchanged) throw Error('T634 filter fixture changed its requested path or city');
    return result;
  } catch (error) { thrown = error; throw error;
  } finally {
    let restoreError;
    rainbowT = callerClock;
    try { if (compositorInstalled) { if (compositorDescriptor) Object.defineProperty(__s603, 'compositorFrame', compositorDescriptor); else delete __s603.compositorFrame; } } catch (error) { restoreError = error; }
    if (result?.clock634) Object.assign(result.clock634, { callerAfter: rainbowT, restored: Object.is(rainbowT, callerClock), compositorRestored: __s603.compositorFrame === originalCompositor && Object.hasOwn(__s603, 'compositorFrame') === !!compositorDescriptor });
    try { if (spyInstalled) { if (descriptor) Object.defineProperty(ctx, 'getImageData', descriptor); else delete ctx.getImageData; } } catch (error) { restoreError = error; }
    // Restore the two accessors first, then their dependent escape values. Their
    // setters intentionally propagate, so reversing arbitrary key order is wrong.
    for (const name of ['__newEscapeOff603', '__noT603', ...newFlags, '__noT591']) {
      const prior = saved.find(row => row.name === name);
      try { if (prior.own) window[name] = prior.value; else delete window[name]; }
      catch (error) { restoreError ||= error; }
    }
    let after, restored = false;
    try { after = snapshot(); restored = JSON.stringify(after) === JSON.stringify(before); }
    catch (error) { restoreError ||= error; }
    if (result?.fixture634) Object.assign(result.fixture634, { after, restored });
    if (restoreError && !thrown) throw restoreError;
    if (!restored && !thrown) throw Error('T634 filter fixture did not restore exact flag values and ownership');
  }
}

// These are the three ORIGINAL predicates, byte for byte. Their report is the
// explicitly named supplemental fixture, never the normal 256/32/16/4 arrays.
function verifyNativeFilterCoverage634(report, check) {
  const nativeRows603 = [...report.nativeZoomMatrix, ...report.nativeMobileAligned];
    check(nativeRows603.some(r=>r.art.state.counts.reflectionCalls>0)&&nativeRows603.some(r=>r.art.state.counts.shadowCalls>0),'world matrix exercises both actual native filter sites');
    check(report.nativeZoomMatrix.some(r=>r.art.state.counts.fractionalCalls>0)&&report.nativeZoomMatrix.some(r=>r.art.state.counts.fractionalScaleCalls>0),'fractional matrix exercises real noninteger native bounds and source scale');
    check(report.nativeMobileAligned.some(r=>r.art.state.counts.reflectionCalls>0)&&report.nativeMobileAligned.some(r=>r.art.state.counts.shadowCalls>0),'aligned mobile matrix exercises both actual native filter sites');
}

function selectedCases(cases) {
  const selected = cases.filter(c => GROUPS.includes(c.group));
  if (selected.length !== 36 || new Set(selected.map(c => c.key)).size !== 36 ||
    GROUPS.some(group => selected.filter(c => c.group === group).length !== COUNTS[group])) throw Error('T634 filter fixture requires the exact 32 fractional and 4 aligned cases');
  return selected;
}
function frameValid(frame, { candidate, onlyNewEscape, newFlags, requireT634, mode = 'native' }) {
  const f = frame?.fixture634, counts = frame?.state?.counts;
  return Boolean(frame && frame.unstablePixels === 0 && f?.protocol === PROTOCOL &&
    f.onlyNewEscape === onlyNewEscape && JSON.stringify(f.newEscapeFlags) === JSON.stringify(newFlags) &&
    f.sceneUnchanged === true && f.restored === true && JSON.stringify(f.before) === JSON.stringify(f.after) &&
    f.during?.__noT591?.own === true && f.during.__noT591.value === true &&
    f.during?.__noT603?.own === true && f.during.__noT603.value === false &&
    f.during?.__newEscapeOff603?.own === true && f.during.__newEscapeOff603.value === onlyNewEscape &&
    newFlags.every(name => f.during[name]?.own === true && f.during[name].value === onlyNewEscape) && f.effective?.T591 === false && f.effective.T603 === true &&
    (!candidate || !requireT634 || f.effective.T634 === !(onlyNewEscape && newFlags.includes('__noT634'))) &&
    frame.state.flags?.T603 === true && frame.state.mode === mode && counts &&
    ['calls', 'reflectionCalls', 'shadowCalls', 'fractionalCalls', 'fractionalScaleCalls', 'wrongEdges']
      .every(k => Number.isSafeInteger(counts[k]) && counts[k] >= 0) &&
    counts.calls === counts.reflectionCalls + counts.shadowCalls &&
    counts.fractionalCalls <= counts.calls && counts.fractionalScaleCalls <= counts.calls &&
    counts.wrongEdges === (mode === 'wrong-edge' ? counts.calls : 0));
}
// Diagnostic only. frameValid below/above remains the original acceptance
// predicate, byte-for-byte; these named clauses never replace its verdict.
function framePredicates634(frame, { candidate, onlyNewEscape, newFlags, requireT634, mode = 'native' }) {
  const f = frame?.fixture634, counts = frame?.state?.counts;
  const clauses = {
    framePresent: () => !!frame,
    stablePixels: () => frame.unstablePixels === 0,
    protocol: () => f?.protocol === PROTOCOL,
    onlyNewEscape: () => f.onlyNewEscape === onlyNewEscape,
    newEscapeFlags: () => JSON.stringify(f.newEscapeFlags) === JSON.stringify(newFlags),
    sceneUnchanged: () => f.sceneUnchanged === true,
    restored: () => f.restored === true,
    exactBeforeAfterFlags: () => JSON.stringify(f.before) === JSON.stringify(f.after),
    duringT591Own: () => f.during?.__noT591?.own === true,
    duringT591Value: () => f.during.__noT591.value === true,
    duringT603Own: () => f.during?.__noT603?.own === true,
    duringT603Value: () => f.during.__noT603.value === false,
    duringNewEscapeOwn: () => f.during?.__newEscapeOff603?.own === true,
    duringNewEscapeValue: () => f.during.__newEscapeOff603.value === onlyNewEscape,
    duringNewFlags: () => newFlags.every(name => f.during[name]?.own === true && f.during[name].value === onlyNewEscape),
    effectiveT591: () => f.effective?.T591 === false,
    effectiveT603: () => f.effective.T603 === true,
    effectiveT634: () => !candidate || !requireT634 || f.effective.T634 === !(onlyNewEscape && newFlags.includes('__noT634')),
    stateT603: () => frame.state.flags?.T603 === true,
    mode: () => frame.state.mode === mode,
    countsPresent: () => !!counts,
    safeNonnegativeCounts: () => ['calls', 'reflectionCalls', 'shadowCalls', 'fractionalCalls', 'fractionalScaleCalls', 'wrongEdges'].every(k => Number.isSafeInteger(counts[k]) && counts[k] >= 0),
    totalCalls: () => counts.calls === counts.reflectionCalls + counts.shadowCalls,
    fractionalCalls: () => counts.fractionalCalls <= counts.calls,
    fractionalScaleCalls: () => counts.fractionalScaleCalls <= counts.calls,
    wrongEdges: () => counts.wrongEdges === (mode === 'wrong-edge' ? counts.calls : 0)
  };
  return Object.fromEntries(Object.entries(clauses).map(([name, evaluate]) => {
    try { return [name, Boolean(evaluate())]; } catch { return [name, false]; }
  }));
}
function comparisonValid(reference, current, changedPixels) {
  return changedPixels === 0 && reference.state.sky === current.state.sky && reference.state.fx === current.state.fx &&
    JSON.stringify(reference.state.counts) === JSON.stringify(current.state.counts) &&
    JSON.stringify(reference.state.cam) === JSON.stringify(current.state.cam) &&
    JSON.stringify(reference.state.viewport) === JSON.stringify(current.state.viewport);
}
function negativeValid(row) {
  if (!row || row.changedPixels <= 0 || row.restoredPixels !== 0 || row.good?.state?.mode !== 'native' ||
    row.bad?.state?.mode !== 'wrong-edge' || row.restored?.state?.mode !== 'native') return false;
  const a = row.good?.state?.counts, b = row.bad?.state?.counts, c = row.restored?.state?.counts;
  return Boolean(a && b && c && a.reflectionCalls === 0 && a.shadowCalls > 0 && a.fractionalCalls > 0 &&
    a.fractionalScaleCalls > 0 && a.wrongEdges === 0 && b.reflectionCalls === 0 &&
    b.shadowCalls === a.shadowCalls && b.wrongEdges === b.shadowCalls && JSON.stringify(a) === JSON.stringify(c));
}

function clockValid634(frame, input, mode = 'shared') {
  const c = frame?.clock634;
  if (!Number.isFinite(input) || input <= 0 || !c || c.input !== input || c.mode !== mode ||
    !Number.isFinite(c.callerBefore) || c.callerBefore < 0 || !Object.is(c.callerBefore, c.callerAfter) ||
    c.restored !== true || c.compositorRestored !== true || !Array.isArray(c.calls) || c.calls.length !== 3 ||
    frame.diagnostic634?.readCount !== 2) return false;
  let next = input;
  return c.calls.every((call, i) => {
    const pre = mode === 'shared' ? input : next, post = Math.max(0, pre - .016);
    const before = mode === 'shared' || i === 0 ? c.callerBefore : next;
    next = post;
    return call.before === before && call.pre === pre && call.post === post && call.restored === (mode === 'shared' ? before : post);
  });
}
function rainbowNegativeValid634(row, input, newFlags) {
  if (!row || row.wrongPixels <= 0 || row.restoredPixels !== 0 || row.drift?.unstablePixels <= 0 || !row.drift?.originalGuardError) return false;
  const options = { candidate: true, onlyNewEscape: false, newFlags, requireT634: true };
  const clauses = framePredicates634(row.drift, options);
  return !frameValid(row.drift, options) && Object.entries(clauses).every(([key, value]) => key === 'stablePixels' ? !value : value) &&
    clockValid634(row.drift, input, 'original-drift') &&
    [[row.good, input], [row.wrong, input / 2], [row.restored, input]].every(([frame, value]) => frameValid(frame, options) && clockValid634(frame, value));
}

function createController({ report, check, persist, ev, nativeCases603, nativeCamera603,
  nativeSave603, nativeRecord603, pngRgba603, pixelDelta603, OUT, release603,
  verifyCoverage = verifyNativeFilterCoverage634, helperIdentity = sourceIdentity() }) {
  if (JSON.stringify(helperIdentity) !== JSON.stringify(sourceIdentity())) throw Error('T634 world filter helper source identity drift');
  const cases = selectedCases(nativeCases603), newFlags = release603.newEscapeFlags.slice();
  const evidence = report.nativeFilterFallback634 = {
    protocol: PROTOCOL, purpose: 'Supplemental actual native filter coverage with the supported T591 escape; normal world arrays are unchanged.',
    fixture: { flag: '__noT591', value: true, cases: cases.map(c => ({ ...c })), counts: { ...COUNTS },
      baseline: 'Immutable PREV, T591 off, T603 on',
      candidate: 'T591 off, normal new artwork on',
      parity: 'T591 off, T603 on, only new release escape flags set' },
    sources: { current: report.release.current, previous: report.release.previous, helper: { ...helperIdentity } }, newEscapeFlags: newFlags,
    rainbow: { contract: 'Observed positive immutable PREV clock shared only inside supplemental filterFrame; normal308 never wrapped.', sources: { previous: report.release.previous, current: report.release.current, helper: { ...helperIdentity } } },
    baseline: {}, nativeZoomMatrix: [], nativeMobileAligned: [], earlyPassed: false, finalPassed: false
  };
  const expected = new Map(cases.map(c => [c.key, c]));
  const stored = (label, frame) => ({ ...nativeRecord603(frame), file: nativeSave603(label, frame) });
  async function saveDiagnostic634(target, key, prefix, c, frame, pixels, options, predicates, dimensionsValid, clockInput, clockMode) {
  const first = target[key] = { case: { ...c }, options, predicates,
    failedPredicates: Object.keys(predicates).filter(k => !predicates[k]), dimensionsValid, clockValid: clockValid634(frame, clockInput, clockMode),
    decodedDimensions: { width: pixels.w, height: pixels.h }, sources: evidence.sources,
    frame: nativeRecord603({ ...frame, pixels }), diagnosticErrors: [] };
  const recordError = error => first.diagnosticErrors.push(String(error.stack || error));
  try {
    first.frame.file = prefix + '.png';
    fs.writeFileSync(path.join(OUT, first.frame.file), Buffer.from(frame.png.split(',')[1], 'base64'));
    (report.screenshots ||= []).push(first.frame.file);
  } catch (error) { recordError(error); }
  try {
    // This only serializes the retained readbacks; it never redraws/rereads.
    const readbacks = await ev('__s603.filterReadbacks634()');
    first.readbacks = { ...readbacks, reads: [] };
    for (const [i, read] of readbacks.reads.entries()) {
      const { rgbaBase64, ...metadata } = read;
      const bytes = Buffer.from(rgbaBase64, 'base64'), file = prefix + '-' + (i === 0 ? 'A' : i === 1 ? 'B' : i) + '.rgba';
      fs.writeFileSync(path.join(OUT, file), bytes);
      first.readbacks.reads.push({ ...metadata, file, savedBytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
  } catch (error) { recordError(error); }
  first.file = prefix + '.json';
  try { fs.writeFileSync(path.join(OUT, first.file), JSON.stringify(first, null, 2)); } catch (error) { recordError(error); }
  try { persist(); } catch (error) { recordError(error); }
    return first;
  }
  async function capture(c, candidate, onlyNewEscape = false, mode = 'native', clockInput = evidence.rainbow.previous.value, clockMode = 'shared') {
    await nativeCamera603(c);
    const frame = await ev('__s603.filterFrame634(' + JSON.stringify(c.time) + ',' + JSON.stringify(mode) + ',' +
      JSON.stringify(onlyNewEscape) + ',' + JSON.stringify(newFlags) + ',' + JSON.stringify(clockInput) + ',' + JSON.stringify(clockMode) + ')');
    const pixels = pngRgba603(Buffer.from(frame.png.split(',')[1], 'base64'));
    const options = { candidate, onlyNewEscape, newFlags, requireT634: true, mode };
    const predicates = framePredicates634(frame, options);
    const dimensionsValid = pixels.w === c.width * c.dpr && pixels.h === c.height * c.dpr && frame.state.viewport.dpr === c.dpr;
    if (clockMode !== 'original-drift' && (!frameValid(frame, options) || !dimensionsValid || !clockValid634(frame, clockInput, clockMode)) && !evidence.firstFailure) {
      const prefix = 'T634-filter-first-failure-' + c.key + '-' + (candidate ? onlyNewEscape ? 'escape' : 'normal-art' : 'previous') + '-' + mode;
      await saveDiagnostic634(evidence, 'firstFailure', prefix, c, frame, pixels, options, predicates, dimensionsValid, clockInput, clockMode);
    }
    try {
    check(frameValid(frame, { candidate, onlyNewEscape, newFlags, requireT634: true, mode }), 'T634 explicit filter fixture state and restored flag ownership ' + c.key + '/' + candidate + '/' + onlyNewEscape + '/' + mode);
    } catch (error) { if (clockMode !== 'original-drift') throw error; frame.originalGuardError = String(error.message || error); }
    if (clockMode === 'original-drift') await saveDiagnostic634(evidence.rainbow, 'originalDriftEvidence', 'T634-rainbow-expected-drift-' + c.key, c, frame, pixels, options, predicates, dimensionsValid, clockInput, clockMode);
    check(pixels.w === c.width * c.dpr && pixels.h === c.height * c.dpr && frame.state.viewport.dpr === c.dpr,
      'T634 filter fixture complete native dimensions ' + c.key);
    if (clockMode === 'original-drift') {
      check(!!frame.originalGuardError && frame.unstablePixels > 0 && Object.entries(predicates).every(([key, value]) => key === 'stablePixels' ? !value : value), 'T634 original countdown is rejected only by the original stablePixels guard ' + c.key);
      check(evidence.rainbow.originalDriftEvidence.diagnosticErrors.length === 0, 'T634 original countdown red retains its complete first frame and readbacks');
    }
    check(clockValid634(frame, clockInput, clockMode), 'T634 exact three-draw rainbow input, natural decay and caller/method restoration ' + c.key);
    return { ...frame, pixels };
  }
  function complete() {
    check(Object.keys(evidence.baseline).length === 36 && cases.every(c => frameValid(evidence.baseline[c.key], { candidate: false, onlyNewEscape: false, newFlags, requireT634: false })), 'T634 all 36 independent immutable PREV filter references');
    const rows = GROUPS.flatMap(group => evidence[group]);
    check(rows.length === 36 && new Set(rows.map(r => r.key)).size === 36 &&
      GROUPS.every(group => evidence[group].length === COUNTS[group] && evidence[group].every(r => expected.get(r.key)?.group === group)),
    'T634 exact supplemental 32 fractional and 4 aligned filter cases');
    check(rows.every(r => r.art && r.artOn && r.artOn.changedPixels === 0 && r.artOn.parityPassed === true && comparisonValid(evidence.baseline[r.key], r.artOn, r.artOn.changedPixels) &&
      frameValid(r.art, { candidate: true, onlyNewEscape: false, newFlags, requireT634: true }) &&
      frameValid(r.artOn, { candidate: true, onlyNewEscape: true, newFlags, requireT634: true })),
    'T634 every supplemental filter case has normal-new-art and exact immutable-PREV escape evidence');
    check(cases.every(c => clockValid634(evidence.baseline[c.key], evidence.rainbow.previous.value)) && rows.every(r => clockValid634(r.art, evidence.rainbow.previous.value) && clockValid634(r.artOn, evidence.rainbow.previous.value)), 'T634 every supplemental frame retains the exact shared PREV rainbow clock contract');
    verifyCoverage(evidence, check);
  }
  return {
    async baseline() {
      check(Object.keys(evidence.baseline).length === 0, 'T634 independent filter baseline collected once');
      evidence.rainbow.previous = await ev('__s603.rainbowOrigin634()'); persist();
      check(Number.isFinite(evidence.rainbow.previous.value) && evidence.rainbow.previous.value > 0 && evidence.rainbow.previous.document.doc === 'baseline' && evidence.rainbow.previous.document.version === report.release.previous.version && evidence.rainbow.previous.phase === 'same-task-after-grow22-before-matrix-draw', 'T634 immutable PREV supplies a real positive same-task rainbow clock');
      for (const c of cases) {
        const frame = await capture(c, false);
        evidence.baseline[c.key] = stored('filter634-main-' + c.key, frame); persist();
      }
    },
    async candidate() {
      check(!evidence.earlyPassed && GROUPS.every(g => evidence[g].length === 0), 'T634 supplemental filter candidate collected once');
      evidence.rainbow.candidate = await ev('__s603.rainbowOrigin634()'); persist();
      check(Number.isFinite(evidence.rainbow.candidate.value) && evidence.rainbow.candidate.value >= 0 && evidence.rainbow.candidate.document.doc === 'candidate' && evidence.rainbow.candidate.document.version === report.release.current.version && evidence.rainbow.candidate.phase === 'same-task-after-grow22-before-matrix-draw', 'T634 candidate original same-task rainbow clock is separately recorded');
      for (const c of cases) {
        const reference = evidence.baseline[c.key]; check(!!reference, 'T634 immutable filter reference exists ' + c.key);
        const art = await capture(c, true), same = await capture(c, true, true);
        const basePixels = pngRgba603(fs.readFileSync(path.join(OUT, reference.file)));
        const changedPixels = pixelDelta603(basePixels, same.pixels), parityPassed = comparisonValid(reference, same, changedPixels);
        const row = { ...c, art: stored('filter634-normal-art-' + c.key, art),
          artOn: { ...stored('filter634-only-new-escape-' + c.key, same), changedPixels, parityPassed, referenceFile: reference.file } };
        evidence[c.group].push(row); persist();
        check(parityPassed, 'T634 fallback only-new-escape equals immutable PREV full RGBA, sky, dust, native counts and camera ' + c.key);
      }
      complete();
      const c = cases.find(c => c.key === 'fractional-r0-z0.65-night'); check(!!c, 'T634 shadow-only negative-control camera exists');
      const good = await capture(c, true), bad = await capture(c, true, false, 'wrong-edge'), restored = await capture(c, true);
      evidence.shadowNegativeControl = { key: c.key, changedPixels: pixelDelta603(good.pixels, bad.pixels),
        restoredPixels: pixelDelta603(good.pixels, restored.pixels), good: stored('filter634-shadow-good', good),
        bad: stored('filter634-shadow-wrong-edge', bad), restored: stored('filter634-shadow-restored', restored) };
      persist(); check(negativeValid(evidence.shadowNegativeControl), 'T634 shadow-only fractional native wrong-edge control loses pixels and restores exact full RGBA');
      const rainbowCase = cases.find(c => c.key === 'aligned-dpr2-day'), input = evidence.rainbow.previous.value;
      check(!!rainbowCase, 'T634 visible DPR2 rainbow control camera exists');
      const rainbowGood = await capture(rainbowCase, true), drift = await capture(rainbowCase, true, false, 'native', input, 'original-drift');
      const wrong = await capture(rainbowCase, true, false, 'native', input / 2), rainbowRestored = await capture(rainbowCase, true);
      evidence.rainbow.negativeControl = { key: rainbowCase.key, input, wrongInput: input / 2,
        wrongPixels: pixelDelta603(rainbowGood.pixels, wrong.pixels), restoredPixels: pixelDelta603(rainbowGood.pixels, rainbowRestored.pixels),
        good: stored('filter634-rainbow-good', rainbowGood), drift: stored('filter634-rainbow-original-drift', drift),
        wrong: stored('filter634-rainbow-wrong-clock', wrong), restored: stored('filter634-rainbow-restored', rainbowRestored) };
      persist(); check(rainbowNegativeValid634(evidence.rainbow.negativeControl, input, newFlags), 'T634 visible rainbow original-drift and nonzero wrong-clock red sources restore exact RGBA');
      evidence.earlyPassed = true; persist();
    },
    finish() {
      check(evidence.earlyPassed === true && negativeValid(evidence.shadowNegativeControl), 'T634 early supplemental coverage and shadow negative control remain complete');
      complete();
      check(rainbowNegativeValid634(evidence.rainbow.negativeControl, evidence.rainbow.previous.value, newFlags), 'T634 final rainbow controls remain complete');
      const groups = ['matrix', 'nativeZoomMatrix', 'nativeMobileMatrix', 'nativeMobileAligned'];
      const normal = groups.flatMap(group => report[group] || []);
      check(normal.length === 308 && new Set(normal.map(r => r.key)).size === 308 &&
        nativeCases603.every(c => report[c.group]?.some(r => r.key === c.key && r.art?.unstablePixels === 0 && r.legacy?.changedPixels === 0)) &&
        groups.every(group => report[group] !== evidence[group]), 'T634 all 308 original normal-art cases retained separately from supplemental filter evidence');
      evidence.normalCases = normal.length; evidence.finalPassed = true; persist();
    }
  };
}

function install(replace, helperIdentity = sourceIdentity()) {
  replace(COVERAGE_BLOCK, '    filterWorld634.finish();', 'T634 bind original filter coverage to the explicit supplemental evidence');
  replace('    compositorState:compositorState603,', '    captureRainbow634:' + captureRainbow634.toString() + ',\n    filterFrame634:' + filterFrame634.toString() + ',\n    compositorState:compositorState603,', 'T634 supported reversible frozen filter fixture API');
  replace("if('+snapshot+')__s603.compositorFreeze(true);return stats;", "if('+snapshot+'){__s603.compositorFreeze(true);__s603.captureRainbow634();}return stats;", 'T634 read real rainbow origin in the same frozen grow task');
  const record = '    const nativeRecord603=({png,pixels,...r})=>({...r,rgbaSHA256:hash(pixels.rgba)});';
  replace(record, record + '\n' + verifyNativeFilterCoverage634.toString() + '\n' +
    "    const filterWorld634=require(path.join(ROOT,'tools/pages/release-world-filters634.cjs')).createController({report,check,persist,ev,nativeCases603,nativeCamera603,nativeSave603,nativeRecord603,pngRgba603,pixelDelta603,OUT,release603,verifyCoverage:verifyNativeFilterCoverage634,helperIdentity:" + JSON.stringify(helperIdentity) + "});",
  'T634 separate filter report and unchanged coverage predicates');
  const baseline = '    for(const c of nativeCases603){await nativeCamera603(c);const r=await nativeImage603(c,true);';
  replace(baseline, '    await filterWorld634.baseline();\n' + baseline, 'T634 collect independent PREV filter references before original matrix');
  const candidate = "    const skyCase603=nativeCases603.find(c=>c.key==='k29-r0-s0-night-far');";
  replace(candidate, '    await filterWorld634.candidate();\n' + candidate, 'T634 fail-fast supplemental coverage before original normal matrix');
}
module.exports = { PROTOCOL, sourceIdentity, GROUPS, COUNTS, COVERAGE_BLOCK, captureRainbow634, filterFrame634, verifyNativeFilterCoverage634,
  selectedCases, frameValid, framePredicates634, clockValid634, rainbowNegativeValid634, comparisonValid, negativeValid, createController, install };
