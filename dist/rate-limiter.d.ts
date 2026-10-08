export interface TokenBucketOptions {
    requestsPerSecond: number;
    burst: number;
}
/** Serialized token bucket: requests must not overtake preceding callers. */
export declare class TokenBucketRateLimiter {
    private readonly rate;
    private readonly capacity;
    private tokens;
    private lastRefill;
    private tail;
    constructor(options: TokenBucketOptions);
    acquire(signal?: AbortSignal): Promise<number>;
    private refill;
}
/** Semaphore with abortable waiters and idempotent release. */
export declare class Semaphore {
    private readonly limit;
    private active;
    private readonly queue;
    constructor(limit: number);
    acquire(signal?: AbortSignal): Promise<() => void>;
    private makeRelease;
}
//# sourceMappingURL=rate-limiter.d.ts.map