# T604: ordered GPU image-command prototype

This is an isolated component experiment based on PR #5 at `23564a810546e585758236553d1432c3aacb760b`. The product HTML and service worker remain byte-identical. Nothing in this directory is loaded by the published game.

## Hypothesis and measurable boundary

The existing native Mac dense night scene submits 46 reflections and 230 shadows through Canvas2D `brightness(0)` and takes about 96 ms per frame. The unchanged 55 FPS target needs 18.18 ms. Eliminating a few offscreen calls or using a subtly different raster cache did not establish an acceptable release. These negative results remain in the T603 evidence.

This prototype instead renders the original sprite alpha directly in a WebGL2 shader. A shadow and its following sprite may share one adjacent batch while retaining painter order and individual alpha/brightness values. There is no per-image Canvas filter layer in this path, and no final-filter-output cache. Native source images, source cropping, affine transforms, smoothing flags, opacity and supported blend modes are recorded from the real renderer. The geometry buffer is rebuilt and uploaded on every measured GPU frame.

The experiment captures three distinct, progressing source frames in each day/night scene. Each source canvas is copied once per recorded frame to prevent later dynamic canvas mutation from changing the comparison input. No game RNG, saves, model or art asset is edited. Recording and texture upload are outside timed playback. The bounded playback cycles those three frames; it is not live gameplay and does not claim to solve full-game FPS or dynamic texture-update cost.

Two explicit subsets are compared: filtered image commands, and all image commands. Vector paths, gradients, text, HUD and game updates are excluded and counted. Thus the all-image screenshot is a component view, not a proposed replacement game screenshot. A full renderer would still need an ordered implementation of those operations, dynamic texture revision handling, memory lifecycle, mobile compatibility and all original acceptance tests.

## Measurement and stopping rule

One native `macos-15` session verifies actual accelerated Canvas, graphics identity, the focused foreground window and 1400×900 at DPR 1. Each scope uses eight fixed three-second windows in A/B/B/A/A/B/B/A order, with warmup outside measurements. No trace, screenshot, pixel readback or texture upload occurs inside a measured window. CPU submission P95 and RAF intervals are reported separately. They are not GPU completion times.

A component benefit is called clear only with a median GPU/native FPS ratio at least 1.5 and at least three of four pair ratios at least 1.5. A saturated 60 Hz comparison may therefore be inconclusive; it is not a reason to rerun until green. Full compositor screenshots follow the timing windows. Both backends must repeat exactly; a deliberate three-pixel displacement must change output and restoring it must restore exact pixels. Cross-backend differences are measured in full RGBA and retained for review, never masked or called an old zero-difference pass.

An experiment can complete with no useful benefit or with visible differences. Neither outcome is release approval. PR #5 remains blocked by the original performance criteria. New visible rendering requires user image approval and complete original validation before any merge or deployment.

## Run

`node docs/tasks/t604-gpu/ordered-gpu.test.js`

`node docs/tasks/t604-gpu/run.js --check-overlay`

Actual browser measurement uses `.github/workflows/town604-gpu-prototype.yml` on the existing free native Mac runner. The assistant cloud's browser launch denial is respected; no alternate local browser launch is used.

The compositing reference is the [HTML Canvas drawing model](https://html.spec.whatwg.org/multipage/canvas.html#drawing-model). WebGL premultiplied alpha, texture unpack and presentation follow the [WebGL specification](https://registry.khronos.org/webgl/specs/latest/1.0/). Pixel equivalence remains an empirical question, especially at fractional sampling and antialiased edges.

## Bounded native-vector atlas feasibility

The per-batch transfer study at `3fadb35` found 340 day / 837 night visible vector groups. Hundreds of independent dirty Canvas-to-WebGL updates reduced the transport-only night workload to 2.47–3.61 FPS, even without GPU-to-Canvas readback. That architecture is rejected. Reducing each group to 1×1 pixels still yielded 2.30–3.57 FPS, so pixel area alone does not solve the crossing cost.

The atlas experiment first observes and records every native vector path and paint state. It rejects unobserved compositing, filters, patterns, clips, Path2D arguments and text before proceeding. It compiles the captured native commands for replay, preserving gradients and painter order. Every measured atlas frame rasterizes those commands into a native Canvas, copies their bounded groups into one or two atlases, uploads the dirty atlases, then renders all groups in their original order. Packing changes texture placement only. It does not reorder paint commands. The original 1900bfb sprite backend is retained; the rejected nearest-coverage experiments are excluded. Opaque-destination multiply is added explicitly and rejected for a transparent destination.

Predeclared cost screen: at most two 4096×4096 atlases (128 MiB), no unsupported observed semantics, all atlas timing windows at least 55 FPS, and median CPU work at most 8 ms per phase. Failing that screen stops complete integration of this bridge. Passing only permits a full live-game experiment; the image command stream, game simulation and HUD are still absent from this vector-only measurement. All RGBA differences, exact repeat/restoration checks and displaced-position controls are retained. There is no release approval or pixel-tolerance exemption.

## Direct raster attempt and backdrop proof

The copy-atlas run 37696275710 failed its cost screen: night native vector replay was about 59 FPS, while per-group Canvas snapshots/copies took roughly 588–596 ms. The atlas upload itself was only about 0.1–0.2 ms. The next bounded attempt therefore draws the native vector paths directly into translated atlas tiles and makes zero source-Canvas copies. It reconstructs each current path at its original matrices plus the tile translation, preserves paint matrices, clips to conservatively padded integer tile bounds, and retains the original gradient objects. The [HTML Canvas gradient rules](https://html.spec.whatwg.org/multipage/canvas.html#fill-and-stroke-styles) apply the current matrix when painting linear/radial gradients, so this translation moves both the path and gradient. Actual raster differences still require measurement.

Backdrop-dependent groups retain their original outer blend mode; they are never pasted with an unconditional source-over. For premultiplied color c and alpha a over an opaque background B:

- source-over gives c + (1−a)B;
- multiply gives (1−a+c)B;
- screen gives c + (1−c)B;
- lighter gives min(1,c+B), per channel.

For multiply, define F=1−a+c and T=1−a. Composing same-mode sources multiplies both F and T, so a transparent group's resulting F is exactly the required product. Applying that group with multiply retains its dependency on the real background. The analogous same-mode source-over/screen/add identities also compose. Changing blend mode or encountering an image always ends a group. The [W3C compositing equations](https://www.w3.org/TR/compositing-1/) establish these ideal-arithmetic relations; they do not prove RGBA8 raster equality.

The local algebra tests cover 4,000 deterministic same-mode groups with translucent sources and backgrounds. Before timing, the browser tests every mode using overlapping translucent solid/gradient sources over a colored checkerboard. That small two-layer control records RGBA differences and uses a predeclared three-level finite-rounding bound, exact repeats/restoration, and a deliberately wrong source-over composite of a multiply group. This is a component conformance check, not a change to any product pixel gate. Full scene differences remain unmasked and must be reviewed. The original 55 FPS / 8 ms cost screen remains unchanged.

## Three-stage pixel attribution (no performance sampling)

The next bounded diagnostic keeps the failed feasibility result unchanged. It captures one original day and one night vector stream, then compares four outputs from those exact commands:

1. R: native sequential vector drawing.
2. G: native homogeneous groups rasterized at original coordinates, then composed by Canvas with their original blend modes.
3. T: native groups rasterized in translated atlas tiles, then composed by Canvas.
4. W: those same unchanged T tile Canvas objects composed by WebGL.

R→G includes native group isolation and intermediate bitmap composition; it does not by itself prove a particular quantization mechanism. G→T measures changed native tile rasterization while keeping the compositor native. T→W changes only the assembler consuming the identical source Canvas objects. Per-pixel overlap/cancellation masks prevent treating the three changed-pixel counts as additive causes. Every pre-upload tile is also compared in straight RGBA and reconstructed 8-bit premultiplied values. The six largest tile disagreements receive a fresh native-origin probe before any bitmap copy, separating copying from coordinate/clip changes.

Every reference and native atlas is rerasterized independently for repeat controls. Wrong native/GL multiply and shifted-UV controls must change output, restoring GL must restore exact bytes, and actors/sky/dust/clocks must remain identical. Actual compositor PNGs must match the attributed framebuffer hashes. The diagnostic ends after these stage results for the fixed two inputs; unstable repeats invalidate attribution. It samples no FPS, changes no source/gameplay/artwork, starts no full integration, and does not relax any pixel or release criterion.
