import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import relay from '../api/relay.js';

async function serving(callback) {
  const server = createServer((req, res) => { void relay(req, res); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await callback('http://127.0.0.1:' + server.address().port + '/api/relay'); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const origin = 'https://rikhoffbauer.github.io';
const call = (url, options = {}) => fetch(url, { ...options, headers: { Origin: origin, ...options.headers } });

test('rejects unsupported origins even for preflight', async () => {
  await serving(async base => {
    const denied = await fetch(base + '?path=%2Fapp%2Fuser', { headers: { Origin: 'https://evil.example' } });
    assert.equal(denied.status, 403);
    const opts = await call(base, { method: 'OPTIONS' });
    assert.equal(opts.status, 204);
    assert.equal(opts.headers.get('access-control-allow-origin'), origin);
  });
});
test('prevents arbitrary endpoints, hosts and credentials in relay URLs', async () => {
  await serving(async base => {
    for (const query of ['path=%2Fnot-allowed', 'path=%2Fapp%2Fuser&region=evil', 'path=%2Fapp%2Fuser&api_token=secret', 'path=%2Fapp%2Fuser&hacker=1']) {
      const response = await call(base + '?' + query);
      assert.equal(response.status, 400, query);
    }
    assert.equal((await call(base + '?path=%2Fseparation%2Fcreate', { method: 'GET' })).status, 400);
    assert.equal((await call(base + '?path=%2Fapp%2Fuser', { method: 'POST' })).status, 400);
  });
});
test('forwards authenticated GET only to fixed MVSep host, redacts tokens', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith('http://127.0.0.1')) return original(url, init);
    calls.push({ url: String(url), method: init.method });
    return Response.json({ success: true, data: { name: 'test', api_token: 'secret-api-token' } });
  };
  try {
    await serving(async base => {
      const response = await original(base + '?path=%2Fapp%2Fuser&region=de', { headers: { Origin: origin, 'X-Mvsep-Token': 'secret-api-token' } });
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).data, { name: 'test', api_token: '[REDACTED]' });
    });
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).host, 'de.mvsep.com');
    assert.equal(new URL(calls[0].url).searchParams.get('api_token'), 'secret-api-token');
  } finally { globalThis.fetch = original; }
});
test('POST rejects requests without a key, invalid Content-Type or oversized upload', async () => {
  await serving(async base => {
    const path = base + '?path=%2Fseparation%2Fcreate';
    assert.equal((await call(path, { method: 'POST' })).status, 400);
    assert.equal((await call(path, { method: 'POST', headers: { 'X-Mvsep-Token': 'a', 'Content-Type': 'application/json' }, body: '{}' })).status, 415);
    assert.equal((await call(path, { method: 'POST', headers: { 'X-Mvsep-Token': 'a' }, body: new FormData() })).status, 400);
  });
});
