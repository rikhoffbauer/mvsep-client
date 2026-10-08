---
title: Polling & progress
description: Wait for completion with bounded deadlines, watch queue state and abort safely.
---

A created job starts with a `hash`. Use `getSeparation` for one query, `waitForSeparation` to poll until terminal, or `createAndWait` to submit and poll in a single helper.

## Poll with a deadline

```ts
const result = await client.waitForSeparation(hash, {
  intervalMs: 2_000,
  maxIntervalMs: 10_000,
  backoffFactor: 1.15,
  maxWaitMs: 30 * 60_000,
  onProgress(event) {
    if (event.type === 'poll') {
      console.log(event.status, event.queueCount, event.fraction);
    }
  },
});
```

`maxWaitMs` is a **wall-clock deadline**, including slow requests, retries and pauses between polls. `timeoutMs` separately controls each HTTP request. Successful status is `done`; `failed` and `not_found` throw `MvsepJobFailedError` unless `throwOnFailed: false`.

## Stream status events

```ts
for await (const event of client.watchJob(hash, {
  includeQueue: true,
  intervalMs: 2_000,
  queueIntervalMs: 10_000,
})) {
  if (event.type === 'status') console.log(event.result.status);
  if (event.type === 'queue') console.log(event.summary.estimated_wait_seconds);
  if (event.type === 'complete') console.log(event.result.data?.files);
}
```

A queue estimate may be `null`. Never present an unknown ETA as zero.

## Cancellation

```ts
const controller = new AbortController();
const polling = client.waitForSeparation(hash, { signal: controller.signal });
controller.abort(); // stops local waiting, NOT the accepted server job
await polling;

// To request cancellation on MVSep itself:
await client.cancelSeparation(hash);
```

An aborted poll rejects with `MvsepAbortError`. Use `deleteSeparation(hash)` to request server-side deletion where supported.

## Progress events

The callback receives a discriminated union: `request`, `rate_limit`, `retry`, `key_rotation` or `poll`. Only `poll` has queue/chunk fields (`finishedChunks`, `allChunks`, `fraction`). These do **not** represent exact upload bytes; standard Fetch/FormData does not expose portable upload-byte progress.
