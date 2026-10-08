/* Diagnostic-only T604 adapters. Never loaded by the production renderer.
 * No pixel approximation: cache native canonical state and exact Paint inputs.
 * Scope: a Recorder owns its shadow context; no saved unwrapped native methods,
 * prototype mutation, or concurrent property redefinition during an experiment.
 * restore() must run in finally, before discarding the experiment's objects.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TownCost604 = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const PROPS = ['fillStyle', 'strokeStyle', 'globalAlpha', 'globalCompositeOperation', 'filter',
    'imageSmoothingEnabled', 'imageSmoothingQuality', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
    'lineDashOffset', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'font',
    'textAlign', 'textBaseline', 'direction'];
  const stateInstalls = new WeakSet(), paintInstalls = new WeakSet();
  const counts = () => ({requested: 0, delegated: 0, skipped: 0});
  function count(stats, entry, kind) {
    entry.requested++; entry[kind]++;
    stats.totals.requested++; stats.totals[kind]++;
  }
  function descriptor(object, key) {
    for (let at = object; at; at = Object.getPrototypeOf(at)) {
      const found = Object.getOwnPropertyDescriptor(at, key);
      if (found) return found;
    }
    throw Error('T604 cost adapter: missing descriptor for ' + key);
  }
  function patchable(object, key) {
    const own = Object.getOwnPropertyDescriptor(object, key);
    if (own ? !own.configurable : !Object.isExtensible(object)) {
      throw Error('T604 cost adapter: unsupported nonconfigurable descriptor for ' + key);
    }
  }
  function method(object, key) {
    patchable(object, key);
    const found = descriptor(object, key);
    if (typeof found.value !== 'function') throw Error('T604 cost adapter: unsupported method ' + key);
    return found;
  }
  function accessor(object, key) {
    patchable(object, key);
    const found = descriptor(object, key);
    if (typeof found.get !== 'function' || typeof found.set !== 'function') {
      throw Error('T604 cost adapter: native accessor required for ' + key);
    }
    return found;
  }
  function patches() {
    const entries = [];
    return {
      add(object, key, replacement) {
        const own = Object.getOwnPropertyDescriptor(object, key);
        Object.defineProperty(object, key, replacement);
        entries.push({object, key, own});
      },
      restore() {
        while (entries.length) {
          const {object, key, own} = entries[entries.length - 1];
          if (own) Object.defineProperty(object, key, own);
          else if (!Reflect.deleteProperty(object, key)) throw Error('T604 cost adapter: cannot restore ' + key);
          entries.pop();
        }
      }
    };
  }
  const replacementMethod = (original, value) => ({...original, value, configurable: true});

  function installStateCache(recorder) {
    if (!recorder || !recorder.shadow || !recorder.shadowCanvas || !Array.isArray(recorder.stack)) {
      throw Error('T604 cost adapter: Recorder shadow, shadowCanvas and stack required');
    }
    if (stateInstalls.has(recorder)) throw Error('T604 cost adapter: state cache already installed');
    const shadow = recorder.shadow, canvas = recorder.shadowCanvas;
    if (shadow.canvas !== canvas) throw Error('T604 cost adapter: shadow canvas mismatch');
    // Validate everything before mutating anything. Missing reset is a visible
    // unsupported contract, never an assumption that native state cannot reset.
    const props = PROPS.map(name => accessor(shadow, name));
    const state = method(recorder, 'state');
    const nativeMethods = Object.fromEntries(['save', 'restore', 'reset'].map(name => [name, method(shadow, name)]));
    const dimensions = Object.fromEntries(['width', 'height'].map(name => [name, accessor(canvas, name)]));
    const stats = {totals: counts(), reads: {}, writes: {}, methods: {},
      invalidations: {writes: 0, reset: 0, dimensions: 0, unknownRestore: 0}};
    const hooks = patches();
    let values = [], valid = 0, depth = 0, active = true;
    // Saves predating installation have unknown canonical values; they can still
    // be restored safely by invalidating. Later saves keep exact cache snapshots.
    const stack = Array(recorder.stack.length).fill(null);
    const clear = () => { values = []; valid = 0; };
    try {
      PROPS.forEach((name, index) => {
        const original = props[index], bit = 1 << index;
        const reads = stats.reads[name] = counts(), writes = stats.writes[name] = counts();
        hooks.add(shadow, name, {...original, configurable: true,
          get() {
            if (this !== shadow || !depth) return original.get.call(this);
            if (valid & bit) { count(stats, reads, 'skipped'); return values[index]; }
            count(stats, reads, 'delegated');
            const value = original.get.call(this);
            values[index] = value; valid |= bit; return value;
          },
          set(value) {
            if (this !== shadow) return original.set.call(this, value);
            count(stats, writes, 'delegated'); stats.invalidations.writes++;
            valid &= ~bit;
            // Native setters still canonicalize, ignore invalid input, convert
            // objects, and throw exactly as before. Never cache the input value.
            try { return original.set.call(this, value); }
            finally { valid &= ~bit; }
          }
        });
      });
      for (const name of ['save', 'restore', 'reset']) {
        const original = nativeMethods[name], entry = stats.methods[name] = counts();
        hooks.add(shadow, name, replacementMethod(original, function(...args) {
          if (this !== shadow) return original.value.apply(this, args);
          count(stats, entry, 'delegated');
          const result = original.value.apply(this, args);
          if (name === 'save') stack.push({values: values.slice(), valid});
          else if (name === 'reset') { clear(); stack.length = 0; stats.invalidations.reset++; }
          else if (stack.length) {
            const previous = stack.pop();
            if (previous) { values = previous.values; valid = previous.valid; }
            else { clear(); stats.invalidations.unknownRestore++; }
          } else { clear(); stats.invalidations.unknownRestore++; }
          return result;
        }));
      }
      for (const name of ['width', 'height']) {
        const original = dimensions[name], entry = stats.writes['canvas.' + name] = counts();
        hooks.add(canvas, name, {...original, configurable: true,
          get() { return original.get.call(this); },
          set(value) {
            if (this !== canvas) return original.set.call(this, value);
            count(stats, entry, 'delegated'); stats.invalidations.dimensions++;
            // A successful same-value assignment resets native state too. A
            // failed conversion may leave its native save stack intact, and can
            // reenter our hooks. Retain that depth with unknown canonical values
            // on failure; even an unmatched restore must reread native state.
            clear();
            try {
              const result = original.set.call(this, value);
              clear(); stack.length = 0; return result;
            } catch (error) {
              clear(); stack.fill(null); throw error;
            }
          }
        });
      }
      const entry = stats.methods.state = counts();
      hooks.add(recorder, 'state', replacementMethod(state, function(...args) {
        if (this !== recorder) return state.value.apply(this, args);
        count(stats, entry, 'delegated'); depth++;
        try { return state.value.apply(this, args); } finally { depth--; }
      }));
      stateInstalls.add(recorder);
    } catch (error) { hooks.restore(); throw error; }
    return {stats, restore() {
      if (!active) return;
      hooks.restore(); active = false; stateInstalls.delete(recorder); clear(); stack.length = 0;
    }};
  }

  function installPaintDedup(CK) {
    if (!CK || typeof CK.Paint !== 'function') throw Error('T604 cost adapter: CanvasKit Paint required');
    if (paintInstalls.has(CK)) throw Error('T604 cost adapter: Paint dedup already installed');
    const ctor = method(CK, 'Paint'), Original = ctor.value, prototype = Original.prototype;
    const setterNames = [];
    for (let at = prototype; at && at !== Object.prototype; at = Object.getPrototypeOf(at)) {
      for (const name of Object.getOwnPropertyNames(at)) {
        if (/^_?set[A-Z]/.test(name) && !setterNames.includes(name)) setterNames.push(name);
      }
    }
    if (!setterNames.includes('setColorComponents')) throw Error('T604 cost adapter: unsupported Paint setter contract');
    const originals = Object.fromEntries([...setterNames, 'copy', 'clone', 'delete', 'deleteLater', 'isDeleted']
      .map(name => [name, descriptor(prototype, name)]));
    for (const [name, original] of Object.entries(originals)) {
      if (typeof original.value !== 'function') throw Error('T604 cost adapter: unsupported Paint method ' + name);
    }
    const stats = {totals: counts(), methods: {}, instancesCreated: 0, instancesRestored: 0,
      liveInstances: 0, disabledAliases: 0};
    for (const name of ['constructor', ...setterNames, 'copy', 'clone', 'delete', 'deleteLater']) stats.methods[name] = counts();
    const enumTypes = {setStyle: CK.PaintStyle, setStrokeCap: CK.StrokeCap, setStrokeJoin: CK.StrokeJoin, setBlendMode: CK.BlendMode};
    const enumMembers = {};
    for (const [name, type] of Object.entries(enumTypes)) {
      if (!type) throw Error('T604 cost adapter: missing enum for ' + name);
      enumMembers[name] = new Set(Object.getOwnPropertyNames(type).map(key => Object.getOwnPropertyDescriptor(type, key).value)
        .filter(value => value && typeof value === 'object' && Object.getOwnPropertyDescriptor(value, 'value')));
    }
    const color = new Set(['setColor', 'setColorComponents', 'setColorInt', 'setAlphaf', '_setColor']);
    const nullResources = new Set(['setShader', 'setPathEffect', 'setColorFilter', 'setImageFilter', 'setMaskFilter']);
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    function keyFor(name, args) {
      if (name === 'setColorComponents') {
        if ((args.length === 4 || (args.length === 5 && args[4] === null)) && args.slice(0, 4).every(finite)) return args.slice();
      } else if (args.length === 1) {
        const value = args[0];
        if ((name === 'setAntiAlias' || name === 'setDither') && typeof value === 'boolean') return args.slice();
        if (['setStrokeWidth', 'setStrokeMiter'].includes(name) && finite(value) && value >= 0) return args.slice();
        if (name === 'setAlphaf' && finite(value) && value >= 0 && value <= 1) return args.slice();
        if (nullResources.has(name) && value === null) return args.slice();
        if (enumMembers[name] && enumMembers[name].has(value)) {
          const field = Object.getOwnPropertyDescriptor(value, 'value');
          // Never invoke accessors merely to decide whether a native call can skip.
          if (field && 'value' in field && finite(field.value)) return [value, field.value];
        }
      }
      return null;
    }
    const equal = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
    const handles = new WeakMap(), live = new Set(), hooks = patches();
    let active = true;
    function invalidate(cache, name) {
      if (color.has(name)) for (const other of color) cache.delete(other);
      else if (name === 'setBlender' || name === 'setBlendMode') { cache.delete('setBlender'); cache.delete('setBlendMode'); }
      else if (!nullResources.has(name) && !enumMembers[name] && !['setAntiAlias', 'setDither', 'setStrokeWidth', 'setStrokeMiter'].includes(name)) cache.clear();
      else cache.delete(name);
    }
    function cleanup(record) {
      record.hooks.restore(); record.cache.clear(); live.delete(record); handles.delete(record.paint);
      stats.liveInstances = live.size; stats.instancesRestored++;
    }
    function wrap(paint, disabled = false) {
      if (handles.has(paint)) return paint;
      const instanceHooks = patches(), record = {paint, hooks: instanceHooks, cache: new Map(), disabled};
      // Fail before changing an unsupported object. Instance-local hooks leave
      // every pre-existing Paint and CanvasKit prototype untouched.
      for (const name of [...setterNames, 'copy', 'clone', 'delete', 'deleteLater']) {
        method(paint, name);
        if (paint[name] !== originals[name].value) throw Error('T604 cost adapter: overridden Paint method ' + name);
      }
      try {
        for (const name of setterNames) {
          const original = originals[name], entry = stats.methods[name];
          instanceHooks.add(paint, name, replacementMethod(original, function(...args) {
            const target = handles.get(this);
            if (!target) return original.value.apply(this, args);
            const key = target.disabled ? null : keyFor(name, args), old = target.cache.get(name);
            if (key && old && equal(key, old.key) && !originals.isDeleted.value.call(this)) {
              count(stats, entry, 'skipped'); return old.result;
            }
            count(stats, entry, 'delegated'); invalidate(target.cache, name);
            let result;
            try { result = original.value.apply(this, args); }
            finally { invalidate(target.cache, name); }
            if (key) target.cache.set(name, {key, result});
            return result;
          }));
        }
        for (const name of ['copy', 'clone', 'delete', 'deleteLater']) {
          const original = originals[name], entry = stats.methods[name];
          instanceHooks.add(paint, name, replacementMethod(original, function(...args) {
            const target = handles.get(this);
            if (!target) return original.value.apply(this, args);
            count(stats, entry, 'delegated');
            const result = original.value.apply(this, args);
            if (name === 'copy') return wrap(result);
            if (name === 'clone') {
              // Embind clone aliases one native Paint. No per-handle cache is
              // valid after either alias mutates it, so delegate both handles.
              target.cache.clear(); target.disabled = true; stats.disabledAliases++;
              return wrap(result, true);
            }
            if (name === 'delete') cleanup(target);
            else { target.cache.clear(); target.disabled = true; }
            return result;
          }));
        }
      } catch (error) { instanceHooks.restore(); throw error; }
      handles.set(paint, record); live.add(record); stats.instancesCreated++; stats.liveInstances = live.size;
      return paint;
    }
    const proxy = new Proxy(Original, {construct(target, args, newTarget) {
      if (!active) return Reflect.construct(target, args, newTarget);
      count(stats, stats.methods.constructor, 'delegated');
      const paint = Reflect.construct(target, args, newTarget);
      try { return wrap(paint); }
      catch (error) { originals.delete.value.call(paint); throw error; }
    }});
    hooks.add(CK, 'Paint', replacementMethod(ctor, proxy)); paintInstalls.add(CK);
    return {stats, restore() {
      if (!active) return;
      for (const record of Array.from(live)) cleanup(record);
      hooks.restore(); active = false; paintInstalls.delete(CK);
    }};
  }
  return {installStateCache, installPaintDedup};
});
