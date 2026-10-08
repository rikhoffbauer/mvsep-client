---
title: Errors & retry semantics
description: Typed errors, retryability, timeouts, paid-create ambiguity and redaction.
---

Every SDK error inherits from `MvsepError`. A caught error can include `status`, `response`, `method`, redacted `url`, `retryable` and `apiKeyIndex`.

## Error classes

| Error | Description |
| --- | --- |
| `MvsepError` | Common base error / transport failure |
| `MvsepHttpError` | HTTP response or invalid API JSON |
| `MvsepApiError` | Valid HTTP but rejected or malformed API envelope |
| `MvsepAuthenticationError` | Missing/invalid API key or unavailable bound account |
| `MvsepRateLimitError` | HTTP 429 with optional `retryAfterMs` |
| `MvsepTimeoutError` | Per-request or overall polling deadline |
| `MvsepAbortError` | Caller aborted a request or polling |
| `MvsepJobFailedError` | Terminal `failed` or `not_found` job; includes `result` |

```ts
import { MvsepJobFailedError, MvsepTimeoutError, MvsepRateLimitError } from '@rikhoffbauer/mvsep-client';

try {
  await client.waitForSeparation(hash, { maxWaitMs: 600_000 });
} catch (error) {
  if (error instanceof MvsepJobFailedError) {
    console.error('Job status:', error.result.status);
  } else if (error instanceof MvsepRateLimitError) {
    console.error('Retry after ms:', error.retryAfterMs);
  } else if (error instanceof MvsepTimeoutError) {
    console.error('Request or poll deadline exceeded');
  } else {
    throw error;
  }
}
```

## Timeout and abort boundaries

A request timeout covers waiting for rate/concurrency slots, the response headers and **the entire response body**, not just the initial `fetch`. Polling `maxWaitMs` includes network time, retries and sleeps. Local abort never implies cancellation on the remote server.

## Credential redaction

Public error URLs scrub sensitive query fields such as `api_token`, and known sensitive response properties are removed from error metadata. Do not intentionally log raw successful `request<T>()` account responses that may contain tokens.

## Critical create-job rule

An uncertain POST outcome is not proof of rejection. The `safe` policy only retries explicit 429 responses. `aggressive` may duplicate paid work. See [credit safety](/guides/credits/) and [recovery](/guides/recovery/).
