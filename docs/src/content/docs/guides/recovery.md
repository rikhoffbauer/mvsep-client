---
title: Restart-safe job recovery
description: Persist non-secret job handles and resume polling without another create POST.
---

## Create and persist a handle

```ts
const client = new MvsepClient({
  apiKeys: [process.env.MVSEP_KEY_A!, process.env.MVSEP_KEY_B!],
  keyIdentifiers: ['account-a', 'account-b'],
});

const handle = await client.createJob(
  { sepType: 20, url: 'https://example.com/song.wav' },
  { inputId: 'my-track-001' },
);
// Save this JSON in your own database/file store immediately.
console.log(JSON.stringify(handle));
```

A `MvsepJobHandle` records `hash`, `baseUrl`, a stable nonsecret account identifier (when available), optional algorithm/preset and source identifiers, plus its creation time. **API keys are never persisted in the handle.**

## Resume after a restart

```ts
const result = await client.waitForJob(restoredHandle, {
  intervalMs: 2_000,
  maxWaitMs: 30 * 60_000,
});
```

The [offline affinity example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/key-affinity.ts) demonstrates the entire flow without remote requests, including reordering keys on restart.

A restored job calls `GET /separation/get` using the appropriate account key. It does not call `POST /separation/create`. Key **indexes** are not safe durable identifiers because key order may change; supply `keyIdentifiers` for multi-key configurations.

## Save or restore many handles

```ts
const store = {
  async load() { return persistedHandles; },
  async save(handles) { await persistAtomically(handles); },
};
await client.saveJobHandles(store, handles);
const restored = await client.restoreJobHandles(store);
```

`saveJobHandles()` validates handles and delegates persistence to your adapter. No database dependency is imposed on the core SDK.

:::caution[When creation fails without returning a hash]
An unknown POST outcome is **not recoverable from a handle** because the hash was never returned. Inspect MVSep account history before deciding whether another submission is safe. A [batch runner](/mvsep-client/guides/batch/) writes a pending-submission marker before each create to avoid automatic duplicates after crashes.
:::
