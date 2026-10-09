'use strict';
// T617 correctness: approved T603 native runtime, with no retained layer/observer.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), { createRequire } = require('node:module');
const SCENES = path.resolve(__dirname, '../t603-shots');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const SLOT_KEYS = ['glimmerville.v1.s1', 'glimmerville.v1.s1_bak', 'glimmerville.v1.s2', 'glimmerville.v1.s2_bak', 'glimmerville.v1'];
const TIMING = Object.freeze({
  mobile: { start: '    report.mobilePerformance={};', end: "    await ev('__s603.freezeVis(null);true');",
    sha256: '1ca1736a930dbf14bd17b2d07c5aaf64a51286d91531e489f214fc339dea8e8f' },
  desktop: { start: "    const beforePerfDocument=await ev('performance.timeOrigin');", end: '    report.coverage.core=true;persist();}',
    sha256: '2c35952e5b590c3dbbc735dda0eb321ea7afe45ef2c88deb668bb27b378482cc' }
});
const CHROME_LAUNCH = "browser=spawn(executable,['--headless=new','--disable-gpu',...(process.platform==='linux'?['--no-sandbox']:[]),'--no-first-run','--no-default-browser-check','--mute-audio','--hide-scrollbars','--window-size=1400,900','--user-data-dir='+path.join(DIR,'.profile'),'--remote-debugging-port='+DEV,'about:blank'],{stdio:['ignore','ignore','pipe']});";

// Test APIs only. No rendering function, Canvas prototype, or write path is replaced.
function bridge617() {
  const originalNight = lotNightLayer574;
  let guards = 0;
  const model = () => JSON.stringify({ day, money, pop, tiles });
  const actors = () => JSON.stringify({ cars, citizens, smokes, trains, cargoShips,
    tramCars, ambulances, recycleTrucks, ladderTrucks, policeCars, schoolBuses,
    buses, rbuses, lifeShips, rain, confetti, fxParts });
  const visual = () => ({ visT, trafClock, waterT, waterF, rainbowT, flashT, shakeT,
    meteorTrail, meteorTime: meteorTrail?.t, windX441,
    windReport: window.__t441Wind, hasWindReport: Object.hasOwn(window, '__t441Wind') });
  function restoreVisual(state) {
    ({ visT, trafClock, waterT, waterF, rainbowT, flashT, shakeT, meteorTrail, windX441 } = state);
    if (meteorTrail) meteorTrail.t = state.meteorTime;
    if (state.hasWindReport) window.__t441Wind = state.windReport; else delete window.__t441Wind;
  }
  function status() {
    const retired = Object.getOwnPropertyNames(window).filter(key =>
      /^Town(?:Retained|SourceRevision)\d+$/.test(key) || /^__(?:source|retained|regression)61[2-6]$/.test(key));
    return { native: typeof window.__townRenderer604 === 'undefined', unchangedNightHelper: lotNightLayer574 === originalNight,
      retiredGlobals: retired, slot: curSlot(), quality, guards, url: location.pathname, timeOrigin: performance.timeOrigin };
  }
  function checkpoint(label) {
    const state = status();
    if (!state.native || !state.unchangedNightHelper || state.retiredGlobals.length || state.slot !== 3) throw Error('T617 native/slot contract failed: ' + label);
    const before = model(), actorBefore = actors(), oldR = R, wasRunning = running, clocks = visual();
    let rngCalls = 0;
    running = false; R = function (...args) { rngCalls++; return oldR.apply(this, args); };
    try {
      for (let i = 0; i < 2; i++) { restoreVisual(clocks); draw(0); }
      if (rngCalls || model() !== before || actors() !== actorBefore) throw Error('T617 render mutated model/actors/RNG: ' + label);
      guards++; return { label, modelExact: true, actorsExact: true, rngCalls, ...status() };
    } finally { R = oldR; running = wasRunning; restoreVisual(clocks); }
  }
  function transitions() {
    const saved = { cam: { ...cam }, day, quality, weather, wxT, visT, frozen: frozenVisT603, rot: viewRotEff(),
      noNight: window.__noNightCity, ownNight: Object.hasOwn(window, '__noNightCity') };
    const rows = [], run = (label, change) => { change(); rows.push(checkpoint(label)); };
    try {
      __s603.freezeVis(100);
      for (const zoom of [.35, .7, 1, 1.25, 3]) run('zoom-' + zoom, () => GV.setZoom(zoom));
      GV.setZoom(1);
      for (let rot = 0; rot < 4; rot++) run('rotation-' + rot, () => GV.setRot(rot));
      run('fractional-pan', () => { cam.x += .375; cam.y += .625; groundDirty = true; });
      for (let s = 0; s < 4; s++) run('season-' + s, () => GV.setSeason(s));
      for (let w = 0; w < 3; w++) run('weather-' + w, () => GV.weather(w));
      for (let q = 0; q < 3; q++) run('quality-' + q, () => { quality = q; });
      run('night-feature-off', () => { window.__noNightCity = true; });
      run('night-feature-on', () => { delete window.__noNightCity; });
      run('source-regeneration', () => __s603.clear());
      run('same-output-width-reset', () => { if (lotNightCanvas574) lotNightCanvas574.width = lotNightCanvas574.width; });
      run('daytime', () => __s603.freezeVis(55));
      run('night-return', () => __s603.freezeVis(100));
      return rows;
    } finally {
      ({ day, quality, weather, wxT } = saved); Object.assign(cam, saved.cam); GV.setRot(saved.rot);
      if (saved.ownNight) window.__noNightCity = saved.noNight; else delete window.__noNightCity;
      visT = saved.visT; __s603.freezeVis(saved.frozen); groundDirty = true;
    }
  }
  window.__native617 = { status, checkpoint, transitions };
}

function build(input = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8')) {
  let source = input;
  const changes = [];
  function replace(from, to, label = from.slice(0, 90)) {
    if (source.split(from).length !== 2) throw Error('T617 exact anchor drift: ' + label);
    source = source.replace(from, to); changes.push({ label, beforeSHA256: sha256(from), afterSHA256: sha256(to) });
  }
  function removeTiming(name, replacement) {
    const { start, end, sha256: expected } = TIMING[name];
    if (source.split(start).length !== 2 || source.split(end).length !== 2) throw Error('T617 timing anchor drift: ' + name);
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (b <= a) throw Error('T617 reversed timing boundary: ' + name);
    const block = source.slice(a, b);
    if (sha256(block) !== expected) throw Error('T617 timing byte drift: ' + name);
    source = source.slice(0, a) + replacement + source.slice(b);
    changes.push({ label: 'separate-' + name + '-timing', removedSHA256: expected, removedBytes: Buffer.byteLength(block) });
  }
  if (input.split(CHROME_LAUNCH).length !== 2) throw Error('T617 canonical Chrome launch drift');
  removeTiming('mobile', "    report.timing617={run:false,reason:'Correctness only; active617 measures actual gameplay separately.'};\n");
  removeTiming('desktop', "    await ev('window.__noT603=false;true');\n");
  replace("    check(report.performanceFailures.length===0,'all unchanged performance gates must pass: '+report.performanceFailures.join('; '));",
    "    check(report.performanceFailures.length===0,'no timing samples executed in T617 correctness');");
  replace("const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;", `const contract617=require('../t604-canvaskit/source-contract.cjs');
report.sourceContract617=contract617.verify(ROOT);
html=contract617.invertIndex(html);
fs.writeFileSync(path.join(DIR,'sw.js'),contract617.invertSW(fs.readFileSync(path.join(DIR,'sw.js'),'utf8')));
report.native617={approvedRuntimeSHA256:hash(html),retentionInstalled:false,observerInstalled:false,qualityTolerance:0,timingRun:false,releaseGatePassed:false};
const nativeSource603=assertNativeSource603(html,check),exactBase603=nativeSource603.base;`);
  replace('  window.__s603={', '  (' + bridge617.toString() + ')();\n  window.__s603={');
  replace("path.join(OUT,'scene603-summary.json')", "path.join(OUT,'native617-summary.json')");
  replace("path.join(os.tmpdir(),'scene603')", "path.join(os.tmpdir(),'native617')");
  replace("path.join(os.tmpdir(),'scene603-')", "path.join(os.tmpdir(),'native617-')");
  // Keep the original key namespace and slot-three preboot selection. Capture
  // untouched slots BEFORE game code, retaining the first document's baseline
  // on the host across every reload/navigation so later writes cannot be hidden.
  const preboot = 'try{localStorage.setItem("glimmerville.v1.slot","3");localStorage.setItem("glimmerville.v1.snd","0");}catch(e){}';
  const guardedPreboot = 'window.__slotBaseline617=Object.freeze(Object.fromEntries(' + JSON.stringify(SLOT_KEYS) + '.map(k=>[k,localStorage.getItem(k)])));' + preboot;
  replace("{source:'" + preboot + "'}", '{source:' + JSON.stringify(guardedPreboot) + '}');
  replace('    const ready=async(previousTimeOrigin=null)=>{', `    let expectedSlots617=null;report.slotIsolation617={checks:0,keys:${JSON.stringify(SLOT_KEYS)}};
    const isolated617=async()=>{
      const s=await ev('({before:window.__slotBaseline617,current:Object.fromEntries('+JSON.stringify(${JSON.stringify(SLOT_KEYS)})+'.map(k=>[k,localStorage.getItem(k)])),slot:localStorage.getItem("glimmerville.v1.slot"),native:window.__native617?__native617.status():null})');
      if(!expectedSlots617){check(s.before&&Object.keys(s.before).length===${SLOT_KEYS.length},'T617 preboot slot baseline exists');expectedSlots617=s.before;}
      check(s.slot==='3'&&JSON.stringify(s.current)===JSON.stringify(expectedSlots617),'T617 slot3 only; slots1/2/backups/legacy bytes unchanged');
      check(s.native&&s.native.native&&s.native.unchangedNightHelper&&!s.native.retiredGlobals.length&&s.native.slot===3,'T617 approved native helper; no retention or observer');
      report.slotIsolation617.checks++;return s.native;
    };
    const bootReady617=async(previousTimeOrigin=null)=>{`);
  replace("'))'))return;}catch{}await sleep(500);}throw Error('New document boot/overlay incomplete');};",
    "'))'))return;}catch{}await sleep(500);}throw Error('New document boot/overlay incomplete');};\n    const ready=async origin=>{await bootReady617(origin);await isolated617();};");
  const city = "    report.cityStats=await growCity('desktop-before');report.census={};";
  replace(city, city + `
    report.transitions617=await ev('__native617.transitions()');
    check(report.transitions617.length===26&&report.transitions617.every(r=>r.modelExact&&r.actorsExact&&r.rngCalls===0&&r.unchangedNightHelper),'26 native model/actor/RNG-preserving transitions');
    await isolated617();await growCity('desktop-after-native-transitions');`);
  for (const phase of ['core', 'world', 'neighbors']) replace(`    report.coverage.${phase}=true;persist();}`,
    `    await isolated617();report.coverage.${phase}=true;persist();}`);
  replace("    report.finalFlags=await ev('__s603.flags()');", `    report.native617.final=await isolated617();report.native617.fullCorrectness=PHASE==='full'&&Object.values(report.coverage).every(Boolean);
    report.finalFlags=await ev('__s603.flags()');`);
  // No assertion/pixel threshold replacements are permitted. The complete
  // canonical launch remains byte-identical, including --disable-gpu.
  if (source.split(CHROME_LAUNCH).length !== 2) throw Error('T617 changed canonical Chrome launch');
  if (/await raf\(|await traceFrameWork603\(|__s603\.perfStart\(\)/.test(source)) throw Error('T617 timing invocation survived');
  new Function('require', '__filename', '__dirname', source);
  return { source, sha256: sha256(source), canonicalHarnessSHA256: sha256(input), changes };
}

function selfTest() {
  const assert = require('node:assert/strict'), vm = require('node:vm');
  const original = fs.readFileSync(path.join(SCENES, 'scene603.js'), 'utf8'), built = build(original);
  for (const span of Object.values(TIMING)) assert.throws(() => build(original.replace(span.start, span.start + '\n    check(false,"new correctness assertion");')), /timing byte drift/);
  assert.throws(() => build(original.replace('--disable-gpu', '--different-graphics')), /Chrome launch drift/);
  assert.throws(() => build(original.replace('  window.__s603={', '  window.__s603 = {')), /anchor drift/);
  for (const assertion of ["check(Object.keys(baseline).length===1586,'immutable baseline has 1586 keys');",
    "check(nativeCases603.length===308,'all original 256 world + 32 fractional + 16 mobile + 4 aligned scenes retained');",
    "check(report.occlusion.length===128,'all 128 adjacent-occlusion evidence scenes');",
    "check(report.dogActors.length===288,'all 288 dog-park row/variant/rotation/animation scenes');",
    "check(changedPixels===0,'candidate art-off equals actual immutable main full RGBA '+c.key);"])
    assert.equal(built.source.split(assertion).length, 2, assertion);
  assert.equal(built.source.split(CHROME_LAUNCH).length, 2);
  assert.doesNotMatch(built.source, /TownRetained\d+\.create|TownSourceRevision\d+\.install|source-revision612\.cjs|retained61[2-6]\.cjs/);
  assert.doesNotMatch(bridge617.toString(), /lotNightLayer574\s*=(?!=)/);
  const box = { window: null, location: { pathname: '/index.html' }, performance: { timeOrigin: 1 },
    curSlot: () => 3, day: 421, money: 100, pop: 200, tiles: [], running: true,
    quality: 1, weather: 0, wxT: 10, visT: 100, frozenVisT603: null, trafClock: 0, waterT: 0, waterF: 0,
    rainbowT: 0, flashT: 0, shakeT: 0, meteorTrail: null, windX441: 0,
    cam: { x: 1, y: 2, z: 1 }, R: () => .25, lotNightCanvas574: { width: 10 },
    groundDirty: false, lotNightLayer574: () => {}, viewRotEff: () => 0 };
  for (const name of ['cars', 'citizens', 'smokes', 'trains', 'cargoShips', 'tramCars', 'ambulances', 'recycleTrucks',
    'ladderTrucks', 'policeCars', 'schoolBuses', 'buses', 'rbuses', 'lifeShips', 'rain', 'confetti', 'fxParts']) box[name] = [];
  box.window = box; box.draw = () => box.lotNightLayer574();
  box.GV = { setZoom: z => { box.cam.z = z; }, setRot() {}, setSeason: s => { box.day = s * 100 + 1; }, weather: w => { box.weather = w; } };
  box.__s603 = { freezeVis: t => { box.frozenVisT603 = t; if (t !== null) box.visT = t; }, clear() {} };
  const night = box.lotNightLayer574, rng = box.R;
  vm.createContext(box); vm.runInContext('(' + bridge617.toString() + ')();', box);
  assert.equal(box.__native617.transitions().length, 26);
  assert.equal(box.lotNightLayer574, night); assert.equal(box.day, 421); assert.equal(box.quality, 1);
  assert.equal(box.frozenVisT603, null); assert.equal(box.visT, 100);
  assert.equal(box.__native617.checkpoint('clean').rngCalls, 0);
  box.draw = () => box.R(); assert.throws(() => box.__native617.checkpoint('rng'), /mutated model/);
  assert.equal(box.R, rng); assert.equal(box.running, true);
  box.draw = () => { box.money++; }; assert.throws(() => box.__native617.checkpoint('model'), /mutated model/);
  box.draw = () => { throw Error('native draw error'); }; assert.throws(() => box.__native617.checkpoint('throw'), /native draw error/);
  assert.equal(box.R, rng); assert.equal(box.running, true);
  box.draw = () => {}; box.TownRetained614 = {};
  assert.throws(() => box.__native617.checkpoint('retired'), /native\/slot contract/); delete box.TownRetained614;
  box.curSlot = () => 1; assert.throws(() => box.__native617.checkpoint('slot1'), /native\/slot contract/);
  // Execute the emitted host guard with a preserved first-document baseline.
  const a = built.source.indexOf('    let expectedSlots617='), b = built.source.indexOf('    const bootReady617=', a);
  const makeGuard = new Function('ev', 'check', 'report', built.source.slice(a, b) + '\nreturn isolated617;');
  const snapshot = Object.fromEntries(SLOT_KEYS.map(key => [key, null]));
  let state = { before: snapshot, current: { ...snapshot }, slot: '3', native: { native: true, unchangedNightHelper: true, retiredGlobals: [], slot: 3 } };
  const guard = makeGuard(async () => state, (ok, message) => assert(ok, message), {});
  return (async () => {
    await guard(); state.current[SLOT_KEYS[0]] = 'unexpected-save'; state.before = { ...state.current };
    await assert.rejects(guard(), /slots1\/2/);
    state.current = { ...snapshot }; state.slot = '1'; await assert.rejects(guard(), /slot3/);
    console.log('T617_NATIVE_CONTRACTS_OK');
  })();
}

async function main() {
  const built = build();
  if (process.argv.includes('--check-overlay')) { console.log('T617_NATIVE_OVERLAY_OK ' + built.sha256); return; }
  if (process.argv.includes('--self-test')) { await selfTest(); return; }
  const outArg = process.argv.find(arg => arg.startsWith('--out='));
  const out = path.resolve(outArg ? outArg.slice(6) : path.join(os.tmpdir(), 'native617'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'native617-overlay.json'), JSON.stringify({ sha256: built.sha256,
    canonicalHarnessSHA256: built.canonicalHarnessSHA256, changes: built.changes }, null, 2));
  if (process.argv.includes('--with-support') || process.argv.includes('--support-only')) {
    const result = require('./run616-regression.cjs').support(path.join(out, 'support'));
    fs.writeFileSync(path.join(out, 'native617-support-summary.json'), JSON.stringify(result, null, 2));
  }
  if (process.argv.includes('--support-only')) return;
  if (process.platform !== 'linux') throw Error('T617 canonical correctness requires the original Ubuntu/Linux headless environment');
  new Function('require', '__filename', '__dirname', built.source)(createRequire(path.join(SCENES, 'scene603.js')), path.join(SCENES, 'scene603.js'), SCENES);
}
module.exports = { build, bridge617, selfTest, SLOT_KEYS, TIMING, CHROME_LAUNCH };
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
