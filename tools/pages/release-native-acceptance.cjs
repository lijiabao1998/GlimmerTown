'use strict';
// Separate user-approved release acceptance. T620 raw reports, historical failures,
// exit 2, original thresholds, supervisor and controls remain untouched.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const portability = require('./native-portability-diagnostic.cjs'), mac = require('./native-mac-diagnostic.cjs');
const linux = require('./release-correctness.cjs');
const ROOT = path.resolve(__dirname, '../..');
const IDENTITY = Object.freeze({ runtime: '99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d',
  serviceWorker: '79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2',
  portabilityAdapter: 'c427c288a7617313de834ae451ed6b84b8f8d1d51c62496ad7d5d1da900c4880' });
const LIMITATION = 'Acceptance is limited to the user-approved Linux-correctness/native-original-timing release policy. Historical native CRC failures and prior Linux timing failures remain failures. CRC-map equality is not exhaustive per-sprite RGBA equality. Native foreground is checked at boundaries with a passive loss latch; the changed boot/readback protocol establishes neither Metal causality, physical-device 55 FPS, nor active-gameplay speedup. Linux correctness remains separately required.';
const LIMITS = Object.freeze({ coldRatio: 2, coldAddMs: 250, warmP95Ratio: 1.5, warmAddMs: 5, rafP95Ratio: 1.5, rafAddMs: 5 });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const empty = value => Array.isArray(value) && value.length === 0;
const finite = value => Number.isFinite(value) && value >= 0;
const percentile = values => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * .95))];

function assertSources() {
  const built = portability.build();
  if (built.portabilityAdapterSHA256 !== IDENTITY.portabilityAdapter ||
    mac.sha256(fs.readFileSync(path.join(ROOT, 'index.html'))) !== IDENTITY.runtime ||
    mac.sha256(fs.readFileSync(path.join(ROOT, 'sw.js'))) !== IDENTITY.serviceWorker) throw Error('Native release approved source identity drift');
  return built;
}

function rafSummaryValid(summary, window) {
  const sample = window?.sample;
  if (!summary || !sample || !Array.isArray(sample.intervals) || !sample.intervals.length ||
    !sample.intervals.every(finite) || sample.frames !== sample.intervals.length || !finite(sample.elapsed) ||
    sample.elapsed < window.requestedMs || sample.visibility !== 'visible') return false;
  return same(summary, { elapsed: sample.elapsed, frames: sample.frames,
    mean: sample.intervals.reduce((a, b) => a + b, 0) / sample.frames,
    p95: percentile(sample.intervals), max: Math.max(...sample.intervals), visibility: sample.visibility });
}

function timingValid(inner) {
  const windows = inner?.nativeMac619?.windows;
  if (!Array.isArray(windows) || windows.length !== 9 || !same(inner.performanceLimits, LIMITS)) return false;
  for (const [lane, offset, samples] of [['mobilePerformance', 0, 10], ['performance', 5, 30]]) {
    for (const [phaseIndex, phase] of ['day', 'night'].entries()) {
      const pair = inner[lane]?.[phase], b = pair?.baseline, c = pair?.candidate;
      if (!b || !c) return false;
      for (const [modeIndex, measurement] of [b, c].entries()) {
        if (!Array.isArray(measurement.warm) || measurement.warm.length !== samples || !measurement.warm.every(finite) ||
          measurement.warmP95 !== percentile(measurement.warm) ||
          !rafSummaryValid(measurement.raf, windows[offset + phaseIndex * 2 + modeIndex])) return false;
      }
      if (!(c.warmP95 <= b.warmP95 * 1.5 + 5 && c.raf.p95 <= b.raf.p95 * 1.5 + 5 &&
        c.raf.frames >= (lane === 'performance' && phase === 'day' ? 50 : Math.max(5, b.raf.frames / 2)))) return false;
      if (lane === 'performance' && (!finite(b.cold) || !finite(c.cold) || !(c.cold <= b.cold * 2 + 250))) return false;
    }
  }
  return rafSummaryValid(inner.stability, windows[4]) && inner.stability.elapsed >= 60000 &&
    inner.stability.frames >= 600 && inner.stability.max < 5000;
}

function qualificationValid(inner) {
  const native = inner?.nativeMac619, host = native?.host;
  if (!host || native.platform !== 'darwin' || inner.headless !== false || !Number.isInteger(native.browserPid) ||
    host.activationExit !== 0 || host.foreground?.frontExit !== 0 || host.foreground?.appExit !== 0 ||
    host.foreground?.pid !== native.browserPid || host.foreground?.bundle !== 'com.google.Chrome' ||
    host.window?.bounds?.windowState !== 'fullscreen' || !Number.isFinite(host.window.bounds.width) ||
    !Number.isFinite(host.window.bounds.height) || !(host.viewport?.width >= 1400 && host.viewport?.height >= 900) ||
    !(host.window.bounds.width <= host.viewport.screenWidth && host.window.bounds.height <= host.viewport.screenHeight)) return false;
  return native.windows.every(w => w.before?.valid === true && w.after?.valid === true &&
    mac.boundaryValid(w.before, w, host, native.browserPid) && mac.boundaryValid(w.after, w, host, native.browserPid) &&
    Number.isFinite(w.before.page.timeOrigin) && w.before.page.timeOrigin > 0 && w.after.page.timeOrigin === w.before.page.timeOrigin &&
    Number.isInteger(w.latchBefore?.serial) && w.latchBefore.serial > 0 && w.latchBefore.active === true &&
    w.latchBefore.count === 0 && empty(w.latchBefore.losses) && w.latchAfter?.serial === w.latchBefore.serial &&
    w.latchAfter.active === false && w.latchAfter.count === 0 && empty(w.latchAfter.losses));
}

function resourcesValid(report) {
  const c = report.compile, b = report.displayBefore, p = report.displayPrepared, r = report.displayRestored;
  return Boolean(same(report.boundsMs, mac.BOUNDS) && report.requiredRemainingMs === mac.REQUIRED_REMAINING_MS &&
    report.attempts === 1 && Number.isSafeInteger(report.jobStart) && report.jobStart > 0 &&
    report.deadline === report.jobStart + mac.BOUNDS.job && report.finished >= report.jobStart && report.finished <= report.deadline &&
    report.remainingBeforeInnerMs >= mac.REQUIRED_REMAINING_MS && report.remainingBeforeInnerMs <= mac.BOUNDS.job &&
    !report.error && !report.restoreError && !report.cleanupError && !report.innerSummaryError && !report.profileRetained &&
    report.inner?.cleanupVerified === true && report.inner.launched === true && report.inner.signal === null &&
    finite(report.inner.elapsedMs) && report.inner.elapsedMs <= mac.BOUNDS.inner + mac.BOUNDS.termination &&
    c?.sourceSHA256 === mac.sha256(mac.DISPLAY_SWIFT) && /^[a-f0-9]{64}$/.test(c.binarySHA256) &&
    c.boundMs === mac.BOUNDS.compile && c.terminationGraceMs === mac.BOUNDS.termination &&
    c.resourceBoundMs === mac.BOUNDS.compile + mac.BOUNDS.termination && c.status === 0 && c.signal === null &&
    !c.error && !c.timedOut && !c.aborted && c.cleanupVerified === true && c.launched === true &&
    finite(c.elapsedMs) && c.elapsedMs <= c.resourceBoundMs && report.restoreRequired === true &&
    [b, p, r].every(d => d?.ok === true && d.exitCode === 0 && d.boundMs === mac.BOUNDS.display) &&
    b.action === 'inspect' && p.action === 'prepare' && r.action === 'restore' &&
    Number.isInteger(b.displayID) && Number.isInteger(b.restoreID) && b.before?.id === b.restoreID &&
    p.displayID === b.displayID && r.displayID === b.displayID && p.after?.width >= 1400 && p.after?.height >= 900 &&
    r.after?.id === b.restoreID);
}

function sourceControlsValid(inner) {
  const state = inner?.portability620, native = inner?.native617, final = native?.final;
  if (native?.approvedRuntimeSHA256 !== IDENTITY.runtime || native.retentionInstalled !== false || native.observerInstalled !== false ||
    native.qualityTolerance !== 0 || native.timingRun !== true || native.releaseGatePassed !== false ||
    inner.nativeSource603?.sourceSHA256 !== IDENTITY.runtime || inner.nativeSource603?.baseSHA256 !== portability.BASE_SHA256 ||
    inner.baseIndexSHA256 !== portability.BASE_SHA256 || inner.phase !== 'core' || !empty(inner.newPins) ||
    !final?.native || !final.unchangedNightHelper || !empty(final.retiredGlobals) || final.slot !== 3 || final.url !== '/index.html' ||
    !same(inner.slotIsolation617?.keys, require('./native-correctness.cjs').SLOT_KEYS) || !(inner.slotIsolation617?.checks > 0) ||
    !Array.isArray(inner.transitions617) || inner.transitions617.length !== 26 ||
    !inner.transitions617.every(t => t.modelExact === true && t.actorsExact === true && t.rngCalls === 0 &&
      t.native === true && t.unchangedNightHelper === true && empty(t.retiredGlobals) && t.slot === 3) ||
    inner.finalFlags?.T603 !== true || inner.finalFlags.T596 !== false || inner.finalFlags.T600 !== false ||
    !Array.isArray(inner.checks)) return false;
  const requiredChecks = ['exact approved T603 release index', 'exact approved T603 release service worker',
    'all 16 legacy escape frames checked without hash-only shortcut', 'one-minute paused city unchanged',
    '26 native model/actor/RNG-preserving transitions', 'requested phase coverage complete: core',
    'all unchanged performance gates must pass: ', 'final preview flags preserved', 'zero runtime/console/app errors',
    'T620 all same-browser controls complete before final historical verdict'];
  for (const seed of [22, 777, 301]) for (const label of ['root/ref', 'fields', 'roundtrip', 'second-load fields'])
    requiredChecks.push('Chrome old-save ' + label + ' ' + seed);
  if (!requiredChecks.every(check => inner.checks.includes(check))) return false;
  return state.captures.every((row, i) => {
    const old = [1, 2, 5].includes(i);
    return row.kind === (old ? 'old' : 'candidate') && row.sourceSHA256 === (old ? portability.BASE_SHA256 : IDENTITY.runtime) &&
      row.identity?.version === (old ? '11.211' : '11.212') && row.identity?.url === (old ? '/baseline603.html' : '/index.html') &&
      row.identity?.civicFactory === (old ? 'undefined' : 'function') && row.flags?.T603 === !old &&
      row.flags.T596 === false && row.flags.T600 === false;
  });
}

function acceptance(report) {
  const failures = [], requireGate = (value, label) => { if (!value) failures.push(label); };
  try {
    requireGate(portability.collectionComplete(report) && report.collectionCompleted === true, 'complete unchanged T620 collection');
    requireGate(report.portabilityAdapterSHA256 === IDENTITY.portabilityAdapter && report.releaseGatePassed === false, 'exact T620 identity and original release verdict');
    requireGate(resourcesValid(report), 'one attempt, original resource bounds, child cleanup and display restoration');
    requireGate(sourceControlsValid(report.innerSummary), 'approved runtime, independent source, model/RNG, save and final controls');
    requireGate(qualificationValid(report.innerSummary), 'all original native foreground, viewport and passive loss-latch controls');
    requireGate(timingValid(report.innerSummary), 'all unchanged original timing thresholds and nine raw sample windows');
    const failedHistory = report.innerSummary?.portability620?.historical?.some(row => !row.value);
    requireGate(report.status === (failedHistory ? 'failed' : 'passed') && report.inner?.status === (failedHistory ? 2 : 0),
      'original diagnostic status and exit preserved');
  } catch (error) { failures.push('malformed or missing required evidence: ' + error.message); }
  return { policy: linux.POLICY, scope: 'native-original-timing-and-same-browser-controls',
    status: failures.length ? 'rejected' : 'accepted', nativeLaneAccepted: failures.length === 0, failures,
    linuxCorrectness: 'separately-required', approvedRuntimeSHA256: IDENTITY.runtime,
    originalDiagnostic: { status: report?.status, innerStatus: report?.innerSummary?.status, exitCode: report?.inner?.status,
      historical: report?.innerSummary?.portability620?.historical?.map(row => ({ id: row.id, passed: row.passed,
        differences: row.differences?.length, originalDifferences: row.originalDifferences?.length })) },
    limitation: LIMITATION };
}

async function supervise(options = {}) {
  assertSources();
  const report = await portability.supervise(options); // Does not modify T620, its report, or its exit verdict.
  const result = acceptance(report), rawPath = path.join(path.resolve(options.out), 'native-portability-supervisor.json');
  result.rawDiagnostic = { file: path.basename(rawPath), sha256: mac.sha256(fs.readFileSync(rawPath)) };
  fs.writeFileSync(path.join(path.resolve(options.out), 'release-native-acceptance.json'), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('RELEASE_NATIVE_ACCEPTANCE_OVERLAY_OK ' + assertSources().sha256); return; }
  if (process.argv.includes('--self-test')) {
    const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'release-acceptance.test.mjs')], { stdio: 'inherit' });
    process.exitCode = r.status === 0 ? 0 : 1; return;
  }
  if (process.argv.some(a => a.startsWith('--inner='))) throw Error('Only the unchanged T619 supervisor may launch native diagnostic source');
  if (process.argv.some(a => a.startsWith('--phase=') && a !== '--phase=core')) throw Error('Only the complete original native core phase is permitted');
  const outArg = process.argv.find(a => a.startsWith('--out='));
  if (!outArg) throw Error('Explicit --out= is required for one-attempt evidence');
  const controller = new AbortController(), stop = () => controller.abort();
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const result = await supervise({ out: outArg.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('RELEASE_NATIVE_ACCEPTANCE ' + JSON.stringify(result));
    process.exitCode = result.nativeLaneAccepted ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}
module.exports = { IDENTITY, LIMITATION, LIMITS, assertSources, rafSummaryValid, timingValid, qualificationValid,
  resourcesValid, sourceControlsValid, acceptance, supervise };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 2; });
