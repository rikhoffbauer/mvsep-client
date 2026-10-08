# CODE_REVIEW — mvsep-client

| Review metadata | Value |
|---|---|
| Reviewed | 2026-10-08 |
| Repository | `/Volumes/Repositories/mvsep-client` |
| Branch / source commit | `main` / `7c087f3` (pre-existing working-tree edits also inspected) |
| Package | `@rikhoffbauer/mvsep-client@0.1.0` |

**Scope:** Full tracked project: `src/**` (including every implementation and type declaration), `test/client.test.mjs`, `examples/basic.ts`, `README.md`, TypeScript configurations, package metadata, lockfile, and build/package output. No production MVSep jobs were submitted; API-facing behavior was checked against official documentation and deterministic mocked requests.

## Executive assessment

**Release recommendation: address the high-severity findings before relying on this client for unattended or paid job processing.**

The SDK has a coherent, dependency-free implementation with useful features: conservative create retries, regional endpoints, API-key rotation and job affinity, typed API errors, a token-bucket limiter, job polling, and progressive download reporting. The documented primary endpoints and multipart field names agree with the published MVSep API. The existing happy-path and selected failure-path tests pass.

However, several important invariants do **not** hold. A request can outlive its timeout indefinitely after receiving response headers; a concurrency slot is released before consuming the response body; aborting work waiting for a semaphore does not reliably settle its promise; public error properties expose authentication tokens; authenticated raw calls can replace or duplicate those tokens; and a progress callback can turn a successfully accepted paid job into a reported failure. These are confirmed with local reproductions, not hypothetical stylistic criticisms.

**Findings:** 6 High, 13 Medium, 4 Low. **All 23 are open** as of this review. The risk rankings refer to this client as a reusable SDK, not necessarily to every application that consumes it.

## Review method and evidence

1. Inventoried all 16 tracked files, the current working tree, commit history, emitted `dist` artifacts, and npm publication contents.
2. Read all implementation modules and the complete test suite; traced every exported method through authentication, retries, rate limiting, aborts, parsing, and resource cleanup.
3. Cross-checked endpoint names, parameters, response states, mirror requirements, regions, and credential placement against [MVSep's official API reference](https://mvsep.com/en/full_api) (accessed 2026-10-08).
4. Executed type checking, build, tests, package dry run, and Node's test coverage instrumentation.
5. Ran isolated mock-fetch reproductions for authentication overrides, token leakage, stalled body streams, concurrency, cancellation, malformed responses, callback failures, timeouts, and polling/listener behavior.
6. Classified issues by impact and confidence, then specified minimal fixes and regression tests. **No implementation files were modified**.

### Baseline checks

| Check | Result |
|---|---|
| `bun --version` | `1.4.2` |
| `node --version` | `v26.7.0` |
| `bun run check` | **PASS** |
| `bun run test` (Node test runner) | **PASS**, 9 tests / 9 passed |
| `bun test test/client.test.mjs` (Bun test runner) | **PASS**, 9 tests / 9 passed |
| `bun run build` | **PASS** (also run by the test script and prepack) |
| `npm pack --dry-run --json` | **PASS**, package contents include ESM JS and declarations |
| Clean offline installation of packed `.tgz` | **PASS**, Node ESM import and TypeScript declaration import |
| `node --experimental-test-coverage --test test/client.test.mjs` | **66.53% line / 61.71% branch / 70.93% function** across emitted JS |
| Implementation-specific coverage | `dist/client.js`: 66.05% lines, 57.87% branches; `dist/rate-limiter.js`: 41.67% lines |
| Tests against real authenticated MVSep service | **NOT RUN**; would require credentials and could initiate chargeable work |
| CI, lint, dedicated security and integration tests | **NOT CONFIGURED** in tracked project |

Coverage is Node's *compiled JavaScript* coverage; it is not a source-mapped TypeScript coverage measurement. Both Node's and Bun's test runners passed the existing suite, and a packed dependency imported successfully in a clean offline consumer; **the declared minimum Node 20 version was not independently tested**. Mocks demonstrate client-side outcomes and should not be mistaken for evidence about MVSep server behavior.

### Severity guide

- **High:** credential exposure, potentially duplicated/incorrectly reported billable work, indefinite waits, broken cancellation, or a violated concurrency guarantee.
- **Medium:** significant resilience, operational, resource-use, protocol-validation, or testability defects.
- **Low:** configuration/documentation/build quality or narrower API-contract inconsistencies.

## Findings index

| ID | Severity | Issue | Evidence |
|---|---|---|---|
| H01 | High | API key appears in exposed error URL | Reproduced |
| H02 | High | Authenticated raw requests allow overriding or duplicating `api_token` | Reproduced |
| H03 | High | HTTP timeout stops before response body is read | Reproduced |
| H04 | High | HTTP concurrency limit excludes response body consumption | Reproduced |
| H05 | High | Aborted queued semaphore acquisition can wait indefinitely | Reproduced |
| H06 | High | Progress callback can reject an already-successful create | Reproduced |
| M01 | Medium | Abort listeners leak on successful sleeps | Reproduced |
| M02 | Medium | Polling `maxWaitMs` is not an overall deadline | Reproduced |
| M03 | Medium | Response-body I/O errors bypass typed error and retry handling | Reproduced |
| M04 | Medium | Non-JSON HTTP 429 loses rate-limit handling | Reproduced |
| M05 | Medium | `createAndWait` ignores `timeoutMs` during creation | Reproduced |
| M06 | Medium | `mirror: true` can be sent without the required API key | Reproduced + API docs |
| M07 | Medium | Polling assumes valid JSON response schema without checking it | Static analysis + mock |
| M08 | Medium | Abort while throttled leaks untyped `AbortError` | Reproduced |
| M09 | Medium | Job-to-key affinity accumulates indefinitely | Static analysis |
| M10 | Medium | Upload/download paths buffer and duplicate entire audio payloads | Static analysis |
| M11 | Medium | Downloads bypass core retry/rate/concurrency policies | Static analysis |
| M12 | Medium | Download reader is not canceled on failure of processing/callback | Static analysis |
| M13 | Medium | Critical failure paths have no regression tests or CI gate | Measured |
| L01 | Low | `unsafeCreateRetries: "never"` still retries unauthorized creates | Reproduced |
| L02 | Low | Numeric configuration values are insufficiently validated | Static analysis |
| L03 | Low | Published source maps point to source files omitted from package | Package inspection |
| L04 | Low | `getRemoteSeparation` silently ignores the exposed `mirror` option | Static analysis |

## High severity — detailed findings

### H01 — API credentials leak through `MvsepError.url`

**Location:** `src/client.ts:530-538`, `578-612`, `617-660`; `src/errors.ts:13-29`.

Authenticated GETs are deliberately formed with `?api_token=<secret>`, per the API's requirements. The complete URL, including this secret, is subsequently stored as the public `url` property on timeout, HTTP, authentication, and parse errors. Consumers commonly print, serialize, report, or forward error objects to telemetry. This turns an expected API failure into potential credential disclosure.

**Reproduction:** Mock `GET /separation/get` to return HTTP 503, call `getSeparation("jobid")`, and inspect the caught `MvsepHttpError.url`. It contains `api_token=key-secret`.

**Fix:** Redact `api_token` and any other credential-bearing query parameter *before* populating errors/events/logs, using a centralized URL sanitizer. Keep the original URL private to the HTTP implementation. Test every error subclass and avoid including signed download URL secrets. Never write real API credentials to test output.

### H02 — Raw authenticated request inputs can supersede authentication

**Location:** `src/client.ts:530-538`, `704-713`; contrast with `129-151`.

For GET, the computed auth token is spread into a query object **before** user-supplied `options.query`, so `request({ authenticated: true, query: { api_token: "attacker" } })` sends the wrong token. For non-GET, `buildRawForm` first calls `form.set("api_token", selectedKey)`, then `appendFormValue` allows `form.api_token` to be appended, yielding duplicate authentication fields. Server behavior in the duplicate-value case depends on multipart decoding order; it is not safe to assume the chosen pool key wins. The create wrapper separately forbids this through `additionalOptions`, but the generic escape hatch does not.

**Reproduction:** A mocked authenticated GET's final URL contains `api_token=attacker`; the corresponding POST `FormData.getAll("api_token")` returns `["key-secret", "attacker"]`.

**Fix:** Reject `api_token` in both raw `query` and raw `form` whenever `authenticated: true` (or define an explicit, separate manual-credential mode). Assemble the selected token last and exactly once. Add GET and POST spoofing/duplication tests.

### H03 — A stalled response body is not subject to HTTP timeout

**Location:** `src/client.ts:564-600`.

The composed abort signal and timer are cleaned up in `finally` immediately after `fetchImpl` resolves its `Response` object, *before* `await response.text()`. Fetch normally resolves when headers arrive, not when the full response body is read. A server can return headers and then stall indefinitely: `timeoutMs` and `requestTimeoutMs` no longer protect the consumer.

**Reproduction:** Mock fetch with `new Response(new ReadableStream({ start() {} }))` and configure `requestTimeoutMs: 15`. The request was still unsettled after 100 ms.

**Fix:** Keep the abort signal/timer alive until response bytes are fully consumed and parsed (or explicitly cancel the body). Add a headers-fast/body-never-finishes timeout test, including retry behavior for idempotent operations.

### H04 — Concurrency allowance is released while HTTP bodies are still in flight

**Location:** `src/client.ts:564-599`; `src/rate-limiter.ts:76-112`.

`release()` runs in the same `finally` as the prematurely cleaned-up timeout. Therefore the semaphore limits only the header-fetch phase, not in-flight responses. Under delayed or streaming bodies, the configured `maxConcurrency` can be greatly exceeded, increasing memory usage and socket pressure.

**Reproduction:** With `maxConcurrency: 1`, mocked fetch immediately returns responses whose readable streams remain open. A second request enters fetch while the first body's stream is unconsumed: **two bodies in flight with a limit of one**.

**Fix:** Hold the semaphore until the body is completely processed or canceled. Include concurrent long-body tests that assert maximum active fetch+read operations, including exceptions and aborts. This can be fixed together with H03, but both invariants need explicit tests.

### H05 — Pre-aborted requests can remain stuck in the semaphore queue

**Location:** `src/rate-limiter.ts:82-103` and `src/client.ts:564-567`.

`Semaphore.acquire` only registers a future `abort` event after pushing a waiter, without first checking `signal.aborted`. A signal aborted before being queued will not re-emit that event, leaving the waiting promise unresolved until some other request releases a slot. The request timeout is only started *after* semaphore acquisition, so the advertised timeout cannot rescue it.

**Reproduction:** Occupy `maxConcurrency: 1` by making the first mocked `fetch` promise wait before returning response headers. Queue a second request using an already-aborted signal. It remained pending after 35 ms instead of rejecting; when the first fetch was released, the second request proceeded and **succeeded despite the aborted signal** because the mock transport did not enforce cancellation.

**Fix:** Reject already-aborted signals at all acquisition and queue-entry boundaries; remove canceled waiters, and make the queue abortable while it is waiting. Cover pre-aborted and mid-queue aborts with and without future semaphore releases. Normalize the public error to `MvsepAbortError`.

### H06 — A successful, paid create can be reported as a failure if a progress listener throws

**Location:** `src/client.ts:663-669`, `732-735`, `255-299`.

After a successful HTTP response, `execute` emits a `request / success` event *inside the same catchable operation*. If `onProgress` throws, that exception rejects `createSeparation` even though the server has accepted the job and returned its hash. The outer create method never receives the response, so it cannot bind the job/key or return the hash. An application may submit a duplicate job to recover from the perceived failure, potentially spending credits again.

**Reproduction:** Mock a successful create payload with hash `created` and throw `new Error("listener failed")` from the success progress callback. `createSeparation` rejects with the listener's error; the hash is not returned or bound.

**Fix:** Isolate observer/callback exceptions from request success/failure state. Prefer a dedicated callback-error reporting hook or configurable listener error policy; do not reclassify a successful create as a failed transport or API operation. Cover failures from *both* global and local callbacks, including start/retry/poll/success events.

## Medium severity — detailed findings

### M01 — AbortSignal listeners accumulate on successful waits

**Location:** `src/client.ts:181-195`, `src/rate-limiter.ts:6-25`.

Both sleep helpers register one-shot abort listeners. Those listeners are only removed if the signal aborts, **not** when the timer resolves normally. Long-running polling with the same signal retains closures/timers and can trigger EventTarget listener warnings; throttling/retry backoff has the same pattern.

**Reproduction:** Complete a separation after 15 status polls with a 1 ms interval; `getEventListeners(signal, "abort").length` was **14 after completion**. No listeners should remain.

**Fix:** Resolve, abort, and cleanup via one settled-once path that always clears the timer and removes the listener. Test listener counts after successful polls, timeouts, and aborts.

### M02 — `maxWaitMs` does not impose a wall-clock deadline on polling

**Location:** `src/client.ts:356-399`.

Elapsed time is compared with `maxWaitMs` only *before* the next request. A slow `getSeparation` (including internal retries, cooldown sleeps, and response-body reads) may complete later, and the SDK still returns the result. This makes deadlines unreliable for UI operations and scheduled workloads.

**Reproduction:** With `maxWaitMs: 10`, a mock response taking ~65 ms returned `done` after **67 ms**, rather than timing out.

**Fix:** Compute a single deadline at start, derive remaining time before each request/backoff, and combine it with the caller signal. Distinguish total polling deadline from per-request timeout. Test slow requests, cooldown/retry, and final sleeps.

### M03 — Response-body read failures escape the retry/error pipeline

**Location:** `src/client.ts:599-615` and `669-730`.

`response.text()` occurs after the fetch-specific exception wrapper has exited. A stream error thrown from `response.text()` is captured by the broad outer catch as a raw error; `shouldRetry` requires `MvsepError` and therefore never retries it, even for idempotent GET requests. Error objects also lose method, sanitized URL, key index, and transport classification.

**Reproduction:** A `ReadableStream` whose controller errors with `Error("stream broke")` causes `client.request` to throw a plain `Error`, not `MvsepError`.

**Fix:** Wrap the complete transport lifecycle, including body read and decoding, in one typed error translation boundary; distinguish parent abort, request timeout, response parse, and retryable I/O error. Never retry a create body-read ambiguity under the safe policy.

### M04 — Malformed 429 responses bypass `Retry-After` and key cooldown

**Location:** `src/client.ts:599-615`, `628-653`.

The client tries to parse JSON before classifying the HTTP status. A `429` with non-JSON text raises `MvsepHttpError` with `retryable: false`, rather than `MvsepRateLimitError`; it does not read `Retry-After` or cool down the offending key. Non-JSON API/gateway responses are plausible during overload.

**Reproduction:** A response with HTTP `429` and body `not json` raised `MvsepHttpError`, with key `cooldownUntil === 0`.

**Fix:** Classify 401/429 and relevant retryable status codes independently of JSON parse success. Preserve a bounded raw body snippet, parse `Retry-After` even if the body is HTML/plaintext, and test all response-content permutations.

### M05 — `createAndWait` drops its own `timeoutMs` during creation

**Location:** `src/client.ts:402-410`; `src/types.ts:184-194`.

`CreateAndWaitOptions` inherits `timeoutMs` but `createAndWait` only passes `signal`/`createSignal` and `onProgress` to `createSeparation`. The initial POST therefore uses the client's global timeout while subsequent polling GETs use the caller's per-request timeout. Large file uploads are especially likely to expose this discrepancy.

**Reproduction:** Client default `requestTimeoutMs: 15`, `createAndWait(..., { timeoutMs: 300 })`, and a mocked create taking 45 ms: creation times out after ~15 ms.

**Fix:** Forward `timeoutMs` to `createSeparation` (or introduce clearly distinct `createTimeoutMs` and `pollRequestTimeoutMs`). Add a create-and-wait timeout propagation test.

### M06 — Mirror mode does not enforce the API's credential requirement

**Location:** `src/client.ts:301-313`.

`getSeparation` marks the call authenticated only if keys happen to be configured. `mirror: true` is accepted even with no keys, producing `?hash=...&mirror=1` without `api_token`. Official MVSep documentation states that `mirror=1` requires an API token and one credit. The current client needlessly sends an invalid/charge-relevant request instead of diagnosing configuration locally.

**Reproduction:** A no-key client with `getSeparation("hash", { mirror: true })` sent an unauthenticated mirror URL.

**Fix:** If `mirror` is true, require a usable key before the request. Add a no-key rejection and valid-key serialization test; document the one-credit API behavior.

### M07 — Convenience methods do not validate get-result envelopes before polling

**Location:** `src/client.ts:251-253`, `301-325`, `356-399`, `663-668`; `src/types.ts:61-66`.

`execute<T>` returns `payload as T` with no runtime validation; `getSeparation` and `getRemoteSeparation` likewise trust the generic cast. Empty HTTP 200 bodies return `undefined`; structurally invalid objects can cause a `TypeError` in `waitForSeparation` or lead to polling an undefined/unrecognized status until the deadline. The `(string & {})` status type gives flexibility but no runtime guard.

**Reproduction:** Mocked `HTTP 200` with an empty body returned `undefined` from `request` without an API/parse error. Separately, `getSeparation` accepted `{"success":false}` without a `status`, and `waitForSeparation` repeatedly polled that same malformed envelope until raising `MvsepTimeoutError` instead of diagnosing the malformed response.

**Fix:** Validate nonempty JSON objects and required get-result fields (`success` boolean, `status` recognized/string, consistent `data`) at the convenience-method boundary. Fail fast with `MvsepApiError` and a bounded diagnostic snippet. Generic raw `request<T>` can remain an explicitly unchecked escape hatch.

### M08 — Aborts during rate throttling are not normalized to `MvsepAbortError`

**Location:** `src/rate-limiter.ts:6-25`, `src/client.ts:561-564`, `669-670`.

The rate limiter rejects with the underlying `AbortSignal.reason` or a DOM `AbortError`. The outer request catch sees `options.signal.aborted` and rethrows the original error unchanged, contrary to the typed-error API implied by `MvsepAbortError`.

**Reproduction:** First request consumes a one-token burst; abort the second waiting request. The rejection was a raw `AbortError` and `instanceof MvsepAbortError` was false.

**Fix:** Normalize aborts at the top-level request boundary (while retaining `cause`), including queue and backoff phases. Add tests across limiter, semaphore, fetch, parsing, and polling.

### M09 — Completed jobs permanently occupy the job-key affinity map

**Location:** `src/client.ts:215`, `236-249`, `291-299`, `331-335`, `402-410`.

Each successful create inserts a hash-to-key entry. `deleteSeparation` and explicit `forgetJobApiKey` remove it, but successful `waitForSeparation` / `createAndWait` do not. A daemon creating thousands of one-off jobs will retain those hashes for its lifetime. Some completed jobs may still need follow-up cancel/delete/status queries, so unconditional deletion at completion may be inappropriate.

**Fix:** Provide opt-in bounded affinity/TTL, explicit job-lifecycle cleanup, or a pluggable persistence/eviction policy. Document the lifetime and restore semantics. Test eviction and account-bound actions after re-binding.

### M10 — The file and download APIs require large full-buffer allocations

**Location:** `src/client.ts:108-121`, `412-452`, `738-745`.

`fileFromPath` reads an entire file, `toBlob` makes an additional `Uint8Array.from` copy before constructing a Blob, and `download` stores all chunks then allocates another final `Uint8Array` of the total size. Large stereo/multistem audio can cause substantial peak heap/RSS usage and out-of-memory failures. The download API is progressive only in progress *notifications*, not in output storage.

**Fix:** Avoid unnecessary upload copies; provide a real streaming download-to-path/`WritableStream` method, a maximum-bytes option, and a documented memory budget. Do not silently change `download(): Promise<Uint8Array>` without a versioned API decision. Include large-payload/stress tests.

### M11 — `download` is outside the shared retry, throttle, and concurrency system

**Location:** `src/client.ts:412-461`.

Downloads call `fetchImpl` directly rather than the execute pipeline. They have no backoff, `Retry-After` handling, rate limiting, concurrency cap, or key-failure policy. This may be an intentional distinction between downloading large binary outputs and calling the JSON API, but the SDK's current resilience description does not make the difference explicit.

**Fix:** Define a separate, bounded download policy (retry safe GET downloads, exponential delay, range/resume where supported, concurrency limits), or document that downloads are deliberately a raw single attempt. Test HTTP 429/503, partial stream failures, and retry safety.

### M12 — Failed downloads do not cancel/release the response reader

**Location:** `src/client.ts:432-460`.

The reader is acquired with `response.body.getReader()` but there is no reader-level `try/finally`, `reader.cancel()`, or `reader.releaseLock()`. A thrown progress callback, failed copy, or body read error can leave a stream and underlying network work active until garbage collection/cancellation elsewhere. `composed.cleanup()` merely removes the timer and does not cancel an un-aborted request.

**Fix:** Use `try/finally` around the reader loop, cancel on premature termination, release the lock, and preserve the primary exception. Add a mocked streaming response with a throwing progress listener and assert cancellation.

### M13 — Test coverage misses the most consequential code paths; no CI enforces regressions

**Location:** `test/client.test.mjs:1-175`; `package.json:18-23`; missing tracked `.github/workflows/*`.

The nine tests cover form field serialization, two key-rotation cases, one create retry condition, basic polling, and two small API protections. The measured line coverage for the limiter is only **41.67%** and the overall branch coverage **61.71%**. There are no checked-in tests for downloads, request-body timeouts, semaphore cancellation, parser failures, deadline adherence, listener removal, callback exception isolation, or pack installation in a clean consumer. There is no tracked CI job to require successful checks before merges/releases.

**Fix:** Add table-driven tests for each finding; unit-test `ApiKeyPool`, `Semaphore`, and `TokenBucketRateLimiter` directly; test Node 20 and current Bun; verify package imports/types from a clean packed install; introduce CI gates for typecheck, tests, coverage thresholds, and dry-run packing.

## Low severity — detailed findings

### L01 — `unsafeCreateRetries: "never"` is not absolute

**Location:** `src/client.ts:716-724`; `README.md:184-194`.

`shouldRetry` returns early for `MvsepAuthenticationError` before reaching the creation-specific policy. Consequently a create whose first key receives 401 is retried with another key even under `unsafeCreateRetries: "never"`. A 401 retry is plausibly *safe* because the rejected key was not accepted, but it contradicts the documented meaning of "never" and the documented "safe = only 429" wording.

**Reproduction:** With two keys, `unsafeCreateRetries: "never"`, first response 401, and second response 200, the create was attempted twice and succeeded.

**Fix:** Specify explicitly whether safe credential rotation is exempt from this option and make code plus docs consistent. Test all three modes with 401, 429, 5xx, and ambiguous transport errors.

### L02 — Invalid numeric options are silently accepted

**Location:** `src/client.ts:65-81`, `217-229`, `356-363`; `src/key-pool.ts:20-28`, `93-101`; `src/rate-limiter.ts:34-41`, `80-83`.

Examples: `maxAttempts: NaN` makes the retry loop skip entirely; `maxConcurrency: 0` silently disables concurrency enforcement; `requestsPerSecond: -1` disables the limiter (only 0/Infinity are documented); fractional concurrency/burst values are accepted. Negative polling intervals silently become zero, inviting hot loops. Some overrides are deliberate (`Infinity` RPS); others should fail fast.

**Fix:** Validate finite/nonnegative/integer/range constraints at construction and call boundaries, with specific exceptions for documented sentinel values. Test `NaN`, ±`Infinity`, zero, negatives, and fractional values.

### L03 — Source maps refer to unpublished source files

**Location:** `tsconfig.json:10-13`, `tsconfig.build.json:1-8`, `package.json:14-17`.

The published package includes `dist/*.js.map` with `../src/*.ts` source references but excludes `src` itself, and TypeScript's `inlineSources` is not enabled. This can prevent source-level debugging when consumers install the npm tarball.

**Fix:** Enable `inlineSources` (and check the published map), or include sources intentionally. Confirm the output by inspecting a packed/installed dependency.

### L04 — Remote result method accepts and discards `mirror`

**Location:** `src/client.ts:315-325`; `src/types.ts:177-182`.

`getRemoteSeparation` accepts the same `GetSeparationOptions` as `getSeparation`, including `mirror`, but never reads it. The official remote endpoint documents only `hash`, so exposing `mirror` suggests a capability that is not implemented.

**Fix:** Define a remote-specific option type without `mirror`, or explicitly reject it at runtime with a clear error.

## API compatibility matrix

Compared to [the official MVSep API documentation](https://mvsep.com/en/full_api):

| Endpoint/capability | Implementation | Review |
|---|---|---|
| `POST /separation/create` | `createSeparation` | Correct documented field names, upload modes and hash check; high-severity callback/transport caveats |
| `GET /separation/get` | `getSeparation`, `waitForSeparation` | Main fields/statuses reflected; mirror authentication and response validation deficient |
| `GET /separation/get-remote` | `getRemoteSeparation` | Correct hash query; typed mirror option ignored |
| `POST /separation/cancel` | `cancelSeparation` | Authenticated multipart hash and success check; no direct negative/ambiguous-response tests |
| `POST /separation/delete` | `deleteSeparation` | Authenticated multipart hash and success check; affinity cleanup on successful deletion |
| `GET /app/algorithms` | `getAlgorithms` | Handles array or `{ data: [] }`, scopes serialized; no direct endpoint-shape test |
| Preset runs, matchering, no-upload, remote URLs | Multipart create input | Supported; model-specific validation is intentionally delegated to API metadata |
| Other site/account/quality-check endpoints | `request<T>` | Escape hatch only; not a defect in a focused separation SDK |
| Region behavior | `normalizeBaseUrl` | Apex, DE, DE2, SG in API docs; custom regions intentionally permitted |
| 401/429 handling | `execute` | Basic JSON cases tested; malformed-body cases defective |
| File output URLs | `download` | Absolute URLs supported, but resilience/memory lifecycle needs work |

**Important external contract:** The MVSep docs state that account/job hashes can be polled from all regional endpoints, while output files are hosted by the job-owning region; the returned URLs should be used directly. The SDK's current use of absolute file URLs is consistent with this.

## Confirmed local regression evidence

Tests used mock fetch and *dummy* tokens, with no paid API calls. These results should be converted into permanent tests rather than relying on the temporary reproduction scripts:

| Scenario | Observed |
|---|---|
| Raw authenticated GET token override | URL contained `api_token=attacker` |
| Raw authenticated POST duplicate token | FormData contained `["key-secret","attacker"]` |
| GET HTTP 503 error URL | Included `api_token=key-secret` |
| Stream body never finishes, timeout 15 ms | Unsettled after 100 ms |
| Concurrency 1 with open response bodies | 2 bodies active |
| Already-aborted request queued behind a semaphore | Unsettled after 40 ms |
| Abort while rate-limited | Raw `AbortError`, not `MvsepAbortError` |
| HTTP 429 with non-JSON body | `MvsepHttpError`, no key cooldown |
| HTTP 200 with empty body | Unchecked `undefined` payload |
| Stream error while reading response | Raw `Error("stream broke")` |
| Throwing progress callback after successful create | Job hash not returned despite success payload |
| 15 status polls using one `AbortSignal` | 14 abort listeners remained |
| Poll result after slow request, `maxWaitMs: 10` | Successful return after 67 ms |
| `createAndWait` create delay 45 ms, global timeout 15 ms, per-call timeout 300 ms | Timed out on global 15 ms setting |
| `mirror: true` without keys | Sent `mirror=1` with no `api_token` |
| `unsafeCreateRetries: "never"` after initial 401 | Second create was attempted |

All observed timing values come from mocked local tests; they demonstrate missing lifecycle/deadline enforcement, not production latency benchmarks.

## Risk-weighted remediation order

**Phase 1 — correctness and credential safety (release blockers)**

1. Centralize credential sanitization; prohibit raw-request auth override/duplication (H01, H02).
2. Refactor `execute` into one fully scoped acquire → fetch → read → parse → release lifecycle, keeping timeout/signal and semaphore alive through body processing (H03, H04, M03).
3. Make semaphore and limiter queue waits cancelable immediately, even with an already-aborted signal; normalize typed abort errors (H05, M08).
4. Isolate progress listeners so observer exceptions cannot turn accepted jobs into reported failed submissions (H06).
5. Add regression tests for all four steps, including paid-create duplicate avoidance.

**Phase 2 — resilience and deadline guarantees**

6. Remove AbortSignal listeners after every successful wait; enforce one wall-clock polling deadline; fix per-call create timeout propagation (M01, M02, M05).
7. Validate convenience responses; classify 429/401 before JSON parsing; enforce mirror key requirements (M04, M06, M07).
8. Clarify the `unsafeCreateRetries` authentication exception and add retry-mode matrix tests (L01).

**Phase 3 — long-running process safety and productization**

9. Provide bounded affinity storage or cleanup controls; make large downloads streamable; correctly cancel download readers and define download retries (M09–M12).
10. Strengthen configuration validation and remote option types; improve source-map packaging (L02–L04).
11. Add CI with coverage and clean-package smoke tests, then retest against an explicitly authorized sandbox/low-risk MVSep account before release (M13).

## Regression test specification

The following tests should be part of the definition of done, with explicit assertions rather than snapshots only:

- **Authentication/security:** GET query override rejected, POST duplicate credentials rejected, error URLs sanitized, no secret in progress/retry messages, disabled-key rotation, job affinity preserved.
- **Timeout/deadline:** headers arrive but body never ends; body stream raises; fetch never returns; timeout while waiting for concurrency; overall polling deadline under slow fetch and internal retries; `createAndWait` timeout propagation.
- **Cancellation:** pre-aborted signal at entry, aborted semaphore waiter, aborted rate limiter waiter, aborted retry backoff, aborted body read, aborted download, and no leaked listeners.
- **Retry protocol:** status/body matrix for 401/408/425/429/500/502/503/504 with JSON, HTML, blank body, Retry-After seconds/date, multiple keys, and all create retry policies.
- **Parsing/API shapes:** invalid JSON, valid but empty JSON, `success:false`, missing status, unknown statuses, get-remote output, successful delete/cancel, failed delete/cancel, algorithms raw/enveloped result.
- **Resource safety:** strict max active fetch+body reads; maximum buffered download bytes; canceled download stream; bounded affinity growth; malformed option rejection; observers that throw.
- **Packaging/compatibility:** Node 20 (declared minimum), modern Node, Bun, TS declaration import, clean npm tarball import, source maps, no committed `dist`, and CI release gating.

## Positive observations

- No production runtime dependencies; straightforward ESM/TypeScript package exports.
- Conservative default for ambiguous non-idempotent create failures; retryable status list and `Retry-After` logic exist.
- Key-pool state does not expose raw keys in its `apiKeyState` snapshot; deduplicates and trims keys.
- Explicit source-mode, matchering-pair, mutually exclusive preset/model, output-format, and reserved-option validation in the create helper.
- Regional API base URL construction, scope filtering for algorithms, and documented multi-stage polling states.
- Typed error subclasses and a progress-event union are a useful foundation, though not applied consistently to every failure phase.
- Source TypeScript strictness is strong (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); current checks and published artifacts build successfully.
- Existing uncommitted package-name changes were left untouched by this review.

## Boundaries / non-findings

- No actual credential, card balance, account, quota, or live paid-job state was inspected. Interactions requiring active API keys were checked against docs and mocks.
- `request<T>` can expose endpoints that lack first-class wrappers; expanding wrapper coverage is product scope, not an intrinsic correctness defect.
- An `AbortSignal` canceling local polling need not necessarily cancel a remote billable job; that lifecycle behavior should be documented but is not assumed to be a bug.
- Default `rateLimit.requestsPerSecond: 2` is a client-side approximation, not a claim about an MVSep-enforced universal quota.
- The review did not rewrite source or silently alter the three pre-existing modified files (`README.md`, `package.json`, `bun.lock`).

## Final verdict

The foundation is viable, but **do not treat a green typecheck/nine-test run as evidence that request lifecycle, authentication integrity, or cancellation are reliable**. The highest-leverage change is to redesign the request lifecycle once, test it with controllable response streams, and then consolidate consistent authentication and observer boundaries. After those release blockers are fixed, the medium-severity reliability and resource issues should be addressed before scaling to long-running automated workloads.
