# MVSep TypeScript client

A resilient, typed client for the [MVSep API](https://mvsep.com/en/full_api), designed for Bun and modern Node.js.

Runtime dependencies: **none**. It uses the standard Fetch, FormData, Blob, AbortController and Web Streams APIs.

## Features

- Create separation jobs from local binary data, remote URLs, presets, no-upload models, or matchering target/reference inputs.
- Poll jobs automatically through `waiting`, `processing`, `distributing`, `merging`, and terminal states.
- Exponential backoff with configurable jitter and `Retry-After` support.
- Conservative retry semantics for job creation to avoid accidental duplicate paid jobs.
- Client-side token-bucket rate limiting and maximum request concurrency.
- Multiple API keys with round-robin/sticky selection, invalid-key disabling, 429 cooldowns, automatic rotation, and per-job key affinity for account-bound operations.
- Structured progress events for HTTP attempts, throttling, retries, key rotation, queue state, and distributed-job chunk progress.
- Request timeouts and `AbortSignal` cancellation everywhere.
- Typed error hierarchy carrying HTTP status, parsed API response, URL/method, retryability and API-key index.
- Progressive output downloads.
- Regional API endpoint support (`apex`, `de`, `de2`, `sg`) plus custom `baseUrl`.
- Escape hatch via `client.request<T>()` for current/future MVSep endpoints that do not yet have a convenience method.

## Install from GitHub

The project is directly installable from its GitHub repository. No npm-registry publication is required.

```bash
# npm resolves Git dependencies and executes the package's build/prepare script
npm install github:rikhoffbauer/mvsep-client

# Or use Git+SSH
npm install git+ssh://git@github.com/rikhoffbauer/mvsep-client.git

# Bun requires explicit trust to execute build scripts for Git dependencies
bun add --trust github:rikhoffbauer/mvsep-client
```

For an already-installed Bun Git dependency where the build was blocked, run `bun pm trust @rikhoffbauer/mvsep-client` or add `"trustedDependencies": ["@rikhoffbauer/mvsep-client"]` to the consuming project's `package.json`, then reinstall. Git dependencies are built via `prepare`; `dist/` is deliberately not committed. Installations without lifecycle scripts enabled **will not work** from an uncompiled Git checkout.

A local development checkout works with `bun install && bun run build`. The supported runtime is Node.js 20+ or a recent Bun release.

## Quick start

```ts
import { MvsepClient, fileFromPath } from "@rikhoffbauer/mvsep-client";

const client = new MvsepClient({
  apiKeys: process.env.MVSEP_API_KEYS!.split(","),
  region: "de",
  onProgress(event) {
    if (event.type === "poll") {
      console.log({
        status: event.status,
        queue: event.queueCount,
        currentOrder: event.currentOrder,
        fraction: event.fraction,
      });
    }
  },
});

const result = await client.createAndWait({
  audiofile: await fileFromPath("song.wav", "audio/wav"),
  sepType: 20,       // Demucs4 HT
  outputFormat: 1,   // WAV 16-bit
});

console.log(result.data?.files);
```

## Remote input

```ts
const result = await client.createAndWait({
  url: "https://example.com/song.flac",
  remoteType: "direct",
  sepType: 40,
  outputFormat: 2,
});
```

`remoteType` supports `direct`, `mega`, `drive`, and `dropbox`.

## Presets

```ts
const result = await client.createAndWait({
  url: "https://example.com/song.wav",
  presetId: 635,
});
```

MVSep ignores single-algorithm fields such as `sep_type`, `add_opt*`, and `output_format` when a preset is used. The client therefore rejects providing both `sepType` and `presetId`, which catches the most common accidental ambiguity.

## Matchering inputs

```ts
const created = await client.createSeparation({
  targetAudiofile: await fileFromPath("target.wav"),
  referenceAudiofile: await fileFromPath("reference.wav"),
  sepType: 1234,
});
```

The client requires target/reference files to be supplied as a pair.

## No-upload algorithms

The client intentionally allows a create request with no audio source because MVSep has `no_upload` algorithms. Pass the model-specific values as `additionalOptions`:

```ts
await client.createAndWait({
  sepType: 62,
  addOpt1: "ambient electronic texture",
  addOpt2: 30,
});
```

## Discover algorithms

```ts
const algorithms = await client.getAlgorithms([
  "single_upload",
  "no_upload",
  "matchering_upload",
]);

for (const algorithm of algorithms) {
  console.log(algorithm.render_id, algorithm.name, algorithm.algorithm_fields);
}
```

Do not hard-code model option values unless you control the target MVSep version/account; `getAlgorithms()` exposes MVSep's current option metadata.

## API-key rotation

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_1!, process.env.MVSEP_KEY_2!],
  keyRotation: {
    strategy: "round_robin",
    rateLimitCooldownMs: 30_000,
    transientFailureCooldownMs: 5_000,
    disableKeyOnUnauthorized: true,
  },
});
```

Behavior:

- `401` / recognizable invalid-token responses disable that key for the life of the client.
- `429` cools down that key and immediately uses another usable key when available.
- With `round_robin`, new authenticated work distributes across keys.
- The key that successfully creates a job is remembered and pinned for subsequent polling/cancel/delete calls, which avoids accidentally switching accounts for private preset runs or account-bound operations.
- `client.getJobApiKeyIndex(hash)` lets you persist that affinity, and `bindJobToApiKey(hash, index)` restores it after restarting your process.
- `client.apiKeyState` exposes only key indices/status, never the secret values.

## Rate limiting and concurrency

```ts
const client = new MvsepClient({
  apiKeys: process.env.MVSEP_API_KEY,
  rateLimit: {
    requestsPerSecond: 2,
    burst: 2,
    maxConcurrency: 4,
  },
});
```

Defaults are deliberately conservative because MVSep does not publish a universal HTTP request-rate quota. Set `requestsPerSecond: Infinity` to disable the client-side request-rate ceiling.

This is separate from MVSep's job concurrency rules.

## Retry policy

```ts
const client = new MvsepClient({
  apiKeys: process.env.MVSEP_API_KEY,
  retry: {
    maxAttempts: 6,
    baseDelayMs: 500,
    maxDelayMs: 20_000,
    jitter: "full",
    unsafeCreateRetries: "safe",
  },
});
```

Retryable responses default to `408`, `425`, `429`, `500`, `502`, `503`, and `504`.

### Important: create requests are not idempotent

MVSep does not document an idempotency key. A connection can fail *after* the server accepted a create request, so automatically replaying a transport failure or arbitrary 5xx can create a duplicate job and potentially consume credits twice.

For that reason:

- `unsafeCreateRetries: "never"`: never retry create calls.
- `unsafeCreateRetries: "safe"` (default): retry explicit `429` rejection only.
- `unsafeCreateRetries: "aggressive"`: apply the general retry policy to create calls too; use only if duplicate jobs are acceptable.

Idempotent GET/cancel/delete operations use the normal automatic retry policy.

## Polling

```ts
const result = await client.waitForSeparation(hash, {
  intervalMs: 2_000,
  maxIntervalMs: 10_000,
  backoffFactor: 1.15,
  maxWaitMs: 30 * 60_000,
});
```

A failed or missing job throws `MvsepJobFailedError` by default. Set `throwOnFailed: false` if you want the terminal `SeparationResult` returned instead.

For distributed jobs, poll events expose `finishedChunks`, `allChunks`, and a computed `fraction` when the API supplies them.

## Cancellation and timeouts

```ts
const controller = new AbortController();

const promise = client.createAndWait(
  { url: "https://example.com/song.wav", sepType: 20 },
  { signal: controller.signal, maxWaitMs: 15 * 60_000 },
);

controller.abort();
await promise;
```

HTTP request timeout defaults to 60 seconds and is configurable globally or per request. Polling has a separate `maxWaitMs` (30 minutes by default).

## Progress events

```ts
const client = new MvsepClient({
  apiKeys: ["..."],
  onProgress(event) {
    switch (event.type) {
      case "request":
      case "rate_limit":
      case "retry":
      case "key_rotation":
      case "poll":
        console.log(event);
    }
  },
});
```

A method-specific `onProgress` can also be supplied. Global and local listeners both receive events.

## Download progress

```ts
const bytes = await client.download(outputUrl, {
  onProgress({ loaded, total, fraction }) {
    console.log({ loaded, total, fraction });
  },
});

await Bun.write("vocals.wav", bytes);
```

## Webhooks

MVSep supports a per-job webhook URL. If you use it, polling is optional:

```ts
const created = await client.createSeparation({
  url: "https://example.com/song.wav",
  sepType: 20,
  webhookUrl: "https://your-app.example/mvsep/webhook",
});
```

The webhook body is documented by MVSep as the same JSON shape returned by `GET /separation/get`.

## Raw endpoint access

```ts
const history = await client.request<MyHistoryResponse>({
  method: "GET",
  path: "/app/separation_history",
  query: { start: 0, limit: 20 },
  authenticated: true,
  idempotent: true,
});
```

Authenticated GETs put `api_token` in the query. Authenticated non-GET form requests put it in `FormData`.

## Error handling

```ts
import {
  MvsepApiError,
  MvsepAuthenticationError,
  MvsepHttpError,
  MvsepJobFailedError,
  MvsepRateLimitError,
  MvsepTimeoutError,
} from "@rikhoffbauer/mvsep-client";

try {
  await client.createAndWait({ url, sepType: 20 });
} catch (error) {
  if (error instanceof MvsepJobFailedError) {
    console.error(error.result.status, error.result.data?.message);
  } else if (error instanceof MvsepRateLimitError) {
    console.error(error.retryAfterMs);
  } else if (error instanceof MvsepHttpError) {
    console.error(error.status, error.response);
  }
}
```

All client errors inherit from `MvsepError` and include a `retryable` flag. HTTP/API errors retain the parsed response where possible.

## MVSep methods covered directly

- `POST /separation/create` → `createSeparation()`
- `GET /separation/get` → `getSeparation()` / `waitForSeparation()`
- `GET /separation/get-remote` → `getRemoteSeparation()`
- `POST /separation/cancel` → `cancelSeparation()`
- `POST /separation/delete` → `deleteSeparation()`
- `GET /app/algorithms` → `getAlgorithms()`
- Any additional endpoint → `request<T>()`

`createAndWait()` composes create + polling.

## Development

```bash
bun install
bun run check
bun run test
bun run build
```

The repository's test suite covers create forms, invalid-key rotation, rate-limit rotation, conservative create retry safety, multi-stage polling/chunk progress, typed job errors, authenticated raw GET requests, key affinity, and protected multipart fields.


## Expanded client workflows

The default `MvsepClient` includes the original transport API plus account, metadata, batch-recovery and output helpers. `MvsepCoreClient` exposes the smaller original client.

### Stream downloads without loading files into memory

```ts
// Preferred for large stems: writes incrementally and renames atomically.
await client.downloadToFile(
  "https://de.mvsep.com/files/.../vocals.wav",
  "vocals.wav",
  {
    maxBytes: 4 * 1024 ** 3,
    onProgress({ loaded, total }) {
      console.log(loaded, total);
    },
  },
);

// Or stream to a Web WritableStream<Uint8Array>:
await client.downloadToStream(outputUrl, writableStream, {
  maxBytes: 4 * 1024 ** 3,
});

// Poll a job, then materialize all its outputs into an existing directory:
const manifest = await client.downloadSeparationOutputs(hash, "./outputs");
if (manifest.errors.length) throw new Error(JSON.stringify(manifest.errors));
```

`downloadToFile` is atomic within the destination filesystem and refuses to replace an existing file unless `overwrite: true`. Temporary `.part` files are removed on failures. File names from the API are sanitized; same-name outputs are suffixed. Safe transient GET retries occur **only before writing bytes**. A partial stream does not silently restart or append corrupt data. Resume with HTTP Range is not implemented. Transfers share the client's throttling and semaphore. `download()` remains in-memory for compatibility, with a default 256 MiB cap (override through `maxBytes`); prefer streaming for large payloads.

### Disk-backed uploads

```ts
import { fileBlobFromPath } from "@rikhoffbauer/mvsep-client";

const job = await client.createSeparation({
  audiofile: await fileBlobFromPath("./large-input.wav", "audio/wav"),
  sepType: 20,
});
```

`fileBlobFromPath` uses Node/Bun's disk-backed Blob rather than `readFile`. Native Fetch does **not** provide portable byte-level upload progress for FormData. Progress listeners report submission lifecycle, throttling, retries and job processing, not upload percentage. For upload-byte events, inject an instrumented Fetch implementation.

### Account, queue, history and billing

```ts
const user = await client.getUser(); // omits api_token by default
const queue = await client.getQueue();
const ownQueue = await client.getQueueSummary(); // estimated_wait_seconds may be null
const history = await client.getSeparationHistory({ start: 0, limit: 20 });
const purchases = await client.getPurchases({ limit: 20, status: "succeeded" });
const alert = await client.getCreditAlert();

await client.setCreditAlert(100); // mutates account configuration
await client.setPremiumUsageEnabled(false);
await client.setLongFilenamesEnabled(true);
```

No account-change methods are called automatically. The account profile includes an API token upstream; `getUser()` removes it unless `includeApiToken: true` is explicitly provided. Avoid serializing `request<T>()` results that include sensitive account fields.

### Credit estimates and explicit spending limits

```ts
const algorithm = await client.getAlgorithm(20);
const estimate = await client.estimateJobCredits({
  algorithm,
  durationSeconds: 180,
});

if (estimate.estimatedCredits === null) {
  throw new Error(estimate.reason ?? "Cannot establish an estimate");
}

const accepted = await client.createGuardedSeparation(
  { url: "https://example.com/song.wav", sepType: 20 },
  {
    durationSeconds: 180,
    maxEstimatedCredits: 10,
    checkAccountBalance: true,
  },
);
```

Estimates follow MVSep's documented `max(1, floor(durationSeconds * price_coefficient / 60))` formula. Unknown pricing, unknown duration, presets and non-file generation models are **not assumed free**. Guarded creation refuses to submit if the price cannot be established or exceeds the cap. Account balance checks are snapshots, **not reservations**, so the upstream service remains the authority on actual credit charges.

### Metadata-driven creation

```ts
const algorithm = await client.getAlgorithm(20);
const { input } = client.prepareSeparation({
  algorithm,
  input: { url: "https://example.com/song.wav" },
  fields: { "Model type": "Fast" }, // if present in algorithm metadata
});
client.validateSeparation(input, algorithm, {
  registered: true,
  premium: true,
});
await client.createSeparation(input);
```

Algorithm fields can use `add_opt1`/`add_opt2`/`add_opt3` identifiers or unambiguous metadata labels. Enumerated option keys are validated, including when MVSep returns the options as a JSON-encoded string. A field label/value must actually exist in the returned metadata. Do not assume the example "Fast" value applies to every algorithm or revision.

### Recover jobs after process restarts

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_A!, process.env.MVSEP_KEY_B!],
  keyIdentifiers: ["account-a", "account-b"], // stable, non-secret IDs
});

const handle = await client.createJob({
  url: "https://example.com/song.wav",
  sepType: 20,
}, { inputId: "track-001" });

// Persist handle as JSON *immediately* after createJob returns.
// On restart, the same account ID may appear at a different key index:
const result = await client.waitForJob(handle);
```

A job handle contains its hash, base URL and optional non-secret account identifier, **not the API token**. For multi-key recovery, `keyIdentifiers` are required; recovery does not silently poll an arbitrary account. `restoreJobHandles(store)` and `saveJobHandles(store,handles)` work with user-supplied persistent stores. A transport failure during a non-idempotent create may leave a job accepted upstream without a returned hash; **reconcile account history before retrying**.

### Batch execution and checkpoints

```ts
import { runBatch, BatchRunner } from "@rikhoffbauer/mvsep-client/batch";

const runner = new BatchRunner();
const results = await runBatch(client, [
  { id: "track-1", input: { sepType: 20, url: "https://example.com/a.wav" },
    durationSeconds: 120 },
  { id: "track-2", input: { sepType: 20, url: "https://example.com/b.wav" },
    durationSeconds: 150 },
], {
  maxActiveJobs: 1,
  maxEstimatedCredits: 10,
  checkpointStore: yourDurableStore,
  runner,
  onJobEvent(index, type) { console.log(index, type); },
});
```

Supply a store with async `load()` and `save(handles)` methods. Accepted hashes are checkpointed before polling. Re-running a batch with the same unique job IDs and stored handles resumes polling rather than re-submitting. The conservative default is **one active server job**; concurrent server jobs are gated by Premium account status, separately from HTTP concurrency. `pause()` delays new submissions; `resume()` releases them; `stop()` cancels the local signal but does not automatically cancel work on MVSep.

### Webhooks and queue-aware status

```ts
import { MvsepWebhookReceiver } from "@rikhoffbauer/mvsep-client/webhooks";

const receiver = new MvsepWebhookReceiver({
  verify: hash => client.getSeparation(hash),
});
const notification = await receiver.receive("account-a", expectedHash, body);
if (!notification.duplicate) console.log(notification.result);

for await (const event of client.watchJob(expectedHash, {
  includeQueue: true,
  intervalMs: 2_000,
})) {
  console.log(event.type, event);
}
```

Webhook delivery is **not authenticated by the SDK**: MVSep does not document a signed webhook protocol. Protect your HTTP endpoint, associate each delivery with the intended account/job, verify against the authenticated API, and use a durable dedup store if you require deduplication across process restarts. `MvsepWebhookReceiver` provides bounded per-instance deduplication and optional API re-verification.

### Discovery, metadata caching and diagnostics

```ts
const demos = await client.getDemoSeparations({
  algorithmId: 20, options: { vocals: 1 }, limit: 20,
});
const leaderboard = await client.getQualityLeaderboard({
  datasetType: 10, sort: "sdr_drums", limit: 20,
});
const news = await client.getNews({ lang: "en", limit: 10 });

// Pass algorithmsCache: { get, set, delete } to the client constructor.
// Cached algorithm metadata expires at algorithmsCacheTtlMs, default 5 min.
await client.invalidateAlgorithms();

import { MvsepDiagnostics } from "@rikhoffbauer/mvsep-client/diagnostics";
const diagnostics = new MvsepDiagnostics(500);
const instrumented = new MvsepClient({ onProgress: diagnostics.onProgress });
console.log(diagnostics.snapshot());
```

Diagnostics store a bounded in-memory event history without API tokens, URLs or response bodies. For explicit local artifact reuse, `LocalArtifactCache` from `@rikhoffbauer/mvsep-client/local-cache` hashes the source bytes plus algorithm configuration, model revision and non-secret account ID; it verifies output hashes before reuse. This is **local cache metadata**, not server-side deduplication. It never automatically suppresses a paid submission.

## CLI

Installed as `mvsep` in the consumer's `node_modules/.bin`.

```bash
export MVSEP_API_KEY='your-token'
./node_modules/.bin/mvsep models
./node_modules/.bin/mvsep submit --file song.wav --algorithm 20 --handle job.json
./node_modules/.bin/mvsep resume job.json
./node_modules/.bin/mvsep status 'job-hash'
./node_modules/.bin/mvsep download 'job-hash' ./stems
./node_modules/.bin/mvsep batch ./batch.json
```

Example `batch.json`:

```json
{
  "jobs": [
    { "id": "track-a", "file": "./a.wav", "algorithm": 20, "durationSeconds": 180 },
    { "id": "track-b", "url": "https://example.com/b.wav", "algorithm": 20, "durationSeconds": 180 }
  ],
  "maxActiveJobs": 1,
  "maxEstimatedCredits": 10
}
```

The CLI writes `batch.json.checkpoint.json` after accepted submissions so re-running the command with the same manifest can recover previous hashes without duplicate submissions. The checkpoint can contain job hashes and file paths, but never plaintext API keys. It is your responsibility to protect and retain the file.

## Verification

```bash
bun install --frozen-lockfile
bun run check
bun run test
bun run test:coverage
bun run smoke:package
```

The suite uses fake API credentials and mocked HTTP responses. CI checks current Bun and Node 20/24 with type checking, regression tests and a clean tarball install. No paid MVSep operations are exercised in CI; validate charge-affecting behavior against a separately authorized account before production use.
