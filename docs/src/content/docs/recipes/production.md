---
title: Production considerations
description: Operating the SDK safely with real credentials and paid jobs.
---

## Before enabling unattended submissions

1. **Configure credentials securely.** Use secret storage; never log tokens or serialize full raw account responses.
2. **Use conservative create retries.** Keep `unsafeCreateRetries: 'safe'`; do not aggressively retry uncertain POST outcomes.
3. **Persist job intent.** Store stable account identifiers and accepted hashes; use a write-ahead marker for batch jobs.
4. **Budget by estimate.** Reject unknown prices; account balances are not reservations.
5. **Separate server-job and HTTP concurrency.** The SDK semaphore controls transport, not remote GPU quota.
6. **Stream outputs.** Prefer `downloadToFile` or `downloadToStream` over buffering large files.
7. **Reconcile partial work.** Check terminal states, output manifests and webhook/polling records.

## Error handling

```ts
import {
  MvsepAbortError, MvsepTimeoutError, MvsepRateLimitError,
  MvsepAuthenticationError, MvsepJobFailedError,
} from '@rikhoffbauer/mvsep-client';

try {
  await client.waitForSeparation(hash, { maxWaitMs: 30 * 60_000 });
} catch (error) {
  if (error instanceof MvsepJobFailedError) console.error('Server job failed', error.result.status);
  else if (error instanceof MvsepAbortError) console.error('Local wait aborted');
  else if (error instanceof MvsepTimeoutError) console.error('Deadline exceeded');
  else if (error instanceof MvsepRateLimitError) console.error('Retry-After (ms)', error.retryAfterMs);
  else if (error instanceof MvsepAuthenticationError) console.error('Authentication rejected');
  else throw error;
}
```

Use [diagnostics](/mvsep-client/reference/utilities/) to instrument retries and job transitions without retaining API URLs or tokens.

## Known limitations

- Resume-by-HTTP-Range is not implemented; partial downloads are removed rather than resumed.
- Standard Fetch/FormData does not expose portable byte-level **upload** progress.
- The webhook helper does not authenticate HTTP requests for you.
- Metadata snapshots may be stale and cannot guarantee an algorithm still exists.
- The SDK cannot guarantee final account-specific billing or credit costs.
