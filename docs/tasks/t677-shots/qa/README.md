# T677 formal native harbor acceptance

Test-only files. Nothing here is shipped by the native product/package whitelist.

```sh
npm ci --ignore-scripts --prefix docs/tasks/t677-shots/qa
CHROME_PATH=/usr/bin/google-chrome node docs/tasks/t677-shots/qa/run.cjs --out=evidence/port-t677
```

The official job must provide real sandbox-capable Chromium, Chinese UI fonts, Node22 and full Git history. Playwright1.64.1 is exact-version/lock-integrity pinned. No browser installer, system mutation or sandbox bypass is performed by the runner. Missing dependencies/source/Chrome/stages fail closed.

`--prepare-only` checks syntax/reversible QA injection and writes `prepared-not-browser-tested`. It deliberately permits dirty local product bytes for engineering preparation and **never** counts as acceptance. Default execution requires all executed tracked product/harness files equal the actual event-head Git blobs; both synthetic checkout merge and event head identities are recorded.

## Isolation and test surface

- Separate local native/product origins, fresh profiles, slot3 before page load; never8123.
- Real product storage/autosave/service-worker retained. No in-memory storage replacement, disabledSW, fake roads or fixture UI injected into product.
- Served QA copies contain the retained candidate fixture and explicitly declared QA-only replay/read-only observation. Every served injection reverses exactly to the original product/native-main bytes. Raw product origin is independently tested without instrumentation or fixture globals.
- `inherited.cjs` executes all applicable original pure-engine/renderer contracts against exact promoted bytes, including independent depth oracles, original negatives and the P06 guard mutants/projection suite. See `inherited-coverage.md` for precise mappings and candidate-only exclusions; this required subreceipt stays within the source stage.
- `inherited-browser.cjs` adds required applicable P01–P05 rendered predicates on the real formal city, nested in the primary stage without changing the original222 names/count.
- `coverage-map.json` binds all222 original primary cases in order, describing formal replacements for candidate-only raw UI/storage/legacy-flag behavior. This is not a claim that all original predicate text is unchanged.
- `ui.cjs` tests actual player controls at1440/412/390/360 via trusted pointer/touch/keyboard, including two-contact pinch and real internal scroll delta. No physical Android/iOS device claim.
- `formal.cjs` checks real pre-promotion native save compatibility, field-stable second roundtrip, version-only metadata change, native offline reopen, no restored cargo ledger, genuine product enable/disable, dispatch rejection and targeted independent-oracle negative controls.
- `performance.cjs` launches distinct sequential native-main/P06 browser processes in AB/BA order using the same real busy-city save and accepted input. All cold/steady/full-cycle rawframes retained. Independent measurement and small separately instrumented attribution are distinct from the retained original same-candidate ON/OFF series.

## Verdict

Successful process exit means the declared behavioral tests passed and complete performance evidence exists. Its explicit status is `execution-passed-performance-review-required`, with `releaseReady:false`. It is **not** permission to Ready/merge/release. The frozen card still requires a reviewer to answer the five causal/perceptual questions and resolve any major new regression. Native OFF stalls do not exonerate P06; no invented60fps or average-only pass threshold.

All result/progress/failure logs and raw fullframe PNGs are beneath `--out`. A first failure is preserved; no stage is silently skipped, no slow samples removed, no existing main guard/timeouts changed. Historical candidate first-red/raw diagnostics remain their own evidence, not overwritten by these formal runs.
