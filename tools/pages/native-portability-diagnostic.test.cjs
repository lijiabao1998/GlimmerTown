'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const probe = require('./native-portability-diagnostic.cjs'), mac = require('./native-mac-diagnostic.cjs');
const canonical = require('./native-correctness.cjs');
const ROOT = path.resolve(__dirname, '../..'), SCENES = path.join(ROOT, 'docs/tasks/t603-shots');
const raw = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8'), built = probe.build(raw), native = mac.build(raw);
const clone = value => JSON.parse(JSON.stringify(value));
const pinsOf = value => value.pins || Object.fromEntries(Object.entries(value).filter(([key]) => key !== '__meta'));
const baseline = pinsOf(JSON.parse(fs.readFileSync(path.join(SCENES, 'fixtures/sprite-pins-v11.211.json'), 'utf8')));
// T627: an injected frozen pair (329f660 old, 4dd0fa4 candidate) from git objects, so this validate
// test is deterministic and never touches the live site or depends on what HEAD currently ships.
const native603 = require(path.join(SCENES, 'native603.js'));
const frozenPrevious = native603.frozenRelease603(native603.T602_LIVE_COMMIT);
const source = native603.releaseBaseline603(native603.frozenT603Index(), undefined, frozenPrevious);
const changedMap = () => { const map = clone(baseline), key = Object.keys(map)[0]; map[key][0] = map[key][0] === 'abcdef' ? 'abcdef0' : 'abcdef'; return map; };
const failCheck = (value, message) => { if (!value) throw Error(message); };
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-portability-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir;
}

test('fixture source is the injected frozen pair 329f660 -> 4dd0fa4 read from git objects', () => {
  assert.equal(source.previousCommit, native603.T602_LIVE_COMMIT); assert.equal(source.previousVersion, '11.211');
  assert.equal(source.baseSHA256, probe.BASE_SHA256); assert.equal(source.baseSHA256, frozenPrevious.sourcePins['index.html']);
  assert.equal(mac.sha256(source.base), source.baseSHA256);
  assert.equal(source.sourceSHA256, native603.APPROVED_NATIVE_SHA256);
  assert.equal(source.base, native603.assertNativeSource603(native603.frozenT603Index()).base, 'historical inverse and frozen live release agree');
});

test('exact seven-edit allowlist reverses to reviewed T619 and only two assertions are deferred', () => {
  assert.equal(built.parentCommit, '16514fd27a2c143c0f0c79a3d08197150d72438f');
  assert.equal(built.nativeMacOutputSHA256, probe.PARENT.nativeMacOutput);
  assert.equal(built.adapterSHA256, native.adapterSHA256, 'unchanged supervisor contract identifies the original mac module');
  assert.equal(built.portabilityAdapterSHA256, mac.sha256(fs.readFileSync(require.resolve('./native-portability-diagnostic.cjs'))));
  assert.equal(built.portabilityChanges.length, 7);
  assert(built.portabilityChanges.every(row => row.occurrences === 1));
  let reversed = built.source;
  for (const edit of probe.transformations().reverse()) {
    assert.equal(reversed.split(edit.to).length, 2, edit.label); reversed = reversed.replace(edit.to, edit.from);
  }
  assert.equal(reversed, native.source, 'no hidden source changes beyond enumerated edits');
  assert.equal((built.source.match(/portability620\.defer\(/g) || []).length, 2);
  for (const row of probe.HISTORICAL) {
    assert.equal(built.source.includes(row.assertion), false);
    assert(built.source.includes('portability620.defer(' + JSON.stringify(row.id) + ',' + row.arguments + ');'));
  }
  for (const assertion of native.source.match(/(?:check|perfCheck)\([^\n]*?\);/g)) {
    if (!probe.HISTORICAL.some(row => row.assertion === assertion)) assert(built.source.includes(assertion), assertion);
  }
  assert(built.source.includes("check(Object.keys(baseline).length===1586,'immutable baseline has 1586 keys');"));
  assert(built.source.includes("check(report.newPins.length===0,'no legacy SPR keys added or replaced');"));
});

test('every original timing span and RAF expression remains byte-identical; existing controls stay ordered', () => {
  for (const [name, span] of Object.entries(canonical.TIMING)) {
    const start = raw.indexOf(span.start), block = raw.slice(start, raw.indexOf(span.end, start));
    assert.equal(mac.sha256(block), span.sha256); assert.equal(built.source.split(block).length, 2, name);
  }
  const expression = raw.match(/const raf=async ms=>\{const r=await ev\(([\s\S]*?)\);return \{elapsed:r\.elapsed/)[1];
  assert.equal(built.source.split(expression).length, 2);
  assert.equal(built.browserRAFExpressionSHA256, mac.sha256(expression));
  const preflight = built.source.indexOf('await portability620.preflight();');
  const repeat = built.source.indexOf("const previousTimeOrigin=await ev('performance.timeOrigin');await send('Page.reload',{ignoreCache:true});await ready(previousTimeOrigin);const repeated=await ev('__s603.pins()');");
  const later = built.source.indexOf('await portability620.laterOld();');
  assert(preflight > 0 && repeat > preflight && later > repeat && later < built.source.indexOf(canonical.TIMING.mobile.start));
  const runtime = built.source.indexOf("check(!errors.length&&!consoleErrors.length&&!report.errLog.length,'zero runtime/console/app errors');");
  assert(runtime < built.source.indexOf('portability620.finishOriginal();') && built.source.indexOf('portability620.finishOriginal();') < built.source.indexOf("report.status='passed';"));
  for (const marker of ['all 16 legacy escape frames checked without hash-only shortcut', 'all unchanged performance gates must pass:',
    'slots1/2/backups/legacy bytes unchanged', 'Chrome old-save second-load fields', '26 native model/actor/RNG-preserving transitions']) assert(built.source.includes(marker));
  assert.equal(built.source.includes('collectionCompleted'), false, 'inner process cannot declare outer collection complete');
});

test('any canonical input drift fails the exact reviewed identity, including non-timing comments', () => {
  assert.throws(() => probe.build(raw + '\n// unexpected source change\n'), /exact reviewed T619 source identity drift/);
  for (const span of Object.values(canonical.TIMING)) assert.throws(() => probe.build(raw.replace(span.start, span.start + '\nthrow Error("drift");')), /timing byte drift/);
  assert.throws(() => probe.build(raw.replace('--disable-gpu', '--other-gpu')), /Chrome launch drift/);
  for (const row of probe.HISTORICAL) assert.throws(() => probe.build(raw.replace(row.assertion, row.assertion.replace('check(', 'otherCheck('))), /exact reviewed T619 source identity drift/);
});

function fixture(options = {}) {
  const actual = options.historyMatches ? clone(baseline) : changedMap();
  const snapshots = [], commands = [], readyCalls = [], files = new Map(), report = { status: 'running', checks: [],
    nativeSource603: { sourceSHA256: source.sourceSHA256 } };
  let document = 'candidate', timeOrigin = 100, snapshotIndex = 0;
  const changes = options.changes || {};
  const labels = ['candidate-initial', 'old-first', 'old-repeat', 'candidate-return', 'candidate-repeat', 'later-old'];
  const ev = async expression => {
    const label = labels[snapshotIndex++];
    const snapshot = { identity: { version: document === 'old' ? '11.211' : '11.212',
      civicFactory: document === 'old' ? 'undefined' : 'function', url: document === 'old' ? '/baseline603.html' : '/index.html' },
      flags: { T603: document !== 'old', T596: false, T600: false }, timeOrigin };
    if (expression.includes(',pins:')) snapshot.pins = clone(actual);
    if (changes[label]) changes[label](snapshot);
    snapshots.push({ label, expression, snapshot: clone(snapshot) }); return snapshot;
  };
  const send = async (method, params) => {
    commands.push({ method, params });
    if (method === 'Page.navigate') document = params.url.endsWith('/baseline603.html') ? 'old' : 'candidate';
    else assert.equal(method, 'Page.reload');
    timeOrigin++; return {};
  };
  const ready = async previous => { readyCalls.push(previous); assert.notEqual(previous, timeOrigin); };
  const check = (value, message) => { failCheck(value, message); report.checks.push(message); };
  let persists = 0;
  // Deserialize the exact self-contained function that is embedded in the emitted source.
  const create = new Function('return (' + probe.createPortability620.toString() + ');')();
  const control = create({ report, persist: () => persists++, check, ev, send, ready, port: 8763,
    baseline: clone(baseline), candidate: clone(baseline), actual, baseSource: options.baseSource ?? source.base,
    baseHash: options.baseHash ?? source.baseSHA256, expectedBaseHash: probe.BASE_SHA256, hash: mac.sha256,
    save: (name, pins) => files.set(name, clone(pins)), limitation: probe.LIMITATION });
  const originalDiff = Object.keys(baseline).filter(k => JSON.stringify(baseline[k]) !== JSON.stringify(actual[k]));
  function defer() {
    control.defer('immutable-baseline', !originalDiff.length, 'approved 1586 keys unchanged: ' + JSON.stringify(originalDiff), originalDiff);
    control.defer('candidate-fixture', !originalDiff.length, 'candidate pins match Chromium: ' + JSON.stringify(originalDiff), originalDiff);
  }
  async function originalRepeat(pins = clone(actual)) {
    await send('Page.reload', { ignoreCache: true }); await ready(timeOrigin - 1);
    check(JSON.stringify(actual) === JSON.stringify(pins), 'two independent Chrome boots have identical complete sprite pins');
    await control.candidateRepeat(pins);
  }
  async function laterOld() {
    await send('Page.navigate', { url: 'http://127.0.0.1:8763/baseline603.html' }); await ready(timeOrigin - 1);
    await control.laterOld();
  }
  return { actual, report, control, snapshots, commands, readyCalls, files, originalDiff, defer, originalRepeat, laterOld,
    get persists() { return persists; } };
}

async function completedControl(options = {}) {
  const f = fixture(options); f.defer(); await f.control.preflight(); await f.originalRepeat(); await f.laterOld(); return f;
}

test('independent old source repeats exactly, historical mismatches retain all raw differences and stay fatal', async () => {
  const f = await completedControl(), state = f.report.portability620;
  assert.equal(state.preTimingControlsPassed, true); assert.equal(state.candidateRepeatPassed, true); assert.equal(state.laterOldPassed, true);
  assert.equal(state.baseSourceSHA256, probe.BASE_SHA256); assert.equal(state.inverseSourceSHA256, probe.BASE_SHA256);
  assert.deepEqual(f.commands.map(row => [row.method, row.params.url || 'reload']), [
    ['Page.navigate', 'http://127.0.0.1:8763/baseline603.html'], ['Page.reload', 'reload'],
    ['Page.navigate', 'http://127.0.0.1:8763/index.html'], ['Page.reload', 'reload'],
    ['Page.navigate', 'http://127.0.0.1:8763/baseline603.html']
  ]);
  assert.equal(new Set(state.captures.map(row => row.timeOrigin)).size, 6);
  assert(state.captures.every(row => row.verified && row.keyCount === 1586 && !row.keySet.missing.length && !row.keySet.extra.length));
  assert.equal(f.files.size, 8); assert.equal(Object.keys(f.files.get('T620-old-first-pins.json')).length, 1586);
  for (const row of state.historical) {
    assert.equal(row.value, false); assert.equal(row.passed, false); assert.deepEqual(row.originalDifferences, f.originalDiff);
    assert.deepEqual(row.differences, [{ key: f.originalDiff[0], missing: false, extra: false,
      expected: baseline[f.originalDiff[0]], actual: f.actual[f.originalDiff[0]] }]);
  }
  assert.deepEqual(state.comparisons.slice(0, 2).map(row => row.passed), [false, false]);
  assert(state.comparisons.slice(2).every(row => row.passed && row.differences.length === 0));
  assert.throws(() => f.control.finishOriginal(), error => error.message === state.historical[0].message);
  assert.equal(state.originalChecksComplete, true); assert.equal(state.finalHistoricalVerdict.passed, false);
  assert.deepEqual(state.finalHistoricalVerdict.failedIds, ['immutable-baseline', 'candidate-fixture']);
  assert.equal(Object.hasOwn(state, 'collectionCompleted'), false);
});

test('matching history preserves both original passing assertions at the final verdict', async () => {
  const f = await completedControl({ historyMatches: true }); f.control.finishOriginal();
  assert.equal(f.report.portability620.finalHistoricalVerdict.passed, true);
  for (const row of f.report.portability620.historical) {
    assert.equal(row.passed, true); assert.deepEqual(row.differences, []);
    assert.equal(f.report.checks.filter(message => message === row.message).length, 1);
  }
});

test('exactly two ordered historical conditions are recorded without swallowing other checks', async () => {
  const f = fixture();
  assert.throws(() => f.control.defer('candidate-fixture', false, 'wrong order', ['x']), /exactly two ordered/);
  assert.throws(() => f.control.defer('immutable-baseline', true, 'wrong value', ['x']), /condition retained/);
  await assert.rejects(f.control.preflight(), /both original historical comparisons/);
  assert.equal(f.commands.length, 0);
  const g = fixture(); g.defer();
  assert.throws(() => g.control.defer('third', true, 'extra assertion', []), /exactly two ordered/);
  assert.throws(() => g.control.finishOriginal(), /all same-browser controls/);
  assert.equal(g.report.portability620.originalChecksComplete, false);
});

for (const [label, options] of [
  ['tampered inverse bytes', { baseSource: source.base + ' ' }], ['wrong inverse hash', { baseHash: '0'.repeat(64) }]
]) test('preflight rejects ' + label + ' before navigation', async () => {
  const f = fixture(options); f.defer(); await assert.rejects(f.control.preflight(), /immutable reconstructed T602 source SHA256/);
  assert.equal(f.commands.length, 0); assert.equal(f.report.portability620.preTimingControlsPassed, false);
});

const identityFailures = [
  ['old version', 'old-first', snapshot => snapshot.identity.version = '11.212'],
  ['old candidate fallback URL', 'old-first', snapshot => snapshot.identity.url = '/index.html'],
  ['old T603 factory', 'old-first', snapshot => snapshot.identity.civicFactory = 'function'],
  ['old T603 flag', 'old-first', snapshot => snapshot.flags.T603 = true],
  ['old preview flags', 'old-repeat', snapshot => snapshot.flags.T596 = true],
  ['candidate return version', 'candidate-return', snapshot => snapshot.identity.version = '11.211'],
  ['candidate return factory', 'candidate-return', snapshot => snapshot.identity.civicFactory = 'undefined'],
  ['candidate return flags', 'candidate-return', snapshot => snapshot.flags.T603 = false],
  ['initial candidate identity', 'candidate-initial', snapshot => snapshot.identity.url = '/baseline603.html'],
  ['old repeated timeOrigin', 'old-repeat', snapshot => snapshot.timeOrigin = 101],
  ['old initial candidate timeOrigin', 'old-first', snapshot => snapshot.timeOrigin = 100],
  ['candidate reused initial timeOrigin', 'candidate-return', snapshot => snapshot.timeOrigin = 100],
  ['nonfinite timeOrigin', 'old-first', snapshot => snapshot.timeOrigin = Infinity]
];
for (const [label, target, change] of identityFailures) test('pre-timing control rejects ' + label + ' without a recovery loop', async () => {
  const f = fixture({ changes: { [target]: change } }); f.defer();
  await assert.rejects(f.control.preflight(), /document identity and flags|fresh independent timeOrigin/);
  assert.equal(f.report.portability620.preTimingControlsPassed, false);
  const attempts = f.commands.length;
  await assert.rejects(f.control.preflight(), /one pre-timing control attempt/); assert.equal(f.commands.length, attempts);
  assert.equal(f.report.portability620.originalChecksComplete, false);
});

const mapFailures = [
  ['missing CRC key', snapshot => { delete snapshot.pins[Object.keys(snapshot.pins)[0]]; }],
  ['extra CRC key', snapshot => { snapshot.pins.extra = ['abc']; }],
  ['same-count wrong key set', snapshot => { delete snapshot.pins[Object.keys(snapshot.pins)[0]]; snapshot.pins.extra = ['abc']; }],
  ['malformed CRC', snapshot => { snapshot.pins[Object.keys(snapshot.pins)[0]] = ['not-a-crc']; }],
  ['missing complete map', snapshot => { snapshot.pins = null; }]
];
for (const [label, change] of mapFailures) test('old-source control rejects ' + label + ' before timing', async () => {
  const f = fixture({ changes: { 'old-first': change } }); f.defer();
  await assert.rejects(f.control.preflight(), /exact 1586-key CRC map/);
  assert.equal(f.commands.length, 1); assert.equal(f.report.portability620.preTimingControlsPassed, false);
});

for (const [label, changes, expected, maximumCommands] of [
  ['unstable old repeats', { 'old-repeat': snapshot => snapshot.pins = clone(baseline) }, 'independent-old-reloads', 2],
  ['old versus candidate mismatch', { 'old-first': snapshot => snapshot.pins = clone(baseline), 'old-repeat': snapshot => snapshot.pins = clone(baseline) }, 'old-source-to-inherited-candidate', 2],
  ['candidate return drift', { 'candidate-return': snapshot => snapshot.pins = clone(baseline) }, 'returned-candidate-to-original', 3]
]) test('exact CRC inequality rejects ' + label + ' before any original timing', async () => {
  const f = fixture({ changes }); f.defer(); await assert.rejects(f.control.preflight(), new RegExp(expected));
  assert.equal(f.commands.length, maximumCommands); assert.equal(f.report.portability620.preTimingControlsPassed, false);
  const comparison = f.report.portability620.comparisons.at(-1); assert.equal(comparison.passed, false);
  assert.equal(comparison.differences.length, 1); assert(comparison.differences[0].expected && comparison.differences[0].actual);
});

test('original candidate repeat remains fatal and cannot be bypassed by portability controls', async () => {
  const f = fixture(); f.defer(); await f.control.preflight();
  await assert.rejects(f.originalRepeat(clone(baseline)), /two independent Chrome boots have identical complete sprite pins/);
  assert.equal(f.report.portability620.candidateRepeatPassed, false);
  assert.equal(f.report.portability620.captures.length, 4);
});

test('candidate repeat identity and later old full-map consistency are mandatory before timing', async () => {
  const badCandidate = fixture({ changes: { 'candidate-repeat': snapshot => snapshot.identity.version = '11.211' } });
  badCandidate.defer(); await badCandidate.control.preflight();
  await assert.rejects(badCandidate.originalRepeat(), /document identity and flags/);
  const later = fixture({ changes: { 'later-old': snapshot => snapshot.pins = clone(baseline) } });
  later.defer(); await later.control.preflight(); await later.originalRepeat();
  await assert.rejects(later.laterOld(), /later-old-to-independent-old/);
  assert.equal(later.report.portability620.laterOldPassed, false);
  assert.equal(later.report.portability620.originalChecksComplete, false);
});

test('the independent old expected map cannot be rewritten through saved or returned evidence', async () => {
  const f = fixture(); f.defer(); await f.control.preflight();
  f.files.get('T620-old-first-pins.json')[Object.keys(baseline)[0]][0] = 'bbbb';
  f.report.portability620.captures[1].identity.version = 'evidence-only-mutation';
  await f.originalRepeat(); await f.laterOld();
  assert.equal(f.report.portability620.comparisons.at(-1).passed, true);
});

function finalOriginal(f, change = {}) {
  const start = built.source.indexOf("    check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '");
  const end = built.source.indexOf("report.status='passed';exitCode=0;", start) + "report.status='passed';exitCode=0;".length;
  assert(start > 0 && end > start);
  const code = built.source.slice(start, end);
  const execute = new Function('report', 'check', 'ev', 'errors', 'consoleErrors', 'isolated617', 'PHASE', 'portability620',
    'return (async()=>{let exitCode=2;' + code + ';return exitCode;})()');
  f.report.performanceFailures = change.performance ? ['original unchanged RAF failure'] : [];
  f.report.native617 = {}; f.report.coverage = { core: true };
  const ev = async expression => expression === '__s603.flags()' ? { T603: true, T596: false, T600: false } : change.appErrors ? ['app error'] : [];
  return execute(f.report, failCheck, ev, change.runtime ? ['exception'] : [], change.consoleErrors ? ['console error'] : [], async () => ({}), 'core', f.control);
}

for (const [label, change] of [['original timing verdict', { performance: true }], ['runtime exception', { runtime: true }],
  ['console error', { consoleErrors: true }], ['app error', { appErrors: true }]]) test(label + ' stops before collection eligibility and historical reassertion', async () => {
  const f = await completedControl(); await assert.rejects(finalOriginal(f, change), /all unchanged performance gates must pass|zero runtime\/console\/app errors/);
  assert.equal(f.report.portability620.originalChecksComplete, false);
  assert.equal(f.report.portability620.finalHistoricalVerdict, undefined);
  assert.notEqual(f.report.status, 'passed');
});

test('emitted final ordering permits original passed status only if historical assertions pass too', async () => {
  const failure = await completedControl();
  await assert.rejects(finalOriginal(failure), error => error.message === failure.report.portability620.historical[0].message);
  assert.notEqual(failure.report.status, 'passed'); assert.equal(failure.report.portability620.originalChecksComplete, true);
  const passed = await completedControl({ historyMatches: true }); assert.equal(await finalOriginal(passed), 0); assert.equal(passed.report.status, 'passed');
});

async function completedSummary(historyMatches = false) {
  const f = await completedControl({ historyMatches });
  try { await finalOriginal(f); } catch (error) { f.report.status = 'failed'; f.report.error = error.stack; }
  Object.assign(f.report, { exceptions: [], consoleErrors: [], errLog: [], browserVersion: { product: 'Chrome/test' },
    gpuInfo: { devices: [{ vendorString: 'test' }] } });
  const labels = ['mobile-day-baseline', 'mobile-day-candidate', 'mobile-night-baseline', 'mobile-night-candidate', 'mobile-liveness',
    'desktop-day-baseline', 'desktop-day-candidate', 'desktop-night-baseline', 'desktop-night-candidate'];
  f.report.nativeMac619 = { complete: true, windows: labels.map((label, i) => ({ label, qualified: true, width: i < 5 ? 390 : 1400,
    height: i < 5 ? 844 : 900, requestedMs: i === 4 ? 60000 : 5000, dpr: 1 })) };
  return f.report;
}

function outerFixture(innerSummary) {
  return { completed: true, cleanupVerified: true, profileRemoved: true, restored: true,
    inner: { status: innerSummary.status === 'passed' ? 0 : 2, cleanupVerified: true }, innerSummary };
}

test('only complete outer evidence distinguishes collection success from historical/release failure', async () => {
  const summary = await completedSummary(), report = outerFixture(summary);
  assert.equal(probe.collectionComplete(report), true); assert.equal(summary.status, 'failed'); assert.equal(report.inner.status, 2);
  const passed = outerFixture(await completedSummary(true)); assert.equal(probe.collectionComplete(passed), true);
  for (const mutate of [
    r => r.completed = false, r => r.cleanupVerified = false, r => r.profileRemoved = false, r => r.restored = false,
    r => r.inner.timedOut = true, r => r.inner.aborted = true, r => r.inner.error = 'child cleanup error', r => r.inner.status = 0,
    r => r.innerSummary.status = 'passed', r => r.innerSummary.error = 'Error: unrelated failure',
    r => r.innerSummary.portability620.originalChecksComplete = false,
    r => r.innerSummary.portability620.laterOldPassed = false,
    r => r.innerSummary.portability620.baseSourceSHA256 = 'wrong',
    r => r.innerSummary.portability620.historical[0].value = true,
    r => r.innerSummary.portability620.historical[1].message = 'changed historical message',
    r => r.innerSummary.portability620.historical[1].differences = [],
    r => r.innerSummary.portability620.captures[2].timeOrigin = r.innerSummary.portability620.captures[1].timeOrigin,
    r => r.innerSummary.portability620.captures[2].keySet.missing = ['one'],
    r => r.innerSummary.portability620.comparisons[2].passed = false,
    r => r.innerSummary.nativeMac619.complete = false,
    r => r.innerSummary.nativeMac619.windows.pop(),
    r => r.innerSummary.nativeMac619.windows[4].qualified = false,
    r => r.innerSummary.nativeMac619.windows[4].requestedMs = 5000,
    r => r.innerSummary.nativeMac619.windows[4].label = 'replacement-window',
    r => r.innerSummary.nativeMac619.windows[5].width = 390,
    r => r.innerSummary.browserVersion = null, r => r.innerSummary.gpuInfo.devices = [],
    r => r.innerSummary.coverage.core = false, r => r.innerSummary.performanceFailures.push('floor failed'),
    r => r.innerSummary.exceptions.push('exception'), r => r.innerSummary.consoleErrors.push('console'), r => r.innerSummary.errLog.push('app')
  ]) { const broken = clone(report); mutate(broken); assert.equal(probe.collectionComplete(broken), false, mutate.toString()); }
});

async function supervisorFixture(t, change = {}) {
  const out = temporary(t), actions = [], summary = await completedSummary(!!change.historyMatches), jobStart = 1000000;
  if (change.summary) change.summary(summary);
  const compile = async () => { actions.push('compile'); return {}; };
  const invoke = (compiled, action, id) => {
    actions.push(action);
    if (action === 'inspect') return { ok: true, exitCode: 0, displayID: 7, restoreID: 91, before: { id: 91 } };
    if (action === 'prepare') return { ok: true, exitCode: 0, displayID: 7, after: { id: 92, width: 1600, height: 1000 } };
    assert.equal(id, 91); return { ok: true, exitCode: 0, displayID: 7, after: { id: change.wrongRestore ? 92 : 91 } };
  };
  const run = async (command, args, options) => {
    actions.push('inner'); assert.equal(args[0], require.resolve('./native-mac-diagnostic.cjs'));
    assert.equal(options.timeoutMs, mac.BOUNDS.inner); assert.equal(options.terminationGraceMs, mac.BOUNDS.termination);
    const contract = JSON.parse(fs.readFileSync(args[1].slice('--inner='.length), 'utf8'));
    assert.equal(contract.adapterSHA256, mac.sha256(fs.readFileSync(args[0])));
    assert.equal(contract.sha256, built.sha256); assert.equal(fs.readFileSync(contract.emitted, 'utf8'), built.source);
    assert.equal(contract.token, options.env.T619_INNER_TOKEN); assert.equal(contract.innerDirectory, options.env.T619_INNER_DIR);
    assert.equal(fs.existsSync(path.join(out, 'native-portability-supervisor.json')), false, 'no collection receipt before cleanup');
    t.after(() => fs.rmSync(contract.innerDirectory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(out, 'native-mac-inner-summary.json'), JSON.stringify(summary));
    return { status: change.exitStatus ?? (summary.status === 'passed' ? 0 : 2), cleanupVerified: !change.badCleanup, timedOut: !!change.timeout };
  };
  return { out, actions, options: { out, jobStart, platform: 'darwin', now: () => jobStart + 1000, compile, invoke, run, built, env: {} } };
}

test('unchanged supervisor owns one run, resource bounds, original contract and cleanup; historical failure stays nonzero', async t => {
  const f = await supervisorFixture(t), report = await probe.supervise(f.options);
  assert.equal(report.status, 'failed'); assert.equal(report.inner.status, 2); assert.equal(report.collectionCompleted, true);
  assert.equal(report.releaseGatePassed, false); assert.equal(report.completed, true); assert.equal(report.profileRemoved, true);
  assert.deepEqual(f.actions, ['compile', 'inspect', 'prepare', 'inner', 'restore']);
  const outer = JSON.parse(fs.readFileSync(path.join(f.out, 'native-portability-supervisor.json'), 'utf8'));
  assert.equal(outer.collectionCompleted, true); assert.equal(outer.status, 'failed'); assert.equal(outer.releaseGatePassed, false);
  const inherited = JSON.parse(fs.readFileSync(path.join(f.out, 'native-mac-supervisor.json'), 'utf8'));
  assert.equal(inherited.status, 'failed'); assert.equal(Object.hasOwn(inherited, 'collectionCompleted'), false);
  await assert.rejects(probe.supervise(f.options), /EEXIST/); assert.equal(f.actions.filter(action => action === 'inner').length, 1);
});

for (const [label, change, expected] of [
  ['original timing failure', { summary: s => { s.performanceFailures.push('unchanged floor'); s.portability620.originalChecksComplete = false; } }, 'failed'],
  ['runtime failure', { summary: s => { s.exceptions.push('runtime'); s.portability620.originalChecksComplete = false; } }, 'failed'],
  ['child timeout', { timeout: true }, 'incomplete'], ['unverified cleanup', { badCleanup: true }, 'incomplete'],
  ['wrong restored display', { wrongRestore: true }, 'incomplete'],
  ['counterfeit successful inner with incomplete controls', { historyMatches: true, summary: s => s.portability620.laterOldPassed = false }, 'incomplete']
]) test('outer cannot call collection complete after ' + label, async t => {
  const f = await supervisorFixture(t, change), report = await probe.supervise(f.options);
  assert.equal(report.status, expected); assert.equal(report.collectionCompleted, false); assert.equal(report.releaseGatePassed, false);
  assert.equal(f.actions.at(-1), 'restore'); assert.equal(report.attempts, 1);
});

test('adapter source tampering and platform/retry/start constraints fail before external work', async t => {
  const f = await supervisorFixture(t), altered = { ...built, source: built.source + '\n// unauthorized\n' };
  altered.sha256 = mac.sha256(altered.source);
  await assert.rejects(probe.supervise({ ...f.options, built: altered }), /adapter identity mismatch/);
  await assert.rejects(probe.supervise({ ...f.options, platform: 'linux' }), /darwin-only/);
  await assert.rejects(probe.supervise({ ...f.options, jobStart: 0 }), /T619_JOB_START_MS/);
  await assert.rejects(probe.supervise({ ...f.options, env: { GITHUB_RUN_ATTEMPT: '2' } }), /reruns prohibited/);
  assert.deepEqual(f.actions, []);
});
