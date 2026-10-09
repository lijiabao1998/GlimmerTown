# T623: two bounded mobile-night burst captures

This is one diagnostic invocation with two planned captures. It does not replace the failed original native run or authorize release. Product, release-policy and T622 files stay unchanged.

T622 exceeded its 64 MiB trace limit. In its retained prefix, approximately 82% of Snapshot events fell in the following RAF intervals: baseline cold/warm 25,970 versus RAF 135,111; candidate cold/warm 27,559 versus RAF 131,265. This supports narrowing prospective capture volume only. It does not identify a CPU/GPU bottleneck.

## Exact scope

The adapter composes `native-portability-diagnostic.build()` only when its emitted source hashes to `c2179077b65844eee81074cc2cf833c6a8f2ac7b6c21b54ddef9bedffbade93b`. Six exact host edits must reverse byte-for-byte to that base. The manifest records adapter/emitted hashes and every edit.

For baseline, then candidate, during the original mobile-night phase:

1. Qualify native foreground and the original 390×844 viewport at DPR1. Start that arm’s profiler/trace and passive visibility/blur/resize latch.
2. Execute the original cold setup/draw, ten consecutive warm evaluations and post-warm cacheStats read, in their original order. Trailing `t623://mobile-night/{arm}/{cold|warm}/{index}.js` comments identify the existing evaluations. There are no extra browser tasks inside either burst.
3. Mark the warm boundary, stop both recording facilities, download and close that trace stream. This is trace-stream collection, not an added GPU-work drain, completion fence or draw.
4. Execute the following original RAF and remaining cache read. The full-arm passive latch remains active through collection and RAF; qualify it at the final boundary.

Both captures require their own complete JSON, exact markers, eleven indexed evaluation sample groups, valid profile/trace clocks and ordered cold/warm ancestry. Early, duplicate, reused-stream or cross-arm completion/evidence fails. GC category capability is checked once; zero observed GC events is allowed. Actual renderer-canvas, compositor, GPU and JavaScript evidence is required for each capture.

All original scene preparation, earlier readbacks, source/model/RNG/save controls, draw expressions/counts, thresholds and final fatal verdict remain. Desktop timing and the complete original RAF helper with nine qualifications remain byte-identical. The mobile host timing span is explicitly instrumented. No retry, extra warmup, forced GC, cache reset, actor pause or recovery activation is added.

## Shared bounds and cleanup

One 90-second wall deadline begins before baseline instrumentation setup. It continues through baseline collection, baseline RAF and candidate collection; it is never reset. The candidate’s original RAF follows collection and remains governed by its original guard.

Across both captures combined, limits are 64 MiB downloaded trace, 16 MiB profile JSON, 256 issued stream reads, 30 seconds of cumulative stream-read elapsed time, 500,000 trace events and 120,000 CPU samples. Each Chrome buffer is bounded to 32 MiB with `recordUntilFull`; reads request at most 1 MiB and never more than the remaining byte allowance. Profiling uses a 1,000 microsecond sampling interval. Trace categories are `devtools.timeline`, `cc`, `gpu`, `blink`, `v8`, `blink.console` and `disabled-by-default-v8.gc`.

Protocol operations have 10-second bounds; stream close and profiler disable have 5-second bounds. A one-shot watchdog stops active instrumentation. Both facilities are stopped independently after failure, and trace handles close even when evidence writing fails. Cleanup is awaited again from the original finally without restarting a capture.

The unchanged macOS supervisor retains the one-attempt lock, isolated profile, 45-minute job, 38-minute inner limit, 2-second termination, 60-second display-restoration reserve and 30-second evidence reserve. `T619_JOB_START_MS` comes from the first workflow step. Unverified child cleanup, display restoration, resource bounds or evidence cannot produce complete diagnostic status.

## Outputs and limits of interpretation

Each arm writes `T623-mobile-night-{arm}-trace.json` (or `.partial`), `-profile.json` and `-correlation.json`. The usual inner/outer summaries remain; `mobile-warm-trace623-supervisor.json` adds `diagnosticTraceCompleted` and cumulative accounting. `collectionCompleted`, `releaseGatePassed` and `releaseEligible` always remain false. Original failures and exit status remain fatal.

Baseline collection can change later candidate state and scheduling. Complete trace JSON is not proof of full GPU completion. Asynchronous work crossing capture boundaries remains unattributed, rather than zero cost. Indexed CPU samples cover sampled execution only, not exact evaluation boundaries or draw self time. Overlapping trace durations must not be summed. Missing graphics evidence cannot support a CPU-only cause, and zero GC does not establish absence of allocation pressure. The original failed main run remains failed.

Local checks:

`node --test tools/pages/mobile-warm-trace623.test.cjs`

`node tools/pages/mobile-warm-trace623.cjs --check-overlay`

After independent review, the separately authorized workflow may invoke once:

`node tools/pages/mobile-warm-trace623.cjs --out=evidence/mobile-warm-trace623`

Unit tests execute the emitted loop with synthetic protocol responses; they are not evidence of native macOS execution. No release-acceptance/deployment supervisor is invoked.
