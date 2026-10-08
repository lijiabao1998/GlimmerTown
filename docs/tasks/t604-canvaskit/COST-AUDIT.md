# Bounded recorder and Paint call cost audit

The a26fcea whole-night experiment completed its 102 diagnostic checks, including offline Continue, save/load, real WebGL surface and input/state controls. It did not satisfy the product goals: native samples were 7.09/9.16 FPS and GPU samples 9.17/9.40 FPS, below 55 and below the predeclared consistent-benefit criterion. Its complete night imagery was accepted on 2026-10-08; the old pixel result (75,544 changed pixels, max77) remains explicit.

This audit changes diagnostic files only. CI verifies that index.html, sw.js and every production renderer file are identical to a26fcea. It does not sample live FPS or expand integration.

The reason for this test is the previous separate 13-frame CPU observation: median producer 58.7ms, replay73.2ms; replay includes validation14.0ms, preparation11.5ms, draw32.4ms and flush8.9ms. Upload0.9ms is inside preparation. Optimizing upload alone cannot plausibly bridge the remaining budget.

Two temporary adapters are tested independently and together:

- Reuse canonical native state reads until the corresponding setter, save/restore, reset or dimension transition invalidates them.
- Skip exact redundant CanvasKit Paint setters within one Paint lifetime. Mutable/opaque resources keep native delegation.

One original frozen night input is used to separate JavaScript/API cost from world evolution. This is an explicit CPU microbenchmark, not game FPS or a cached final-frame implementation. Order is baseline/baseline/state-cache/paint-dedup/both/both/paint-dedup/state-cache/baseline, with two warm and three measured original draw calls per window. All parameter generation and replay costs remain in the measured row.

A second baseline proves input repeatability before any adapter is installed. A mismatch retains the first40 exact field differences and an adapter-free restoration control; it never turns into an accepted timing comparison.

Run37791948395 identified baseline drift in the seven T248 rainbow alphas: the original draw decrements rainbowT by0.016 even with stopped updates. These paints are subsequently covered by the opaque T256 ocean, explaining the unchanged screenshot. This fixed-frame diagnostic now captures/resets that original rainbow time along with its other explicit clocks and restores all captured values afterward. It still executes every original rainbow command and decay operation. No dynamic product code, live FPS test, image masking or pixel criterion changes.

Every window must preserve the full paint/geometry/gradient parameter digest, SHA256 of every source image's pixels, actual GPU surface, model/RNG state and entire compositor PNG. Only resource bookkeeping ids and revision counters are excluded from the parameter digest; their actual pixels and all rendering parameters remain included. The visible wrong-ocean negative control must change pixels and restore exactly. Native recorder microcases run again with the state adapter. All hooks restore before leaving the diagnostic.

The output reports delegated/skipped calls, separate CPU timings, remaining CPU versus the unchanged18.18ms frame budget, and the previous original-backend pixel difference. A reduction here is not evidence that 55FPS or release acceptance passed. If the remaining cost remains far above budget, explain that evidence before a larger renderer redesign.
