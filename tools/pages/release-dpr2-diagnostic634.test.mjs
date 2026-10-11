import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), diagnostic = require('./release-dpr2-diagnostic634.cjs');
const release = require('./release-correctness.cjs'), canonical = require('./native-correctness.cjs');
const root = path.resolve(import.meta.dirname, '../..');
const raw = fs.readFileSync(path.join(root, 'docs/tasks/t603-shots/scene603.js'), 'utf8');
test('diagnostic is separately marked, exact reversible and cannot claim normal-world acceptance', () => {
  const original = release.build(raw), built = diagnostic.build(raw);
  assert.equal(built.acceptance, false); assert.equal(built.releaseOverlaySHA256, original.sha256);
  assert.equal(built.canonicalHarnessSHA256, release.HARNESS_SHA256);
  assert.equal(built.canonicalAdapterSHA256, release.CANONICAL_ADAPTER_SHA256);
  assert.equal(built.changes.length, 6); assert.ok(built.changes.every(r => r.occurrences === 1));
  assert.ok(built.source.includes("report.status='diagnostic-complete-not-acceptance'"));
  assert.ok(built.source.includes("path.join(OUT,'dpr2-diagnostic634-summary.json')"));
  assert.equal(built.source.split('    await filterWorld634.baseline();').length, 2);
  assert.equal(built.source.split('    await filterWorld634.candidate();').length, 2);
  assert.equal(built.source.split(canonical.CHROME_LAUNCH).length, 2);
  assert.ok(built.source.includes("if(PHASE!=='world')throw Error('DPR2 diagnostic only permits world')"));
  assert.ok(built.source.indexOf("report.status='diagnostic-complete-not-acceptance'") > built.source.indexOf('thaw restores every original candidate dust field'));
  assert.ok(!built.source.includes('const skyCase603='));
  assert.ok(!built.source.includes('for(const c of nativeCases603){await nativeCamera603(c);const r=await nativeImage603(c,true);'));
  assert.ok(built.source.includes('all original 256 world + 32 fractional + 16 mobile + 4 aligned scenes retained'));
  assert.ok(built.source.includes(JSON.stringify('localStorage.setItem("glimmerville.v1.slot","3")').slice(1,-1)));
  new Function('require', '__filename', '__dirname', built.source);
});
test('unreviewed source cannot enter diagnostic by repinning or bypassing original identity', () => {
  assert.throws(() => diagnostic.build(raw + '\n// drift\n'), /canonical identity drift/);
});
test('isolated workflow is read-only, branch bounded and has no deployment or formal trigger edits', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/town634-dpr2-diagnostic.yml'), 'utf8');
  assert.ok(workflow.includes('branches: [gpt/town-634-dpr2-diagnostic]'));
  assert.ok(workflow.includes('contents: read'));
  assert.ok(!/contents: write|pages:|id-token:|workflow_dispatch:|deploy-pages|\bdeploy:/.test(workflow));
  assert.ok(workflow.includes('if: always()'));
  assert.ok(workflow.includes('release-dpr2-diagnostic634.cjs --phase=world'));
});
