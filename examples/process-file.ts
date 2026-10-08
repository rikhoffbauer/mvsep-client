/**
 * A COMPLETE job lifecycle. May spend credits; requires explicit MVSEP_ALLOW_PAID=1.
 * Run: MVSEP_API_KEY=... MVSEP_MODEL_ID=20 MVSEP_ALLOW_PAID=1 bun run examples/process-file.ts song.wav ./stems
 */
import { mkdir } from 'node:fs/promises';
import { MvsepClient, fileBlobFromPath, MvsepJobFailedError } from '../src/index.js';

if (process.env.MVSEP_ALLOW_PAID !== '1') throw new Error('Set MVSEP_ALLOW_PAID=1 to authorize a possibly paid job');
const apiKey = process.env.MVSEP_API_KEY;
const algorithm = Number(process.env.MVSEP_MODEL_ID);
const [filename, directory = './stems'] = process.argv.slice(2);
if (!apiKey || !filename || !Number.isSafeInteger(algorithm) || algorithm < 0) {
  throw new Error('Set MVSEP_API_KEY, MVSEP_MODEL_ID and provide INPUT.wav [OUTPUT_DIR]');
}
const client = new MvsepClient({
  apiKeys: apiKey,
  retry: { unsafeCreateRetries: 'safe' },
  onProgress(event) {
    if (event.type === 'poll') console.log('poll:', event.status, event.fraction ?? 'unknown');
  },
});
const model = await client.getAlgorithm(algorithm);
if (model.audio_widget !== 'single_upload') throw new Error('Select a single-upload algorithm');

const handle = await client.createJob({ sepType: algorithm, audiofile: await fileBlobFromPath(filename) });
console.log('Accepted job handle (persist immediately in production):', handle);
try {
  const completed = await client.waitForJob(handle, { maxWaitMs: 60 * 60_000 });
  await mkdir(directory, { recursive: true });
  const manifest = await client.downloadSeparationOutputs(completed, directory, {
    onFileProgress(file, progress) {
      console.log(file.name, progress.loaded, '/', progress.total ?? '?');
    },
  });
  console.log('Files:', manifest.files.map(file => file.path));
  if (manifest.errors.length > 0) throw new Error(JSON.stringify(manifest.errors));
} catch (error) {
  if (error instanceof MvsepJobFailedError) console.error('Remote status:', error.result.status);
  throw error;
}
