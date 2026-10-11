'use strict';
// Isolated first-failure investigation. This runner can never certify a release.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), { createRequire } = require('node:module');
const release = require('./release-correctness.cjs');
const SCENES = path.resolve(__dirname, '../../docs/tasks/t603-shots');
const PROTOCOL = 'T634-DPR2-first-failure-diagnostic-not-release-acceptance-v1';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function build(input) {
  const original = release.build(input); let source = original.source; const edits = [];
  const replace = (from, to, label) => {
    if (source.split(from).length !== 2) throw Error('DPR2 diagnostic exact anchor drift: ' + label);
    source = source.replace(from, to); edits.push({ from, to, label });
  };
  replace("const PHASE=arg('phase','full');", "const PHASE=arg('phase','world');if(PHASE!=='world')throw Error('DPR2 diagnostic only permits world');", 'require-world-diagnostic');
  const marker = { protocol: PROTOCOL, acceptance: false, reproduced: null,
    scope: 'Original prelude, 36 independent PREV fallback references, then 36 candidate fallback pairs in unchanged order; stop on original first failure.',
    omissions: ['Original 308 PREV normal-world references', 'Normal candidate 308 matrix and remaining world checks after supplemental fallback controller'],
    releaseOverlaySHA256: original.sha256, helper: original.worldFilterFixture };
  replace('const check=(v,m)=>{if(!v)throw Error(m);report.checks.push(m);};',
    'report.diagnostic634=' + JSON.stringify(marker) + ';\nconst check=(v,m)=>{if(!v)throw Error(m);report.checks.push(m);};', 'mark-non-acceptance-before-any-check');
  const start = '    for(const c of nativeCases603){await nativeCamera603(c);const r=await nativeImage603(c,true);';
  const at = source.indexOf(start), end = source.indexOf('\n', at);
  if (at < 0 || end <= at) throw Error('DPR2 missing normal PREV loop');
  replace(source.slice(at, end), "    report.diagnostic634.originalNormalReferences='not-run';persist();", 'omit-only-normal-PREV-308-loop');
  const remainingStart = "    const skyCase603=nativeCases603.find(c=>c.key==='k29-r0-s0-night-far');";
  const remainingEnd = '    }catch(error){nativeWorldError603=error;throw error;}finally{';
  const a = source.indexOf(remainingStart), b = source.indexOf(remainingEnd, a);
  if (a < 0 || b <= a) throw Error('DPR2 missing remaining world boundary');
  replace(source.slice(a, b), "    report.diagnostic634.supplementalCompleted=true;persist();\n", 'stop-after-supplemental-before-unrelated-world-matrix');
  const calendar = '    // setSeason is a simulation test API and writes day. Restore explicitly.';
  replace(calendar, `    report.diagnostic634.reproduced=false;
    report.errLog=await ev('(window.__errLog||[]).slice(-20)');
    check(!errors.length&&!consoleErrors.length&&!report.errLog.length,'DPR2 diagnostic zero runtime/console/app errors');
    report.status='diagnostic-complete-not-acceptance';persist();exitCode=0;return;
` + calendar, 'exit-only-after-original-thaw-finally-with-non-acceptance-status');
  replace("path.join(OUT,'release-correctness-summary.json')", "path.join(OUT,'dpr2-diagnostic634-summary.json')", 'separate-diagnostic-summary');
  let reversed = source;
  for (const { from, to, label } of [...edits].reverse()) {
    if (reversed.split(to).length !== 2) throw Error('DPR2 diagnostic inverse anchor drift: ' + label);
    reversed = reversed.replace(to, from);
  }
  if (reversed !== original.source) throw Error('DPR2 diagnostic outside allowlist');
  new Function('require', '__filename', '__dirname', source);
  return { source, sha256: hash(source), protocol: PROTOCOL, acceptance: false,
    releaseOverlaySHA256: original.sha256, canonicalHarnessSHA256: original.canonicalHarnessSHA256,
    canonicalAdapterSHA256: original.canonicalAdapterSHA256, helper: original.worldFilterFixture,
    changes: edits.map(({ from, to, label }) => ({ label, occurrences: 1, beforeSHA256: hash(from), afterSHA256: hash(to), omittedBytes: Buffer.byteLength(from) })) };
}
function main() {
  const built = build();
  if (process.argv.includes('--check-overlay')) { console.log('DPR2_DIAGNOSTIC_OVERLAY_OK_NOT_ACCEPTANCE ' + built.sha256); return; }
  if (process.platform !== 'linux') throw Error('DPR2 diagnostic requires the original Linux Chrome environment');
  const arg = process.argv.find(s => s.startsWith('--out=')), out = path.resolve(arg ? arg.slice(6) : path.join(os.tmpdir(), 'town634-dpr2-diagnostic'));
  fs.mkdirSync(out, { recursive: true }); const { source, ...manifest } = built;
  fs.writeFileSync(path.join(out, 'dpr2-diagnostic634-overlay.json'), JSON.stringify(manifest, null, 2));
  new Function('require', '__filename', '__dirname', source)(createRequire(path.join(SCENES, 'scene603.js')), path.join(SCENES, 'scene603.js'), SCENES);
}
module.exports = { PROTOCOL, build };
if (require.main === module) { try { main(); } catch (error) { console.error(error.stack || error); process.exitCode = 1; } }
