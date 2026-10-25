# P06 — native-city harbor candidate (not deployed)

This directory builds a **normal T707 city**, with P06 **off by default**. It does not replace the city with the P01 fixed scene. The unchanged P01–P05 art, dimensions, immutable cargo ID and 30-entry conservation state machines are adapted to a selected actual native port.

## Open and operate

1. Run `npm ci --ignore-scripts && node build.cjs` here. Open `native-preview.html` directly in a current desktop Chrome, or serve this directory on an isolated origin (never the player origin/port 8123). `native-control.html` is the independent unchanged-native renderer control.
2. Start/build a normal city, or expand **可操作示範城市** and select a shore to construct a city using actual native tools. Click **盤點港口**, then **啟用／重新檢查**. P06 is opt-in; it never inserts connecting roads or fills water.
3. Use the original native speed button for pause/1×/2×/3×/5×. **跟隨城市時間** consumes only native accepted simulation progress. The explicitly labeled replay buttons show fixed-time evidence, not industry production or income.
4. A demolition, blocked route or missing required building freezes the operating time and cargo ownership. Repair the real city and click **啟用／重新檢查**. A different port or changed voyage timing requires an explicit confirmed reset; cargo cannot teleport. **停用** restores native rendering without deleting the in-memory candidate ledger.

This preview uses **memory-only storage** and disables persistent autosave/PWA registration. Reload discards candidate state. It never reads or overwrites existing player saves. Manually importing a city through native UI is an optional player action, not a change to the save format.

Starting or loading a native city replaces the grid identity and immediately freezes the old candidate ledger, including while paused or disabled. Even a loaded harbor at identical coordinates requires an explicit **重設候選帳** before a new batch can operate. Native save bytes never contain or restore candidate cargo.

## What a legal harbor needs

- Actual completed native port k18, with the T707 3×3 root/ref footprint.
- One of four shore directions with an unobstructed **12×3** flat apron for unchanged machinery/yard. Native port construction alone is not proof of operational legality.
- A real adjacent water dock positioned outside the full vessel sweep; complete ship-sized entry, berth alignment and exit over real water.
- A real straight land-road approach behind the apron, full-truck loading/exit sweep, and legal physical gate posts. This conservative slice refuses one-way roads rather than claiming directed-route support. No bridge/rail/tram substitute, invisible connector or center-point-only clearance.
- Completed native warehouse k64 (3×3) and freight k110 (4×4), each cardinally connected by actual land roads to the gate network. The freight check does **not** claim formal train delivery.
- No buildings/trees/zones/rails/trams occupying the machinery apron, and no building intersecting the original crane/cargo swept volume.

Invalid layouts display a reason and remain stopped. The conservative search can reject unusual otherwise-buildable layouts: this is safer than inventing a route. This slice retains a straight truck maneuver, single selected port, single immutable batch and single truck. It does not promise arbitrary curved truck yards, all possible islands/estuaries, multi-batch throughput or terrain remodeling.

## Evidence and limits

- `CANDIDATE-P06.md`: first-pushed frozen acceptance card.
- `NATIVE-INVENTORY.md`: actual T707 executable-state inventory, including old misleading 2×2 fallback comments and two native scenery-ship systems.
- `layout-test.cjs`: actual-size four-direction pure checks, negative controls and source-mutation red proofs; **not browser evidence**.
- `native-browser.cjs`: sandboxed real Chrome normal city, independent native-cell/ID oracles, pause/speed/replay, refusal/demolition/rebuild, OFF-native frame equality, native economy pair, population/traffic/performance, cold/cache/long-run evidence.
- `native-performance.js`: candidate-only exact occlusion metadata/signature acceleration; original P05 remains the paired reference. `performance-equivalence-test.cjs` checks exact geometry/order and rejects a stale-mask-key mutant. `perf-diagnostic.cjs` retains original timings and separately checks full-frame reference parity plus paired optimized/reference costs; pure tests are not performance claims.
- `regression.cjs`: untouched native guard orchestration. Full original validation runs against untouched native source; focused native trains/old-save tests and original atlas fingerprinting also run against the exact generated P06. Original P01–P05 jobs are retained separately in the evidence workflow.
- `failures/`: first failures and causes remain evidence, never silently overwritten by a green rerun.

The 24 original yard-stock entries remain honestly marked as initial scene stock, not proved imported goods. The demonstrated original ship container `P03-original-row1-col0` transfers through ship → quay crane → yard → landside crane → truck → fully outside gate. The conserved total is always 30. There is no automatic new batch or money credit.

P05's previously measured moving-frame increase of roughly **2.5–3.8 ms versus P04** remains part of the cost history. P06's real populated-city OFF/ON paired distributions, cold startup, native sprite/cache allocation, rAF and full-cycle statistics must be read separately; a desktop/headless viewport is not a physical-phone result.

## Following research, not implemented

1. Multiple batches and yard backpressure: define admission/reservations, finite slots, truck queues and cancellation under demolition without breaking unique-ID conservation; quantify queue bounds first.
2. Only after that, shadow-account comparison against existing Town aggregate harbor/steel/fuel/ship economics, with **zero writes** to native financial state.
3. Only with a separate explicit request/approval, consider formal fiscal integration. No such integration, deployment or merge is authorized in P06.
