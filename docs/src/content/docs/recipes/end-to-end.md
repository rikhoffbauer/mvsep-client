---
title: End-to-end separation
description: A Bun/Node TypeScript example from a WAV to extracted stems.
---

This script discovers available algorithms, submits a disk-backed audio file, waits for processing, and downloads the outputs sequentially.

```ts
import { mkdir } from 'node:fs/promises';
import { MvsepClient, fileBlobFromPath } from '@rikhoffbauer/mvsep-client';

const apiKey = process.env.MVSEP_API_KEY;
if (!apiKey) throw new Error('MVSEP_API_KEY is required');

const [filename, outputDir = './stems'] = process.argv.slice(2);
if (!filename) throw new Error('Usage: bun run separate.ts INPUT.wav [OUT_DIR]');

const client = new MvsepClient({
  apiKeys: apiKey,
  onProgress(event) {
    if (event.type === 'poll') console.log(event.status, event.fraction ?? '—');
  },
});

const models = await client.getAlgorithms('single_upload');
const selected = models.find(model => model.render_id === 20);
if (!selected) throw new Error('Example model ID 20 is unavailable; choose another');

const result = await client.createAndWait(
  { sepType: selected.render_id, audiofile: await fileBlobFromPath(filename) },
  { maxWaitMs: 60 * 60_000 },
);

await mkdir(outputDir, { recursive: true });
const manifest = await client.downloadSeparationOutputs(result, outputDir);
for (const file of manifest.files) console.log(file.path);
if (manifest.errors.length) {
  console.error(manifest.errors);
  process.exitCode = 1;
}
```

Run:

```bash
MVSEP_API_KEY=your-token bun run separate.ts input.wav ./stems
```

For premium-priced models, use [guarded creation](/mvsep-client/guides/credits/) rather than unguarded `createAndWait`. For unattended automation, persist a handle immediately after `createJob()` returns, or use [batch checkpoints](/mvsep-client/guides/batch/).
