# P02 Quay Crane Operations 1.0

Independent native-game candidate derived from P01-C commit `8b547812dc2b75e9c621227a0972a6bb64ae7fab`. It does not release, merge, or change main.

## Run locally

From this directory: `npm ci --ignore-scripts`, `node build.cjs`, then serve this directory on an independent origin (not the player's 8123 origin). Open `native-preview.html`. The page selects memory-only slot 3 before loading the game. Use an independent browser profile. The collapsed harbor panel contains play/resume, pause, reset, P02 on/off, day/night/winter and rotation controls. Animation starts paused. Four staggered cranes repeat a 16-second empty equipment cycle. No real cargo is transferred.

`?noP02=1` restores P01-C; `?baseline=1` disables the entire harbor overlay. Neither mode changes native city data. The P01-C source and tests in ../port-p01b remain untouched.

## Verification

- `node motion-test.cjs`: deterministic clock, continuous full swept-volume and ropes clearance, negative controls.
- `node clearance-p01c.cjs`, `node freight-contract.cjs`: original geometry tests unchanged.
- `node chromium.cjs`: original P01-C 42 browser checks unchanged, against the P02 generated runtime.
- `node p02-browser.cjs`: actual Chromium animation phases, full-cycle replay, real P01-C whole-frame OFF parity, controls, near/far, 30 interleaved A/B pairs and historical-condition 60-draw bursts, four real-time cycles without rebake/cache growth.
- `node regression.cjs --lane=validate` and `--lane=fingerprints`: original regressions and fingerprints, unchanged predicates.

Set CHROME_PATH to a normal sandbox-enabled official Chrome binary. Never bypass the sandbox to make tests pass. Local cloud Chrome cannot launch because socket() returns EPERM; that failure is retained. GitHub Actions is the approved evidence environment. CI artifacts, not this README, determine which tests actually passed.

## Scope and limitations

Layout remains 26×23 with 208 real water tiles, four cranes, 24 yard containers and original facilities. Motion uses only preview elapsed time and native projection/sorting. Lower frame, motion and upper boom are locally interleaved using separated geometry volumes, preserving all original structural coordinates. No per-frame harbor bake, no simulation RNG, income, taxes, cargo throughput, AI, save format, or train logistics changes.

P01-C synchronous draw p95 112.5 ms remains a historical baseline, not overwritten by new measurements. Synchronous Canvas draw, simulation ticks and requestAnimationFrame display intervals are reported separately. Browser evidence and visual review are still required; numerical tests alone are not visual acceptance.

Failures and fixes remain in `failures/`; raw run artifacts include all failed attempts. P03 is research only after this candidate is reviewed; this delivery does not authorize ship economics or main deployment.
