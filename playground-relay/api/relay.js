/**
 * Deliberately narrow, stateless MVSep API bridge for a static GitHub Pages playground.
 * Requests contain users' own API keys. We neither store nor log tokens, bodies or URLs.
 * Only a fixed set of MVSep routes, methods and hostnames can be reached.
 */
export const config = { api: { bodyParser: false } };

const ORIGINS = new Set([
  'https://rikhoffbauer.github.io',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
]);
const REGIONS = Object.freeze({
  apex: 'https://mvsep.com/api',
  de: 'https://de.mvsep.com/api',
  de2: 'https://de2.mvsep.com/api',
  sg: 'https://sg.mvsep.com/api',
});
const GET_PATHS = new Set([
  '/app/algorithms', '/app/user', '/app/queue', '/app/queue/summary',
  '/app/separation_history', '/purchases', '/credit_alert',
  '/separation/get', '/separation/get-remote', '/app/news', '/app/demo',
  '/quality_checker/leaderboard', '/quality_checker/queue', '/quality_checker/entry',
]);
const POST_PATHS = new Set(['/separation/create', '/separation/cancel', '/separation/delete']);
const QUERY_KEYS = new Set([
  'hash', 'scopes', 'mirror', 'start', 'limit', 'status', 'offset',
  'lang', 'algorithm_id', 'additional_options', 'dataset_type', 'sort',
  'algo_name_filter', 'id',
]);
const BUCKETS = new Map(); // best-effort instance-local throttling; platform firewall remains recommended
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_BODY = 3 * 1024 * 1024; // Vercel function transport cap is limited; remote URL preferred for audio

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, child]) =>
      [name, /token|password|secret|authorization|signature/i.test(name) ? '[REDACTED]' : scrub(child)]));
  }
  return value;
}
function consumeSlot(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  if (BUCKETS.size > 1000) for (const [key, value] of BUCKETS) {
    if (value.until < now) BUCKETS.delete(key);
  }
  const bucket = BUCKETS.get(ip);
  if (!bucket || bucket.until < now) { BUCKETS.set(ip, { until: now + WINDOW_MS, count: 1 }); return true; }
  bucket.count++;
  return bucket.count <= MAX_REQUESTS;
}
async function readBoundedBody(req, limit) {
  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (contentLength > limit) { const error = Error('Request body too large'); error.status = 413; throw error; }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) { const error = Error('Request body too large'); error.status = 413; throw error; }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function relay(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (!ORIGINS.has(origin)) return send(res, 403, { error: 'Unsupported Origin' });
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mvsep-Token');
  res.setHeader('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
  if (!consumeSlot(req)) return send(res, 429, { error: 'Playground relay rate limit exceeded' });

  let url;
  try { url = new URL(req.url, 'https://playground-relay.invalid'); }
  catch { return send(res, 400, { error: 'Invalid URL' }); }
  const path = url.searchParams.get('path');
  const region = url.searchParams.get('region') ?? 'apex';
  if (url.searchParams.getAll('path').length !== 1 || !Object.hasOwn(REGIONS, region) ||
      !(req.method === 'GET' ? GET_PATHS : POST_PATHS).has(path)) {
    return send(res, 400, { error: 'Endpoint is not allowed in the playground' });
  }
  const token = req.headers['x-mvsep-token'];
  if ((typeof token !== 'undefined' && (typeof token !== 'string' || token.length > 512 || !token.trim())) ||
      (req.method === 'POST' && !token)) {
    return send(res, 400, { error: 'Provide an API key for this operation' });
  }
  if (url.searchParams.has('api_token')) return send(res, 400, { error: 'API keys are forbidden in relay URLs' });
  const upstream = new URL(REGIONS[region] + path);
  for (const [name, value] of url.searchParams) {
    if (name === 'path' || name === 'region') continue;
    if (!QUERY_KEYS.has(name) && !/^options\[[a-zA-Z0-9_]+\]$/.test(name))
      return send(res, 400, { error: 'Unrecognized query parameter' });
    if (value.length > 2048) return send(res, 400, { error: 'Parameter too long' });
    upstream.searchParams.append(name, value);
  }
  if (token && req.method === 'GET') upstream.searchParams.set('api_token', token);

  let body;
  let contentType;
  try {
    if (req.method === 'POST') {
      contentType = String(req.headers['content-type'] ?? '');
      if (!/^multipart\/form-data;\s*boundary=[a-zA-Z0-9'()+_,.\/:=?-]{1,140}$/.test(contentType))
        return send(res, 415, { error: 'Only multipart FormData is supported' });
      body = await readBoundedBody(req, MAX_BODY);
      // Require the actual multipart api_token field, not a substring of an audio upload.
      const multipart = body.toString('latin1');
      const expected = 'name="api_token"\r\n\r\n' + String(token) + '\r\n';
      if (!multipart.includes(expected)) return send(res, 400, { error: 'Missing or mismatched API token in FormData' });
    }
  } catch (error) { return send(res, error.status ?? 400, { error: error.message }); }

  try {
    const signal = AbortSignal.timeout(25_000);
    const response = await fetch(upstream, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        ...(req.method === 'POST' ? { 'Content-Type': contentType } : {}),
      },
      ...(req.method === 'POST' ? { body } : {}),
      signal,
      redirect: 'error',
    });
    const text = await response.text();
    if (text.length > 2_000_000) return send(res, 502, { error: 'Upstream response too large' });
    let data;
    try { data = JSON.parse(text); }
    catch { return send(res, 502, { error: 'Upstream returned an invalid JSON response' }); }
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter && /^\d{1,8}$/.test(retryAfter)) res.setHeader('Retry-After', retryAfter);
    return send(res, response.status, scrub(data));
  } catch (error) {
    return send(res, 502, { error: 'MVSep is unreachable or request timed out' });
  }
}
