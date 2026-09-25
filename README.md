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

## Install

```bash
bun add ./mvsep-client
```

Or when published:

```bash
bun add @rik/mvsep-client
```

## Quick start

```ts
import { MvsepClient, fileFromPath } from "@rik/mvsep-client";

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
} from "@rik/mvsep-client";

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
