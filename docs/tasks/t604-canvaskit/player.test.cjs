'use strict';
// Focused CanvasKit 0.42 software-surface correctness/lifetime tests.
// This does NOT test browser texture upload, WebGL, full-game fidelity or FPS.
// Usage: CANVASKIT_DIR=/path/to/canvaskit-package node docs/tasks/t604-canvaskit/player.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Player = require('../../../renderers/t604-canvaskit-player.js');
const packageDir = process.env.CANVASKIT_DIR || '/workspace/shared/town604-canvaskit-package';
const init = require(path.join(packageDir, 'bin/canvaskit.js'));
const ID = [1, 0, 0, 1, 0, 0];
const state = (extra = {}) => ({transform: ID, fillStyle: '#ff0000', strokeStyle: '#000000',
  globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none', imageSmoothingEnabled: false,
  lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, lineDashOffset: 0, dash: [],
  shadowBlur: 0, shadowColor: 'rgba(0, 0, 0, 0)', shadowOffsetX: 0, shadowOffsetY: 0,
  font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', direction: 'ltr', clips: [], ...extra});
const rect = (args, extra = {}) => ({kind: 'fillRect', args, state: state(extra)});
const pc = (name, args, transform = ID) => ({name, args, transform});
const shape = (commands, extra = {}, kind = 'fill', args = []) => ({kind, args, path: commands, state: state(extra)});
const tests = [];
function test(name, body) { tests.push({name, body}); }
function near(actual, expected, tolerance = 1) {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) <= tolerance,
    `channel ${i}: actual ${actual}, expected ${expected}, tolerance ${tolerance}`));
}

init({wasmBinary: fs.readFileSync(path.join(packageDir, 'bin/canvaskit.wasm'))}).then(CK => {
  function fixture(width = 32, height = 32, options, uploadShim = false) {
    const surface = CK.MakeSurface(width, height), events = [];
    const target = uploadShim ? {
      width: () => width, height: () => height, getCanvas: () => surface.getCanvas(),
      flush: () => { events.push('flush'); surface.flush(); },
      // Explicit software-only shim: exercises the player's cache ownership
      // against byte-backed images. It is not a browser upload implementation.
      makeImageFromTextureSource(source, info, premul) {
        assert.equal(premul, false); assert.equal(info.alphaType, CK.AlphaType.Unpremul);
        events.push('upload:' + source.tag);
        if (source.fail) return null;
        const image = CK.MakeImage(info, source.bytes, info.width * 4);
        const destroy = image.delete.bind(image);
        image.delete = () => { events.push('delete:' + source.tag); destroy(); };
        return image;
      }
    } : surface;
    const player = new Player(CK, target, options);
    const packet = commands => ({width, height, commands});
    return {surface, player, events, packet,
      render: commands => player.render(packet(commands)),
      pixel: (x, y) => Array.from(surface.getCanvas().readPixels(x, y, {width: 1, height: 1,
        colorType: CK.ColorType.RGBA_8888, alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB})),
      close() { player.dispose(); surface.delete(); }};
  }
  function withFixture(body, ...args) {
    const f = fixture(...args); try { body(f); } finally { f.close(); }
  }
  const image = (id, revision, rgba, args = [0, 0, 8, 8], extra = {}) => ({kind: 'image', args,
    state: state(extra), image: {id, revision, width: 1, height: 1,
      source: {tag: `${id}:${revision}`, bytes: new Uint8Array(rgba)}}});

  test('canonical CSS alpha rounds to byte before any interpolation', () => {
    assert.equal(Player.parseColor('rgba(12, 34, 56, 0.26)')[3], 66 / 255);
    assert.equal(Player.parseColor('rgba(12, 34, 56, 0.5)')[3], 128 / 255);
    assert.deepEqual(Player.parseColor('#f008'), [1, 0, 0, 136 / 255]);
    assert.deepEqual(Player.parseColor('#123456ff'), [18 / 255, 52 / 255, 86 / 255, 1]);
    for (const color of ['hsl(0 100% 50%)', 'color(display-p3 1 0 0)', 'rgb(300,0,0)', 'rgba(1,2,3)', 'currentColor']) {
      assert.throws(() => Player.parseColor(color), Player.Unsupported);
    }
  });
  test('rectangles preserve affine transforms and global alpha', () => withFixture(f => {
    const stats = f.render([rect([0, 0, 3, 4], {transform: [2, 0, 0, 3, 7, 5], globalAlpha: 0.5})]);
    near(f.pixel(8, 6), [255, 0, 0, 128], 0); near(f.pixel(6, 6), [0, 0, 0, 0], 0);
    near(f.pixel(12, 16), [255, 0, 0, 128], 0); near(f.pixel(13, 16), [0, 0, 0, 0], 0);
    assert.equal(stats.paintCount, 1); assert.equal(stats.uploads, 0);
    assert.equal(stats.resourceCreates, stats.resourcesDeleted); assert.equal(stats.liveResources, 0);
  }));
  test('path creation CTMs stay fixed when paint CTM changes', () => withFixture(f => {
    const p = [pc('moveTo', [0, 0], [1, 0, 0, 1, 4, 5]),
      pc('lineTo', [10, 0], [1, 0, 0, 1, 4, 5]), pc('lineTo', [10, 10], [1, 0, 0, 1, 4, 5]),
      pc('lineTo', [0, 10], [1, 0, 0, 1, 4, 5]), pc('closePath', [])];
    f.render([shape(p, {transform: [2, 0.25, 0.5, 1.5, 7, 3]})]);
    near(f.pixel(5, 6), [255, 0, 0, 255], 0); near(f.pixel(13, 14), [255, 0, 0, 255], 0);
    near(f.pixel(3, 6), [0, 0, 0, 0], 0); near(f.pixel(14, 14), [0, 0, 0, 0], 0);
  }));
  test('mixed path transforms and first lineTo do not invent an origin segment', () => withFixture(f => {
    f.render([shape([pc('lineTo', [8, 8]), pc('lineTo', [8, 0], [1, 0, 0, 1, 8, 8]),
      pc('lineTo', [8, 8], [1, 0, 0, 1, 8, 8]), pc('closePath', [])])]);
    near(f.pixel(14, 10), [255, 0, 0, 255], 0); near(f.pixel(2, 2), [0, 0, 0, 0], 0);
  }));
  test('recorded beginPath resets earlier geometry and inactive shadows do not reject', () => withFixture(f => {
    f.render([shape([pc('rect', [0, 0, 32, 32]), pc('beginPath', []), pc('rect', [8, 8, 8, 8])], {shadowColor: '#ff0000'})]);
    near(f.pixel(4, 4), [0, 0, 0, 0], 0); near(f.pixel(10, 10), [255, 0, 0, 255], 0);
  }));
  test('clip paths use creation transforms independently of paint transforms', () => withFixture(f => {
    const clips = [{path: [pc('rect', [0, 0, 4, 6], [1, 0, 0, 1, 8, 6])], rule: 'nonzero'}];
    f.render([rect([0, 0, 20, 20], {transform: [2, 0, 0, 2, 0, 0], clips})]);
    near(f.pixel(9, 7), [255, 0, 0, 255], 0); near(f.pixel(12, 7), [0, 0, 0, 0], 0);
    near(f.pixel(7, 7), [0, 0, 0, 0], 0);
  }));
  test('evenodd clips create holes, and clip save/restore does not leak', () => withFixture(f => {
    const clips = [{path: [pc('rect', [2, 2, 24, 24]), pc('rect', [8, 8, 10, 10])], rule: 'evenodd'}];
    f.render([rect([0, 0, 32, 32], {clips}), rect([28, 28, 4, 4], {fillStyle: '#0000ff'})]);
    near(f.pixel(5, 5), [255, 0, 0, 255], 0); near(f.pixel(10, 10), [0, 0, 0, 0], 0);
    near(f.pixel(29, 29), [0, 0, 255, 255], 0);
  }));
  test('clearRect respects clips/CTM while ignoring alpha, style, filter and blend', () => withFixture(f => {
    const clips = [{path: [pc('rect', [5, 5, 5, 5])], rule: 'nonzero'}];
    f.render([rect([0, 0, 32, 32]), {kind: 'clearRect', args: [0, 0, 8, 8],
      state: state({transform: [1, 0, 0, 1, 4, 4], clips, globalAlpha: 0, fillStyle: {}, filter: 'blur(3px)', globalCompositeOperation: 'copy'})}]);
    near(f.pixel(6, 6), [0, 0, 0, 0], 0); near(f.pixel(4, 4), [255, 0, 0, 255], 0);
    near(f.pixel(10, 10), [255, 0, 0, 255], 0);
  }));
  test('linear gradient follows full shear CTM, not transformed endpoints', () => withFixture(f => {
    f.render([rect([0, 0, 16, 16], {transform: [1, 0, 0.5, 1, 0, 0], fillStyle: {type: 'linear', args: [0, 0, 16, 0],
      stops: [{offset: 0, color: '#000000'}, {offset: 1, color: '#ffffff'}]}})]);
    // Device (12.5, 8.5) -> original (8.25, 8.5). Endpoint-only
    // transformation would instead sample 12.5/16, a large visible error.
    near(f.pixel(12, 8), [131, 131, 131, 255], 1);
  }));
  test('gradient interpolation is unpremultiplied with byte-quantized alpha', () => withFixture(f => {
    f.render([rect([0, 0, 32, 16], {fillStyle: {type: 'linear', args: [0.5, 0, 30.5, 0],
      stops: [{offset: 0, color: 'rgba(255, 0, 0, 0.26)'}, {offset: 1, color: '#0000ff'}]}})]);
    near(f.pixel(15, 8), [127, 0, 127, 161], 1);
  }));
  test('radial gradient preserves anisotropic paint transform', () => withFixture(f => {
    f.render([rect([0, 0, 16, 16], {transform: [2, 0, 0, 1, 0, 0], fillStyle: {type: 'radial', args: [8, 8, 0, 8, 8, 8],
      stops: [{offset: 0, color: '#ffffff'}, {offset: 1, color: '#000000'}]}})]);
    const t = Math.hypot(24.5 / 2 - 8, 8.5 - 8) / 8, expected = Math.round((1 - t) * 255);
    near(f.pixel(24, 8), [expected, expected, expected, 255], 1);
  }));
  test('stable duplicate gradient stops and degenerate gradients', () => withFixture(f => {
    const gradient = {type: 'linear', args: [0, 0, 32, 0], stops: [{offset: 1, color: '#0000ff'},
      {offset: 0.5, color: '#ff0000'}, {offset: 0.5, color: '#0000ff'}, {offset: 0, color: '#ff0000'}]};
    f.render([rect([0, 0, 32, 16], {fillStyle: gradient}), rect([0, 16, 32, 16], {
      fillStyle: {type: 'linear', args: [0, 0, 0, 0], stops: [{offset: 0, color: '#ffffff'}]}})]);
    near(f.pixel(15, 8), [255, 0, 0, 255], 0); near(f.pixel(16, 8), [0, 0, 255, 255], 0);
    near(f.pixel(15, 24), [0, 0, 0, 0], 0);
  }));
  test('per-paint source-over order remains visible', () => withFixture(f => {
    f.render([rect([0, 0, 20, 20], {fillStyle: '#ff0000', globalAlpha: 0.5}),
      rect([0, 0, 20, 20], {fillStyle: '#0000ff', globalAlpha: 0.5})]);
    near(f.pixel(10, 10), [85, 0, 170, 192], 1);
  }));
  test('lighter, screen and multiply use exact named Skia blend modes', () => {
    for (const [blend, expected] of [['lighter', [255, 255, 255, 255]], ['screen', [160, 160, 160, 255]], ['multiply', [32, 32, 32, 255]]]) {
      withFixture(f => {
        f.render([rect([0, 0, 20, 20], {fillStyle: blend === 'lighter' ? '#808080' : '#404040'}),
          rect([0, 0, 20, 20], {fillStyle: '#808080', globalCompositeOperation: blend})]);
        near(f.pixel(10, 10), expected, 1);
      });
    }
  });
  test('arcs, rotated ellipses, and curves retain path geometry', () => withFixture(f => {
    f.render([shape([pc('ellipse', [16, 16, 10, 4, Math.PI / 2, 0, Math.PI * 2])])]);
    near(f.pixel(16, 8), [255, 0, 0, 255], 0); near(f.pixel(8, 16), [0, 0, 0, 0], 0);
    f.render([{kind: 'clearRect', args: [0, 0, 32, 32], state: state()}, shape([
      pc('moveTo', [4, 4]), pc('bezierCurveTo', [4, 20, 20, 20, 20, 4]),
      pc('quadraticCurveTo', [12, 0, 4, 4]), pc('closePath', [])])]);
    near(f.pixel(12, 8), [255, 0, 0, 255], 0); near(f.pixel(12, 24), [0, 0, 0, 0], 0);
  }));
  test('arcTo tangent geometry and roundRect corners', () => withFixture(f => {
    f.render([shape([pc('moveTo', [4, 4]), pc('arcTo', [24, 4, 24, 24, 8]),
      pc('lineTo', [24, 24]), pc('lineTo', [4, 24]), pc('closePath', [])])]);
    near(f.pixel(23, 5), [0, 0, 0, 0], 0); near(f.pixel(20, 10), [255, 0, 0, 255], 0);
    f.render([{kind: 'clearRect', args: [0, 0, 32, 32], state: state()}, shape([pc('roundRect', [4, 4, 24, 24, 8])])]);
    near(f.pixel(4, 4), [0, 0, 0, 0], 0); near(f.pixel(16, 5), [255, 0, 0, 255], 0);
    near(f.pixel(16, 16), [255, 0, 0, 255], 0);
  }));
  test('stroke CTM scales width and dash length', () => withFixture(f => {
    f.render([shape([pc('moveTo', [4, 10]), pc('lineTo', [28, 10])], {transform: [2, 0, 0, 2, 0, 0],
      strokeStyle: '#00ff00', lineWidth: 2, dash: [2, 2]}, 'stroke')]);
    near(f.pixel(5, 9), [0, 255, 0, 255], 0); near(f.pixel(9, 9), [0, 0, 0, 0], 0);
    near(f.pixel(5, 7), [0, 0, 0, 0], 0);
  }));
  test('unsupported frame preflight draws nothing, including valid earlier commands', () => withFixture(f => {
    f.render([rect([0, 0, 32, 32], {fillStyle: '#00ff00'})]);
    const cases = [
      {kind: 'fillText', args: ['text', 0, 0], state: state()},
      rect([0, 0, 32, 32], {filter: 'blur(2px)'}),
      rect([0, 0, 32, 32], {globalCompositeOperation: 'copy'}),
      rect([0, 0, 32, 32], {shadowColor: '#000000', shadowBlur: 4}),
      rect([0, 0, 32, 32], {transform: [0, 0, 0, 0, 0, 0]}),
      rect([0, 0, 32, 32], {fillStyle: 'color(display-p3 1 0 0)'}),
      shape([pc('addPath', [])]), shape([pc('roundRect', [0, 0, -10, 10, 2])])
    ];
    for (const bad of cases) {
      const packet = f.packet([rect([0, 0, 32, 32]), bad]);
      const result = f.player.validate(packet);
      assert.equal(result.supported, false); assert.match(result.reasons[0], /^command 1:/);
      assert.throws(() => f.player.render(packet), e => e.code === 'T604_UNSUPPORTED');
      near(f.pixel(10, 10), [0, 255, 0, 255], 0);
    }
  }));
  test('resource preparation failure occurs before first drawing operation', () => withFixture(f => {
    f.render([rect([0, 0, 32, 32], {fillStyle: '#00ff00'})]);
    const make = CK.Shader.MakeLinearGradient;
    CK.Shader.MakeLinearGradient = () => null;
    try {
      assert.throws(() => f.render([rect([0, 0, 32, 32]), shape([pc('rect', [0, 0, 32, 32])], {
        fillStyle: {type: 'linear', args: [0, 0, 32, 0], stops: [{offset: 0, color: '#000000'}, {offset: 1, color: '#ffffff'}]}})]), Player.Unsupported);
    } finally { CK.Shader.MakeLinearGradient = make; }
    near(f.pixel(10, 10), [0, 255, 0, 255], 0);
  }));
  test('software image shim verifies brightness(0), alpha and paint-state reset', () => withFixture(f => {
    const stats = f.render([image(1, 0, [255, 64, 32, 128], [0, 0, 8, 8], {filter: 'brightness(0)', globalAlpha: 0.5}),
      image(1, 0, [255, 64, 32, 128], [8, 0, 8, 8])]);
    near(f.pixel(4, 4), [0, 0, 0, 64], 0); near(f.pixel(12, 4), [255, 64, 32, 128], 1);
    assert.equal(stats.uploads, 1); assert.equal(stats.uploadBytes, 4); assert.equal(stats.textureCount, 1);
    assert.equal(stats.resourceCreates - stats.resourcesDeleted, 1);
    assert.equal(f.render([image(1, 0, [0, 0, 0, 0])]).textureHits, 1);
  }, 32, 32, undefined, true));
  test('axis-aligned image and clearRect edges follow Chromium non-AA behavior', () => withFixture(f => {
    f.render([image(1, 0, [255, 0, 0, 255], [0.25, 0.25, 8, 8])]);
    near(f.pixel(0, 0), [255, 0, 0, 255], 0); near(f.pixel(8, 0), [0, 0, 0, 0], 0);
    f.render([rect([0, 0, 32, 32]), {kind: 'clearRect', args: [0.25, 0.25, 8, 8], state: state()}]);
    near(f.pixel(0, 0), [0, 0, 0, 0], 0); near(f.pixel(8, 0), [255, 0, 0, 255], 0);
  }, 32, 32, undefined, true));
  test('image negative sizes normalize without flipping and source cropping adjusts destination', () => withFixture(f => {
    const cmd = image(4, 0, [0, 0, 0, 0]);
    cmd.image.width = 2; cmd.image.height = 1;
    cmd.image.source.bytes = new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]);
    cmd.args = [2, 0, -2, 1, 16, 0, -16, 8];
    f.render([cmd]);
    near(f.pixel(2, 4), [255, 0, 0, 255], 0); near(f.pixel(12, 4), [0, 0, 255, 255], 0);
    cmd.args = [-1, 0, 2, 1, 0, 16, 16, 8]; f.render([cmd]);
    near(f.pixel(2, 20), [0, 0, 0, 0], 0); near(f.pixel(12, 20), [255, 0, 0, 255], 0);
  }, 32, 32, undefined, true));
  test('texture revisions upload independently and budget eviction happens after flush', () => withFixture(f => {
    f.render([image(1, 0, [255, 0, 0, 255])]);
    const stats = f.render([image(1, 1, [0, 0, 255, 255])]);
    assert.equal(stats.uploads, 1); assert.equal(stats.evictions, 1); assert.equal(stats.textureBytes, 4);
    near(f.pixel(4, 4), [0, 0, 255, 255], 0);
    const index = f.events.indexOf('delete:1:0'); assert.equal(f.events[index - 1], 'flush');
    f.player.dispose(); assert.equal(f.events.at(-2), 'flush'); assert.equal(f.events.at(-1), 'delete:1:1');
    const count = f.events.length; f.player.dispose(); assert.equal(f.events.length, count);
    assert.equal(f.player.validate(f.packet([])).supported, false);
  }, 32, 32, {maxTextureBytes: 4, maxTextureCount: 1}, true));
  test('oversized working set rejects before upload and upload failure rejects before drawing', () => withFixture(f => {
    const huge = f.packet([image(1, 0, [0, 0, 0, 255]), image(2, 0, [0, 0, 0, 255])]);
    assert.equal(f.player.validate(huge).supported, false); assert.equal(f.events.length, 0);
    f.render([rect([0, 0, 32, 32], {fillStyle: '#00ff00'})]);
    const bad = image(1, 0, [0, 0, 0, 255]); bad.image.source.fail = true;
    assert.throws(() => f.render([rect([0, 0, 32, 32]), bad]), Player.Unsupported);
    near(f.pixel(10, 10), [0, 255, 0, 255], 0);
  }, 32, 32, {maxTextureBytes: 4, maxTextureCount: 1}, true));
  test('repeated vector frames dispose temporary resources and preserve canvas stack', () => withFixture(f => {
    const command = shape([pc('arc', [16, 16, 10, 0, Math.PI * 2])], {strokeStyle: {type: 'linear', args: [0, 0, 32, 0],
      stops: [{offset: 0, color: '#ff0000'}, {offset: 1, color: '#0000ff'}]}, lineWidth: 2, dash: [2, 1, 3]}, 'stroke');
    const count = f.surface.getCanvas().getSaveCount();
    for (let i = 0; i < 20; i++) {
      const stats = f.render([command]); assert.equal(stats.resourceCreates, stats.resourcesDeleted);
      assert.equal(stats.liveResources, 0); assert.equal(f.surface.getCanvas().getSaveCount(), count);
    }
  }));

  let failures = 0;
  for (const {name, body} of tests) {
    try { body(); console.log('PASS ' + name); }
    catch (e) { failures++; console.error('FAIL ' + name + '\n' + e.stack); }
  }
  console.log(`${tests.length - failures}/${tests.length} focused software-surface tests passed. Browser WebGL/native parity and full-game FPS remain separate gates.`);
  process.exitCode = failures ? 1 : 0;
}).catch(error => { console.error(error); process.exitCode = 1; });
