/**
 * Offline credit guard test: unknown pricing, over-budget estimate,
 * missing credits, and successful under-cap submission.
 * No live MVSep calls or billable jobs.
 * Run: bun run examples/credit-guards.ts
 */
import assert from 'node:assert/strict';
import { MvsepClient } from '../src/index.js';

const calls: string[] = [];
let priceCoefficient: number | undefined = 3;
let accountCredits = 20;
let allowPremium = true;
const fakeFetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  calls.push(url.pathname);
  if (url.pathname.endsWith('/app/algorithms')) {
    return Response.json([{ render_id: 20, name: 'Test model',
      audio_widget: 'single_upload', ...(priceCoefficient !== undefined ? { price_coefficient: priceCoefficient } : {}) }]);
  }
  if (url.pathname.endsWith('/app/user')) {
    return Response.json({ success: true, data: {
      premium_minutes: accountCredits, premium_enabled: allowPremium,
    } });
  }
  if (url.pathname.endsWith('/separation/create')) {
    return Response.json({ success: true, data: { hash: 'example-hash' } });
  }
  throw new Error(`Unexpected mocked endpoint: ${url.pathname}`);
}) as typeof fetch;
const client = new MvsepClient({ apiKeys: 'mock-key', fetch: fakeFetch });
const input = { sepType: 20, url: 'https://example.com/a.wav' };
const options = { durationSeconds: 180, maxEstimatedCredits: 10, checkAccountBalance: true };

priceCoefficient = undefined;
await assert.rejects(client.createGuardedSeparation(input, options), /Cannot verify/);
assert.equal(calls.filter(path => path.endsWith('/separation/create')).length, 0);

priceCoefficient = 3;
await assert.rejects(client.createGuardedSeparation(input, { ...options, maxEstimatedCredits: 5 }), /maximum/);
assert.equal(calls.filter(path => path.endsWith('/separation/create')).length, 0);

accountCredits = 1;
await assert.rejects(client.createGuardedSeparation(input, options), /balance/);
assert.equal(calls.filter(path => path.endsWith('/separation/create')).length, 0);

accountCredits = 20;
allowPremium = false;
await assert.rejects(client.createGuardedSeparation(input, options), /not enabled/);
assert.equal(calls.filter(path => path.endsWith('/separation/create')).length, 0);

allowPremium = true;
const accepted = await client.createGuardedSeparation(input, options);
assert.equal(accepted.data?.hash, 'example-hash');
assert.equal(calls.filter(path => path.endsWith('/separation/create')).length, 1);
console.log('Credit estimate + budget + account checks passed offline');
