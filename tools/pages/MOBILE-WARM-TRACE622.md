# T622: one mobile-night warm-draw causal capture

This is an instrumented diagnostic, not a release gate or deployment request. It investigates the native run `37951681834` failure: mobile-night warm p95 was 23.5 ms for baseline and 54.8 ms for candidate, exceeding the unchanged 40.25 ms relative budget. That run did not contain a trace of this interval. A different result under instrumentation does not invalidate the original failure.

## Source and scope

`mobile-warm-trace622.cjs` composes `native-portability-diagnostic.build()` only when its complete emitted source hashes to `c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b`. Five exact, single-occurrence host edits must reverse byte-for-byte to that base. The emitted manifest records source/adapter hashes, the edit allowlist and resource limits.

The original product, scene preparation, prior pixel/readback and old-save controls, source portability controls, baseline/candidate order, cold draw, ten warm draws, following RAF calls, all thresholds and final fatal verdict remain in force. Desktop timing and the complete existing RAF helper, including all nine foreground/viewport/loss-latch qualifications, remain byte-identical. The mobile host loop is explicitly instrumented; its original full timing span is not claimed to be byte-identical.

No release-acceptance or deployment supervisor is invoked. The result always sets `collectionCompleted: false`, `releaseGatePassed: false` and `releaseEligible: false`. Even a clean instrumented result cannot satisfy the existing release acceptance. The original inner exit code and failed performance checks are retained.

## One continuous capture

One Chrome trace and one V8 CPU profile start before the original baseline mobile-night cold setup. They remain active across both original night arms and stop after the candidate’s following original RAF interval. There is no flush, profiler restart, retry, extra warmup, forced GC, additional draw, actor pause, cache reset or sleep between arms.

Requested trace categories are `devtools.timeline`, `cc`, `gpu`, `blink`, `v8`, `blink.console` and `disabled-by-default-v8.gc`. CPU sampling uses a 1,000 microsecond interval. Each arm must contain actual compositor, GPU, renderer-canvas and JavaScript evidence. Missing categories/events are a measurement limitation, not support for a CPU-only or GPU-only explanation.

Each original cold/warm evaluation receives only a trailing, non-fetching sourceURL comment:

`t622://mobile-night/{baseline|candidate}/{cold|warm}/{index}.js`

The original measured expression still executes once and returns the original duration. No marker evaluation or other browser task is inserted between the cold call and ten consecutive warm calls. CPU-profile node ancestry identifies samples belonging to each indexed evaluation. All 22 indexed evaluations must be observed in cold, warm 0–9 order before their arm’s RAF-start marker. Missing indexed samples fail completeness instead of guessing correspondence from a gap.

Separate browser timestamp evaluations mark only each arm’s start/end and RAF start/end. There are eight such markers. A passive, independent visibility/blur/resize latch covers each complete cold/warm/RAF arm, with native OS foreground and exact 390×844/DPR1 checks at its boundaries. It does not alter or re-arm the existing nine-window RAF latch. No host polling or activation occurs during an arm. Native OS activation is observed only at boundaries, so uninterrupted OS occlusion is not independently established.

## Bounds and cleanup

The unchanged macOS supervisor owns the one-attempt lock, isolated profile, compiler, process group and exact session display restoration. The existing 45-minute job, 38-minute inner run, 2-second termination, 60-second display restoration and 30-second evidence reserve remain unchanged. `T619_JOB_START_MS` must be set by the first workflow step. The complete 38m+2s+60s+30s reserve is required before inner launch; workflow reruns are prohibited.

Additional diagnostic bounds are:

- One 90-second trace/profile deadline, enforced by a one-shot cleanup watchdog
- 32 MiB Chrome trace buffer, using `recordUntilFull`
- 64 MiB downloaded trace and 16 MiB CPU-profile JSON
- At most 500,000 trace events and 120,000 CPU samples
- 30 seconds and 256 calls for stream reading, requesting at most 1 MiB per read
- 10 seconds per tracing/profiling operation or completion wait; 5 seconds for stream close and profiler disable

Tracing and profiling are stopped independently so one failure cannot skip the other. Stream close runs after success, data loss or read failure. Cleanup is also awaited from the original inner finally. Timeout, trace data loss, missing markers/profile samples, sourceURL mismatch, clock/ordering disagreement, qualification loss, unverified process cleanup or failed display restoration cannot produce complete diagnostic evidence. Partial raw capture is retained where available. Killing the whole job can prevent cleanup and must never be described as restored or complete.

## Evidence and interpretation

The ordinary inner and outer summaries remain, plus:

- `T622-mobile-night-trace.json`, or `.partial` after incomplete stream collection
- `T622-mobile-night-profile.json`
- `T622-mobile-night-correlation.json`
- `mobile-warm-trace622-supervisor.json`

`diagnosticTraceCompleted` describes this diagnostic alone. It requires successful trace collection/correlation, both full-arm controls, all nine original RAF qualifications, original core coverage and independently verified outer cleanup/restoration. An original warm-p95 failure can coexist with complete diagnostic evidence and retains failed status.

The correlation file retains original draw durations, indexed sampled leaf frames, observed CPU-sample spans and overlapping trace/GC records. First and last CPU samples cover only the observed portion of an evaluation; they are not its exact boundaries or CPU self time. Trace wall spans can overlap and must not be summed. GPU/compositor events may execute on other threads or processes; their presence alone does not prove GPU backpressure. No observed GC events does not prove there was no allocation pressure.

Profiling, tracing, source naming and boundary observations can perturb execution. The capture can guide a focused explanation or later proposal; it cannot prove the instrumented values reproduce the uninstrumented run, erase a failed original gate, establish active-gameplay improvement or authorize release.

## Local checks and authorized invocation

`node --test tools/pages/mobile-warm-trace622.test.cjs`

`node tools/pages/mobile-warm-trace622.cjs --check-overlay`

After independent review and the separately authorized one-shot workflow launch:

`node tools/pages/mobile-warm-trace622.cjs --out=evidence/mobile-warm-trace622`

The local focused tests simulate protocol responses and execute the emitted mobile loop. They validate exact source reversal, unmodified RAF guards, consecutive original evaluations, recovered focus/visibility loss, trace/profile/graphics omissions, bounded timeout/stream behavior, cleanup, original error preservation, release rejection and reuse of the unchanged outer resource contract. They are not evidence that native macOS Chrome has executed this capture.

Protocol field references: [Chrome DevTools browser protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json) and [JavaScript profiling protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/js_protocol.json).
