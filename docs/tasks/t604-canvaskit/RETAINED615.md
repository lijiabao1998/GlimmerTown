# T615: disjoint rectangular retained night-layer proof

T614 run 37899105418 at 093ba953 passed 29 synthetic cases and all 120 full-city
original/candidate/restored RGBA comparisons, raw checkpoints, model/actors/RNG
and canonical save guards. It failed the unchanged reuse gate at zoom 1:
39/60 eligible frames (65%, required 80%); zoom 0.7 passed 59/60. No timing ran.
In 19 failed zoom 1 frames, only 2–3 tiles changed but the bounding rectangle
repainted 48/88 tiles and 843/1016 visible paints. This measured overdraw justifies
one separate exact-dirty candidate. T612/T614 remain rejected for adoption.

## Frozen candidate contract

Preserve the native canvas, source revisions, Float64 keys, draw arguments,
quality, alpha, order and 128-pixel tile size. Partition the exact dirty tile mask
into horizontal runs, merging vertically only identical adjacent run ranges.
The resulting rectangles have disjoint integer backing-pixel coverage and cover
exactly the dirty tiles, including cropped viewport edges.

Each rectangle uses its own Path2D containing exactly one rectangle. Clear only
through that clip and replay every intersecting paint in the original order.
A paint spanning rectangles executes once in each rectangle. Its duplicated
calls count in total and visible executed work; no original-paint accounting
may hide duplication. Per-pixel order follows the original, while disjoint
coverage prevents double compositing. Native equivalence must still be tested.

Plan all work before the first partial write. Bound rectangle count at 32 and
replay calls at 8192, and charge metadata against the existing 8 MiB two-generation
budget. Use the original full renderer if a cap is exceeded, all tiles are dirty,
or planned calls are not fewer than original calls. Unsupported states/sources,
source/output resets, disposal, exceptions and reentry retain conservative full
fallback. A later-pass failure must remove the active clip before repair, count
all known work already performed plus full-original repair, and discard stale metadata.
Reentry may call the original with different/getter-backed inputs: record nested
original call count and exact candidate attempts, mark complete paint totals
unknown, and report zero clean/skipped benefit. Never reread getters merely
to manufacture a total or present a subtotal as complete work.

## Exactness and eligibility, unchanged gates

Unit tests must cover exact partition/coalescing/coverage, duplicated paint order
and alpha, cropped edges, original fallbacks, caps, second/later-pass exceptions
and reentry, ownership and cleanup.

Native synthetic proof preserves the T614 cases and paired fresh negative-control
surfaces. Add a large fractional image spanning two separated clips with stable
middle-tile content: require two clip passes and the duplicated image call.
Also move a fractional occluder across a tile boundary while another separated
clip is dirty. Preserve full RGBA/state comparisons and first-failure raw/copy/
original-restored evidence. Native mismatches stop the run before city/timing.

Then compare the same two 60-frame advancing city views at zoom 1 and 0.7. Zero
RGBA difference, model/actors/RNG/save and raw/copy controls remain mandatory.
The same >=25% actual clean area AND >=25% actual skipped visible paints on >=80%
of 60 frames must pass independently in both views. Count every duplicate,
initialization and fallback. Do not drop difficult frames or weaken thresholds.

One CI run with a 10-minute job bound. It runs exactness and primary eligibility,
not timing. Any positive result still requires transitions, world edit/load,
real lifecycle and full regression before comparing complete candidate cost
against an unwrapped original in a fresh qualified timing page. Component savings
are not 55 FPS evidence. No automatic adoption, image approval, merge or release.
