import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const filters = require('./release-world-filters634.cjs');
const linux = require('./release-correctness.cjs');
const canonical = require('./native-correctness.cjs');
const check = (value, message) => assert.ok(value, message);
const copy = value => JSON.parse(JSON.stringify(value));
const root = path.resolve(import.meta.dirname, '../..');
const raw = fs.readFileSync(path.join(root, 'docs/tasks/t603-shots/scene603.js'), 'utf8');

function cases() {
  const rows = Array.from({ length: 256 }, (_, i) => ({ group: 'matrix', key: 'matrix-' + i }));
  for (let rot = 0; rot < 4; rot++) for (const zoom of [.65, 1, 1.25, 3]) for (const [light, time] of [['day', 55], ['night', 100]]) {
    rows.push({ group: 'nativeZoomMatrix', key: 'fractional-r' + rot + '-z' + zoom + '-' + light,
      rot, zoom, light, time, width: 1400, height: 900, dpr: 1, fractional: true });
  }
  rows.push(...Array.from({ length: 16 }, (_, i) => ({ group: 'nativeMobileMatrix', key: 'mobile-' + i })));
  for (const dpr of [1, 2]) for (const [light, time] of [['day', 55], ['night', 100]]) rows.push({
    group: 'nativeMobileAligned', key: 'aligned-dpr' + dpr + '-' + light, rot: 0, zoom: 1,
    width: 390, height: 844, dpr, light, time, fractional: false
  });
  return rows;
}
const snapshot = (T634, onlyNewEscape = false) => {
  const before = { __noT591: { own: false, type: 'undefined' }, __noT603: { own: true, type: 'boolean', value: false },
    __newEscapeOff603: { own: true, type: 'boolean', value: false }, __noT634: { own: false, type: 'undefined' } };
  return { protocol: filters.PROTOCOL, onlyNewEscape, newEscapeFlags: ['__noT634'], before,
    during: { ...copy(before), __noT591: { own: true, type: 'boolean', value: true },
      __noT634: { own: true, type: 'boolean', value: onlyNewEscape },
      __newEscapeOff603: { own: true, type: 'boolean', value: onlyNewEscape } }, after: copy(before), restored: true,
    effective: { T591: false, T603: true, T634 }, sceneUnchanged: true };
};
function frame(c, candidate, onlyNewEscape, mode) {
  const shadowCalls = c.time === 100 ? (candidate && !onlyNewEscape ? 1 : 2) : 0;
  const fractional = c.zoom === .65, reflectionCalls = fractional ? 0 : 1;
  const value = mode === 'wrong-edge' ? 'bad' : candidate && !onlyNewEscape ? 'approved-new-art' : 'immutable-prev';
  return { unstablePixels: 0, fixture634: snapshot(candidate ? !onlyNewEscape : null, onlyNewEscape),
    state: { mode, flags: { T603: true }, sky: 'same-sky', fx: 'same-dust', cam: { x: 256.375, y: 576.625, z: c.zoom },
      viewport: { dpr: c.dpr, width: c.width * c.dpr, height: c.height * c.dpr },
      counts: { calls: reflectionCalls + shadowCalls, reflectionCalls, shadowCalls,
        fractionalCalls: fractional ? shadowCalls : 0, fractionalScaleCalls: fractional ? shadowCalls : 0,
        wrongEdges: mode === 'wrong-edge' ? shadowCalls : 0 } },
    png: 'data:image/png;base64,' + Buffer.from(JSON.stringify({ w: c.width * c.dpr, h: c.height * c.dpr, value })).toString('base64') };
}
function rig(t, mutateFrame = () => {}) {
  const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'filters634-contract-'));
  t.after(() => fs.rmSync(OUT, { recursive: true, force: true }));
  const nativeCases603 = cases(), report = { release: { current: { commit: 'current' }, previous: { commit: 'immutable-prev' } } };
  let c, candidate = false, calls = 0;
  const controller = filters.createController({ report, check, persist() {}, OUT, nativeCases603,
    release603: { newEscapeFlags: ['__noT634'] }, nativeCamera603: async next => { c = next; },
    ev: async expression => {
      const [time, mode, onlyNewEscape, flags] = JSON.parse('[' + expression.slice(expression.indexOf('(') + 1, -1) + ']');
      assert.equal(time, c.time); assert.deepEqual(flags, ['__noT634']); calls++;
      const out = frame(c, candidate, onlyNewEscape, mode); mutateFrame(out, { c, candidate, onlyNewEscape, mode }); return out;
    },
    nativeSave603: (name, r) => { const file = name + '.png'; fs.writeFileSync(path.join(OUT, file), Buffer.from(r.png.split(',')[1], 'base64')); return file; },
    nativeRecord603: ({ png, pixels, ...r }) => ({ ...r, rgbaSHA256: pixels.value }),
    pngRgba603: bytes => JSON.parse(bytes.toString()), pixelDelta603: (a, b) => a.value === b.value ? 0 : 1
  });
  return { controller, report, nativeCases603, setCandidate() { candidate = true; }, calls: () => calls,
    normal() { for (const group of ['matrix', 'nativeZoomMatrix', 'nativeMobileMatrix', 'nativeMobileAligned']) {
      report[group] = nativeCases603.filter(c => c.group === group).map(c => ({ ...c, art: { unstablePixels: 0 }, legacy: { changedPixels: 0 } }));
    } } };
}

test('overlay is exact/reversible, keeps the frozen launch/timing pins and each original predicate once', () => {
  const original = canonical.build(raw), edits = []; let source = original.source;
  filters.install((from, to, label) => { assert.equal(source.split(from).length, 2, label); source = source.replace(from, to); edits.push({ from, to }); });
  assert.equal(edits.length, 5);
  for (const line of filters.COVERAGE_BLOCK.split('\n')) assert.equal(source.split(line).length, 2);
  assert.equal(source.split(canonical.CHROME_LAUNCH).length, 2);
  for (const span of Object.values(canonical.TIMING)) {
    const start = raw.indexOf(span.start), block = raw.slice(start, raw.indexOf(span.end, start)); assert.ok(source.includes(block));
  }
  for (const { from, to } of edits.reverse()) { assert.equal(source.split(to).length, 2); source = source.replace(to, from); }
  assert.equal(source, original.source);
  const built = linux.build(raw); new Function('require', '__filename', '__dirname', built.source);
  assert.equal(built.canonicalHarnessSHA256, linux.HARNESS_SHA256);
  assert.deepEqual(built.worldFilterFixture, filters.sourceIdentity());
  assert.ok(built.source.includes(JSON.stringify(filters.sourceIdentity())));
  assert.throws(() => filters.createController({ helperIdentity: { ...filters.sourceIdentity(), sha256: 'bad' } }), /helper source identity drift/);
  assert.ok(built.source.indexOf('await filterWorld634.candidate();') < built.source.indexOf("for(const group of['matrix','nativeZoomMatrix','nativeMobileMatrix','nativeMobileAligned'])report[group]=[];"));
  assert.ok(built.source.includes('    filterWorld634.finish();'));
  assert.throws(() => linux.build(raw + '\n// unreviewed\n'), /canonical identity drift/);
  let drift = original.source.replace('    compositorState:compositorState603,', '    changedCompositorState:compositorState603,');
  assert.throws(() => filters.install((from, to) => { if (drift.split(from).length !== 2) throw Error('exact anchor drift'); drift = drift.replace(from, to); }), /exact anchor drift/);
});

test('case selection rejects omissions, duplicate keys and wrong group cardinality', () => {
  const good = cases(); assert.equal(filters.selectedCases(good).length, 36);
  assert.throws(() => filters.selectedCases(good.slice(0, -1)), /exact 32/);
  const duplicate = copy(good); duplicate.at(-1).key = duplicate.at(-2).key; assert.throws(() => filters.selectedCases(duplicate), /exact 32/);
  const wrong = copy(good); wrong.at(-1).group = 'nativeZoomMatrix'; assert.throws(() => filters.selectedCases(wrong), /exact 32/);
});

function browser(flags = {}, throws = false) {
  const window = { ...flags }; let off, pinned = false;
  const apply = () => { window.__noT634 = pinned ? true : off; };
  Object.defineProperty(window, '__noT603', { configurable: true, enumerable: true, get: () => off, set: value => { off = value; apply(); } });
  Object.defineProperty(window, '__newEscapeOff603', { configurable: true, enumerable: true, get: () => pinned, set: value => { pinned = value === true; apply(); } });
  const box = { window, running: false, measureWork603: false,
    t591On: () => !window.__noT591, t603On: () => !window.__noT603, t634On: () => !window.__noT634 };
  box.__s603 = { scene: () => 'unchanged city', nativeFrame(artOff, time, mode) {
    window.__noT603 = artOff; if (throws) throw Error('native failure'); return { state: { time, mode } };
  } };
  box.capture = vm.runInNewContext('(' + filters.filterFrame634.toString() + ')', box);
  return box;
}

test('browser fixture calls genuine nativeFrame and restores undefined/false/own/inherited flags after success or failure', () => {
  for (const initial of [{}, { __noT591: undefined, __noT634: false }, { __noT591: false, __noT634: true }]) for (const escape of [false, true]) {
    const b = browser(initial), before = Object.getOwnPropertyNames(b.window).sort(), values = before.map(k => b.window[k]);
    const got = b.capture(100, 'native', escape, ['__noT634']);
    assert.equal(got.fixture634.effective.T591, false); assert.equal(got.fixture634.effective.T603, true);
    assert.equal(got.fixture634.effective.T634, !escape); assert.equal(got.fixture634.restored, true);
    assert.deepEqual(Object.getOwnPropertyNames(b.window).sort(), before); assert.deepEqual(before.map(k => b.window[k]), values);
  }
  const inherited = browser(); Object.setPrototypeOf(inherited.window, { __noT591: false, __noT634: undefined });
  inherited.window.__newEscapeOff603 = true; inherited.window.__noT603 = true;
  const inheritedBefore = Object.keys(inherited.window).map(k => [k, inherited.window[k]]);
  assert.equal(inherited.capture(100, 'native', false, ['__noT634']).fixture634.restored, true);
  assert.equal(Object.hasOwn(inherited.window, '__noT591'), false);
  assert.deepEqual(Object.keys(inherited.window).map(k => [k, inherited.window[k]]), inheritedBefore);
  const failed = browser({}, true); const keys = Object.keys(failed.window);
  assert.throws(() => failed.capture(100, 'native', false, ['__noT634']), /native failure/);
  assert.deepEqual(Object.keys(failed.window), keys); assert.equal(Object.hasOwn(failed.window, '__noT591'), false);
  const b = browser(); b.running = true; assert.throws(() => b.capture(100), /frozen snapshot/);
});

test('36 independent references and both candidate arms pass before normal308, without changing normal arrays', async t => {
  const r = rig(t); await r.controller.baseline(); r.setCandidate(); await r.controller.candidate();
  assert.equal(r.calls(), 111); assert.equal(r.report.nativeFilterFallback634.earlyPassed, true);
  assert.equal(r.report.matrix, undefined); assert.throws(() => r.controller.finish(), /308 original/);
  r.normal(); const before = JSON.stringify([r.report.matrix, r.report.nativeZoomMatrix, r.report.nativeMobileMatrix, r.report.nativeMobileAligned]);
  r.controller.finish(); assert.equal(r.report.nativeFilterFallback634.finalPassed, true);
  assert.equal(JSON.stringify([r.report.matrix, r.report.nativeZoomMatrix, r.report.nativeMobileMatrix, r.report.nativeMobileAligned]), before);
  const row = r.report.nativeFilterFallback634.nativeZoomMatrix.find(c => c.key === 'fractional-r0-z0.65-night');
  assert.notEqual(row.art.rgbaSHA256, row.artOn.rgbaSHA256);
  assert.notDeepEqual(row.art.state.counts, row.artOn.state.counts);
  assert.equal(row.artOn.rgbaSHA256, r.report.nativeFilterFallback634.baseline[row.key].rgbaSHA256);
  await assert.rejects(() => r.controller.baseline(), /collected once/);
});

for (const [name, mutate, expected] of [
  ['normal art switched off', (r, c) => { if (c.candidate && !c.onlyNewEscape) r.fixture634.effective.T634 = false; }, /fixture state/],
  ['escape failed to switch', (r, c) => { if (c.candidate && c.onlyNewEscape) r.fixture634.effective.T634 = true; }, /fixture state/],
  ['restoration missing', r => { r.fixture634.restored = false; }, /fixture state/],
  ['ownership not restored', r => { r.fixture634.after.__noT591.own = true; }, /fixture state/],
  ['unstable pixels', r => { r.unstablePixels = 1; }, /fixture state/],
  ['parity has wrong dust', (r, c) => { if (c.candidate && c.onlyNewEscape) r.state.fx = 'wrong'; }, /equals immutable PREV/],
  ['parity has wrong filter counts', (r, c) => { if (c.candidate && c.onlyNewEscape) { r.state.counts.shadowCalls++; r.state.counts.calls++; } }, /equals immutable PREV/],
  ['parity has changed pixels', (r, c) => { if (c.candidate && c.onlyNewEscape) { const p = JSON.parse(Buffer.from(r.png.split(',')[1], 'base64')); p.value = 'wrong'; r.png = 'data:image/png;base64,' + Buffer.from(JSON.stringify(p)).toString('base64'); } }, /equals immutable PREV/]
]) test('red source: ' + name, async t => {
  const r = rig(t, mutate);
  await assert.rejects(async () => { await r.controller.baseline(); r.setCandidate(); await r.controller.candidate(); }, expected);
  assert.equal(r.report.nativeFilterFallback634.earlyPassed, false);
});

test('all three original predicates independently reject missing real coverage', () => {
  const c = cases().filter(c => filters.GROUPS.includes(c.group));
  const base = Object.fromEntries(filters.GROUPS.map(g => [g, c.filter(c => c.group === g).map(c => ({ art: frame(c, true, false, 'native') }))]));
  filters.verifyNativeFilterCoverage634(base, check);
  for (const key of ['shadowCalls', 'fractionalCalls', 'fractionalScaleCalls']) {
    const bad = copy(base); for (const rows of Object.values(bad)) for (const r of rows) r.art.state.counts[key] = 0;
    assert.throws(() => filters.verifyNativeFilterCoverage634(bad, check), key === 'shadowCalls' ? /both actual/ : /fractional matrix/);
  }
  const bad = copy(base); for (const r of bad.nativeMobileAligned) r.art.state.counts.shadowCalls = 0;
  assert.throws(() => filters.verifyNativeFilterCoverage634(bad, check), /aligned mobile/);
});

test('shadow-only negative control rejects reflection contamination, invisible damage or imperfect restoration', () => {
  const c = cases().find(c => c.key === 'fractional-r0-z0.65-night');
  const good = { changedPixels: 1, restoredPixels: 0, good: frame(c, true, false, 'native'), bad: frame(c, true, false, 'wrong-edge'), restored: frame(c, true, false, 'native') };
  assert.equal(filters.negativeValid(good), true);
  for (const mutate of [r => { r.changedPixels = 0; }, r => { r.restoredPixels = 1; }, r => { r.bad.state.counts.reflectionCalls = 1; },
    r => { r.good.state.counts.fractionalCalls = 0; }, r => { r.bad.state.counts.wrongEdges = 0; }, r => { r.restored.state.counts.shadowCalls++; }]) {
    const bad = copy(good); mutate(bad); assert.equal(filters.negativeValid(bad), false);
  }
});


test('final gate rejects missing fallback cases, later parity corruption and missing original normal evidence', async t => {
  const r = rig(t); await r.controller.baseline(); r.setCandidate(); await r.controller.candidate(); r.normal();
  const evidence = r.report.nativeFilterFallback634;
  assert.deepEqual(evidence.sources.helper, filters.sourceIdentity());
  const removed = evidence.nativeMobileAligned.pop(); assert.throws(() => r.controller.finish(), /exact supplemental/); evidence.nativeMobileAligned.push(removed);
  const row = evidence.nativeZoomMatrix[0], oldSky = row.artOn.state.sky;
  row.artOn.state.sky = 'corrupted after early pass'; assert.throws(() => r.controller.finish(), /every supplemental/); row.artOn.state.sky = oldSky;
  r.report.matrix.pop(); assert.throws(() => r.controller.finish(), /308 original/);
});


test('when T634 is already in PREV, neither supplemental arm may silently disable it', () => {
  const c = cases().find(c => c.key === 'fractional-r0-z0.65-night');
  for (const onlyNewEscape of [false, true]) {
    const r = frame(c, true, onlyNewEscape, 'native');
    r.fixture634.newEscapeFlags = []; r.fixture634.effective.T634 = true;
    for (const section of ['before', 'during', 'after']) delete r.fixture634[section].__noT634;
    const options = { candidate: true, onlyNewEscape, newFlags: [], requireT634: true };
    assert.equal(filters.frameValid(r, options), true);
    r.fixture634.effective.T634 = false; assert.equal(filters.frameValid(r, options), false);
    r.fixture634.effective.T634 = null; assert.equal(filters.frameValid(r, options), false);
  }
});
