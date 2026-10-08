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
