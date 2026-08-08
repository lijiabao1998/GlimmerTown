# T421 G5 mutation red-source (rework independent proof)

Mutate one `fillRect` in the T421 managed pass, full `node test_fixde.js`, restore after each case.

| case | mutate | exit | first FAIL |
|---|---|---:|---|
| M-geom-out-x | sp15b.ax-3 -> ax-40 (x out of canvas) | **1** | `FAIL: T421 G3 落筆觀測 ops/ink，實得 {"14_1_1":"8:43","14_1_2":"8:43","14_1_3":"6:58","14_1_4":"6:58","15_1_1":"5:33","15_1_2":"5:33","15_1_3":"5:33","15_1_4":"5:33","16_1_1":"0:0","16_1_2":"0:0","16_1_3":"6` |
| M-geom-out-y | sp15b.ay-14 -> ay-120 (y out of canvas) | **1** | `FAIL: T421 G3 落筆觀測 ops/ink，實得 {"14_1_1":"8:43","14_1_2":"8:43","14_1_3":"6:58","14_1_4":"6:58","15_1_1":"5:33","15_1_2":"5:33","15_1_3":"5:33","15_1_4":"5:33","16_1_1":"0:0","16_1_2":"0:0","16_1_3":"6` |
| M-geom-size0 | w 2 -> 0 (non-positive size) | **1** | `FAIL: T421 G3 落筆觀測 ops/ink，實得 {"14_1_1":"8:43","14_1_2":"8:43","14_1_3":"6:58","14_1_4":"6:58","15_1_1":"5:33","15_1_2":"5:33","15_1_3":"5:33","15_1_4":"5:33","16_1_1":"0:0","16_1_2":"0:0","16_1_3":"6` |
| M-rect-shift | ax-3 -> ax-2 (rect table mismatch) | **1** | `FAIL: T421 G5 落筆：rect 逐筆恰等 15_1_4 第3筆 34,96,2,8≠33,96,2,8` |

## Isolated G5 geometry (weak vs strong)

Full suite assert order hits G5 rect / G3 before geom when coords change.
Isolated source-scan (same formula as restored G5) proves the restored bound guard:

| case | weak (4-param + size>0 only) | strong (canvas clamp multi-size) |
|---|---|---|
| baseline tip | PASS | PASS |
| ax-3 → ax-40 (x=-4 oob) | **PASS (false green)** | **FAIL oob** |
| w 2 → 0 | FAIL | FAIL |

This is the independent mutation proof that the pre-rework diluted G5 would miss whole-canvas translation out of bounds.
