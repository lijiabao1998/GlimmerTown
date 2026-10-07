# T603 independent main SW load repair

## Scope and status

Candidate only, based directly on main `637c8cc6d09306c1e17535ece6119d3ad78f1382`.
Branch: `gpt/town-sw-main-603`.
This is an independent navigation/load repair for main v11.211. It does not carry the T603 civic art, renderer, clipping, game fixture, version bump, or any changed acceptance threshold. Existing draft PR #2 and draft PR #3 remain separate and blocked; their failed acceptance evidence is not cleared by this candidate. There is no merge, release, or deployment authorization implied by this task card or its focused checks.

## Allowed changes and anchors

- `sw.js`, anchor `if(req.mode==='navigate')`: clone a successful entry response before returning it; run canonical cache writing in the background; synchronously register `FetchEvent.waitUntil` to retain the complete write. Keep the prior offline fallback, non-entry behavior, install/activate, manifest and static-asset paths unchanged.
- `test_fixde.js`, anchor `async fireFetch(request)`: teach the existing mock to accept synchronous `waitUntil`, then wait for registered event lifetime work before the existing post-event cache assertions. No existing assertion is removed or weakened. Non-blocking response behavior is independently asserted by the 37 contracts.
- New `docs/tasks/sw-main603/` test files, immutable main SW fixture, this task card, and `.github/workflows/town603-sw-main.yml` only.

## Immutable source

- `index.html` SHA-256: `b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265`
- Proposed `sw.js` SHA-256: `836d1d867d10d6c63d71c722d3337e5b7119ad36006314f74872583ec029dd3b`
- Original main SW fixture SHA-256: `3988245f393202d86dd6727d26fea99c9706943d87a75893faba1c32b3ad47ac`
- `GAME_VER` / `APP_VER`: both remain `11.211`.
- The test fixture is main's original SW, not the T603 art candidate worker.

## Required CI gates

The independent workflow copies both complete jobs from main's existing `town602-candidate.yml` verbatim. Only the new workflow name, push branch routing and concurrency group differ before `jobs:`. Original workflow file remains unchanged.

All original checks remain: full `tools/verify.py --min-pass 12513`, exact six sentinels, toolchain, T602 focused art pixels, prior-version seeded save/simulation compatibility, and the original full real Chromium T602 day/night/seasons/rotations/PNG gate. Their runners, timeouts, commands, conditions, artifacts and thresholds are retained unchanged.

Two additional jobs are required:

1. Node 22: immutable-source instrumentation check plus all 37 navigation lifetime contracts.
2. Existing standard `macos-15` runner with its installed Chrome and Node 22: controlled PWA navigation using `browser-main.mjs`. No new dependency, paid service, credential or permission is needed.

## Real-browser probe and proof requirements

`node docs/tasks/sw-main603/browser-main.mjs --port=8873 --out=evidence/sw-main`

On the standard macOS desktop runner, the probe serves byte-exact unmodified main HTML from an isolated origin and launches native headed Chrome with default graphics and a fresh temporary browser profile. Its window is at most 800×600 and is fitted inside the existing desktop without changing display modes. A new-document script sets slot 3 before the first game document executes. It verifies slots 1/2 remain absent on every completed boot. Ports 8123 and 8199, player profiles and user computer/browser are never used.

Only a copied SW is instrumented in memory. It logs navigation stages without awaiting log requests and provides explicit test-only delay/rejection controls. It does not attach a debugger to the SW, modify the checked-in worker or modify the HTML. The origin adds a diagnostic response header while preserving exact document bytes, allowing the prior completed cache response to be distinguished from a fresh failed-write response.

- Install and control: register the real SW, wait for activation/controller, and verify canonical cached main bytes.
- Delayed write: hold the copied worker's cache write for eight seconds. Require fresh response and actual top-level `Page.frameNavigated` commit before cache completion. Then require exact completed cache bytes and the delayed response marker.
- Rejected write: inject a test-only `QuotaExceededError` at the write operation. Require successful fresh SW response carrying the new marker, exact main bytes, no cache-put completion, and byte/metadata equality with the last complete cache response. This is a synthetic failure injection, not a claim of naturally exhausting disk quota.
- Origin entry outage: close only entry-document sockets before sending an HTTP response. The log endpoint remains reachable. Require aborted origin requests, positive `fetch-error` then `offline-match-end` with `hit: true` then `reply-offline`, SW response status 200, prior cache marker, exact delivered/cached main bytes, and actual v11.211 boot.
- Restore: reopen origin entry transport and navigate to clean `/index.html` without a query. Require fresh response, successful cache completion, clean-online marker, exact main bytes and online document state.

Logs are grouped by worker boot/navigation ID and ordered by worker sequence, never HTTP arrival. The probe waits for each complete required stage set. It writes summary and instrumented-copy evidence even on failure, then closes its browser/server and deletes only its disposable profile. It does not certify art quality, renderer performance or physical-device FPS.

## Local verification record

2026-10-07, assistant cloud only:

- Node v22.23.3: 37/37 lifetime contracts passed.
- Exact extracted original `runPwaTests` sections 16–19: 72/72 existing PWA assertions passed, including original mutation control; Pillow 12.2.0 and pinned zlib-ng environment retained.
- Node syntax checks: runtime SW, test mock, contract suite, browser probe and all main HTML scripts passed.
- Instrumented copied SW compiles, verifies source pins and leaves main product bytes unchanged.
- Existing T602 workflow job text is byte-identical in the independent workflow.
- `git diff --check` passed; original `test_fixde.js` change is exactly the faithful lifetime-mock adaptation already reviewed in the separate candidate.
- Full Node regression, original T602 browser gate, and the new real-browser PWA probe were not run locally because the shared cloud has limited remaining memory. They are required CI gates, not presumed passes. No external writes, push, PR creation, CI dispatch, merge or deployment were performed by the preparing worker.

## Rollback

Revert this candidate's SW navigation block and the mock adaptation together, and remove its new test/workflow/task-card files. Main HTML, assets, save format, simulation and renderer require no rollback because they are unchanged.

## First complete candidate run and retained failure

Run37575267529 on `c4bcc12543d516aa921a83c171fda9dbb3462626` passed the37 contracts and original full regression12525 assertions, six pinned seed values and63 toolchain tests. The controlled browser passed23 checks, including delayed completion, rejected write and positively proven origin-outage cache fallback. Its final clean-online document received the successful SW response and committed; the background write completed in54ms. The actual boot-ready predicate did not pass within the unchanged polling bound. No page JS exception or console error was recorded. This remains a failed browser gate, not a complete load-repair acceptance.

The retained failure artifact SHA256 is `2013f4b2c4cb28cca35330e17304d4a05c1f664b60c122339ccf0001f50b6b2d`. It did not record the rejected boot predicate, so the cause is unproven. Main bootstrap awaits native requestAnimationFrame checkpoints; its existing T434b source notes the need for a presented browser context. A harness-only amendment therefore activates the actual page and verifies visibility/focus before and after each navigation, and saves bounded full boot/identity observations and read errors. It does not synthesize frames, change product files, increase the boot timeout, skip a predicate or turn transport success into boot success. All existing functional/timing assertions remain, with visibility/focus now additionally required.


## Retained R1 failure and native presentation amendment

Run 37576367217 on the R1 candidate again passed the delayed write, rejected write and origin-outage cases. The clean-online response, document commit and background cache write also completed; the write took 53 ms. The recorded final boot observation was exact main v11.211, a new time origin, complete document, and a focused page, but `visibilityState` was `hidden` and the actual boot state remained at 99%, `點亮主選單…`, with `ready: false` through poll 240. The source awaits a real rAF checkpoint at 99% before completing startup. Thus the hidden presentation/stalled checkpoint is now observed; this remains a failed browser gate.

The next harness-only amendment uses headed Chrome and its default graphics on the existing standard `macos-15` runner. It activates Google Chrome through `/usr/bin/open -a`, verifies the actual foreground application's Chrome bundle ID with `lsappinfo`, brings the precise CDP page forward, and records native plus page visibility/focus and viewport evidence. No screen-resolution or display-mode change is made; window bounds are fitted within the current available desktop. This is functional startup qualification, not an FPS or renderer-acceptance replacement.

If real page or native foreground is lost during boot, the harness allows at most two logged OS/page reactivations. These use the same 240-poll, 500-ms boot bound with an additional hard 120-second deadline; reads, subprocesses, reactivation and sleeps share the remaining budget. There is no deadline reset, synthetic rAF/visibility, screenshot wake, product modification or transport-as-boot shortcut. All four original scenario/timing/cache/restore assertion blocks remain byte-identical. Exact main HTML and product SW hashes remain unchanged.

Node 22 syntax/source checks, 37 lifetime contracts and 12 extracted native/observation helper tests pass locally. The headed native browser flow still requires its real CI run; local mock/helper passes do not establish that it works on the runner. Neither historical failure is replaced or hidden.
