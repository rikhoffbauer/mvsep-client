# Implementation status — 2026-10-08

This is the implementation follow-up to the historical `CODE_REVIEW.md` and `SUGGESTIONS.md`. Findings in those files were not rewritten: they describe the original version of the project. This document records the disposition of each finding and suggestion in the current working implementation.

## Code-review remediation

| Finding | Status | Implementation and verification |
| --- | --- | --- |
| H01 Token in public error URL | Addressed | Redaction of URLs, message text, structured response and error causes in `src/errors.ts`; regression H01 |
| H02 Authenticated raw request overrides token | Addressed | Reject user-supplied `api_token` in query/form for authenticated calls; regression H02 |
| H03 Timeout does not cover response-body read | Addressed | Composite abort deadline encloses limiter, semaphore, headers and streaming body; regression H03 |
| H04 Concurrency slot released during body streaming | Addressed | Semaphore remains held through body read and decoding; regression H04 |
| H05 Pre-aborted semaphore waiter can hang | Addressed | Check signal before queue and after attachment; regression H05 |
| H06 Throwing progress observer disguises successful paid POST | Addressed | Isolated observers; regression H06 |
| M01 Listener accumulation | Addressed | Abort-aware waits remove listeners; regression M01 |
| M02 Poll deadline not wall-clock | Addressed | Overall deadline including pending network requests and sleeps; regression M02 |
| M03 Response-body transport failure untyped | Addressed | Parse and body read inside typed request retry/error path; regression M03 |
| M04 Non-JSON HTTP 429 bypasses retry handling | Addressed | Status classifier acts on raw non-JSON response; regression M04 |
| M05 `createAndWait()` does not forward timeout | Addressed | Explicit `timeoutMs` forwarded to creation; regression M05 |
| M06 Mirror authentication requirement omitted | Addressed | Credential guard and documented cost; regression M06 |
| M07 Get-result envelope unchecked | Addressed | `validateResult` on get and get-remote; regression M07 |
| M08 Abort during throttling escapes typed errors | Addressed | Limiter/key cooldown abort normalized to `MvsepAbortError`; regression M08 |
| M09 Unbounded job-to-key map | Addressed | Configurable oldest-entry eviction and explicit forgetting; regression M09 |
| M10 Full-buffer file/download paths | Addressed | Disk-backed `fileBlobFromPath`; streaming `downloadToStream`/`downloadToFile`. Legacy `fileFromPath` remains compatible |
| M11 Download bypasses shared HTTP policy | Addressed | TransferManager uses rate limiter, concurrency, bounded retry, timeout and cancellation; regression S01 |
| M12 Failed download retains reader | Addressed | Reader cancellation, lock release and temporary-file deletion; regression S01/M12 |
| M13 Weak regression suite and no CI | Addressed | 51+ mock/contract tests, Node coverage command, Bun/Node20/Node24 GitHub Actions jobs, tarball smoke check |
| L01 `unsafeCreateRetries: never` not absolute | Addressed | Never retries any create failure including 401; regression L01 |
| L02 Invalid numeric inputs silently accepted | Addressed | Explicit validation of retry, limiter, concurrency, polling, transfer and key cooldown options; regression L02 |
| L03 Broken published sourcemaps | Addressed | TypeScript `inlineSources`, smoke test verifies populated `sourcesContent` |
| L04 Remote endpoint accepts ignored `mirror` | Addressed | Exclude from typed remote options and reject at runtime; regression L04 |

## Suggestions

| Suggestion | Delivery |
| --- | --- |
| S01 Stream outputs | `TransferManager`, `downloadToStream`, `downloadToFile`; safe no-clobber and atomic promotion, byte-progress and size limits |
| S02 Typed account/queue/billing reads | User/queue/summary/history/purchases DTOs and client methods |
| S03 Credit estimates and guardrails | `estimateJobCredits`, `createGuardedSeparation`, optional account-balance preflight |
| S04 Metadata-based options | `prepareSeparation`, `validateSeparation`; option keys, descriptions, defaults, strict mode and entitlements |
| S05 Durable job recovery | `MvsepJobHandle`, stable account identifiers, job-store interface and resume/poll methods |
| S06 Batch scheduler | `runBatch`, bounded server-side jobs, budget preflight, stop/pause/resume controller and crash-safe write-ahead checkpoints |
| S07 Result normalization | `getOutputFiles`, `downloadSeparationOutputs`, safe filenames and per-output error manifest |
| S08 Disk-backed upload | `fileBlobFromPath`; no full-buffer read required |
| S09 Webhook helpers | `parseWebhook`, `reconcileWebhook`, `MvsepWebhookReceiver` with in-instance bounded dedup |
| S10 Account settings | Credit alert and premium/long-filename toggles via explicit methods |
| S11 Paginated discovery | Demos, news, account history, purchases, quality-checker queue, entries and leaderboard with limits/filtering |
| S12 Queue-aware status | `getQueueSummary`, `watchJob` async iterable for queue/progress/completion events |
| S13 Metadata snapshots | Pluggable `MetadataCache`, `FileMetadataCache`, TTL, refresh and explicit offline stale snapshot retrieval |
| S14 CLI | `mvsep` binary with models, submit, resume, status, wait, cancel, delete, download and batch subcommands |
| S15 Artifact cache | `LocalArtifactCache` hashes source/config/account/model revision and verifies output checksums |
| S16 Diagnostics and recipes | `MvsepDiagnostics` bounded privacy-aware event stream; expanded README recipes |

## Intentional constraints

- **MVSep processing was not invoked with real API keys or credits.** HTTP semantics were verified against the public API documentation and mocked network responses.
- **HTTP Range transfer resume** is not implemented. This is an optional follow-on to S01. Failed partial transfers clean up, rather than silently appending/retrying potentially corrupted data.
- **Portable upload byte-progress** is not implemented. Native Fetch/FormData does not expose it; users can inject an instrumented Fetch implementation. Lifecycle/progress events are implemented.
- **Unknown priced operations** (including saved presets and arbitrary no-upload generation) are rejected by budget-guarded submission. They are not inferred to cost zero.
- **Webhook authenticity** is the responsibility of the HTTP server; upstream documents a payload but no signature verification scheme. Dedup storage is in-memory unless the caller persists its own delivery journal.
- **Crash consistency** of batch jobs is conservative: a durable pending-submission marker is persisted *before* the POST, preventing an automatic duplicate after a crash, but an ambiguous marker needs manual reconciliation against the account history before resubmission.
- **Bun Git dependencies** require an explicitly trusted build lifecycle. Use `bun add --trust github:rikhoffbauer/mvsep-client`. npm Git dependencies execute the `prepare` build by default.
- The default in-memory download limit is 256 MiB; use streaming file/writable APIs for larger outputs.

## Reproduce verification

```bash
bun install --frozen-lockfile
bun run check
bun run test
bun run test:coverage
bun run smoke:package
```

`npm pack` is tested with a fresh install, ESM and CLI execution, TypeScript declarations and source maps.
