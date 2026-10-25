# Local T270 strict-byte failure retained (2026-10-25)

A supplemental full-native `regression.cjs --lane=validate` run in the dot workspace stopped the untouched native suite at T270's strict PWA icon generator check (4,262 passes before fail-fast, not the required full count). The exact generated P06 focused native train/old-save checks passed 8/8 separately. This does not override official full-native CI.

The untouched tracked `icon-v1-192.png` remains SHA-256 `a7252477296cc7704bd3d485c8a3a25bcfb6c36bcb5df2b0dca666bab4537951`, 581 bytes. Local in-memory generation produces SHA-256 `c119e721c45139f87dc92174848d6d128691b500e17a5a8b9e5ac6d56d255581`, 590 bytes. Its IDAT is 533 bytes versus the tracked 524. Decoded RGB bytes **and decompressed IDAT bytes are exactly equal**; only compressed representation differs. Both 512px icons match their tracked hashes.

Current default Python 3.12/Pillow 12.3 was tested, then repo-pinned Pillow 12.2 was installed only under `/tmp` and retested. Both reproduce the identical byte mismatch. System Python 3.13/Pillow 11.1 also reproduces it. Therefore an initial Pillow-version-only suspicion was disproved. The precise compressor/runtime difference has not been established; no claim that the local full suite passed or was fixed is made.

No PNG, expected byte hash, original test, original workflow, generator, system dependency or guard was changed. The strict byte guard remains red locally. Its complete report/logs are preserved in local evidence. The dedicated official CI's original native validation remains required on the exact candidate head.
