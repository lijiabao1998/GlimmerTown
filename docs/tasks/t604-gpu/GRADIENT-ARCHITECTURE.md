# Direct ordered gradient primitive: bounded architecture proof

The existing image-command GPU component has a measured night-time benefit,
but joining it to native Canvas vector groups introduced two distinct errors:
translated native raster pixels and intermediate group composition. Keeping the
opaque pre-image prefix at its original coordinates fixes that prefix exactly,
while leaving 592,722 changed night-vector pixels. That is still a no-go.

The next architecture would put image commands and vector paint commands into
one ordered GPU stream. Each primitive must blend directly into the current
framebuffer in its original order, rather than flattening transparent groups.
Gradient evaluation and dithering must use original device coordinates.
The proved opaque native prefix can remain a single 1:1 uploaded texture.
All other required paths/strokes/gradients must have explicit supported
semantics; hundreds of Canvas/GPU fallback transitions were already rejected.

## Why this proof is different

The exact browser implementation is available at Chromium `152.0.7977.83` and
Skia `0873ec164a06966b90ae0d43ef783cfb180084ae`, matching the qualified runner.

- [CanvasGradient chooses unpremultiplied stop interpolation](https://github.com/chromium/chromium/blob/152.0.7977.83/third_party/blink/renderer/modules/canvas/canvas2d/canvas_gradient.cc).
- [Legacy rgba() alpha is rounded to a byte before gradient interpolation](https://github.com/chromium/chromium/blob/152.0.7977.83/third_party/blink/renderer/core/css/parser/css_parser_fast_paths.cc). The initial c8fb31e prototype omitted this input conversion; its results are retained and superseded by the corrected input proof.
- [Blink enables dithering for gradient paints](https://github.com/chromium/chromium/blob/152.0.7977.83/third_party/blink/renderer/platform/graphics/gradient.cc).
- [Skia's 8×8 dither table and 8-bit amplitude](https://github.com/google/skia/blob/0873ec164a06966b90ae0d43ef783cfb180084ae/src/gpu/DitherUtils.cpp).
- [Graphite samples that table at device fragment coordinates and uses half color stages](https://github.com/google/skia/blob/0873ec164a06966b90ae0d43ef783cfb180084ae/src/sksl/sksl_graphite_frag.sksl).
- [Radial gradients use a float normalization matrix](https://github.com/google/skia/blob/0873ec164a06966b90ae0d43ef783cfb180084ae/src/shaders/gradients/SkRadialGradient.cpp).

Moving native raster into atlas coordinates changes the dither phase. This is
a concrete mechanism worth testing; it does not establish that dithering is
the sole cause of all prior differences. No arbitrary epsilon is fitted.
The small direct shader implements source-derived dithering and explicit
half-rounding stages. Plain float with/without dithering are fixed diagnostic
controls, not runtime quality settings. Skia attribution/license is retained.

## One decisive experiment

Capture one unchanged original seed22 night frame. Record actual gradient
creation parameters, color stops, current paint alpha/blend and path metadata.
Select up to 12 deterministic visible concentric radial fields, including
eligible exact original full-circle paints. Unsupported transforms, path
shapes and color syntax are counted and excluded explicitly.

1. Compare each original-coordinate gradient field to native Canvas. This
   deliberately separates gradient color semantics from path coverage.
2. Compare eligible exact original circle paints separately, including every
   edge pixel. The analytic circle coverage implementation is provisional and
   is not assumed to match native curve rasterization.
3. Replay the selected fields in original order, with an opaque sentinel
   between them to detect forbidden reordering. A wrong radius must also fail.
4. Require exact reference/replay/restoration and actual compositor agreement.
   Native references use a fresh Canvas and one read per context, so repeated
   readback cannot silently change the native backend.

There are exactly three predeclared shader variants and zero FPS samples.
All full-image differences are recorded. `exactGo` requires zero differences
for all selected fields, eligible circles and their ordered sequence; it does
not authorize integration, merge or release. The original 55 FPS and pixel
requirements remain. Sprite sampling, other paths/strokes, HUD and simulation
are outside this proof.

## Cost and next decision

The direct primitive needs no dynamic source textures or Canvas uploads. This
proof uses per-paint uniforms and one GPU draw per gradient, so it cannot claim
the batching or whole-frame cost of a completed renderer. A production path
would need packed primitive records plus explicit painter-order boundaries.

If even the gradient field is not exact with the inspected native semantics,
report its errors and do not start a larger backend or tune constants. If only
circle coverage differs, a native-compatible coverage implementation remains
a separate correctness prerequisite. Allowing a newly reviewed rendering
appearance is a user tradeoff; this experiment does not make that decision.
