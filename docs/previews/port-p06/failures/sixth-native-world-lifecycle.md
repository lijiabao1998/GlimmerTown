# Sixth candidate lifecycle red: paused native world replacement / rollback

## Original reproduced failure

Source `6cdb7443c5b24623db243ea91d908096fc0aac52` bound operations only to coordinates and watched cell signatures, not the exact native world. The native `newWorld()` / `load()` replace `tiles` without calling `doPlace`. While paused, no `advance()` followed to recheck those cells.

A supplemental actual-native-API VM reproduction:

1. Build the genuine busy harbor, enable, replay the original cargo to the yard, return to live mode and pause.
2. Call **`GV.newWorldSeeded(123)`**, not the fixture reset helper.
3. Inspect before any native advance: the new native city has **zero ports**, but `P06.active===true`, `valid===true`, reasons empty, with the previous world's unchanged cargo ledger.

The stale `active()` is the exact condition used by the real candidate renderer, so this permits ghost facilities in a newly opened paused city. This is a candidate correctness failure even if the sixth preexisting CI checks are green. The VM suppresses native drawing, so it does not claim to be the raw Chromium rendering proof. Exact result is `evidence/native-newworld-lifecycle-red.json`; the complete pre-fix generated VM reproducer is preserved as `evidence/native-newworld-lifecycle-red.cjs.gz` (decompress to `/tmp` and run Node). Genuine browser regression was added before acceptance.

## Fix and required regressions

The candidate now binds its compiled plan to the actual `tiles` array. Read-only `active`/`inspect`/`status` detect replacement immediately, invalidate with `WORLD_REPLACED`, hide candidate facilities and retain the exact prior clock and cargo. Enable cannot silently rebind even a zero-time/disabled old plan; explicit reset is required. This is a cheap identity check, not a new full-world scan every draw. Normal native new/load implementations and save format remain unchanged.

Real Chromium tests now exercise:

- paused native newWorld, immediately inspected before advance;
- native **save/load on isolated in-memory slot 3**, same harbor coordinates, no candidate fields or IDs in the original native save and unchanged saved bytes;
- old cargo frozen until the real confirmed-reset UI explicitly starts one fresh 30-ID batch;
- disabled zero-time plan invalidation through status/inspect;
- actual native road `placeUndo` then `GV.undo`, while paused, preserving cargo and refusing a fabricated handoff.

The same review found native `undo()` and gesture `undoPlace(f)` mutate cells directly, bypassing the placement hook. Candidate-only wrappers now notify topology checks in `finally`, leaving original native function bodies unchanged. The supplemental `lifecycle-test.cjs` calls actual native new/load/undo and the original gesture rollback function in a temporary draw-suppressed VM. It requires current source to pass and rejects both a world-binding-disabled mutant and a rollback-hooks-removed mutant. The gesture-function VM check is not described as a real touch-gesture browser test.

No production runtime, player storage, economy, original P01–P05 source, main, Pages or train logic is modified. Seventh real Chromium/CI rerun remains required.
