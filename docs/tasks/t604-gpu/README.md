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

## Nearest-image coverage correction

Run 37691458047 isolated 24 largest separated day/night differences. Each was introduced by an unfiltered, non-smoothed, axis-aligned small sprite whose rectangle did not contain the tested pixel center. Native Canvas left the underlying pixel unchanged; the multisampled GL quad partially covered it and sampled its clamped edge texel. This is a coverage mismatch, not a changed source image or painter order.

The correction selects the integer raster support implied by the original pixel-center inclusion rule for that exact input state, compensating texture coordinates so included pixels continue sampling the original continuous source position. It retains the original destination and game coordinates. Smooth images, filtered images, and rotated/sheared images retain their original multisampled geometry. Global antialiasing remains enabled. Pixel comparisons and deliberate negative controls must verify the result; this correction is not a general image-difference exemption.

The first coverage correction (`fddd7dd`, run 37692161419) exposed another error: re-interpolating UVs on the adjusted quad could select an adjacent texel at an exact nearest-sampling boundary. Maximum differences rose to 192, so that implementation is not accepted. The next implementation passes the original device/source rectangles separately and evaluates the source texel directly at `gl_FragCoord` in the fragment shader. Its pixel check is independent of the original performance measurement; no performance gain is presumed for the modified shader.
