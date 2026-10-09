# T603 clean civic-art candidate

Based on main `4e8823781178ea69e7862bbf3db2a74328080291`, including the merged PR #4 navigation cache-lifetime repair. Branch: `gpt/town-civic-art-clean-603`. This candidate does not change main, the independent Pages work, or the local player deployment.

## Problem and resulting behavior

The prior T603 candidate's global native-filter clipping produced stable final-pixel differences on the qualified Mac compositor. This candidate removes its helper and both calls. Reflection and building-shadow filter/alpha/draw/save/restore sequences return to the original native path. The approved four civic sprite families, variants and dog/owner depth correction remain byte-identical to `19fa39a`; the complete index is exactly that approved candidate with those 12 clipping lines removed.

This fixes the known clipping regression. It is not an FPS optimization, and no performance pass or release readiness is implied. PR #2/#3 failures and historical raster/cache experiments remain evidence; this is an independent draft candidate on main.

- Runtime index SHA256: `99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d`.
- Removing only the approved art/variant/depth/version changes reconstructs immutable main index SHA256 `b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265`.
- Version remains the T603 candidate `11.212`; SW code preserves PR #4's repair and changes only APP_VER relative to that main worker.
- No save-format, simulation, RNG, source sprite family or artist-approved recipe change.

## Acceptance

The complete original regression, six exact sentinels, all 63 toolchain tests, 37 SW adversarial contracts, art pixels, projected actor clearance and all three historical save round trips remain required. Three additional source guards reject any reintroduced global clip or altered native filter sequence.

The core and neighbors browser checks and all original cold/warm/RAF predicates are retained. The Mac foreground test still requires candidate day and night >=55 FPS on the same qualified standard runner; no tolerance is changed. This older rule comes from [VERIFY section 6](../VERIFY.md#6-效能護欄改了繪製模擬時必跑). Cloud results are not claimed as physical-player-device FPS.

The removed clip feature's positive-use assertions and diagnostic-only raster/cache experiments are retired for this candidate. The 256 world +32 fractional camera +16 mobile DPR +4 aligned mobile cases remain. They now compare the art-off candidate with a separately booted, SHA-bound immutable main document, requiring zero changed RGBA pixels. New-art frames also require exact repeated-frame stability and actual native reflection/shadow draw coverage. The original16 legacy escape frames remain, with full decoded-RGBA comparison in addition to hashes.

Mac whole-frame checks use native compositor PNGs because prior Canvas readback changed the behavior being compared. Snapshot clocks/actors and CSS are fixed only after every original live performance sample. The real draw(.016) remains, and its post-draw state must stay stationary during capture. Wrong-edge negative controls must lose actual pixels and restoring the original call must restore exactly. No threshold is waived when a baseline is unstable.

The independent baseline matrix adds actual renders/captures, so the candidate workflow allows45 minutes per job. This is a wall-time allowance, not a change to any FPS, pixel, cold/warm or frame-liveness predicate. Art/legacy compatibility success must be reported separately from any remaining absolute FPS failure.

## Pre-CI evidence

- 83 source/comparator/snapshot/negative-control assertions pass, including normal draw-clock advancement, complete dust inputs, original object restoration and rejecting capture-time drift.
- All37 candidate SW contracts pass.
- All63 toolchain tests pass.
- All12 approved art variants, winter/LOD/routing/escape/RNG cases pass; all6 actor-clearance sweeps have zero collisions; all3 historical saves preserve roots, footprint links and canonical fields through round trip.
- Syntax, native Mac overlay compilation, architecture anchors and diff hygiene pass.
- Full original regression and actual browser/55-FPS results are pending candidate CI. Local pinned PNG environment setup was cancelled twice; no result from a different Pillow version is substituted. CI retains the existing fixed dependency setup.

No merge, release or deployment is permitted while a required gate remains failed or unrun. New visible changes need image review; the already-approved civic recipe has not been redrawn.

## First complete candidate result and input correction

Run37608725391 on4dd0fa4d passed12,534 original regression assertions,63 toolchain cases,37 SW contracts and658 neighbor checks/483 screenshots. Native Mac compositor repeats/restoration and all16 immutable-main escape frames had zero changed pixels. Its unchanged55FPS criterion remained red: candidate day39.0322FPS and night9.6263FPS; no release pass is claimed.

The independent Linux world comparison stopped at the first night/far view:252 changed pixels were exactly63 isolated2x2 sky stars, all above y276; town pixels below were identical. Both unmodified documents initialize90 stars from unseeded Math.random. The revised snapshot fixture copies the immutable-main document's exact90-star input into only the frozen candidate comparison, checks full array equality and SHA, and restores original candidate stars on thaw. A deliberately different star must change actual full-frame RGBA and restoration must recover zero difference. Production source, Math.random, zero-pixel comparison and all live performance tests remain unchanged. The correction requires a new full candidate CI run; the initial failure stays recorded.

## DPR2 construction-dust input correction

[Run 37612097288](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37612097288) on `753b0c1` completed 256 standard, 32 fractional-camera and eight mobile-DPR1 legacy comparisons with zero differences, then failed at the first mobile-DPR2 day view. The compact independent [reproduction 37615799265](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37615799265) preserved all 24 unequal pixels and full particle inputs in [artifact 11480304529](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37615799265/artifacts/11480304529).

All 24 pixels lie on three native age-zero dust rectangles: world (-32,1056), (256,1232), (160,1248) map to backing pixels (30,1443), (390,1663), (270,1683), with size 3. The first nine pixels differ because identical dust positions carry frozen construction depths 72.015 versus 65.015 from different construction rotations. Another nine pixels are a candidate-only two-particle tail at the random pool cap; the last six differ between six and five coincident particles. These are unequal input records. The original filter calls, sky input, camera, dimensions and product source match.

The snapshot fixture now shares only the complete 90-dust pool captured from independently booted immutable main, including all eight native fields and frozen depth. A separate FX fingerprint must match in every full-frame comparison; unrelated actors remain independent. It does not clear particles or override randomness. Exactly 90 age-zero dust records are validated before either pool changes, and the original array and particle object identities return on thaw. Restored copies are read synchronously in the thaw task before a live RAF can age them; cleanup preserves any primary pixel failure.

The original DPR2 case requires zero full-frame difference with shared inputs. Moving one visible dust particle must change both full RGBA and its original affected support, and restoration must recover every pixel. Positive and negative evidence is persisted before assertions. A separate compact world artifact includes summary, actual failures and controls, while the original full screenshot artifact remains available. Corrected browser parity is pending the next complete run; no new pixel or performance pass is claimed.

The latest formal Mac measurements remain failed: day 35.9059 FPS and night 9.9295 FPS versus same-scene main 37.9689/7.7630. The 55-FPS requirement and all original relative budgets remain unchanged. The independent off-canvas diagnostic is not included in this candidate.
