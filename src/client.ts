import {
  MvsepAbortError,
  MvsepApiError,
  MvsepAuthenticationError,
  MvsepError,
  MvsepHttpError,
  MvsepJobFailedError,
  MvsepRateLimitError,
  MvsepTimeoutError,
  redactText,
} from "./errors.js";
import { ApiKeyPool } from "./key-pool.js";
import { Semaphore, TokenBucketRateLimiter } from "./rate-limiter.js";
import type {
  AlgorithmScope,
  ApiEnvelope,
  BinaryPart,
  CallOptions,
  CreateAndWaitOptions,
  CreateSeparationInput,
  CreateSeparationResponse,
  DownloadOptions,
  GetSeparationOptions,
  MvsepClientOptions,
  MvsepProgressEvent,
  PollOptions,
  RawRequestInput,
  RequestContext,
  RetryOptions,
  SeparationAlgorithm,
  SeparationResult,
} from "./types.js";

import type { DownloadFileOptions, StreamDownloadOptions, DownloadReceipt, DownloadedFile, OutputDownloadOptions, OutputManifest } from "./extended-types.js";

const DEFAULT_RETRYABLE = [408, 425, 429, 500, 502, 503, 504] as const;
const TERMINAL_STATUSES = new Set(["done", "failed", "not_found"]);

interface NormalizedRetry {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: "none" | "full" | "equal";
  retryableStatusCodes: Set<number>;
  unsafeCreateRetries: "never" | "safe" | "aggressive";
}

interface ExecuteOptions extends RawRequestInput {
  bodyFactory?: (apiKey?: string) => BodyInit | undefined;
  queryFactory?: (apiKey?: string) => Record<string, string | number | boolean | undefined>;
  requiredKeyIndex?: number | undefined;
  captureKeyIndex?: (index: number) => void;
}

function normalizeBaseUrl(options: MvsepClientOptions): string {
  if (options.baseUrl) return options.baseUrl.replace(/\/+$/, "");
  if (!options.region || options.region === "apex") return "https://mvsep.com/api";
  return `https://${options.region}.mvsep.com/api`;
}

function normalizeKeys(keys: MvsepClientOptions["apiKeys"]): string[] {
  if (!keys) return [];
  return typeof keys === "string" ? [keys] : [...keys];
}

function normalizeRetry(options: RetryOptions = {}): NormalizedRetry {
  return {
    maxAttempts: positiveInt("maxAttempts", options.maxAttempts ?? 5),
    baseDelayMs: nonnegative("baseDelayMs", options.baseDelayMs ?? 500),
    maxDelayMs: nonnegative("maxDelayMs", options.maxDelayMs ?? 20_000),
    jitter: options.jitter ?? "full",
    retryableStatusCodes: new Set(options.retryableStatusCodes ?? DEFAULT_RETRYABLE),
    unsafeCreateRetries: options.unsafeCreateRetries ?? "safe",
  };
}

function backoffDelay(attempt: number, retry: NormalizedRetry): number {
  const cap = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  if (retry.jitter === "none") return cap;
  if (retry.jitter === "equal") return Math.floor(cap / 2 + Math.random() * (cap / 2));
  return Math.floor(Math.random() * cap);
}

function retryAfterMs(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const time = Date.parse(raw);
  return Number.isFinite(time) ? Math.max(0, time - Date.now()) : undefined;
}

function getMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (record.data && typeof record.data === "object") {
    const message = (record.data as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

function isUnauthorizedPayload(payload: unknown): boolean {
  const message = getMessage(payload)?.toLowerCase() ?? "";
  return /invalid.*api|unknown.*api|invalid.*token|unknown.*token|unauthor/.test(message);
}

function toBlob(part: BinaryPart): Blob {
  if (part.data instanceof Blob) return part.data;
  if (part.data instanceof Uint8Array) {
    return new Blob([part.data as BlobPart], part.contentType ? { type: part.contentType } : undefined);
  }
  return new Blob([part.data], part.contentType ? { type: part.contentType } : undefined);
}

function appendBinary(form: FormData, key: string, part: BinaryPart): void {
  const blob = toBlob(part);
  if (part.filename) form.append(key, blob, part.filename);
  else form.append(key, blob);
}

function appendFormValue(form: FormData, key: string, value: string | number | boolean | BinaryPart | undefined): void {
  if (value === undefined) return;
  if (typeof value === "object") appendBinary(form, key, value);
  else form.append(key, String(value));
}

function validateCreateInput(input: CreateSeparationInput): void {
  const singleSources = Number(Boolean(input.audiofile)) + Number(Boolean(input.url));
  const matcheringParts = Number(Boolean(input.targetAudiofile)) + Number(Boolean(input.referenceAudiofile));

  if (singleSources > 1) throw new TypeError("Provide either audiofile or url, not both");
  if (matcheringParts === 1) throw new TypeError("targetAudiofile and referenceAudiofile must be provided together");
  if (matcheringParts > 0 && singleSources > 0) {
    throw new TypeError("Matchering input cannot be combined with audiofile or url");
  }
  if (input.outputFormat !== undefined && (input.outputFormat < 0 || input.outputFormat > 5)) {
    throw new RangeError("outputFormat must be an MVSep output format id from 0 through 5");
  }
  if (input.presetId !== undefined && (input.addOpt1 !== undefined || input.addOpt2 !== undefined || input.addOpt3 !== undefined || input.outputFormat !== undefined)) throw new TypeError("Presets define their own options and output format");
  if (input.sepType !== undefined && input.presetId !== undefined) {
    throw new TypeError("Provide sepType or presetId, not both");
  }
  const reserved = new Set([
    "api_token", "audiofile", "target_audiofile", "reference_audiofile", "url", "remote_type",
    "sep_type", "preset_id", "add_opt1", "add_opt2", "add_opt3", "output_format", "is_demo", "webhook_url",
  ]);
  for (const key of Object.keys(input.additionalOptions ?? {})) {
    if (reserved.has(key)) throw new TypeError(`additionalOptions cannot override reserved field ${key}`);
  }
}

function composeSignal(parent: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) controller.abort(parent.reason);
  else parent?.addEventListener("abort", abortFromParent, { once: true });

  const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException("Timed out", "TimeoutError"));
      }, timeoutMs)
    : undefined;

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      if (timer) clearTimeout(timer);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(signal?.reason ?? new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}
/** Abort even when a custom/mock fetch transport ignores the abort signal on its body. */
async function abortable<T>(pending: Promise<T>, signal: AbortSignal, onAbort?: () => void): Promise<T> {
  if (signal.aborted) throw signal.reason;
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); onAbort?.(); reject(signal.reason); };
    signal.addEventListener("abort", abort, { once: true });
    pending.then(value => { signal.removeEventListener("abort", abort); resolve(value); },
      error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}
function nonnegative(name: string, value: number, allowInfinity = false): number {
  if (!(Number.isFinite(value) && value >= 0) && !(allowInfinity && value === Infinity))
    throw new RangeError(name + " must be nonnegative");
  return value;
}
function positiveInt(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError(name + " must be a positive integer");
  return value;
}
function validateResult(value: unknown): SeparationResult {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      typeof (value as SeparationResult).success !== "boolean" ||
      typeof (value as SeparationResult).status !== "string" ||
      !(value as SeparationResult).status ||
      ((value as SeparationResult).data !== undefined &&
       (!(value as SeparationResult).data || typeof (value as SeparationResult).data !== "object"))) {
    throw new MvsepApiError("Invalid MVSep separation response", { response: value });
  }
  return value as SeparationResult;
}

function buildUrl(baseUrl: string, path: string, query: Record<string, string | number | boolean | undefined> = {}): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export class MvsepClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly retry: NormalizedRetry;
  private readonly requestTimeoutMs: number;
  private readonly keyPool: ApiKeyPool;
  private readonly limiter: TokenBucketRateLimiter;
  private readonly semaphore: Semaphore;
  private transferInstance: Promise<import("./transfers.js").TransferManager> | undefined;
  private readonly defaultProgress: ((event: MvsepProgressEvent) => void) | undefined;
  private readonly jobKeyAffinity = new Map<string, number>();
  private readonly maxJobAffinities: number;

  constructor(options: MvsepClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options);
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new Error("A Fetch API implementation is required");
    this.retry = normalizeRetry(options.retry);
    this.requestTimeoutMs = nonnegative("requestTimeoutMs", options.requestTimeoutMs ?? 60_000, true);
    this.keyPool = new ApiKeyPool(normalizeKeys(options.apiKeys), options.keyRotation);
    this.limiter = new TokenBucketRateLimiter({
      requestsPerSecond: options.rateLimit?.requestsPerSecond ?? 2,
      burst: options.rateLimit?.burst ?? 2,
    });
    this.semaphore = new Semaphore(options.rateLimit?.maxConcurrency ?? 4);
    this.defaultProgress = options.onProgress;
    this.maxJobAffinities = positiveInt("maxJobAffinities", options.maxJobAffinities ?? 10_000);
  }

  /** Node-only file transfers load lazily; browser clients can use the API transport without Node built-ins. */
  private transfers(): Promise<import("./transfers.js").TransferManager> {
    const nodeTransfers: string = "./transfers.js";
    return this.transferInstance ??= (import(/* @vite-ignore */ nodeTransfers) as Promise<typeof import("./transfers.js")>).then(({ TransferManager }) => new TransferManager({
      fetchImpl: this.fetchImpl,
      limiter: this.limiter,
      semaphore: this.semaphore,
      timeoutMs: this.requestTimeoutMs,
      maxAttempts: this.retry.maxAttempts,
      baseDelayMs: this.retry.baseDelayMs,
    }));
  }

  get apiKeyState() {
    return this.keyPool.snapshot();
  }

  getJobApiKeyIndex(hash: string): number | undefined {
    return this.jobKeyAffinity.get(hash);
  }

  bindJobToApiKey(hash: string, apiKeyIndex: number): void {
    if (!Number.isInteger(apiKeyIndex) || apiKeyIndex < 0 || apiKeyIndex >= this.keyPool.size) {
      throw new RangeError(`Invalid MVSep API key index: ${apiKeyIndex}`);
    }
    this.rememberJobKey(hash, apiKeyIndex);
  }

  private async waitForKeyCooldown(waitMs: number, signal?: AbortSignal, timeoutMs?: number): Promise<void> {
    const composed = composeSignal(signal, timeoutMs ?? this.requestTimeoutMs);
    try { await sleep(waitMs, composed.signal); }
    catch (cause) {
      if (signal?.aborted) throw new MvsepAbortError("MVSep request aborted while waiting for API key", { cause });
      if (composed.didTimeout()) throw new MvsepTimeoutError("MVSep request timed out while waiting for API key", { cause });
      throw cause;
    } finally { composed.cleanup(); }
  }

  private rememberJobKey(hash: string, index: number): void {
    this.jobKeyAffinity.delete(hash);
    this.jobKeyAffinity.set(hash, index);
    if (this.jobKeyAffinity.size > this.maxJobAffinities) {
      const oldest = this.jobKeyAffinity.keys().next().value;
      if (oldest !== undefined) this.jobKeyAffinity.delete(oldest);
    }
  }

  forgetJobApiKey(hash: string): void {
    this.jobKeyAffinity.delete(hash);
  }

  async request<T>(input: RawRequestInput): Promise<T> {
    return this.execute<T>(input);
  }

  async createSeparation(
    input: CreateSeparationInput,
    options: CallOptions = {},
  ): Promise<CreateSeparationResponse> {
    validateCreateInput(input);

    let usedKeyIndex: number | undefined;
    const response = await this.execute<CreateSeparationResponse>({
      ...options,
      method: "POST",
      path: "/separation/create",
      authenticated: true,
      idempotent: false,
      operation: "create",
      captureKeyIndex: (index) => { usedKeyIndex = index; },
      bodyFactory: (apiKey) => {
        const form = new FormData();
        if (apiKey) form.set("api_token", apiKey);
        if (input.audiofile) appendBinary(form, "audiofile", input.audiofile);
        if (input.targetAudiofile) appendBinary(form, "target_audiofile", input.targetAudiofile);
        if (input.referenceAudiofile) appendBinary(form, "reference_audiofile", input.referenceAudiofile);
        if (input.url !== undefined) form.set("url", input.url);
        if (input.remoteType !== undefined) form.set("remote_type", input.remoteType);
        if (input.sepType !== undefined) form.set("sep_type", String(input.sepType));
        if (input.presetId !== undefined) form.set("preset_id", String(input.presetId));
        if (input.addOpt1 !== undefined) form.set("add_opt1", String(input.addOpt1));
        if (input.addOpt2 !== undefined) form.set("add_opt2", String(input.addOpt2));
        if (input.addOpt3 !== undefined) form.set("add_opt3", String(input.addOpt3));
        for (const [key, value] of Object.entries(input.additionalOptions ?? {})) form.set(key, String(value));
        if (input.outputFormat !== undefined) form.set("output_format", String(input.outputFormat));
        if (input.isDemo !== undefined) form.set("is_demo", input.isDemo ? "1" : "0");
        if (input.webhookUrl !== undefined) form.set("webhook_url", input.webhookUrl);
        return form;
      },
    });

    if (!response.success || !response.data?.hash) {
      throw new MvsepApiError(getMessage(response) ?? "MVSep did not create a separation job", {
        response,
        retryable: false,
      });
    }
    if (usedKeyIndex !== undefined) this.rememberJobKey(response.data.hash, usedKeyIndex);
    return response;
  }

  async getSeparation(hash: string, options: GetSeparationOptions = {}): Promise<SeparationResult> {
    if (options.mirror && !this.keyPool.hasKeys()) throw new MvsepAuthenticationError("Mirror requires an API key and costs one credit");
    return validateResult(await this.execute<SeparationResult>({
      method: "GET",
      path: "/separation/get",
      authenticated: this.keyPool.hasKeys(),
      requiredKeyIndex: this.jobKeyAffinity.get(hash),
      idempotent: true,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      onProgress: options.onProgress,
      queryFactory: () => ({ hash, mirror: options.mirror ? 1 : undefined }),
    }));
  }

  async getRemoteSeparation(hash: string, options: CallOptions = {}): Promise<SeparationResult> {
    if ("mirror" in options) throw new TypeError("mirror is not supported by getRemoteSeparation");
    return validateResult(await this.execute<SeparationResult>({
      method: "GET",
      path: "/separation/get-remote",
      query: { hash },
      idempotent: true,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      onProgress: options.onProgress,
    }));
  }

  async cancelSeparation(hash: string, options: CallOptions = {}) {
    return this.authenticatedHashAction("/separation/cancel", hash, options);
  }

  async deleteSeparation(hash: string, options: CallOptions = {}) {
    const response = await this.authenticatedHashAction("/separation/delete", hash, options);
    this.jobKeyAffinity.delete(hash);
    return response;
  }

  async getAlgorithms(scopes?: AlgorithmScope | readonly AlgorithmScope[], options: CallOptions = {}): Promise<SeparationAlgorithm[]> {
    const normalizedScopes = typeof scopes === "string" ? scopes : scopes?.join(",");
    const response = await this.execute<unknown>({
      method: "GET",
      path: "/app/algorithms",
      query: { scopes: normalizedScopes },
      idempotent: true,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      onProgress: options.onProgress,
    });

    if (Array.isArray(response)) return response as SeparationAlgorithm[];
    if (response && typeof response === "object" && Array.isArray((response as { data?: unknown }).data)) {
      return (response as { data: SeparationAlgorithm[] }).data;
    }
    throw new MvsepApiError("Unexpected response shape from MVSep algorithms endpoint", { response });
  }

  async waitForSeparation(hash: string, options: PollOptions = {}): Promise<SeparationResult> {
    const started = Date.now();
    const maxWaitMs = nonnegative("maxWaitMs", options.maxWaitMs ?? 30 * 60_000, true);
    const deadline = Number.isFinite(maxWaitMs) ? started + maxWaitMs : Infinity;
    let interval = nonnegative("intervalMs", options.intervalMs ?? 2_000);
    const maxInterval = nonnegative("maxIntervalMs", options.maxIntervalMs ?? 10_000);
    const factor = options.backoffFactor ?? 1.15;
    if (!Number.isFinite(factor) || factor < 1) throw new RangeError("backoffFactor must be >= 1");
    let pollCount = 0;
    const composed = composeSignal(options.signal, maxWaitMs);
    try {
      while (true) {
        if (options.signal?.aborted) throw new MvsepAbortError("MVSep polling aborted", { cause: options.signal.reason });
        if (composed.didTimeout() || Date.now() >= deadline)
          throw new MvsepTimeoutError("MVSep polling deadline exceeded");
        let result: SeparationResult;
        try {
          result = await this.getSeparation(hash, {
            ...options, signal: composed.signal,
            timeoutMs: Math.min(options.timeoutMs ?? this.requestTimeoutMs, Math.max(0, deadline - Date.now())),
          });
        } catch (cause) {
          if (options.signal?.aborted) throw new MvsepAbortError("MVSep polling aborted", { cause });
          if (composed.didTimeout() || Date.now() >= deadline)
            throw new MvsepTimeoutError("MVSep polling deadline exceeded", { cause });
          throw cause;
        }
        if (composed.didTimeout() || Date.now() >= deadline)
          throw new MvsepTimeoutError("MVSep polling deadline exceeded");
        pollCount++;
        const data = result.data;
        const fraction = data?.all_chunks && data.all_chunks > 0 && data.finished_chunks !== undefined
          ? Math.min(1, data.finished_chunks / data.all_chunks) : undefined;
        this.emit(options.onProgress, {
          type: "poll", hash, pollCount, elapsedMs: Date.now() - started, status: result.status,
          ...(data?.queue_count !== undefined ? { queueCount: data.queue_count } : {}),
          ...(data?.current_order !== undefined ? { currentOrder: data.current_order } : {}),
          ...(data?.finished_chunks !== undefined ? { finishedChunks: data.finished_chunks } : {}),
          ...(data?.all_chunks !== undefined ? { allChunks: data.all_chunks } : {}),
          ...(fraction !== undefined ? { fraction } : {}), result,
        });
        if (TERMINAL_STATUSES.has(result.status)) {
          if ((options.throwOnFailed ?? true) && result.status !== "done")
            throw new MvsepJobFailedError(result);
          return result;
        }
        try { await sleep(Math.min(interval, Math.max(0, deadline - Date.now())), composed.signal); }
        catch (cause) {
          if (options.signal?.aborted) throw new MvsepAbortError("MVSep polling aborted", { cause });
          if (composed.didTimeout()) throw new MvsepTimeoutError("MVSep polling deadline exceeded", { cause });
          throw cause;
        }
        interval = Math.min(maxInterval, Math.ceil(interval * factor));
      }
    } finally {
      composed.cleanup();
    }
  }

  async createAndWait(input: CreateSeparationInput, options: CreateAndWaitOptions = {}): Promise<SeparationResult> {
    const created = await this.createSeparation(input, {
      signal: options.createSignal ?? options.signal,
      timeoutMs: options.timeoutMs,
      onProgress: options.onProgress,
    });
    const hash = created.data?.hash;
    if (!hash) throw new MvsepApiError("MVSep create response did not include a job hash", { response: created });
    return this.waitForSeparation(hash, options);
  }

  async download(url: string, options: DownloadOptions = {}): Promise<Uint8Array> {
    return (await this.transfers()).download(url, options);
  }

  async downloadToStream(
    url: string, stream: WritableStream<Uint8Array>, options: StreamDownloadOptions = {},
  ): Promise<DownloadReceipt> {
    return (await this.transfers()).downloadToStream(url, stream, options);
  }

  async downloadToFile(url: string, path: string, options: DownloadFileOptions = {}): Promise<DownloadedFile> {
    return (await this.transfers()).downloadToFile(url, path, options);
  }

  async downloadSeparationOutputs(
    resultOrHash: SeparationResult | string, path: string, options: OutputDownloadOptions = {},
  ): Promise<OutputManifest> {
    const result = typeof resultOrHash === "string"
      ? await this.waitForSeparation(resultOrHash, { signal: options.signal, timeoutMs: options.timeoutMs })
      : resultOrHash;
    return (await this.transfers()).downloadSeparationOutputs(result, path, options);
  }

  private async authenticatedHashAction(
    path: string,
    hash: string,
    options: CallOptions,
  ): Promise<ApiEnvelope> {
    const response = await this.execute<ApiEnvelope>({
      ...options,
      method: "POST",
      path,
      authenticated: true,
      requiredKeyIndex: this.jobKeyAffinity.get(hash),
      idempotent: true,
      bodyFactory: (apiKey) => {
        const form = new FormData();
        if (apiKey) form.set("api_token", apiKey);
        form.set("hash", hash);
        return form;
      },
    });
    if (!response.success) {
      throw new MvsepApiError(getMessage(response) ?? `MVSep action ${path} failed`, { response });
    }
    return response;
  }

  private async execute<T>(options: ExecuteOptions): Promise<T> {
    const method = options.method ?? "GET";
    const authenticated = options.authenticated ?? false;
    if (authenticated && !this.keyPool.hasKeys()) {
      throw new MvsepAuthenticationError("This MVSep request requires an API key, but no apiKeys were configured");
    }

    const maxAttempts = this.retry.maxAttempts;
    const triedKeys = new Set<number>();
    let lastError: unknown;
    let previousKeyIndex: number | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let selected = authenticated
        ? options.requiredKeyIndex !== undefined
          ? this.keyPool.selectIndex(options.requiredKeyIndex)
          : this.keyPool.select(triedKeys)
        : undefined;
      if (authenticated && !selected) {
        if (options.requiredKeyIndex !== undefined) {
          const waitMs = this.keyPool.nextAvailableForIndexMs(options.requiredKeyIndex);
          if (waitMs === undefined) {
            throw lastError instanceof Error
              ? lastError
              : new MvsepAuthenticationError(`Required MVSep API key ${options.requiredKeyIndex} is unavailable`);
          }
          if (waitMs > 0) await this.waitForKeyCooldown(waitMs, options.signal, options.timeoutMs);
          selected = this.keyPool.selectIndex(options.requiredKeyIndex);
        } else {
          triedKeys.clear();
          const waitMs = this.keyPool.nextAvailableInMs();
          if (waitMs === undefined) {
            throw lastError instanceof Error
              ? lastError
              : new MvsepAuthenticationError("No usable MVSep API keys remain");
          }
          if (waitMs > 0) await this.waitForKeyCooldown(waitMs, options.signal, options.timeoutMs);
          selected = this.keyPool.select();
        }
        if (!selected) throw new MvsepAuthenticationError("No usable MVSep API keys remain");
      }

      const query: Record<string, string | number | boolean | undefined> = {
        ...(options.query ?? {}),
        ...(options.queryFactory?.(selected?.key) ?? {}),
      };
      if (authenticated) {
        if (Object.hasOwn(query, "api_token") || Object.hasOwn(options.form ?? {}, "api_token"))
          throw new TypeError("Authenticated requests cannot override api_token");
        if (method === "GET") query.api_token = selected?.key;
      }
      const url = buildUrl(this.baseUrl, options.path, query);
      const context: RequestContext = {
        method,
        path: options.path,
        attempt,
        maxAttempts,
        ...(selected ? { keyIndex: selected.index } : {}),
      };

      if (selected && previousKeyIndex !== undefined && selected.index !== previousKeyIndex) {
        this.emit(options.onProgress, {
          type: "key_rotation",
          from: previousKeyIndex,
          to: selected.index,
          reason: "retry_or_round_robin",
          method,
          path: options.path,
          attempt,
          maxAttempts,
        });
      }
      previousKeyIndex = selected?.index;

      try {
        let response: Response;
        let payload: unknown;
        const composed = composeSignal(options.signal, options.timeoutMs ?? this.requestTimeoutMs);
        let release: (() => void) | undefined;
        try {
          const waitMs = await this.limiter.acquire(composed.signal);
          if (waitMs > 0) this.emit(options.onProgress, { type: "rate_limit", waitMs, ...context });
          release = await this.semaphore.acquire(composed.signal);
          this.emit(options.onProgress, { type: "request", phase: "start", ...context });
          const body = options.bodyFactory?.(selected?.key)
            ?? this.buildRawForm(options.form, selected?.key, authenticated && method !== "GET");
          const init: RequestInit = { method, signal: composed.signal };
          if (options.headers !== undefined) init.headers = options.headers;
          if (body !== undefined) init.body = body;
          response = await abortable(this.fetchImpl(url, init), composed.signal);
          const rawText = await abortable(response.text(), composed.signal, () => { void response.body?.cancel().catch(() => {}); });
          if (rawText.trim()) {
            try { payload = JSON.parse(rawText); }
            catch (cause) {
              if (response.ok) throw new MvsepHttpError("MVSep returned invalid JSON", {
                cause, status: response.status, response: redactText(rawText.slice(0, 2_000)),
                method, url, retryable: false,
              });
              payload = redactText(rawText.slice(0, 2_000));
            }
          }
        } catch (error) {
          if (composed.didTimeout())
            throw new MvsepTimeoutError("MVSep request timed out", { cause: error, method, url, retryable: true });
          if (options.signal?.aborted)
            throw new MvsepAbortError("MVSep request aborted", { cause: error, method, url });
          if (error instanceof MvsepError) throw error;
          throw new MvsepError("MVSep transport error", { cause: error, method, url, retryable: true });
        } finally {
          release?.();
          composed.cleanup();
        }

        if (response.ok && authenticated && isUnauthorizedPayload(payload)) {
          if (selected && this.keyPool.options.disableKeyOnUnauthorized) this.keyPool.disable(selected.index);
          throw new MvsepAuthenticationError(getMessage(payload) ?? "MVSep rejected the API key", {
            status: response.status,
            response: payload,
            method,
            url,
            ...(selected ? { apiKeyIndex: selected.index } : {}),
          });
        }

        if (!response.ok) {
          const retryAfter = retryAfterMs(response.headers);
          const message = getMessage(payload) ?? `MVSep HTTP ${response.status}`;
          if (response.status === 401 || isUnauthorizedPayload(payload)) {
            if (selected && this.keyPool.options.disableKeyOnUnauthorized) this.keyPool.disable(selected.index);
            throw new MvsepAuthenticationError(message, {
              status: response.status,
              response: payload,
              method,
              url,
              ...(selected ? { apiKeyIndex: selected.index } : {}),
            });
          }
          if (response.status === 429) {
            if (selected) this.keyPool.cooldown(selected.index, retryAfter ?? this.keyPool.options.rateLimitCooldownMs);
            throw new MvsepRateLimitError(message, {
              status: response.status,
              response: payload,
              method,
              url,
              ...(selected ? { apiKeyIndex: selected.index } : {}),
              retryable: true,
              ...(retryAfter !== undefined ? { retryAfterMs: retryAfter } : {}),
            });
          }
          throw new MvsepHttpError(message, {
            status: response.status,
            response: payload,
            method,
            url,
            ...(selected ? { apiKeyIndex: selected.index } : {}),
            retryable: this.retry.retryableStatusCodes.has(response.status),
          });
        }

        if (selected) {
          this.keyPool.markHealthy(selected.index);
          options.captureKeyIndex?.(selected.index);
        }
        this.emit(options.onProgress, { type: "request", phase: "success", status: response.status, ...context });
        return payload as T;
      } catch (error) {
        if (options.signal?.aborted) throw new MvsepAbortError("MVSep request aborted", { cause: error });
        if (error instanceof MvsepAbortError) throw error;
        lastError = error;
        if (selected && options.requiredKeyIndex === undefined) triedKeys.add(selected.index);

        const retryable = this.shouldRetry(error, options, method);
        if (
          retryable
          && selected
          && options.requiredKeyIndex === undefined
          && !(error instanceof MvsepRateLimitError)
          && !(error instanceof MvsepAuthenticationError)
        ) {
          this.keyPool.cooldown(selected.index, this.keyPool.options.transientFailureCooldownMs);
        }
        const hasAlternateKey = authenticated && options.requiredKeyIndex === undefined && this.keyPool.hasAvailable(triedKeys);
        if (!retryable || attempt >= maxAttempts) throw error;
        if (error instanceof MvsepAuthenticationError && authenticated && !hasAlternateKey) throw error;

        const headerDelay = error instanceof MvsepRateLimitError ? error.retryAfterMs : undefined;
        const delayMs = hasAlternateKey ? 0 : Math.max(headerDelay ?? 0, backoffDelay(attempt, this.retry));
        this.emit(options.onProgress, {
          type: "retry",
          delayMs,
          reason: error instanceof Error ? error.message : String(error),
          ...(error instanceof MvsepError && error.status !== undefined ? { status: error.status } : {}),
          ...context,
        });
        try { await sleep(delayMs, options.signal); }
        catch (cause) { throw new MvsepAbortError("MVSep request aborted", { cause }); }
      }
    }

    throw lastError instanceof Error ? lastError : new MvsepError("MVSep request failed");
  }

  private buildRawForm(
    formValues: RawRequestInput["form"],
    apiKey: string | undefined,
    authenticated: boolean,
  ): FormData | undefined {
    if (!formValues && !authenticated) return undefined;
    const form = new FormData();
    if (authenticated && apiKey) form.set("api_token", apiKey);
    for (const [key, value] of Object.entries(formValues ?? {})) appendFormValue(form, key, value);
    return form;
  }

  private shouldRetry(error: unknown, options: ExecuteOptions, method: string): boolean {
    if (!(error instanceof MvsepError)) return false;
    if (options.operation === "create" && this.retry.unsafeCreateRetries === "never") return false;
    if (error instanceof MvsepAuthenticationError) return this.keyPool.hasKeys();
    if (!error.retryable) return false;

    if (options.operation === "create") {
      if (this.retry.unsafeCreateRetries === "never") return false;
      if (this.retry.unsafeCreateRetries === "safe") return error instanceof MvsepRateLimitError;
      return true;
    }

    if (options.idempotent === true) return true;
    if (options.idempotent === false) return false;
    return method === "GET" || method === "OPTIONS" || method === "DELETE";
  }

  private emit(local: ((event: MvsepProgressEvent) => void) | undefined, event: MvsepProgressEvent): void {
    try { this.defaultProgress?.(event); } catch { /* observers cannot invalidate requests */ }
    if (local !== this.defaultProgress) { try { local?.(event); } catch { /* observer isolation */ } }
  }
}

export async function fileFromPath(path: string, contentType?: string): Promise<BinaryPart> {
  const fsSpecifier: string = "node:fs/promises";
  const pathSpecifier: string = "node:path";
  const { readFile } = await import(/* @vite-ignore */ fsSpecifier) as typeof import("node:fs/promises");
  const { basename } = await import(/* @vite-ignore */ pathSpecifier) as typeof import("node:path");
  const data = await readFile(path);
  return {
    data,
    filename: basename(path),
    ...(contentType ? { contentType } : {}),
  };
}
