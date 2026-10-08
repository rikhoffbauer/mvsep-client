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
