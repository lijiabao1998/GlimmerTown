/* Diagnostic only. The caller owns the existing night canvas and its mutation
 * observer. supported source versions attest exhaustive writes/resets; the
 * separate getSurface().privateClip === true attests exclusive clip ownership.
 * No image or world object survives a call. Native pixel proof remains required. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TownRetained612 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const CAPS = Object.freeze({ tiles: 1024, paints: 8192, sources: 512, references: 65536, bytes: 8 * 1024 * 1024 });
  const OWN = Object.prototype.hasOwnProperty;
  const fields = ['occlude574', 'img', 'a', 'x', 'y', 'w', 'h', 'rect', 'col'];
  class Unsupported extends Error { constructor(reason, cap = false) { super(reason); this.reason = reason; this.cap = cap; } }
  function stop(reason, cap) { throw new Unsupported(reason, cap); }
  function own(object, name) {
    const d = Object.getOwnPropertyDescriptor(object, name);
    if (d && !OWN.call(d, 'value')) stop('getter');
    if (!d && Object.getOwnPropertyDescriptor(Object.prototype, name)) stop('inherited-field');
    return d && d.value;
  }
  function record(object) {
    if (!object || typeof object !== 'object') stop('schema');
    const proto = Object.getPrototypeOf(object);
    if (proto !== Object.prototype && proto !== null) stop('schema');
    // Never invoke user getters during validation, including unrelated fields.
    for (const key of Reflect.ownKeys(object)) own(object, key);
  }
  function finite(value) { if (typeof value !== 'number' || !Number.isFinite(value)) stop('nonfinite'); return value; }
  function alpha(value) { finite(value); if (value < 0 || value > 1) stop('alpha'); return value; }
  function validColor(value) {
    if (typeof value !== 'string') return false;
    if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return true;
    // A deliberately narrow set of valid setters used by the game. Unknown CSS
    // colors (including valid ones) use the untouched original setter semantics.
    const m = /^(rgb|rgba)\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?\s*\)$/i.exec(value);
    return !!m && (m[1].toLowerCase() === 'rgba') === (m[5] !== undefined) &&
      [m[2], m[3], m[4]].every(v => Number(v) >= 0 && Number(v) <= 255) &&
      (m[5] === undefined || Number(m[5]) >= 0 && Number(m[5]) <= 1);
  }
  function create({ original, getSurface, sourceVersion, Path2D, tileSize = 128 } = {}) {
    if (typeof original !== 'function' || typeof getSurface !== 'function' || typeof sourceVersion !== 'function' || tileSize !== 128) throw new TypeError('Invalid retained612 options');
    let previous = null, busy = false, disposed = false, generation = 0, activeSave = null, nestedOriginalError = null;
    const bits = new DataView(new ArrayBuffer(8));
    const counters = { calls: 0, hits: 0, partials: 0, fullRebuilds: 0, fallbacks: 0, capFallbacks: 0, invalidations: 0, peakExplicitBytes: 0, last: null };
    function numberKey(n) { bits.setFloat64(0, n, false); return bits.getUint32(0, false).toString(16).padStart(8, '0') + bits.getUint32(4, false).toString(16).padStart(8, '0'); }
    function invalidate() { previous = null; generation++; counters.invalidations++; }
    function version(image, reserve) {
      const v = sourceVersion(image);
      record(v);
      if (own(v, 'supported') !== true) stop('source-unsupported');
      const id = own(v, 'id'), revision = own(v, 'revision'), width = own(v, 'width'), height = own(v, 'height');
      if (!Number.isSafeInteger(revision) || revision < 0 || !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) stop('source-version');
      let identity;
      if (typeof id === 'string') {
        reserve(4 * id.length + 160); // Check before constructing the token.
        identity = 's' + id.length + ':' + id;
      } else if (typeof id === 'number' && Number.isFinite(id)) {
        reserve(36); identity = 'n' + numberKey(id);
      } else stop('source-id');
      reserve(104);
      return { id: identity, key: identity + '/' + numberKey(revision) + '/' + numberKey(width) + '/' + numberKey(height), width, height };
    }
    function contextSupported(surface) {
      if (!surface || surface.privateClip !== true) stop('clip-ownership');
      const { canvas, context: g } = surface;
      if (!canvas || !g || g.canvas !== canvas || typeof Path2D !== 'function') stop('context');
      for (const name of ['save', 'restore', 'clip', 'clearRect', 'drawImage', 'fillRect', 'getTransform', 'getContextAttributes']) if (typeof g[name] !== 'function') stop('context');
      const t = g.getTransform(), attrs = g.getContextAttributes();
      if (!t || t.a !== 1 || t.b !== 0 || t.c !== 0 || t.d !== 1 || t.e !== 0 || t.f !== 0) stop('transform');
      if (!attrs || attrs.alpha !== true || (typeof g.isContextLost === 'function' && g.isContextLost())) stop('context');
      if (g.filter !== undefined && g.filter !== 'none') stop('filter');
      if (g.shadowBlur !== 0 || g.shadowOffsetX !== 0 || g.shadowOffsetY !== 0 || !['rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)', '#00000000', 'transparent'].includes(g.shadowColor)) stop('shadow');
      return surface;
    }
    function prepare(lights, a, w, h) {
      if (!Array.isArray(lights) || Object.getPrototypeOf(lights) !== Array.prototype || OWN.call(lights, Symbol.iterator) || OWN.call(lights, 'some')) stop('schema');
      if (lights.length > CAPS.paints) stop('paint-cap', true);
      finite(a);
      if (a <= 0) stop('day');
      if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w <= 0 || h <= 0) stop('dimensions');
      const cols = Math.ceil(w / tileSize), rows = Math.ceil(h / tileSize), count = cols * rows;
      if (!Number.isSafeInteger(count) || count > CAPS.tiles) stop('tile-cap', true);
      let bytes = 0;
      const priorBytes = previous ? previous.bytes : 0;
      function reserve(n) {
        if (!Number.isSafeInteger(n) || n < 0 || n > CAPS.bytes - bytes - priorBytes) stop('payload-cap', true);
        bytes += n;
        counters.peakExplicitBytes = Math.max(counters.peakExplicitBytes, bytes + priorBytes);
      }
      // Counts, offsets, dirty/replay masks and their temporary cursors are also
      // covered by the explicit payload budget. JS object headers are not.
      reserve(count * 17 + 4);
      const counts = new Uint32Array(count), ops = [], keys = [], sources = new Map(), identities = new Map();
      const surface = contextSupported(getSurface());
      const output = version(surface.canvas, reserve);
      let references = 0, visible = 0, hasOccluder = false, lastFill;
      for (let i = 0; i < lights.length; i++) {
        const n = own(lights, String(i)); record(n);
        const v = {};
        for (const field of fields) v[field] = own(n, field);
        let kind, image, rect, opacity, color;
        if (v.occlude574) { hasOccluder = true; kind = 'occlude'; image = v.occlude574; opacity = alpha(v.a); }
        else {
          opacity = alpha(a * (v.img && v.a != null ? finite(v.a) : 1));
          if (v.img) { kind = 'image'; image = v.img; }
          else if (v.rect) {
            kind = 'rect'; rect = v.rect; color = v.col || '#ffe9a0';
            // Bound arbitrary strings before regex/token work.
            if (typeof color !== 'string' || color.length > 256 || !validColor(color)) stop('color');
            lastFill = color;
          } else continue;
        }
        reserve(80); // Bound current geometry/ranges before allocation.
        if (rect) {
          if (!Array.isArray(rect) || Object.getPrototypeOf(rect) !== Array.prototype || rect.length !== 4 || OWN.call(rect, Symbol.iterator)) stop('rect-schema');
          rect = [0, 1, 2, 3].map(index => finite(own(rect, String(index))));
        } else rect = [v.x, v.y, v.w, v.h].map(finite);
        const [x, y, rw, rh] = rect;
        const ex = x + rw, ey = y + rh;
        if (!Number.isFinite(ex) || !Number.isFinite(ey)) stop('bounds');
        let source = '';
        if (image) {
          if (image === surface.canvas) stop('self-source');
          if (!sources.has(image)) {
            if (sources.size >= CAPS.sources) stop('source-cap', true);
            const s = version(image, reserve);
            if (identities.has(s.id) && identities.get(s.id) !== image) stop('source-id-collision');
            identities.set(s.id, image); sources.set(image, s);
          }
          source = sources.get(image).key;
        }
        const isVisible = rw !== 0 && rh !== 0 && Math.min(x, ex) < w && Math.max(x, ex) > 0 && Math.min(y, ey) < h && Math.max(y, ey) > 0;
        const left = Math.max(0, Math.floor(Math.min(x, ex) - 2)), top = Math.max(0, Math.floor(Math.min(y, ey) - 2));
        const right = Math.min(w, Math.ceil(Math.max(x, ex) + 2)), bottom = Math.min(h, Math.ceil(Math.max(y, ey) + 2));
        const occupied = rw !== 0 && rh !== 0 && left < right && top < bottom;
        const tx0 = occupied ? Math.floor(left / tileSize) : 0, ty0 = occupied ? Math.floor(top / tileSize) : 0;
        const tx1 = occupied ? Math.ceil(right / tileSize) : 0, ty1 = occupied ? Math.ceil(bottom / tileSize) : 0;
        const added = (tx1 - tx0) * (ty1 - ty0);
        if (added > CAPS.references - references) stop('reference-cap', true);
        reserve(added * 4); // Retained tile indices.
        references += added;
        // Delimited exact Float64 bits and length-prefixed strings: no hash,
        // quantization, global array index or source object is retained.
        const length = kind.length + (kind === 'occlude' ? 80 : 96) + source.length + (color ? color.length : 0) + 48;
        reserve(length * 2);
        const numeric = rect.map(numberKey).join('') + numberKey(opacity) + (kind === 'occlude' ? '' : numberKey(a));
        const key = kind + ':' + numeric + ':' + source.length + ':' + source + ':' + (color ? color.length + ':' + color : '');
        const index = ops.length;
        keys.push(key);
        ops.push({ kind, image, rect, opacity, color, tx0, tx1, ty0, ty1, visible: isVisible });
        if (isVisible) visible++;
        for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) counts[ty * cols + tx]++;
      }
      if (!hasOccluder) stop('no-occluder');
      const offsets = new Uint32Array(count + 1);
      for (let i = 0; i < count; i++) offsets[i + 1] = offsets[i] + counts[i];
      const indices = new Uint32Array(references), cursors = offsets.slice(0, count);
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        for (let ty = op.ty0; ty < op.ty1; ty++) for (let tx = op.tx0; tx < op.tx1; tx++) indices[cursors[ty * cols + tx]++] = i;
      }
      return { surface, output, w, h, cols, rows, count, ops, keys, offsets, indices, visible, lastFill, get bytes() { return bytes; }, reserve };
    }
    function sameTile(frame, old, tile) {
      const start = frame.offsets[tile], end = frame.offsets[tile + 1], oldStart = old.offsets[tile];
      if (end - start !== old.offsets[tile + 1] - oldStart) return false;
      for (let i = 0; i < end - start; i++) if (frame.keys[frame.indices[start + i]] !== old.keys[old.indices[oldStart + i]]) return false;
      return true;
    }
    function tileRect(frame, tile) {
      const x = tile % frame.cols * tileSize, y = Math.floor(tile / frame.cols) * tileSize;
      return [x, y, Math.min(tileSize, frame.w - x), Math.min(tileSize, frame.h - y)];
    }
    function finishState(g, lastFill) {
      if (lastFill !== undefined) g.fillStyle = lastFill;
      g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    function remember(frame, epoch) {
      if (disposed || epoch !== generation) { previous = null; return; }
      const live = contextSupported(getSurface());
      if (live.canvas !== frame.surface.canvas || live.context !== frame.surface.context || live.canvas.width !== frame.w || live.canvas.height !== frame.h) { previous = null; return; }
      // The observer includes our own writes. Capture AFTER drawing/restoration.
      const output = version(live.canvas, frame.reserve);
      if (epoch !== generation || output.width !== frame.w || output.height !== frame.h || output.id !== frame.output.id) { previous = null; return; }
      previous = { w: frame.w, h: frame.h, output: output.key, keys: frame.keys, offsets: frame.offsets, indices: frame.indices, bytes: frame.bytes };
    }
    function originalCall(lights, a, w, h, reason, cap, frame, epoch, work = {}) {
      counters.fallbacks++; if (cap) counters.capFallbacks++;
      counters.fullRebuilds++;
      previous = null;
      counters.last = { mode: 'original', reason, totalPaints: frame ? frame.ops.length : null, visiblePaints: frame ? frame.visible : null,
        executedPaints: frame ? frame.ops.length + (work.executed || 0) : null, executedVisiblePaints: frame ? frame.visible + (work.visible || 0) : null, skippedVisiblePaints: 0,
        originalPaints: frame ? frame.ops.length : null, candidatePaints: work.executed || 0,
        tiles: frame ? frame.count : 0, dirtyTiles: frame ? frame.count : 0, totalPixels: Number.isSafeInteger(w * h) ? w * h : 0,
        cleanPixels: 0, cleanArea: 0, occupiedTilePixels: 0, cleanOccupiedTilePixels: 0, explicitBytes: 0 };
      // Original exceptions propagate unchanged and are never retried.
      const result = original(lights, a, w, h);
      if (frame && work.seed !== false && result === frame.surface.canvas) {
        try { remember(frame, epoch); } catch (_) { previous = null; }
        if (nestedOriginalError) throw nestedOriginalError.error;
        if (epoch !== generation) return originalCall(lights, a, w, h, 'reentry', false, frame, epoch, { ...work, seed: false });
      }
      counters.last.explicitBytes = previous ? previous.bytes : 0;
      return result;
    }
    function layer(lights, a, w, h) {
      counters.calls++;
      if (disposed || busy) {
        const reason = disposed ? 'disposed' : 'reentry'; invalidate();
        // A callback can reenter during a clipped paint. Remove our clip before
        // delegating the nested call; the outer invocation will fully repair.
        if (activeSave && activeSave.saved) { activeSave.g.restore(); activeSave.saved = false; }
        try { return originalCall(lights, a, w, h, reason, false, null, generation); }
        catch (error) { if (busy) nestedOriginalError = { error }; throw error; }
      }
      busy = true; nestedOriginalError = null;
      const epoch = generation;
      let frame;
      try {
        let problem;
        try { frame = prepare(lights, a, w, h); } catch (error) { problem = error; }
        if (nestedOriginalError) throw nestedOriginalError.error;
        if (problem || epoch !== generation) return originalCall(lights, a, w, h, problem ? problem.reason || 'preflight-exception' : 'reentry', !!(problem && problem.cap), null, epoch);
        const old = previous;
        const valid = old && old.w === w && old.h === h && old.output === frame.output.key && frame.surface.canvas.width === w && frame.surface.canvas.height === h;
        const dirty = new Uint8Array(frame.count);
        let dirtyCount = 0, cleanPixels = 0, occupiedTilePixels = 0, cleanOccupiedTilePixels = 0;
        for (let tile = 0; tile < frame.count; tile++) {
          dirty[tile] = !valid || !sameTile(frame, old, tile) ? 1 : 0;
          const r = tileRect(frame, tile), pixels = r[2] * r[3], occupied = frame.offsets[tile] !== frame.offsets[tile + 1];
          if (occupied) occupiedTilePixels += pixels;
          if (dirty[tile]) dirtyCount++;
          else { cleanPixels += pixels; if (occupied) cleanOccupiedTilePixels += pixels; }
        }
        if (dirtyCount === frame.count) return originalCall(lights, a, w, h, valid ? 'all-dirty' : 'invalidated', false, frame, epoch);
        const g = frame.surface.context;
        let saved = null, executed = 0, executedVisible = 0, failure;
        try {
          if (dirtyCount) {
            const path = new Path2D();
            for (let tile = 0; tile < frame.count; tile++) if (dirty[tile]) path.rect(...tileRect(frame, tile));
            g.save(); saved = { g, saved: true }; activeSave = saved; g.clip(path);
            g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
            g.clearRect(0, 0, w, h);
            for (const op of frame.ops) {
              let intersects = false;
              for (let ty = op.ty0; ty < op.ty1 && !intersects; ty++) for (let tx = op.tx0; tx < op.tx1; tx++) if (dirty[ty * frame.cols + tx]) { intersects = true; break; }
              if (!intersects) continue;
              g.globalCompositeOperation = op.kind === 'occlude' ? 'destination-out' : 'screen'; g.globalAlpha = op.opacity;
              executed++; if (op.visible) executedVisible++;
              if (op.kind === 'rect') { g.fillStyle = op.color; g.fillRect(...op.rect); }
              else g.drawImage(op.image, ...op.rect);
            }
          }
        } catch (error) { failure = error; }
        finally {
          if (saved && saved.saved) {
            // Never repair while our clip is active. A failed restore is not
            // recoverable by drawing the original into an unknown clip.
            try { g.restore(); saved.saved = false; } catch (error) { invalidate(); throw error; }
          }
        }
        activeSave = null;
        if (nestedOriginalError) throw nestedOriginalError.error;
        if (epoch !== generation) return originalCall(lights, a, w, h, 'reentry', false, frame, epoch, { seed: false, executed, visible: executedVisible });
        if (failure) return originalCall(lights, a, w, h, 'candidate-exception', false, frame, epoch, { seed: false, executed, visible: executedVisible });
        try { finishState(g, frame.lastFill); } catch (_) { return originalCall(lights, a, w, h, 'state-exception', false, frame, epoch, { seed: false, executed, visible: executedVisible }); }
        counters.last = { mode: dirtyCount ? 'partial' : 'hit', reason: null, totalPaints: frame.ops.length, visiblePaints: frame.visible,
          originalPaints: 0, candidatePaints: executed, executedPaints: executed, executedVisiblePaints: executedVisible, skippedVisiblePaints: frame.visible - executedVisible,
          tiles: frame.count, dirtyTiles: dirtyCount, totalPixels: w * h, cleanPixels, cleanArea: cleanPixels / (w * h),
          occupiedTilePixels, cleanOccupiedTilePixels, explicitBytes: 0 };
        try { remember(frame, epoch); } catch (_) { previous = null; }
        if (nestedOriginalError) throw nestedOriginalError.error;
        if (epoch !== generation) return originalCall(lights, a, w, h, 'reentry', false, frame, epoch, { seed: false, executed, visible: executedVisible });
        if (dirtyCount) counters.partials++; else counters.hits++;
        counters.last.explicitBytes = previous ? previous.bytes : 0;
        return frame.surface.canvas;
      } finally { busy = false; activeSave = null; nestedOriginalError = null; }
    }
    return { layer, invalidate, dispose() { disposed = true; invalidate(); }, stats() { return { ...counters, retainedBytes: previous ? previous.bytes : 0, caps: { ...CAPS }, last: counters.last ? { ...counters.last } : null }; } };
  }
  return { create, CAPS };
});
