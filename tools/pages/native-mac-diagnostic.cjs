'use strict';
// Opt-in environment comparison only. The required Linux release gate is unchanged.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto'), { spawn, spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const canonical = require('./native-correctness.cjs');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const SCENES = path.resolve(__dirname, '../../docs/tasks/t603-shots');
const BOUNDS = Object.freeze({ job: 45 * 60000, inner: 38 * 60000, termination: 2000,
  display: 60000, compile: 120000, flush: 30000 });
const REQUIRED_REMAINING_MS = BOUNDS.inner + BOUNDS.termination + BOUNDS.display + BOUNDS.flush;
const LIMITATION = 'Native OS activation is checked at boundaries only. The passive document visibility/window blur latch cannot independently establish uninterrupted native OS occlusion. This environment comparison does not establish physical-device FPS or replace the required Linux gate.';
// Exact enumerated, session-only helper from docs/tasks/t603-shots/foreground603.js.
const DISPLAY_SWIFT = "import Foundation\nimport CoreGraphics\nimport AppKit\nlet display = CGMainDisplayID()\nlet modes = (CGDisplayCopyAllDisplayModes(display, nil) as? [CGDisplayMode]) ?? []\nfunc describe(_ m: CGDisplayMode) -> [String: Any] { return [\"id\": m.ioDisplayModeID, \"width\": m.width, \"height\": m.height, \"pixelWidth\": m.pixelWidth, \"pixelHeight\": m.pixelHeight, \"refreshRate\": m.refreshRate, \"desktopUsable\": m.isUsableForDesktopGUI()] }\nfunc emit(_ value: [String: Any]) { let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]); print(String(data: data, encoding: .utf8)!) }\nguard let before = CGDisplayCopyDisplayMode(display) else { emit([\"ok\": false, \"reason\": \"No current display mode\"]); exit(2) }\nlet action = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : \"prepare\"\nlet restoreID = CommandLine.arguments.count > 2 ? UInt32(CommandLine.arguments[2]) : nil\nlet suitable = modes.filter { $0.isUsableForDesktopGUI() && $0.width >= 1400 && $0.height >= 900 }.sorted { a, b in\n let pa = a.width >= 1600 && a.height >= 1000 ? 0 : 1, pb = b.width >= 1600 && b.height >= 1000 ? 0 : 1\n return pa != pb ? pa < pb : a.width * a.height < b.width * b.height\n}\nlet target = action == \"restore\" ? restoreID.flatMap { wanted in modes.first(where: { $0.ioDisplayModeID == wanted }) } : (before.width >= 1400 && before.height >= 900 ? before : suitable.first)\nvar result: [String: Any] = [\"displayID\": display, \"action\": action, \"before\": describe(before), \"restoreID\": before.ioDisplayModeID, \"modes\": modes.map(describe), \"changed\": false]\nif action == \"inspect\" { result[\"ok\"] = true; emit(result); exit(0) }\nguard let chosen = target else { result[\"ok\"] = false; result[\"reason\"] = \"No enumerated supported mode fits the unchanged viewport\"; emit(result); exit(2) }\nif chosen.ioDisplayModeID != before.ioDisplayModeID {\n var config: CGDisplayConfigRef?\n var error = CGBeginDisplayConfiguration(&config)\n if error == .success, let config = config {\n  error = CGConfigureDisplayWithDisplayMode(config, display, chosen, nil)\n  if error == .success { error = CGCompleteDisplayConfiguration(config, .forSession) }\n  else { CGCancelDisplayConfiguration(config) }\n }\n result[\"configureError\"] = error.rawValue\n if error != .success { result[\"ok\"] = false; result[\"reason\"] = \"Session-only display configuration refused\"; emit(result); exit(2) }\n result[\"changed\"] = true\n}\nThread.sleep(forTimeInterval: 0.5)\nguard let after = CGDisplayCopyDisplayMode(display) else { result[\"ok\"] = false; result[\"reason\"] = \"No display mode after configuration\"; emit(result); exit(2) }\nresult[\"after\"] = describe(after)\nresult[\"screens\"] = NSScreen.screens.map { screen in [\"frameWidth\": screen.frame.width, \"frameHeight\": screen.frame.height, \"visibleWidth\": screen.visibleFrame.width, \"visibleHeight\": screen.visibleFrame.height, \"scale\": screen.backingScaleFactor] }\nresult[\"ok\"] = after.ioDisplayModeID == chosen.ioDisplayModeID\nemit(result)\n";

function installLossLatch() {
  let active = false, losses = [], count = 0, serial = 0;
  const record = kind => { if (active) { count++; if (losses.length < 32) losses.push(kind); } };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') record('visibilitychange:' + document.visibilityState);
  }, { passive: true });
  window.addEventListener('blur', () => record('blur'), { passive: true });
  window.addEventListener('resize', () => record('resize'), { passive: true });
  window.__nativeMacLoss619 = Object.freeze({
    begin() { if (active) throw Error('Native loss latch already active'); active = true; losses = []; count = 0; serial++;
      if (document.visibilityState !== 'visible') record('initial-hidden');
      if (!document.hasFocus()) record('initial-blur');
      return { serial, active, count, losses: [...losses] }; },
    end() { if (!active) throw Error('Native loss latch was not armed');
      if (document.visibilityState !== 'visible') record('final-hidden');
      if (!document.hasFocus()) record('final-blur');
      active = false; return { serial, active, count, losses: [...losses] }; }
  });
}

function boundaryValid(state, expected, host, browserPid) {
  const p = state.page, v = p && p.viewport, b = state.window && state.window.bounds;
  const sameWindow = b && ['left', 'top', 'width', 'height', 'windowState'].every(k => b[k] === host.window.bounds[k]);
  const native = state.frontExit === 0 && state.appExit === 0 && state.pid === browserPid &&
    state.bundle === 'com.google.Chrome';
  const page = p && p.visibility === 'visible' && p.focus && p.width === expected.width &&
    p.height === expected.height && p.dpr === 1 && v && v.cssWidth === expected.width &&
    v.cssHeight === expected.height && v.width === expected.width && v.height === expected.height &&
    v.dpr === 1 && v.devicePixelRatio === 1;
  return Boolean(native && page && sameWindow && host.viewport.width >= expected.width &&
    host.viewport.height >= expected.height);
}

// Host-side boundaries around the unchanged original browser RAF expression.
// This never replaces browser requestAnimationFrame, timestamps, or visibility.
async function createQualifier({ send, ev, browser, report, persist, errors, consoleErrors, run = spawnSync, pause = ms => new Promise(r => setTimeout(r, ms)) }) {
  const command = (bin, args) => run(bin, args, { encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL' });
  const front = () => {
    const f = command('/usr/bin/lsappinfo', ['front']);
    const a = f.status === 0 ? command('/usr/bin/lsappinfo', ['info', '-only', 'pid,bundleid,name', f.stdout.trim()]) : { status: -1, stdout: '' };
    const app = String(a.stdout || '');
    return { frontExit: f.status, appExit: a.status, front: f.stdout, app,
      pid: Number(app.match(/"(?:pid|LSApplicationProcessIdentifier)"\s*=\s*(\d+)/i)?.[1]),
      bundle: app.match(/"CFBundleIdentifier"\s*=\s*"([^"]+)"/)?.[1] || null };
  };
  const environment = report.nativeMac619 = { label: 'native headed macOS core diagnostic', limitation: LIMITATION,
    platform: process.platform, arch: process.arch, browserPid: browser.pid, windows: [] };
  await send('Page.enable'); await send('Runtime.enable');
  const w = await send('Browser.getWindowForTarget');
  await send('Browser.setWindowBounds', { windowId: w.windowId, bounds: { windowState: 'fullscreen' } });
  const activated = command('/usr/bin/open', ['-a', 'Google Chrome']);
  await send('Page.bringToFront'); await pause(1000);
  // Measured before ANY emulation, separately from each phase's exact emulated viewport.
  const host = environment.host = { window: await send('Browser.getWindowForTarget'),
    viewport: await ev('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height})'),
    foreground: front(), activationExit: activated.status };
  persist();
  if (activated.status !== 0 || host.foreground.frontExit !== 0 || host.foreground.appExit !== 0 ||
      host.foreground.pid !== browser.pid || host.foreground.bundle !== 'com.google.Chrome' ||
      host.window.bounds.windowState !== 'fullscreen' || !Number.isFinite(host.window.bounds.width) ||
      !Number.isFinite(host.window.bounds.height) || host.viewport.width < 1400 || host.viewport.height < 900 ||
      host.window.bounds.width > host.viewport.screenWidth || host.window.bounds.height > host.viewport.screenHeight) {
    throw Error('Environment limitation: native Chrome foreground or actual host window cannot fit the unchanged desktop viewport');
  }
  await send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installLossLatch.toString() + ')();' });
  const sequence = [
    ['mobile-day-baseline', 390, 844, 5000], ['mobile-day-candidate', 390, 844, 5000],
    ['mobile-night-baseline', 390, 844, 5000], ['mobile-night-candidate', 390, 844, 5000],
    ['mobile-liveness', 390, 844, 60000], ['desktop-day-baseline', 1400, 900, 5000],
    ['desktop-day-candidate', 1400, 900, 5000], ['desktop-night-baseline', 1400, 900, 5000],
    ['desktop-night-candidate', 1400, 900, 5000]
  ];
  let index = 0, current = null;
  async function boundary(expected) {
    const state = { ...front(), window: await send('Browser.getWindowForTarget'),
      page: await ev('({visibility:document.visibilityState,focus:document.hasFocus(),width:innerWidth,height:innerHeight,dpr:devicePixelRatio,timeOrigin:performance.timeOrigin,viewport:__s603.viewport()})') };
    state.valid = boundaryValid(state, expected, host, browser.pid); return state;
  }
  return {
    async before(ms) {
      if (current || !sequence[index] || sequence[index][3] !== ms) throw Error('Original RAF window order/duration drift');
      const [label, width, height] = sequence[index];
      current = { label, width, height, dpr: 1, requestedMs: ms, qualified: false };
      environment.windows.push(current);
      current.before = await boundary(current); persist();
      if (!current.before.valid || errors.length || consoleErrors.length) throw Error('Native foreground/viewport/runtime qualification failed before ' + label);
      current.latchBefore = await ev('__nativeMacLoss619.begin()');
      if (!current.latchBefore.active || current.latchBefore.count !== 0) throw Error('Native loss latch not clean before ' + label);
    },
    async after(sample) {
      if (!current) throw Error('Native RAF qualification missing');
      current.sample = sample;
      // Keep the latch armed until after all end-boundary observations.
      current.after = await boundary(current);
      current.latchAfter = await ev('__nativeMacLoss619.end()');
      current.qualified = current.after.valid && current.after.page.timeOrigin === current.before.page.timeOrigin &&
        current.latchAfter.serial === current.latchBefore.serial && !current.latchAfter.active &&
        current.latchAfter.count === 0 && !errors.length && !consoleErrors.length;
      persist();
      if (!current.qualified) throw Error('Native foreground/viewport/loss-latch/runtime qualification failed after ' + current.label);
      current = null; index++;
    },
    complete() {
      if (current || index !== sequence.length || environment.windows.some(w => !w.qualified)) throw Error('Not all nine original RAF windows qualified');
      if (!report.browserVersion || !report.gpuInfo || !Array.isArray(report.gpuInfo.devices) || !report.gpuInfo.devices.length) throw Error('Native browser/GPU/device identity missing');
      environment.complete = true; persist();
    }
  };
}

function build(input) {
  const raw = input === undefined ? fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8') : input;
  const original = canonical.build(raw), changes = [];
  let source = original.source;
  const replace = (from, to, label) => {
    if (source.split(from).length !== 2) throw Error('Native mac exact anchor drift: ' + label);
    source = source.replace(from, to);
    changes.push({ label, occurrences: 1, beforeSHA256: sha256(from), afterSHA256: sha256(to) });
  };
  replace("const PHASE=arg('phase','full');", "const PHASE='core';", 'core-only');
  replace("DIR=fs.mkdtempSync(path.join(os.tmpdir(),'native617-'))", 'DIR=process.env.T619_INNER_DIR', 'outer-owned isolated directory');
  replace("path.join(OUT,'native617-summary.json')", "path.join(OUT,'native-mac-inner-summary.json')", 'diagnostic summary');
  replace("headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'",
    'headless:false,performanceNote:' + JSON.stringify(LIMITATION), 'honest native diagnostic label');
  replace(canonical.CHROME_LAUNCH, canonical.CHROME_LAUNCH.replace("'--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),", ''), 'native headed Chrome only');
  replace("const executable=chromePath();check(executable,'Chrome executable exists');",
    "check(process.platform==='darwin','native diagnostic requires macOS');const executable=chromePath();check(executable,'Chrome executable exists');", 'darwin only');
  replace("[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe'",
    "[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'", 'native Chrome path');
  replace("report.graphicsLaunch='Original headless --disable-gpu configuration restored after default-graphics diagnostic; both modes failed the unchanged absolute RAF floor on software-only CI';",
    "report.graphicsLaunch='Native headed macOS diagnostic; default graphics; original Linux gate remains required';", 'graphics label');
  replace("    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');",
    "    const nativeMacQualifier619=await require(path.join(ROOT,'tools/pages/native-mac-diagnostic.cjs')).createQualifier({send,ev,browser,report,persist,errors,consoleErrors});\n    await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');", 'host qualification initialization');
  replace('    const raf=async ms=>{const r=await ev(', '    const raf=async ms=>{await nativeMacQualifier619.before(ms);const r=await ev(', 'before original RAF expression');
  replace('return {elapsed:r.elapsed,frames:r.frames,mean:r.intervals.reduce', 'await nativeMacQualifier619.after(r);return {elapsed:r.elapsed,frames:r.frames,mean:r.intervals.reduce', 'after original RAF expression');
  replace("    check(PHASE==='full'?Object.values(report.coverage).every(Boolean):report.coverage[PHASE]===true,'requested phase coverage complete: '+PHASE);",
    "    nativeMacQualifier619.complete();\n    check(PHASE==='full'?Object.values(report.coverage).every(Boolean):report.coverage[PHASE]===true,'requested phase coverage complete: '+PHASE);", 'nine windows and device identity required');
  const timing = {};
  for (const [name, span] of Object.entries(canonical.TIMING)) {
    const start = raw.indexOf(span.start), end = raw.indexOf(span.end, start);
    const block = raw.slice(start, end);
    if (start < 0 || end <= start || sha256(block) !== span.sha256 || source.split(block).length !== 2) throw Error('Native mac original timing span changed: ' + name);
    timing[name] = { sha256: sha256(block), bytes: Buffer.byteLength(block) };
  }
  if (!source.includes("check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '")) throw Error('Original fatal performance verdict missing');
  new Function('require', '__filename', '__dirname', source);
  return { source, sha256: sha256(source), canonicalHarnessSHA256: original.canonicalHarnessSHA256,
    canonicalAdapterOutputSHA256: original.sha256, canonicalAdapterSHA256: sha256(fs.readFileSync(require.resolve('./native-correctness.cjs'))),
    adapterSHA256: sha256(fs.readFileSync(__filename)), displaySourceSHA256: sha256(DISPLAY_SWIFT), timing, changes };
}

function liveGroup(pgid, runner = spawnSync, timeout = 200) {
  const r = runner('/bin/ps', ['-axo', 'pid=,pgid=,stat='], { encoding: 'utf8', timeout, killSignal: 'SIGKILL' });
  if (r.error || r.status !== 0) return null;
  return r.stdout.split('\n').map(line => line.trim().split(/\s+/)).filter(row => Number(row[1]) === pgid && !/^Z/.test(row[2] || '')).map(row => Number(row[0]));
}

// A detached child group has one owner. Even a normal driver exit cannot leave
// children behind, and close/pipes cannot delay the hard termination deadline.
function runBounded(command, args, { timeoutMs, terminationGraceMs = BOUNDS.termination, signal, env = process.env,
  cwd, onOutput = () => {} } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw Error('Finite positive child bound required');
  if (signal?.aborted) return Promise.resolve({ status: null, aborted: true, cleanupVerified: true, launched: false });
  return new Promise(resolve => {
    const started = Date.now(), child = spawn(command, args, { detached: true, env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error = null, timedOut = false, aborted = false, status = null, childSignal = null;
    let ending = false, resolved = false, hardTimer, killTimer, pollTimer;
    const probeMs = Math.min(200, Math.max(1, Math.floor(terminationGraceMs / 4)));
    const kill = sig => { if (child.pid > 1) try { process.kill(-child.pid, sig); } catch (e) { if (e.code !== 'ESRCH') error = String(e); } };
    const finish = cleanupVerified => {
      if (resolved) return; resolved = true; clearTimeout(timer); clearTimeout(hardTimer); clearTimeout(killTimer); clearTimeout(pollTimer);
      signal?.removeEventListener('abort', abort);
      child.stdout.destroy(); child.stderr.destroy(); child.unref();
      resolve({ status, signal: childSignal, error, timedOut, aborted, stdout, stderr, pid: child.pid,
        cleanupVerified, launched: !!child.pid, elapsedMs: Date.now() - started });
    };
    const verify = () => {
      if (resolved) return;
      const live = child.pid ? liveGroup(child.pid, spawnSync, probeMs) : [];
      if (live && !live.length) finish(true);
      else pollTimer = setTimeout(verify, 25);
    };
    const end = graceful => {
      if (ending) return; ending = true; clearTimeout(timer);
      kill(graceful ? 'SIGTERM' : 'SIGKILL');
      killTimer = setTimeout(() => kill('SIGKILL'), Math.floor(terminationGraceMs / 2));
      hardTimer = setTimeout(() => {
        kill('SIGKILL');
        const live = child.pid ? liveGroup(child.pid, spawnSync, probeMs) : [];
        finish(Boolean(live && !live.length));
      }, Math.max(0, terminationGraceMs - probeMs));
      verify();
    };
    const abort = () => { aborted = true; end(true); };
    const timer = setTimeout(() => { timedOut = true; end(true); }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    for (const [stream, kind] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) stream.on('data', data => {
      if (kind === 'stdout') stdout = (stdout + data).slice(-65536); else stderr = (stderr + data).slice(-65536);
      try { onOutput(kind, data); } catch (e) { error = String(e); end(false); }
    });
    child.on('error', failure => { error = String(failure); end(false); });
    child.on('exit', (code, sig) => { status = code; childSignal = sig; if (ending) { kill('SIGKILL'); } else end(false); });
  });
}

async function compileDisplay(directory, runner = runBounded, signal) {
  fs.mkdirSync(directory, { recursive: false });
  const sourcePath = path.join(directory, 'display603.swift'), binaryPath = path.join(directory, 'display603');
  fs.writeFileSync(sourcePath, DISPLAY_SWIFT);
  const result = await runner('/usr/bin/xcrun', ['swiftc', sourcePath, '-o', binaryPath],
    { timeoutMs: BOUNDS.compile, terminationGraceMs: BOUNDS.termination, signal });
  const receipt = { sourceSHA256: sha256(DISPLAY_SWIFT), binaryPath, boundMs: BOUNDS.compile,
    terminationGraceMs: BOUNDS.termination, resourceBoundMs: BOUNDS.compile + BOUNDS.termination, ...result };
  fs.writeFileSync(path.join(directory, 'compile.json'), JSON.stringify(receipt, null, 2));
  if (result.status !== 0 || result.error || result.timedOut || result.aborted || !result.cleanupVerified || !fs.existsSync(binaryPath)) throw Error('Exact display helper compilation failed/incomplete');
  receipt.binarySHA256 = sha256(fs.readFileSync(binaryPath)); return receipt;
}

function invokeDisplay(compiled, action, id, runner = spawnSync) {
  if (!['inspect', 'prepare', 'restore'].includes(action) || compiled.sourceSHA256 !== sha256(DISPLAY_SWIFT) ||
      compiled.binarySHA256 !== sha256(fs.readFileSync(compiled.binaryPath))) throw Error('Display helper action/source/binary identity mismatch');
  if (action === 'restore' && (!Number.isInteger(id) || id < 0)) throw Error('Original display ID required');
  const r = runner(compiled.binaryPath, [action, ...(id === undefined ? [] : [String(id)])],
    { encoding: 'utf8', timeout: BOUNDS.display, killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 });
  if (r.error) throw Error('Display helper failed: ' + r.error);
  let data; try { data = JSON.parse(r.stdout); } catch { throw Error('Display helper did not return JSON: ' + String(r.stderr).slice(-3000)); }
  return { ...data, exitCode: r.status, stderr: r.stderr, boundMs: BOUNDS.display };
}

function validStart(start, now) {
  if (!Number.isSafeInteger(start) || start <= 0 || start > now || now - start >= BOUNDS.job) throw Error('Valid T619_JOB_START_MS from the first workflow step is required');
  return start + BOUNDS.job;
}

async function supervise({ out, jobStart, platform = process.platform, now = Date.now, signal,
  compile = compileDisplay, invoke = invokeDisplay, run = runBounded, built = build(), env = process.env } = {}) {
  if (platform !== 'darwin') throw Error('Native mac diagnostic is darwin-only');
  const deadline = validStart(jobStart, now());
  if (Number(env.GITHUB_RUN_ATTEMPT || 1) !== 1) throw Error('One diagnostic attempt only; workflow reruns prohibited');
  out = path.resolve(out); fs.mkdirSync(out, { recursive: true });
  const receiptPath = path.join(out, 'native-mac-supervisor.json');
  fs.writeFileSync(path.join(out, 'native-mac-attempt.json'), JSON.stringify({ started: now(), jobStart, deadline }), { flag: 'wx' });
  const report = { status: 'running', completed: false, jobStart, deadline, boundsMs: BOUNDS,
    requiredRemainingMs: REQUIRED_REMAINING_MS, limitation: LIMITATION, attempts: 0, restored: false, cleanupVerified: false };
  const persist = () => fs.writeFileSync(receiptPath, JSON.stringify(report, null, 2));
  const { source, ...manifest } = built;
  fs.writeFileSync(path.join(out, 'native-mac-overlay.json'), JSON.stringify(manifest, null, 2));
  const emitted = path.join(out, 'native-mac-emitted.cjs'); fs.writeFileSync(emitted, source);
  let compiled, original, innerDirectory;
  persist();
  try {
    if (signal?.aborted) throw Error('Diagnostic interrupted before preparation');
    if (deadline - now() < BOUNDS.compile + BOUNDS.termination + BOUNDS.flush) throw Error('Insufficient bounded compiler/evidence budget');
    compiled = await compile(path.join(out, 'display-helper'), undefined, signal); report.compile = compiled; persist();
    original = report.displayBefore = invoke(compiled, 'inspect');
    if (!original.ok || original.exitCode !== 0 || !Number.isInteger(original.restoreID) || original.before?.id !== original.restoreID || !Number.isInteger(original.displayID)) throw Error('Original display identity unavailable before preparation');
    persist();
    if (signal?.aborted || deadline - now() < BOUNDS.display * 2 + BOUNDS.flush) throw Error('Insufficient display preparation/restoration budget');
    // This assignment precedes prepare: restoration also runs if prepare changes
    // the display and then throws or emits invalid output.
    report.restoreRequired = true; persist();
    const prepared = report.displayPrepared = invoke(compiled, 'prepare'); persist();
    if (!prepared.ok || prepared.exitCode !== 0 || prepared.displayID !== original.displayID ||
        !(prepared.after?.width >= 1400 && prepared.after?.height >= 900)) throw Error('Environment limitation: no supported display mode fits the unchanged viewport');
    const remaining = report.remainingBeforeInnerMs = deadline - now(); persist();
    if (signal?.aborted || remaining < REQUIRED_REMAINING_MS) throw Error('Insufficient full inner/termination/restoration/evidence budget; browser not launched');
    innerDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'native-mac619-'));
    const token = crypto.randomBytes(24).toString('hex');
    const contractPath = path.join(out, 'native-mac-inner-contract.json');
    fs.writeFileSync(contractPath, JSON.stringify({ parentPid: process.pid, token, emitted, sha256: built.sha256,
      adapterSHA256: built.adapterSHA256, innerDirectory, out }));
    report.attempts = 1; persist();
    report.inner = await run(process.execPath, [__filename, '--inner=' + contractPath, '--out=' + out],
      { timeoutMs: BOUNDS.inner, terminationGraceMs: BOUNDS.termination, signal,
        env: { ...env, T619_INNER_TOKEN: token, T619_INNER_DIR: innerDirectory },
        onOutput: (kind, data) => fs.appendFileSync(path.join(out, 'native-mac-' + kind + '.log'), data) });
    report.cleanupVerified = report.inner.cleanupVerified === true;
    try { report.innerSummary = JSON.parse(fs.readFileSync(path.join(out, 'native-mac-inner-summary.json'), 'utf8')); }
    catch (e) { report.innerSummaryError = String(e); }
  } catch (e) { report.error = String(e.stack || e); }
  finally {
    // Outer process owns restoration. Inner timeout, SIGKILL, or a crashed
    // browser cannot skip this finally. A killed outer/job leaves running data.
    if (report.restoreRequired) {
      try {
        report.displayRestored = invoke(compiled, 'restore', original.restoreID);
        report.restored = report.displayRestored.ok === true && report.displayRestored.exitCode === 0 &&
          report.displayRestored.displayID === original.displayID && report.displayRestored.after?.id === original.restoreID;
      } catch (e) { report.restoreError = String(e.stack || e); }
    }
    // Do not erase the isolated directory while child cleanup is unverified.
    if (innerDirectory && report.cleanupVerified) {
      try { fs.rmSync(innerDirectory, { recursive: true, force: true }); report.profileRemoved = !fs.existsSync(innerDirectory); }
      catch (e) { report.cleanupError = String(e); }
    } else if (innerDirectory) report.profileRetained = innerDirectory;
    report.finished = now();
    const finalInner = report.inner && !report.inner.timedOut && !report.inner.aborted && !report.inner.error &&
      Number.isInteger(report.inner.status) && ['passed', 'failed'].includes(report.innerSummary?.status);
    report.completed = Boolean(finalInner && report.cleanupVerified && report.profileRemoved && report.restored &&
      report.finished <= deadline && !signal?.aborted);
    report.status = report.completed && report.inner.status === 0 && report.innerSummary.status === 'passed' &&
      report.innerSummary.nativeMac619?.complete === true ? 'passed' : report.completed ? 'failed' : 'incomplete';
    persist();
  }
  return report;
}

async function main() {
  if (process.argv.includes('--check-overlay')) { console.log('NATIVE_MAC_OVERLAY_OK ' + build().sha256); return; }
  if (process.argv.includes('--self-test')) {
    const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'native-mac-diagnostic.test.cjs')], { stdio: 'inherit' });
    process.exitCode = r.status === 0 ? 0 : 1; return;
  }
  if (process.platform !== 'darwin') throw Error('Native mac diagnostic is darwin-only');
  const innerArg = process.argv.find(a => a.startsWith('--inner='));
  if (innerArg) {
    const c = JSON.parse(fs.readFileSync(innerArg.slice(8), 'utf8'));
    if (c.parentPid !== process.ppid || !c.token || c.token !== process.env.T619_INNER_TOKEN ||
      c.innerDirectory !== process.env.T619_INNER_DIR || !fs.existsSync(c.innerDirectory) ||
      sha256(fs.readFileSync(__filename)) !== c.adapterSHA256) throw Error('Outer supervisor contract required');
    const source = fs.readFileSync(c.emitted, 'utf8');
    if (sha256(source) !== c.sha256) throw Error('Emitted adapter identity mismatch');
    new Function('require', '__filename', '__dirname', source)(createRequire(path.join(SCENES, 'scene603.js')), path.join(SCENES, 'scene603.js'), SCENES);
    return;
  }
  if (process.argv.some(a => a.startsWith('--phase=') && a !== '--phase=core')) throw Error('Only the complete original core phase is permitted');
  const outArg = process.argv.find(a => a.startsWith('--out='));
  if (!outArg) throw Error('Explicit --out= is required for one-attempt evidence');
  const controller = new AbortController(), stop = () => controller.abort();
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  try {
    const report = await supervise({ out: outArg.slice(6), jobStart: Number(process.env.T619_JOB_START_MS), signal: controller.signal });
    console.log('NATIVE_MAC_DIAGNOSTIC ' + JSON.stringify({ status: report.status, completed: report.completed, restored: report.restored, cleanupVerified: report.cleanupVerified }));
    process.exitCode = report.status === 'passed' ? 0 : 2;
  } finally { process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop); }
}

module.exports = { BOUNDS, REQUIRED_REMAINING_MS, LIMITATION, DISPLAY_SWIFT, sha256, build,
  installLossLatch, boundaryValid, createQualifier, liveGroup, runBounded, compileDisplay, invokeDisplay, validStart, supervise };
if (require.main === module) main().catch(e => { console.error(e.stack || e); process.exitCode = 2; });
