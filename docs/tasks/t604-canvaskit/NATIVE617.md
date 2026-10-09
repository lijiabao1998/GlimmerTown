# T617 native correctness regression

The selected runtime is the approved T603 native renderer. This runner does not
install any retained layer, source observer, Canvas prototype wrapper, or altered
night-layer implementation. T614/T615/T616 findings do not create a pixel
tolerance for this run. Every canonical zero-difference assertion remains zero.

Only `native617.cjs` and this document are new. Product files, prior diagnostics,
the canonical T603 harness, workflows, and published content are unchanged.

## Execution

```sh
node docs/tasks/t604-canvaskit/native617.cjs --self-test
node docs/tasks/t604-canvaskit/native617.cjs --check-overlay
node docs/tasks/t604-canvaskit/native617.cjs --support-only --out=/tmp/native617-support
node docs/tasks/t604-canvaskit/native617.cjs --phase=core --port=8897 --out=/tmp/native617-core
node docs/tasks/t604-canvaskit/native617.cjs --phase=world --port=8898 --out=/tmp/native617-world
node docs/tasks/t604-canvaskit/native617.cjs --phase=neighbors --port=8899 --out=/tmp/native617-neighbors
```

`--phase=full` runs all three browser sections. A phase-specific pass is evidence
only for that phase plus common setup. Complete acceptance requires all three
phase reports, or one successful full report. Each invocation uses a new
temporary directory, independent browser profile, and explicit slot-3 selection
before game boot. `--with-support` runs the supporting suite before the browser.
Ports 8123 and 8199 remain prohibited.

Browser correctness uses the original Ubuntu/Linux Chrome environment. Its
entire launch expression is checked and retained byte-for-byte, including
`--headless=new`, `--disable-gpu`, Linux `--no-sandbox`, 1400×900 startup size,
and the isolated profile. The runner rejects non-Linux browser execution. No
headed/default-graphics substitution is made to rescue a pin or pixel failure.
Use the installed official Chrome binary through `CHROME_PATH` when necessary.

## Exact source and preserved coverage

The checkout still contains the T604 CanvasKit overlay. In the disposable copy,
`source-contract.cjs` first verifies its exact contract and then inverts only
those renderer hooks and service-worker asset additions. The resulting index is
the approved native T603 runtime; `assertNativeSource603` also verifies the
immutable v11.211 art-inversion reference. Both runtime hashes are reported.

The browser harness derives directly from unchanged `scene603.js`. It preserves:

- All 1,586 immutable sprite pins, candidate pin checks, and independent boot
  reproducibility
- Exact 16-frame art-escape/full-RGBA comparisons against the independent
  immutable reference
- All three immutable old-save load/save/reload checks, root SHA256/footprint
  references, canonical fields, and independently grown seed-22 city pins
- Desktop/mobile real controls, placement/demolition, save/load, inspection,
  pan/zoom, and toolbar reachability
- All 308 native world cases: 256 season/light/rotation/distance scenes,
  32 fractional scenes, 16 mobile/DPR scenes, and four aligned scenes
- Twelve real placement variants, 20 construction roots, 128 adjacent
  occlusion scenes, 32 shoreline scenes, and 288 dog/owner animation cases
- Native filter assertions, full star/dust input controls, restoration,
  wrong-edge/depth negative controls, exact pixels, and zero app/runtime errors

The canonical assertions and thresholds are not rewritten. There is no tiny
difference continuation policy, masked region, new pin set, or quality bypass.

## Additional native and save-isolation checks

`window.__native617.status()` verifies that the night helper is still the exact
original function, that CanvasKit is absent, that no retired retention/observer
global is loaded, and that slot 3 is selected. These checks run after every boot
and navigation and at each completed phase.

Before game code starts, the diagnostic captures the untouched slot-1/2 primary
and backup keys plus the legacy save key. The host retains the first document's
baseline across all reloads and independent reference-page navigation. A later
page cannot hide a changed key by taking a new snapshot. Slot isolation checks
run outside the boot-retry catch, so violations fail immediately. No player
profile or existing player save is used.

`checkpoint(label)` performs two native draws while requiring exact
day/money/pop/tile data and actor pools and zero simulation RNG calls. It restores
running state, the original RNG function, and visual clocks even on exceptions.
It never replaces the night helper or Canvas methods.

The common setup runs 26 guarded transitions: five zooms, four rotations,
fractional pan, four seasons, three weather states, three quality levels,
night-feature off/on, source regeneration, same-size night output reset,
daytime and return to night. Each deliberate transition is outside the rendering
mutation guard. The prior camera/calendar/quality/weather/feature/frozen-clock
state is restored afterward, then the canonical seed-22 city is independently
regrown and rechecked. Native DPR/resize and placement/load/new-world coverage
remain in the canonical browser sections. Synthetic events are not represented
as a real GPU context-loss test.

## Supporting suite

`--support-only` and `--with-support` call the existing exported T616 `support()`
function unchanged. That function already passed the canonical supporting gates
and creates its own inverted native tree. It runs:

- `tools/verify.py --min-pass 12525`, including the unchanged fail-fast spine,
  seed pins, syntax/version/CRLF/code-map checks and nested suites
- The full Python toolchain suite
- `native603.test.js`, `sw603.test.mjs`, `test603.js`, and
  `clearance603.js index.html - 1`
- `oldsave603.js` against all three immutable fixtures

Historical injected diagnostics under `docs/tasks/t604-canvaskit` remain excluded
from that non-shipping support tree, exactly as in the existing support function;
the canonical T447 guard is unchanged. The native617 self-tests independently
exercise the generated diagnostic and save-isolation logic. A supporting-suite
pass alone does not replace native browser results.

## Timing separation and evidence

Only the two previously identified timing spans are removed. Their exact bytes
must match these SHA256 values before removal:

- Mobile cold/warm/RAF and one-minute RAF timing:
  `1ca1736a930dbf14bd17b2d07c5aaf64a51286d91531e489f214fc339dea8e8f`
- Desktop cold/warm/RAF/trace timing:
  `2c35952e5b590c3dbbc735dda0eb321ea7afe45ef2c88deb668bb27b378482cc`

Unexpected byte changes, duplicated/missing anchors, a modified Chrome launch,
or a surviving timing invocation stop generation. `native617-overlay.json`
records source provenance and all transformations. `native617-summary.json`
contains checks, original coverage flags, screenshots, transitions and isolation
results. The reused support logs remain under `support/`; a successful support
run also produces `native617-support-summary.json`.

This runner makes no FPS claim and does not establish the removed one-minute
RAF performance gate. `active617` measures actual gameplay separately after
correctness. No helper duration, screenshot rate, or green correctness job is
reported as 55 FPS. Release remains a separate decision.

## Implementation verification

Overlay compilation and native617 self-tests pass. Tests execute the generated
slot guard across a simulated reload, reject slot writes and slot-1 selection,
reject retired globals, exercise native model/RNG failures and exception
restoration, verify all 26 transitions and original helper identity, preserve
the canonical pins/coverage/zero-pixel assertions, and reject timing/launch/source
drift. No browser run or fresh full supporting-suite pass is claimed by these
implementation checks.
