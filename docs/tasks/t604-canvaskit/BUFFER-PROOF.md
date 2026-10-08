# First-stage typed-command feasibility proof

This diagnostic leaves the product index, SW and renderers byte-for-byte equal to the visually accepted a26fcea candidate. It captures one real whole-night command packet, then tests a reusable Uint32 opcode arena, Float64 numeric arena, state indexes, string table and original Canvas image-resource references.

The browser comparison includes every recorded field and diagnostic metadata, exact Float64 bits, command order, shared state identities, original image source identities and SHA256 of their pixel bytes. Decoded commands are replayed by the unchanged CanvasKit player. All full-compositor pixels must remain identical to the original captured packet and the approved candidate snapshot. The existing visible wrong-ocean negative control remains active. No game generation, model update or RNG consumption is repeated by the codec.

Four windows run in fresh/reuse/reuse/fresh order. Each has two warm cycles and eight measured cycles, with constructor, encode, decode and total times reported separately. Arena usage, capacity, growth/copy bytes, table sizes and decoded object/array materializations are implementation counters. They exclude unmeasured Maps, reflection descriptors, string heap overhead, GC and image pixels; they must not be called total V8 allocations.

This measures transcoding an already-created object packet. It does not replace the 60ms-plus producer, execute a bulk WASM submission, measure live FPS, establish an 8ms result or pass the original 55FPS release gate. A compact representation alone is not a performance solution.

## Actual batch entry availability

The pinned official canvaskit-wasm 0.42.0 package's types/index.d.ts has SHA256 a7017a8fd21f27fdd1afe8036841d7ce0979b2410954fcc6d3f80444c171a6c6. Its supported APIs are available through the [official CanvasKit documentation](https://skia.org/docs/user/modules/canvaskit/) and the package types:

- drawAtlas (line1438) batches sprites from one atlas with shared paint; it cannot execute arbitrary interleaved paths, images, clips and blend/filter changes.
- drawPicture (line1647) replays an existing SkPicture. PictureRecorder (line2937) builds that picture through a Canvas, so recording a newly changed command stream still incurs individual calls.
- MakePicture (line424) consumes Skia's own serialized picture format. SkPicture.serialize (line2934) explicitly has no format compatibility guarantee; this custom typed representation is not that format.

No general public entry accepts this proof's arbitrary typed command stream. Stage two would need an independently justified official-source binding or another demonstrated path. No new runtime, compiler, service, credential or second-stage integration is introduced here.
