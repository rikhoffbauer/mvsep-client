---
title: API key rotation
sidebar:
  order: 1
description: Exactly how round-robin and sticky API-key selection, failover, cooldowns, job affinity and durable recovery work.
---

The SDK supports **one or multiple API keys**. A key pool chooses the credential for each *new, unbound, authenticated* request; a job created with a particular key is automatically bound to that key for subsequent status, cancellation and deletion calls. Rotation is not a way to transfer a job between accounts or circumvent server-side job limits.

:::tip[Try this without credentials]
The repository includes a [self-contained, offline rotation demonstration](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/key-rotation.ts) using a mock `fetch` function. Run `bun run examples/key-rotation.ts` without API keys, networking or billable jobs. It also verifies **safe create failover on 401/429**, **no replay after an ambiguous POST failure**, and **a pinned job staying on its key after 429**.
:::

## 1. Configure multiple keys

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client';

const keyA = process.env.MVSEP_KEY_A;
const keyB = process.env.MVSEP_KEY_B;
if (!keyA || !keyB) throw new Error('Set MVSEP_KEY_A and MVSEP_KEY_B');

const client = new MvsepClient({
  apiKeys: [keyA, keyB],
  keyIdentifiers: ['studio-account', 'personal-account'],
  keyRotation: {
    strategy: 'round_robin',             // the default
    rateLimitCooldownMs: 30_000,         // when no Retry-After was supplied
    transientFailureCooldownMs: 5_000,  // for retryable non-401/429 failures
    disableKeyOnUnauthorized: true,      // the default
  },
  retry: {
    maxAttempts: 5,
    unsafeCreateRetries: 'safe',         // the default: don't replay uncertain creates
  },
});
```

`apiKeys` accepts a single string or an array. The pool **trims whitespace, removes empty strings and deduplicates keys**, preserving the first occurrence and its index. `keyIdentifiers` must contain one unique, non-empty, **non-secret** ID per key **after normalization**. Configure both lists consistently; invalid lengths throw at construction. An ID describes an account/credential for recovery, and does not authenticate a request.

Alternatively, supply keys from comma-delimited environment variables (as used by the CLI):

```ts
const apiKeys = (process.env.MVSEP_API_KEYS ?? '')
  .split(',').map(value => value.trim()).filter(Boolean);
const keyIdentifiers = (process.env.MVSEP_KEY_IDS ?? '')
  .split(',').map(value => value.trim()).filter(Boolean);
if (apiKeys.length !== keyIdentifiers.length) throw new Error('Missing stable key IDs');
const client = new MvsepClient({ apiKeys, keyIdentifiers });
```

For a single key, no rotation occurs and `keyIdentifiers` is optional.

## 2. Round-robin versus sticky

| Behavior | `round_robin` (default) | `sticky` |
| --- | --- | --- |
| First unbound authenticated call | Key 0 | Key 0 |
| Next successful, unbound authenticated call | Key 1, then 0, etc. | Same key |
| Current key in cooldown / disabled | Select next eligible key | Switch to next eligible key **and stay there** |
| A follow-up to an existing job | **Job's original key** | **Job's original key** |
| Public algorithm discovery / unauthenticated download | No key selected | No key selected |

The sequence below assumes two healthy keys and **sequential**, unbound, authenticated calls, with no concurrent requests:

```ts
const client = new MvsepClient({
  apiKeys: ['key-A', 'key-B'],
  keyRotation: { strategy: 'round_robin' },
  onProgress(event) {
    if (event.type === 'request' && event.phase === 'start') {
      console.log(`request ${event.path} used key index ${event.keyIndex}`);
    }
  },
});

await client.getUser(); // logs keyIndex: 0
await client.getUser(); // logs keyIndex: 1
await client.getUser(); // logs keyIndex: 0
```

Replace `strategy: 'round_robin'` with `strategy: 'sticky'` to keep using index 0 while it remains healthy. The call sequence above is illustrative; concurrent requests, retry attempts and pinned jobs can change observed interleaving. **Keys do not split the workload in proportion to their account quotas or balances.**

## 3. What happens on 429, 401 and transport errors?

| Event | Key pool action | Next attempt (when allowed) |
| --- | --- | --- |
| HTTP `429` | Cool down the key using `Retry-After` if present, otherwise `rateLimitCooldownMs` | Try another available key immediately for unbound requests; otherwise wait/back off |
| HTTP `401` / API authentication rejection | Permanently disable that key **in this client instance**, by default | Try another key if allowed and available; a pinned job cannot switch |
| Retryable transport / `5xx` failure | Place the key on `transientFailureCooldownMs` **when retrying** | Try an eligible alternate for unbound requests |
| Successful authenticated response | Clear that key's cooldown | Return response; next independent request follows the selected strategy |
| All keys cooling down | Keep keys enabled | Wait for the earliest eligible key, subject to request timeout or abort |
| All keys disabled | No usable key | Throw `MvsepAuthenticationError` (or propagate the last error) |

**`maxAttempts` applies to a single request, not to the lifetime of the client.** If exhausted, you receive an error, even if another key might become eligible later. A key disabled due to unauthorized access stays disabled for that client instance; supply corrected credentials in a newly constructed client.

### Safe versus aggressive retrying

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_A!, process.env.MVSEP_KEY_B!],
  retry: { maxAttempts: 3, unsafeCreateRetries: 'safe' },
});
```

- For **idempotent GETs** and explicitly idempotent actions, retryable failures can trigger failover to another eligible key.
- For **`createSeparation()`**, `safe` retries only **explicit HTTP 429 rejection or authentication rejection (401/invalid token)**, not timeouts, dropped connections or `5xx` errors where a paid job might have been accepted. `never` disables **all** create retries. `aggressive` also replays ambiguous failures and can create **duplicate paid jobs**.
- An **account-bound** request cannot use another key even when that key is available. This avoids accidentally querying or mutating the wrong account's job.

:::caution[Paid jobs and account quotas]
A multi-key pool does not reserve credit, determine which account has money, or ensure a job's account permits concurrent processing. `getUser()` and other standalone account reads themselves rotate, so their balance/permissions might not belong to the account later selected for a create request. For guarded paid workflows, prefer **one client per account**, or implement an explicit account scheduler rather than relying on rotation for billing guarantees.
:::

## 4. Observe decisions without printing secrets

Use the `onProgress` callback. **Important:** a `key_rotation` event is emitted when a **retry within the same request** changes key index. Routine round-robin selection across separate successful requests is **not** a `key_rotation` event. To trace every selection, observe `request` events:

```ts
import type { MvsepProgressEvent } from '@rikhoffbauer/mvsep-client';

function logKeyUsage(event: MvsepProgressEvent) {
  if (event.type === 'request' && event.phase === 'start') {
    console.log(`attempt ${event.attempt}: key #${event.keyIndex ?? 'none'}`);
  }
  if (event.type === 'retry') {
    console.log(`retrying after ${event.delayMs} ms; ${event.reason}`);
  }
  if (event.type === 'key_rotation') {
    console.log(`retry failover: key #${event.from} → key #${event.to}`);
  }
}
const client = new MvsepClient({ apiKeys: ['key-A', 'key-B'], onProgress: logKeyUsage });
```

These events include numeric indices rather than token values. `apiKeyState` exposes indices, `disabled` and `cooldownUntil` timestamps:

```ts
for (const key of client.apiKeyState) {
  console.log({
    index: key.index,
    disabled: key.disabled,
    cooldownLeftMs: Math.max(0, key.cooldownUntil - Date.now()),
  });
}
```

`apiKeyState` is a snapshot, not a live reactive object. A fresh snapshot reflects recent errors/cooldowns. The SDK doesn't expose a public method to manually disable or rotate a specific key; to force an account, create a dedicated one-key client.

## 5. Existing jobs stay on the original key

```ts
const accepted = await client.createSeparation({
  sepType: 20,
  url: 'https://example.com/track.wav',
});
const hash = accepted.data!.hash!;

const keyIndex = client.getJobApiKeyIndex(hash);
console.log('Created with key index:', keyIndex);

await client.getSeparation(hash);          // uses same key as creation
await client.waitForSeparation(hash);      // polling stays on that key
// await client.cancelSeparation(hash);   // explicit, same key — cancels remote job
// await client.deleteSeparation(hash);   // explicit, same key — deletes remote job
```

You can manually associate an **already-existing** job with a key index *in the current process*:

```ts
client.bindJobToApiKey('previous-job-hash', 1);
await client.getSeparation('previous-job-hash'); // uses key index 1
client.forgetJobApiKey('previous-job-hash');     // removes in-memory association
```

`forgetJobApiKey` does **not** delete/cancel anything on MVSep. After forgetting, `getSeparation` can use another eligible key, potentially from a different account. The affinity map is bounded (`maxJobAffinities`, default **10,000**) and evicts the oldest association when full.

### What if that key is rate-limited or invalid?

A **pinned** job waits for its own key's cooldown instead of switching accounts. If the key becomes disabled, the operation fails; fix the account credentials. Binding a hash to an arbitrary index does not grant access to jobs owned by another account.

## 6. Restart safely even if key order changes

Numeric indices depend on the array order and **must not be persisted as a durable account identity**. Instead, give each key a stable identifier and save the `MvsepJobHandle` returned by `createJob()`:

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client';
import { readFile, writeFile } from 'node:fs/promises';

// Process 1 — submit once and save the handle immediately:
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_A!, process.env.MVSEP_KEY_B!],
  keyIdentifiers: ['account-A', 'account-B'],
});
const handle = await client.createJob({
  sepType: 20, url: 'https://example.com/song.wav',
});
await writeFile('job-handle.json', JSON.stringify(handle, null, 2));

// Process 2 — after restarting, keys can be reordered:
const resumedClient = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_B!, process.env.MVSEP_KEY_A!],
  keyIdentifiers: ['account-B', 'account-A'],
});
const saved = JSON.parse(await readFile('job-handle.json', 'utf8'));
const result = await resumedClient.waitForJob(saved);
console.log(result.status);
```

The handle contains `keyId`, `hash` and `baseUrl` but **never the API token**. `waitForJob()` re-binds the hash using its stable ID; it does not create a new job. The endpoint must match on restore. A multi-key client **refuses to restore** an unbound handle without a stable `keyId` (unless the job was previously bound in memory).

The [offline affinity demonstration](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/key-affinity.ts) exercises key order reversal and pinned status requests without contacting MVSep.

## 7. Choosing an approach

- **One API key:** pass `apiKeys: process.env.MVSEP_API_KEY`. No rotation or stable ID required.
- **Multiple keys for independent, unbound calls:** choose `round_robin` to distribute selection or `sticky` to prefer a key until unavailable.
- **Jobs billed to different accounts:** create a distinct `MvsepClient` per account, use credit guards on that client and schedule accounts explicitly.
- **Long-running multi-key work:** configure stable `keyIdentifiers`, persist handles, and resume by `waitForJob()`.
- **Uncertain create outcome:** inspect account history before retrying. Failover cannot resolve the missing hash, and it must not silently duplicate paid jobs.

Related: [configuration](/start/configuration/), [credit safety](/guides/credits/), [job recovery](/guides/recovery/), [batch processing](/guides/batch/) and [API types](/reference/options/).
