import type { MvsepClient } from "./advanced.js";
import type { BatchInput, BatchOptions, BatchResult } from "./extended-types.js";
/**
 * Restart-safe batch scheduler. HTTP concurrency is a separate client setting.
 * A checkpoint store is saved immediately after each accepted POST and never
 * includes plaintext API keys. A network error before receiving a hash is
 * ambiguous: the caller must reconcile its account history before retrying.
 */
export declare function runBatch(client: MvsepClient, inputs: readonly BatchInput[], options?: BatchOptions): Promise<BatchResult[]>;
/** Simple pause/resume controller; pausing affects new submissions only, not running server jobs. */
export declare class BatchRunner {
    private paused;
    private readonly controller;
    get signal(): AbortSignal;
    stop(): void;
    private resumes;
    pause(): void;
    resume(): void;
    untilResumed(): Promise<void>;
}
//# sourceMappingURL=batch.d.ts.map