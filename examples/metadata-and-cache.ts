/** Read-only metadata cache and utility examples. */
import { MvsepClient, estimateJobCredits, safeOutputFilename, getOutputFiles } from '../src/index.js';
import { FileMetadataCache } from '../src/metadata-cache.js';

const cache = new FileMetadataCache('./.mvsep-models');
const client = new MvsepClient({ algorithmsCache: cache, algorithmsCacheTtlMs: 300_000 });
const algorithms = await client.getAlgorithms('single_upload');
console.log('Algorithm count:', algorithms.length);
console.log('First ID:', algorithms[0]?.render_id);
const snapshot = await cache.readSnapshot();
console.log('Cache valid until:', snapshot && new Date(snapshot.expiresAt).toISOString());
const first = algorithms[0];
if (first) console.log('3-minute estimate:', estimateJobCredits(first, 180));
console.log('Sanitized name:', safeOutputFilename('../../drums:lead.wav'));
console.log('Normalized output:', getOutputFiles({ success: true, status: 'done', data: {
  files: [{ name: 'vocals.wav', url: 'https://example.com/vocals.wav', size: '1024' }],
} }));
// To bypass a stale snapshot: await client.getAlgorithms('single_upload', { refresh: true });
// To discard it: await client.invalidateAlgorithms('single_upload');
