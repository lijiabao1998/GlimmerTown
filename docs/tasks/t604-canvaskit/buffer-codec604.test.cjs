'use strict';
// Representation contracts only: no browser, game/model advance or FPS claim.
// node --test docs/tasks/t604-canvaskit/buffer-codec604.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {Codec, CodecError, COMMAND_STRIDE, KINDS, NONE} = require('./buffer-codec604.js');
const {Recorder} = require('../../../renderers/t604-recorder.js');
const ID = [1, 0, 0, 1, 0, 0];
const defaults = {fillStyle: '#000000', strokeStyle: '#000000', globalAlpha: 1,
  globalCompositeOperation: 'source-over', filter: 'none', imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
  lineDashOffset: 0, shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetX: 0,
  shadowOffsetY: 0, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', direction: 'inherit'};
const state = overrides => ({...defaults, transform: ID.slice(), dash: [], clips: [], ...overrides});
const command = (kind = 'fillRect', args = [0, 0, 20, 20], s = state()) => ({kind, args, state: s});
const packet = commands => ({width: 128, height: 96, commands: commands || [command()], faults: [], producerMs: 1.23456789012345,
  imageSnapshots: 0, imageSnapshotBytes: 0});
function roundtrip(p, options) { const codec = new Codec(options), handle = codec.encode(p), result = codec.decode(handle); assert.deepStrictEqual(result, p); return {codec, handle, result}; }
function rejects(p, pattern) { assert.throws(() => new Codec().encode(p), error => error instanceof CodecError && (!pattern || pattern.test(error.message))); }
const op = (name, args = [], transform = ID.slice()) => ({name, args, transform});
const allPath = () => [op('beginPath'), op('moveTo', [-0, 0.12345678901234567]), op('lineTo', [100, 20], [2, 0.125, -0.75, 0.5, 21, 8]),
  op('rect', [20, 10, -15, 20]), op('roundRect', [0, 0, 50, 50]), op('roundRect', [0, 0, 50, 50, undefined]),
  op('roundRect', [0, 0, 50, 50, 3]), op('roundRect', [0, 0, 50, 50, [{x: 1, y: 2}, 3, {y: 4}, {x: 5, y: 6, z: 0, w: 1}]]),
  op('arc', [20, 20, 5, 0, 2 * Math.PI]), op('arc', [20, 20, 5, 0, 2 * Math.PI, true]),
  op('ellipse', [20, 20, 10, 5, 0.2, 0, 2 * Math.PI]), op('ellipse', [20, 20, 10, 5, 0.2, 0, 2 * Math.PI, false]),
  op('quadraticCurveTo', [1, 2, 3, 4]), op('bezierCurveTo', [1, 2, 3, 4, 5, 6]), op('arcTo', [1, 2, 3, 4, 5]), op('closePath')];
function gradients() {
  return {linear: {id: 1, version: 5, type: 'linear', args: [-0, 1 / 3, 128, 0.12345678901234567],
    stops: [{offset: 1, color: '#ffffff'}, {offset: 0.5, color: 'rgba(7, 15, 239, 0.123)'},
      {offset: 0.5, color: '#000000'}, {offset: -0, color: 'color(display-p3 1 0.2 0.3)'}, {offset: 0, color: 'transparent'}]},
  radial: {id: 2, version: 2, type: 'radial', args: [1, 2, 0, 3, 4, 5],
    stops: [{offset: 0, color: '#102030'}, {offset: 1, color: 'rgba(0, 0, 0, 0)'}]}};
}

test('UMD exports work in an isolated browser-like realm', () => {
  const scope = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, 'buffer-codec604.js'), 'utf8'), scope);
  assert.equal(typeof scope.TownBuffer604.Codec, 'function');
  const codec = new scope.TownBuffer604.Codec(), result = codec.decode(codec.encode(packet()));
  assert.equal(result.commands[0].kind, 'fillRect'); assert.equal(result.producerMs, packet().producerMs);
  assert.equal(Object.is(result.commands[0].state.transform[0], 1), true);
});

test('all recorder paint kinds stay in their original order with explicit state/resource indexes', () => {
  const source = {width: 16, height: 8, opaquePixels: Symbol('not serialized')}, s = state(), path = allPath();
  const image = {id: 42, revision: 8, width: 16, height: 8, source};
  const commands = [command('fillRect', [1, 2, 3, 4], s), command('strokeRect', [2, 3, 4, 5], s), command('clearRect', [-0, 0, 128, 96], s),
    {...command('fill', ['evenodd'], s), path}, {...command('stroke', [], s), path},
    {...command('image', [0, 0], s), image}, {...command('image', [4, 8, -16, 24], s), image},
    {...command('image', [1, 2, 3, 4, 5, 6, 7, 8], s), image},
    command('fillText', ['夜 🌙 \u0000 e\u0301', 1.1, 2.2], s), command('strokeText', ['Hello', 4, 5, 6], s)];
  const {codec, handle, result} = roundtrip(packet(commands));
  assert.equal(handle.commands.length, commands.length * COMMAND_STRIDE);
  assert.deepEqual(Array.from({length: commands.length}, (_, i) => KINDS[handle.commands[i * COMMAND_STRIDE]]), commands.map(c => c.kind));
  assert.equal(handle.stateCount, 1); assert.equal(handle.stats.stateIdentityHits, 9);
  assert.equal(handle.resources.length, 1); assert.equal(handle.stats.tables.resourceIdentityHits, 2);
  assert.equal(handle.commands[4], NONE); assert.equal(handle.commands[5 * COMMAND_STRIDE + 4], 0);
  assert.equal(result.commands[5].image.source, source); assert.equal(handle.resources[0].source, source);
  assert.equal(result.commands[0].state, result.commands[9].state);
  assert.equal(result.commands[3].path, result.commands[4].path);
  assert.equal(result.commands[5].image, result.commands[7].image);
  assert.equal(codec.inspect(handle).decode.commands, commands.length);
});

test('every state field, gradients, duplicate stop order, deep paths, clips and radii roundtrip', () => {
  const {linear, radial} = gradients(), path = allPath();
  const firstClip = {path, rule: 'evenodd'}, secondClip = {path: [op('rect', [1, 2, 3, 4])], rule: 'nonzero'};
  const s = state({fillStyle: linear, strokeStyle: radial, globalAlpha: 0.23456789012345678,
    globalCompositeOperation: 'destination-over', filter: 'brightness(0%)', imageSmoothingEnabled: false,
    imageSmoothingQuality: 'high', lineWidth: 1.0000000000000002, lineCap: 'round', lineJoin: 'bevel',
    miterLimit: 12.345, lineDashOffset: -0, dash: [0.1, 0, 0.000000000000000001, 10], shadowBlur: 0.333,
    shadowColor: 'rgba(255, 100, 22, 0.527)', shadowOffsetX: -0, shadowOffsetY: Number.MIN_VALUE,
    font: 'italic 500 13.5px "Noto Sans TC", serif', textAlign: 'end', textBaseline: 'hanging', direction: 'rtl',
    transform: [0.3, -0.2, 0.125, 1.7, 31.1, -0], clips: [firstClip, secondClip]});
  const {result} = roundtrip(packet([{...command('fill', [undefined], s), path}, {...command('stroke', [], s), path}]));
  assert.equal(result.commands[0].path, result.commands[0].state.clips[0].path);
  assert.deepEqual(result.commands[0].state.fillStyle.stops.map(x => x.color), linear.stops.map(x => x.color));
  assert.equal(Object.is(result.commands[0].state.lineDashOffset, -0), true);
});

test('Float64 values and -0 retain Object.is equality without epsilon or Float32 conversion', () => {
  const values = [-0, Number.MIN_VALUE, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, 1.0000000000000002, 16777217, 1 / 3, -1e-300];
  const p = packet(values.map(n => command('fillRect', [n, n, n, n])));
  p.diagnostics = {numbers: [NaN, Infinity, -Infinity, -0], absentValue: undefined};
  const {handle, result} = roundtrip(p);
  assert.equal(handle.numbers instanceof Float64Array, true);
  values.forEach((n, i) => result.commands[i].args.forEach(out => assert.equal(Object.is(n, out), true)));
  p.diagnostics.numbers.forEach((n, i) => assert.equal(Object.is(n, result.diagnostics.numbers[i]), true));
});

test('diagnostic metadata is copied in full, including null prototypes and safe __proto__ keys', () => {
  const p = packet(); p.extra = Object.assign(Object.create(null), {sourceName: 'snapshot', nested: [true, false, null, undefined, '']});
  Object.defineProperty(p.extra, '__proto__', {value: {safe: 'value'}, enumerable: true});
  p.replayMs = 0.01234567890123456; p.totalDrawMs = 165.4321098765432; p.faults = ['native text fallback'];
  const {result} = roundtrip(p);
  assert.equal(Object.getPrototypeOf(result.extra), null); assert.equal(result.extra.__proto__.safe, 'value');
  assert.equal(own(result, 'producerMs'), true); assert.equal(own(result.extra.nested, 3), true);
});
function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }

test('identity-only dedup keeps separate equal states distinct and save-derived shared state/path references shared', () => {
  const a = state(), b = state(), shared = allPath();
  a.clips = b.clips = [{path: shared, rule: 'nonzero'}];
  const p = packet([command('fillRect', [0, 0, 1, 1], a), command('fillRect', [1, 0, 1, 1], b),
    {...command('fill', [], a), path: shared}, {...command('stroke', [], b), path: shared}]);
  const {handle, result} = roundtrip(p);
  assert.equal(handle.stateCount, 2); assert.equal(handle.stats.stateIdentityHits, 2);
  assert.notEqual(result.commands[0].state, result.commands[1].state);
  assert.equal(result.commands[0].state, result.commands[2].state);
  assert.equal(result.commands[0].state.clips, result.commands[1].state.clips);
  assert.equal(result.commands[2].path, result.commands[0].state.clips[0].path);
});

test('encoded data snapshots plain inputs, while resource source stays an explicit external identity', () => {
  const source = {width: 16, height: 16}, image = {id: 1, revision: 1, width: 16, height: 16, source};
  const p = packet([{...command('image', [1, 2]), image}]);
  const codec = new Codec(), handle = codec.encode(p);
  p.commands[0].args[0] = 99; p.commands[0].state.fillStyle = '#abcdef'; p.producerMs = 999;
  image.id = 8; image.revision++; image.width = 9; image.source = {};
  const decoded = codec.decode(handle);
  assert.equal(decoded.commands[0].args[0], 1); assert.equal(decoded.commands[0].state.fillStyle, '#000000');
  assert.notEqual(decoded.producerMs, 999); assert.deepEqual(decoded.commands[0].image, {id: 1, revision: 1, width: 16, height: 16, source});
  assert.equal(decoded.commands[0].image.source, source);
  decoded.commands[0].state.fillStyle = 'changed'; decoded.commands[0].image.revision = 77;
  assert.equal(codec.decode(handle).commands[0].state.fillStyle, '#000000');
  assert.equal(codec.decode(handle).commands[0].image.revision, 1);
});

test('image source/revision/dimensions updates survive same-frame snapshots and later encodes', () => {
  const live = {width: 16, height: 16}, copy = {width: 16, height: 16};
  const old = {id: 7, revision: 8, width: 16, height: 16, source: copy}, next = {id: 7, revision: 9, width: 16, height: 16, source: live};
  const p = packet([{...command('image', [0, 0]), image: old}, {...command('image', [2, 3]), image: next}]);
  const {codec, handle, result} = roundtrip(p);
  assert.equal(handle.resources.length, 2); assert.equal(result.commands[0].image.source, copy); assert.equal(result.commands[1].image.source, live);
  next.revision++; next.width = 32; live.width = 32;
  const update = codec.encode(p); assert.equal(codec.decode(update).commands[1].image.width, 32);
  assert.equal(codec.decode(update).commands[1].image.revision, 10);
});

test('conflicting same-id/revision resources reject instead of silently picking a source', () => {
  const source = {}, a = {id: 1, revision: 0, width: 10, height: 10, source};
  const make = image => ({...command('image', [0, 0]), image});
  rejects(packet([make(a), make({...a, source: {}})]), /conflicting image/);
  rejects(packet([make(a), make({...a, width: 20})]), /conflicting image/);
  const {handle} = roundtrip(packet([make(a), make({...a})])); assert.equal(handle.resources.length, 2);
});

test('arenas grow within limits then reuse their backing buffers; immutable stats remain snapshots', () => {
  const codec = new Codec({initialWords: 4, initialNumbers: 0, maxWords: 65536, maxNumbers: 16384});
  const p = packet(Array.from({length: 100}, (_, i) => command('fillRect', [i, i + 1 / 3, 5, 6])));
  const first = codec.encode(p), snapshot = codec.inspect(first), json = JSON.stringify(snapshot);
  assert.ok(first.stats.typed.growths > 0); assert.ok(first.stats.typed.growthAllocatedBytes > 0);
  const wordBuffer = first.opcodes.buffer, numberBuffer = first.numbers.buffer;
  assert.deepEqual(codec.decode(first), p);
  const second = codec.encode(p);
  assert.equal(second.opcodes.buffer, wordBuffer); assert.equal(second.numbers.buffer, numberBuffer);
  assert.equal(second.stats.typed.growths, 0); assert.equal(second.stats.typed.growthCopiedBytes, 0);
  assert.equal(JSON.stringify(snapshot), json); assert.deepEqual(codec.decode(second), p);
  assert.throws(() => codec.decode(first), /expired/); assert.throws(() => codec.inspect(first), /expired/);
  const smaller = codec.encode(packet([])); assert.equal(smaller.opcodes.buffer, wordBuffer);
  assert.ok(smaller.stats.typed.usedBytes < second.stats.typed.usedBytes); assert.deepEqual(codec.decode(smaller), packet([]));
});

test('handle lifetime guards reject failed next encode attempts, foreign codecs and forged handles', () => {
  const codec = new Codec(), handle = codec.encode(packet());
  const decoded = codec.decode(handle), savedStats = handle.stats;
  assert.throws(() => new Codec().decode(handle), /foreign/);
  assert.throws(() => codec.decode({...handle}), /forged/);
  assert.throws(() => codec.encode(packet([{kind: 'native', name: 'putImageData', args: [], state: state()}])), /unsupported paint command/);
  assert.throws(() => codec.decode(handle), /expired/); assert.equal(codec.inspect().valid, false);
  assert.equal(codec.inspect().decode, null); assert.equal(handle.stats, savedStats); assert.deepEqual(decoded, packet());
  assert.deepEqual(codec.decode(codec.encode(packet())), packet());
});

test('borrowed arrays and resource tables do not change during decode or inspect', () => {
  const source = {}, p = packet([{...command('image', [0, 0]), image: {id: 1, revision: 0, width: 1, height: 1, source}}]);
  const codec = new Codec(), handle = codec.encode(p), words = handle.opcodes.slice(), numbers = handle.numbers.slice();
  const strings = handle.strings.slice(), resources = handle.resources.slice();
  codec.decode(handle); codec.inspect(handle); codec.decode(handle);
  assert.deepEqual(handle.opcodes, words); assert.deepEqual(handle.numbers, numbers); assert.deepEqual(handle.strings, strings);
  assert.deepEqual(handle.resources, resources); assert.equal(handle.resources[0], resources[0]); assert.equal(handle.resources[0].source, source);
});

test('capacity and table accounting match actual exposed data and explicit decode materializations', () => {
  const {codec, handle} = roundtrip(packet()); const stats = codec.inspect(handle);
  assert.equal(stats.encode.typed.words.usedBytes, handle.opcodes.byteLength);
  assert.equal(stats.encode.typed.numbers.usedBytes, handle.numbers.byteLength);
  assert.equal(stats.encode.typed.usedBytes, handle.opcodes.byteLength + handle.numbers.byteLength);
  assert.equal(stats.encode.typed.capacityBytes, handle.opcodes.buffer.byteLength + handle.numbers.buffer.byteLength);
  assert.equal(stats.encode.tables.strings, handle.strings.length);
  assert.equal(stats.encode.tables.stringCodeUnits, handle.strings.reduce((n, s) => n + s.length, 0));
  assert.equal(stats.encode.tables.retainedPlainObjectEntries, 0);
  assert.equal(stats.decode.objects, 3); assert.equal(stats.decode.arrays, 8); assert.equal(stats.decode.total, 11);
  assert.equal(stats.decode.states, 1); assert.equal(stats.decode.commands, 1);
  assert.equal(stats.decode.resourceDescriptors, 0); assert.equal(stats.decode.sourceReferences, 0);
  assert.doesNotThrow(() => JSON.stringify(stats)); assert.match(stats.encode.accounting, /not total V8 heap/);
});

test('all configured limits fail visibly and leave the codec available for a bounded retry', () => {
  assert.throws(() => new Codec({unexpected: 1}), /unknown option/);
  assert.throws(() => new Codec({maxDepth: -1}), /invalid option/);
  assert.throws(() => new Codec({initialWords: 20, maxWords: 10}), /initial arena/);
  assert.throws(() => new Codec({initialWords: 0, maxWords: 3}).encode(packet()), /arena limit/);
  assert.throws(() => new Codec({initialNumbers: 0, maxNumbers: 2}).encode(packet()), /arena limit/);
  assert.throws(() => new Codec({maxCommands: 0}).encode(packet()), /command count/);
  assert.throws(() => new Codec({maxStrings: 0}).encode(packet()), /string table/);
  assert.throws(() => new Codec({maxStringCodeUnits: 1}).encode(packet()), /string table/);
  assert.throws(() => new Codec({maxDepth: 0}).encode(packet()), /depth/);
  const image = {id: 0, revision: 0, width: 1, height: 1, source: {}};
  assert.throws(() => new Codec({maxResources: 0}).encode(packet([{...command('image', [0, 0]), image}])), /resource table/);
  const codec = new Codec({maxCommands: 1}); assert.throws(() => codec.encode(packet([command(), command()])), /command count/);
  assert.deepEqual(codec.decode(codec.encode(packet())), packet());
});

test('native paint, native paths, patterns and unknown rendering fields are visibly unsupported', () => {
  class Path2D {} class CanvasPattern {}
  rejects(packet([{kind: 'native', name: 'reset', args: [], state: state()}]), /unsupported paint command/);
  rejects(packet([{...command('fill', []), path: [], nativePath: new Path2D()}]), /nativePath/);
  rejects(packet([{...command('fill', [new Path2D()]), path: []}]), /Path2D/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({fillStyle: new CanvasPattern()}))]), /opaque\/native/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({fillStyle: {type: 'pattern'}}))]), /gradient\/pattern/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({clips: [{path: [], rule: 'nonzero', nativePath: new Path2D()}]}))]), /nativePath/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({futureCanvasProperty: 1}))]), /futureCanvasProperty/);
  rejects(packet([{...command(), extraPaintSemantics: true}]), /extraPaintSemantics/);
  rejects(packet([{...command('fill', []), path: [op('futurePath', [])]}]), /unsupported path/);
  rejects(packet([{...command('fill', []), path: [{...op('moveTo', [1, 2]), native: true}]}]), /unsupported field native/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({fillStyle: {...gradients().linear, customTransform: ID}}))]), /customTransform/);
});

test('malformed geometry, state, gradients, paths, resources and command shapes never disappear', () => {
  rejects(packet([command('fillRect', [0, 0, NaN, 1])]), /finite/);
  rejects(packet([command('fillRect', [0, 0, 1])]), /argument count/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({transform: [1, 0, 0, 1]}))]), /argument count/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({dash: [Infinity]}))]), /finite/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({imageSmoothingEnabled: 1}))]), /boolean/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({font: {nativeFont: 1}}))]), /string/);
  const missing = state(); delete missing.shadowColor; rejects(packet([command('fillRect', [0, 0, 1, 1], missing)]), /missing field/);
  rejects(packet([command('fill', [])]), /missing path/);
  rejects(packet([{...command('stroke', ['evenodd']), path: []}]), /stroke/);
  rejects(packet([command('fillText', [12, 1, 2])]), /text arguments/);
  rejects(packet([{...command('fill', []), path: [op('arc', [0, 0, 1, 0, 1, 0])]}]), /boolean/);
  rejects(packet([{...command('fill', []), path: [op('roundRect', [0, 0, 1, 1, [{x: 1, custom: 2}]])]}]), /custom/);
  rejects(packet([{...command('fill', []), path: [op('roundRect', [0, 0, 1, 1, []])]}]), /radii count/);
  rejects(packet([command('fillRect', [0, 0, 1, 1], state({fillStyle: {...gradients().linear, stops: [{offset: 2, color: '#fff'}]}}))]), /offset range/);
  rejects(packet([{...command('image', [0, 0]), image: {id: 0, revision: -1, width: 1, height: 1, source: {}}}]), /revision/);
  rejects(packet([{...command('image', [0, 0]), image: {id: 0, revision: 0, width: 1, height: 1, source: null}}]), /source/);
});

test('getters are never invoked, sparse/decorated arrays and opaque/cyclic metadata fail', () => {
  let called = 0; const getter = {get() { called++; return 1; }, enumerable: true};
  const p = packet(); Object.defineProperty(p, 'hiddenMeaning', getter); rejects(p, /accessor/);
  const c = command(); Object.defineProperty(c, 'kind', getter); rejects(packet([c]), /accessor/);
  const s = state(); Object.defineProperty(s, 'lineWidth', getter); rejects(packet([command('fillRect', [0, 0, 1, 1], s)]), /accessor/);
  const args = [0, 0, 1, 1]; Object.defineProperty(args, 0, getter); rejects(packet([command('fillRect', args)]), /accessor/);
  assert.equal(called, 0);
  rejects(packet([command('fillRect', [0, , 1, 1])]), /sparse/);
  const decorated = [0, 0, 1, 1]; decorated.extra = 1; rejects(packet([command('fillRect', decorated)]), /decorated/);
  const symbol = packet(); symbol[Symbol('x')] = 1; rejects(symbol, /symbol/);
  const opaque = packet(); opaque.diagnostics = new Date(); rejects(opaque, /opaque\/native/);
  const cyclic = packet(); cyclic.diagnostics = {}; cyclic.diagnostics.loop = cyclic.diagnostics; rejects(cyclic, /cyclic/);
  const hidden = packet(); Object.defineProperty(hidden, 'secret', {value: 1}); rejects(hidden, /non-enumerable/);
  const inherited = Object.create(Object.assign(Object.create(null), {x: 15, y: 20}));
  rejects(packet([{...command('fill', []), path: [op('roundRect', [0, 0, 40, 40, inherited])]}]), /opaque\/native/);
});

test('codec encode/decode does not use JSON stringify or source readback/calls', () => {
  const source = new Proxy({}, {get() { throw Error('source must remain opaque'); }, ownKeys() { throw Error('source must not be inspected'); }});
  const p = packet([{...command('image', [0, 0]), image: {id: 1, revision: 1, width: 10, height: 10, source}}]);
  const stringify = JSON.stringify; JSON.stringify = () => { throw Error('no JSON serialization'); };
  try {
    const codec = new Codec(), encoded = codec.encode(p), decoded = codec.decode(encoded);
    assert.equal(decoded.commands[0].image.source, source); assert.equal(codec.inspect(encoded).encode.tables.resources, 1);
  } finally { JSON.stringify = stringify; }
});

test('actual Recorder-produced packet shape and save/restore snapshots roundtrip', () => {
  // A small Canvas interface mock lets the REAL recorder build the packet.
  // Native pixel fidelity is deliberately left to the separate browser proof.
  class Context {
    constructor(canvas) { this.canvas = canvas; Object.assign(this, defaults); this.m = ID.slice(); this.d = []; this.saved = []; }
    getTransform() { return Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((name, i) => [name, this.m[i]])); }
    setTransform(...args) { this.m = args.slice(); }
    getLineDash() { return this.d.slice(); } setLineDash(d) { this.d = d.slice(); }
    save() { this.saved.push({fillStyle: this.fillStyle, m: this.m.slice(), d: this.d.slice()}); }
    restore() { const saved = this.saved.pop(); if (saved) Object.assign(this, saved); }
    beginPath() {} moveTo() {} lineTo() {} closePath() {} clip() {} fill() {} stroke() {} fillRect() {} strokeRect() {} clearRect() {} fillText() {} strokeText() {}
    createLinearGradient() { return {addColorStop() {}}; }
  }
  class Canvas { constructor() { this.width = 128; this.height = 96; this.context = new Context(this); } getContext() { return this.context; } }
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document'); globalThis.document = {createElement: () => new Canvas()};
  try {
    const canvas = new Canvas(), r = new Recorder(canvas, canvas.getContext('2d')), g = r.context;
    r.begin(); g.fillRect(0, 0, 10, 10); g.strokeRect(1, 1, 9, 9);
    g.save(); g.setTransform(1, 0.1, 0.2, 1, 2, 3); g.setLineDash([2, 3]);
    const gradient = g.createLinearGradient(0, 0, 128, 96); gradient.addColorStop(0, '#ff0000'); gradient.addColorStop(1, '#0000ff');
    g.fillStyle = gradient; g.beginPath(); g.moveTo(0, 0); g.lineTo(10, 20); g.closePath(); g.clip('evenodd'); g.fill('evenodd'); g.stroke();
    g.restore(); g.fillRect(20, 20, 30, 30); g.clearRect(1, 1, 2, 2); g.fillText('native fallback', 2, 3); g.strokeText('native fallback', 4, 5, 9);
    const p = r.end(), {handle, result} = roundtrip(p);
    assert.equal(handle.commandCount, 8); assert.ok(handle.stateCount < handle.commandCount);
    assert.equal(result.commands[0].state, result.commands[1].state); assert.notEqual(result.commands[0].state, result.commands[4].state);
    assert.equal(result.commands[2].path, result.commands[3].path); assert.equal(result.commands[2].state.clips[0].path, result.commands[2].path);
    assert.equal(typeof result.producerMs, 'number');
  } finally { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; }
});
