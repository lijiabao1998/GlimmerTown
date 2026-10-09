# One warm-qualified native CPU measurement (not launched)

Goal: locate whether original native frame work lies in game advance, draw,
Canvas native work, or GC without the five timing wrappers that failed T605's
qualification. This is a new measurement method, not a retry to make a failed
performance gate green. No cache or WASM implementation.

Source: invert the verified renderer-only hooks to approved art candidate
23564a810546e585758236553d1432c3aacb760b runtime SHA256
99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d.
Original frame, advance, draw and night helpers must remain unwrapped. Use only a
minimal read-only inspector and a separate lightweight rAF timestamp collector;
do not reuse the bridge that overrides advance/draw/frozenVis. Source assertions
prove no gameplay calls, clock writes, RNG calls or cache changes were inserted.

Use the existing qualified headed Mac/Chrome and seed-22 canonical city at the
same camera, DPR, season, quality and approved visuals. Pause simulation speed as
in the accepted workload, retain the actual running frame loop and all original
visual updates. Headlights, traffic, smoke, wind, water, day/night cycle and other
animations continue naturally. No frozen visT or synthetic forceDraw timing.
Record foreground/focus, GPU/renderer, Chrome build, viewport and source hashes.

Warm-up: at least 30 seconds and 150 natural frames. Continue uninstrumented until
three successive five-second windows qualify: same visibility/viewport/quality,
constant deep-night daylight level b=0.34 (CYCLE=110 stays original), at least 30
frames per window, median rAF interval within 10% of the three-window pooled
median, p95 within 15%, no multi-second stalls. This is a workload/measurement
stability screen, not a substitute 55 FPS pass. Wait for the next natural night
if a night interval is too short; never reset or freeze its clock. Bound the
entire warm-up plus qualification/wait at four minutes. If it never qualifies,
stop and report a measurement-environment/workload stability limit.

After qualification, require enough of that naturally progressing night remains
for one baseline/profile/baseline sequence, five seconds each. If not, wait for
the next night and recheck three qualifying windows within the same total bound.
Collect unwrapped baseline frame distributions; start Chrome CDP CPU Profiler at
1 ms sampling only for the middle window; stop and retain its raw cpuprofile,
including unattributed/native/GC/idle samples, then collect the second baseline.
No Canvas pixel readback, screenshots, tracing with broad categories or large
state serialization inside these windows.

Qualification after measurement: the two baseline medians must agree within 10%
and p95 within 15%, and profiled median interval may exceed pooled baseline by at
most 5%. Verify foreground, deep-night b, viewport, quality and canonical model
invariants still hold. If any screen fails, preserve evidence and stop; do not
attribute the discrepancy to product regression, enlarge tolerances, repeatedly
rerun, or derive phase milliseconds from the rejected profile. Report that this
runner/window could not support reliable cost attribution.

Accepted output: baseline frame distributions plus a sampled CPU call-tree with
inclusive and self shares for original advance/draw and their actual callees.
Keep sampled shares distinct from wall-clock cost and native raster/compositor
work. Do not convert component timings to FPS. Only nominate one independently
cacheable or structurally reducible hot region if the measured evidence and
its real input dependencies justify it. A further exactness/invalidation proof
would still be required before changing the product, and all original >=55 FPS,
relative, full regression and visual-approval gates remain.

Stopping condition: one qualified profile sequence, or first failed post-profile
screen, or the four-minute qualification bound; one job with a ten-minute safety
timeout. No automatic unchanged rerun. Return findings before implementing any
cache or starting another measurement.
