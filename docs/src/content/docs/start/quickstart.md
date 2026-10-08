---
title: Quick start
description: From a source audio file to separated outputs in a handful of calls.
---

## 1. Configure a client

```ts
import { MvsepClient } from '@rikhoffbauer/mvsep-client';

const client = new MvsepClient({
  apiKeys: process.env.MVSEP_API_KEY,
  onProgress(event) {
    if (event.type === 'poll') {
      console.log(event.status, event.fraction ?? 'unknown');
    }
  },
});
```

Supply the API key through a runtime environment variable rather than embedding it in code. Authenticated raw GET requests use an MVSep-required query token; SDK error URLs redact credentials.

## 2. Find an algorithm

```ts
const algorithms = await client.getAlgorithms('single_upload');
console.table(algorithms.map(a => ({ id: a.render_id, name: a.name })));
```

Choose an ID appropriate for your input and required stems. IDs below are only examples and may change.

## 3. Create and wait for a job

```ts
import { fileBlobFromPath } from '@rikhoffbauer/mvsep-client';

const result = await client.createAndWait(
  {
    audiofile: await fileBlobFromPath('song.wav', 'audio/wav'),
    sepType: 20,
  },
  {
    intervalMs: 2_000,
    maxWaitMs: 30 * 60_000,
  },
);

console.log(result.status, result.data?.files);
```

`createAndWait` performs one create request followed by polling. The returned `status` is `done` for successful jobs. A failed or missing job throws `MvsepJobFailedError` by default.

## 4. Download outputs

```ts
const manifest = await client.downloadSeparationOutputs(result, './stems');
if (manifest.errors.length > 0) {
  throw new Error(JSON.stringify(manifest.errors));
}
console.log(manifest.files.map(file => file.path));
```

Create the destination directory before downloading. Transfers stream to temporary sibling files and rename them after completion; existing files are protected unless `overwrite: true`.

:::caution[Paid operations]
Create requests can consume credits. Default retries do not replay ambiguous create failures. Before creating expensive jobs, consider [credit estimates and spend caps](/mvsep-client/guides/credits/).
:::

## Next steps

The [example gallery](/mvsep-client/recipes/example-gallery/) includes complete, typechecked programs for each major workflow. Use [API key rotation](/mvsep-client/guides/api-key-rotation/) when configuring multiple credentials.

- [Algorithm metadata](/mvsep-client/guides/algorithms/): determine the right model and its options.
- [Upload and submission modes](/mvsep-client/guides/submissions/): URLs, presets and no-upload models.
- [Crash recovery](/mvsep-client/guides/recovery/): resume a long-running job after restarting your app.
