export interface TokenBucketOptions {
  requestsPerSecond: number;
  burst: number;
}

function abortReason(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException("Aborted", "AbortError");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal));
    if (ms <= 0) return resolve();
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(abortReason(signal)); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** Serialized token bucket: requests must not overtake preceding callers. */
export class TokenBucketRateLimiter {
  private readonly rate: number;
  private readonly capacity: number;
  private tokens: number;
  private lastRefill = Date.now();
  private tail: Promise<void> = Promise.resolve();

  constructor(options: TokenBucketOptions) {
    if (!(options.requestsPerSecond === Infinity ||
      (Number.isFinite(options.requestsPerSecond) && options.requestsPerSecond >= 0)))
      throw new RangeError("requestsPerSecond must be nonnegative or Infinity");
    if (!Number.isSafeInteger(options.burst) || options.burst < 1)
      throw new RangeError("burst must be a positive integer");
    this.rate = options.requestsPerSecond;
    this.capacity = options.burst;
    this.tokens = this.capacity;
  }

  async acquire(signal?: AbortSignal): Promise<number> {
    if (signal?.aborted) throw abortReason(signal);
    if (!Number.isFinite(this.rate) || this.rate === 0) return 0;

    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });

    try {
      // An aborted waiter settles immediately, while its serialized slot is
      // still released so subsequent callers cannot become stuck.
      if (signal) {
        await new Promise<void>((resolve, reject) => {
          if (signal.aborted) return reject(abortReason(signal));
          const abort = () => { signal.removeEventListener("abort", abort); reject(abortReason(signal)); };
          signal.addEventListener("abort", abort, { once: true });
          previous.then(() => { signal.removeEventListener("abort", abort); resolve(); }, reject);
        });
      } else await previous;
      if (signal?.aborted) throw abortReason(signal);
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return 0;
      }
      const waitMs = Math.ceil(((1 - this.tokens) / this.rate) * 1000);
      await sleep(waitMs, signal);
      this.refill();
      this.tokens = Math.max(0, this.tokens - 1);
      return waitMs;
    } finally {
      release();
    }
  }

  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.lastRefill) / 1000) * this.rate);
    this.lastRefill = now;
  }
}

/** Semaphore with abortable waiters and idempotent release. */
export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!(limit === Infinity || (Number.isSafeInteger(limit) && limit > 0)))
      throw new RangeError("maxConcurrency must be a positive integer or Infinity");
  }

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) throw abortReason(signal);
    if (this.limit === Infinity) return () => {};
    if (this.active < this.limit) {
      this.active++;
      return this.makeRelease();
    }
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(abortReason(signal));
      const start = () => {
        signal?.removeEventListener("abort", abort);
        this.active++;
        resolve();
      };
      const abort = () => {
        const index = this.queue.indexOf(start);
        if (index >= 0) this.queue.splice(index, 1);
        signal?.removeEventListener("abort", abort);
        reject(abortReason(signal));
      };
      this.queue.push(start);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
    return this.makeRelease();
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.queue.shift()?.();
    };
  }
}
