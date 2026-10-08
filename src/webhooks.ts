import { MvsepApiError } from "./errors.js";
import { parseWebhook, reconcileWebhook } from "./metadata.js";
import type { SeparationResult } from "./types.js";

export interface WebhookReceiverOptions {
  /** Maximum in-memory dedup entries, oldest entries evicted first. */
  maxEntries?: number;
  /** Expire dedup markers after this many milliseconds. */
  ttlMs?: number;
  /** Verify against authenticated API state before trusting a webhook. */
  verify?: (hash: string) => Promise<SeparationResult>;
}
export type WebhookReconciliation = {
  duplicate: boolean;
  result: SeparationResult;
};

/**
 * Untrusted, at-least-once webhook reconciler. The HTTP application is still
 * responsible for authenticating webhook delivery (no upstream signature is
 * documented), assigning the correct account ID and acknowledging requests.
 *
 * Deduplication is per-instance; for durable delivery use an external store.
 * Does not create, cancel or otherwise change a billable job.
 */
export class MvsepWebhookReceiver {
  private readonly entries = new Map<string, { until: number; promise: Promise<SeparationResult> }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(private readonly options: WebhookReceiverOptions = {}) {
    this.maxEntries = options.maxEntries ?? 10_000;
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60_000;
    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1)
      throw new RangeError("maxEntries must be positive");
    if (!Number.isFinite(this.ttlMs) || this.ttlMs < 0)
      throw new RangeError("ttlMs must be finite and nonnegative");
  }

  async receive(accountId: string, expectedHash: string, body: string | unknown): Promise<WebhookReconciliation> {
    if (!accountId || !expectedHash) throw new TypeError("accountId and expectedHash are required");
    const parsed = parseWebhook(body);
    if (parsed.data?.hash !== expectedHash)
      throw new MvsepApiError("Webhook hash does not match expected job");
    // An API job may be notified multiple times. Do not use payload body or
    // file order for dedup keys; hash/status/account is the stable subset.
    const key = JSON.stringify([accountId, expectedHash, parsed.status]);
    const now = Date.now();
    const existing = this.entries.get(key);
    if (existing && existing.until > now) return { duplicate: true, result: await existing.promise };
    const promise = reconcileWebhook(expectedHash, parsed, this.options.verify);
    this.entries.delete(key);
    this.entries.set(key, { until: now + this.ttlMs, promise });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
      else break;
    }
    try {
      return { duplicate: false, result: await promise };
    } catch (cause) {
      this.entries.delete(key); // let delivery retry after verification failure
      throw cause;
    }
  }

  clear(): void { this.entries.clear(); }
}
