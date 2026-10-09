# Bounded structural cost and exact-reuse observation

This is diagnostic only. No cache, engine, art, quality, save, RNG, ordering,
renderer or original 55 FPS threshold is changed. The prior direct producer
experiment is preserved in DIRECT-RESULT-e27bccb1.json and is NO-GO: its producer
alone took median 30.1 ms (26.7–49.5), versus baseline 29.2 ms. Do not build a
consumer around it. The prior 3406-pixel failure and exact corrective rerun are
both retained.

Run `node docs/tasks/t604-canvaskit/run605.cjs --check-overlay` to validate the
composed harness, `node docs/tasks/t604-canvaskit/structural605.test.cjs` for the
new contracts, and run605.cjs on the qualified Mac for measurement. It first runs
the unchanged direct proof, then separately boots GPU and original native paths.
Native original drawing and Recorder producer timings are not interchangeable.

For each backend, timing/off/off/timing windows contain two warm and five measured
complete draws. Exact same-backend compositor screenshots compare installed and
uninstalled wrappers. All original functions execute once; source uploads retain
product order. Timing has five non-nested boundaries: lotNightLayer574,
lotObjectOrder574, lotFarFrame574, drawNightCity413 and drawNightCityTop413. The
full N×N root scan is not separately isolated; do not attribute residual time to
it. Instrumentation above 5% full-draw median overhead invalidates quantitative
cost acceptance. This is a research screen, not release acceptance.

Only after timing finishes, twelve original `advance(.05)` calls generate twelve
successive animation inputs. They are fixed-step animated observations, not live
wall-clock FPS or natural cache-hit-rate measurements. Model and actors are
checked across each draw; animation advance is outside those assertions and
outside the draw timer. Night descriptor/source validation happens after upload
and outside accepted timing. Pixel reads may alter Canvas backing, as the prior
readback probe demonstrated; these observer frames are not timing evidence.

The exact fingerprint includes ordered descriptor keys and values, Float64 bits,
alpha, dimensions, source identity and complete source pixels. Tests include
changed source bytes, source identities, painter order, opacity, geometry,
viewport dimensions, undefined/null, negative zero and prefix invalidation.
A real cache is not implemented. Whole-list exact hits and common prefixes are
only opportunities. Any future cache must additionally test full game lifecycle
invalidation: pan/rotation/fractional zoom/DPR/resize, construction/demolition/undo,
load/new world, day/weather changes and source regeneration. This first cost pass
does not claim that entire matrix has been run.

Stop/go: any correctness difference rejects a design. Before any actual cache
proof, even a generous zero-cost-removal bound must leave a comparable producer
under 18.18 ms; stable approximately 8 ms is still the screen for considering a
larger consumer. A phase that is too small or an exact list with rare animated
hits rejects that cache direction. Offscreen `screen` plus `destination-out`
operations cannot be flattened/reordered into static-first/dynamic-last layers.
No FPS is inferred from components, no new release is permitted by this audit,
and all original full regression, native frame, relative performance and image
approval requirements remain.
