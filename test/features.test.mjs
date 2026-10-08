import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MvsepClient, MvsepApiError, fileBlobFromPath, estimateJobCredits,
  prepareSeparation, validateSeparation, getOutputFiles, safeOutputFilename,
  parseWebhook, reconcileWebhook,
} from "../dist/index.js";
import { MvsepDiagnostics } from "../dist/diagnostics.js";
import { runBatch, BatchRunner } from "../dist/batch.js";
import { LocalArtifactCache } from "../dist/local-cache.js";

const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
function fake(fetch, props = {}) {
  return new MvsepClient({
    apiKeys: ["dummy-key"], fetch,
    rateLimit: { requestsPerSecond: Infinity, maxConcurrency: 4 },
    retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, jitter: "none" },
    ...props,
  });
}
const algorithm = {
  render_id: 20, name: "Model 20", audio_widget: "single_upload",
  orientation: 2, price_coefficient: 2,
  algorithm_fields: [{
    name: "add_opt1", text: "Model type", default_key: "1",
    options: '{"0":"High quality","1":"Fast"}',
  }],
};

test("S02: account profile hides token and preserves unknown fields", async () => {
  const client = fake(async () => json({ success: true, data: {
    name: "Tester", api_token: "secret", premium_minutes: 70,
    premium_enabled: 1, extra: { custom: true },
  }}));
  const user = await client.getUser();
  assert.equal(user.api_token, undefined);
  assert.equal(user.extra.custom, true);
  assert.equal((await client.getUser({ includeApiToken: true })).api_token, "secret");
});

test("S02: summary, history and purchases use documented endpoints and page limits", async () => {
  const paths = [];
  const client = fake(async (url) => {
    const parsed = new URL(url);
    paths.push(parsed.pathname + parsed.search);
    if (parsed.pathname.endsWith("/summary"))
      return json({ queued: 1, processing: 0, ahead: 5, estimated_wait_seconds: null });
    if (parsed.pathname.endsWith("/separation_history"))
      return json({ success: true, data: [{ hash: "job-1" }] });
    if (parsed.pathname.endsWith("/purchases"))
      return json({ purchases: [], total: 0, credits: 70 });
    return json({ queue: { premium: 0 }, plan: { plan: "premium", queue: 0 } });
  });
  assert.equal((await client.getQueueSummary()).estimated_wait_seconds, null);
  assert.equal((await client.getSeparationHistory({ start: 2, limit: 20 }))[0].hash, "job-1");
  assert.equal((await client.getPurchases({ limit: 100 })).credits, 70);
  assert.equal((await client.getQueue()).plan.plan, "premium");
  assert(paths.some(path => path.includes("/api/app/queue/summary")));
  assert(paths.some(path => path.includes("start=2") && path.includes("limit=20")));
  await assert.rejects(client.getSeparationHistory({ limit: 21 }), RangeError);
  await assert.rejects(client.getPurchases({ limit: 101 }), RangeError);
});

test("S03: estimate unknown never reports zero; guarded submissions enforce budgets", async () => {
  let submitted = 0;
  const client = fake(async (url) => {
    if (url.includes("/app/algorithms")) return json([algorithm]);
    if (url.includes("/app/user")) return json({ success: true, data: { premium_minutes: 30, premium_enabled: 1 } });
    if (url.includes("/create")) { submitted++; return json({ success: true, data: { hash: "paid-job" } }); }
    throw new Error("Unexpected path");
  });
  assert.equal(estimateJobCredits(algorithm).estimatedCredits, null);
  assert.equal(estimateJobCredits(algorithm, 120).estimatedCredits, 4);
  await assert.rejects(client.createGuardedSeparation({ url: "https://example.invalid/a", sepType: 20 }, {
    durationSeconds: 120, maxEstimatedCredits: 3,
  }), MvsepApiError);
  assert.equal(submitted, 0);
  const created = await client.createGuardedSeparation({ url: "https://example.invalid/a", sepType: 20 }, {
    durationSeconds: 120, maxEstimatedCredits: 4, checkAccountBalance: true,
  });
  assert.equal(created.data.hash, "paid-job");
  assert.equal(submitted, 1);
});

test("S04: metadata-backed field selection uses upstream JSON string option keys and rejects invalid options", () => {
  const input = { url: "https://example.invalid/test" };
  const prepared = prepareSeparation({ algorithm, input, fields: { add_opt1: 1 } });
  assert.equal(prepared.input.sepType, 20);
  assert.equal(prepared.input.addOpt1, 1);
  validateSeparation(prepared.input, algorithm);
  assert.throws(() => prepareSeparation({ algorithm, input, fields: { add_opt1: "nonexistent" } }), TypeError);
  assert.throws(() => validateSeparation({ sepType: 20, addOpt1: 5, url: input.url }, algorithm), TypeError);
  assert.throws(() => validateSeparation({ sepType: 20 }, algorithm), TypeError);
});

test("S05: stable key-ID based recovery never repeats the create POST", async () => {
  let createCount = 0;
  const makeClient = keys => fake(async url => {
    if (url.includes("/create")) { createCount++; return json({ success: true, data: { hash: "durable" } }); }
    return json({ success: true, status: "done", data: { hash: "durable", files: [] } });
  }, { apiKeys: keys, keyIdentifiers: keys.map(key => "id:" + key) });
  const first = makeClient(["key-a", "key-b"]);
  const handle = await first.createJob({ url: "https://example.invalid/a", sepType: 20 }, { inputId: "original" });
  assert.equal(handle.keyId, "id:key-a");
  assert.equal(handle.inputId, "original");
  const second = makeClient(["key-b", "key-a"]);
  const result = await second.waitForJob(handle, { intervalMs: 0 });
  assert.equal(result.status, "done");
  assert.equal(second.getJobApiKeyIndex("durable"), 1);
  assert.equal(createCount, 1);
});

test("S07: result files preserve raw entries and sanitize traversal filenames", () => {
  const result = { success: true, status: "done", data: { type: "preset_run", files: [
    { name: "../vocals.wav", url: "https://example.invalid/stem", extra: "retained" },
    { name: "bass.wav", link: "https://example.invalid/bass" },
    { name: "missing" },
  ] } };
  const files = getOutputFiles(result);
  assert.equal(files.length, 2);
  assert.equal(files[0].raw.extra, "retained");
  assert.equal(safeOutputFilename(files[0].name).includes("/"), false);
});
test("S07: one-call materialization makes manifest with safe collisions", async t => {
  const dir = await mkdtemp(join(tmpdir(), "mvsep-outputs-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const client = fake(async url => {
    if (url.includes("/separation/get"))
      return json({ success: true, status: "done", data: {
        hash: "done-hash", files: [
          { name: "../same.wav", url: "https://example.invalid/1" },
          { name: "../same.wav", url: "https://example.invalid/2" },
        ],
      } });
    return new Response(new Uint8Array([1, 2, 3]));
  });
  const manifest = await client.downloadSeparationOutputs("done-hash", dir);
  assert.equal(manifest.hash, "done-hash");
  assert.equal(manifest.files.length, 2);
  assert.notEqual(manifest.files[0].name, manifest.files[1].name);
  assert.equal(manifest.errors.length, 0);
  for (const file of manifest.files) assert.deepEqual([...await readFile(file.path)], [1, 2, 3]);
});

test("S08: fileBlobFromPath uses Blob and keeps original filename", async t => {
  const dir = await mkdtemp(join(tmpdir(), "mvsep-upload-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "track.wav");
  await writeFile(file, new Uint8Array([1, 2, 3, 4]));
  const part = await fileBlobFromPath(file, "audio/wav");
  assert.equal(part.filename, "track.wav");
  assert.equal(part.data.type, "audio/wav");
  assert.equal(part.data.size, 4);
});

test("S09: webhook rejects bad/mismatching hashes and optionally verifies API", async () => {
  const body = JSON.stringify({ success: true, status: "done", data: { hash: "correct" } });
  assert.equal(parseWebhook(body).status, "done");
  await assert.rejects(reconcileWebhook("other", body), MvsepApiError);
  const resolved = await reconcileWebhook("correct", body, async () => ({
    success: true, status: "done", data: { hash: "correct", verified: true },
  }));
  assert.equal(resolved.data.verified, true);
  assert.throws(() => parseWebhook('{"bad": true}'), MvsepApiError);
});

test("S10: account state changes use documented explicit POST endpoints", async () => {
  const calls = [];
  const client = fake(async (url, init) => {
    calls.push([new URL(url).pathname, init.body]);
    return json({ success: true, data: { credit_threshold: 100, enabled: true } });
  });
  await client.setCreditAlert(100);
  await client.setPremiumUsageEnabled(true);
  await client.setPremiumUsageEnabled(false);
  await client.setLongFilenamesEnabled(true);
  await client.setLongFilenamesEnabled(false);
  assert.equal(calls[0][1].get("credit_threshold"), "100");
  for (const path of ["enable_premium", "disable_premium", "enable_long_filenames", "disable_long_filenames"])
    assert(calls.some(([p]) => p.endsWith(path)));
});

test("S11: demos and quality leaderboard serialize filters correctly", async () => {
  const seen = [];
  const client = fake(async url => {
    const target = new URL(url);
    seen.push(target);
    if (target.pathname.includes("leaderboard")) return json({ data: [], dataset_type: "10", sortables: ["sdr_drums"] });
    return json([{ hash: "demo" }]);
  });
  assert.equal((await client.getDemoSeparations({ algorithmId: 20, options: { vocals: 1 } }))[0].hash, "demo");
  assert.equal((await client.getQualityLeaderboard({ datasetType: 10, sort: "sdr_drums" })).data.length, 0);
  assert.equal(seen[0].searchParams.get("options[vocals]"), "1");
  assert.equal(seen[1].searchParams.get("dataset_type"), "10");
});

test("S12: job watch yields queue data and completed job without extra submissions", async () => {
  let polls = 0;
  const client = fake(async url => {
    if (url.includes("/queue/summary"))
      return json({ queued: 1, processing: 0, ahead: 2, estimated_wait_seconds: null });
    polls++;
    return json({ success: true, status: polls === 2 ? "done" : "waiting", data: {} });
  });
  const records = [];
  for await (const record of client.watchJob("hash", { intervalMs: 0, includeQueue: true })) records.push(record.type);
  assert.deepEqual(records, ["status", "queue", "status", "complete"]);
});
test("S13: algorithms cache reused and invalidated only for metadata", async () => {
  let calls = 0;
  const data = new Map();
  const client = fake(async () => { calls++; return json([algorithm]); }, { algorithmsCache: {
    async get(key) { return data.get(key) ?? null; },
    async set(key, value) { data.set(key, value); },
    async delete(key) { data.delete(key); },
  }});
  await client.getAlgorithms();
  await client.getAlgorithms();
  assert.equal(calls, 1);
  await client.invalidateAlgorithms();
  await client.getAlgorithms();
  assert.equal(calls, 2);
});

test("S06: batch checkpoints and resumes without a duplicate create", async () => {
  let creates = 0;
  let posts = 0;
  const stored = [];
  const store = {
    async load() { return [...stored]; },
    async save(handles) { stored.splice(0, stored.length, ...handles); },
  };
  const client = fake(async (url, init) => {
    if (url.includes("/create")) {
      creates++;
      posts++;
      return json({ success: true, data: { hash: "job-" + creates } });
    }
    return json({ success: true, status: "done", data: { hash: "done" } });
  }, { keyIdentifiers: ["account-key"] });
  const jobs = [
    { id: "a", input: { sepType: 20, url: "https://example.invalid/a" } },
    { id: "b", input: { sepType: 20, url: "https://example.invalid/b" } },
  ];
  let result = await runBatch(client, jobs, { checkpointStore: store, intervalMs: 0 });
  assert(result.every(item => item.result?.status === "done"));
  assert.equal(creates, 2);
  assert.equal(stored.length, 2);
  result = await runBatch(client, jobs, { checkpointStore: store, intervalMs: 0 });
  assert(result.every(item => item.result?.status === "done"));
  assert.equal(creates, 2);
});

test("S15: artifact cache hashes input/config and validates outputs", async t => {
  const root = await mkdtemp(join(tmpdir(), "mvsep-artifact-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const audio = join(root, "a.wav"), output = join(root, "vocals.wav");
  await writeFile(audio, "source-audio");
  await writeFile(output, "isolated-vocals");
  const cache = new LocalArtifactCache(join(root, ".cache"));
  const { key, inputHash } = await cache.keyForFile(audio, {
    modelRevision: "20-2026-10", accountId: "account",
    separation: { sepType: 20, addOpt1: 0 },
  });
  await cache.record({ key, inputHash, accountId: "account", modelRevision: "20-2026-10", paths: [output] });
  assert.equal((await cache.lookup(key)).outputs.length, 1);
  await writeFile(output, "changed");
  assert.equal(await cache.lookup(key), null);
});
test("S16: diagnostic stream captures safe timings and isolates observers", () => {
  const diag = new MvsepDiagnostics(2);
  diag.subscribe(() => { throw new Error("untrusted listener"); });
  diag.onProgress({ type: "request", phase: "start", method: "GET", path: "/app/queue",
    attempt: 1, maxAttempts: 1 });
  diag.onProgress({ type: "request", phase: "success", method: "GET", path: "/app/queue",
    attempt: 1, maxAttempts: 1 });
  const values = diag.snapshot();
  assert.equal(values.length, 2);
  assert.equal(typeof values[1].durationMs, "number");
  assert(!JSON.stringify(values).includes("dummy-key"));
});

test("S09: webhook receiver deduplicates concurrent deliveries without repeat verification", async () => {
  const { MvsepWebhookReceiver } = await import("../dist/webhooks.js");
  let verifications = 0;
  const receiver = new MvsepWebhookReceiver({ verify: async hash => {
    verifications++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { success: true, status: "done", data: { hash } };
  }});
  const body = { success: true, status: "done", data: { hash: "h-1" } };
  const [first, second] = await Promise.all([
    receiver.receive("account-a", "h-1", body),
    receiver.receive("account-a", "h-1", body),
  ]);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(verifications, 1);
  const other = await receiver.receive("account-b", "h-1", body);
  assert.equal(other.duplicate, false);
  assert.equal(verifications, 2);
});

test("S13: filesystem metadata cache works for TTL and stale offline snapshots", async t => {
  const { FileMetadataCache } = await import("../dist/metadata-cache.js");
  const dir = await mkdtemp(join(tmpdir(), "mvsep-model-cache-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new FileMetadataCache(dir);
  const snapshot = { expiresAt: Date.now() - 1000, algorithms: [algorithm] };
  await store.set("single_upload", snapshot);
  assert.equal((await store.readSnapshot("single_upload")).algorithms[0].render_id, 20);
  const client = fake(async () => json([algorithm]), { algorithmsCache: store });
  assert.equal((await client.getAlgorithms()).length, 1);
  assert((await store.readSnapshot("single_upload")).expiresAt > Date.now());
  await store.delete("single_upload");
  assert.equal(await store.readSnapshot("single_upload"), null);
});

test("S11: quality queue endpoint and page bounds", async () => {
  const client = fake(async url => {
    assert(url.includes("/quality_checker/queue"));
    return json([{ id: 42, algo_name: "stem model" }]);
  });
  assert.equal((await client.getQualityQueue({ limit: 20 }))[0].id, 42);
  await assert.rejects(client.getQualityQueue({ limit: 30 }), RangeError);
});

test("S04: human field labels map to unambiguous option display names", () => {
  const prepared = prepareSeparation({
    algorithm,
    input: { url: "https://example.invalid/test" },
    fields: { "Model type": "Fast" },
  });
  assert.equal(prepared.input.addOpt1, "1");
  assert.throws(() => validateSeparation(prepared.input, algorithm, { premium: false }), TypeError);
});

test("S06: durable pre-submission checkpoint prevents automatic duplicate on ambiguous POST failure", async () => {
  const checkpoints = [];
  const store = {
    async load() { return [...checkpoints]; },
    async save(items) { checkpoints.splice(0, checkpoints.length, ...items); },
  };
  let creates = 0;
  const client = fake(async url => {
    if (url.includes("/create")) {
      creates++;
      throw new TypeError("Connection lost after request sent");
    }
    throw new Error("Unexpected request");
  });
  const jobs = [{ id: "uncertain", input: { url: "https://example.invalid/a.wav", sepType: 20 } }];
  const first = await runBatch(client, jobs, { checkpointStore: store });
  assert(first[0].error);
  assert.equal(checkpoints[0].submissionState, "pending");
  assert.equal(checkpoints[0].hash, "");
  const again = await runBatch(client, jobs, { checkpointStore: store });
  assert.match(again[0].error, /outcome is unknown/);
  assert.equal(creates, 1);
});
test("S06: stopped batch does not submit more jobs", async () => {
  let creates = 0;
  const runner = new BatchRunner();
  runner.stop();
  const client = fake(async () => { creates++; return json({ success: true, data: { hash: "x" } }); });
  const results = await runBatch(client, [{ id: "a", input: { url: "https://example.invalid/a", sepType: 20 } }], { runner });
  assert.equal(creates, 0);
  assert.match(results[0].error, /interrupted/);
});
