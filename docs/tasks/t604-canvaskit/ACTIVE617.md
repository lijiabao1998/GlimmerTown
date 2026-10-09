# T617: bounded active native gameplay gate

The candidate is fixed **native T603 without retention or a source observer**.
T614/T615 are not fallback choices in this experiment. The comparison is against
exact live T602, not an escape-valve approximation. This is an incremental
nonregression gate; a pass below 55 FPS does not satisfy the separate 55 FPS goal.

## Execute and preserve evidence

```
node --test docs/tasks/t604-canvaskit/active617.test.cjs
node docs/tasks/t604-canvaskit/active617-run.cjs --check-overlay
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  node docs/tasks/t604-canvaskit/active617-net.cjs --out=evidence/active617
```

Run only the last command on the existing standard macos-15 foreground runner.
It inherits the T603 native GPU/display/focus qualification and restoration.
The native generated pages and native SW do not need CanvasKit vendor downloads.
The source-contract still verifies that the checkout has only the already-known
T604 hooks before inversions; no product file is changed.

The supervisor runs exactly this predeclared sequence, sequentially, with fresh
browser profiles and distinct directories:

1. Zoom 1: exact main, native T603, exact main.
2. Zoom 0.7: exact main, native T603, exact main.

Existing directories are never overwritten. Each child has a 240-second process
group timeout and at most two additional seconds for forced termination. The
overall bound is 30 minutes, including setup and evidence. A complete child
reserve is required before starting. Setup must finish in 60 seconds; endpoint
checks have a 20-second acceptance budget. No replacement windows, repeated
cycles, second attempts, or unchanged reruns are permitted. Failed and partial
returned observations remain in summaries. A browser crash may prevent recovery
of in-browser samples; this is reported, never fabricated as a complete run.

`active617-net-summary.json` contains all child measurements, environment data,
verdicts and comparisons. Every child also retains its log and original harness
summary. Invalid, incomparable and regressing results exit nonzero. Only both
view nonregression passes exit zero. `releaseGatePassed` remains false: this
timing program cannot authorize release or substitute for correctness/visual
acceptance. A below-55 pass is explicitly `active-nonregression-passed-below-55`.

## Source and fixture identity

Main commit: `329f660e3d5f011ac28454cb6d6a68f8525c69cc`.
Main index Git blob: `3c065a4952706a51147c3f64080ba2489977fb16`.
Main index SHA256:
`b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265`.
Native T603 commit: `23564a810546e585758236553d1432c3aacb760b`.
Native index SHA256:
`99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d`.

Record raw, namespace-adjusted, served HTML, SW, generated harness and component
hashes separately. The tested product is byte-pinned before injecting inspectors
and isolating its save/cache namespace. Check actual document version, URL, art
selection, native context and original function identities. Neither arm loads
retention code or installs then disposes a source observer.

Use the existing synchronous seed-22 growth fixture: 72x72, difficulty 3,
420 original ticks, day 421, population 2397, money 3418, 956 roots, root SHA256
`bfb601802addb32048efa09bd0e3b81f7ea6d180df25465111fc5d0129a12004`.
The unchanged manifest canonical save and footprint checks must pass. AI is off
after growth, matching existing setup. Use the same first senior-center focus,
rotation zero, 1400x900 viewport, DPR 1, and original fresh-profile quality and
feature settings; do not lower them to improve timing. Sound is disabled exactly
as in the inherited harness. All these settings must match between arms.

Do not call setSeason/setDay/setVisT/weather/freezeVis. In particular,
setSeason(1) would rewrite day to 101 and weather(0) would lock wxT for 99 ticks.
Natural seasons, weather, actors, services, growth, HUD and 25-second autosaves
remain active. No clock, RNG, model or quality rewrite occurs during timing.

## One active observation

At the first original-game rAF anchor, switch speed to 1 using GV.setSpeed.
The following intervals include original simulation work. Warm for a fixed
30 seconds and at least 150 original frames, without extensions. Immediately
measure one continuous 110-second natural visual cycle. One passive sampler
observes both phases; its absolute browser deadline is 155 seconds. Maximum
stored sample count is 30,000. Every interval is retained, including stalls.

Original frame/advance/tick/draw/HUD/order/night-layer functions and both RNG
function identities remain unchanged. The sampler checks foreground, original
game rAF timestamp, running/speed, fixed view/settings, and real clock/calendar
progression on every callback. At speed 1 require:

```
(dayEnd-dayStart)*0.9 + simAccEnd-simAccStart == elapsed seconds
visTEnd-visTStart == elapsed seconds
```

Numerical tolerance is 0.05 ms per sampled interval and 50 ms over measurement.
Normal active progression is about 122 days during the measured cycle.

The fallback timer can run between matched rAF callbacks. Therefore matching
lastT alone is insufficient: the next sampler wall time minus the previous
game's lastDraw must remain below its original 400 ms fallback threshold.
Any longer gap is retained and invalidates rAF-only attribution. Intervals over
2 seconds also violate the original clock-clamp contract. At least 54 seconds
each of daylight/night and sufficient samples must be observed. Fixed 10-second
buckets assign each whole interval by its starting relative timestamp; the last
bucket includes the final crossing interval. Day/night classification uses the
interval's ending natural phase. Boundary errors are at most one retained frame.

No screenshots, trace, full-city scans, full model hashes, explicit saves or host
polling occur during the observation. The sampler itself reads scalar/count
state and scans window toggle names, and its overhead is included equally in all
arms. It is not a zero-overhead product-only measurement. The original 0.05-second
animation/service dt cap remains unchanged; report its accumulated-time ratio
to expose slow-frame effects rather than pretending service motion stays equal.

## Evolved-state safety

After timing, two synchronous original draw(0) calls must leave simulation,
traffic fields and actor pools unchanged and consume zero seeded R calls. The
temporary RNG guard is restored in finally and is never present during timing.
No production clock reset or frozen update loop is used. A thrown draw fails.

Validate finite model values and root/reference footprints. Regenerate the save
at that child's own evolved endpoint, verify day/rounded money/seed/size/difficulty
and root count, repeat saving without changing model/canonical fields, and
load/save roundtrip with exact roots and canonical persistence fields.
The selected canonical fields are only
`v,n,seed,money,day,df,bl,lots574,ter,tre,rd,zn,gvc`; this is not a full-schema save
proof. Broader independent canonical/support tests remain required. Load resets
runtime RNG/weather/actors by design and occurs only after the observation.
Never compare an ending save with its pre-run save or another arm's endpoint.

## Honest matching and decision rules

Same seed does not imply identical live trajectories. Math.random-driven cars
feed roadPass into the model; service vehicles mutate illness/fire/crime with
frame-capped dt. Neither replacing Math.random nor replaying fixed dt is allowed.
Preserve all workload data; do not discard storms or normalize away slow scenes.

Before comparisons require each original arm to be valid, plus exact initial
fixture, source and endpoint checks. Browser build/GPU identity must match.
Check all three pairings (main/main, first main/candidate, last main/candidate):

- Fixed settings identical and initial measurement solar phase within one second.
- Simulation days within one at corresponding 10-second bucket endpoints.
- Time-weighted population/occupied tiles within 5% in every bucket.
- Whole/day/night weather-state dwell fractions within five percentage points.
- Whole/day/night mean vehicles, particles and citizens within 10%, with a
  two-actor absolute allowance for small pools.

These predeclared workload tolerances are practical screening limits, not proof
of identical model trajectories or a statistical confidence bound. A mismatch
is incomparable evidence and blocks the incremental gate. Natural day/night,
season and weather variation is legitimate; T616's frozen-state stationarity
test is not reused or weakened.

For whole cycle, daylight and night independently, main/main drift must be within
10% mean/median, 15% p95 and 20% p99. Against EACH main baseline candidate FPS must
be at least 95%, mean interval at most 105%, p95 at most 110%, and p99 at most 115%.
Report raw FPS, mean/median/p95/p99/max and >50/100/250ms counts. Valid matched
failure is a performance regression; unmatched/invalid evidence is inconclusive.

Absolute 55 requires every retained candidate 10-second bucket plus whole,
daylight and night averages to be at least 55 at BOTH zooms after matching.
Even that claim is limited to this seed22, 72x72 city, fixed desktop camera,
quality, device/browser and speed1 workload. It does not establish mobile,
larger-map, other-city, interaction, all-season or universal 55 FPS performance.
Full product regression, visual/transition proof and user acceptance remain
independent gates.
