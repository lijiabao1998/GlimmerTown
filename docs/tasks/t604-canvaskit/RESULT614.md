# T614 exactness passed; reuse gate failed

Final CI 37899105418, commit 093ba953527e757fb4db4877d6962073af4da613, completed
successfully as a diagnostic. Candidate verdict: NO-GO for timing.

- 29 native synthetic cases passed, including the deliberate stale-source negative
 control and raw/copy byte-alpha calibration.
- All120 city original/candidate/restored comparisons and both final raw layer
 checkpoints were exact. Model, actors, RNG and canonical save guards passed.
- Zoom1:39/60 frames met both 25% savings conditions,65% versus required 80%.
- Zoom0.7:59/60,98.33333333333333%, passed.
- 19 failed zoom 1 frames changed only 2–3 tiles but bounding expansion repainted48
 of 88 tiles and 843 of 1016 visible original paints. Initial seed frames account
 for the other 2 failures. Thresholds and denominator remain unchanged.

The initial run 37898606238 stopped because the negative-control fixture created
only a fresh candidate canvas, leaving baseline fillStyle #ffe9a0 versus default
#000000. Pixels were identical even after original repairs. The fixture-only
correction creates paired fresh surfaces; helper and pixel/state gates did not
change. Both runs remain archived.

Final artifact 11602360615 (7,811,773 bytes) was retrieved through supported Library
materialization into the active scratch workspace. SHA256 matches GitHub:
778d44f6fed8f6ae8ae87ecdeec612746470462d8c0771d2fd2272823a27160b.
Earlier 612/613/614 artifacts were recovered through the same supported route;
previous signed-URL 403 failures remain historical, not current missing evidence.

No performance run, 55 FPS claim, adoption or release occurred. A separate disjoint
single-rectangle candidate addresses observed bounding overdraw and must repeat
all unchanged gates before any further qualification.
