---
title: Configuration
description: Client options, regions, rate limits, retries and API-key rotation.
---

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_1!, process.env.MVSEP_KEY_2!],
  keyIdentifiers: ['account-a', 'account-b'],
  region: 'de',
  requestTimeoutMs: 60_000,
  rateLimit: {
    requestsPerSecond: 2,
    burst: 2,
    maxConcurrency: 4,
  },
  retry: {
    maxAttempts: 5,
    baseDelayMs: 500,
    maxDelayMs: 20_000,
    jitter: 'full',
    unsafeCreateRetries: 'safe',
  },
  keyRotation: {
    strategy: 'round_robin',
    rateLimitCooldownMs: 30_000,
    transientFailureCooldownMs: 5_000,
    disableKeyOnUnauthorized: true,
  },
  maxJobAffinities: 10_000,
});
```

## Endpoints and regions

The default endpoint is `https://mvsep.com/api`. Set `region` to `apex`, `de`, `de2` or `sg`, or pass a complete `baseUrl` to target a custom endpoint. File downloads should use the **absolute output URLs** returned by MVSep, which may point at the region owning the result.

## Authentication

Pass `apiKeys` as one string or an array. Keys rotate using round-robin (default) or sticky selection; rejected keys can be disabled, and rate-limited keys are cooled down. The selected key is pinned in memory to a job hash for account-bound follow-ups. For durable recovery with multiple keys, supply a stable, non-secret `keyIdentifiers` array matching the configured keys.

## Rate limits

`rateLimit` controls **HTTP requests**, not the number of remote GPU jobs. Setting `requestsPerSecond: 0` or `Infinity` disables request throttling; `maxConcurrency` counts active HTTP requests through response-body consumption. Non-premium accounts may be limited to a single active server job.

## Retry safety

| `unsafeCreateRetries` | Create-job retry behavior |
| --- | --- |
| `never` | Never retry a create, even after a 401. |
| `safe` (default) | Only retry an explicit HTTP 429 rejection. |
| `aggressive` | Retry other transport/status errors; **may create duplicate paid jobs**. |

Idempotent requests use the regular retry policy, backoff and `Retry-After`. Use `onProgress` for structured request/retry/rotation events. Observer exceptions are isolated and do not reclassify a successful create as a failed one.

See [API options](/mvsep-client/reference/options/) for option types and defaults.
