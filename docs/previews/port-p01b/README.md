P01-B independent native preview browser evidence only.

Owner authorized on 2026-10-24 the exact candidate branch gpt/port-p01b-browser-evidence, the single .github/workflows/port-p01b-preview-evidence.yml exception and docs/previews/port-p01b preview/test files. This is not permission to change main, open/merge a PR, unpause directions, publish Pages or read secrets.

The workflow generates an isolated HTML copy from the unchanged repository index.html, then runs real Chrome on localhost8126 and retains screenshots/logs. No player origin is used. The HTML overrides localStorage with memory-only storage, stops automatic saves and disables service-worker registration. Baseline, generated source digest, browser version and tests are recorded.

Images created by this workflow are real Chromium screenshots; earlier local images explicitly remain Node/Skia evidence. A green preview-only workflow is not complete release approval or owner image approval.
