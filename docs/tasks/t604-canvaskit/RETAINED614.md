# T614: conservative single-rectangle retained night-layer proof

T612 remains rejected. T613 run 37897584958 at d9ac8d94 qualified its causal
matrix: both three-rectangle clip unions diverged at the two recorded sprite
corners, while both equivalent single-rectangle clips matched exactly. All
actual-helper reproduction, manual equivalence, raw/copy, original/restored,
and cross-cell original baselines passed. This microcase does not prove a city
cache or a performance improvement.

## Separate candidate

Copy the diagnostic helper into retained614.cjs. Preserve exact source revisions,
Float64 tokens, source order, native draw arguments, alpha/composite state and
128-pixel tile bookkeeping. Expand all dirty tiles to their single bounding tile
rectangle, including previously clean holes. Clear and replay every original-
order paint intersecting that expanded rectangle once, under one Path2D.rect.
If the rectangle covers the entire viewport, call the unchanged original.
No coordinate rounding, tolerance, complex clip union or extra product alpha
copy is allowed. Unchanged source observers and conservative fallbacks remain.

A tile inside the expanded rectangle is dirty for replay and statistics even
when its original token did not change. Area and skipped-paint counters must
reflect actual expanded work. Memory, output revision, source mutation, reentry,
exception and disposal contracts remain mandatory. The original T612 helper and
its failed evidence are preserved separately.

## First bounded native falsifier

Run the same full synthetic sequence as T612, including the exact failing
fractional-sprite sequence, current-path checks, adjacent/disjoint changes,
source/size/lifecycle changes and a deliberately omitted-revision negative
control. A native failure is captured with raw/copy and original/restored
controls before stopping. A simulated lifecycle event does not certify real
context loss recovery.

Then run the same canonical seed-22 city, 60 advancing 0.05-second steps each
at zoom 1 and 0.7. Compare original/candidate/restored full-compositor RGBA on
every frame, plus layer scratch copies and final raw checkpoints. Exact model,
actors, RNG and canonical save must be preserved. A failed copy oracle or
unstable original/restored comparison is a measurement limit; stable candidate
pixel divergence is NO-GO. Zero RGBA tolerance remains unchanged.

The unchanged research eligibility screen is >=25% actual clean viewport area
and >=25% actual skipped visible original paints together on >=80% of 60 frames,
separately at each view. Expanded bounding-rectangle work, full fallbacks and
initial seed frames are all counted. Failure rejects timing; no smaller tiles,
excluded frames or threshold adjustment may rescue it.

One CI run, 10-minute job bound, no timing. Even a positive primary result still
requires full-city transition, interaction/edit/load, model/save/RNG and real
lifecycle/regression proof before any performance run. Later timing must compare
unwrapped original against the complete candidate cost including source tracking;
component savings never imply 55 FPS. No release or adoption follows this test.
