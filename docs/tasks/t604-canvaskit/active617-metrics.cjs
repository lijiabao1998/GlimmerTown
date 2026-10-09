'use strict';
const basic = require('./retained616-performance-metrics.cjs');
const finite = Number.isFinite;
const total = a => a.reduce((s, x) => s + x, 0);
const fixedKey = s => JSON.stringify(s.fixed);
const night = s => ((s.visT % 110 + 110) % 110) < 27.5 || ((s.visT % 110 + 110) % 110) >= 82.5;
const distribution = samples => basic.distribution([{ intervals: samples.map(s => s.dt), frames: samples.length, elapsed: total(samples.map(s => s.dt)) }]);
const groups = observation => ({ all: observation.samples, day: observation.samples.filter(s => !night(s)), night: observation.samples.filter(night) });
function buckets(observation) {
  return Array.from({ length: 11 }, (_, i) => observation.samples.filter(s => Math.min(10, Math.floor((s.end - s.dt) / 10000)) === i));
}
function valid(observation) {
  const o = observation;
  if (!o || !o.complete || !o.valid || o.violations.length || o.requestedMs !== 110000 || o.warmMs !== 30000 ||
      o.warm.length < 150 || o.warmElapsed < 30000 || o.warmElapsed >= 30400 || o.elapsed < 110000 || o.elapsed >= 110400) return false;
  const stateOK = s => s && s.unwrapped && s.native && s.running && s.speed === 1 && s.visible === 'visible' && s.focused &&
    s.cycle === 110 && s.dayLength === .9 && s.fixed.size === 72 && s.fixed.seed === 22 && s.fixed.diff === 3 &&
    !s.fixed.ai && s.fixed.slot === 3 && s.fixed.width === 1400 && s.fixed.height === 900 && s.fixed.dpr === 1;
  if (![o.start, o.before, o.after].every(stateOK) || fixedKey(o.start) !== fixedKey(o.before) || fixedKey(o.before) !== fixedKey(o.after)) return false;
  if (Math.abs(total(o.samples.map(s => s.dt)) - o.elapsed) > .01 ||
      Math.abs((o.after.visT - o.before.visT) * 1000 - o.elapsed) > 50 ||
      Math.abs(((o.after.day - o.before.day) * .9 + o.after.simAcc - o.before.simAcc) * 1000 - o.elapsed) > 50) return false;
  let previous = o.before, elapsed = 0;
  for (const s of o.samples) {
    elapsed += s.dt;
    if (![s.dt, s.end, s.visT, s.day, s.simAcc, s.pop, s.occupied, s.vehicles, s.particles, s.citizens, s.now, s.previousLastDraw, s.gameTimestamp].every(finite) ||
        s.dt <= 0 || s.dt > 2000 || s.now - s.previousLastDraw >= 400 || s.now < s.previousLastDraw ||
        Math.abs(s.end - elapsed) > .01 || ![0, 1, 2].includes(s.weather) || ![0, 1, 2, 3].includes(s.season) ||
        [s.pop, s.occupied, s.vehicles, s.particles, s.citizens].some(x => x < 0) ||
        Math.abs((s.visT - previous.visT) * 1000 - s.dt) > .05 ||
        Math.abs(((s.day - previous.day) * .9 + s.simAcc - previous.simAcc) * 1000 - s.dt) > .05) return false;
    previous = s;
  }
  const g = groups(o);
  return g.day.length >= 30 && g.night.length >= 30 && distribution(g.day).elapsed >= 54000 && distribution(g.night).elapsed >= 54000 && buckets(o).every(a => a.length >= 30);
}
const average = (rows, key) => total(rows.map(s => s[key] * s.dt)) / total(rows.map(s => s.dt));
const within = (a, b, fraction, absolute = 0) => Math.abs(a - b) <= Math.max(absolute, Math.min(a, b) * fraction);
const circularDifference = (a, b) => { const d = Math.abs((a % 110) - (b % 110)); return Math.min(d, 110 - d); };
function workload(a, b) {
  if (!valid(a) || !valid(b)) return { matched: false, reason: 'invalid active observation' };
  const failures = [];
  if (fixedKey(a.before) !== fixedKey(b.before)) failures.push('fixed environment/settings');
  if (circularDifference(a.before.visT, b.before.visT) > 1) failures.push('start visual phase >1s');
  const ab = buckets(a), bb = buckets(b);
  for (let i = 0; i < 11; i++) {
    if (Math.abs(ab[i][0].day - bb[i][0].day) > 1 || Math.abs(ab[i].at(-1).day - bb[i].at(-1).day) > 1) failures.push('active day progression bucket ' + i);
    for (const key of ['pop', 'occupied']) if (!within(average(ab[i], key), average(bb[i], key), .05)) failures.push(key + ' bucket ' + i);
  }
  const ga = groups(a), gb = groups(b), details = {};
  for (const key of ['all', 'day', 'night']) {
    const x = ga[key], y = gb[key], wx = [], actors = {};
    for (const weather of [0, 1, 2]) {
      const p = total(x.filter(s => s.weather === weather).map(s => s.dt)) / total(x.map(s => s.dt));
      const q = total(y.filter(s => s.weather === weather).map(s => s.dt)) / total(y.map(s => s.dt));
      wx.push({ weather, a: p, b: q }); if (Math.abs(p - q) > .05) failures.push(key + ' weather ' + weather);
    }
    for (const field of ['vehicles', 'particles', 'citizens']) {
      actors[field] = [average(x, field), average(y, field)];
      if (!within(...actors[field], .10, 2)) failures.push(key + ' ' + field);
    }
    details[key] = { weather: wx, actors };
  }
  return { matched: !failures.length, failures, details };
}
const passes = r => r.fps >= .95 && r.mean <= 1.05 && r.p95 <= 1.10 && r.p99 <= 1.15;
function summarize(o) {
  const g = groups(o);
  return { valid: valid(o), distributions: Object.fromEntries(Object.entries(g).map(([k, s]) => [k, distribution(s)])),
    buckets: buckets(o).map(distribution), serviceAnimationTimeRatio: total(o.samples.map(s => Math.min(s.dt, 50))) / o.elapsed };
}
function screen(before, candidate, after) {
  const observations = [before, candidate, after];
  const modes = before?.arm === 'main-t602' && candidate?.arm === 'native-t603' && after?.arm === 'main-t602';
  const endpoints = observations.every(o => o.endpoint?.passed && o.sourceVerified && o.foregroundValid && o.initialFixtureVerified);
  const validRuns = observations.every(o => valid(o.observation));
  if (!modes || !endpoints || !validRuns) return { accepted: false, nonRegression: false, absolute55: false, modes, endpoints, validRuns, reason: 'identity, endpoint or active observation failed' };
  const [a, b, c] = observations.map(o => o.observation), matches = [workload(a, c), workload(a, b), workload(c, b)];
  const summaries = observations.map(o => summarize(o.observation)), comparisons = {}, baselineDrift = {};
  let stable = true, nonRegression = true;
  for (const key of ['all', 'day', 'night']) {
    const [x, y, z] = summaries.map(s => s.distributions[key]);
    const ratio = k => Math.max(x[k], z[k]) / Math.min(x[k], z[k]);
    baselineDrift[key] = { mean: ratio('mean'), median: ratio('median'), p95: ratio('p95'), p99: ratio('p99') };
    const d = baselineDrift[key]; stable &&= d.mean <= 1.10 && d.median <= 1.10 && d.p95 <= 1.15 && d.p99 <= 1.20;
    comparisons[key] = [basic.ratios(x, y), basic.ratios(z, y)];
    nonRegression &&= comparisons[key].every(passes);
  }
  const accepted = stable && matches.every(m => m.matched);
  const absolute55 = accepted && Object.values(summaries[1].distributions).every(d => d.fps >= 55) && summaries[1].buckets.every(d => d.fps >= 55);
  return { accepted, nonRegression: accepted && nonRegression, absolute55, stable, matches, baselineDrift, comparisons, summaries,
    scope: 'Six-child bounded active-gameplay workload screen; no exact live-trajectory or general-device guarantee.' };
}
module.exports = { distribution, groups, buckets, valid, workload, summarize, screen };
