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
