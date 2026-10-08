'use strict';
// Actual Recorder + a native interface mock. Representation/ownership contracts
// only: these tests do not establish native pixels, browser GPU parity or FPS.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {install, DirectError, KINDS, COMMAND_STRIDE, STATE_STRIDE, NONE} = require('./direct-writer604.js');
const {Recorder} = require('../../../renderers/t604-recorder.js');
const ID = [1, 0, 0, 1, 0, 0];
const defaults = {fillStyle: '#000000', strokeStyle: '#000000', globalAlpha: 1,
  globalCompositeOperation: 'source-over', filter: 'none', imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
  lineDashOffset: 0, shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetX: 0,
  shadowOffsetY: 0, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', direction: 'inherit'};
function css(value) {
  if (value && typeof value === 'object' && (value.nativeGradient || value.nativePattern)) return value;
  const input = String(value).toLowerCase();
  const names = {red: '#ff0000', blue: '#0000ff', transparent: 'rgba(0, 0, 0, 0)'};
  if (names[input]) return names[input];
  if (/^#[0-9a-f]{3}$/.test(input)) return '#' + input.slice(1).split('').map(x => x + x).join('');
  if (/^#[0-9a-f]{6}$/.test(input) || input.startsWith('rgba(') || input.startsWith('color(')) return input;
  return undefined;
}
class Gradient {
  constructor() { this.nativeGradient = true; this.stops = []; }
  addColorStop(offset, color) {
    if (typeof offset !== 'number' || offset < 0 || offset > 1 || !Number.isFinite(offset)) throw new RangeError('offset');
    if (css(color) === undefined) throw new TypeError('color');
    this.stops.push([offset, color]);
  }
}
class NativeContext {
  constructor(canvas) { this.canvas = canvas; this.calls = {}; this.reads = {}; this.writes = {}; this.pixels = 0; this.reset(); }
  count(name) { this.calls[name] = (this.calls[name] || 0) + 1; }
  reset() { this.values = {...defaults}; this.dash = []; this.matrix = ID.slice(); this.stack = []; }
  save() { this.count('save'); this.stack.push({values: {...this.values}, dash: this.dash.slice(), matrix: this.matrix.slice()}); }
  restore() { this.count('restore'); const old = this.stack.pop(); if (old) Object.assign(this, old); }
  setTransform(...values) { this.matrix = values.slice(); }
  resetTransform() { this.matrix = ID.slice(); }
  getTransform() { return Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((name, i) => [name, this.matrix[i]])); }
  transform(a, b, c, d, e, f) {
    const m = this.matrix;
    this.matrix = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d,
      m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(a) { this.transform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); }
  setLineDash(values) { if (values.every(v => Number.isFinite(v) && v >= 0)) this.dash = values.slice(); }
  getLineDash() { return this.dash.slice(); }
  createLinearGradient() { this.count('createLinearGradient'); return new Gradient(); }
  createRadialGradient() { this.count('createRadialGradient'); return new Gradient(); }
  createPattern() { return {nativePattern: true}; }
  drawImage(source) { this.count('drawImage'); this.pixels = source.getContext ? source.getContext('2d').pixels : 123; }
  fillRect() { this.count('fillRect'); this.pixels++; }
  measureText(text) { this.count('measureText'); return {width: text.length}; }
}
for (const name of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'rect', 'roundRect', 'arc', 'ellipse', 'quadraticCurveTo',
  'bezierCurveTo', 'arcTo', 'clip', 'strokeRect', 'clearRect', 'fill', 'stroke', 'fillText', 'strokeText', 'putImageData']) {
  NativeContext.prototype[name] = function() { this.count(name); };
}
for (const [name, initial] of Object.entries(defaults)) {
  Object.defineProperty(NativeContext.prototype, name, {configurable: true, enumerable: true,
    get() { this.reads[name] = (this.reads[name] || 0) + 1; return this.values[name]; },
    set(input) {
      this.writes[name] = (this.writes[name] || 0) + 1;
      let value = input;
      if (['fillStyle', 'strokeStyle', 'shadowColor'].includes(name)) { value = css(input); if (value === undefined) return; }
      else if (typeof initial === 'number') {
        value = Number(input); if (!Number.isFinite(value)) return;
        if (name === 'globalAlpha' && (value < 0 || value > 1)) return;
        if (['lineWidth', 'miterLimit'].includes(name) && value <= 0) return;
        if (name === 'shadowBlur' && value < 0) return;
      } else if (typeof initial === 'boolean') value = Boolean(input);
      else {
        value = String(input);
        const enums = {lineCap: ['butt', 'round', 'square'], lineJoin: ['miter', 'round', 'bevel'], textAlign: ['start', 'end', 'left', 'right', 'center']};
        if (enums[name] && !enums[name].includes(value)) return;
      }
      this.values[name] = value;
    }
  });
}
class Canvas {
  constructor() { this._width = 128; this._height = 96; this.context = new NativeContext(this); }
  get width() { return this._width; }
  set width(value) { this._width = Number(value) >>> 0; this.context.reset(); this.context.pixels = 0; }
  get height() { return this._height; }
  set height(value) { this._height = Number(value) >>> 0; this.context.reset(); this.context.pixels = 0; }
  getContext() { return this.context; }
}
function fixture(body) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {createElement: () => new Canvas()};
  try { const canvas = new Canvas(), r = new Recorder(canvas, canvas.context); return body(r, r.context); }
  finally { if (old) Object.defineProperty(globalThis, 'document', old); else delete globalThis.document; }
}
function finish(r, h) { const frame = r.end(), decoded = h.decode(frame); if (frame.reference) assert.deepStrictEqual(decoded, frame.reference); return {frame, decoded}; }
function paintAll(g, source) {
  g.fillRect(-0, 1 / 3, 17, 8); g.strokeRect(1, 2, 3, 4); g.clearRect(2, 3, 4, 5);
  g.fillText('夜 🌙 \u0000 e\u0301', 0.12345678901234567, -0); g.strokeText('stroke', 3, 4, undefined);
  g.beginPath(); g.moveTo(-0, 0.000000000000001); g.lineTo(20, 30); g.rect(1, 2, -3, 4);
  g.roundRect(1, 2, 3, 4, [{x: 1, y: 2}, 3, {y: 4}, {x: 5, y: 6, z: 0, w: 1}]);
  g.arc(1, 2, 3, 0, Math.PI, true); g.ellipse(1, 2, 3, 4, 0, 0, Math.PI, false);
  g.quadraticCurveTo(1, 2, 3, 4); g.bezierCurveTo(1, 2, 3, 4, 5, 6); g.arcTo(1, 2, 3, 4, 5); g.closePath();
  g.fill('evenodd'); g.stroke();
  g.drawImage(source, 0, 0); g.drawImage(source, 1, 2, 3, 4); g.drawImage(source, 1, 2, 3, 4, 5, 6, 7, 8);
}

test('browser-like UMD exports without a codec or Recorder global', () => {
  const scope = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, 'direct-writer604.js'), 'utf8'), scope);
  assert.equal(typeof scope.TownDirect604.install, 'function');
});
test('fast raw emission exactly matches a real Recorder across every supported paint kind', () => fixture((r, g) => {
  const source = {width: 12, height: 8};
  r.begin(); paintAll(g, source); const expected = r.end();
  const h = install(r);
  try {
    r.begin(); paintAll(g, source); const {frame, decoded} = finish(r, h);
    decoded.producerMs = expected.producerMs; assert.deepStrictEqual(decoded, expected);
    assert.equal(frame.commands.length, 10 * COMMAND_STRIDE); assert.equal(frame.states.length, STATE_STRIDE);
    assert.deepEqual(Array.from({length: frame.commandCount}, (_, i) => KINDS[frame.commands[i * COMMAND_STRIDE]]), expected.commands.map(c => c.kind));
    assert.equal(decoded.commands[0].state, decoded.commands[9].state);
    assert.equal(decoded.commands[5].path, decoded.commands[6].path);
    assert.equal(decoded.commands[7].image, decoded.commands[9].image);
    assert.equal(decoded.commands[7].image.source, source); assert.equal(frame.commands[4], NONE);
    assert.equal(h.stats.avoided.commandObjects, 10); assert.equal(h.stats.retained.pathArrays, 1);
    assert.equal(h.stats.retained.uniquePathOperationObjects, 11); assert.equal(h.stats.nativeReady, false);
  } finally { h.restore(); }
}));
test('fast paints never call legacy state/style, commands.push, encode, or JSON', () => fixture((r, g) => {
  const h = install(r), stringify = JSON.stringify, style = r.style;
  try {
    r.begin(); r.commands.push = () => { throw Error('legacy commands.push'); };
    r.style = () => { throw Error('legacy style'); };
    JSON.stringify = () => { throw Error('JSON'); };
    // Override the installed state entrypoint too: fast paints invoke their
    // private typed emitter, never a public legacy/state-object producer.
    r.state = () => { throw Error('state'); };
    g.fillRect(1, 2, 3, 4); g.strokeRect(1, 2, 3, 4); g.beginPath(); g.rect(0, 0, 3, 4); g.fill(); g.stroke();
    g.drawImage({width: 4, height: 4}, 0, 0); g.fillText('text', 0, 0); g.clearRect(0, 0, 1, 1); g.strokeText('text', 1, 2);
    const {decoded} = finish(r, h); assert.equal(decoded.commands.length, 8); assert.equal(r.commands.length, 0);
  } finally { JSON.stringify = stringify; r.style = style; h.restore(); }
}));
test('mirror emits original commands once on the same native/game draw', () => fixture((r, g) => {
  let calls = 0; const old = r.call;
  r.call = function(name, args) { if (['fillRect', 'drawImage', 'fillText'].includes(name)) calls++; return old.call(this, name, args); };
  const h = install(r, {mirror: true});
  try {
    r.begin(); g.fillRect(1, 2, 3, 4); g.fillRect(5, 6, 7, 8); g.fillText('once', 1, 2); g.drawImage({width: 8, height: 8}, 0, 0);
    const {frame, decoded} = finish(r, h);
    assert.equal(calls, 4); assert.equal(frame.reference.commands.length, 4); assert.equal(decoded.commands.length, 4);
    assert.equal(typeof r.snapshot, 'object'); assert.equal(frame.reference.commands[0].state, r.snapshot);
    assert.equal(r.native.calls.fillRect || 0, 0, 'Recorder paints did not execute on native backend');
    assert.equal(h.stats.avoided.commandObjects, 0); assert.equal(h.stats.mode, 'mirror-verification');
  } finally { h.restore(); }
}));
for (const mirror of [false, true]) {
  test(`gradient revisions and all canonical state fields survive one draw (mirror=${mirror})`, () => fixture((r, g) => {
    const h = install(r, {mirror});
    try {
      r.begin();
      const linear = g.createLinearGradient(-0, 1 / 3, 128, 0.12345678901234567);
      linear.addColorStop(1, '#fff'); linear.addColorStop(0.5, 'red'); linear.addColorStop(0.5, 'blue'); linear.addColorStop(-0, 'transparent');
      const radial = g.createRadialGradient(1, 2, 0, 3, 4, 5); radial.addColorStop(0, '#102030'); radial.addColorStop(1, '#abc');
      Object.assign(g, {fillStyle: linear, strokeStyle: radial, globalAlpha: 0.23456789012345678,
        globalCompositeOperation: 'destination-over', filter: 'brightness(0%)', imageSmoothingEnabled: false, imageSmoothingQuality: 'high',
        lineWidth: 1 + Number.EPSILON, lineCap: 'round', lineJoin: 'bevel', miterLimit: 12.345, lineDashOffset: -0,
        shadowBlur: 0.333, shadowColor: 'rgba(255, 100, 22, 0.527)', shadowOffsetX: -0, shadowOffsetY: Number.MIN_VALUE,
        font: 'italic 500 13.5px "Noto Sans TC", serif', textAlign: 'end', textBaseline: 'hanging', direction: 'rtl'});
      g.setLineDash([0.1, 0, Number.MIN_VALUE, 10]); g.setTransform(0.3, -0.2, 0.125, 1.7, 31.1, -0);
      g.fillRect(-0, Number.MIN_VALUE, 1 + Number.EPSILON, 1 / 3); g.strokeRect(0, 0, 1, 1);
      linear.addColorStop(1, 'blue'); g.fillRect(1, 2, 3, 4);
      assert.throws(() => linear.addColorStop(-1, 'red'), RangeError); g.fillRect(2, 3, 4, 5);
      const {decoded} = finish(r, h), first = decoded.commands[0].state, next = decoded.commands[2].state;
      assert.equal(first, decoded.commands[1].state); assert.equal(next, decoded.commands[3].state);
      assert.equal(first.fillStyle.version, 4); assert.equal(next.fillStyle.version, 5);
      assert.deepEqual(first.fillStyle.stops.map(s => s.offset), [1, 0.5, 0.5, -0]);
      assert.equal(Object.is(first.lineDashOffset, -0), true); assert.equal(Object.is(first.transform[5], -0), true);
      assert.equal(Object.is(decoded.commands[0].args[0], -0), true); assert.equal(first.shadowOffsetY, Number.MIN_VALUE);
      assert.equal(r.shadow.calls.createLinearGradient, 1); assert.equal(h.stats.retained.gradientRows, 3);
    } finally { h.restore(); }
  }));
  test(`save/restore, transforms, held-path copy-on-write and clips match (mirror=${mirror})`, () => fixture((r, g) => {
    g.lineWidth = 3; g.save(); g.lineWidth = 5;
    const h = install(r, {mirror});
    try {
      r.begin(); g.fillRect(0, 0, 1, 1); g.save(); g.fillStyle = 'red'; g.setLineDash([2, 3]);
      g.translate(4, 5); g.scale(2, 3); g.rotate(0.2); g.beginPath(); g.rect(0, 0, 10, 10); g.clip('evenodd'); g.fill();
      g.lineTo(50, 60); g.stroke(); g.save(); g.fillStyle = 'blue'; g.setTransform(2, 0, 0, 2, 8, 9); g.fillRect(1, 2, 3, 4);
      g.restore(); g.fillRect(2, 3, 4, 5); g.restore(); g.fillRect(3, 4, 5, 6); g.restore(); g.fillRect(4, 5, 6, 7);
      g.restore(); g.fillRect(5, 6, 7, 8);
      const {decoded} = finish(r, h), commands = decoded.commands;
      assert.equal(commands[1].path, commands[1].state.clips[0].path); assert.notEqual(commands[1].path, commands[2].path);
      assert.equal(commands[1].path.length + 1, commands[2].path.length); assert.deepEqual(commands[1].state, commands[4].state);
      assert.equal(commands[5].state.lineWidth, 5); assert.equal(commands[6].state.lineWidth, 3); assert.equal(commands[7].state.lineWidth, 3);
      assert.deepEqual(commands[5].state.clips, []); assert.deepEqual(commands[5].state.transform, ID);
    } finally { h.restore(); }
  }));
  test(`source revisions and pixel snapshots stay live until end (mirror=${mirror})`, () => fixture((r, g) => {
    const h = install(r, {mirror}), source = new Canvas(), sg = source.context;
    try {
      r.begin(); sg.fillRect(0, 0, 1, 1); g.drawImage(source, 0, 0); g.drawImage(source, 1, 1);
      sg.fillRect(0, 0, 1, 1); g.drawImage(source, 2, 2);
      source.width = 24; sg.fillRect(0, 0, 1, 1); g.drawImage(source, 3, 3);
      source.height = 18; sg.fillRect(0, 0, 1, 1); g.drawImage(source, 4, 4);
      const {frame, decoded} = finish(r, h), images = decoded.commands.map(c => c.image);
      assert.equal(images[0], images[1]); assert.notEqual(images[0].source, source); assert.notEqual(images[2].source, source);
      assert.equal(images[0].source.context.pixels, 1); assert.equal(images[2].source.context.pixels, 2);
      assert.equal(images[0].width, 128); assert.equal(images[3].width, 24); assert.equal(images[4].height, 18);
      assert.equal(images[4].source, source); assert.equal(frame.imageSnapshots, 3); assert.equal(frame.resources.length, 4);
      assert.equal(frame.imageSnapshotBytes, 128 * 96 * 4 * 2 + 24 * 96 * 4);
      assert.ok(images[0].revision < images[2].revision && images[2].revision < images[3].revision && images[3].revision < images[4].revision);
      const captured = images[0].source; sg.fillRect(0, 0, 1, 1); assert.equal(images[0].source, captured);
    } finally { h.restore(); }
  }));
}
test('native ignored, converting and throwing setters remain authoritative', () => fixture((r, g) => {
  const h = install(r, {mirror: true});
  try {
    r.begin(); g.lineWidth = 3; g.globalAlpha = 0.4; g.fillStyle = 'RED'; g.fillRect(0, 0, 1, 1);
    for (const value of [0, -1, NaN, Infinity]) { g.lineWidth = value; g.fillRect(0, 0, 1, 1); }
    for (const value of [-1, 2, NaN]) { g.globalAlpha = value; g.fillRect(0, 0, 1, 1); }
    g.fillStyle = 'invalid'; g.lineCap = 'invalid'; assert.throws(() => { g.lineWidth = Symbol('bad'); }, TypeError);
    let conversions = 0; g.lineWidth = {valueOf() { conversions++; return 7; }}; g.fillRect(0, 0, 1, 1);
    const {decoded} = finish(r, h); assert.equal(conversions, 1);
    for (const command of decoded.commands.slice(0, -1)) assert.equal(command.state.lineWidth, 3);
    assert.equal(decoded.commands.at(-1).state.lineWidth, 7); assert.equal(decoded.commands.at(-1).state.fillStyle, '#ff0000');
    assert.equal(decoded.commands.at(-1).state.lineCap, 'butt');
  } finally { h.restore(); }
}));
test('same-value main canvas dimensions discard prior paints and refresh native state', () => fixture((r, g) => {
  const h = install(r, {mirror: true});
  try {
    r.begin(); g.lineWidth = 8; g.save(); g.fillRect(0, 0, 1, 1); r.canvas.width = r.canvas.width;
    g.restore(); g.fillRect(3, 4, 5, 6); const {decoded} = finish(r, h);
    assert.equal(decoded.commands.length, 1); assert.equal(decoded.commands[0].state.lineWidth, 1);
    assert.equal(h.stats.resizeResets, 1); assert.equal(h.stats.discardedCommands, 1);
  } finally { h.restore(); }
}));
test('native setter conversion can emit a paint and still invalidate post-write state', () => fixture((r, g) => {
  const h = install(r, {mirror: true});
  try {
    r.begin(); g.lineWidth = 2; g.fillRect(0, 0, 1, 1);
    g.lineWidth = {valueOf() { g.fillRect(1, 1, 2, 2); return 9; }};
    g.fillRect(2, 2, 3, 3); const {decoded} = finish(r, h);
    assert.deepEqual(decoded.commands.map(c => c.state.lineWidth), [2, 2, 9]);
  } finally { h.restore(); }
}));
test('gradient fields preserve separate original snapshots even when their row is shared', () => fixture((r, g) => {
  const h = install(r, {mirror: true});
  try {
    r.begin(); const gradient = g.createLinearGradient(0, 0, 10, 10); gradient.addColorStop(0, 'red');
    g.fillStyle = g.strokeStyle = gradient; g.fillRect(0, 0, 1, 1); g.lineWidth = 2; g.fillRect(1, 1, 2, 2);
    const {decoded} = finish(r, h), first = decoded.commands[0].state, next = decoded.commands[1].state;
    assert.notEqual(first.fillStyle, first.strokeStyle); assert.notEqual(first.fillStyle, next.fillStyle);
    first.fillStyle.stops[0].color = '#000000'; assert.equal(next.fillStyle.stops[0].color, '#ff0000');
    assert.equal(h.stats.retained.gradientRows, 1); assert.equal(h.stats.decode.gradients, 4);
  } finally { h.restore(); }
}));
test('expired/forged handles reject; independently decoded values outlive reuse and restore', () => fixture((r, g) => {
  const h = install(r), source = {width: 3, height: 4};
  r.begin(); g.beginPath(); g.rect(0, 0, 3, 4); g.fill(); g.drawImage(source, 0, 0);
  const {frame, decoded} = finish(r, h); const originalPath = r.path;
  assert.notEqual(decoded.commands[0].path, originalPath); assert.notEqual(decoded.commands[0].path[1].args, originalPath[1].args);
  assert.throws(() => h.decode({...frame}), /forged/);
  r.begin(); assert.throws(() => h.inspect(frame), /expired/); g.fillStyle = 'red'; g.fillRect(9, 9, 9, 9); const next = r.end();
  assert.equal(decoded.commands[0].state.fillStyle, '#000000'); assert.equal(decoded.commands[1].image.source, source);
  h.restore(); assert.throws(() => h.decode(next), /expired/); assert.equal(r.snapshot, null);
  assert.equal(r.state().fillStyle, '#ff0000'); h.restore();
}));
test('restore preserves method descriptors and rereads current native state after failed draw', () => fixture((r, g) => {
  g.lineWidth = 3; const stale = r.state(), before = Object.fromEntries(['begin', 'state', 'call', 'end', 'ensureSize'].map(k => [k, Object.getOwnPropertyDescriptor(r, k)]));
  const h = install(r); assert.throws(() => install(r), /already installed/);
  r.begin(); g.lineWidth = 9; g.fillRect(0, 0, 1, 1); assert.throws(() => g.putImageData({}, 0, 0), /unsupported/);
  h.restore(); assert.equal(r.inFrame, false); assert.equal(r.snapshot, null); assert.notEqual(r.state(), stale); assert.equal(r.state().lineWidth, 9);
  for (const key of Object.keys(before)) assert.deepEqual(Object.getOwnPropertyDescriptor(r, key), before[key]);
  install(r).restore();
}));
test('small arenas grow, copy and reuse; clip indexes remain correct across word arena growth', () => fixture((r, g) => {
  const h = install(r, {mirror: true, initialCommands: 0, initialStates: 0, initialWords: 0, initialNumbers: 0});
  try {
    function draw() {
      for (let i = 0; i < 6; i++) { g.beginPath(); g.rect(i, i, 3, 4); g.clip(); }
      g.fill(); g.lineWidth = 2; g.fillRect(1, 2, 3, 4);
    }
    r.begin(); draw(); const first = finish(r, h); assert.ok(Object.values(first.frame.stats.arenas).every(a => a.growths > 0));
    assert.ok(first.frame.stats.arenas.words.copiedBytes > 0);
    const capacities = Object.fromEntries(Object.entries(first.frame.stats.arenas).map(([k, a]) => [k, a.capacity]));
    r.canvas.width = r.canvas.width; r.begin(); draw(); const second = finish(r, h);
    for (const [name, a] of Object.entries(second.frame.stats.arenas)) { assert.equal(a.capacity, capacities[name]); assert.equal(a.growths, 0); }
    assert.equal(first.frame.stats.arenas.words.growths > 0, true, 'old stats are independent snapshots');
    assert.equal(Object.isFrozen(first.frame.stats), true); assert.equal(Object.isFrozen(first.frame.stats.arenas.words), true);
    assert.equal(Object.isFrozen(h.inspect(second.frame).decode), true);
    assert.equal(h.stats.decode.commands, 2); assert.ok(h.stats.decode.objects > 2); assert.ok(h.stats.decode.ms >= 0);
  } finally { h.restore(); }
}));
test('unsupported semantics poison a frame; no incomplete packet can be accepted', () => {
  const cases = [
    [(r, g) => g.fill({}), /Path2D/], [(r, g) => g.clip({}), /Path2D/],
    [(r, g) => g.drawImage(r.canvas, 0, 0), /self-image/], [(r, g) => g.putImageData({}, 0, 0), /unsupported/],
    [(r, g) => { g.fillStyle = g.createPattern({}, 'repeat'); g.fillRect(0, 0, 1, 1); }, /pattern/],
    [(r, g) => g.fillRect(0, 0, NaN, 1), /finite/], [(r, g) => g.fillRect(0, 0, 1), /count/],
    [(r, g) => g.fillRect(0, 0, null, 1), /numeric/],
    [(r, g) => g.fillText({}, 0, 0), /text/], [(r, g) => g.stroke('evenodd'), /argument/],
    [(r, g) => { g.beginPath(); g.roundRect(0, 0, 1, 1, [{x: 1, extra: 2}]); g.fill(); }, /radius/]
  ];
  for (const [draw, pattern] of cases) fixture((r, g) => {
    const h = install(r); try {
      r.begin(); assert.throws(() => draw(r, g), error => error instanceof DirectError && pattern.test(error.message));
      assert.equal(h.stats.accepted, false); assert.throws(() => g.fillRect(0, 0, 1, 1), pattern); assert.throws(() => r.end(), pattern);
    } finally { h.restore(); }
  });
});
test('bounded limits and installation validation fail visibly', () => {
  const cases = [
    [{initialCommands: 0, maxCommands: 0}, g => g.fillRect(0, 0, 1, 1), /command/],
    [{initialStates: 0, maxStates: 0}, g => g.fillRect(0, 0, 1, 1), /state/],
    [{initialNumbers: 0, maxNumbers: 1}, g => g.fillRect(0, 0, 1, 1), /number/],
    [{initialWords: 0, maxWords: 1}, g => g.fillRect(0, 0, 1, 1), /word/],
    [{maxStrings: 0}, g => g.fillRect(0, 0, 1, 1), /string/],
    [{maxStringCodeUnits: 1}, g => g.fillRect(0, 0, 1, 1), /string/],
    [{maxResources: 0}, g => g.drawImage({width: 1, height: 1}, 0, 0), /resource/],
    [{maxPaths: 0}, g => g.fill(), /path/],
    [{maxPathOperations: 0}, g => { g.beginPath(); g.fill(); }, /path operation/]
  ];
  for (const [options, draw, pattern] of cases) fixture((r, g) => {
    const h = install(r, options); try { r.begin(); assert.throws(() => draw(g), pattern); assert.throws(() => r.end(), pattern); } finally { h.restore(); }
  });
  fixture(r => {
    assert.throws(() => install(r, {unexpected: 1}), /unknown/); assert.throws(() => install(r, {mirror: 1}), /boolean/);
    assert.throws(() => install(r, {initialWords: 20, maxWords: 10}), /initial/); assert.throws(() => install(r, {maxCommands: -1}), /integer/);
    r.begin(); assert.throws(() => install(r), /idle/); r.end();
  });
});
test('outside-frame native paints and method proxies retain their original closure', () => fixture((r, g) => {
  const fillRect = g.fillRect, h = install(r);
  try {
    fillRect(0, 0, 1, 1); assert.equal(r.native.calls.fillRect, 1);
    r.begin(); fillRect(0, 0, 2, 2); assert.equal(g.measureText('abc').width, 3); assert.throws(() => r.begin(), /recursively/);
    const {decoded} = finish(r, h); assert.equal(decoded.commands.length, 1); assert.equal(r.native.calls.fillRect, 1);
  } finally { h.restore(); }
  fillRect(0, 0, 3, 3); assert.equal(r.native.calls.fillRect, 2);
}));
