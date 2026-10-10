'use strict';
// User-approved release policy: Linux retains canonical correctness; original
// timing and 60-second liveness run in the separately required native lane.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { createRequire } = require('node:module'), { spawnSync } = require('node:child_process');
const canonical = require('./native-correctness.cjs'), mac = require('./native-mac-diagnostic.cjs');
const SCENES = path.resolve(__dirname, '../../docs/tasks/t603-shots');
const POLICY = 'T621-linux-correctness-native-original-timing';
const HARNESS_SHA256 = 'ee31668aa1243a64041c282538ed2fdcb740056c677d71ec27f22eae9bda7566';
const CANONICAL_ADAPTER_SHA256 = '9a0bac2c143e27f722eb84e160a796fa0a561d7983382ae67bd4bb08b98b9028';
const TIMING_SPANS = Object.freeze(Object.entries(canonical.TIMING).map(([name, span]) => Object.freeze({ name, sha256: span.sha256 })));
const ORIGINAL_VERDICT = "    check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));";

function timingDelegationValid(report, phase, expected) {
  const t = report.releaseTiming;
  return Boolean(t && t.policy === 'T621-linux-correctness-native-original-timing' &&
    t.status === 'not-run' && t.requiredLane === 'release-native-acceptance' && t.required === true &&
    t.includesSixtySecondLiveness === true && t.originalThresholdsUnchanged === true &&
    JSON.stringify(t.spans) === JSON.stringify(expected) &&
    JSON.stringify(t.omittedSpans) === JSON.stringify(['full', 'core'].includes(phase) ? ['mobile', 'desktop'] : []) &&
    report.native617?.timingRun === false && report.native617?.releaseGatePassed === false &&
    Array.isArray(report.performanceFailures) && report.performanceFailures.length === 0 &&
    !Object.hasOwn(report, 'mobilePerformance') && !Object.hasOwn(report, 'performance') && !Object.hasOwn(report, 'stability'));
}

function build(input = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8')) {
  const original = canonical.build(input);
  if (original.canonicalHarnessSHA256 !== HARNESS_SHA256 ||
    mac.sha256(fs.readFileSync(require.resolve('./native-correctness.cjs'))) !== CANONICAL_ADAPTER_SHA256) {
    throw Error('Release correctness exact canonical identity drift');
  }
  let source = original.source;
  const edits = [];
  const replace = (from, to, label) => {
    if (source.split(from).length !== 2) throw Error('Release correctness exact anchor drift: ' + label);
    source = source.replace(from, to); edits.push({ from, to, label });
  };
  for (const [name, span] of Object.entries(canonical.TIMING)) {
    const a = input.indexOf(span.start), b = input.indexOf(span.end, a), block = input.slice(a, b);
    if (a < 0 || b <= a || mac.sha256(block) !== span.sha256) throw Error('Release timing span drift: ' + name);
    replace(block, "    report.releaseTiming.omittedSpans.push(" + JSON.stringify(name) + ");persist();\n", 'delegate-' + name + '-timing');
  }
  replace('qualityTolerance:0,timingRun:true,releaseGatePassed:false',
    'qualityTolerance:0,timingRun:false,releaseGatePassed:false', 'honest not-run timing flag');
  const anchor = 'const check=(v,m)=>{if(!v)throw Error(m);report.checks.push(m);};';
  replace(anchor, 'report.releaseTiming=' + JSON.stringify({ policy: POLICY, status: 'not-run', requiredLane: 'release-native-acceptance',
    required: true, includesSixtySecondLiveness: true, originalThresholdsUnchanged: true, spans: TIMING_SPANS, omittedSpans: [] }) + ';\n' + anchor,
  'explicit required timing delegation');
  replace(ORIGINAL_VERDICT, '    check((' + timingDelegationValid.toString() + ')(report,PHASE,' + JSON.stringify(TIMING_SPANS) +
    "),'Linux timing intentionally not run; exact original timing and liveness require release-native-acceptance');", 'delegation verdict, never empty performance pass');
  replace("path.join(OUT,'native617-summary.json')", "path.join(OUT,'release-correctness-summary.json')", 'separate correctness report');
  replace("path.join(os.tmpdir(),'native617')", "path.join(os.tmpdir(),'release-correctness')", 'separate default evidence directory');
  replace("performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'",
    "performanceNote:'Timing intentionally not run in Linux correctness. Original thresholds and liveness are required in the separate native acceptance lane.'", 'honest lane description');
  let reversed = source;
  for (const { from, to, label } of [...edits].reverse()) {
    if (reversed.split(to).length !== 2) throw Error('Release correctness inverse anchor drift: ' + label);
    reversed = reversed.replace(to, from);
  }
  if (reversed !== original.source) throw Error('Release correctness change outside exact allowlist');
  if (source.split(canonical.CHROME_LAUNCH).length !== 2) throw Error('Linux canonical launch changed');
  new Function('require', '__filename', '__dirname', source);
  return { source, sha256: mac.sha256(source), canonicalHarnessSHA256: original.canonicalHarnessSHA256,
    canonicalOutputSHA256: original.sha256, canonicalAdapterSHA256: CANONICAL_ADAPTER_SHA256, policy: POLICY,
    delegatedTiming: TIMING_SPANS, changes: edits.map(({ label, from, to }) => ({ label, occurrences: 1,
      beforeSHA256: mac.sha256(from), afterSHA256: mac.sha256(to) })) };
}

async function main() {
  const built = build();
  if (process.argv.includes('--check-overlay')) { console.log('RELEASE_CORRECTNESS_OVERLAY_OK ' + built.sha256); return; }
  if (process.argv.includes('--self-test')) {
    const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'release-acceptance.test.mjs')], { stdio: 'inherit' });
    process.exitCode = result.status === 0 ? 0 : 1; return;
  }
  if (process.platform !== 'linux') throw Error('Release correctness requires the original Ubuntu/Linux headless environment');
  if (process.argv.includes('--with-support') || process.argv.includes('--support-only')) throw Error('Run canonical verify/toolchain/old-save checks directly on this release tree');
  const outArg = process.argv.find(arg => arg.startsWith('--out='));
  const out = path.resolve(outArg ? outArg.slice(6) : path.join(os.tmpdir(), 'release-correctness'));
  fs.mkdirSync(out, { recursive: true });
  const { source, ...manifest } = built;
  fs.writeFileSync(path.join(out, 'release-correctness-overlay.json'), JSON.stringify(manifest, null, 2));
  new Function('require', '__filename', '__dirname', source)(createRequire(path.join(SCENES, 'scene603.js')), path.join(SCENES, 'scene603.js'), SCENES);
}
module.exports = { POLICY, HARNESS_SHA256, CANONICAL_ADAPTER_SHA256, TIMING_SPANS, ORIGINAL_VERDICT, timingDelegationValid, build };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
