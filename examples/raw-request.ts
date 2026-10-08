/** Explicit, authenticated read-only endpoint through the low-level request API. */
import { MvsepClient, type MvsepUser } from '../src/index.js';

const key = process.env.MVSEP_API_KEY;
if (!key) throw new Error('Set MVSEP_API_KEY');
const client = new MvsepClient({ apiKeys: key });
const user = await client.request<{ success: boolean; data?: MvsepUser }>({
  method: 'GET',
  path: '/app/user',
  authenticated: true,
  idempotent: true,
  timeoutMs: 15_000,
});
// Low-level responses may expose api_token; do not log the payload.
console.log({ success: user.success, name: user.data?.name });
