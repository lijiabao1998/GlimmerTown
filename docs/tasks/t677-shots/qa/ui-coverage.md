# T677 formal player UI coverage

Entry: `ui.cjs` exports `run({browser,baseURL,out,identity})`. The parent acceptance command supplies a fresh sandbox-enabled Chromium browser and QA-only served product page. This module creates one fresh context per viewport, sets native save slot3 before navigation, and retains normal product storage/service-worker behavior. It writes `result.json` incrementally and fails on the first unmet behavioral oracle.

## Matrix

- Desktop1440×1000,DPR1: real mouse, native selector keyboard, wheel.
- Touch412×915,DPR1;390×844,DPR1;360×800,DPR2: real trusted touchscreen taps and CDP touch sequences, native selector focus plus trusted keyboard.
- All viewports: collapsed defaultOFF; readonly discover/check; ordinal port selection; second genuine under-construction port refusal; explicit enable/disable/re-enable; same30-ID cargo/counts; batch/save notice; reset cancellation and confirmation.
- Native road/doze/pan selected through actual toolbar controls before panel check and escaping panel drags; exact native world/economy/cargo/camera/selection/capture invariants.
- Mouse wheel containment on all; three touch viewports must exhibit numeric internal scrollTop displacement in the intended direction.
- Canvas-start drag crossing the panel retains native capture, pans camera, never changes city/cargo, releases all input state.
- After collapse: actual native building click, pan, zoom button; desktop wheel zoom; mobile two-contact outward pinch and touchcancel. Pinch requires actual zoom delta, all original native/cargo state unchanged and pointers/capture cleared.
- Dock demolition is explicit QA fixture mutation, then immediate engine freeze/friendly player status and actual player recheck/details are verified. Engine codes remain QA oracles, not raw diagnostic UI.
-44×44 all visible controls,48px primary actions, visible four count cells/status, no horizontal overflow, viewport boundaries and no HUD/tool/zoom overlap.
-32 intended original fullframe screenshots:8 perviewport, including loaded5/24/1/0 and invalid refusal. Actual production pixels settle native flash via real rAF-paced draw only, requiring exact world/economy/cargo/clock invariance and boot overlay hidden.
- All recorded interaction events must be browser-trusted; panel events must not reach native canvas handlers or bubble into document.

## Explicit promotion adaptations

The previous candidate's engineering demo/replay/live/raw-diagnostic controls are intentionally absent from formal product. Their UI action tests are not falsely counted as retained product tests. QA-only `P06Test.replay()` and `live()` prepare the loaded screenshot state; they are not represented as UI actions. Product reset is tested only through its real confirmation UI. The candidate's memory-only localStorage expectation is deliberately not applied: formal native city storage persists; complete old-save/PWA acceptance belongs to the parent formal suite.

No before-UX candidate HTML is rebuilt: this is formal exact-product acceptance, not a new UX redesign comparison. Historical candidate tests/images remain archived. Source identity and uninstrumented-product absence-of-QA checks are the parent runner's responsibility; this module records the supplied identity verbatim.

## Validation status

`node --check` and CommonJS export load passed locally. Local normal-sandbox Chromium remains environment-blocked; no actual browser pass is claimed until official execution produces a completed result and reviewed raw images. Chromium touch emulation is not a physical Android/iOS or native device-picker test.
