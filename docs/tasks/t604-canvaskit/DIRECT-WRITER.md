# Bounded direct-producer diagnostic

This branch changes diagnostic files only. The product index, service worker and
renderer are byte-identical to the visually reviewed `a26fcea` candidate. The
production branch remains `329f660`; neither the original 55 FPS gate nor the
original-backend pixel result is changed.

## Hypothesis and scope

The previous object-to-buffer bridge was exact but cost 96.05 ms per fresh
encode/decode cycle. It cannot be an optimization. This probe instead installs a
temporary emitter on the existing Recorder used by the game's context. It writes
state and paint rows directly into reusable Uint32/Float64 arenas. It retains the
original native Shadow setters, path and clip objects, source-version snapshots,
game draw and offscreen generation. This is not a native-ready typed renderer.

All complete-draw timing surrounds exactly one `GV.forceDraw()`. The temporary
Controller end captures the emitted frame without replaying it. End finishes all
required capture, validation and representation counters inside that interval.
The diagnostic then measures reference decoding and unchanged Player replay
separately. Their sum is reported; neither cost is claimed to have disappeared.

## Correctness before useful timing

- Local contracts use the actual Recorder with a mock native interface. They
  check canonical state, double-precision values, paths, clips, source mutation,
  ignored and throwing setters, save/restore, buffer lifetime and rejection.
- A same-draw mirror invokes the original paint once and directly emits alongside
  it. Every field including allocation ids and metadata, Float64 bit pattern,
  source-image pixel hash, source identity and state alias must match after decode.
- Separate fixed-input draws normalize only producer time and gradient/image
  bookkeeping ids/versions. Every drawing argument, gradient stop, path, state,
  painter order and image pixel remains compared. A changed paint parameter must
  fail this comparison. The existing visible-ocean pixel negative is retained.
- Real compositor captures must add zero pixels relative to the reviewed GPU
  image. This is not a claim of zero difference from the original Canvas backend.
- Rainbow and other diagnostic clocks are captured, reset before each complete
  draw and restored afterward. Original operations still execute; no live game
  animation is frozen as a product optimization. RNG and city data are checked.

The one Mac run uses baseline/direct/direct/baseline, two warm and five measured
draws per window. There are 20 measured producer draws and no live FPS samples.
Image hashing/readback is outside the producer timer and explicitly validation
work. Structural allocation and source-write counters are not total V8 heap or
offscreen-operation profiles. All of that actual draw work remains timed.

### Preserved first preflight failure

`31c68ee` / run `37806292058` stopped before the interleaved samples. Its same-draw
mirror matched all 5,873 commands, 4,783 states and 170 source images exactly, but
the compositor differed by 3,406 pixels (maximum one channel level). The mirror's
119.4 ms includes original plus direct emission and is not optimization evidence.

That harness read all source Canvas pixels before the first GPU upload of the
captured frame. Product ordering uploads before pixel readback. The corrected
diagnostic preserves product ordering, still compares every source pixel after
rendering, and records a final untimed reupload of only canvas-sized source(s)
after pixel hashing. This tests the readback/backing hypothesis without hiding a
pixel mismatch or accepting timing from the failed run. If the initial mirror
still differs, the corrected run stops before interleaved timing as well.

## Predeclared decision

Any exactness failure rejects timing acceptance. A direct full producer median
above 1000/55 = 18.18 ms rejects this design even under imaginary free replay.
Only stable evidence near 8 ms can justify considering a consumer proof. Eight
milliseconds is a research screen, not a measured result or a new release gate.
The official pinned CanvasKit 0.42 API has no generic typed-command batch entry;
no custom WASM consumer or larger renderer integration is part of this probe.

Run contracts with `node docs/tasks/t604-canvaskit/direct-writer604.test.cjs`.
The qualified headed Mac harness is `run604.cjs --direct-audit`. Do not infer
live FPS or release eligibility from its workflow's diagnostic success.
