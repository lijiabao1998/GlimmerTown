'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create, CAPS } = require('./retained615.cjs');

// This deterministic raster is a contract oracle, not a native Canvas2D pixel
// certificate. It composites original full draws and candidate clipped draws
// independently and makes clip, path, state, resets and operation order visible.
let nextId = 1;
class FakePath { constructor() { this.rectangles = []; } rect(...r) { this.rectangles.push(r); } }
class FakeCanvas {
  constructor(w = 384, h = 128) { this.id = nextId++; this.revision = 0; this.supported = true; this._width = w; this._height = h; this.context = new FakeContext(this); this.reset(); }
  get width() { return this._width; }
  set width(v) { this._width = v; this.reset(); }
  get height() { return this._height; }
  set height(v) { this._height = v; this.reset(); }
  reset() { this.pixels = new Float64Array(this.width * this.height * 4); this.revision++; this.context.reset(); }
}
function color(value) {
  if (/^#[\da-f]{3}$/i.test(value)) value = '#' + [...value.slice(1)].map(x => x + x).join('');
  if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255).concat(1);
  return [0, 0, 0, 1];
}
class FakeContext {
  constructor(canvas) { this.canvas = canvas; this.log = []; this.stack = []; this.fail = null; this.reset(); }
  reset() {
    this.imageSmoothingEnabled = true; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; this.fillStyle = '#000000';
    this.shadowColor = 'rgba(0, 0, 0, 0)'; this.shadowBlur = this.shadowOffsetX = this.shadowOffsetY = 0; this.filter = 'none';
    this.transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; this.lineWidth = 7; this.path = ['a caller-owned current path']; this.clipped = null; this.stack.length = 0;
  }
  getTransform() { return { ...this.transform }; }
  getContextAttributes() { return { alpha: true }; }
  isContextLost() { return !!this.lost; }
  state() { return { imageSmoothingEnabled: this.imageSmoothingEnabled, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation, fillStyle: this.fillStyle, shadowColor: this.shadowColor, shadowBlur: this.shadowBlur, shadowOffsetX: this.shadowOffsetX, shadowOffsetY: this.shadowOffsetY, filter: this.filter, lineWidth: this.lineWidth }; }
  save() { this.log.push(['save']); this.stack.push({ ...this.state(), clipped: this.clipped }); }
  restore() { this.log.push(['restore']); if (!this.stack.length) throw Error('Unbalanced restore'); Object.assign(this, this.stack.pop()); }
  clip(path) { assert.ok(path instanceof FakePath); this.log.push(['clip', path.rectangles.map(r => [...r])]); this.clipped = path.rectangles; }
  clearRect(...r) { this.log.push(['clear', ...r]); this.raster(r, null); }
  fillRect(...r) { this.log.push(['fill', this.fillStyle, this.globalCompositeOperation, ...r]); this.maybeFail(); this.raster(r, color(this.fillStyle)); }
  drawImage(image, ...r) { this.log.push(['image', image.id, this.globalCompositeOperation, ...r]); this.maybeFail(); this.raster(r, image.rgba || [0.8, 0.4, 0.2, 0.5]); }
  maybeFail() { if (this.fail && this.clipped) { const e = this.fail; this.fail = null; throw e; } }
  raster([x, y, w, h], rgba) {
    this.canvas.revision++;
    if (!w || !h || ![x, y, w, h].every(Number.isFinite)) return;
    const x0 = Math.max(0, Math.ceil(Math.min(x, x + w) - 0.5)), x1 = Math.min(this.canvas.width, Math.ceil(Math.max(x, x + w) - 0.5));
    const y0 = Math.max(0, Math.ceil(Math.min(y, y + h) - 0.5)), y1 = Math.min(this.canvas.height, Math.ceil(Math.max(y, y + h) - 0.5));
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      if (this.clipped && !this.clipped.some(([cx, cy, cw, ch]) => px >= cx && px < cx + cw && py >= cy && py < cy + ch)) continue;
      const i = (py * this.canvas.width + px) * 4, data = this.canvas.pixels;
      if (!rgba) { data.fill(0, i, i + 4); continue; }
      const sa = rgba[3] * this.globalAlpha, da = data[i + 3];
      if (this.globalCompositeOperation === 'destination-out') { data[i + 3] = da * (1 - sa); if (!data[i + 3]) data.fill(0, i, i + 3); continue; }
      const oa = sa + da - sa * da;
      for (let ch = 0; ch < 3; ch++) {
        const cs = rgba[ch], cd = data[i + ch];
        const blend = this.globalCompositeOperation === 'screen' ? cs + cd - cs * cd : cs;
        data[i + ch] = oa ? (cs * sa * (1 - da) + cd * da * (1 - sa) + blend * sa * da) / oa : 0;
      }
      data[i + 3] = oa;
    }
  }
}
function originalFor(canvas, count) {
  return function original(lights, a, w, h) {
    count.calls++;
    if (!lights.some(n => n.occlude574)) return null;
    const c = canvas, g = c.context;
    if (c.width !== w) c.width = w; if (c.height !== h) c.height = h;
    g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    for (const n of lights) {
      if (n.occlude574) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = n.a; g.drawImage(n.occlude574, n.x, n.y, n.w, n.h); }
      else { g.globalCompositeOperation = 'screen'; g.globalAlpha = a * (n.img && n.a != null ? n.a : 1);
        if (n.img) g.drawImage(n.img, n.x, n.y, n.w, n.h); else if (n.rect) { g.fillStyle = n.col || '#ffe9a0'; g.fillRect(...n.rect); }
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; return c;
  };
}
function source(rgba = [0.8, 0.3, 0.5, 0.6]) { const c = new FakeCanvas(8, 8); c.rgba = rgba; return c; }
function fixture(w = 384, h = 128, options = {}) {
  const actual = new FakeCanvas(w, h), expected = new FakeCanvas(w, h), calls = { calls: 0 };
  const settings = { privateClip: true, versionHook: null, surface: actual };
  const original = originalFor(actual, calls), baseline = originalFor(expected, { calls: 0 });
  const cache = create({ original: options.original || original, getSurface: () => ({ canvas: settings.surface, context: settings.surface.context, privateClip: settings.privateClip }), sourceVersion: image => {
    if (settings.versionHook) settings.versionHook(image);
    return { id: image.id, revision: image.revision, width: image.width, height: image.height, supported: image.supported };
  }, Path2D: FakePath });
  function compare(lights, a = 0.5, width = w, height = h) {
    const before = lights.map(n => n.rect ? { ...n, rect: [...n.rect] } : { ...n });
    const want = baseline(lights, a, width, height), got = cache.layer(lights, a, width, height);
    assert.equal(got, want ? actual : null, 'same existing canvas identity/null behavior');
    assert.deepEqual(actual.pixels, expected.pixels, 'full raster equality against independent original surface');
    assert.deepEqual(actual.context.state(), expected.context.state(), 'observable drawing state equality');
    assert.deepEqual(lights, before, 'inputs are unchanged');
    assert.equal(actual.context.stack.length, 0, 'temporary save is balanced');
    return cache.stats().last;
  }
  return { actual, expected, settings, calls, cache, compare };
}
function scene() {
  const img = source(), mask = source([0, 0, 0, 0.7]);
  return [
    { img, x: 12, y: 9, w: 40, h: 35, a: 0.8 },
    { occlude574: mask, x: 25, y: 20, w: 12, h: 14, a: 0.6 },
    { rect: [150, 15, 25, 30], col: '#ff3300' },
    { img, x: 290, y: 12, w: 30, h: 40, a: 0.6 },
    { rect: [310, 30, 12, 12], col: '#00cc44' }
  ];
}

test('first full draw then exact hit; state/path and canvas identity survive', () => {
  const f = fixture(), lights = scene(), path = f.actual.context.path;
  assert.equal(f.compare(lights).mode, 'original');
  const logLength = f.actual.context.log.length;
  const s = f.compare(lights);
  assert.equal(s.mode, 'hit'); assert.equal(s.executedPaints, 0); assert.equal(s.skippedVisiblePaints, 5); assert.equal(s.cleanPixels, 384 * 128);
  assert.equal(f.actual.context.log.length, logLength, 'hit does not clear, save, clip or paint');
  assert.equal(f.actual.context.path, path, 'save/restore cannot fake current-path preservation');
  assert.equal(f.calls.calls, 1);
});

test('one dirty tile replays its ordered overlapping paints exactly once', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  lights[0].a = 0.5;
  const start = f.actual.context.log.length, s = f.compare(lights), log = f.actual.context.log.slice(start);
  assert.equal(s.mode, 'partial'); assert.equal(s.dirtyTiles, 1); assert.equal(s.executedPaints, 2); assert.equal(s.cleanPixels, 256 * 128);
  assert.deepEqual(log.filter(x => x[0] === 'image').map(x => x[2]), ['screen', 'destination-out']);
  assert.deepEqual(log.find(x => x[0] === 'clip')[1], [[0, 0, 128, 128]]);
  assert.equal(f.actual.context.fillStyle, '#00cc44', 'last skipped rectangle still supplies final fillStyle');
});

test('relative per-tile order invalidates, insertion outside a tile does not', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  [lights[0], lights[1]] = [lights[1], lights[0]];
  assert.equal(f.compare(lights).dirtyTiles, 1);
  lights.unshift({ rect: [170, 22, 4, 8], col: '#22ffff' });
  const s = f.compare(lights); assert.equal(s.dirtyTiles, 1); assert.equal(s.executedPaints, 2);
  lights.splice(2, 1);
  assert.equal(f.compare(lights).dirtyTiles, 1, 'removal dirties the old occupied area');
});

test('movement, negative coordinates and negative dimensions erase old coverage', () => {
  const f = fixture(), lights = scene();
  lights[0].x = -10.25; lights[0].w = 150.5; f.compare(lights);
  lights[0].x = 130.25; lights[0].w = -60.5;
  let s = f.compare(lights); assert.equal(s.dirtyTiles, 2); assert.equal(s.mode, 'partial');
  lights[0].x = 250.5; lights[0].w = -30.25;
  s = f.compare(lights); assert.equal(s.dirtyTiles, 2);
});

test('fractional tile edges receive the conservative two-pixel footprint', () => {
  const f = fixture(), lights = scene(); lights[0].x = 124.25; lights[0].w = 1; f.compare(lights);
  lights[0].x = 126.25;
  const s = f.compare(lights); assert.equal(s.dirtyTiles, 2);
  lights[0].x = 129.25;
  assert.equal(f.compare(lights).dirtyTiles, 2);
});

test('disjoint dirty tiles use separate one-rectangle clips and duplicate spanning paints are charged', () => {
  const f = fixture(512), lights = scene();
  lights.push({ img: source(), x: 2, y: 65, w: 508, h: 10 });
  lights.push({ rect: [430, 85, 10, 10], col: '#ff00ff' }); f.compare(lights);
  lights[0].a = 0.2; lights[3].a = 0.3;
  const start = f.actual.context.log.length, s = f.compare(lights), log = f.actual.context.log.slice(start);
  assert.equal(s.dirtyTiles, 2); assert.equal(log.filter(x => x[0] === 'clip').length, 2);
  assert.equal(s.duplicatePaints, 1); assert.equal(s.executedPaints, 6);
  assert.equal(log.filter(x => x[0] === 'image' && x[1] === lights.at(-2).img.id).length, 2);
});

test('all dirty goes through the original without any temporary clip', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  const start = f.actual.context.log.length, s = f.compare(lights, 0.7);
  assert.equal(s.reason, 'all-dirty'); assert.equal(f.calls.calls, 2);
  assert.equal(f.actual.context.log.slice(start).some(x => x[0] === 'clip'), false);
});

test('source revision, dimension reset, source replacement and output same-size reset invalidate', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  lights[0].img.rgba = [0.1, 0.9, 0.2, 0.4]; lights[0].img.revision++;
  assert.equal(f.compare(lights).dirtyTiles, 2, 'same source used in nonadjacent tiles');
  lights[0].img.width = lights[0].img.width;
  assert.equal(f.compare(lights).dirtyTiles, 2, 'same-size source reset increments version');
  lights[0].img = source(); assert.equal(f.compare(lights).dirtyTiles, 1);
  f.actual.width = f.actual.width; f.expected.width = f.expected.width;
  assert.equal(f.compare(lights).reason, 'invalidated');
  assert.equal(f.compare(lights).mode, 'hit');
});

test('external output writes and explicit invalidation force full regeneration', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  f.actual.context.fillRect(340, 2, 20, 20);
  assert.equal(f.compare(lights).reason, 'invalidated');
  f.cache.invalidate(); assert.equal(f.compare(lights).mode, 'original');
});

test('viewport dimensions and cropped edge tile area are exact', () => {
  const f = fixture(300, 140), lights = scene(); f.compare(lights);
  let s = f.compare(lights); assert.equal(s.cleanPixels, 42000); assert.equal(s.tiles, 6);
  s = f.compare(lights, 0.5, 280, 135); assert.equal(s.mode, 'original');
  assert.equal(f.compare(lights, 0.5, 280, 135).mode, 'hit');
});

test('numeric tokens distinguish negative zero and subpixel changes without rounding', () => {
  const f = fixture(), lights = scene(); lights[0].x = 0; f.compare(lights);
  lights[0].x = -0; assert.equal(f.compare(lights).dirtyTiles, 1);
  lights[0].x = Number.MIN_VALUE; assert.equal(f.compare(lights).dirtyTiles, 1);
});

test('day and no-occluder branches never hit and preserve original null behavior', () => {
  const f = fixture(), lights = scene(); f.compare(lights);
  assert.equal(f.compare(lights, 0).reason, 'day');
  assert.equal(f.compare(lights, 0).mode, 'original');
  const noMask = lights.filter(x => !x.occlude574);
  assert.equal(f.compare(noMask).reason, 'no-occluder');
  assert.equal(f.compare(lights).mode, 'original');
});

test('offscreen calls cannot inflate skipped visible-paint statistics', () => {
  const f = fixture(), lights = scene(); lights.push({ rect: [-200, -200, 4, 4] }); f.compare(lights);
  const s = f.compare(lights); assert.equal(s.totalPaints, 6); assert.equal(s.visiblePaints, 5); assert.equal(s.skippedVisiblePaints, 5);
  assert.equal(s.occupiedTilePixels, 384 * 128);
});

test('empty sky remains distinct from occupied tile area', () => {
  const f = fixture(512), lights = scene(); f.compare(lights); const s = f.compare(lights);
  assert.equal(s.cleanPixels, 512 * 128); assert.equal(s.cleanOccupiedTilePixels, 384 * 128);
});

test('unknown sources, source-version getters, self-source and identity collisions fall back', () => {
  for (const mutate of [
    (f, xs) => { xs[0].img.supported = false; },
    (f, xs) => { xs[0].img = f.actual; },
    (f, xs) => { xs[1].occlude574.id = xs[0].img.id; }
  ]) {
    const f = fixture(), xs = scene(); f.compare(xs); mutate(f, xs); f.cache.layer(xs, 0.5, 384, 128);
    assert.equal(f.cache.stats().last.mode, 'original'); assert.equal(f.cache.stats().retainedBytes, 0);
  }
  let getterCalls = 0, originalCalls = 0;
  const c = new FakeCanvas();
  const cache = create({ original: () => { originalCalls++; }, getSurface: () => ({ canvas: c, context: c.context, privateClip: true }), sourceVersion: () => ({ get supported() { getterCalls++; return true; } }), Path2D: FakePath });
  cache.layer(scene(), 0.5, 384, 128); assert.equal(getterCalls, 0); assert.equal(originalCalls, 1);
});

test('input getters are not consumed during preflight; original alone observes them', () => {
  const f = fixture(), lights = scene(); let reads = 0;
  const originalX = lights[0].x;
  Object.defineProperty(lights[0], 'x', { get() { reads++; return originalX; }, enumerable: true });
  f.cache.layer(lights, 0.5, 384, 128);
  assert.equal(reads, 1); assert.equal(f.cache.stats().last.reason, 'getter');
  assert.equal(f.cache.stats().retainedBytes, 0);
});

test('invalid setters and nonfinite geometry delegate exactly once to original', () => {
  for (const mutate of [xs => { xs[0].a = 3; }, xs => { xs[2].col = 'not a valid color'; }, xs => { xs[0].x = NaN; }, xs => { xs[0].w = Infinity; }]) {
    const f = fixture(), xs = scene(); mutate(xs); f.cache.layer(xs, 0.5, 384, 128);
    assert.equal(f.calls.calls, 1); assert.equal(f.cache.stats().retainedBytes, 0);
  }
});

test('context ownership, transform, filter, shadow, alpha:false and context loss bypass', () => {
  for (const mutate of [
    f => { f.settings.privateClip = false; },
    f => { f.actual.context.transform.e = 1; },
    f => { f.actual.context.filter = 'blur(2px)'; },
    f => { f.actual.context.shadowColor = '#ff0000'; },
    f => { f.actual.context.getContextAttributes = () => ({ alpha: false }); },
    f => { f.actual.context.lost = true; }
  ]) {
    const f = fixture(), xs = scene(); f.compare(xs); mutate(f); f.cache.layer(xs, 0.5, 384, 128);
    assert.equal(f.calls.calls, 2); assert.equal(f.cache.stats().retainedBytes, 0);
  }
});

test('candidate exception removes clip before one original repair and discards metadata', () => {
  const f = fixture(), lights = scene(); f.compare(lights); lights[0].a = 0.2;
  f.actual.context.fail = Error('intentional clipped draw failure');
  const start = f.actual.context.log.length, s = f.compare(lights), log = f.actual.context.log.slice(start);
  assert.equal(s.reason, 'candidate-exception'); assert.equal(f.calls.calls, 2); assert.equal(s.candidatePaints, 1); assert.equal(s.executedPaints, 6);
  assert.ok(log.findIndex(x => x[0] === 'restore') < log.findLastIndex(x => x[0] === 'clear'));
  assert.equal(f.actual.context.clipped, null); assert.equal(f.cache.stats().retainedBytes, 0);
  assert.equal(f.compare(lights).mode, 'original');
});

test('original exceptions propagate unchanged, are not retried, and release busy state', () => {
  const error = Error('original sentinel'); let calls = 0, throwNow = true;
  const f = fixture(384, 128, { original() { calls++; if (throwNow) throw error; return null; } });
  assert.throws(() => f.cache.layer(scene(), 0.5, 384, 128), e => e === error); assert.equal(calls, 1);
  throwNow = false; assert.equal(f.cache.layer([], 0.5, 384, 128), null); assert.equal(calls, 2);
});

test('reentry invalidates both generations and next call can safely rebuild', () => {
  const f = fixture(), xs = scene(); let entered = false;
  f.settings.versionHook = () => { if (!entered) { entered = true; f.cache.layer(xs, 0.5, 384, 128); } };
  f.cache.layer(xs, 0.5, 384, 128);
  assert.equal(f.calls.calls, 2); assert.equal(f.cache.stats().last.reason, 'reentry'); assert.equal(f.cache.stats().retainedBytes, 0);
  f.settings.versionHook = null;
  assert.equal(f.compare(xs).mode, 'original'); assert.equal(f.compare(xs).mode, 'hit');
});

test('all hard caps are checked before retaining frame payload', () => {
  const cases = [
    { reason: 'paint-cap', w: 384, h: 128, lights: () => Array.from({ length: CAPS.paints + 1 }, () => ({})) },
    { reason: 'tile-cap', w: 128 * 1025, h: 1, lights: scene },
    { reason: 'source-cap', w: 384, h: 128, lights: () => Array.from({ length: CAPS.sources + 1 }, () => ({ occlude574: source(), a: 0.5, x: 4, y: 4, w: 2, h: 2 })) },
    { reason: 'reference-cap', w: 128 * 32, h: 128 * 32, lights: () => Array.from({ length: 65 }, () => ({ occlude574: source(), a: 0.5, x: 0, y: 0, w: 128 * 32, h: 128 * 32 })) },
    { reason: 'payload-cap', w: 384, h: 128, lights: () => { const xs = scene(); xs[0].img.id = 'a'.repeat(CAPS.bytes / 2); return xs; } }
  ];
  for (const c of cases) {
    // Stub original: cap tests must not allocate a huge raster or paint it.
    let calls = 0; const canvas = new FakeCanvas(), xs = c.lights();
    const cache = create({ original() { calls++; return canvas; }, getSurface: () => ({ canvas, context: canvas.context, privateClip: true }), sourceVersion: image => ({ id: image.id, revision: image.revision, width: image.width, height: image.height, supported: true }), Path2D: FakePath });
    cache.layer(xs, 0.5, c.w, c.h); const s = cache.stats();
    assert.equal(s.last.reason, c.reason); assert.equal(calls, 1); assert.equal(s.capFallbacks, 1); assert.equal(s.retainedBytes, 0); assert.ok(s.peakExplicitBytes <= CAPS.bytes);
  }
});

test('dispose releases retention; repeated disposal and later use preserve original behavior', () => {
  const f = fixture(), xs = scene(); f.compare(xs); assert.ok(f.cache.stats().retainedBytes > 0);
  f.cache.dispose(); f.cache.dispose(); assert.equal(f.cache.stats().retainedBytes, 0);
  assert.equal(f.compare(xs).reason, 'disposed'); assert.equal(f.compare(xs).reason, 'disposed');
});

test('an intentionally omitted source revision is a falsifying negative control', () => {
  const f = fixture(), xs = scene(); f.compare(xs);
  xs[0].img.rgba = [0.1, 0.9, 0.2, 0.2]; // Deliberately violate observer contract.
  originalFor(f.expected, { calls: 0 })(xs, 0.5, 384, 128);
  f.cache.layer(xs, 0.5, 384, 128);
  assert.equal(f.cache.stats().last.mode, 'hit');
  assert.notDeepEqual(f.actual.pixels, f.expected.pixels, 'oracle catches stale retained pixels; full baseline draw cannot repair candidate');
});

test('no random number use; stats snapshots cannot mutate retained counters', () => {
  const f = fixture(), xs = scene(), random = Math.random;
  try { Math.random = () => { throw Error('RNG is forbidden'); }; f.compare(xs); f.compare(xs); xs[0].a = 0.4; f.compare(xs); }
  finally { Math.random = random; }
  const s = f.cache.stats(); s.hits = 99; s.last.mode = 'forged'; s.caps.tiles = 1;
  assert.equal(f.cache.stats().hits, 1); assert.equal(f.cache.stats().last.mode, 'partial'); assert.equal(f.cache.stats().caps.tiles, 1024);
});

test('reentry during a clipped paint removes the clip before either original call', () => {
  const f = fixture(), xs = scene(); f.compare(xs); xs[0].a = 0.1;
  const g = f.actual.context, draw = g.drawImage.bind(g), start = g.log.length;
  let entered = false;
  g.drawImage = function (...args) {
    if (!entered && this.clipped) { entered = true; f.cache.layer(xs, 0.5, 384, 128); }
    return draw(...args);
  };
  const s = f.compare(xs), log = g.log.slice(start);
  assert.equal(s.reason, 'reentry'); assert.equal(f.calls.calls, 3); assert.equal(f.cache.stats().retainedBytes, 0);
  assert.equal(log.filter(x => x[0] === 'restore').length, 1);
  assert.ok(log.findIndex(x => x[0] === 'restore') < log.findIndex((x, i) => i > 2 && x[0] === 'clear'));
  assert.equal(g.clipped, null); assert.equal(g.stack.length, 0);
});

test('reentry during the final output observation repairs the outer result', () => {
  const f = fixture(), xs = scene(); f.compare(xs);
  let reads = 0;
  f.settings.versionHook = image => {
    if (image === f.actual && ++reads === 2) {
      const other = scene(); other[2].col = '#0000ff';
      f.cache.layer(other, 0.7, 384, 128);
    }
  };
  const s = f.compare(xs); assert.equal(s.reason, 'reentry'); assert.equal(f.cache.stats().retainedBytes, 0);
});

test('both generations share the payload cap even when each alone would fit', () => {
  const canvas = new FakeCanvas(), image = source(), mask = source(); let calls = 0;
  image.id = 'v'.repeat(700000);
  const xs = [{ img: image, x: 3, y: 3, w: 8, h: 8 }, { occlude574: mask, x: 3, y: 3, w: 8, h: 8, a: 0.5 }];
  const cache = create({ original() { calls++; canvas.revision++; return canvas; }, getSurface: () => ({ canvas, context: canvas.context, privateClip: true }), sourceVersion: s => ({ id: s.id, revision: s.revision, width: s.width, height: s.height, supported: true }), Path2D: FakePath });
  cache.layer(xs, 0.5, 384, 128); assert.ok(cache.stats().retainedBytes > 4 * 1024 * 1024);
  cache.layer(xs, 0.5, 384, 128);
  assert.equal(cache.stats().last.reason, 'payload-cap'); assert.equal(cache.stats().retainedBytes, 0); assert.equal(calls, 2);
  assert.ok(cache.stats().peakExplicitBytes <= CAPS.bytes);
});

test('output observer failure after a paint discards retention without replaying successful original', () => {
  const f = fixture(), xs = scene(); let reads = 0;
  f.settings.versionHook = image => { if (image === f.actual && ++reads === 2) throw Error('observer unavailable'); };
  f.compare(xs); assert.equal(f.calls.calls, 1); assert.equal(f.cache.stats().retainedBytes, 0);
  f.settings.versionHook = null; assert.equal(f.compare(xs).mode, 'original'); assert.equal(f.compare(xs).mode, 'hit');
});

test('reentry while seeding a full draw restores the outer original result', () => {
  const f = fixture(), xs = scene(); let reads = 0;
  f.settings.versionHook = image => {
    if (image === f.actual && ++reads === 2) { const other = scene(); other[2].col = '#0000ff'; f.cache.layer(other, 0.7, 384, 128); }
  };
  assert.equal(f.compare(xs).reason, 'reentry'); assert.equal(f.cache.stats().retainedBytes, 0); assert.equal(f.calls.calls, 3);
});

function partitionScene() {
  const xs = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) xs.push({ rect: [col * 128 + 20, row * 128 + 20, 12, 12], col: '#4477aa' });
  xs.push({ occlude574: source(), x: 280, y: 30, w: 8, h: 8, a: 0.4 });
  return xs;
}
function multiPassScene() {
  const xs = [
    { img: source(), x: 1.25, y: 5.5, w: 860.5, h: 70.25, a: 0.8 },
    { occlude574: source(), x: 20, y: 15, w: 12, h: 12, a: 0.45 },
    ...[0, 2, 4].map(col => ({ rect: [col * 128 + 35.5, 25.5, 8, 9], col: '#ff8800' })),
    ...Array.from({ length: 6 }, (_, i) => ({ rect: [150 + 5 * i, 40, 3, 4], col: '#ffeeaa' }))
  ];
  return xs;
}
function changeThree(xs) { for (let i = 2; i < 5; i++) xs[i].col = '#aa5500'; }

test('mixed runs partition exact dirty coverage, merge identical adjacent rows, and never overlap', () => {
  const f = fixture(512, 512), xs = partitionScene(), tiles = [0, 1, 3, 4, 5, 7, 9, 10, 12, 13, 15];
  f.compare(xs); for (const tile of tiles) xs[tile].col = '#aa7744';
  const start = f.actual.context.log.length, s = f.compare(xs), clips = f.actual.context.log.slice(start).filter(x => x[0] === 'clip').map(x => x[1]);
  assert.equal(s.rectangles, 5); assert.equal(s.dirtyTiles, tiles.length); assert.equal(s.executedPaints, tiles.length); assert.equal(s.skippedVisiblePaints, 6);
  assert.equal(s.cleanPixels, (16 - tiles.length) * 128 * 128);
  assert.equal(clips.every(rects => rects.length === 1), true, 'each native clip contains exactly one rectangle');
  const rects = clips.map(x => x[0]);
  assert.deepEqual(rects, [[0, 0, 256, 256], [384, 0, 128, 256], [128, 256, 256, 128], [0, 384, 256, 128], [384, 384, 128, 128]]);
  const covered = [];
  for (let i = 0; i < rects.length; i++) {
    const [x, y, w, h] = rects[i];
    for (let j = i + 1; j < rects.length; j++) {
      const [xx, yy, ww, hh] = rects[j];
      const area = Math.max(0, Math.min(x + w, xx + ww) - Math.max(x, xx)) * Math.max(0, Math.min(y + h, yy + hh) - Math.max(y, yy));
      assert.equal(area, 0, 'later clears cannot hide overlapping rectangle errors');
    }
    for (let yy = y; yy < y + h; yy += 128) for (let xx = x; xx < x + w; xx += 128) covered.push(yy / 128 * 4 + xx / 128);
  }
  assert.deepEqual(covered.sort((a, b) => a - b), tiles, 'no unchanged holes are cleared and no changed tile is omitted');
});

test('unchanged fractional source spans separate passes with exact geometry, alpha and ordered blends', () => {
  const f = fixture(896, 128), xs = multiPassScene(); f.compare(xs, 0.7);
  const recorded = [], g = f.actual.context, draw = g.drawImage.bind(g);
  g.drawImage = function (image, ...geometry) { if (this.clipped) recorded.push({ image, geometry, alpha: this.globalAlpha, composite: this.globalCompositeOperation }); return draw(image, ...geometry); };
  const baseBytes = f.cache.stats().retainedBytes; changeThree(xs);
  const start = g.log.length, s = f.compare(xs, 0.7), log = g.log.slice(start);
  assert.equal(s.rectangles, 3); assert.equal(s.plannedRectangles, 3); assert.equal(s.plannedPaints, 7); assert.equal(s.executedPaints, 7);
  assert.equal(s.duplicatePaints, 2); assert.equal(s.plannedDuplicatePaints, 2); assert.equal(s.executedVisiblePaints, 7); assert.equal(s.skippedVisiblePaints, 4);
  const repeated = recorded.filter(r => r.image === xs[0].img);
  assert.equal(repeated.length, 3);
  for (const r of repeated) { assert.deepEqual(r.geometry, [1.25, 5.5, 860.5, 70.25]); assert.equal(r.alpha, 0.7 * 0.8); assert.equal(r.composite, 'screen'); }
  assert.deepEqual(recorded.map(r => r.composite), ['screen', 'destination-out', 'screen', 'screen']);
  assert.equal(recorded[1].alpha, 0.45);
  assert.deepEqual(log.filter(x => x[0] === 'clip').map(x => x[1]), [[[0, 0, 128, 128]], [[256, 0, 128, 128]], [[512, 0, 128, 128]]]);
  assert.equal(f.cache.stats().retainedBytes - baseBytes, 3 * 64 + 7 * 8 + xs.length, 'rectangle coordinates, replay indices and seen mask participate in the explicit payload budget');
  assert.ok(f.cache.stats().peakExplicitBytes <= CAPS.bytes);
});

test('second and third pass failures remove their own clip, charge prior passes, and fully repair once', () => {
  for (const scenario of [{ x: 256, method: 'fillRect', attempted: 5, duplicates: 1, passes: 2 }, { x: 512, method: 'drawImage', attempted: 6, duplicates: 2, passes: 3 }]) {
    const f = fixture(896, 128), xs = multiPassScene(); f.compare(xs, 0.7); changeThree(xs);
    const g = f.actual.context, native = g[scenario.method].bind(g); let fired = false;
    g[scenario.method] = function (...args) { if (!fired && this.clipped && this.clipped[0][0] === scenario.x) { fired = true; throw Error('later-pass paint failure'); } return native(...args); };
    const start = g.log.length, s = f.compare(xs, 0.7), log = g.log.slice(start);
    assert.equal(s.reason, 'candidate-exception'); assert.equal(s.rectangles, 0); assert.equal(s.executedRectangles, scenario.passes);
    assert.equal(s.candidatePaints, scenario.attempted); assert.equal(s.executedPaints, xs.length + scenario.attempted); assert.equal(s.duplicatePaints, scenario.duplicates);
    assert.equal(s.executedVisiblePaints, xs.length + scenario.attempted); assert.equal(s.cleanPixels, 0); assert.equal(s.skippedVisiblePaints, 0);
    assert.equal(log.filter(x => x[0] === 'clip').length, scenario.passes);
    assert.ok(log.findLastIndex(x => x[0] === 'restore') < log.findLastIndex(x => x[0] === 'clear'));
    assert.equal(f.calls.calls, 2); assert.equal(f.cache.stats().retainedBytes, 0); assert.equal(g.clipped, null); assert.equal(g.stack.length, 0);
  }
});

test('second and third pass reentry removes the active clip and stops additional passes before repair', () => {
  for (const [x, attempted, passes] of [[256, 4, 2], [512, 6, 3]]) {
    const f = fixture(896, 128), xs = multiPassScene(); f.compare(xs, 0.7); changeThree(xs);
    const g = f.actual.context, draw = g.drawImage.bind(g); let entered = false;
    g.drawImage = function (...args) {
      if (!entered && this.clipped && this.clipped[0][0] === x) { entered = true; f.cache.layer(xs, 0.7, 896, 128); assert.equal(this.clipped, null, 'nested original never keeps the candidate clip'); }
      return draw(...args);
    };
    const start = g.log.length, s = f.compare(xs, 0.7), log = g.log.slice(start);
    assert.equal(s.reason, 'reentry'); assert.equal(s.rectangles, 0); assert.equal(s.executedRectangles, passes);
    assert.equal(s.candidatePaints, attempted); assert.equal(s.executedPaints, null); assert.equal(s.executedVisiblePaints, null); assert.equal(s.paintCountsComplete, false); assert.equal(s.nestedOriginalCalls, 1); assert.equal(s.duplicatePaints, passes - 1);
    assert.equal(log.filter(r => r[0] === 'clip').length, passes); assert.equal(log.filter(r => r[0] === 'restore').length, passes);
    assert.equal(f.calls.calls, 3); assert.equal(f.cache.stats().retainedBytes, 0); assert.equal(g.stack.length, 0); assert.equal(g.clipped, null);
  }
});

test('cropped edge rectangles cover only physical dirty pixels and preserve separated clean tiles', () => {
  const f = fixture(350, 270), xs = [
    { rect: [10, 10, 10, 10], col: '#ff0000' },
    { occlude574: source(), x: 15, y: 15, w: 4, h: 4, a: 0.5 },
    { rect: [310, 260, 8, 4], col: '#0000ff' },
    { rect: [150, 150, 10, 10], col: '#ffffff' }
  ];
  f.compare(xs); xs[0].col = '#aa0000'; xs[2].col = '#0000aa';
  const start = f.actual.context.log.length, s = f.compare(xs), clips = f.actual.context.log.slice(start).filter(x => x[0] === 'clip');
  assert.equal(s.mode, 'partial'); assert.equal(s.rectangles, 2); assert.equal(s.dirtyTiles, 2); assert.equal(s.executedPaints, 3);
  assert.equal(s.cleanPixels, 350 * 270 - 128 * 128 - 94 * 14); assert.equal(s.skippedVisiblePaints, 1);
  assert.deepEqual(clips.map(x => x[1]), [[[0, 0, 128, 128]], [[256, 256, 94, 14]]]);
});

test('plans with equal or greater paint calls fall back before any candidate clear or clip', () => {
  for (const extraCleanPaint of [false, true]) {
    const f = fixture(512, 128), xs = [
      { img: source(), x: 2, y: 3, w: 508, h: 20 },
      { occlude574: source(), x: 20, y: 6, w: 8, h: 8, a: 0.5 },
      { rect: [35, 10, 8, 8], col: '#ff0000' },
      { rect: [280, 10, 8, 8], col: '#00ff00' }
    ];
    if (extraCleanPaint) xs.push({ rect: [150, 10, 8, 8], col: '#0000ff' });
    f.compare(xs); xs[2].col = '#aa0000'; xs[3].col = '#00aa00';
    const start = f.actual.context.log.length, s = f.compare(xs), log = f.actual.context.log.slice(start);
    assert.equal(s.reason, 'no-call-count-win'); assert.equal(s.plannedPaints, 5); assert.equal(s.plannedDuplicatePaints, 1);
    assert.equal(s.rectangles, 0); assert.equal(s.executedRectangles, 0); assert.equal(s.candidatePaints, 0); assert.equal(s.executedPaints, xs.length);
    assert.equal(log.some(x => x[0] === 'clip' || x[0] === 'save'), false); assert.equal(s.cleanPixels, 0); assert.equal(s.skippedVisiblePaints, 0);
    assert.equal(f.cache.stats().capFallbacks, 0); assert.equal(f.compare(xs).mode, 'hit');
  }
});

function cappedPlanHarness(w, h) {
  // No raster is needed to verify pre-paint caps. Keep logical dimensions while
  // the original stub only records a full fallback and updates its revision.
  const canvas = new FakeCanvas(1, 1); canvas._width = w; canvas._height = h;
  let originals = 0;
  const cache = create({ original() { originals++; canvas.revision++; return canvas; }, getSurface: () => ({ canvas, context: canvas.context, privateClip: true }), sourceVersion: image => ({ id: image.id, revision: image.revision, width: image.width, height: image.height, supported: true }), Path2D: FakePath });
  return { canvas, cache, originals: () => originals };
}

test('rectangle and total replay caps discard metadata before the first candidate pass', () => {
  for (const reason of ['rectangle-cap', 'replay-cap']) {
    const h = reason === 'rectangle-cap' ? 1152 : 1024, rows = h / 128, harness = cappedPlanHarness(1024, h);
    const xs = reason === 'replay-cap' ? Array.from({ length: 300 }, () => ({ rect: [0, 0, 1024, h], col: '#112233' })) : [];
    const tileStart = xs.length;
    for (let row = 0; row < rows; row++) for (let col = 0; col < 8; col++) xs.push({ rect: [col * 128 + 20, row * 128 + 20, 8, 8], col: '#445566' });
    xs.push({ occlude574: source(), x: -100, y: -100, w: 8, h: 8, a: 0.5 });
    harness.cache.layer(xs, 0.5, 1024, h); assert.ok(harness.cache.stats().retainedBytes > 0);
    let changes = 0;
    for (let row = 0; row < rows; row++) for (let col = 0; col < 8; col++) if ((row + col) % 2 === 0 && changes < (reason === 'rectangle-cap' ? 33 : 32)) { xs[tileStart + row * 8 + col].col = '#665544'; changes++; }
    harness.cache.layer(xs, 0.5, 1024, h); const s = harness.cache.stats();
    assert.equal(s.last.reason, reason); assert.equal(s.capFallbacks, 1); assert.equal(s.retainedBytes, 0); assert.equal(s.last.candidatePaints, 0); assert.equal(s.last.rectangles, 0);
    assert.equal(harness.originals(), 2); assert.equal(harness.canvas.context.log.length, 0, 'preflight cap failure performs no candidate clear/save/clip/paint'); assert.ok(s.peakExplicitBytes <= CAPS.bytes);
  }
});

test('reentry totals stay explicitly unknown without re-reading different nested getter inputs', () => {
  const f = fixture(896, 128), xs = multiPassScene(); f.compare(xs, 0.7); changeThree(xs);
  let reads = 0, entered = false;
  const inner = [{ occlude574: source(), x: 20, y: 20, w: 10, h: 10, a: 0.5 }, { get rect() { reads++; return [270, 10, 8, 8]; }, col: '#aabbcc' }];
  const g = f.actual.context, draw = g.drawImage.bind(g);
  g.drawImage = function (...args) { if (!entered && this.clipped && this.clipped[0][0] === 256) { entered = true; f.cache.layer(inner, 0.3, 896, 128); } return draw(...args); };
  const s = f.compare(xs, 0.7);
  assert.equal(reads, 2, 'only the original truthiness check and spread consume the getter');
  assert.equal(s.reason, 'reentry'); assert.equal(s.nestedOriginalCalls, 1); assert.equal(s.paintCountsComplete, false);
  assert.equal(s.executedPaints, null); assert.equal(s.executedVisiblePaints, null); assert.equal(s.originalPaints, null);
  assert.equal(s.candidatePaints, 4); assert.equal(s.executedRectangles, 2); assert.equal(s.rectangles, 0); assert.equal(s.cleanPixels, 0); assert.equal(s.skippedVisiblePaints, 0);
  assert.equal(f.calls.calls, 3); assert.equal(f.cache.stats().retainedBytes, 0);
  f.cache.dispose(); f.cache.layer(xs, 0.7, 896, 128);
  assert.equal(f.cache.stats().last.nestedOriginalCalls, 0, 'disposed invocation cannot inherit the preceding frame reentry count');
});
