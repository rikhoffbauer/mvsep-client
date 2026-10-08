---
title: Example gallery
description: Runnable, typechecked examples for the major SDK capabilities, including mock-only demonstrations.
---

The [repository's `examples/` directory](https://github.com/rikhoffbauer/mvsep-client/tree/main/examples) contains complete TypeScript programs. Every example is typechecked by the root `bun run check`; the offline examples are also executed in CI. Unlike isolated snippets, these include imports, credentials, error handling and executable entry points.

All commands assume you've cloned the repository and run `bun install --frozen-lockfile` from its root. For a separate consuming application, substitute imports from `../src/...` with `@rikhoffbauer/mvsep-client` (or a documented subpath).

## Examples by capability

| Example | What it illustrates | Online / paid? |
| --- | --- | --- |
| [API key rotation](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/key-rotation.ts) | Round robin, sticky, 401 failover, 429 cooldown, observability, mocked Fetch | **Offline; no credits** |
| [Key affinity and recovery](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/key-affinity.ts) | Create, job-bound status and restore with reordered key list | **Offline; no credits** |
| [Credit guards](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/credit-guards.ts) | Reject unknown pricing, over-budget submissions, insufficient credits or disabled premium | **Offline; no credits** |
| [Local artifact integrity](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/local-artifact-cache.ts) | Key hashing, cache recording and detecting corrupted output files | **Offline; no credits** |
| [Diagnostics](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/offline-diagnostics.ts) | Progress events, event subscriptions and bounded diagnostics | **Offline; no credits** |
| [Model discovery](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/discover-algorithms.ts) | Available algorithm IDs, fields, pricing estimates | Public read only |
| [Metadata caching](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/metadata-and-cache.ts) | TTL cache, offline snapshot, output sanitization | Public read + local disk |
| [Account inspection](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/account-inspection.ts) | Credit balance, queue, history, purchases, alerts | Authenticated read only |
| [Generic request](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/raw-request.ts) | Low-level typed `request<T>()` to an authenticated endpoint | Authenticated read only |
| [Download existing job](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/download-job.ts) | Wait for known hash and download every output with byte progress | Existing job; no create |
| [End-to-end job](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/process-file.ts) | File submission, handle, polling, stem downloads, error handling | **May spend credits** |
| [Batch jobs](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/batch-jobs.ts) | Preflight budget, single server job, crash-safe JSON checkpoints | **May spend credits** |
| [Webhook receiver](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/webhook-server.ts) | Bearer-authenticated HTTP endpoint, job verification, deduplication | Existing job and live server |

## Execute safe, zero-credit examples

```bash
bun run examples/key-rotation.ts
bun run examples/key-affinity.ts
bun run examples/offline-diagnostics.ts
bun run examples/credit-guards.ts
bun run examples/local-artifact-cache.ts
```

These use deterministic mock HTTP responses. They do not contact MVSep, create remote jobs or require credentials.

## Discover algorithms without a token

```bash
bun run examples/discover-algorithms.ts
bun run examples/metadata-and-cache.ts
```

The second creates a local `.mvsep-models` cache directory, preserving current metadata for offline inspection. Public API metadata may change.

## Inspect your account (read-only)

```bash
MVSEP_API_KEY=your-token bun run examples/account-inspection.ts
MVSEP_API_KEY=your-token bun run examples/raw-request.ts
```

Use a single key for account-specific reporting: a multi-key client rotates on unbound reads, so otherwise sequential calls can return data for **different accounts**.

## Retrieve outputs from an existing hash

```bash
MVSEP_API_KEY=your-token bun run examples/download-job.ts JOB_HASH ./stems
```

The destination is created automatically and existing files are not overwritten. To download a **single** output:

```ts
const result = await client.getSeparation(hash);
const [first] = getOutputFiles(result);
if (!first) throw new Error('No downloadable outputs yet');
await client.downloadToFile(first.url, './stems/first.wav', {
  maxBytes: 8 * 1024 ** 3,
  onProgress({ loaded, total }) {
    console.log(`${loaded} / ${total ?? 'unknown'} bytes`);
  },
});
```

## Submit a new file (**possibly billable**)

```bash
MVSEP_API_KEY=your-token \
MVSEP_MODEL_ID=20 \
MVSEP_ALLOW_PAID=1 \
bun run examples/process-file.ts song.wav ./stems
```

The example requires an explicit paid-job opt-in to prevent accidental spending. Replace algorithm ID 20 with a currently offered single-upload model discovered by the public API. For enforced pricing limits, use [guarded creation](/mvsep-client/guides/credits/) instead.

## Schedule a batch (**possibly billable**)

```bash
MVSEP_API_KEY=your-token \
MVSEP_MODEL_ID=20 \
MVSEP_ALLOW_PAID=1 \
bun run examples/batch-jobs.ts
```

**Replace the example URLs** with your real input URLs. The manifest enforces a batch estimated-credit cap and writes checkpoint records atomically. A `pending` marker after an uncertain POST is **not** evidence the remote job failed; reconcile it with MVSep history first.

## Serve a protected webhook endpoint

```bash
MVSEP_API_KEY=your-token \
WEBHOOK_BEARER=your-long-random-secret \
MVSEP_EXPECTED_HASH=JOB_HASH \
bun run examples/webhook-server.ts
```

This binds to `127.0.0.1:8788`. Expose it only behind **TLS and a reverse proxy** that authenticates requests, or adapt the authentication to your application. The code checks a bearer token before reading the body, enforces a size cap, matches a known hash and verifies status with MVSep. No upstream signature scheme is assumed.

## API examples that do not need a standalone script

### Find benchmarks and demos

```ts
const news = await client.getNews({ lang: 'en', limit: 5 });
const demos = await client.getDemoSeparations({ algorithmId: 20, limit: 5 });
const leaderboard = await client.getQualityLeaderboard({ limit: 10 });
const qualityQueue = await client.getQualityQueue({ limit: 5 });
const first = leaderboard.data[0];
if (first) console.log(await client.getQualityEntry(first.id));
console.log({ news: news.length, demos: demos.length, qualityQueue: qualityQueue.length });
```

### Poll or cancel a known job

```ts
const status = await client.getSeparation(hash);
const remote = await client.getRemoteSeparation(hash);
console.log(status.status, remote.status);
// Explicit actions; NEVER run these as part of a read-only poll:
// await client.cancelSeparation(hash);
// await client.deleteSeparation(hash);
```

### Change account settings (explicit mutation)

```ts
await client.setCreditAlert(100);
await client.setPremiumUsageEnabled(false); // avoid Premium billing
await client.setLongFilenamesEnabled(true);
```

These changes affect the account corresponding to the **selected** key. For deterministic account settings, use a one-key client.

### Choose a direct output stream

```ts
import { createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';

const nodeStream = createWriteStream('./stems/vocals.wav');
const webStream = Writable.toWeb(nodeStream) as WritableStream<Uint8Array>;
await client.downloadToStream(outputUrl, webStream, { maxBytes: 8 * 1024 ** 3 });
```

For disk files, prefer `downloadToFile`: unlike a raw caller-provided stream it writes to a temporary file and promotes it atomically on success.

### Inspect errors and control deadlines

```ts
import { MvsepTimeoutError, MvsepJobFailedError } from '@rikhoffbauer/mvsep-client';

const controller = new AbortController();
try {
  await client.waitForSeparation(hash, {
    intervalMs: 2_000, maxWaitMs: 30 * 60_000, signal: controller.signal,
  });
} catch (error) {
  if (error instanceof MvsepTimeoutError) console.error('The local deadline was reached');
  else if (error instanceof MvsepJobFailedError) console.error(error.result.status);
  else throw error;
}
// controller.abort() stops local waiting but does not cancel the server job.
```

For full signatures and available option fields, see the [client reference](/mvsep-client/reference/client/), [options](/mvsep-client/reference/options/), [types](/mvsep-client/reference/types/) and [utility APIs](/mvsep-client/reference/utilities/).
