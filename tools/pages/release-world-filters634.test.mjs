import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
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
function frame(c, candidate, onlyNewEscape, mode, clockInput = 5, clockMode = 'shared') {
  const shadowCalls = c.time === 100 ? (candidate && !onlyNewEscape ? 1 : 2) : 0;
  const fractional = c.zoom === .65, reflectionCalls = fractional ? 0 : 1;
  let value = mode === 'wrong-edge' ? 'bad' : candidate && !onlyNewEscape ? 'approved-new-art' : 'immutable-prev';
  if (clockInput !== 5 || clockMode !== 'shared') value += '/' + clockInput + '/' + clockMode;
  let next = clockInput; const calls = Array.from({ length: 3 }, (_, i) => { const before = clockMode === 'shared' || i === 0 ? 6 : next, pre = clockMode === 'shared' ? clockInput : next; next = Math.max(0, pre - .016); return { before, pre, post: next, restored: clockMode === 'shared' ? before : next }; });
  return { unstablePixels: clockMode === 'original-drift' ? 1 : 0, clock634: { input: clockInput, mode: clockMode, callerBefore: 6, callerAfter: 6, restored: true, compositorRestored: true, calls }, diagnostic634: { readCount: 2 }, fixture634: snapshot(candidate ? !onlyNewEscape : null, onlyNewEscape),
    state: { mode, flags: { T603: true }, sky: 'same-sky', fx: 'same-dust', cam: { x: 256.375, y: 576.625, z: c.zoom },
      viewport: { dpr: c.dpr, width: c.width * c.dpr, height: c.height * c.dpr },
      counts: { calls: reflectionCalls + shadowCalls, reflectionCalls, shadowCalls,
        fractionalCalls: fractional ? shadowCalls : 0, fractionalScaleCalls: fractional ? shadowCalls : 0,
        wrongEdges: mode === 'wrong-edge' ? shadowCalls : 0 } },
    png: 'data:image/png;base64,' + Buffer.from(JSON.stringify({ w: c.width * c.dpr, h: c.height * c.dpr, value })).toString('base64') };
}
function rig(t, mutateFrame = () => {}, onPersist = () => {}, diagnosticError = null, mutateOrigin = () => {}) {
  const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'filters634-contract-'));
  t.after(() => fs.rmSync(OUT, { recursive: true, force: true }));
  const nativeCases603 = cases(), report = { release: { current: { commit: 'current', version: 'new' }, previous: { commit: 'immutable-prev', version: 'old' } } };
  let c, candidate = false, calls = 0, lastFrame;
  const controller = filters.createController({ report, check, persist() { onPersist(report, OUT); }, OUT, nativeCases603,
    release603: { newEscapeFlags: ['__noT634'] }, nativeCamera603: async next => { c = next; },
    ev: async expression => {
      if (expression === '__s603.rainbowOrigin634()') { const origin = { value: candidate ? 6 : 5, document: { doc: candidate ? 'candidate' : 'baseline', version: candidate ? 'new' : 'old' }, phase: 'same-task-after-grow22-before-matrix-draw' }; mutateOrigin(origin, candidate); return origin; }
      if (expression === '__s603.filterReadbacks634()') { if (diagnosticError) throw diagnosticError; return { readCount: 2, delta: { changedPixels: lastFrame?.unstablePixels ?? 0 }, reads: [{ rgbaBase64: 'AA==' }, { rgbaBase64: lastFrame?.unstablePixels ? 'AQ==' : 'AA==' }] }; }
      const [time, mode, onlyNewEscape, flags, clockInput, clockMode] = JSON.parse('[' + expression.slice(expression.indexOf('(') + 1, -1) + ']');
      assert.equal(time, c.time); assert.deepEqual(flags, ['__noT634'], 5); calls++;
      const out = frame(c, candidate, onlyNewEscape, mode, clockInput, clockMode); mutateFrame(out, { c, candidate, onlyNewEscape, mode, clockInput, clockMode }); lastFrame = out; return out;
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
  assert.equal(edits.length, 6);
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
  const box = { window, running: false, measureWork603: false, rainbowT: 6, ctx: Object.create({ getImageData() {} }),
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    t591On: () => !window.__noT591, t603On: () => !window.__noT603, t634On: () => !window.__noT634 };
  box.__s603 = { scene: () => 'unchanged city', compositorFrame() { box.rainbowT = Math.max(0, box.rainbowT - .016); }, nativeFrame(artOff, time, mode) {
    window.__noT603 = artOff; if (throws) throw Error('native failure'); return { state: { time, mode } };
  } };
  box.capture = vm.runInNewContext('(' + filters.filterFrame634.toString() + ')', box);
  return box;
}

test('browser fixture calls genuine nativeFrame and restores undefined/false/own/inherited flags after success or failure', () => {
  for (const initial of [{}, { __noT591: undefined, __noT634: false }, { __noT591: false, __noT634: true }]) for (const escape of [false, true]) {
    const b = browser(initial), before = Object.getOwnPropertyNames(b.window).sort(), values = before.map(k => b.window[k]);
    const got = b.capture(100, 'native', escape, ['__noT634'], 5);
    assert.equal(got.fixture634.effective.T591, false); assert.equal(got.fixture634.effective.T603, true);
    assert.equal(got.fixture634.effective.T634, !escape); assert.equal(got.fixture634.restored, true);
    assert.deepEqual(Object.getOwnPropertyNames(b.window).sort(), before); assert.deepEqual(before.map(k => b.window[k]), values);
  }
  const inherited = browser(); Object.setPrototypeOf(inherited.window, { __noT591: false, __noT634: undefined });
  inherited.window.__newEscapeOff603 = true; inherited.window.__noT603 = true;
  const inheritedBefore = Object.keys(inherited.window).map(k => [k, inherited.window[k]]);
  assert.equal(inherited.capture(100, 'native', false, ['__noT634'], 5).fixture634.restored, true);
  assert.equal(Object.hasOwn(inherited.window, '__noT591'), false);
  assert.deepEqual(Object.keys(inherited.window).map(k => [k, inherited.window[k]]), inheritedBefore);
  const failed = browser({}, true); const keys = Object.keys(failed.window);
  assert.throws(() => failed.capture(100, 'native', false, ['__noT634'], 5), /native failure/);
  assert.deepEqual(Object.keys(failed.window), keys); assert.equal(Object.hasOwn(failed.window, '__noT591'), false);
  const b = browser(); b.running = true; assert.throws(() => b.capture(100), /frozen snapshot/);
});

test('36 independent references and both candidate arms pass before normal308, without changing normal arrays', async t => {
  const r = rig(t); await r.controller.baseline(); r.setCandidate(); await r.controller.candidate();
  assert.equal(r.calls(), 121); assert.equal(r.report.nativeFilterFallback634.earlyPassed, true);
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


test('original frameValid acceptance function remains byte-for-byte frozen', () => {
  assert.equal(crypto.createHash('sha256').update(filters.frameValid.toString()).digest('hex'), 'b627bad3f48048ec7f7e46f7516d2ba725b95b7c778980b35b7f06d0c6473aeb');
});

test('named diagnostics are equivalent to the unchanged predicate across independent red clauses', () => {
  const c = cases().find(c => c.key === 'fractional-r0-z0.65-night');
  const options = { candidate: true, onlyNewEscape: false, newFlags: ['__noT634'], requireT634: true };
  const changes = [() => {}, r => { r.unstablePixels = 1; }, r => { r.fixture634.protocol = 'wrong'; },
    r => { r.fixture634.onlyNewEscape = true; }, r => { r.fixture634.newEscapeFlags = []; },
    r => { r.fixture634.sceneUnchanged = false; }, r => { r.fixture634.restored = false; },
    r => { r.fixture634.after.__noT591.own = true; },
    ...['__noT591', '__noT603', '__newEscapeOff603', '__noT634'].flatMap(name => [
      r => { r.fixture634.during[name].own = false; }, r => { r.fixture634.during[name].value = null; }]),
    ...['T591', 'T603', 'T634'].map(name => r => { r.fixture634.effective[name] = null; }),
    r => { r.state.flags.T603 = false; }, r => { r.state.mode = 'wrong'; }, r => { delete r.state.counts; },
    ...['calls', 'reflectionCalls', 'shadowCalls', 'fractionalCalls', 'fractionalScaleCalls', 'wrongEdges'].map(name => r => { r.state.counts[name] = -1; }),
    r => { r.state.counts.calls++; }, r => { r.state.counts.fractionalCalls = 50; },
    r => { r.state.counts.fractionalScaleCalls = 50; }, r => { r.state.counts.wrongEdges = 1; }];
  for (const mutate of changes) {
    const r = frame(c, true, false, 'native'); mutate(r);
    const named = filters.framePredicates634(r, options);
    assert.equal(Object.values(named).every(Boolean), filters.frameValid(r, options), JSON.stringify(named));
  }
  assert.equal(Object.values(filters.framePredicates634(null, options)).every(Boolean), false);
});

function readbackBrowser({ unstable = true, shape = 'inherited', nativeError, readError, large = false } = {}) {
  const b = browser(), width = large ? 200 : 2, height = large ? 100 : 2;
  const a = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  for (let i = 0; i < a.data.length; i++) a.data[i] = i % 256;
  const z = { width, height, data: a.data.slice() }; if (unstable) { z.data[4] = 255; z.data[z.data.length - 1] = 0; }
  const images = [a, z], calls = [], returns = [];
  const originalRead = function (...args) { calls.push({ receiver: this, args }); if (readError) throw readError; return images[calls.length - 1]; };
  if (shape === 'inherited') b.ctx = Object.create({ getImageData: originalRead });
  else {
    b.ctx = {};
    Object.defineProperty(b.ctx, 'getImageData', shape === 'accessor' ? { configurable: true, enumerable: true, get: () => originalRead } :
      { configurable: shape !== 'nonconfigurable', enumerable: true, writable: true, value: originalRead });
  }
  const before = Object.getOwnPropertyDescriptor(b.ctx, 'getImageData');
  b.__s603.nativeFrame = function (off, time, mode) {
    b.window.__noT603 = off;
    b.__s603.compositorFrame(off, time, mode); b.__s603.compositorFrame(off, time, mode);
    returns.push(b.ctx.getImageData(0, 0, width, height));
    if (nativeError) throw nativeError;
    b.__s603.compositorFrame(off, time, mode);
    returns.push(b.ctx.getImageData(0, 0, width, height));
    return { state: { time, mode }, unstablePixels: unstable ? 2 : 0, png: 'unchanged original PNG' };
  };
  b.capture = vm.runInNewContext('(' + filters.filterFrame634.toString() + ')', b);
  return { b, before, calls, returns, images, originalRead };
}

test('readback spy preserves exact two reads, receivers, arguments and ImageData identities; encoding adds no reads', () => {
  for (const shape of ['inherited', 'own', 'accessor', 'nonconfigurable']) {
    const r = readbackBrowser({ shape, large: true });
    const out = r.b.capture(55, 'native', false, ['__noT634'], 5);
    assert.equal(out.png, 'unchanged original PNG'); assert.equal(out.diagnostic634.readCount, 2);
    assert.equal(r.calls.length, 2); assert.deepEqual(r.returns, r.images);
    assert.ok(r.returns.every((image, i) => image === r.images[i]));
    assert.ok(r.calls.every(call => call.receiver === r.b.ctx));
    assert.deepEqual(r.calls.map(call => call.args), [[0, 0, 200, 100], [0, 0, 200, 100]]);
    assert.deepEqual(Object.getOwnPropertyDescriptor(r.b.ctx, 'getImageData'), r.before);
    assert.equal(r.b.ctx.getImageData, r.originalRead);
    const captured = r.b.__s603.filterReadbacks634();
    assert.equal(r.calls.length, 2); assert.equal(captured.readCount, 2);
    for (let i = 0; i < 2; i++) assert.deepEqual(Buffer.from(captured.reads[i].rgbaBase64, 'base64'), Buffer.from(r.images[i].data));
    assert.equal(captured.delta.changedPixels, 2);
    assert.deepEqual(copy(captured.delta.bbox), { minX: 1, minY: 0, maxX: 199, maxY: 99 });
    assert.deepEqual(copy(captured.delta.firstDifferences[0]), { x: 1, y: 0, a: [4, 5, 6, 7], b: [255, 5, 6, 7] });
  }
});

test('readback instrumentation restores descriptor/ownership and preserves original native/read exception identity', () => {
  for (const kind of ['nativeError', 'readError']) for (const shape of ['inherited', 'own', 'accessor', 'nonconfigurable']) {
    const error = Error('original ' + kind), r = readbackBrowser({ [kind]: error, shape });
    assert.throws(() => r.b.capture(55, 'native', false, ['__noT634'], 5), caught => caught === error);
    assert.equal(r.calls.length, 1); assert.deepEqual(Object.getOwnPropertyDescriptor(r.b.ctx, 'getImageData'), r.before);
    assert.equal(r.b.ctx.getImageData, r.originalRead); assert.equal(Object.hasOwn(r.b.window, '__noT591'), false);
  }
  const r = readbackBrowser({ unstable: false }); r.b.__s603.cacheStats = () => { throw Error('diagnostic metadata unavailable'); };
  const out = r.b.capture(55, 'native', false, ['__noT634'], 5);
  assert.equal(out.unstablePixels, 0); assert.equal(r.calls.length, 2);
  assert.match(out.diagnostic634.reads[0].metadata.error, /metadata unavailable/);
  assert.equal(r.b.__s603.filterReadbacks634().delta.changedPixels, 0);
});

test('first failed returned frame, original PNG, named clauses and readbacks persist before the unchanged gate throws', async t => {
  let saved;
  const r = rig(t, (out, info) => { if (info.candidate && !info.onlyNewEscape) out.unstablePixels = 7; }, (report, OUT) => {
    if (!report.nativeFilterFallback634.firstFailure) return;
    const first = report.nativeFilterFallback634.firstFailure;
    assert.equal(first.frame.unstablePixels, 7);
    assert.equal(first.failedPredicates.join(','), 'stablePixels');
    assert.equal(first.readbacks.readCount, 2);
    assert.equal(first.sources.helper.sha256, filters.sourceIdentity().sha256);
    assert.match(first.frame.file, /^T634-filter-first-failure-.*\.png$/);
    assert.equal(fs.existsSync(path.join(OUT, first.frame.file)), true);
    assert.equal(fs.existsSync(path.join(OUT, first.file)), true);
    for (const [i, read] of first.readbacks.reads.entries()) {
      assert.equal(read.rgbaBase64, undefined);
      const bytes = fs.readFileSync(path.join(OUT, read.file));
      assert.deepEqual(bytes, Buffer.from([i]));
      assert.equal(read.sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    }
    saved = copy(first);
  });
  await r.controller.baseline(); r.setCandidate();
  await assert.rejects(r.controller.candidate(), /T634 explicit filter fixture state and restored flag ownership/);
  assert.ok(saved); assert.equal(r.calls(), 37);
  assert.deepEqual(r.report.nativeFilterFallback634.firstFailure, saved);
  assert.equal(r.report.nativeFilterFallback634.nativeZoomMatrix.length, 0);
  assert.equal(r.report.nativeFilterFallback634.earlyPassed, false);
});


test('diagnostic retrieval or persistence failure cannot replace the original first-failure guard', async t => {
  for (const fail of ['serialization', 'persist']) {
    const error = Error('diagnostic ' + fail), r = rig(t, out => { out.unstablePixels = 2; },
      report => { if (fail === 'persist' && report.nativeFilterFallback634.firstFailure) throw error; }, fail === 'serialization' ? error : null);
    await assert.rejects(r.controller.baseline(), /T634 explicit filter fixture state and restored flag ownership/);
    const first = r.report.nativeFilterFallback634.firstFailure;
    assert.equal(r.calls(), 1); assert.equal(first.frame.unstablePixels, 2);
    assert.ok(first.diagnosticErrors.some(message => message.includes('diagnostic ' + fail)));
  }
});

test('the actual frozen nativeFrame still performs exactly three draws and its original two readbacks', () => {
  const r = readbackBrowser(), b = r.b; let draws = 0, pngCalls = 0;
  b.cvs = { width: 2, height: 2, toDataURL(type) { assert.equal(type, 'image/png'); pngCalls++; return 'original frozen PNG'; } };
  b.__s603.compositorFrame = (off, time, mode) => { b.window.__noT603 = off; draws++; b.rainbowT = Math.max(0, b.rainbowT - .016); return { time, mode, ordinal: draws }; };
  const start = raw.indexOf('    nativeFrame:') + '    nativeFrame:'.length;
  const end = raw.indexOf('\n    snapshotCanvasOnly:', start);
  b.__s603.nativeFrame = vm.runInNewContext('(' + raw.slice(start, end).trim().replace(/,$/, '') + ')', b);
  const result = b.capture(55, 'native', false, ['__noT634'], 5);
  assert.equal(draws, 3); assert.equal(r.calls.length, 2); assert.equal(pngCalls, 1);
  assert.equal(result.state.ordinal, 2); assert.equal(result.unstablePixels, 2); assert.equal(result.png, 'original frozen PNG');
  assert.equal(b.__s603.filterReadbacks634().delta.changedPixels, result.unstablePixels);
  assert.equal(draws, 3); assert.equal(r.calls.length, 2); assert.equal(pngCalls, 1);
  assert.deepEqual(Object.getOwnPropertyDescriptor(b.ctx, 'getImageData'), r.before);
});


test('rainbow origin is captured in the original grow evaluate task without calls or mutation', () => {
  const built = linux.build(raw).source;
  assert.ok(built.includes("const stats=__s603.grow22();if('+snapshot+'){__s603.compositorFreeze(true);__s603.captureRainbow634();}return stats;"));
  assert.equal(built.split('__s603.captureRainbow634();').length, 2);
  const b = browser(); b.__s603.documentIdentity = () => ({ doc: 'baseline', version: 'immutable' });
  b.origin = vm.runInNewContext('(' + filters.captureRainbow634.toString() + ')', b);
  const before = b.rainbowT, origin = b.origin();
  assert.equal(origin.value, before); assert.equal(b.rainbowT, before);
  assert.equal(origin.phase, 'same-task-after-grow22-before-matrix-draw');
  b.rainbowT = 1; assert.equal(b.__s603.rainbowOrigin634().value, before);
  b.running = true; assert.throws(() => b.origin(), /frozen snapshot/);
  b.running = false; b.measureWork603 = true; assert.throws(() => b.origin(), /frozen snapshot/);
});

test('PREV positive-clock and document-source guards fail closed before any fallback capture', async t => {
  for (const mutate of [o => { o.value = 0; }, o => { o.value = -1; }, o => { o.value = NaN; },
    o => { o.value = Infinity; }, o => { o.document.doc = 'candidate'; }, o => { o.document.version = 'wrong'; }, o => { o.phase = 'after-draw'; }]) {
    const r = rig(t, undefined, undefined, null, mutate);
    await assert.rejects(r.controller.baseline(), /real positive same-task/); assert.equal(r.calls(), 0);
  }
  const r = rig(t, undefined, undefined, null, (o, candidate) => { if (candidate) o.document.version = 'wrong'; });
  await r.controller.baseline(); r.setCandidate(); await assert.rejects(r.controller.candidate(), /candidate original same-task/);
  assert.equal(r.calls(), 36);
});

test('clock guard rejects changed input, hidden draws/reads, missing natural decay or failed restoration', () => {
  const c = cases().find(c => c.key === 'aligned-dpr2-day'), good = frame(c, true, false, 'native');
  assert.equal(filters.clockValid634(good, 5), true);
  for (const mutate of [r => { r.clock634.input = 6; }, r => { r.clock634.calls.pop(); }, r => { r.diagnostic634.readCount++; },
    r => { r.clock634.callerAfter--; }, r => { r.clock634.restored = false; }, r => { r.clock634.compositorRestored = false; },
    r => { r.clock634.calls[1].pre = 4; }, r => { r.clock634.calls[1].post = 5; }, r => { r.clock634.calls[1].restored = 5; }]) {
    const bad = copy(good); mutate(bad); assert.equal(filters.clockValid634(bad, 5), false);
  }
  const b = browser();
  for (const value of [undefined, 0, -1, NaN, Infinity]) assert.throws(() => b.capture(55, 'native', false, ['__noT634'], value), /observed positive finite/);
  b.measureWork603 = true; assert.throws(() => b.capture(55, 'native', false, ['__noT634'], 5), /frozen snapshot/);
});

test('compositor method keeps receiver/arguments and descriptor ownership, restores clock on success and exact native errors', () => {
  for (const shape of ['own', 'inherited', 'accessor', 'nonconfigurable']) for (const throws of [false, true]) {
    const r = readbackBrowser(), b = r.b, calls = [], error = Error('original compositor failure');
    const original = function (...args) { calls.push({ receiver: this, args, clock: b.rainbowT }); b.rainbowT = Math.max(0, b.rainbowT - .016); if (throws) throw error; return 'original return'; };
    delete b.__s603.compositorFrame;
    if (shape === 'inherited') Object.setPrototypeOf(b.__s603, { compositorFrame: original });
    else Object.defineProperty(b.__s603, 'compositorFrame', shape === 'accessor' ? { configurable: true, enumerable: false, get: () => original } :
      { configurable: shape !== 'nonconfigurable', enumerable: false, writable: true, value: original });
    const descriptor = Object.getOwnPropertyDescriptor(b.__s603, 'compositorFrame');
    if (throws) assert.throws(() => b.capture(55, 'native', false, ['__noT634'], 5), caught => caught === error);
    else {
      const got = b.capture(55, 'native', false, ['__noT634'], 5);
      assert.equal(filters.clockValid634(got, 5), true); assert.equal(calls.length, 3); assert.equal(r.calls.length, 2);
    }
    assert.ok(calls.every(c => c.receiver === b.__s603 && c.clock === 5));
    assert.deepEqual(calls[0].args, [false, 55, 'native']);
    assert.equal(b.rainbowT, 6); assert.equal(b.__s603.compositorFrame, original);
    assert.deepEqual(Object.getOwnPropertyDescriptor(b.__s603, 'compositorFrame'), descriptor);
    if (!throws) { b.__s603.compositorFrame(false, 55, 'native'); assert.equal(b.rainbowT, 6 - .016); }
  }
});

test('genuine frozen nativeFrame is stable with shared input, unstable with original countdown, and restores exact RGBA', () => {
  const b = browser(); let draws = 0, reads = 0, rendered = 0; const captures = [];
  b.ctx = { getImageData() { reads++; const v = Math.round(rendered * 1000) % 256; return { width: 1, height: 1, data: new Uint8ClampedArray([v, 0, 0, 255]) }; } };
  b.cvs = { width: 1, height: 1, toDataURL() { return String(Math.round(rendered * 1000) % 256); } };
  b.__s603.compositorFrame = (off, time, mode) => { b.window.__noT603 = off; draws++; rendered = b.rainbowT; b.rainbowT = Math.max(0, b.rainbowT - .016); return { time, mode }; };
  const start = raw.indexOf('    nativeFrame:') + '    nativeFrame:'.length, end = raw.indexOf('\n    snapshotCanvasOnly:', start);
  b.__s603.nativeFrame = vm.runInNewContext('(' + raw.slice(start, end).trim().replace(/,$/, '') + ')', b);
  for (const [input, mode] of [[5, 'shared'], [5, 'original-drift'], [2.5, 'shared'], [5, 'shared']]) {
    const beforeD = draws, beforeR = reads;
    const out = b.capture(55, 'native', false, ['__noT634'], input, mode);
    captures.push({ out, rgba: b.__s603.filterReadbacks634().reads[1].rgbaBase64 });
    assert.equal(draws - beforeD, 3); assert.equal(reads - beforeR, 2); assert.equal(b.rainbowT, 6);
    assert.equal(filters.clockValid634(out, input, mode), true);
  }
  assert.equal(captures[0].out.unstablePixels, 0); assert.equal(captures[1].out.unstablePixels, 1);
  assert.notEqual(captures[0].rgba, captures[2].rgba); assert.equal(captures[0].rgba, captures[3].rgba);
});

for (const [name, mutate, expected] of [
  ['clock metadata corruption', (out, info) => { if (info.candidate) out.clock634.calls[0].post = 5; }, /exact three-draw rainbow/],
  ['countdown red source is invisible', (out, info) => { if (info.clockMode === 'original-drift') out.unstablePixels = 0; }, /all four observed rainbow phases/],
  ['wrong nonzero input has no pixel effect', (out, info) => { if (info.clockInput === 2.5) { const p = JSON.parse(Buffer.from(out.png.split(',')[1], 'base64')); p.value = 'approved-new-art'; out.png = 'data:image/png;base64,' + Buffer.from(JSON.stringify(p)).toString('base64'); } }, /all four observed rainbow phases/]
]) test('clock red source: ' + name, async t => {
  const r = rig(t, mutate); await r.controller.baseline(); r.setCandidate();
  await assert.rejects(r.controller.candidate(), expected); assert.equal(r.report.nativeFilterFallback634.earlyPassed, false);
});


test('expected original-drift evidence persists immediately before a later wrong-clock control can fail', async t => {
  let persistedAtCalls = null, saved;
  const r = rig(t, (out, info) => {
    if (info.clockInput === 2.5) {
      assert.ok(saved); assert.equal(persistedAtCalls, 113);
      out.clock634.calls[0].post = out.clock634.input;
    }
  }, (report, OUT) => {
    const first = report.nativeFilterFallback634.rainbow.originalDriftEvidence;
    if (first && !saved) {
      persistedAtCalls = r.calls(); saved = copy(first);
      assert.match(first.frame.originalGuardError, /explicit filter fixture state/);
      assert.equal(first.frame.unstablePixels, 1); assert.equal(first.failedPredicates.join(','), 'stablePixels');
      assert.equal(first.readbacks.readCount, 2);
      for (const file of [first.file, first.frame.file, ...first.readbacks.reads.map(read => read.file)]) assert.ok(fs.existsSync(path.join(OUT, file)));
      assert.equal(report.nativeFilterFallback634.firstFailure, undefined);
    }
  });
  await r.controller.baseline(); r.setCandidate();
  await assert.rejects(r.controller.candidate(), /exact three-draw rainbow/);
  assert.ok(saved); assert.equal(r.report.nativeFilterFallback634.rainbow.originalDriftEvidence.frame.originalGuardError, saved.frame.originalGuardError);
});

test('original dimension guard retains precedence over the added clock guard', async t => {
  const r = rig(t, out => { out.state.viewport.dpr = 999; out.clock634.restored = false; });
  await assert.rejects(r.controller.baseline(), /complete native dimensions/);
  assert.equal(r.report.nativeFilterFallback634.firstFailure.dimensionsValid, false);
  assert.equal(r.report.nativeFilterFallback634.firstFailure.clockValid, false);
});

test('fixed four phases derive only from the original trace and all run when only the middle phase is visible', async t => {
  const driftInputs = [], observedFiles = new Set();
  const middle = Math.max(0, Math.max(0, 5 - .016) - .016);
  const r = rig(t, (out, info) => {
    if (info.clockMode === 'original-drift') { driftInputs.push(info.clockInput); out.unstablePixels = info.clockInput === middle ? 1 : 0; }
  }, (report, OUT) => {
    for (const [key, proof] of Object.entries(report.nativeFilterFallback634.rainbow.phaseEvidence || {})) {
      for (const file of [proof.file, proof.frame.file, ...proof.readbacks.reads.map(read => read.file)]) {
        assert.ok(fs.existsSync(path.join(OUT, file)), key + ': persisted immediately'); observedFiles.add(file);
      }
    }
  });
  await r.controller.baseline(); r.setCandidate(); await r.controller.candidate();
  const rainbow = r.report.nativeFilterFallback634.rainbow, row = rainbow.negativeControl;
  const expected = [5, ...row.phases[0].drift.clock634.calls.map(call => call.post)];
  assert.deepEqual(driftInputs, expected); assert.equal(r.calls(), 121);
  assert.deepEqual(row.phases.map(p => p.input), expected); assert.deepEqual(row.phases.map(p => p.index), [0, 1, 2, 3]);
  assert.deepEqual(row.phases.map(p => p.visible), [false, false, true, false]);
  assert.equal(Object.keys(rainbow.phaseEvidence).length, 8); assert.equal(observedFiles.size, 32);
  assert.equal(rainbow.originalDriftEvidence.frame.unstablePixels, 0);
  assert.equal(rainbow.originalDriftEvidence.frame.originalGuardError, undefined);
  assert.equal(row.phases[2].drift.originalGuardError, 'T634 explicit filter fixture state and restored flag ownership aligned-dpr2-day/true/false/native');
  assert.equal(filters.rainbowNegativeValid634(row, 5, ['__noT634']), true);
});

test('all four neutral phases still finish the fixed table and fail the visible-negative requirement', async t => {
  const inputs = [];
  const r = rig(t, (out, info) => { if (info.clockMode === 'original-drift') { inputs.push(info.clockInput); out.unstablePixels = 0; } });
  await r.controller.baseline(); r.setCandidate();
  await assert.rejects(r.controller.candidate(), /all four observed rainbow phases/);
  assert.equal(inputs.length, 4); assert.equal(r.calls(), 121);
  const rainbow = r.report.nativeFilterFallback634.rainbow;
  assert.equal(rainbow.phases.length, 4); assert.ok(rainbow.phases.every(p => !p.visible));
  assert.equal(Object.keys(rainbow.phaseEvidence).length, 8);
  assert.equal(r.report.nativeFilterFallback634.earlyPassed, false);
});

test('phase validator rejects omissions, duplicate/reordered/extra phases, forged source or guard/pixel metadata', async t => {
  const r = rig(t); await r.controller.baseline(); r.setCandidate(); await r.controller.candidate();
  const good = r.report.nativeFilterFallback634.rainbow.negativeControl;
  for (const mutate of [
    row => { row.phases.pop(); }, row => { row.phases = row.phases.slice(0, 1); },
    row => { row.phases[2] = copy(row.phases[1]); }, row => { row.phases.reverse(); }, row => { row.phases.push(copy(row.phases[3])); },
    row => { row.phases[1].input = 4.7; }, row => { row.phases[1].source = 'hand-selected'; }, row => { row.phases[1].index = 8; },
    row => { row.phases[1].drift.originalGuardError = 'invented'; }, row => { delete row.phases[1].drift.originalGuardError; },
    row => { row.phases[1].drift.unstablePixels = 0; }, row => { row.phases[1].drift.unstablePixels = 2; },
    row => { row.phases[1].drift.phaseEvidence634.changedPixels = 2; },
    row => { row.phases[1].drift.phaseEvidence634.reads[1].sha256 = row.phases[1].drift.phaseEvidence634.reads[0].sha256; },
    row => { row.phases[1].shared.unstablePixels = 1; }, row => { row.phases[1].drift.clock634.callerAfter = 0; }
  ]) { const bad = copy(good); mutate(bad); assert.equal(filters.rainbowNegativeValid634(bad, 5, ['__noT634']), false); }
});

test('neutral phases cannot carry a fabricated original-guard error, and unrelated drift failures preserve the original error', async t => {
  const r = rig(t, (out, info) => { if (info.clockMode === 'original-drift') out.unstablePixels = 0; });
  await r.controller.baseline(); r.setCandidate(); await assert.rejects(r.controller.candidate(), /all four observed/);
  const frame = copy(r.report.nativeFilterFallback634.rainbow.phases[0].drift);
  assert.equal(filters.driftProbeValid634(frame, 5, ['__noT634']), true);
  frame.originalGuardError = 'T634 explicit filter fixture state and restored flag ownership aligned-dpr2-day/true/false/native';
  assert.equal(filters.driftProbeValid634(frame, 5, ['__noT634']), false);
  const bad = rig(t, (out, info) => { if (info.clockMode === 'original-drift') out.fixture634.effective.T634 = false; });
  await bad.controller.baseline(); bad.setCandidate();
  await assert.rejects(bad.controller.candidate(), /^AssertionError.*T634 explicit filter fixture state/s);
  assert.equal(bad.calls(), 113);
  assert.equal(bad.report.nativeFilterFallback634.rainbow.originalDriftEvidence.predicates.effectiveT634, false);
});


test('phase-zero alias persistence failure cannot replace an unrelated original frame guard error', async t => {
  const r = rig(t, (out, info) => { if (info.clockMode === 'original-drift') out.fixture634.restored = false; }, report => {
    if (report.nativeFilterFallback634.rainbow.originalDriftEvidence) throw Error('alias persistence failed');
  });
  await r.controller.baseline(); r.setCandidate();
  await assert.rejects(r.controller.candidate(), /^AssertionError.*T634 explicit filter fixture state/s);
  const proof = r.report.nativeFilterFallback634.rainbow.originalDriftEvidence;
  assert.match(proof.frame.originalGuardError, /T634 explicit filter fixture state/);
  assert.ok(proof.diagnosticErrors.some(error => error.includes('alias persistence failed')));
});
