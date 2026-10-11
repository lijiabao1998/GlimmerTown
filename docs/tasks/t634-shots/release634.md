# T634 approved-art release activation

The owner approved the three genuine Chrome images from immutable `7105c58532ec0a77220e0f9caedb5364cb05396a` and requested publication. That artwork was v11.217 with an opt-in flag. This release only changes the normal-visit default to on and synchronizes v11.218. The approved drawing definitions, footprint geometry, materials, animation hooks, simulation and save format are unchanged.

## Activation and recovery
- Ordinary URL: approved art on, without storage preference or query.
- Existing `?T634=1` remains compatible.
- `?noT634=1`, `?noT634`, or runtime `window.__noT634=true` returns to the retained original route.
- Explicit `window.__t634=false` remains an old-route test control unless the explicit `T634=1` query is present. Escape valves always take priority.

## Separate acceptance lanes
The original Node canvas mock returns four transparent bytes, not a native image. A normal-default trial failed at 1,114 assertions when the first T634 crop correctly rejected that empty mock. The failure is retained in the release evidence; it is not a Chrome regression and no product empty-image guard was weakened.

`test_fixde.js` follows its existing T602/T603 convention and explicitly selects the retained old-art path for the complete historical suite. All original assertions, thresholds, six simulation pins and completion markers remain. This lane alone does **not** establish normal-default safety.

The independent required `release634.cjs` runs actual Chrome on a disposable origin with slot3 chosen before document load. Its immutable reference is the owner-approved 7105 commit. It requires exact HEAD source/harness bytes; all315 native day/night images and anchor/hook metadata; identical same-camera four-direction day/night world pixels; both escape routes; and actual wrong-source negative controls. A separate normal-URL/default-on simulation and save lane requires the original three 72×72, difficulty1, AI400-day cases and all six literal population/money pins. All new-art flags remain at their normal settings during this lane.

The T634 seasonal, construction, old-save, overlay, smoke, actors, preserved-art and geometry suites remain required. The auxiliary baseline sheets explicitly use `?noT634=1` and are labeled the pre-release escape baseline.

The main Pages workflow retains every original blocking gate and adds `approved-art-release` to `deploy.needs`. The same required normal-default Chrome suite runs before merge and again on the main merge SHA. Deploy and actual HTTPS `verify-published` must succeed before publication is reported successful. Native timing remains reference-only under the existing T630 policy.

## Evidence status
Implementation-time record only. Exact release commit, CI results and published HTTPS verification will be recorded after they actually complete. The prior 7105 candidate had six green jobs; that does not substitute for release-default or main deployment checks.

## First exact-release CI result and bounded fixture correction

The first default-on source, `acafd287`, completed 3,471 release checks: 945 approved/default/explicit-on day/night sprite pairs, all360 world frames, all six original simulation pins and all three save/draw/load roundtrips (identical save hashes). All three deliberate wrong-source pixel controls reached their intended first guard. It nevertheless correctly failed the final zero-page-exception check: closing each of12 disposable contexts invoked the game's original visibility-change autosave, which the parity fixture intentionally forbade. This failed run remains failed.

The correction is limited to the supplemental test's post-measurement disposal. Every measured contract and active-page save denial remains; after evidence and storage checks, the completed disposable world is cleared before context closure. Static lifecycle controls and the rerun must prove no teardown storage writes, no resumed measurements after disposal, and zero page exceptions. No error filtering, threshold relaxation, runtime or artwork change is allowed. Real background-save behavior remains covered separately by the unchanged Pages browser tests.

The same run's existing advisory macOS native lane also failed its unchanged daytime cold-draw limit: 718.3ms versus 137.6ms art-off, limit525.2ms. Its seven live SPR pin tables are identical to each other; the860 historical-key differences are common to baseline and candidate, with no new-versus-old CRC differences. The315 new CACHE634 designs are outside that SPR table and require the separate exact-RGBA gate. One cold sample cannot establish or dismiss a new performance regression; this advisory failure is retained under the existing T630 policy, without a retry or relaxed limit.

## Native-filter coverage diagnosis and explicit fallback fixtures

The first Pages world release attempt failed after all308 ordinary world frames, all308 full escape comparisons and all308 new-escape art-on comparisons were captured. Normal art had zero compressed-shadow calls and zero fractional filter bounds. This matches the pre-existing `__t590` contract: approved new sprites already contain their ground shading and must not receive an extra compressed silhouette. The preserved routes still made real shadow calls in90 frames and fractional-bound calls in4, with exact immutable-main pixel/count parity. The failed report is retained; it is not reclassified as passed.

The focused correction keeps the normal256/32/16/4 datasets unchanged. It adds a separately named36-frame `__noT591` fixture on the same frozen city and cameras, retaining normal T634 activation. Original native-filter coverage predicates run unchanged over that explicit retained-lot dataset. A distinct only-new-escape arm must match the independent previous release under the same fixture, byte for byte, including actual native draw counts. The flag value and own-property state are restored after every capture. No sprite caches, game state, artwork, production draw functions, frozen T603 source or canonical source hashes are edited.

The normal/day reflection wrong-edge control remains, and a separate fallback/night shadow wrong-edge control must damage real pixels and restore exactly. The supplemental approved-art suite also records pass-through native filter counts for both approved7105 and the normal release, alongside its existing exact pixel pairs; historical baseline counts remain separate.

At this implementation-time entry, the corrected exact commit has not yet completed CI. All previously passing assertions, zero-pixel thresholds, six simulation pins, save roundtrips, lifecycle guards, slot protections, original timing policy and release dependencies remain required.


## DPR2 rainbow snapshot diagnosis and validated correction

178007 retained the original frameValid failure at aligned-dpr2-day. Isolated diagnostic 1db4 (run38120974678) preserved the two original readbacks: all3,351 differing pixels were in the existing T248 red rainbow arc at x188–592/y260–273, RGB delta at most1, alpha identical; the entire city below the horizon was byte-identical. Ground/lot/art cache keys and bake counts were unchanged. The geometry independently predicts outer arc top260.796 and sea horizon274. The native renderer naturally decrements rainbowT by .016 per draw; the frozen supplemental fixture had omitted that clock.

The fix reads the immutable PREV's actual positive rainbowT in the same grow22 task before matrix draws, shares it only inside the supplemental fallback frame, reapplies it before each of the original three draws, and preserves the real decrement after each draw. Every caller clock and compositor method descriptor/ownership is restored exactly, including exceptions. The normal308 matrix, production sources, frozen canonical harness and pixel thresholds are unchanged. Real PREV and candidate observations both measured9; no value is invented, cleared, or warmed away.

The first corrected diagnostic ec3b (run38139520638) passed all36 paired fallback cases and the shadow red949/restored0, but correctly failed its added visible-rainbow red control: the natural clock9→8.984→8.968→8.952 produced identical two RGBA buffers. This quantization-neutral sample is retained, not called a red control. Two independent reviewers approved a fixed four-phase table from the observed input plus those three actual post values. All four run without hit-based stopping or adaptive extension, and each shared counterpart must be pixel-stable. Every visible drift must reach the original stablePixels rejection with all other clauses true; the full table must contain at least one visible rejection. Wrong nonzero input and exact restoration remain required.

Final diagnostic36d81e6, run38140790689, completed731 checks and188 PNG with zero runtime/console/app errors. Four drift deltas were0/0/3594/0; all shared counterparts0. Wrong-clock delta3772/restored0; shadow delta949/restored0. All36 independent PREV references and32fractional+4aligned pairs passed. The compact artifact11702971497 SHA256 is ea656eaaacd77d4cd6061671f1b5f8236ad218cec29b73695b4c64b97f77350f. Its explicit status is diagnostic-complete-not-acceptance; it does not certify the omitted normal308 or main publication.

The reviewed helper/test bytes now enter PR16 without importing the isolated runner/workflow. Full candidate and Pages required lanes must run on the new exact SHA; prior successes, this diagnostic, and static41/41 tests do not replace them. Runtime remains exactly the approved v11.218 activation release; original failures and advisory timing reports remain in the record.
