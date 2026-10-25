# P05 single-container landside candidate

Base: P04 d92603a9b6751af11706735d5bf70d14bd2896ae. Independent candidate only. Main T707, Pages, saves, paused direction, city economics and train economy are unchanged.

## Runnable product

From this directory: npm ci --ignore-scripts; npm test. Open generated native-preview.html in a normal browser. P03 play/pause/reset and time slider drive the shared deterministic clock. P05 stage buttons jump to yard cargo, physical lift, loaded truck and complete departure. P05 toggle removes its equipment/connector/truck and restores original P04 frames/timing. Browser acceptance: CHROME_PATH=/usr/bin/google-chrome node p05-browser.cjs in a sandbox-capable environment.

One original ID, P03-original-row1-col0, continues through ship → crane → yard → crane → truck → dispatched. All 30 manifest entries remain present: 24 initial scene-stock IDs explicitly do not claim demonstrated import history, five other original vessel containers, and the one transferred ID. A dispatched item remains attached to its stopped truck outside the gate, not deleted or converted to revenue. Scene replay/reset is explicit, not a fresh economic shipment.

The yard has 24 retained occupied physical slots plus the P04 delivery slot. Pickup reserves the specific ID/slot/vehicle; actual occupancy releases when the cargo physically lifts and reservation completes at truck handoff. Loading preserves original .65 × .5 × 5 container dimensions.

## Actual route and equipment

Original native road row y31, x22–43 is read from GV.tile. A whole truck cannot clear the x22 gate without more road. The preserved failure is resolved by exactly three visible candidate connector cells x19–21,y31 on checked vacant land. This does not mutate the world's road tiles. Truck starts at42.7,31.5, stops at29.75,31.5 for cargo center30,31.5, then leaves west to20.8,31.5. The entire2×.7 footprint must be outside x22 before dispatch. This first actual route is straight. Conservative quarter-turn sweep support has positive and corner-collision tests; it is not claimed that the delivered route contains a turn or an articulated trailer simulation.

The new visible side-mounted telescoping transfer crane is stowed clear of the full original P04 sweep. Only after P04's 54-second extension ends plus2seconds does its rail extend; the hook approaches and locks the actual yard container, raises it, traverses to the waiting truck and lowers onto the deck. The crane is a geometric candidate, not a certified structural/force model. Original four quay cranes,24 original stacks,208 water cells and all old facilities remain unchanged.

## Evidence and limits

geometry-test checks full straight and conservative continuous-turn envelopes, road/gate/obstacle negatives, actual crane/cargo sweeps, stock identities and slot geometry. state-test checks conservation, exact handoff boundaries, pause-independent absolute-time replay and refusal paths. render-test uses actual painters and an independent nearest-ray-depth oracle. p05-browser records real Chromium views, controls, original P04 off-frame identity, ledger/negative controls, full live cycle and 27 paired draw groups, rAF/cold/cache evidence.

Do not treat local tests or this document as a CI/visual/performance pass. Official result JSON and original PNG artifacts supply those receipts. First failures remain in failures/. P05 does not implement multiple trucks, competing crane schedules, railroad transfer, income, cargo demand or a complete economy. Those require separate scoped work after this first slice is accepted.
