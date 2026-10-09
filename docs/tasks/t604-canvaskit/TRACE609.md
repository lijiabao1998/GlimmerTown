# T609 single unmodified native frame-pipeline trace

No product/renderer/cache changes, no frame/advance/draw wrappers, no frozen
visual clocks, and no performance-optimization claim. Recover native approved
source by its verified exact hash. Maintain the current seed22/camera/quality,
paused simulation speed and naturally running night/traffic/water/headlights.

One Mac job only. First query Chrome's actual supported categories; require
`toplevel,devtools.timeline,blink,cc,viz,gpu,benchmark`. Missing categories stop
as a measurement limit. Warm at least30 seconds/150 natural frames; require
three successive5-second deep-night foreground windows within10% pooled median
and15% pooledp95, at least30 frames each, unchanged viewport/quality/model and no
multi-second stalls. Entire qualification/wait is bounded at4 minutes. Never
reset the clock to obtain a pass. Require>=23 seconds natural night remaining.

Collect baseline5s / traced5s / baseline5s, with a1-second post-stop settling gap.
Use ReturnAsStream, wait for trace completion, then read bytes only after the
second baseline. Limit raw trace to64MiB. Require explicit no-data-loss, EOF,
valid JSON, metadata and complete duration events. Retain the raw gzip and its
uncompressed SHA256 before making the evidence decision.

Perturbation acceptance includes the original median5% screen PLUS traced
actual frame-rate loss<=5% and p95 growth<=5%. The two baselines must agree
within10% frame rate/median and15%p95. This closes T606's observed median-only
qualification weakness. No discarded slow samples or unchanged rerun.

Event availability requires renderer, compositor, raster and GPU event families,
process/thread metadata, valid duration events and at least10 matched flow
start/end pairs. Missing/unsupported/ambiguous evidence stops classification as
a specific measurement limit; it is not evidence of a product regression or a
GPU bottleneck. Event-family/flow availability alone does NOT prove a complete
per-frame critical path: inspect actual frame/flow identities before attributing
causality. Preserve idle, wait and unattributed spans.

Per-thread complete-event wall spans are unioned to avoid nested double counts.
Do not sum overlapping threads, waits, or these spans into CPU time or FPS. The
purpose is to decide whether a material retained-scene/rendering architecture
proposal is warranted, or whether this environment lacks the evidence to make
that decision. No architecture implementation starts from this diagnostic.
