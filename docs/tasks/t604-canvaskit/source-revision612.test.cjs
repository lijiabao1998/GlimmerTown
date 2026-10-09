'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const observer = require('./source-revision612.cjs');
const PAINT = ['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'fillText',
  'strokeText', 'drawImage', 'putImageData', 'reset', 'drawFocusIfNeeded'];

// A distinct prototype realm per test, with enough DOM reflection to exercise
// synchronous attribute mutations. No pixels or browser implementation is mocked
// as a correctness result; these tests cover only the observer's bookkeeping.
function fakeDOM() {
  const nativeCalls = [], exception = new Error('native sentinel');
  class EventTarget {
    constructor() { this._listeners = new Map(); }
    addEventListener(type, callback) {
      if (!(this instanceof EventTarget)) throw exception;
      if (!this._listeners.has(type)) this._listeners.set(type, new Set());
      this._listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this._listeners.get(type)?.delete(callback); }
    dispatchEvent(event) {
      for (const callback of this._listeners.get(event.type) || []) callback.call(this, event);
      return true;
    }
  }
  class Node extends EventTarget {
    get nodeValue() { return this instanceof Attr ? this._value : null; }
    set nodeValue(value) { if (this instanceof Attr) this._set(value); }
    get textContent() { return this instanceof Attr ? this._value : ''; }
    set textContent(value) { if (this instanceof Attr) this._set(value); }
  }
  class Attr extends Node {
    constructor(name, value = '') { super(); this.name = name; this._value = String(value); this._owner = null; }
    get ownerElement() { if (!(this instanceof Attr)) throw exception; return this._owner; }
    get value() { return this._value; }
    set value(value) { this._set(value); }
    _set(value) { this._value = String(value); this._owner?._reflect(this.name, this._value); }
  }
  class NamedNodeMap {
    constructor(owner) { this._owner = owner; }
    setNamedItem(attr) { return this._owner._setNode(attr); }
    setNamedItemNS(attr) { return this._owner._setNode(attr); }
    removeNamedItem(name) { return this._owner._remove(String(name)); }
    removeNamedItemNS(ns, name) { return this._owner._remove(String(name)); }
    getNamedItem(name) { return this._owner._attrs.get(String(name)) || null; }
  }
  class Element extends Node {
    constructor() { super(); this._attrs = new Map(); this._map = new NamedNodeMap(this); }
    get attributes() { return this._map; }
    _reflect(name, value) {
      if (this instanceof HTMLCanvasElement && ['width', 'height'].includes(name)) {
        this['_' + name] = value === null ? (name === 'width' ? 300 : 150) : Number(value);
        this._resets++;
      }
    }
    _setNode(attr) {
      if (!(attr instanceof Attr)) throw exception;
      const old = this._attrs.get(attr.name) || null;
      if (old) old._owner = null;
      attr._owner = this; this._attrs.set(attr.name, attr); this._reflect(attr.name, attr._value);
      return old;
    }
    _remove(name) {
      const old = this._attrs.get(name);
      if (!old) throw exception;
      old._owner = null; this._attrs.delete(name); this._reflect(name, null); return old;
    }
    setAttribute(name, value) { name = String(name); if (name === '!') throw exception; this._setNode(new Attr(name, value)); }
    setAttributeNS(ns, name, value) { this._setNode(new Attr(String(name).split(':').pop(), value)); }
    removeAttribute(name) { name = String(name); if (this._attrs.has(name)) this._remove(name); }
    removeAttributeNS(ns, name) { name = String(name); if (this._attrs.has(name)) this._remove(name); }
    toggleAttribute(name, force) {
      name = String(name); const has = this._attrs.has(name);
      if (has && force !== true) { this._remove(name); return false; }
      if (!has && force !== false) { this._setNode(new Attr(name)); return true; }
      return has;
    }
    setAttributeNode(attr) { return this._setNode(attr); }
    setAttributeNodeNS(attr) { return this._setNode(attr); }
    removeAttributeNode(attr) { if (attr._owner !== this) throw exception; return this._remove(attr.name); }
  }
  class CanvasRenderingContext2D {
    constructor(canvas) { this._canvas = canvas; this._lost = false; }
    get canvas() { if (!(this instanceof CanvasRenderingContext2D)) throw exception; return this._canvas; }
    isContextLost() { return this._lost; }
  }
  for (const name of [...PAINT, 'getImageData']) {
    Object.defineProperty(CanvasRenderingContext2D.prototype, name, {
      configurable: true, writable: true,
      value: function (...args) {
        if (!(this instanceof CanvasRenderingContext2D) || args[0] === exception) throw exception;
        const result = { native: name, args, receiver: this };
        nativeCalls.push(result); return result;
      }
    });
  }
  class HTMLCanvasElement extends Element {
    constructor() { super(); this._width = 300; this._height = 150; this._context = null; this._resets = 0; }
    get width() { if (!(this instanceof HTMLCanvasElement)) throw exception; return this._width; }
    set width(value) { if (value === exception) throw exception; this._width = Number(value); this._resets++; }
    get height() { return this._height; }
    set height(value) { if (value === exception) throw exception; this._height = Number(value); this._resets++; }
    getContext(type) { if (!(this instanceof HTMLCanvasElement)) throw exception; return String(type) === '2d' ? (this._context ||= new CanvasRenderingContext2D(this)) : null; }
    toDataURL(...args) { nativeCalls.push({ native: 'toDataURL', args, receiver: this }); return 'data:fake'; }
    toBlob(...args) { nativeCalls.push({ native: 'toBlob', args, receiver: this }); return undefined; }
    transferControlToOffscreen() { throw exception; }
  }
  return { HTMLCanvasElement, CanvasRenderingContext2D, Element, Node, Attr, NamedNodeMap,
    EventTarget, WeakRef, FinalizationRegistry, nativeCalls, exception };
}
function fixture(t, api = observer) {
  const root = fakeDOM(), watch = api.install(root);
  t.after(() => watch.dispose());
  assert.equal(watch.stats().installed, true, watch.stats().reason);
  const canvas = new root.HTMLCanvasElement(), context = canvas.getContext('2d');
  return { root, watch, canvas, context };
}
function changed(watch, canvas, operation) {
  const before = watch.version(canvas); assert.equal(before.supported, true);
  const result = operation();
  const after = watch.version(canvas); assert.equal(after.supported, true, after.reason);
  assert.equal(after.id, before.id); assert.ok(after.revision > before.revision);
  return result;
}

test('browser global and CommonJS export expose the same explicit-install contract', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(__dirname + '/source-revision612.cjs', 'utf8'), sandbox);
  assert.equal(typeof sandbox.TownSourceRevision612.install, 'function');
  assert.deepEqual(Object.keys(observer), ['install']);
});

test('only observed local ordinary canvas 2D sources are eligible; versions are stable and do no readbacks', t => {
  const { root, watch, canvas, context } = fixture(t);
  assert.deepEqual(watch.version(canvas), { id: 1, revision: 0, width: 300, height: 150, supported: true });
  assert.deepEqual(watch.version(canvas), watch.version(canvas));
  for (const value of [null, undefined, 3, {}, new root.HTMLCanvasElement(),
    { get width() { throw new Error('should not read'); } }, context]) {
    assert.equal(watch.version(value).supported, false);
  }
  const foreign = fakeDOM(); const foreignCanvas = new foreign.HTMLCanvasElement(); foreignCanvas.getContext('2d');
  assert.equal(watch.version(foreignCanvas).supported, false);
  class SpecialCanvas extends root.HTMLCanvasElement {}
  const special = new SpecialCanvas(); special.getContext('2d');
  assert.equal(watch.version(special).supported, false);
  assert.equal(root.nativeCalls.length, 0);
  assert.equal(watch.stats().pixelsRead, 0);
});

test('all paint operations, post-install bound natives and occClasses594-style forwarding are observed', t => {
  const { root, watch, canvas, context } = fixture(t);
  for (const name of PAINT) {
    const bound = context[name].bind(context), args = [{ marker: name }, 1, 2, 3];
    const result = changed(watch, canvas, () => bound(...args));
    assert.equal(result.receiver, context); assert.deepEqual(result.args, args);
    assert.equal(result, root.nativeCalls.at(-1));
    assert.equal(watch.stats().paths[name], 1);
  }
  const forwarding = { t: context, fillRect(...args) { return this.t.fillRect(...args); } };
  changed(watch, canvas, () => forwarding.fillRect(1, 2, 3, 4));
  assert.equal(watch.stats().paths.fillRect, 2);
  assert.equal(watch.version(canvas).revision, PAINT.length + 1);
});

test('native exceptions and invalid receivers are preserved; attempted mutation bumps before throwing', t => {
  const { root, watch, canvas, context } = fixture(t);
  for (const operation of [() => context.fillRect(root.exception),
    () => { canvas.width = root.exception; }, () => canvas.setAttribute('!', 'bad')]) {
    const before = watch.version(canvas).revision;
    assert.throws(operation, error => error === root.exception);
    assert.ok(watch.version(canvas).revision > before);
  }
  assert.throws(() => root.CanvasRenderingContext2D.prototype.fillRect.call({}), error => error === root.exception);
  assert.throws(() => root.HTMLCanvasElement.prototype.getContext.call({}, '2d'), error => error === root.exception);
});

test('same-size property and synchronous attribute paths invalidate before consumption', t => {
  const { root, watch, canvas } = fixture(t);
  changed(watch, canvas, () => { canvas.width = 300; });
  changed(watch, canvas, () => { canvas.height = 150; });
  changed(watch, canvas, () => canvas.setAttribute('width', '300'));
  changed(watch, canvas, () => canvas.setAttributeNS(null, 'width', '300'));
  changed(watch, canvas, () => canvas.removeAttribute('width'));
  changed(watch, canvas, () => canvas.setAttribute('height', '150'));
  changed(watch, canvas, () => canvas.removeAttributeNS(null, 'height'));
  changed(watch, canvas, () => canvas.toggleAttribute('width', true));
  changed(watch, canvas, () => canvas.toggleAttribute('width', false));
  const attr = new root.Attr('width', '300');
  changed(watch, canvas, () => canvas.setAttributeNode(attr));
  changed(watch, canvas, () => canvas.setAttributeNodeNS(new root.Attr('height', '150')));
  for (const key of ['value', 'nodeValue', 'textContent']) changed(watch, canvas, () => { attr[key] = '300'; });
  changed(watch, canvas, () => canvas.removeAttributeNode(attr));
  assert.equal(watch.version(canvas).width, 300);
  assert.equal(watch.version(canvas).height, 150);
  assert.ok(canvas._resets >= 10);
});

test('NamedNodeMap mutations are observed even when map was captured before getContext', t => {
  const { root, watch } = fixture(t);
  const canvas = new root.HTMLCanvasElement(), attributes = canvas.attributes;
  canvas.getContext('2d');
  changed(watch, canvas, () => attributes.setNamedItem(new root.Attr('width', '300')));
  changed(watch, canvas, () => attributes.setNamedItemNS(new root.Attr('height', '150')));
  changed(watch, canvas, () => attributes.removeNamedItem('width'));
  changed(watch, canvas, () => attributes.removeNamedItemNS(null, 'height'));
});

test('attribute coercion occurs exactly once and preserves the original native result', t => {
  const { watch, canvas } = fixture(t);
  let names = 0, values = 0;
  changed(watch, canvas, () => canvas.setAttribute({ toString() { names++; return 'width'; } },
    { toString() { values++; return '300'; } }));
  assert.equal(names, 1); assert.equal(values, 1);
  assert.equal(changed(watch, canvas, () => canvas.toggleAttribute('width', true)), true);
});

test('source and output readbacks invalidate without adding reads; toBlob callback is untouched', t => {
  const { root, watch, canvas, context } = fixture(t);
  const callback = () => {};
  changed(watch, canvas, () => context.getImageData(0, 0, 1, 1));
  assert.equal(changed(watch, canvas, () => canvas.toDataURL('image/png')), 'data:fake');
  const before = watch.version(canvas).revision;
  assert.equal(canvas.toBlob(callback, 'image/png'), undefined);
  assert.ok(watch.version(canvas).revision > before);
  assert.equal(watch.version(canvas).reason, 'asynchronous-readback:toBlob');
  assert.equal(root.nativeCalls.at(-1).args[0], callback);
  assert.equal(root.nativeCalls.length, 3); assert.equal(watch.stats().readbacks, 3);
  const output = new root.HTMLCanvasElement(), outputContext = output.getContext('2d');
  changed(watch, output, () => outputContext.clearRect(0, 0, 300, 150));
  assert.equal(watch.stats().pixelsRead, 0);
});

test('reentrant consumption during native argument conversion is unsupported and native exceptions release it', t => {
  const { root, watch, canvas } = fixture(t);
  let seen;
  canvas.width = { valueOf() { seen = watch.version(canvas); return 300; } };
  assert.equal(seen.reason, 'operation-in-progress');
  assert.equal(watch.version(canvas).supported, true);
  assert.throws(() => { canvas.width = { valueOf() {
    assert.equal(watch.version(canvas).reason, 'operation-in-progress'); throw root.exception;
  } }; }, error => error === root.exception);
  assert.equal(watch.version(canvas).supported, true);
});

test('context loss is unsupported until restoration; event and immediate native loss checks invalidate', t => {
  const { watch, canvas, context } = fixture(t);
  const start = watch.version(canvas).revision;
  context._lost = true;
  assert.equal(watch.version(canvas).reason, 'context-lost');
  canvas.dispatchEvent({ type: 'contextlost' });
  assert.ok(watch.version(canvas).revision > start);
  context._lost = false;
  assert.equal(watch.version(canvas).supported, false);
  canvas.dispatchEvent({ type: 'contextrestored' });
  assert.equal(watch.version(canvas).supported, true);
  assert.equal(watch.stats().contextEvents, 2);
});

test('own context/canvas overrides permanently reject that source', t => {
  const { watch, canvas, context, root } = fixture(t);
  context.fillRect = context.fillRect.bind(context);
  assert.match(watch.version(canvas).reason, /instance-method/);
  delete context.fillRect;
  assert.equal(watch.version(canvas).supported, false);
  const other = new root.HTMLCanvasElement(); other.getContext('2d');
  Object.defineProperty(other, 'width', { value: 300 });
  assert.equal(watch.version(other).supported, false);
});

test('prototype tampering fails closed and dispose does not overwrite foreign methods', t => {
  const { root, watch, canvas } = fixture(t);
  const foreign = function foreign() {};
  root.CanvasRenderingContext2D.prototype.fillRect = foreign;
  assert.match(watch.version(canvas).reason, /prototype-tampered/);
  watch.dispose();
  assert.equal(root.CanvasRenderingContext2D.prototype.fillRect, foreign);
  assert.equal(watch.stats().foreignHooks, 1);
  assert.equal(watch.version(canvas).reason, 'disposed');
});

test('constructor changes and added context methods also fail closed', t => {
  const one = fixture(t);
  one.root.CanvasRenderingContext2D.prototype.unobservedPaint = () => {};
  assert.match(one.watch.version(one.canvas).reason, /prototype-surface/);
  const two = fixture(t);
  two.root.HTMLCanvasElement = class Replacement {};
  assert.match(two.watch.version(two.canvas).reason, /constructor-tampered/);
});

test('unknown platform methods preserve eligibility until use, then permanently reject only their source', t => {
  const root = fakeDOM();
  const symbol = Symbol('futurePaint');
  for (const name of ['futurePaint', symbol]) root.CanvasRenderingContext2D.prototype[name] = function (...args) {
    if (args[0] === root.exception) throw root.exception;
    return { receiver: this, args };
  };
  const watch = observer.install(root); t.after(() => watch.dispose());
  assert.equal(watch.stats().installed, true);
  for (const name of ['futurePaint', symbol]) {
    const canvas = new root.HTMLCanvasElement(), context = canvas.getContext('2d');
    assert.equal(watch.version(canvas).supported, true);
    const result = context[name]('unchanged', 42);
    assert.equal(result.receiver, context); assert.deepEqual(result.args, ['unchanged', 42]);
    assert.equal(watch.version(canvas).reason, 'unsupported-operation:' + String(name));
    assert.throws(() => context[name](root.exception), error => error === root.exception);
    assert.equal(watch.stats().installed, true);
  }
  const untouched = new root.HTMLCanvasElement(); untouched.getContext('2d');
  assert.equal(watch.version(untouched).supported, true);
});

test('unhookable required or unknown method rejects all eligibility with rollback', () => {
  for (const name of ['getImageData', 'futurePaint']) {
    const root = fakeDOM();
    Object.defineProperty(root.CanvasRenderingContext2D.prototype, name,
      { value: () => {}, configurable: false, writable: false });
    const fillRect = root.CanvasRenderingContext2D.prototype.fillRect, getContext = root.HTMLCanvasElement.prototype.getContext;
    const watch = observer.install(root), canvas = new root.HTMLCanvasElement(); canvas.getContext('2d');
    assert.equal(watch.stats().installed, false);
    assert.match(watch.version(canvas).reason, /installation-failed/);
    assert.equal(root.CanvasRenderingContext2D.prototype.fillRect, fillRect);
    assert.equal(root.HTMLCanvasElement.prototype.getContext, getContext);
    watch.dispose();
  }
});

test('unsupported transfers fail closed even if native operation throws', t => {
  const { root, watch, canvas } = fixture(t);
  assert.throws(() => canvas.transferControlToOffscreen(), error => error === root.exception);
  assert.match(watch.version(canvas).reason, /unsupported-operation:transferControlToOffscreen/);
});

test('dispose removes event listeners and restores only owned descriptors, and reinstall is clean', () => {
  const root = fakeDOM(), original = Object.getOwnPropertyDescriptor(root.HTMLCanvasElement.prototype, 'width');
  const watch = observer.install(root); assert.equal(observer.install(root), watch);
  const canvas = new root.HTMLCanvasElement(); canvas.getContext('2d');
  assert.equal(canvas._listeners.get('contextlost').size, 1);
  watch.dispose(); watch.dispose();
  assert.equal(canvas._listeners.get('contextlost').size, 0);
  assert.equal(canvas._listeners.get('contextrestored').size, 0);
  assert.deepEqual(Object.getOwnPropertyDescriptor(root.HTMLCanvasElement.prototype, 'width'), original);
  assert.equal(watch.stats().weakEntries, 0);
  const again = observer.install(root); assert.notEqual(again, watch);
  canvas.getContext('2d'); assert.equal(again.version(canvas).supported, true); again.dispose();
});

test('revision and source ID overflow fail closed instead of wrapping', t => {
  // Exercise the real overflow branch using a lowered literal ceiling, without
  // exposing mutation of private revision records in the public diagnostic API.
  const source = fs.readFileSync(__dirname + '/source-revision612.cjs', 'utf8');
  assert.equal(source.split('const MAX_REVISION = Number.MAX_SAFE_INTEGER;').length, 2);
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source.replace('const MAX_REVISION = Number.MAX_SAFE_INTEGER;', 'const MAX_REVISION = 3;'), sandbox);
  const { root, watch, canvas, context } = fixture(t, sandbox.module.exports);
  for (let i = 0; i < 3; i++) context.fillRect();
  assert.equal(watch.version(canvas).supported, true);
  context.fillRect(); assert.equal(watch.version(canvas).reason, 'revision-overflow');
  for (let i = 0; i < 3; i++) new root.HTMLCanvasElement().getContext('2d');
  assert.equal(watch.version(canvas).reason, 'identity-overflow');
});

function cappedObserver(limit) {
  const source = fs.readFileSync(__dirname + '/source-revision612.cjs', 'utf8');
  assert.equal(source.split('const MAX_WEAK_ENTRIES = 65536;').length, 2);
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(source.replace('const MAX_WEAK_ENTRIES = 65536;',
    'const MAX_WEAK_ENTRIES = ' + limit + ';'), sandbox);
  return sandbox.module.exports;
}

test('live registry cap is global, permanent and bounded; native calls and disposal still work', t => {
  const { root, watch, canvas, context } = fixture(t, cappedObserver(3));
  const second = new root.HTMLCanvasElement(), third = new root.HTMLCanvasElement();
  second.getContext('2d'); third.getContext('2d');
  assert.equal(watch.stats().weakEntryLimit, 3);
  assert.equal(watch.stats().registryPeak, 3);
  assert.equal(watch.version(canvas).supported, true);
  const overflow = new root.HTMLCanvasElement(), nativeContext = overflow.getContext('2d');
  assert.equal(nativeContext, overflow._context);
  assert.equal(watch.stats().reason, 'observer-registry-cap');
  assert.equal(watch.stats().installed, false);
  for (const source of [canvas, second, third, overflow]) {
    assert.equal(watch.version(source).reason, 'observer-registry-cap');
  }
  for (let i = 0; i < 50; i++) {
    const extra = new root.HTMLCanvasElement(), extraContext = extra.getContext('2d');
    const result = extraContext.fillRect(i, 2, 3, 4);
    assert.equal(result.receiver, extraContext);
    assert.equal(result.args[0], i);
    extra.attributes.setNamedItem(new root.Attr('width', '300'));
    assert.equal(extra._listeners.size, 0);
  }
  assert.equal(watch.stats().weakEntries, 3);
  assert.equal(watch.stats().tracked, 3);
  assert.equal(watch.stats().registryExhaustions, 1);
  assert.equal(context.fillRect(1).receiver, context);
  assert.throws(() => nativeContext.fillRect(root.exception), error => error === root.exception);
  watch.dispose();
  assert.equal(watch.stats().weakEntries, 0);
  for (const source of [canvas, second, third]) {
    assert.equal(source._listeners.get('contextlost').size, 0);
    assert.equal(source._listeners.get('contextrestored').size, 0);
  }
});

test('registry pressure prunes dead WeakRefs before exhaustion and unregisters finalization entries', t => {
  const root = fakeDOM(), refs = [], registrations = new Map();
  // Deterministic GC/finalizer scheduling simulation. The test exercises the
  // production pruning path without asserting a nondeterministic browser GC.
  root.WeakRef = class ControlledWeakRef {
    constructor(target) { this.target = target; refs.push(this); }
    deref() { return this.target; }
  };
  root.FinalizationRegistry = class ControlledFinalizationRegistry {
    register(target, held, token) { registrations.set(token, held); }
    unregister(token) { return registrations.delete(token); }
  };
  const watch = cappedObserver(2).install(root); t.after(() => watch.dispose());
  const first = new root.HTMLCanvasElement(), second = new root.HTMLCanvasElement();
  first.getContext('2d'); second.getContext('2d');
  assert.equal(registrations.size, 2);
  refs[0].target = undefined;
  const third = new root.HTMLCanvasElement(); third.getContext('2d');
  assert.equal(watch.stats().registryPruned, 1);
  assert.equal(watch.stats().registryExhaustions, 0);
  assert.equal(watch.stats().weakEntries, 2);
  assert.equal(watch.stats().registryPeak, 2);
  assert.equal(watch.stats().tracked, 3);
  assert.equal(watch.version(third).supported, true);
  assert.equal(registrations.size, 2);
  assert.equal(registrations.has(refs[0]), false);
  watch.dispose();
  assert.equal(registrations.size, 0);
  assert.equal(watch.stats().weakEntries, 0);
});
