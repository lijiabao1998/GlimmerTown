'use strict';

// Disposable diagnostic only. The product's draw function is never edited.
function nativePrefixBridge604(ctx, cvs, getGroundCache) {
  let boundary, sourcePrefix, prefix, compiledPrefix, parts, rows, views, proofBytes;
  let revision = 1000000;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = cvs.width;
    canvas.height = cvs.height;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { canvas, g };
  };
  const bytes = o => o.g.getImageData(0, 0, cvs.width, cvs.height).data;
  const sha = async a => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', a)))
    .map(n => n.toString(16).padStart(2, '0')).join('');
  const delta = (a, b) => {
    let changedPixels = 0, maxChannelDelta = 0, over1 = 0, over5 = 0;
    for (let i = 0; i < a.length; i += 4) {
      let d = 0;
      for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a[i + k] - b[i + k]));
      if (d) changedPixels++;
      if (d > 1) over1++;
      if (d > 5) over5++;
      maxChannelDelta = Math.max(maxChannelDelta, d);
    }
    return { changedPixels, maxChannelDelta, over1, over5 };
  };
  const clear = g => {
    g.save(); g.resetTransform(); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore();
  };
  const readGL = () => {
    const gl = parts.gpu.gl, stride = cvs.width * 4;
    const raw = new Uint8Array(stride * cvs.height), out = new Uint8Array(raw.length);
    gl.readPixels(0, 0, cvs.width, cvs.height, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    for (let y = 0; y < cvs.height; y++) out.set(raw.subarray((cvs.height - 1 - y) * stride, (cvs.height - y) * stride), y * stride);
    return out;
  };

  function capture() {
    boundary = sourcePrefix = null;
    let imageCount = 0;
    const old = ctx.drawImage;
    ctx.drawImage = function(image, ...args) {
      if (!imageCount) {
        const p = __atlas604.nativePrefixParts();
        const groups = p.trace.filter(op => op.name === 'flush');
        boundary = {
          traceExclusive: p.trace.length,
          batchExclusive: groups.length,
          lastBatch: groups.at(-1)?.args[0],
          firstImageIsGroundCache: image === getGroundCache(),
          firstImage: { width: image.width, height: image.height, args },
          imageCallsBeforeBoundary: imageCount,
          transform: [ctx.getTransform().a, ctx.getTransform().b, ctx.getTransform().c,
            ctx.getTransform().d, ctx.getTransform().e, ctx.getTransform().f]
        };
        // One reference read before the first original main-canvas image call.
        // No drawing is skipped; the remaining original frame still executes.
        sourcePrefix = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      }
      imageCount++;
      return old.call(this, image, ...args);
    };
    let captured;
    try { captured = __atlas604.capture(); } finally { ctx.drawImage = old; }
    if (!boundary || !sourcePrefix || !boundary.firstImageIsGroundCache || boundary.lastBatch !== boundary.batchExclusive - 1)
      throw Error('Opaque prefix must end immediately before the first ground-cache image');
    if (captured.semantics.clips || !captured.supported) throw Error('Unobserved prefix clip or unsupported vector semantics');
    boundary.totalMainCanvasImageCalls = imageCount;
    boundary.originalClips = captured.semantics.clips;
    return { ...captured, prefixBoundary: boundary };
  }

  function prepare() {
    const setup = __atlas604.prepare();
    parts = __atlas604.nativePrefixParts();
    const prefixTrace = parts.trace.slice(0, boundary.traceExclusive);
    const first = prefixTrace.find(op => op.state);
    if (!first || first.name !== 'fillRect' || JSON.stringify(first.args) !== JSON.stringify([0, 0, cvs.width, cvs.height]) ||
        first.state.globalAlpha !== 1 || first.state.globalCompositeOperation !== 'source-over' ||
        JSON.stringify(first.transform) !== '[1,0,0,1,0,0]') throw Error('Prefix does not begin with the original full-screen opaque sky');
    compiledPrefix = parts.compileTrace(prefixTrace);
    prefix = make();
    const extraTextureBytes = cvs.width * cvs.height * 4;
    if (setup.packing.bytes + extraTextureBytes > 128 * 1024 * 1024) throw Error('Prefix plus unchanged atlas exceeds explicit 128 MiB budget');
    rows = [{ image: prefix.canvas, dst: [0, 0, cvs.width, cvs.height], smoothing: false,
      blend: 'source-over', alpha: 1, revision },
      ...parts.commands.filter((_, i) => setup.packing.slots[i].index >= boundary.batchExclusive).map(c => ({ ...c }))];
    return { ...setup, prefix: { width: cvs.width, height: cvs.height, originalOrigin: [0, 0],
      additionalClipCalls: 0, extraTextureBytes, totalTextureBytes: setup.packing.bytes + extraTextureBytes,
      preservedAtlasPacking: true, batches: boundary.batchExclusive,
      paintCalls: prefixTrace.filter(op => op.state).length, imageCalls: 0,
      gradientObjects: compiledPrefix.gradientObjects, boundary } };
  }

  function paintPrefix(target = prefix) {
    clear(target.g);
    // All native blends resolve against the original opaque prefix in order.
    // There is no tile clip, transform offset, intermediate group or copy.
    compiledPrefix.render(target.g, compiledPrefix.paints, () => {});
  }

  async function validate(oldFactors) {
    parts = __atlas604.nativePrefixParts();
    const old = parts.factorState;
    if (!old) throw Error('Original R/G/T/W evidence required first');
    parts.gpu.render(old.rows);
    const originalAtlasPixels = readGL();
    const again = make(); paintPrefix(); paintPrefix(again);
    const prefixPixels = bytes(prefix), prefixAgain = bytes(again);
    let nonOpaquePixels = 0;
    for (let i = 3; i < prefixPixels.length; i += 4) if (prefixPixels[i] !== 255) nonOpaquePixels++;
    const assemble = pages => {
      const out = make(); out.g.drawImage(prefix.canvas, 0, 0);
      for (const b of parts.direct) {
        if (b.index < boundary.batchExclusive) continue;
        out.g.globalCompositeOperation = parts.audit.batches[b.index].blend;
        out.g.drawImage(pages[b.slot.page].canvas, b.slot.x, b.slot.y, b.slot.w, b.slot.h,
          ...parts.audit.batches[b.index].bounds);
      }
      return out;
    };
    const G = assemble(old.pages.copy), T = assemble(old.pages.direct), G2 = assemble(old.pages.copy), T2 = assemble(old.pages.direct);
    const prefixRow = { image: prefix.canvas, dst: [0, 0, cvs.width, cvs.height], smoothing: false,
      blend: 'source-over', alpha: 1, revision: 0 };
    parts.gpu.upload(prefix.canvas, 0);
    const hybridRows = [prefixRow, ...old.rows.filter((_, i) => parts.direct[i].index >= boundary.batchExclusive)];
    parts.gpu.render([prefixRow]); const prefixGL = readGL();
    parts.gpu.render(hybridRows); const W = readGL();
    parts.gpu.render(hybridRows); const W2 = readGL();
    parts.gpu.render([{ ...prefixRow, dst: [3, 0, cvs.width, cvs.height] }, ...hybridRows.slice(1)]); const wrong = readGL();
    parts.gpu.render([...hybridRows.slice(1), prefixRow]); const wrongOrder = readGL();
    parts.gpu.render(hybridRows); const restored = readGL();
    const R = old.views.R.getContext('2d').getImageData(0, 0, cvs.width, cvs.height).data;
    const data = { R, G: bytes(G), T: bytes(T), W, prefix: prefixPixels };
    proofBytes = { atlas: originalAtlasPixels, prefix: W, nativePrefix: prefixPixels, R };
    const stages = { grouping: delta(R, data.G), translatedTiles: delta(data.G, data.T),
      GLAssembly: delta(data.T, W), total: delta(R, W) };
    const frameHashes = {};
    for (const [name, pixels] of Object.entries(data)) frameHashes[name] = await sha(pixels);
    views = { canvases: { R: old.views.R, G: G.canvas, T: T.canvas, W: parts.gpu.canvas, prefix: prefix.canvas }, hybridRows, frameHashes };
    for (const c of Object.values(views.canvases)) {
      c.style = 'position:absolute;inset:0;width:100%;height:100%;display:none';
      c.style.setProperty('visibility', 'visible', 'important');
      if (!c.parentNode) parts.layer.append(c);
    }
    const prefixComparison = { originalBeforeFirstImage: delta(sourcePrefix, prefixPixels),
      freshRepeat: delta(prefixPixels, prefixAgain), GLUpload: delta(prefixPixels, prefixGL), nonOpaquePixels };
    const repeats = { G: delta(data.G, bytes(G2)), T: delta(data.T, bytes(T2)), W: delta(W, W2), restored: delta(W, restored) };
    const negative = { displacedPrefix: delta(W, wrong), prefixDrawnLast: delta(W, wrongOrder) };
    const remainingFraction = stages.total.changedPixels / oldFactors.stages.total.changedPixels;
    const correctnessGo = nonOpaquePixels === 0 && Object.values(prefixComparison).filter(v => v && typeof v === 'object').every(d => d.changedPixels === 0) &&
      Object.values(repeats).every(d => d.changedPixels === 0) && stages.GLAssembly.changedPixels === 0 &&
      Object.values(negative).every(d => d.changedPixels > 0) && remainingFraction <= .25 && parts.gpu.gl.getError() === 0;
    return { prefixComparison, repeats, negative, stages, remainingFraction, correctnessGo, frameHashes,
      originalPrefixRGBA: await sha(sourcePrefix), pixelGatePassed: stages.total.changedPixels === 0,
      scope: 'Opaque pre-image prefix at original dimensions/origin; remaining native vector groups keep their original atlas slots. Images/HUD/simulation are excluded.' };
  }

  function show(name) {
    if (!views?.canvases[name]) throw Error('Unknown native-prefix view');
    for (const c of parts.layer.children) c.style.display = 'none';
    views.canvases[name].style.display = 'block';
    if (name === 'W') parts.gpu.render(views.hybridRows);
    return { name, frameHash: views.frameHashes[name] };
  }

  function render() {
    const start = performance.now();
    parts.reference.canvas.style.display = 'none'; parts.gpu.canvas.style.display = 'block';
    paintPrefix(); const prefixRasterMs = performance.now() - start;
    const remainingStart = performance.now();
    for (const a of parts.atlases) clear(a.g);
    for (const b of parts.direct) {
      if (b.index < boundary.batchExclusive) continue;
      const g = parts.atlases[b.slot.page].g, s = b.slot;
      g.save(); g.resetTransform(); g.beginPath(); g.rect(s.x, s.y, s.w, s.h); g.clip();
      try { b.render(g, b.paints); } finally { g.restore(); }
    }
    const remainingRasterMs = performance.now() - remainingStart, uploadStart = performance.now();
    revision++;
    parts.gpu.upload(prefix.canvas, revision);
    const prefixUploadMs = performance.now() - uploadStart, atlasUploadStart = performance.now();
    for (const a of parts.atlases) {
      a.g.save(); a.g.fillStyle = revision % 2 ? '#030507' : '#070503'; a.g.fillRect(0, 0, 1, 1); a.g.restore();
      parts.gpu.upload(a.canvas, revision);
    }
    for (const c of rows) c.revision = revision;
    const atlasUploadMs = performance.now() - atlasUploadStart, drawStart = performance.now();
    parts.gpu.render(rows);
    return { mode: 'prefix', prefixRasterMs, remainingRasterMs, prefixUploadMs, atlasUploadMs,
      rasterMs: prefixRasterMs + remainingRasterMs, uploadMs: prefixUploadMs + atlasUploadMs,
      drawMs: performance.now() - drawStart, totalMs: performance.now() - start };
  }

  function measure(which, ms) {
    return new Promise((resolve, reject) => {
      const start = performance.now(), results = [], intervals = []; let last;
      const timer = setTimeout(() => reject(Error('Native prefix RAF stalled')), ms + 20000);
      function frame(t) {
        try {
          if (document.visibilityState !== 'visible' || !document.hasFocus()) throw Error('Native prefix lost foreground');
          if (last !== undefined) intervals.push(t - last);
          last = t;
          results.push(which === 'atlas' ? __atlas604.render('atlas') : render());
          if (t - start >= ms) { clearTimeout(timer); resolve({ mode: which, elapsed: t - start, rows: results, intervals }); }
          else requestAnimationFrame(frame);
        } catch (e) { clearTimeout(timer); reject(e); }
      }
      requestAnimationFrame(frame);
    });
  }
  // No clock/FPS sampling. Each condition starts with brand-new Canvas sources,
  // performs a fixed number of paints/uploads, then makes one final read.
  async function probeFresh(which, count) {
    const setup = prepare();
    for (let i = 0; i < count; i++) {
      await new Promise(resolve => requestAnimationFrame(() => {
        if (which === 'atlas') __atlas604.render('atlas'); else render();
        resolve();
      }));
    }
    const output = readGL();
    const reference = make();
    const actualRows = which === 'atlas' ? parts.commands : rows;
    Gpu604.reference(reference.g, actualRows);
    const samePixelsCanvas = bytes(reference);
    let prefixAfterPaint = null;
    if (which === 'prefix') prefixAfterPaint = delta(sourcePrefix, bytes(prefix));
    const image = make(); image.g.putImageData(new ImageData(new Uint8ClampedArray(output), cvs.width, cvs.height), 0, 0);
    return {
      mode: which, draws: count, setup: setup.prefix, performanceSamples: 0,
      previousProofDifference: delta(proofBytes[which], output),
      actualSameSourceCanvasVsGL: delta(samePixelsCanvas, output),
      originalNativeDifference: delta(proofBytes.R, output),
      originalPrefixDifference: prefixAfterPaint,
      rgbaSHA256: await sha(output), sourcePrefixSHA256: which === 'prefix' ? await sha(bytes(prefix)) : null,
      assets: { output: image.canvas.toDataURL('image/png'), sameSourceCanvas: reference.canvas.toDataURL('image/png') },
      glError: parts.gpu.gl.getError()
    };
  }
  window.__prefix604 = { capture, prepare, validate, show, measure,
    probeFresh,
    renderMode: which => which === 'atlas' ? __atlas604.render('atlas') : render() };
}
module.exports = { nativePrefixBridge604 };
