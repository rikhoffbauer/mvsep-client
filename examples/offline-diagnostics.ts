/** Mocked requests + structured diagnostics; zero networking and no API key. */
import assert from 'node:assert/strict';
import { MvsepClient } from '../src/index.js';
import { MvsepDiagnostics } from '../src/diagnostics.js';

const diagnostics = new MvsepDiagnostics(20);
const client = new MvsepClient({
  fetch: (async () => Response.json([{ render_id: 20, name: 'Example', audio_widget: 'single_upload' }])) as typeof fetch,
  onProgress: diagnostics.onProgress,
});
const unsubscribe = diagnostics.subscribe(record => console.log(record.type, record.path));
const algorithms = await client.getAlgorithms();
assert.equal(algorithms.length, 1);
assert.ok(diagnostics.snapshot().some(record => record.type === 'request'));
unsubscribe();
diagnostics.clear();
assert.equal(diagnostics.snapshot().length, 0);
console.log('Offline diagnostics example passed');
