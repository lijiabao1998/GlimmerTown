# T603 bounded night-renderer diagnosis

The designated issuer approved bounded night CPU/draw profiling and stable compositor screenshots on 2026-10-06. This diagnostic branch starts at candidate19fa39a4c94f9004a94031de1ada40f28d0ec288. Product SHA256 is pinned to6c1575ef7dbfec26abf363a39e5bcae8224c47ef98d4db1140926e53691aed69.

Allowed changes: this record, `docs/tasks/t603-shots/profile603.js`, and `.github/workflows/town603-night-profile.yml`. No runtime, main, original candidate branch, existing workflow, renderer, simulation, save, RNG, or acceptance-threshold change.

The original qualified Mac acceptance37535607860 remains failed: candidate day55.77FPS, night21FPS, mobile-night warm draw47.6ms versus36.05ms budget. The GPU getImageData comparison was inconclusive because its untouched baseline itself changed64,841pixels. This investigation cannot replace or clear that acceptance result. Images are already approved; no new release approval is inferred.

The profile collects three instrumented5-second traces: night original, night new art with old filtering, night full candidate. They use the same synthetic seed22 fixture, camera(22,14), zoom1, rotation0 and fixed light. CPU profiles and compositor traces are observational, not new benchmark acceptance samples.

After profiling, virtual time and CSS animations are paused. Real Page.captureScreenshot frames use the unchanged1400×900 viewport; no game-canvas getImageData/toDataURL is used for these comparisons. Off/off and on/on repeats must be stable. A deliberately wrong clipping edge must produce visible differences, and restoration must recover exact pixels. Off/on differences are reported even if nonzero; collection success is explicitly not release acceptance.

The existing standard macos-15 environment qualification and session-only display-mode restoration remain active. No paid runner, new permission, credential, external image or runtime dependency is introduced. The separate branch avoids repeating the original Linux or uninstrumented Mac timing runs. Any broader night-renderer amendment must specify exact source anchors after these profiles identify the bottleneck.
