---
title: Utilities & optional modules
description: Streaming helpers, batch runner, metadata cache, local artifact reuse, webhooks and diagnostics.
---

## Package entry points

```ts
import { MvsepClient, fileBlobFromPath, fileFromPath,
  estimateJobCredits, getOutputFiles, prepareSeparation,
  validateSeparation, parseWebhook, reconcileWebhook } from '@rikhoffbauer/mvsep-client';

import { runBatch, BatchRunner } from '@rikhoffbauer/mvsep-client/batch';
import { MvsepWebhookReceiver } from '@rikhoffbauer/mvsep-client/webhooks';
import { FileMetadataCache } from '@rikhoffbauer/mvsep-client/metadata-cache';
import { LocalArtifactCache } from '@rikhoffbauer/mvsep-client/local-cache';
import { MvsepDiagnostics } from '@rikhoffbauer/mvsep-client/diagnostics';
```

## File helpers

- `fileBlobFromPath(path, contentType?)`: lazily produces a disk-backed `BinaryPart` (`Promise`) for Bun or Node 20+.
- `fileFromPath(path, contentType?)`: legacy whole-file in-memory variant.
- `getOutputFiles(result)`: normalizes a job's output descriptors while retaining their original metadata.
- `safeOutputFilename(name)`: removes path traversal and characters unsuitable for portable filenames.

## Metadata & pricing helpers

- `estimateJobCredits(algorithm, durationSeconds?)`: pure estimate; `null` means pricing is unknown.
- `validateSeparation(input, algorithm, options?)`: throws on mismatched audio input/widget/options.
- `prepareSeparation({ algorithm, input, fields?, strict? })`: constructs a validated single-algorithm request.
- `FileMetadataCache(directory)`: filesystem TTL cache with `get`, `set`, `delete`, and `readSnapshot` for offline inspection.

## Batch runner

```ts
import { runBatch, BatchRunner } from '@rikhoffbauer/mvsep-client/batch';
const runner = new BatchRunner();
runner.pause();
runner.resume();
runner.stop();
```

`runBatch(client, inputs, options?)` returns `Promise<BatchResult[]>`. `BatchRunner` is a controller for pausing new submissions and stopping local work. See [batch processing](/mvsep-client/guides/batch/).

## Local artifact cache

```ts
const cache = new LocalArtifactCache('./.mvsep-artifacts');
const { key, inputHash } = await cache.keyForFile('song.wav', {
  accountId: 'account-a', modelRevision: '20-revision-a',
  separation: { sepType: 20, addOpt1: 1 },
});
const entry = await cache.lookup(key);
```

`record()` stores a manifest with output file hashes and metadata. `lookup()` verifies the output files still match their hashes; it returns `null` on missing or altered artifacts. This cache **never promises server-side deduplication or savings**.

## Webhooks

`parseWebhook(body)` validates the envelope. `reconcileWebhook(expectedHash, payload, verify?)` checks job correlation and optionally re-fetches authenticated status. `MvsepWebhookReceiver` adds bounded, time-limited per-process deduplication; you must secure incoming HTTP requests.

## Diagnostics

```ts
const diagnostics = new MvsepDiagnostics(500);
const client = new MvsepClient({ onProgress: diagnostics.onProgress });
const unsubscribe = diagnostics.subscribe(record => console.log(record));
console.log(diagnostics.snapshot());
unsubscribe();
diagnostics.clear();
```

Records are bounded and omit credentials, raw URLs, files and response bodies. Subscribers' exceptions do not affect SDK operations.

## Complete cache example: reuse verified local stems

```ts
const cache = new LocalArtifactCache('./.mvsep-artifacts');
const modelRevision = 'vocal-separation-model-revision-1';
const accountId = 'studio-account';
const { key, inputHash } = await cache.keyForFile('./song.wav', {
  modelRevision, accountId,
  separation: { sepType: 20, outputFormat: 1 },
});

const previous = await cache.lookup(key);
if (previous) {
  console.log('Reusing SHA-256 verified outputs:', previous.outputs);
} else {
  // Perform a new job ONLY after explicitly authorizing the expense.
  // Given an already completed job and downloaded output paths:
  // await cache.record({ key, inputHash, modelRevision, accountId,
  //                      paths: ['./stems/vocals.wav', './stems/instrumental.wav'] });
}
```

The [fully runnable local-cache example](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/local-artifact-cache.ts) records and verifies artifacts, then deliberately modifies an output file to demonstrate rejection of a stale entry—without any API call.

The model revision and account label are **caller-provided** cache identity components, not inferred from the upstream API. Invalid or missing output files fail cache lookup. The SDK cannot guarantee the remote API will deduplicate the same input.

## Complete option-validation example

```ts
const algorithm = await client.getAlgorithm(20);
const prepared = client.prepareSeparation({
  algorithm,
  input: { url: 'https://example.com/song.wav' },
  fields: {}, // read algorithm.algorithm_fields for valid keys and labels
});
client.validateSeparation(prepared.input, algorithm, {
  strict: true, registered: true, premium: true,
});
console.log(prepared.input);
// Creation is explicit, and may incur charges:
// await client.createSeparation(prepared.input);
```

## Complete diagnostics example

See [`offline-diagnostics.ts`](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/offline-diagnostics.ts) for a **runnable, zero-credit** test of subscriptions, progress-event recording and clearing the bounded event buffer. [API key rotation](/mvsep-client/guides/api-key-rotation/) demonstrates observing `keyIndex` and `key_rotation` separately.

## All optional subpaths

| Module | Examples | Purpose |
| --- | --- | --- |
| `@rikhoffbauer/mvsep-client/batch` | [`batch-jobs.ts`](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/batch-jobs.ts) | Batch jobs, write-ahead checkpoints, pause/resume |
| `@rikhoffbauer/mvsep-client/local-cache` | Cache example above | SHA-256-based local artifact integrity |
| `@rikhoffbauer/mvsep-client/diagnostics` | [`offline-diagnostics.ts`](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/offline-diagnostics.ts) | Privacy-minded structured telemetry |
| `@rikhoffbauer/mvsep-client/webhooks` | [`webhook-server.ts`](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/webhook-server.ts) | Parse/verify/deduplicate webhook notifications |
| `@rikhoffbauer/mvsep-client/metadata-cache` | [`metadata-and-cache.ts`](https://github.com/rikhoffbauer/mvsep-client/blob/main/examples/metadata-and-cache.ts) | TTL model metadata snapshots |
