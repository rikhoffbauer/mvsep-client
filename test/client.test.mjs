import test from "node:test";
import assert from "node:assert/strict";
import {
  MvsepClient,
  MvsepError,
  MvsepJobFailedError,
} from "../dist/index.js";

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

function clientWith(fetch, options = {}) {
  return new MvsepClient({
    apiKeys: ["key-a", "key-b"],
    fetch,
    rateLimit: { requestsPerSecond: Infinity, maxConcurrency: 100 },
    retry: { maxAttempts: 5, baseDelayMs: 0, maxDelayMs: 0, jitter: "none" },
    ...options,
  });
}

test("createSeparation sends documented multipart fields", async () => {
  let captured;
  const client = clientWith(async (url, init) => {
    captured = { url, init };
    return jsonResponse({ success: true, data: { hash: "job-1", link: "x" } });
  });

  const result = await client.createSeparation({
    audiofile: { data: new Uint8Array([1, 2, 3]), filename: "track.wav", contentType: "audio/wav" },
    sepType: 20,
    outputFormat: 1,
    addOpt1: 0,
    isDemo: false,
  });

  assert.equal(result.data.hash, "job-1");
  assert.match(captured.url, /\/separation\/create$/);
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.body.get("api_token"), "key-a");
  assert.equal(captured.init.body.get("sep_type"), "20");
  assert.equal(captured.init.body.get("output_format"), "1");
  assert.equal(captured.init.body.get("is_demo"), "0");
  assert.equal(captured.init.body.get("audiofile").name, "track.wav");
});

test("429 rotates API keys immediately and honors safe create retry semantics", async () => {
  const keys = [];
  const events = [];
  let calls = 0;
  const client = clientWith(async (_url, init) => {
    calls += 1;
    keys.push(init.body.get("api_token"));
    if (calls === 1) {
      return jsonResponse({ success: false, data: { message: "rate limited" } }, { status: 429, headers: { "retry-after": "60" } });
    }
    return jsonResponse({ success: true, data: { hash: "job-2" } });
  }, { onProgress: (event) => events.push(event) });

  const result = await client.createSeparation({ url: "https://example.test/a.wav", sepType: 20 });
  assert.equal(result.data.hash, "job-2");
  assert.deepEqual(keys, ["key-a", "key-b"]);
  assert.equal(calls, 2);
  assert.ok(events.some((event) => event.type === "key_rotation" && event.from === 0 && event.to === 1));
});

test("401 disables a bad key and retries with the next key", async () => {
  const keys = [];
  let calls = 0;
  const client = clientWith(async (_url, init) => {
    calls += 1;
    keys.push(init.body.get("api_token"));
    if (calls === 1) return jsonResponse({ success: false, data: { message: "Unknown api_token" } }, { status: 401 });
    return jsonResponse({ success: true, data: { hash: "ok" } });
  });

  await client.createSeparation({ url: "https://example.test/a.wav" });
  assert.deepEqual(keys, ["key-a", "key-b"]);
  assert.equal(client.apiKeyState[0].disabled, true);
});

test("safe create policy does not replay an ambiguous transport failure", async () => {
  let calls = 0;
  const client = clientWith(async () => {
    calls += 1;
    throw new TypeError("socket reset");
  });

  await assert.rejects(
    () => client.createSeparation({ url: "https://example.test/a.wav" }),
    (error) => error instanceof MvsepError && error.retryable === true,
  );
  assert.equal(calls, 1);
});

test("idempotent polling retries and reports queue/chunk progress", async () => {
  const statuses = [
    { success: true, status: "waiting", data: { queue_count: 3, current_order: 2 } },
    { success: true, status: "distributing", data: { finished_chunks: 2, all_chunks: 4 } },
    { success: true, status: "merging", data: {} },
    { success: true, status: "done", data: { files: [{ name: "vocals.wav", url: "https://example.test/v.wav" }] } },
  ];
  const pollEvents = [];
  const client = clientWith(async () => jsonResponse(statuses.shift()));

  const result = await client.waitForSeparation("hash", {
    intervalMs: 0,
    maxIntervalMs: 0,
    maxWaitMs: 1000,
    onProgress: (event) => {
      if (event.type === "poll") pollEvents.push(event);
    },
  });

  assert.equal(result.status, "done");
  assert.equal(pollEvents.length, 4);
  assert.equal(pollEvents[0].queueCount, 3);
  assert.equal(pollEvents[1].fraction, 0.5);
});

test("polling throws a typed job error for failed jobs", async () => {
  const client = clientWith(async () => jsonResponse({ success: true, status: "failed", data: { message: "GPU failed" } }));
  await assert.rejects(
    () => client.waitForSeparation("hash", { intervalMs: 0 }),
    (error) => error instanceof MvsepJobFailedError && error.message === "GPU failed",
  );
});

test("authenticated raw GET puts api_token in the query instead of a request body", async () => {
  let captured;
  const client = clientWith(async (url, init) => {
    captured = { url, init };
    return jsonResponse({ success: true });
  });

  await client.request({ path: "/app/example", method: "GET", authenticated: true, idempotent: true });
  const parsed = new URL(captured.url);
  assert.equal(parsed.searchParams.get("api_token"), "key-a");
  assert.equal(captured.init.body, undefined);
});

test("created jobs keep API-key affinity for account-bound polling", async () => {
  const seen = [];
  let call = 0;
  const client = clientWith(async (url, init) => {
    call += 1;
    if (url.includes("/separation/create")) {
      seen.push(init.body.get("api_token"));
      return jsonResponse({ success: true, data: { hash: "owned-job" } });
    }
    seen.push(new URL(url).searchParams.get("api_token"));
    return jsonResponse({ success: true, status: "done", data: { files: [] } });
  });

  const result = await client.createAndWait(
    { url: "https://example.test/a.wav" },
    { intervalMs: 0, maxWaitMs: 1000 },
  );

  assert.equal(result.status, "done");
  assert.deepEqual(seen, ["key-a", "key-a"]);
  assert.equal(client.getJobApiKeyIndex("owned-job"), 0);
});

test("additionalOptions cannot override authentication or core create fields", async () => {
  const client = clientWith(async () => jsonResponse({ success: true, data: { hash: "never" } }));
  await assert.rejects(
    () => client.createSeparation({ url: "https://example.test/a.wav", additionalOptions: { api_token: "evil" } }),
    /reserved field api_token/,
  );
});
