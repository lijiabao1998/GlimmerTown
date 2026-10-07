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

## SW-stage probe prepared on 2026-10-07

The next isolated diagnostic branch is `gpt/town-sw-stage-603`, based on the published record commit `3ed56b74057371b3dd16a835ac1b7a099af2332f`. It changes only the diagnostic script, its workflow branch routing, and this record. Repository `index.html` and `sw.js` retain the frozen hashes above.

Only the temporary served SW copy receives stage markers. Markers cover navigation entry, fetch begin/end, cache open begin/end, response clone begin/end, cache put begin/end/error, fresh reply, and the existing offline open/match/reply paths. The receiver records worker boot, sequence, navigation ID, path, worker time and server receipt time. It keeps at most512 recent events, rejects oversized/malformed logs, and stores no request headers or response bodies. The complete instrumented worker is retained as a text artifact with both original and instrumented hashes.

Logging uses same-origin POST without awaiting its result, adding `waitUntil`, or attaching a worker debugger. The original cache awaits remain in place. Logging can still perturb scheduling, so a non-reproducing run is not a product fix or performance acceptance. Before the target entry navigation, the harness requires a complete baseline navigation stage sequence to prove that the observation channel is working.

Controlled-promise checks confirm that pending cache.open and cache.put still prevent the original navigation reply; logging promises may remain unresolved without blocking the application response. Baseline non-entry navigation, failed cache writes, offline cache hit/miss/storage failure, original503 text, and non-recursive POST behavior are preserved. Receiver limits, field filtering, latest-event retention, generated JavaScript syntax and whitespace checks pass locally. These checks do not replace the pending real browser stage trace, and no product `waitUntil` or filter-bound change is included.


## Clip-site and origin isolation, 2026-10-07

The completed SW-stage run [37551054766](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37551054766), source `4811241feebe07ea9b66c234e1834727f5c7f860`, established successful fetch/open/clone/put/reply sequences. The two entry cache puts completed in22ms and52ms. The hang did not reproduce under instrumentation, so no Service Worker product repair is justified by this evidence.

Its native Mac compositor pairs were stable with138 daytime and63 nighttime changed pixels between unclipped and current clipping. The wrong-edge control changed7908 pixels and restoring it returned to zero. Most changed pixels lie in existing outer-water antialiasing, generally one channel level. These are real nonzero observations, not an exact-equivalence pass; no threshold has been relaxed.

This next bounded diagnostic uses the same frozen product and the same successful observation harness, served only from its disposable copy. Seven modes separate current native clipping, shadows only, reflections only, a full-canvas no-op clip, an origin-zero horizontal clip, origin-zero shadows only, and origin-zero reflections only. Both alternate geometric helpers retain every original eligibility predicate, original native filter/alpha and full canvas height. Origin-zero changes only the lower-X boundary to zero; full-canvas replaces the rectangle with the complete backing canvas. Neither helper is installed in product source.

Each mode captures an unmeasured warm frame followed by two full-viewport screenshots for both fixed day and night. Every repeat must be exact. Baseline frames before and after the matrix must also remain exact; the canonical city and frozen actor/clock state must remain unchanged. Each frame records eligible shadow/reflection uses and clipped device area, with explicit site-isolation assertions against the native mode counts. An absent site, such as daytime shadows in the unchanged quality1 fixture, is reported as unexercised and must retain zero uses; it cannot establish a zero-pixel optimization path. The city invariant is captured after each fixed-light camera setup while the update loop is stopped. The original visible wrong-edge and exact-restoration controls remain. No timing result here can clear the failed55FPS or mobile-night acceptance, and no new artwork, performance threshold, product file, original acceptance workflow, candidate branch, or main is changed.

Local preparation checks: generated harness syntax and whitespace checks pass;2625 pure mocked eligibility/geometry checks match the frozen native helper across integer/fractional transforms, reversed X, zero widths, off-canvas coordinates and all guarded fallback cases. These are not browser pixel or performance acceptance. Independent review identified the quality1 daytime-shadow absence and control-count metadata; both are represented explicitly before CI.
