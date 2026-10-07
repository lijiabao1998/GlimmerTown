# T603 single-run off-canvas native-filter diagnostic

Prepared on candidate `753b0c10fde058b209a1e43cdd199c2a60033195`. This is a diagnostic harness only. Product `index.html` remains SHA256 `99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d`; `sw.js`, the existing native-source invariant, the original scene/foreground suites, and their gates are unchanged. No push, CI launch, image approval, merge or deployment is part of local preparation.

## Hypothesis and bounded intervention

The two existing `brightness(0)` sites may incur avoidable native setup for images entirely outside the backing-store canvas. The disposable guarded draw function omits the complete save/transform/filter/alpha/draw/restore block only when its entire destination rectangle lies strictly beyond a fixed two-device-pixel halo. Reflections retain their existing vertical flip; shadows retain their existing flattening. Every byte inside every retained native block is unchanged, as are all other statements in the draw function, including foam, lighting, water, wind and live updates.

There is no new clip, image cache, silhouette, replacement image, readback or sampling path. Native state must be an identity incoming transform, `source-over`, `filter='none'`, transparent zero-offset/zero-blur shadow, and a finite legal alpha. Unsupported or nonfinite state retains the original block. Native-state getters are read only for geometrically eligible blocks; their cost remains inside guarded timing. The original arm calls the exact original function, without per-site guards or toggle branches.

The local source/command mock reproduces the pinned desktop fixture: 956 roots, camera `(256,576)`, 1400×900 backing pixels, DPR 1, zoom 1. Day has 46 reflections and 3 eligible omissions; night has 46 reflections plus 230 candidate shadows, with 3+48 omissions. The legacy-art toggle has 233 night shadows and the same 51 omissions. Every retained native argument, image identity and context state matches. These are mock command results, not rendered-pixel or performance evidence.

## One native-Mac session

The workflow triggers only on push to `gpt/town-offcanvas-probe-603`, with optional manual dispatch. It has one `macos-15` job, read-only repository permission, a 35-minute timeout, and excludes rerun attempts. It inherits the existing qualified headed Chrome, accelerated Canvas/compositor check, focused native desktop check, supported session display preparation and restoration. It never accesses the user's computer.

Each desktop/mobile scenario is prepared on independent immutable-main source, candidate source, and independent immutable-main source again. The main HTML is reconstructed by the existing inverse and bound to SHA256 `b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265` before any probe injection. Source identity is rechecked after scenario reloads. Main is a performance reference only; no cross-boot actor/sky pixel comparison is attempted.

For each day/night phase, candidate runs eight fixed five-second windows in four counterbalanced pairs: O/G, G/O, O/G, G/O. Independent main runs two windows per phase before and two after the candidate. All 48 windows are retained. Each document/light phase first receives a fixed ten-second live warmup plus ten real draws, with before/after clocks and cache deltas recorded. This is predeclared because prior mobile daylight samples saw one first-use sprite bake during a five-second RAF window. Each window then receives another fixed 1.5 seconds and five real draws, followed by the original 30 desktop or 10 mobile warm samples and the live RAF window. No retry-until-stable loop, cache flush between paired arms, sample removal, trace, screenshot, call logging or canvas readback occurs during timing. Zero sprite rebakes, unchanged camera/quality, real advance/draw/HUD calls and focused visible foreground are required. A measured rebake preserves the complete raw window and stops as invalid measurement, not as an optimization-regression verdict. The additional fixed phase warmups total two minutes within the 35-minute job bound.

Important measurement distinction: the original formal suite freezes `visT` for steady-light acceptance, which also holds some animations. This probe instead holds only the returned `daylight()` values (`b`, `dusk`, `ph`, `d`). It explicitly releases the `visT` freeze and proves `visT` and `trafClock` progression during every window. Water clocks are recorded and their original update statements are preserved; because those clocks wrap, equal endpoint values do not imply a freeze. Both arms use this same test-only lighting override. Results are labeled a live-animation diagnostic and do not constitute a pass of the original formal suite.

Desktop uses the exact fixture/camera above. Mobile independently executes the existing genuine touch, dog-park construction, UI save/load, full reload and 320/360/390/420px toolbar/zoom sequence, ending at 390×844, DPR 1, zoom .7. It must have 957 roots and the new dog park at `(35,27)`. Its actual camera, day, season, root hash and source identity are recorded and compared across the independent-main/candidate preparations. Desktop counts are never substituted for mobile counts. Mobile LOD must report zero reflection calls; its shadow/skip counts come from its own actual post-timing draw.

## Post-timing proof and stop rules

Only after all timing ends does the runner prepare the same candidate scenario and freeze its update loop. All exact comparisons occur inside that one frozen document with identical actors and sky: original A, original B, guarded, original restore, deliberate wrong retained edge, guarded restore. Full compositor PNGs are decoded to RGBA; equality requires exactly zero changed pixels. Original repeats, state fingerprints and clock immobility must also match. A wrong-edge negative must visibly differ wherever native calls exist, and restoring it must recover exact pixels. Mobile daylight has no native calls, so that scene correctly has no fake negative control.

Separate audit functions, never used during timing, record every original source site, eligibility and skip decision, source-image identity/size, exact retained draw arguments, transform, alpha, filter, composite, shadow and smoothing state, and final canvas state. Guarded calls must equal the original calls with exactly the eligible rows removed, in the same order. The exact 3/48 desktop omission counts are required; actual mobile counts are reported independently.

Every capture writes its complete PNG and JSON before checking stability/equality, preserving the first failing evidence. Unexpected state, count mismatch, pixel difference or restoration failure stops the run. No pixel masks, tolerance, margin tuning or repeated CI are allowed. Only relevant comparison PNGs plus a failure screenshot are uploaded; inherited UI/world matrix screenshots are suppressed, while the original touch assertions still execute.

The predeclared paired criterion is at least three of four winning FPS pairs and a median guarded/original FPS ratio of at least 1.05, with median RAF-p95 and warm-p95 ratios no worse than 1.05. All four scenes must avoid a material median regression; at least one must show clear benefit. The complete paired distribution is reported, including slower windows and guard overhead. No clear benefit or a material regression is a stop result.

Independent-main regression is reported separately using all four bracketing main windows and all four guarded windows per phase: median warm/RAF p95 against the established 1.5×+5 ms budget, and FPS against half of reference FPS. The absolute 55 FPS threshold is a third result, calculated directly from each actual desktop RAF window; every guarded window must reach it for this diagnostic workflow to pass. These probe measurements never supersede original PR5 formal acceptance, which remains unchanged and currently failing. `releaseGatePassed` is always false in this harness; any later product change requires the original complete validation and the required image review.

## Qualified primary-source rationale

Current upstream Chromium's `Canvas2DRecorderContext::DrawImageInternal` contains an image-filter path that transforms destination bounds and issues a layer before drawing the image: [Chromium recorder source](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/canvas/canvas2d/canvas_2d_recorder_context.cc#L1977). This supports testing setup avoidance as a hypothesis, not a claim about the measured browser's bottleneck.

Current upstream Skia's `SkCanvas::onDrawImageRect2` already performs `internalQuickReject` on destination bounds: [Skia canvas source](https://github.com/google/skia/blob/main/src/core/SkCanvas.cpp#L2092). Native rejection may therefore eliminate some or all expected benefit. Exact Chrome 152 source was not available for this analysis; these moving upstream sources, inspected 2026-10-07, are qualified architectural context only. The fixed same-session measurements decide whether this particular extra guard helps.

## Local validation and handoff

Run from the isolated worktree:

```sh
node docs/tasks/t603-shots/native603.test.js
node docs/tasks/t603-shots/offcanvas603.test.js
node docs/tasks/t603-shots/offcanvas-run603.js --check-overlay
git diff --check
```

At preparation: original native checks 70/70 and new focused checks 80/80 pass; the full composed runner parses, and the actual source mock reproduces all four desktop/art-toggle counts and exact retained commands. Additional executions of the actual composed bridge verify the mutable renderer assignment, original/guarded/restored function path and post-timing audit on candidate source, plus the original mode and live-clock behavior on immutable-main source without any guard overlay. Product and inherited harness files are byte-identical to the pinned candidate. Native Mac performance, actual mobile camera/counts, compositor pixels and benefit remain unmeasured until the single reviewed workflow run. No full-regression pass is claimed from these focused checks.

Review these five new files, then publish one reviewed commit on the isolated branch to trigger one run. The workflow records the actual commit, Chrome/macOS/display identities and source hashes. Inspect `offcanvas603-summary.json`, the fixed window distributions and the first failing PNG/JSON before considering any next engineering step. Do not merge, deploy or publish product code from this experiment.
