# Independent main Pages candidate

> 2026-10-09 T618 integration: the user approved native T603 artwork and incremental release. The candidate now packages the exact approved T603 runtime (index SHA256 `99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d`, SW `79cfb7a690f85d42b9ff81e32b4e591c1525c9ee43f660f8a6c8a23b856955e2`) on current main. The historical T602-only scope below is retained as history, not the current release restriction. Current release requires the complete canonical checks, all original T603 relative timing/liveness blocks, package and namespace contracts, real old-to-new SW/save upgrade and offline reopen, then actual HTTPS verification. The separate T617 active diagnostics remain failed/unqualified where recorded; they are not relabelled passed or used to claim55FPS or acceleration. No experimental retention, observer or CanvasKit runtime is packaged. See `tools/pages/UPGRADE618.md`.

Base source is the fully verified main `4e8823781178ea69e7862bbf3db2a74328080291` (v11.211, including PR #4's navigation lifetime repair). Branch: `gpt/town-main-pages`. This candidate excludes the T603 artwork and all of its unresolved pixel/performance changes.

## Why the package needs separate storage

The existing Lab Pages deployment and canonical main both use `glimmerville.v1`. Repository paths on the same `lijiabao1998.github.io` origin do not isolate localStorage. Publishing main unchanged there could read or overwrite Lab's three slots and preferences.

`tools/pages/build-main.mjs` accepts only the SHA-pinned seven main runtime files. It writes a separate static package with exactly three literal substitutions:

1. Main cloud saves/preferences use `glimmerville.main.v1`.
2. Its SW cache prefix becomes `glimmerville-main-shell-`.
3. Its old generic `gv-v1`/`gv-v2` cleanup list is empty. Activation may delete only caches bearing the new main prefix.

Every output file is verified by reversing those substitutions to the original pinned bytes. Original root index.html/sw.js, GAME_VER/APP_VER, artwork, styles, renderer, simulation and save data format remain unchanged. The local canonical player continues using its existing files and storage keys. There is no automatic migration from the shared Lab namespace.

The namespaces prevent accidental cross-app access; they are not separate browser security origins and still share browser storage quota. Never clear Lab data to make space for main.

## Build and verification

```
node tools/pages/build-main.mjs _site/main > package-manifest.json
PAGES_SITE="$PWD/_site/main" node --test tools/pages/*.test.mjs
node tools/pages/browser-main.mjs --site=_site/main --check
```

The output contains only index.html, sw.js, manifest.json, icon.svg and the three icon PNGs, about4.46MB. Manifest and SW registration retain relative project scope. No game backend, external script or account service is needed.

The workflow defaults to contents:read. Candidate-branch runs perform validation and artifact upload; publication is restricted to a push on main after all four validation jobs succeed. Only the deployment job receives pages:write and id-token:write. It cannot enable Pages automatically. Both full original T602 jobs are retained, including the original regression, six exact sentinels,63 toolchain tests, art/save checks and full Chromium scenes. Additional contracts cover the packaged byte boundary, real game save/import behavior, foreign storage/cache sentinels and all37 SW navigation lifetime cases.

The native macOS package probe must cover a genuine first visit with no registered worker, actual game startup/own worker registration, all six complete cached shell responses, real save/reloads/export/import, delayed/rejected cache writes, positively verified origin-outage fallback and online restoration at `/GlimmerTown/`. Foreign Lab reads/writes/removals/enumeration and cache changes fail the run. Slot3 is set before game boot; only synthetic fixtures are used. This is a local same-origin simulation, not a claim of an already published HTTPS site or physical-device FPS.

Node tests cover versioned own-cache activation cleanup. A real-browser worker-version upgrade is not claimed until separately exercised. First-ever offline use cannot work before the first successful online installation; the original explicit503 behavior is retained.

Existing import behavior is preserved: invalid codes rejected before load keep both data and live state unchanged. A deeper shape-valid/unloadable code restores persisted primary storage, and the test explicitly reloads that primary to restore live state. No automatic in-memory rollback claim is made for that deeper existing case.

The first candidate run, [37609977962](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37609977962), passed the original T602 jobs and all 61 package contracts, then stopped at the second browser reload. The exact rollback-save SHA was reproduced against unchanged game code: importing restores the input bytes, then adds the normal `📥 匯入成功` notification to the live log. A visibility or periodic save persists that one log entry. The revised fixture explicitly saves and checks this exact one-field, one-entry change before fixing its reload baseline. Immediate import/rollback bytes, backup bytes, full reload bytes, city values and foreign-storage guards remain strict. Both clipboard and prompt export paths now exercise fresh game boots plus the actual visibility and 25-second save callbacks; 63 Node contracts pass. Browser observations persist actual/expected hashes and field differences before assertions, so the next full run can distinguish data loss from a fixture mismatch. No product code changed for this correction.

That correction passed the complete [run 37612816247](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37612816247) at `73fb8de4a709404f8ab295eacf2d595c430f336f`: 12,525 original assertions, six sentinels, 63 toolchain tests, 394 original browser checks/366 screenshots, 63 package contracts and 183 native Mac package checks. The second reload matched every expected save byte and city value. Its outage case cuts entry requests only; it is not proof that all browser/worker networking is unavailable or that a saved city was reopened offline.

The separate `published-main.mjs` smoke check is prepared to close that gap. It supports the raw local package before publication and the actual reported HTTPS URL after publication. It verifies all seven asset hashes, app-managed installation and complete shell cache, creates a synthetic main save, clears only the HTTP cache, fully closes Chrome, then reopens the isolated profile with a process-wide rejecting proxy. Both page and worker traffic must fail for uncached probes while the cached app boots. The real Continue handler must enter the exact saved city before a separate load assertion, with the start menu hidden and canvas visible. Lab storage/cache sentinels remain protected. This check does not rewrite HTML or instrument the worker. Its local CI and actual HTTPS results must be recorded separately; neither is claimed by the earlier 183 checks. Ten focused contracts cover wrong-host/redirect/truncated-body failures, proxy authority/default ports, false offline evidence, Continue failure and ordering; the expanded Node aggregate passes 73 cases before browser validation.

The first restart attempt in [run 37617861204](https://github.com/lijiabao1998/GlimmerTown/actions/runs/37617861204) reached a worker-served `cache-storage` response after both HTTP-cache clears, with blocked proxy requests and zero offline origin requests. It stopped before Continue because the harness incorrectly rejected `fromDiskCache:true`; Chromium can set that flag on persistent Cache Storage responses. The corrected contract requires explicit `fromServiceWorker:true` and `serviceWorkerResponseSource:'cache-storage'`, rejects network/HTTP-cache/fallback/missing sources, and preserves the first-visit disk-cache rejection. Full response evidence is saved before assertions. This correction changes only the test, and does not count the unexecuted Continue/save stages as passed.

## Moving an existing local city

The new HTTPS origin cannot see localhost/file saves. In the existing local game, save the desired slot first, then use **匯出分享碼**. On the new site choose an empty destination slot and use **匯入分享碼**. Repeat for each desired slot and keep the exported code as a backup. Export reads the saved slot, not an unsaved in-memory city. This task does not access the user's computer or automatically move any save.

## Publication boundary

Pages remains disabled for the repository during candidate preparation. The expected project path is `/GlimmerTown/`; the actual HTTPS URL and assets must be verified after deployment. Only this tested main package may be published, with its exact commit and hash manifest recorded. Do not publish the repository root, backups, diagnostics or unverified experimental runtime. Only the exact approved native T603 seven-file package may replace the live T602 package after all current release jobs pass.

The minimum platform configuration is Settings → Pages → Source: GitHub Actions. The owner has repository admin/maintainer permissions in repository metadata, but the available connector does not expose Pages administration and rejects even the Pages read endpoint. Do not infer permission to expand the connector or create a new credential. Resolve the supported settings action with the owner when the concrete candidate is ready.

The deploy job targets the github-pages environment, reads existing configuration with enablement:false, and consumes only the seven-file Pages artifact from the successful package job in the same run. It depends on validate, browser, package and pages-browser. A separate read-only verification job then tests the actual URL returned by GitHub, with the same pinned package as its expected bytes. Final release checks include actual HTTPS first load, runtime hashes, app-shell completeness, offline saved-city reopen and retained save isolation. An uploaded CI artifact or a completed deployment alone is not a verified playable site.
