# Ninth exact geometry optimization passed correctness; product performance remains open

Head `f214746ce47cae46111678b3c4f3bb2ad2997d12`, dedicated run `40201252821`: all seven jobs successful, native 220/220, 66 original PNGs, 144 bit-identical optimized/reference whole-frame comparisons and all 640 independent-cache paired moving draws. Artifact `12602123449` (51,555,110 bytes), SHA-256 `86cf91a51c651e5dd3cbfe3da5a66df484a0efac437e5a6be027d2eafc9926a1`. The complete raw archive, samples and independent analyses are retained.

## Defensible effect, not an overall pass

Same-city rAF-paced reference → accelerated upper medians (ms):

| View/stage | Reference | Accelerated |
|---|---:|---:|
| 0.5× lift | 14.3 | 12.9 |
| 0.5× truck | 13.1 | 12.4 |
| 1.8× lift | 12.5 | 11.9 |
| 1.8× truck | 11.4 | 10.7 |

All eight sync/paced configurations improve the upper median by 0.6–1.4 ms, but tails/means are mixed. Paced 1.8× lift mean is 13.070 → 13.135 ms, retaining an optimized 51.5 ms spike. Synchronous 0.5× truck mean is 23.948 → 25.080 ms despite a lower median. No sample is dropped and no claim of uniform speedup is made.

The paired optimization city follows the separate 100-native-advance profile: 923 population, 405 buildings, 35 cars and 8 citizens, versus the earlier diagnostic's 804 population/382 buildings. Each reference/optimized pair freezes exactly the same actual native state. Do not compare these absolute timings across different fixture ages as if they were the same workload.

The primary ninth run still has ON steady rAF about 25.13–26.45 fps versus OFF 49.87–54.80; full-cycle roughly 12.76 fps, p95 350 ms, maximum 683.3 ms. Primary ON draw p95 reaches 123.9 ms and the worst upper-median increment is 44.4 ms. Raw first callback intervals and all later stalls remain in official results; supplementary steady summaries exclude only the incomplete first interval and identify it explicitly. Untouched-control cold boot also rises to 6.33–6.44 seconds versus the eighth's 4.12–4.17, but this does **not** establish a host cause or excuse candidate overhead.

## Next measured target

The first optimization reduced P05 cache construction to approximately 0.27–0.41 ms/frame. Remaining P05 visibility work is approximately 1.4–3.0 ms, while unchanged P01/P02 static Canvas painters cost about 3 ms/frame. Topology validation is not a hotpath and remains intact.

The next isolated experiment replays **the original static vector commands** with bounded Path2D lists, not bitmap rebakes, combined shapes or redesigned artwork. It preserves every individual fill/stroke/style and the final current path; only original static part identities qualify. Camera/projection basis, current transform, layout identity, season, phase, part geometry/color and upper/lower identity invalidate entries. Transient cargo, fake capture contexts and all night painters bypass the cache. Original P05 and original static painters remain the same-page reference behind the test-only baseline flag. Exact cold/warm full-frame and invalidation checks must pass, and raw performance must be read before acceptance. Correctness-only green is insufficient.
