/* Diagnostic only. Install on the EXISTING Recorder, whose context closes over it.
 * No codec, JSON, completed-packet traversal, command objects, or state objects
 * are used by fast paint emission. Native setters and Recorder's matrix/path/
 * clip/source machinery remain authoritative. Paths are RETAINED original path
 * records, not typed: this is a bounded state + paint producer proof, not a
 * native-ready consumer or a performance/FPS claim.
 *
 * install(recorder, {mirror:false}) -> {stats, inspect(frame?), decode(frame), restore}
 * recorder.end() -> direct frame; mirror:true adds frame.reference, produced by
 * one original paint invocation on the SAME draw. Mirror is verification only.
 * frame.producerMs includes direct begin/reset/validation/end; mirror decode uses
 * reference.producerMs so reference packets compare exactly. Measure full draw
 * externally as well. decode is intentionally allocating and separately timed.
 *
 * All frame views/tables are borrowed READ ONLY until the next begin attempt or
 * restore. decode returns independent packet data, except external Canvas source
 * identities/lifetimes. Image version handles stay LIVE through end: mutating a
 * source updates the original Recorder handle to its preserved pixel snapshot.
 * Failures poison the frame; catching one cannot turn an incomplete frame into
 * accepted output. Restore invalidates snapshot rather than reviving old state.
 *
 * Accounting is explicit structural accounting, NOT total V8 heap measurement.
 * Proxy argument arrays, native getTransform/getLineDash arrays, original path,
 * clip, save/restore, gradient bookkeeping, resource handles, Maps, strings, GC,
 * source snapshots and frame scaffolding still cost time and are not eliminated.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TownDirect604 = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const NONE = 0xffffffff, COMMAND_STRIDE = 6, STATE_STRIDE = 20;
  const KINDS = Object.freeze(['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'image', 'fillText', 'strokeText']);
  const PAINT = new Map(KINDS.map((name, index) => [name === 'image' ? 'drawImage' : name, index]));
  const NUMBER_PROPS = ['globalAlpha', 'lineWidth', 'miterLimit', 'lineDashOffset', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'];
  const STRING_PROPS = ['globalCompositeOperation', 'filter', 'imageSmoothingQuality', 'lineCap', 'lineJoin', 'shadowColor', 'font', 'textAlign', 'textBaseline', 'direction'];
  const PATH_COUNTS = {beginPath: [0], closePath: [0], moveTo: [2], lineTo: [2], rect: [4], roundRect: [4, 5],
    arc: [5, 6], ellipse: [7, 8], quadraticCurveTo: [4], bezierCurveTo: [6], arcTo: [5]};
  const SAFE = new Set(['createLinearGradient', 'createRadialGradient', 'createPattern', 'save', 'restore', 'translate', 'rotate',
    'scale', 'transform', 'setTransform', 'resetTransform', 'setLineDash', 'clip', 'measureText', 'getTransform', 'getLineDash',
    'isPointInPath', 'isPointInStroke', 'getContextAttributes', ...Object.keys(PATH_COUNTS)]);
  const DEFAULTS = Object.freeze({mirror: false, initialCommands: 4096, maxCommands: 250000, initialStates: 2048,
    maxStates: 250000, initialWords: 65536, maxWords: 4194304, initialNumbers: 32768, maxNumbers: 4194304,
    maxStrings: 65536, maxStringCodeUnits: 4194304, maxResources: 4096, maxPaths: 250000, maxPathOperations: 1000000});
  const installed = new WeakMap(), handles = new WeakMap();
  class DirectError extends Error {
    constructor(message) { super('T604 direct writer: ' + message); this.name = 'TownDirect604Error'; this.code = 'T604_DIRECT_UNSUPPORTED'; }
  }
  function fail(message) { throw new DirectError(message); }
  function finite(value, label) { if (typeof value !== 'number' || !Number.isFinite(value)) fail(label + ' must be finite'); return value; }
  function integer(value, label) { if (!Number.isSafeInteger(value) || value < 0) fail(label + ' must be a nonnegative safe integer'); return value; }
  class Arena {
    constructor(Type, initial, maximum, label) { this.Type = Type; this.array = new Type(initial); this.maximum = maximum; this.label = label; this.length = 0; this.growths = 0; this.copiedBytes = 0; }
    reserve(count) {
      const offset = this.length, end = offset + count;
      if (end > this.maximum) fail(this.label + ' arena limit');
      if (end > this.array.length) {
        const next = new this.Type(Math.min(this.maximum, Math.max(end, this.array.length * 2, 16)));
        next.set(this.array.subarray(0, offset)); this.copiedBytes += offset * this.Type.BYTES_PER_ELEMENT; this.growths++; this.array = next;
      }
      this.length = end; return offset;
    }
    reset() { this.length = 0; }
    startFrame() { this.reset(); this.growths = 0; this.copiedBytes = 0; }
    view() { return this.array.subarray(0, this.length); }
    inspect() { return {used: this.length, capacity: this.array.length, usedBytes: this.length * this.Type.BYTES_PER_ELEMENT,
      capacityBytes: this.array.byteLength, growths: this.growths, copiedBytes: this.copiedBytes}; }
  }
  function install(r, options = {}) {
    if (!r || typeof r !== 'object' || !r.shadow || !r.gradients || !r.frameRefs) fail('existing Recorder required');
    if (installed.has(r)) fail('already installed');
    if (r.inFrame) fail('install requires idle Recorder');
    const settings = {...DEFAULTS};
    for (const key of Object.keys(options)) {
      if (!Object.hasOwn(DEFAULTS, key)) fail('unknown option ' + key);
      if (key === 'mirror') { if (typeof options[key] !== 'boolean') fail('mirror must be boolean'); }
      else integer(options[key], key);
      settings[key] = options[key];
    }
    for (const part of ['Commands', 'States', 'Words', 'Numbers']) if (settings['initial' + part] > settings['max' + part]) fail('initial arena exceeds maximum');
    for (const key of Object.keys(settings)) if (key !== 'mirror' && settings[key] > 0x0fffffff) fail('option exceeds bounded index range');
    const names = ['begin', 'state', 'call', 'end', 'ensureSize'];
    const descriptors = new Map(), original = {};
    for (const name of names) {
      if (typeof r[name] !== 'function') fail('missing Recorder method ' + name);
      const descriptor = Object.getOwnPropertyDescriptor(r, name);
      if (descriptor && !descriptor.configurable) fail('nonconfigurable Recorder method ' + name);
      descriptors.set(name, descriptor); original[name] = r[name];
    }
    const commands = new Arena(Uint32Array, settings.initialCommands * COMMAND_STRIDE, settings.maxCommands * COMMAND_STRIDE, 'command');
    const states = new Arena(Uint32Array, settings.initialStates * STATE_STRIDE, settings.maxStates * STATE_STRIDE, 'state');
    const words = new Arena(Uint32Array, settings.initialWords, settings.maxWords, 'word');
    const numbers = new Arena(Float64Array, settings.initialNumbers, settings.maxNumbers, 'number');
    const arenas = {commands, states, words, numbers};
    let active = true, frame = null, generation = 0, error = null, started = 0, lastSnapshot = null, lastState = NONE;
    let strings = [], stringMap = new Map(), stringCodeUnits = 0, paths = [], pathMap = new WeakMap(), pathOperations = new WeakSet();
    let resources = [], resourceMap = new WeakMap(), gradients = new WeakMap(), clips = new WeakMap();
    let pathOperationCount = 0, pathArgumentArrays = 0, clipCount = 0, gradientCount = 0, gradientSourceCount = 0, gradientStops = 0, dashReads = 0;
    let stateHits = 0, emitted = 0, discarded = 0, resizeResets = 0, decodeStats = null;
    function resetEmission() {
      for (const arena of Object.values(arenas)) arena.reset();
      strings = []; stringMap = new Map(); stringCodeUnits = 0; paths = []; pathMap = new WeakMap(); pathOperations = new WeakSet();
      resources = []; resourceMap = new WeakMap(); gradients = new WeakMap(); clips = new WeakMap();
      pathOperationCount = 0; pathArgumentArrays = 0; clipCount = 0; gradientCount = 0; gradientSourceCount = 0; gradientStops = 0;
      lastSnapshot = null; lastState = NONE; r.snapshot = null;
    }
    function string(value) {
      if (typeof value !== 'string') fail('canonical/string argument must be string');
      let index = stringMap.get(value);
      if (index !== undefined) return index;
      if (strings.length >= settings.maxStrings || stringCodeUnits + value.length > settings.maxStringCodeUnits) fail('string table limit');
      index = strings.length; strings.push(value); stringMap.set(value, index); stringCodeUnits += value.length; return index;
    }
    function number(value, label) { finite(value, label); const index = numbers.reserve(1); numbers.array[index] = value; return index; }
    function numericList(list, label) {
      const index = numbers.reserve(list.length);
      for (let i = 0; i < list.length; i++) numbers.array[index + i] = finite(list[i], label);
      return index;
    }
    function gradient(data) {
      const previous = gradients.get(data);
      if (previous !== undefined && Object.is(numbers.array[words.array[previous] + 1], data.version)) return previous;
      if (data.type !== 'linear' && data.type !== 'radial') fail('unsupported gradient type');
      const count = data.type === 'linear' ? 4 : 6;
      if (data.args.length !== count) fail('gradient argument count');
      integer(data.id, 'gradient id'); integer(data.version, 'gradient version');
      const row = words.reserve(6), values = numbers.reserve(2 + count);
      numbers.array[values] = data.id; numbers.array[values + 1] = data.version;
      for (let i = 0; i < count; i++) numbers.array[values + 2 + i] = finite(data.args[i], 'gradient argument');
      const offsets = numbers.reserve(data.stops.length), colors = words.reserve(data.stops.length);
      for (let i = 0; i < data.stops.length; i++) {
        const stop = data.stops[i], offset = finite(stop.offset, 'gradient stop');
        if (offset < 0 || offset > 1) fail('gradient offset range');
        numbers.array[offsets + i] = offset; words.array[colors + i] = string(stop.color);
      }
      words.array[row] = values; words.array[row + 1] = data.type === 'linear' ? 0 : 1; words.array[row + 2] = count;
      words.array[row + 3] = offsets; words.array[row + 4] = colors; words.array[row + 5] = data.stops.length;
      if (previous === undefined) gradientSourceCount++;
      gradients.set(data, row); gradientCount++; gradientStops += data.stops.length; return row;
    }
    function style(value, offset) {
      if (typeof value === 'string') { states.array[offset] = 0; states.array[offset + 1] = string(value); return; }
      const data = value && typeof value === 'object' ? r.gradients.get(value) : null;
      if (!data) fail('opaque style/pattern is unsupported');
      states.array[offset] = 1; states.array[offset + 1] = gradient(data);
    }
    // Only original Recorder-owned paths are retained. Validate newly encountered
    // operations while producing, never during decode or a completed-packet walk.
    function radius(value) {
      if (typeof value === 'number') { finite(value, 'radius'); return; }
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail('opaque radius');
      for (const key of Reflect.ownKeys(value)) {
        if (!['x', 'y', 'z', 'w'].includes(key)) fail('unsupported radius field');
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) fail('accessor radius');
        finite(descriptor.value, 'radius field');
      }
    }
    function validatePathOperation(op) {
      const counts = PATH_COUNTS[op.name];
      if (!counts || !counts.includes(op.args.length)) fail('unsupported path operation/argument count');
      if (!Array.isArray(op.transform) || op.transform.length !== 6) fail('path transform count');
      for (let i = 0; i < 6; i++) finite(op.transform[i], 'path transform');
      for (let i = 0; i < op.args.length; i++) {
        const value = op.args[i];
        if (op.name === 'roundRect' && i === 4) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            if (value.length < 1 || value.length > 4 || Reflect.ownKeys(value).length !== value.length + 1) fail('radii count/dense array');
            for (let j = 0; j < value.length; j++) {
              const descriptor = Object.getOwnPropertyDescriptor(value, j);
              if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail('accessor radius array');
              radius(descriptor.value);
            }
          } else radius(value);
        } else if ((op.name === 'arc' && i === 5) || (op.name === 'ellipse' && i === 7)) {
          if (typeof value !== 'boolean') fail('path direction must be boolean');
        } else finite(value, 'path argument');
      }
    }
    function path(value) {
      let index = pathMap.get(value);
      if (index !== undefined) return index;
      if (paths.length >= settings.maxPaths) fail('retained path limit');
      for (let i = 0; i < value.length; i++) {
        const op = value[i];
        if (!pathOperations.has(op)) {
          if (pathOperationCount >= settings.maxPathOperations) fail('retained path operation limit');
          validatePathOperation(op); pathOperations.add(op); pathOperationCount++; pathArgumentArrays++;
        }
      }
      index = paths.length; paths.push(value); pathMap.set(value, index); return index;
    }
    function clip(value) {
      let row = clips.get(value);
      if (row !== undefined) return row;
      if (value.nativePath) fail('external Path2D clip');
      const retained = path(value.path), rule = string(value.rule);
      if (value.rule !== 'nonzero' && value.rule !== 'evenodd') fail('unsupported clip rule');
      row = words.reserve(2); words.array[row] = retained; words.array[row + 1] = rule; clips.set(value, row); clipCount++; return row;
    }
    function emitState() {
      if (!r.inFrame) fail('state requires begun frame');
      if (settings.mirror ? r.snapshot && r.snapshot === lastSnapshot : r.snapshot === lastState + 1 && lastState !== NONE) { stateHits++; return lastState; }
      const base = states.reserve(STATE_STRIDE), index = base / STATE_STRIDE, shadow = r.shadow;
      style(shadow.fillStyle, base); style(shadow.strokeStyle, base + 2);
      for (let i = 0; i < STRING_PROPS.length; i++) states.array[base + 4 + i] = string(shadow[STRING_PROPS[i]]);
      if (typeof shadow.imageSmoothingEnabled !== 'boolean') fail('imageSmoothingEnabled must be boolean');
      states.array[base + 14] = shadow.imageSmoothingEnabled ? 1 : 0;
      const values = numbers.reserve(NUMBER_PROPS.length + 6); states.array[base + 15] = values;
      for (let i = 0; i < NUMBER_PROPS.length; i++) numbers.array[values + i] = finite(shadow[NUMBER_PROPS[i]], NUMBER_PROPS[i]);
      if (!Array.isArray(r.transforms) || r.transforms.length !== 6) fail('state transform count');
      for (let i = 0; i < 6; i++) numbers.array[values + NUMBER_PROPS.length + i] = finite(r.transforms[i], 'state transform');
      const dash = shadow.getLineDash(); dashReads++;
      states.array[base + 16] = numericList(dash, 'dash'); states.array[base + 17] = dash.length;
      const clipList = words.reserve(r.clips.length); states.array[base + 18] = clipList; states.array[base + 19] = r.clips.length;
      for (let i = 0; i < r.clips.length; i++) { const row = clip(r.clips[i]); words.array[clipList + i] = row; }
      lastState = index;
      if (settings.mirror) lastSnapshot = r.snapshot;
      else r.snapshot = index + 1;
      return index;
    }
    function resource(value) {
      let index = resourceMap.get(value);
      if (index !== undefined) return index;
      if (resources.length >= settings.maxResources) fail('resource table limit');
      integer(value.id, 'image id'); integer(value.revision, 'image revision'); finite(value.width, 'image width'); finite(value.height, 'image height');
      if (!value.source || typeof value.source !== 'object') fail('image source');
      index = resources.length; resources.push(value); resourceMap.set(value, index); return index;
    }
    function emitArgs(args, start) {
      const count = args.length - start, base = words.reserve(count * 2);
      for (let i = 0; i < count; i++) {
        const value = args[start + i], offset = base + i * 2;
        if (typeof value === 'number') { words.array[offset] = 4; words.array[offset + 1] = number(value, 'paint argument'); }
        else if (typeof value === 'string') { words.array[offset] = 5; words.array[offset + 1] = string(value); }
        else if (value === undefined) { words.array[offset] = 0; words.array[offset + 1] = 0; }
        else if (value === null) { words.array[offset] = 1; words.array[offset + 1] = 0; }
        else if (typeof value === 'boolean') { words.array[offset] = value ? 3 : 2; words.array[offset + 1] = 0; }
        else fail('opaque paint argument');
      }
      return base;
    }
    function validatePaint(name, args) {
      const length = args.length;
      if ((name === 'fillRect' || name === 'strokeRect' || name === 'clearRect') && length !== 4) fail('rectangle argument count');
      if (name === 'fill' || name === 'stroke') {
        if (args[0] && typeof args[0] === 'object') fail('external Path2D paint');
        if (name === 'stroke' ? length !== 0 : length > 1 || (length === 1 && args[0] !== undefined && args[0] !== 'nonzero' && args[0] !== 'evenodd')) fail('path paint argument/rule');
      }
      if ((name === 'fillText' || name === 'strokeText') && (length !== 3 && length !== 4 || typeof args[0] !== 'string')) fail('text argument count/type');
      if (name === 'drawImage') {
        if (![3, 5, 9].includes(length)) fail('image argument count');
        if (args[0] === r.canvas) fail('main canvas self-image requires native fallback');
      }
      if (name !== 'fill' && name !== 'stroke') {
        const text = name === 'fillText' || name === 'strokeText', start = text || name === 'drawImage' ? 1 : 0;
        for (let i = start; i < length; i++) {
          if (text && i === 3 && args[i] === undefined) continue;
          if (typeof args[i] !== 'number') fail('paint geometry must be numeric');
        }
      }
    }
    function poison(cause) { error = cause instanceof DirectError ? cause : new DirectError(cause && cause.message || String(cause)); return error; }
    function checkFrame(value) {
      const record = value && handles.get(value);
      if (!record || record.owner !== api) fail('foreign/forged frame');
      if (!active || record.generation !== generation || frame !== value) fail('expired frame');
      return record;
    }
    function inspect(value) {
      if (value !== undefined) checkFrame(value);
      const arenaStats = {};
      for (const [key, arena] of Object.entries(arenas)) arenaStats[key] = Object.freeze(arena.inspect());
      return Object.freeze({mode: settings.mirror ? 'mirror-verification' : 'direct-emission', nativeReady: false,
        commandCount: commands.length / COMMAND_STRIDE, stateCount: states.length / STATE_STRIDE, stateIdentityHits: stateHits,
        emissionAttempts: emitted, discardedCommands: discarded, resizeResets, arenas: Object.freeze(arenaStats),
        avoided: Object.freeze({commandObjects: settings.mirror ? 0 : emitted, commandArgumentArrays: settings.mirror ? 0 : emitted,
          stateObjects: settings.mirror ? 0 : states.length / STATE_STRIDE, stateTransformArrays: settings.mirror ? 0 : states.length / STATE_STRIDE,
          stateClipArrays: settings.mirror ? 0 : states.length / STATE_STRIDE}),
        retained: Object.freeze({pathArrays: paths.length, uniquePathOperationObjects: pathOperationCount, pathArgumentArrays,
          pathTransformArrays: pathOperationCount, resourceHandles: resources.length, strings: strings.length, stringCodeUnits,
          gradientStyleObjects: 0, originalGradientRecordsEncountered: gradientSourceCount, gradientRows: gradientCount,
          gradientStopRows: gradientStops, originalClipRecordsEncountered: clipCount, clipRows: clipCount,
          nativeDashArrayReads: dashReads}), decode: decodeStats ? Object.freeze({...decodeStats}) : null,
        accepted: !error, failure: error ? error.message : null,
        accounting: 'Structural counts only; native/Recorder paths, offscreen work, save stacks, gradient data, Maps, strings, proxy arguments, GC and frame scaffolding remain in full producer timing.'});
    }
    const api = {
      get stats() { return inspect(); }, inspect,
      decode(value) {
        const record = checkFrame(value), start = performance.now();
        const tally = {commands: 0, stateObjects: 0, objects: 1, arrays: 2, resources: 0, gradients: 0, gradientStops: 0, pathOperations: 0};
        const stateCache = new Map(), pathCache = new Map(), clipCache = new Map(), imageCache = new Map(), cloneCache = new Map();
        function clone(input) {
          if (input === null || typeof input !== 'object') return input;
          if (cloneCache.has(input)) return cloneCache.get(input);
          const output = Array.isArray(input) ? [] : Object.create(Object.getPrototypeOf(input));
          if (Array.isArray(input)) tally.arrays++; else tally.objects++;
          cloneCache.set(input, output);
          for (const key of Object.keys(input)) output[key] = clone(input[key]);
          return output;
        }
        function decodedPath(index) {
          if (!pathCache.has(index)) {
            for (const op of paths[index]) if (!cloneCache.has(op)) tally.pathOperations++;
            pathCache.set(index, clone(paths[index]));
          }
          return pathCache.get(index);
        }
        function decodedGradient(row) {
          const base = words.array[row], result = {id: numbers.array[base], version: numbers.array[base + 1],
            type: words.array[row + 1] === 0 ? 'linear' : 'radial', args: [], stops: []};
          tally.objects++; tally.arrays += 2; tally.gradients++;
          for (let i = 0; i < words.array[row + 2]; i++) result.args.push(numbers.array[base + 2 + i]);
          for (let i = 0; i < words.array[row + 5]; i++) {
            result.stops.push({offset: numbers.array[words.array[row + 3] + i], color: strings[words.array[words.array[row + 4] + i]]});
            tally.objects++; tally.gradientStops++;
          }
          // Recorder.style creates a separate snapshot for each style field of
          // each state, even if the source gradient/revision is shared.
          return result;
        }
        function decodedStyle(base) { return states.array[base] === 0 ? strings[states.array[base + 1]] : decodedGradient(states.array[base + 1]); }
        function decodedClip(row) {
          if (!clipCache.has(row)) { clipCache.set(row, {path: decodedPath(words.array[row]), rule: strings[words.array[row + 1]]}); tally.objects++; }
          return clipCache.get(row);
        }
        function decodedState(index) {
          if (stateCache.has(index)) return stateCache.get(index);
          const base = index * STATE_STRIDE, result = {fillStyle: decodedStyle(base), strokeStyle: decodedStyle(base + 2)};
          for (let i = 0; i < STRING_PROPS.length; i++) result[STRING_PROPS[i]] = strings[states.array[base + 4 + i]];
          result.imageSmoothingEnabled = states.array[base + 14] === 1;
          const values = states.array[base + 15];
          for (let i = 0; i < NUMBER_PROPS.length; i++) result[NUMBER_PROPS[i]] = numbers.array[values + i];
          result.transform = []; result.dash = []; result.clips = []; tally.arrays += 3; tally.objects++; tally.stateObjects++;
          for (let i = 0; i < 6; i++) result.transform.push(numbers.array[values + NUMBER_PROPS.length + i]);
          for (let i = 0; i < states.array[base + 17]; i++) result.dash.push(numbers.array[states.array[base + 16] + i]);
          for (let i = 0; i < states.array[base + 19]; i++) result.clips.push(decodedClip(words.array[states.array[base + 18] + i]));
          stateCache.set(index, result); return result;
        }
        function decodedImage(index) {
          if (!imageCache.has(index)) { const image = resources[index]; imageCache.set(index, {id: image.id, revision: image.revision,
            width: image.width, height: image.height, source: image.source}); tally.objects++; tally.resources++; }
          return imageCache.get(index);
        }
        const result = {width: value.width, height: value.height, commands: [], faults: value.faults.slice(),
          producerMs: record.packetProducerMs, imageSnapshots: value.imageSnapshots, imageSnapshotBytes: value.imageSnapshotBytes};
        for (let base = 0; base < commands.length; base += COMMAND_STRIDE) {
          const args = [], argBase = commands.array[base + 2]; tally.arrays++;
          for (let i = 0; i < commands.array[base + 3]; i++) {
            const tag = words.array[argBase + i * 2], payload = words.array[argBase + i * 2 + 1];
            args.push(tag === 0 ? undefined : tag === 1 ? null : tag === 2 ? false : tag === 3 ? true : tag === 4 ? numbers.array[payload] : strings[payload]);
          }
          const command = {kind: KINDS[commands.array[base]], args, state: decodedState(commands.array[base + 1])};
          if (commands.array[base + 4] !== NONE) command.path = decodedPath(commands.array[base + 4]);
          if (commands.array[base + 5] !== NONE) command.image = decodedImage(commands.array[base + 5]);
          result.commands.push(command); tally.objects++; tally.commands++;
        }
        tally.ms = performance.now() - start; decodeStats = tally; return result;
      },
      restore() {
        if (!active) return;
        for (const name of names) { const descriptor = descriptors.get(name); if (descriptor) Object.defineProperty(r, name, descriptor); else delete r[name]; }
        // Abandon a partially recorded diagnostic frame after an exception.
        if (r.inFrame) { r.inFrame = false; r.commands = []; }
        r.snapshot = null; active = false; generation++; frame = null; installed.delete(r);
      }
    };
    const replacements = {
      begin() {
        if (!active) fail('restored writer');
        if (this !== r) fail('borrowed Recorder method');
        if (r.inFrame) throw Error('T604 drawing must not run recursively');
        started = performance.now(); generation++; frame = null; error = null; decodeStats = null;
        stateHits = 0; emitted = 0; discarded = 0; resizeResets = 0; dashReads = 0;
        for (const arena of Object.values(arenas)) arena.startFrame(); resetEmission();
        try { original.begin.call(r); r.started = started; } catch (cause) { throw poison(cause); }
      },
      state() {
        if (this !== r) fail('borrowed Recorder method');
        if (settings.mirror) return original.state.call(r);
        if (error) throw error;
        try { return emitState(); } catch (cause) { throw poison(cause); }
      },
      ensureSize() {
        if (this !== r) fail('borrowed Recorder method');
        const previous = r.lastSize; original.ensureSize.call(r);
        if (r.inFrame && previous !== r.lastSize) { discarded += commands.length / COMMAND_STRIDE; resizeResets++; resetEmission(); }
      },
      call(name, args) {
        if (this !== r) fail('borrowed Recorder method');
        if (!r.inFrame) return original.call.call(r, name, args);
        if (error) throw error;
        r.ensureSize();
        const kind = PAINT.get(name);
        if (kind === undefined) {
          if (!SAFE.has(name)) throw poison(new DirectError('unsupported Canvas2D method ' + String(name)));
          if (name === 'clip' && args[0] && typeof args[0] === 'object') throw poison(new DirectError('external Path2D clip'));
          return original.call.call(r, name, args);
        }
        try {
          validatePaint(name, args);
          let reference;
          if (settings.mirror) { original.call.call(r, name, args); reference = r.commands[r.commands.length - 1]; }
          let image = NONE, retainedPath = NONE;
          if (name === 'drawImage') image = resource(settings.mirror ? reference.image : r.image(args[0]));
          if (name === 'fill' || name === 'stroke') retainedPath = path(settings.mirror ? reference.path : r.heldPath());
          const state = emitState(), argStart = name === 'drawImage' ? 1 : 0, argBase = emitArgs(args, argStart), base = commands.reserve(COMMAND_STRIDE);
          commands.array[base] = kind; commands.array[base + 1] = state; commands.array[base + 2] = argBase;
          commands.array[base + 3] = args.length - argStart; commands.array[base + 4] = retainedPath; commands.array[base + 5] = image;
          emitted++; return;
        } catch (cause) { throw poison(cause); }
      },
      end() {
        if (this !== r) fail('borrowed Recorder method');
        if (!r.inFrame) throw Error('T604 draw was not begun');
        if (error) { r.inFrame = false; throw error; }
        try {
          const reference = settings.mirror ? original.end.call(r) : null;
          if (!settings.mirror) r.inFrame = false;
          if (r.faults.length) fail('Recorder faults: ' + r.faults.join(', '));
          frame = {format: 'TownDirect604-state-paint-v1', width: r.canvas.width, height: r.canvas.height,
            commandCount: commands.length / COMMAND_STRIDE, stateCount: states.length / STATE_STRIDE,
            commands: commands.view(), states: states.view(), words: words.view(), numbers: numbers.view(), strings, paths, resources,
            faults: [], imageSnapshots: r.imageSnapshots, imageSnapshotBytes: r.imageSnapshotBytes, producerMs: 0};
          if (reference) frame.reference = reference;
          frame.stats = inspect();
          const record = {owner: api, generation, packetProducerMs: 0}; handles.set(frame, record);
          frame.producerMs = performance.now() - started; record.packetProducerMs = reference ? reference.producerMs : frame.producerMs;
          return frame;
        } catch (cause) { r.inFrame = false; throw poison(cause); }
      }
    };
    try {
      for (const name of names) Object.defineProperty(r, name, {configurable: true, writable: true, value: replacements[name]});
      r.snapshot = null; installed.set(r, api);
    } catch (cause) { api.restore(); throw cause; }
    return api;
  }
  return {install, DirectError, KINDS, COMMAND_STRIDE, STATE_STRIDE, NONE};
});
