# Independent main Pages candidate

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

The candidate workflow has contents:read only and performs validation/artifact upload. It cannot enable Pages or deploy. Both full original T602 jobs are retained, including the original regression, six exact sentinels,63 toolchain tests, art/save checks and full Chromium scenes. Additional contracts cover the packaged byte boundary, real game save/import behavior, foreign storage/cache sentinels and all37 SW navigation lifetime cases.

The native macOS package probe must cover a genuine first visit with no registered worker, actual game startup/own worker registration, all six complete cached shell responses, real save/reloads/export/import, delayed/rejected cache writes, positively verified origin-outage fallback and online restoration at `/GlimmerTown/`. Foreign Lab reads/writes/removals/enumeration and cache changes fail the run. Slot3 is set before game boot; only synthetic fixtures are used. This is a local same-origin simulation, not a claim of an already published HTTPS site or physical-device FPS.

Node tests cover versioned own-cache activation cleanup. A real-browser worker-version upgrade is not claimed until separately exercised. First-ever offline use cannot work before the first successful online installation; the original explicit503 behavior is retained.

Existing import behavior is preserved: invalid codes rejected before load keep both data and live state unchanged. A deeper shape-valid/unloadable code restores persisted primary storage, and the test explicitly reloads that primary to restore live state. No automatic in-memory rollback claim is made for that deeper existing case.

## Moving an existing local city

The new HTTPS origin cannot see localhost/file saves. In the existing local game, save the desired slot first, then use **匯出分享碼**. On the new site choose an empty destination slot and use **匯入分享碼**. Repeat for each desired slot and keep the exported code as a backup. Export reads the saved slot, not an unsaved in-memory city. This task does not access the user's computer or automatically move any save.

## Publication boundary

Pages remains disabled for the repository during candidate preparation. The expected project path is `/GlimmerTown/`; the actual HTTPS URL and assets must be verified after deployment. Only this tested main package may be published, with its exact commit and hash manifest recorded. Do not publish the repository root, backups, diagnostics or a T603 candidate.

The minimum platform configuration is Settings → Pages → Source: GitHub Actions. The owner has repository admin/maintainer permissions in repository metadata, but the available connector does not expose Pages administration and rejects even the Pages read endpoint. Do not infer permission to expand the connector or create a new credential. Resolve the supported settings action with the owner when the concrete candidate is ready.

Any eventual deploy job requires only contents:read, pages:write and id-token:write, scoped to the github-pages environment and the exact approved release. Final release checks must include actual HTTPS first load, runtime hashes, app-shell completeness, offline reopen and retained save isolation. An uploaded CI artifact alone is not a deployed site.
