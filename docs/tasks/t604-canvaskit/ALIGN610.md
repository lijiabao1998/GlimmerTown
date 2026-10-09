# T610: one fresh, naturally aligned native pipeline trace

## Why this is a changed protocol

T609 had categories ready and a feasible55-second deep-night interval, but after
warm-up it entered that first night with only6.79 seconds left. Later polling
windows were not boundary-aligned. Its only statistically qualified triplet
ended with15.36 seconds remaining, below the unchanged23-second trace reserve.
Other eligible triplets failed median/p95 or minimum-frame criteria. This is a
combination of window scheduling and observed workload variability, not proof of
hardware instability and not a GPU/compositor finding. No trace was captured.

## One attempt, original game inputs

No clock/lighting/animation freeze or reset after initial fixture setup. No
product changes, no frame/advance/draw wrappers, no quality/LOD changes. Maintain
the same source hashes, seed22, camera, DPR and paused simulation with all native
visual updates. Daylight and all visual clocks progress naturally.

1. Warm at least30 seconds and150 natural frames, at most60 seconds total. If the
   minimum cannot be reached, stop as warm-up/readiness limit.
2. After warm-up, explicitly wait for the earliest NEXT naturally occurring
   transition from daylight (b>0.34) into deep night (b===0.34). If warm-up ends
   during night, do not use that partial night. Read only the small status object
   at250ms intervals. Maximum boundary wait150 seconds; exactly one boundary
   attempt, no retry on another night. The first observed night state must have
   at least53.5 of the55 natural night seconds left (<=1.5s alignment delay).
3. Collect at most six consecutive5-second qualification windows. Evaluate the
   last three after windows3/4/5/6, retaining every window. Require all original
   checks: foreground/focus/unchanged view and quality, native unwrapped drawing,
   deep night, >=30 frames/window, no >2s stalls, median within10% pooled median,
   p95 within15% pooledp95. Require>=23 natural night seconds remaining. Stop at
   the first qualified triplet, or after the sixth window/reserve exhaustion.
4. Only then run the unchanged5s baseline/5s trace/5s baseline sequence plus the
   existing1s post-stop settling interval. Query trace categories before warmup;
   require all predeclared categories. Retain explicit no-data-loss/EOF/64MiB
   maximum raw trace and complete event-family/metadata/flow availability gates.
5. Retain mean-frame-rate, median andp95 perturbation gates unchanged: <=5%
   traced rate loss/median/p95 growth, baseline rate/median within10%, baseline
   p95 within15%. A post-profile failure is a measurement limit, not regression.

The earliest boundary is also tracked by absolute visual time (110-second cycle,
82.5-second deep-night entry), so a missed cycle cannot be silently retried.
The exact sunrise reserve inspector returns zero rather than 110 seconds.
Warmup and alignment elapsed limits are checked after awaited observations.

Absolute measurement deadline is300 seconds from warm-up start, including
alignment/qualification/trace collection. A watchdog persists failure and stops
the browser at the deadline, including stalled CDP calls. One CI job has a10-minute outer timeout
including boot/setup/artifact preservation. No second boundary, second traced
sequence, gate relaxation, or unchanged rerun. Partial evidence is retained.

Even a trace satisfying event availability still needs manual causal frame-link
inspection. Do not add overlapping thread spans, waits or idle to CPU time; do
not infer FPS from samples. No renderer architecture implementation follows
without a concrete proposal grounded in the resulting evidence.
