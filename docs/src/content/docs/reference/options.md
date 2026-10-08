---
title: Configuration & call options
description: Client constructor, retries, rate limits, per-call and streaming options.
---

## `MvsepClientOptions` / `AdvancedClientOptions`

| Option | Type | Default / meaning |
| --- | --- | --- |
| `apiKeys` | `string \| readonly string[]` | No keys; required for create and account operations |
| `region` | `MvsepRegion` | `apex`; also `de`, `de2`, `sg` |
| `baseUrl` | `string` | `https://mvsep.com/api`; overrides `region` |
| `fetch` | `typeof fetch` | `globalThis.fetch`; useful for mocking/instrumenting |
| `requestTimeoutMs` | `number` | `60_000` ms |
| `retry` | `RetryOptions` | Exponential backoff with safe create retry |
| `rateLimit` | `RateLimitOptions` | Token bucket + request semaphore |
| `keyRotation` | `KeyRotationOptions` | Round robin with cooldown |
| `maxJobAffinities` | `number` | `10_000`, oldest evicted first |
| `onProgress` | `(event: MvsepProgressEvent) => void` | Optional global observer |
| `keyIdentifiers` | `readonly string[]` | Optional stable nonsecret account labels (advanced client) |
| `algorithmsCache` | `MetadataCache` | Optional cache adapter (advanced client) |
| `algorithmsCacheTtlMs` | `number` | `300_000` ms (advanced client) |

## `RetryOptions`

```ts
interface RetryOptions {
  maxAttempts?: number;                  // default 5
  baseDelayMs?: number;                  // default 500
  maxDelayMs?: number;                   // default 20_000
  jitter?: 'none' | 'full' | 'equal';      // default 'full'
  retryableStatusCodes?: readonly number[];
  unsafeCreateRetries?: 'never' | 'safe' | 'aggressive'; // default 'safe'
}
```

Default retryable status codes: 408, 425, 429, 500, 502, 503 and 504. The safe create policy only replays explicit 429 rejections. An aggressive replay risks duplicate paid work.

## `RateLimitOptions`

```ts
interface RateLimitOptions {
  requestsPerSecond?: number; // default 2; 0 or Infinity disables
  burst?: number;             // default 2
  maxConcurrency?: number;    // default 4; counts body consumption
}
```

## `KeyRotationOptions`

```ts
interface KeyRotationOptions {
  strategy?: 'round_robin' | 'sticky';
  rateLimitCooldownMs?: number;       // 30_000
  transientFailureCooldownMs?: number; // 5_000
  disableKeyOnUnauthorized?: boolean; // true
}
```

## Per-call options

`CallOptions` provides `signal`, `timeoutMs` and `onProgress`. `GetSeparationOptions` also has `mirror?: boolean`. `PollOptions` adds:

```ts
interface PollOptions extends GetSeparationOptions {
  intervalMs?: number;          // 2_000
  maxIntervalMs?: number;       // 10_000
  backoffFactor?: number;       // 1.15
  maxWaitMs?: number;           // 30 * 60_000
  throwOnFailed?: boolean;      // true
}
```

`CreateAndWaitOptions` further adds `createSignal`; if omitted, creation uses the main `signal`.

## Transfer options

`StreamDownloadOptions` includes `signal`, `timeoutMs`, `maxBytes`, `maxAttempts` and `onProgress(progress: DownloadProgress)`. `DownloadFileOptions` adds `overwrite?: boolean` (default false). `OutputDownloadOptions` adds `onFileProgress` with the normalized file, progress, index and count.

`GuardedCreateOptions` requires `maxEstimatedCredits` and `durationSeconds`, and optionally enables `checkAccountBalance`.

:::tip[Units]
Timeouts, backoffs and delays are in **milliseconds**. Credit estimates use input duration in **seconds**.
:::
