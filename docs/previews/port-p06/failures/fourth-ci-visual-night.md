# Fourth run: automated green was not visual acceptance

Commit f428d3a64abac7c2694dd7e060153fa140c77e46, evidence run 40193320429: all 205 automated native Chrome checks passed, but independent inspection of raw `busy-night-r2-lift.png`, `busy-night-r3-lift.png` and `live-cycle-terminal.png` found giant opaque lamp discs covering cranes. This candidate was **not accepted or delivered as complete** merely because tests were green.

Root cause: the native adapter passed a three-element [screenX, screenY, worldHeight] projection into unchanged P01/P02 Canvas painters. Their normal `arc(...point, radius, 0, 2π)` call consequently treated pole/crane height (39/70) as the radius. This was an adapter argument-contract error, not new artwork.

Correction is limited to candidate builder projection: retain three-element PP for P04/P05 depth but pass a two-element PL into actual P01/P02 Canvas painters. The generated capture context separately recognizes its intentional depth-bearing point and takes the correct radius, preserving worldZ for occlusion. Original P01–P05 files and lamp designs are unchanged.

Added independent `night-contract-test.cjs` checks actual builder projection, retained original lamp/crane painters and the actual generated capture function. Old direct and captured giant-disc sources are explicitly rejected. Real Chrome now spies only on forwarded candidate Canvas arc calls in all four camera rotations and retains unedited day/night/winter raw screenshots. No sky/pixel masking, no global renderer override, and no deletion of legitimate lights.

Automated-green/visual-red raw artifact 12599460971: 48,776,164 bytes, SHA256 ee4598615c18b2812a81521be4ef49eeb2455b969a3a9de0f0cf288065b8df1c. Local archive remains `/workspace/shared/own-cloud-migration-20261024/port-p06-green`; its directory name records the automated job result, **not** final visual acceptance. Next exact-head real Chrome and raw visual review are required.

Performance from that run is retained, not hidden: moving full harbor ON versus native OFF draw median +5.0–6.9 ms; paused +1.9–2.5 ms; ON rAF about 48–50 fps versus native ~60 fps. Full native-5x live cycle completed in 37.997 s, but combined simulation/render p95 183.3 ms. These differ from the older P05-vs-P04 baseline (+2.5–3.8 ms), so neither identical cost nor physical-mobile 60 fps is claimed.
