// T654（原 T643b）：解凍 scene603 精靈指紋鎖的覆寫，單元測試。執行：node --test tools/pages/release-spr654.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const spr = require('./release-spr654.cjs'), linux = require('./release-correctness.cjs');

test('the built release harness drops exactly the frozen locks and contains the new checks once', () => {
  const built = linux.build();
  for (const s of spr.REPLACED_CHECKS) assert.equal(built.source.includes(s), false, s);
  for (const s of spr.NEW_CHECKS) assert.equal(built.source.split(s).length, 2, s);
  assert(built.source.includes("check(!report.candidatePinDiff.length,'candidate pins match Chromium: '+JSON.stringify(report.candidatePinDiff));"), 'computed == committed file stays');
  assert.equal(built.changes.filter(c => c.label.startsWith('T654 ')).length, 2);
});

// 真的執行注入的那一段：上一版提交檔＝baseline，這一版提交檔＝candidate，實算＝actual
function run297({ baseline, candidate, actual }) {
  const report = {}, checks = [];
  report.pinDiff = Object.keys(baseline).filter(k => JSON.stringify(baseline[k]) !== JSON.stringify(actual[k]));
  report.newPins = Object.keys(actual).filter(k => !(k in baseline));
  const check = (v, m) => { if (!v) throw Error(m); checks.push(m); };
  const persist = () => {};
  vm.runInNewContext(spr_injected297(), { report, baseline, candidate, check, persist });
  return { report, checks };
}
function spr_injected297() {
  let out = '';
  spr.install((from, to) => { if (from === spr.LOCK_297) out = to; });
  return out;
}
function spr_injected307() {
  let out = '';
  spr.install((from, to) => { if (from === spr.LOCK_307) out = to; });
  return out;
}

const P = { 'park/0': ['a1'], 'fire/0': ['b2', 'b3'], 'bld/1': ['c4'] };

test('no change anywhere is green', () => {
  assert.doesNotThrow(() => run297({ baseline: P, candidate: P, actual: P }));
});

test('a change the committed file also records is green (legit art PR)', () => {
  const next = { ...P, 'park/0': ['ff'] };
  const r = run297({ baseline: P, candidate: next, actual: next });
  assert.deepEqual([...r.report.committedPinChanges654], ['park/0']); // vm 裡建的陣列原型不同，複製回本情境再比
});

test('an added or removed key that the committed file records is green', () => {
  const added = { ...P, 'park/1': ['dd'] };
  assert.doesNotThrow(() => run297({ baseline: P, candidate: added, actual: added }));
  const removed = { ...P }; delete removed['bld/1'];
  assert.doesNotThrow(() => run297({ baseline: P, candidate: removed, actual: removed }));
});

test('a change the committed file does not record is red, naming the key', () => {
  const actual = { ...P, 'fire/0': ['b2', 'ee'] };
  assert.throws(() => run297({ baseline: P, candidate: P, actual }), /only where the committed SPR_PINS differ: \["fire\/0"\]/);
  const extra = { ...P, 'fire/9': ['e9'] };
  assert.throws(() => run297({ baseline: P, candidate: P, actual: extra }), /\["fire\/9"\]/);
});

test('the same-Chrome previous-document check follows the committed changes too', () => {
  const code = spr_injected307();
  const go = (baseDocumentPinDiff, committed) => vm.runInNewContext(code, {
    report: { baseDocumentPinDiff, committedPinChanges654: committed }, check: (v, m) => { if (!v) throw Error(m); } });
  assert.doesNotThrow(() => go([], []));
  assert.doesNotThrow(() => go(['park/0'], ['park/0']));
  assert.throws(() => go(['fire/0'], ['park/0']), /differ only where the committed SPR_PINS differ, in this Chrome: \["fire\/0"\]/);
});

test('committedChanges is the same algorithm as the injected COMMITTED snippet (run both)', () => {
  const cases = [
    [P, P],
    [P, { ...P, 'park/0': ['ff'] }],
    [P, { ...P, 'x/1': ['1'] }],
    [{ ...P, 'gone/0': ['9'] }, P],
    [P, { 'park/0': ['a1'], 'fire/0': ['b3', 'b2'] }],
  ];
  for (const [baseline, candidate] of cases) {
    const report = {};
    vm.runInNewContext(spr.COMMITTED, { report, baseline, candidate });
    assert.deepEqual([...report.committedPinChanges654].sort(), spr.committedChanges(baseline, candidate).sort());
  }
});

// release635 第 66 行：base＝7ad6931 實算，release＝後批閥全關的實算，prev／head＝兩份提交檔
const base = { 'park/0': ['a1'], 'fire/0': ['b2'], 'bld/1': ['c4'] };
test('release635: nothing declared and nothing changed is green', () => {
  assert.deepEqual(spr.releaseSprCheck(base, base, base, base), { declared: [], stray: [], wrong: [] });
});

test('release635: a declared change without a valve (release == HEAD file) is green', () => {
  const head = { ...base, 'park/0': ['ff'] };
  const r = spr.releaseSprCheck(base, head, base, head);
  assert.deepEqual([r.declared, r.stray, r.wrong], [['park/0'], [], []]);
});

test('release635: a declared change hidden by a closed later valve (release == base) is green (T654 review P1)', () => {
  const head = { ...base, 'park/0': ['ff'], 'art660/0': ['n1'] };
  const r = spr.releaseSprCheck(base, base, base, head);
  assert.deepEqual([r.declared.sort(), r.stray, r.wrong], [['art660/0', 'park/0'], [], []]);
});

test('release635: a declared key that is neither the HEAD file nor base is red', () => {
  const head = { ...base, 'park/0': ['ff'] };
  assert.deepEqual(spr.releaseSprCheck(base, { ...base, 'park/0': ['ee'] }, base, head).wrong, ['park/0']);
});

test('release635: an undeclared change, added key or removed key is red', () => {
  assert.deepEqual(spr.releaseSprCheck(base, { ...base, 'fire/0': ['zz'] }, base, base).stray, ['fire/0']);
  assert.deepEqual(spr.releaseSprCheck(base, { ...base, 'new/0': ['1'] }, base, base).stray, ['new/0']);
  const removed = { ...base }; delete removed['bld/1'];
  assert.deepEqual(spr.releaseSprCheck(base, removed, base, base).stray, ['bld/1']);
  // 宣告了 park 不代表別的家族也能動
  const head = { ...base, 'park/0': ['ff'] };
  assert.deepEqual(spr.releaseSprCheck(base, { ...head, 'fire/0': ['zz'] }, base, head).stray, ['fire/0']);
});

test('release635 really calls releaseSprCheck and no longer freezes every key', () => {
  const src = fs.readFileSync(new URL('../../docs/tasks/t635-shots/release635.cjs', import.meta.url), 'utf8');
  assert.equal(src.includes("assert.deepEqual(pins.release,pins.base"), false);
  assert.equal(src.split("require('../../../tools/pages/release-spr654.cjs')").length, 2);
  assert.equal(src.split('spr654.releaseSprCheck(pins.base,pins.release,').length, 2);
  assert(src.includes('need(!r654.stray.length,') && src.includes('need(!r654.wrong.length,'));
  assert(src.includes("assert.deepEqual(pins.approved,pins.base)"), 'approved == base stays');
});

test('sprPinsOf drops __meta and keeps every key', () => {
  assert.deepEqual(spr.sprPinsOf('{"__meta":{"count":2},"a/0":["1"],"b/":["2","3"]}'), { 'a/0': ['1'], 'b/': ['2', '3'] });
});
