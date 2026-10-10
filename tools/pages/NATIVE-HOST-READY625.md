# T625 startup host readiness

T624 run 38004849690 stopped before its first mobile-day RAF window: the initial
host reported top 0 / height 1200, then the boundary reported top 88 / height
1112. The PID, window identity, fullscreen state and other predicates matched.
This establishes a reported geometry change; its cause is unknown.

T625 changes startup preparation only. Its emitted source is the exact repaired
T624 `mobile-warm-trace623.build()` output, SHA-256
`58ab0084accbccf0e12cb21fd974c8a2401390a8450ca7de08cb98e21ab73d6a`, with one
checked qualifier-import replacement. Reversing that replacement must reproduce
the entire base source byte for byte. The original `mac.createQualifier`
function is also pinned by SHA-256 before its existing pause seam is used.
Its original `before`, `after` and `complete` closures are returned directly.

## Readiness contract

- One 15-second monotonic deadline begins at wrapper entry. Initial CDP/native
  setup, every observation, spacing, the canonical final snapshot and the
  original latch-script installation all consume that same deadline. Native
  command timeouts are capped by its remaining budget. Partial commands and
  observations are recorded before they run. A timeout is terminal; a late CDP
  response cannot mark readiness successful.
- The original fixed pause is replaced with read-only complete observations.
  Each records Chrome PID/bundle, window ID, fullscreen bounds, actual
  unemulated viewport/DPR/screen dimensions, document visibility and focus.
  Native command failures, wrong identity, focus/visibility loss, runtime errors,
  invalid geometry or inability to fit the unchanged 1400×900 workload stop
  preparation. The initial window ID must remain the same.
- There are at most 15 attempted observations: up to 14 polling observations,
  reserving one for the canonical final host read. Polling waits one second
  after each completed reading; slow reads do not cause catch-up bursts.
  Readiness requires at least five seconds since polling began, and the last
  three consecutive complete readings must match exactly and span at least
  two seconds. Valid geometry changes reset the matching streak.
- The original canonical host window, viewport and native foreground reads
  still execute. Its original viewport expression remains unchanged; one
  additional focus/visibility read completes the final observation. All checked
  fields, including native foreground output, must equal the stable snapshot.
  The canonical host object is then frozen once. Readiness is reported only
  after the original initialization has completed inside the deadline.
- After initialization, there are no added observations or waits. Window-ID
  checks use existing boundary responses and retain an offending response before
  failing. Original exact geometry/viewport checks, nine RAF windows and loss
  latches remain active. No later rebase or recovery is permitted.

There is one original fullscreen request and one original native activation;
T625 adds neither. It introduces no draw, warmup, emulation change, navigation,
cache operation, new browser attempt or retry. Product/runtime bytes, original
timing expressions and thresholds, night-arm latches, two trace/profile captures,
cumulative 64 MiB / 90-second capture limits, and the existing 45-minute job /
38-minute inner supervisor and display restoration are unchanged. Preparation
adds no time allowance.

## Running and interpreting evidence

Use `node tools/pages/native-host-ready625.cjs --check-overlay` for the source
proof and `node --test tools/pages/native-host-ready625.test.cjs` for focused
local tests. An explicitly authorized native invocation uses `--out=PATH` and
the existing `T619_JOB_START_MS` contract. The outer receipt is
`native-host-ready625-supervisor.json`; detailed readiness attempts are in
`innerSummary.nativeHostReady625`.

`startupHostReady` reports only the bounded startup result.
`diagnosticTraceCompleted` additionally requires the unchanged T623 completeness
predicate. Original failed status and fatal performance gates remain intact.
All results explicitly retain `collectionCompleted:false`,
`releaseGatePassed:false` and `releaseEligible:false`.

Readiness is prospective; later geometry drift can still fail the run. Boundary
checks do not establish uninterrupted native OS occlusion. T623 instrumentation
can alter scheduling; baseline trace collection can alter candidate state, and
asynchronous GPU work crossing capture boundaries remains unattributed. A
successful instrumented collection cannot clear the original main timing
failure or authorize deployment. Publication and any new invocation require
the parent's separate decision after independent implementation review.
