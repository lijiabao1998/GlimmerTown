# P01-C original regression coverage

The candidate-owned runner does not edit original tools, workflows, predicates, fixtures, or expected values. It runs the original tests in subprocesses and records exact commands, runtime hashes, exit statuses, errors and logs. Any failed required command makes its lane fail.

## What each lane proves

- `--lane=focused`: the original T706 routing and T707 articulation/turnaround/dwell/blocking scripts run against both the unchanged repository index and the exact generated preview bytes. Original oldsave602 and oldsave603 run against both sources, retaining their independent six fixture hashes, root/ref checks, save-field comparisons and second-load comparisons. The candidate overlay changes only index.html; guard scripts and fixture expectations remain original bytes. These are Node/source-replay checks, not browser pixel acceptance.
- `--lane=validate` (default): focused checks above plus the original full baseline verifier at the original workflow's current minimum-PASS floor; original toolchain, T602/T603 software-pixel checks, clearance, native/release/frame tool contracts, approved-art registry and independent T634 checks. Full verify is explicitly baseline-only because the standalone preview deliberately disables persistent autosave and PWA registration and has multiple inline scripts. It is not represented as full-preview or production-gate acceptance.
- `--lane=fingerprints`: the original tools/fp_snapshot.py runs `--check` against both baseline and actual generated preview, comparing all inherited SPR and ART keys to their original committed pin files. Both cold boots must agree under the original predicates. This does not cover new preview-only drawing assets or whole-frame valve equality; those belong to chromium.cjs. On Linux a disclosed candidate-owned transport adapter removes only the original launcher's `--no-sandbox` argument, retaining Chrome's normal sandbox; original fingerprint code remains byte-identical.

## GitHub Actions execution, from checkout root

Use a non-root Ubuntu runner with normal Chrome sandbox support, full git history/tags (`fetch-depth: 0`), Node 22 and Python 3.13. No production deployment or main merge is involved.

```bash
source tools/setup_t602_zlib.sh "$RUNNER_TEMP/p01c-png-runtime"
npm install --prefix "$RUNNER_TEMP/p01c-original-canvas" @napi-rs/canvas@1.0.11
export NODE_PATH="$RUNNER_TEMP/p01c-original-canvas/node_modules${NODE_PATH:+:$NODE_PATH}"
node docs/previews/port-p01b/regression.cjs --repo="$PWD" --lane=validate
node docs/previews/port-p01b/regression.cjs --repo="$PWD" --lane=fingerprints
```

The existing official setup script checks the SHA-256 of the official zlib_ng 1.0.0 source archive, builds its zlib-ng 2.2.5 compatibility library in the supplied temporary directory, installs Pillow 12.2.0 there, exports LD_LIBRARY_PATH/PYTHONPATH, and runs the original icon generator in read-only `--check` mode. Keep those exported variables in the same step or propagate them explicitly between steps. Never change icon hashes or assertions to match a mismatched local runtime.

Candidate cwd also works: `node regression.cjs --repo=/absolute/checkout --lane=focused`. Each lane writes evidence/p01c-regression/regression-<lane>.json and per-command logs. Original tracked files are SHA-256 checked before and after, excluding only candidate preview files. The source overlay is temporary and removed after execution. All saves are synthetic fixtures or memory-only harness data, never player saves.

## Local status and limits

The focused lane passed all eight original subprocess checks. Original T706 negative controls: 2; original T707 negative controls: 4. T707 observed maximum off-rail distance 0, minimum opposing-train gap 1.933 and station dwell 1.5 seconds. Both old-save suites passed all three fixtures each against the preview, with exact root hashes, zero footprint errors, no changed contractual save fields and exact second-load roots.

The initial full-baseline attempt failed at the original T270 PNG byte check under the unaligned system Pillow/zlib runtime (4262 PASS before failure); this is preserved in baseline-verify.log, not called green. The original isolated runtime has since been installed and its icon byte check passed; aligned full verification is tracked separately in baseline-verify-aligned.log. Native browser fingerprints/whole-frame checks have not been run locally because the current cloud browser process is blocked; no sandbox bypass was attempted.

Six original d400 economic pins: seed301 population 780 / money 2297; seed7 population 117 / money 77; seed22 population 639 / money 14523. SPR_PINS has 1586 keys and ART_PINS has 3534 keys. A baseline verifier pass alone does not prove these values on the generated preview; candidate native simulation is a separate required check.

The local repository lacks historical object d88e36d, required by original check634.cjs; full-history Actions checkout is required for that test. Do not substitute another baseline or suppress that failure. Do not package png-runtime/, candidate-stage/, or temporary transport-test helpers as application assets.
