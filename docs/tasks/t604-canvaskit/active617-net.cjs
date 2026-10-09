'use strict';
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process');
const metrics = require('./active617-metrics.cjs');
function launch(args, env, logFile, timeoutMs) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(logFile); let timedOut = false, spawnError = null, hardTimer;
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
    const kill = signal => { try { if (process.platform === 'win32') child.kill(signal); else process.kill(-child.pid, signal); } catch {} };
    const timer = setTimeout(() => { timedOut = true; kill('SIGTERM'); hardTimer = setTimeout(() => kill('SIGKILL'), 2000); }, timeoutMs);
    child.on('error', error => { spawnError = String(error); });
    child.on('close', (code, signal) => { if (timedOut) kill('SIGKILL'); clearTimeout(timer); clearTimeout(hardTimer); log.end(); resolve({ code, signal, timedOut, spawnError }); });
  });
}
async function main() {
  const out = path.resolve(process.argv.find(a => a.startsWith('--out='))?.slice(6) || 'evidence/active617');
  fs.mkdirSync(out, { recursive: true });
  const start = Date.now(), deadline = start + 30 * 60 * 1000;
  const report = { protocol: 'T617', candidate: 'Native T603; no retention or observer', views: [], accepted: false,
    nonRegression: false, absolute55: false, releaseGatePassed: false, overallBoundMs: 1800000, childBoundMs: 240000,
    requiredChildren: 6, attemptsPerChild: 1, source: 'Exact live T602 / native T603 / exact live T602',
    scope: '72x72 seed22, speed1, fixed desktop camera, original weather/quality/animation. Independent correctness and user acceptance remain required.' };
  const persist = () => fs.writeFileSync(path.join(out, 'active617-net-summary.json'), JSON.stringify(report, null, 2));
  persist();
  try {
    for (const zoom of [1, .7]) {
      const view = { zoom, children: [] }; report.views.push(view);
      for (const [index, arm] of ['main-t602', 'native-t603', 'main-t602'].entries()) {
        if (deadline - Date.now() < 242000) throw Error('Overall bound lacks a complete child and termination reserve');
        const dir = path.join(out, 'z' + zoom + '-' + index + '-' + arm);
        if (fs.existsSync(dir)) throw Error('Refusing to overwrite prior attempt directory: ' + dir);
        fs.mkdirSync(dir, { recursive: true });
        const started = Date.now();
        const result = await launch([path.join(__dirname, 'active617-run.cjs'), '--supervised-child', '--port=8787', '--out=' + dir],
          { ...process.env, T617_ARM: arm, T617_ZOOM: String(zoom) }, path.join(dir, 'child.log'), 240000);
        const file = path.join(dir, 'active617-summary.json');
        const summary = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
        const measurement = summary?.active617;
        const child = { index, arm, zoom, ...result, elapsedMs: Date.now() - started,
          accepted: result.code === 0 && !result.timedOut && summary?.status === 'passed' && !!measurement?.accepted,
          measurement: measurement || null, environment: summary ? { browserVersion: summary.browserVersion, gpuInfo: summary.gpuInfo,
            foreground: summary.foregroundEnvironment, harness: summary.active617Harness, document: summary.active617Document } : null };
        view.children.push(child); persist();
        console.log('T617_NET_CHILD ' + JSON.stringify({ zoom, index, arm, code: result.code, accepted: child.accepted, decision: measurement?.decision, elapsedMs: child.elapsedMs }));
        if (!child.accepted) { report.verdict = 'invalid-measurement'; throw Error('Fresh active child failed identity, validity, endpoint, or bound; no comparative inference'); }
      }
      // Browser/hardware identity is part of baseline matching, independently of
      // the per-frame fixed-view and workload tests.
      const identity = c => JSON.stringify([c.environment.browserVersion?.product, c.environment.browserVersion?.jsVersion,
        c.environment.gpuInfo?.devices, c.environment.gpuInfo?.featureStatus, c.environment.foreground?.platform,
        c.environment.foreground?.arch, c.environment.harness?.generatedSHA256]);
      view.sameEnvironment = view.children.every(c => identity(c) === identity(view.children[0]));
      view.result = metrics.screen(...view.children.map(c => c.measurement));
      persist();
      if (!view.sameEnvironment || !view.result.accepted) { report.verdict = 'incomparable-measurement'; throw Error('Baseline drift, workload, or environment matching failed; no unchanged retry'); }
      if (!view.result.nonRegression) { report.verdict = 'performance-regression'; throw Error('Comparable active gameplay failed declared nonregression against at least one main baseline'); }
    }
    report.accepted = report.views.length === 2 && report.views.every(v => v.sameEnvironment && v.result?.accepted && v.result.nonRegression);
    report.nonRegression = report.accepted;
    report.absolute55 = report.accepted && report.views.every(v => v.result.absolute55);
    report.verdict = report.absolute55 ? 'scoped-active-55-passed' : 'active-nonregression-passed-below-55';
  } catch (error) { report.error = String(error); report.accepted = false; report.verdict ||= 'setup-or-resource-failure'; }
  finally { report.elapsedMs = Date.now() - start; persist(); console.log('T617_NET ' + JSON.stringify({ accepted: report.accepted, absolute55: report.absolute55, verdict: report.verdict, error: report.error })); }
  // A valid nonregression pass below 55 is an incremental gate, not a target pass.
  process.exitCode = report.accepted ? 0 : 2;
  return report;
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 2; });
module.exports = { main, launch };
