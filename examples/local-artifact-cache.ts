/**
 * Offline SHA-256 local artifact-cache demo, including corruption detection.
 * Run: bun run examples/local-artifact-cache.ts
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalArtifactCache } from '../src/local-cache.js';

const temporary = await mkdtemp(join(tmpdir(), 'mvsep-cache-example-'));
try {
  const input = join(temporary, 'source.wav');
  const output = join(temporary, 'vocals.wav');
  await writeFile(input, 'example input bytes');
  await writeFile(output, 'example output bytes');
  const cache = new LocalArtifactCache(join(temporary, 'manifest'));
  const modelRevision = 'model-20-revision-A';
  const accountId = 'studio-account';
  const { key, inputHash } = await cache.keyForFile(input, {
    modelRevision, accountId, separation: { sepType: 20, addOpt1: 0 },
  });
  assert.equal(await cache.lookup(key), null); // no cached outputs yet

  await cache.record({ key, inputHash, modelRevision, accountId, paths: [output] });
  const hit = await cache.lookup(key);
  assert.equal(hit?.outputs.length, 1);
  console.log('Verified cache hit:', hit?.outputs[0]?.sha256);

  // A file that has changed since recording is never returned as a cache hit.
  await writeFile(output, 'corrupted output bytes');
  assert.equal(await cache.lookup(key), null);
  console.log('Output modified; cache correctly misses');
  assert.equal((await readFile(input)).length > 0, true);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log('Local cache example passed without API calls');
