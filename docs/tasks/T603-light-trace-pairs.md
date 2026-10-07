# T603: bounded lightweight trace observer-effect pairs

## Status and scope

Prepared, not yet measured. This adds only a diagnostic script, its bounded contract tests, this card, and a diagnostic-only workflow. No product code, geometry, art, actors, acceptance predicate, or original acceptance script changes. It cannot clear the 55 FPS gate or any pixel gate, and does not authorize a release, merge, or deployment.

The accepted source is `7714852495802233cdf41b7c1dcdd9f82950bfd5`:

- index SHA-256: `6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69`
- sw SHA-256: `79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2`
- `scene603.js`: `e5fd14ff63dc94699ffe50e5797534109dd0d9da4c29d34afaa15dbc8117623b`
- `foreground603.js`: `4b18070173add493bbc697a667ff384d4fdb1d023bac8af18817118788fe6558`

The script checks these hashes plus `test_fixde.js`, the approved pin manifest, and all original fixture files before any browser launch. It captures the generated original `foreground603.js` harness in a VM without executing it, then overlays diagnostics in memory. The two original script files stay byte-for-byte unchanged.

The corrected heavy profile, run 37542608418, already stopped CPU/work observation before trace drain. It still included command-boundary and `Profiler.stop` overhead in the work interval. The new diagnostic removes those boundaries and CPU sampling; it is a separate observer-effect measurement, not a direct replacement time series.

## One bounded run

Exactly six candidate-only windows, without automatic retries:

1. Pair 1: A no trace, then B lightweight trace
2. Pair 2: B lightweight trace, then A no trace
3. Pair 3: A no trace, then B lightweight trace

Every window uses the accepted T603-on runtime, native clip path, 1400×900 viewport, DPR 1, seed 22 dense city, camera 22,14 from the original census focus 21,13, zoom 1, rotation 0, season 1, night visT 100, quality 1, 64 cars and 48 citizens, live rendering/actors and simulation speed 0. There is no T603-off comparison, candidate implementation, worker, bitmap/layer experiment, frozen-actor experiment, or filter geometry change.

Each condition starts from a fresh document and genuine deterministic city growth, checking exact roots, canonical save fields, population/day and the original fixture. Fresh growth does not guarantee full traffic: the unchanged product spawns cars probabilistically in its native `advance` loop even at simulation speed 0. Before the original cold draw, every condition therefore uses the same read-only settling rule: poll native population every 250 ms, require exactly 64 cars and 48 citizens at every consecutive poll spanning 2 seconds with an advancing native traffic clock, and fail after 60 seconds if this is not reached. Initial/final populations, all polls, elapsed time and the unchanged scene hash are reported. Settling performs no work sampling, synthetic RAF/advance, manual draw, spawn, simulation tick, population mutation, or fixture change. Variable settling duration is an explicitly reported preconditioning difference, not a performance sample. Each condition then receives the original cold cache clear/draw and exactly 30 warm draws. Exact target populations are checked again after warmup, atomically before starting the 5-second sample, and at the original end-of-window guard. Original slot-3, immutable-main inverse reconstruction, same-native-backend 1,586 sprite pins, repeated boot, original three old-save roundtrips and 16 escape-valve frame checks remain before the diagnostic. Their pixel readbacks/screenshots occur before the fresh measurement documents, outside all six windows.

The original 5,000 ms RAF elapsed predicate, first-frame exclusion and interval counting are preserved. The original advance/draw/HUD duration wrappers remain unchanged. Sampling is started inside the same browser task as the RAF window and disabled synchronously at the final callback before serializing raw arrays, any host roundtrip, `Tracing.end`, trace drain or gzip. This atomic work boundary is an intentional diagnostic-only correction, identical in A and B; the original acceptance instrumentation is untouched.

The report preserves actual RAF and work durations separately, complete RAF interval arrays, all original work-call duration arrays, aggregate work, work-per-draw-frame normalization, order/sequence, cold/warm samples, cache state, scene hashes and browser/host clocks. Work call arrays are not assumed to map one-to-one to observer RAF intervals.

## Hardware and observation controls

Only the existing standard `macos-15` runner is used. Original native foreground activation, Canvas/compositing/rasterization acceleration qualification and supported session-display preparation/restoration remain. Additional checks fail closed unless the accepted hardware/backend class is retained:

- ARM64, Chrome 152.0.7977.83
- Apple Paravirtual GPU, ANGLE Metal, GraphiteDawnMetal
- Native 1600×1200 display, 60 Hz; game viewport remains 1400×900/DPR 1

No browser downgrade/install, graphics overrides, paid runner or qualification weakening is permitted if runner image drift causes a mismatch. Report that mismatch rather than silently producing a differently qualified comparison.

Each RAF callback verifies visible/focused state. Browser blur/focus/visibility events and native foreground before/after each sample are recorded. Focus loss, stalled RAF, changed scene, altered flags or incorrect viewport fail the diagnostic. Failure handling stops the work observer before trace shutdown and any failure screenshot. The latest completed browser window is persisted before trace drain so a drain failure does not erase its measurement.

Trace categories are only `devtools.timeline`, `gpu`, `cc` and `blink.user_timing` for three boundary markers. Trace config explicitly sets `enableSampling:false`. There are no Profiler commands and no disabled-by-default Skia tracing. `Tracing.start` is outside the window. There are no screenshots, `getImageData`, `toDataURL`, trace controls, file reads/writes or compression inside a measurement window. Browser timings use three named start/end/work-stop marks to reconcile the browser clock with trace timestamps.

Trace completion has a 30-second limit; drain has a 45-second limit and 96 MiB uncompressed cap per trace. Individual original CDP commands retain their existing timeout; the whole job is capped at 20 minutes. Stream drain follows each trace window and is outside sampling. JSON parsing, event checks and gzip for all three traces occur only after all six windows. No more windows are added on failure.

## Reading the result

`evidence/chrome/scene603-summary.json` contains `lightTrace603.samples` and `lightTrace603.analysis`:

- No-trace min/max/mean/span, with all three values, for FPS, RAF p95, advance/draw/HUD means and work-per-draw-frame
- Each trace sample explicitly compared to the no-trace repeatability range
- Per-pair absolute/percentage differences with the actual AB/BA order
- Trace categories, data-loss flag, source/hash identity, clock marker reconciliation and compressed trace integrity

Any trace metric outside the observed no-trace min/max is labelled `observer-contamination`, whether it looks slower or faster. An inside-range result means only `within-observed-no-trace-range`. Three pairs are descriptive; neither classification is a significance test or proof of negligible overhead. Nested/overlapping CPU/GPU events must not be summed.

Successful collection returns `diagnostic-collected`, never acceptance `passed`. `clears55FPS` and `clearsPixelGate` remain false. The latest formal run still reported desktop day approximately 50.46 FPS, night approximately 15.97 FPS, mobile-day relative-budget failure and unstable native-clip pixels. This task does not replace those failures.

## Publication and verification

Recommended isolated branch: `gpt/town-light-trace-603`, based on the accepted ref above. The new workflow is `.github/workflows/town603-light-trace.yml`. Publish only the four diagnostic files; do not transplant product or acceptance files. Its only job is a standard free Mac diagnostic with read-only repository permissions. A diagnostic-file push on that branch performs one run; workflow dispatch exists for a separately authorized future rerun. Do not configure this job as a release gate.

Local bounded checks (no Chrome or game execution):

- `node --max-old-space-size=128 docs/tasks/t603-shots/lighttrace603.js --check-light-trace`
- `node --max-old-space-size=128 --test --test-reporter=tap docs/tasks/t603-shots/lighttrace603.test.cjs`

These check immutable-source identities, generated syntax, six-window plan, original fixture guards, no CPU/Skia instrumentation or readback inside windows, original RAF timing/counting, atomic stop, focus-loss/stall cleanup, and conservative observer classification. Eleven tests passed in the preparation environment. The generated diagnostic block is executed with mocked CDP/fixture calls for all six iterations, verifying six samples, six settling phases and 180 warm draws. A negative-control test reintroduces the reviewed RAF variable-shadowing defect and confirms the execution-level test catches its temporal-dead-zone error. Population tests cover natural target arrival, the 2-second stability rule and the 60-second fail-closed timeout. This is not a browser result, full regression pass, visual approval or performance acceptance.
