/**
 * Minimal authenticated webhook receiver with server-side verification.
 * MVSEP_API_KEY=... WEBHOOK_BEARER=... MVSEP_EXPECTED_HASH=... bun run examples/webhook-server.ts
 * Configure a reverse proxy with TLS; this local listener is not internet-ready.
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { MvsepClient } from '../src/index.js';
import { MvsepWebhookReceiver } from '../src/webhooks.js';

const token = process.env.WEBHOOK_BEARER;
const hash = process.env.MVSEP_EXPECTED_HASH;
const apiKey = process.env.MVSEP_API_KEY;
if (!token || !hash || !apiKey) throw new Error('Set WEBHOOK_BEARER, MVSEP_EXPECTED_HASH, MVSEP_API_KEY');
const client = new MvsepClient({ apiKeys: apiKey });
const receiver = new MvsepWebhookReceiver({ verify: value => client.getSeparation(value) });
const expected = Buffer.from(`Bearer ${token}`);

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404).end(); return;
  }
  const supplied = Buffer.from(req.headers.authorization ?? '');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(401).end(); return;
  }
  try {
    const parts: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.from(chunk as Uint8Array);
      bytes += buffer.length;
      if (bytes > 128 * 1024) { res.writeHead(413).end(); return; }
      parts.push(buffer);
    }
    const notification = await receiver.receive('configured-account', hash, Buffer.concat(parts).toString());
    console.log(notification.duplicate ? 'duplicate' : 'verified', notification.result.status);
    res.writeHead(204).end();
  } catch (error) {
    console.error('Invalid/unverified notification:', error);
    res.writeHead(400).end();
  }
}).listen(8788, '127.0.0.1', () => {
  console.log('Webhook listener on http://127.0.0.1:8788/webhook (TLS/auth proxy required)');
});
