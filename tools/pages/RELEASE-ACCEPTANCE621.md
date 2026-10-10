# T603 native artwork release acceptance

> **Historical (T627, 2026-10-10).** This page records the T603 release policy approved on 2026-10-09. Since T627 no script pins the T603 runtime: the current release is read from the checked-out commit, the previous release (PREV) is the one the live site serves, and approval is a commit on main that passed every release job. The required gates below still apply, with the current release and PREV in place of T603 and T602. The preserved failed evidence stays failed as recorded. T603 provenance (the index hash below and the inverse patch) is checked only against frozen commit 4dd0fa4. Current rules: `docs/tasks/main-pages/README.md`, section "Release identity (T627)".

The owner approved this round's native same-browser comparison, the following workflow change, and normal PR #7 merge/publication on 2026-10-09. This is an incremental artwork release, not a 55 FPS or speedup claim. The approved runtime remains exactly index SHA-256 `99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d` and worker `79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2` before the existing cloud namespace substitutions.

## Required gates

- Full repository regression and six simulation sentinels, toolchain, approved art and old-save checks.
- Linux Chromium correctness in all three original phases: historical sprite pins, exact canvas/full-frame comparisons, UI, native model/actor/RNG transitions, old saves, slot isolation and runtime errors. Only the two explicitly hash-pinned timing/liveness spans are delegated. This lane reports those timings as not run; it does not claim they passed.
- Native foreground macOS Chrome: the original timing/liveness expressions, thresholds and nine-window order, plus the reviewed T620 immutable old-source controls. All 1,586 inherited CRC entries must match across independent old/candidate boots in the same browser, with exact key sets/source identities. Existing full-frame RGBA checks remain separate and unchanged. Visibility/focus loss, wrong viewport, errors, incomplete cleanup or display restoration prevent acceptance.
- The seven-file package contracts and exact runtime pins, real T602-to-T603 service-worker/save upgrade, and fresh-process offline saved-city reopening with foreign storage/cache isolation.
- Every required group must pass on the release head and again on main before Pages deployment. Normal PR merge is required. The existing HTTPS asset/first-visit/offline saved-city verification must pass after deployment before claiming the site is verified playable.

## Preserved failed evidence

Linux runs [37932919923](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37932919923) and [37933354486](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37933354486) failed the original desktop minimum callback counts in both arms: 17 day callbacks in about five seconds and 2 night callbacks in about seven seconds. Relative p95 and cold/warm draw budgets passed. Those failures remain failures and are not relabelled as successes. The new policy delegates timing to the native environment instead of repeating the known software-renderer result as a deployment requirement.

Native diagnostic [37942008963](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37942008963) failed before timing on 860 inherited sprite CRC differences against historical fixtures. Controlled diagnostic [37944282380](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37944282380), source `0b976fc889e0d83cfcb252a7609d18f093778e19`, established exact same-browser old/candidate CRC-map equality, retained all historical failures, and completed 293 checks, 55 screenshots and all original timing/liveness windows. Its raw status remains failed with exit 2; collection completion is distinct from historical acceptance. Artifact 11623540491 ZIP SHA-256: `8e868232488154d7d3e54e6db4e7e206ac703996c8e616afb760319d9c4bf797`.

The new native acceptance wrapper evaluates a separately named policy result. It must not edit raw reports, clear failed fields, loosen a threshold, or treat arbitrary failed diagnostics as accepted. It requires the reviewed complete collection predicate, exact approved source and all original native timing/control/error/cleanup conditions. A material new mismatch or regression remains a blocker.

## Interpretation limits

CRC-map equality is not exhaustive byte comparison of every sprite. Original full-frame RGBA controls remain mandatory. The added independent boots/readbacks change the diagnostic sequence, so results do not isolate Metal, OS or foreground presentation as a sole cause. Native OS activation is checked at boundaries; passive blur/visibility latches do not prove uninterrupted OS occlusion. These paused-model but animated visual windows do not establish active-gameplay 55 FPS or a physical-device performance guarantee.

Earlier rejected retained layers, source observers and CanvasKit experiments remain excluded from the runtime. Existing approved artwork and the main service-worker lifetime/storage separation are preserved.
