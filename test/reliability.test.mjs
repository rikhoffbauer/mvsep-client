import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  MvsepClient, MvsepCoreClient, MvsepAuthenticationError, MvsepAbortError,
  MvsepHttpError, MvsepRateLimitError, MvsepTimeoutError, MvsepApiError,
  Semaphore, TokenBucketRateLimiter,
} from "../dist/index.js";

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
const c = (fetch, options = {}) => new MvsepClient({
  apiKeys: ["dummy-a", "dummy-b"], fetch,
  rateLimit: { requestsPerSecond: Infinity, maxConcurrency: 3 },
  retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, jitter: "none" },
  ...options,
});
const done = () => json({ success: true, status: "done", data: {} });

test("H01: errors redact all authenticated query secrets", async () => {
  const client = c(async () => new Response("offline", { status: 503 }));
  await assert.rejects(client.getSeparation("hash"), error => {
    assert(error instanceof MvsepHttpError);
    assert(!JSON.stringify(error).includes("dummy-a"));
    assert(!error.url.includes("dummy-a"));
    assert(error.url.includes("REDACTED"));
    return true;
  });
});
test("H02: raw authenticated calls cannot override GET or append duplicate POST token", async () => {
  let called = 0;
  const client = c(async () => { called++; return done(); });
  await assert.rejects(client.request({ authenticated: true, path: "/x", query: { api_token: "evil" } }), /cannot override/);
  await assert.rejects(client.request({ method: "POST", authenticated: true, path: "/x", form: { api_token: "evil" } }), /cannot override/);
  assert.equal(called, 0);
});
test("H03: header-first stalled body times out, even when custom fetch ignores cancellation", async () => {
  const client = c(async () => new Response(new ReadableStream({ start() {} })), {
    apiKeys: [], requestTimeoutMs: 20,
  });
  await assert.rejects(client.request({ path: "/stall", method: "GET" }), MvsepTimeoutError);
});
test("H04: concurrency limit covers body read", async () => {
  let firstController;
  let entered = 0;
  let releaseEntered;
  const secondEntered = new Promise(resolve => { releaseEntered = resolve; });
  const client = c(async () => {
    entered++;
    if (entered === 2) releaseEntered();
    if (entered === 1) return new Response(new ReadableStream({ start(controller) { firstController = controller; } }));
    return done();
  }, { apiKeys: [], rateLimit: { requestsPerSecond: Infinity, maxConcurrency: 1 } });
  const first = client.request({ path: "/first" });
  await new Promise(resolve => setTimeout(resolve, 10));
  const second = client.request({ path: "/second" });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(entered, 1);
  firstController.enqueue(new TextEncoder().encode('{"success":true}'));
  firstController.close();
  await first;
  await secondEntered;
  await second;
  assert.equal(entered, 2);
});
test("H05: pre-aborted queued semaphore rejects immediately", async () => {
  const semaphore = new Semaphore(1);
  const release = await semaphore.acquire();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(semaphore.acquire(controller.signal));
  release();
  const releaseAgain = await semaphore.acquire();
  releaseAgain();
});
test("H06: throwing observers cannot hide a successfully created paid job", async () => {
  const client = c(async () => json({ success: true, data: { hash: "accepted" } }), {
    onProgress: () => { throw Error("global callback failure"); },
  });
  const result = await client.createSeparation({ url: "https://example.invalid/test" }, {
    onProgress: () => { throw Error("local callback failure"); },
  });
  assert.equal(result.data.hash, "accepted");
  assert.notEqual(client.getJobApiKeyIndex("accepted"), undefined);
});
test("M01: successful polling and limiter wait remove abort listeners", async () => {
  const controller = new AbortController();
  let calls = 0;
  const client = c(async () => {
    calls++;
    return json({ success: true, status: calls === 15 ? "done" : "waiting" });
  }, { apiKeys: [] });
  const result = await client.waitForSeparation("hash", { intervalMs: 1, maxIntervalMs: 1, maxWaitMs: 1000, signal: controller.signal });
  assert.equal(result.status, "done");
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  const limiter = new TokenBucketRateLimiter({ requestsPerSecond: 1000, burst: 1 });
  await limiter.acquire(controller.signal);
  await limiter.acquire(controller.signal);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});
test("M02: maxWaitMs is a wall-clock deadline even for a slow polling GET", async () => {
  const client = c(async () => new Promise(resolve => setTimeout(() => resolve(done()), 70)), { apiKeys: [] });
  const started = Date.now();
  await assert.rejects(client.waitForSeparation("hash", { maxWaitMs: 15 }), MvsepTimeoutError);
  assert(Date.now() - started < 65);
});
test("M03: failed body streaming is translated to typed transport error", async () => {
  const client = c(async () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error("stream failure")); },
  })), { apiKeys: [] });
  await assert.rejects(client.request({ path: "/body" }), error => error instanceof MvsepHttpError || error instanceof Error && error.name === "MvsepError");
});
test("M04: text HTTP 429 is rate limit error with Retry-After", async () => {
  const client = c(async () => new Response("<html>rate limit</html>", { status: 429, headers: { "retry-after": "4" } }));
  await assert.rejects(client.request({ path: "/rate", authenticated: true }), error => {
    assert(error instanceof MvsepRateLimitError);
    assert.equal(error.retryAfterMs, 4000);
    return true;
  });
});
test("M05: createAndWait forwards supplied per-call timeout to POST", async () => {
  const client = c(async url => {
    if (url.includes("/create")) return new Promise(resolve => setTimeout(() => resolve(json({ success: true, data: { hash: "created" } })), 35));
    return done();
  }, { requestTimeoutMs: 12 });
  const result = await client.createAndWait({ url: "https://example.invalid/music" }, { timeoutMs: 250, maxWaitMs: 1000, intervalMs: 0 });
  assert.equal(result.status, "done");
});
test("M06: mirror requires API token", async () => {
  const client = c(async () => { throw new Error("request must not be made"); }, { apiKeys: [] });
  await assert.rejects(client.getSeparation("hash", { mirror: true }), MvsepAuthenticationError);
});
test("M07: invalid response envelope diagnosed immediately", async () => {
  const client = c(async () => json({ success: false, data: {} }), { apiKeys: [] });
  await assert.rejects(client.waitForSeparation("hash", { intervalMs: 0 }), MvsepApiError);
});
test("M08: abort while throttled yields MvsepAbortError", async () => {
  const client = c(async () => done(), { apiKeys: [], rateLimit: { requestsPerSecond: 0.01, burst: 1 } });
  await client.request({ path: "/one" });
  const controller = new AbortController();
  const waiting = client.request({ path: "/two", signal: controller.signal });
  controller.abort();
  await assert.rejects(waiting, MvsepAbortError);
});
test("M09: bounded job affinities evict least recently added", async () => {
  let i = 0;
  const client = c(async () => json({ success: true, data: { hash: "hash-" + ++i } }), { maxJobAffinities: 2 });
  for (let n = 0; n < 3; n++) await client.createSeparation({ url: "https://example.invalid/music" });
  assert.equal(client.getJobApiKeyIndex("hash-1"), undefined);
  assert.notEqual(client.getJobApiKeyIndex("hash-3"), undefined);
});
test("L01: never means never, including an HTTP 401 on create", async () => {
  let count = 0;
  const client = c(async () => { count++; return json({ success: false, message: "no" }, 401); }, {
    retry: { maxAttempts: 5, baseDelayMs: 0, maxDelayMs: 0, unsafeCreateRetries: "never" },
  });
  await assert.rejects(client.createSeparation({ url: "https://example.invalid/music" }), MvsepAuthenticationError);
  assert.equal(count, 1);
});
test("L02: reject invalid numeric config and invalid polling intervals", async () => {
  assert.throws(() => c(async () => done(), { rateLimit: { requestsPerSecond: -1, burst: 1 } }), RangeError);
  assert.throws(() => c(async () => done(), { rateLimit: { requestsPerSecond: Infinity, maxConcurrency: 0 } }), RangeError);
  assert.throws(() => c(async () => done(), { retry: { maxAttempts: NaN } }), RangeError);
  const client = c(async () => done());
  await assert.rejects(client.waitForSeparation("h", { intervalMs: -1 }), RangeError);
});
test("L04: remote mirror option is never silently ignored", async () => {
  const client = c(async () => done(), { apiKeys: [] });
  await assert.rejects(client.getRemoteSeparation("hash", { mirror: true }), /not supported/);
});
test("S01: streaming to file with bounded chunks and atomic no-clobber", async t => {
  const dir = await mkdtemp(join(tmpdir(), "mvsep-stream-test-"));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  let called = 0;
  const client = c(async () => {
    called++;
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    }), { headers: { "content-length": "4" } });
  }, { apiKeys: [] });
  const target = join(dir, "stem.wav");
  const receipt = await client.downloadToFile("https://example.invalid/stem", target);
  assert.equal(receipt.loaded, 4);
  assert.deepEqual([...await readFile(target)], [1, 2, 3, 4]);
  await assert.rejects(client.downloadToFile("https://example.invalid/stem", target));
  assert.deepEqual((await readdir(dir)).sort(), ["stem.wav"]);
  assert.equal(called, 2);
});
test("S01/M12: failed download progress observer cancels reader and deletes temporary file", async t => {
  const dir = await mkdtemp(join(tmpdir(), "mvsep-transfer-cancel-"));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  let canceled = false;
  const client = c(async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array([1])); },
    cancel() { canceled = true; },
  })), { apiKeys: [] });
  await assert.rejects(client.downloadToFile("https://example.invalid/blob", join(dir, "file.bin"), {
    onProgress: () => { throw new Error("observer failed"); },
  }));
  assert(canceled);
  assert.deepEqual(await readdir(dir), []);
});
