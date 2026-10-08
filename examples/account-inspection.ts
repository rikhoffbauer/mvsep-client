/** Read-only account inspection: MVSEP_API_KEY=... bun run examples/account-inspection.ts */
import { MvsepClient } from '../src/index.js';

const apiKey = process.env.MVSEP_API_KEY;
if (!apiKey) throw new Error('Set MVSEP_API_KEY to run this read-only example');
const client = new MvsepClient({ apiKeys: apiKey });
const [user, queue, history, purchases, alert] = await Promise.all([
  client.getUser(), client.getQueueSummary(),
  client.getSeparationHistory({ start: 0, limit: 5 }),
  client.getPurchases({ limit: 5 }), client.getCreditAlert(),
]);
console.log('User:', user.name, 'credits:', user.premium_minutes, 'premium enabled:', user.premium_enabled);
console.log('Queue:', queue.queued, 'running:', queue.processing, 'ETA:', queue.estimated_wait_seconds ?? 'unknown');
console.log('Previous jobs:', history.map(job => job.hash));
console.log('Purchase count:', purchases.total, 'credit-alert threshold:', alert.credit_threshold);
// No mutations performed. Use a separate one-key client for each account's billing.
