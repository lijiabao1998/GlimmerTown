'use strict';
// Node contracts + official CanvasKit 0.42 software surfaces only. These tests
// do not establish browser native-context fidelity, WebGL parity, or game FPS.
// CANVASKIT_DIR=/path/to/package node --test docs/tasks/t604-canvaskit/cost-adapters604.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {installStateCache, installPaintDedup} = require('./cost-adapters604.js');
const {Recorder} = require('../../../renderers/t604-recorder.js');
const defaults = {fillStyle: '#000000', strokeStyle: '#000000', globalAlpha: 1,
  globalCompositeOperation: 'source-over', filter: 'none', imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
  lineDashOffset: 0, shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetX: 0,
  shadowOffsetY: 0, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', direction: 'inherit'};
const ID = [1, 0, 0, 1, 0, 0];
function css(value) {
  if (value && typeof value === 'object' && value.nativeGradient) return value;
  const input = String(value).toLowerCase();
  if (input === 'red') return '#ff0000';
  if (/^#[0-9a-f]{3}$/.test(input)) return '#' + input.slice(1).split('').map(x => x + x).join('');
  if (/^#[0-9a-f]{6}$/.test(input) || input === 'rgba(0, 0, 0, 0)') return input;
  return undefined;
}
class NativeGradient {
  constructor() { this.nativeGradient = true; this.stops = []; }
  addColorStop(offset, color) {
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) throw new RangeError('bad gradient offset');
    if (css(color) === undefined) throw new TypeError('bad gradient color');
    this.stops.push([offset, color]);
  }
}
class NativeContext {
  constructor(canvas) { this.canvas = canvas; this.reads = {}; this.writes = {}; this.reset(); }
  reset() { this._resetState(); }
  _resetState() { this.values = {...defaults}; this.stack = []; this.dash = []; this.transform = ID.slice(); }
  save() { this.stack.push({values: {...this.values}, dash: this.dash.slice(), transform: this.transform.slice()}); }
  restore() { const old = this.stack.pop(); if (old) Object.assign(this, old); }
  setTransform(...args) { this.transform = args.slice(); }
  getTransform() { return Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((name, i) => [name, this.transform[i]])); }
  getLineDash() { return this.dash.slice(); }
  setLineDash(values) { if (values.every(v => Number.isFinite(v) && v >= 0)) this.dash = values.slice(); }
  createLinearGradient() { return new NativeGradient(); }
  createRadialGradient() { return new NativeGradient(); }
  fillRect() {}
  beginPath() {}
  rect() {}
}
for (const [name, initial] of Object.entries(defaults)) {
  Object.defineProperty(NativeContext.prototype, name, {configurable: true, enumerable: true,
    get() { this.reads[name] = (this.reads[name] || 0) + 1; return this.values[name]; },
    set(input) {
      this.writes[name] = (this.writes[name] || 0) + 1;
      let value = input;
      if (['fillStyle', 'strokeStyle', 'shadowColor'].includes(name)) {
        value = css(input); if (value === undefined) return;
      } else if (typeof initial === 'number') {
        if (typeof input === 'symbol') throw new TypeError('Cannot convert a Symbol to a number');
        value = Number(input); if (!Number.isFinite(value)) return;
        if (name === 'globalAlpha' && (value < 0 || value > 1)) return;
        if (['lineWidth', 'miterLimit'].includes(name) && value <= 0) return;
        if (name === 'shadowBlur' && value < 0) return;
      } else if (typeof initial === 'boolean') value = Boolean(input);
      else {
        value = String(input);
        const enums = {lineCap: ['butt', 'round', 'square'], lineJoin: ['miter', 'round', 'bevel'],
          textAlign: ['start', 'end', 'left', 'right', 'center'], direction: ['inherit', 'ltr', 'rtl']};
        if (enums[name] && !enums[name].includes(value)) return;
      }
      this.values[name] = value;
    }
  });
}
class NativeCanvas {
  constructor() { this._width = 300; this._height = 150; this.context = new NativeContext(this); }
  getContext() { return this.context; }
  get width() { return this._width; }
  set width(value) { this._width = Number(value) >>> 0; this.context._resetState(); }
  get height() { return this._height; }
  set height(value) { this._height = Number(value) >>> 0; this.context._resetState(); }
}
function recorderFixture() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {createElement: () => new NativeCanvas()};
  try { const canvas = new NativeCanvas(); return new Recorder(canvas, canvas.getContext('2d')); }
  finally { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; }
}
function rebuild(recorder) { recorder.snapshot = null; return recorder.state(); }
function withState(body) {
  const recorder = recorderFixture(), hook = installStateCache(recorder);
  try { return body(recorder, hook); } finally { hook.restore(); }
}

test('UMD exports the identical two APIs in a browser-like global', () => {
  const scope = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'cost-adapters604.js'), 'utf8'), scope);
  assert.deepEqual(Object.keys(scope.TownCost604).sort(), ['installPaintDedup', 'installStateCache']);
});
test('canonical reads cache across snapshots while every actual setter still delegates', () => withState((r, h) => {
  const s1 = r.state();
  r.context.setTransform(1, 0, 0, 1, 8, 9);
  const s2 = r.state();
  assert.notEqual(s1, s2); assert.deepEqual(s2.transform, [1, 0, 0, 1, 8, 9]);
  for (const name of Object.keys(defaults)) assert.deepEqual(h.stats.reads[name], {requested: 2, delegated: 1, skipped: 1});
  r.context.fillStyle = 'RED';
  assert.equal(r.state().fillStyle, '#ff0000');
  r.context.fillStyle = '#f00';
  assert.equal(r.state().fillStyle, '#ff0000');
  assert.equal(h.stats.writes.fillStyle.delegated, 2);
  assert.equal(h.stats.reads.fillStyle.delegated, 3);
  const count = h.stats.reads.fillStyle.requested;
  assert.equal(r.context.fillStyle, '#ff0000');
  assert.equal(h.stats.reads.fillStyle.requested, count, 'external native reads are deliberately uncached');
}));
test('ignored, throwing, and converting setters retain native behavior', () => withState((r, h) => {
  r.context.lineWidth = 3; r.context.globalAlpha = 0.4; r.context.fillStyle = 'red'; r.state();
  for (const value of [-1, 0, NaN, Infinity, -Infinity]) {
    r.context.lineWidth = value; assert.equal(r.state().lineWidth, 3);
  }
  for (const value of [-1, 2, NaN, Infinity]) {
    r.context.globalAlpha = value; assert.equal(r.state().globalAlpha, 0.4);
  }
  r.context.fillStyle = 'invalid'; assert.equal(r.state().fillStyle, '#ff0000');
  r.context.lineCap = 'not-a-cap'; assert.equal(r.state().lineCap, 'butt');
  assert.throws(() => { r.context.lineWidth = Symbol('bad'); }, TypeError);
  let conversions = 0;
  const value = {valueOf() { conversions++; return 7; }};
  r.context.lineWidth = value; r.context.lineWidth = value;
  assert.equal(conversions, 2); assert.equal(r.state().lineWidth, 7);
  assert.equal(h.stats.writes.lineWidth.requested, r.shadow.writes.lineWidth);
}));
test('setter coercion can reenter state() without leaving a cached pre-write value', () => withState(r => {
  r.context.lineWidth = 2; r.state();
  r.context.lineWidth = {valueOf() { assert.equal(rebuild(r).lineWidth, 2); return 9; }};
  assert.equal(r.state().lineWidth, 9);
}));
test('nested native save/restore caches, dash and transforms follow Recorder state exactly', () => withState((r, h) => {
  r.context.fillStyle = 'red'; const first = r.state();
  r.context.save(); r.context.lineWidth = 4; r.context.setLineDash([2, 3]);
  r.context.setTransform(2, 0, 0, 2, 4, 5); const second = r.state();
  r.context.save(); r.context.fillStyle = '#00f'; r.context.lineWidth = 11; r.state();
  const delegated = h.stats.reads.lineWidth.delegated;
  r.context.restore(); assert.deepEqual(r.state(), second);
  r.context.restore(); assert.deepEqual(r.state(), first);
  assert.equal(h.stats.reads.lineWidth.delegated, delegated);
  r.context.restore(); assert.deepEqual(r.state(), first);
  assert.equal(h.stats.reads.lineWidth.delegated, delegated, 'empty restore keeps the current cache');
}));
test('save before first cache fill and save predating installation restore safely', () => {
  const r = recorderFixture(); r.context.lineWidth = 3; r.context.save(); r.context.lineWidth = 9;
  const h = installStateCache(r);
  try {
    r.context.save(); r.context.lineWidth = 12; assert.equal(r.state().lineWidth, 12);
    r.context.restore(); assert.equal(r.state().lineWidth, 9);
    r.context.restore(); assert.equal(r.state().lineWidth, 3);
    assert.equal(h.stats.invalidations.unknownRestore, 1);
  } finally { h.restore(); }
});
test('mutable gradients retain every revision and immutable historical stops', () => withState((r, h) => {
  const gradient = r.context.createLinearGradient(0, 0, 10, 0);
  gradient.addColorStop(0, 'red'); r.context.fillStyle = gradient;
  const first = r.state(); r.context.save();
  gradient.addColorStop(1, '#00f'); const second = r.state();
  assert.equal(first.fillStyle.version, 1); assert.equal(first.fillStyle.stops.length, 1);
  assert.equal(second.fillStyle.version, 2); assert.equal(second.fillStyle.stops.length, 2);
  r.context.restore(); assert.deepEqual(r.state().fillStyle, second.fillStyle);
  assert.equal(h.stats.reads.fillStyle.delegated, 1);
  assert.throws(() => gradient.addColorStop(-1, 'red'), RangeError);
  assert.deepEqual(r.state().fillStyle, second.fillStyle);
}));
test('native reset and same-value dimensions invalidate values and all saved caches', () => withState((r, h) => {
  r.context.lineWidth = 8; r.context.save(); r.state();
  r.shadow.reset(); assert.equal(rebuild(r).lineWidth, 1);
  r.shadow.restore(); assert.equal(rebuild(r).lineWidth, 1);
  r.context.lineWidth = 6; r.context.save(); r.state();
  r.shadowCanvas.width = r.shadowCanvas.width;
  assert.equal(rebuild(r).lineWidth, 1);
  r.shadow.restore(); assert.equal(rebuild(r).lineWidth, 1);
  r.context.lineWidth = 4; r.state(); r.canvas.height = r.canvas.height;
  assert.equal(r.state().lineWidth, 1);
  assert.equal(h.stats.invalidations.reset, 1);
  assert.ok(h.stats.invalidations.dimensions >= 3);
}));
test('dimension conversion reentrancy and exceptions cannot retain stale cached reads', () => withState(r => {
  r.context.lineWidth = 7; r.state();
  r.shadowCanvas.width = {valueOf() { assert.equal(rebuild(r).lineWidth, 7); return 300; }};
  assert.equal(rebuild(r).lineWidth, 1);
  r.context.lineWidth = 8; r.state();
  assert.throws(() => { r.shadowCanvas.height = {valueOf() { throw Error('dimension failure'); }}; }, /dimension failure/);
  assert.equal(rebuild(r).lineWidth, 8);
}));
test('all own descriptors restore exactly, with no lingering hooks or double installation', () => {
  const r = recorderFixture();
  Object.defineProperty(r.shadow, 'save', {value: r.shadow.save, writable: false, configurable: true, enumerable: false});
  const before = [r, r.shadow, r.shadowCanvas].map(object => Object.getOwnPropertyDescriptors(object));
  const h = installStateCache(r); assert.throws(() => installStateCache(r), /already installed/);
  h.restore(); h.restore();
  [r, r.shadow, r.shadowCanvas].forEach((object, i) => assert.deepEqual(Object.getOwnPropertyDescriptors(object), before[i]));
  installStateCache(r).restore();
});
test('unsupported descriptors and reset contracts fail before installing any hooks', () => {
  for (const change of [
    r => Object.defineProperty(r.shadow, 'lineWidth', {value: 2, configurable: true}),
    r => Object.defineProperty(r.shadow, 'fillStyle', {get() { return '#000000'; }, set() {}, configurable: false}),
    r => Object.defineProperty(r.shadow, 'reset', {value: undefined, configurable: true}),
    r => Object.defineProperty(r.shadowCanvas, 'width', {value: 300, configurable: true})
  ]) {
    const r = recorderFixture(); change(r);
    const before = [r, r.shadow, r.shadowCanvas].map(object => Object.getOwnPropertyDescriptors(object));
    assert.throws(() => installStateCache(r), /T604 cost adapter/);
    [r, r.shadow, r.shadowCanvas].forEach((object, i) => assert.deepEqual(Object.getOwnPropertyDescriptors(object), before[i]));
  }
});

const packageDir = process.env.CANVASKIT_DIR || '/workspace/shared/town604-canvaskit-package';
const init = require(path.join(packageDir, 'bin/canvaskit.js'));
const loaded = init({wasmBinary: fs.readFileSync(path.join(packageDir, 'bin/canvaskit.wasm'))});
async function withPaint(body) {
  const CK = await loaded, hook = installPaintDedup(CK);
  try { return body(CK, hook); } finally { hook.restore(); }
}
test('official Paint uses exact per-lifetime comparisons, no epsilon or signed-zero folding', () => withPaint((CK, h) => {
  const p = new CK.Paint(), q = new CK.Paint();
  try {
    for (const paint of [p, q]) {
      paint.setAntiAlias(true); paint.setAntiAlias(true); paint.setDither(true); paint.setDither(true);
      paint.setStyle(CK.PaintStyle.Fill); paint.setStyle(CK.PaintStyle.Fill);
      paint.setShader(null); paint.setShader(null); paint.setPathEffect(null); paint.setPathEffect(null);
      paint.setColorComponents(1, 0, 0, 1); paint.setColorComponents(1, 0, 0, 1);
    }
    assert.deepEqual(h.stats.methods.setColorComponents, {requested: 4, delegated: 2, skipped: 2});
    p.setStrokeWidth(0); p.setStrokeWidth(-0); p.setStrokeWidth(1); p.setStrokeWidth(1 + Number.EPSILON);
    assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
    assert.equal(h.stats.methods.setShader.skipped, 2);
    assert.ok(p instanceof CK.Paint);
  } finally { p.delete(); q.delete(); }
  assert.equal(h.stats.liveInstances, 0); assert.equal(h.stats.instancesCreated, h.stats.instancesRestored);
}));
test('official mutable color arrays and overlapping color/alpha setters cannot skip incorrectly', () => withPaint((CK, h) => {
  const p = new CK.Paint();
  try {
    p.setColorComponents(1, 0, 0, 1); p.setAlphaf(0.25); p.setColorComponents(1, 0, 0, 1);
    assert.deepEqual(Array.from(p.getColor()), [1, 0, 0, 1]);
    assert.equal(h.stats.methods.setColorComponents.skipped, 0);
    const array = new Float32Array([0, 1, 0, 1]); p.setColor(array); array[2] = 1; p.setColor(array);
    assert.deepEqual(Array.from(p.getColor()), [0, 1, 1, 1]);
    assert.equal(h.stats.methods.setColor.skipped, 0);
    p.setColorInt(0xffff0000); p.setColorComponents(0, 1, 1, 1);
    assert.deepEqual(Array.from(p.getColor()), [0, 1, 1, 1]);
  } finally { p.delete(); }
}));
test('official throwing inputs keep throwing and coercing inputs keep converting', () => withPaint((CK, h) => {
  const p = new CK.Paint();
  try {
    for (let i = 0; i < 2; i++) assert.throws(() => p.setStyle(null));
    assert.equal(h.stats.methods.setStyle.delegated, 2); assert.equal(h.stats.methods.setStyle.skipped, 0);
    let conversions = 0; const value = {valueOf() { conversions++; return 3; }};
    p.setStrokeWidth(value); p.setStrokeWidth(value);
    assert.equal(conversions, 2); assert.equal(p.getStrokeWidth(), 3);
    p.setStrokeWidth(-1); p.setStrokeWidth(-1); p.setStrokeWidth(NaN); p.setStrokeWidth(NaN);
    assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
  } finally { p.delete(); }
}));
test('nonnull resources always delegate, including deleted-resource errors', () => withPaint((CK, h) => {
  const p = new CK.Paint(), shader = CK.Shader.MakeColor(CK.RED, CK.ColorSpace.SRGB);
  try {
    p.setShader(shader); p.setShader(shader); assert.equal(h.stats.methods.setShader.skipped, 0);
    shader.delete(); assert.throws(() => p.setShader(shader)); assert.throws(() => p.setShader(shader));
    assert.equal(h.stats.methods.setShader.delegated, 4);
  } finally { p.delete(); if (!shader.isDeleted()) shader.delete(); }
}));
test('official Paint copies have fresh caches and aliases disable both handle caches', () => withPaint((CK, h) => {
  const p = new CK.Paint(); let copy, alias;
  try {
    p.setStrokeWidth(3); copy = p.copy(); copy.setStrokeWidth(3);
    assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
    alias = p.clone(); assert.equal(alias.isAliasOf(p), true);
    alias.setStrokeWidth(8); p.setStrokeWidth(3); assert.equal(alias.getStrokeWidth(), 3);
    p.setStrokeWidth(3); alias.setStrokeWidth(3); assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
    copy.setStrokeWidth(3); assert.equal(h.stats.methods.setStrokeWidth.skipped, 1);
    assert.equal(h.stats.disabledAliases, 1);
  } finally { if (alias) alias.delete(); if (copy) copy.delete(); p.delete(); }
}));
test('borrowed wrapped setters operate on the receiver cache and conversion can reenter', () => withPaint((CK, h) => {
  const p = new CK.Paint(), q = new CK.Paint();
  try {
    p.setStrokeWidth(3); q.setStrokeWidth(3);
    p.setStrokeWidth.call(q, 9); q.setStrokeWidth(3);
    assert.equal(q.getStrokeWidth(), 3);
    assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
    p.setStrokeWidth({valueOf() { p.setStrokeWidth(6); return 8; }});
    p.setStrokeWidth(6); assert.equal(p.getStrokeWidth(), 6);
    assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
  } finally { p.delete(); q.delete(); }
}));
test('fake deferred-deletion queue disables dedup until destruction, then restores hooks', () => {
  // The official 0.42 distribution does not export flushPendingDeletes. Use an
  // explicit queue contract here instead of reaching into its private internals
  // or leaving a scheduled native allocation that the test cannot reclaim.
  const queue = [];
  class Paint {
    constructor() { this.deleted = false; this.width = 0; }
    setColorComponents() { if (this.deleted) throw Error('deleted'); }
    setStrokeWidth(width) { if (this.deleted) throw Error('deleted'); this.width = width; }
    isDeleted() { return this.deleted; }
    copy() { return new Paint(); }
    clone() { return this; }
    deleteLater() { queue.push(this); return this; }
    delete() { if (this.deleted) throw Error('deleted'); this.deleted = true; }
  }
  const CK = {Paint, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}}, h = installPaintDedup(CK);
  try {
    const p = new CK.Paint(); p.setStrokeWidth(3); p.deleteLater();
    p.setStrokeWidth(3); assert.equal(h.stats.methods.setStrokeWidth.skipped, 0);
    queue.shift().delete();
    assert.equal(p.isDeleted(), true); assert.throws(() => p.setStrokeWidth(3));
    assert.equal(h.stats.liveInstances, 0); assert.equal(Object.hasOwn(p, 'setStrokeWidth'), false);
  } finally { h.restore(); }
});
test('restore preserves original constructor/instance descriptors and deleted calls still fail', async () => {
  const CK = await loaded, before = Object.getOwnPropertyDescriptor(CK, 'Paint'), h = installPaintDedup(CK);
  const savedProxy = CK.Paint;
  const p = new CK.Paint(), q = new CK.Paint();
  p.setDither(true); p.setDither(true); q.setDither(true); q.delete();
  assert.throws(() => q.setDither(true));
  assert.equal(Object.hasOwn(q, 'setDither'), false);
  assert.throws(() => installPaintDedup(CK), /already installed/);
  h.restore(); h.restore();
  assert.deepEqual(Object.getOwnPropertyDescriptor(CK, 'Paint'), before);
  assert.equal(Object.hasOwn(p, 'setDither'), false); assert.equal(Object.hasOwn(p, 'delete'), false);
  assert.equal(h.stats.liveInstances, 0); p.delete();
  const later = new savedProxy(); assert.equal(Object.hasOwn(later, 'setDither'), false); later.delete();
  installPaintDedup(CK).restore();
});
test('official software compositing pixels are exactly equal through ordered setter changes', async () => {
  const CK = await loaded;
  function render(adapted) {
    const h = adapted ? installPaintDedup(CK) : null, surface = CK.MakeSurface(24, 24), p = new CK.Paint();
    try {
      const canvas = surface.getCanvas(); canvas.clear(CK.TRANSPARENT);
      for (let i = 0; i < 18; i++) {
        p.setAntiAlias(i % 4 !== 0); p.setDither(true); p.setShader(null); p.setPathEffect(null); p.setColorFilter(null);
        p.setStyle(i % 3 ? CK.PaintStyle.Fill : CK.PaintStyle.Stroke);
        p.setBlendMode(i % 4 ? CK.BlendMode.SrcOver : CK.BlendMode.Screen);
        p.setColorComponents(i % 2, (i % 3) / 2, (i % 4) / 3, 0.375);
        p.setStrokeWidth(2); p.setStrokeCap(CK.StrokeCap.Round); p.setStrokeJoin(CK.StrokeJoin.Round); p.setStrokeMiter(10);
        canvas.drawRect([i % 6, i % 7, 16 + i % 6, 16 + i % 7], p);
      }
      surface.flush();
      return {bytes: Array.from(canvas.readPixels(0, 0, {width: 24, height: 24, colorType: CK.ColorType.RGBA_8888,
        alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB})), skipped: h ? h.stats.totals.skipped : 0};
    } finally { p.delete(); surface.delete(); if (h) h.restore(); }
  }
  const baseline = render(false), adapted = render(true);
  assert.deepEqual(adapted.bytes, baseline.bytes); assert.ok(adapted.skipped > 0);
});
