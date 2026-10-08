/**
 * Crash-aware batch with atomic local checkpoints. May spend credits.
 * MVSEP_ALLOW_PAID=1 MVSEP_API_KEY=... MVSEP_MODEL_ID=20 bun run examples/batch-jobs.ts
 */
import { readFile, writeFile, rename } from 'node:fs/promises';
import { MvsepClient, type MvsepJobHandle } from '../src/index.js';
import { BatchRunner, runBatch } from '../src/batch.js';

if (process.env.MVSEP_ALLOW_PAID !== '1') throw new Error('Explicitly set MVSEP_ALLOW_PAID=1 before submitting paid jobs');
const apiKey = process.env.MVSEP_API_KEY;
const modelId = Number(process.env.MVSEP_MODEL_ID);
if (!apiKey || !Number.isSafeInteger(modelId)) throw new Error('Set MVSEP_API_KEY and MVSEP_MODEL_ID');

const checkpointFile = './batch-checkpoints.json';
const store = {
  async load(): Promise<MvsepJobHandle[]> {
    try { return JSON.parse(await readFile(checkpointFile, 'utf8')) as MvsepJobHandle[]; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  },
  async save(handles: readonly MvsepJobHandle[]): Promise<void> {
    await writeFile(checkpointFile + '.tmp', JSON.stringify(handles, null, 2), { mode: 0o600 });
    await rename(checkpointFile + '.tmp', checkpointFile);
  },
};
const client = new MvsepClient({ apiKeys: apiKey });
const runner = new BatchRunner();
const jobs = [
  { id: 'stable-song-a', durationSeconds: 180,
    input: { sepType: modelId, url: 'https://example.com/a.wav' } },
  { id: 'stable-song-b', durationSeconds: 180,
    input: { sepType: modelId, url: 'https://example.com/b.wav' } },
];
const result = await runBatch(client, jobs, {
  maxActiveJobs: 1,
  maxEstimatedCredits: 10,
  checkpointStore: store,
  runner,
  onJobEvent(index, phase, value) { console.log(index, phase, value); },
});
console.log(result);
// IMPORTANT: An unresolved `pending` checkpoint must be reconciled with account
// history manually before retrying. Never erase it just to force re-submission.
