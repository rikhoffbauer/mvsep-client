---
title: Credits & safe submissions
description: Estimate a job's cost and enforce spend caps without false guarantees.
---

## Inspect your account

```ts
const user = await client.getUser(); // omits api_token by default
console.log(user.premium_minutes, user.premium_enabled);
const queue = await client.getQueueSummary();
console.log(queue.estimated_wait_seconds); // null means unknown
```

Additional read methods: `getQueue()`, `getSeparationHistory({ start, limit })`, `getPurchases({ status, offset, limit })` and `getCreditAlert()`. See the [complete account inspection example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/account-inspection.ts).

:::caution[Multiple keys and billing]
Unbound account reads such as `getUser()` rotate keys; `createGuardedSeparation` cannot promise the balance just read belongs to the key later selected for the paid POST. Use **one client per account** for reliable account-specific credit checks. See [API key rotation](/mvsep-client/guides/api-key-rotation/).
:::

## Estimate credits

```ts
const algorithm = await client.getAlgorithm(20);
const estimate = await client.estimateJobCredits({
  algorithm,
  durationSeconds: 180,
});
if (estimate.estimatedCredits === null) {
  throw new Error(estimate.reason ?? 'Unknown cost');
}
```

For recognized single-file algorithms, the estimate follows the upstream formula:

```text
max(1, floor(durationSeconds * price_coefficient / 60))
```

**An estimate is not a quote.** For missing duration, absent coefficient, presets and pricing paths the SDK cannot determine, `estimatedCredits` is `null` rather than zero.

## Guard a paid create request

```ts
const created = await client.createGuardedSeparation(
  { sepType: 20, url: 'https://example.com/song.wav' },
  {
    durationSeconds: 180,
    maxEstimatedCredits: 10,
    checkAccountBalance: true,
  },
);
```

The [offline credit-guard example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/credit-guards.ts) verifies unknown prices, over-budget input, insufficient credit balance and a disabled Premium flag **without creating a real job**.

The guard rejects unknown prices, insufficient account balance and an estimate above the provided cap. Account balance is checked immediately before submission but is **not** reserved or locked: concurrent workloads may still spend credits. The upstream API determines the final bill.

## Explicit account preferences

```ts
await client.setCreditAlert(100);
await client.setPremiumUsageEnabled(false);
await client.setLongFilenamesEnabled(true);
```

The SDK never toggles Premium automatically. The mirror option in `getSeparation(hash, { mirror: true })` requires an API key and is documented by MVSep as consuming one credit.

:::danger[No automatic replay after uncertain POST]
MVSep does not provide a documented idempotency key for `POST /separation/create`. An error or connection drop is **not** proof that a job was rejected. See [job recovery](/mvsep-client/guides/recovery/) and [batch checkpoints](/mvsep-client/guides/batch/).
:::
