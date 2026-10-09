# Retained native raster: one bounded night-layer proof

Frozen source assessment and diagnostic prototype protocol, 2026-10-09 UTC.
The test-only helper and harness are implemented. Browser pixel proof, reuse
eligibility, performance and release acceptance remain unproven.

## Preferred candidate and source evidence

Retain pixels **inside the existing `lotNightLayer574` canvas**, using 128×128
backing-pixel tiles. Keep the same default-alpha Canvas2D context, canvas size,
ordered inputs, source images and final full-size main-canvas draw. Clear/repaint
dirty tiles in place; leave clean tiles untouched. This changes one native
helper, requires no main-command recorder and adds no intermediate alpha copy.

- `index.html:18270`–`18283` is the complete helper: clear one viewport canvas,
  then ordered `screen` image/rectangle lights and `destination-out` image
  occluders. It sets smoothing false and ends at alpha 1 / source-over. It has
  no gradients, text, filters, custom paths or changing transforms.
- `index.html:20222`–`20223` consumes that same canvas with the existing main
  `screen` draw. That draw and native brightness filters at `18840` / `19632`
  stay unchanged. `groundCache` already handles terrain (`18448` / `18750`).
- T605 whole-layer 0/11 hits do not imply tile-local 0 hits. Its phase-cost screen
  failed; do not use its helper milliseconds as accepted expected-savings evidence.
- This native candidate does **not** retain T604's recorder, so the approximately
  30 ms recorder producer floor does not apply to it. That floor still rejects
  the earlier main-command recording/replay approach as a 55 FPS solution.
- T611 `opaque611-summary.json` rejected alpha:false at zoom 0.7: 109,224 changed
  pixels, max channel delta 6. Keeping this original alpha canvas avoids that
  substitution; integer dirty clipping still requires exact-pixel proof.

## Exact fingerprint and source mutation contract

Each tile stores the exact ordered list of intersecting input paints. Include
paint branch, all geometry as Float64 bits, effective alpha/color, source
identity/revision/dimensions, viewport and tile bounds. Do not use global array
index as identity: insertion outside a tile need not invalidate it. Preserve
relative order within the tile. Do not quantize, sort by type or rely on hashes
alone; confirm matching hashes by exact tokens. Compare old/new lists so movement,
removal, insertion and order swaps invalidate old and new occupied regions.

Bounds are normalized destination rectangles, rounded outward conservatively to
backing-pixel coverage. Test fractional edges and negative dimensions. Do not
estimate source-alpha extents. Unknown bounds mean full rebuild. Changes to `a`
invalidate every affected light. Invalid/ignored alpha or color setters use the
original function; do not approximate their stateful native setter behavior.

Only known game-owned HTMLCanvasElement 2D sources with complete write coverage
may reuse. The T604 `watchSource` per-instance hooks are **not exhaustive**:
previously bound/prototype methods and same-value `setAttribute('width', ...)`
can bypass them. For this diagnostic, install the narrow write/dimension observer
before game boot, before game code can retain native methods. Observe prototype
paint/clear/putImageData/reset, width/height setters, and actual attribute mutation
paths (including same-size resets); assign revisions through a WeakMap. Audit
and test `occClasses594` forwarding wrappers (`index.html:30746`). Detect context
loss/restoration and source replacement. A size comparison or asynchronous DOM
observer alone cannot catch same-size reset before consumption.

Record which mutation paths the game actually uses and deliberately exercise
every supported path. Unknown source classes, worker/transfer/bitmap-renderer
sources, unhookable methods, self-source, reentry or unobserved write paths mean
original rebuild. Do not silently treat them as immutable. Global observer cost
belongs to candidate timing; production-wide observer integration is outside this
proof. No source pixel hashing/readback before consumption: prior experiments
showed that readback can change backing and pixels. No source pixel snapshots
are needed inside this synchronous helper.

First use, new world/load, resize/DPR, same-size night-canvas reset, context loss,
source regeneration and external night-canvas writes invalidate all. Flush on
pan/zoom/rotation and feature/quality transitions for this proof. Preserve the
original no-occluder `null` return, invalidate on that branch, rebuild on return.
Use original behavior for `a <= 0` and daytime/no-layer cases; report no cache hits.
Nonidentity transform, unexpected filter/shadow/clip ownership or unsupported
native state bypasses the cache. Candidate writes to its own night canvas must
not be misclassified as external corruption by its observer.

## Raster, state and fallback contract

Preflight tokens, bounds, source versions and caps before changing pixels. For
partial work, construct one temporary Path2D containing disjoint integer dirty
rectangles; intersect its union under save/restore. Clear under this clip, then
scan the original input list once and replay each intersecting paint once, in
original order with original geometry. Never replay once per tile, crop sprites
or shift origins. Interleaved screen/destination-out stays interleaved.

Use Path2D rather than overwriting the context's current path. Save/restore saves
drawing state; the current path is separate. See the
[HTML Canvas state rules](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-state).
Preserve final fillStyle as well as smoothing/alpha/composite state even when
the last rectangle paint is skipped or no tile is dirty. A simple implementation
can retain original state assignments and skip only clear/paint operations,
then restore exact final state after removing the temporary clip. Verify every
observable state field. Full original/candidate layer RGBA is essential because
transparent-edge precision can fail even when final screenshots look identical.

All dirty or unsupported inputs call the unchanged original helper once without
a tile clip. Never repeat model/advance/whole-game draw to repair this helper.
A caught candidate failure can rebuild with the original helper only after
removing its clip and restoring state; discard metadata. Do not swallow original
exceptions or return a stale layer. Candidate partial work plus repair is charged
in full. Test these paths in isolation before game timing.

## One falsifier and hard stop/go screens

1. Native browser contracts compare original and candidate after every frame:
   transparent edges, overlapping screen lights, destination-out occluders,
   zero/nonzero alpha, moving/fractional geometry across tile borders, negative
   dimensions, order swaps, removal, source writes/resets/replacement and context
   lifecycle. Exercise no/one/adjacent/disjoint/all dirty, unknown-source fallback,
   cap exhaustion, reentry, teardown and a deliberately omitted invalidation
   negative control. Check exact RGBA, canvas identity, final state and unchanged
   inputs. Any one-channel mismatch stops the direction.
2. Canonical seed-22 night: 60 advancing .05-second comparisons at zoom 1 and
   60 at zoom 0.7. Compare original/candidate/restored full-compositor images and
   full layer RGBA, with no masks. Check model, actors, RNG and canonical save.
   Cover pan/rotation/zoom/DPR/resize, new world/load, construction/demolition,
   weather/day-night, source regeneration and feature/quality transitions through
   exact comparison or documented full fallback. Fixed steps prove correctness
   and eligibility, not live FPS. Read layer pixels only after normal presentation;
   use fresh pages for timing. Each image round still requires user review.
3. **Both primary night views must pass:** at least 25% clean pixel area **and**
   at least 25% skipped original visible layer paint calls in the same frame,
   on at least 80% of steady-view frames. Include fallback frames in denominators.
   Report total and visible paint counts separately, plus clean paint-covered
   area; empty sky and offscreen calls cannot carry the screen. Stop on failure;
   do not choose smaller tiles or exclude hard frames to rescue the result.
4. Only then run qualified foreground native full-game original/candidate windows
   with natural clocks and identical quality. Include token/version/state costs,
   invalidations, fallbacks and presentation. Preserve existing stability screens
   and require predeclared consistent whole-frame gain of at least 10% for this
   material-change probe; also test day regressions. FPS comes only from actual
   frames/elapsed time. Absolute 55 FPS remains separately required; helper speed,
   hit ratio and green diagnostic CI do not satisfy it.

## Bounded ownership and conclusion

Use the one existing raster canvas; no extra retained raster or frame history.
Cap at 1,024 tiles, 8,192 paints, 512 tracked sources, 65,536 tile references
and 8 MiB explicit tokens/indices across current/previous generations. Over cap:
original rebuild, discard that frame's retention. Release previous references
after comparison; uninstall only still-owned hooks and release metadata on reset
or teardown. These are explicit payload caps, not total JS/browser/GPU memory;
report that separately and check for monotonic growth.

**Recommendation:** the helper-local experiment is feasible without a broad
architecture change. Implement only this reversible native proof if selected.
Real local reuse, source-write completeness and native blend precision under
integer clipping are unresolved. A positive result still needs full regression,
user image approval and all unchanged release gates.

## First CI scope, fixed before launch

This first bounded falsifier runs synthetic native paint/source-mutation/order/
path/state cases, then the two primary 60-frame animated night views. It does not
run performance. Native interaction/load/world-edit/real context-loss recovery
and remaining transition cases must pass separately before any timing decision.
Fake-raster tests prove bookkeeping and recovery mechanics, not browser pixels.

Validation acquisition avoids reading the retained source directly between
frames: after its normal main-canvas consumption, copy it 1:1 to a fresh default-
alpha scratch canvas and read that copy, then release the scratch backing. An
exhaustive 256x256 byte/alpha calibration must be exact. At each view's end, raw
original/candidate layer readback must match each other and the copied samples.
Any failed copy oracle is a measurement limit; a stable full-compositor mismatch
remains independent candidate evidence. Main screenshots are original/candidate/
restored for every frame. This correctness page is never used for timing.

Original and retained layer surfaces are independent during proof: original
full redraws cannot silently repair retained pixels. Synthetic deliberately
omitted source invalidation must produce a detected mismatch. Simulated context
events only verify observer fallback; they do not certify real GPU recovery.

Observer memory is separate from retained keys: 512 is a per-frame input-source
cap; the preboot observer has a separate 65,536 WeakRef-entry hard cap, dead-entry
pruning and global fail-closed exhaustion. Report weak entries explicitly; do
not equate payload counters to total browser/GPU memory. One CI 10-minute bound,
no unchanged rerun or threshold adjustment. Product files remain untouched.
