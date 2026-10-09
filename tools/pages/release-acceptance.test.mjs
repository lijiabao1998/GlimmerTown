import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const linux = require('./release-correctness.cjs'), native = require('./release-native-acceptance.cjs');
const canonical = require('./native-correctness.cjs'), mac = require('./native-mac-diagnostic.cjs');
const portability = require('./native-portability-diagnostic.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const raw = fs.readFileSync(path.join(root, 'docs/tasks/t603-shots/scene603.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));

test('Linux delegates exactly the two pinned timing spans, retaining every other assertion and original launch', () => {
  const built = linux.build(raw), original = canonical.build(raw);
  assert.equal(built.changes.filter(row => row.label.startsWith('delegate-')).length, 2);
  assert.deepEqual(built.delegatedTiming, linux.TIMING_SPANS);
  let nonTiming = original.source;
  for (const [name, span] of Object.entries(canonical.TIMING)) {
    const a = raw.indexOf(span.start), block = raw.slice(a, raw.indexOf(span.end, a));
    assert.equal(mac.sha256(block), span.sha256);
    assert.equal(built.source.includes(block), false, name);
    assert.equal(built.source.split('report.releaseTiming.omittedSpans.push(' + JSON.stringify(name) + ')').length, 2);
    nonTiming = nonTiming.replace(block, '');
  }
  nonTiming = nonTiming.replace(linux.ORIGINAL_VERDICT, '');
  for (const assertion of nonTiming.match(/(?:check|perfCheck)\([^\n]*?\);/g)) assert(built.source.includes(assertion), assertion);
  assert.equal(built.source.split(canonical.CHROME_LAUNCH).length, 2);
  assert.equal(built.source.includes('all unchanged performance gates must pass:'), false);
  assert(built.source.includes("const PHASE=arg('phase','full');"));
  assert(built.source.includes('qualityTolerance:0,timingRun:false,releaseGatePassed:false'));
  assert(built.source.includes("path.join(OUT,'release-correctness-summary.json')"));
  assert.throws(() => linux.build(raw + '\n// unreviewed source\n'), /canonical identity drift/);
  for (const span of Object.values(canonical.TIMING)) assert.throws(() => linux.build(raw.replace(span.start, span.start + '\ncheck(false,"drift");')), /timing byte drift/);
  assert.throws(() => linux.build(raw.replace('--disable-gpu', '--different-graphics')), /Chrome launch drift/);
});

function delegation(phase = 'core') {
  return { native617: { timingRun: false, releaseGatePassed: false }, performanceFailures: [],
    releaseTiming: { policy: linux.POLICY, status: 'not-run', requiredLane: 'release-native-acceptance', required: true,
      includesSixtySecondLiveness: true, originalThresholdsUnchanged: true, spans: clone(linux.TIMING_SPANS),
      omittedSpans: ['core', 'full'].includes(phase) ? ['mobile', 'desktop'] : [] } };
}

test('delegation never treats empty performance failures as a timing pass and fails mutated or extra evidence', () => {
  for (const phase of ['full', 'core', 'world', 'neighbors']) assert(linux.timingDelegationValid(delegation(phase), phase, linux.TIMING_SPANS));
  for (const mutate of [
    r => { r.releaseTiming.status = 'passed'; }, r => { r.releaseTiming.required = false; },
    r => { r.releaseTiming.requiredLane = 'optional-diagnostic'; }, r => { r.releaseTiming.includesSixtySecondLiveness = false; },
    r => { r.releaseTiming.originalThresholdsUnchanged = false; }, r => { r.releaseTiming.spans.pop(); },
    r => { r.releaseTiming.spans[0].sha256 = 'changed'; }, r => { r.releaseTiming.omittedSpans.reverse(); },
    r => { r.releaseTiming.omittedSpans.push('model'); }, r => { r.native617.timingRun = true; },
    r => { r.performanceFailures.push('failure'); }, r => { r.mobilePerformance = {}; },
    r => { r.performance = {}; }, r => { r.stability = {}; }, r => { delete r.releaseTiming; }
  ]) { const report = delegation(); mutate(report); assert.equal(linux.timingDelegationValid(report, 'core', linux.TIMING_SPANS), false); }
});

// Synthetic controller records for fail-closed unit tests, never release evidence.
function fixture() {
  const host = { window: { windowId: 1, bounds: { left: 0, top: 0, width: 1600, height: 1000, windowState: 'fullscreen' } },
    viewport: { width: 1600, height: 1000, dpr: 1, screenWidth: 1600, screenHeight: 1000 },
    foreground: { frontExit: 0, appExit: 0, pid: 20, bundle: 'com.google.Chrome' }, activationExit: 0 };
  const sequence = [
    ['mobile-day-baseline', 390, 844, 5000], ['mobile-day-candidate', 390, 844, 5000],
    ['mobile-night-baseline', 390, 844, 5000], ['mobile-night-candidate', 390, 844, 5000],
    ['mobile-liveness', 390, 844, 60000], ['desktop-day-baseline', 1400, 900, 5000],
    ['desktop-day-candidate', 1400, 900, 5000], ['desktop-night-baseline', 1400, 900, 5000],
    ['desktop-night-candidate', 1400, 900, 5000]
  ];
  const windows = sequence.map(([label, width, height, requestedMs], i) => {
    const boundary = { ...host.foreground, window: clone(host.window), page: { visibility: 'visible', focus: true, width, height, dpr: 1,
      timeOrigin: 100 + i, viewport: { cssWidth: width, cssHeight: height, width, height, dpr: 1, devicePixelRatio: 1 } }, valid: true };
    return { label, width, height, dpr: 1, requestedMs, qualified: true, before: boundary, after: clone(boundary),
      latchBefore: { serial: i + 1, active: true, count: 0, losses: [] }, latchAfter: { serial: i + 1, active: false, count: 0, losses: [] },
      sample: { elapsed: requestedMs, frames: requestedMs / 100, intervals: Array(requestedMs / 100).fill(100), visibility: 'visible' } };
  });
  const summary = i => ({ elapsed: windows[i].requestedMs, frames: windows[i].sample.frames, mean: 100, p95: 100, max: 100, visibility: 'visible' });
  const historical = portability.HISTORICAL.map((row, i) => ({ id: row.id, condition: row.condition, value: false, passed: false,
    message: (i === 0 ? 'approved 1586 keys unchanged: ' : 'candidate pins match Chromium: ') + '["sample/key"]',
    originalDifferences: ['sample/key'], differences: [{ key: 'sample/key', expected: ['a'], actual: ['b'], missing: false, extra: false }] }));
  const captures = ['candidate-initial', 'old-first', 'old-repeat', 'candidate-return', 'candidate-repeat', 'later-old'].map((label, i) => {
    const old = [1, 2, 5].includes(i);
    return { label, kind: old ? 'old' : 'candidate', verified: true, timeOrigin: i + 1, keyCount: 1586,
      keySet: { count: 1586, missing: [], extra: [], malformed: [] }, sourceSHA256: old ? portability.BASE_SHA256 : native.IDENTITY.runtime,
      identity: { version: old ? '11.211' : '11.212', url: old ? '/baseline603.html' : '/index.html', civicFactory: old ? 'undefined' : 'function' },
      flags: { T603: !old, T596: false, T600: false } };
  });
  const checks = ['exact approved T603 release index', 'exact approved T603 release service worker',
    'all 16 legacy escape frames checked without hash-only shortcut', 'one-minute paused city unchanged',
    '26 native model/actor/RNG-preserving transitions', 'requested phase coverage complete: core',
    'all unchanged performance gates must pass: ', 'final preview flags preserved', 'zero runtime/console/app errors',
    'T620 all same-browser controls complete before final historical verdict'];
  for (const seed of [22, 777, 301]) for (const label of ['root/ref', 'fields', 'roundtrip', 'second-load fields']) checks.push('Chrome old-save ' + label + ' ' + seed);
  const nativeState = { native: true, unchangedNightHelper: true, retiredGlobals: [], slot: 3, url: '/index.html' };
  const innerSummary = { status: 'failed', phase: 'core', headless: false, performanceFailures: [], coverage: { core: true },
    browserVersion: { product: 'Synthetic test' }, gpuInfo: { devices: [{ deviceString: 'Synthetic test' }] },
    exceptions: [], consoleErrors: [], errLog: [], newPins: [], checks,
    error: 'Error: ' + historical[0].message + '\n    at syntheticFixture',
    native617: { approvedRuntimeSHA256: native.IDENTITY.runtime, retentionInstalled: false, observerInstalled: false,
      qualityTolerance: 0, timingRun: true, releaseGatePassed: false, final: nativeState },
    nativeSource603: { sourceSHA256: native.IDENTITY.runtime, baseSHA256: portability.BASE_SHA256 }, baseIndexSHA256: portability.BASE_SHA256,
    slotIsolation617: { checks: 13, keys: clone(canonical.SLOT_KEYS) },
    transitions617: Array.from({ length: 26 }, () => ({ ...clone(nativeState), modelExact: true, actorsExact: true, rngCalls: 0 })),
    finalFlags: { T603: true, T596: false, T600: false },
    nativeMac619: { complete: true, platform: 'darwin', browserPid: 20, host, windows },
    portability620: { baseSourceSHA256: portability.BASE_SHA256, inverseSourceSHA256: portability.BASE_SHA256,
      historical, captures, preTimingControlsPassed: true, candidateRepeatPassed: true, laterOldPassed: true, originalChecksComplete: true,
      comparisons: ['old-first-against-history', 'old-repeat-against-history', 'independent-old-reloads',
        'old-source-to-inherited-candidate', 'returned-candidate-to-original', 'original-candidate-repeat-to-old-source', 'later-old-to-independent-old']
        .map((label, i) => ({ label, passed: i >= 2, differences: i < 2 ? clone(historical[0].differences) : [] })),
      finalHistoricalVerdict: { passed: false, failedIds: historical.map(r => r.id), firstFailureMessage: historical[0].message } },
    performanceLimits: clone(native.LIMITS), stability: summary(4), mobilePerformance: {}, performance: {} };
  for (const [lane, offset, n] of [['mobilePerformance', 0, 10], ['performance', 5, 30]]) for (const [i, phase] of ['day', 'night'].entries())
    innerSummary[lane][phase] = Object.fromEntries(['baseline', 'candidate'].map((mode, j) => [mode,
      { cold: 10, warm: Array(n).fill(10), warmP95: 10, raf: summary(offset + i * 2 + j) }]));
  const display = { ok: true, exitCode: 0, displayID: 1, boundMs: mac.BOUNDS.display };
  return { status: 'failed', completed: true, cleanupVerified: true, profileRemoved: true, restored: true,
    collectionCompleted: true, releaseGatePassed: false, portabilityAdapterSHA256: native.IDENTITY.portabilityAdapter,
    attempts: 1, jobStart: 1000, deadline: 1000 + mac.BOUNDS.job, finished: 110000,
    boundsMs: clone(mac.BOUNDS), requiredRemainingMs: mac.REQUIRED_REMAINING_MS, remainingBeforeInnerMs: mac.REQUIRED_REMAINING_MS,
    inner: { status: 2, signal: null, error: null, timedOut: false, aborted: false, cleanupVerified: true, launched: true, elapsedMs: 100000 },
    innerSummary, restoreRequired: true,
    compile: { sourceSHA256: mac.sha256(mac.DISPLAY_SWIFT), binarySHA256: 'a'.repeat(64), boundMs: mac.BOUNDS.compile,
      terminationGraceMs: mac.BOUNDS.termination, resourceBoundMs: mac.BOUNDS.compile + mac.BOUNDS.termination,
      status: 0, signal: null, error: null, timedOut: false, aborted: false, cleanupVerified: true, launched: true, elapsedMs: 1000 },
    displayBefore: { ...display, action: 'inspect', restoreID: 3, before: { id: 3 } },
    displayPrepared: { ...display, action: 'prepare', after: { id: 9, width: 1600, height: 1000 } },
    displayRestored: { ...display, action: 'restore', after: { id: 3 } } };
}

test('policy acceptance is separate, requires complete T620, and leaves failed raw history and exit 2 byte-for-byte unchanged', () => {
  const report = fixture(), before = JSON.stringify(report), result = native.acceptance(report);
  assert.equal(portability.collectionComplete(report), true);
  assert.equal(result.nativeLaneAccepted, true, JSON.stringify(result.failures));
  assert.equal(result.status, 'accepted'); assert.equal(result.linuxCorrectness, 'separately-required');
  assert.equal(result.originalDiagnostic.status, 'failed'); assert.equal(result.originalDiagnostic.exitCode, 2);
  assert(result.originalDiagnostic.historical.every(row => row.passed === false));
  assert.equal(JSON.stringify(report), before);
});

const mutations = {
  'incomplete collection': r => { r.collectionCompleted = false; },
  'missing core coverage': r => { r.innerSummary.coverage.core = false; },
  'new runtime error': r => { r.innerSummary.exceptions.push('error'); },
  'new app error': r => { r.innerSummary.errLog.push('error'); },
  'new console error': r => { r.innerSummary.consoleErrors.push('error'); },
  'new performance failure': r => { r.innerSummary.performanceFailures.push('failure'); },
  'false passed raw report': r => { r.status = 'passed'; r.inner.status = 0; r.innerSummary.status = 'passed'; },
  'unrelated raw failure': r => { r.innerSummary.error = 'Error: model changed'; },
  'incomplete original checks': r => { r.innerSummary.portability620.originalChecksComplete = false; },
  'historical failure erased': r => { r.innerSummary.portability620.historical[0].passed = true; },
  'wrong approved runtime': r => { r.innerSummary.native617.approvedRuntimeSHA256 = 'other'; },
  'wrong original source': r => { r.innerSummary.portability620.captures[1].sourceSHA256 = native.IDENTITY.runtime; },
  'wrong original version': r => { r.innerSummary.portability620.captures[1].identity.version = '11.212'; },
  'candidate CRC mismatch': r => { r.innerSummary.portability620.comparisons[3].differences.push({ key: 'new failure' }); },
  'missing independent source capture': r => { r.innerSummary.portability620.captures.pop(); },
  'model mutation': r => { r.innerSummary.transitions617[0].modelExact = false; },
  'RNG mutation': r => { r.innerSummary.transitions617[0].rngCalls = 1; },
  'retired renderer': r => { r.innerSummary.native617.final.retiredGlobals.push('TownRetained'); },
  'wrong save slot': r => { r.innerSummary.native617.final.slot = 1; },
  'old-save failure': r => { r.innerSummary.checks = r.innerSummary.checks.filter(s => s !== 'Chrome old-save second-load fields 777'); },
  'child not cleaned': r => { r.cleanupVerified = false; },
  'inner not cleaned': r => { r.inner.cleanupVerified = false; },
  'profile retained': r => { r.profileRemoved = false; },
  'display not restored': r => { r.restored = false; },
  'wrong restored display': r => { r.displayRestored.after.id = 9; },
  'second attempt': r => { r.attempts = 2; },
  'inner timeout': r => { r.inner.timedOut = true; },
  'abort': r => { r.inner.aborted = true; },
  'resource bounds weakened': r => { r.boundsMs.inner++; },
  'deadline exceeded': r => { r.finished = r.deadline + 1; },
  'insufficient full inner budget': r => { r.remainingBeforeInnerMs = mac.REQUIRED_REMAINING_MS - 1; },
  'compiler not cleaned': r => { r.compile.cleanupVerified = false; },
  'missing native window': r => { r.innerSummary.nativeMac619.windows.pop(); },
  'reordered windows': r => { r.innerSummary.nativeMac619.windows.reverse(); },
  'smaller viewport': r => { r.innerSummary.nativeMac619.windows[0].before.page.width = 320; },
  'wrong native foreground': r => { r.innerSummary.nativeMac619.windows[0].after.pid = 21; },
  'changed document in sample': r => { r.innerSummary.nativeMac619.windows[0].after.page.timeOrigin++; },
  'passive latch loss': r => { r.innerSummary.nativeMac619.windows[0].latchAfter.count = 1; },
  'passive latch loss erased count': r => { r.innerSummary.nativeMac619.windows[0].latchAfter.losses.push('blur'); },
  'shortened liveness': r => { r.innerSummary.nativeMac619.windows[4].requestedMs = 5000; },
  'threshold weakened': r => { r.innerSummary.performanceLimits.rafP95Ratio = 2; },
  'faked empty failure list': r => { r.innerSummary.performance.night.candidate.cold = 10000; },
  'warm measurement drift': r => { r.innerSummary.mobilePerformance.day.candidate.warmP95 = 0; },
  'raw RAF sample drift': r => { r.innerSummary.nativeMac619.windows[0].sample.intervals[0] = 0; },
  'missing raw RAF sample': r => { delete r.innerSummary.nativeMac619.windows[0].sample; },
  'missing report': () => null
};
for (const [name, mutate] of Object.entries(mutations)) test('native acceptance rejects ' + name, () => {
  const report = fixture(); const changed = mutate(report);
  assert.equal(native.acceptance(changed === null ? null : report).nativeLaneAccepted, false, name);
});

test('complete but too slow samples fail unchanged thresholds even with empty failure list', () => {
  for (const [index, lane, phase, mode, interval, frames] of [
    [1, 'mobilePerformance', 'day', 'candidate', 200, 25],
    [6, 'performance', 'day', 'candidate', 100, 49],
    [4, null, null, null, 60000 / 599, 599],
    [4, null, null, null, 5000, 600]
  ]) {
    const report = fixture(), w = report.innerSummary.nativeMac619.windows[index];
    w.sample = { elapsed: Math.max(w.requestedMs, interval * frames), frames, intervals: Array(frames).fill(interval), visibility: 'visible' };
    const measurement = { elapsed: w.sample.elapsed, frames, mean: w.sample.intervals.reduce((a,b)=>a+b,0)/frames,
      p95: interval, max: interval, visibility: 'visible' };
    if (lane) report.innerSummary[lane][phase][mode].raf = measurement; else report.innerSummary.stability = measurement;
    assert.equal(native.acceptance(report).nativeLaneAccepted, false);
  }
});

test('wrapper uses unchanged T620 supervisor and writes only a separate scoped acceptance verdict', async t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'release-acceptance-test-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const report = fixture(), bytes = JSON.stringify(report, null, 2), original = portability.supervise;
  let calls = 0;
  portability.supervise = async options => { calls++; assert.equal(options.out, out);
    fs.writeFileSync(path.join(out, 'native-portability-supervisor.json'), bytes); return report; };
  t.after(() => { portability.supervise = original; });
  const result = await native.supervise({ out });
  assert.equal(calls, 1); assert.equal(result.nativeLaneAccepted, true);
  assert.equal(fs.readFileSync(path.join(out, 'native-portability-supervisor.json'), 'utf8'), bytes);
  assert.equal(result.rawDiagnostic.sha256, mac.sha256(bytes));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'release-native-acceptance.json'))), result);
});
