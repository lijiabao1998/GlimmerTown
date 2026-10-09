/* T612 diagnostic only. Load AND install before any game JavaScript executes.
 * No canvas pixels are read, copied, hashed, or retained by this observer.
 * Eligibility is limited to this realm's ordinary HTMLCanvasElement/2D objects
 * whose getContext call was observed. occClasses594's G/N forwarding objects
 * still reach these prototype hooks; bound methods captured AFTER install do too.
 *
 * Trust boundary: saved pre-install natives, borrowed natives from another realm,
 * native/extension writes, and replacing then restoring hooks between version()
 * calls cannot be detected by JavaScript interception. They are NOT supported.
 * This proof requires preboot installation and an audited game without those
 * paths. It is not a general-purpose mutation observer or an adversarial sandbox.
 */
(function expose(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TownSourceRevision612 = api;
})(typeof globalThis === 'object' ? globalThis : this, function factory() {
  'use strict';
  const installations = new WeakMap();
  const MAX_REVISION = Number.MAX_SAFE_INTEGER;
  // Hard metadata-residency bound, independent of the helper's source/token
  // caps. An entry is one WeakRef plus one finalization registration (when
  // available); live entries also have a weakly keyed record and two listeners.
  // Browser/JS object overhead is implementation-dependent, not an 8 MiB claim.
  const MAX_WEAK_ENTRIES = 65536;
  const PAINT = ['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke',
    'fillText', 'strokeText', 'drawImage', 'putImageData'];
  const OPTIONAL_PAINT = ['reset', 'drawFocusIfNeeded'];
  const CONTEXT_READBACK = ['getImageData'];
  const CONTEXT_STATE = ['arc', 'arcTo', 'beginPath', 'bezierCurveTo', 'clip',
    'closePath', 'createConicGradient', 'createImageData', 'createLinearGradient',
    'createPattern', 'createRadialGradient', 'ellipse', 'getContextAttributes',
    'getLineDash', 'getTransform', 'isContextLost', 'isPointInPath', 'isPointInStroke',
    'lineTo', 'measureText', 'moveTo', 'quadraticCurveTo', 'rect', 'resetTransform',
    'restore', 'rotate', 'roundRect', 'save', 'scale', 'scrollPathIntoView',
    'setLineDash', 'setTransform', 'transform', 'translate'];
  // Experimental GPU exchange can bypass CPU-observable Canvas2D writes.
  const UNSUPPORTED_CONTEXT = ['transferToGPUTexture', 'transferBackFromGPUTexture'];
  const ATTRIBUTE_METHODS = ['setAttribute', 'setAttributeNS', 'removeAttribute',
    'removeAttributeNS', 'toggleAttribute', 'setAttributeNode', 'setAttributeNodeNS',
    'removeAttributeNode'];
  const MAP_METHODS = ['setNamedItem', 'setNamedItemNS', 'removeNamedItem', 'removeNamedItemNS'];
  const sameDescriptor = (a, b) => !!a && !!b &&
    ['value', 'get', 'set', 'writable', 'enumerable', 'configurable'].every(k => a[k] === b[k]);

  function install(root = globalThis) {
    const previous = installations.get(root);
    if (previous && !previous.stats().disposed) return previous;
    let active = true, failure = null, nextId = 0;
    let canvases = new WeakMap(), contexts = new WeakMap(), attributeMaps = new WeakMap();
    const hooks = [], refs = new Set(), baselines = [];
    const counts = { tracked: 0, mutations: 0, readbacks: 0, contextEvents: 0,
      rejected: 0, foreignHooks: 0, registryPruned: 0, registryExhaustions: 0,
      registryPeak: 0, paths: Object.create(null) };
    let cp, xp, ep, np, ap, mp, etp, width, height, canvasGetter, ownerGetter;
    let nativeAdd, nativeRemove, nativeIsLost, finalizer;
    const constructors = {};
    let canvasGuardNames = [], contextGuardNames = [];

    function count(name) {
      counts[name] = Math.min(MAX_REVISION, counts[name] + 1);
    }
    function path(name) {
      counts.paths[name] = Math.min(MAX_REVISION, (counts.paths[name] || 0) + 1);
    }
    function reject(record, reason) {
      if (record && !record.reason) { record.reason = reason; count('rejected'); }
    }
    function bump(record, name, readback = false) {
      if (!active || !record) return;
      count('mutations'); path(name);
      if (readback) count('readbacks');
      if (record.revision >= MAX_REVISION) reject(record, 'revision-overflow');
      else record.revision++;
    }
    function canvasRecord(value) {
      return value !== null && (typeof value === 'object' || typeof value === 'function')
        ? canvases.get(value) : undefined;
    }
    function attrOwner(value) {
      try { return Reflect.apply(ownerGetter, value, []); } catch (_) { return null; }
    }
    function nodeRecord(value) {
      return canvasRecord(value) || canvasRecord(attrOwner(value));
    }
    function before(record, name, readback = false) { bump(record, name, readback); }
    function patch(proto, name, kind, make, required = true) {
      const old = Object.getOwnPropertyDescriptor(proto, name);
      if (!old || typeof old[kind] !== 'function') {
        if (required) throw new Error('missing-hook:' + name);
        return;
      }
      if (!old.configurable && (kind !== 'value' || !old.writable)) {
        throw new Error('unhookable:' + name);
      }
      const installed = { ...old, [kind]: make(old[kind]) };
      Object.defineProperty(proto, name, installed);
      hooks.push({ proto, name, old, installed });
    }
    function method(proto, name, lookup, readback = false, required = true, unsupported = false) {
      const operationName = String(name);
      patch(proto, name, 'value', native => function observedMethod(...args) {
        let pending;
        if (active) {
          // Observation must never change native argument conversion, this, result,
          // or exceptions. In particular, do not coerce attribute names twice.
          try {
            const record = lookup(this);
            before(record, operationName, readback);
            if (unsupported) reject(record, 'unsupported-operation:' + operationName);
            // toBlob may move backing after returning. Keeping native arguments
            // and callback identity unchanged means its async completion cannot
            // be observed; permanently decline reuse for that canvas.
            if (name === 'toBlob') reject(record, 'asynchronous-readback:toBlob');
            if (record) { record.pending++; pending = record; }
          } catch (_) { failure = 'observer-error:' + operationName; }
        }
        try { return Reflect.apply(native, this, args); }
        finally { if (pending) pending.pending--; }
      }, required);
    }
    function setter(proto, name, lookup) {
      patch(proto, name, 'set', native => function observedSetter(value) {
        let pending;
        if (active) {
          try {
            const record = lookup(this);
            before(record, name + '=');
            if (record) { record.pending++; pending = record; }
          }
          catch (_) { failure = 'observer-error:' + name; }
        }
        try { return Reflect.apply(native, this, [value]); }
        finally { if (pending) pending.pending--; }
      });
    }
    function restoreHooks() {
      for (let i = hooks.length - 1; i >= 0; i--) {
        const hook = hooks[i];
        try {
          if (sameDescriptor(Object.getOwnPropertyDescriptor(hook.proto, hook.name), hook.installed)) {
            Object.defineProperty(hook.proto, hook.name, hook.old);
          } else count('foreignHooks');
        } catch (_) { count('foreignHooks'); }
      }
      hooks.length = 0;
    }
    function integrity() {
      if (!active) return 'disposed';
      if (failure) return failure;
      try {
        for (const [name, constructor] of Object.entries(constructors)) {
          if (root[name] !== constructor) return (failure = 'constructor-tampered:' + name);
        }
        for (const hook of hooks) {
          if (!sameDescriptor(Object.getOwnPropertyDescriptor(hook.proto, hook.name), hook.installed)) {
            return (failure = 'prototype-tampered:' + hook.name);
          }
        }
        for (const baseline of baselines) {
          const keys = Reflect.ownKeys(baseline.proto);
          if (Object.getPrototypeOf(baseline.proto) !== baseline.parent ||
              keys.length !== baseline.descriptors.size || keys.some(key =>
                !sameDescriptor(Object.getOwnPropertyDescriptor(baseline.proto, key), baseline.descriptors.get(key)))) {
            return (failure = 'prototype-surface-tampered');
          }
        }
      } catch (_) { return (failure = 'integrity-check-failed'); }
      return null;
    }
    function attach(canvas, context) {
      // Once any installation/global invariant fails, retain no new metadata.
      // The wrappers still call the original native operations unconditionally.
      if (failure) return;
      let record = canvases.get(canvas);
      if (record) {
        if (record.context !== context) reject(record, 'context-replaced');
        return;
      }
      if (Object.getPrototypeOf(canvas) !== cp || Object.getPrototypeOf(context) !== xp) return;
      if (refs.size >= MAX_WEAK_ENTRIES) {
        for (const ref of refs) {
          if (!ref.deref()) {
            refs.delete(ref);
            if (finalizer) finalizer.unregister(ref);
            count('registryPruned');
          }
        }
        if (refs.size >= MAX_WEAK_ENTRIES) {
          failure = 'observer-registry-cap'; count('registryExhaustions'); return;
        }
      }
      if (nextId >= MAX_REVISION) { failure = 'identity-overflow'; return; }
      record = { id: ++nextId, revision: 0, context, lost: false, pending: 0, reason: null };
      canvases.set(canvas, record); contexts.set(context, record); count('tracked');
      record.onLost = () => { if (active) { record.lost = true; count('contextEvents'); bump(record, 'contextlost'); } };
      record.onRestored = () => { if (active) { record.lost = false; count('contextEvents'); bump(record, 'contextrestored'); } };
      const ref = new root.WeakRef(canvas);
      refs.add(ref);
      counts.registryPeak = Math.max(counts.registryPeak, refs.size);
      if (finalizer) finalizer.register(canvas, ref, ref);
      try {
        Reflect.apply(nativeAdd, canvas, ['contextlost', record.onLost]);
        Reflect.apply(nativeAdd, canvas, ['contextrestored', record.onRestored]);
      } catch (_) { reject(record, 'context-events-unobservable'); }
    }
    function version(image) {
      const record = canvasRecord(image);
      const result = { id: record ? record.id : null, revision: record ? record.revision : 0,
        width: 0, height: 0, supported: false };
      const invalid = integrity();
      if (invalid) { result.reason = invalid; return result; }
      if (!record) { result.reason = 'unobserved-or-unsupported-source'; return result; }
      try {
        result.width = Reflect.apply(width, image, []);
        result.height = Reflect.apply(height, image, []);
        if (Object.getPrototypeOf(image) !== cp || Object.getPrototypeOf(record.context) !== xp) {
          reject(record, 'instance-prototype-tampered');
        }
        if (canvasGuardNames.some(key => Object.hasOwn(image, key)) ||
            contextGuardNames.some(key => Object.hasOwn(record.context, key))) {
          reject(record, 'instance-method-or-property-tampered');
        }
        if (Reflect.apply(canvasGetter, record.context, []) !== image) reject(record, 'context-canvas-changed');
        if (Reflect.apply(nativeIsLost, record.context, [])) record.lost = true;
        if (!Number.isSafeInteger(result.width) || !Number.isSafeInteger(result.height) ||
            result.width < 0 || result.height < 0) reject(record, 'invalid-dimensions');
      } catch (_) { reject(record, 'source-inspection-failed'); }
      result.reason = record.reason || (record.lost ? 'context-lost' :
        record.pending ? 'operation-in-progress' : null);
      result.supported = !result.reason;
      if (result.supported) delete result.reason;
      return result;
    }
    function dispose() {
      if (!active) return;
      active = false;
      for (const ref of refs) {
        const canvas = ref.deref(), record = canvas && canvases.get(canvas);
        if (record) {
          try {
            Reflect.apply(nativeRemove, canvas, ['contextlost', record.onLost]);
            Reflect.apply(nativeRemove, canvas, ['contextrestored', record.onRestored]);
          } catch (_) { /* No source is eligible after disposal. */ }
        }
        if (finalizer) finalizer.unregister(ref);
      }
      refs.clear(); restoreHooks(); baselines.length = 0;
      canvases = new WeakMap(); contexts = new WeakMap(); attributeMaps = new WeakMap();
    }
    function stats() {
      return { ...counts, paths: { ...counts.paths }, disposed: !active,
        installed: active && !failure, reason: failure, weakEntries: refs.size,
        weakEntryLimit: MAX_WEAK_ENTRIES, prebootRequired: true, pixelsRead: 0 };
    }
    const api = Object.freeze({ version, dispose, stats });
    installations.set(root, api);
    try {
      for (const name of ['HTMLCanvasElement', 'CanvasRenderingContext2D', 'Element',
        'Node', 'Attr', 'NamedNodeMap', 'EventTarget']) {
        if (!root[name] || !root[name].prototype) throw new Error('missing-platform:' + name);
        constructors[name] = root[name];
      }
      if (typeof root.WeakRef !== 'function') throw new Error('missing-platform:WeakRef');
      cp = root.HTMLCanvasElement.prototype; xp = root.CanvasRenderingContext2D.prototype;
      ep = root.Element.prototype; np = root.Node.prototype; ap = root.Attr.prototype;
      mp = root.NamedNodeMap.prototype; etp = root.EventTarget.prototype;
      width = Object.getOwnPropertyDescriptor(cp, 'width').get;
      height = Object.getOwnPropertyDescriptor(cp, 'height').get;
      canvasGetter = Object.getOwnPropertyDescriptor(xp, 'canvas').get;
      ownerGetter = Object.getOwnPropertyDescriptor(ap, 'ownerElement').get;
      nativeAdd = etp.addEventListener; nativeRemove = etp.removeEventListener;
      nativeIsLost = xp.isContextLost;
      if ([width, height, canvasGetter, ownerGetter, nativeAdd, nativeRemove, nativeIsLost]
        .some(value => typeof value !== 'function')) throw new Error('missing-platform-accessor');
      if (typeof root.FinalizationRegistry === 'function') {
        finalizer = new root.FinalizationRegistry(ref => refs.delete(ref));
      }
      const knownContext = new Set(['constructor', ...PAINT, ...OPTIONAL_PAINT,
        ...CONTEXT_READBACK, ...CONTEXT_STATE, ...UNSUPPORTED_CONTEXT]);
      const unknownContext = [];
      for (const key of Reflect.ownKeys(xp)) {
        const d = Object.getOwnPropertyDescriptor(xp, key);
        if (typeof d.value === 'function' && !knownContext.has(key)) unknownContext.push(key);
      }
      contextGuardNames = Reflect.ownKeys(xp).filter(key => key !== 'constructor');
      canvasGuardNames = [...new Set([...Reflect.ownKeys(cp).filter(key => key !== 'constructor'),
        ...ATTRIBUTE_METHODS, 'attributes', 'nodeValue', 'textContent'])];
      patch(cp, 'getContext', 'value', native => function observedGetContext(...args) {
        const context = Reflect.apply(native, this, args);
        if (active && !failure && context) {
          try {
            if (Object.getPrototypeOf(context) === xp) attach(this, context);
            else reject(canvasRecord(this), 'unsupported-context');
          } catch (_) { failure = 'context-observation-failed'; }
        }
        return context;
      });
      for (const name of PAINT) method(xp, name, value => contexts.get(value));
      for (const name of OPTIONAL_PAINT) method(xp, name, value => contexts.get(value), false, false);
      for (const name of CONTEXT_READBACK) method(xp, name, value => contexts.get(value), true);
      for (const name of UNSUPPORTED_CONTEXT) method(xp, name, value => contexts.get(value), false, false, true);
      // New platform APIs need not disable ordinary sources merely by existing.
      // Their first use rejects that canvas BEFORE native execution; an
      // unhookable unknown method still fails installation and rolls it back.
      for (const name of unknownContext) method(xp, name, value => contexts.get(value), false, true, true);
      setter(cp, 'width', canvasRecord); setter(cp, 'height', canvasRecord);
      for (const name of ['toDataURL', 'toBlob']) method(cp, name, canvasRecord, true);
      for (const name of ['transferControlToOffscreen', 'captureStream']) method(cp, name, canvasRecord, false, false, true);
      for (const name of ATTRIBUTE_METHODS) method(ep, name, canvasRecord);
      for (const name of MAP_METHODS) method(mp, name, value => canvasRecord(attributeMaps.get(value)));
      patch(ep, 'attributes', 'get', native => function observedAttributes() {
        const map = Reflect.apply(native, this, []);
        // Maps can be obtained before the canvas first requests its 2D context.
        if (active && !failure && Object.getPrototypeOf(this) === cp) attributeMaps.set(map, this);
        return map;
      });
      setter(ap, 'value', value => canvasRecord(attrOwner(value)));
      setter(np, 'nodeValue', nodeRecord); setter(np, 'textContent', nodeRecord);
      for (const proto of [cp, xp]) baselines.push({ proto, parent: Object.getPrototypeOf(proto),
        descriptors: new Map(Reflect.ownKeys(proto).map(key => [key, Object.getOwnPropertyDescriptor(proto, key)])) });
    } catch (error) {
      failure = 'installation-failed:' + (error && error.message || String(error));
      restoreHooks();
    }
    return api;
  }
  return Object.freeze({ install });
});
