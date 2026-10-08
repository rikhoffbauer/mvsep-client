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
export declare class MvsepWebhookReceiver {
    private readonly options;
    private readonly entries;
    private readonly maxEntries;
    private readonly ttlMs;
    constructor(options?: WebhookReceiverOptions);
    receive(accountId: string, expectedHash: string, body: string | unknown): Promise<WebhookReconciliation>;
    clear(): void;
}
//# sourceMappingURL=webhooks.d.ts.map