# T616 live native performance protocol

T615 is rejected after two light pixels disappeared in the zoom0.7 continuation.
This protocol instead selects unchanged T614, whose29native synthetic and120city
pixel comparisons passed. Its earlier65%reuse result missed a heuristic screen;
actual full-frame performance, not that heuristic, now decides usefulness. Incremental release need not wait for
55 FPS, but still needs measured safety/nonregression and full regression checks.

Run fresh children in this fixed order, with distinct output directories:

1. `T616_PERF_ARM=observer-free`
2. `T616_PERF_ARM=native-t603`
3. `T616_PERF_ARM=candidate-only`
4. `T616_PERF_ARM=native-t603`
5. `T616_PERF_ARM=observer-free`

Observer-free uses exact live main329f660e T602 source reconstructed by the
byte-verified art inverse, matching Git blob3c065a4952706a51147c3f64080ba2489977fb16.
Native-t603 uses23564a81 native approved art without observer or retention.
Candidate-only adds frozen T614 plus its preboot source observer to nativeT603.
Both zoom1 and0.7 are separate required views, under one50-minute overall bound
and a300-second bound for each fresh child including setup.

The runner omits the preboot source observer for both `observer-free` and `native-t603`; it must
not install then dispose it. Load `retained614.cjs` and inject
`retained616-performance-bridge.js` into the native bridge. Use
`retained616-performance.js` as the experiment snippet. Default zoom is 1;
`T616_PERF_ZOOM=.7` is an explicit additional view, not an automatic retry.

Optional `paired` compares O/C,C/O,O/C with the observer in both modes. Optional
`observer-only` supplies original rendering with the observer. Neither optional
arm replaces the five-page net product comparison above.

Each child uses identical seed-22 setup and one startup visual phase before
warmup. Frame/advance/draw/HUD/order functions stay unwrapped. The only native
function substitution is the selected night-layer helper on the same surface.
The sampler anchors on the original game rAF and switches mode at that anchor,
so the next recorded interval includes a cold candidate frame. It verifies the
game callback's timestamp on every sampled callback and reports actual frames
divided by their elapsed interval span.

Two 20-second warm windows precede exactly one earliest-next-natural-night
attempt. At least 150 warm frames are required. Poll that boundary at 250 ms,
with at most 150 seconds waiting and at least 53.5 natural night seconds left.
Collect exactly three 5-second qualification windows, then six 5-second measured
windows if at least 35 night seconds remain. Warmup, wait and measurement share
one absolute 240-second bound. No replacement windows or next-night retries.

Qualification and final stability check every window's mean and median against
pooled values within 10%, and p95 within 15%. All require foreground/focus,
unchanged view/quality/model, original live animation, at least 30 samples,
matching game rAF timestamps and no interval over 2 seconds. Report raw intervals,
mean, median, p95, p99, max and counts over 50/100/250 ms. No tracing, image reads
or screenshots occur during measured windows. Model and regenerated canonical
save checks follow timing; actor animation is expected to continue.

Read each child's `retained616Performance` object. Require all five `.accepted`
flags, then separately call `screenNet(before.rows, candidate.rows, after.rows)`
for the two bracketing live-main arms and the two native-T603 arms, from
`retained616-performance-metrics.cjs`. The two baseline distributions must agree
within 10% mean/median, 15% p95 and 20% p99. Against **each** baseline, require
candidate FPS ratio at least .95, mean ratio at most 1.05, p95 at most 1.10 and
p99 at most 1.15. This is the predeclared nonregression screen, not a guarantee
of zero change. Report the measured ratios honestly. The separate benefit screen
requires at least 5% FPS improvement with mean no worse and p95 at most 1.05.
Absolute 55 FPS is reported only for valid/stable evidence, independently.

Net comparison includes observer overhead, even though it does not isolate that
overhead. Paired O/C with observers in both modes explicitly reports no net-product
acceptance. A qualified single child is likewise not adoption/release approval.
Check the exact source and unchanged user acceptance/full regression requirements
before adopting. Preserve failed/unstable samples and stop without unchanged reruns.

Focused checks: `node --test docs/tasks/t604-canvaskit/retained616-performance.test.cjs`.
