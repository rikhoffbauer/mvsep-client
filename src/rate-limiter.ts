export interface TokenBucketOptions {
  requestsPerSecond: number;
  burst: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

export class TokenBucketRateLimiter {
  private readonly rate: number;
  private readonly capacity: number;
  private tokens: number;
  private lastRefill = Date.now();
  private tail: Promise<void> = Promise.resolve();

  constructor(options: TokenBucketOptions) {
    this.rate = options.requestsPerSecond;
    this.capacity = Math.max(1, options.burst);
    this.tokens = this.capacity;
  }

  async acquire(signal?: AbortSignal): Promise<number> {
    if (!Number.isFinite(this.rate) || this.rate <= 0) return 0;

    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return 0;
      }

      const missing = 1 - this.tokens;
      const waitMs = Math.ceil((missing / this.rate) * 1000);
      await sleep(waitMs, signal);
      this.refill();
      this.tokens = Math.max(0, this.tokens - 1);
      return waitMs;
    } finally {
      release();
    }
  }

  private refill() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.rate);
  }
}

export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async acquire(signal?: AbortSignal): Promise<() => void> {
    if (!Number.isFinite(this.limit) || this.limit <= 0) return () => {};

    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve, reject) => {
      const start = () => {
        signal?.removeEventListener("abort", abort);
        this.active += 1;
        resolve();
      };
      const abort = () => {
        const index = this.queue.indexOf(start);
        if (index >= 0) this.queue.splice(index, 1);
        reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      };
      this.queue.push(start);
      signal?.addEventListener("abort", abort, { once: true });
    });

    return () => this.release();
  }

  private release() {
    this.active -= 1;
    this.queue.shift()?.();
  }
}
