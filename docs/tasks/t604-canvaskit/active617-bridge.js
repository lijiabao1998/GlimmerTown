  // T617 inspectors and one passive sampler. Production frame/advance/tick/draw
  // and both random generators remain original throughout the timed sequence.
  const originals617 = { frame, advance, tick, draw, updHud, lotObjectOrder574, lotNightLayer574 };
  const intact617 = () => frame === originals617.frame && advance === originals617.advance &&
    tick === originals617.tick && draw === originals617.draw && updHud === originals617.updHud &&
    lotObjectOrder574 === originals617.lotObjectOrder574 && lotNightLayer574 === originals617.lotNightLayer574;
  const noObserver617 = () => !window.__source612 && !window.__source614 && !window.__source616 &&
    typeof window.TownRetained614 === 'undefined' && typeof window.__townRenderer604 === 'undefined';
  const toggles617 = () => Object.fromEntries(Object.keys(window).filter(k => /^__no/.test(k)).sort().map(k => [k, window[k]]));
  const fixed617 = () => ({ width: W, height: H, dpr: DPR, cam: { ...cam }, rot: viewRotEff(),
    quality, size: N, seed, diff, ai: aiMode, sound: localStorage.getItem(SAVEKEY + '.snd'),
    slot: curSlot(), toggles: toggles617() });
  const compact617 = () => ({ day, simAcc, visT, season: season(), weather, pop,
    occupied: tickBld.length,
    vehicles: cars.length + trains.length + cargoShips.length + tramCars.length + ambulances.length +
      recycleTrucks.length + ladderTrucks.length + policeCars.length + schoolBuses.length + buses.length + rbuses.length + lifeShips.length,
    particles: smokes.length + rain.length + confetti.length + fxParts.length, citizens: citizens.length });
  const status617 = () => ({ ...compact617(), fixed: fixed617(), unwrapped: intact617(),
    native: noObserver617(), running, speed, visible: document.visibilityState, focused: document.hasFocus(),
    frameTimestamp: lastT, lastDraw, cycle: CYCLE, dayLength: DAYLEN, timeOrigin: performance.timeOrigin,
    url: location.pathname, version: GAME_VER, art: typeof t603On === 'function' && t603On() });
  const actors617 = () => JSON.stringify({ cars, citizens, smokes, trains, cargoShips, tramCars, ambulances,
    recycleTrucks, ladderTrucks, policeCars, schoolBuses, buses, rbuses, lifeShips, rain, confetti, fxParts });
  const model617 = () => JSON.stringify({ day, money, pop, tiles, simAcc, weather, wxT,
    roadLoad: Array.from(roadLoad), roadPass: Array.from(roadPass) });
  let observation617 = null, observing617 = false, abort617 = null;
  window.__active617 = {
    status: status617,
    snapshot: () => observation617,
    abort: reason => { abort617?.(reason); return !observing617; },
    observe: () => new Promise(resolve => {
      if (observing617 || observation617 || !running || speed !== 0 || !intact617() || !noObserver617()) throw Error('T617 requires one untouched fresh native speed-zero setup');
      observing617 = true;
      const originalR = R, originalRandom = Math.random;
      const result = observation617 = { warmMs: 30000, requestedMs: 110000, sampleLimit: 30000,
        warm: [], samples: [], valid: true, violations: [], complete: false };
      let raf = 0, start, prior, measureStart, fixed, done = false;
      const fail = reason => { result.valid = false; if (!result.violations.includes(reason)) result.violations.push(reason); };
      const finish = reason => {
        if (done) return;
        done = true; observing617 = false; clearTimeout(timer); cancelAnimationFrame(raf);
        if (reason) fail(reason);
        result.after = status617(); result.elapsed = measureStart === undefined || !prior ? 0 : prior.t - measureStart;
        resolve(result);
      };
      abort617 = finish;
      const timer = setTimeout(() => finish('absolute 155-second sampler deadline'), 155000);
      const sample = t => {
        try {
          // The original game callback registered first has already run. Switch
          // speed only at the first anchor; the following interval is active.
          if (start === undefined) { GV.setSpeed(1); start = t; result.start = status617(); fixed = JSON.stringify(result.start.fixed); }
          const now = performance.now(), state = compact617();
          if (!running || speed !== 1 || document.visibilityState !== 'visible' || !document.hasFocus()) fail('inactive or background frame');
          if (!intact617() || !noObserver617() || R !== originalR || Math.random !== originalRandom) fail('source/function/RNG identity changed');
          // Read fixed settings every callback; no full-city scans or readbacks.
          if (JSON.stringify(fixed617()) !== fixed) fail('fixed view/quality/settings changed');
          if (Math.abs(lastT - t) >= .001) fail('original game rAF timestamp mismatch');
          if (prior) {
            const dt = t - prior.t;
            const row = { dt, end: measureStart === undefined ? t - start : t - measureStart,
              ...state, now, previousLastDraw: prior.lastDraw, gameTimestamp: lastT };
            if (!(dt > 0 && dt <= 2000)) fail('nonpositive interval or clock clamp');
            if (!(now - prior.lastDraw < 400)) fail('400ms fallback-timer risk');
            if (Math.abs((state.visT - prior.state.visT) * 1000 - dt) > .05 ||
                Math.abs(((state.day - prior.state.day) * DAYLEN + state.simAcc - prior.state.simAcc) * 1000 - dt) > .05) fail('active clock/model progression mismatch');
            (measureStart === undefined ? result.warm : result.samples).push(row);
          }
          prior = { t, lastDraw, state };
          if (result.warm.length + result.samples.length > result.sampleLimit) return finish('sample resource limit');
          if (measureStart === undefined && t - start >= 30000) {
            measureStart = t; result.before = status617(); result.warmElapsed = t - start;
            if (result.warm.length < 150) return finish('fixed warmup has fewer than 150 frames');
          } else if (measureStart !== undefined && t - measureStart >= 110000) {
            result.complete = true; return finish();
          }
          raf = requestAnimationFrame(sample);
        } catch (error) { finish(String(error)); }
      };
      raf = requestAnimationFrame(sample);
    }),
    endpoint: () => {
      if (observing617 || !observation617?.complete) throw Error('T617 endpoint is strictly after timing');
      const before = model617(), actors = actors617(), oldR = R;
      let rngCalls = 0;
      // This synchronous callback cannot interleave advance/tick. No production
      // clock writes, stopped loops, or model rewinds are needed for draw(0).
      R = (...args) => { rngCalls++; return oldR(...args); };
      try { draw(0); draw(0); } finally { R = oldR; }
      const renderGuard = { modelExact: before === model617(), actorsExact: actors === actors617(), rngCalls, rngRestored: R === oldR };
      if (!renderGuard.modelExact || !renderGuard.actorsExact || rngCalls) throw Error('T617 render mutated model/actors/seeded RNG');
      const roots = window.__s603.roots(), endpoint = { day, money, pop, size: N, seed, diff };
      if (roots.bad || ![day, money, pop, N, seed, diff, simAcc].every(Number.isFinite) || N !== 72 || seed !== 22 || diff !== 3) throw Error('T617 evolved model/footprint invariant');
      GV.save();
      const raw = localStorage.getItem(slotKey(3)), saved = saveInflate(JSON.parse(raw));
      if (saved.day !== day || saved.money !== Math.round(money) || saved.n !== N || saved.seed !== seed || saved.df !== diff || saved.bl.length !== roots.rows.length) throw Error('T617 regenerated save does not match evolved endpoint');
      // Canonical persistence semantics are checked at this endpoint, never
      // against the pre-run city or a different fresh child's trajectory.
      const canonical = window.__s603.saved(), beforeSave = model617();
      GV.save();
      if (canonical !== window.__s603.saved() || model617() !== beforeSave) throw Error('T617 repeated save changed persisted/model data');
      if (!GV.load()) throw Error('T617 evolved save did not load');
      const roundtripRoots = window.__s603.roots();
      GV.save();
      if (roundtripRoots.bad || JSON.stringify(roots) !== JSON.stringify(roundtripRoots) || canonical !== window.__s603.saved()) throw Error('T617 evolved canonical save/root roundtrip changed');
      return { passed: true, renderGuard, endpoint, rootCount: roots.rows.length, roots: roots.rows,
        canonical, canonicalExact: true, roundtripExact: true, status: status617(),
        scope: 'Own evolved endpoint; load intentionally resets runtime RNG/weather/actors after timing. Cross-run final model equality is not asserted.' };
    }
  };
