# T608 bounded topology scratch reuse

Diagnostic-only; original product index/service-worker/renderers remain unchanged.
This does not cache graph decisions, tiles, sprites, state, pixels or input data.
The actual lotOrder574 graph-comparison/heap/cycle/tie logic is reused verbatim,
with only its local scratch allocation line replaced. Every current input is
recomputed. Returned arrays are fresh and retain the original object identities.

A single numeric workspace retains at most2048 node slots and262144 adjacency
entries after a call. Larger inputs and reentry use the original function. A
large edge graph discards the workspace after return. These are retention slot
bounds, not byte-exact V8 heap or peak-allocation measurements; original graph
work still occurs inside each call. Clear all adjacency slots, degree/used arrays
and heap on each acquisition; dispose releases workspace. No state invalidation
heuristic is needed because no decisions/input objects are retained.

Four focused randomized/ownership tests plus seven independent review cases
cover stable identity/order/ties, explicit cycles, fresh retained output,
growth/shrink, mutation, exception after partial graph construction, genuine
reentry and disposal. A Linux Node synthetic700-record microbenchmark suggested
about20% helper-level savings; it is neither native browser nor full-frame FPS
evidence and cannot authorize product adoption.

One qualified Mac diagnostic first performs five original/verified/pooled/restored
full-city comparisons (zoom1/.7/.95/1.25/2 and rotations0/0/1/2/3). Verification
executes both graphs on identical actual inputs and compares exact object
identity/order/cycle count. Each screenshot must match all RGBA pixels exactly;
model, actors and draw RNG must be unchanged. Any failure stops before timing.
Original filter, alpha, clipping, transforms, sprite sampling and paint order
remain untouched.

Then both graph variants receive20 seconds live warm-up. Original unwrapped
native frame/advance/draw and all animations continue. Three stable five-second
night windows must qualify within a total four-minute warm/qualification bound;
no clock freezing or reset after benchmark setup. Then one six-window native
comparison runs O/P, P/O, O/P, five seconds each. Each mode's three distributions
must meet the existing10% median/15%p95 stability screen. At least two of three
pairs must improve; median pooled/original FPS ratio must be>=1.05 and median
p95 ratio<=1.05. Retain every slower window and all sample/counter data. No
unchanged rerun after a negative or unqualified result.

Only actual frame counts/elapsed times determine FPS. Absolute55 is separately
reported and cannot be inferred from helper savings; product remains unmerged
until the original full regression/relative/image/release requirements pass.
