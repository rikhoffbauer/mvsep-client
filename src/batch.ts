import { MvsepApiError, MvsepAuthenticationError } from "./errors.js";
import type { MvsepClient } from "./advanced.js";
import type { BatchInput, BatchOptions, BatchResult, MvsepJobHandle } from "./extended-types.js";

function safeEvent(options: BatchOptions, index: number, phase: "queued" | "submitted" | "complete" | "failed", value?: unknown): void {
  try { options.onJobEvent?.(index, phase, value); } catch { /* observers do not control billable jobs */ }
}

/**
 * Restart-safe batch scheduler. HTTP concurrency is a separate client setting.
 * A checkpoint store is saved immediately after each accepted POST and never
 * includes plaintext API keys. A network error before receiving a hash is
 * ambiguous: the caller must reconcile its account history before retrying.
 */
export async function runBatch(
  client: MvsepClient, inputs: readonly BatchInput[], options: BatchOptions = {},
): Promise<BatchResult[]> {
  const signal = options.signal && options.runner
    ? AbortSignal.any([options.signal, options.runner.signal])
    : options.signal ?? options.runner?.signal;
  const maxActive = options.maxActiveJobs ?? 1;
  if (!Number.isSafeInteger(maxActive) || maxActive < 1)
    throw new RangeError("maxActiveJobs must be a positive integer");
  const identities = inputs.map((job, index) => job.id ?? String(index));
  if (new Set(identities).size !== identities.length)
    throw new TypeError("Duplicate batch identifiers; each job must have a unique ID");

  if (maxActive > 1) {
    const user = await client.getUser(options);
    if (user.premium_enabled !== 1 && user.premium_enabled !== true)
      throw new MvsepAuthenticationError("More than one active server-side job requires Premium");
  }

  if (options.maxEstimatedCredits !== undefined) {
    if (!Number.isFinite(options.maxEstimatedCredits) || options.maxEstimatedCredits < 0)
      throw new RangeError("maxEstimatedCredits must be finite and nonnegative");
    let sum = 0;
    for (const job of inputs) {
      if (job.input.sepType === undefined || job.input.presetId !== undefined)
        throw new MvsepApiError("Batch budget cannot be established for preset or unknown model");
      const estimate = await client.estimateJobCredits({
        algorithm: job.input.sepType, ...(job.durationSeconds !== undefined ? { durationSeconds: job.durationSeconds } : {}),
      });
      if (estimate.estimatedCredits === null) throw new MvsepApiError("Unknown job price; batch not submitted");
      sum += estimate.estimatedCredits;
    }
    if (sum > options.maxEstimatedCredits)
      throw new MvsepApiError("Estimated batch price exceeds cap; nothing submitted");
    const user = await client.getUser(options);
    if (typeof user.premium_minutes !== "number" || user.premium_minutes < sum)
      throw new MvsepApiError("Insufficient or unknown account credit balance; nothing submitted");
    if (user.premium_enabled !== 1 && user.premium_enabled !== true)
      throw new MvsepApiError("Premium usage is disabled; nothing submitted");
  }

  const handles = options.checkpointStore ? await options.checkpointStore.load() : [];
  const known = new Map<string, MvsepJobHandle>();
  for (const handle of handles) if (handle.inputId) known.set(handle.inputId, handle);
  const results: BatchResult[] = new Array(inputs.length);
  let next = 0;
  let saveChain = Promise.resolve();
  const checkpoint = (handle: MvsepJobHandle): Promise<void> => {
    if (!options.checkpointStore) return Promise.resolve();
    saveChain = saveChain.then(async () => {
      const index = handles.findIndex(item => item.inputId === handle.inputId);
      if (index < 0) handles.push(handle);
      else handles[index] = handle;
      await options.checkpointStore?.save(handles);
    });
    return saveChain;
  };
  const worker = async () => {
    while (next < inputs.length && !signal?.aborted) {
      await options.runner?.untilResumed();
      if (signal?.aborted) break;
      const index = next++;
      const job = inputs[index]!;
      const inputId = identities[index]!;
      const item: BatchResult = { index, ...(job.id ? { id: job.id } : {}) };
      results[index] = item;
      safeEvent(options, index, "queued");
      try {
        const saved = known.get(inputId);
        if (saved?.submissionState === "pending" || (saved && !saved.hash)) {
          throw new MvsepApiError("Previous batch submission outcome is unknown for " + inputId +
            "; reconcile account history before retrying, then update the checkpoint explicitly");
        }
        let handle = saved;
        if (!handle) {
          if (options.checkpointStore) {
            // Durable intent before the POST: a crash cannot cause an automatic
            // duplicate paid job on restart (even if its hash was never received).
            const marker: MvsepJobHandle = {
              version: 1, hash: "", submissionState: "pending", inputId,
              baseUrl: client.baseUrl, createdAt: new Date().toISOString(),
            };
            await checkpoint(marker);
            known.set(inputId, marker);
          }
          handle = await client.createJob(job.input, {
            signal, timeoutMs: options.timeoutMs,
            onProgress: options.onProgress, inputId,
          });
          known.set(inputId, handle);
          // Commit the accepted hash before polling or invoking callbacks.
          await checkpoint(handle);
        }
        item.handle = handle;
        client.resumeJob(handle);
        safeEvent(options, index, "submitted", handle);
        item.result = await client.waitForJob(handle, { ...options, signal });
        safeEvent(options, index, "complete", item.result);
      } catch (error) {
        item.error = error instanceof Error ? error.message : "Unknown job failure";
        safeEvent(options, index, "failed", item.error);
        // Do not recreate on unknown POST outcomes.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(maxActive, inputs.length) }, worker));
  for (let index = 0; index < inputs.length; index++) {
    if (!results[index]) results[index] = { index, ...(inputs[index]?.id ? { id: inputs[index]!.id } : {}), error: "Batch interrupted before submission" };
  }
  return results;
}

/** Simple pause/resume controller; pausing affects new submissions only, not running server jobs. */
export class BatchRunner {
  private paused = false;
  private readonly controller = new AbortController();
  get signal(): AbortSignal { return this.controller.signal; }
  stop(): void { this.controller.abort(); this.resume(); }
  private resumes: Array<() => void> = [];
  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; for (const resolve of this.resumes.splice(0)) resolve(); }
  async untilResumed(): Promise<void> {
    if (!this.paused) return;
    await new Promise<void>(resolve => this.resumes.push(resolve));
  }
}
