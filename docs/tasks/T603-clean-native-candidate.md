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

- 70 source/comparator/snapshot/negative-control assertions pass, including normal draw-clock advancement and rejecting capture-time drift.
- All37 candidate SW contracts pass.
- All63 toolchain tests pass.
- All12 approved art variants, winter/LOD/routing/escape/RNG cases pass; all6 actor-clearance sweeps have zero collisions; all3 historical saves preserve roots, footprint links and canonical fields through round trip.
- Syntax, native Mac overlay compilation, architecture anchors and diff hygiene pass.
- Full original regression and actual browser/55-FPS results are pending candidate CI. Local pinned PNG environment setup was cancelled twice; no result from a different Pillow version is substituted. CI retains the existing fixed dependency setup.

No merge, release or deployment is permitted while a required gate remains failed or unrun. New visible changes need image review; the already-approved civic recipe has not been redrawn.

## First complete candidate result and input correction

Run37608725391 on4dd0fa4d passed12,534 original regression assertions,63 toolchain cases,37 SW contracts and658 neighbor checks/483 screenshots. Native Mac compositor repeats/restoration and all16 immutable-main escape frames had zero changed pixels. Its unchanged55FPS criterion remained red: candidate day39.0322FPS and night9.6263FPS; no release pass is claimed.

The independent Linux world comparison stopped at the first night/far view:252 changed pixels were exactly63 isolated2x2 sky stars, all above y276; town pixels below were identical. Both unmodified documents initialize90 stars from unseeded Math.random. The revised snapshot fixture copies the immutable-main document's exact90-star input into only the frozen candidate comparison, checks full array equality and SHA, and restores original candidate stars on thaw. A deliberately different star must change actual full-frame RGBA and restoration must recover zero difference. Production source, Math.random, zero-pixel comparison and all live performance tests remain unchanged. The correction requires a new full candidate CI run; the initial failure stays recorded.
