# T613: bounded native clip causal diagnostic

T612 remains rejected. Runs 37895423004 (8cc432a3) and 37896208664
(c43e3f38) stopped on the same two candidate-only fractional sprite corners.
Raw and scratch copies agree, while original-repeat/restored controls are exact.
No city reuse or timing results exist for that candidate.

## Frozen purpose

Distinguish representation of an identical native clip area from executing an
additional paint wholly outside that area. This is one synthetic causal matrix,
not a replacement renderer or a performance test. Native helper, source observer,
original source, sprite pixels, floating-point geometry, alpha and image
smoothing are unchanged.

## Mandatory qualification

Use fresh paired output surfaces for every cell and repeat the exact T612 prefix
through the external current-path fill and original reseed. Do not add a full
original draw on the candidate surface just before the target call. An independent
baseline gets the same prefix; the candidate's same-surface original repair is
performed only after target pixels have been preserved.

First reproduce the unchanged helper's exact two mismatches at (182,10) and
(182,42), original [0,0,0,0], candidate [255,73,36,7]. Context states, raw-versus-copy,
original repeat and candidate restored controls must be exact. If this fails,
stop and label the experiment inconclusive, not an optimization regression.

The diagnostic union/three-paint cell must also exactly match the unchanged
helper's pixel result. Otherwise its manual replay is not a qualified stand-in
and the remaining matrix cannot establish a cause.
Every later cell's original copied and raw baseline must also exactly equal
the anchor baseline, preventing cross-cell surface drift from masquerading
as a factor effect.

## Matrix

All cells use the same dirty area [0,0,384,128] and clear placement. Compare:

1. Three adjacent Path2D rectangles with all four original paints.
2. The same union with the three selected paints.
3. One Path2D rectangle of identical area with all four original paints.
4. The same single rectangle with the three selected paints.

The fourth paint is wholly below the clip. All draw arguments and relative order
remain exact. Restore the same observable context state and preserve current
path. Compare full RGBA and state after each target, then raw/copied original
repeat/restored controls. Preserve up to 32 exact mismatch coordinates across the entire report.
Numerical byte arrays/deltas are evidence; this matrix does not emit PNGs.

## Predeclared conclusions and bound

- Both union cases diverge and both single-rectangle cases match: representation
  dependency supports a separately reviewed normalization proposal.
- Both three-paint cases diverge and both four-paint cases match: omitted-paint
  dependency supports investigating native batching, with no adoption implied.
- All four diverge: common clipped/partial-clear path remains implicated.
- Only one diverges: representation/paint interaction, not a simple repair.
- Any failed original, restored, raw/copy or state control: inconclusive.

Stop after the qualified matrix, or earlier on failed qualification. One CI run,
10-minute job bound. No city, eligibility or timing extension; no gate weakening,
unchanged rerun, product change, release or FPS claim. Even a clean causal result
requires a new independently reviewed candidate and full exactness/lifecycle/
city proof before performance could be considered.
