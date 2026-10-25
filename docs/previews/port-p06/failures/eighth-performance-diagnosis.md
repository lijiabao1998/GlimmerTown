# Eighth evidence: correctness green, measured hotpath still requires optimization

Source `b013e9cc4ead09410c8a9c99703ac8f2930df12b`, dedicated run `40199326685`: all seven jobs successful; native Chromium 219/219 checks plus 30 bounded diagnostic timing cases. Artifact `12600847465`, 51,701,339 bytes, ZIP SHA-256 `40faef6575b0b5293d8cb7ad1881bf86bf3db5996b0870b4645b298d1d40f926`. Original ZIP, paired samples, CPU profile and PNGs are preserved. Immediate new-world refusal text and the separately captured naturally settled Undo frame were visually inspected and now show the correct refusal and actual native road respectively.

## Attribution, not an excuse

In the fresh diagnostic's real populated city, rAF-paced **uninstrumented** moving draws have ON upper medians about 7.3–9.1 ms versus OFF 2.0–2.5 ms. Synchronous batches still include roughly 33–69 ms ON p95 values; paced variants are roughly 9–14 ms. This is an observed scheduling contrast, not proof of a host problem and not grounds to discard the original synchronous or full rAF results.

The instrumented moving cases attribute about 2 ms/frame to P01/P02 painting, about 0.85 ms to P05 visibility-index/key preparation and about 0.9–1.9 ms to P05 visibility/clipping. Inclusive spans overlap; these comparisons use exclusive spans. `P06.checkTopology` costs only 5.4 ms **across 100 native advances**, so safety validation is not bypassed to improve rendering. The separate CPU profile includes layout/reset and shows substantial `validPose/search` setup work; it is not mislabeled a steady-render CPU percentage or GPU trace.

## Narrow optimization under test

`native-performance.js` leaves original P01–P05 files and the exact mask/difference arithmetic/order unchanged. It reuses metadata for immutable prepared faces through a WeakMap, computes polygon signatures only for actual candidate occluders, and interns exact original signatures to monotonically unique IDs. Intern storage is capped at 8,192; the existing visible-polygon cache remains capped at 512. Eviction causes at worst a cache miss, never ID reuse or altered geometry. Original P05 `createCache` remains callable behind the test-only `__p06BaselinePerf` flag, with distinct cache-key namespace.

Pure exact-coordinate/order cases include moving/static faces, duplicate/degenerate/coplanar vertices, cell boundaries, cache-limit eviction and a rejected stale-mask-key mutant. **These are not browser performance evidence.** Real Chrome must additionally prove whole-frame optimized/reference equality and same-city paired performance before any speed improvement is claimed. No faces, lights, traffic, original assets, safety checks or economic simulation are removed.

Generic Town run `40199329981` independently retains scope failure: `[one-card]` expects a formal `docs/tasks` card, and `[gpt-lane]` rejects the expressly approved new candidate evidence workflow path. Its log was read; the guard remains unchanged. This candidate is not a formal merge/deployment request.
