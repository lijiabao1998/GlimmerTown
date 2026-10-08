/* T604 isolated candidate. CanvasKit 0.42; no game state, DOM, or readback dependencies.
 * Gradient coordinate semantics: https://html.spec.whatwg.org/multipage/canvas.html#fill-and-stroke-styles
 * Native clear/image AA policy: Chromium canvas_2d_recorder_context.cc,
 * GetClearFlags / ShouldDrawImageAntialiased / DrawImageInternal.
 * CanvasKit 0.42 drawImageRectOptions uses kFast_SrcRectConstraint, matching
 * Chromium's kDoNotClampImageToSourceRect. Browser parity is a separate gate.
 */
(function (root, factory) {
  'use strict';
  const Player = factory();
  if (typeof module === 'object' && module.exports) module.exports = Player;
  else root.TownSkiaPlayer604 = Player;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ID = [1, 0, 0, 1, 0, 0];
  const TAU = Math.PI * 2;
  const BLENDS = Object.freeze({
    'source-over': 'SrcOver', 'destination-over': 'DstOver',
    'source-atop': 'SrcATop', 'destination-out': 'DstOut', xor: 'Xor',
    lighter: 'Plus', screen: 'Screen', multiply: 'Multiply', overlay: 'Overlay',
    darken: 'Darken', lighten: 'Lighten', 'color-dodge': 'ColorDodge',
    'color-burn': 'ColorBurn', 'hard-light': 'HardLight', 'soft-light': 'SoftLight',
    difference: 'Difference', exclusion: 'Exclusion', hue: 'Hue',
    saturation: 'Saturation', color: 'Color', luminosity: 'Luminosity'
  });
  const CAPS = {butt: 'Butt', round: 'Round', square: 'Square'};
  const JOINS = {miter: 'Miter', round: 'Round', bevel: 'Bevel'};
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  class Unsupported extends Error {
    constructor(reasons) {
      super('T604 CanvasKit frame unsupported: ' + reasons.join('; '));
      this.name = 'TownSkiaUnsupportedError';
      this.code = 'T604_UNSUPPORTED';
      this.reasons = reasons;
    }
  }
  function fail(reason) { throw new Unsupported([reason]); }
  function numbers(a, count, label) {
    if (!Array.isArray(a) || a.length !== count || !a.every(Number.isFinite)) fail(label + ': invalid numeric arguments');
    return a.slice();
  }
  function matrix(a, label) {
    const m = numbers(a, 6, label);
    if (!Number.isFinite(m[0] * m[3] - m[1] * m[2]) || m[0] * m[3] === m[1] * m[2]) fail(label + ': singular transform');
    return m;
  }
  function inverse(m) {
    const d = m[0] * m[3] - m[1] * m[2];
    const out = [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d,
      (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
    if (!out.every(Number.isFinite)) fail('transform inverse overflow');
    return out;
  }
  function multiply(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  function point(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function skMatrix(m) { return [m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1]; }

  // The recorder supplies the native canvas getter's canonical CSS strings.
  // Chromium's legacy rgba alpha is an 8-bit value before gradient interpolation.
  function parseColor(css) {
    if (typeof css !== 'string') fail('color must be a canonical CSS string');
    const s = css.trim().toLowerCase();
    if (s === 'transparent') return [0, 0, 0, 0];
    if (s === 'black') return [0, 0, 0, 1];
    if (s === 'white') return [1, 1, 1, 1];
    if (/^#[0-9a-f]{3,4}$/.test(s)) return parseColor('#' + s.slice(1).split('').map(c => c + c).join(''));
    if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(s)) {
      return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255,
        parseInt(s.slice(5, 7), 16) / 255, s.length === 9 ? parseInt(s.slice(7, 9), 16) / 255 : 1];
    }
    const m = /^(rgb|rgba)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*((?:\d+(?:\.\d*)?|\.\d+)))?\s*\)$/.exec(s);
    if (!m || (m[1] === 'rgba') !== (m[5] !== undefined)) fail('unsupported CSS color: ' + css);
    const rgb = [Number(m[2]), Number(m[3]), Number(m[4])];
    const a = m[5] === undefined ? 1 : Number(m[5]);
    if (rgb.some(c => c > 255) || a < 0 || a > 1) fail('noncanonical CSS color: ' + css);
    return [...rgb.map(c => c / 255), Math.round(a * 255) / 255];
  }
  function style(value) {
    if (typeof value === 'string') return {color: parseColor(value)};
    if (!value || !['linear', 'radial'].includes(value.type)) fail('unsupported paint style');
    const a = numbers(value.args, value.type === 'linear' ? 4 : 6, 'gradient');
    if (value.type === 'radial' && (a[2] < 0 || a[5] < 0)) fail('negative radial radius');
    if (!Array.isArray(value.stops)) fail('gradient has no stop list');
    const stops = value.stops.map((s, i) => {
      if (!s || !Number.isFinite(s.offset) || s.offset < 0 || s.offset > 1) fail('invalid gradient stop');
      return {offset: s.offset, color: parseColor(s.color), order: i};
    }).sort((a, b) => a.offset - b.offset || a.order - b.order);
    const degenerate = value.type === 'linear' ? a[0] === a[2] && a[1] === a[3]
      : (a[0] === a[3] && a[1] === a[4] && a[2] === a[5]) || (a[2] === 0 && a[5] === 0);
    if (!stops.length || degenerate) return {color: [0, 0, 0, 0]};
    if (stops.length === 1) {
      // A one-stop radial gradient still has the cone's coverage boundary.
      stops.unshift({offset: 0, color: stops[0].color, order: -1});
      stops[1] = {offset: 1, color: stops[1].color, order: 0};
    }
    return {type: value.type, args: a, stops};
  }
  function fillRule(rule) {
    if (rule === undefined || rule === 'nonzero') return 'nonzero';
    if (rule === 'evenodd') return rule;
    fail('unsupported fill rule');
  }
  function roundRadii(input) {
    const list = Array.isArray(input) ? input : [input === undefined ? 0 : input];
    if (list.length < 1 || list.length > 4) fail('roundRect requires 1–4 radii');
    const radii = list.map(r => {
      const p = typeof r === 'number' ? [r, r] : r && [r.x === undefined ? 0 : r.x, r.y === undefined ? 0 : r.y];
      if (!p || !p.every(Number.isFinite) || p.some(n => n < 0)) fail('invalid roundRect radius');
      return p;
    });
    if (radii.length === 1) return [radii[0], radii[0], radii[0], radii[0]];
    if (radii.length === 2) return [radii[0], radii[1], radii[0], radii[1]];
    if (radii.length === 3) return [radii[0], radii[1], radii[2], radii[1]];
    return radii;
  }

  // Produce exact conic/Bezier verbs in paint-local coordinates. Each input
  // command carries its creation CTM; stroke width/dashes keep the paint CTM.
  function pathOps(path, paintMatrix) {
    if (!Array.isArray(path)) fail('missing recorded path');
    const base = inverse(paintMatrix), ops = [];
    let current = null, start = null;
    function emit(name, args) {
      if (!args.every(Number.isFinite)) fail('path coordinate overflow');
      ops.push({name, args});
    }
    function move(p) { emit('moveTo', p); current = p; start = p; }
    function line(p) { if (!current) move(p); else { emit('lineTo', p); current = p; } }
    function close() { if (current) { emit('close', []); current = start; } }
    function ellipse(m, cx, cy, rx, ry, rotation, a0, a1, ccw) {
      let sweep = a1 - a0;
      if (!ccw && sweep >= TAU) sweep = TAU;
      else if (ccw && -sweep >= TAU) sweep = -TAU;
      else { sweep %= TAU; if (!ccw && sweep < 0) sweep += TAU; if (ccw && sweep > 0) sweep -= TAU; }
      a0 %= TAU;
      const co = Math.cos(rotation), si = Math.sin(rotation);
      function p(angle, scale) {
        const x = rx * Math.cos(angle) * scale, y = ry * Math.sin(angle) * scale;
        return point(m, cx + co * x - si * y, cy + si * x + co * y);
      }
      line(p(a0, 1));
      const count = Math.ceil(Math.abs(sweep) / (Math.PI / 2));
      for (let i = 0; i < count; i++) {
        const a = a0 + sweep * i / count, b = a0 + sweep * (i + 1) / count;
        const weight = Math.cos((b - a) / 2), control = p((a + b) / 2, 1 / weight), end = p(b, 1);
        emit('conicTo', [...control, ...end, weight]); current = end;
      }
    }
    for (const command of path) {
      if (!command || typeof command.name !== 'string') fail('invalid path command');
      const m = multiply(base, matrix(command.transform, 'path'));
      const raw = command.args;
      let a;
      switch (command.name) {
        case 'beginPath': numbers(raw, 0, 'beginPath'); ops.length = 0; current = null; start = null; break;
        case 'moveTo': a = numbers(raw, 2, 'moveTo'); move(point(m, ...a)); break;
        case 'lineTo': a = numbers(raw, 2, 'lineTo'); line(point(m, ...a)); break;
        case 'closePath': numbers(raw, 0, 'closePath'); close(); break;
        case 'bezierCurveTo':
          a = numbers(raw, 6, 'bezierCurveTo');
          if (!current) move(point(m, a[0], a[1]));
          emit('cubicTo', [...point(m, a[0], a[1]), ...point(m, a[2], a[3]), ...point(m, a[4], a[5])]);
          current = point(m, a[4], a[5]); break;
        case 'quadraticCurveTo':
          a = numbers(raw, 4, 'quadraticCurveTo');
          if (!current) move(point(m, a[0], a[1]));
          emit('quadTo', [...point(m, a[0], a[1]), ...point(m, a[2], a[3])]);
          current = point(m, a[2], a[3]); break;
        case 'rect':
          a = numbers(raw, 4, 'rect');
          move(point(m, a[0], a[1])); line(point(m, a[0] + a[2], a[1]));
          line(point(m, a[0] + a[2], a[1] + a[3])); line(point(m, a[0], a[1] + a[3])); close(); break;
        case 'arc':
        case 'ellipse': {
          const n = command.name === 'arc' ? 5 : 7;
          if (!Array.isArray(raw) || (raw.length !== n && raw.length !== n + 1)) fail('invalid arc argument count');
          a = numbers(raw.slice(0, n), n, command.name);
          if (raw.length === n + 1 && typeof raw[n] !== 'boolean') fail('invalid arc direction');
          if (a[2] < 0 || (n === 7 && a[3] < 0)) fail('negative arc radius');
          if (n === 5) ellipse(m, a[0], a[1], a[2], a[2], 0, a[3], a[4], !!raw[n]);
          else ellipse(m, ...a, !!raw[n]);
          break;
        }
        case 'arcTo': {
          a = numbers(raw, 5, 'arcTo');
          if (a[4] < 0) fail('negative arcTo radius');
          if (!current) { move(point(m, a[0], a[1])); break; }
          const p0 = point(inverse(m), ...current), p1 = a.slice(0, 2), p2 = a.slice(2, 4);
          let u = [p0[0] - p1[0], p0[1] - p1[1]], v = [p2[0] - p1[0], p2[1] - p1[1]];
          const lu = Math.hypot(...u), lv = Math.hypot(...v);
          if (!lu || !lv || !a[4] || u[0] * v[1] === u[1] * v[0]) { line(point(m, ...p1)); break; }
          u = u.map(x => x / lu); v = v.map(x => x / lv);
          const theta = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
          const distance = a[4] / Math.tan(theta / 2), bisector = [u[0] + v[0], u[1] + v[1]];
          const factor = a[4] / (Math.sin(theta / 2) * Math.hypot(...bisector));
          const center = [p1[0] + bisector[0] * factor, p1[1] + bisector[1] * factor];
          const p = [p1[0] + u[0] * distance, p1[1] + u[1] * distance];
          const q = [p1[0] + v[0] * distance, p1[1] + v[1] * distance];
          ellipse(m, ...center, a[4], a[4], 0, Math.atan2(p[1] - center[1], p[0] - center[0]),
            Math.atan2(q[1] - center[1], q[0] - center[0]), u[0] * v[1] - u[1] * v[0] > 0);
          break;
        }
        case 'roundRect': {
          if (!Array.isArray(raw) || (raw.length !== 4 && raw.length !== 5)) fail('invalid roundRect arguments');
          a = numbers(raw.slice(0, 4), 4, 'roundRect');
          // Negative dimensions change winding and corner assignment. They are
          // deliberately preflight-rejected until native paired fixtures exist.
          if (a[2] <= 0 || a[3] <= 0) fail('nonpositive roundRect dimensions');
          let r = roundRadii(raw[4]);
          const scale = Math.min(1, a[2] / (r[0][0] + r[1][0]), a[2] / (r[3][0] + r[2][0]),
            a[3] / (r[0][1] + r[3][1]), a[3] / (r[1][1] + r[2][1]));
          r = r.map(p => p.map(n => n * scale));
          const [x, y, w, h] = a;
          move(point(m, x + r[0][0], y)); line(point(m, x + w - r[1][0], y));
          ellipse(m, x + w - r[1][0], y + r[1][1], ...r[1], 0, -Math.PI / 2, 0, false);
          line(point(m, x + w, y + h - r[2][1]));
          ellipse(m, x + w - r[2][0], y + h - r[2][1], ...r[2], 0, 0, Math.PI / 2, false);
          line(point(m, x + r[3][0], y + h));
          ellipse(m, x + r[3][0], y + h - r[3][1], ...r[3], 0, Math.PI / 2, Math.PI, false);
          line(point(m, x, y + r[0][1]));
          ellipse(m, x + r[0][0], y + r[0][1], ...r[0], 0, Math.PI, Math.PI * 1.5, false);
          close(); move(point(m, x, y)); break;
        }
        default: fail('unsupported path command: ' + command.name);
      }
    }
    return ops;
  }

  function imageRects(args, image) {
    if (!Array.isArray(args) || ![2, 4, 8].includes(args.length)) fail('invalid drawImage argument count');
    const a = numbers(args, args.length, 'drawImage');
    let src = [0, 0, image.width, image.height], dst;
    if (a.length === 2) dst = [a[0], a[1], image.width, image.height];
    else if (a.length === 4) dst = a;
    else { src = a.slice(0, 4); dst = a.slice(4); }
    for (const r of [src, dst]) {
      if (r[2] < 0) { r[0] += r[2]; r[2] *= -1; }
      if (r[3] < 0) { r[1] += r[3]; r[3] *= -1; }
    }
    if (!src[2] || !src[3] || !dst[2] || !dst[3]) return null;
    const l = Math.max(0, src[0]), t = Math.max(0, src[1]);
    const r = Math.min(image.width, src[0] + src[2]), b = Math.min(image.height, src[1] + src[3]);
    if (r <= l || b <= t) return null;
    const result = {src: [l, t, r, b], dst: [dst[0] + (l - src[0]) / src[2] * dst[2],
      dst[1] + (t - src[1]) / src[3] * dst[3], dst[0] + (r - src[0]) / src[2] * dst[2],
      dst[1] + (b - src[1]) / src[3] * dst[3]]};
    if (![...result.src, ...result.dst].every(Number.isFinite)) fail('image coordinate overflow');
    return result;
  }
  function imageAntialias(m, rects) {
    if (!rects) return false;
    const straight = m[1] === 0 && m[2] === 0, quarterTurn = m[0] === 0 && m[3] === 0;
    if (!straight && !quarterTurn) return true;
    const w = rects.dst[2] - rects.dst[0], h = rects.dst[3] - rects.dst[1];
    return w * Math.abs(quarterTurn ? m[1] : m[0]) < 1 || h * Math.abs(quarterTurn ? m[2] : m[3]) < 1;
  }

  class TownSkiaPlayer604 {
    constructor(CK, surface, options) {
      if (!CK || !surface || typeof surface.getCanvas !== 'function') throw new TypeError('CanvasKit and surface are required');
      this.CK = CK; this.surface = surface; this.canvas = surface.getCanvas();
      this.options = Object.assign({maxTextureBytes: 64 * 1024 * 1024, maxTextureCount: 256}, options);
      if (!Number.isSafeInteger(this.options.maxTextureBytes) || this.options.maxTextureBytes < 0 ||
          !Number.isSafeInteger(this.options.maxTextureCount) || this.options.maxTextureCount < 0) throw new TypeError('invalid texture budget');
      this.textures = new Map(); this.textureBytes = 0; this.frame = 0; this.disposed = false;
    }
    _compile(packet) {
      if (this.disposed) fail('player disposed');
      if (!packet || !Number.isSafeInteger(packet.width) || !Number.isSafeInteger(packet.height) || packet.width <= 0 || packet.height <= 0) fail('invalid packet dimensions');
      if (packet.width !== this.surface.width() || packet.height !== this.surface.height()) fail('packet/surface dimensions differ');
      if (!Array.isArray(packet.commands)) fail('missing command list');
      const commands = [], images = new Map();
      let bytes = 0;
      for (let i = 0; i < packet.commands.length; i++) {
        try {
          const c = packet.commands[i], s = c && c.state;
          if (!c || !s) fail('missing command/state');
          if (!['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'image'].includes(c.kind)) fail('unsupported paint command: ' + c.kind);
          const m = matrix(s.transform, 'paint');
          const clips = (s.clips || []).map(clip => ({ops: pathOps(clip.path, ID), rule: fillRule(clip.rule)}));
          const out = {kind: c.kind, matrix: m, clips};
          if (c.kind === 'clearRect') {
            out.args = numbers(c.args, 4, 'clearRect'); commands.push(out); continue;
          }
          if (!Number.isFinite(s.globalAlpha) || s.globalAlpha < 0 || s.globalAlpha > 1) fail('invalid globalAlpha');
          if (!Object.prototype.hasOwnProperty.call(BLENDS, s.globalCompositeOperation) || !this.CK.BlendMode[BLENDS[s.globalCompositeOperation]]) fail('unsupported composite operation: ' + s.globalCompositeOperation);
          const shadow = parseColor(s.shadowColor === undefined ? 'rgba(0, 0, 0, 0)' : s.shadowColor);
          for (const key of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY']) if (s[key] !== undefined && !Number.isFinite(s[key])) fail('invalid ' + key);
          if (shadow[3] > 0 && ((s.shadowBlur || 0) > 0 || (s.shadowOffsetX || 0) !== 0 || (s.shadowOffsetY || 0) !== 0)) fail('active shadow requires native whole-frame rendering');
          const filter = s.filter === undefined ? 'none' : s.filter;
          if (filter !== 'none' && !(c.kind === 'image' && /^brightness\(0(?:\.0*)?%?\)$/.test(filter))) fail('unsupported filter: ' + filter);
          out.alpha = s.globalAlpha; out.blend = BLENDS[s.globalCompositeOperation]; out.black = filter !== 'none';
          out.stroke = c.kind === 'stroke' || c.kind === 'strokeRect';
          if (out.stroke) {
            if (!Number.isFinite(s.lineWidth) || s.lineWidth <= 0 || !Number.isFinite(s.miterLimit) || s.miterLimit <= 0 || !CAPS[s.lineCap] || !JOINS[s.lineJoin]) fail('invalid stroke state');
            if (!Array.isArray(s.dash) || !s.dash.every(x => Number.isFinite(x) && x >= 0) || !Number.isFinite(s.lineDashOffset)) fail('invalid dash state');
            let dash = s.dash.slice();
            if (dash.length % 2) dash = dash.concat(dash);
            const total = dash.reduce((a, b) => a + b, 0);
            if (!Number.isFinite(total)) fail('dash length overflow');
            if (!total) dash = [];
            out.line = {width: s.lineWidth, miter: s.miterLimit, cap: CAPS[s.lineCap], join: JOINS[s.lineJoin], dash, phase: s.lineDashOffset};
          }
          if (c.kind === 'image') {
            const image = c.image;
            if (!image || !Number.isSafeInteger(image.id) || image.id < 0 || !Number.isSafeInteger(image.revision) || image.revision < 0 ||
                !Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width <= 0 || image.height <= 0 || !image.source) fail('invalid image handle');
            if (typeof this.surface.makeImageFromTextureSource !== 'function') fail('surface has no texture-source upload API');
            if (typeof s.imageSmoothingEnabled !== 'boolean') fail('missing image smoothing state');
            if (s.imageSmoothingQuality && s.imageSmoothingQuality !== 'low') fail('unsupported image smoothing quality');
            out.imageKey = image.id + ':' + image.revision; out.smooth = s.imageSmoothingEnabled;
            out.rects = imageRects(c.args, image);
            const prior = images.get(out.imageKey) || this.textures.get(out.imageKey);
            if (prior && (prior.width !== image.width || prior.height !== image.height)) fail('image revision dimensions changed');
            if (!images.has(out.imageKey)) {
              const size = image.width * image.height * 4;
              if (!Number.isSafeInteger(size)) fail('image size overflow');
              images.set(out.imageKey, {source: image.source, width: image.width, height: image.height, bytes: size}); bytes += size;
            }
          } else {
            out.style = style(out.stroke ? s.strokeStyle : s.fillStyle);
            if (c.kind === 'fill' || c.kind === 'stroke') {
              if (!Array.isArray(c.args) || (c.kind === 'stroke' ? c.args.length !== 0 : c.args.length > 1)) fail('unsupported path paint arguments');
              out.rule = c.kind === 'fill' ? fillRule(c.args[0]) : 'nonzero';
              out.ops = pathOps(c.path, m);
            } else {
              out.args = numbers(c.args, 4, c.kind);
              if (out.stroke && (!out.args[2] || !out.args[3])) fail('degenerate strokeRect');
            }
          }
          commands.push(out);
        } catch (e) {
          if (e instanceof Unsupported) throw new Unsupported(e.reasons.map(r => 'command ' + i + ': ' + r));
          throw new Unsupported(['command ' + i + ': malformed packet (' + e.message + ')']);
        }
      }
      if (bytes > this.options.maxTextureBytes || images.size > this.options.maxTextureCount) fail('frame texture working set exceeds configured budget');
      return {commands, images};
    }
    validate(packet) {
      try { this._compile(packet); return {supported: true, reasons: []}; }
      catch (e) { if (e instanceof Unsupported) return {supported: false, reasons: e.reasons}; throw e; }
    }
    render(packet) {
      const started = now(), plan = this._compile(packet), validated = now();
      const CK = this.CK, canvas = this.canvas, owned = [];
      const stats = {commandCount: plan.commands.length, paintCount: 0, pathCount: 0, shaderCount: 0,
        uploads: 0, uploadBytes: 0, uploadMs: 0, textureHits: 0, evictions: 0,
        resourceCreates: 0, resourcesDeleted: 0, validationMs: validated - started};
      const own = r => { if (!r) fail('CanvasKit resource allocation failed'); owned.push(r); stats.resourceCreates++; return r; };
      let touched = false, flushed = false;
      this.frame++;
      try {
        // Previous successful frames have flushed. Flush again before evicting,
        // also covering a prior draw/flush failure before a fallback retry.
        this.surface.flush();
        const missing = [...plan.images].filter(([key]) => !this.textures.has(key));
        const neededBytes = missing.reduce((sum, [, v]) => sum + v.bytes, 0);
        for (const [key, entry] of [...this.textures].sort((a, b) => a[1].used - b[1].used)) {
          if (this.textureBytes + neededBytes <= this.options.maxTextureBytes && this.textures.size + missing.length <= this.options.maxTextureCount) break;
          if (plan.images.has(key)) continue;
          entry.image.delete(); this.textures.delete(key); this.textureBytes -= entry.bytes;
          stats.evictions++; stats.resourcesDeleted++;
        }
        for (const [key, image] of plan.images) {
          let entry = this.textures.get(key);
          if (entry) stats.textureHits++;
          else {
            const uploadStarted = now();
            // Never use MakeImageFromCanvasImageSource: it performs hidden CPU readback.
            const texture = this.surface.makeImageFromTextureSource(image.source,
              {width: image.width, height: image.height, colorType: CK.ColorType.RGBA_8888,
                alphaType: CK.AlphaType.Unpremul, colorSpace: CK.ColorSpace.SRGB}, false);
            stats.uploadMs += now() - uploadStarted;
            if (!texture) fail('texture-source upload failed for ' + key);
            entry = {image: texture, width: image.width, height: image.height, bytes: image.bytes, used: this.frame};
            this.textures.set(key, entry); this.textureBytes += image.bytes;
            stats.uploads++; stats.uploadBytes += image.bytes; stats.resourceCreates++;
          }
          entry.used = this.frame;
        }
        function buildPath(ops, rule) {
          const builder = new CK.PathBuilder();
          stats.resourceCreates++;
          try {
            builder.setFillType(rule === 'evenodd' ? CK.FillType.EvenOdd : CK.FillType.Winding);
            for (const op of ops) builder[op.name](...op.args);
            stats.pathCount++; return own(builder.detach());
          } finally { builder.delete(); stats.resourcesDeleted++; }
        }
        // Every path, gradient and effect is constructed before the first paint.
        // A rejected frame therefore cannot leave a partly replayed image.
        for (const c of plan.commands) {
          c.clipPaths = c.clips.map(clip => buildPath(clip.ops, clip.rule));
          if (c.ops) c.path = buildPath(c.ops, c.rule);
          const s = c.style;
          if (s && !s.color) {
            const colors = s.stops.map(stop => new Float32Array(stop.color));
            const positions = s.stops.map(stop => stop.offset), a = s.args;
            // Keep original gradient coordinates. Canvas CTM handles arbitrary
            // affine scale/shear; transforming only endpoints is incorrect.
            c.shader = own(s.type === 'linear'
              ? CK.Shader.MakeLinearGradient(a.slice(0, 2), a.slice(2, 4), colors, positions, CK.TileMode.Clamp, skMatrix(ID), 0, CK.ColorSpace.SRGB)
              : CK.Shader.MakeTwoPointConicalGradient(a.slice(0, 2), a[2], a.slice(3, 5), a[5], colors, positions, CK.TileMode.Clamp, skMatrix(ID), 0, CK.ColorSpace.SRGB));
            stats.shaderCount++;
          }
          if (c.line && c.line.dash.length) c.effect = own(CK.PathEffect.MakeDash(c.line.dash, c.line.phase));
        }
        const paint = own(new CK.Paint());
        const black = plan.commands.some(c => c.black) ? own(CK.ColorFilter.MakeMatrix([
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0])) : null;
        stats.prepareMs = now() - validated;
        const drawing = now();
        for (const c of plan.commands) {
          canvas.save();
          try {
            for (const clip of c.clipPaths) canvas.clipPath(clip, CK.ClipOp.Intersect, true);
            canvas.concat(skMatrix(c.matrix));
            // Match Chromium Canvas2D: clearRect has no edge AA; image edges
            // use AA for skew/rotation and subpixel-size destinations only.
            paint.setAntiAlias(c.kind === 'image' ? imageAntialias(c.matrix, c.rects) : c.kind !== 'clearRect');
            paint.setDither(true);
            paint.setShader(c.shader || null); paint.setPathEffect(c.effect || null);
            paint.setColorFilter(c.black ? black : null);
            paint.setStyle(c.stroke ? CK.PaintStyle.Stroke : CK.PaintStyle.Fill);
            paint.setBlendMode(c.kind === 'clearRect' ? CK.BlendMode.Clear : CK.BlendMode[c.blend]);
            const color = c.style && c.style.color || [1, 1, 1, 1];
            paint.setColorComponents(color[0], color[1], color[2], color[3] * (c.alpha === undefined ? 1 : c.alpha));
            if (c.line) {
              paint.setStrokeWidth(c.line.width); paint.setStrokeCap(CK.StrokeCap[c.line.cap]);
              paint.setStrokeJoin(CK.StrokeJoin[c.line.join]); paint.setStrokeMiter(c.line.miter);
            }
            touched = true;
            if (c.kind === 'image') {
              if (c.rects) {
                canvas.drawImageRectOptions(this.textures.get(c.imageKey).image, c.rects.src, c.rects.dst,
                  c.smooth ? CK.FilterMode.Linear : CK.FilterMode.Nearest, CK.MipmapMode.None, paint);
                stats.paintCount++;
              }
            } else if (c.path) { canvas.drawPath(c.path, paint); stats.paintCount++; }
            else {
              const [x, y, w, h] = c.args;
              if (w && h) { canvas.drawRect([Math.min(x, x + w), Math.min(y, y + h), Math.max(x, x + w), Math.max(y, y + h)], paint); stats.paintCount++; }
            }
          } finally { canvas.restore(); }
        }
        stats.drawMs = now() - drawing;
        const flushing = now(); this.surface.flush(); flushed = true; stats.flushMs = now() - flushing;
      } catch (e) {
        if (e instanceof Unsupported) throw e;
        const error = new Unsupported(['CanvasKit replay failed: ' + (e && e.message || e)]);
        error.partialFrame = touched; throw error;
      } finally {
        // Skia retains draw refs, but flush first makes lifetime explicit and
        // allows texture eviction/dispose to follow the same safe boundary.
        try { if (touched && !flushed) this.surface.flush(); }
        finally { for (let i = owned.length - 1; i >= 0; i--) { owned[i].delete(); stats.resourcesDeleted++; } }
      }
      stats.cpuMs = now() - started; stats.textureCount = this.textures.size; stats.textureBytes = this.textureBytes;
      stats.liveResources = this.textures.size;
      return stats;
    }
    dispose() {
      if (this.disposed) return;
      this.surface.flush();
      for (const entry of this.textures.values()) entry.image.delete();
      this.textures.clear(); this.textureBytes = 0; this.disposed = true;
      // The caller owns the surface and its one GPU context.
    }
  }
  TownSkiaPlayer604.Unsupported = Unsupported;
  TownSkiaPlayer604.parseColor = parseColor;
  return TownSkiaPlayer604;
});
