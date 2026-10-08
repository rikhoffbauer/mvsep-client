# Feature suggestions — mvsep-client

> Reviewed: 2026-10-08 · Scope: `@rikhoffbauer/mvsep-client` TypeScript SDK · Status: proposals, **not implemented**.

## Executive recommendation

The SDK already solves the low-level separation lifecycle well. Its next useful step is **a reliable, credit-aware, restartable workflow from audio input to local stem files** — not a GUI or a second, competing HTTP abstraction.

**Suggested delivery order:** (1) streaming outputs, (2) typed account/queue/history endpoints, (3) model-aware option validation and cost estimation, (4) durable job handles, (5) an *optional* batch scheduler. The remaining proposals should be driven by actual consumers.

A prerequisite for any higher-level automation is that it **never silently creates duplicate, potentially paid jobs**. The current conservative create retry policy must be retained.

## Evidence and current baseline

Inspected `src/client.ts`, `src/types.ts`, `src/key-pool.ts`, `src/rate-limiter.ts`, `test/client.test.mjs`, `examples/basic.ts`, and `README.md` at the state present on 2026-10-08. The worktree also contains pre-existing edits to `README.md`, `package.json`, and `bun.lock`; this document does not request or depend on changing them.

**Already implemented; do not propose again as new features:** creation from binary/URL/preset/matchering/no-upload inputs; get/poll/cancel/delete and remote result lookup; algorithm discovery; basic progress, retries with `Retry-After`, rate/concurrency limiting, multiple keys and job-key affinity; global/per-call callbacks; abort/timeout support; regional base URLs; a raw `request<T>()` escape hatch; and an in-memory `download()`. Some of these deserve *extensions*, identified below.

**Current public high-level surface:** `createSeparation`, `getSeparation`, `getRemoteSeparation`, `cancelSeparation`, `deleteSeparation`, `getAlgorithms`, `waitForSeparation`, `createAndWait`, `download`, key-affinity helpers, and `request<T>`. See `src/client.ts:217-463`.

**Upstream capabilities verified:** MVSep documents profile/credit balance, personal and global queue statistics, history, purchase history, low-credit alerts, demo separations, news, account preferences and Quality Checker leaderboards, in addition to separation operations. The website publishes an OpenAPI specification. These endpoints are reachable today through `request<T>()`, but do not have purpose-built SDK wrappers and strong return types.

Primary sources:
- [MVSep full API reference](https://mvsep.com/en/full_api)
- [MVSep OpenAPI specification](https://mvsep.com/misc/mvsep-openapi-spec.json)

## Priority framework

| Priority | Meaning |
| --- | --- |
| **P0** | Materially improves core separation workflows or protects resources/credits |
| **P1** | Valuable for applications consuming the SDK; implement after P0 or with a concrete consumer |
| **P2** | Specialized/optional ecosystem feature; avoid increasing core dependencies |

Effort is relative: **S** (small), **M** (medium), **L** (large). It is not a delivery estimate.

## P0 — high-value additions

### S01 — Stream outputs directly to disk or a WritableStream
**Priority:** P0 · **Effort:** M · **Gap:** `download()` accumulates the entire response in memory and returns `Uint8Array` (`src/client.ts:412-461`).

**Proposed API:** `downloadToFile(url, path, options?)`, plus a runtime-neutral `downloadToStream(url, writable, options?)`; keep the existing `download()` for small outputs.

**Behavior and acceptance criteria:**
- Transfer with backpressure; report byte and percentage progress when `Content-Length` is known; respect aborts and separate transfer timeouts.
- Write into a temporary sibling file and atomically promote on success; clean up partials on failure unless explicitly retained.
- Optionally resume with HTTP `Range` **only if** the server confirms partial-content semantics; handle ignored ranges and changed resources without corrupting files.
- Define overwrite/collision rules, safe filenames, redirect policy, and verified final byte count; do not infer integrity from `Content-Length` alone.
- Memory consumption should remain bounded with multi-gigabyte outputs; test with a mocked streaming response and aborted transfers.

**Why:** One long WAV/FLAC stem can make buffering the complete output impractical. This is the most immediately useful standalone improvement.

### S02 — Typed account, queue, history and billing *read* endpoints
**Priority:** P0 · **Effort:** M · **Gap:** These upstream routes have no convenience methods or response types.

**Proposed surface:**
- `getUser()` → `GET /app/user`: credit balance (`premium_minutes`), premium enabled, active queue and preferences.
- `getQueue()` → `GET /app/queue`; `getQueueSummary()` → `GET /app/queue/summary`: own queued/processing, ahead and estimated wait.
- `getSeparationHistory({start, limit})` → `GET /app/separation_history`.
- `getPurchases({status, limit, offset})` → `GET /purchases`.
- `getCreditAlert()` → `GET /credit_alert`.

**Acceptance criteria:** Export documented DTOs, paginate only within server limits (history 20/page; purchases 100/page), preserve unknown JSON properties, and use established retry/key handling. Avoid returning API tokens from `getUser()` unless explicitly requested; never log the token. Return nullable queue ETA as `null`, not zero.

**Why:** Needed for credit-aware automation, completed-job recovery and displaying truthful queue status. Use one coherent typed extension, not five disconnected helpers.

### S03 — Cost estimates and explicit credit-spend guardrails
**Priority:** P0 · **Effort:** M · **Gap:** A caller can submit a premium algorithm without a built-in estimate/budget check.

**Proposed API:** `estimateJobCredits({algorithm, durationSeconds, ...})`, with an optional `maxEstimatedCredits`/confirmation policy on high-level submission (do **not** silently apply it to the low-level `createSeparation()`).

**Acceptance criteria:**
- Use currently returned algorithm `price_coefficient` and the documented formula `max(1, floor(durationSeconds * price_coefficient / 60))` as an **estimate**, not a guaranteed quote.
- Treat missing duration, unavailable coefficient, preset compositions, nonstandard algorithms and account-specific pricing as **unknown**, never as free or zero.
- Optionally check `getUser()` balance and `premium_enabled` just before submit; fail explicitly when a requested spend cap cannot be verified.
- Report per-job and per-batch estimated consumption, while distinguishing credits, currency, and free-tier queue behavior.
- Never auto-enable premium usage or purchase credits as part of a submission.

**Why:** Long audio, high-cost models and retries can spend credits unexpectedly. Upstream also exposes a low-credit alert endpoint.

### S04 — Algorithm metadata-driven request builder and validator
**Priority:** P0 · **Effort:** M · **Gap:** `sepType`, `addOpt1..3` and `additionalOptions` are largely caller-controlled; the SDK does not use the discovered model schema to validate them (`src/types.ts`; `src/client.ts:115-142`).

**Proposed API:** `getAlgorithm(renderId)`, `prepareSeparation({ algorithmId, input, options, ... })` and/or `validateSeparation(input, algorithm)`. Keep the existing escape hatch for new/unrecognized models.

**Acceptance criteria:**
- Validate `audio_widget` input kind (`single_upload`, `matchering_upload`, `no_upload`), `orientation`/access visibility, valid option keys and `default_key` from `algorithm_fields`.
- Map human-oriented options into the documented `add_opt1`/`add_opt2`/`add_opt3` fields deterministically; never guess model IDs or meaning.
- Recognize preset runs as a different configuration path and reject ambiguous combinations consistently (especially ignored `addOpt*`/`outputFormat` with `presetId`).
- Expose structured validation errors and allow a documented `strict: false` mode for API evolution.
- Unit tests fixture current algorithm shapes and unknown fields, without requiring real paid requests.

**Why:** Reduces invalid jobs and model-specific boilerplate while keeping pace with a changing catalog.

### S05 — Durable job handles and process-restart recovery
**Priority:** P0 · **Effort:** M · **Gap:** The hash-to-key mapping lives only in `jobKeyAffinity` memory; `bindJobToApiKey()` must currently be called manually after restart.

**Proposed API:** `createJob()` returning a serializable `MvsepJobHandle`, `resumeJob(handle)`, `waitForJob(handle)`, `save/restoreJobHandles` via a *user-provided* storage adapter.

**Acceptance criteria:**
- Persist job hash, selected account/key identity **without writing API-key secrets**, region/base URL where appropriate, model/preset, input identity and created-at.
- Resume polling and downloads without reissuing `POST /separation/create`; preserve explicit job-key affinity.
- Handle removed/expired jobs, canceled jobs and changed key lists with clear errors; key **index alone** is unstable when keys are reordered. Persist a nonsecret stable key identifier supplied by the consumer.
- Support user-managed stores (file, SQLite, KV) without baking a database dependency into the core SDK.
- On an ambiguous create transport failure, report an **unknown submission outcome**, not auto-recreate the job.

**Why:** Long-running jobs should survive crashes and machine restarts without causing duplicate charges.

## P1 — consumer-driven conveniences

### S06 — Optional multi-job scheduler and batch orchestration
**Priority:** P1 · **Effort:** L · **Depends on:** S02, S03, S05.

**Proposed API:** `runBatch(inputs, { maxActiveJobs, maxEstimatedCredits, onJobEvent, checkpointStore, ... })` as a separate module/subpath, not behavior implicit in every client.

- Respect **server-side job concurrency** (non-Premium accounts are documented as limited to one concurrent job); distinguish this from the SDK's current HTTP request semaphore.
- Queue inputs without submitting everything at once; support stop/pause/resume, per-item progress, cancel-vs-abort semantics and partial success.
- Preflight budgets, keep a durable manifest, deduplicate *within a user-selected batch* by explicit input/model/options identity; never assume MVSep itself deduplicates or guarantees idempotency.
- Do not rotate API keys merely to evade per-account quota; keys may belong to the same account.
- Test failures at every stage (queued, submitted, processing, completed, downloading) and verify a restart never submits a known existing hash.

**Why:** Batch stem separation is a realistic consumer use case, but belongs one layer above the clean transport SDK.

### S07 — Result normalization and one-call output materialization
**Priority:** P1 · **Effort:** M · **Depends on:** S01.

**Proposed API:** `getOutputFiles(result)` and `downloadSeparationOutputs(resultOrHash, destination, options?)`.

- Normalize output `name`, `url`/`link`, size and metadata into a typed structure, retaining raw response fields.
- Distinguish algorithm-separated stems from preset-run Output nodes (`data.type = preset_run`); **never assign vocals/drums/bass from filename order**.
- Handle duplicate/missing/unsafe names with deterministic collision rules; return a manifest of created paths and skipped/error files.
- Offer per-file and aggregate download progress; avoid unbounded simultaneous file transfers.

**Why:** Today's caller has to interpret loosely typed `SeparationResultData.files` and download each file independently.

### S08 — Disk-backed uploads and optional upload progress
**Priority:** P1 · **Effort:** M · **Gap:** `fileFromPath()` reads the complete file into memory; the `BinaryPart` type already supports Blob, but there is no file-backed convenience path.

**Proposed API:** `fileBlobFromPath(path)` and/or `createSeparationFromFile(path, inputOptions)`.

- Use lazily opened native file-backed Blobs where available (Node and Bun); keep runtime support explicit.
- Expose upload byte progress only through an adapter or transport that can accurately observe it; **standard Fetch + FormData does not promise portable upload progress**.
- Preserve multipart filename/content type and replayability under the existing conservative create retry policy.
- Test large files, readable paths, aborts, and the distinction between request upload completion and remote processing completion.

### S09 — Webhook receiver/reconciler utilities
**Priority:** P1 · **Effort:** M · **Gap:** `webhookUrl` is supported when creating a job, but the SDK provides no webhook-side helper.

**Proposed API:** A runtime-neutral `parseWebhook(body)` and `reconcileWebhook(jobHandle, payload, getSeparation?)` with optional framework adapters.

- Deduplicate at-least-once deliveries, reject malformed payloads, correlate by hash/account and reconcile against polling when necessary.
- Treat webhook payloads as **untrusted**; do not assume an HMAC/signature exists unless MVSep documents one. Let the application enforce secret URL, gateway, authentication or independent verification.
- Never use an incoming webhook to trigger a new paid submission.
- Keep an example for a small Bun/Node HTTP server.

### S10 — Account preferences and notifications
**Priority:** P1 · **Effort:** S · **Depends on:** S02.

**Proposed API:** `setCreditAlert(threshold)`, `setPremiumUsageEnabled(boolean)`, `setLongFilenamesEnabled(boolean)`.

- Wrap the documented `/credit_alert`, `/app/enable_premium`, `/app/disable_premium`, and long-filename toggle endpoints.
- Keep **all state-changing calls explicit**; no side effect in a constructor, retry policy or `getUser()`.
- Clarify that toggling premium usage controls the account setting, not the credits spent for one specific job.
- Test expected 4xx/business-level failures and never silently retry ambiguous state-changing operations.

### S11 — Paginated model discovery, demos and quality benchmarks
**Priority:** P1 · **Effort:** M · **Depends on:** S02/S04 types.

**Proposed API:** `getDemoSeparations(filters)`, `getQualityLeaderboard(filters)`, `getQualityEntry(id)`, optionally `getNews()`.

- Use upstream `/app/demo`, `/quality_checker/leaderboard`, `/quality_checker/entry`, and `/app/news`.
- Expose real filter semantics: algorithm ID and `options[FIELD]` for demos; dataset type, sortable SDR key, text filter and pagination for benchmarks.
- Provide optional helper `rankAlgorithmsByBenchmark({ datasetType, stemMetric })` only where the selected metric/dataset genuinely matches the use case.
- Treat leaderboard results as *reference evidence*, not guaranteed quality on a user's song; never choose a costly algorithm automatically.

**Why:** Helps consumers discover suitable algorithms without maintaining hand-written ranking tables.

### S12 — Better queue-aware status presentation
**Priority:** P1 · **Effort:** S–M · **Depends on:** S02.

**Proposed API:** `watchJob(hash, options)` yielding an async stream of consolidated `job`, `queue`, and `download` states; optionally include documented queue estimates.

- Keep `waitForSeparation()` and its existing progress callbacks intact.
- Join per-job `current_order`/`queue_count` with `/app/queue/summary` without implying a per-job guaranteed ETA.
- Respect `estimated_wait_seconds: null` (unknown), poll budgets and aborts; avoid unnecessary queue calls per active job.
- An async iterable allows `for await` consumption without establishing a GUI-specific event layer.

### S13 — Caching and offline metadata snapshots
**Priority:** P1 · **Effort:** S–M · **Depends on:** S04.

**Proposed API:** Optional cache adapter and TTL for `getAlgorithms()`, plus explicit `refresh`/invalidate.

- Never cache account-specific balances or job status under the public catalog cache.
- Preserve new/unknown algorithm fields and allow offline *validation* from a saved snapshot; never claim a saved model is currently available.
- Add fixture-backed contract tests against the published OpenAPI specification and representative live responses, without paid submissions.

## P2 — defer until there is a concrete consumer

### S14 — Separate `mvsep` CLI for everyday audio pipelines
**Priority:** P2 · **Effort:** M · **Depends on:** S01/S05/S06/S07.

Optional binary/subpackage with `models`, `submit`, `status`, `resume`, `cancel`, `download` and `batch`. Accept paths/URLs, JSON output and clear exit codes. Store credentials in environment variables/keychain integration, never in the batch manifest. Keep the SDK dependency-free and do **not** make a GUI a prerequisite.

### S15 — Explicit local artifact cache / content deduplication
**Priority:** P2 · **Effort:** M.

Optional content-hash and job-config keyed manifest that can reuse **already downloaded local outputs**. Confirm algorithm ID/options, format, source identity and user/account context. Avoid automatic reuse across distinct copyrighted inputs or accounts, account for model version drift, and never equate matching filenames with matching audio. Do not use the cache to promise that the MVSep service will avoid charging.

### S16 — Developer-facing diagnostics and integration recipes
**Priority:** P2 · **Effort:** S–M.

Provide optional structured event subscriptions and pluggable instrumentation for timings (waiting, upload, queue, processing, transfer), attempts and bytes, with key-safe diagnostics. Add tested end-to-end recipes: large-file submission, separated outputs, crash recovery, webhook reconciliation, and batch with credit cap. Note that existing `onProgress` is already functional; this is additive instrumentation, not a proposed replacement.

## Important boundaries / things *not* to build by default

1. **No automatic ambiguous job recreation.** Current `unsafeCreateRetries: "safe"` guards against double billing. Never hide the trade-off under “reliability”.
2. **No mandatory UI, CLI, database or web framework in the core package.** Higher-level workflows should be optional entrypoints.
3. **No baked-in static algorithm lists or alleged “best model” defaults.** MVSep publishes live algorithm metadata, pricing and optional quality results; consumers may value different stems.
4. **No automatic region hopping during a create request.** The documented apex endpoint geo-steers requests; output files remain on the creation region. Transport failures after submission are ambiguous.
5. **No storing plaintext API keys in manifests or error logs.** `getUser()` itself may include `api_token`; serialized SDK state should not.
6. **No misleading completion semantics.** Canceling a local `AbortSignal` stops waiting, not necessarily the server job; only explicit `cancelSeparation()` requests server cancellation.
7. **No automatic account registration/password login flow unless a consumer requires it.** An API-key SDK should avoid taking on password handling without clear benefit.

## Proposed sequence and definition of done

| Milestone | Deliverables | Required proof |
| --- | --- | --- |
| **M1 — Work with large results** | S01, S07 | Bounded-memory streaming tests; partial-write cleanup; stable output manifest |
| **M2 — Know the account and price** | S02, S03 | Typed fixtures for each endpoint; accurate unknown-price semantics; no surprise submission |
| **M3 — Safer submissions** | S04, S05 | Live-metadata-shaped option tests; crash/restart simulation; zero duplicate-create on resume |
| **M4 — Automate carefully** | S06, S08 | Multi-file load/abort tests; account job limits; persistent partial-success ledger |
| **M5 — Enrich as needed** | S09–S16 by demand | Contract, error, security and failure tests for each chosen feature |

At each milestone: retain Node >=20/Bun compatibility, zero mandatory runtime dependencies, typed exported contracts, stable low-level methods and conservative retry behavior. Run `bun run check`, `bun run test` and `bun run build`; add new tests for each implemented feature. Documentation-only suggestions here do **not** imply that these future tests have been run.

## Source notes

- Repository implementation: `src/client.ts`, `src/types.ts`, `src/key-pool.ts`, `src/rate-limiter.ts`, `test/client.test.mjs`.
- Live MVSep API (accessed 2026-10-08): [full API](https://mvsep.com/en/full_api), [published OpenAPI spec](https://mvsep.com/misc/mvsep-openapi-spec.json).
- Upstream documents one active concurrent job for non-Premium accounts; this differs from this SDK's HTTP `maxConcurrency`.
- Upstream documents that preset runs return Output-node entries (not necessarily stem labels), and that output download URLs point to the region that processed them.
- No authenticated, credit-consuming live API call was necessary to compile these suggestions.
