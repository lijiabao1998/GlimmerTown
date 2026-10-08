/* Diagnostic-only T604 ordered packet codec. Never loaded by the game.
 *
 * API: new TownBuffer604.Codec(options); encode(packet) -> handle;
 *      decode(handle) -> packet; inspect(handle?) -> accounting snapshot.
 *
 * The command table is a Uint32 view, with COMMAND_STRIDE words per paint:
 * [kind opcode, state index, arguments node, path node (or NONE), resource
 * index (or NONE)]. stateOffsets[state index] addresses the opcode arena.
 * Nodes in that arena refer to Float64 numbers and interned, unmodified
 * strings. Plain object/array nodes, including diagnostic metadata, are
 * encoded; original state/path/command objects are not retained. Image
 * resources are explicit {id, revision, width, height, source} snapshots.
 * No image pixels are copied, read, cached, or owned by this codec.
 *
 * All handle arrays/tables are borrowed, READ ONLY by contract, and remain
 * stable until the NEXT encode ATTEMPT on the same Codec, even if it fails.
 * decode/inspect reject expired, foreign, and forged handles. Decoded plain
 * objects are independently owned and outlive the arena, but image.source
 * still references its original Canvas source and its external lifetime.
 * This is an in-process representation, not a transferable wire format.
 *
 * Only own, enumerable data properties and dense arrays are supported.
 * Unknown render fields, native methods, Path2D, patterns, opaque objects,
 * accessors and cyclic metadata fail visibly. Plain/null-prototype metadata
 * is retained, including undefined, -0, NaN and infinities. Render numbers
 * must be finite; every accepted Number is stored as Float64 without rounding.
 * Identity dedup is conservative (separate equal states are not merged).
 *
 * Accounting reports typed arena capacity/usage/growth/copy bytes, retained
 * tables, serialized nodes and decode object/array materializations. It is
 * NOT total V8 heap allocation accounting: reflection, Maps, descriptors,
 * string storage, backing-store overhead, transient objects and GC are not
 * measured. Encode/decode timings must include validation/materialization.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TownBuffer604 = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const NONE = 0xffffffff, COMMAND_STRIDE = 5;
  const KINDS = Object.freeze(['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'image', 'fillText', 'strokeText']);
  const KIND_IDS = new Map(KINDS.map((name, i) => [name, i]));
  const TAG = Object.freeze({undefined: 0, null: 1, false: 2, true: 3, number: 4, string: 5, numbers: 6, array: 7, object: 8});
  const PROPS = ['fillStyle', 'strokeStyle', 'globalAlpha', 'globalCompositeOperation', 'filter',
    'imageSmoothingEnabled', 'imageSmoothingQuality', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
    'lineDashOffset', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'font',
    'textAlign', 'textBaseline', 'direction', 'transform', 'dash', 'clips'];
  const NUMERIC_STATE = new Set(['globalAlpha', 'lineWidth', 'miterLimit', 'lineDashOffset', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY']);
  const PATH_COUNTS = {beginPath: [0], closePath: [0], moveTo: [2], lineTo: [2], rect: [4],
    roundRect: [4, 5], arc: [5, 6], ellipse: [7, 8], quadraticCurveTo: [4], bezierCurveTo: [6], arcTo: [5]};
  const DEFAULTS = Object.freeze({initialWords: 65536, initialNumbers: 16384, maxWords: 4194304,
    maxNumbers: 4194304, maxCommands: 250000, maxStrings: 65536, maxStringCodeUnits: 4194304,
    maxResources: 4096, maxDepth: 64});
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const nativeObject = Function.prototype.toString.call(Object);
  const records = new WeakMap();
  class CodecError extends Error {
    constructor(message) { super('T604 buffer codec: ' + message); this.name = 'TownBuffer604Error'; this.code = 'T604_BUFFER_UNSUPPORTED'; }
  }
  function fail(message) { throw new CodecError(message); }
  function finite(value, label) { if (typeof value !== 'number' || !Number.isFinite(value)) fail(label + ' must be finite'); }
  function integer(value, label) { if (!Number.isSafeInteger(value) || value < 0) fail(label + ' must be a nonnegative safe integer'); }
  function plain(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' must be a plain record');
    const proto = Object.getPrototypeOf(value);
    // Accept ordinary records from another realm without accepting arbitrary
    // inherited dictionaries (e.g. inherited radius x/y would change a path).
    if (proto !== null && proto !== Object.prototype) {
      const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
      if (!ctor || typeof ctor.value !== 'function' || Function.prototype.toString.call(ctor.value) !== nativeObject ||
          Object.getOwnPropertyDescriptor(ctor.value, 'prototype')?.value !== proto) fail(label + ': opaque/native object');
    }
  }
  function keysOf(value, label) {
    plain(value, label);
    const keys = Reflect.ownKeys(value);
    for (const key of keys) {
      if (typeof key !== 'string') fail(label + ': symbol property');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) fail(label + '.' + key + ': accessor/non-enumerable property');
    }
    return keys;
  }
  function shape(value, allowed, required, label) {
    const keys = keysOf(value, label);
    for (const key of keys) if (!allowed.includes(key)) fail(label + ': unsupported field ' + key);
    for (const key of required) if (!own(value, key)) fail(label + ': missing field ' + key);
    return keys;
  }
  function dense(value, label) {
    if (!Array.isArray(value)) fail(label + ' must be an array');
    const keys = Reflect.ownKeys(value);
    if (keys.length !== value.length + 1) fail(label + ': sparse/decorated array');
    for (let i = 0; i < value.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, i);
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) fail(label + ': sparse/accessor array');
    }
  }
  function numericList(value, counts, label) {
    dense(value, label);
    if (counts && !counts.includes(value.length)) fail(label + ': unsupported argument count');
    for (const n of value) finite(n, label);
  }
  function radius(value) {
    if (typeof value === 'number') { finite(value, 'roundRect radius'); return; }
    const keys = shape(value, ['x', 'y', 'z', 'w'], [], 'roundRect radius');
    for (const key of keys) if (value[key] !== undefined) finite(value[key], 'roundRect radius.' + key);
  }
  function pathArguments(name, args) {
    dense(args, name + ' arguments');
    if (!own(PATH_COUNTS, name) || !PATH_COUNTS[name].includes(args.length)) fail('unsupported path command/arguments: ' + name);
    const count = name === 'roundRect' ? 4 : name === 'arc' ? 5 : name === 'ellipse' ? 7 : args.length;
    for (let i = 0; i < count; i++) finite(args[i], name + ' coordinate');
    if ((name === 'arc' || name === 'ellipse') && args.length > count && typeof args[count] !== 'boolean') fail(name + ': direction must be boolean');
    if (name === 'roundRect' && args.length === 5 && args[4] !== undefined) {
      if (Array.isArray(args[4])) { dense(args[4], 'roundRect radii'); if (args[4].length < 1 || args[4].length > 4) fail('roundRect radii count'); for (const r of args[4]) radius(r); }
      else radius(args[4]);
    }
  }
  function commandArguments(kind, args) {
    if (['fillRect', 'strokeRect', 'clearRect'].includes(kind)) return numericList(args, [4], kind);
    if (kind === 'image') return numericList(args, [2, 4, 8], kind);
    dense(args, kind + ' arguments');
    if (kind === 'fill') {
      if (args.length > 1 || (args.length && args[0] !== undefined && !['nonzero', 'evenodd'].includes(args[0]))) fail('fill: unsupported rule/Path2D');
    } else if (kind === 'stroke') {
      if (args.length) fail('stroke: unsupported arguments/Path2D');
    } else {
      if (![3, 4].includes(args.length) || typeof args[0] !== 'string') fail(kind + ': unsupported text arguments');
      for (let i = 1; i < args.length; i++) finite(args[i], kind + ' geometry');
    }
  }
  class Arena {
    constructor(Type, initial, maximum) { this.Type = Type; this.data = new Type(initial); this.maximum = maximum; this.used = 0; this.totalGrowths = 0; this.totalGrowthAllocatedBytes = 0; }
    reset() { this.used = 0; this.growths = 0; this.growthAllocatedBytes = 0; this.growthCopiedBytes = 0; }
    take(count) {
      const need = this.used + count;
      if (!Number.isSafeInteger(need) || need > this.maximum) fail(this.Type.name + ' arena limit exceeded');
      if (need > this.data.length) {
        const capacity = Math.min(this.maximum, Math.max(need, this.data.length * 2, 8));
        const next = new this.Type(capacity); next.set(this.data.subarray(0, this.used));
        this.growths++; this.totalGrowths++; this.growthAllocatedBytes += next.byteLength;
        this.totalGrowthAllocatedBytes += next.byteLength; this.growthCopiedBytes += this.used * this.Type.BYTES_PER_ELEMENT;
        this.data = next;
      }
      const start = this.used; this.used = need; return start;
    }
    stats() { return {used: this.used, capacity: this.data.length, usedBytes: this.used * this.Type.BYTES_PER_ELEMENT,
      capacityBytes: this.data.byteLength, growths: this.growths, growthAllocatedBytes: this.growthAllocatedBytes,
      growthCopiedBytes: this.growthCopiedBytes, totalGrowths: this.totalGrowths, totalGrowthAllocatedBytes: this.totalGrowthAllocatedBytes}; }
  }
  class Encoder {
    constructor(codec) {
      this.codec = codec; this.w = codec.words; this.n = codec.numbers; this.options = codec.options;
      this.strings = []; this.stringIds = new Map(); this.stringCodeUnits = 0;
      this.resources = []; this.resourceIds = new Map(); this.resourceKeys = new Map();
      this.seen = new Map(); this.active = new Set(); this.nodes = {objects: 0, arrays: 0, numericArrays: 0, numbers: 0, strings: 0, identityHits: 0};
      this.stateIds = new Map(); this.resourceReferences = 0;
      this.w.take(4); this.w.data.set([TAG.undefined, TAG.null, TAG.false, TAG.true], 0);
    }
    string(value) {
      if (this.stringIds.has(value)) return this.stringIds.get(value);
      if (this.strings.length >= this.options.maxStrings || this.stringCodeUnits + value.length > this.options.maxStringCodeUnits) fail('string table limit exceeded');
      const id = this.strings.length; this.stringIds.set(value, id); this.strings.push(value); this.stringCodeUnits += value.length; return id;
    }
    validate(value, role) {
      if (role === 'number') { finite(value, 'state/geometry number'); return; }
      if (role === 'integer') { integer(value, 'record id/version'); return; }
      if (role === 'string' && typeof value !== 'string') fail('expected a string');
      if (role === 'boolean' && typeof value !== 'boolean') fail('expected a boolean');
      if (role === 'matrix') numericList(value, [6], 'transform');
      if (role === 'dash') numericList(value, null, 'dash');
      if (['path', 'clips', 'stops'].includes(role)) dense(value, role);
      if (role === 'state') return shape(value, PROPS, PROPS, 'state');
      if (role === 'style' && typeof value !== 'string') {
        const keys = shape(value, ['id', 'version', 'type', 'args', 'stops'], ['id', 'version', 'type', 'args', 'stops'], 'gradient/pattern style');
        if (!['linear', 'radial'].includes(value.type)) fail('unsupported gradient/pattern style');
        numericList(value.args, [value.type === 'linear' ? 4 : 6], 'gradient arguments');
        return keys;
      }
      if (role === 'stop') {
        const keys = shape(value, ['offset', 'color'], ['offset', 'color'], 'gradient stop');
        finite(value.offset, 'gradient stop offset'); if (value.offset < 0 || value.offset > 1) fail('gradient stop offset range'); return keys;
      }
      if (role === 'clip') {
        const keys = shape(value, ['path', 'rule'], ['path', 'rule'], 'clip');
        if (!['nonzero', 'evenodd'].includes(value.rule)) fail('clip: unsupported rule'); return keys;
      }
      if (role === 'pathop') {
        const keys = shape(value, ['name', 'args', 'transform'], ['name', 'args', 'transform'], 'path operation');
        if (typeof value.name !== 'string') fail('path operation name'); pathArguments(value.name, value.args); return keys;
      }
    }
    fieldRole(role, key) {
      if (role === 'state') {
        if (key === 'fillStyle' || key === 'strokeStyle') return 'style';
        if (NUMERIC_STATE.has(key)) return 'number';
        if (key === 'transform') return 'matrix';
        if (key === 'dash' || key === 'clips') return key;
        return key === 'imageSmoothingEnabled' ? 'boolean' : 'string';
      }
      if (role === 'style') return key === 'id' || key === 'version' ? 'integer' : key === 'stops' ? 'stops' : key === 'type' ? 'string' : 'data';
      if (role === 'stop') return key === 'offset' ? 'number' : 'string';
      if (role === 'clip') return key === 'path' ? 'path' : 'string';
      if (role === 'pathop') return key === 'transform' ? 'matrix' : key === 'name' ? 'string' : 'data';
      return 'data';
    }
    value(value, role = 'data', depth = 0) {
      if (depth > this.options.maxDepth) fail('record depth limit exceeded');
      const checkedKeys = this.validate(value, role);
      if (value === undefined) return TAG.undefined;
      if (value === null) return TAG.null;
      if (value === false) return TAG.false;
      if (value === true) return TAG.true;
      if (typeof value === 'number') {
        const at = this.w.take(2), n = this.n.take(1); this.n.data[n] = value;
        this.w.data[at] = TAG.number; this.w.data[at + 1] = n; this.nodes.numbers++; return at;
      }
      if (typeof value === 'string') {
        const id = this.string(value), at = this.w.take(2); this.w.data[at] = TAG.string; this.w.data[at + 1] = id; this.nodes.strings++; return at;
      }
      if (typeof value !== 'object') fail('unsupported ' + typeof value + ' value');
      if (this.active.has(value)) fail('cyclic record graph');
      let roles = this.seen.get(value);
      if (roles && roles.has(role)) { this.nodes.identityHits++; return roles.get(role); }
      if (!roles) { roles = new Map(); this.seen.set(value, roles); }
      this.active.add(value);
      let at;
      if (Array.isArray(value)) {
        dense(value, role);
        const childRole = role === 'path' ? 'pathop' : role === 'clips' ? 'clip' : role === 'stops' ? 'stop' : 'data';
        if (childRole === 'data' && value.every(n => typeof n === 'number')) {
          at = this.w.take(3); const start = this.n.take(value.length);
          for (let i = 0; i < value.length; i++) this.n.data[start + i] = value[i];
          this.w.data[at] = TAG.numbers; this.w.data[at + 1] = value.length; this.w.data[at + 2] = start; this.nodes.numericArrays++;
        } else {
          at = this.w.take(2 + value.length); this.w.data[at] = TAG.array; this.w.data[at + 1] = value.length;
          for (let i = 0; i < value.length; i++) { const ref = this.value(value[i], childRole, depth + 1); this.w.data[at + 2 + i] = ref; }
          this.nodes.arrays++;
        }
      } else {
        const keys = checkedKeys || keysOf(value, role); at = this.object(value, keys, role, depth);
      }
      this.active.delete(value); roles.set(role, at); return at;
    }
    object(value, keys, role, depth) {
      const at = this.w.take(3 + keys.length * 2);
      this.w.data[at] = TAG.object; this.w.data[at + 1] = keys.length; this.w.data[at + 2] = Object.getPrototypeOf(value) === null ? 1 : 0;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i], id = this.string(key), ref = this.value(value[key], this.fieldRole(role, key), depth + 1);
        this.w.data[at + 3 + i * 2] = id; this.w.data[at + 4 + i * 2] = ref;
      }
      this.nodes.objects++; return at;
    }
    resource(image) {
      this.resourceReferences++;
      if (this.resourceIds.has(image)) return this.resourceIds.get(image);
      shape(image, ['id', 'revision', 'width', 'height', 'source'], ['id', 'revision', 'width', 'height', 'source'], 'image');
      for (const key of ['id', 'revision', 'width', 'height']) integer(image[key], 'image.' + key);
      if (!image.source || (typeof image.source !== 'object' && typeof image.source !== 'function')) fail('image source must be an explicit object reference');
      if (this.resources.length >= this.options.maxResources) fail('resource table limit exceeded');
      const key = image.id + ':' + image.revision, prior = this.resourceKeys.get(key);
      if (prior && (prior.source !== image.source || !Object.is(prior.width, image.width) || !Object.is(prior.height, image.height))) fail('conflicting image id/revision source or dimensions');
      const entry = Object.freeze({id: image.id, revision: image.revision, width: image.width, height: image.height, source: image.source});
      const id = this.resources.length; this.resources.push(entry); this.resourceIds.set(image, id); this.resourceKeys.set(key, entry); return id;
    }
    packet(packet) {
      const keys = keysOf(packet, 'packet');
      for (const key of ['width', 'height', 'commands']) if (!own(packet, key)) fail('packet: missing ' + key);
      integer(packet.width, 'packet.width'); integer(packet.height, 'packet.height'); dense(packet.commands, 'commands');
      const count = packet.commands.length;
      if (count > this.options.maxCommands) fail('command count limit exceeded');
      const commandsStart = this.w.take(count * COMMAND_STRIDE), statesStart = this.w.take(count);
      for (let i = 0; i < count; i++) {
        const c = packet.commands[i]; plain(c, 'command ' + i);
        // Validate the descriptor before reading the opcode (no getter calls).
        const commandKeys = keysOf(c, 'command ' + i), kind = c.kind;
        if (!KIND_IDS.has(kind)) fail('unsupported paint command: ' + String(kind));
        const fields = ['kind', 'args', 'state']; if (kind === 'fill' || kind === 'stroke') fields.push('path'); if (kind === 'image') fields.push('image');
        for (const key of commandKeys) if (!fields.includes(key)) fail('command ' + i + ': unsupported field ' + key);
        for (const key of fields) if (!own(c, key)) fail('command ' + i + ': missing ' + key);
        commandArguments(kind, c.args);
        let stateIndex = this.stateIds.get(c.state);
        if (stateIndex === undefined) {
          const stateRef = this.value(c.state, 'state'); stateIndex = this.stateIds.size; this.stateIds.set(c.state, stateIndex); this.w.data[statesStart + stateIndex] = stateRef;
        }
        const args = this.value(c.args), path = own(c, 'path') ? this.value(c.path, 'path') : NONE;
        const resource = kind === 'image' ? this.resource(c.image) : NONE, at = commandsStart + i * COMMAND_STRIDE;
        this.w.data[at] = KIND_IDS.get(kind); this.w.data[at + 1] = stateIndex; this.w.data[at + 2] = args; this.w.data[at + 3] = path; this.w.data[at + 4] = resource;
      }
      const metadata = this.object(packet, keys.filter(key => key !== 'commands'), 'data', 0);
      return {commandsStart, statesStart, commandCount: count, stateCount: this.stateIds.size, metadata};
    }
  }
  function frozenStats(codec, encoder, layout) {
    const words = Object.freeze(codec.words.stats()), numbers = Object.freeze(codec.numbers.stats());
    return Object.freeze({commands: layout.commandCount, states: layout.stateCount, stateReferences: layout.commandCount,
      stateIdentityHits: layout.commandCount - layout.stateCount,
      typed: Object.freeze({words, numbers, usedBytes: words.usedBytes + numbers.usedBytes, capacityBytes: words.capacityBytes + numbers.capacityBytes,
        growths: words.growths + numbers.growths, growthAllocatedBytes: words.growthAllocatedBytes + numbers.growthAllocatedBytes,
        growthCopiedBytes: words.growthCopiedBytes + numbers.growthCopiedBytes,
        stateIndexReservedWords: layout.commandCount, stateIndexUsedWords: layout.stateCount}),
      tables: Object.freeze({strings: encoder.strings.length, stringCodeUnits: encoder.stringCodeUnits,
        stringUtf16PayloadBytes: encoder.stringCodeUnits * 2, resources: encoder.resources.length,
        resourceReferences: encoder.resourceReferences, resourceIdentityHits: encoder.resourceReferences - encoder.resources.length,
        resourceDescriptorObjects: encoder.resources.length, retainedPlainObjectEntries: 0}),
      nodes: Object.freeze({...encoder.nodes}),
      accounting: 'Typed backing stores, table counts and explicit decode materializations only; not total V8 heap allocations or image pixel memory.'});
  }
  class Codec {
    constructor(options = {}) {
      const keys = keysOf(options, 'options'); for (const key of keys) if (!own(DEFAULTS, key)) fail('unknown option ' + key);
      this.options = Object.freeze({...DEFAULTS, ...options});
      for (const [key, value] of Object.entries(this.options)) if (!Number.isSafeInteger(value) || value < 0 || value >= NONE) fail('invalid option ' + key);
      if (this.options.initialWords > this.options.maxWords || this.options.initialNumbers > this.options.maxNumbers) fail('initial arena exceeds limit');
      this.words = new Arena(Uint32Array, this.options.initialWords, this.options.maxWords);
      this.numbers = new Arena(Float64Array, this.options.initialNumbers, this.options.maxNumbers);
      this.words.reset(); this.numbers.reset(); this.generation = 0; this.current = null; this.lastDecode = null;
    }
    encode(packet) {
      this.generation++; this.current = null; this.lastDecode = null; this.words.reset(); this.numbers.reset();
      try {
        const encoder = new Encoder(this), layout = encoder.packet(packet), stats = frozenStats(this, encoder, layout);
        const handle = Object.freeze({version: 1, generation: this.generation, commandStride: COMMAND_STRIDE,
          commandCount: layout.commandCount, stateCount: layout.stateCount,
          commands: this.words.data.subarray(layout.commandsStart, layout.commandsStart + layout.commandCount * COMMAND_STRIDE),
          stateOffsets: this.words.data.subarray(layout.statesStart, layout.statesStart + layout.stateCount),
          opcodes: this.words.data.subarray(0, this.words.used), numbers: this.numbers.data.subarray(0, this.numbers.used),
          strings: Object.freeze(encoder.strings), resources: Object.freeze(encoder.resources), stats});
        records.set(handle, {codec: this, generation: this.generation, layout}); this.current = handle; return handle;
      } catch (error) {
        if (error instanceof CodecError) throw error;
        throw new CodecError('encoding failed: ' + (error && error.message || error));
      }
    }
    require(handle) {
      const record = records.get(handle);
      if (!record || record.codec !== this) fail('foreign/forged encoded handle');
      if (record.generation !== this.generation || handle !== this.current) fail('expired encoded handle');
      return record;
    }
    decode(handle) {
      const {layout} = this.require(handle), w = handle.opcodes, n = handle.numbers, seen = new Map();
      const counts = {objects: 0, arrays: 0, states: 0, commands: 0, resourceDescriptors: 0, sourceReferences: 0, total: 0};
      function value(at) {
        if (seen.has(at)) return seen.get(at);
        let out;
        switch (w[at]) {
          case TAG.undefined: return undefined;
          case TAG.null: return null;
          case TAG.false: return false;
          case TAG.true: return true;
          case TAG.number: return n[w[at + 1]];
          case TAG.string: return handle.strings[w[at + 1]];
          case TAG.numbers:
            out = new Array(w[at + 1]); counts.arrays++; seen.set(at, out);
            for (let i = 0; i < out.length; i++) out[i] = n[w[at + 2] + i]; return out;
          case TAG.array:
            out = new Array(w[at + 1]); counts.arrays++; seen.set(at, out);
            for (let i = 0; i < out.length; i++) out[i] = value(w[at + 2 + i]); return out;
          case TAG.object:
            out = w[at + 2] ? Object.create(null) : {}; counts.objects++; seen.set(at, out);
            for (let i = 0; i < w[at + 1]; i++) Object.defineProperty(out, handle.strings[w[at + 3 + i * 2]],
              {value: value(w[at + 4 + i * 2]), enumerable: true, configurable: true, writable: true}); return out;
          default: fail('corrupt opcode node ' + at);
        }
      }
      const packet = value(layout.metadata), states = new Array(layout.stateCount), resources = new Array(handle.resources.length);
      // These two lookup arrays are counted, along with the returned graph.
      counts.arrays += 2;
      for (let i = 0; i < states.length; i++) { states[i] = value(handle.stateOffsets[i]); counts.states++; }
      for (let i = 0; i < resources.length; i++) { resources[i] = {...handle.resources[i]}; counts.objects++; counts.resourceDescriptors++; counts.sourceReferences++; }
      const commands = new Array(layout.commandCount); counts.arrays++;
      for (let i = 0; i < commands.length; i++) {
        const at = i * COMMAND_STRIDE, kind = KINDS[handle.commands[at]];
        const command = {kind, args: value(handle.commands[at + 2]), state: states[handle.commands[at + 1]]};
        if (kind === 'fill' || kind === 'stroke') command.path = value(handle.commands[at + 3]);
        if (kind === 'image') command.image = resources[handle.commands[at + 4]];
        commands[i] = command; counts.objects++; counts.commands++;
      }
      Object.defineProperty(packet, 'commands', {value: commands, enumerable: true, configurable: true, writable: true});
      counts.total = counts.objects + counts.arrays; this.lastDecode = Object.freeze(counts); return packet;
    }
    inspect(handle) {
      if (handle !== undefined) this.require(handle);
      return Object.freeze({generation: this.generation, valid: !!this.current, encode: this.current ? this.current.stats : null,
        decode: this.lastDecode, capacity: Object.freeze({words: this.words.data.length, numbers: this.numbers.data.length,
          bytes: this.words.data.byteLength + this.numbers.data.byteLength}), limits: this.options});
    }
  }
  return {Codec, CodecError, COMMAND_STRIDE, KINDS, NONE};
});
