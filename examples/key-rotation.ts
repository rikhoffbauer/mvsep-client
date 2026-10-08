/**
 * Offline, zero-credit demonstration of round-robin, sticky, HTTP 401 and HTTP 429 failover.
 * Run: bun run examples/key-rotation.ts
 */
import assert from 'node:assert/strict';
import { MvsepClient } from '../src/index.js';

function mockedFetch(reply: (key: string) => Response, observed: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const key = url.searchParams.get('api_token') ?? '';
    observed.push(key);
    return reply(key);
  }) as typeof fetch;
}
const ok = (key: string) => Response.json({ success: true, data: { name: `account-${key}` } });

// Normal round robin rotates on each NEW, UNBOUND, AUTHENTICATED operation.
{
  const observed: string[] = [];
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    keyIdentifiers: ['account-A', 'account-B'],
    fetch: mockedFetch(ok, observed),
    keyRotation: { strategy: 'round_robin' },
    onProgress(event) {
      if (event.type === 'request' && event.phase === 'start') {
        console.log(`request #${event.attempt}, keyIndex=${event.keyIndex}`);
      }
    },
  });
  await client.getUser();
  await client.getUser();
  await client.getUser();
  assert.deepEqual(observed, ['key-A', 'key-B', 'key-A']);
  console.log('round_robin:', observed);
}

// Sticky selection keeps the same key while it remains available.
{
  const observed: string[] = [];
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: mockedFetch(ok, observed),
    keyRotation: { strategy: 'sticky' },
  });
  await client.getUser();
  await client.getUser();
  await client.getUser();
  assert.deepEqual(observed, ['key-A', 'key-A', 'key-A']);
  console.log('sticky:', observed);
}

// An explicitly rejected 401 disables key A in this client and retries with B.
{
  const observed: string[] = [];
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: mockedFetch(key => key === 'key-A'
      ? Response.json({ success: false, message: 'Invalid token' }, { status: 401 })
      : ok(key), observed),
    retry: { maxAttempts: 3, baseDelayMs: 0 },
  });
  const user = await client.getUser();
  assert.equal(user.name, 'account-key-B');
  assert.deepEqual(observed, ['key-A', 'key-B']);
  assert.equal(client.apiKeyState[0]?.disabled, true);
  console.log('401 failover:', observed, client.apiKeyState);
}

// A 429 adds cooldown to A; B can handle this unbound request immediately.
{
  const observed: string[] = [];
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: mockedFetch(key => key === 'key-A'
      ? Response.json({ success: false, message: 'Too many requests' }, {
          status: 429, headers: { 'Retry-After': '30' },
        })
      : ok(key), observed),
    retry: { maxAttempts: 3, baseDelayMs: 0 },
  });
  await client.getUser();
  assert.deepEqual(observed, ['key-A', 'key-B']);
  assert.ok((client.apiKeyState[0]?.cooldownUntil ?? 0) > Date.now());
  console.log('429 failover:', observed, client.apiKeyState);
}


// A create POST may fail over after an explicit 401, but should never be replayed
// after an ambiguous transport failure. Simulated requests cannot spend credits.
{
  const observed: string[] = [];
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const key = String((init?.body as FormData).get('api_token'));
    observed.push(key);
    return key === 'key-A'
      ? Response.json({ success: false, message: 'Invalid token' }, { status: 401 })
      : Response.json({ success: true, data: { hash: 'accepted-b' } });
  }) as typeof fetch;
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: fetchImpl,
    retry: { maxAttempts: 3, unsafeCreateRetries: 'safe', baseDelayMs: 0 },
  });
  const created = await client.createSeparation({ sepType: 20, url: 'https://example.com/a.wav' });
  assert.equal(created.data?.hash, 'accepted-b');
  assert.deepEqual(observed, ['key-A', 'key-B']);
  assert.equal(client.getJobApiKeyIndex('accepted-b'), 1);
  console.log('safe POST 401 failover:', observed);
}
{
  const observed: string[] = [];
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const key = String((init?.body as FormData).get('api_token'));
    observed.push(key);
    return key === 'key-A'
      ? Response.json({ success: false, message: 'Rate limit' }, { status: 429 })
      : Response.json({ success: true, data: { hash: 'accepted-b-after-429' } });
  }) as typeof fetch;
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: fetchImpl,
    retry: { maxAttempts: 3, unsafeCreateRetries: 'safe', baseDelayMs: 0 },
  });
  await client.createSeparation({ sepType: 20, url: 'https://example.com/a.wav' });
  assert.deepEqual(observed, ['key-A', 'key-B']);
  console.log('safe POST 429 failover:', observed);
}
{
  let attempts = 0;
  const fetchImpl = (async () => {
    attempts++;
    throw new TypeError('The POST might already have reached the server');
  }) as typeof fetch;
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: fetchImpl,
    retry: { maxAttempts: 5, unsafeCreateRetries: 'safe', baseDelayMs: 0 },
  });
  await assert.rejects(client.createSeparation({ sepType: 20, url: 'https://example.com/a.wav' }));
  assert.equal(attempts, 1);
  console.log('ambiguous POST failed without an automatic retry:', attempts);
}

// An accepted job is pinned to its original account; 429 retries stay on A.
{
  const observed: string[] = [];
  let jobReads = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const key = method === 'POST' ? String((init?.body as FormData).get('api_token'))
      : url.searchParams.get('api_token') ?? '';
    observed.push(key);
    if (url.pathname.endsWith('/separation/create')) {
      return Response.json({ success: true, data: { hash: 'owned-by-A' } });
    }
    if (++jobReads === 1) {
      return Response.json({ success: false, message: 'Slow down' }, {
        status: 429, headers: { 'Retry-After': '0' },
      });
    }
    return Response.json({ success: true, status: 'done', data: { hash: 'owned-by-A' } });
  }) as typeof fetch;
  const client = new MvsepClient({
    apiKeys: ['key-A', 'key-B'],
    fetch: fetchImpl,
    retry: { maxAttempts: 3, baseDelayMs: 0 },
  });
  const result = await client.createSeparation({ sepType: 20, url: 'https://example.com/a.wav' });
  await client.getSeparation(result.data!.hash!);
  assert.deepEqual(observed, ['key-A', 'key-A', 'key-A']);
  console.log('pinned-job retry never switches accounts:', observed);
}

console.log('All rotation and paid-create safety scenarios passed offline; no live API calls or paid jobs.');
