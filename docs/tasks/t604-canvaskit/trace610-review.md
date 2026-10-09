# T610 independent native trace review

Scope: read-only examination of the completed T610 artifact and exact native source. No rerun, gate change, product edit, renderer substitution, or release inference. Reviewed 2026-10-09 UTC.

## Decision and limits

T610's acceptance **failed**: `native610.profileAccepted=false`, `profileScreen.accepted=false`; baseline p95 ratio `1.1560693641618498` exceeds the unchanged `1.15` screen. Qualification and event availability passed, and `dataLossOccurred=false`. The summary's top-level `status: passed` is not profile acceptance or a release gate. This review is limited to conditional hypotheses and reconstructable examples. It does not establish a general bottleneck share, product regression, optimization benefit, target-device performance, or a path to 55 FPS.

There is direct evidence of a downstream queued swap pipeline in the inspected sequence, including `pending_swaps=2,max_pending_swaps=2`, receive-to-aggregation flows, GPU post-submit waits, and subsequent swap ACKs. Thus, attributing the entire frame interval to JavaScript/native draw submission would be wrong. Conversely, native `frame()` callbacks and GPU-process raster processing both take visible wall time, and the trace does not support saying that all delay is a compositor wait or actual GPU execution. The next useful branch is a tightly controlled opaque-main-canvas hypothesis, with no claim that it will be material until tested.

## Evidence identity

- CI source commit: `0aa9d23ba196431bdcbea4d8fd90bd20f98248c8` (`ci-37890901630/source-commit.txt`).
- Raw trace: `ci-37890901630/native/T610-native-trace.json.gz`; 324,984 events.
- SHA256 of decompressed trace bytes: `5eda82073539e59016fc4ce4a411cb80936f22c253fd1dac9230bab84bee9d3f`, matching the summary. Gzip SHA256: `30e81ed1761abf3c0c09b39132f224e8e575bf819a8912a03dd5603234b9960c`.
- All event indices below are zero-based positions in `traceEvents`; timestamps and raw durations use microseconds. Thread identities: renderer main `13849:44577`, renderer compositor `13849:44589`, Viz compositor `13821:44249`, GPU process main `13821:44190`.
- Source reconstructed locally with `docs/tasks/t604-canvaskit/source-contract.cjs::invertIndex(index.html)`; resulting native SHA256 is exactly `99bea3bd0f9ec38b69f567971f8ba634b4d5211f700f151e6c77543e88a87f1d`, matching `source-contract.json` and `native610.runtimeSHA256`. No runtime measurement was run. Line numbers below refer to that reconstructed native source, not the candidate file with renderer hooks.
- Native `frame(ts)` is line 24930; it calls unchanged `advance(dt)` then `draw(Math.min(.05,dt))`. The trace identifies script `5`, URL `http://127.0.0.1:8766/native604.html`, `functionName: frame`, line 24930, column 15. Frame identity is `9E0461ACADD35A3D8C500DECADF16DB7`.

## One complete frame and its overlapping pipeline

Begin-frame sequence `8962`, source `4294967296`, main-frame ID `3645665578540108043`:

| Evidence | Interval / timestamp | Interpretation |
|---|---:|---|
| SendBeginMainFrame, event 205 | 927530043 | Explicit sequence/main-frame ID |
| ProxyMain::BeginMainFrame, event 220 | 927530163–927559090 | Main-frame enclosing wall span |
| FunctionCall(frame), event 335 | 927531319–927552764 | 21.445 ms wall; reported thread duration 17.703 ms, not draw-only time |
| Commit-on-main, event 3837 | 927559061 | Same main-frame ID |
| Commit-on-impl, event 3847 | 927559101–927559642 | Same main-frame ID |
| Full-frame PipelineReporter, event 317924, local ID 0x2 | 927527132–927783330 | `STATE_PRESENTED_ALL`; frame sequence8962; final display ID `5814346609865477744` |

The associated reporter's stage pairs are:

- SendBeginMainFrameToCommit: 927530036–927559100.
- EndCommitToActivation: 927559644–927560987; Activation: 927560987–927561058.
- EndActivateToSubmitCompositorFrame: 927561058–927587215. This is an asynchronous stage, not compositor CPU work.
- SubmitToReceiveCompositorFrame: 927587215–927587448.
- ReceiveCompositorFrameToStartDraw: 927587448–927645589.
- StartDrawToSwapStart: 927645589–927764087. This is pipeline latency containing queued and waited work; it is not a 118.498 ms draw call.
- SwapEndToPresentationCompositorFrame: 927764381–927783330. This is presentation latency, not CPU execution.

Important identity distinction: sequence8962 also has a `STATE_PRESENTED_PARTIAL` fork (event317925) associated with earlier display `5814346609865477705`. Its initially submitted surface `5814346609865477703` predates completion of `frame()` and must not be called the new canvas frame. The reporter identifies the later full presentation in display `...7744`; its aggregation event7916 lists surface `5814346609865477711`, which is submitted during the following compositor begin frame. This distinction prevents false attribution based on nearest timestamps alone.

Explicit full-presentation flow links:

| Flow ID / event indices | Endpoint timestamps | Exact meaning |
|---|---:|---|
| 53 / 308357–308358 | 927587215 → 927587447 | Renderer submit → Viz receive of surface `...7711` |
| 92 / 308435–308436 | 927587447 → 927645506 | Viz receive → aggregation into display `...7744`; 58.059 ms elapsed |
| 93 / 308437–308438 | 927645506 → 927645610 | Aggregation → send buffer swap for that display |
| 188 / 308627–308628 | 927645610 → 927731156 | Viz send buffer swap → GPU post-submit for display `...7744`; 85.546 ms queued/pipeline elapsed |
| 190 / 308631–308632 | 927731156 → 927764379 | GPU post-submit → finish buffer swap |
| 191 / 308633–308634 | 927764379 → 927764418 | GPU finish → Viz swap ACK |

Within the GPU post-submit span, event19147 is `IOSurfaceImageBacking::WaitForCommandsToBeScheduled::Dawn`: 927731165–927764042, wall duration32.877 ms, reported thread duration0.025 ms. The containing `SkiaOutputSurfaceImplOnGpu::SwapBuffers` event19142 is33.162 ms wall, reported thread duration0.297 ms. These nested spans are the same wait-containing interval; they must not be added together.

While this display is queued, GPU main has other visible work: `Scheduler::RunTask` event8057 is24.231 ms wall /23.451 ms reported thread duration, enclosing raster IDs5 and6 and their flushes; event13214 is a separate prior-display Dawn wait34.508 ms wall /0.026 ms reported thread duration; event15508 is another23.758 ms wall /23.249 ms reported thread duration, enclosing raster IDs7 and8. These are overlapping producer/consumer pipeline stages across frames, not CPU costs to add to the renderer callback. No trace-to-source mapping identifies which individual shadow/reflection/sprite draw produced those raster IDs.

## Backpressure evidence and what it does not prove

In the earlier part of the same sequence:

1. Event1762 at927543886 explicitly records `Swap throttled`, `pending_swaps:2`, `max_pending_swaps:2` on Viz compositor.
2. Prior display `5814346609865477717` enters GPU post-submit at927554456 (event3783), then waits in Dawn at927554473–927585818 (event3786;31.345 ms wall,0.054 ms reported thread duration).
3. Flows39 and40 connect that post-submit event to finish-swap at927586232 and ACK at927586379. Viz then issues the next begin frame at927586403 and starts the next draw/aggregation at927586480/927586484.
4. Flow42 links the earlier surface receive at927530858 to aggregation at927586484. Renderer `frame()` ended at927552764, before this unblock sequence.

Together, named throttle state and matching flow IDs support a conditional queued-swap/backpressure explanation for these particular intervals. They do not prove that a GPU core is saturated, that the macOS host driver alone is responsible, or that application rendering is cheap. The wait name describes waiting for commands to be scheduled, not necessarily waiting for execution completion. There are no hardware execution counters here.

The event named `CALayerTreeCoordinator::ApplyBackpressure::Metal` itself must not be confused with the large Dawn wait: its longest recorded complete span is only41 microseconds (event202719). The useful evidence is the queue state and linked pipeline timing, not a name-based sum of all "backpressure" events.

## Further attribution cautions

- `frame()` includes advance, draw, occasional HUD, and engine work. It is not a source-level draw-only sample. Example event222362 for sequence9175 is31.147 ms wall /27.770 ms reported thread duration. That observed callback would still require attention even if downstream presentation latency disappeared; no frame-rate prediction follows from either example.
- The raw trace has thread-clock anomalies. Three frame callbacks report `tdur` greater than wall `dur` by much more than rounding: event129801 (32,790 vs51,767µs), event160470 (25,648 vs43,400µs), event250529 (27,262 vs41,115µs). There are485 complete events with `tdur > dur + 2µs`, including nested events. Thus thread-duration aggregates are not validated CPU accounting. The valid-looking examples above are quoted raw and must not be generalized into utilization percentages.
- Numerous `Canvas2DResourceProvider::Snapshot` events are nested around canvas-source use. Count alone does not establish expensive copies, uploads, or source mutation. They do not map to app sprites here. Do not nominate an ImageBitmap rewrite solely from their frequency.
- Absence of renderer events is uninstrumented/idle time on that lane, not a measured GPU cost. `SwapEndToPresentation`, raster work, source submission, asynchronous queue wait, and scheduler idle must remain distinct.

## One bounded next test: opaque main context

Nominate a one-factor candidate at exact native source line2196:

`const cvs=$('#game'), ctx=cvs.getContext('2d',{alpha:false});`

Only the main visible canvas context creation would change. The offscreen sprite helper at2241–2242 and all other offscreen canvases must retain alpha; their transparency and native filtered shadows/reflections are essential. Preserve native draw order, every command, image smoothing, dimensions/DPR, quality, animation, model, and all existing gates. Do not use `desynchronized`, which changes presentation semantics, and do not disable effects or reduce detail.

Code rationale: `draw()` starts at18296 with a full visible-canvas RGB sky fill at18301–18303 before translucent effects. This makes an opaque backing surface a plausible exact-output hypothesis. The context already performs full-scene compositing, so declaring the final surface opaque might change downstream surface handling or blending. **The trace does not show that alpha blending causes the Dawn waits, and material benefit is not established.** This is a testable implementation hypothesis, not a diagnosed fix.

Semantic proof is a prerequisite, not an assumption: confirm every user-visible frame starts with identity/expected DPR transform, no residual clip, alpha1/source-over, and a fill covering the backing surface. Check initialization before first game draw, resize, load, pause/resume, day/night, weather, camera/zoom/rotation, and overlays. An opaque context starts with opaque pixels, so startup/resize can differ before the sky fill; that must be covered. Require the unchanged exact image comparison gates on canonical matched frames and the user's per-round image review. If exact pixels or startup behavior differ, reject the candidate rather than relaxing tolerances.

The performance question for the eventual fresh candidate protocol is specifically whether opaque-main-context changes the linked receive→aggregate, send-swap→post-submit, Dawn-wait, and ACK chain while native callback behavior and complete image output remain comparable. Check actual context attributes. Keep `dur` and screened `tdur` separate, identify complete frames by reporter/main-frame/surface/display IDs, and report queue time rather than summing nested or cross-thread spans. Require the existing warmup/stability/interference acceptance screens before any optimization conclusion; if they fail again, stop with a measurement limit. This proposal does not authorize an unchanged T610 rerun and does not claim55 FPS or release readiness.
