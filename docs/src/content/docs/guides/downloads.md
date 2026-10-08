---
title: Streaming downloads
description: Download large stems with bounded memory, backpressure and atomic files.
---

## Download one output to disk

```ts
const receipt = await client.downloadToFile(
  'https://de.mvsep.com/path/to/output.wav',
  './stems/vocals.wav',
  {
    maxBytes: 4 * 1024 ** 3,
    overwrite: false,
    onProgress({ loaded, total, fraction }) {
      console.log({ loaded, total, fraction });
    },
  },
);
console.log(receipt.path, receipt.loaded);
```

Create the destination directory yourself. The file is written into a temporary sibling `.part` file and promoted atomically on success; failed transfers clean up temporary content. A pre-existing destination is not overwritten unless `overwrite: true`.

## Write to a web stream

```ts
const receipt = await client.downloadToStream(outputUrl, writableStream, {
  maxBytes: 4 * 1024 ** 3,
  timeoutMs: 15 * 60_000,
});
```

The writer is backpressure-aware. Its stream is closed on success and aborted on failure. Pass a consumer-provided `WritableStream<Uint8Array>`.

## Materialize all results

```ts
const manifest = await client.downloadSeparationOutputs(result, './stems', {
  onFileProgress(file, progress, index, count) {
    console.log(index + 1, count, file.name, progress.loaded);
  },
});
console.table(manifest.files);
if (manifest.errors.length) console.error(manifest.errors);
```

You can pass a `SeparationResult` or a job hash. Files are processed sequentially, named safely, and duplicates get deterministic suffixes. Results may represent preset output nodes: **do not assign stem labels from filename order**.

## Buffer smaller files

```ts
const bytes = await client.download(outputUrl, { maxBytes: 32 * 1024 * 1024 });
```

`download()` returns `Uint8Array` and has a 256 MiB default cap; it buffers the whole response and should not be used for multigigabyte stems.

:::note[Retries and integrity]
Download GETs can retry on transient errors **before any bytes have been written**. If a transfer fails after receiving bytes, it stops rather than silently replaying data into a partially written file. HTTP Range/resume is not implemented. The implementation verifies declared `Content-Length` when meaningful but does not provide a cryptographic checksum from the server.
:::
