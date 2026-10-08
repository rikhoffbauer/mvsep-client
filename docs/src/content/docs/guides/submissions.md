---
title: Submitting jobs
description: Create separations from binary files, remote URLs, presets, matchering or no-upload inputs.
---

Use `createSeparation(input, options?)` to submit a job and receive its hash without waiting for processing. A successful response includes `data.hash`.

## Disk-backed file input

```ts
import { fileBlobFromPath } from '@rikhoffbauer/mvsep-client';

const created = await client.createSeparation({
  sepType: 20,
  audiofile: await fileBlobFromPath('music.wav', 'audio/wav'),
  outputFormat: 1,
});
console.log(created.data?.hash);
```

The `BinaryPart` type also accepts a `Blob`, `ArrayBuffer` or `Uint8Array` with optional `filename` and `contentType`. Use `fileBlobFromPath()` for large files; the older `fileFromPath()` reads the entire file into memory.

## Remote URLs

```ts
const created = await client.createSeparation({
  sepType: 20,
  url: 'https://example.com/music.flac',
  remoteType: 'direct',
});
```

`remoteType` supports `direct`, `mega`, `drive` and `dropbox`. Provide exactly one of `audiofile` or `url` for single-file algorithms.

## Preset runs

```ts
await client.createSeparation({ presetId: 635, url: 'https://example.com/music.wav' });
```

Do **not** supply `sepType`, `addOpt1`, `addOpt2`, `addOpt3` or `outputFormat` alongside `presetId`. The SDK rejects combinations whose fields MVSep would otherwise ignore.

## Matchering and no-upload models

```ts
await client.createSeparation({
  sepType: matcheringAlgorithmId,
  targetAudiofile: await fileBlobFromPath('target.wav'),
  referenceAudiofile: await fileBlobFromPath('reference.wav'),
});

await client.createSeparation({
  sepType: noUploadAlgorithmId,
  addOpt1: 'Prompt for the chosen model',
});
```

Matchering requires **both** files. No-upload inputs are valid only for algorithms that support them; inspect model metadata first.

## Configure a webhook

```ts
await client.createSeparation({
  sepType: 20,
  url: 'https://example.com/music.wav',
  webhookUrl: 'https://my-service.example/hooks/mvsep',
});
```

See [webhook processing](/guides/webhooks/) for verification and duplicate-delivery safety.

:::danger[Ambiguous submission outcome]
If a create request loses its connection after sending, the job **may already exist** and have consumed credits. Under the default `unsafeCreateRetries: 'safe'` policy, the client does not automatically repeat such a request. Check account history before trying again.
:::
