/** Download outputs for an existing job. No new job created. */
import { mkdir } from 'node:fs/promises';
import { MvsepClient } from '../src/index.js';

const [hash, directory = './stems'] = process.argv.slice(2);
if (!hash) throw new Error('Usage: bun run examples/download-job.ts JOB_HASH [OUTPUT_DIRECTORY]');
const client = new MvsepClient({
  ...(process.env.MVSEP_API_KEY ? { apiKeys: process.env.MVSEP_API_KEY } : {}),
});
await mkdir(directory, { recursive: true });
const manifest = await client.downloadSeparationOutputs(hash, directory, {
  maxBytes: 8 * 1024 ** 3,
  overwrite: false,
  onFileProgress(file, progress, index, count) {
    console.log(`${index + 1}/${count}`, file.name, progress.loaded, progress.total ?? '?');
  },
});
if (manifest.errors.length > 0) throw new Error(JSON.stringify(manifest.errors));
console.table(manifest.files);
