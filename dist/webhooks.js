import { MvsepApiError } from "./errors.js";
import { parseWebhook, reconcileWebhook } from "./metadata.js";
/**
 * Untrusted, at-least-once webhook reconciler. The HTTP application is still
 * responsible for authenticating webhook delivery (no upstream signature is
 * documented), assigning the correct account ID and acknowledging requests.
 *
 * Deduplication is per-instance; for durable delivery use an external store.
 * Does not create, cancel or otherwise change a billable job.
 */
export class MvsepWebhookReceiver {
    options;
    entries = new Map();
    maxEntries;
    ttlMs;
    constructor(options = {}) {
        this.options = options;
        this.maxEntries = options.maxEntries ?? 10_000;
        this.ttlMs = options.ttlMs ?? 24 * 60 * 60_000;
        if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1)
            throw new RangeError("maxEntries must be positive");
        if (!Number.isFinite(this.ttlMs) || this.ttlMs < 0)
            throw new RangeError("ttlMs must be finite and nonnegative");
    }
    async receive(accountId, expectedHash, body) {
        if (!accountId || !expectedHash)
            throw new TypeError("accountId and expectedHash are required");
        const parsed = parseWebhook(body);
        if (parsed.data?.hash !== expectedHash)
            throw new MvsepApiError("Webhook hash does not match expected job");
        // An API job may be notified multiple times. Do not use payload body or
        // file order for dedup keys; hash/status/account is the stable subset.
        const key = JSON.stringify([accountId, expectedHash, parsed.status]);
        const now = Date.now();
        const existing = this.entries.get(key);
        if (existing && existing.until > now)
            return { duplicate: true, result: await existing.promise };
        const promise = reconcileWebhook(expectedHash, parsed, this.options.verify);
        this.entries.delete(key);
        this.entries.set(key, { until: now + this.ttlMs, promise });
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest !== undefined)
                this.entries.delete(oldest);
            else
                break;
        }
        try {
            return { duplicate: false, result: await promise };
        }
        catch (cause) {
            this.entries.delete(key); // let delivery retry after verification failure
            throw cause;
        }
    }
    clear() { this.entries.clear(); }
}
//# sourceMappingURL=webhooks.js.map