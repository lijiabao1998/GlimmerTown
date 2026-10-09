# T611 opaque main-canvas feasibility

T610 was not accepted (baseline p95 ratio1.156069 >1.15). Its explicit frame/flow
links nevertheless nominate queued presentation as a conditional hypothesis.
This is not proof that alpha blending caused the waits, or a predicted speedup.

Change only the disposable main canvas's alpha setting. Retain synchronized
presentation, native draw commands/order/filters/smoothing, quality, all offscreen
alpha masks, model, actors, RNG and canonical save. Product files remain unchanged.
No performance test is included: readback can change canvas backing behavior.

The disposable test changes cvs/ctx declarations to mutable bindings, swaps an
otherwise identical DOM canvas, then calls original draw(0) on matched visual
clock snapshots. Source hashes are verified before this test-only injection.
This swap does not copy event listeners and cannot prove interactions, startup,
or real candidate performance. Any future live comparison must initialize a
fresh page with the actual context option and original listeners.

Ten full-city states cover night/day/dusk/dawn, fractional zoom, four rotations,
and a resize/recovery. For each compare original / opaque / restored raw RGBA,
require original output wholly opaque, zero channel difference, model/actor/RNG
invariants, then restore the exact original context/canvas and canonical save.
Any failed pixel state stops further candidate stages. Green CI can record NO-GO.

After completed-frame checks, test resize-before-redraw with the native draw
loop paused. Compare browser-composited original / opaque / restored pixels in
an unobscured central64x64 patch (five hit-test points verify the main canvas).
This avoids unrelated HUD/toast animation. Original transparent backing shows
body color#0d1226; opaque backing initially black may differ. Such a difference
is a strict lifecycle rejection, not an acceptable threshold exception. Even a
pass would be partial feasibility; startup/load/interaction and complete quality
regressions remain required before adoption.

One bounded CI, six-minute job limit, no timing or55FPS/release claim. Preserve
all negative evidence, and do not repeat an unchanged rejected candidate.
