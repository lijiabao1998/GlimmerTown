# T603 bounded night-renderer diagnosis

The designated issuer approved bounded night CPU/draw profiling and stable compositor screenshots on 2026-10-06. This diagnostic branch starts at candidate `19fa39a4c94f9004a94031de1ada40f28d0ec288`. Product SHA256 remains `6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69`; `sw.js` remains `37a150eb00a391630b76c0afb3b9176a846606dc57ef5a4d4e5111ae8044807c`.

Allowed changes remain this record, `docs/tasks/t603-shots/profile603.js`, and `.github/workflows/town603-night-profile.yml`. No product, original candidate branch, main, existing acceptance workflow, simulation, save, RNG, or threshold change has been made by this diagnostic branch.

## Acceptance remains blocked

The original qualified Mac acceptance [37535607860](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37535607860) remains failed: candidate day 55.77 FPS, night 21.00 FPS, and mobile-night warm draw p95 47.6 ms versus a 36.05 ms limit. The GPU `getImageData` comparison was inconclusive because its unchanged baseline itself changed 64,841 pixels. Images are approved, but neither this investigation nor that approval waives these failures.

The exact candidate Linux run [37535607995](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37535607995) passed all five jobs, 12,531 regression assertions and 63 toolchain tests. Its 308 complete Canvas comparisons had zero changed pixels and zero repeated-frame instability. The wrong-edge control changed 8,045 pixels and restoration recovered exact pixels. This is not physical-device or foreground Mac 55 FPS evidence.

## Collected performance evidence

Three cases use the same synthetic seed22 city, camera (22,14), zoom1, rotation0, season1 and fixed night light: original art/filtering, new art with clipping disabled, and full candidate. Real visual updates remain active during profiling. CPU profiles and compositor traces are observational and instrumented, not benchmark acceptance samples.

Run [37539791439](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37539791439) collected the three cases, but CPU profiling mistakenly continued during trace-stream draining. Its actual CPU windows were approximately 14.21/14.11/17.42 seconds; raw totals cannot be compared as equal five-second windows. Its compositor repeats also failed because live actors kept moving.

Run [37542608418](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37542608418) stops CPU/work/focus observation before trace draining. Actual CPU windows were 6.505/5.286/5.258 seconds, including command-boundary overhead. All three traces report `dataLossOccurred=false`; foreground/focus checks and canonical city preservation passed. The first frozen screenshot proved the listed actor scalars and game clocks were stationary, but the next screenshot timed out while browser virtual time was paused.

The profiles repeatedly locate substantial work in native `drawImage`, the existing `brightness(0)` shadow/reflection paths, and graphics scheduling. In the corrected candidate trace, `IOSurfaceImageBacking::WaitForCommandsToBeScheduled::Dawn` has 122 events totaling about 1.954 seconds. These intervals overlap other graphics events and must not be added to flush totals or treated as an isolated filter cost. They establish a graphics-wait signal, not a guaranteed optimization benefit. Sparse ordering and the night-layer function are secondary opportunities; their measured sample mass does not support claiming a 21-to-55 FPS repair.

## Screenshot collection and navigation boundary

The current snapshot-only mode references the completed profiles instead of repeating them. It stops the game update loop, keeps browser time live, waits for natural toast removal and the HUD tween to settle, pauses remaining CSS animation, then uses manual real-renderer draws with fixed clocks. It retains exact off/off and on/on repeats, cross-mode pixel reporting, a visibly wrong clip edge, and an exact restored control. No game-canvas `getImageData` or `toDataURL` is used for these compositor comparisons.

Run [37544251648](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37544251648), including one recovery attempt, stopped before that comparison: native-main sprite pins were captured, then navigation back to the candidate timed out. Run [37545912657](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37545912657) independently attempted to read the committed document after that timeout; `Runtime.evaluate` also timed out, so recovery was correctly rejected. A cached compositor screenshot is not proof of a responsive candidate document.

Run [37547638687](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37547638687), source `55f4eee5f637f14f0de5576390ee7dd2de2186fd`, records bounded local HTTP, browser Network and frame-commit events without changing SW/cache behavior:

- Initial candidate navigation received HTTP200 and committed normally without SW interception.
- Baseline navigation received HTTP200 through the Service Worker and committed normally.
- The return candidate request reached the local server, which finished its HTTP200 response in 32 ms.
- The browser emitted no response-received event and no candidate frame-commit event for that request. It eventually emitted `net::ERR_ABORTED` after about 300 seconds, covering the navigation and independent-read timeouts.
- No candidate document identity or stable compositor pair was established. Display restoration succeeded.

Artifact `11451352625` was downloaded and its entire ZIP SHA256 verified as `00b5203fc0cc01e882a3dc941a406eeb2ca11427a0c94e933d907eaf490172b0`.

This locates the latest failure before candidate document commitment, after the server response. It does not prove that the candidate renderer is slow or that a particular GPU operation caused the navigation hang. The narrow source-level suspect is the entry-navigation branch in `sw.js`: it awaits `cache.put(INDEX_URL, fresh.clone())` before returning an already successful network response, while baseline603.html is not an entry path and avoids that awaited write. The exact stalled worker operation has not yet been instrumented.

## Minimum next engineering scope

Stop unchanged CI retries. First instrument the copied Service Worker's fetch/cache-open/cache-put/reply stages, or otherwise establish that exact boundary, without changing product bytes. Do not use a snapshot-only success to replace any original acceptance gate.

If the awaited cache write is confirmed as the blocker, the narrow product amendment would be only the entry-navigation response/cache lifetime in `sw.js`: clone the response before consumption, retain the cache write through `FetchEvent.waitUntil`, and deliver the successful network response without waiting on that write. Preserve cache names, version, scope, asset handling, offline fallback and existing error behavior. This amendment is proposed, not implemented. It needs real online navigation, deliberately delayed/failed cache-write, cache-completion, offline reload and complete existing regression checks.

After reliable same-backend compositor comparisons exist, the issuer allows one disposable test-only filter-bound variable: keep current integer-X eligibility, native filter/alpha and device top0, and cap only the lower boundary at the projected sprite bottom plus two device pixels. Uncertain Y geometry must retain current full-height X clipping. This variant is not implemented. Earlier origin-zero Linux samples support testing but do not prove the combined bounds, Mac pixel identity, GPU-memory savings or 55 FPS. Require actual eligibility/area-reduction evidence, stable exact positive comparisons, visible wrong-bottom controls and all original performance gates before proposing a product helper change.

No merge or deployment is authorized by diagnostic collection success alone. Main and the art candidate remain unchanged.
