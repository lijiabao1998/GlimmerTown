  // T613: one bounded causal matrix. This is not an adopted renderer variant.
  const originalLayer613 = lotNightLayer574;
  window.__retained613 = {
    causal: async () => {
      const WIDTH = 384, HEIGHT = 256;
      const stateKeys = ['fillStyle', 'strokeStyle', 'globalAlpha', 'globalCompositeOperation', 'imageSmoothingEnabled', 'imageSmoothingQuality', 'filter', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset', 'font', 'textAlign', 'textBaseline', 'direction'];
      let sampleBudget = 32;
      const report = {
        diagnostic: 'T613 native clip representation / paint-selection causal matrix',
        currentCandidate: 'T612 remains NO-GO', adopted: false, performanceRun: false, releaseGatePassed: false,
        completed: false, qualified: false, qualification: { actualHelperReproduced: false, manualUnion3Equivalent: false, controlsStable: false },
        protocol: {
          targetImage: [150, 10.5, 32.5, 31.5], alpha: 0.7,
          union: [[0, 0, 128, 128], [128, 0, 128, 128], [256, 0, 128, 128]], rectangle: [0, 0, 384, 128],
          order: ['actual-helper', 'union3-paints3', 'union3-paints4', 'rect1-paints3', 'rect1-paints4'],
          prefix: ['first', 'same', 'establish-current-path', 'retains-current-path', 'current-path-fill', 'reseed-after-external-path-fill'],
          sources: 'Fresh per paired case; exact T612 32x32 two-fill sprite and mask construction.',
          controls: 'Independent original baseline uses the same prefix. Only after target capture, unchanged original redraws both same surfaces. No extra candidate full draw before target.',
          reads: 'Preserve target scratch-copy bytes, then raw bytes/copy oracles, then copied and raw original/restored controls.',
          manual: 'Real original helper under Path2D clip; either all four lights or their first three, followed by the retained helper final state. Manual three-paint union must equal actual retained helper output.',
          stop: 'Stop on prefix/control instability, missing exact anchor reproduction, or manual-helper inequivalence; otherwise finish these four cells only.',
          sampleLimitAcrossReport: 32
        },
        reproduction: { actual: null, manualHelperEquivalence: null }, cells: [], decision: null
      };
      const detail = (a, b, withSamples = false) => {
        if (!a || !b || a.length !== b.length) return { comparable: false, pixels: null, reason: 'RGBA size/availability differs' };
        let pixels = 0, maxChannelDelta = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
        const samples = [], alpha = { different: 0, rgbOnly: 0, alphaOnly: 0, rgbAndAlpha: 0, maxDelta: 0, original: { zero: 0, one: 0, partial: 0, opaque: 0 }, candidate: { zero: 0, one: 0, partial: 0, opaque: 0 } };
        const bin = (counts, value) => counts[value === 0 ? 'zero' : value === 1 ? 'one' : value === 255 ? 'opaque' : 'partial']++;
        for (let i = 0; i < a.length; i += 4) {
          let changed = false, rgb = false;
          for (let c = 0; c < 4; c++) { const d = Math.abs(a[i + c] - b[i + c]); changed ||= d !== 0; if (c < 3) rgb ||= d !== 0; maxChannelDelta = Math.max(maxChannelDelta, d); }
          if (!changed) continue;
          pixels++;
          const x = i / 4 % WIDTH, y = Math.floor(i / 4 / WIDTH), ad = a[i + 3] !== b[i + 3];
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          if (withSamples && sampleBudget > 0) { samples.push({ x, y, original: Array.from(a.subarray(i, i + 4)), candidate: Array.from(b.subarray(i, i + 4)) }); sampleBudget--; }
          if (ad) alpha.different++;
          alpha[rgb && ad ? 'rgbAndAlpha' : rgb ? 'rgbOnly' : 'alphaOnly']++;
          alpha.maxDelta = Math.max(alpha.maxDelta, Math.abs(a[i + 3] - b[i + 3])); bin(alpha.original, a[i + 3]); bin(alpha.candidate, b[i + 3]);
        }
        return { comparable: true, pixels, maxChannelDelta, bbox: pixels ? { x0, y0, x1, y1 } : null, samples, alpha };
      };
      const exact = value => value && value.comparable === true && value.pixels === 0;
      const copy = canvas => {
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d'); g.drawImage(canvas, 0, 0);
        const bytes = g.getImageData(0, 0, c.width, c.height).data; c.width = c.height = 0; return bytes;
      };
      const sameStates = slots => stateKeys.every(k => slots.base.context[k] === slots.candidate.context[k]) &&
        JSON.stringify(slots.base.context.getLineDash()) === JSON.stringify(slots.candidate.context.getLineDash()) &&
        ['a', 'b', 'c', 'd', 'e', 'f'].every(k => slots.base.context.getTransform()[k] === slots.candidate.context.getTransform()[k]);
      const makeSource = () => {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d'); g.fillStyle = 'rgba(255,70,30,.55)'; g.fillRect(0, 0, 32, 32);
        g.fillStyle = 'rgba(40,190,250,.35)'; g.fillRect(5, 4, 21, 19); return c;
      };
      const runCase = kind => {
        const sprite = makeSource(), mask = makeSource();
        const slots = { base: { canvas: null, context: null }, candidate: { canvas: null, context: null } };
        const lights = [
          { img: sprite, x: 10.25, y: 10.5, w: 32.5, h: 31.5 },
          { occlude574: mask, x: 20, y: 20, w: 16, h: 16, a: 0.5 },
          { rect: [270, 10, 32, 16], col: '#ffe9a0' },
          { rect: [270, 150, 32, 16], col: '#ff7777' }
        ];
        const cell = { id: kind, prefix: [], target: kind === 'actual-helper' ? { implementation: 'unchanged retained612 helper' } : { clip: kind.startsWith('union3') ? 'three adjacent rectangles' : 'one same-area rectangle', paints: kind.endsWith('paints3') ? 3 : 4 }, delta: null, readback: null, controls: null, stateSame: null, qualified: false };
        const invoke = (key, fn, args) => {
          const canvas = lotNightCanvas574, context = lotNightCtx574;
          lotNightCanvas574 = slots[key].canvas; lotNightCtx574 = slots[key].context;
          try { return fn(...args); }
          finally { slots[key] = { canvas: lotNightCanvas574, context: lotNightCtx574 }; lotNightCanvas574 = canvas; lotNightCtx574 = context; }
        };
        const cache = TownRetained612.create({ original: originalLayer613, getSurface: () => ({ canvas: lotNightCanvas574, context: lotNightCtx574, privateClip: true }), sourceVersion: image => __source612.version(image), Path2D, tileSize: 128 });
        const comparePrefix = label => {
          const base = invoke('base', originalLayer613, [lights, 0.7, WIDTH, HEIGHT]), candidate = invoke('candidate', cache.layer, [lights, 0.7, WIDTH, HEIGHT]);
          const row = { label, delta: detail(copy(base), copy(candidate)), stateSame: sameStates(slots), stats: cache.stats().last };
          cell.prefix.push(row);
          if (!exact(row.delta) || !row.stateSame) throw Error('prefix-mismatch:' + label);
        };
        let originalBytes, candidateBytes, originalRaw, candidateRaw;
        try {
          comparePrefix('first'); comparePrefix('same');
          for (const slot of Object.values(slots)) { slot.context.beginPath(); slot.context.rect(342, 226, 11, 13); }
          lights[2].rect[0] = 274; comparePrefix('retains-current-path');
          if (cache.stats().last.mode !== 'partial') throw Error('prefix-current-path-not-partial');
          for (const slot of Object.values(slots)) { slot.context.fillStyle = '#ff33aa'; slot.context.fill(); }
          const pathDelta = detail(copy(slots.base.canvas), copy(slots.candidate.canvas));
          cell.prefix.push({ label: 'current-path-fill', delta: pathDelta });
          if (!exact(pathDelta)) throw Error('prefix-current-path-mismatch');
          comparePrefix('reseed-after-external-path-fill');
          if (cache.stats().last.mode !== 'original') throw Error('prefix-external-fill-not-reseeded');
          lights[0].x = 150; lights[2].rect[0] = 280;
          const base = invoke('base', originalLayer613, [lights, 0.7, WIDTH, HEIGHT]);
          let candidate;
          if (kind === 'actual-helper') {
            candidate = invoke('candidate', cache.layer, [lights, 0.7, WIDTH, HEIGHT]);
            cell.stats = cache.stats().last;
          } else {
            const manual = () => {
              const g = lotNightCtx574, path = new Path2D();
              if (kind.startsWith('union3')) for (const rect of report.protocol.union) path.rect(...rect);
              else path.rect(...report.protocol.rectangle);
              g.save();
              try { g.clip(path); return originalLayer613(kind.endsWith('paints3') ? lights.slice(0, 3) : lights, 0.7, WIDTH, HEIGHT); }
              finally {
                g.restore();
                // Exactly the retained helper's final fill style, smoothing,
                // alpha and composite state after removing its temporary clip.
                g.fillStyle = '#ff7777'; g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
              }
            };
            candidate = invoke('candidate', manual, []);
          }
          // Nothing reads either live output until the target call is finished.
          // Scratch copies preserve the existing T612 measurement order.
          originalBytes = copy(base); candidateBytes = copy(candidate);
          cell.delta = detail(originalBytes, candidateBytes, true); cell.stateSame = sameStates(slots);
          originalRaw = slots.base.context.getImageData(0, 0, WIDTH, HEIGHT).data;
          candidateRaw = slots.candidate.context.getImageData(0, 0, WIDTH, HEIGHT).data;
          cell.readback = { rawDelta: detail(originalRaw, candidateRaw), originalCopyDelta: detail(originalRaw, originalBytes), candidateCopyDelta: detail(candidateRaw, candidateBytes) };
          // Repair is a control only. The arrays above remain the target evidence.
          const repeated = invoke('base', originalLayer613, [lights, 0.7, WIDTH, HEIGHT]), restored = invoke('candidate', originalLayer613, [lights, 0.7, WIDTH, HEIGHT]);
          const repeatedBytes = copy(repeated), restoredBytes = copy(restored);
          cell.controls = { afterRawCheckpoint: true, originalRepeatDelta: detail(originalBytes, repeatedBytes), restoredDelta: detail(originalBytes, restoredBytes), betweenControlsDelta: detail(repeatedBytes, restoredBytes), stateSame: sameStates(slots) };
          const repeatedRaw = slots.base.context.getImageData(0, 0, WIDTH, HEIGHT).data, restoredRaw = slots.candidate.context.getImageData(0, 0, WIDTH, HEIGHT).data;
          Object.assign(cell.controls, { originalRawRepeatDelta: detail(originalRaw, repeatedRaw), restoredRawDelta: detail(originalRaw, restoredRaw), betweenRawControlsDelta: detail(repeatedRaw, restoredRaw) });
          cell.qualified = cell.stateSame && cell.controls.stateSame && exact(cell.readback.originalCopyDelta) && exact(cell.readback.candidateCopyDelta) &&
            ['originalRepeatDelta', 'restoredDelta', 'betweenControlsDelta', 'originalRawRepeatDelta', 'restoredRawDelta', 'betweenRawControlsDelta'].every(key => exact(cell.controls[key]));
          if (!cell.qualified) cell.error = 'state-or-measurement-control-failed';
        } catch (error) { cell.error = String(error && error.message || error); }
        finally {
          cache.dispose();
          for (const slot of Object.values(slots)) { if (slot.canvas) slot.canvas.width = slot.canvas.height = 0; slot.canvas = null; slot.context = null; }
          sprite.width = sprite.height = 0; mask.width = mask.height = 0;
          cell.surfacesDisposed = true;
        }
        return { cell, originalBytes, candidateBytes, originalRaw, candidateRaw };
      };
      const inconclusive = reason => { report.decision = 'INCONCLUSIVE: ' + reason; report.source = __source612.stats(); return report; };
      const anchor = runCase('actual-helper'); report.reproduction.actual = anchor.cell;
      if (!anchor.cell.qualified) return inconclusive('actual-helper prefix/state/readback/original/restored control failed');
      const expected = [255, 73, 36, 7];
      const cornersMatch = [10, 42].every(y => {
        const offset = (y * WIDTH + 182) * 4;
        return [0, 1, 2, 3].every(c => anchor.originalRaw[offset + c] === 0 && anchor.candidateRaw[offset + c] === expected[c]);
      });
      report.qualification.actualHelperReproduced = anchor.cell.delta.pixels === 2 && anchor.cell.readback.rawDelta.pixels === 2 && cornersMatch &&
        anchor.cell.stats.mode === 'partial' && anchor.cell.stats.dirtyTiles === 3 && anchor.cell.stats.tiles === 6 && anchor.cell.stats.executedPaints === 3 && anchor.cell.stats.totalPaints === 4;
      if (!report.qualification.actualHelperReproduced) return inconclusive('unchanged helper did not reproduce the exact two recorded corner pixels and partial-call counts');
      const manual = runCase('union3-paints3'); report.cells.push(manual.cell);
      if (!manual.cell.qualified) return inconclusive('manual three-rectangle/three-paint cell has unstable prefix/state/measurement controls');
      report.reproduction.manualHelperEquivalence = {
        originalCopyDelta: detail(anchor.originalBytes, manual.originalBytes), candidateCopyDelta: detail(anchor.candidateBytes, manual.candidateBytes),
        originalRawDelta: detail(anchor.originalRaw, manual.originalRaw), candidateRawDelta: detail(anchor.candidateRaw, manual.candidateRaw)
      };
      report.qualification.manualUnion3Equivalent = Object.values(report.reproduction.manualHelperEquivalence).every(exact);
      if (!report.qualification.manualUnion3Equivalent) return inconclusive('manual union-three paint sequence does not exactly reproduce the real retained helper');
      for (const kind of ['union3-paints4', 'rect1-paints3', 'rect1-paints4']) {
        const result = runCase(kind); report.cells.push(result.cell);
        if (!result.cell.qualified) return inconclusive(kind + ' has unstable prefix/state/measurement controls');
        result.cell.anchorBaseline = { originalCopyDelta: detail(anchor.originalBytes, result.originalBytes), originalRawDelta: detail(anchor.originalRaw, result.originalRaw) };
        if (!Object.values(result.cell.anchorBaseline).every(exact)) {
          result.cell.qualified = false; result.cell.error = 'cross-cell-original-baseline-drift';
          return inconclusive(kind + ' original baseline differs from the actual-helper anchor');
        }
      }
      report.qualification.controlsStable = true; report.completed = true; report.qualified = true;
      const differs = id => report.cells.find(cell => cell.id === id).delta.pixels > 0;
      const u3 = differs('union3-paints3'), u4 = differs('union3-paints4'), r3 = differs('rect1-paints3'), r4 = differs('rect1-paints4');
      if (u3 && u4 && !r3 && !r4) report.decision = 'Clip representation isolated: both three-rectangle unions differ; both same-area single rectangles are exact. T612 stays rejected; no repair is adopted.';
      else if (u3 && r3 && !u4 && !r4) report.decision = 'Paint-selection dependency established; native batching remains an unproven explanation. Both three-paint cells differ; both four-paint cells are exact. T612 stays rejected; no repair is adopted.';
      else if (u3 && u4 && r3 && r4) report.decision = 'All clipped cells differ. The common clipped partial-clear path remains rejected; this matrix does not isolate its lower-level cause.';
      else report.decision = 'Mixed clip/paint-sequence interaction. No single-factor repair is established; T612 stays rejected.';
      report.source = __source612.stats(); return report;
    }
  };
