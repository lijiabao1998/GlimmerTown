# T618 main Pages upgrade acceptance

> **Historical (T627, 2026-10-10).** This page records the T602 to T603 upgrade as T618 first built it. Since T627, `--upgrade-from-main` keeps its name but upgrades from the release the live site serves (PREV, resolved by `tools/pages/release-identity.cjs`); it no longer rebuilds T602 with `native603.sourceBaseline603`. The old version, hashes and cache name come from PREV's git objects and must match the live bytes, and the new ones come from HEAD. When PREV and HEAD have the same seven runtime files, the mode records `report.upgrade.status='not-applicable-no-runtime-change'` and exits 0 before Chrome starts. The 329f660 (v11.211) to 4dd0fa4 (v11.212) upgrade described below is kept as an injected frozen-pair test in `tools/pages/upgrade-main.test.mjs`. The browser stages below still run as described, with the versions taken from PREV and HEAD and an added check that PREV's cache is gone. The hashes and versions named below are history. Current rules: `docs/tasks/main-pages/README.md`, section "Release identity (T627)".

Run on the existing assistant-owned native macOS Chrome runner:

```sh
node tools/pages/published-main.mjs --site=_site/main --upgrade-from-main --out=evidence/pages-reopen
```

`--upgrade-from-main` is opt-in and rejects `--url`. The ordinary local and published HTTPS modes retain their existing current-package first-install and offline-reopen checks. `--check` with the upgrade flag validates package reconstruction and browser-helper syntax without launching Chrome or making network requests.

The upgrade mode serves seven immutable runtime bodies. It reconstructs the old native index using `native603.sourceBaseline603` and requires SHA-256 `b9190da54b0ac40ae5f64e61f7b919bb6fb46091192e2a5be9684970c9b94265`. The old worker differs from the pinned current native worker only by `APP_VER='11.212'` → `'11.211'` and must hash to `836d1d867d10d6c63d71c722d3337e5b7119ad36006314f74872583ec029dd3b`. Only the established main save/cache namespace substitutions are applied. The other five bodies stay identical. No runtime files are changed or written.

One fresh isolated profile installs the old app-managed raw worker, verifies six exact old cached shell bodies, and creates a real slot-3 city through the old game's API. A second real save stabilizes the backup. Existing synthetic Lab localStorage and three foreign-cache sentinels are checked throughout.

The local server then switches to the exact current package. Listeners are attached before `registration.update()`. Acceptance requires observed `updatefound` and `controllerchange`, distinct worker/controller objects, the old worker becoming redundant, the new worker activated and controlling the original registration, and a completed browser script request matching each version's exact raw SW body. Before reload, the gate requires old main-owned cache deletion, exactly six new shell bodies, foreign-cache preservation, and unchanged main storage.

The real controlled reload must return the new pinned document from the worker's network path and boot version 11.212. The old primary and backup must remain byte-exact before load. Actual `GV.load()` must preserve stored old bytes and restore the full observed persistent tile model and core city values. Actual `GV.save()` must change only the exact `gameVer` field and back up the original bytes. A repeated real save establishes the byte-exact new-version baseline and validates all other main keys.

The existing clean online shutdown, new Chrome process, same profile, rejecting proxy, two uncached network failures, Cache Storage document provenance, real Continue button, exact saved-city reopen, foreign-storage checks, and shell checks then run unchanged. The persistent live tile model is also compared across the upgrade and offline process. This proves browser-network denial, not OS radio state, a published-site upgrade, an installed-PWA OS launch, or frame-rate performance.

The harness retains its 14-minute observation deadline and cleanup reserve. Worker update/activation is bounded to 60 seconds, including a stuck `update()`. `summary.json` records intermediate version, source/body, worker, cache, document, storage and save observations. Failures retain their stage and partial evidence; owned browser processes, sockets and temporary profile/package are cleaned up.

Focused tests: `node --test tools/pages/upgrade-main.test.mjs`. They include source/version/cache/save/provenance negative controls, worker event/timeout behavior, and a real old/new game save round-trip using the pinned Node DOM mock. These tests and `--check` do not substitute for the actual native Chrome CI run. Full package tests: `node --test tools/pages/*.test.mjs`.
