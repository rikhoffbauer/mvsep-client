/**
 * Offline, zero-credit demonstration that accepted jobs remain on their originating key,
 * including when apiKeys are REORDERED after a restart.
 * Run: bun run examples/key-affinity.ts
 */
import assert from 'node:assert/strict';
import { MvsepClient } from '../src/index.js';

const calls: Array<{ method: string; path: string; key: string }> = [];
const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const key = method === 'POST'
    ? String((init?.body as FormData).get('api_token'))
    : url.searchParams.get('api_token') ?? '';
  calls.push({ method, path: url.pathname, key });
  if (url.pathname.endsWith('/separation/create')) {
    return Response.json({ success: true, data: { hash: 'created-job-123' } });
  }
  if (url.pathname.endsWith('/separation/get')) {
    return Response.json({ success: true, status: 'done', data: { hash: 'created-job-123', files: [] } });
  }
  return Response.json({ success: true, data: { name: key } });
}) as typeof fetch;

const creator = new MvsepClient({
  apiKeys: ['key-A', 'key-B'],
  keyIdentifiers: ['account-A', 'account-B'],
  fetch: fakeFetch,
});

// On a real server this would create a (possibly paid) separation.
const handle = await creator.createJob({ sepType: 20, url: 'https://example.com/demo.wav' });
assert.equal(handle.keyId, 'account-A');
assert.equal(creator.getJobApiKeyIndex(handle.hash), 0);
await creator.getUser(); // an unbound call will rotate to key-B
await creator.getSeparation(handle.hash); // must still use key-A
assert.equal(calls.at(-1)?.key, 'key-A');

// Simulate process restart and reordering the key array.
const restored = new MvsepClient({
  apiKeys: ['key-B', 'key-A'],
  keyIdentifiers: ['account-B', 'account-A'],
  fetch: fakeFetch,
});
const result = await restored.waitForJob(JSON.parse(JSON.stringify(handle)));
assert.equal(result.status, 'done');
assert.equal(restored.getJobApiKeyIndex(handle.hash), 1);
assert.equal(calls.at(-1)?.key, 'key-A'); // key A now has index 1

console.table(calls);
console.log('Affinity + recovery checks passed; no live calls or paid jobs.');
