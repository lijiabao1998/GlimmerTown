'use strict';
// T616: unchanged T603 correctness coverage with T614 enabled in disposable HTML.
// This runner does not modify runtime files and does not measure performance.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const crypto = require('node:crypto'), { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..'), SCENES = path.resolve(__dirname, '../t603-shots');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const option = (name, fallback) => process.argv.find(value => value.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;

// Called inside the native game closure, after declarations and before GV export.
// Source hooks were already installed before ANY game JavaScript executed.
function install616() {
  const original = lotNightLayer574;
  const cache = TownRetained614.create({ original, getSurface: () => ({
    canvas: lotNightCanvas574, context: lotNightCtx574, privateClip: true
  }), sourceVersion: source => window.__source616.version(source), Path2D, tileSize: 128 });
  let originalOnly = false, calls = 0, originalCalls = 0, guards = 0, rngCalls = 0;
  let originalSurface = { canvas: null, context: null };
  const actorState = () => JSON.stringify({ cars, citizens, smokes, trains, cargoShips,
    tramCars, ambulances, recycleTrucks, ladderTrucks, policeCars, schoolBuses,
    buses, rbuses, lifeShips, rain, confetti, fxParts });
  const modelState = () => JSON.stringify({ day, money, pop, tiles });
  const visual = () => ({ visT, trafClock, waterT, waterF, rainbowT, flashT, shakeT,
    meteorTrail, meteorTime: meteorTrail?.t, windX441,
    windReport: window.__t441Wind, hasWindReport: Object.hasOwn(window, '__t441Wind') });
  function restoreVisual(state) {
    ({ visT, trafClock, waterT, waterF, rainbowT, flashT, shakeT, meteorTrail, windX441 } = state);
    if (meteorTrail) meteorTrail.t = state.meteorTime;
    if (state.hasWindReport) window.__t441Wind = state.windReport; else delete window.__t441Wind;
  }
  function layer616(...args) {
    if (originalOnly) {
      originalCalls++;
      const canvas = lotNightCanvas574, context = lotNightCtx574;
      lotNightCanvas574 = originalSurface.canvas; lotNightCtx574 = originalSurface.context;
      try { return original.apply(this, args); }
      finally {
        originalSurface = { canvas: lotNightCanvas574, context: lotNightCtx574 };
        lotNightCanvas574 = canvas; lotNightCtx574 = context;
      }
    }
    calls++;
    return cache.layer(...args);
  }
  lotNightLayer574 = layer616;
  const status = () => {
    const s = cache.stats(), observer = window.__source616.stats();
    return { installed: lotNightLayer574 === layer616, native: typeof window.__townRenderer604 === 'undefined',
      timeOrigin: performance.timeOrigin, url: location.pathname, quality, calls, originalCalls,
      guards, rngCalls, hits: s.hits, partials: s.partials, fullRebuilds: s.fullRebuilds,
      fallbacks: s.fallbacks, invalidations: s.invalidations, last: s.last,
      observer: { installed: observer.installed, reason: observer.reason,
        weakEntries: observer.weakEntries, weakEntryLimit: observer.weakEntryLimit } };
  };
  function checkpoint(label, count = 2) {
    if (lotNightLayer574 !== layer616 || !window.__source616.stats().installed) throw Error('T616 candidate/observer inactive: ' + label);
    const before = modelState(), actors = actorState(), oldR = R, wasRunning = running, clocks = visual();
    let draws = 0;
    running = false;
    R = function (...args) { draws++; return oldR.apply(this, args); };
    try {
      for (let i = 0; i < count; i++) { restoreVisual(clocks); draw(0); }
      if (draws || modelState() !== before || actorState() !== actors) throw Error('T616 render mutated model/actors/RNG: ' + label);
      guards++; rngCalls += draws;
      return { label, modelExact: true, actorsExact: true, rngCalls: draws, ...status() };
    } finally { R = oldR; running = wasRunning; restoreVisual(clocks); }
  }
  function oldSave(raw) {
    localStorage.setItem(slotKey(3), raw);
    if (!GV.load()) throw Error('T616 old save load failed');
    GV.ai(false); GV.setSpeed(0); __s603.freezeVis(100);
    const roots = __s603.roots(), stats = GV.stats(), savedBefore = __s603.sourceSaved(raw);
    const guard = checkpoint('old-save'); GV.save(); const savedAfter = __s603.saved();
    if (savedBefore !== savedAfter) throw Error('T616 old save canonical fields changed');
    if (!GV.load()) throw Error('T616 old save second load failed');
    const after = __s603.roots();
    if (JSON.stringify(roots) !== JSON.stringify(after)) throw Error('T616 old save root roundtrip changed');
    return { roots, stats: { day: stats.day, pop: stats.pop, money: stats.money },
      canonicalExact: true, roundtripExact: true, guard };
  }
  function transitions() {
    const saved = { cam: { ...cam }, day, quality, weather, wxT, visT,
      noNight: window.__noNightCity, ownNight: Object.hasOwn(window, '__noNightCity'), rot: viewRotEff() };
    const rows = [], test = (label, fn) => { fn(); rows.push(checkpoint(label)); };
    try {
      __s603.freezeVis(100);
      for (const zoom of [.35, .7, 1, 1.25, 3]) test('zoom-' + zoom, () => GV.setZoom(zoom));
      GV.setZoom(1);
      for (let rot = 0; rot < 4; rot++) test('rotation-' + rot, () => GV.setRot(rot));
      test('fractional-pan', () => { cam.x += .375; cam.y += .625; groundDirty = true; });
      for (let seasonIndex = 0; seasonIndex < 4; seasonIndex++) test('season-' + seasonIndex, () => GV.setSeason(seasonIndex));
      for (let value = 0; value < 3; value++) test('weather-' + value, () => GV.weather(value));
      for (let value = 0; value < 3; value++) test('quality-' + value, () => { quality = value; });
      test('night-feature-off', () => { window.__noNightCity = true; });
      test('night-feature-on', () => { delete window.__noNightCity; });
      test('source-regeneration', () => __s603.clear());
      test('same-output-width-reset', () => { if (lotNightCanvas574) lotNightCanvas574.width = lotNightCanvas574.width; });
      test('day-no-layer', () => __s603.freezeVis(55));
      test('night-return', () => __s603.freezeVis(100));
      return rows;
    } finally {
      ({ day, quality, weather, wxT } = saved); Object.assign(cam, saved.cam); GV.setRot(saved.rot);
      if (saved.ownNight) window.__noNightCity = saved.noNight; else delete window.__noNightCity;
      __s603.freezeVis(saved.visT); groundDirty = true;
    }
  }
  window.__regression616 = {
    status, checkpoint, oldSave, transitions,
    advanceCheckpoints() {
      __s603.freezeVis(100);
      const rows = [];
      for (let i = 0; i < 12; i++) { advance(.05); rows.push(checkpoint('advancing-' + i)); }
      return rows;
    },
    originalNativeFrame(artOff, time, mode) {
      if (originalOnly) throw Error('T616 original comparator reentry');
      originalOnly = true;
      try { return __s603.nativeFrame(artOff, time, mode); }
      finally { originalOnly = false; }
    }
  };
}

function build(source = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8')) {
  const changes = [];
  function replace(from, to, label = from.slice(0, 70)) {
    if (source.split(from).length !== 2) throw Error('T616 exact anchor drift: ' + label);
    source = source.replace(from, to); changes.push({ label, removedSHA256: hash(from), addedSHA256: hash(to) });
  }
  function removeSpan(start, end, replacement, label) {
    if (source.split(start).length !== 2 || source.split(end).length !== 2) throw Error('T616 timing boundary drift: ' + label);
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (b <= a) throw Error('T616 reversed timing boundary: ' + label);
    const removed = source.slice(a, b);
    const expected = {
      'mobile timing and one-minute RAF timing': '1ca1736a930dbf14bd17b2d07c5aaf64a51286d91531e489f214fc339dea8e8f',
      'desktop cold/warm/RAF timing': '2c35952e5b590c3dbbc735dda0eb321ea7afe45ef2c88deb668bb27b378482cc'
    };
    if (hash(removed) !== expected[label]) throw Error('T616 timing block byte drift: ' + label);
    source = source.slice(0, a) + replacement + source.slice(b);
    changes.push({ label, removedSHA256: hash(removed), removedBytes: Buffer.byteLength(removed), start, end });
  }
  removeSpan("    report.mobilePerformance={};", "    await ev('__s603.freezeVis(null);true');",
    "    report.timing616={run:false,reason:'Timing and one-minute RAF gate are separate from correctness; no FPS claim.'};\n",
    'mobile timing and one-minute RAF timing');
  removeSpan("    const beforePerfDocument=await ev('performance.timeOrigin');", '    report.coverage.core=true;persist();}',
    "    await ev('window.__noT603=false;true');\n", 'desktop cold/warm/RAF timing');
  replace("    check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));",
    "    check(report.performanceFailures.length===0,'no performance samples were run in this correctness-only runner');");
  replace("const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;", `const contract616=require('../t604-canvaskit/source-contract.cjs');
report.sourceContract616=contract616.verify(ROOT);
html=contract616.invertIndex(html);
fs.writeFileSync(path.join(DIR,'sw.js'),contract616.invertSW(fs.readFileSync(path.join(DIR,'sw.js'),'utf8')));
const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;`);
  const injection = fs.readFileSync(path.join(__dirname, 'source-revision612.cjs'), 'utf8') +
    ';window.__source616=TownSourceRevision612.install(window);\n' + fs.readFileSync(path.join(__dirname, 'retained614.cjs'), 'utf8');
  replace("fs.writeFileSync(path.join(DIR,'index.html'),html.replace('window.GV={','('+bridge603.toString()+')();window.GV={'));",
    String.raw`check(html.split('\n<script>\n').length===2,'T616 unique preboot script anchor');
html=html.replace('\n<script>\n','\n<script>\n'+${JSON.stringify(injection)});
const candidate616=html.replace('window.GV={','('+bridge603.toString()+')();('+${JSON.stringify(install616.toString())}+')();window.GV={');
report.candidate616={sourceSHA256:hash(candidate616),helperSHA256:${JSON.stringify(hash(fs.readFileSync(path.join(__dirname, 'retained614.cjs'))))},observerSHA256:${JSON.stringify(hash(fs.readFileSync(path.join(__dirname, 'source-revision612.cjs'))))},timingRun:false,qualityAccepted:null,releaseGatePassed:false,acceptedPixelException:'None for safer T614. Prior T615 visual acceptance does not waive new candidate differences.'};
fs.writeFileSync(path.join(DIR,'index.html'),candidate616);`);
  replace("path.join(OUT,'scene603-summary.json')", "path.join(OUT,'regression616-summary.json')");
  replace("'/usr/bin/google-chrome','/usr/bin/chromium'", "'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'");
  replace("['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),",
    "[...(process.argv.includes('--headed')?[]:['--headless=new']),...(process.platform==='linux'?['--no-sandbox']:[]),");
  replace("headless:true,performanceNote:'Headless Chromium timings do not establish physical-device 55 FPS.'",
    "headless:!process.argv.includes('--headed'),performanceNote:'Correctness only; default native graphics, original quality, no FPS measurement or claim.'");
  replace("report.graphicsLaunch='Original headless --disable-gpu configuration restored after default-graphics diagnostic; both modes failed the unchanged absolute RAF floor on software-only CI';",
    "report.graphicsLaunch='Default Chrome graphics; native Canvas2D correctness only. GPU identity is reported; this is not qualified performance evidence.';");
  const cityAnchor = "    report.cityStats=await growCity('desktop-before');report.census={};";
  replace(cityAnchor, `    report.candidateDocuments616=[];report.oldSaves616=[];
    const status616=async label=>{const s=await ev('window.__regression616?__regression616.status():null');check(s&&s.installed&&s.native&&s.observer.installed,'actual native T614 candidate active: '+label);report.candidateDocuments616.push({label,...s});return s;};
    await status616('before-old-saves');
    const manifest616=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','manifest.json'),'utf8'));
    for(const fixture of manifest616.cities){const raw=fs.readFileSync(path.join(__dirname,'fixtures',fixture.file),'utf8');check(hash(raw)===fixture.saveSHA256,'T616 immutable old-save bytes seed'+fixture.seed);const r=await ev('__regression616.oldSave('+JSON.stringify(raw)+')');check(!r.roots.bad&&r.roots.rows.length===fixture.roots&&hash(JSON.stringify(r.roots.rows))===fixture.rootSHA256,'T616 actual-candidate old-save roots seed'+fixture.seed);report.oldSaves616.push({seed:fixture.seed,...r,roots:{count:r.roots.rows.length,bad:r.roots.bad,sha256:hash(JSON.stringify(r.roots.rows))}});}
` + cityAnchor + `
    report.transitions616=await ev('__regression616.transitions()');
    check(report.transitions616.length===26&&report.transitions616.every(r=>r.modelExact&&r.actorsExact&&r.rngCalls===0),'all 26 model/actor/RNG-preserving candidate transitions');
    report.activity616=await ev('__regression616.advanceCheckpoints()');
    check(report.activity616.some(r=>r.hits>0&&r.partials>0),'actual retained hit AND partial executed; original fallback alone is insufficient');
    await growCity('desktop-after-transitions');await status616('after-transitions');`);
  const nativeImage = "    const nativeImage603=async(c,artOff,mode='native')=>{const r=await ev('__s603.nativeFrame('+artOff+','+c.time+','+JSON.stringify(mode)+')'),pixels=pngRgba603(Buffer.from(r.png.split(',')[1],'base64'));check(r.unstablePixels===0,'stable full RGBA native frame '+c.key+'/'+artOff+'/'+mode);check(pixels.w===c.width*c.dpr&&pixels.h===c.height*c.dpr&&r.state.viewport.dpr===c.dpr,'native full canvas dimensions '+c.key);return {...r,pixels};};";
  replace(nativeImage, `    const nativeImage603=async(c,artOff,mode='native')=>{
      const r=await ev('__s603.nativeFrame('+artOff+','+c.time+','+JSON.stringify(mode)+')'),pixels=pngRgba603(Buffer.from(r.png.split(',')[1],'base64'));
      check(r.unstablePixels===0,'stable full RGBA native frame '+c.key+'/'+artOff+'/'+mode);
      check(pixels.w===c.width*c.dpr&&pixels.h===c.height*c.dpr&&r.state.viewport.dpr===c.dpr,'native full canvas dimensions '+c.key);
      if(await ev('!!window.__regression616')){
        const guard=await ev('__regression616.checkpoint('+JSON.stringify(c.key)+')');
        const original=await ev('__regression616.originalNativeFrame('+artOff+','+c.time+','+JSON.stringify(mode)+')'),originalPixels=pngRgba603(Buffer.from(original.png.split(',')[1],'base64'));
        const delta=pixelDelta603(pixels,originalPixels);r.regression616={guard,originalChangedPixels:delta};report.comparisons616=(report.comparisons616||0)+1;
        if(delta){
          const f='T616-mismatch-'+c.key+'-'+artOff+'-'+mode+'-'+report.comparisons616,samples=[];let maxChannelDelta=0;
          for(let i=0;i<pixels.rgba.length;i+=4){let changed=false;for(let channel=0;channel<4;channel++){const d=Math.abs(pixels.rgba[i+channel]-originalPixels.rgba[i+channel]);maxChannelDelta=Math.max(maxChannelDelta,d);changed||=d!==0;}if(changed&&samples.length<32)samples.push({x:i/4%pixels.w,y:Math.floor(i/4/pixels.w),candidate:Array.from(pixels.rgba.subarray(i,i+4)),original:Array.from(originalPixels.rgba.subarray(i,i+4))});}
          const finding={key:c.key,artOff,mode,changedPixels:delta,maxChannelDelta,samples,pendingReview:true,accepted:false,blanketTolerance:false,candidateFile:f+'-candidate.png',originalFile:f+'-original.png'};
          r.regression616.pixelFinding=finding;
          if(delta<=3&&maxChannelDelta<=1){const list=report.unapprovedTiny616||(report.unapprovedTiny616=[]);check(list.length<2048,'bounded T616 tiny-difference evidence registry');list.push(finding);report.candidate616.qualityAccepted=false;}
          else report.candidatePixelFailure616=finding;
          fs.writeFileSync(path.join(OUT,f+'-candidate.png'),Buffer.from(r.png.split(',')[1],'base64'));fs.writeFileSync(path.join(OUT,f+'-original.png'),Buffer.from(original.png.split(',')[1],'base64'));persist();
        }
        check(original.unstablePixels===0,'T616 unchanged original control remains stable '+c.key+'/'+artOff+'/'+mode);
        if(delta===0)check(true,'T614 equals same-scene unchanged original full RGBA '+c.key+'/'+artOff+'/'+mode);
        else check(delta<=3&&r.regression616.pixelFinding.maxChannelDelta<=1,'new T614 difference exceeds the bounded pending-review size '+c.key+'/'+artOff+'/'+mode);
      }
      return {...r,pixels};
    };`);
  for (const phase of ['core', 'world', 'neighbors']) replace(`    report.coverage.${phase}=true;persist();}`,
    `    await status616('${phase}-complete');report.coverage.${phase}=true;persist();}`);
  replace("    report.finalFlags=await ev('__s603.flags()');", `    await status616('final');
    report.qualityAccepted616=report.coverage.world?!(report.unapprovedTiny616||[]).length:null;report.candidate616.qualityAccepted=report.qualityAccepted616;
    report.candidateCoverage616={activeDocuments:report.candidateDocuments616.length,oldSaves:report.oldSaves616.length,transitions:report.transitions616.length,modelActorRngGuards:report.activity616.length,phases:{...report.coverage},timingRun:false};
    report.finalFlags=await ev('__s603.flags()');`);
  replace("report.status='passed';exitCode=0;", "report.correctnessPassed616=true;report.status=(report.unapprovedTiny616||[]).length?'correctness-complete-unapproved-tiny-differences':'passed';exitCode=0;");
  if (/await raf\(|await traceFrameWork603\(|__s603\.perfStart\(\)/.test(source)) throw Error('T616 unexpected surviving timing execution');
  new Function('require', '__filename', '__dirname', source);
  return { source, changes, sha256: hash(source) };
}

function support(out) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regression616-support-'));
  const contract = require('./source-contract.cjs');
  const result = { status: 'running', coverage: 'Canonical native runtime/model/toolchain support only. Historical t604-canvaskit injected diagnostics are excluded from this non-shipping supporting tree; T447 is unchanged. Candidate-active browser and generated save-isolation checks remain separate.', excludedFromSupportingTree: ['docs/tasks/t604-canvaskit'], commands: [] };
  fs.mkdirSync(out, { recursive: true });
  try {
    fs.cpSync(ROOT, dir, { recursive: true, filter: file => {
      const rel = path.relative(ROOT, file), first = rel.split(path.sep)[0];
      const normalized=rel.split(path.sep).join('/');
      if(normalized==='docs/tasks/t604-canvaskit'||normalized.startsWith('docs/tasks/t604-canvaskit/'))return false;
      return !['.git', 'node_modules', '.cache', '.codex', '.agents'].includes(first) && !first.startsWith('evidence');
    } });
    fs.writeFileSync(path.join(dir, 'index.html'), contract.invertIndex(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
    fs.writeFileSync(path.join(dir, 'sw.js'), contract.invertSW(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')));
    const commands = [
      ['verify', process.env.PYTHON || 'python3', ['tools/verify.py', '--min-pass', '12525'], 1000000],
      ['toolchain', process.env.PYTHON || 'python3', ['-m', 'unittest', 'tools.test_toolchain'], 300000],
      ['native603', process.execPath, ['docs/tasks/t603-shots/native603.test.js'], 180000],
      ['sw603', process.execPath, ['--test', 'docs/tasks/t603-shots/sw603.test.mjs'], 180000],
      ['test603', process.execPath, ['docs/tasks/t603-shots/test603.js'], 180000],
      ['clearance603', process.execPath, ['docs/tasks/t603-shots/clearance603.js', 'index.html', '-', '1'], 180000],
      ['oldsave', process.execPath, ['docs/tasks/t603-shots/oldsave603.js', '--json=' + path.join(out, 'oldsave603.json')], 180000]
    ];
    for (const [name, executable, args, timeout] of commands) {
      const r = spawnSync(executable, args, { cwd: dir, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } });
      fs.writeFileSync(path.join(out, name + '.stdout.log'), r.stdout || ''); fs.writeFileSync(path.join(out, name + '.stderr.log'), r.stderr || '');
      result.commands.push({ name, executable, args, exitCode: r.status, error: r.error?.message || null });
      fs.writeFileSync(path.join(out, 'support616-summary.json'), JSON.stringify(result, null, 2));
      if (r.status !== 0 || r.error) throw Error('T616 supporting gate failed: ' + name);
    }
    result.status = 'passed'; return result;
  } catch (error) { result.status = 'failed'; result.error = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(out, 'support616-summary.json'), JSON.stringify(result, null, 2)); fs.rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  const built = build();
  if (process.argv.includes('--check-overlay')) { console.log('T616_REGRESSION_OVERLAY_OK ' + built.sha256); return; }
  if (process.argv.includes('--self-test')) {
    const assert = require('node:assert/strict'), original = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8');
    for (const marker of ['report.mobilePerformance={};', 'const beforePerfDocument=', 'const nativeImage603=async']) {
      assert.throws(() => build(original.replace(marker, '/* drift */' + marker.replace('=', ' ='))), /anchor|boundary|drift|Syntax|Unexpected/);
    }
    assert.match(built.source, /all 308|nativeCases603\.length===308/);
    assert.match(built.source, /report\.dogActors\.length===288/);
    assert.match(built.source, /report\.occlusion\.length===128/);
    assert.match(built.source, /originalChangedPixels/);
    assert.match(built.source, /source-revision|TownSourceRevision612/);
    const prebootSlot="await send('Page.addScriptToEvaluateOnNewDocument',{source:'try{localStorage.setItem(\"glimmerville.v1.slot\",\"3\");";
    assert.ok(built.source.includes(prebootSlot),'generated candidate harness must select isolated slot3 before boot');
    assert.ok(built.source.indexOf(prebootSlot)<built.source.indexOf("await send('Page.navigate'"),'slot3 setup must precede navigation');
    assert.ok(built.source.includes('[8123,8199].includes(p)'),'generated harness must prohibit player ports');

    assert.doesNotMatch(install616.toString(), /cache\.invalidate\(/);
    const vm = require('node:vm'), box = { WeakRef, Path2D: class {},
      performance: { timeOrigin: 1 }, location: { pathname: '/index.html' },
      day: 1, money: 200, pop: 10, tiles: [], quality: 1, weather: 0, wxT: 0,
      visT: 100, trafClock: 0, waterT: 0, waterF: 0, rainbowT: 0, flashT: 0,
      shakeT: 0, meteorTrail: null, windX441: 0, running: true, groundDirty: false,
      cam: { x: 1, y: 2, z: 1 }, R: () => .25, lotNightCanvas574: { name: 'candidate' },
      lotNightCtx574: { name: 'candidate-context' }, __source616: { stats: () => ({ installed: true }) } };
    for (const key of ['cars', 'citizens', 'smokes', 'trains', 'cargoShips', 'tramCars', 'ambulances',
      'recycleTrucks', 'ladderTrucks', 'policeCars', 'schoolBuses', 'buses', 'rbuses', 'lifeShips', 'rain', 'confetti', 'fxParts']) box[key] = [];
    box.window = box; box.viewRotEff = () => box.rot || 0;
    box.GV = { setZoom: v => { box.cam.z = v; }, setRot: v => { box.rot = v; },
      setSeason: v => { box.day = [1, 101, 201, 301][v]; }, weather: v => { box.weather = v; } };
    box.__s603 = { freezeVis: v => { box.visT = v; }, clear() {}, nativeFrame() { box.draw(); return 'original-frame'; } };
    box.lotNightLayer574 = () => { box.lotNightCanvas574 ||= { name: 'control' }; box.lotNightCtx574 ||= {}; return box.lotNightCanvas574; };
    const counters = { hits: 0, partials: 0, fullRebuilds: 0, fallbacks: 0, invalidations: 0 };
    box.TownRetained614 = { create: config => ({ layer(...args) { counters.hits++; return config.original(...args); }, stats: () => ({ ...counters }) }) };
    box.draw = () => box.lotNightLayer574([], .7, 100, 100); box.advance = () => {};
    vm.createContext(box); vm.runInContext('(' + install616.toString() + ')();', box);
    assert.equal(box.__regression616.checkpoint('smoke').modelExact, true);
    assert.equal(box.__regression616.transitions().length, 26);
    const candidateCanvas = box.lotNightCanvas574, count = box.__regression616.status().calls;
    assert.equal(box.__regression616.originalNativeFrame(false, 100, 'native'), 'original-frame');
    assert.equal(box.lotNightCanvas574, candidateCanvas);
    assert.equal(box.__regression616.status().calls, count);
    assert.equal(box.__regression616.status().originalCalls, 1);
    const cleanDraw = box.draw; box.draw = () => { box.R(); cleanDraw(); };
    assert.throws(() => box.__regression616.checkpoint('bad-rng'), /mutated model\/actors\/RNG/);
    assert.equal(box.running, true); box.draw = cleanDraw;
    box.__s603.nativeFrame = () => { throw Error('native-control-error'); };
    assert.throws(() => box.__regression616.originalNativeFrame(false, 100, 'native'), /native-control-error/);
    assert.equal(box.__regression616.checkpoint('after-control-error').modelExact, true);
    // Execute the emitted comparator, including evidence and continuation policy.
    // This verifies the actual generated branch, not a duplicate classifier.
    const comparatorStart = built.source.indexOf('    const nativeImage603=async'),
      comparatorEnd = built.source.indexOf('    const nativeSave603=', comparatorStart);
    assert(comparatorStart >= 0 && comparatorEnd > comparatorStart);
    const comparator = new Function('ev', 'pngRgba603', 'pixelDelta603', 'check', 'report', 'fs', 'path', 'OUT', 'persist',
      built.source.slice(comparatorStart, comparatorEnd) + '\nreturn nativeImage603;');
    async function compareCase(changed, maxDelta, unstable = 0) {
      const actual = Buffer.alloc(16), original = Buffer.alloc(16);
      for (let i = 0; i < changed; i++) actual[i * 4] = maxDelta;
      const report = { candidate616: { qualityAccepted: null } }, files = [];
      const frame = which => ({ png: 'data:image/png;base64,' + Buffer.from([which]).toString('base64'),
        unstablePixels: which === 2 ? unstable : 0, state: { viewport: { dpr: 1 } } });
      const ev = async expression => expression === '!!window.__regression616' ? true :
        expression.startsWith('__regression616.checkpoint') ? { modelExact: true } :
          expression.startsWith('__regression616.originalNativeFrame') ? frame(2) : frame(1);
      const fn = comparator(ev, bytes => ({ w: 4, h: 1, rgba: bytes[0] === 1 ? actual : original }),
        (a, b) => { let count = 0; for (let i = 0; i < a.rgba.length; i += 4) if (!a.rgba.subarray(i, i + 4).equals(b.rgba.subarray(i, i + 4))) count++; return count; },
        (ok, message) => { if (!ok) throw Error(message); }, report, { writeFileSync: file => files.push(file) }, path, '/diagnostic', () => {});
      await fn({ key: 'case', time: 100, width: 4, height: 1, dpr: 1 }, false);
      return { report, files };
    }
    assert.equal((await compareCase(0, 0)).report.unapprovedTiny616, undefined);
    const tiny = await compareCase(3, 1);
    assert.equal(tiny.report.candidate616.qualityAccepted, false);
    assert.equal(tiny.report.unapprovedTiny616.length, 1);
    assert.equal(tiny.report.unapprovedTiny616[0].accepted, false);
    assert.equal(tiny.report.unapprovedTiny616[0].samples.length, 3);
    assert.equal(tiny.files.length, 2);
    await assert.rejects(compareCase(4, 1), /exceeds the bounded pending-review size/);
    await assert.rejects(compareCase(1, 2), /exceeds the bounded pending-review size/);
    await assert.rejects(compareCase(3, 1, 1), /original control remains stable/);
    console.log('T616_RUNNER_CONTRACTS_OK'); return;
  }
  const out = path.resolve(option('out', path.join(os.tmpdir(), 'regression616')));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'overlay616.json'), JSON.stringify({ sha256: built.sha256, changes: built.changes }, null, 2));
  if (process.argv.includes('--with-support') || process.argv.includes('--support-only')) support(path.join(out, 'support'));
  if (process.argv.includes('--support-only')) return;
  new Function('require', '__filename', '__dirname', built.source)(createRequire(path.join(SCENES, 'scene603.js')), path.join(SCENES, 'scene603.js'), SCENES);
}
module.exports = { build, install616, support };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
