# T612 native retention exactness decision

CI 37896208664 at c43e3f388df3ddc5c2aa561c460fd74b1a02bfac confirms candidate divergence. Both copied and raw layer images differ only at (182,10) and (182,42): original [0,0,0,0], candidate [255,73,36,7]. Original-repeat and original-restored controls, both raw and copied, match exactly. Context states agree. This is not explained by the copy oracle or original-frame instability.

The candidate partially redraws three of six 128x128 tiles, executing three of four paints in original order. The changed fractional sprite spans (150,10.5,32.5,31.5). Both differences are its right corners, far from the dirty union boundary [0,0,384,128]. Neither bounded source stale state nor inadequate dirty footprint is demonstrated. Exact helper-versus-original call/state audit found no missing smoothing, alpha, composite, transform, filter or shadow setting. The remaining differences are the temporary clip, partial clear and omitted disjoint paint. Do not attribute to a GPU driver without causal evidence.

Verdict: NO-GO before full-city eligibility or timing. No 55 FPS claim, adoption, merge or release. Preserve original renderer and unchanged zero-RGBA threshold. Full byte/alpha calibration did not run because the first synthetic mismatch stopped execution. The specific failed case's raw-versus-copy controls did run and passed.

Artifact 11600083563 exists on GitHub with reported SHA256 b19b4dcae90ef30ea83d813e567e7dfffb4741979869dfe58c852c0a30f809b8. Supported transfer returns HTTP403; no local ZIP or PNG delivery is claimed. Exact structured failure data and complete CI logs are preserved locally and in the recovery archive.
