# T613 causal result

CI 37897584958 at d9ac8d9420d22c1fecb569f281711d5bef0783da completed successfully.
This means the causal diagnostic qualified, not that a cache or performance gate
passed.

The actual unchanged T612 helper reproduced exactly two differing pixels at
(182,10) and (182,42): original [0,0,0,0], retained [255,73,36,7]. The manual
three-rectangle/three-paint control matched it byte-for-byte. Raw/copy checks,
original-repeat/restored controls, context state and cross-cell original
baselines all passed.

| Clip representation | Three selected paints | All four original paints |
| --- | ---: | ---: |
| Three adjacent rectangles | 2 differing pixels, max255 | 2 differing pixels, max255 |
| One identical-area rectangle | 0 | 0 |

The difference depends on clip representation in this qualified microcase.
The excluded fourth paint does not explain it. No lower-level GPU/driver cause
or city-wide exactness is established. T612 remains rejected; no timing ran.

A separate conservative one-bounding-rectangle candidate may now be tested
against the unchanged full exactness and reuse gates. No candidate was adopted.

Artifact11601550398 has reported SHA256
93c9a70baea5d0f777e412af34b0523d5e9b0160183a63a63b395fec1333b205.
Complete structured matrix values and CI logs are archived. The artifact ZIP
has not been downloaded; preceding supported signed artifact transfers returned
HTTP403. No PNGs were emitted by this numerical-only matrix.
