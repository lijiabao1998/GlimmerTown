# Third official P06 red — 311cb86b / 40192628143

The newly populated city had a real north-edge road adjacent to freight k110 as well as its old south spur. The negative fixture removed only the south spur, then incorrectly expected the facility to be unreachable. The adapter correctly found the remaining actual cardinal road access; no cargo was fabricated or dispatched.

Only the negative construction is corrected: enumerate the actual native root/size perimeter, use normal GV.place('doze') to remove every cardinal adjacent road, assert at least one removal and that every chosen road really disappeared. The existing invalid-layout + visible-reason + zero-dispatch predicates remain unchanged. The actual adapter is unchanged in this correction. State-only replay independently reproduced FREIGHT_UNREACHABLE after removing roads (25,17),(26,17),(27,17),(28,17),(25,22). This state-only diagnosis is not Chrome acceptance.

Before this red, real Chrome passed 134 checks including all five now-populated native layouts, 30 same-ID handoff frames and 100 actual rendered-screen→native-toTile samples across four cameras. Exact P06 T706/T707/oldsave602/603 8/8 and baseline/candidate atlas fingerprints 2/2 also passed officially.

Raw artifact 12598557752: 34,196,404 bytes; SHA256 51665cc51a546171f5d0a75a729a581ddecb4cdbc5b15bec6639f41d5d24efcf. Preserved under /workspace/shared/own-cloud-migration-20261024/port-p06-third-red and run 40192628143. Full acceptance still pending the next real browser run.
