# Candidate selection update

This runner now selects the safer frozen T614 single-rectangle helper after T615 lost two light pixels at zoom0.7. T614 has no approved pixel exceptions; new tiny findings remain unapproved. The earlier primary T616 run and unlaunched capture remain preserved separately.

# T616: full correctness regression with native T614 active

This is a new diagnostic runner. It does not edit `index.html`, `sw.js`, T614
files, release metadata, or published content. The user accepted only the
previously reviewed seed-22, zoom-1, frame-55 T615 difference. That acceptance is
not a general pixel tolerance. New differences are saved. A new difference of
at most three compositor pixels and at most one channel value is recorded as
unapproved and allows the remaining correctness cases to finish; larger
differences and unstable controls stop the runner.

## Commands and independent gates

```sh
node docs/tasks/t604-canvaskit/run616-regression.cjs --check-overlay
node docs/tasks/t604-canvaskit/run616-regression.cjs --self-test
node docs/tasks/t604-canvaskit/run616-regression.cjs --support-only --out=/tmp/t616-support
node docs/tasks/t604-canvaskit/run616-regression.cjs --phase=full --port=8896 --out=/tmp/t616-full
```

`--phase=core`, `world`, or `neighbors` runs that existing browser phase and the
common setup/old-save/transition checks. Only `--phase=full` can establish all
three browser coverage flags in a single run. `--with-support` runs supporting
checks before the selected browser phase. On a usable desktop, `--headed` omits
the headless flag. `CHROME_PATH` may select the installed official Chrome binary.
Each browser invocation has an isolated temporary directory/profile and save
slot 3. Ports 8123 and 8199 remain prohibited.

The support stage makes a separate disposable repository copy, verifies the
existing T604 source contract, and exactly inverts its CanvasKit changes. It
runs the unchanged `tools/verify.py --min-pass 12525` (including full `test_fixde.js`, seed pins,
syntax/version/CRLF/code-map gates and nested T602/T603 suites),
`python3 -m unittest tools.test_toolchain`, `native603.test.js`,
`node --test sw603.test.mjs`, `test603.js`, `clearance603.js index.html - 1`, and
`oldsave603.js` against the three immutable fixtures. The 12,525 PASS requirement
is explicit and is never replaced by the verifier's lower default minimum.
These are native-source model/toolchain compatibility
checks. Their DOM mocks do not prove T614 rendering or retained-cache coverage.
The summary explicitly records that distinction. No PASS floor, assertion,
completion marker, seed pin, fixture, or source test is weakened.

## Actual browser integration and coverage

The browser runner derives its source from the existing `scene603.js` using
unique exact anchors. It uses `source-contract.cjs` to remove only the existing
CanvasKit overlay from the temporary runtime, validates the native source, and
retains the immutable v11.211 legacy-art reference document. Only the candidate
page receives `source-revision612.cjs` before the first game script, followed by
the unchanged `retained614.cjs`.

Inside the game closure, the diagnostic connects T614 directly to the existing
night-layer canvas/context. There are no extra world, camera, quality or feature
invalidations, no changed bounds, and no candidate algorithm edits. Reloads and
new candidate documents repeat preboot installation. Status checks require the
T614 dispatcher and observer to remain installed and Canvas2D to remain native.
Candidate counters distinguish retained calls from explicit original controls.
The common advancing check requires both an actual retained hit and an actual
partial repaint. A run consisting solely of original fallbacks cannot pass.

The original scene harness's correctness assertions remain, including:

- Immutable sprite pins and independent boot reproducibility
- Desktop and mobile interactions, real placement/demolition, save/load,
  inspection, pan/zoom and toolbar reachability
- All 308 native world cases: 256 season/light/rotation/distance cases,
  32 fractional-camera cases, 16 mobile/DPR cases and four aligned cases
- Twelve real placement variants and 20 construction roots
- 128 adjacent-occlusion scenes, 32 shoreline scenes and 288 dog/owner
  animation/depth scenes, with existing negative controls
- Native filters, complete star/dust input sharing, restoration, exact legacy
  reference comparisons and full RGBA stability checks

Every candidate native world image additionally compares all compositor RGBA
bytes against the unchanged original helper in the same scene. The original
control owns a separate native night-layer canvas, temporarily selected only
during the original control call. It cannot overwrite, reset, or explicitly
invalidate the candidate's retained output or metadata. Both calls retain the
existing native-frame oracle and its stable-input checks. These comparisons add
no source-image reads beyond the pre-existing T603 regression routines.

New pixel differences produce original/candidate PNGs, changed-pixel count,
maximum channel delta, and up to 32 exact coordinate/RGBA samples. New differences
of at most three pixels and maximum channel delta one are added to
`unapprovedTiny616` (bounded to 2,048 findings), with `accepted:false` and
`qualityAccepted:false`. The runner continues the remaining model/save/correctness
cases without accepting their visual quality. Larger differences populate
`candidatePixelFailure616` and stop the run. Unstable original or candidate
controls also stop. There are no masks, skipped coordinates or blanket accepted
tolerances, and none of the existing T603 canonical pixel assertions changes.

A completed run with new tiny findings exits zero to retain all correctness
evidence, but its status is `correctness-complete-unapproved-tiny-differences`,
and its visual gate remains false. Release is not authorized by that outcome.
The core/neighbors-only phases report visual acceptance as `null` because the
world comparator phase did not run; their completion is not full visual proof.

## Model, save, RNG and transition checks

The candidate remains active while all three immutable old saves are loaded,
rendered, saved, and loaded again in a real browser. Root SHA256, root count,
footprint references, canonical save fields and roundtrip roots must match.
The existing independently grown seed-22 fixture comparison also remains.

`window.__regression616` exposes diagnostic-only methods:

- `status()` reports installation, native renderer, observer health, quality,
  candidate/original calls and T614 hit/partial/fallback counters
- `checkpoint(label)` performs two synchronous native draws, checking exact
  day/money/pop/tile data, all listed actor pools and zero simulation RNG calls;
  original running/visual/RNG function state is restored in `finally`
- `oldSave(raw)` runs the immutable-save browser roundtrip and a render guard
- `transitions()` checks 26 cases spanning zoom, all rotations, fractional pan,
  seasons, weather, quality levels, night-feature toggles, source regeneration,
  same-size output reset, daytime/no-layer and return to night
- `advanceCheckpoints()` interleaves 12 real `.05`-second advances with guarded
  candidate draws, requiring real retained hit and partial activity
- `originalNativeFrame(...)` selects only the isolated original control surface
  and restores candidate routing even if the original control throws

Model/RNG guards run around rendering, not around intentional simulation or
placement mutations. DPR/resize, real construction and demolition, new worlds,
old-save loads and input controls are exercised by the existing full browser
harness. Synthetic event dispatch is not claimed as real GPU context-loss
coverage. The separate transition proof owns persistent-history pixel evidence;
this runner does not replace that proof.

## Deliberate timing separation

Only two byte-pinned source spans are removed: mobile cold/warm/RAF sampling plus
the one-minute RAF timing gate (SHA256
`1ca1736a930dbf14bd17b2d07c5aaf64a51286d91531e489f214fc339dea8e8f`), and desktop
cold/warm/RAF/trace sampling (SHA256
`2c35952e5b590c3dbbc735dda0eb321ea7afe45ef2c88deb668bb27b378482cc`).
Any changed byte in either span fails generation. The overlay also refuses a
remaining `await raf(...)`, trace sample or performance-start invocation.
`overlay616.json` records all replacements and the generated harness hash.

This runner does not calculate FPS, establish the one-minute RAF performance
gate, or imply 55 FPS. Complete candidate/observer overhead, natural clocks,
foreground qualification, unchanged day/night quality and the absolute 55 FPS
target belong to the subsequent independent timing run. Correctness must finish
first. User image review and remaining release gates still apply.

## Validation recorded during implementation

- Overlay compilation and exact-anchor/byte-drift negative tests pass.
- Executable bridge tests check transition count, model/RNG guard rejection,
  original control canvas isolation, exception restoration and absence of extra
  candidate invalidation.
- The unchanged Python toolchain suite passes all 63 tests locally.
- Local Chromium smoke execution reached native source/setup checks, then the
  executor denied Chromium's process-singleton socket and its Crash Reports
  path was read-only. No browser correctness result was produced there.
- Full browser and supporting-suite outcomes must come from their actual
  summaries/logs; creation or compilation of this runner is not a regression pass.

## Canonical supporting-tree boundary

The unchanged T447 probe allowlist expects only canonical T602/T603 browser
tools. Historical injected T604-T616 experiment snippets are not shippable
product files and are excluded from the disposable supporting-tree copy.
T447 itself is untouched. This stage is canonical runtime/model/toolchain
coverage only, not a claim that an experimental repository passed all checks.
Separate generated-harness tests require preboot slot3 selection before
navigation and the existing player-port prohibition. Actual T614 rendering,
model/save/RNG behavior and retained-history coverage remain in browser jobs.
The first unstaged aggregate failure is preserved as a staging error.
