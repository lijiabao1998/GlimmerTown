'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const M = require('./active617-metrics.cjs'), { build } = require('./active617-build.cjs');
const root = path.resolve(__dirname, '../../..');
const bridge = fs.readFileSync(path.join(__dirname, 'active617-bridge.js'), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
function state(seconds) {
  const days = seconds / .9, whole = Math.floor(days + 1e-9);
  return { day: 421 + whole, simAcc: seconds - whole * .9, visT: 41.8 + seconds,
    season: (421 + whole - 1) % 360 >= 200 ? 2 : (421 + whole - 1) % 360 >= 100 ? 1 : 0,
    weather: Math.floor(seconds / 7) % 3, pop: 2397, occupied: 2557, vehicles: 70, particles: 100, citizens: 30,
    fixed: { width: 1400, height: 900, dpr: 1, cam: { x: 20, y: 30, z: 1 }, rot: 0, quality: 1,
      size: 72, seed: 22, diff: 3, ai: false, sound: '0', slot: 3, toggles: {} },
    unwrapped: true, native: true, running: true, speed: 1, visible: 'visible', focused: true,
    cycle: 110, dayLength: .9 };
}
function observation(dt = 100) {
  const o = { complete: true, valid: true, violations: [], requestedMs: 110000, warmMs: 30000,
    warm: Array.from({ length: 300 }, () => ({ dt: 100 })), warmElapsed: 30000, start: state(0), before: state(30), samples: [] };
  let elapsed = 0;
  while (elapsed < 110000 - .00001) {
    const step = typeof dt === 'function' ? dt(o.samples.length) : dt;
    const prior = elapsed; elapsed += step;
    o.samples.push({ ...state(30 + elapsed / 1000), dt: step, end: elapsed,
      now: 30002 + elapsed, previousLastDraw: 30001 + prior, gameTimestamp: 30000 + elapsed });
  }
  o.elapsed = elapsed; o.after = state(30 + elapsed / 1000); return o;
}
const child = (arm, observation) => ({ arm, observation, endpoint: { passed: true }, sourceVerified: true, foregroundValid: true, initialFixtureVerified: true });
function comparison(candidate = observation(98)) {
  return [child('main-t602', observation()), child('native-t603', candidate), child('main-t602', observation())];
}
test('active natural weather/seasons qualify without pretending the model is frozen', () => {
  const o = observation(); assert.equal(M.valid(o), true);
  assert(o.after.day - o.before.day >= 122); assert(new Set(o.samples.map(s => s.weather)).size === 3);
  assert(new Set(o.samples.map(s => s.season)).size > 1);
  assert.equal(M.summarize(o).distributions.all.fps, 10);
  assert.equal(M.screen(...comparison()).nonRegression, true);
  assert.equal(M.screen(...comparison()).absolute55, false);
});
test('denominator, phase coverage, frozen simulation, pause and foreground fail closed', () => {
  for (const change of [o => o.elapsed += 10, o => o.after.day--, o => o.after.visT--,
    o => o.before.speed = 0, o => o.after.focused = false, o => o.after.native = false,
    o => o.samples[0].dt = 0, o => o.samples[10].day--, o => o.before.fixed.quality = 0,
    o => o.samples[10].end += 1, o => o.samples[0].weather = 3,
    o => o.samples[10].previousLastDraw = o.samples[10].now - 400]) {
    const o = observation(); change(o); assert.equal(M.valid(o), false);
  }
});
test('same seed cannot excuse mismatched weather, phase, actors or city load', () => {
  for (const change of [o => o.samples.forEach(s => s.weather = 0), o => o.samples.forEach(s => s.pop *= 1.1),
    o => o.samples.forEach(s => s.vehicles *= 1.3), o => o.samples.forEach(s => s.occupied *= 1.1)]) {
    const a = observation(), b = observation(); change(b);
    assert.equal(M.valid(b), true); assert.equal(M.workload(a, b).matched, false);
    assert.equal(M.screen(...comparison(b)).accepted, false);
  }
  const shifted = observation(); for (const s of [shifted.start, shifted.before, shifted.after, ...shifted.samples]) s.visT += 2;
  assert.equal(M.workload(observation(), shifted).matched, false);
});
test('comparable slowdown is a regression; baseline drift is inconclusive', () => {
  const r = M.screen(...comparison(observation(110)));
  assert.equal(r.accepted, true); assert.equal(r.nonRegression, false);
  const arms = comparison(); arms[2].observation = observation(120);
  assert.equal(M.screen(...arms).accepted, false);
});
test('tail regression cannot hide behind an unchanged median or pooled FPS', () => {
  const candidate = observation(i => i % 50 === 0 ? 140 : 100);
  const result = M.screen(...comparison(candidate));
  assert.equal(result.accepted, true); assert.equal(result.comparisons.all[0].p95, 1);
  assert.equal(result.nonRegression, false);
});
test('55 FPS requires all retained buckets and phase groups, independently of nonregression', () => {
  const fast = observation(1000 / 60), arms = [child('main-t602', fast), child('native-t603', copy(fast)), child('main-t602', copy(fast))];
  assert.equal(M.screen(...arms).absolute55, true);
  const variable = observation(i => i < 450 ? 20 : 1000 / 60);
  const same = [child('main-t602', variable), child('native-t603', copy(variable)), child('main-t602', copy(variable))];
  const result = M.screen(...same);
  assert(result.summaries[1].distributions.all.fps > 55); assert.equal(result.nonRegression, true); assert.equal(result.absolute55, false);
});
test('a single valid child or failed source/endpoint cannot pass net screen', () => {
  for (const field of ['sourceVerified', 'foregroundValid', 'initialFixtureVerified']) {
    const arms = comparison(); arms[1][field] = false; assert.equal(M.screen(...arms).accepted, false);
  }
  const arms = comparison(); arms[1].endpoint.passed = false; assert.equal(M.screen(...arms).accepted, false);
  arms[1].endpoint.passed = true; arms[1].arm = 'main-t602'; assert.equal(M.screen(...arms).accepted, false);
});
function sandbox() {
  let now = 0, id = 0; const callbacks = new Map(), timers = new Map();
  const g = { window: {}, frame() {}, advance() {}, tick() {}, draw() {}, updHud() {}, lotObjectOrder574() {}, lotNightLayer574() {},
    running: true, speed: 0, quality: 1, W: 1400, H: 900, DPR: 1, cam: { x: 20, y: 30, z: 1 }, N: 72, seed: 22, diff: 3,
    aiMode: false, day: 421, simAcc: 0, visT: 41.8, pop: 2397, money: 3418, weather: 0, wxT: 5, CYCLE: 110, DAYLEN: .9,
    lastT: 0, lastDraw: 0, GAME_VER: '11.212', SAVEKEY: 'test', viewRotEff: () => 0, curSlot: () => 3,
    season: () => state((g.day - 421) * .9).season, t603On: () => true, tickBld: Array(2557), roadLoad: [0], roadPass: [0],
    tiles: [{ bld: { k: 1, lv: 1, v: 0, age: 4 } }], R: () => .5,
    document: { visibilityState: 'visible', hasFocus: () => true }, performance: { now: () => now, timeOrigin: 100 },
    location: { pathname: '/index.html' }, localStorage: { getItem: () => '0' },
    Math: Object.create(Math), setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: i => timers.delete(i),
    requestAnimationFrame: fn => { callbacks.set(++id, fn); return id; }, cancelAnimationFrame: i => callbacks.delete(i) };
  for (const name of ['cars', 'trains', 'cargoShips', 'tramCars', 'ambulances', 'recycleTrucks', 'ladderTrucks', 'policeCars', 'schoolBuses', 'buses', 'rbuses', 'lifeShips', 'smokes', 'rain', 'confetti', 'fxParts', 'citizens']) g[name] = [];
  g.Math.random = Math.random; g.GV = { setSpeed: value => { g.speed = value; } };
  vm.runInNewContext(bridge, g);
  const pump = (t, game = true) => {
    now = t + 2;
    if (game) {
      const dt = Math.max(0, Math.min(2, (t - g.lastT) / 1000)); g.lastT = t; g.lastDraw = t + 1; g.visT += dt;
      g.simAcc += dt * g.speed; while (g.simAcc >= .9) { g.simAcc -= .9; g.day++; }
    }
    const pending = [...callbacks.values()]; callbacks.clear(); for (const cb of pending) cb(t);
  };
  return { g, api: g.window.__active617, pump, timers };
}
test('sampler preserves original entries, starts speed1 at anchor, and completes one active cycle', async () => {
  const s = sandbox(), original = s.g.frame, promise = s.api.observe();
  s.pump(100); assert.equal(s.g.speed, 1); assert.equal(s.g.day, 421);
  for (let t = 200; t <= 140100; t += 100) s.pump(t);
  const result = await promise;
  assert.equal(result.complete, true); assert.equal(result.warm.length, 300); assert.equal(result.samples.length, 1100);
  assert.equal(M.valid(result), true); assert.equal(s.g.frame, original); assert.equal(s.g.speed, 1);
  assert.equal(s.timers.size, 0); await assert.rejects(s.api.observe(), /one untouched/);
});
test('missed game frame and fallback risk are retained rather than discarded', async () => {
  const s = sandbox(), promise = s.api.observe(); s.pump(100); s.pump(200, false); s.pump(700);
  s.api.abort('test stopping condition'); const result = await promise;
  assert.equal(result.complete, false); assert.equal(result.valid, false); assert.equal(result.warm.length, 2);
  assert(result.violations.includes('original game rAF timestamp mismatch'));
  assert(result.violations.includes('400ms fallback-timer risk'));
  assert.equal(result.warm[1].dt, 500); assert.equal(M.valid(result), false);
});
test('sampler rejects random-generator replacement and enforces absolute deadline without retry', async () => {
  const s = sandbox(), promise = s.api.observe(); s.pump(100); s.g.R = () => .7; s.pump(200);
  [...s.timers.values()][0](); const result = await promise;
  assert(result.violations.includes('source/function/RNG identity changed'));
  assert(result.violations.includes('absolute 155-second sampler deadline')); assert.equal(result.complete, false);
});
test('endpoint rejects model or RNG changes caused by rendering and restores RNG on throws', async () => {
  for (const kind of ['model', 'rng', 'throw']) {
    const s = sandbox();
    const draw = () => { if (kind === 'model') s.g.money++; else if (kind === 'rng') s.g.R(); else throw Error('draw failure'); };
    // Install before bridge creation so entry identity remains legitimate.
    s.g.draw = draw; vm.runInNewContext(bridge.replaceAll('617', '618'), s.g);
    const api = s.g.window.__active618, p = api.observe(); s.pump(100);
    for (let t = 200; t <= 140100; t += 100) s.pump(t);
    await p; const R = s.g.R;
    assert.throws(() => api.endpoint(), kind === 'throw' ? /draw failure/ : /render mutated/);
    assert.equal(s.g.R, R);
  }
});
test('generated harness and both real injected native game scripts compile with pinned sources', () => {
  const built = build();
  new Function('require', '__filename', '__dirname', 'metadata617', built.source);
  const contract = require('./source-contract.cjs'), native = contract.invertIndex(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const checked = require('../t603-shots/native603.js').assertNativeSource603(native);
  assert.equal(checked.baseSHA256, 'b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265');
  for (const html of [native, checked.base]) {
    const injected = html.replace('window.GV={', '(' + built.bridge + ')();window.GV={');
    const scripts = [...injected.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert(scripts.length >= 1); for (const [, script] of scripts) new Function(script);
    assert(!/renderer604|source-revision612|retained614\.cjs/.test(injected));
    const compiler = require('./active617-build.cjs').compileDocument617;
    assert(built.source.includes('(' + compiler.toString() + ")(fs.readFileSync(path.join(DIR,'index.html'),'utf8'));"));
    // Execute the exact emitted compiler against the actual served document.
    new Function('fs', 'path', 'DIR', '(' + compiler.toString() + ")(fs.readFileSync(path.join(DIR,'index.html'),'utf8'));")(
      { readFileSync: () => injected }, path, '/isolated');
  }
  assert.match(built.source, /slot3 set before game boot/);
  assert.match(built.source, /Player ports 8123\/8199 prohibited/);
  assert.doesNotMatch(built.bridge, /\b(?:frame|advance|tick|draw|visT|trafClock|waterT|waterF)\s*=(?!=)/);
  const experiment = fs.readFileSync(path.join(__dirname, 'active617-experiment.js'), 'utf8');
  assert.doesNotMatch(experiment, /GV\.(?:setSeason|weather|setVisT|setDay)|freezeVis|Tracing\.start/);
  assert.match(built.source, /contract617\.invertSW/); assert.doesNotMatch(built.source, /fetch-canvaskit|assetHTTP604/);
});
test('actual emitted compiler accepts literal opening tags in comments and rejects malformed scripts', () => {
  const { compileDocument617 } = require('./active617-build.cjs');
  const html = '<html><script>/* native factory description includes <script> */ const sample=1;</script></html>';
  assert.throws(() => new Function(html.split('<script>')[1].split('</script>')[0]), SyntaxError);
  assert.equal(compileDocument617(html), true);
  assert.throws(() => compileDocument617('<script>const x = ;</script>'), SyntaxError);
  assert.throws(() => compileDocument617('<script>const x=1;'), /one complete/);
  assert.throws(() => compileDocument617('<script>1</script><script>2</script>'), /one complete/);
});
