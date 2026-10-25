# Fifth real Chromium red: unequal native ambient input

- Source: `4a86e303bf560f739d25277f69bb3d07052bacc0`; official run `40194795687`, job `121173212961`.
- Artifact `12599423685`, zip SHA-256 `fd62b05dd017c6d9ca522d0f2043a09d3e82ab2ef992799020692e48457c049a`; original result and logs remain unchanged under `/workspace/shared/own-cloud-migration-20261024/port-p06-fifth-red/extracted`.
- Browser stopped at check 166: candidate/control day 97, population 937, 407 buildings and 353 roads agree, but rounded money was 99842253 versus 99842252. Night-light probes had not run. This run is failed, not accepted.

## Cause and independent reproduction

The prior pair synchronized seeded city construction and native `advance(.05)` calls, but not native `Math.random` inputs. Native `updCars` (index.html 17106–17164) uses this separate stream for car generation and routing. Passing cars increment `roadPass`; native daily smoothing writes `roadLoad` (15669); dynamic land value feeds exact residential taxation (16593). These actors are not an economically inert visual layer. The adapter does not write money.

A supplemental **Node VM, draw-suppressed** reproduction uses the untouched control, actual seeded city 707, and 100 native `.05` advances at 3×. It is not substituted for Chromium acceptance:

| Native ambient LCG input | Initial raw money | Final raw money | Final residential tax | Native cars |
|---|---:|---:|---:|---:|
| seed 1 | 99837573.22261995 | 99842252.64239997 | 73.78027499999996 | 27 |
| seed 9 | 99837573.22261995 | 99842252.01869996 | 73.67497499999998 | 29 |

Initial world and road-field hashes agree. Cars first differ at step 2; roadPass at step 6; roadLoad at step 12; tax and raw money at step 48/day 89. The two untouched controls reproduce the same one-unit rounded discrepancy. For **each** identical stream, control versus active candidate matches all 101 complete raw state observations exactly. `evidence/native-economy-rng-proof.json` retains numerical receipts and hashes; original diagnostic sequences remain local, with compressed copies in evidence. This establishes a native unequal-input explanation; it does not identify the original unrecorded browser random draws retrospectively.

## Bounded test repair; stronger predicate

The browser economy experiment now uses two fresh isolated contexts and a shared explicit ambient LCG input only during its synchronous setup/advance. It records setup/advance seeds, call counts and terminal state, requires zero adapter activation random calls, and restores the exact original `Math.random` in `finally` before any normal busy-city/performance/live test. It does not remove traffic/services or change native rules, money, prices, tax, upkeep, ship economics, or the world seed.

Equality is strengthened from rounded money to **unrounded money**, every native advance trace, full native city cells, land values, roadLoad/roadPass, financial breakdown, industry chain, supplies and native statistics, both before and after advancement. Raw arrays are preserved in `economy-pair-raw.json`; report includes its SHA-256. There is no rounding, tolerance, masking, or expectation relaxation. The fixture adds only a read-only `economyState()` observer. New real Chromium rerun remains required.
