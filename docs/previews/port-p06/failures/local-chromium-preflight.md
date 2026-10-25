# Local Chromium preflight — blocked, not a product result

2026-10-25. Requested exact Chrome binary `/workspace/shared/own-cloud-migration-20261024/chrome-runtime/extracted/opt/google/chrome/chrome`, Playwright `headless:true, chromiumSandbox:true`. No browser sandbox disabling flags.

1. Standard workspace command could not start Chromium: `chrome/browser/process_singleton_posix.cc:297 ... socket() failed: Operation not permitted (1)`.
2. One standard `require_escalated` retry failed in executor setup before the command: `bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`.

No denied-path read or workaround was attempted. No real browser acceptance is claimed for this preflight. Browser checks must run on the approved official CI runner or a corrected authorized local executor.
