import { Semaphore, TokenBucketRateLimiter } from "./rate-limiter.js";
import type { SeparationResult } from "./types.js";
import type { DownloadFileOptions, DownloadReceipt, DownloadedFile, OutputDownloadOptions, OutputManifest, StreamDownloadOptions } from "./extended-types.js";
export interface TransferSettings {
    fetchImpl: typeof fetch;
    limiter: TokenBucketRateLimiter;
    semaphore: Semaphore;
    timeoutMs: number;
    maxAttempts: number;
    baseDelayMs: number;
}
export declare class TransferManager {
    private readonly config;
    constructor(config: TransferSettings);
    /**
     * Backpressure-aware download. GETs can retry before any bytes are written.
     * Partial-transfer failures never silently replay into an already-written stream.
     */
    downloadToStream(url: string, writable: WritableStream<Uint8Array>, options?: StreamDownloadOptions): Promise<DownloadReceipt>;
    download(url: string, options?: StreamDownloadOptions): Promise<Uint8Array>;
    downloadToFile(url: string, path: string, options?: DownloadFileOptions): Promise<DownloadedFile>;
    downloadSeparationOutputs(result: SeparationResult, destination: string, options?: OutputDownloadOptions): Promise<OutputManifest>;
}
//# sourceMappingURL=transfers.d.ts.map