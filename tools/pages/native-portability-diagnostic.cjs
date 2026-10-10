'use strict';
// Opt-in T620 diagnostic. Historical pins remain fatal; the Linux release gate is unchanged.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const mac = require('./native-mac-diagnostic.cjs'), canonical = require('./native-correctness.cjs');
const BASE_SHA256 = 'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265';
const PARENT = Object.freeze({ commit: '16514fd27a2c143c0f0c79a3d08197150d72438f',
  harness: 'ee31668aa1243a64041c282538ed2fdcb740056c677d71ec27f22eae9bda7566',
  nativeMacOutput: 'b5e6d224818101a09ff3ab6321219497e866a7ac5856330a2124a39998f0c397',
  nativeMacAdapter: '4b653115b6cb24022349cdaef9f8895cda8a0af844e488cb53b1ec4974a82e68',
  canonicalAdapter: '9a0bac2c143e27f722eb84e160a796fa0a561d7983382ae67bd4bb08b98b9028' });
const LIMITATION = 'Exact CRC-map equality is not exhaustive per-sprite RGBA equality. All original full-frame RGBA controls remain required. Added document boots and readbacks change this protocol; it cannot isolate Metal causality, establish physical-device FPS or active-gameplay improvement, or replace the required Linux release gate.';
const HISTORICAL = Object.freeze([
  Object.freeze({ id: 'immutable-baseline', condition: '!report.pinDiff.length',
    assertion: "check(!report.pinDiff.length,'approved 1586 keys unchanged: '+JSON.stringify(report.pinDiff));",
    arguments: "!report.pinDiff.length,'approved 1586 keys unchanged: '+JSON.stringify(report.pinDiff),report.pinDiff" }),
  Object.freeze({ id: 'candidate-fixture', condition: '!report.candidatePinDiff.length',
    assertion: "check(!report.candidatePinDiff.length,'candidate pins match Chromium: '+JSON.stringify(report.candidatePinDiff));",
    arguments: "!report.candidatePinDiff.length,'candidate pins match Chromium: '+JSON.stringify(report.candidatePinDiff),report.candidatePinDiff" })
]);

// This self-contained host controller is embedded into the identity-checked emitted
// source. It does not replace browser APIs, rendering, sampling or original checks.
function createPortability620({ report, persist, check, ev, send, ready, port,
  baseline, candidate, actual, baseSource, baseHash, hash, save, expectedBaseHash, limitation }) {
  const copy = value => JSON.parse(JSON.stringify(value));
  const freezeMap = value => Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, Object.freeze([...v])])));
  const expectedKeys = Object.keys(baseline).sort();
  const state = report.portability620 = { protocol: 'T620-same-browser-CRC', limitation,
    baseSourceSHA256: hash(baseSource), inverseSourceSHA256: baseHash,
    historical: [], captures: [], comparisons: [], preTimingControlsPassed: false,
    candidateRepeatPassed: false, laterOldPassed: false, originalChecksComplete: false };
  let oldPins, preflightStarted = false;
  const origins = new Set();
  const difference = (expected, observed) => {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(observed)])].sort();
    return keys.filter(k => !Object.hasOwn(expected, k) || !Object.hasOwn(observed, k) || JSON.stringify(expected[k]) !== JSON.stringify(observed[k]))
      .map(key => ({ key, missing: !Object.hasOwn(observed, key), extra: !Object.hasOwn(expected, key),
        expected: Object.hasOwn(expected, key) ? copy(expected[key]) : null,
        actual: Object.hasOwn(observed, key) ? copy(observed[key]) : null }));
  };
  const compare = (label, expected, observed, fatal = true) => {
    const differences = difference(expected, observed), row = { label, passed: differences.length === 0, differences };
    state.comparisons.push(row); persist();
    if (fatal) check(row.passed, 'T620 exact complete CRC-map equality: ' + label + ': ' + JSON.stringify(differences));
    return row;
  };
  const completeMap = (pins, label) => {
    const object = pins && typeof pins === 'object' && !Array.isArray(pins);
    const keys = object ? Object.keys(pins).sort() : [];
    const missing = expectedKeys.filter(k => !keys.includes(k)), extra = keys.filter(k => !expectedKeys.includes(k));
    const malformed = object ? keys.filter(k => !Array.isArray(pins[k]) || pins[k].length < 1 || pins[k].length > 3 ||
      pins[k].some(v => typeof v !== 'string' || !/^[0-9a-f]{1,8}$/.test(v))) : ['not-an-object'];
    const result = { count: keys.length, missing, extra, malformed };
    check(object && keys.length === 1586 && !missing.length && !extra.length && !malformed.length,
      'T620 exact 1586-key CRC map: ' + label + ': ' + JSON.stringify(result));
    return result;
  };
  const capture = async (label, kind, pinsAlreadyRead) => {
    const snapshot = await ev('({identity:__s603.documentIdentity(),flags:__s603.flags(),timeOrigin:performance.timeOrigin' +
      (pinsAlreadyRead === undefined ? ',pins:__s603.pins()' : '') + '})');
    const pins = pinsAlreadyRead === undefined ? snapshot.pins : pinsAlreadyRead;
    const { identity, flags, timeOrigin } = snapshot;
    const old = kind === 'old';
    const row = { label, kind, identity, flags, timeOrigin, sourceSHA256: old ? state.baseSourceSHA256 : report.nativeSource603?.sourceSHA256,
      file: 'T620-' + label + '-pins.json', keyCount: pins && typeof pins === 'object' ? Object.keys(pins).length : null };
    state.captures.push(row); save(row.file, pins); persist();
    check(identity && identity.version === (old ? '11.211' : '11.212') && identity.url === (old ? '/baseline603.html' : '/index.html') &&
      identity.civicFactory === (old ? 'undefined' : 'function') && flags && flags.T603 === !old && !flags.T596 && !flags.T600,
      'T620 document identity and flags: ' + label);
    check(Number.isFinite(timeOrigin) && timeOrigin > 0 && !origins.has(timeOrigin), 'T620 fresh independent timeOrigin: ' + label);
    origins.add(timeOrigin); row.keySet = completeMap(pins, label); row.verified = true; persist();
    return { pins: freezeMap(pins), timeOrigin };
  };
  return {
    defer(id, value, message, originalDifferences) {
      const descriptors = [
        ['immutable-baseline', '!report.pinDiff.length', baseline],
        ['candidate-fixture', '!report.candidatePinDiff.length', candidate]
      ];
      const descriptor = descriptors[state.historical.length];
      check(descriptor && descriptor[0] === id, 'T620 exactly two ordered historical assertions');
      const differences = difference(descriptor[2], actual);
      check(typeof value === 'boolean' && value === (originalDifferences.length === 0), 'T620 original historical condition retained: ' + id);
      state.historical.push({ id, condition: descriptor[1], value, passed: value, message,
        originalDifferences: copy(originalDifferences), differences });
      persist();
    },
    async preflight() {
      check(!preflightStarted, 'T620 one pre-timing control attempt only'); preflightStarted = true;
      check(state.historical.length === 2, 'T620 both original historical comparisons recorded');
      check(state.baseSourceSHA256 === expectedBaseHash && baseHash === expectedBaseHash, 'T620 immutable reconstructed T602 source SHA256');
      check(expectedKeys.length === 1586, 'T620 immutable baseline key count');
      completeMap(baseline, 'historical-baseline'); completeMap(candidate, 'historical-candidate'); completeMap(actual, 'initial-candidate');
      save('T620-historical-baseline-pins.json', baseline); save('T620-historical-candidate-pins.json', candidate);
      const initial = await capture('candidate-initial', 'candidate', actual);
      await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/baseline603.html' }); await ready(initial.timeOrigin);
      const first = await capture('old-first', 'old'); oldPins = first.pins;
      compare('old-first-against-history', baseline, oldPins, false);
      await send('Page.reload', { ignoreCache: true }); await ready(first.timeOrigin);
      const second = await capture('old-repeat', 'old');
      compare('old-repeat-against-history', baseline, second.pins, false);
      compare('independent-old-reloads', oldPins, second.pins);
      compare('old-source-to-inherited-candidate', oldPins, actual);
      await send('Page.navigate', { url: 'http://127.0.0.1:' + port + '/index.html' }); await ready(second.timeOrigin);
      const returned = await capture('candidate-return', 'candidate');
      compare('returned-candidate-to-original', actual, returned.pins);
      state.preTimingControlsPassed = true; persist();
    },
    async candidateRepeat(pins) {
      check(state.preTimingControlsPassed && !state.candidateRepeatPassed, 'T620 candidate repeat follows one completed preflight');
      const repeated = await capture('candidate-repeat', 'candidate', pins);
      compare('original-candidate-repeat-to-old-source', oldPins, repeated.pins);
      state.candidateRepeatPassed = true; persist();
    },
    async laterOld() {
      check(state.candidateRepeatPassed && !state.laterOldPassed, 'T620 later old-document control follows original candidate repeat');
      const later = await capture('later-old', 'old');
      compare('later-old-to-independent-old', oldPins, later.pins);
      state.laterOldPassed = true; persist();
    },
    finishOriginal() {
      check(state.preTimingControlsPassed && state.candidateRepeatPassed && state.laterOldPassed && state.historical.length === 2,
        'T620 all same-browser controls complete before final historical verdict');
      state.originalChecksComplete = true;
      state.finalHistoricalVerdict = { passed: state.historical.every(row => row.value),
        failedIds: state.historical.filter(row => !row.value).map(row => row.id),
        firstFailureMessage: state.historical.find(row => !row.value)?.message || null };
      persist();
      // Reassert original conditions/messages after the unchanged runtime checks.
      // A historical failure still throws before the original passed assignment.
      for (const row of state.historical) check(row.value, row.message);
    }
  };
}

// This is the entire explicit transformation allowlist, applied once per anchor.
function transformations() {
  const writePins = "    fs.writeFileSync(path.join(OUT,'sprite-pins.json'),JSON.stringify(actual));";
  const initialization = '    const portability620=(' + createPortability620.toString() + ')({report,persist,check,ev,send,ready,port:PORT,baseline,candidate,actual,baseSource:exactBase603,baseHash:nativeSource603.baseSHA256,hash,save:(name,pins)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(pins)),expectedBaseHash:' + JSON.stringify(BASE_SHA256) + ',limitation:' + JSON.stringify(LIMITATION) + '});';
  const repeat = "    check(JSON.stringify(actual)===JSON.stringify(repeated),'two independent Chrome boots have identical complete sprite pins');";
  const finalRuntime = "check(!errors.length&&!consoleErrors.length&&!report.errLog.length,'zero runtime/console/app errors');";
  return [
    { label: 'initialize independent CRC controls', from: writePins, to: writePins + '\n' + initialization },
    ...HISTORICAL.map(row => ({ label: 'defer historical equality: ' + row.id, from: row.assertion,
      to: 'portability620.defer(' + JSON.stringify(row.id) + ',' + row.arguments + ');' })),
    { label: 'pre-timing independent old-source reloads', from: '    // Independent second boot, same Chrome: the new pixels must be reproducible.',
      to: '    await portability620.preflight();\n    // Independent second boot, same Chrome: the new pixels must be reproducible.' },
    { label: 'preserve and qualify original candidate repeat', from: repeat, to: repeat + '\n    await portability620.candidateRepeat(repeated);' },
    { label: 'later exact old-document CRC consistency', from: 'report.baseDocumentIdentity=baseIdentity;',
      to: 'report.baseDocumentIdentity=baseIdentity;await portability620.laterOld();' },
    { label: 'fatal historical verdict after original runtime checks', from: finalRuntime,
      to: finalRuntime + 'portability620.finishOriginal();' }
  ];
}

function build(input) {
  const raw = input === undefined ? fs.readFileSync(path.resolve(__dirname, '../../docs/tasks/t603-shots/scene603.js'), 'utf8') : input;
  const original = mac.build(raw);
  if (original.sha256 !== PARENT.nativeMacOutput || original.canonicalHarnessSHA256 !== PARENT.harness ||
    original.adapterSHA256 !== PARENT.nativeMacAdapter || original.canonicalAdapterSHA256 !== PARENT.canonicalAdapter) {
    throw Error('T620 exact reviewed T619 source identity drift');
  }
  let source = original.source;
  const edits = transformations(), changes = [];
  for (const { label, from, to } of edits) {
    if (source.split(from).length !== 2) throw Error('T620 exact transformation anchor drift: ' + label);
    source = source.replace(from, to);
    changes.push({ label, occurrences: 1, beforeSHA256: mac.sha256(from), afterSHA256: mac.sha256(to) });
  }
  let reversed = source;
  for (const { label, from, to } of [...edits].reverse()) {
    if (reversed.split(to).length !== 2) throw Error('T620 inverse transformation drift: ' + label);
    reversed = reversed.replace(to, from);
  }
  if (reversed !== original.source) throw Error('T620 change outside explicit transformation allowlist');
  for (const [name, span] of Object.entries(canonical.TIMING)) {
    const a = raw.indexOf(span.start), block = raw.slice(a, raw.indexOf(span.end, a));
    if (mac.sha256(block) !== span.sha256 || source.split(block).length !== 2) throw Error('T620 original timing drift: ' + name);
  }
  const browserExpression = original.source.match(/const raf=async ms=>\{await nativeMacQualifier619\.before\(ms\);const r=await ev\(([\s\S]*?)\);await nativeMacQualifier619\.after\(r\);return \{elapsed:r\.elapsed/)[1];
  if (source.split(browserExpression).length !== 2) throw Error('T620 original browser RAF expression drift');
  new Function('require', '__filename', '__dirname', source);
  return { ...original, source, sha256: mac.sha256(source), nativeMacOutputSHA256: original.sha256,
    portabilityAdapterSHA256: mac.sha256(fs.readFileSync(__filename)), portabilityChanges: changes,
    browserRAFExpressionSHA256: mac.sha256(browserExpression), baseSourceSHA256: BASE_SHA256,
    parentCommit: PARENT.commit, limitation620: LIMITATION };
}

function collectionComplete(report) {
  const inner = report.innerSummary, state = inner?.portability620, verdict = state?.finalHistoricalVerdict;
  const windows = inner?.nativeMac619?.windows;
  const sequence = [
    ['mobile-day-baseline', 390, 844, 5000], ['mobile-day-candidate', 390, 844, 5000],
    ['mobile-night-baseline', 390, 844, 5000], ['mobile-night-candidate', 390, 844, 5000],
    ['mobile-liveness', 390, 844, 60000], ['desktop-day-baseline', 1400, 900, 5000],
    ['desktop-day-candidate', 1400, 900, 5000], ['desktop-night-baseline', 1400, 900, 5000],
    ['desktop-night-candidate', 1400, 900, 5000]
  ];
  const historicalValid = state?.historical?.length === 2 && state.historical.every((row, i) =>
    row.id === HISTORICAL[i].id && row.condition === HISTORICAL[i].condition && typeof row.value === 'boolean' &&
    row.passed === row.value && Array.isArray(row.originalDifferences) && row.value === !row.originalDifferences.length &&
    Array.isArray(row.differences) && row.value === !row.differences.length &&
    JSON.stringify(row.differences.map(diff => diff.key).sort()) === JSON.stringify([...row.originalDifferences].sort()) &&
    row.message === (i === 0 ? 'approved 1586 keys unchanged: ' : 'candidate pins match Chromium: ') + JSON.stringify(row.originalDifferences));
  const captureLabels = ['candidate-initial', 'old-first', 'old-repeat', 'candidate-return', 'candidate-repeat', 'later-old'];
  const capturesValid = state?.captures?.length === captureLabels.length && new Set(state.captures.map(row => row.timeOrigin)).size === captureLabels.length &&
    state.captures.every((row, i) => row.label === captureLabels[i] && row.verified === true && Number.isFinite(row.timeOrigin) && row.timeOrigin > 0 &&
      row.keyCount === 1586 && row.keySet?.count === 1586 && row.keySet.missing?.length === 0 &&
      row.keySet.extra?.length === 0 && row.keySet.malformed?.length === 0);
  const comparisonLabels = ['old-first-against-history', 'old-repeat-against-history', 'independent-old-reloads',
    'old-source-to-inherited-candidate', 'returned-candidate-to-original', 'original-candidate-repeat-to-old-source', 'later-old-to-independent-old'];
  const comparisonsValid = state?.comparisons?.length === comparisonLabels.length && state.comparisons.every((row, i) =>
    row.label === comparisonLabels[i] && Array.isArray(row.differences) && row.passed === !row.differences.length && (i < 2 || row.passed));
  const expectedFailure = state?.historical?.find(row => !row.value)?.message;
  const verdictMatches = historicalValid && verdict?.passed === !expectedFailure &&
    JSON.stringify(verdict?.failedIds) === JSON.stringify(state.historical.filter(row => !row.value).map(row => row.id)) &&
    verdict?.firstFailureMessage === (expectedFailure || null) &&
    (expectedFailure ? inner.status === 'failed' && report.inner?.status === 2 && inner.error?.split('\n')[0] === 'Error: ' + expectedFailure :
      inner.status === 'passed' && report.inner?.status === 0);
  return Boolean(report.completed && report.cleanupVerified && report.profileRemoved && report.restored &&
    !report.inner?.timedOut && !report.inner?.aborted && !report.inner?.error && verdictMatches && capturesValid && comparisonsValid &&
    state.baseSourceSHA256 === BASE_SHA256 && state.inverseSourceSHA256 === BASE_SHA256 &&
    state.preTimingControlsPassed && state.candidateRepeatPassed && state.laterOldPassed && state.originalChecksComplete &&
    inner.nativeMac619.complete && inner.browserVersion && inner.gpuInfo?.devices?.length &&
    windows?.length === 9 && windows.every((row, i) => row.qualified === true && row.label === sequence[i][0] &&
      row.width === sequence[i][1] && row.height === sequence[i][2] && row.requestedMs === sequence[i][3] && row.dpr === 1) &&
    inner.coverage?.core === true && inner.performanceFailures?.length === 0 &&
    inner.exceptions?.length === 0 && inner.consoleErrors?.length === 0 && inner.errLog?.length === 0);
}

async function supervise(options = {}) {
  const expected = build(), built = options.built || expected;
  if (built.sha256 !== expected.sha256 || built.sha256 !== mac.sha256(built.source) || built.adapterSHA256 !== PARENT.nativeMacAdapter ||
    built.portabilityAdapterSHA256 !== mac.sha256(fs.readFileSync(__filename))) throw Error('T620 adapter identity mismatch');
  const report = await mac.supervise({ ...options, built });
  // Only after the original supervisor has verified child cleanup, profile removal,
  // display restoration and the overall deadline may collection be called complete.
  const collectionCompleted = collectionComplete(report);
  const result = { ...report, status: report.status === 'passed' && !collectionCompleted ? 'incomplete' : report.status,
    collectionCompleted, releaseGatePassed: false,
    limitation620: LIMITATION, portabilityAdapterSHA256: built.portabilityAdapterSHA256 };
  fs.writeFileSync(path.join(path.resolve(options.out), 'native-portability-supervisor.json'), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('NATIVE_PORTABILITY_OVERLAY_OK ' + build().sha256); return; }
  if (process.argv.includes('--self-test')) {
    const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'native-portability-diagnostic.test.cjs')], { stdio: 'inherit' });
    process.exitCode = result.status === 0 ? 0 : 1; return;
  }
  if (process.argv.some(arg => arg.startsWith('--inner='))) throw Error('Only the unchanged T619 supervisor may launch emitted diagnostic source');
  if (process.argv.some(arg => arg.startsWith('--phase=') && arg !== '--phase=core')) throw Error('Only the complete original core phase is permitted');
  const outArg = process.argv.find(arg => arg.startsWith('--out='));
  if (!outArg) throw Error('Explicit --out= is required for one-attempt evidence');
  const controller = new AbortController(), stop = () => controller.abort();
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const result = await supervise({ out: outArg.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('NATIVE_PORTABILITY_DIAGNOSTIC ' + JSON.stringify({ status: result.status, collectionCompleted: result.collectionCompleted,
      releaseGatePassed: false, restored: result.restored, cleanupVerified: result.cleanupVerified }));
    process.exitCode = result.status === 'passed' ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}

module.exports = { BASE_SHA256, PARENT, LIMITATION, HISTORICAL, createPortability620, transformations, build, collectionComplete, supervise };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 2; });
