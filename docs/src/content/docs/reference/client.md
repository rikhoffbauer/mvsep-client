---
title: MvsepClient API
description: Complete class method reference for the core client and the expanded SDK.
---

```ts
import { MvsepClient, MvsepCoreClient } from '@rikhoffbauer/mvsep-client';
```

`MvsepClient` extends `MvsepCoreClient` with account, metadata, job recovery and convenience methods. All examples in these docs use `MvsepClient` unless noted. Methods are asynchronous except getters, `resumeJob`, `bindJobToApiKey`, `forgetJobApiKey`, `prepareSeparation` and `validateSeparation`.

## Core job methods

| Method | Result | Notes |
| --- | --- | --- |
| `createSeparation(input, options?)` | `Promise<CreateSeparationResponse>` | Returns accepted job hash; authenticated, non-idempotent POST |
| `createAndWait(input, options?)` | `Promise<SeparationResult>` | Create followed by bounded polling |
| `getSeparation(hash, options?)` | `Promise<SeparationResult>` | Read one job status; `mirror` requires key and costs credit |
| `getRemoteSeparation(hash, options?)` | `Promise<SeparationResult>` | Remote job lookup; does not support `mirror` |
| `waitForSeparation(hash, options?)` | `Promise<SeparationResult>` | Poll until terminal status or deadline |
| `cancelSeparation(hash, options?)` | `Promise<ApiEnvelope>` | Requests server-side cancellation |
| `deleteSeparation(hash, options?)` | `Promise<ApiEnvelope>` | Requests deletion and forgets affinity |
| `request<T>(input)` | `Promise<T>` | Generic unchecked JSON endpoint escape hatch |

`createSeparation` and the high-level helpers protect core multipart fields from overrides. Raw authenticated requests likewise cannot overwrite or duplicate `api_token`.

### Job affinity

| Member | Return | Description |
| --- | --- | --- |
| `apiKeyState` | Key state snapshot | Index, disabled flag and cooldown (never raw key) |
| `getJobApiKeyIndex(hash)` | `number \| undefined` | Look up the remembered key index |
| `bindJobToApiKey(hash, index)` | `void` | Restore key index, validating bounds |
| `forgetJobApiKey(hash)` | `void` | Remove affinity |

In-memory affinity is bounded by `maxJobAffinities`; use durable handles with stable account IDs for restart recovery.

## Algorithms, pricing and account

| Method | Result |
| --- | --- |
| `getAlgorithms(scopes?, options?)` | `Promise<SeparationAlgorithm[]>` |
| `invalidateAlgorithms(scopes?)` | `Promise<void>` (only configured metadata cache) |
| `getAlgorithm(renderId, options?)` | `Promise<SeparationAlgorithm>` |
| `prepareSeparation(options)` | `PreparedSeparation` |
| `validateSeparation(input, algorithm, options?)` | `void` |
| `estimateJobCredits({ algorithm, durationSeconds? })` | `Promise<JobCostEstimate>` |
| `createGuardedSeparation(input, options)` | `Promise<CreateSeparationResponse>` |
| `getUser(options?)` | `Promise<MvsepUser>` |
| `getQueue(options?)` | `Promise<MvsepQueue>` |
| `getQueueSummary(options?)` | `Promise<MvsepQueueSummary>` |
| `getSeparationHistory(query?, options?)` | `Promise<MvsepHistoryEntry[]>` |
| `getPurchases(query?, options?)` | `Promise<MvsepPurchases>` |
| `getCreditAlert(options?)` | `Promise<MvsepCreditAlert>` |
| `setCreditAlert(threshold, options?)` | `Promise<MvsepCreditAlert>` |
| `setPremiumUsageEnabled(enabled, options?)` | `Promise<void>` |
| `setLongFilenamesEnabled(enabled, options?)` | `Promise<void>` |

`getUser()` omits the upstream `api_token` property by default. The three setter methods are **explicit account mutations**, never constructor side effects.

## Discovery

| Method | Result |
| --- | --- |
| `getNews(query?, options?)` | `Promise<NewsEntry[]>` |
| `getDemoSeparations(query?, options?)` | `Promise<MvsepDemoEntry[]>` |
| `getQualityLeaderboard(query?, options?)` | `Promise<MvsepLeaderboard>` |
| `getQualityQueue(query?, options?)` | `Promise<MvsepQualityEntry[]>` |
| `getQualityEntry(id, options?)` | `Promise<MvsepQualityEntry>` |

Query shapes and page limits are described in [Types](/mvsep-client/reference/types/).

## Transfers

| Method | Result | Semantics |
| --- | --- | --- |
| `download(url, options?)` | `Promise<Uint8Array>` | In-memory bytes; default maximum 256 MiB |
| `downloadToStream(url, writable, options?)` | `Promise<DownloadReceipt>` | Backpressure-aware, closes writable on success |
| `downloadToFile(url, path, options?)` | `Promise<DownloadedFile>` | Temporary file, atomic promotion, no-clobber default |
| `downloadSeparationOutputs(resultOrHash, directory, options?)` | `Promise<OutputManifest>` | Sequential, safe names, per-file error manifest |

Transfer options include `timeoutMs`, `signal`, `maxBytes`, `maxAttempts` and a byte-level `onProgress` callback. Output materialization also accepts `onFileProgress`.

## Durable jobs and live status

| Method | Result |
| --- | --- |
| `createSeparationFromFile(path, input?, options?)` | `Promise<CreateSeparationResponse>` |
| `createJob(input, options?)` | `Promise<MvsepJobHandle>` |
| `resumeJob(handle)` | `string` (hash) |
| `waitForJob(handle, options?)` | `Promise<SeparationResult>` |
| `saveJobHandles(store, handles)` | `Promise<void>` |
| `restoreJobHandles(store)` | `Promise<MvsepJobHandle[]>` |
| `watchJob(hash, options?)` | `AsyncGenerator<JobWatchEvent>` |

See [recovery](/mvsep-client/guides/recovery/) and [polling](/mvsep-client/guides/polling/).

## Complete usage examples

### Single-file convenience helper

```ts
const created = await client.createSeparationFromFile('song.wav', {
  sepType: 20,
  outputFormat: 1,
});
const hash = created.data?.hash;
if (!hash) throw new Error('No job hash returned');
console.log('Job:', hash);
```

The helper opens a disk-backed file instead of reading the entire file into memory. **Submitting a job can incur charges.** Discover current algorithm IDs first.

### Check, poll, cancel or delete a job

```ts
const result = await client.getSeparation(hash);
console.log(result.status, result.data?.queue_count);

const terminal = await client.waitForSeparation(hash, {
  intervalMs: 2_000,
  maxWaitMs: 30 * 60_000,
  onProgress(event) {
    if (event.type === 'poll') console.log(event.status, event.fraction ?? 'unknown');
  },
});
console.log('Terminal:', terminal.status);

// These are explicit remote mutations — do NOT perform them merely to poll:
// await client.cancelSeparation(hash);
// await client.deleteSeparation(hash);
```

`getRemoteSeparation(hash)` queries MVSep's remote endpoint; `getSeparation(hash, { mirror: true })` requests a mirror using an API key and **costs one credit**, so it is never called implicitly.

### Use the raw request interface for an unwrapped endpoint

```ts
import type { ApiEnvelope, MvsepUser } from '@rikhoffbauer/mvsep-client';

const response = await client.request<ApiEnvelope<MvsepUser>>({
  method: 'GET', path: '/app/user', authenticated: true,
  idempotent: true, timeoutMs: 15_000,
});
// Do not log response.data wholesale: raw account payloads may include secrets.
console.log(response.success, response.data?.name);
```

`request<T>()` does **not** unwrap the envelope. Declare a response shape matching the endpoint. The SDK prohibits callers from overriding `api_token` on authenticated requests.

### Trace selected keys and manually bind an existing hash

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_A!, process.env.MVSEP_KEY_B!],
  onProgress(event) {
    if (event.type === 'request' && event.phase === 'start') {
      console.log(event.path, 'key index:', event.keyIndex);
    }
  },
});
client.bindJobToApiKey('existing-job-hash', 1);
const keyIndex = client.getJobApiKeyIndex('existing-job-hash');
const status = await client.getSeparation('existing-job-hash');
console.log(keyIndex, status.status);
client.forgetJobApiKey('existing-job-hash'); // only removes local affinity
```

For round-robin/sticky comparisons, error failover and a mock that never makes network requests, see [API key rotation](/mvsep-client/guides/api-key-rotation/).

### Stream all statuses and optional queue updates

```ts
for await (const event of client.watchJob(hash, {
  includeQueue: true,
  queueIntervalMs: 10_000,
  maxWaitMs: 30 * 60_000,
})) {
  if (event.type === 'status') console.log(event.result.status);
  if (event.type === 'queue') console.log(event.summary.estimated_wait_seconds ?? 'unknown');
  if (event.type === 'complete') console.log(event.result.data?.files);
}
```

### Inspect account and algorithm endpoints

```ts
const [user, history, purchases, queue] = await Promise.all([
  client.getUser(),
  client.getSeparationHistory({ start: 0, limit: 10 }),
  client.getPurchases({ offset: 0, limit: 10 }),
  client.getQueueSummary(),
]);
console.log({ credits: user.premium_minutes, jobs: history.length,
  purchases: purchases.total, queue: queue.queued });

const algorithms = await client.getAlgorithms('single_upload');
const first = algorithms[0];
if (first) {
  const model = await client.getAlgorithm(first.render_id);
  console.log(model.name, (await client.estimateJobCredits({
    algorithm: model, durationSeconds: 180,
  })).estimatedCredits ?? 'unknown');
}
```

Account reads are not tied to a job hash. **Use a separate one-key client for each account** when balances or preferences must refer to a specific payer.

### More API examples

- [Discovery and pricing](/mvsep-client/guides/algorithms/): algorithms, options, demos, quality leaderboard and cache invalidation.
- [Credit safety](/mvsep-client/guides/credits/): cost caps, account preferences and read-only account endpoints.
- [Batch and checkpoints](/mvsep-client/guides/batch/): concurrent workers, pause/resume and duplicate prevention.
- [Example gallery](/mvsep-client/recipes/example-gallery/): complete runnable files for these workflows, including offline mocks.
